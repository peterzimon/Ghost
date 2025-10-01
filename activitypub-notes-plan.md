# ActivityPub Notes Mobile Web App — Plan

## Goals
- Read and publish Ghost ActivityPub Notes from mobile without loading Ghost Admin.
- Independent app, deployed on your own subdomain (e.g., `notes.example.com`).
- Tech: React + shadcn/ui, talks to Ghost via existing APIs.

## Constraints & Assumptions
- App runs on a different origin than your Ghost site; avoid CORS/auth issues by using a small backend proxy.
- Use Ghost’s identity tokens to call ActivityPub endpoints with `Authorization: Bearer <token>`.
- Prefer Staff token (server-side) or server-side session to obtain identity tokens; never expose Admin/Staff credentials to the client.

## Relevant Ghost APIs (from the repo)
Ghost exposes ActivityPub endpoints under `/.ghost/activitypub/v1/*` (relative to your site URL) which expect an `Authorization: Bearer <identity-token>` header. Identity tokens are fetched from the Admin API:

- Admin (server-to-server only)
  - `GET /ghost/api/admin/identities/` → `{ identities: [{ token }] }`
    - Requires authenticated Admin context. Staff tokens (with `user_id`) are permitted by middleware.

- ActivityPub (proxied via backend with Bearer token)
  - Publish Note: `POST /.ghost/activitypub/v1/actions/note`
    - Body: `{ content: string, image?: { url: string, altText?: string } }`
    - Response: `{ post: Post }`
  - Delete Note: `DELETE /.ghost/activitypub/v1/post/{id}`
  - My Notes: `GET /.ghost/activitypub/v1/posts/me?next=<cursor>` → `{ posts: Post[], next: string|null }`
  - Get Post: `GET /.ghost/activitypub/v1/post/{id}` → `Post`
  - Upload Image: `POST /.ghost/activitypub/v1/upload/image` (multipart) → `{ fileUrl: string }`
  - Optional (future):
    - Timeline/Inbox: `GET /.ghost/activitypub/v1/feed/notes`, `GET /.ghost/activitypub/v1/feed/reader`
    - Likes/Reposts/Replies: `POST /.ghost/activitypub/v1/actions/{like|unlike|repost|derepost|reply}/{id}`
    - Search: `GET /.ghost/activitypub/v1/actions/search?query=...`
    - Notifications count: `GET /.ghost/activitypub/v1/notifications/unread/count`

Headers to forward when calling ActivityPub:
- `Authorization: Bearer <identity-token>`
- `Accept: application/activity+json`
- `Content-Type: application/json` for JSON posts.

Pagination: list endpoints accept `?next=` cursors and return `{next}` for subsequent pages.

## High-Level Architecture
- Frontend (React + shadcn/ui)
  - Mobile-first SPA delivering: My Notes list (infinite scroll), Composer (post new note with optional image), Delete.
  - Uses React Query for data fetching, caching, optimistic updates.
  - Talks only to your Backend proxy (`/api/*`).

- Backend Proxy (Node/Serverless)
  - `POST /api/auth/identity-token` (internal use): calls `https://<site>/ghost/api/admin/identities/` with a server-side Staff token or session to obtain a short-lived identity token.
  - `/* ActivityPub proxy */`: forwards requests to `https://<site>/.ghost/activitypub/v1/*`, injecting `Authorization: Bearer <identity-token>` and necessary headers. Optionally, refresh/obtain token per request or cache briefly.
  - `POST /api/upload`: forwards multipart form-data to `/.ghost/activitypub/v1/upload/image` and returns `{fileUrl}`.
  - Strict allowlist of routes and payload validation to prevent misuse.

Security notes:
- Store Staff token and site URL in backend env vars; never expose to client.
- Identity tokens are short-lived (~minutes); keep simple by fetching on each proxied request or cache with a very short TTL.
- CORS: backend only allows your app origin.
- Add rate limiting on proxy endpoints.

## UI & Flows
- Home (My Notes)
  - Infinite list of your Notes with content (HTML), published time, counts (likes/reposts/replies).
  - Pull-to-refresh; skeleton loaders.
  - Tap a note for details (optional, v2).

- Composer
  - Bottom sheet or fixed composer: multiline textarea with character count.
  - Optional image attach (preview + alt text). Upload first, then include `{ image: { url, altText } }` when posting.
  - Post → optimistic update to the list; toast for errors.

- Post Actions
  - Delete note (authored by me). Confirm sheet before deletion.
  - Copy link (optional).

- Settings (Minimal)
  - Show ActivityPub handle, site link, sign out (clears local state; server has no persistent user state beyond Staff token env/session).

## Data Shapes (aligned to Ghost’s admin-x activitypub client)
- `Post` (subset most relevant for v1)
  - `id: string`
  - `type: 'note' | 'article'` (Notes are primary focus)
  - `content: string` (HTML)
  - `url: string`
  - `publishedAt: string`
  - `likeCount: number`, `likedByMe: boolean`
  - `repostCount: number`, `repostedByMe: boolean`
  - `replyCount: number`
  - `attachments?: Array<{ type: string, mediaType: string, name: string, url: string }>`
  - `authoredByMe: boolean`

- Pagination: `{ posts: Post[], next: string|null }`

## Client–Server Contracts (Proxy Facade)
Client calls your backend; backend calls Ghost.

- Get my notes
  - Client → `GET /api/activitypub/posts/me?next=...`
  - Server → `GET https://<site>/.ghost/activitypub/v1/posts/me?next=...` with Bearer identity
  - Response → `{ posts, next }`

- Create a note
  - If image: Client → `POST /api/upload` (multipart: `file`) → `{ fileUrl }`
  - Client → `POST /api/activitypub/actions/note`
    - Body: `{ content, image?: { url, altText } }`
  - Server → `POST https://<site>/.ghost/activitypub/v1/actions/note` with Bearer identity
  - Response → `{ post }`

- Delete a note
  - Client → `DELETE /api/activitypub/post/{id}`
  - Server → `DELETE https://<site>/.ghost/activitypub/v1/post/{id}`

- Identity token (server-internal)
  - Server obtains on-demand via `GET https://<site>/ghost/api/admin/identities/` using Staff token or server session.

## Error Handling
- Show user-friendly toasts for:
  - Network or unknown error: “Something went wrong, please try again.”
  - 429 rate-limit: “You’ve made too many requests. Please try again later.”
  - 403 blocked interactions: “This user has restricted who can interact with their account.”
- Retry buttons on transient failures (list reload, create retry).

## Implementation Outline
- Stack
  - React + Vite or Next.js (Next.js recommended if using built-in API routes for the proxy).
  - Tailwind + shadcn/ui for components.
  - React Query for data fetching/caching.

- Suggested file structure (Next.js example)
  - `/app` or `/src/app` — routes and pages
  - `/components` — UI components (FeedList, Composer, NoteCard, Skeletons)
  - `/lib/api-client.ts` — typed fetcher to call your proxy (`/api/*`)
  - `/lib/types.ts` — Post/Response types
  - `/lib/query-keys.ts` — stable query keys for React Query
  - `/pages/api/activitypub/*` — proxy route handlers
  - `/pages/api/upload.ts` — image upload proxy

- Key client code
  - `useInfiniteQuery` for `GET /api/activitypub/posts/me` with `getNextPageParam: (last) => last.next`.
  - `useMutation` for create/delete; optimistic update list caches.
  - `uploadImage(file)` → `/api/upload` → returns `fileUrl` for composer.

- Key server code (proxy)
  - `getIdentityToken()`: fetch from Admin identities endpoint using server-side Staff token/session.
  - Forward ActivityPub requests: attach `Authorization: Bearer <identity-token>`, set `Accept` and `Content-Type` when needed.
  - Allowlist path/methods and validate inputs.

## Security & Privacy
- Do not expose Admin/Staff tokens to the browser.
- Keep Staff token in env var (or use a server-side authenticated session).
- Only allow your frontend origin (CORS). Add basic rate-limiting and logging.
- Identity tokens are short-lived; fetch per request or cache ≤ 4 minutes.

## Deployment & Config
- Hosting: Vercel/Netlify/Fly/Cloudflare (Next.js recommended for integrated frontend+API routes).
- DNS: point `notes.example.com` to hosting provider.
- Required environment variables (server):
  - `GHOST_SITE_URL` — e.g., `https://example.com`
  - `GHOST_ADMIN_BASE` — e.g., `https://example.com/ghost/api/admin`
  - `GHOST_STAFF_TOKEN` — Staff Access Token for a staff user (server-side only)
  - `ALLOWED_ORIGIN` — e.g., `https://notes.example.com`

Notes:
- If a Staff token is not available, a server-only session approach (sign in as staff on the server and store session cookie) can be used to call `/ghost/api/admin/identities/` — never expose credentials to the client.

## Milestones
1) Scaffold app + proxy, set envs, health check
2) My Notes list (infinite scroll) + skeletons
3) Composer: text + image upload, optimistic create
4) Delete note + confirmation UX
5) Polish mobile UX, empty/error states, deploy
6) Optional: likes/reposts/replies, notifications count, search, note detail view

## Open Questions
- Confirm availability/preference for a Staff token vs server-session bridge.
- Deploy target preference (Next.js on Vercel vs Vite + separate serverless).
- Strict scope: only Notes read/post/delete for v1? Any need for likes/reposts/replies now?

## Quick Test Snippets (after implementation)
- Create note (via proxy):
```bash
curl -X POST https://notes.example.com/api/activitypub/actions/note \
  -H 'Content-Type: application/json' \
  -d '{"content":"Hello from my phone!"}'
```
- Upload image:
```bash
curl -X POST https://notes.example.com/api/upload \
  -F 'file=@/path/to/image.jpg'
```
- List my notes:
```bash
curl https://notes.example.com/api/activitypub/posts/me
```

---
This plan is based on the ActivityPub code and Admin routes in the Ghost repo, including the Admin identities flow and the `/.ghost/activitypub/v1/*` endpoints that power Notes.

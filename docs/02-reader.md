# 02 — Reader Section (ActivityPub Reader Articles)

Objective
- Add a Reader section listing ActivityPub/Reader feed, filtered to articles.

Ghost ActivityPub Endpoints
- Reader feed: `GET https://<site>/.ghost/activitypub/v1/feed/reader?next=<cursor>`
  - Response: `{ posts: Post[], next: string|null }`
  - Post type: Articles vs Notes (Ghost uses `PostType`: Note=0, Article=1). Filter for articles.
- Requires `Authorization: Bearer <identity-token>` header.
- Identity token source: `GET https://<site>/ghost/api/admin/identities/` (server-side using stored Ghost session cookie).

Proxy API (server)
- `GET /api/activitypub/feed/reader?next=...` → forwards to Ghost with Bearer identity.
- Internals:
  1) Ensure app session has `ghostCookie` + `siteUrl`.
  2) Fetch identity token from `{siteUrl}/ghost/api/admin/identities/` (send `ghostCookie`).
  3) Forward to `{siteUrl}/.ghost/activitypub/v1/feed/reader` with `Authorization: Bearer <token>` and `Accept: application/activity+json`.
  4) Return `{posts,next}` unchanged.

Frontend Tasks
- Route: `/reader`
- Components: `ReaderList` (infinite), `PostCard` (for articles), `Skeleton` rows
- State: React Query `useInfiniteQuery` with `getNextPageParam: (data) => data.next`
- Filter client-side to articles (type === 1) unless server filters for you.
- Pull to refresh and load-more on scroll.

Data Contracts
- Client → `GET /api/activitypub/feed/reader?next=...`
- Response: `{ posts: Array<Post>, next: string|null }`
- Minimal Post fields used: `id`, `type`, `title`, `excerpt` or `content`, `url`, `publishedAt`, `featureImageUrl`, `author.name`

Error Handling
- 401/403: redirect to login
- 429: show toast “You’ve made too many requests. Please try again later.”
- Network: retry button

Acceptance Criteria
- Reader shows a scrollable list of articles from ActivityPub Reader feed
- Supports infinite pagination via `next` cursor
- Errors are surfaced via toasts; 401 redirects to login

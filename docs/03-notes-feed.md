# 03 — Notes Section (ActivityPub Notes Feed)

Objective
- Add a Notes section that lists the ActivityPub Notes feed.

Ghost ActivityPub Endpoints
- Notes feed: `GET https://<site>/.ghost/activitypub/v1/feed/notes?next=<cursor>`
  - Response: `{ posts: Post[], next: string|null }`
  - Notes have `type: Note` (Ghost enum Note=0). Display content, author, timestamps, counts.
- Requires `Authorization: Bearer <identity-token>` header.

Proxy API (server)
- `GET /api/activitypub/feed/notes?next=...` → forwards to Ghost with Bearer identity.
- Internals: identical token-fetch + forward flow as Reader.

Frontend Tasks
- Route: `/notes`
- Components: `NotesList` (infinite), `NoteCard`, `Skeleton`
- State: `useInfiniteQuery` with `getNextPageParam: (data) => data.next`
- Render HTML `content` safely (basic sanitize or trust Ghost content), show attachments thumbnails when present.

Data Contracts
- Client → `GET /api/activitypub/feed/notes?next=...`
- Response: `{ posts: Array<Post>, next: string|null }`
- Fields used: `id`, `type`, `content` (HTML), `url`, `publishedAt`, `author.name`/`avatarUrl`, counts

Error Handling
- Same as Reader; 401 redirects to login; 429 toast; retry on network failure.

Acceptance Criteria
- Notes feed renders recent notes (not articles)
- Infinite scroll works with `next` cursor
- Proper error and loading states

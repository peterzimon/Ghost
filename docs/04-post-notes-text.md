# 04 — Post Plain Text Notes

Objective
- Let users compose and publish plain text notes to ActivityPub.

Ghost ActivityPub Endpoints
- Publish Note: `POST https://<site>/.ghost/activitypub/v1/actions/note`
  - Body: `{ content: string }` (HTML allowed; we will post simple paragraphs)
  - Response: `{ post: Post }`
- Requires `Authorization: Bearer <identity-token>` header.

Proxy API (server)
- `POST /api/activitypub/actions/note`
  - Input: `{ content: string }`
  - Flow:
    1) Ensure app session valid; load `siteUrl` and `ghostCookie`
    2) Fetch identity token: `GET {siteUrl}/ghost/api/admin/identities/`
    3) POST to `{siteUrl}/.ghost/activitypub/v1/actions/note` with `Authorization: Bearer <token>` and JSON body
    4) Relay `{ post }` response

Frontend Tasks
- Route: `/notes` (add composer UI at top or bottom sheet)
- Components: `NoteComposer` (Textarea + Post button)
- State: React Query `useMutation` to call `/api/activitypub/actions/note`
- Optimistic update: prepend returned `post` to Notes feed cache on success
- Disable Post when empty; show loading state while posting

Data Contracts
- Client → `POST /api/activitypub/actions/note` body: `{ content: string }`
- Response: `{ post: Post }`

Error Handling
- Validation: Max length guard client-side (optional)
- 403/429 handling with toasts; re-enable composer on failure

Acceptance Criteria
- Users can post a note consisting of plain text
- On success, the note appears immediately in the Notes feed
- Composer handles loading/error states cleanly

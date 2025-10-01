# 05 — Post Images in Notes

Objective
- Extend composer to support image attachments in notes.

Ghost ActivityPub Endpoints
- Upload image: `POST https://<site>/.ghost/activitypub/v1/upload/image` (multipart)
  - Form field: `file` → Response `{ fileUrl: string }`
- Publish Note with image: `POST https://<site>/.ghost/activitypub/v1/actions/note`
  - Body: `{ content: string, image: { url: string, altText?: string } }`
- Requires `Authorization: Bearer <identity-token>` header on both requests.

Proxy API (server)
- `POST /api/activitypub/upload` (multipart)
  - Accepts `file`, forwards to `{siteUrl}/.ghost/activitypub/v1/upload/image` with Bearer identity
  - Returns `{ fileUrl }`
- `POST /api/activitypub/actions/note` (already implemented in Step 4)

Frontend Tasks
- Extend `NoteComposer`:
  - Add “Add image” button → file picker
  - Preview thumbnail; optional alt text field
  - On submit flow:
    1) If image chosen: upload to `/api/activitypub/upload` → get `{fileUrl}`
    2) Post note to `/api/activitypub/actions/note` with `{ content, image: { url: fileUrl, altText } }`
- Loading states for upload + post; allow canceling the attachment before posting

Data Contracts
- Upload request: multipart form with `file`
- Upload response: `{ fileUrl: string }`
- Post-with-image request: `{ content: string, image: { url: string, altText?: string } }`

Error Handling
- File type/size validation client-side (basic)
- Upload failures show toast and keep composer state intact
- Post failures show toast and keep composer inputs and selected image

Acceptance Criteria
- Users can attach an image and publish a note with that image
- Uploaded image appears in the note within the Notes feed
- Robust error handling and state recovery

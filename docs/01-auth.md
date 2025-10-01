# 01 — Base App + Authentication (Vite + React + Tailwind + shadcn/ui)

Objective
- Scaffold a mobile-first SPA and implement login using Ghost Admin API.
- Users enter Ghost Admin URL, email, and password; the app authenticates and stores a session for subsequent API calls.

Stack
- Frontend: React (Vite), TailwindCSS, shadcn/ui, React Query
- Backend (in the same repo): Express proxy server to handle Ghost Admin auth and later ActivityPub calls
- Package manager: yarn

Why a backend proxy?
- Ghost Admin API uses CORS allowlists and cookie-based sessions. Your app will typically run on a different subdomain than the Ghost site; direct browser calls may be blocked by CORS. A small server-side proxy performs Admin login, stores the Ghost Admin session cookie securely, and forwards subsequent requests on behalf of the user.

Endpoints (Ghost Admin)
- Create session (login): `POST https://<site>/ghost/api/admin/session`
  - Body: `{ username: string, password: string }`
  - On success, Ghost sets session cookies (server must store them).
- Identities (for later steps): `GET https://<site>/ghost/api/admin/identities/` → `{ identities: [{ token }] }`

Deliverables
- Vite + React app with Tailwind + shadcn/ui configured
- Minimal Express server with:
  - `POST /api/auth/login` → crafts `POST /ghost/api/admin/session` to the provided Admin URL; stores Set-Cookie; returns `{siteUrl}`
  - `POST /api/auth/logout` → clears stored session
  - Session store (cookie-session or in-memory map keyed by your app session)
- Frontend login screen; successful login stores `siteUrl` and a client session cookie (not Ghost’s) to auth future proxy calls.

Data Contracts
- Client → `/api/auth/login` body: `{ adminUrl: string, email: string, password: string }`
- Server response: `{ siteUrl: string }`
- Server must store (per user): `siteUrl`, `ghostSessionCookie` (from Set-Cookie header).

Implementation Steps
1) Scaffold app
- Commands:
  - `yarn create vite app --template react-ts`
  - `cd app && yarn`
  - Tailwind setup: `yarn add -D tailwindcss postcss autoprefixer` → init, add to `postcss.config.cjs` and `tailwind.config.cjs`
  - shadcn/ui: `yarn add class-variance-authority clsx tailwind-merge` and install the shadcn CLI; generate required components (Button, Input, Form, Sheet, Card, Alert, Toast)

2) Add React Query and router
- `yarn add @tanstack/react-query react-router-dom sonner`
- Create `QueryClient` and provider in `main.tsx`.

3) Express proxy server
- New folder `server/`
- `yarn add express cors cookie-session node-fetch tough-cookie`
- `yarn add -D typescript ts-node @types/node @types/express`
- Implement `server/index.ts`:
  - Cookie-session with secure, httpOnly session cookie for your app
  - `POST /api/auth/login`:
    - Validate `adminUrl`, `email`, `password`
    - Build `POST {adminUrl}/ghost/api/admin/session` with `{username: email, password}`
    - Capture `Set-Cookie` from Ghost and store as `ghostCookie` in app session; store normalized `siteUrl` (origin of `adminUrl`)
    - Return `{siteUrl}` on success; proper error messages on failures (401/403/429)
  - `POST /api/auth/logout`: clear app session

4) Frontend login page
- Form fields: `adminUrl`, `email`, `password` (shadcn Form + Input + Button)
- On submit: `POST /api/auth/login`
- On success: route to `/reader`
- Save `siteUrl` in local storage and keep nothing sensitive in the client

5) Dev ergonomics
- Vite dev server proxy: configure `/api` → `http://localhost:PORT_OF_SERVER`
- Scripts:
  - `yarn dev:server` → ts-node server
  - `yarn dev:web` → vite
  - `yarn dev` → run both (concurrently)

Security Notes
- Never store Ghost Admin credentials in the browser.
- Only the server contacts Ghost Admin session endpoint.
- Store Ghost session cookie server-side in your app session (not sent to client).
- Validate `adminUrl` and only allow `https:` origins.

Acceptance Criteria
- User can log in using Admin URL, email, password
- After login, app navigates to Reader page; reloading keeps the user logged in (server session remains)
- `POST /api/auth/login` returns 200 on success, errors for invalid credentials, and rate-limit handling
- No Ghost Admin cookies exposed to the browser

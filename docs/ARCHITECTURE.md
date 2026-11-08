# Architecture — Frontend

## Request flow
Browser → Vercel edge → Next.js middleware → page or BFF route handler → Railway → NestJS API

- Page loads pass through `src/middleware.ts` first.
- Login and logout go through the BFF handlers in `src/app/api/auth/`.
- All other data calls are made from the browser straight to the backend (`NEXT_PUBLIC_API_URL`) with a Bearer token read from the `access_token` cookie by `getAccessToken()`.

## Authentication
- **Tokens:** the backend issues an access token (short-lived, HS256) and a refresh token.
- **Cookies:** `POST /api/auth/login` sets `access_token` (readable by JS, needed for Bearer headers) and `refresh_token` (httpOnly, never visible to client JS). Both are `SameSite=Strict`, and `Secure` in production only.
- **Middleware decision order:**
  1. `/api/auth/login` and `/api/auth/logout` pass through.
  2. `/`, `/login`, `/signup`, `/forgot-password`: allowed. A valid token redirects to `/dashboard`. An expired token is ignored. A forged or malformed token has its cookies cleared.
  3. Everything else needs a valid token. No tokens means redirect to `/login`.
  4. A missing access token with a refresh token triggers a refresh.
  5. A valid token with under 60 seconds left triggers a proactive refresh; if that refresh fails the request continues.
  6. An expired token triggers a refresh. Any other verification error (bad signature, malformed token, wrong claims) clears cookies and redirects to `/login`.
- **Signing:** the middleware uses `JWT_SECRET` (server-only, required at startup) and `HS256`. The backend signs with the same secret.
- **Security boundary:** the middleware only decides what to render. The backend `AuthorizeGuard` verifies the Bearer token on every protected endpoint.

## Client IP
The client IP is audit data only. `getClientIp()` reads `x-forwarded-for` (Vercel sets the real client IP as the leftmost value), then `x-real-ip`, then returns an empty string. It is sent to the backend in the `X-Client-IP` header, from both the login handler and the middleware refresh. No third-party lookup is used and nothing waits on IP resolution.

## State management
No global store. Component state, `FormProvider` context for form handling, and direct API calls from pages. The pomodoro timer persists to `localStorage`.

## API contract
- `userRequests.ts` → backend `UserController` (`/user/*`)
- `projectsRequests.ts` → `ProjectsController` (`/projects/*`)
- `taskRequests.ts` → `TaskController` (`/tasks/*`)
- Notifications (`/notifications/*`) have no FE consumer yet.

## Deployment
Vercel builds with the pinned pnpm version from `package.json`. `JWT_SECRET` must be set for Preview and Production, or the middleware refuses to start. The Dockerfile builds the same app on Node 22 for local or container use.

# Architecture — Frontend

## Request flow
Browser → Vercel edge → Next.js middleware → page or BFF route handler → Railway → NestJS API

- Page loads pass through `src/middleware.ts` first.
- Login and logout go through the BFF handlers in `src/app/api/auth/`.
- All other data calls are made from the browser straight to the backend (`NEXT_PUBLIC_API_URL`) through `apiClient` (`src/lib/apiClient.ts`), with a Bearer token read from the `access_token` cookie by `getAccessToken()`. `apiClient` never throws: it returns `ApiResult<T>` and unwraps the backend envelope. A guard 401 with code `TOKEN_INVALID`/`TOKEN_MISSING` triggers one refresh-and-retry; other 401s are ownership errors (`kind:'forbidden'`).

## Authentication
- **Tokens:** the backend issues an access token (short-lived, HS256) and a refresh token.
- **Cookies:** `POST /api/auth/login` sets `access_token` (readable by JS, needed for Bearer headers) and `refresh_token` (httpOnly, never visible to client JS). Both are `SameSite=Strict`, and `Secure` in production only.
- **Middleware decision order:**
  1. `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout` and `/api/auth/refresh` pass through.
  2. `/`, `/login`, `/signup`, `/forgot-password`: allowed. A valid token redirects to `/dashboard`. An expired token is ignored. A forged or malformed token has its cookies cleared.
  3. Everything else needs a valid token. No tokens means redirect to `/login` (for `/oauth/authorize` only, `/login?next=<path+query>`; a signed-in visitor of a public page with a `next` that passes `safeNext` goes there instead of `/dashboard`).
  4. A missing access token with a refresh token triggers a refresh.
  5. A valid token with under 60 seconds left triggers a proactive refresh; if that refresh fails the request continues.
  6. An expired token triggers a refresh. Any other verification error (bad signature, malformed token, wrong claims) clears cookies and redirects to `/login`.
- **Signing:** the middleware uses `JWT_SECRET` (server-only, required at startup) and `HS256`. The backend signs with the same secret.
- **Security boundary:** the middleware only decides what to render. The backend `AuthorizeGuard` verifies the Bearer token on every protected endpoint.

## Session refresh (rotation-safe)
- The backend rotates refresh tokens on every use but replays the same new pair for the old token within a grace window (default 30s), so concurrent refreshes (tabs, middleware, prefetch, client) are idempotent.
- Cookie `maxAge` always equals the JWT lifetime reported by the backend (`access_expires_in`, `refresh_expires_in`). No FE constants.
- Cookies are cleared only on a definitive backend verdict (`invalid`). Network errors, timeouts, 5xx, 429 and malformed responses never touch cookies.
- `POST /api/auth/refresh` is listed in the middleware `authApiRoutes`, otherwise middleware would rotate the cookie first.
- Client: in-tab singleton plus Web Lock `gid-session`; logout only if the access cookie is unchanged since the attempt began.

## OAuth consent (FEAT-07d)
- The BE is the OAuth authorization server for MCP connectors, but its authorization endpoint is the FE page `/oauth/authorize`, because the user's session lives on the FE domain.
- The page checks the parameters (display only), then sends the raw parameters and the decision through the same-origin BFF `POST /api/oauth/decision`, which forwards them with the user's access token. The BE re-validates everything and returns `redirect_to`; the page navigates only to `https:` or loopback `http:` URLs.
- `next.config.mjs` `headers()` forbids framing `/oauth/:path*` (`X-Frame-Options: DENY`, `frame-ancestors 'none'`).

## Client IP
The client IP is audit data only. `getClientIp()` reads `x-real-ip`, then the leftmost `x-forwarded-for`, only when `TRUSTED_PROXY=vercel` (set in Vercel only); otherwise it returns an empty string. It is sent as `X-Client-IP` together with `X-Internal-Secret` (`INTERNAL_API_SECRET`), which lets the backend trust it. Without the secret nothing is sent. No third-party lookup is used and nothing waits on IP resolution.

## State management
No global store. Component state, `FormProvider` context for form handling, and direct API calls from pages. The pomodoro timer persists to `localStorage`.

## API contract
- `userRequests.ts` → backend `UserController` (`/user/*`)
- `projectsRequests.ts` → `ProjectsController` (`/projects/*`)
- `taskRequests.ts` → `TaskController` (`/tasks/*`)
- Notifications: a paged list plus read state (source of truth), and one SSE stream per tab that only signals "refetch". See `CLAUDE.md`.
- `chatRequests.ts` → `ChatController` (`/chat/*`, FEAT-05) plus one WebSocket per tab at `/chat/ws` (`chatSocket.ts`). Unlike notifications, a chat event carries the message and patches the cache directly; only a (re)connect refetches. When SEC-10 adds a CSP, `connect-src` must allow the API's `wss:` origin.

## Transport contract (DATA-02)
- The backend is the runtime boundary (global ValidationPipe, whitelisted DTOs, server-derived identity). The FE mirrors its contract in `src/app/contracts/` and checks it two ways: request bodies are validated with zod before sending (`requestSchema`, failure kind `invalid_request`, nothing is sent), and unwrapped responses are validated after (`schema`, failure kind `invalid_response`).
- Forms stay on Formik + yup with their own value types; mappers are the only place form values become requests. Dates in forms are ISO strings or null.
- Response schemas follow the entities: nullable columns are `.nullable()`; text nulls become `''` (or undefined for user preferences) for display, and update mappers send `null` for `''`. Unknown extra keys are stripped, so a backend addition is not a break.
- Sync: `docs/api-contract.json` and `test/fixtures/responses/` in the BE are copied by `pnpm contract:sync`. Tests compare the FE literals with the JSON and parse every fixture with every schema.

## Server data cache (DATA-03)
- TanStack Query v5 owns every server resource. Keys are `['u', userId, ...]`, and each key equals the request parameters (a test builds the request from the key). Prefixes `tasks`, `analytics`, `projects`, `profile` are what mutations invalidate; `invalidation.ts` is the single matrix.
- Task window: `[bucketStart, bucketStart + 24h + 5min]` in absolute instants, a superset of the old `[now, now + 24h]`. A bucket change produces a new key; the previous window's data stays on screen as placeholder until the new one arrives.
- Cancellation: query functions forward TanStack's `signal` to `apiClient`; an aborted request is a cancellation, never retried, never toasted. Retries: one, only for network or timeout.
- Mutations: task-domain ones share `mutationKey ['taskData']`; only the last of an overlapping burst invalidates (`isMutating === 1`) and returns the promise, so `isPending` covers the refetch. Status mutations are optimistic with per-entity compare-and-swap rollback and `scope: task:<parentId>` serialization.
- Session boundaries: logout and session expiry call `clearQueryCache()` before navigating.
- Load states: `loadStateOf()` is the only policy. A failure is never shown as empty; cancellations and an ending session are silent; a failed refetch keeps the last good data with a compact retry. Error copy is fixed text from `describeLoadFailure()`, and query errors are logged as `[query] <resource> <kind> <status>` only.

## Demo transport seam and open routes (DEMO-01a)
- `apiClient` has one optional seam: `installApiTransport(transport)` (`src/lib/apiTransport.ts`). While a transport is installed, `execute` runs a transport branch FIRST: `validateRequest` (the real `requestSchema`) → `composeSignals(timeout, caller)` → the transport, raced against the composed signal so a transport that ignores its signal still yields `timeout` or `aborted`. The result goes through the same `toResult` as the real path, so response schemas still apply and a 401 is `forbidden` (never a refresh). `getAccessToken`, `refreshSession`, `expireSession`, `fetch` and the `window`/base-URL guards are not reached. With nothing installed the real path is unchanged. One owner at a time (a second install throws `"API transport already installed"`); a release only clears its own install.
- `src/app/demo/runtime.ts` is the only transport owner: an in-memory fake backend (`fake/`) serving the 15 dashboard routes, plus a private `QueryClient` that is never passed to `registerQueryClient`. Unknown routes answer 501 and never reach the network. `stop()` is cancelQueries → retire the store → clear the client → release the transport last.
- Middleware: `openRoutes` (`src/lib/openRoutes.ts`, `/demo` and `/demo/*`) is matched before any auth logic: no token check, no cookie change, no redirect, even for signed-in users. It is separate from `publicRoutes`, which redirect signed-in users to the dashboard. `/demo` has no page until DEMO-01b.

## Deployment
Vercel builds with the pinned pnpm version from `package.json`. `JWT_SECRET` must be set for Preview and Production, or the middleware refuses to start. The Dockerfile builds the same app on Node 22 for local or container use.

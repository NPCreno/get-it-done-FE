# Get It Done — Frontend

## Stack
Next.js 14.2, React 18, TypeScript 5, pnpm (pinned in `package.json` `packageManager`), Tailwind CSS 3.4 + shadcn/ui

## Deployment
Vercel. The backend is a separate NestJS service on Railway (repo `get-it-done-BE`).

## Architecture
- App Router with route groups: `(auth)/` for public auth pages, `(routes)/` for protected pages
- BFF pattern: route handlers at `/api/auth/login` and `/api/auth/logout` talk to the backend and set cookies server-side
- JWT dual-token: httpOnly `refresh_token` cookie + JS-readable `access_token` cookie (sent as a Bearer header by the request helpers)
- `src/middleware.ts` protects every route except the public list, verifies the access token with `jose` `jwtVerify` (HS256), and refreshes tokens silently
- The backend `AuthorizeGuard` is the real security boundary; the middleware is a UX layer

## Routes (8 pages)
- `/` — landing page (`src/app/page.tsx`)
- `/login`, `/signup`, `/forgot-password` — `src/app/(auth)/`
- `/dashboard`, `/projects`, `/notifications`, `/profileSettings` — `src/app/(routes)/`

## API route handlers (3)
- `POST /api/auth/refresh` — silent refresh from the browser; never clears cookies
- `POST /api/auth/login` — validates input, calls backend `/user/loginEmail` or `/user/loginUsername`, sets both cookies, forwards the client IP as `X-Client-IP`
- `POST /api/auth/logout` — revokes the family on the BE, clears both cookies

## Key files
- `src/middleware.ts` — route protection, JWT verification, silent refresh
- `src/app/api/auth/session.ts` — shared server session helpers (refresh, cookies, revoke); used by middleware and the auth route handlers
- `src/lib/apiClient.ts`, `src/lib/clientSession.ts` — browser API client (`ApiResult<T>`, never throws) and refresh-and-retry
- `src/app/utils/clientIp.ts` — `getClientIp(headers)`, audit-only client IP, never throws, no network call
- `src/app/utils/utils.tsx` — `getAccessToken()`, `parseJwt()`, `base64UrlDecode()`, date helpers
- `src/app/api/userRequests.ts`, `projectsRequests.ts`, `taskRequests.ts` — backend calls with a Bearer token

## Directory layout
- `src/app/(auth)/` — login, signup, forgot-password pages
- `src/app/(routes)/` — dashboard, projects, notifications, profileSettings
- `src/app/api/auth/` — BFF route handlers and `authRequests.ts`
- `src/app/api/` — request helpers
- `src/app/components/` — `auth/` (3), `modals/` (5), `shadcn/` (10), top level (22)
- `src/app/context/` — `FormProvider`
- `src/app/interface/` — TS interfaces plus `dto/`, `forms/`, `responses/`
- `src/app/schemas/` — form validation schemas (7 files)
- `src/hooks/` — `useTimer.ts`
- `src/lib/` — `utils.ts`, `timerService.ts`

## Conventions
- Route names are camelCase: `/profileSettings`, not `/profile-settings`
- Formik and react-hook-form both exist, and so do yup and zod (consolidation pending)
- Any new page is protected by default; add it to `publicRoutes` in `middleware.ts` only if it must be open
- Client IP is derived on the server only. Never fetch it from a third party
- Data calls use `apiClient` helpers and return `ApiResult<T>`: check `result.ok`, toast only if `isUserFacing(result)`, reset spinners in `finally`
- No test files exist and `package.json` has no `test` script

## Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint (`next lint`)
- This repo has its own `pnpm-lock.yaml`. Regenerate it with `pnpm install --lockfile-only --ignore-workspace` because the parent folder is also a pnpm workspace

## Environment
- `NEXT_PUBLIC_API_URL` — backend base URL, compiled into browser code
- `JWT_SECRET` — server-only; the middleware throws at startup if it is missing
- `INTERNAL_API_SECRET` — server-only, equals the BE value; attests the forwarded client IP
- `TRUSTED_PROXY=vercel` — Vercel settings only; allows reading Vercel IP headers
- `next build` fails if `NEXT_PUBLIC_API_URL` is unset or not an absolute http(s) URL

## CodeGraph
The repo is indexed (`.codegraph/`). Query with `codegraph_explore` and `projectPath` set to this repo. Auto-sync runs through the file watcher; run `codegraph sync` only if symbols look missing.

## Maintenance
- New file: update `CODEBASE_INDEX.md`
- New feature or endpoint: update `FEATURE_MAP.md`
- Architecture change: update `docs/ARCHITECTURE.md`

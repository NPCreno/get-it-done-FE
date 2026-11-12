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
- `/login`, `/signup`, `/forgot-password` (placeholder: reset not available yet) — `src/app/(auth)/`
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
- `src/app/(auth)/` — login, signup, forgot-password (placeholder) pages
- `src/app/(routes)/` — dashboard, projects, notifications, profileSettings
- `src/app/api/auth/` — BFF route handlers and `authRequests.ts`
- `src/app/api/` — request helpers
- `src/app/components/` — `auth/` (2), `modals/` (5), `shadcn/` (11), top level (23)
- `src/app/context/` — `FormProvider`
- `src/app/contracts/` — transport contract: `enums.ts`, `common.ts`, `requests.ts` and `responses.ts` (zod), `forms.ts`, `mappers.ts`, vendored `api-contract.json`, `__fixtures__/`, `__tests__/`
- `src/app/interface/` — component-facing types (derived from the zod response schemas) plus `forms/` re-exports
- `src/app/schemas/` — form validation schemas (6 files)
- `src/hooks/` — `useTimer.ts`
- `src/lib/` — `utils.ts`, `timerService.ts`

## Conventions
- Fields go through `InputBox` (`useId`, `aria-invalid`, `aria-describedby`). Charts ship a `ChartDataTable` fed by the pure helpers in `components/chartRows.ts` (same array the chart renders; chart SVG is `aria-hidden`, no `accessibilityLayer`). `jsx-a11y/recommended` is enforced by lint: clickable containers use `role="presentation"` only when a real button carries the keyboard path; placeholder links use a targeted disable naming A11Y-02
- Modals use `shadcn/dialog` (Radix): `<Dialog open onOpenChange>` with `DialogContent`, `DialogTitle` and `DialogDescription`. Close buttons are `DialogClose asChild` with `aria-label="Close"`. Never add a window Esc listener or a backdrop onClick. A delete that removes the opener calls `focusFallback(headingRef)` in its success handler. Keep `@radix-ui/*` versions on one `react-dismissable-layer` copy (two copies break layered Esc)
- Route names are camelCase: `/profileSettings`, not `/profile-settings`
- Forms use Formik + yup. Transport uses zod (`contracts/`). Form value types are separate from transport types; `mappers.ts` converts one to the other. `react-hook-form` was removed
- Any new page is protected by default; add it to `publicRoutes` in `middleware.ts` only if it must be open
- Client IP is derived on the server only. Never fetch it from a third party
- Data calls use `apiClient` helpers and return `ApiResult<T>`: check `result.ok`, toast only if `isUserFacing(result)`, reset spinners in `finally`
- Mappers never put `user_id` in a create body (the backend takes the owner from the token). Update mappers turn `''` into `null` so a value can be cleared. Dates in forms are ISO strings or null
- Response schemas: a nullable column is `.nullable()`, never `.optional()`; endpoint-specific shapes get their own schema; check them against fixtures
- Contract sync: the BE exports `docs/api-contract.json` and fixtures. After a BE contract change run `pnpm contract:sync` (needs the sibling `../get-it-done-BE`), then `pnpm test`. `pnpm contract:check` diffs only. CI cannot see the BE repo, so drift is caught locally and by the BE PR checklist
- Tests: `pnpm test` (vitest: contract, fixtures, mappers, query layer). It does not gate the Vercel build
- Server data is read and written only through `src/lib/query` (TanStack Query v5). A query key equals its request parameters (`specs.ts` builds both from the same values). Every mutation declares what it invalidates in `invalidation.ts`; only the last task-data mutation of an overlapping burst invalidates. Only task and subtask status are optimistic (per-entity compare-and-swap rollback, per-parent mutation `scope`). Do not fetch in `useEffect` and keep results in `useState`
- Pages render server data through `loadStateOf(query, isEmpty)`, never `data ?? EMPTY`. Only a successful empty response is "empty"; 404 is never empty. Load errors show `describeLoadFailure()` (fixed copy), never server text; use `LoadError` for every retry
- The task window is quantized to 5-minute buckets (`window.ts`); a task due up to 5 minutes outside today's exact 24 h window may show
- Task completion from the project view now uses the status endpoint, so it triggers notifications

## Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint (`next lint`)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — vitest (`src/**/__tests__/**/*.test.ts`)
- `pnpm contract:sync` / `pnpm contract:check` — vendored BE contract and fixtures
- This repo has its own `pnpm-lock.yaml`. Regenerate it with `pnpm install --lockfile-only --ignore-workspace` because the parent folder is also a pnpm workspace

## CI
- GitHub Actions `.github/workflows/ci.yml` runs `pnpm lint`, `pnpm typecheck` and `pnpm test` on every PR and on pushes to `main`. The build is covered by Vercel preview deployments; `contract:check` needs the sibling BE checkout, so it stays local.
- Test pyramid: pure units (mappers, load-state policy, query layer) in vitest with a node environment. There is no DOM or e2e layer. New features add tests at the lowest level that covers them.

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

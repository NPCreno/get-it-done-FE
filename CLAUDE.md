# Get It Done — Frontend

## Stack
Next.js 15.5, React 19, TypeScript 5, pnpm (pinned in `package.json` `packageManager`; `overrides` live in `pnpm-workspace.yaml`: `recharts>react-is` matches React, `next>postcss` clears an advisory), Tailwind CSS 3.4 + shadcn/ui

## Deployment
Vercel. The backend is a separate NestJS service on Railway (repo `get-it-done-BE`).

## Architecture
- App Router with route groups: `(auth)/` for public auth pages, `(routes)/` for protected pages
- BFF pattern: route handlers at `/api/auth/login`, `/api/auth/signup` and `/api/auth/logout` talk to the backend and set cookies server-side
- JWT dual-token: httpOnly `refresh_token` cookie + JS-readable `access_token` cookie (sent as a Bearer header by the request helpers)
- `src/middleware.ts` protects every route except the public list, verifies the access token with `jose` `jwtVerify` (HS256), and refreshes tokens silently
- The backend `AuthorizeGuard` is the real security boundary; the middleware is a UX layer

## Routes (9 pages, plus the public `/demo`)
- `/` — landing page (`src/app/page.tsx`)
- `/login`, `/signup`, `/forgot-password` (placeholder: reset not available yet) — `src/app/(auth)/`
- `/dashboard`, `/projects`, `/notifications`, `/profileSettings` — `src/app/(routes)/`
- `/demo` — public, signed-out dashboard on an in-browser fake API (`src/app/demo/`, listed in `openRoutes`)
- `/oauth/authorize` — protected OAuth consent page for MCP connectors (FEAT-07d), no sidebar (`src/app/oauth/`)

## API route handlers (5)
- `POST /api/auth/refresh` — silent refresh from the browser; never clears cookies
- `POST /api/auth/login` — validates input, calls backend `/user/loginEmail` or `/user/loginUsername`, sets both cookies, forwards the client IP as `X-Client-IP`
- `POST /api/auth/signup` — validates with `CreateUserRequestSchema`, forwards only the four signup fields to BE `/user/create` with the attested client IP (SEC-09: the BE rate limits signup per client IP), passes the envelope and a 429 `Retry-After` through
- `POST /api/auth/logout` — revokes the family on the BE, clears both cookies
- `POST /api/oauth/decision` — FEAT-07d consent Allow/Deny: `isSameOrigin`, the access token from the `Authorization: Bearer` header (sent by `apiClient`), forwards only the known authorize params + `decision` to BE `POST /oauth/authorize`, returns `{ redirect_to }` only; failures are fixed copy, a TOKEN_* 401 keeps its `code` so `apiClient` refreshes and retries

## Key files
- `src/middleware.ts` — route protection, JWT verification, silent refresh
- `src/app/api/auth/session.ts` — shared server session helpers (refresh, cookies, revoke); used by middleware and the auth route handlers
- `src/lib/apiClient.ts`, `src/lib/clientSession.ts` — browser API client (`ApiResult<T>`, never throws) and refresh-and-retry
- `src/app/utils/clientIp.ts` — `getClientIp(headers)`, audit-only client IP, never throws, no network call
- `src/app/utils/utils.tsx` — `getAccessToken()`, `parseJwt()`, `base64UrlDecode()`, date helpers
- `src/app/api/userRequests.ts`, `projectsRequests.ts`, `taskRequests.ts`, `chatRequests.ts`, `tokensRequests.ts` — backend calls with a Bearer token

## Directory layout
- `src/app/(auth)/` — login, signup, forgot-password (placeholder) pages
- `src/app/(routes)/` — dashboard, projects, notifications, profileSettings
- `src/app/api/auth/` — BFF route handlers and `authRequests.ts`
- `src/app/api/` — request helpers
- `src/app/components/` — `apiTokens/` (9), `auth/` (2), `chat/` (5), `modals/` (5), `oauth/` (1), `shadcn/` (11), top level (23)
- `src/app/context/` — `FormProvider`
- `src/app/contracts/` — transport contract: `enums.ts`, `common.ts`, `requests.ts` and `responses.ts` (zod), `forms.ts`, `mappers.ts`, vendored `api-contract.json`, `__fixtures__/`, `__tests__/`
- `src/app/interface/` — component-facing types (derived from the zod response schemas) plus `forms/` re-exports
- `src/app/schemas/` — form validation schemas (6 files)
- `src/hooks/` — `useTimer.ts`, the toast controller, `presence.ts` / `usePresence.ts` (UX-04 loader show/hide)
- `src/lib/` — `utils.ts`, `timerService.ts`

## Conventions
- Fields go through `InputBox` (`useId`, `aria-invalid`, `aria-describedby`). Charts ship a `ChartDataTable` fed by the pure helpers in `components/chartRows.ts` (same array the chart renders; chart SVG is `aria-hidden`, no `accessibilityLayer`). `jsx-a11y/recommended` is enforced by lint: clickable containers use `role="presentation"` only when a real button carries the keyboard path; placeholder links use a targeted disable naming A11Y-02
- Modals use `shadcn/dialog` (Radix): `<Dialog open onOpenChange>` with `DialogContent`, `DialogTitle` and `DialogDescription`. Close buttons are `DialogClose asChild` with `aria-label="Close"`. Never add a window Esc listener or a backdrop onClick. A delete that removes the opener calls `focusFallback(headingRef)` in its success handler. Keep `@radix-ui/*` versions on one `react-dismissable-layer` copy (two copies break layered Esc)
- Route names are camelCase: `/profileSettings`, not `/profile-settings`
- Forms use Formik + yup. Transport uses zod 4 (`contracts/`); type a schema parameter as `ZodType<T>`. Form value types are separate from transport types; `mappers.ts` converts one to the other. `react-hook-form` was removed
- Task delete always asks (BUG-05): call `useTaskDelete().requestDelete(taskId, title)` and render `<TaskDeleteConfirm flow>` ("Delete this task?", Cancel / Delete). The function that deletes is private to the hook, so no call site can skip the confirm; a recurring task keeps its "this one or all" dialog. The Delete button itself still shows only when `can_delete`
- Sidebar items are real Next `<Link>`s (BUG-05): no `menuitem` role, no `role="menu"` in the drawer, decorative icons with `alt=""`, the name read once (the visible label, or `sidebarLinkLabel` with a badge). The drawer's focus code selects links (`a[href]`), not roles
- Desktop sidebar (UX-02): only its toggle button expands it (`isSidebarExpanded` / `toggleSidebar` in `FormProvider`, remembered in `localStorage`); hover does nothing. Only the panel's width animates (widths from `sidebarWidths.ts`); the logo title and link labels are always rendered and clipped, never `display:none`. Below 768 px the hamburger drawer is the only navigation and the only dialog
- `MainLayout`'s scroll container is `relative` (BUG-06): absolute children such as `sr-only` captions must stay inside it, or the window grows a second scrollbar and a blank band. A horizontal scroller (`overflow-x-auto`) that holds `sr-only` children, such as the token table, is `relative` too, or on a phone those children widen the scroll box and a click shifts the page sideways. The root and scroll-box classes live in `mainLayoutClasses.ts` (tested in `components/__tests__/bug06.test.ts`)
- Any new page is protected by default; add it to `publicRoutes` in `middleware.ts` only if it must be open
- Login `next` (FEAT-07d): only `safeNext()` (`src/lib/safeNext.ts`) decides a post-login target, and it accepts only `/oauth/authorize` or `/oauth/authorize?…` (no `//`, `\`, schemes, whitespace or encoded tricks); anything else is `/dashboard`. The middleware adds `next` only for `/oauth/authorize` (`loginPathFor`), sends a signed-in visitor of `/login?next=…` to `safeNext(next)`, and login/signup links carry it with `withNext`. Never widen this list without a plan. Clients open the consent page with a cross-site navigation, which does not carry our `SameSite=Strict` cookies, so the middleware sends even a signed-in user to `/login?next=…`; the login page then calls `resumeConsentIfSignedIn()` (`src/lib/resumeConsent.ts`: a live session, at most once per `next` per tab) and continues same-origin
- Files in `public/` skip the middleware by extension (the `config.matcher` list in `middleware.ts`: svg, png, jpg, jpeg, gif, webp, avif, ico, mp3, wav, ogg, woff, woff2). A new asset type must be added there, or signed-out visitors get a redirect to `/login` instead of the file
- Client IP is derived on the server only. Never fetch it from a third party
- `apiClient` sends cookies only to same-origin BFF routes (`sameOrigin: true` → `credentials: "same-origin"`), because the middleware needs them to let a protected route handler run; the backend never gets cookies (`"omit"`)
- Data calls use `apiClient` helpers and return `ApiResult<T>`: check `result.ok`, toast only if `isUserFacing(result)`, reset spinners in `finally`
- Mappers never put `user_id` in a create body (the backend takes the owner from the token). Update mappers turn `''` into `null` so a value can be cleared. Dates in forms are ISO strings or null
- Response schemas: a nullable column is `.nullable()`, never `.optional()`; endpoint-specific shapes get their own schema; check them against fixtures
- Contract sync: the BE exports `docs/api-contract.json` and fixtures. After a BE contract change run `pnpm contract:sync` (needs the sibling `../get-it-done-BE`), then `pnpm test`. `pnpm contract:check` diffs only. CI cannot see the BE repo, so drift is caught locally and by the BE PR checklist
- Tests: `pnpm test` (vitest: contract, fixtures, mappers, query layer). It does not gate the Vercel build
- Server data is read and written only through `src/lib/query` (TanStack Query v5). A query key equals its request parameters (`specs.ts` builds both from the same values). Every mutation declares what it invalidates in `invalidation.ts`; only the last task-data mutation of an overlapping burst invalidates. Only task and subtask status are optimistic (per-entity compare-and-swap rollback, per-parent mutation `scope`). Do not fetch in `useEffect` and keep results in `useState`
- Pages render server data through `loadStateOf(query, isEmpty)`, never `data ?? EMPTY`. Only a successful empty response is "empty"; 404 is never empty. Load errors show `describeLoadFailure()` (fixed copy), never server text; use `LoadError` for every retry
- The task window is quantized to 5-minute buckets (`window.ts`); a task due up to 5 minutes outside today's exact 24 h window may show
- Notifications (`assignment` links to `/projects` through `NOTIFICATION_ACTION_ROUTES`): the list endpoint (`useNotifications`, an infinite query keyed `['u', id, 'notifications']`, opaque `next_cursor`) is the source of truth. `src/lib/notificationStream.ts` keeps ONE `fetch`-streamed SSE connection per tab (ref-counted, mounted by `useNotificationStream` in `MainLayout`, bearer token direct to the backend, backoff 1 s to 30 s with jitter, aborted while the tab is hidden) and an event or a reconnect only invalidates the list. The same stream carries `chat` events (FEAT-08), which only invalidate `qk.chatUnread` (a reconnect invalidates both) `useMarkNotificationRead` is optimistic with per-row rollback. Where a notification leads comes only from `NOTIFICATION_ACTION_ROUTES` (`src/lib/notificationRoutes.ts`), never from backend data. The sidebar badge shows the first page's `unread_count`
- Project chat (FEAT-05): `src/lib/chatSocket.ts` keeps ONE WebSocket per tab (ref-counted rooms, `{"type":"auth","token"}` as the first frame and never the token in the URL, joins only after `ready`, the notification backoff, close 4401 → `refreshSession` → reconnect, re-join and refetch every open room after a reconnect, a `removed` room is not re-joined). Server frames are `{type, data}`. A `message.created`/`message.deleted` event patches the messages cache directly (`chatCache.ts`, idempotent by id); send and delete patch it from the REST response and invalidate nothing. Keys: `['u', id, 'projects', pid, 'members' | 'messages']`, `['u', id, 'projects', 'shared']` and `['u', id, 'projects', 'chat-unread']` (under the `projects` prefix, so project mutations also invalidate them). Unread badges (FEAT-08): `useChatUnread()` gives `{ total, countFor }`; a chat open in this tab reads 0; `useMarkChatReadWhileOpen` is optimistic with compare-and-swap rollback. UI lives in `components/chat/`; chat is not in `/demo`
- The dashboard body (`components/dashboard/DashboardView`) is layout-free and shared with `/demo`: it must not use `MainLayout`, `useProfile`, `useUnreadCount`, `useNotifications`, the notification stream or token reads. `.eslintrc.json` restricts these imports in `components/dashboard/` and `components/tasks/`; a child that adds one later is caught by the demo's 0-request check
- Task completion from the project view now uses the status endpoint, so it triggers notifications
- Shared tasks (FEAT-09): the owner and every member work on a shared project's tasks. The projects page's "Shared with me" cards open the same `ViewProjectModal` with `canManageProject={false}` (no members or project actions). Delete shows only when the row's server-computed `can_delete` is true (`canDeleteTask`); never work it out on the FE. Rows show `AssigneeChip` (initials, "You" or "Assigned to <username>", and "in <project> · <owner>" only when the owner is not me: the BE sends `project_owner_username` for every task with a project). Removing a member (`chat-member-removed`) or leaving (`chat-left`) also refreshes that project's task data, because the removed person's tasks go back to the owner and the actor gets no `tasks` event. The task editor lists shared projects as a "Shared with me" group and shows `AssigneeSelect` (`useChatMembers`) once a project is chosen; a project change resets it; recurring tasks get the hint "Each repeat starts unassigned." Create sends `assignee_id`; edit calls `PATCH /tasks/:id/assignee` only when it changed, after the field update (a failure there closes with "Task saved, but the assignee couldn't be changed."). Pure rules live in `components/tasks/assignee.ts`. The `tasks` SSE event (`TASKS_SSE_EVENT`, data `{project_id}`) refreshes `tasksInvalidationsFor(userId, projectId)` through `invalidateUnlessMutating` (skipped while a task mutation of mine is in flight; its settle covers it); a reconnect, not the first connect, also refreshes `tasks` and `analytics`. `/demo` provides `SharingContext` = false, so nothing there asks for shared projects or members
- Notification parsing is tolerant of types (FEAT-09): `NotificationsPageSchema` drops a row whose `type` the FE does not know (one `console.warn`), so a new BE type never breaks the bell; a known type with a broken row still fails. Task row schemas give the FEAT-09 fields defaults (unassigned, `can_delete: true`) so an older response still parses
- Task create/update goes through `useTaskEditor(toast)` (`components/tasks/`): `open({mode, task?, projectId?})` fully initializes, `close()` fully clears, and it is the only writer of `selectedTaskData`. A failed save keeps the modal open and the values; only success closes. The editor has its own form, separate from the projects page's project form
- The projects page body lives in `components/projects/` (ARCH-01 PR D): `ProjectsView` composes `ProjectGrid`, `ProjectEditorDialog` and the view-project flow; `page.tsx` only wraps it in `MainLayout`. `useProjectEditor` owns the project form (project fields only) and fills it from `useProject` once per editing session, only for the project being edited and never when dirty (`shouldPrefill` in `projectPrefill.ts`), so a refetch can't overwrite edits and project values can't reach the task form
- OAuth consent (FEAT-07d): `/oauth/authorize` (`components/oauth/ConsentView`) reads only the known authorize params (`readAuthorizeParams`; a repeated param is invalid), shows the BE check (`useOAuthCheck`, display only, 60 s timeout for a Render cold start) and re-sends the RAW params with the decision through `POST /api/oauth/decision`. The browser leaves only for a URL passing `isSafeRedirectTarget` (`https:`, or `http:` on `localhost`/`127.0.0.1`/`[::1]`, no userinfo); otherwise, and for any fatal check (`isFatalConsentFailure`), it shows the fixed "isn't valid" page and never redirects. `next.config.mjs` sends `X-Frame-Options: DENY` and `frame-ancestors 'none'` for `/oauth/:path*`. No OAuth token, code or verifier is ever in the FE: grants list without them (`OAuthGrantSchema` strips unknown keys) and the decision mutation has `gcTime: 0`. "Connected apps" (`apiTokens/ConnectedAppsList`, `DisconnectAppDialog`) uses `useOAuthGrants` / `useRevokeOAuthGrant` (optimistic removal, rollback only while the row is still absent). Not in `/demo`
- API tokens (FEAT-07, Profile → "Connect an AI assistant"): a token secret (`gid_pat_…`) exists only in the `POST /tokens` response. It never enters the React Query cache (the create mutation has `gcTime: 0`, writes no query data, refetches the list instead, and the dialog calls `reset()` once it has the token), `localStorage`, `sessionStorage` or a log; it lives in the section's React state until the "created" dialog closes. `ApiTokenSchema` strips unknown keys, so a list can't carry one. `src/lib/__tests__/apiTokens.test.ts` searches the whole cache for `gid_pat_`. The MCP URL is built from `NEXT_PUBLIC_API_URL` by `mcpServerUrl()`, never hard-coded. Tokens are not in `/demo`
- Cold start (UX-03): `serverWake` (`src/lib/serverWake.ts`) is the only place that knows the BE is waking. `apiClient` reports slow (>5 s, `reportSlow(startedAt)`) and unreachable (`network`/`timeout`) backend calls, never `sameOrigin` ones; `refreshSession` reports a slow refresh. While waking it pings the BE `GET /` (origin of `NEXT_PUBLIC_API_URL`, no credentials, one in flight, 5 s apart, gives up after 3 min). `MainLayout` shows `ServerWakeBanner` (A waking / B longer from 45 s / C down with Try again / D awake held 1.2 s; view rules in `serverWakeView.ts`). When the BE answers, active queries in error refetch (`query/wake.ts`, wired in `QueryProvider`). `LoadError` shows a text-free skeleton instead of the error for a `network`/`timeout` failure while waking or during the refetch right after (`showWaitingForServer`); the banner is the only place that says the app is waiting. Login and signup show `WakeHint` after 5 s pending. Auth BFF routes wait 55 s (`BACKEND_COLD_START_MS`, `maxDuration = 60` in the login, signup, refresh and OAuth decision routes); the middleware keeps 10 s; the browser waits 60 s for `/api/auth/refresh` and signup. `warmUp()` pings once per tab per 10 min (`sessionStorage`) on `/`, `/login` and `/signup`. Never in `/demo` (everything is a no-op while a transport is installed). Transition duration and easing classes in the banner are arbitrary properties (`[transition-duration:…]`): `tailwindcss-animate` makes the arbitrary-value `duration-`/`ease-` classes ambiguous and Tailwind drops them
- Full-page loader (UX-04): `LoadingPage` is an overlay inside `MainLayout`'s scroll box (`absolute inset-0`), shown only for a page's first load (`useFirstLoad` + `usePresence`). It never covers `ServerWakeBanner` (`z-10`). Motion tokens `loader-*` and `page-in` live in `tailwind.config.ts`. Design: canvas page 'Full-page loader'. Render it after the view's root, never inside it (the root's page-in transform would become its containing block); the root gets `PAGE_IN_CLASS` from `usePageIn(loader.leaving)`. Class strings live in `components/loaderClasses.ts` because Tailwind does not scan `src/hooks`. Callers pass `dark`; the loader reads no context. Notifications uses `variant="inline"` for a later loading state
- Pomodoro styles (FEAT-10): `usePomodoroController` owns behaviour; `DialTimer`/`TicketTimer`/`HorizonTimer` only render. The style comes from `pomodoroStyleOf(userData)` (never `useProfile` in timer components). The Profile picker saves on change with `useSetPomodoroStyle` (optimistic, rollback), separate from the Profile form. `completedFocusRounds` lives in `timerService` (client only). Pure helpers live in `components/pomodoro/geometry.ts` and `faceCopy.ts`; colour classes in `faceClasses.ts` (primary actions are `text-text` on amber, never white). Saves share one mutation `scope` (last pick wins) and roll back compare-and-swap to the last confirmed style (`lib/query/pomodoroStyle.ts`)
- Toasts: a page calls `useToastController()` once and passes that instance to `<ToastHost controller>` and to every handler (`toast.success/failure/unexpected/error/show`). Never keep `showToast`/`setTimeout` toast state in a page; a new toast cancels the previous one's timers

## Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint (`next lint`)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — vitest (`src/**/__tests__/**/*.test.ts`)
- `pnpm contract:sync` / `pnpm contract:check` — vendored BE contract and fixtures
- This repo has its own `pnpm-lock.yaml` and `pnpm-workspace.yaml`, so pnpm treats it as its own root even though the parent folder is also a workspace. Regenerate the lockfile with `pnpm install --lockfile-only`. Never add `--ignore-workspace`: pnpm 11 then skips this repo's `pnpm-workspace.yaml` and silently drops its `overrides` from the lockfile (SEC-12b)
- `.github/dependabot.yml` scans `pnpm-lock.yaml` for alerts with a PR limit of 0 (no update PRs)

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

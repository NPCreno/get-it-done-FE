# Frontend Review & Improvement Checklist

**Reviewed:** 2026-11-05  
**Scope:** Current `get-it-done-FE` implementation. This is a living document. Keep completed items checked and add an entry under [Completed improvements](#completed-improvements); do not replace this roadmap during later reviews.

See [Full-Stack Portfolio Roadmap](./FULL_STACK_PORTFOLIO_ROADMAP.md) for cross-repository architecture, SEO/AIO, CMS, and e-commerce planning.

## Current architecture overview

| Area | Current implementation |
| --- | --- |
| Framework | Next.js 14 App Router, TypeScript strict mode, Tailwind, shadcn/Radix-style primitives. |
| Route structure | Landing page, auth route group, and dashboard/projects/notifications/profile pages. Each application page renders `MainLayout`; there is no authenticated route-segment layout. |
| Rendering | Most pages are Client Components. Data arrives after hydration through `useEffect`; there is no Server Component data layer, route handler, or explicit caching policy. |
| Shared state | Root `FormProvider` combines session user, navigation UI, task selection, date filters, loading, layout width, and refresh state. |
| API integration | Three browser-side fetch modules call the Nest API using `NEXT_PUBLIC_API_URL`, read the access token from `document.cookie`, and construct their own headers/errors. |
| Forms | Formik + Yup, wrapped by a polymorphic `InputBox` that converts custom control output into synthetic change events. `react-hook-form`, Zod, and Sonner are installed but unused. |
| Authentication | Nest JWT login/signup writes access and refresh tokens from browser JavaScript. Middleware provides route redirects and refresh. |
| Synchronization | Route-local effects, boolean refresh flags, and manual `setTimeout` toast/loaders. Dashboard requests six resources in parallel with `Promise.allSettled`. No query cache, polling, WebSocket, or SSE client. |
| Tests | No unit, component, E2E, or accessibility tests found. |

## Existing feature inventory

| Feature | Current implementation | Status |
| --- | --- | --- |
| Public landing | Client-side marketing page and navigation. | Implemented |
| Sign-up/login | Nest-backed email/username login, validation, remember-me UI. | Implemented |
| Password reset | Email/OTP form UI. | Placeholder; backend calls are TODOs |
| Dashboard | Today’s tasks, completion state, search, statistics, completion trend, distribution, heatmap, streak, and project selection. | Implemented |
| Tasks/subtasks | Create/update/delete, recurring task setup/deletion, status changes, subtasks. | Implemented; contract issue noted below |
| Projects | Create/edit/view/delete and project-scoped task actions. | Implemented |
| Profile | Profile, preferences, theme, sound/notification setting, logout. | Implemented |
| Pomodoro | Local singleton timer with sound and localStorage persistence. | Implemented well |
| Notifications | Styled empty state/cards. Backend SSE is not consumed. | Not yet integrated |
| Responsive navigation | Desktop hover sidebar, mobile dialog/sidebar with Escape and focus handling. | Implemented; needs a11y test |

## Strengths to preserve

- `tsconfig.json` enables `strict`; `tsc --noEmit` passed in this review.
- ESLint reported no warnings/errors in this review.
- The dashboard fetches independent resources in parallel rather than serially.
- `TimerService` avoids timer drift by calculating from an absolute end time and persists local timer state.
- The UI already has loading, error, confirmation, and success feedback patterns.
- Local assets generally use `next/image`; the component folder contains reusable task, project, modal, chart, timer, and navigation primitives.
- Mobile navigation already considers Escape, focus, and scroll locking.

## Findings and roadmap

### Security and authentication

- [x] **SEC-01 — Remove legacy third-party authentication configuration**  
  **Completed:** The unused authentication client, its dependencies, and its environment variables were removed. Authentication now relies on the Get It Done backend API.  
  **Follow-up:** Rotate any credentials that may have been exposed before this removal and ensure server-only secrets fail closed when absent.  
  **Files:** `.env`, `.env.example`, `package.json`, landing/auth pages, and `src/middleware.ts`.

- [ ] **SEC-02 — Use HttpOnly cookies for the backend session authority**  
  **Current:** Login/signup write access and refresh JWTs with `js-cookie`/`document.cookie`; client requests read them back. Middleware sets refreshed cookies as HttpOnly.  
  **Issue:** Browser-readable refresh tokens are vulnerable to XSS. Signup always writes a `Secure` cookie, which is incompatible with local HTTP. Two session authorities cause inconsistent redirect behavior.  
  **Recommendation:** Issue same-origin `HttpOnly`, `Secure` (production), `SameSite` cookies through a backend or Next BFF/Route Handler; stop reading refresh tokens in browser code.  
  **Benefit:** Stronger session protection and a prerequisite for safe server rendering/SSE.  
  **Priority:** Critical · **Complexity:** Large  
  **Files:** `LoginForm.tsx`, `SignupForm.tsx`, `userRequests.ts`, `authRequests.ts`, `middleware.ts`, landing/auth pages.

- [ ] **SEC-03 — Correct middleware verification and route protection**  
  **Current:** Middleware verifies signatures at `/`, but protected routes base64-decode JWT payloads and only inspect expiration. It protects `/profile-settings` while navigation uses `/profileSettings`.  
  **Issue:** Unverified claims must not grant frontend access; the profile route mismatch leaves it outside the intended guard.  
  **Recommendation:** After SEC-02, centralize server session verification, verify every protected request cryptographically, adopt one canonical route style, and test the matcher.  
  **Benefit:** Reliable redirects and no protected shell rendered from forged claims.  
  **Priority:** High · **Complexity:** Medium  
  **Files:** `src/middleware.ts`, `Sidebar.tsx`, `MobileSidebar.tsx`, `profileSettings/page.tsx`.

- [ ] **SEC-04 — Remove IPify from the login and middleware critical path**  
  **Current:** `getIPAddress()` calls `api.ipify.org`; middleware invokes it for every matched request and forms invoke it before login/signup.  
  **Issue:** It adds third-party latency/privacy exposure and has already caused TLS runtime failures. A browser-supplied IP is not trustworthy.  
  **Recommendation:** Derive IP at the trusted API/reverse-proxy boundary; make it optional and never block auth on it.  
  **Benefit:** Faster, more private, more reliable navigation and authentication.  
  **Priority:** High · **Complexity:** Medium  
  **Files:** `utils.tsx`, `middleware.ts`, auth forms, backend auth contract.

### Data, API, and state management

- [ ] **DATA-01 — Add a typed API client with one error/auth boundary**  
  **Current:** API modules duplicate token lookup, fetch options, JSON parsing, error mapping, and URL construction. Several response types are unchecked.  
  **Issue:** Error behavior varies, messages are occasionally wrong, and every auth/cancellation/contract change has to be made repeatedly.  
  **Recommendation:** Build a small typed client that owns base URL validation, `URLSearchParams`, error parsing, request cancellation, and an explicit result/error shape. Keep domain modules as thin wrappers.  
  **Benefit:** Less duplication and a safe migration point after SEC-02.  
  **Priority:** High · **Complexity:** Medium  
  **Files:** `src/app/api/**`, `utils.tsx`.

- [ ] **DATA-02 — Align DTOs, validation, and API transport contracts**  
  **Current:** DTOs make nearly all fields optional, model JSON dates as `Date`, and use broad strings. `CreateProjectDto` omits backend-required `user_id`/`colorLabel`; task validation checks `Weekly` while the backend uses `Week`.  
  **Issue:** Strict TypeScript is bypassed by casts and synthetic events, so contract drift can become runtime failures.  
  **Recommendation:** Use exact transport types (including ISO date strings and status unions) and separate form types where `Date | null` is useful. Share generated OpenAPI types or maintain runtime parsing at the client boundary.  
  **Benefit:** Correct recurring-task validation, fewer casts, safer API changes.  
  **Priority:** High · **Complexity:** Medium  
  **Files:** `interface/**`, `schemas/**`, `api/**`, `TaskModal.tsx`, `ProjectModal.tsx`.

- [ ] **DATA-03 — Establish cache/query ownership and mutation invalidation**  
  **Current:** Effects and boolean toggles own server state. Dashboard has six requests; projects fetches project data in two separate effects. Dashboard refetches when `showToast` changes.  
  **Issue:** Modal/toast changes trigger avoidable traffic. Effects have no cancellation or late-response protection. Boolean toggles can lose invalidation when mutations overlap.  
  **Recommendation:** Use focused query keys by user/project/date with SWR or TanStack Query (only because this app has repeated shared server data), invalidation after mutation, and AbortSignals. Start by removing duplicate effects and decoupling data refresh from visual state.  
  **Benefit:** Fewer requests, predictable freshness, and smaller route components.  
  **Priority:** High · **Complexity:** Large  
  **Files:** dashboard/projects/profile pages, `MainLayout.tsx`, API modules.

- [ ] **DATA-04 — Preserve real errors instead of rendering all failures as empty data**  
  **Current:** Streak/heatmap helpers return zero/empty data for most errors; dashboard uses generic fallbacks.  
  **Issue:** “No data yet,” offline, unauthorized, and backend failure look alike.  
  **Recommendation:** Model expected empty states separately and show retryable inline errors for other failures.  
  **Benefit:** Honest analytics and faster diagnosis.  
  **Priority:** Medium · **Complexity:** Small  
  **Files:** `taskRequests.ts`, dashboard/charts.

- [x] **DATA-05 — Correct and test the subtask status route contract**  
  **Resolved:** casing fixed in DATA-01; canonical lowercase and contract check in DATA-05.  
  **Was:** Frontend called `update-subtask-status`; backend declared `update-subTask-status`.  
  **Issue:** Case-sensitive deployments can fail this action.  
  **Recommendation:** Choose a lowercase path, update both repositories, and add an integration test.  
  **Benefit:** Removes a likely environment-specific defect.  
  **Priority:** High · **Complexity:** Small  
  **Files:** `taskRequests.ts`, `TaskItem.tsx`, backend task controller.

### Architecture, rendering, and performance

- [ ] **ARCH-01 — Split dashboard and projects into feature-level units**  
  **Current:** `dashboard/page.tsx` is ~1,345 lines and `projects/page.tsx` ~1,021 lines, each combining forms, fetching, mutations, loaders, toasts, modals, and rendering.  
  **Issue:** Task mutation and feedback code is duplicated; small behavior changes are difficult to test.  
  **Recommendation:** After DATA-01/DATA-03, extract feature hooks/components for task list/editor, project list, analytics, and shared mutation feedback. Preserve behavior first; do not redesign everything at once.  
  **Benefit:** Clearer ownership, less duplication, focused tests, targeted rerenders.  
  **Priority:** High · **Complexity:** Large  
  **Files:** dashboard/projects pages, `TaskModal.tsx`, `TaskItem.tsx`, project components.

- [ ] **ARCH-02 — Narrow the root provider and centralize feedback lifecycle**  
  **Current:** `FormProvider` holds unrelated navigation, user, task, filter, loader, and refresh state. Pages repeat toast state and untracked timeout sequences.  
  **Issue:** Broad context changes can rerender unrelated consumers; timeouts can survive navigation.  
  **Recommendation:** Separate session/preferences, navigation UI, and selection/filter contexts or co-locate state. Add one toast provider with cleanup before manually memoizing everything.  
  **Benefit:** More predictable rendering and consistent feedback.  
  **Priority:** Medium · **Complexity:** Medium  
  **Files:** `FormProvider.tsx`, route pages, `Toast.tsx`, `modals/**`.

- [ ] **ARCH-03 — Add authenticated layouts, loading, and error boundaries**  
  **Current:** Every protected page renders `MainLayout`; loading is a page-local state machine and no `loading.tsx`, `error.tsx`, or `not-found.tsx` exists.  
  **Issue:** Shell and recovery behavior is repeated.  
  **Recommendation:** After auth ownership is fixed, add a protected route group with shared layout and route-level loading/error boundaries; preserve local skeletons only where a specific widget benefits.  
  **Benefit:** Less duplication and consistent recovery.  
  **Priority:** Medium · **Complexity:** Medium  
  **Files:** `(routes)/**`, `MainLayout.tsx`, `layout.tsx`.

- [ ] **PERF-01 — Move stable content/read paths server-side only after SEC-02**  
  **Current:** Most rendering/fetching is client-side.  
  **Issue:** Server Components cannot safely fetch user data while the browser owns bearer/refresh tokens. Converting the interactive dashboard wholesale would not help.  
  **Recommendation:** Once session cookies/BFF are safe, move the marketing page, content, shared shell, and initial read-only data first; retain forms, timer, charts, filters, and modals as client islands. Measure before/after with Core Web Vitals and a bundle analyzer.  
  **Benefit:** Faster first render and less JavaScript where measurable.  
  **Priority:** Medium · **Complexity:** Large  
  **Files:** `layout.tsx`, `page.tsx`, `(routes)/**`, session/API layer.

- [ ] **PERF-02 — Profile before large optimization changes**  
  **Current:** No Web Vitals/bundle analysis configuration; dashboard eagerly imports interactive chart/modal UI.  
  **Issue:** There is no baseline for deciding whether dynamic import, virtualization, or memoization is worthwhile.  
  **Recommendation:** Add performance observability, fix known duplicate fetches first, then profile realistic task counts before lazy-loading charts or virtualizing lists.  
  **Benefit:** Evidence-based performance work rather than fashionable optimization.  
  **Priority:** Low · **Complexity:** Small  
  **Files:** `next.config.mjs`, dashboard, deployment configuration.

### Realtime, accessibility, and developer experience

- [ ] **RT-01 — Design notification persistence before adding SSE**  
  **Current:** Backend offers an SSE endpoint, but the frontend uses an empty local notification list and has no EventSource/client cache.  
  **Issue:** There is no user-scoped fetch/read/acknowledge model, event ID, reconnect strategy, or authorization story.  
  **Recommendation:** Define persisted notification endpoints and per-user events first. Then add one managed EventSource with reconnect/backoff and query invalidation. Do not use SSE for the local Pomodoro timer.  
  **Benefit:** A meaningful real-time showcase feature without polling or data leaks.  
  **Priority:** Medium · **Complexity:** Large  
  **Files:** notifications page/card/interfaces, API/session layer, backend notification module.

- [ ] **A11Y-01 — Standardize dialog/input/chart accessibility**  
  **Current:** Mobile sidebar has useful focus handling. Most modals lack complete dialog semantics/focus restoration; `InputBox` does not set explicit invalid/error relationships; analytics have no documented text equivalent.  
  **Issue:** Keyboard/screen-reader behavior is inconsistent on core workflows.  
  **Recommendation:** Standardize on an accessible dialog primitive, add IDs/`aria-describedby`/`aria-invalid`, keyboard-test custom dropdown/date controls, and provide concise chart summaries.  
  **Benefit:** Inclusive, testable task/project workflows.  
  **Priority:** High · **Complexity:** Medium  
  **Files:** `InputBox.tsx`, `modals/**`, date/dropdown/chart components.

- [ ] **DX-01 — Add tests and CI before major refactors**  
  **Current:** No tests or CI workflow were found.  
  **Issue:** Auth, contract transforms, recurring validation, and task mutations have no automated safety net.  
  **Recommendation:** Add unit tests for schemas/API errors; integration tests for auth refresh, middleware matchers, and status actions; one E2E flow for login, task CRUD, and logout. Run typecheck, lint, test, and production build in CI.  
  **Benefit:** Safe incremental refactors and portfolio-grade engineering evidence.  
  **Priority:** High · **Complexity:** Large  
  **Files:** `package.json`, middleware, API modules, schemas, new test/CI files.

- [ ] **FEAT-01 — Implement password reset end-to-end or hide it**  
  **Current:** The reset UI says OTP/password change succeeds while API calls are TODOs.  
  **Issue:** It is misleading in an account-recovery flow.  
  **Recommendation:** Implement rate-limited reset endpoints, expiry, generic anti-enumeration responses, and tests; otherwise remove/disable the entry point.  
  **Benefit:** A trustworthy account recovery experience.  
  **Priority:** High · **Complexity:** Large  
  **Files:** `ForgotPasswordForm.tsx`, auth route, backend auth/user modules.

- [ ] **DX-02 — Finish package-manager and dependency cleanup deliberately**  
  **Current:** pnpm is declared but `package-lock.json` remains; several installed packages are unused.  
  **Issue:** Multiple install paths and unused dependencies add variance. Formik/Yup itself is working, so a migration is not justified by novelty.  
  **Recommendation:** Keep Formik/Yup until a concrete limitation exists. Choose pnpm as the one supported workflow after verification, remove unused packages, document Node/pnpm versions, and add standard project commands.  
  **Benefit:** Reproducible setup and a smaller dependency surface.  
  **Priority:** Medium · **Complexity:** Small  
  **Files:** `package.json`, lockfiles, README/workspace docs.

## Prioritized checklist

### Phase 0 — Protect users and contracts

- [ ] SEC-01, SEC-02, SEC-03, SEC-04
- [ ] DATA-02, DATA-05

### Phase 1 — Make change safe

- [ ] DX-01, DATA-01, DATA-04, FEAT-01, A11Y-01

### Phase 2 — Improve data ownership and maintainability

- [ ] DATA-03, ARCH-01, ARCH-02, ARCH-03, ARCH-04, PERF-02

### Phase 3 — Platform features and measured performance work

- [ ] PERF-01, PERF-02, RT-01, DX-02

## Completed improvements

_No roadmap item is completed yet. Add completed work without deleting its original checklist item:_

```md
### YYYY-MM-DD — [ITEM-ID] Outcome

- Changed: `path/to/file.tsx`
- Verification: test/command/manual scenario
- Notes: follow-up decision
```

## Review evidence

- Reviewed route pages, shared layout/context, request modules, middleware, forms/schemas, DTOs/interfaces, timer service, package configuration, and environment key names (values were not read).
- `tsc --noEmit` and ESLint passed during this review.
- No authenticated end-to-end session was run; backend behavior references the local workspace contract and should be covered by DX-01 tests.

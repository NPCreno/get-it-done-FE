# Codebase Index — Frontend

One line per significant source file. Paths are relative to the repo root.

## Pages (`src/app/`)
- `src/app/layout.tsx` — root layout, wraps children in `FormProvider`
- `src/app/page.tsx` — landing page
- `src/app/(auth)/login/page.tsx` — login page, hosts `LoginForm`
- `src/app/(auth)/signup/page.tsx` — signup page, hosts `SignupForm`
- `src/app/(auth)/forgot-password/page.tsx` — forgot-password page, a static placeholder (self-service reset is not available yet)
- `src/app/(routes)/dashboard/page.tsx` — dashboard: `<MainLayout><DashboardView/></MainLayout>` only
- `src/app/(routes)/projects/page.tsx` — project list and tasks per project
- `src/app/(routes)/notifications/page.tsx` — notifications list
- `src/app/(routes)/profileSettings/page.tsx` — profile editing and logout

## Middleware and BFF
- `src/middleware.ts` — open routes first (`isOpenRoute`), then the public-route allowlist, `jwtVerify`, proactive and expired-token refresh
- `src/app/api/auth/session.ts` — edge-safe shared session helpers: `refreshWithBackend` (ok / invalid / unavailable), `setSessionCookies`, `clearSessionCookies`, `revokeWithBackend`, `backendAuthHeaders`, `isSameOrigin`
- `src/app/api/auth/refresh/route.ts` — `POST /api/auth/refresh`, client-side silent refresh (never clears cookies)
- `src/app/api/auth/signup/route.ts` (+ `payload.ts`) — BFF signup, forwards the attested client IP to BE `/user/create`
- `src/app/api/auth/login/route.ts` — BFF login, sets httpOnly refresh cookie and readable access cookie
- `src/app/api/auth/logout/route.ts` — BFF logout, revokes the token family on the BE, clears cookies

## Browser API client (`src/lib/`)
- `apiClient.ts` — `apiClient()` never throws, returns `ApiResult<T>`; `apiPath`, `isUserFacing`, `describeFailure`
- `apiTransport.ts` — `installApiTransport(transport) → release`, `getActiveApiTransport()`: optional seam that replaces the network (one owner, ownership-checked idempotent release); used only by the demo
- `openRoutes.ts` — `openRoutes = ["/demo"]`, pure `isOpenRoute(pathname)` used by the middleware
- `__tests__/` — `apiClient` characterization and transport tests (`apiClient.test.ts`, `apiTransport.test.ts`), `openRoutes.test.ts`
- `clientSession.ts` — `refreshSession()` (in-tab singleton + Web Lock `gid-session`), `expireSession()`

## Demo infrastructure (`src/app/demo/`, DEMO-01a; no page or UI yet)
- `runtime.ts` — `createDemoRuntime({clock}) → { store, transport, queryClient, reset(), start(), stop() }`, framework-free; its `QueryClient` is never registered with `registerQueryClient`
- `fake/clock.ts`, `seed.ts` (relative to `clock.now()`, id `demo-user`, `demo@example.invalid`), `store.ts` (instance state, `generation`, `retire()`), `crud.ts` (validates with the real request schemas), `analytics.ts` (demo-only simplified rules), `router.ts` (15 routes by method + anchored path, 501 otherwise, optional hit log)
- `DemoRuntimeBoundary.tsx` (one runtime per mount, inner `FormProvider` + `DemoIdentity` + the demo's own `QueryClientProvider`), `DemoLayout.tsx` (banner, Reset, Sign up / Log in, no protected links), `DemoBody.tsx` (re-exports `components/dashboard/DashboardView`), `page.tsx` (`/demo`), `demoUser.ts`
- `__tests__/` — `fake.test.ts` (seed invariants, schema conformance, semantics, router), `runtime.test.ts` (lifecycle, isolation, concurrency, reset), `endpoints.test.ts` (D8 drift guard over `specs.ts`, `taskRequests.ts`, `projectsRequests.ts`)

## Query layer (`src/lib/query/`)
- `client.ts` — `createQueryClient()` defaults, `clearQueryCache()` (called on logout/expiry); `../../app/providers/QueryProvider.tsx` mounts it
- `keys.ts` — `qk` key factories; `specs.ts` — key + request built from the same params; `window.ts` — 5-minute task window
- `queries.ts` — `useProfile`, `useProjects`, `useProject`, `useUpcomingTasks`, `useProjectTasks`, `useDashboardSummary`, `useCompletionTrend`, `useTaskDistribution`, `useCalendarHeatmap`, `useStreak`, `useSessionUserId`, `useTaskWindow`
- `mutations.ts` — task, subtask, project and profile mutations; optimistic `setTaskStatusOptions` / `setSubTaskStatusOptions`
- `loadState.ts` — `loadStateOf()` (loading / error / empty / ready); `emptiness.ts` — per-resource empty rules; `keys.ts` also has `resourceOf()` (log labels)
- `../../app/components/LoadError.tsx` — the shared retryable error block and `useRecoveryFocus`
- `invalidation.ts` — event to prefixes matrix and the burst gate; `optimistic.ts` — pure status patches; `unwrap.ts` — `ApiError`, `must`, `unwrap`, `settled`, `isCancellation`
- `__tests__/` — window, key/request, cancellation, cache behavior, optimistic and status mutation tests

## Request helpers (`src/app/api/`)
All return `ApiResult<T>`; callers check `result.ok`.
- `userRequests.ts` — `createUser`, `getUser`, `updateUser`
- `projectsRequests.ts` — project create, list, get, update, delete
- `taskRequests.ts` — task and subtask CRUD, status updates, dashboard, trend, distribution, heatmap, streak
- `paths.ts` — pure path builders for the status routes; `contracts/__tests__/routes.test.ts` checks them against the vendored contract `routes`

## Components (`src/app/components/`)
Auth (`auth/`)
- `LoginForm.tsx` — login form, posts to `/api/auth/login`
- `SignupForm.tsx` — signup form, creates user then logs in through `/api/auth/login`

Modals (`modals/`)
- `taskModal.tsx` — create and edit tasks and subtasks
- `projectModal.tsx` — create and edit projects
- `viewProject.tsx` — project detail view
- `pomodoro.tsx` — pomodoro timer modal
- `confirmation.tsx` — confirmation dialog

Layout and navigation
- `MainLayout.tsx` — page shell with sidebar
- `Sidebar.tsx`, `MobileSidebar.tsx`, `sidebarLink.tsx`, `HamburgerButton.tsx` — navigation
- `DashboardSearch.tsx` — expandable search box with its own state, so typing does not re-render the dashboard page (it filters nothing yet)

Dashboard and data display
- `statsCard.tsx` — summary stat card
- `chartCard.tsx` — chart container
- `MonthlyHeatmap.tsx` — calendar heatmap
- `streakCounter.tsx` — streak display
- `projectCard.tsx` — project summary card
- `taskItem.tsx` — task row with status and subtasks
- `notificationCard.tsx` — single notification (mark-as-read)
- `src/lib/notificationStream.ts`, `useNotificationStream.ts` — the managed SSE stream; `notificationRoutes.ts` — action-route allowlist; `relativeTime.ts`; `src/lib/query/notifications.ts`, `notificationsOptimistic.ts` — list, read-state and clear hooks; `src/app/api/notificationsRequests.ts`

Inputs and small UI
- `inputBox.tsx`, `dropdown.tsx`, `datePicker.tsx`, `datePickerWithTime.tsx`, `weekdaySelector.tsx`, `toggleSwitch.tsx` — form controls
- `toast.tsx`, `loader.tsx` — feedback
- `ToastHost.tsx` — renders a page's toast from its controller
- `PomodoroButton.tsx` — opens the pomodoro modal
- `ChartDataTable.tsx` — screen-reader-only table (caption, columns, rows) that accompanies each chart
- `chartRows.ts` — pure row builders (`trendRows`, `distributionRows`, `heatmapRows`) with vitest cases in `components/__tests__/chartRows.test.ts`

shadcn (`shadcn/`)
- `areaChart.tsx`, `pieChart.tsx`, `chart.tsx` — charts
- `dialog.tsx` — Radix Dialog wrapper used by every modal (role, title/description, focus trap, layered Esc, focus return to the opener)
- `button.tsx`, `card.tsx`, `calendar.tsx`, `popover.tsx`, `scroll-area.tsx`, `select.tsx`, `dropdown-menu.tsx` — primitives

## State, hooks, lib, utils
- `src/app/context/FormProvider.tsx` — shared form context
- `src/hooks/useTimer.ts` — timer hook
- `src/app/components/tasks/` — the one task editor (ARCH-01 PR B): `useTaskEditor.ts` (`open`/`close`/`submit`, own Formik form, the only writer of `selectedTaskData`), `TaskEditorDialog.tsx` (renders the unchanged `TaskModal`), `taskSaveOutcome.ts` (pure `outcomeOf`: failure keeps the modal open and the values), tests in `__tests__/`, `useTaskDelete.ts` (single and recurring delete, takes the page's toast and editor)
- `src/app/components/dashboard/` — the layout-free dashboard body shared by `/dashboard` and `/demo` (ARCH-01 PR C): `DashboardView.tsx` (no props; toast, editor, loader, Pomodoro, recurring-delete dialog), `DashboardHeader.tsx`, `StatsRow.tsx`, `TaskBoard.tsx`, `AnalyticsGrid.tsx`, `useDashboardData.ts` (the 7 queries and load states). A lint override blocks layout hooks, `MainLayout` and token reads here and in `tasks/`
- `src/hooks/toastController.ts` (framework-independent, owns timers), `useToastController.ts` (one per page, disposed on unmount) — toast state; tests in `src/hooks/__tests__/`
- `src/lib/timerService.ts` — pomodoro timer state, persisted in `localStorage` key `pomodoroTimerState`
- `src/lib/utils.ts` — shadcn class-name helper
- `src/lib/focusFallback.ts` — `focusFallback(ref)`: after a delete removes the focused opener, moves focus to a page heading
- `src/app/utils/utils.tsx` — `getAccessToken`, `parseJwt`, `base64UrlDecode`, week-range helper
- `src/app/utils/clientIp.ts` — `getClientIp(headers)`

## Interfaces (`src/app/interface/`)
- `I*.ts` — entity and response shapes (`IUser`, `IProject`, `ITask`, `ISubTask`, `INotification`, `IDashboardData`, `IHeatmapData`, `ITaskCompletionTrendData`, `ITaskDistribution`)
- `forms/` — form value and error types (`ITaskFormValues` etc. re-export `contracts/forms.ts`)
- `I*.ts` response types are aliases of the zod-inferred types in `contracts/responses.ts`

## Contracts (`src/app/contracts/`)
- `enums.ts` — FE literals (`TASK_PRIORITIES`, `WEEKDAYS`, …) and `narrow()`
- `common.ts` — `LIMITS`, `PATTERNS`, `ApiDate`, `DateOnly`, `Count`, `NullableText`, `OptionalText`
- `requests.ts` — zod request schemas (no `user_id`)
- `responses.ts` — zod response schemas, one per endpoint shape
- `forms.ts` — form value types (ISO-string dates)
- `mappers.ts` — `toCreateTaskRequest`, `toUpdateTaskRequest`, `toCreateProjectRequest`, `toUpdateProjectRequest`, `toCreateSubTaskRequest`, `toSignupRequest`, `toProfileUpdateRequest`, `toIso`, `cleanRepeatDays`
- `api-contract.json` — vendored copy of the BE export; `__fixtures__/` — captured BE responses
- `__tests__/` — contract, response-fixture and mapper tests
- `../../../scripts/api-contract.mjs` — `contract:sync` / `contract:check`; `../../../vitest.config.ts`

## Schemas (`src/app/schemas/`)
- `loginSchema.tsx`, `signUpSchema.tsx`, `updateUserSchema.tsx`, `projectSchema.tsx`, `createTaskSchema.tsx`, `createSubTaskSchema.tsx` — form validation

## CI
- `.github/workflows/ci.yml` — lint, typecheck, test on every PR and on pushes to `main`

## Root config
- `package.json`, `pnpm-lock.yaml`, `next.config.*`, `tailwind.config.*`, `tsconfig.json`, `Dockerfile`, `.env.example`, `codegraph.json`

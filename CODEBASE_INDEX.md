# Codebase Index — Frontend

One line per significant source file. Paths are relative to the repo root.

## Pages (`src/app/`)
- `src/app/layout.tsx` — root layout, wraps children in `FormProvider`
- `src/app/page.tsx` — landing page
- `src/app/(auth)/login/page.tsx` — login page, hosts `LoginForm`
- `src/app/(auth)/signup/page.tsx` — signup page, hosts `SignupForm`
- `src/app/(auth)/forgot-password/page.tsx` — forgot-password page, a static placeholder (self-service reset is not available yet)
- `src/app/(routes)/dashboard/page.tsx` — dashboard: stats, charts, heatmap, streak, tasks, projects
- `src/app/(routes)/projects/page.tsx` — project list and tasks per project
- `src/app/(routes)/notifications/page.tsx` — notifications list
- `src/app/(routes)/profileSettings/page.tsx` — profile editing and logout

## Middleware and BFF
- `src/middleware.ts` — public-route allowlist, `jwtVerify`, proactive and expired-token refresh
- `src/app/api/auth/session.ts` — edge-safe shared session helpers: `refreshWithBackend` (ok / invalid / unavailable), `setSessionCookies`, `clearSessionCookies`, `revokeWithBackend`, `backendAuthHeaders`, `isSameOrigin`
- `src/app/api/auth/refresh/route.ts` — `POST /api/auth/refresh`, client-side silent refresh (never clears cookies)
- `src/app/api/auth/login/route.ts` — BFF login, sets httpOnly refresh cookie and readable access cookie
- `src/app/api/auth/logout/route.ts` — BFF logout, revokes the token family on the BE, clears cookies

## Browser API client (`src/lib/`)
- `apiClient.ts` — `apiClient()` never throws, returns `ApiResult<T>`; `apiPath`, `isUserFacing`, `describeFailure`
- `clientSession.ts` — `refreshSession()` (in-tab singleton + Web Lock `gid-session`), `expireSession()`

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
- `notificationCard.tsx` — single notification

Inputs and small UI
- `inputBox.tsx`, `dropdown.tsx`, `datePicker.tsx`, `datePickerWithTime.tsx`, `weekdaySelector.tsx`, `toggleSwitch.tsx` — form controls
- `toast.tsx`, `loader.tsx` — feedback
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

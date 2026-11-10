# Codebase Index — Frontend

One line per significant source file. Paths are relative to the repo root.

## Pages (`src/app/`)
- `src/app/layout.tsx` — root layout, wraps children in `FormProvider`
- `src/app/page.tsx` — landing page
- `src/app/(auth)/login/page.tsx` — login page, hosts `LoginForm`
- `src/app/(auth)/signup/page.tsx` — signup page, hosts `SignupForm`
- `src/app/(auth)/forgot-password/page.tsx` — forgot-password page, hosts `ForgotPasswordForm`
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

## Request helpers (`src/app/api/`)
All return `ApiResult<T>`; callers check `result.ok`.
- `userRequests.ts` — `createUser`, `getUser`, `updateUser`
- `projectsRequests.ts` — project create, list, get, update, delete
- `taskRequests.ts` — task and subtask CRUD, status updates, dashboard, trend, distribution, heatmap, streak

## Components (`src/app/components/`)
Auth (`auth/`)
- `LoginForm.tsx` — login form, posts to `/api/auth/login`
- `SignupForm.tsx` — signup form, creates user then logs in through `/api/auth/login`
- `ForgotPasswordForm.tsx` — forgot-password flow

Modals (`modals/`)
- `taskModal.tsx` — create and edit tasks and subtasks
- `projectModal.tsx` — create and edit projects
- `viewProject.tsx` — project detail view
- `pomodoro.tsx` — pomodoro timer modal
- `confirmation.tsx` — confirmation dialog

Layout and navigation
- `MainLayout.tsx` — page shell with sidebar
- `Sidebar.tsx`, `MobileSidebar.tsx`, `sidebarLink.tsx`, `HamburgerButton.tsx` — navigation

Dashboard and data display
- `statsCard.tsx` — summary stat card
- `chartCard.tsx` — chart container
- `MonthlyHeatmap.tsx` — calendar heatmap
- `streakCounter.tsx` — streak display
- `projectCard.tsx` — project summary card
- `taskItem.tsx` — task row with status and subtasks
- `notificationCard.tsx` — single notification

Inputs and small UI
- `inputBox.tsx`, `dropdown.tsx`, `datePicker.tsx`, `datePickerWithTime.tsx`, `weekdaySelector.tsx`, `toggleSwitch.tsx`, `OTPinput.tsx` — form controls
- `toast.tsx`, `loader.tsx` — feedback
- `PomodoroButton.tsx` — opens the pomodoro modal

shadcn (`shadcn/`)
- `areaChart.tsx`, `pieChart.tsx`, `chart.tsx` — charts
- `button.tsx`, `card.tsx`, `calendar.tsx`, `popover.tsx`, `scroll-area.tsx`, `select.tsx`, `dropdown-menu.tsx` — primitives

## State, hooks, lib, utils
- `src/app/context/FormProvider.tsx` — shared form context
- `src/hooks/useTimer.ts` — timer hook
- `src/lib/timerService.ts` — pomodoro timer state, persisted in `localStorage` key `pomodoroTimerState`
- `src/lib/utils.ts` — shadcn class-name helper
- `src/app/utils/utils.tsx` — `getAccessToken`, `parseJwt`, `base64UrlDecode`, week-range helper
- `src/app/utils/clientIp.ts` — `getClientIp(headers)`

## Interfaces (`src/app/interface/`)
- `I*.ts` — entity and response shapes (`IUser`, `IProject`, `ITask`, `ISubTask`, `INotification`, `IDashboardData`, `IHeatmapData`, `ITaskCompletionTrendData`, `ITaskDistribution`)
- `dto/` — request payloads (create and update for user, project, task, subtask)
- `forms/` — form value and error types
- `responses/` — API response wrappers

## Schemas (`src/app/schemas/`)
- `loginSchema.tsx`, `signUpSchema.tsx`, `forgotPasswordSchema.tsx`, `updateUserSchema.tsx`, `projectSchema.tsx`, `createTaskSchema.tsx`, `createSubTaskSchema.tsx` — form validation

## Root config
- `package.json`, `pnpm-lock.yaml`, `next.config.*`, `tailwind.config.*`, `tsconfig.json`, `Dockerfile`, `.env.example`, `codegraph.json`

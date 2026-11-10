# Feature Map — Frontend

Request chains per feature. Backend paths are shown without the `/api` prefix, because `NEXT_PUBLIC_API_URL` already ends in it.

## Authentication
- Login: `(auth)/login/page.tsx` → `LoginForm.tsx` → `POST /api/auth/login` (`login/route.ts`) → BE `/user/loginEmail` or `/user/loginUsername`. The route sets the cookies.
- Signup: `(auth)/signup/page.tsx` → `SignupForm.tsx` → `createUser()` in `userRequests.ts` → BE `/user/create`, then `POST /api/auth/login` with `rememberMe: true`.
- Forgot password: `(auth)/forgot-password/page.tsx` → `ForgotPasswordForm.tsx` (UI only, no backend call found).
- Logout: `profileSettings/page.tsx` `confirmLogout()` → `POST /api/auth/logout` (`logout/route.ts`), then clears `pomodoroTimerState` from `localStorage`.
- Token refresh (navigation): `middleware.ts` → `refreshWithBackend()` in `session.ts` → BE `/auth/refresh`. Prefetches skip the proactive refresh.
- Token refresh (browser calls): `apiClient` gets a TOKEN_INVALID/TOKEN_MISSING 401 → `refreshSession()` → `POST /api/auth/refresh` → BE `/auth/refresh`, then retries once. A definitive invalid result runs `expireSession()` → `POST /api/auth/logout` → `/login`.
- All data calls go through `apiClient` (`src/lib/apiClient.ts`): envelope unwrapped, `status !== 'success'` becomes `kind:'api'`.
- Route protection: `middleware.ts` (public-route allowlist, everything else needs a valid token).

## Dashboard
- Main view: `dashboard/page.tsx` → `getDashboardData()` → BE `/tasks/getDashboardData/:user_id`
- Charts: `dashboard/page.tsx` calls `getTaskCompletionTrend()` → BE `/tasks/completion-trend/:user_id` and `getTaskDistributionData()` → BE `/tasks/task-distribution/:user_id`; rendered by `chartCard.tsx`, `shadcn/areaChart.tsx`, `shadcn/pieChart.tsx`
- Heatmap: `dashboard/page.tsx` → `getCalendarHeatmap()` → BE `/tasks/calendar-heatmap/:user_id`, rendered by `MonthlyHeatmap.tsx`
- Streak: `dashboard/page.tsx` → `getStreakCount()` → BE `/tasks/streak/:user_id`, rendered by `streakCounter.tsx`

## Projects
- List: `dashboard/page.tsx` and `projects/page.tsx` → `projectCard.tsx` → `getProjectsForUser()` → BE `/projects/getAll/:user_id`
- Create and edit: `projects/page.tsx` with `modals/projectModal.tsx` → `createProject()`, `updateProject()` → BE `/projects/create`, `/projects/:project_id`
- Delete: `projects/page.tsx` → `deleteProjectById()` → BE `DELETE /projects/:project_id`
- Detail: `projects/page.tsx` → `modals/viewProject.tsx` → `getProjectById()` → BE `/projects/:project_id`

## Tasks
- By project: `projects/page.tsx` → `taskItem.tsx` → `getTasksByProject()` → BE `/tasks/getTasksByProj/:project_id`
- By user: `useUpcomingTasks()` (`lib/query`) → `getTasksByUser()` → BE `/tasks/getTasksByUser/:user_id`. Mutations invalidate by prefix; status toggles are optimistic
- Task completion from the project view (`modals/viewProject.tsx`) now goes through the status endpoint, so it triggers notifications (it used to be a plain update)
- Create, edit, delete: `dashboard/page.tsx` and `projects/page.tsx` with `modals/taskModal.tsx` → `toCreateTaskRequest()` / `toUpdateTaskRequest()` (`contracts/mappers.ts`) → `createTaskApi()`, `updateTaskApi(taskId, payload)`, `deleteTaskApi()` → BE `/tasks/create`, `/tasks/:task_id`. No `user_id` is sent; weekly recurrence sends only valid weekday names
- Status update: `taskItem.tsx` → `updateTaskStatus()` → BE `/tasks/update-task-status/:task_id/status/:status`
- Subtasks: `taskItem.tsx` → `createSubTaskApi()`, `updateSubTaskStatus()`; `dashboard/page.tsx` → `deleteSubTaskApi()` → BE subtask endpoints
- Recurring: `deleteRecurringTasksApi()` → BE `/tasks/deleteRecurringTasks/:taskTemplate_id`

## Notifications
- List: `notifications/page.tsx` → `notificationCard.tsx`
- The backend exposes an SSE stream at `/notifications/sse` and `DELETE /notifications/clear/:user_id`. No FE code that opens an `EventSource` or calls these was found.

## Pomodoro timer
- `PomodoroButton.tsx` → `modals/pomodoro.tsx` → `hooks/useTimer.ts` → `lib/timerService.ts`
- State persisted in `localStorage` key `pomodoroTimerState`

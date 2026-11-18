# Feature Map — Frontend

Request chains per feature. Backend paths are shown without the `/api` prefix, because `NEXT_PUBLIC_API_URL` already ends in it.

## Authentication
- Login: `(auth)/login/page.tsx` → `LoginForm.tsx` → `POST /api/auth/login` (`login/route.ts`) → BE `/user/loginEmail` or `/user/loginUsername`. The route sets the cookies.
- Signup: `(auth)/signup/page.tsx` → `SignupForm.tsx` → `createUser()` in `userRequests.ts` (same-origin `apiClient`) → `POST /api/auth/signup` (`signup/route.ts`) → BE `/user/create`, then `POST /api/auth/login` with `rememberMe: true`.
- Forgot password: placeholder page only. Self-service reset is not implemented; tracked in FEAT-01 phase 2.
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

## Demo (signed out)
- `/demo`: `demo/page.tsx` → `DemoRuntimeBoundary` (in-browser fake API installed through `installApiTransport`, no backend requests) → `DemoLayout` → `DemoBody` → the shared `components/dashboard/DashboardView`. Reset demo swaps in a fresh store. Linked from `/login` and `/signup` ("Try the demo"). The Pomodoro timer uses `localStorage` and is shared with the real dashboard in the same browser (accepted, DEMO-01).

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
- Subtask status: `updateSubTaskStatus()` → BE `/tasks/update-subtask-status/:taskSubInstance_id/status/:status` (canonical lowercase; paths come from `api/paths.ts`, checked against the contract)
- Subtasks: `taskItem.tsx` → `createSubTaskApi()`, `updateSubTaskStatus()`; `dashboard/page.tsx` → `deleteSubTaskApi()` → BE subtask endpoints
- Recurring: `deleteRecurringTasksApi()` → BE `/tasks/deleteRecurringTasks/:taskTemplate_id`

## Notifications
- List: `notifications/page.tsx` → `notificationCard.tsx`
- Data: `GET /notifications` (paged, `unread_count`), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/clear/:user_id` through `notificationsRequests.ts` and `src/lib/query/notifications.ts`. Page actions: mark one read (card or button), Mark all as read, Clear all (confirmation dialog), Load more.
- Live: `useNotificationStream` (in `MainLayout`) holds one SSE connection and refetches the list on a `notification` event and on every (re)connect. The sidebar and mobile sidebar show an unread badge.

## Project chat (FEAT-05)
- Sharing: the owner's project view (`modals/viewProject.tsx`) has Members → `chat/MembersDialog.tsx` → `getChatMembers()`, `addChatMember()`, `removeChatMember()` → BE `GET|POST /chat/projects/:project_id/members`, `DELETE /chat/projects/:project_id/members/:user_id`. Add by exact username; at most 20 members.
- Shared with me: `projects/page.tsx` → `chat/SharedProjectsSection.tsx` → `getSharedProjects()` → BE `GET /chat/shared-projects`. Members see the title, color and owner, and the chat, never the tasks. Leave = remove yourself.
- Chat: `chat/ChatPanel.tsx` (from the owner's project view or a shared card) → `getChatMessagesPage()` (newest first, opaque cursor), `sendChatMessage()`, `deleteChatMessage()` → BE `/chat/projects/:project_id/messages[/:id]`. You delete your own messages; the owner deletes any.
- Live: `useChatRoom` joins the project's room on the one per-tab socket (`chatSocket.ts`, `wss://<api>/chat/ws`, auth frame first). `message.created` / `message.deleted` patch the cache; a reconnect refetches; `removed` shows "no longer have access". Chat is not in `/demo`.
- Unread badges (FEAT-08): `useChatUnread()` → `getChatUnread()` → BE `GET /chat/unread` (per project, capped at 100, plus a total). Shown on the sidebar's Projects link (`badge`, `badgeLabel`), each project card, each "Shared with me" card and the Chat button (`chat/UnreadBadge.tsx`: 1-99, "99+", none at 0). An open `ChatPanel` reads 0 and `useMarkChatReadWhileOpen` → `markChatRead()` → BE `PUT /chat/projects/:project_id/read` (optimistic, debounced 500 ms, only while the tab is visible). Live: a `chat` event on the notifications SSE stream invalidates the counts.

## Connect an AI assistant (FEAT-07, phase 1)
- Profile settings → `apiTokens/ApiTokensSection.tsx`: what it is, the read-only MCP **server URL** (`mcpServerUrl(NEXT_PUBLIC_API_URL)` in `src/lib/mcpSetup.ts`: the backend origin + `/mcp`, beside its `/api` prefix), the token table (name, created, last used, expires, status) and the phase-2 note (claude.ai connector sign-in is coming).
- List: `useApiTokens()` → `getApiTokens()` → BE `GET /tokens` (every status; never a secret or hash).
- Create: `apiTokens/CreateTokenDialog.tsx` (name 1-60, expiry 30 / 90 / 365 days / none, 90 preselected) → `useCreateApiToken()` → `createApiToken()` → BE `POST /tokens`. The 10-active-token limit, validation and the rate limit show as fixed copy in the form (`tokenCopy.ts` `createErrorCopy`); the button is disabled at 10 active tokens.
- Shown once: `apiTokens/TokenCreatedDialog.tsx` — the token with a copy button, "Copy it now. You won't see it again.", and copy-ready Claude Code (`claude mcp add --transport http get-it-done <url> --header "Authorization: Bearer <token>"`) and Cursor (`mcp.json`) snippets from `mcpSetup.ts`. A click outside does not close it; Done, Close and Esc do, and that drops the token.
- Revoke: `apiTokens/RevokeTokenDialog.tsx` (confirm, focus on Cancel) → `useRevokeApiToken()` (optimistic: the row shows Revoked, compare-and-swap rollback) → `revokeApiToken()` → BE `DELETE /tokens/:id`.
- The secret never enters the React Query cache, storage or logs (see `CLAUDE.md`). Not in `/demo`.

## Pomodoro timer
- `PomodoroButton.tsx` → `modals/pomodoro.tsx` → `hooks/useTimer.ts` → `lib/timerService.ts`; labels from `lib/timerPhase.ts` (a paused timer says "Paused" / "Resume")
- State persisted in `localStorage` key `pomodoroTimerState`

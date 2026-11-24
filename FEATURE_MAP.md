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

## Full-page loader (UX-04)
- Dashboard (and `/demo`), projects, profile and notifications: `useFirstLoad(loading)` → `usePresence(firstLoad)` (`src/hooks/usePresence.ts`, pure cores in `presence.ts`) → `<LoadingPage dark leaving />` (`components/loader.tsx`, classes in `loaderClasses.ts`), an overlay over `MainLayout`'s scroll box (or the demo's `<main>`), so the sidebar stays put. It fades in after 150 ms, the arc turns every 1.6 s, and on data it fades and lifts while the view root rises in (`usePageIn`). Cached navigations show the page at once. Reduced motion: full ring, breathing tile, opacity only. `ServerWakeBanner` (`z-10`) shows above it. Notifications shows `variant="inline"` for a later loading state.

## Server cold start (UX-03)
- Render's free BE sleeps after ~15 idle minutes. `apiClient` (backend calls only) and `refreshSession` report to `src/lib/serverWake.ts`; while waking it pings BE `GET /` and `MainLayout` shows `ServerWakeBanner`. On the first 2xx, `query/wake.ts` refetches active queries in error and the banner turns green, then folds away. `LoadError` shows a skeleton (no text) for `network`/`timeout` failures meanwhile; after 3 minutes the banner offers Try again and cards show the usual error.
- Login and signup: `auth/WakeHint.tsx` after 5 s pending; BFF routes wait 55 s (`BACKEND_COLD_START_MS`, `maxDuration = 60`); `/`, `/login` and `/signup` call `serverWake.warmUp()` (one `GET /` per tab per 10 min). Not in `/demo`.

## Dashboard
- Main view: `dashboard/page.tsx` → `getDashboardData()` → BE `/tasks/getDashboardData/:user_id`
- Charts: `dashboard/page.tsx` calls `getTaskCompletionTrend()` → BE `/tasks/completion-trend/:user_id` and `getTaskDistributionData()` → BE `/tasks/task-distribution/:user_id`; rendered by `chartCard.tsx`, `shadcn/areaChart.tsx`, `shadcn/pieChart.tsx`
- Heatmap: `dashboard/page.tsx` → `getCalendarHeatmap()` → BE `/tasks/calendar-heatmap/:user_id`, rendered by `MonthlyHeatmap.tsx`
- Streak: `dashboard/page.tsx` → `getStreakCount()` → BE `/tasks/streak/:user_id`, rendered by `streakCounter.tsx`

## Demo (signed out)
- `/demo`: `demo/page.tsx` → `DemoRuntimeBoundary` (in-browser fake API installed through `installApiTransport`, no backend requests) → `DemoLayout` → `DemoBody` → the shared `components/dashboard/DashboardView`. Reset demo swaps in a fresh store. Linked from `/login` and `/signup` ("Try the demo"). The Pomodoro timer uses `localStorage` and is shared with the real dashboard in the same browser (accepted, DEMO-01).

## Projects
- List: `dashboard/page.tsx` and `projects/page.tsx` (`components/projects/ProjectGrid.tsx`) → `projectCard.tsx` → `getProjectsForUser()` → BE `/projects/getAll/:user_id`
- Create and edit: `components/projects/useProjectEditor.ts` + `ProjectEditorDialog.tsx` (`modals/projectModal.tsx`) → `createProject()`, `updateProject()` → BE `/projects/create`, `/projects/:project_id`. Edit prefills from `getProjectById()` (BE `/projects/:project_id`) once per editing session, never over the user's edits
- Delete: `useProjectEditor.remove` → `deleteProjectById()` → BE `DELETE /projects/:project_id`
- Detail: `components/projects/ProjectsView.tsx` → `modals/viewProject.tsx` with `useProjectTasks` → `getTasksByProject()`; task actions through `useTaskEditor` and `useTaskDelete`

## Tasks
- By project: `projects/page.tsx` → `taskItem.tsx` → `getTasksByProject()` → BE `/tasks/getTasksByProj/:project_id`
- By user: `useUpcomingTasks()` (`lib/query`) → `getTasksByUser()` → BE `/tasks/getTasksByUser/:user_id`. Mutations invalidate by prefix; status toggles are optimistic
- Task completion from the project view (`modals/viewProject.tsx`) now goes through the status endpoint, so it triggers notifications (it used to be a plain update)
- Create, edit, delete: `dashboard/page.tsx` and `projects/page.tsx` with `modals/taskModal.tsx` → `toCreateTaskRequest()` / `toUpdateTaskRequest()` (`contracts/mappers.ts`) → `createTaskApi()`, `updateTaskApi(taskId, payload)`, `deleteTaskApi()` → BE `/tasks/create`, `/tasks/:task_id`. No `user_id` is sent; weekly recurrence sends only valid weekday names
- Delete asks first (BUG-05): a row's Delete → `useTaskDelete().requestDelete(taskId, title)` → `tasks/TaskDeleteConfirm.tsx` ("Delete this task?") → Delete → `deleteTaskApi()`. A recurring task shows "this one or all" instead.
- Status update: `taskItem.tsx` → `updateTaskStatus()` → BE `/tasks/update-task-status/:task_id/status/:status`
- Subtask status: `updateSubTaskStatus()` → BE `/tasks/update-subtask-status/:taskSubInstance_id/status/:status` (canonical lowercase; paths come from `api/paths.ts`, checked against the contract)
- Subtasks: `taskItem.tsx` → `createSubTaskApi()`, `updateSubTaskStatus()`; `dashboard/page.tsx` → `deleteSubTaskApi()` → BE subtask endpoints
- Recurring: `deleteRecurringTasksApi()` → BE `/tasks/deleteRecurringTasks/:taskTemplate_id`

## Shared tasks (FEAT-09)
- View: projects page → `chat/SharedProjectsSection.tsx` **View project** → `ProjectsView` → `modals/viewProject.tsx` (`canManageProject={false}`) with `useProjectTasks` → `getTasksByProject()` → BE `/tasks/getTasksByProj/:project_id` (members allowed). Add, edit and toggle as in your own projects; Delete only when `can_delete`. A 403 on delete shows the server's text and the list refetches.
- Assign: task editor `tasks/AssigneeSelect.tsx` (`useChatMembers` → BE `GET /chat/projects/:id/members`). Create → `createTaskApi()` with `assignee_id`. Edit → `useSetTaskAssignee()` → `setTaskAssignee()` → BE `PATCH /tasks/:task_id/assignee`, only when changed.
- Rows: `tasks/AssigneeChip.tsx` in `taskItem.tsx` (dashboard board) and the project view.
- Live: the notifications SSE stream's `tasks` event (`{project_id}`) → `tasksInvalidationsFor` (that project's tasks, my board, the dashboard), via `invalidateUnlessMutating`.
- Bell: an `assignment` notification ("<user> assigned you …") with an "Open projects" link to `/projects`.
- Not in `/demo` (`SharingContext` off).

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
- Profile settings → `apiTokens/ApiTokensSection.tsx`: what it is, the read-only MCP **server URL** (`mcpServerUrl(NEXT_PUBLIC_API_URL)` in `src/lib/mcpSetup.ts`: the backend origin + `/mcp`, beside its `/api` prefix), the claude.ai connector steps with the "wait a minute and try again" line (FEAT-07d), Connected apps, and the token table (name, created, last used, expires, status).
- List: `useApiTokens()` → `getApiTokens()` → BE `GET /tokens` (every status; never a secret or hash).
- Create: `apiTokens/CreateTokenDialog.tsx` (name 1-60, expiry 30 / 90 / 365 days / none, 90 preselected) → `useCreateApiToken()` → `createApiToken()` → BE `POST /tokens`. The 10-active-token limit, validation and the rate limit show as fixed copy in the form (`tokenCopy.ts` `createErrorCopy`); the button is disabled at 10 active tokens.
- Shown once: `apiTokens/TokenCreatedDialog.tsx` — the token with a copy button, "Copy it now. You won't see it again.", and copy-ready Claude Code (`claude mcp add --transport http get-it-done <url> --header "Authorization: Bearer <token>"`) and Cursor (`mcp.json`) snippets from `mcpSetup.ts`. A click outside does not close it; Done, Close and Esc do, and that drops the token.
- Revoke: `apiTokens/RevokeTokenDialog.tsx` (confirm, focus on Cancel) → `useRevokeApiToken()` (optimistic: the row shows Revoked, compare-and-swap rollback) → `revokeApiToken()` → BE `DELETE /tokens/:id`.
- The secret never enters the React Query cache, storage or logs (see `CLAUDE.md`). Not in `/demo`.

## Connector sign-in (FEAT-07d, MCP phase 2)
- Consent: claude.ai (or any MCP client) opens `/oauth/authorize?…` → signed out: middleware → `/login?next=<that URL>` (signup keeps `next`) → back. `components/oauth/ConsentView.tsx` → `useOAuthCheck()` → `checkOAuthAuthorize()` → BE `GET /oauth/authorize/check` (`ok` shows the app name, return host, loopback warning, capabilities, "Signed in as"; `redirect` leaves for the BE-built error URL; `fatal` or a 4xx shows "This connection request isn't valid").
- Allow / Deny: `useOAuthDecision()` → `sendOAuthDecision()` → FE `POST /api/oauth/decision` (`isSameOrigin`) → BE `POST /oauth/authorize` with the raw params + `decision` → `{ redirect_to }` → `window.location.assign` only if `isSafeRedirectTarget`.
- "Not you? Sign out": `POST /api/auth/logout` → `/login?next=<the consent URL>`.
- Connected apps: `apiTokens/ConnectedAppsList.tsx` → `useOAuthGrants()` → `getOAuthGrants()` → BE `GET /oauth/grants` (name, returns to host, connected, last used). Disconnect → `DisconnectAppDialog.tsx` → `useRevokeOAuthGrant()` (optimistic removal, rollback) → `revokeOAuthGrant()` → BE `DELETE /oauth/grants/:id`.
- Not in `/demo`.

## Pomodoro timer
- `PomodoroButton.tsx` → `modals/pomodoro.tsx` → `hooks/useTimer.ts` → `lib/timerService.ts`; labels from `lib/timerPhase.ts` (a paused timer says "Paused" / "Resume")
- State persisted in `localStorage` key `pomodoroTimerState`

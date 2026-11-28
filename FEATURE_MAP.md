# Feature Map — Frontend

Request chains per feature. Backend paths are shown without the `/api` prefix, because `NEXT_PUBLIC_API_URL` already ends in it.

## Authentication
- Login: `(auth)/login/page.tsx` → `LoginForm.tsx` → `POST /api/auth/login` (`login/route.ts`) → BE `/user/loginEmail` or `/user/loginUsername`. The route sets the cookies.
- Signup: `(auth)/signup/page.tsx` → `SignupForm.tsx` → `createUser()` in `userRequests.ts` (same-origin `apiClient`) → `POST /api/auth/signup` (`signup/route.ts`) → BE `/user/create`, then `POST /api/auth/login` with `rememberMe: true`.
- Forgot password: placeholder page only. Self-service reset is not implemented; tracked in FEAT-01 phase 2.
- Logout: `profileSettings/page.tsx` `confirmLogout()` → `POST /api/auth/logout` (`logout/route.ts`, also clears the `gid_appearance` cookie, RD-1), then clears `pomodoroTimerState` from `localStorage`.
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

## Appearance (RD-1, plan 51b)
- Profile settings → `components/appearance/AppearanceCard.tsx`: Theme (Classic, Calm, Field notes: all live since RD-3) and Mode (Light, Dark, System). A pick shows at once across the app (context user and profile cache) and saves `PATCH /user/update/:id` with only what changed (`{ theme }` for the mode, `{ appTheme }` for the theme) through `useSetAppearance`; a failed save rolls back with "Couldn't save your appearance. It's back to …; try again." The Profile form never sends `theme` or `appTheme`.
- Display: `useAppearance()` (user, else the `gid_appearance` cookie, else Classic + light; `/demo` is always Classic + System) → `isDark` in every component; `AppearanceSync` sets `<html data-theme data-mode data-pref>` and writes the cookie; `layout.tsx` renders the attributes from the cookie on the server and an inline script resolves System before first paint, so a reload has no light flash. Logout (`logout/route.ts`) clears the cookie.
- Tokens: `src/styles/theme-tokens.css`; the shell (`MainLayout`, `Sidebar`, `MobileSidebar`, `HamburgerButton`) uses `bg-th-*`/`text-th-*`. RD-2 batch 52-1: the dashboard (header, stat cards, task board and rows, search, charts, streak, heat map), dropdown, assignee chip and select, and the Pomodoro faces, mini, button and dialog are on tokens too; primary buttons are `--on-acc` on the accent (#333 on amber in Classic). RD-2 batch 52-2: the projects page (grid, cards, empty state), the project create/edit and view modals, and the chat panel, members dialog, shared projects and unread badge are on tokens; project colour choices are `PROJECT_COLORS` (`src/lib/projectColors.ts`) and each card keeps its project tint in every theme; own chat bubbles read #333 on amber in Classic. RD-2 batch 52-3: Profile (sections, Appearance card, Pomodoro picker), notifications, the API tokens section and dialogs, the task creator, confirmation, toasts, toggle, inputs, both date pickers and `LoadError` are on tokens; the shadcn colour variables are theme tokens (HSL triplets, Classic = the old `:root` values in both modes) and `<html>` carries `class="dark"` in dark mode. Approved Classic contrast fixes (52-3 §6): amber text and icons on light surfaces are `--acc-t` #7F5601 (`--acc-t-light` where a surface stays white in dark: auth forms, consent, landing, notification cards), done-task text `--done-ink` #767676, project-view priority chip text darker, the dark Create gradient starts at #E98006, the streak badge is #1E6FF5, and the dark greys `--txt-dim`/`--txt-mid` were lightened to 4.5:1. RD-2 batch 52-4 (**Phase 2 done: no hex colours or `isDark` colour ternaries in components, grep gate over the whole `src/app` tree; tokens only**): login, signup, forgot-password (page `--out-bg`, auth panel `--auth-*`, form card `--card`), the consent page, the demo header and notice bar (`--acc-sub`/`--acc-t`), the wake banner and `WakeHint` (`--wake-*`), the loader (no `dark` prop) and the shell leftovers (sidebar border `--line`; the mobile drawer follows the mode) are on tokens. In Classic dark the auth pages, consent card, demo and drawer are dark now. Approved step-6 fixes: red filled buttons (confirmation Delete/Log out, Revoke, Disconnect, Profile Log out) are `--danger` #BE2E2B with white, the blue confirmation button `--info` #2563EB, the toast close × `--ico-close` #666, and the auth panel text is #333 on amber. The appearance cookie is set at login (RD-3, plan 53b): `/api/auth/login` reads the BE's `data.appearance` (BE 53a), validates it (`appearanceFromLogin`) and sets `gid_appearance`, so the first page after a fresh login is already in the user's theme. RD-3 also: `--danger-t` for red text and outline borders (Classic light #BE2E2B), status colours on tokens (unread badges, streak "on fire", toast variants, token status tags, due chips, notification unread bar), inline SVG icons in `currentColor` (sidebar, drawer, stat cards, task rows; the "All tasks" icon is visible on dark tiles), the theme loaders (`ThemeLoaderMark`) and wordmarks (`ThemeWordmark`), and the one-time dashboard card "New: pick a look" (`NewLooksCard`: Open Appearance → `/profileSettings#appearance`, Not now; once per device, never in `/demo`).
- Dev theme preview (development builds only): `?theme=calm|field|classic` and `?mode=light|dark` on any URL override the appearance for the tab (sessionStorage), with a "Preview: … ×" chip bottom-left; × ends it. Never saved, never in production. Fonts: `src/app/fonts.ts` (`next/font`, no request to Google).

## Connect an AI assistant (FEAT-07, phase 1)
- Profile settings → Appearance → "Pomodoro timer" (FEAT-10): `components/pomodoro/PomodoroStylePicker.tsx`, three radio cards. A pick shows at once (context user and profile cache) and saves `PATCH /user/update/:id` `{ pomodoroStyle }` through `useSetPomodoroStyle`, apart from the form's Save; a failed save rolls back with "Couldn't save your timer style…". The Profile form never sends `pomodoroStyle`
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
- Three styles (FEAT-10, design canvas boards 17A–D): Dial (wedge on a 60-minute face), Ticket (big number, drain bar, four round pips) and Horizon (full-screen dialog, a sun moves along a line; "Leave focus" closes it and the timer keeps running). `modals/pomodoro.tsx` uses `components/pomodoro/usePomodoroController` for behaviour and picks the face by `pomodoroStyleOf(userData)`; the dashboard button shows the style's mini. No choice, and always in `/demo`, means the Dial
- The ticket's pips come from `timerService.completedFocusRounds` (client only): +1 when a focus round reaches 0, back to 0 after a long break or a state older than 24 h. Nothing auto-advances; the "Next: …" line only suggests
- State persisted in `localStorage` key `pomodoroTimerState`

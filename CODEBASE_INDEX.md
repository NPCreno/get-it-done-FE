# Codebase Index — Frontend

One line per significant source file. Paths are relative to the repo root.

## Pages (`src/app/`)
- `src/app/layout.tsx` — root layout, wraps children in `FormProvider`
- `src/app/page.tsx` — landing page
- `src/app/(auth)/login/page.tsx` — login page, hosts `LoginForm`
- `src/app/(auth)/signup/page.tsx` — signup page, hosts `SignupForm`
- `src/app/(auth)/forgot-password/page.tsx` — forgot-password page, a static placeholder (self-service reset is not available yet)
- `src/app/(routes)/dashboard/page.tsx` — dashboard: `<MainLayout><DashboardView/></MainLayout>` only
- `src/app/(routes)/projects/page.tsx` — projects: `<MainLayout><ProjectsView/></MainLayout>` only
- `src/app/(routes)/notifications/page.tsx` — notifications list
- `src/app/(routes)/profileSettings/page.tsx` — profile editing and logout
- `src/app/oauth/layout.tsx`, `oauth/authorize/page.tsx` — FEAT-07d OAuth consent page (no sidebar, noindex); the body is `components/oauth/ConsentView.tsx`

## Middleware and BFF
- `src/middleware.ts` — open routes first (`isOpenRoute`), then the public-route allowlist, `jwtVerify`, proactive and expired-token refresh. Its `config.matcher` skips `public/` files by extension; `src/__tests__/middlewareMatcher.test.ts` pins which paths run it
- `src/app/api/auth/session.ts` — edge-safe shared session helpers: `BACKEND_COLD_START_MS` (55 s, UX-03), `refreshWithBackend` (ok / invalid / unavailable; `timeoutMs`, 10 s for the middleware), `setSessionCookies`, `clearSessionCookies`, `revokeWithBackend`, `backendAuthHeaders`, `isSameOrigin`
- `src/app/api/auth/refresh/route.ts` — `POST /api/auth/refresh`, client-side silent refresh (never clears cookies)
- `src/app/api/auth/signup/route.ts` (+ `payload.ts`) — BFF signup, forwards the attested client IP to BE `/user/create`
- `src/app/api/auth/login/route.ts` — BFF login, sets httpOnly refresh cookie and readable access cookie
- `src/app/api/auth/logout/route.ts` — BFF logout, revokes the token family on the BE, clears cookies
- `src/app/api/auth/__tests__/coldStart.test.ts` — UX-03: the 55 s constant and `maxDuration = 60` in the login, signup, refresh and decision routes
- `src/app/api/oauth/decision/route.ts` (+ `payload.ts`: `buildDecisionBody`, `bearerToken`, `toDecisionResponse`) — FEAT-07d consent decision BFF, same-origin only, forwards to BE `POST /oauth/authorize`

## Browser API client (`src/lib/`)
- `apiClient.ts` — `apiClient()` never throws, returns `ApiResult<T>`; `apiPath`, `isUserFacing`, `describeFailure`
- `apiTransport.ts` — `installApiTransport(transport) → release`, `getActiveApiTransport()`: optional seam that replaces the network (one owner, ownership-checked idempotent release); used only by the demo
- `openRoutes.ts` — `openRoutes = ["/demo"]`, pure `isOpenRoute(pathname)` used by the middleware
- `resumeConsent.ts` — FEAT-07d `resumeConsentIfSignedIn()`: the login page continues a signed-in user to the consent page after a cross-site arrival (SameSite=Strict cookies were not sent)
- `safeNext.ts` — FEAT-07d `safeNext` (only the consent page may be a post-login target), `loginPathFor` (middleware), `withNext`, `currentNext`
- `oauthConsent.ts` — FEAT-07d `readAuthorizeParams`, `isSafeRedirectTarget`, `isLoopbackHost`, `isFatalConsentFailure`, `consentPathOf`
- `__tests__/safeNext.test.ts`, `oauthConsent.test.ts`, `oauthGrants.test.ts`, `resumeConsent.test.ts` — FEAT-07d; the `oauth-*.json` fixtures are FE-only, captured from a local BE (the BE exports none)
- `__tests__/` — `apiClient` characterization and transport tests (`apiClient.test.ts`, `apiTransport.test.ts`), `openRoutes.test.ts`
- `clientSession.ts` — `refreshSession()` (in-tab singleton + Web Lock `gid-session`, waits `REFRESH_WAIT_MS` 60 s, reports a slow refresh), `expireSession()`
- `serverWake.ts` — UX-03 cold start: pure `createServerWake(deps)` core (`reportSlow`, `reportUnreachable`, `retry`, `warmUp`, `onAwake`, snapshot `state`/`since`/`wokeAt`/`gaveUp`), `healthUrlFrom`, and the browser instance `serverWake`; `serverWakeView.ts` — `bannerPhase`, `formatElapsed`, `showWaitingForServer`; `useServerWake.ts` (`useSyncExternalStore`); `useTicker.ts` (`useTicker`, `useNextFrame`)
- `__tests__/serverWake.test.ts`, `serverWakeView.test.ts`, `apiClientWake.test.ts`, `clientSessionWake.test.ts` — UX-03

## Demo infrastructure (`src/app/demo/`, DEMO-01a; no page or UI yet)
- `runtime.ts` — `createDemoRuntime({clock}) → { store, transport, queryClient, reset(), start(), stop() }`, framework-free; its `QueryClient` is never registered with `registerQueryClient`
- `fake/clock.ts`, `seed.ts` (relative to `clock.now()`, id `demo-user`, `demo@example.invalid`), `store.ts` (instance state, `generation`, `retire()`), `crud.ts` (validates with the real request schemas), `analytics.ts` (demo-only simplified rules), `router.ts` (15 routes by method + anchored path, 501 otherwise, optional hit log)
- `DemoRuntimeBoundary.tsx` (one runtime per mount, inner `FormProvider` + `DemoIdentity` + the demo's own `QueryClientProvider`), `DemoLayout.tsx` (banner, Reset, Sign up / Log in, no protected links), `DemoBody.tsx` (re-exports `components/dashboard/DashboardView`), `page.tsx` (`/demo`), `demoUser.ts`
- `__tests__/` — `fake.test.ts` (seed invariants, schema conformance, semantics, router), `runtime.test.ts` (lifecycle, isolation, concurrency, reset), `endpoints.test.ts` (D8 drift guard over `specs.ts`, `taskRequests.ts`, `projectsRequests.ts`)

## Query layer (`src/lib/query/`)
- `client.ts` — `createQueryClient()` defaults, `clearQueryCache()` (called on logout/expiry); `../../app/providers/QueryProvider.tsx` mounts it
- `keys.ts` — `qk` key factories; `specs.ts` — key + request built from the same params; `window.ts` — 5-minute task window
- `queries.ts` — `useProfile`, `useProjects`, `useProject`, `useUpcomingTasks`, `useProjectTasks`, `useDashboardSummary`, `useCompletionTrend`, `useTaskDistribution`, `useCalendarHeatmap`, `useStreak`, `useSessionUserId`, `useTaskWindow`
- `mutations.ts` — task, subtask, project and profile mutations; optimistic `setTaskStatusOptions` / `setSubTaskStatusOptions`; `useSetPomodoroStyle` (FEAT-10)
- `pomodoroStyle.ts` — FEAT-10 `setPomodoroStyleOptions` (optimistic, one scope) and the pure `createStyleSaveTracker` (compare-and-swap rollback); tests in `__tests__/pomodoro-style.test.ts`
- `loadState.ts` — `loadStateOf()` (loading / error / empty / ready); `emptiness.ts` — per-resource empty rules; `keys.ts` also has `resourceOf()` (log labels)
- `../../app/components/LoadError.tsx` — the shared retryable error block and `useRecoveryFocus`; shows a text-free skeleton instead while the BE wakes (UX-03)
- `wake.ts` — UX-03 `refetchErroredQueries(client)` (active queries in error only) and `connectServerWake(client)`; tested in `__tests__/wake.test.ts`
- `invalidation.ts` — event to prefixes matrix and the burst gate; `optimistic.ts` — pure status patches; `unwrap.ts` — `ApiError`, `must`, `unwrap`, `settled`, `isCancellation`
- `__tests__/` — window, key/request, cancellation, cache behavior, optimistic and status mutation tests

## Request helpers (`src/app/api/`)
All return `ApiResult<T>`; callers check `result.ok`.
- `userRequests.ts` — `createUser`, `getUser`, `updateUser`
- `projectsRequests.ts` — project create, list, get, update, delete
- `taskRequests.ts` — task and subtask CRUD, status updates, dashboard, trend, distribution, heatmap, streak
- `paths.ts` — pure path builders for the status routes; `contracts/__tests__/routes.test.ts` checks them against the vendored contract `routes`

## Components (`src/app/components/`)
- `ServerWakeBanner.tsx` — UX-03 "Waking up the server" banner in `MainLayout` (states A–D); `WakeIcon.tsx` — the sleeping-moon circle; `auth/WakeHint.tsx` — the login/signup hint after 5 s pending
Auth (`auth/`)
- `LoginForm.tsx` — login form, posts to `/api/auth/login`
- `SignupForm.tsx` — signup form, creates user then logs in through `/api/auth/login`

Modals (`modals/`)
- `taskModal.tsx` — create and edit tasks and subtasks
- `projectModal.tsx` — create and edit projects
- `viewProject.tsx` — project detail view
- `pomodoro.tsx` — the Pomodoro dialog (default export `PomodoroModal`): picks `DialTimer` / `TicketTimer` / `HorizonTimer` by `pomodoroStyleOf(userData)` and shows the switch-type confirm (FEAT-10)
- `confirmation.tsx` — confirmation dialog

Layout and navigation
- `MainLayout.tsx` — page shell with sidebar
- `mainLayoutClasses.ts` — `MainLayout`'s root and scroll-container classes, both `relative` so `sr-only` (absolute) children can't stretch the window (BUG-06); tests in `components/__tests__/bug06.test.ts`
- `Sidebar.tsx`, `MobileSidebar.tsx`, `sidebarLink.tsx` (a Next `<Link>`, `sidebarLinkLabel`), `HamburgerButton.tsx` — navigation
- `tasks/TaskDeleteConfirm.tsx`, `tasks/deleteConfirmState.ts` — BUG-05 "Delete this task?" (pure request/confirm/cancel and copy); tests in `components/__tests__/bug05.test.ts`
- `sidebarWidths.ts` — desktop sidebar widths (60/146 px panel, +20 px wrapper); `src/lib/sidebarPreference.ts` — the remembered expand choice (`localStorage` `gid.sidebar.expanded`, never throws, default collapsed)
- `DashboardSearch.tsx` — expandable search box with its own state, so typing does not re-render the dashboard page (it filters nothing yet)

Dashboard and data display
- `statsCard.tsx` — summary stat card
- `chartCard.tsx` — chart container
- `MonthlyHeatmap.tsx` — calendar heatmap
- `streakCounter.tsx` — streak display
- `projectCard.tsx` — project summary card
- `taskItem.tsx` — task row with status and subtasks
- `notificationCard.tsx` — single notification (mark-as-read)
- `chat/` (FEAT-05): `ChatPanel.tsx` (side panel: `role="log"` message list, load older, composer, delete), `MembersDialog.tsx` (owner: list, add by username, remove), `SharedProjectsSection.tsx` ("Shared with me" cards: Open chat, Leave), `ProjectChatActions.tsx` (Members and Chat buttons in the owner's project view), `UnreadBadge.tsx` (FEAT-08 unread count with an accessible name)
- `src/lib/chatSocket.ts`, `useChatRoom.ts` — the managed chat WebSocket (one per tab) and the hook that keeps a project's message cache live; `src/lib/query/chat.ts` (members, shared projects, messages, the four mutations), `chatCache.ts` (pure message-cache helpers), `chatUnread.ts` (FEAT-08 pure unread helpers: `formatUnread`, `selectUnread`, optimistic clear/restore); `chat.ts` also holds `useChatUnread`, `useMarkChatRead`, `useMarkChatReadWhileOpen` and the per-tab open-chats store; `src/app/api/chatRequests.ts`
- `apiTokens/` (FEAT-07): `ApiTokensSection.tsx` (Profile's "Connect an AI assistant": server URL, token table, create and revoke), `CreateTokenDialog.tsx`, `TokenCreatedDialog.tsx` (the secret once, with setup snippets), `RevokeTokenDialog.tsx`, `TokenDialogShell.tsx` (their shared dialog frame), `CopyButton.tsx` (clipboard, "Copied" in a live region, selects the text if the clipboard fails), `tokenCopy.ts` (pure labels, dates, expiry choices, fixed error copy)
- `apiTokens/ConnectedAppsList.tsx`, `DisconnectAppDialog.tsx` (FEAT-07d) — Profile's "Connected apps" list and its confirm dialog; `tokenCopy.ts` also holds the connector steps and the wake-up copy
- `oauth/ConsentView.tsx` (FEAT-07d) — the consent screen, the invalid-request page and the loading/retry states; `src/lib/query/oauth.ts` — `useOAuthCheck`, `useOAuthDecision`, `useOAuthGrants`, `useRevokeOAuthGrant`; `src/app/api/oauthRequests.ts`
- `src/lib/mcpSetup.ts` — pure MCP setup builders (`mcpServerUrl`, `claudeCodeCommand`, `cursorConfig`); `src/lib/query/apiTokens.ts` — token list, create (never caches the secret) and optimistic revoke; `src/app/api/tokensRequests.ts`; tests in `src/lib/__tests__/apiTokens.test.ts`
- `src/lib/notificationStream.ts`, `useNotificationStream.ts` — the managed SSE stream; `notificationRoutes.ts` — action-route allowlist; `relativeTime.ts`; `src/lib/query/notifications.ts`, `notificationsOptimistic.ts` — list, read-state and clear hooks; `src/app/api/notificationsRequests.ts`

Inputs and small UI
- `inputBox.tsx`, `dropdown.tsx`, `datePicker.tsx`, `datePickerWithTime.tsx`, `weekdaySelector.tsx`, `toggleSwitch.tsx` — form controls
- `toast.tsx` — feedback
- `loader.tsx` — `LoadingPage` (UX-04): the logo tile with a turning arc and the wordmark, an overlay for a first load (`variant="page"`) or the tile alone (`variant="inline"`); `loaderClasses.ts` — its class strings and `PAGE_IN_CLASS` (tested in `__tests__/loader.test.ts` with the Tailwind motion tokens)
- `ToastHost.tsx` — renders a page's toast from its controller
- `PomodoroButton.tsx` — opens the Pomodoro dialog; shows the style's mini (`pomodoro/PomodoroMini`), play/pause and reset beside it
- `src/app/components/pomodoro/` (FEAT-10) — `usePomodoroController.ts` (all timer behaviour), `DialTimer.tsx`, `TicketTimer.tsx`, `HorizonTimer.tsx` (the three faces), `ModeRadios.tsx` (native radio group for the timer type), `PomodoroMini.tsx` (the button's mini), `PomodoroStylePicker.tsx` (Profile → Appearance), `geometry.ts` (dial wedge and ticks), `faceCopy.ts` (lines, fractions, next hint, captions), `faceClasses.ts` (colour roles); tests in `__tests__/faces.test.ts`
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
- `src/app/components/tasks/` FEAT-09 additions: `assignee.ts` (pure rules: options, visibility, the edit-save decision, chip and "in <project>" labels, `canDeleteTask`), `AssigneeSelect.tsx`, `AssigneeChip.tsx`; `src/lib/sharing.ts` (`SharingContext`, off in `/demo`); `src/app/components/projects/sharedProject.ts` (`sharedAsProject`); tests in `src/lib/__tests__/sharedTasks.test.ts`; FE-only fixtures `tasks-shared.json`, `notification-assignment.json`
- `src/app/components/dashboard/` — the layout-free dashboard body shared by `/dashboard` and `/demo` (ARCH-01 PR C): `DashboardView.tsx` (no props; toast, editor, loader, Pomodoro, recurring-delete dialog), `DashboardHeader.tsx`, `StatsRow.tsx`, `TaskBoard.tsx`, `AnalyticsGrid.tsx`, `useDashboardData.ts` (the 7 queries and load states). A lint override blocks layout hooks, `MainLayout` and token reads here and in `tasks/`
- `src/app/components/projects/` — the projects page body (ARCH-01 PR D): `ProjectsView.tsx` (no props; toast, task editor, project editor, loader, selected project, the view-project flow with `ProjectChatActions`), `ProjectGrid.tsx` (header, cards with unread badges, empty state, `LoadError`), `ProjectEditorDialog.tsx` (renders the unchanged `ProjectModal`), `useProjectEditor.ts` (own Formik form for the project fields, `open(projectId?)`/`close`/`submit`/`remove`, one prefill per editing session), `projectPrefill.ts` (pure `shouldPrefill`, `projectFormValuesOf`), tests in `__tests__/`
- `src/hooks/presence.ts` (pure `createPresence`, `nextFirstLoad`, `nextPageIn`), `usePresence.ts` (`usePresence`, `useFirstLoad`, `usePageIn`) — the full-page loader's show/hide (UX-04); tests in `src/hooks/__tests__/presence.test.ts`
- `src/hooks/toastController.ts` (framework-independent, owns timers), `useToastController.ts` (one per page, disposed on unmount) — toast state; tests in `src/hooks/__tests__/`
- `src/lib/timerService.ts` — pomodoro timer state, persisted in `localStorage` key `pomodoroTimerState`; `completedFocusRounds` (0–4, FEAT-10; tests in `__tests__/timerRounds.test.ts`)
- `src/lib/pomodoroStyle.ts` — `pomodoroStyleOf(user)` (dial by default), style names and hints, the picker status copy (FEAT-10)
- `src/lib/timerPhase.ts` — `timerPhase()` (`idle | running | paused`) and `timerCopy()`: every Pomodoro label comes from the phase
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
- `__tests__/` — contract, response-fixture and mapper tests; `zod-behavior.test.ts` pins how zod validates our schemas (Group B, must not change on a zod upgrade) and zod's default message wording (Group M)
- `../../../scripts/api-contract.mjs` — `contract:sync` / `contract:check`; `../../../vitest.config.ts`

## Schemas (`src/app/schemas/`)
- `loginSchema.tsx`, `signUpSchema.tsx`, `updateUserSchema.tsx`, `projectSchema.tsx`, `createTaskSchema.tsx`, `createSubTaskSchema.tsx` — form validation

## CI
- `.github/workflows/ci.yml` — lint, typecheck, test on every PR and on pushes to `main`

## Root config
- `package.json`, `pnpm-lock.yaml`, `next.config.*`, `tailwind.config.*`, `tsconfig.json`, `Dockerfile`, `.env.example`, `codegraph.json`

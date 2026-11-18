import {
  getCalendarHeatmap,
  getDashboardData,
  getStreakCount,
  getTaskCompletionTrend,
  getTaskDistributionData,
  getTasksByProject,
  getTasksByUser,
} from "@/app/api/taskRequests";
import { getProjectById, getProjectsForUser } from "@/app/api/projectsRequests";
import { getUser } from "@/app/api/userRequests";
import { getChatMembers, getChatMessagesPage, getChatUnread, getSharedProjects } from "@/app/api/chatRequests";
import { qk } from "./keys";
import { unwrap } from "./unwrap";
import type { TaskWindow } from "./window";

type Ctx = { signal: AbortSignal };

/**
 * One spec per resource: the key and the request are built from the SAME
 * parameters, which is what keeps "the key equals the request params" true.
 * Query functions forward TanStack's signal, so cancellation reaches the fetch.
 */
export const profileSpec = (id: string) => ({
  queryKey: qk.profile(id),
  queryFn: async ({ signal }: Ctx) => unwrap(await getUser(id, { signal })),
});

export const projectsSpec = (id: string) => ({
  queryKey: qk.projects(id),
  queryFn: async ({ signal }: Ctx) => unwrap(await getProjectsForUser(id, { signal })),
});

export const projectSpec = (id: string, projectId: string) => ({
  queryKey: qk.project(id, projectId),
  queryFn: async ({ signal }: Ctx) => unwrap(await getProjectById(projectId, { signal })),
});

export const upcomingSpec = (id: string, w: TaskWindow) => ({
  queryKey: qk.upcoming(id, w),
  queryFn: async ({ signal }: Ctx) => unwrap(await getTasksByUser(id, w.start, w.end, { signal })),
});

export const projectTasksSpec = (id: string, projectId: string, w: TaskWindow) => ({
  queryKey: qk.projectTasks(id, projectId, w),
  queryFn: async ({ signal }: Ctx) => unwrap(await getTasksByProject(projectId, w.start, w.end, { signal })),
});

export const summarySpec = (id: string, w: TaskWindow) => ({
  queryKey: qk.summary(id, w),
  queryFn: async ({ signal }: Ctx) => unwrap(await getDashboardData(id, w.start, w.end, { signal })),
});

export const trendSpec = (id: string, r: { start: string; end: string }) => ({
  queryKey: qk.trend(id, r),
  queryFn: async ({ signal }: Ctx) => unwrap(await getTaskCompletionTrend(id, r.start, r.end, { signal })),
});

export const distributionSpec = (id: string, month: string, year: string) => ({
  queryKey: qk.distribution(id, month, year),
  queryFn: async ({ signal }: Ctx) => unwrap(await getTaskDistributionData(id, month, year, { signal })),
});

export const heatmapSpec = (id: string, month: string, year: string) => ({
  queryKey: qk.heatmap(id, month, year),
  queryFn: async ({ signal }: Ctx) => unwrap(await getCalendarHeatmap(id, month, year, { signal })),
});

export const streakSpec = (id: string) => ({
  queryKey: qk.streak(id),
  queryFn: async ({ signal }: Ctx) => unwrap(await getStreakCount(id, { signal })),
});

// ------------------------------------------------------------------- chat (FEAT-05)

export const chatMembersSpec = (id: string, projectId: string) => ({
  queryKey: qk.chatMembers(id, projectId),
  queryFn: async ({ signal }: Ctx) => unwrap(await getChatMembers(projectId, { signal })),
});

/** The user is the token; `id` only scopes the cache. */
export const sharedProjectsSpec = (id: string) => ({
  queryKey: qk.sharedProjects(id),
  queryFn: async ({ signal }: Ctx) => unwrap(await getSharedProjects({ signal })),
});

/** FEAT-08. The user is the token; `id` only scopes the cache. */
export const chatUnreadSpec = (id: string) => ({
  queryKey: qk.chatUnread(id),
  queryFn: async ({ signal }: Ctx) => unwrap(await getChatUnread({ signal })),
});

/** Infinite, newest page first. The cursor is the page param, not part of the key. */
export const chatMessagesSpec = (id: string, projectId: string) => ({
  queryKey: qk.chatMessages(id, projectId),
  queryFn: async ({ signal, pageParam }: Ctx & { pageParam: string | undefined }) =>
    unwrap(await getChatMessagesPage(projectId, pageParam, { signal })),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last: { next_cursor: string | null }) => last.next_cursor ?? undefined,
});

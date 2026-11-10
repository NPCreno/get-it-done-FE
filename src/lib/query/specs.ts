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

"use client";
import { useFormState } from "@/app/context/FormProvider";
import {
  useCalendarHeatmap,
  useCompletionTrend,
  useDashboardSummary,
  useProjects,
  useStreak,
  useTaskDistribution,
  useUpcomingTasks,
} from "@/lib/query/queries";
import { loadStateOf } from "@/lib/query/loadState";
import { isEmptyDistribution, isEmptyList, never } from "@/lib/query/emptiness";
import type { ChartLoad } from "@/app/components/chartCard";
import type { IProject } from "@/app/interface/IProject";
import type { ITask } from "@/app/interface/ITask";
import type { IDashboardData } from "@/app/interface/IDashboardData";
import type { ITaskCompletionTrendData } from "@/app/interface/ITaskCompletionTrendData";
import type { ITaskDistribution } from "@/app/interface/ITaskDistribution";
import type { IHeatmapData } from "@/app/interface/IHeatmapData";

const NO_PROJECTS: IProject[] = [];
const NO_TASKS: ITask[] = [];
const NO_TREND: ITaskCompletionTrendData[] = [];
const NO_DISTRIBUTION: ITaskDistribution[] = [];
const NO_HEATMAP: IHeatmapData[] = [];
const EMPTY_DASHBOARD: IDashboardData = {
  all_tasks: 0,
  pending_tasks: 0,
  complete_tasks: 0,
  all_projects: 0,
};

/**
 * The dashboard's seven queries and their load states.
 * Server data is owned by query hooks (src/lib/query): one key per request parameter set,
 * cancellation, and invalidation from mutations. Nothing here refetches because of a toast,
 * a modal or a user-object change.
 */
export function useDashboardData() {
  const { selectedMonth, selectedYear, calendarMonthYear } = useFormState();
  const projectsQuery = useProjects();
  const upcoming = useUpcomingTasks();
  const summary = useDashboardSummary();
  const trend = useCompletionTrend();
  const distribution = useTaskDistribution(selectedMonth, selectedYear);
  const heatmap = useCalendarHeatmap(calendarMonthYear.month, calendarMonthYear.year);
  const streak = useStreak();
  // options only: errors here are not shown as empty UI
  const projectOptions = projectsQuery.data ?? NO_PROJECTS;
  // One policy decides what every widget shows (never `data ?? EMPTY`).
  const upcomingState = loadStateOf(upcoming, isEmptyList);
  const summaryState = loadStateOf(summary, never);
  const trendState = loadStateOf(trend, isEmptyList);
  const distributionState = loadStateOf(distribution, isEmptyDistribution);
  const heatmapState = loadStateOf(heatmap, never);
  const streakState = loadStateOf(streak, never);
  const loadOf = (
    state: ChartLoad["state"],
    q: { refetch: () => unknown; isFetching: boolean }
  ): ChartLoad => ({
    state,
    onRetry: () => void q.refetch(),
    retrying: q.isFetching,
  });
  return {
    projectOptions,
    upcoming,
    summary,
    upcomingState,
    summaryState,
    tasks: upcoming.data ?? NO_TASKS,
    dashboardData: summary.data ?? EMPTY_DASHBOARD,
    taskCompletionData: trend.data ?? NO_TREND,
    taskDistributionData: distribution.data ?? NO_DISTRIBUTION,
    calendarHeatmapData: heatmap.data ?? NO_HEATMAP,
    streakCount: streak.data?.count ?? 0,
    trendLoad: loadOf(trendState, trend),
    distributionLoad: loadOf(distributionState, distribution),
    streakLoad: loadOf(streakState, streak),
    heatmapLoad: loadOf(heatmapState, heatmap),
    // First load only. On error the page never waits: the shell renders with the error widgets.
    pageLoading: upcomingState.status === "loading" || summaryState.status === "loading",
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;

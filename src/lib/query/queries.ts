"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import { getAccessToken, getWeekRange, parseJwt } from "@/app/utils/utils";
import {
  distributionSpec,
  heatmapSpec,
  profileSpec,
  projectSpec,
  projectsSpec,
  projectTasksSpec,
  streakSpec,
  summarySpec,
  trendSpec,
  upcomingSpec,
} from "./specs";
import { bucketOf, msUntilNextBucket, windowFor } from "./window";

/** The context user once loaded, else the id inside the access token. */
export function useSessionUserId(): string | undefined {
  const { userData } = useFormState();
  const [tokenId, setTokenId] = useState<string | undefined>();
  useEffect(() => {
    const token = getAccessToken();
    setTokenId(token ? parseJwt(token)?.user?.user_id : undefined);
  }, []);
  return userData?.user_id ?? tokenId;
}

/**
 * One window per 5-minute bucket, shared by the task list, the summary and the
 * project tasks. The timer moves to the next bucket, which produces a NEW key.
 */
export function useTaskWindow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), msUntilNextBucket(now));
    return () => clearTimeout(timer);
  }, [now]);
  const bucket = bucketOf(now);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => windowFor(bucket * 5 * 60_000), [bucket]);
}

export function useProfile() {
  const id = useSessionUserId();
  return useQuery({ ...profileSpec(id ?? ""), enabled: !!id, staleTime: 5 * 60_000 });
}

export function useProjects() {
  const id = useSessionUserId();
  return useQuery({ ...projectsSpec(id ?? ""), enabled: !!id, staleTime: 60_000 });
}

export function useProject(projectId: string | undefined, opts: { enabled?: boolean } = {}) {
  const id = useSessionUserId();
  return useQuery({
    ...projectSpec(id ?? "", projectId ?? ""),
    enabled: !!id && !!projectId && opts.enabled !== false,
  });
}

export function useUpcomingTasks() {
  const id = useSessionUserId();
  const w = useTaskWindow();
  return useQuery({ ...upcomingSpec(id ?? "", w), enabled: !!id, placeholderData: keepPreviousData });
}

export function useProjectTasks(projectId: string | undefined) {
  const id = useSessionUserId();
  const w = useTaskWindow();
  return useQuery({
    ...projectTasksSpec(id ?? "", projectId ?? "", w),
    enabled: !!id && !!projectId,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardSummary() {
  const id = useSessionUserId();
  const w = useTaskWindow();
  return useQuery({ ...summarySpec(id ?? "", w), enabled: !!id, placeholderData: keepPreviousData });
}

export function useCompletionTrend() {
  const id = useSessionUserId();
  // The exact strings the request sends: week start and end of today.
  const range = getWeekRange(new Date().toISOString());
  return useQuery({
    ...trendSpec(id ?? "", { start: range.start, end: range.end }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

export function useTaskDistribution(month: string, year: string) {
  const id = useSessionUserId();
  return useQuery({ ...distributionSpec(id ?? "", month, year), enabled: !!id, placeholderData: keepPreviousData });
}

export function useCalendarHeatmap(month: string, year: string) {
  const id = useSessionUserId();
  return useQuery({ ...heatmapSpec(id ?? "", month, year), enabled: !!id, placeholderData: keepPreviousData });
}

export function useStreak() {
  const id = useSessionUserId();
  return useQuery({ ...streakSpec(id ?? ""), enabled: !!id });
}

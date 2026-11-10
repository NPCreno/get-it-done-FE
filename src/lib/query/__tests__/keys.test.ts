import { beforeEach, describe, expect, it, vi } from "vitest";

const ok = (data: unknown) => Promise.resolve({ ok: true, status: 200, data });
vi.mock("@/app/api/taskRequests", () => ({
  getTasksByUser: vi.fn(() => ok([])),
  getTasksByProject: vi.fn(() => ok([])),
  getDashboardData: vi.fn(() => ok({})),
  getTaskCompletionTrend: vi.fn(() => ok([])),
  getTaskDistributionData: vi.fn(() => ok([])),
  getCalendarHeatmap: vi.fn(() => ok([])),
  getStreakCount: vi.fn(() => ok({ count: 0 })),
}));
vi.mock("@/app/api/projectsRequests", () => ({
  getProjectsForUser: vi.fn(() => ok([])),
  getProjectById: vi.fn(() => ok({})),
}));
vi.mock("@/app/api/userRequests", () => ({ getUser: vi.fn(() => ok({})) }));

import * as tasks from "@/app/api/taskRequests";
import * as projects from "@/app/api/projectsRequests";
import * as users from "@/app/api/userRequests";
import { qk } from "../keys";
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
} from "../specs";
import { windowFor } from "../window";

const w = windowFor(Date.parse("2026-11-10T10:03:00.000Z"));
const range = { start: "2026-11-09", end: "2026-11-15" };
const signal = new AbortController().signal;

beforeEach(() => vi.clearAllMocks());

describe("key <=> request: the request is built from the key parameters", () => {
  /** [spec, helper, expected helper args, key tail after ['u', id]] */
  const cases = [
    ["profile", () => profileSpec("u1"), users.getUser, ["u1"], ["profile"]],
    ["projects", () => projectsSpec("u1"), projects.getProjectsForUser, ["u1"], ["projects"]],
    ["project", () => projectSpec("u1", "P1"), projects.getProjectById, ["P1"], ["projects", "P1"]],
    ["upcoming", () => upcomingSpec("u1", w), tasks.getTasksByUser, ["u1", w.start, w.end], ["tasks", "upcoming", w.start, w.end]],
    [
      "projectTasks",
      () => projectTasksSpec("u1", "P1", w),
      tasks.getTasksByProject,
      ["P1", w.start, w.end],
      ["tasks", "project", "P1", w.start, w.end],
    ],
    ["summary", () => summarySpec("u1", w), tasks.getDashboardData, ["u1", w.start, w.end], ["analytics", "summary", w.start, w.end]],
    ["trend", () => trendSpec("u1", range), tasks.getTaskCompletionTrend, ["u1", range.start, range.end], ["analytics", "trend", range.start, range.end]],
    ["distribution", () => distributionSpec("u1", "11", "2026"), tasks.getTaskDistributionData, ["u1", "11", "2026"], ["analytics", "distribution", "2026", "11"]],
    ["heatmap", () => heatmapSpec("u1", "11", "2026"), tasks.getCalendarHeatmap, ["u1", "11", "2026"], ["analytics", "heatmap", "2026", "11"]],
    ["streak", () => streakSpec("u1"), tasks.getStreakCount, ["u1"], ["analytics", "streak"]],
  ] as const;

  for (const [name, make, helper, args, tail] of cases) {
    it(name, async () => {
      const spec = make();
      expect(spec.queryKey.slice(0, 2)).toEqual(["u", "u1"]);
      expect(spec.queryKey.slice(2)).toEqual([...tail]);
      await spec.queryFn({ signal });
      expect(helper).toHaveBeenCalledTimes(1);
      const call = (helper as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call.slice(0, args.length)).toEqual([...args]);
      // TanStack's signal is forwarded so cancellation reaches the fetch.
      expect(call[args.length]).toEqual({ signal });
    });
  }

  it("streak has no parameters, so its key has none", () => {
    expect(qk.streak("u1")).toEqual(["u", "u1", "analytics", "streak"]);
  });
});

describe("hierarchy and isolation", () => {
  it("task and analytics prefixes contain their children", () => {
    const starts = (child: readonly unknown[], prefix: readonly unknown[]) => prefix.every((p, i) => child[i] === p);
    expect(starts(qk.upcoming("u1", w), qk.tasks("u1"))).toBe(true);
    expect(starts(qk.projectTasks("u1", "P1", w), qk.tasks("u1"))).toBe(true);
    expect(starts(qk.summary("u1", w), qk.analytics("u1"))).toBe(true);
    expect(starts(qk.heatmap("u1", "1", "2026"), qk.analytics("u1"))).toBe(true);
    expect(starts(qk.project("u1", "P1"), qk.projects("u1"))).toBe(true);
  });

  it("another user's keys never match this user's prefixes", () => {
    const starts = (child: readonly unknown[], prefix: readonly unknown[]) => prefix.every((p, i) => child[i] === p);
    expect(starts(qk.upcoming("u2", w), qk.tasks("u1"))).toBe(false);
    expect(starts(qk.profile("u2"), qk.profile("u1"))).toBe(false);
  });
});

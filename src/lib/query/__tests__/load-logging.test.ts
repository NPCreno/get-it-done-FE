import { QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { heatmapSpec } from "../specs";
import { deferred, failResult, flush, testClient } from "./helpers";

vi.mock("@/app/api/taskRequests", () => ({
  getCalendarHeatmap: vi.fn(),
  getTasksByUser: vi.fn(),
  getTasksByProject: vi.fn(),
  getDashboardData: vi.fn(),
  getTaskCompletionTrend: vi.fn(),
  getTaskDistributionData: vi.fn(),
  getStreakCount: vi.fn(),
}));
vi.mock("@/app/api/projectsRequests", () => ({ getProjectsForUser: vi.fn(), getProjectById: vi.fn() }));
vi.mock("@/app/api/userRequests", () => ({ getUser: vi.fn() }));

import { getCalendarHeatmap } from "@/app/api/taskRequests";

afterEach(() => vi.restoreAllMocks());

describe("query error logging", () => {
  it("logs only [query] <resource> <kind> <status>: no ids, months or message text", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(getCalendarHeatmap).mockResolvedValue({ ...failResult("http"), message: "SECRET-MESSAGE" } as never);
    const qc = testClient();
    const obs = new QueryObserver(qc, heatmapSpec("USER-SENTINEL", "MONTH-SENTINEL", "2026"));
    const unsub = obs.subscribe(() => undefined);
    await new Promise((r) => setTimeout(r, 40));
    const calls = warn.mock.calls.filter((c) => c[0] === "[query]");
    expect(calls).toEqual([["[query]", "analytics.heatmap", "http", 500]]);
    const text = JSON.stringify(warn.mock.calls);
    for (const s of ["USER-SENTINEL", "MONTH-SENTINEL", "SECRET-MESSAGE"]) expect(text).not.toContain(s);
    unsub();
  });

  it("a cancelled query logs nothing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const d = deferred<never>();
    vi.mocked(getCalendarHeatmap).mockReturnValue(d.promise as never);
    const qc = testClient();
    const spec = heatmapSpec("USER-SENTINEL", "11", "2026");
    const obs = new QueryObserver(qc, spec);
    const unsub = obs.subscribe(() => undefined);
    await flush();
    await qc.cancelQueries({ queryKey: spec.queryKey });
    d.resolve({ ...failResult("aborted") } as never);
    await flush();
    await flush();
    expect(warn.mock.calls.filter((c) => c[0] === "[query]")).toHaveLength(0);
    unsub();
  });
});

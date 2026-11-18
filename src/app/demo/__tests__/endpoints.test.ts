import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/utils", async (orig) => ({
  ...(await orig<typeof import("@/app/utils/utils")>()),
  getAccessToken: vi.fn(() => null),
}));
vi.mock("@/lib/clientSession", () => ({ refreshSession: vi.fn(), expireSession: vi.fn() }));

import * as chatRequests from "@/app/api/chatRequests";
import * as projectsRequests from "@/app/api/projectsRequests";
import * as taskRequests from "@/app/api/taskRequests";
import { getAccessToken } from "@/app/utils/utils";
import { expireSession, refreshSession } from "@/lib/clientSession";
import * as specs from "@/lib/query/specs";
import { testClient } from "@/lib/query/__tests__/helpers";
import { windowFor } from "@/lib/query/window";
import { fixedClock } from "../fake/clock";
import { ROUTE_KEYS } from "../fake/router";
import { DEMO_USER_ID } from "../fake/seed";
import { createDemoRuntime } from "../runtime";

/**
 * D8, the drift guard. Every export of specs.ts, taskRequests.ts, projectsRequests.ts and chatRequests.ts is IN
 * SCOPE by default and must be given seed-valid args below, or an entry in ALLOW with a reason.
 * A new spec or helper therefore fails this test until it gets a fake route or a reasoned entry.
 */
const ALLOW: Record<string, string> = {
  // specs.ts
  profileSpec: "GET /user/get/:id is used only by MainLayout's useProfile; the demo has no MainLayout (501 by design)",
  projectSpec: "project detail is on the projects page, not the dashboard",
  projectTasksSpec: "project tasks are on the projects page, not the dashboard",
  // taskRequests.ts
  getTasksByProject: "projects page only (GET /tasks/getTasksByProj/:id)",
  // projectsRequests.ts
  createProject: "project CRUD is on the projects page, not the dashboard",
  getProjectById: "project detail is on the projects page, not the dashboard",
  updateProject: "project CRUD is on the projects page, not the dashboard",
  deleteProjectById: "project CRUD is on the projects page, not the dashboard",
  // FEAT-05 chat (specs.ts and chatRequests.ts)
  chatMembersSpec: "chat is not in the demo",
  sharedProjectsSpec: "chat is not in the demo",
  chatMessagesSpec: "chat is not in the demo",
  getChatMembers: "chat is not in the demo",
  addChatMember: "chat is not in the demo",
  removeChatMember: "chat is not in the demo",
  getSharedProjects: "chat is not in the demo",
  getChatMessagesPage: "chat is not in the demo",
  sendChatMessage: "chat is not in the demo",
  deleteChatMessage: "chat is not in the demo",
  // FEAT-08 unread badges
  chatUnreadSpec: "chat is not in the demo",
  getChatUnread: "chat is not in the demo",
  markChatRead: "chat is not in the demo",
};

const NOW = Date.parse("2026-11-16T12:00:00Z");
const W = windowFor(NOW);
const U = DEMO_USER_ID;

type Ids = { task: string; other: string; sub: string; sub2: string };
const ARGS: Record<string, (ids: Ids) => unknown[]> = {
  // specs.ts (run through a real QueryClient)
  projectsSpec: () => [U],
  upcomingSpec: () => [U, W],
  summarySpec: () => [U, W],
  trendSpec: () => [U, { start: "2026-11-09", end: "2026-11-15" }],
  distributionSpec: () => [U, "11", "2026"],
  heatmapSpec: () => [U, "11", "2026"],
  streakSpec: () => [U],
  // taskRequests.ts
  createTaskApi: () => [{ title: "Drift guard task", priority: "Low", status: "Pending", isRecurring: false }],
  updateTaskApi: (i) => [i.task, { title: "Renamed by D8" }],
  deleteTaskApi: (i) => [i.other],
  deleteSubTaskApi: (i) => [i.sub2],
  deleteRecurringTasksApi: () => ["TMP-demo-1"],
  getTasksByUser: () => [U, W.start, W.end],
  getDashboardData: () => [U, W.start, W.end],
  getTaskCompletionTrend: () => [U, "2026-11-09", "2026-11-15"],
  getTaskDistributionData: () => [U, "11", "2026"],
  getCalendarHeatmap: () => [U, "11", "2026"],
  getStreakCount: () => [U],
  updateTaskStatus: (i) => [i.task, "Complete"],
  updateSubTaskStatus: (i) => [i.sub, "Complete"],
  createSubTaskApi: (i) => [{ task_id: i.task, title: "Drift sub", status: "Pending" }],
  // projectsRequests.ts
  getProjectsForUser: () => [U],
};

const fetchMock = vi.fn(() => {
  throw new Error("fetch must never be called in demo mode");
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const exportsOf = (m: Record<string, unknown>) => Object.entries(m).filter(([, v]) => typeof v === "function") as [string, (...a: unknown[]) => unknown][];
const ALL = [...exportsOf(specs), ...exportsOf(taskRequests), ...exportsOf(projectsRequests), ...exportsOf(chatRequests)];

describe("D8: endpoint coverage", () => {
  it("every export is in scope with args, or allowlisted with a reason; neither list is stale", () => {
    const names = new Set(ALL.map(([n]) => n));
    const missing = ALL.map(([n]) => n).filter((n) => !(n in ARGS) && !(n in ALLOW));
    expect(missing, `no D8 args and no allowlist reason for: ${missing.join(", ")}`).toEqual([]);
    expect(Object.keys(ARGS).filter((n) => !names.has(n)), "stale ARGS").toEqual([]);
    expect(Object.keys(ALLOW).filter((n) => !names.has(n)), "stale ALLOW").toEqual([]);
    expect(Object.keys(ALLOW).filter((n) => n in ARGS), "both in scope and allowlisted").toEqual([]);
    for (const reason of Object.values(ALLOW)) expect(reason.length).toBeGreaterThan(10);
  });

  it("each in-scope entry is served by a fake route: a hit, no 501, no fetch; no fake route is dead", async () => {
    const rt = createDemoRuntime({ clock: fixedClock(NOW), recordHits: true });
    rt.start();
    try {
      const qc = testClient();
      const task = rt.store.tasks.find((t) => t.title === "Review the launch checklist")!;
      const other = rt.store.tasks.find((t) => t.title === "Book a dentist appointment")!;
      const ids: Ids = { task: task.task_id, other: other.task_id, sub: task.subtasks[0].taskSubInstance_id, sub2: task.subtasks[1].taskSubInstance_id };

      // Reads first, destructive helpers last (they remove rows the others use).
      const destructive = new Set(["deleteTaskApi", "deleteSubTaskApi", "deleteRecurringTasksApi"]);
      const inScope = ALL.filter(([n]) => n in ARGS).sort(([a], [b]) => Number(destructive.has(a)) - Number(destructive.has(b)));
      expect(inScope.length).toBeGreaterThan(0);
      for (const [name, fn] of inScope) {
        const before = rt.transport.hits.length;
        const args = ARGS[name](ids);
        if (name.endsWith("Spec")) {
          await qc.fetchQuery({ ...(fn(...args) as object), retry: false } as never);
        } else {
          const result = (await fn(...args)) as { ok: boolean; status: number };
          expect(result.ok, `${name}: ${JSON.stringify(result)}`).toBe(true);
        }
        const mine = rt.transport.hits.slice(before);
        expect(mine.length, `${name} made no request`).toBeGreaterThan(0);
        expect(mine.filter((h) => h.startsWith("UNMATCHED")), `${name} hit an unmatched route`).toEqual([]);
      }
      const unhit = ROUTE_KEYS.filter((k) => !rt.transport.hits.includes(k));
      expect(unhit, `fake routes no dashboard entry reaches: ${unhit.join(", ")}`).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
      for (const s of [getAccessToken, refreshSession, expireSession]) expect(vi.mocked(s)).not.toHaveBeenCalled();
    } finally {
      rt.stop();
    }
  });
});

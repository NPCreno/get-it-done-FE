import type { ZodType } from "zod";
import { describe, expect, it } from "vitest";
import {
  DashboardDataSchema,
  DistributionSchema,
  HeatmapCellSchema,
  ProjectListItemSchema,
  StreakSchema,
  SubTaskSchema,
  TaskListItemSchema,
  TrendPointSchema,
} from "@/app/contracts/responses";
import { windowFor } from "@/lib/query/window";
import * as analytics from "../fake/analytics";
import { DAY_MS, fixedClock, HOUR_MS, utcDay } from "../fake/clock";
import { tasksInWindow } from "../fake/crud";
import { createDemoTransport, matchRoute, ROUTES } from "../fake/router";
import { buildSeed, DEMO_USER_ID } from "../fake/seed";
import { createDemoStore } from "../fake/store";

const NOON = Date.parse("2026-11-16T12:00:00Z");

function harness(now = NOON) {
  const clock = fixedClock(now);
  const store = createDemoStore(buildSeed(clock));
  const transport = createDemoTransport(() => store, clock, { recordHits: true });
  const call = async (method: string, path: string, query?: Record<string, string | number>, body?: unknown) => {
    const res = await transport({ method, path, query, body, signal: new AbortController().signal, timeoutMs: 1000 });
    return { status: res.status, json: JSON.parse(res.text) as { status?: string; message?: unknown; data?: unknown } };
  };
  const w = windowFor(now);
  const U = `/${DEMO_USER_ID}`;
  const list = async () => (await call("GET", `/tasks/getTasksByUser${U}`, { startDate: w.start, endDate: w.end })).json.data as { task_id: string; title: string; status: string; subInstances: { taskSubInstance_id: string; status: string }[] }[];
  return { clock, store, transport, call, w, U, list };
}

const CLOCKS = [
  "2026-11-16T00:00:30Z",
  "2026-11-16T12:00:00Z",
  "2026-11-16T23:59:30Z",
  "2026-12-01T00:00:30Z", // a month's 1st
  "2026-11-30T23:59:30Z", // a month's last day
  "2028-02-29T12:00:00Z", // 29 Feb
].map(Date.parse);

describe("S1: seed invariants at any moment", () => {
  it.each(CLOCKS)("clock %s", (now) => {
    const clock = fixedClock(now);
    const store = createDemoStore(buildSeed(clock));
    const w = windowFor(now);
    const start = Date.parse(w.start);
    const end = Date.parse(w.end);
    const listed = tasksInWindow(store, start, end);
    expect(listed.some((t) => t.status === "Pending" && t.due !== null && t.due >= now && t.due <= now + DAY_MS)).toBe(true);
    expect(listed.some((t) => t.status === "Pending" && t.due !== null && t.due < start)).toBe(true);
    expect(store.tasks.some((t) => t.completedAt !== null && t.completedAt >= utcDay(now) && t.completedAt <= now)).toBe(true);
    expect(analytics.streak(store, clock).count).toBeGreaterThanOrEqual(5);
    const d = new Date(now);
    const dist = analytics.distribution(store, d.getUTCMonth() + 1, d.getUTCFullYear());
    expect(dist.reduce((n, x) => n + x.value, 0)).toBeGreaterThanOrEqual(1);
    expect(dist.some((x) => x.value === 0)).toBe(true); // a project with no completions
    expect(store.tasks.every((t) => t.completedAt === null || t.completedAt <= now)).toBe(true);
    expect(JSON.stringify(store.tasks) + JSON.stringify(store.projects)).not.toMatch(/@(?!example\.invalid)/);
  });

  it("has 3 projects in a fixed creation order and two tasks with subtasks (one partly complete)", () => {
    const store = createDemoStore(buildSeed(fixedClock(NOON)));
    expect(store.projects.map((p) => p.createdAt)).toEqual([...store.projects.map((p) => p.createdAt)].sort((a, b) => a - b));
    expect(store.projects).toHaveLength(3);
    const withSubs = store.tasks.filter((t) => t.subtasks.length > 0);
    expect(withSubs).toHaveLength(2);
    expect(withSubs.some((t) => t.subtasks.some((s) => s.status === "Complete") && t.subtasks.some((s) => s.status === "Pending"))).toBe(true);
  });
});

describe("D2: every handler's response satisfies the real zod schema", () => {
  const parseAll = async (h: ReturnType<typeof harness>, label: string) => {
    const { call, w, U } = h;
    const d = new Date(NOON);
    const month = d.getUTCMonth() + 1;
    const cases: [string, string, Record<string, string | number> | undefined, ZodType][] = [
      ["GET", `/projects/getAll${U}`, undefined, ProjectListItemSchema.array()],
      ["GET", `/tasks/getTasksByUser${U}`, { startDate: w.start, endDate: w.end }, TaskListItemSchema.array()],
      ["GET", `/tasks/getDashboardData${U}`, { startDate: w.start, endDate: w.end }, DashboardDataSchema],
      ["GET", `/tasks/completion-trend${U}`, { startDate: "2026-11-09", endDate: "2026-11-15" }, TrendPointSchema.array()],
      ["GET", `/tasks/task-distribution${U}`, { month, year: "2026" }, DistributionSchema.array()],
      ["GET", `/tasks/calendar-heatmap${U}`, { month, year: "2026" }, HeatmapCellSchema.array()],
      ["GET", `/tasks/streak${U}`, undefined, StreakSchema],
    ];
    for (const [m, p, q, schema] of cases) {
      const r = await call(m, p, q);
      expect(r.status, `${label} ${p}`).toBe(200);
      expect(r.json.status).toBe("success");
      const parsed = schema.safeParse(r.json.data);
      expect(parsed.success, `${label} ${p}: ${JSON.stringify(parsed.success ? "" : parsed.error.issues.slice(0, 3))}`).toBe(true);
    }
  };

  it("seed", async () => parseAll(harness(), "seed"));

  it("after writes", async () => {
    const h = harness();
    const created = await h.call("POST", "/tasks/create", undefined, { title: "New one", priority: "High", status: "Pending", isRecurring: false, due_date: new Date(NOON + HOUR_MS).toISOString() });
    expect(TaskListItemSchema.safeParse(created.json.data).success).toBe(true);
    const id = (created.json.data as { task_id: string }).task_id;
    const sub = await h.call("POST", "/tasks/createSubTask", undefined, { task_id: id, title: "A sub", status: "Pending" });
    expect(SubTaskSchema.safeParse(sub.json.data).success).toBe(true);
    const upd = await h.call("PATCH", `/tasks/${id}`, undefined, { description: null, status: "Complete" });
    expect(TaskListItemSchema.safeParse(upd.json.data).success).toBe(true);
    await h.call("DELETE", "/tasks/deleteRecurringTasks/TMP-demo-1");
    await parseAll(h, "after writes");
  });
});

describe("D3: fake semantics", () => {
  it("create validates with the real request schema", async () => {
    const h = harness();
    const bad = await h.call("POST", "/tasks/create", undefined, { title: "x", priority: "Nope", status: "Pending", isRecurring: false });
    expect(bad.status).toBe(400);
    const before = h.store.tasks.length;
    const ok = await h.call("POST", "/tasks/create", undefined, { title: "Fresh task", priority: "Low", status: "Pending", isRecurring: false });
    expect(ok.status).toBe(200);
    expect(h.store.tasks).toHaveLength(before + 1);
    expect((await h.list()).some((t) => t.title === "Fresh task")).toBe(true);
  });

  it("update, status and delete", async () => {
    const h = harness();
    const first = (await h.list())[0];
    await h.call("PATCH", `/tasks/${first.task_id}`, undefined, { title: "Renamed", due_date: null });
    expect((await h.list()).find((t) => t.task_id === first.task_id)?.title).toBe("Renamed");
    expect((await h.call("PATCH", `/tasks/update-task-status/${first.task_id}/status/Complete`)).status).toBe(200);
    expect((await h.list()).find((t) => t.task_id === first.task_id)?.status).toBe("Complete");
    expect((await h.call("DELETE", `/tasks/${first.task_id}`)).status).toBe(200);
    expect((await h.list()).some((t) => t.task_id === first.task_id)).toBe(false);
    expect((await h.call("DELETE", `/tasks/${first.task_id}`)).status).toBe(404);
  });

  it("a subtask completing the parent: subtask call, then the client's parent call", async () => {
    const h = harness();
    const parent = (await h.list()).find((t) => t.subInstances.length === 2)!;
    for (const s of parent.subInstances) {
      await h.call("PATCH", `/tasks/update-subtask-status/${s.taskSubInstance_id}/status/Complete`);
    }
    // The fake does not cascade: the parent only changes through its own call.
    expect((await h.list()).find((t) => t.task_id === parent.task_id)?.status).toBe("Pending");
    await h.call("PATCH", `/tasks/update-task-status/${parent.task_id}/status/Complete`);
    const after = (await h.list()).find((t) => t.task_id === parent.task_id)!;
    expect(after.status).toBe("Complete");
    expect(after.subInstances.every((s) => s.status === "Complete")).toBe(true);
    // and deleting a subtask works
    const other = (await h.list()).find((t) => t.subInstances.length > 0 && t.task_id !== parent.task_id);
    if (other) expect((await h.call("DELETE", `/tasks/subTask/${other.subInstances[0].taskSubInstance_id}`)).status).toBe(200);
  });

  it("counts and streak are recomputed after toggles", async () => {
    const h = harness();
    const summary = async () => (await h.call("GET", `/tasks/getDashboardData${h.U}`, { startDate: h.w.start, endDate: h.w.end })).json.data as { pending_tasks: number; complete_tasks: number };
    const streak = async () => ((await h.call("GET", `/tasks/streak${h.U}`)).json.data as { count: number }).count;
    const before = await summary();
    expect(await streak()).toBe(5);
    const today = h.store.tasks.find((t) => t.title === "Morning workout")!;
    await h.call("PATCH", `/tasks/update-task-status/${today.task_id}/status/Pending`);
    const mid = await summary();
    expect(mid.pending_tasks).toBe(before.pending_tasks + 1);
    expect(mid.complete_tasks).toBe(before.complete_tasks - 1);
    expect(await streak()).toBe(4);
    await h.call("PATCH", `/tasks/update-task-status/${today.task_id}/status/Complete`);
    expect(await summary()).toEqual(before);
    expect(await streak()).toBe(5);
  });

  it("recurring delete removes the template's not-completed instances only", async () => {
    const h = harness();
    await h.call("DELETE", "/tasks/deleteRecurringTasks/TMP-demo-1");
    const left = h.store.tasks.filter((t) => t.template_id === "TMP-demo-1");
    expect(left).toHaveLength(1);
    expect(left[0].status).toBe("Complete");
  });

  it("distribution and heatmap follow the store", async () => {
    const h = harness();
    const q = { month: 11, year: 2026 };
    const dist = async () => (await h.call("GET", `/tasks/task-distribution${h.U}`, q)).json.data as { title: string; value: number }[];
    const before = await dist();
    expect(before.map((x) => x.title)).toEqual(h.store.projects.map((p) => p.title));
    const t = h.store.tasks.find((x) => x.title === "Review the launch checklist")!;
    await h.call("PATCH", `/tasks/update-task-status/${t.task_id}/status/Complete`);
    expect((await dist())[0].value).toBe(before[0].value + 1);
    const cells = (await h.call("GET", `/tasks/calendar-heatmap${h.U}`, q)).json.data as { date: string; value: number }[];
    expect(cells).toHaveLength(30);
    expect(cells.find((c) => c.date === "2026-11-16")!.value).toBeGreaterThanOrEqual(2);
  });
});

describe("router rules", () => {
  it("matches method plus the full anchored path; specific before generic", () => {
    expect(matchRoute("DELETE", "/tasks/subTask/abc")?.route.key).toBe("DELETE /tasks/subTask/:subId");
    expect(matchRoute("DELETE", "/tasks/deleteRecurringTasks/T")?.route.key).toBe("DELETE /tasks/deleteRecurringTasks/:templateId");
    expect(matchRoute("DELETE", "/tasks/abc")?.route.key).toBe("DELETE /tasks/:taskId");
    expect(matchRoute("PATCH", "/tasks/abc")?.route.key).toBe("PATCH /tasks/:taskId");
    expect(matchRoute("GET", "/tasks/abc")).toBeNull();
    expect(matchRoute("GET", "/x/tasks/streak/demo-user")).toBeNull();
    expect(matchRoute("GET", "/tasks/streak/demo-user/extra")).toBeNull();
    expect(matchRoute("POST", "/tasks/streak/demo-user")).toBeNull();
    expect(ROUTES).toHaveLength(15);
  });

  it("decodes each segment once", async () => {
    const h = harness();
    const t = h.store.tasks[0];
    t.task_id = "id with/slash";
    expect((await h.call("DELETE", `/tasks/${encodeURIComponent("id with/slash")}`)).status).toBe(200);
  });

  it("other users get 403, bad status 400, unknown routes 501 with the fixed body", async () => {
    const h = harness();
    expect((await h.call("GET", "/tasks/streak/someone-else")).status).toBe(403);
    expect((await h.call("GET", "/projects/getAll/someone-else")).status).toBe(403);
    const t = h.store.tasks[0].task_id;
    expect((await h.call("PATCH", `/tasks/update-task-status/${t}/status/Bogus`)).status).toBe(400);
    expect((await h.call("PATCH", `/tasks/update-subtask-status/x/status/Bogus`)).status).toBe(400);
    const nope = await h.transport({ method: "GET", path: "/user/get/demo-user", signal: new AbortController().signal, timeoutMs: 1 });
    expect(nope).toEqual({ status: 501, text: '{"message":"Not available in the demo"}' });
    expect(h.transport.hits.at(-1)).toBe("UNMATCHED GET /user/get/demo-user");
  });

  it("rejects malformed query values", async () => {
    const h = harness();
    expect((await h.call("GET", `/tasks/getDashboardData${h.U}`, { startDate: "nope", endDate: h.w.end })).status).toBe(400);
    expect((await h.call("GET", `/tasks/task-distribution${h.U}`, { month: 13, year: 2026 })).status).toBe(400);
  });

  it("a retired store refuses writes", async () => {
    const h = harness();
    h.store.retire();
    expect((await h.call("POST", "/tasks/create", undefined, { title: "Nope nope", priority: "Low", status: "Pending", isRecurring: false })).status).toBe(503);
  });
});

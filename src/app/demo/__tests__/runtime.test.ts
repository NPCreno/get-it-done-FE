import { MutationObserver, QueryObserver, type QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/utils", async (orig) => ({
  ...(await orig<typeof import("@/app/utils/utils")>()),
  getAccessToken: vi.fn(() => null),
}));
vi.mock("@/lib/clientSession", () => ({ refreshSession: vi.fn(), expireSession: vi.fn() }));

import { getAccessToken } from "@/app/utils/utils";
import { createTaskApi } from "@/app/api/taskRequests";
import { TaskListItemSchema } from "@/app/contracts/responses";
import { expireSession, refreshSession } from "@/lib/clientSession";
import { getActiveApiTransport } from "@/lib/apiTransport";
import { clearQueryCache, registerQueryClient } from "@/lib/query/client";
import { qk } from "@/lib/query/keys";
import { dataMutationOptions, setSubTaskStatusOptions, setTaskStatusOptions, TASK_DATA_KEY } from "@/lib/query/mutations";
import { distributionSpec, heatmapSpec, projectsSpec, streakSpec, summarySpec, trendSpec, upcomingSpec } from "@/lib/query/specs";
import { testClient, deferred, flush } from "@/lib/query/__tests__/helpers";
import { windowFor } from "@/lib/query/window";
import * as analytics from "../fake/analytics";
import { fixedClock } from "../fake/clock";
import { tasksInWindow, taskView } from "../fake/crud";
import { buildSeed, DEMO_USER_ID } from "../fake/seed";
import { createDemoRuntime, type DemoRuntime } from "../runtime";

const U = DEMO_USER_ID;
const NOW = Date.parse("2026-11-16T12:00:00Z");
const W = windowFor(NOW);
const fetchMock = vi.fn(() => {
  throw new Error("fetch must never be called in demo mode");
});
const spies = () => [vi.mocked(getAccessToken), vi.mocked(refreshSession), vi.mocked(expireSession), fetchMock];

const runtimes: DemoRuntime[] = [];
function make(extra: Partial<Parameters<typeof createDemoRuntime>[0]> = {}) {
  const rt = createDemoRuntime({ clock: fixedClock(NOW), recordHits: true, ...extra });
  runtimes.push(rt);
  return rt;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  runtimes.splice(0).forEach((r) => r.stop());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  spies().forEach((s) => s.mockClear());
  vi.mocked(getAccessToken).mockReturnValue(null);
});

/** Subscribes the dashboard's queries so they are active (and refetch on invalidation). */
function observeDashboard(qc: QueryClient) {
  const trend = { start: "2026-11-09", end: "2026-11-15" };
  const specs = [
    projectsSpec(U),
    upcomingSpec(U, W),
    summarySpec(U, W),
    trendSpec(U, trend),
    distributionSpec(U, "11", "2026"),
    heatmapSpec(U, "11", "2026"),
    streakSpec(U),
  ];
  const subs = specs.map((s) => new QueryObserver(qc, s as never).subscribe(() => undefined));
  return () => subs.forEach((u) => u());
}

const upcomingKey = qk.upcoming(U, W);
const summaryKey = qk.summary(U, W);
const listOf = (rt: DemoRuntime) =>
  TaskListItemSchema.array().parse(
    tasksInWindow(rt.store, Date.parse(W.start), Date.parse(W.end)).map((t) => taskView(rt.store, t))
  );
const cacheList = (qc: QueryClient) => qc.getQueryData(upcomingKey) as ReturnType<typeof listOf>;
const summaryOf = (rt: DemoRuntime) => analytics.dashboardSummary(rt.store, Date.parse(W.start), Date.parse(W.end));

const toggle = (qc: QueryClient, taskId: string, to: "Pending" | "Complete") =>
  new MutationObserver(qc, setTaskStatusOptions(qc, U, taskId)).mutate({ taskId, to });
const create = (qc: QueryClient, title: string) =>
  new MutationObserver(
    qc,
    dataMutationOptions(qc, U, TASK_DATA_KEY, "task", (d: Parameters<typeof createTaskApi>[0]) => createTaskApi(d))
  ).mutate({ title, priority: "Low", status: "Pending", isRecurring: false });

async function script(rt: DemoRuntime) {
  const qc = rt.queryClient;
  const stop = observeDashboard(qc);
  await flush();
  const task = rt.store.tasks.find((t) => t.title === "Plan the week's meals")!;
  await toggle(qc, task.task_id, "Complete");
  await new MutationObserver(qc, setSubTaskStatusOptions(qc, U, task.task_id)).mutate({
    taskId: task.task_id,
    subtaskId: task.subtasks[0].taskSubInstance_id,
    to: "Complete",
  });
  await create(qc, "Scripted task");
  await rt.reset();
  await flush();
  stop();
}

describe("D4: real query layer + specs + mutations against the transport", () => {
  it("loads, toggles optimistically, invalidates, refetches: cache equals the store", async () => {
    let gate: ReturnType<typeof deferred<void>> | null = null;
    const rt = make({ beforeHandle: async (req) => void (req.method === "PATCH" && (await gate?.promise)) });
    rt.start();
    const qc = rt.queryClient;
    const stop = observeDashboard(qc);
    await flush();
    expect(cacheList(qc)).toEqual(listOf(rt));
    expect(qc.getQueryData(summaryKey)).toEqual(summaryOf(rt));

    const target = rt.store.tasks.find((t) => t.title === "Read two chapters")!;
    gate = deferred<void>();
    const done = toggle(qc, target.task_id, "Complete");
    await flush();
    // Optimistic: the cache moved, the store did not.
    expect(cacheList(qc).find((t) => t.task_id === target.task_id)?.status).toBe("Complete");
    expect(target.status).toBe("Pending");
    gate.resolve();
    await done;
    await flush();
    expect(target.status).toBe("Complete");
    expect(cacheList(qc)).toEqual(listOf(rt));
    expect(qc.getQueryData(summaryKey)).toEqual(summaryOf(rt));
    expect(qc.getQueryData(qk.streak(U))).toEqual(analytics.streak(rt.store, fixedClock(NOW)));
    stop();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("D5 / T1 / T6: lifecycle", () => {
  it("start and stop are idempotent and leave no transport", () => {
    const rt = make();
    rt.start();
    const first = getActiveApiTransport();
    expect(first).toBe(rt.transport);
    rt.start();
    expect(getActiveApiTransport()).toBe(first);
    rt.stop();
    rt.stop();
    expect(getActiveApiTransport()).toBeNull();
    expect(() => make().stop()).not.toThrow();
  });

  it("Strict Mode: start, stop, start re-arms with a fresh store", () => {
    const rt = make();
    rt.start();
    rt.store.tasks.length = 0;
    const gen1 = rt.store.generation;
    rt.stop();
    expect(rt.store.retired).toBe(true);
    rt.start();
    expect(getActiveApiTransport()).toBe(rt.transport);
    expect(rt.store.retired).toBe(false);
    expect(rt.store.generation).toBe(gen1 + 1);
    expect(rt.store.tasks.length).toBe(buildSeed(fixedClock(NOW)).tasks.length);
  });

  it("a different runtime cannot install while one is active", () => {
    const a = make();
    const b = make();
    a.start();
    expect(() => b.start()).toThrow("API transport already installed");
    expect(getActiveApiTransport()).toBe(a.transport);
    a.stop();
    b.start();
    expect(getActiveApiTransport()).toBe(b.transport);
  });

  it("T6: stop, then a new runtime has a fresh seed, an empty client and a new transport", async () => {
    const a = make();
    a.start();
    const stop = observeDashboard(a.queryClient);
    await flush();
    await create(a.queryClient, "Only in A");
    stop();
    a.stop();
    expect(a.queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(getActiveApiTransport()).toBeNull();
    const b = make();
    expect(b.queryClient).not.toBe(a.queryClient);
    expect(b.transport).not.toBe(a.transport);
    expect(b.queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(b.store.tasks.some((t) => t.title === "Only in A")).toBe(false);
    expect(b.store.tasks).toHaveLength(buildSeed(fixedClock(NOW)).tasks.length);
    b.start();
    expect(getActiveApiTransport()).toBe(b.transport);
  });
});

describe("T3: concurrent mutations", () => {
  it("different tasks and a create run together; the same task is serialized; store and cache agree", async () => {
    const gate = deferred<void>();
    const seen: string[] = [];
    const rt = make({
      beforeHandle: async (req) => {
        if (req.method !== "GET") {
          seen.push(`${req.method} ${req.path}`);
          await gate.promise;
        }
      },
    });
    rt.start();
    const qc = rt.queryClient;
    const stop = observeDashboard(qc);
    await flush();
    const a = rt.store.tasks.find((t) => t.title === "Read two chapters")!;
    const b = rt.store.tasks.find((t) => t.title === "Send the invoice")!;
    const pathOf = (id: string, to: string) => `PATCH /tasks/update-task-status/${id}/status/${to}`;

    const all = [
      toggle(qc, a.task_id, "Complete"),
      toggle(qc, b.task_id, "Complete"),
      create(qc, "Created in flight"),
      toggle(qc, a.task_id, "Pending"), // same parent as the first: queued behind it
    ];
    await flush();
    expect(seen).toContain(pathOf(a.task_id, "Complete"));
    expect(seen).toContain(pathOf(b.task_id, "Complete"));
    expect(seen).toContain("POST /tasks/create");
    expect(seen).not.toContain(pathOf(a.task_id, "Pending")); // serialized behind the first
    gate.resolve();
    await Promise.all(all);
    await flush();

    expect(seen.filter((s) => s.includes(a.task_id))).toEqual([pathOf(a.task_id, "Complete"), pathOf(a.task_id, "Pending")]);
    expect(a.status).toBe("Pending");
    expect(b.status).toBe("Complete");
    expect(rt.store.tasks.some((t) => t.title === "Created in flight")).toBe(true);
    expect(cacheList(qc)).toEqual(listOf(rt));
    expect(qc.getQueryData(summaryKey)).toEqual(summaryOf(rt));
    stop();
  });
});

describe("T4: reset while a query and a mutation are pending", () => {
  it("the retired store absorbs the late write; the cache equals the fresh seed", async () => {
    let gate: ReturnType<typeof deferred<void>> | null = null;
    const rt = make({ beforeHandle: async () => void (await gate?.promise) });
    rt.start();
    const qc = rt.queryClient;
    const stop = observeDashboard(qc);
    await flush();
    const oldStore = rt.store;
    const target = oldStore.tasks.find((t) => t.title === "Read two chapters")!;

    gate = deferred<void>();
    const hitsBefore = rt.transport.hits.length;
    void qc.invalidateQueries({ queryKey: qk.analytics(U) }); // pending queries
    const mutation = toggle(qc, target.task_id, "Complete"); // pending mutation
    await flush();
    expect(rt.transport.hits.length).toBeGreaterThan(hitsBefore);

    const resetting = rt.reset();
    await flush();
    gate.resolve();
    gate = null;
    await Promise.all([resetting, mutation]);
    await flush();

    expect(rt.store).not.toBe(oldStore);
    expect(rt.store.generation).toBe(oldStore.generation + 1);
    expect(target.status).toBe("Complete"); // the old store took the write
    expect(rt.store.tasks.find((t) => t.title === "Read two chapters")!.status).toBe("Pending");
    expect(cacheList(qc)).toEqual(listOf(rt));
    expect(qc.getQueryData(summaryKey)).toEqual(summaryOf(rt));
    expect(qc.getQueryData(qk.streak(U))).toEqual(analytics.streak(rt.store, fixedClock(NOW)));
    stop();
  });
});

describe("T2: isolation from a signed-in session", () => {
  it("leaves the outer client, identity and registered client untouched", async () => {
    vi.mocked(getAccessToken).mockReturnValue("real-token");
    const outer = testClient();
    registerQueryClient(outer);
    const realKey = ["u", "real-user", "tasks", "upcoming", W.start, W.end] as const;
    const realData = [{ task_id: "real-1", title: "Real task", status: "Pending" }];
    outer.setQueryData(realKey, realData);
    const snapshot = JSON.stringify(outer.getQueryCache().getAll().map((q) => [q.queryKey, q.state.data]));
    const identity = vi.mocked(getAccessToken)();
    vi.mocked(getAccessToken).mockClear();

    const rt = make();
    rt.start();
    await script(rt);
    rt.stop();

    expect(JSON.stringify(outer.getQueryCache().getAll().map((q) => [q.queryKey, q.state.data]))).toBe(snapshot);
    expect(outer.getQueryData(realKey)).toBe(realData);
    expect(outer.isFetching()).toBe(0);
    expect(identity).toBe("real-token");
    spies().forEach((s) => expect(s).not.toHaveBeenCalled());
    // The registered client is still the outer one: session expiry would clear it, not the demo's.
    clearQueryCache();
    expect(outer.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe("I1 / I2", () => {
  it("I1: a full demo script never touches the token, refresh, expiry or fetch", async () => {
    const rt = make();
    rt.start();
    await script(rt);
    rt.stop();
    spies().forEach((s) => expect(s).not.toHaveBeenCalled());
    expect(rt.transport.hits.some((h) => h.startsWith("UNMATCHED"))).toBe(false);
  });

  it("I2: with a token cookie stubbed, every demo query key is under ['u','demo-user']", async () => {
    vi.mocked(getAccessToken).mockReturnValue("jwt-for-someone-else");
    const rt = make();
    rt.start();
    const stop = observeDashboard(rt.queryClient);
    await flush();
    const keys = rt.queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys.length).toBeGreaterThanOrEqual(7);
    for (const k of keys) expect(k.slice(0, 2)).toEqual(["u", "demo-user"]);
    stop();
  });
});

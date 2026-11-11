import { CancelledError, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { describeLoadFailure, type ApiFailure } from "@/lib/apiClient";
import { isEmptyDistribution, isEmptyList, never } from "../emptiness";
import { qk, resourceOf } from "../keys";
import { loadStateOf } from "../loadState";
import { ApiError, unwrap } from "../unwrap";
import { windowFor } from "../window";
import { failResult, flush, testClient } from "./helpers";

const fail = (kind: ApiFailure["kind"], status = 0): ApiFailure => ({ ok: false, kind, status, message: `${kind} msg` });
const err = (kind: ApiFailure["kind"], status = 0) => new ApiError(fail(kind, status));
type Q = Parameters<typeof loadStateOf<number[]>>[0];
const q = (over: Partial<Q>): Q =>
  ({ status: "pending", data: undefined, error: null, isPlaceholderData: false, ...over }) as Q;
const run = (over: Partial<Q>, ending = false) => loadStateOf<number[]>(q(over), isEmptyList, () => ending);

describe("loadStateOf rules", () => {
  it("pending without data -> loading; with placeholder data -> ready", () => {
    expect(run({}).status).toBe("loading");
    expect(run({ status: "success", data: [1], isPlaceholderData: true }).status).toBe("ready");
  });

  it.each([
    ["http 500", err("http", 500)],
    ["network", err("network")],
    ["timeout", err("timeout")],
    ["api", err("api", 200)],
    ["forbidden", err("forbidden", 403)],
    ["invalid_response", err("invalid_response", 200)],
    ["plain Error", new Error("boom")],
  ])("%s -> error", (_n, error) => {
    expect(run({ status: "error", error }).status).toBe("error");
  });

  it("a plain Error surfaces as kind http", () => {
    const s = run({ status: "error", error: new Error("x") });
    expect(s.status === "error" && s.failure.kind).toBe("http");
  });

  it("unauthorized is silent only while the session is ending", () => {
    expect(run({ status: "error", error: err("unauthorized", 401) }, true).status).toBe("loading");
    expect(run({ status: "error", error: err("unauthorized", 401) }, false).status).toBe("error");
  });

  it("aborted and CancelledError are silent", () => {
    expect(run({ status: "error", error: err("aborted") }).status).toBe("loading");
    expect(run({ status: "error", error: new CancelledError() }).status).toBe("loading");
  });

  it("error with this key's own data -> ready + refreshFailure; with placeholder data -> error", () => {
    const own = run({ status: "error", error: err("network"), data: [1] });
    expect(own.status).toBe("ready");
    expect(own.status === "ready" && own.refreshFailure?.kind).toBe("network");
    expect(run({ status: "error", error: err("network"), data: [1], isPlaceholderData: true }).status).toBe("error");
  });

  it("success [] -> empty; all-zero distribution -> empty; heatmap zeros and streak 0 -> ready", () => {
    expect(run({ status: "success", data: [] }).status).toBe("empty");
    const base = { status: "success", error: null, isPlaceholderData: false } as const;
    const dist = [{ title: "a", value: 0, fill: "x" }];
    expect(loadStateOf({ ...base, data: dist } as never, isEmptyDistribution).status).toBe("empty");
    expect(loadStateOf({ ...base, data: [] } as never, isEmptyDistribution).status).toBe("empty");
    expect(loadStateOf({ ...base, data: [{ date: "2026-11-01", value: 0 }] } as never, never).status).toBe("ready");
    expect(loadStateOf({ ...base, data: { count: 0 } } as never, never).status).toBe("ready");
  });
});

describe("describeLoadFailure: fixed copy per kind", () => {
  it.each([
    [fail("network"), "You seem to be offline, or the server can't be reached."],
    [fail("timeout"), "The server took too long to respond."],
    [fail("forbidden", 403), "You don't have access to this data."],
    [fail("unauthorized", 401), "Your session couldn't be verified. Please sign in again."],
    [fail("http", 503), "Something went wrong on our side."],
    [fail("api", 200), "Something went wrong on our side."],
    [fail("invalid_response", 200), "Something went wrong on our side."],
    [fail("http", 404), "The request couldn't be completed."],
    [fail("invalid_request"), "The request couldn't be completed."],
  ])("%j", (f, text) => expect(describeLoadFailure(f)).toBe(text));

  it("never leaks server text", () => {
    const api: ApiFailure = {
      ok: false,
      kind: "api",
      status: 200,
      message: "SELECT secret FROM users",
      detail: "QueryFailedError: relation x",
    };
    const out = describeLoadFailure(api);
    expect(out).not.toContain("SELECT");
    expect(out).not.toContain("QueryFailedError");
    const nf: ApiFailure = { ok: false, kind: "http", status: 404, message: "Task with ID abc not found" };
    expect(describeLoadFailure(nf)).not.toContain("abc");
  });
});

describe("resourceOf: allowlisted labels, no key values", () => {
  const w = windowFor(Date.parse("2026-11-10T10:03:00.000Z"));
  const U = "USER-SENTINEL";
  const P = "PROJ-SENTINEL";
  const cases: [readonly unknown[], string][] = [
    [qk.profile(U), "profile"],
    [qk.projects(U), "projects"],
    [qk.project(U, P), "projects.detail"],
    [qk.upcoming(U, w), "tasks.upcoming"],
    [qk.projectTasks(U, P, w), "tasks.project"],
    [qk.summary(U, w), "analytics.summary"],
    [qk.trend(U, { start: "2026-11-09", end: "2026-11-15" }), "analytics.trend"],
    [qk.distribution(U, "11", "2026"), "analytics.distribution"],
    [qk.heatmap(U, "11", "2026"), "analytics.heatmap"],
    [qk.streak(U), "analytics.streak"],
  ];
  it.each(cases)("%j", (key, label) => {
    expect(resourceOf(key)).toBe(label);
    expect(label).not.toContain("SENTINEL");
  });
  it("unknown shapes", () => {
    expect(resourceOf(["x"])).toBe("unknown");
    expect(resourceOf(["u", "id", "mystery"])).toBe("unknown");
  });
});

describe("observed TanStack behavior (real QueryObserver)", () => {
  const KEY = ["u", "u1", "analytics", "streak"] as const;
  const stateOf = (obs: { getCurrentResult: () => unknown }) => loadStateOf(obs.getCurrentResult() as never, never, () => false);

  it("first fetch fails: error, query function called once (http is not retried)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const qc = testClient();
    let calls = 0;
    const obs = new QueryObserver(qc, { queryKey: KEY, queryFn: async () => (calls++, unwrap(failResult("http"))) });
    const unsub = obs.subscribe(() => undefined);
    await new Promise((r) => setTimeout(r, 30));
    expect(stateOf(obs).status).toBe("error");
    expect(calls).toBe(1);
    unsub();
  });

  it("success then failed refetch -> ready with refreshFailure; a good retry clears it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const qc = testClient();
    let mode: "ok" | "fail" = "ok";
    const obs = new QueryObserver(qc, {
      queryKey: KEY,
      queryFn: async () => (mode === "ok" ? "data" : unwrap(failResult("http"))),
      staleTime: 0,
    });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    expect(stateOf(obs).status).toBe("ready");
    mode = "fail";
    await obs.refetch();
    const s = stateOf(obs);
    expect(s.status).toBe("ready");
    expect(s.status === "ready" && s.refreshFailure).toBeTruthy();
    mode = "ok";
    await obs.refetch();
    const s2 = stateOf(obs);
    expect(s2.status === "ready" && s2.refreshFailure).toBeFalsy();
    unsub();
  });

  it("key change where the new key fails: policy result is error whenever data is only a placeholder; retry works", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const qc = testClient();
    const A: readonly unknown[] = ["u", "u1", "analytics", "heatmap", "2026", "10"];
    const B: readonly unknown[] = ["u", "u1", "analytics", "heatmap", "2026", "11"];
    let bOk = false;
    const obs = new QueryObserver(qc, { queryKey: A, queryFn: async () => "A data", placeholderData: (prev: unknown) => prev });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    obs.setOptions({
      queryKey: B,
      queryFn: async () => (bOk ? "B data" : unwrap(failResult("http"))),
      placeholderData: (prev: unknown) => prev,
    });
    await new Promise((r) => setTimeout(r, 30));
    const r = obs.getCurrentResult();
    expect(r.status).toBe("error");
    // Pinned: whether TanStack reports placeholder data after the failed switch.
    const policy = stateOf(obs);
    if (r.isPlaceholderData || r.data === undefined) expect(policy.status).toBe("error");
    bOk = true;
    await obs.refetch();
    expect(stateOf(obs).status).toBe("ready");
    unsub();
  });

  it("an aborted result is never error", async () => {
    const qc = testClient();
    const obs = new QueryObserver(qc, { queryKey: KEY, queryFn: async () => unwrap(failResult("aborted")) });
    const unsub = obs.subscribe(() => undefined);
    await new Promise((r) => setTimeout(r, 30));
    expect(stateOf(obs).status).not.toBe("error");
    unsub();
  });
});

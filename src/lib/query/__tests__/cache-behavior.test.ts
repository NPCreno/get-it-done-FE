import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/taskRequests", () => ({
  deleteTaskApi: vi.fn(),
  createTaskApi: vi.fn(),
  updateTaskApi: vi.fn(),
  deleteRecurringTasksApi: vi.fn(),
  createSubTaskApi: vi.fn(),
  deleteSubTaskApi: vi.fn(),
  updateTaskStatus: vi.fn(),
  updateSubTaskStatus: vi.fn(),
}));
vi.mock("@/app/api/projectsRequests", () => ({ createProject: vi.fn(), updateProject: vi.fn(), deleteProjectById: vi.fn() }));
vi.mock("@/app/api/userRequests", () => ({ updateUser: vi.fn() }));

import { deleteTaskApi, deleteSubTaskApi } from "@/app/api/taskRequests";
import { dataMutationOptions, TASK_DATA_KEY } from "../mutations";
import { invalidationsFor } from "../invalidation";
import { qk } from "../keys";
import { deferred, failResult, flush, okResult, testClient } from "./helpers";

const U = "u1";
const KEY = ["u", U, "tasks", "x"] as const;

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("invalidationsFor: exactly the matrix", () => {
  it("per event", () => {
    const t = qk.tasks(U);
    const a = qk.analytics(U);
    const p = qk.projects(U);
    expect(invalidationsFor("task", U)).toEqual([t, a, p]);
    expect(invalidationsFor("subtask-structure", U)).toEqual([t]);
    expect(invalidationsFor("subtask-status", U)).toEqual([t, a, p]);
    expect(invalidationsFor("project-saved", U)).toEqual([p, a]);
    expect(invalidationsFor("project-deleted", U)).toEqual([p, t, a]);
    expect(invalidationsFor("profile", U)).toEqual([qk.profile(U)]);
  });
});

/** A fake server whose value tests change, behind a hand-resolved query function. */
function server() {
  const calls: { signal: AbortSignal; res: (v: string) => void }[] = [];
  const queryFn = ({ signal }: { signal: AbortSignal }) =>
    new Promise<string>((res) => calls.push({ signal, res }));
  return { calls, queryFn };
}

describe("latest server data wins", () => {
  it("an obsolete refetch resolving late cannot overwrite newer data", async () => {
    const qc = testClient();
    const s = server();
    const obs = new QueryObserver(qc, { queryKey: KEY, queryFn: s.queryFn, staleTime: 0 });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    s.calls[0].res("v0");
    await flush();
    expect(qc.getQueryData(KEY)).toBe("v0");

    void qc.invalidateQueries({ queryKey: KEY }); // refetch 1 (will be v1, resolves late)
    await flush();
    void qc.invalidateQueries({ queryKey: KEY }); // cancelRefetch replaces it
    await flush();
    expect(s.calls).toHaveLength(3);
    expect(s.calls[1].signal.aborted).toBe(true);

    s.calls[2].res("v2");
    await flush();
    s.calls[1].res("v1"); // late, obsolete
    await flush();
    expect(qc.getQueryData(KEY)).toBe("v2");
    unsub();
  });

  it("10 back-to-back invalidations end on the server value with isFetching false", async () => {
    const qc = testClient();
    let serverValue = "s0";
    const obs = new QueryObserver(qc, {
      queryKey: KEY,
      queryFn: async () => {
        const v = serverValue;
        await flush();
        return v;
      },
      staleTime: 0,
    });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    await flush();
    for (let i = 1; i <= 10; i++) {
      serverValue = `s${i}`;
      void qc.invalidateQueries({ queryKey: KEY });
    }
    await new Promise((r) => setTimeout(r, 40));
    expect(qc.getQueryData(KEY)).toBe("s10");
    expect(qc.isFetching({ queryKey: KEY })).toBe(0);
    unsub();
  });
});

describe("deduplication", () => {
  it("two observers on one key run the query function once", async () => {
    const qc = testClient();
    const s = server();
    const o1 = new QueryObserver(qc, { queryKey: KEY, queryFn: s.queryFn });
    const o2 = new QueryObserver(qc, { queryKey: KEY, queryFn: s.queryFn });
    const u1 = o1.subscribe(() => undefined);
    const u2 = o2.subscribe(() => undefined);
    await flush();
    expect(s.calls).toHaveLength(1);
    s.calls[0].res("x");
    await flush();
    expect(o1.getCurrentResult().data).toBe("x");
    expect(o2.getCurrentResult().data).toBe("x");
    u1();
    u2();
  });
});

describe("gated invalidation: no lost invalidation", () => {
  const run = async (order: "forward" | "reverse") => {
    const qc = testClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const d1 = deferred<ReturnType<typeof okResult>>();
    const d2 = deferred<ReturnType<typeof okResult>>();
    vi.mocked(deleteTaskApi).mockReturnValueOnce(d1.promise as never).mockReturnValueOnce(d2.promise as never);
    const opts = dataMutationOptions(qc, U, TASK_DATA_KEY, "task", (id: string) => deleteTaskApi(id));
    const m1 = new MutationObserver(qc, opts);
    const m2 = new MutationObserver(qc, opts);
    const p1 = m1.mutate("t1");
    const p2 = m2.mutate("t2");
    await flush();
    expect(qc.isMutating({ mutationKey: TASK_DATA_KEY })).toBe(2);
    const [first, second] = order === "forward" ? [d1, d2] : [d2, d1];
    first.resolve(okResult(undefined));
    await flush();
    // The earlier one of the burst does NOT invalidate (another is still pending)...
    expect(spy).not.toHaveBeenCalled();
    second.resolve(okResult(undefined));
    await Promise.all([p1, p2]);
    // ...the last one does, exactly once, for the whole matrix.
    expect(spy).toHaveBeenCalledTimes(invalidationsFor("task", U).length);
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual(invalidationsFor("task", U));
  };

  it("settling in order", () => run("forward"));
  it("settling in reverse order", () => run("reverse"));

  it("a queued scoped mutation: an invalidation still happens after the burst (and isMutating's count is pinned)", async () => {
    const qc = testClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const d1 = deferred<ReturnType<typeof okResult>>();
    const d2 = deferred<ReturnType<typeof okResult>>();
    vi.mocked(deleteSubTaskApi).mockReturnValueOnce(d1.promise as never).mockReturnValueOnce(d2.promise as never);
    const opts = dataMutationOptions(qc, U, TASK_DATA_KEY, "subtask-structure", (id: string) => deleteSubTaskApi(id), "T");
    const m1 = new MutationObserver(qc, opts);
    const m2 = new MutationObserver(qc, opts);
    const p1 = m1.mutate("s1");
    const p2 = m2.mutate("s2");
    await flush();
    // Pinned: the second mutation of the same scope is queued, not started.
    expect(vi.mocked(deleteSubTaskApi)).toHaveBeenCalledTimes(1);
    const counted = qc.isMutating({ mutationKey: TASK_DATA_KEY });
    expect([1, 2]).toContain(counted);
    d1.resolve(okResult(undefined));
    await flush();
    d2.resolve(okResult(undefined));
    await Promise.all([p1, p2]);
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(invalidationsFor("subtask-structure", U).length);
    expect(vi.mocked(deleteSubTaskApi)).toHaveBeenCalledTimes(2);
  });
});

describe("pending semantics (invalidation promise is awaited)", () => {
  const setup = async (refetchOutcome: "ok" | "fail") => {
    const qc = testClient();
    const refetch = deferred<string>();
    let n = 0;
    const obs = new QueryObserver(qc, {
      queryKey: qk.tasks(U),
      queryFn: () => {
        n += 1;
        return n === 1 ? Promise.resolve("first") : refetch.promise;
      },
      staleTime: 60_000,
      retry: false,
    });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    vi.mocked(deleteTaskApi).mockResolvedValueOnce(okResult(undefined) as never);
    const m = new MutationObserver(qc, dataMutationOptions(qc, U, TASK_DATA_KEY, "task", (id: string) => deleteTaskApi(id)));
    const done = m.mutate("t1");
    await flush();
    await flush();
    return { qc, m, done, refetch, unsub, outcome: refetchOutcome };
  };

  it("stays pending until the active query has refetched", async () => {
    const { m, done, refetch, unsub } = await setup("ok");
    expect(m.getCurrentResult().status).toBe("pending");
    refetch.resolve("second");
    await done;
    expect(m.getCurrentResult().status).toBe("success");
    unsub();
  });

  it("a failing refetch still lets the mutation settle", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { m, done, refetch, unsub } = await setup("fail");
    expect(m.getCurrentResult().status).toBe("pending");
    refetch.reject(new Error("boom"));
    await done;
    expect(m.getCurrentResult().status).toBe("success");
    unsub();
  });

  it("a failed mutation settles too (error state, invalidation still gated)", async () => {
    const qc = testClient();
    vi.mocked(deleteTaskApi).mockResolvedValueOnce(failResult("http") as never);
    const m = new MutationObserver(qc, dataMutationOptions(qc, U, TASK_DATA_KEY, "task", (id: string) => deleteTaskApi(id)));
    await m.mutate("t1").catch(() => undefined);
    expect(m.getCurrentResult().status).toBe("error");
  });
});

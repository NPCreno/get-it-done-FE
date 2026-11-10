import { QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, isCancellation, isRetryable, unwrap } from "../unwrap";
import { deferred, failResult, flush, testClient } from "./helpers";

const A: readonly unknown[] = ["u", "u1", "tasks", "A"];
const B: readonly unknown[] = ["u", "u1", "tasks", "B"];

afterEach(() => vi.restoreAllMocks());

/** A query function whose every call is recorded and resolved by hand. */
function controlled<T>() {
  const calls: { signal: AbortSignal; d: ReturnType<typeof deferred<T>> }[] = [];
  const queryFn = ({ signal }: { signal: AbortSignal }) => {
    const d = deferred<T>();
    calls.push({ signal, d });
    return d.promise;
  };
  return { calls, queryFn };
}

describe("cancellation: observed TanStack behavior, pinned", () => {
  it("key change aborts A's signal; A's late resolve writes nothing; A is reverted", async () => {
    const qc = testClient();
    const a = controlled<string>();
    const b = controlled<string>();
    const obs = new QueryObserver(qc, { queryKey: A, queryFn: a.queryFn });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    expect(a.calls).toHaveLength(1);

    obs.setOptions({ queryKey: B, queryFn: b.queryFn });
    await flush();
    expect(a.calls[0].signal.aborted).toBe(true);

    a.calls[0].d.resolve("late A");
    await flush();
    expect(qc.getQueryData(A)).toBeUndefined();
    const stateA = qc.getQueryState(A);
    expect(stateA?.data).toBeUndefined();
    expect(stateA?.fetchStatus).toBe("idle");
    // Pinned: a cancelled first fetch reverts to its pre-fetch state.
    expect(stateA?.status).toBe("pending");

    b.calls[0].d.resolve("B");
    await flush();
    expect(qc.getQueryData(B)).toBe("B");
    unsub();
  });

  it("the last observer unmounting mid-flight aborts the signal and reverts the query", async () => {
    const qc = testClient();
    const a = controlled<string>();
    const obs = new QueryObserver(qc, { queryKey: A, queryFn: a.queryFn });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    unsub();
    await flush();
    expect(a.calls[0].signal.aborted).toBe(true);
    expect(qc.getQueryState(A)?.fetchStatus).toBe("idle");
    expect(qc.getQueryState(A)?.status).toBe("pending");
  });

  it("explicit cancelQueries reverts: fetchStatus idle, previous data kept", async () => {
    const qc = testClient();
    qc.setQueryData(A, "previous");
    const a = controlled<string>();
    const obs = new QueryObserver(qc, { queryKey: A, queryFn: a.queryFn, staleTime: 0 });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    expect(qc.getQueryState(A)?.fetchStatus).toBe("fetching");
    await qc.cancelQueries({ queryKey: A });
    expect(a.calls[0].signal.aborted).toBe(true);
    expect(qc.getQueryState(A)?.fetchStatus).toBe("idle");
    expect(qc.getQueryData(A)).toBe("previous");
    unsub();
  });

  it("an aborted ApiResult is not retried, is a cancellation, and the global logger stays quiet", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const qc = testClient();
    let calls = 0;
    const gate = deferred<void>();
    const obs = new QueryObserver(qc, {
      queryKey: A,
      queryFn: async ({ signal }) => {
        calls += 1;
        await gate.promise;
        // What apiClient does after its signal aborts.
        return unwrap(signal.aborted ? failResult("aborted") : { ok: true as const, status: 200, data: "x" });
      },
    });
    const unsub = obs.subscribe(() => undefined);
    await flush();
    await qc.cancelQueries({ queryKey: A });
    gate.resolve();
    await flush();
    await flush();
    expect(calls).toBe(1);
    expect(warn.mock.calls.filter((c) => c[0] === "[query]")).toHaveLength(0);
    unsub();

    const aborted = new ApiError(failResult("aborted"));
    expect(isCancellation(aborted)).toBe(true);
    expect(isRetryable(aborted)).toBe(false);
  });

  it("a network failure is retried once; an http failure is not", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const qc = testClient();
    let net = 0;
    let http = 0;
    const n = new QueryObserver(qc, {
      queryKey: A,
      queryFn: async () => {
        net += 1;
        return unwrap(failResult("network"));
      },
    });
    const h = new QueryObserver(qc, {
      queryKey: B,
      queryFn: async () => {
        http += 1;
        return unwrap(failResult("http"));
      },
    });
    const u1 = n.subscribe(() => undefined);
    const u2 = h.subscribe(() => undefined);
    await new Promise((r) => setTimeout(r, 50));
    expect(net).toBe(2); // first try plus exactly one retry
    expect(http).toBe(1);
    expect(qc.getQueryState(B)?.status).toBe("error");
    u1();
    u2();
  });
});

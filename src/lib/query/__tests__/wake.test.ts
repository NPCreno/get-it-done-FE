import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { refetchErroredQueries } from "../wake";

describe("refetchErroredQueries (UX-03 onAwake)", () => {
  let qc: QueryClient;
  const unsubs: Array<() => void> = [];
  afterEach(() => {
    unsubs.splice(0).forEach((u) => u());
    qc?.clear();
  });

  it("refetches only active queries in error; leaves successful and inactive ones alone", async () => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    let failNext = true;
    const erroredFn = vi.fn(async () => {
      if (failNext) throw new Error("timeout");
      return "fresh";
    });
    const fineFn = vi.fn(async () => "ok");
    const inactiveFn = vi.fn(async () => {
      throw new Error("timeout");
    });

    const errored = new QueryObserver(qc, { queryKey: ["errored"], queryFn: erroredFn });
    const fine = new QueryObserver(qc, { queryKey: ["fine"], queryFn: fineFn });
    unsubs.push(errored.subscribe(() => {}), fine.subscribe(() => {}));
    await qc.prefetchQuery({ queryKey: ["inactive"], queryFn: inactiveFn }); // errored, no observer

    await vi.waitFor(() => {
      expect(qc.getQueryState(["errored"])?.status).toBe("error");
      expect(qc.getQueryState(["fine"])?.status).toBe("success");
    });
    expect(qc.getQueryState(["inactive"])?.status).toBe("error");
    expect([erroredFn, fineFn, inactiveFn].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);

    failNext = false;
    await refetchErroredQueries(qc);

    expect(erroredFn).toHaveBeenCalledTimes(2);
    expect(fineFn).toHaveBeenCalledTimes(1);
    expect(inactiveFn).toHaveBeenCalledTimes(1);
    expect(qc.getQueryState(["errored"])?.status).toBe("success");
    expect(qc.getQueryData(["errored"])).toBe("fresh");
  });

  it("does not touch mutations", async () => {
    qc = new QueryClient();
    const mutationFn = vi.fn(async () => {
      throw new Error("timeout");
    });
    await qc
      .getMutationCache()
      .build(qc, { mutationFn })
      .execute(undefined)
      .catch(() => undefined);
    await refetchErroredQueries(qc);
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});

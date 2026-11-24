import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/utils", () => ({ getAccessToken: vi.fn(() => null) }));
vi.mock("../query/client", () => ({ clearQueryCache: vi.fn() }));
vi.mock("../serverWake", async (orig) => ({
  ...(await orig<typeof import("../serverWake")>()),
  serverWake: { reportSlow: vi.fn(), reportUnreachable: vi.fn() },
}));

import { REFRESH_WAIT_MS, refreshSession } from "../clientSession";
import { SLOW_MS, serverWake } from "../serverWake";

const fetchMock = vi.fn();
const reportSlow = vi.mocked(serverWake.reportSlow);

function pendingFetch() {
  let resolve: (r: Response) => void = () => {};
  fetchMock.mockImplementationOnce(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((res, rej) => {
        resolve = res;
        init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
      })
  );
  return (r: Response) => resolve(r);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  reportSlow.mockReset();
});

describe("refreshSession survives a cold start (UX-03)", () => {
  it("waits 60 s for /api/auth/refresh", () => {
    expect(REFRESH_WAIT_MS).toBe(60_000);
  });

  it("a refresh pending past SLOW_MS reports slow, then still succeeds", async () => {
    const started = Date.now();
    const resolve = pendingFetch();
    const p = refreshSession(null);
    await vi.advanceTimersByTimeAsync(SLOW_MS);
    expect(reportSlow).toHaveBeenCalledWith(started);
    await vi.advanceTimersByTimeAsync(40_000); // past the old 10 s limit
    resolve(new Response(null, { status: 200 }));
    expect(await p).toBe("refreshed");
  });

  it("a quick refresh reports nothing", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    expect(await refreshSession(null)).toBe("refreshed");
    await vi.advanceTimersByTimeAsync(SLOW_MS * 2);
    expect(reportSlow).not.toHaveBeenCalled();
  });

  it("gives up at REFRESH_WAIT_MS as unavailable", async () => {
    pendingFetch();
    const p = refreshSession(null);
    await vi.advanceTimersByTimeAsync(REFRESH_WAIT_MS);
    expect(await p).toBe("unavailable");
  });
});

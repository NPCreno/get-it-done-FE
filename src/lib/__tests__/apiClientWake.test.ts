import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/utils", () => ({ getAccessToken: vi.fn(() => "tok") }));
vi.mock("../clientSession", () => ({ refreshSession: vi.fn(), expireSession: vi.fn() }));
vi.mock("../serverWake", async (orig) => ({
  ...(await orig<typeof import("../serverWake")>()),
  serverWake: { reportSlow: vi.fn(), reportUnreachable: vi.fn() },
}));

import { apiClient } from "../apiClient";
import { SLOW_MS, serverWake } from "../serverWake";

const reportSlow = vi.mocked(serverWake.reportSlow);
const reportUnreachable = vi.mocked(serverWake.reportUnreachable);
const fetchMock = vi.fn();
const ok = () => ({ status: 200, text: async () => JSON.stringify({ status: "success", data: 1 }) }) as Response;

/** A fetch that settles when the test says so, or rejects when the signal aborts. */
function deferredFetch() {
  let resolve: (r: Response) => void = () => {};
  let reject: (e: unknown) => void = () => {};
  fetchMock.mockImplementationOnce(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((res, rej) => {
        resolve = res;
        reject = rej;
        init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
      })
  );
  return { resolve: (r: Response) => resolve(r), reject: (e: unknown) => reject(e) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", {});
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api");
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  reportSlow.mockReset();
  reportUnreachable.mockReset();
});

const opts = { fallbackError: "x" };

describe("apiClient → serverWake (UX-03)", () => {
  it("a backend request pending more than SLOW_MS calls reportSlow with its start time", async () => {
    const started = Date.now();
    const d = deferredFetch();
    const p = apiClient("/tasks", opts);
    await vi.advanceTimersByTimeAsync(SLOW_MS - 1);
    expect(reportSlow).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(reportSlow).toHaveBeenCalledTimes(1);
    expect(reportSlow).toHaveBeenCalledWith(started);
    d.resolve(ok());
    expect(await p).toMatchObject({ ok: true });
    expect(reportUnreachable).not.toHaveBeenCalled();
  });

  it("a backend request that settles earlier reports nothing", async () => {
    const d = deferredFetch();
    const p = apiClient("/tasks", opts);
    await vi.advanceTimersByTimeAsync(SLOW_MS - 100);
    d.resolve(ok());
    await p;
    await vi.advanceTimersByTimeAsync(SLOW_MS * 3);
    expect(reportSlow).not.toHaveBeenCalled();
    expect(reportUnreachable).not.toHaveBeenCalled();
  });

  it("network calls reportUnreachable", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await apiClient("/tasks", opts)).toMatchObject({ ok: false, kind: "network" });
    expect(reportUnreachable).toHaveBeenCalledTimes(1);
  });

  it("timeout calls reportUnreachable (and reportSlow first)", async () => {
    deferredFetch();
    const p = apiClient("/tasks", { ...opts, timeoutMs: 15_000 });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await p).toMatchObject({ ok: false, kind: "timeout" });
    expect(reportSlow).toHaveBeenCalledTimes(1);
    expect(reportUnreachable).toHaveBeenCalledTimes(1);
  });

  it("aborted, http and forbidden report nothing", async () => {
    const controller = new AbortController();
    deferredFetch();
    const p = apiClient("/tasks", { ...opts, signal: controller.signal });
    controller.abort();
    expect(await p).toMatchObject({ kind: "aborted" });

    fetchMock.mockResolvedValueOnce({ status: 500, text: async () => "" } as Response);
    expect(await apiClient("/tasks", opts)).toMatchObject({ kind: "http" });
    fetchMock.mockResolvedValueOnce({ status: 403, text: async () => "" } as Response);
    expect(await apiClient("/tasks", opts)).toMatchObject({ kind: "forbidden" });

    await vi.advanceTimersByTimeAsync(SLOW_MS * 2);
    expect(reportUnreachable).not.toHaveBeenCalled();
    expect(reportSlow).not.toHaveBeenCalled();
  });

  it("sameOrigin calls report nothing, slow or unreachable", async () => {
    deferredFetch();
    const slow = apiClient("/api/auth/signup", { ...opts, sameOrigin: true, auth: false, timeoutMs: 20_000 });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await slow).toMatchObject({ kind: "timeout" });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await apiClient("/api/x", { ...opts, sameOrigin: true, auth: false })).toMatchObject({ kind: "network" });
    expect(reportSlow).not.toHaveBeenCalled();
    expect(reportUnreachable).not.toHaveBeenCalled();
  });
});

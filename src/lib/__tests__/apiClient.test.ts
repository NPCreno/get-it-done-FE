import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/utils", () => ({ getAccessToken: vi.fn() }));
vi.mock("../clientSession", () => ({ refreshSession: vi.fn(), expireSession: vi.fn() }));

import { getAccessToken } from "@/app/utils/utils";
import { expireSession, refreshSession } from "../clientSession";
import { apiClient, type ApiRequestOptions } from "../apiClient";

const getToken = vi.mocked(getAccessToken);
const refresh = vi.mocked(refreshSession);
const expire = vi.mocked(expireSession);
const fetchMock = vi.fn();

const res = (status: number, body: unknown = "") =>
  ({
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }) as Response;
const envelope = (data: unknown, status = "success", message = "ok") => ({ status, message, data });
const FALLBACK = "fallback error";
const opts = <T = unknown>(o: Partial<ApiRequestOptions<T>> = {}): ApiRequestOptions<T> => ({
  fallbackError: FALLBACK,
  ...o,
});

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/");
  getToken.mockReturnValue("tok");
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  getToken.mockReset();
  refresh.mockReset();
  expire.mockReset();
});

describe("apiClient: success handling", () => {
  it("returns the envelope data and sends bearer + url", async () => {
    fetchMock.mockResolvedValue(res(200, envelope({ a: 1 })));
    const r = await apiClient("/x/y", opts({ query: { q: 1, skip: undefined } }));
    expect(r).toEqual({ ok: true, status: 200, data: { a: 1 }, message: "ok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/x/y?q=1");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.credentials).toBe("omit");
  });

  it("schema pass returns parsed data; schema fail is invalid_response", async () => {
    const schema = z.object({ n: z.coerce.number() });
    fetchMock.mockResolvedValueOnce(res(200, envelope({ n: "5" })));
    expect(await apiClient("/x", opts({ schema }))).toMatchObject({ ok: true, data: { n: 5 } });
    fetchMock.mockResolvedValueOnce(res(200, envelope({ n: "nope" })));
    expect(await apiClient("/x", opts({ schema }))).toMatchObject({
      ok: false,
      kind: "invalid_response",
      status: 200,
      message: "Unexpected response from server",
    });
  });

  it("an envelope with status !== success is kind api with detail", async () => {
    fetchMock.mockResolvedValue(res(200, { status: "error", message: "nope", error: "why" }));
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "api", message: "nope", detail: "why" });
    fetchMock.mockResolvedValue(res(200, { status: "error", error: { message: "deep" } }));
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "api", message: FALLBACK, detail: "deep" });
  });

  it("empty body: invalid_response unless allowEmpty", async () => {
    fetchMock.mockResolvedValue(res(204, ""));
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "invalid_response" });
    expect(await apiClient("/x", opts({ allowEmpty: true }))).toEqual({ ok: true, status: 204, data: undefined });
  });

  it("expect none and raw", async () => {
    fetchMock.mockResolvedValue(res(200, "not json"));
    expect(await apiClient("/x", opts({ expect: "none" }))).toEqual({ ok: true, status: 200, data: undefined });
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "invalid_response" });
    fetchMock.mockResolvedValue(res(200, { raw: true }));
    expect(await apiClient("/x", opts({ expect: "raw" }))).toEqual({ ok: true, status: 200, data: { raw: true } });
  });
});

describe("apiClient: request validation", () => {
  it("requestSchema failure is invalid_request and nothing is sent", async () => {
    const requestSchema = z.object({ name: z.string().min(1) });
    const r = await apiClient("/x", opts({ method: "POST", body: { name: "" }, requestSchema }));
    expect(r).toMatchObject({ ok: false, kind: "invalid_request", status: 0, message: "Request failed validation" });
    expect((r as { detail?: string }).detail).toMatch(/^name: /);
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(getToken).toHaveBeenCalledTimes(0);
  });

  it("requestSchema pass sends the parsed body as JSON", async () => {
    const requestSchema = z.object({ n: z.coerce.number() });
    fetchMock.mockResolvedValue(res(200, envelope(null)));
    await apiClient("/x", opts({ method: "POST", body: { n: "3" }, requestSchema }));
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe('{"n":3}');
    expect(init.headers["Content-Type"]).toBe("application/json");
  });
});

describe("apiClient: no token", () => {
  beforeEach(() => getToken.mockReset());

  it("refreshed: sends with the new token", async () => {
    getToken.mockReturnValueOnce(null).mockReturnValue("new");
    refresh.mockResolvedValue("refreshed");
    fetchMock.mockResolvedValue(res(200, envelope(1)));
    expect(await apiClient("/x", opts())).toMatchObject({ ok: true, data: 1 });
    expect(refresh).toHaveBeenCalledWith(null);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer new");
  });

  it("invalid + expired is unauthorized", async () => {
    getToken.mockReturnValue(null);
    refresh.mockResolvedValue("invalid");
    expire.mockResolvedValue("expired");
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "unauthorized", status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("unavailable is network", async () => {
    getToken.mockReturnValue(null);
    refresh.mockResolvedValue("unavailable");
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "network", status: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });
});

describe("apiClient: 401 / 403 / 5xx", () => {
  it("TOKEN_INVALID refreshes then replays exactly once", async () => {
    refresh.mockResolvedValue("refreshed");
    fetchMock
      .mockResolvedValueOnce(res(401, { code: "TOKEN_INVALID" }))
      .mockResolvedValueOnce(res(200, envelope("again")));
    expect(await apiClient("/x", opts())).toMatchObject({ ok: true, data: "again" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("tok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a second TOKEN_* 401 on the replay is http with the unverified message", async () => {
    refresh.mockResolvedValue("refreshed");
    fetchMock.mockResolvedValue(res(401, { code: "TOKEN_MISSING" }));
    expect(await apiClient("/x", opts())).toEqual({
      ok: false,
      status: 401,
      kind: "http",
      message: "Your session could not be verified. Please sign in again.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("401 without a TOKEN_* code is forbidden, no refresh", async () => {
    fetchMock.mockResolvedValue(res(401, { message: "Not yours" }));
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "forbidden", status: 401, message: "Not yours" });
    expect(refresh).toHaveBeenCalledTimes(0);
  });

  it("403 is forbidden", async () => {
    fetchMock.mockResolvedValue(res(403, { message: "No" }));
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "forbidden", status: 403 });
  });

  it("500 is http with the server message, a joined array, or the fallback", async () => {
    fetchMock.mockResolvedValueOnce(res(500, { message: "boom" }));
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "http", status: 500, message: "boom" });
    fetchMock.mockResolvedValueOnce(res(400, { message: ["a", "b"] }));
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "http", status: 400, message: "a; b" });
    fetchMock.mockResolvedValueOnce(res(500, "<html>"));
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "http", status: 500, message: FALLBACK });
  });
});

describe("apiClient: abort, timeout, network", () => {
  it("a timeout aborts fetch and gives timeout", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_r, rej) => init.signal!.addEventListener("abort", () => rej(new Error("abort"))))
    );
    const p = apiClient("/x", opts({ timeoutMs: 1000 }));
    await vi.advanceTimersByTimeAsync(1001);
    expect(await p).toMatchObject({ ok: false, kind: "timeout", status: 0 });
  });

  it("caller abort before the call gives aborted without fetch", async () => {
    const c = new AbortController();
    c.abort();
    expect(await apiClient("/x", opts({ signal: c.signal }))).toMatchObject({ ok: false, kind: "aborted" });
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("caller abort during the call gives aborted", async () => {
    const c = new AbortController();
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_r, rej) => init.signal!.addEventListener("abort", () => rej(new Error("abort"))))
    );
    const p = apiClient("/x", opts({ signal: c.signal }));
    await Promise.resolve();
    await Promise.resolve();
    c.abort();
    expect(await p).toMatchObject({ ok: false, kind: "aborted" });
  });

  it("a fetch rejection is network", async () => {
    fetchMock.mockRejectedValue(new TypeError("failed"));
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "network", status: 0 });
  });
});

describe("apiClient: environment guards", () => {
  it("no window is network browser-only", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
    expect(typeof window).toBe("undefined");
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "network", message: "API client is browser-only" });
  });

  it("no NEXT_PUBLIC_API_URL is network", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "network", message: "API URL is not configured" });
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });
});

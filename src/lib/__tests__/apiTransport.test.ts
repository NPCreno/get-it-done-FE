import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/utils/utils", () => ({ getAccessToken: vi.fn() }));
vi.mock("../clientSession", () => ({ refreshSession: vi.fn(), expireSession: vi.fn() }));

import { getAccessToken } from "@/app/utils/utils";
import { expireSession, refreshSession } from "../clientSession";
import { apiClient, type ApiRequestOptions } from "../apiClient";
import { getActiveApiTransport, installApiTransport, type ApiTransport, type ApiTransportRequest } from "../apiTransport";

const fetchMock = vi.fn();
const spies = () => [vi.mocked(getAccessToken), vi.mocked(refreshSession), vi.mocked(expireSession), fetchMock];
const opts = <T = unknown>(o: Partial<ApiRequestOptions<T>> = {}): ApiRequestOptions<T> => ({ fallbackError: "fb", ...o });
const ok = (data: unknown) => ({ status: 200, text: JSON.stringify({ status: "success", message: "ok", data }) });

let release: (() => void) | null = null;
const install = (t: ApiTransport) => (release = installApiTransport(t));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  release?.();
  release = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  spies().forEach((s) => s.mockReset());
});

function expectUntouched() {
  for (const s of spies()) expect(s).toHaveBeenCalledTimes(0);
}

describe("D1: apiClient transport branch", () => {
  it("serves requests with no window, no base URL, no token, no fetch", async () => {
    const t = vi.fn(async (_r: ApiTransportRequest) => ok({ n: "7" }));
    install(t);
    const schema = z.object({ n: z.coerce.number() });
    const r = await apiClient("/a/b", opts({ query: { q: 1 }, schema }));
    expect(r).toMatchObject({ ok: true, data: { n: 7 } });
    const req = t.mock.calls[0][0];
    expect(req).toMatchObject({ method: "GET", path: "/a/b", query: { q: 1 }, timeoutMs: 15000 });
    expect(req.signal).toBeInstanceOf(AbortSignal);
    expectUntouched();
  });

  it("passes the validated body and rejects an invalid one before the transport", async () => {
    const t = vi.fn(async (_r: ApiTransportRequest) => ok(null));
    install(t);
    const requestSchema = z.object({ n: z.coerce.number() });
    await apiClient("/x", opts({ method: "POST", body: { n: "3" }, requestSchema }));
    expect(t.mock.calls[0][0].body).toEqual({ n: 3 });
    const bad = await apiClient("/x", opts({ method: "POST", body: { n: "z" }, requestSchema }));
    expect(bad).toMatchObject({ ok: false, kind: "invalid_request" });
    expect(t).toHaveBeenCalledTimes(1);
    expectUntouched();
  });

  it("a bad body is invalid_response through the schema", async () => {
    install(async () => ok({ n: "nope" }));
    const r = await apiClient("/x", opts({ schema: z.object({ n: z.number() }) }));
    expect(r).toMatchObject({ ok: false, kind: "invalid_response" });
    expectUntouched();
  });

  it("an unhandled path is a failure, never fetch", async () => {
    install(async () => ({ status: 501, text: '{"message":"Not available in the demo"}' }));
    expect(await apiClient("/nope", opts())).toMatchObject({ ok: false, kind: "http", status: 501, message: "Not available in the demo" });
    expectUntouched();
  });

  it("an already-aborted signal is aborted and the transport is not called", async () => {
    const t = vi.fn(async () => ok(1));
    install(t);
    const c = new AbortController();
    c.abort();
    expect(await apiClient("/x", opts({ signal: c.signal }))).toMatchObject({ ok: false, kind: "aborted" });
    expect(t).not.toHaveBeenCalled();
  });

  it("a mid-flight abort is aborted even if the transport ignores its signal", async () => {
    let resolveLate!: (v: { status: number; text: string }) => void;
    install(() => new Promise((r) => (resolveLate = r)));
    const c = new AbortController();
    const p = apiClient("/x", opts({ signal: c.signal }));
    c.abort();
    expect(await p).toMatchObject({ ok: false, kind: "aborted" });
    resolveLate(ok(1)); // discarded
    expectUntouched();
  });

  it("a slow transport is timeout and its signal is aborted", async () => {
    vi.useFakeTimers();
    let sig!: AbortSignal;
    install((req) => {
      sig = req.signal;
      return new Promise(() => undefined);
    });
    const p = apiClient("/x", opts({ timeoutMs: 500 }));
    await vi.advanceTimersByTimeAsync(501);
    expect(await p).toMatchObject({ ok: false, kind: "timeout" });
    expect(sig.aborted).toBe(true);
  });

  it("a throwing or rejecting transport is network; with timedOut or caller abort it maps accordingly", async () => {
    install(() => {
      throw new Error("sync");
    });
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "network" });
    release!();
    install(async () => {
      throw new Error("async");
    });
    expect(await apiClient("/x", opts())).toMatchObject({ kind: "network" });
    release!();
    const c = new AbortController();
    install(async () => {
      c.abort();
      throw new Error("x");
    });
    expect(await apiClient("/x", opts({ signal: c.signal }))).toMatchObject({ kind: "aborted" });
    release!();
    vi.useFakeTimers();
    install((req) => new Promise((_r, rej) => req.signal.addEventListener("abort", () => rej(new Error("t")))));
    const p = apiClient("/x", opts({ timeoutMs: 10 }));
    await vi.advanceTimersByTimeAsync(11);
    expect(await p).toMatchObject({ kind: "timeout" });
    expectUntouched();
  });

  it("a transport 401 is forbidden and never refreshes or replays", async () => {
    const t = vi.fn(async () => ({ status: 401, text: '{"code":"TOKEN_INVALID","message":"x"}' }));
    install(t);
    expect(await apiClient("/x", opts())).toMatchObject({ ok: false, kind: "forbidden", status: 401 });
    expect(t).toHaveBeenCalledTimes(1);
    expectUntouched();
  });

  it("with the transport released, the real path is used again", async () => {
    install(async () => ok(1));
    release!();
    vi.stubGlobal("window", {});
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test");
    vi.mocked(getAccessToken).mockReturnValue("tok");
    fetchMock.mockResolvedValue({ status: 200, text: async () => JSON.stringify({ status: "success", data: 2 }) });
    expect(await apiClient("/x", opts())).toMatchObject({ ok: true, data: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });
});

describe("T1: install / release ownership", () => {
  const a: ApiTransport = async () => ok("a");
  const b: ApiTransport = async () => ok("b");

  it("install → release → install (Strict Mode) works; the first release is then a no-op", () => {
    const r1 = installApiTransport(a);
    r1();
    expect(getActiveApiTransport()).toBeNull();
    const r2 = installApiTransport(a);
    expect(getActiveApiTransport()).toBe(a);
    r1(); // stale
    r1();
    expect(getActiveApiTransport()).toBe(a);
    r2();
    r2(); // double
    expect(getActiveApiTransport()).toBeNull();
  });

  it("a different owner installing while one is active throws and changes nothing", () => {
    const r = installApiTransport(a);
    expect(() => installApiTransport(b)).toThrow("API transport already installed");
    expect(getActiveApiTransport()).toBe(a);
    r();
  });
});

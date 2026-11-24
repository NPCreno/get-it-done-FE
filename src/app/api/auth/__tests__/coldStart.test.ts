import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../session", async (orig) => {
  const real = await orig<typeof import("../session")>();
  return { ...real, refreshWithBackend: vi.fn(async () => ({ kind: "unavailable" as const })) };
});

import { BACKEND_COLD_START_MS, MIDDLEWARE_REFRESH_TIMEOUT_MS, refreshWithBackend } from "../session";
import * as login from "../login/route";
import * as signup from "../signup/route";
import * as refresh from "../refresh/route";
import * as decision from "../../oauth/decision/route";

const fetchMock = vi.fn();
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api");
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe("UX-03 auth BFF routes wait out a cold start", () => {
  it("the shared constant is 55 s; the middleware default stays 10 s", () => {
    expect(BACKEND_COLD_START_MS).toBe(55_000);
    expect(MIDDLEWARE_REFRESH_TIMEOUT_MS).toBe(10_000);
  });

  it("login, signup, refresh and the OAuth decision export maxDuration = 60", () => {
    expect(login.maxDuration).toBe(60);
    expect(signup.maxDuration).toBe(60);
    expect(refresh.maxDuration).toBe(60);
    expect(decision.maxDuration).toBe(60);
  });

  it("maxDuration leaves room for the backend wait", () => {
    expect(login.maxDuration * 1000).toBeGreaterThan(BACKEND_COLD_START_MS);
  });

  it("login waits BACKEND_COLD_START_MS for the backend", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 }));
    const res = await login.POST(post("/api/auth/login", { usernameOrEmail: "a@b.test", password: "pw" }));
    expect(res.status).toBe(401);
    expect(timeout).toHaveBeenCalledWith(BACKEND_COLD_START_MS);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("signup waits BACKEND_COLD_START_MS for the backend", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", message: "Taken" }), { status: 409 })
    );
    await signup.POST(
      post("/api/auth/signup", { username: "abc", fullname: "A B", email: "a@b.test", password: "Passw0rd!x" })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(BACKEND_COLD_START_MS);
  });

  it("the refresh route passes BACKEND_COLD_START_MS to refreshWithBackend", async () => {
    const req = post("/api/auth/refresh", {}, { cookie: "refresh_token=r1", "sec-fetch-site": "same-origin" });
    const res = await refresh.POST(req);
    expect(res.status).toBe(503);
    expect(vi.mocked(refreshWithBackend)).toHaveBeenCalledWith("r1", expect.any(String), BACKEND_COLD_START_MS);
  });
});

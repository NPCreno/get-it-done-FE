import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../login/route";
import { appearanceFromLogin } from "@/lib/appearance";

/** RD-3 (plan 53b §5, BE 53a): the login route sets gid_appearance from data.appearance. */
const fetchMock = vi.fn();
const TOKENS = { access_token: "a.b.c", refresh_token: "r.s.t", access_expires_in: 900, refresh_expires_in: 86400 };
const loginReq = () =>
  new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ usernameOrEmail: "pat@example.test", password: "secret", rememberMe: false }),
    headers: { "content-type": "application/json" },
  });
const backendSays = (data: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "ok", data }), { status, headers: { "content-type": "application/json" } }));
const setCookies = (res: Response) => res.headers.getSetCookie();
const appearanceCookie = (res: Response) => setCookies(res).find((c) => c.startsWith("gid_appearance="));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe("appearanceFromLogin", () => {
  it("takes known values, and null as 'never chosen' (the defaults)", () => {
    expect(appearanceFromLogin({ appearance: { theme: "dark", appTheme: "field" } })).toEqual({ theme: "field", mode: "dark" });
    expect(appearanceFromLogin({ appearance: { theme: "system", appTheme: "calm" } })).toEqual({ theme: "calm", mode: "system" });
    expect(appearanceFromLogin({ appearance: { theme: null, appTheme: null } })).toEqual({ theme: "classic", mode: "light" });
  });

  it("ignores a missing field (an older backend), unknown values and wrong types", () => {
    expect(appearanceFromLogin({ access_token: "x" })).toBeNull();
    expect(appearanceFromLogin(null)).toBeNull();
    expect(appearanceFromLogin({ appearance: "field.dark" })).toBeNull();
    expect(appearanceFromLogin({ appearance: { theme: "dark", appTheme: "neon" } })).toBeNull();
    expect(appearanceFromLogin({ appearance: { theme: "dim", appTheme: "calm" } })).toBeNull();
    expect(appearanceFromLogin({ appearance: { theme: 1, appTheme: "calm" } })).toBeNull();
    expect(appearanceFromLogin({ appearance: { appTheme: "calm" } })).toBeNull();
  });
});

describe("POST /api/auth/login sets the appearance cookie", () => {
  it("sets gid_appearance from a valid appearance, in AppearanceSync's format", async () => {
    backendSays({ ...TOKENS, appearance: { theme: "dark", appTheme: "field" } });
    const res = await POST(loginReq());
    expect(res.status).toBe(200);
    const c = appearanceCookie(res)!;
    expect(c).toMatch(/^gid_appearance=field\.dark;/);
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/Max-Age=31536000/);
    expect(c).toMatch(/SameSite=lax/i);
    expect(c).not.toMatch(/HttpOnly/i);
  });

  it.each([
    ["missing", TOKENS],
    ["unknown theme", { ...TOKENS, appearance: { theme: "dark", appTheme: "neon" } }],
    ["unknown mode", { ...TOKENS, appearance: { theme: "sepia", appTheme: "calm" } }],
    ["not an object", { ...TOKENS, appearance: "calm" }],
  ])("ignores a %s appearance: no cookie, login still succeeds", async (_label, data) => {
    backendSays(data);
    const res = await POST(loginReq());
    expect(res.status).toBe(200);
    expect(appearanceCookie(res)).toBeUndefined();
  });

  it("leaves the token cookies exactly as before", async () => {
    backendSays(TOKENS);
    const without = setCookies(await POST(loginReq())).filter((c) => !c.startsWith("gid_appearance="));
    backendSays({ ...TOKENS, appearance: { theme: "light", appTheme: "calm" } });
    const withA = setCookies(await POST(loginReq())).filter((c) => !c.startsWith("gid_appearance="));
    expect(withA).toEqual(without);
    expect(withA.find((c) => c.startsWith("refresh_token="))).toMatch(/HttpOnly/i);
    expect(withA.find((c) => c.startsWith("access_token="))).toMatch(/SameSite=strict/i);
  });

  it("a failed login sets no cookie at all", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 }));
    const res = await POST(loginReq());
    expect(res.status).toBe(401);
    expect(setCookies(res)).toEqual([]);
  });
});

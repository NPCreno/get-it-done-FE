import { describe, expect, it } from "vitest";
import type { ApiFailure } from "@/lib/apiClient";
import {
  consentPathOf,
  isFatalConsentFailure,
  isLoopbackHost,
  isSafeRedirectTarget,
  readAuthorizeParams,
} from "../oauthConsent";

describe("isSafeRedirectTarget: where the consent page may send the browser", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback?code=abc&state=xyz",
    "https://claude.com/api/mcp/auth_callback?error=access_denied",
    "http://localhost:1234/callback",
    "http://127.0.0.1:6274/oauth/callback",
    "http://[::1]:8080/callback",
  ])("allows %s", (url) => {
    expect(isSafeRedirectTarget(url)).toBe(true);
  });

  it.each([
    ["plain http on a public host", "http://example.com/callback"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,hi"],
    ["a custom scheme", "myapp://callback"],
    ["a relative URL", "/dashboard"],
    ["protocol-relative", "//evil.com"],
    ["userinfo", "https://user:pass@claude.ai/cb"],
    ["a lookalike loopback host", "http://localhost.evil.com/cb"],
    ["empty", ""],
  ])("refuses %s", (_name, url) => {
    expect(isSafeRedirectTarget(url)).toBe(false);
  });

  it("refuses non-strings", () => {
    expect(isSafeRedirectTarget(undefined)).toBe(false);
    expect(isSafeRedirectTarget(null)).toBe(false);
    expect(isSafeRedirectTarget({ href: "https://claude.ai" })).toBe(false);
  });

  it("loopback hosts are exactly the three RFC 8252 spellings", () => {
    expect(["localhost", "127.0.0.1", "[::1]", "LOCALHOST"].map(isLoopbackHost)).toEqual([true, true, true, true]);
    expect(["127.0.0.2", "0.0.0.0", "localhost.example"].map(isLoopbackHost)).toEqual([false, false, false]);
  });
});

describe("readAuthorizeParams", () => {
  const q =
    "response_type=code&client_id=gid_cli_1&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&code_challenge=abc&code_challenge_method=S256&scope=mcp+offline_access&state=s1&resource=https%3A%2F%2Fapi.example%2Fmcp";

  it("keeps the known parameters raw and drops anything else", () => {
    const r = readAuthorizeParams(`?${q}&prompt=consent&utm=x`);
    expect(r).toEqual({
      ok: true,
      params: {
        response_type: "code",
        client_id: "gid_cli_1",
        redirect_uri: "https://claude.ai/cb",
        code_challenge: "abc",
        code_challenge_method: "S256",
        scope: "mcp offline_access",
        state: "s1",
        resource: "https://api.example/mcp",
      },
    });
  });

  it("omits optional parameters that were not sent", () => {
    const r = readAuthorizeParams("client_id=c&redirect_uri=https%3A%2F%2Fa.b%2Fcb");
    expect(r).toEqual({ ok: true, params: { client_id: "c", redirect_uri: "https://a.b/cb" } });
  });

  it("is invalid without client_id or redirect_uri, or with a repeated parameter", () => {
    expect(readAuthorizeParams("redirect_uri=https%3A%2F%2Fa.b").ok).toBe(false);
    expect(readAuthorizeParams("client_id=c").ok).toBe(false);
    expect(readAuthorizeParams(`${q}&state=s2`).ok).toBe(false);
    expect(readAuthorizeParams("").ok).toBe(false);
  });
});

describe("isFatalConsentFailure: invalid request vs try again", () => {
  const f = (kind: ApiFailure["kind"], status: number): ApiFailure => ({ ok: false, kind, status, message: "x" });

  it("a 4xx refusal is fatal", () => {
    expect(isFatalConsentFailure(f("http", 400))).toBe(true);
    expect(isFatalConsentFailure(f("http", 404))).toBe(true);
    expect(isFatalConsentFailure(f("forbidden", 403))).toBe(true);
    expect(isFatalConsentFailure(f("api", 200))).toBe(true);
  });

  it("offline, timeouts, server errors and rate limits can be retried", () => {
    for (const failure of [f("network", 0), f("timeout", 0), f("http", 502), f("http", 503), f("http", 429), f("http", 408), f("invalid_response", 200), f("aborted", 0)]) {
      expect(isFatalConsentFailure(failure)).toBe(false);
    }
  });
});

describe("consentPathOf", () => {
  it("rebuilds the consent page's own address", () => {
    expect(consentPathOf("?client_id=c")).toBe("/oauth/authorize?client_id=c");
    expect(consentPathOf("client_id=c")).toBe("/oauth/authorize?client_id=c");
    expect(consentPathOf("")).toBe("/oauth/authorize");
  });
});

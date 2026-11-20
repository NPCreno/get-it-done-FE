import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, loginPathFor, safeNext, withNext } from "../safeNext";

const AUTHORIZE =
  "/oauth/authorize?response_type=code&client_id=gid_cli_abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&state=xyz";

describe("safeNext: only the consent page may be a next target", () => {
  it("accepts the authorize path with a query, and the bare path", () => {
    expect(safeNext(AUTHORIZE)).toBe(AUTHORIZE);
    expect(safeNext("/oauth/authorize")).toBe("/oauth/authorize");
  });

  it.each([
    ["protocol-relative", "//evil.com"],
    ["backslash host", "/\\evil.com"],
    ["absolute https", "https://evil.com/oauth/authorize?x=1"],
    ["encoded slashes", "/%2F%2Fevil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["the dashboard is not a next target here", "/dashboard"],
    ["a lookalike path", "/oauth/authorizeX"],
    ["a sub-path", "/oauth/authorize/../../dashboard"],
    ["a sibling path", "/oauth/authorize-evil"],
    ["a backslash in the query", "/oauth/authorize?x=\\evil"],
    ["a tab", "/oauth/authorize?\tx"],
    ["a newline", "/oauth/authorize\n//evil.com"],
    ["empty", ""],
    ["encoded authorize path", "/%6Fauth/authorize?x=1"],
  ])("rejects %s", (_name, raw) => {
    expect(safeNext(raw)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("missing or absurdly long values fall back", () => {
    expect(safeNext(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext(`/oauth/authorize?state=${"a".repeat(5000)}`)).toBe(DEFAULT_AFTER_LOGIN);
  });
});

describe("loginPathFor: the middleware adds next only for the consent page", () => {
  it("keeps the consent page's path and query", () => {
    const search = AUTHORIZE.slice("/oauth/authorize".length);
    const path = loginPathFor("/oauth/authorize", search);
    expect(path.startsWith("/login?next=")).toBe(true);
    expect(new URLSearchParams(path.slice("/login?".length)).get("next")).toBe(AUTHORIZE);
  });

  it("every other route keeps today's plain /login", () => {
    expect(loginPathFor("/dashboard", "?tab=1")).toBe("/login");
    expect(loginPathFor("/profileSettings", "")).toBe("/login");
    expect(loginPathFor("/api/oauth/decision", "")).toBe("/login");
    expect(loginPathFor("/oauth/authorize/x", "")).toBe("/login");
  });
});

describe("withNext: login and signup links keep a validated next", () => {
  it("encodes a valid next and drops an invalid one", () => {
    expect(withNext("/signup", AUTHORIZE)).toBe(`/signup?next=${encodeURIComponent(AUTHORIZE)}`);
    expect(withNext("/login", "//evil.com")).toBe("/login");
    expect(withNext("/login", null)).toBe("/login");
  });
});

import { describe, expect, it } from "vitest";
import { bearerToken, buildDecisionBody, toDecisionResponse } from "../payload";

const params = {
  response_type: "code",
  client_id: "gid_cli_1",
  redirect_uri: "https://claude.ai/api/mcp/auth_callback",
  code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  code_challenge_method: "S256",
  state: "s1",
};

describe("buildDecisionBody: only the authorize parameters and the decision reach the backend", () => {
  it("flattens params and decision", () => {
    expect(buildDecisionBody({ params, decision: "allow" })).toEqual({ ...params, decision: "allow" });
    expect(buildDecisionBody({ params, decision: "deny" })).toEqual({ ...params, decision: "deny" });
  });

  it("drops unknown keys (no user_id or anything else can be smuggled through)", () => {
    const body = buildDecisionBody({ params: { ...params, user_id: "someone" }, decision: "allow", user_id: "x" });
    expect(body).toEqual({ ...params, decision: "allow" });
  });

  it("refuses a missing or unknown decision, missing client_id or redirect_uri, or non-string values", () => {
    expect(buildDecisionBody({ params })).toBeNull();
    expect(buildDecisionBody({ params, decision: "maybe" })).toBeNull();
    expect(buildDecisionBody({ params: { ...params, client_id: "" }, decision: "allow" })).toBeNull();
    expect(buildDecisionBody({ params: { redirect_uri: params.redirect_uri }, decision: "allow" })).toBeNull();
    expect(buildDecisionBody({ params: { ...params, state: 1 }, decision: "allow" })).toBeNull();
    expect(buildDecisionBody(null)).toBeNull();
  });
});

describe("bearerToken", () => {
  it("reads a Bearer header and nothing else", () => {
    expect(bearerToken("Bearer abc.def-ghi_jkl")).toBe("abc.def-ghi_jkl");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer ")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("toDecisionResponse", () => {
  const to = "https://claude.ai/api/mcp/auth_callback?code=c&state=s1";

  it("success forwards only redirect_to, from the envelope or a bare object", () => {
    expect(toDecisionResponse(200, { status: "success", data: { redirect_to: to, extra: "x" } })).toEqual({
      status: 200,
      body: { status: "success", data: { redirect_to: to } },
    });
    expect(toDecisionResponse(201, { redirect_to: to })).toEqual({
      status: 200,
      body: { status: "success", data: { redirect_to: to } },
    });
  });

  it("a malformed success is a 502", () => {
    expect(toDecisionResponse(200, { status: "success", data: {} }).status).toBe(502);
    expect(toDecisionResponse(200, null).status).toBe(502);
  });

  it("a TOKEN_* 401 keeps its code so the browser refreshes and retries", () => {
    expect(toDecisionResponse(401, { statusCode: 401, code: "TOKEN_INVALID", message: "x" })).toEqual({
      status: 401,
      body: { status: "error", code: "TOKEN_INVALID", message: "Session expired" },
    });
  });

  it("other failures carry fixed copy, never backend text", () => {
    const bad = toDecisionResponse(400, { message: "redirect_uri https://evil is not registered" });
    expect(bad).toEqual({ status: 400, body: { status: "error", message: "This connection request isn't valid" } });
    expect(toDecisionResponse(429, {}).status).toBe(429);
    expect(toDecisionResponse(500, {}).status).toBe(502);
    expect(JSON.stringify(toDecisionResponse(401, { message: "secret detail" }))).not.toContain("secret detail");
  });
});

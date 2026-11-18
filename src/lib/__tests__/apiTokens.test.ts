import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/tokensRequests", () => ({
  getApiTokens: vi.fn(),
  createApiToken: vi.fn(),
  revokeApiToken: vi.fn(),
}));

import * as tokensApi from "@/app/api/tokensRequests";
import { createErrorCopy, EXPIRY_OPTIONS, LIMIT_REACHED_COPY, tokenDate } from "@/app/components/apiTokens/tokenCopy";
import { API_TOKEN_RULES } from "@/app/contracts/common";
import { API_TOKEN_EXPIRY_DAYS, API_TOKEN_STATUSES } from "@/app/contracts/enums";
import { CreateApiTokenRequestSchema } from "@/app/contracts/requests";
import {
  ApiTokenListSchema,
  ApiTokenSchema,
  CreatedApiTokenSchema,
  type ApiToken,
  type ApiTokenList,
} from "@/app/contracts/responses";
import type { ApiFailure } from "@/lib/apiClient";
import { claudeCodeCommand, cursorConfig, mcpServerUrl } from "../mcpSetup";
import {
  activeCount,
  createApiTokenOptions,
  markRevoked,
  restoreRevoked,
  revokeApiTokenOptions,
} from "../query/apiTokens";
import { invalidationsFor } from "../query/invalidation";
import { qk, resourceOf } from "../query/keys";
import { apiTokensSpec } from "../query/specs";
import { deferred, failResult, flush, okResult, testClient } from "../query/__tests__/helpers";

const U = "u1";
const SECRET = "gid_pat_AbC123xYz9_q1w2-e3r4_t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9z0x";

const token = (id: string, over: Partial<ApiToken> = {}): ApiToken => ({
  id,
  name: `token ${id}`,
  prefix: `pre${id}`,
  created_at: "2026-11-18T10:00:00.000Z",
  last_used_at: null,
  expires_at: "2027-02-16T10:00:00.000Z",
  revoked_at: null,
  status: "active",
  ...over,
});

/** Everything TanStack holds: every query's data and every mutation's state. */
function cacheText(qc: ReturnType<typeof testClient>): string {
  const queries = qc.getQueryCache().getAll().map((q) => q.state);
  const mutations = qc.getMutationCache().getAll().map((m) => m.state);
  return JSON.stringify({ queries, mutations });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("token schemas", () => {
  it("a list parses, nullable columns included", () => {
    const list = [token("a"), token("b", { last_used_at: "2026-11-18T11:00:00.000Z", expires_at: null })];
    expect(ApiTokenListSchema.parse(list)).toEqual(list);
  });

  it("status is one of the three values", () => {
    for (const status of API_TOKEN_STATUSES) expect(ApiTokenSchema.safeParse(token("a", { status })).success).toBe(true);
    expect(ApiTokenSchema.safeParse({ ...token("a"), status: "deleted" }).success).toBe(false);
  });

  it("a list item never keeps a secret, even if the backend sent one", () => {
    const parsed = ApiTokenListSchema.parse([{ ...token("a"), token: SECRET, secret_hash: "x".repeat(64) }]);
    expect(JSON.stringify(parsed)).not.toContain("gid_pat_");
    expect(Object.keys(parsed[0])).not.toContain("secret_hash");
  });

  it("the create response requires a gid_pat_ token", () => {
    expect(CreatedApiTokenSchema.safeParse({ ...token("a"), token: SECRET }).success).toBe(true);
    expect(CreatedApiTokenSchema.safeParse(token("a")).success).toBe(false);
    for (const bad of ["abc", "gid_pat_", "pat_AbC_def", `${SECRET} `, 'gid_pat_a_b"c', "gid_pat_a_$(x)"]) {
      expect(CreatedApiTokenSchema.safeParse({ ...token("a"), token: bad }).success, bad).toBe(false);
    }
  });

  it("the create request: trimmed name of 1-60 characters, expiry 30/90/365 or null", () => {
    expect(CreateApiTokenRequestSchema.parse({ name: "  laptop ", expires_in_days: 90 })).toEqual({
      name: "laptop",
      expires_in_days: 90,
    });
    expect(CreateApiTokenRequestSchema.safeParse({ name: "x", expires_in_days: null }).success).toBe(true);
    expect(CreateApiTokenRequestSchema.safeParse({ name: "   ", expires_in_days: 90 }).success).toBe(false);
    expect(CreateApiTokenRequestSchema.safeParse({ name: "x".repeat(61), expires_in_days: 90 }).success).toBe(false);
    expect(CreateApiTokenRequestSchema.safeParse({ name: "x".repeat(60), expires_in_days: 365 }).success).toBe(true);
    expect(CreateApiTokenRequestSchema.safeParse({ name: "x", expires_in_days: 7 }).success).toBe(false);
    expect(CreateApiTokenRequestSchema.safeParse({ name: "x" }).success).toBe(false);
  });

  it("the dialog offers exactly the contract's choices, 90 days by default", () => {
    expect(EXPIRY_OPTIONS.map((o) => o.value)).toEqual([...API_TOKEN_EXPIRY_DAYS, null]);
    expect(API_TOKEN_RULES.defaultExpiryDays).toBe(90);
  });
});

describe("setup snippets", () => {
  it("the server URL comes from NEXT_PUBLIC_API_URL, beside /api, with no double slash", () => {
    expect(mcpServerUrl("https://get-it-done-be.onrender.com/api")).toBe("https://get-it-done-be.onrender.com/mcp");
    expect(mcpServerUrl("https://get-it-done-be.onrender.com/api/")).toBe("https://get-it-done-be.onrender.com/mcp");
    expect(mcpServerUrl("http://localhost:8000/api")).toBe("http://localhost:8000/mcp");
    expect(mcpServerUrl("https://example.com")).toBe("https://example.com/mcp");
    expect(mcpServerUrl("https://example.com//")).toBe("https://example.com/mcp");
    expect(mcpServerUrl("https://example.com/backend/api")).toBe("https://example.com/backend/mcp");
    expect(mcpServerUrl("https://example.com/apis")).toBe("https://example.com/apis/mcp");
    for (const u of ["https://a.com/api", "https://a.com/api/", "https://a.com//"]) {
      expect(mcpServerUrl(u).replace("https://", "")).not.toContain("//");
    }
  });

  it("no URL for a missing or non-http base", () => {
    expect(mcpServerUrl(undefined)).toBe("");
    expect(mcpServerUrl("")).toBe("");
    expect(mcpServerUrl("not a url")).toBe("");
    expect(mcpServerUrl("javascript:alert(1)")).toBe("");
  });

  it("Claude Code: the documented command with the token quoted in the header", () => {
    const url = "https://get-it-done-be.onrender.com/mcp";
    expect(claudeCodeCommand(url, SECRET)).toBe(
      `claude mcp add --transport http get-it-done ${url} --header "Authorization: Bearer ${SECRET}"`
    );
  });

  it("Cursor: valid JSON with url and an Authorization header", () => {
    const url = "https://get-it-done-be.onrender.com/mcp";
    const parsed = JSON.parse(cursorConfig(url, SECRET));
    expect(parsed).toEqual({
      mcpServers: { "get-it-done": { url, headers: { Authorization: `Bearer ${SECRET}` } } },
    });
  });

  it("refuses anything that is not a safe gid_pat_ token, so nothing escapes the quotes", () => {
    for (const bad of ['gid_pat_a_b" && rm -rf ~ "', "gid_pat_a_`id`", "gid_pat_a_$HOME", "x"]) {
      expect(() => claudeCodeCommand("https://a.com/mcp", bad)).toThrow();
      expect(() => cursorConfig("https://a.com/mcp", bad)).toThrow();
    }
  });
});

describe("query layer", () => {
  it("one key per user, logged as apiTokens, invalidated by token mutations only", () => {
    expect(qk.apiTokens(U)).toEqual(["u", U, "api-tokens"]);
    expect(resourceOf(qk.apiTokens(U))).toBe("apiTokens");
    expect(invalidationsFor("api-tokens", U)).toEqual([qk.apiTokens(U)]);
    for (const e of ["task", "project-saved", "project-deleted", "profile", "notifications"] as const) {
      expect(invalidationsFor(e, U)).not.toContainEqual(qk.apiTokens(U));
    }
  });

  it("the spec calls getApiTokens with TanStack's signal", async () => {
    vi.mocked(tokensApi.getApiTokens).mockResolvedValueOnce(okResult([]) as never);
    const signal = new AbortController().signal;
    await apiTokensSpec(U).queryFn({ signal });
    expect(tokensApi.getApiTokens).toHaveBeenCalledWith({ signal });
  });

  it("activeCount counts only active tokens", () => {
    expect(activeCount(undefined)).toBe(0);
    expect(activeCount([token("a"), token("b", { status: "revoked" }), token("c", { status: "expired" })])).toBe(1);
  });
});

describe("create: the secret never enters the cache, storage or logs", () => {
  it("after a create, no query or mutation cache entry contains the secret", async () => {
    const qc = testClient();
    const storage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    const logs = (["log", "info", "warn", "error", "debug"] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => undefined));

    // An active list, so the create's invalidation really refetches it.
    const listed = [token("old")];
    const created = { ...token("new"), token: SECRET };
    const api = vi.mocked(tokensApi);
    api.getApiTokens.mockResolvedValue(okResult(listed) as never);
    const list = new QueryObserver(qc, apiTokensSpec(U));
    const unsubscribe = list.subscribe(() => undefined);
    await flush();
    expect(api.getApiTokens).toHaveBeenCalledTimes(1);

    api.createApiToken.mockResolvedValueOnce(okResult(created) as never);
    api.getApiTokens.mockResolvedValue(okResult([...listed, token("new")]) as never);
    const m = new MutationObserver(qc, createApiTokenOptions(qc, U));
    const result = await m.mutate({ name: "laptop", expires_in_days: 90 });

    // The caller gets the secret...
    expect(result.token).toBe(SECRET);
    // ...the list was refetched (not patched with the response)...
    expect(api.getApiTokens).toHaveBeenCalledTimes(2);
    expect(qc.getQueryData<ApiTokenList>(qk.apiTokens(U))?.map((t) => t.id)).toEqual(["old", "new"]);
    expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state))).not.toContain("gid_pat_");

    // ...and once the caller resets the mutation, TanStack holds no copy at all.
    m.reset();
    await flush();
    expect(cacheText(qc)).not.toContain("gid_pat_");

    expect(storage.setItem).not.toHaveBeenCalled();
    for (const spy of logs) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("gid_pat_");
    }
    unsubscribe();
  });

  it("a failed create caches nothing and does not patch the list", async () => {
    const qc = testClient();
    qc.setQueryData(qk.apiTokens(U), [token("old")]);
    vi.mocked(tokensApi.createApiToken).mockResolvedValueOnce(failResult("http") as never);
    const m = new MutationObserver(qc, createApiTokenOptions(qc, U));
    await m.mutate({ name: "laptop", expires_in_days: null }).catch(() => undefined);
    expect(qc.getQueryData<ApiTokenList>(qk.apiTokens(U))?.map((t) => t.id)).toEqual(["old"]);
  });
});

describe("optimistic revoke", () => {
  const AT = new Date("2026-11-19T09:00:00.000Z");
  const seed = (list: ApiTokenList) => {
    const qc = testClient();
    qc.setQueryData(qk.apiTokens(U), list);
    const row = (id: string) => qc.getQueryData<ApiTokenList>(qk.apiTokens(U))!.find((t) => t.id === id)!;
    return { qc, row };
  };

  it("shows Revoked at once and keeps it on success", async () => {
    const { qc, row } = seed([token("a"), token("b")]);
    const d = deferred<ReturnType<typeof okResult>>();
    vi.mocked(tokensApi.revokeApiToken).mockReturnValueOnce(d.promise as never);
    const m = new MutationObserver(qc, revokeApiTokenOptions(qc, U, () => AT));
    const p = m.mutate("a");
    await flush();
    expect(row("a")).toMatchObject({ status: "revoked", revoked_at: AT.toISOString() });
    expect(row("b").status).toBe("active");
    d.resolve(okResult(undefined));
    await p;
    expect(tokensApi.revokeApiToken).toHaveBeenCalledWith("a");
    expect(row("a").status).toBe("revoked");
  });

  it("rolls back on error", async () => {
    const { qc, row } = seed([token("a"), token("b")]);
    vi.mocked(tokensApi.revokeApiToken).mockResolvedValueOnce(failResult("http") as never);
    const m = new MutationObserver(qc, revokeApiTokenOptions(qc, U, () => AT));
    await m.mutate("a").catch(() => undefined);
    expect(row("a")).toEqual(token("a"));
    expect(row("b")).toEqual(token("b"));
  });

  it("rollback is compare-and-swap: a newer server value wins", () => {
    const optimistic = markRevoked([token("a")], "a", AT.toISOString())!;
    expect(restoreRevoked(optimistic, token("a"), AT.toISOString())).toEqual([token("a")]);
    // A refetch landed with the server's own revoke time: keep it.
    const server = [token("a", { status: "revoked", revoked_at: "2026-11-19T09:00:01.000Z" })];
    expect(restoreRevoked(server, token("a"), AT.toISOString())).toBe(server);
    // The row is gone (deleted elsewhere): nothing to restore.
    expect(restoreRevoked([], token("a"), AT.toISOString())).toEqual([]);
  });

  it("markRevoked leaves other rows and an already revoked row alone", () => {
    const list = [token("a", { status: "revoked", revoked_at: "2026-11-01T00:00:00.000Z" }), token("b")];
    expect(markRevoked(list, "a", AT.toISOString())).toBe(list);
    expect(markRevoked(undefined, "a", AT.toISOString())).toBeUndefined();
  });
});

describe("display copy", () => {
  it("a missing date reads Never", () => {
    expect(tokenDate(null)).toBe("Never");
    expect(tokenDate("not a date")).toBe("Never");
    expect(tokenDate("2026-11-18T10:00:00.000Z", "en-US")).toBe("Nov 18, 2026");
  });

  const failure = (status: number, message: string, kind: ApiFailure["kind"] = "http"): ApiFailure => ({
    ok: false,
    status,
    kind,
    message,
  });

  it("maps the create errors the user can fix to fixed copy, never server text", () => {
    expect(createErrorCopy(failure(400, "You can have at most 10 active tokens."))).toEqual({
      field: "form",
      message: LIMIT_REACHED_COPY,
    });
    expect(createErrorCopy(failure(400, "name must be shorter than or equal to 60 characters"))?.field).toBe("name");
    expect(createErrorCopy(failure(400, "expires_in_days must be one of: 30, 90, 365"))).toEqual({
      field: "form",
      message: "Check the name and expiry, then try again.",
    });
    expect(createErrorCopy(failure(429, "ThrottlerException: Too Many Requests"))?.field).toBe("form");
    expect(createErrorCopy(failure(0, "Request failed validation", "invalid_request"))?.field).toBe("name");
    // Not the user's to fix in the form: these become a toast.
    expect(createErrorCopy(failure(500, "boom"))).toBeNull();
    expect(createErrorCopy(failure(0, "offline", "network"))).toBeNull();
    for (const s of [400, 429]) {
      const copy = createErrorCopy(failure(s, "SECRET SERVER TEXT"));
      expect(copy?.message).not.toContain("SECRET SERVER TEXT");
    }
  });
});

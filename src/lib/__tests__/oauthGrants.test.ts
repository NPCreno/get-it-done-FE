import { MutationObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/oauthRequests", () => ({
  checkOAuthAuthorize: vi.fn(),
  sendOAuthDecision: vi.fn(),
  getOAuthGrants: vi.fn(),
  revokeOAuthGrant: vi.fn(),
}));

import * as oauthApi from "@/app/api/oauthRequests";
import { disconnectTitle, NO_CONNECTED_APPS_COPY, WAKE_UP_RETRY_COPY } from "@/app/components/apiTokens/tokenCopy";
import { OAuthDecisionRequestSchema } from "@/app/contracts/requests";
import {
  OAuthCheckResultSchema,
  OAuthDecisionResultSchema,
  OAuthGrantListSchema,
  type OAuthGrant,
  type OAuthGrantList,
} from "@/app/contracts/responses";
import { oauthDecisionOptions, removeGrant, restoreGrant, revokeOAuthGrantOptions } from "../query/oauth";
import { invalidationsFor } from "../query/invalidation";
import { qk, resourceOf } from "../query/keys";
import { oauthCheckSpec, oauthGrantsSpec } from "../query/specs";
import { deferred, failResult, flush, okResult, testClient } from "../query/__tests__/helpers";

const U = "u1";

const grant = (id: string, over: Partial<OAuthGrant> = {}): OAuthGrant => ({
  id,
  client_name: `App ${id}`,
  redirect_host: "claude.ai",
  created_at: "2026-11-20T10:00:00.000Z",
  last_used_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("OAuth schemas", () => {
  it("a grant list parses; last_used_at is nullable; tokens and hashes are stripped", () => {
    const list = [grant("a"), grant("b", { last_used_at: "2026-11-21T08:00:00.000Z" })];
    expect(OAuthGrantListSchema.parse(list)).toEqual(list);
    const parsed = OAuthGrantListSchema.parse([{ ...grant("a"), access_token: "gid_oat_x_y", secret_hash: "f".repeat(64) }]);
    expect(JSON.stringify(parsed)).not.toContain("gid_oat_");
    expect(Object.keys(parsed[0])).not.toContain("secret_hash");
  });

  it("the check result is one of ok, redirect or fatal", () => {
    const ok = { outcome: "ok", client_name: "Claude", redirect_host: "claude.ai", loopback_only: false, scopes: ["mcp"] };
    expect(OAuthCheckResultSchema.parse(ok)).toEqual(ok);
    expect(OAuthCheckResultSchema.parse({ outcome: "redirect", error: "invalid_scope", redirect_to: "https://claude.ai/cb?error=invalid_scope" }).outcome).toBe("redirect");
    expect(OAuthCheckResultSchema.parse({ outcome: "fatal", error: "invalid_client" }).outcome).toBe("fatal");
    expect(OAuthCheckResultSchema.safeParse({ outcome: "ok", client_name: "Claude" }).success).toBe(false);
    expect(OAuthCheckResultSchema.safeParse({ outcome: "maybe" }).success).toBe(false);
  });

  it("the decision result needs a redirect_to; the decision request needs allow or deny", () => {
    expect(OAuthDecisionResultSchema.safeParse({ redirect_to: "https://claude.ai/cb?code=x" }).success).toBe(true);
    expect(OAuthDecisionResultSchema.safeParse({}).success).toBe(false);
    const params = { client_id: "c", redirect_uri: "https://claude.ai/cb" };
    expect(OAuthDecisionRequestSchema.safeParse({ params, decision: "allow" }).success).toBe(true);
    expect(OAuthDecisionRequestSchema.safeParse({ params, decision: "always" }).success).toBe(false);
  });
});

describe("query layer", () => {
  it("one grants key per user, logged as oauthGrants, invalidated only by OAuth events", () => {
    expect(qk.oauthGrants(U)).toEqual(["u", U, "oauth-grants"]);
    expect(resourceOf(qk.oauthGrants(U))).toBe("oauthGrants");
    expect(invalidationsFor("oauth-grants", U)).toEqual([qk.oauthGrants(U)]);
    for (const e of ["task", "project-saved", "project-deleted", "profile", "notifications", "api-tokens"] as const) {
      expect(invalidationsFor(e, U)).not.toContainEqual(qk.oauthGrants(U));
    }
  });

  it("the grants spec calls getOAuthGrants with TanStack's signal", async () => {
    vi.mocked(oauthApi.getOAuthGrants).mockResolvedValueOnce(okResult([]) as never);
    const signal = new AbortController().signal;
    await oauthGrantsSpec(U).queryFn({ signal });
    expect(oauthApi.getOAuthGrants).toHaveBeenCalledWith({ signal });
  });

  it("the check key holds exactly the parameters the request sends", async () => {
    const params = { client_id: "c", redirect_uri: "https://claude.ai/cb", state: "s" };
    const spec = oauthCheckSpec(U, params);
    expect(spec.queryKey).toEqual(["u", U, "oauth-check", params]);
    expect(resourceOf(spec.queryKey)).toBe("oauth.check");
    vi.mocked(oauthApi.checkOAuthAuthorize).mockResolvedValueOnce(okResult({ outcome: "fatal", error: "x" }) as never);
    const signal = new AbortController().signal;
    await spec.queryFn({ signal });
    expect(oauthApi.checkOAuthAuthorize).toHaveBeenCalledWith(spec.queryKey[3], { signal });
  });

  it("an allowed decision refetches Connected apps and caches no redirect URL", async () => {
    const qc = testClient();
    const redirect = "https://claude.ai/cb?code=one-time-code&state=s";
    vi.mocked(oauthApi.sendOAuthDecision).mockResolvedValueOnce(okResult({ redirect_to: redirect }) as never);
    const spy = vi.spyOn(qc, "invalidateQueries");
    const m = new MutationObserver(qc, oauthDecisionOptions(qc, U));
    const result = await m.mutate({ params: { client_id: "c", redirect_uri: "https://claude.ai/cb" }, decision: "allow" });
    expect(result.redirect_to).toBe(redirect);
    expect(spy).toHaveBeenCalledWith({ queryKey: qk.oauthGrants(U) });
    m.reset();
    await flush();
    expect(JSON.stringify(qc.getMutationCache().getAll().map((x) => x.state))).not.toContain("one-time-code");
  });
});

describe("optimistic disconnect", () => {
  const seed = (list: OAuthGrantList) => {
    const qc = testClient();
    qc.setQueryData(qk.oauthGrants(U), list);
    const ids = () => qc.getQueryData<OAuthGrantList>(qk.oauthGrants(U))!.map((g) => g.id);
    return { qc, ids };
  };

  it("removes the row at once and keeps it gone on success", async () => {
    const { qc, ids } = seed([grant("a"), grant("b"), grant("c")]);
    const d = deferred<ReturnType<typeof okResult>>();
    vi.mocked(oauthApi.revokeOAuthGrant).mockReturnValueOnce(d.promise as never);
    vi.mocked(oauthApi.getOAuthGrants).mockResolvedValue(okResult([grant("a"), grant("c")]) as never);
    const m = new MutationObserver(qc, revokeOAuthGrantOptions(qc, U));
    const p = m.mutate("b");
    await flush();
    expect(ids()).toEqual(["a", "c"]);
    d.resolve(okResult(undefined));
    await p;
    expect(oauthApi.revokeOAuthGrant).toHaveBeenCalledWith("b");
    expect(ids()).toEqual(["a", "c"]);
  });

  it("rolls back on error, at the same position", async () => {
    const { qc, ids } = seed([grant("a"), grant("b"), grant("c")]);
    vi.mocked(oauthApi.revokeOAuthGrant).mockResolvedValueOnce(failResult("http") as never);
    vi.mocked(oauthApi.getOAuthGrants).mockReturnValue(new Promise(() => undefined) as never);
    const m = new MutationObserver(qc, revokeOAuthGrantOptions(qc, U));
    await m.mutate("b").catch(() => undefined);
    expect(ids()).toEqual(["a", "b", "c"]);
    expect(qc.getQueryData<OAuthGrantList>(qk.oauthGrants(U))![1]).toEqual(grant("b"));
  });

  it("rollback is compare-and-swap: a row already back (a refetch landed) is not duplicated", () => {
    const list = [grant("a"), grant("b", { last_used_at: "2026-11-21T09:00:00.000Z" })];
    expect(restoreGrant(list, grant("b"), 1)).toBe(list);
    expect(restoreGrant([grant("a")], grant("b"), 5)?.map((g) => g.id)).toEqual(["a", "b"]);
    expect(restoreGrant(undefined, grant("b"), 0)).toBeUndefined();
  });

  it("removeGrant returns the same list when the id is not there", () => {
    const list = [grant("a")];
    expect(removeGrant(list, "zz")).toBe(list);
    expect(removeGrant(undefined, "a")).toBeUndefined();
  });
});

describe("copy", () => {
  it("disconnect and empty-state copy, and the wake-up line", () => {
    expect(disconnectTitle("Claude")).toBe("Disconnect Claude?");
    expect(NO_CONNECTED_APPS_COPY).toBe("No connected apps.");
    expect(WAKE_UP_RETRY_COPY).toContain("Wait a minute and try again.");
  });
});

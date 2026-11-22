"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { revokeOAuthGrant, sendOAuthDecision } from "@/app/api/oauthRequests";
import type { OAuthAuthorizeParams, OAuthDecisionRequest } from "@/app/contracts/requests";
import type { OAuthDecisionResult, OAuthGrant, OAuthGrantList } from "@/app/contracts/responses";
import { gatedInvalidate, invalidationsFor } from "./invalidation";
import { qk } from "./keys";
import { useSessionUserId } from "./queries";
import { oauthCheckSpec, oauthGrantsSpec } from "./specs";
import { must, type ApiError } from "./unwrap";

/**
 * FEAT-07d OAuth connector consent and "Connected apps".
 * No token, authorization code or verifier ever reaches this cache: the backend lists grants
 * without them, the decision returns only the redirect URL, and the schemas strip unknown keys.
 */
export const OAUTH_GRANTS_KEY = ["oauthGrants"] as const;

// -------------------------------------------------------------------- pure

/** Optimistic disconnect: the row goes at once. */
export function removeGrant(list: OAuthGrantList | undefined, grantId: string): OAuthGrantList | undefined {
  if (!list) return list;
  const next = list.filter((g) => g.id !== grantId);
  return next.length === list.length ? list : next;
}

/**
 * Rollback after a failed disconnect: puts the row back where it was, but only while it is still
 * absent. If a refetch already brought it back (or the list changed under us), that value wins.
 */
export function restoreGrant(
  list: OAuthGrantList | undefined,
  previous: OAuthGrant,
  index: number
): OAuthGrantList | undefined {
  if (!list || list.some((g) => g.id === previous.id)) return list;
  const next = [...list];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, previous);
  return next;
}

// ------------------------------------------------------------------- reads

export function useOAuthGrants() {
  const id = useSessionUserId();
  // last_used_at moves while an assistant works, so a revisit refetches.
  return useQuery({ ...oauthGrantsSpec(id ?? ""), enabled: !!id, staleTime: 30_000 });
}

/**
 * The consent page's check. Checked once per page load: no refetch on focus, and nothing kept
 * after the page goes (the parameters are one-time).
 */
export function useOAuthCheck(params: OAuthAuthorizeParams | null) {
  const id = useSessionUserId();
  const spec = oauthCheckSpec(id ?? "", params ?? { client_id: "", redirect_uri: "" });
  return useQuery({
    ...spec,
    enabled: !!id && !!params,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// --------------------------------------------------------------- mutations

/** Allow or deny. An allow creates a grant, so Connected apps refetches if it is open elsewhere. */
export function oauthDecisionOptions(
  qc: QueryClient,
  userId: string
): UseMutationOptions<OAuthDecisionResult, ApiError, OAuthDecisionRequest> {
  return {
    mutationKey: OAUTH_GRANTS_KEY,
    gcTime: 0,
    mutationFn: async (body) => must(await sendOAuthDecision(body)).data,
    onSettled: () => gatedInvalidate(qc, OAUTH_GRANTS_KEY, invalidationsFor("oauth-grants", userId)),
  };
}

type RevokeContext = { previous: OAuthGrant | undefined; index: number };

/** Optimistic: the row disappears at once and comes back if the server refuses. */
export function revokeOAuthGrantOptions(
  qc: QueryClient,
  userId: string
): UseMutationOptions<void, ApiError, string, RevokeContext> {
  const key = qk.oauthGrants(userId);
  return {
    mutationKey: OAUTH_GRANTS_KEY,
    scope: { id: "oauth-grants" },
    mutationFn: async (grantId) => {
      must(await revokeOAuthGrant(grantId));
    },
    onMutate: async (grantId) => {
      await qc.cancelQueries({ queryKey: key });
      const list = qc.getQueryData<OAuthGrantList>(key);
      const index = list?.findIndex((g) => g.id === grantId) ?? -1;
      const previous = index >= 0 ? list![index] : undefined;
      qc.setQueryData<OAuthGrantList>(key, (d) => removeGrant(d, grantId));
      return { previous, index };
    },
    onError: (_e, _id, ctx) => {
      const previous = ctx?.previous;
      if (previous) qc.setQueryData<OAuthGrantList>(key, (d) => restoreGrant(d, previous, ctx.index));
    },
    onSettled: () => gatedInvalidate(qc, OAUTH_GRANTS_KEY, invalidationsFor("oauth-grants", userId)),
  };
}

function useCtx() {
  const qc = useQueryClient();
  const userId = useSessionUserId() ?? "";
  return { qc, userId };
}

export function useOAuthDecision() {
  const { qc, userId } = useCtx();
  return useMutation(oauthDecisionOptions(qc, userId));
}

export function useRevokeOAuthGrant() {
  const { qc, userId } = useCtx();
  return useMutation(revokeOAuthGrantOptions(qc, userId));
}

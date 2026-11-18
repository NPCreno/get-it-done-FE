"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { createApiToken, revokeApiToken } from "@/app/api/tokensRequests";
import type { CreateApiTokenRequest } from "@/app/contracts/requests";
import type { ApiToken, ApiTokenList, CreatedApiToken } from "@/app/contracts/responses";
import { gatedInvalidate, invalidationsFor } from "./invalidation";
import { qk } from "./keys";
import { useSessionUserId } from "./queries";
import { apiTokensSpec } from "./specs";
import { must, type ApiError } from "./unwrap";

/**
 * FEAT-07 personal access tokens.
 *
 * The secret rule: the full token (`gid_pat_…`) exists only in the create response. It is never
 * written to a query (the list is refetched instead, and its schema strips unknown keys), the
 * create mutation has `gcTime: 0` so the mutation cache forgets it as soon as no component
 * observes it, and the caller resets the mutation once it has copied the token into its own
 * state. Nothing here logs, and nothing here touches storage.
 */
export const API_TOKENS_KEY = ["apiTokens"] as const;

// -------------------------------------------------------------------- pure

/** Tokens that still work; the backend allows `API_TOKEN_RULES.maxActive` of them. */
export function activeCount(list: readonly ApiToken[] | undefined): number {
  return list?.filter((t) => t.status === "active").length ?? 0;
}

/** Optimistic revoke: that one token shows Revoked at once. */
export function markRevoked(list: ApiTokenList | undefined, tokenId: string, at: string): ApiTokenList | undefined {
  if (!list) return list;
  let changed = false;
  const next = list.map((t) => {
    if (t.id !== tokenId || t.status === "revoked") return t;
    changed = true;
    return { ...t, status: "revoked" as const, revoked_at: at };
  });
  return changed ? next : list;
}

/**
 * Rollback after a failed revoke. Compare-and-swap: puts `previous` back only while the cached row
 * is still exactly the optimistic one we wrote; a newer server value (a refetch landed) wins.
 */
export function restoreRevoked(
  list: ApiTokenList | undefined,
  previous: ApiToken,
  optimisticAt: string
): ApiTokenList | undefined {
  if (!list) return list;
  const i = list.findIndex((t) => t.id === previous.id);
  if (i < 0) return list;
  const row = list[i];
  if (row.status !== "revoked" || row.revoked_at !== optimisticAt) return list;
  const next = [...list];
  next[i] = previous;
  return next;
}

// ------------------------------------------------------------------- reads

export function useApiTokens() {
  const id = useSessionUserId();
  // last_used_at moves while an assistant works, so a revisit refetches.
  return useQuery({ ...apiTokensSpec(id ?? ""), enabled: !!id, staleTime: 30_000 });
}

// --------------------------------------------------------------- mutations

/** Returns the created token (with its secret) to the caller only. Writes nothing to the cache. */
export function createApiTokenOptions(
  qc: QueryClient,
  userId: string
): UseMutationOptions<CreatedApiToken, ApiError, CreateApiTokenRequest> {
  return {
    mutationKey: API_TOKENS_KEY,
    // The mutation cache would otherwise keep the response for the default 5 minutes.
    gcTime: 0,
    mutationFn: async (body) => must(await createApiToken(body)).data,
    onSettled: () => gatedInvalidate(qc, API_TOKENS_KEY, invalidationsFor("api-tokens", userId)),
  };
}

type RevokeContext = { previous: ApiToken | undefined; at: string };

/** Optimistic: the row shows Revoked at once and comes back if the server refuses. */
export function revokeApiTokenOptions(
  qc: QueryClient,
  userId: string,
  now: () => Date = () => new Date()
): UseMutationOptions<void, ApiError, string, RevokeContext> {
  const key = qk.apiTokens(userId);
  return {
    mutationKey: API_TOKENS_KEY,
    scope: { id: "api-tokens" },
    mutationFn: async (tokenId) => {
      must(await revokeApiToken(tokenId));
    },
    onMutate: async (tokenId) => {
      await qc.cancelQueries({ queryKey: key });
      const at = now().toISOString();
      const previous = qc.getQueryData<ApiTokenList>(key)?.find((t) => t.id === tokenId);
      qc.setQueryData<ApiTokenList>(key, (d) => markRevoked(d, tokenId, at));
      return { previous, at };
    },
    onError: (_e, _id, ctx) => {
      const previous = ctx?.previous;
      if (previous && previous.status !== "revoked") {
        qc.setQueryData<ApiTokenList>(key, (d) => restoreRevoked(d, previous, ctx.at));
      }
    },
    onSettled: () => gatedInvalidate(qc, API_TOKENS_KEY, invalidationsFor("api-tokens", userId)),
  };
}

function useCtx() {
  const qc = useQueryClient();
  const userId = useSessionUserId() ?? "";
  return { qc, userId };
}

/** Call `reset()` as soon as the token is copied out of the result. */
export function useCreateApiToken() {
  const { qc, userId } = useCtx();
  return useMutation(createApiTokenOptions(qc, userId));
}

export function useRevokeApiToken() {
  const { qc, userId } = useCtx();
  return useMutation(revokeApiTokenOptions(qc, userId));
}

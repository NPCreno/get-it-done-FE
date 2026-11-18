import { apiClient } from "@/lib/apiClient";
import { CreateApiTokenRequestSchema } from "../contracts/requests";
import type { CreateApiTokenRequest } from "../contracts/requests";
import { ApiTokenListSchema, CreatedApiTokenSchema } from "../contracts/responses";
import { apiTokenPath, apiTokensPath } from "./paths";

// FEAT-07 personal access tokens. The caller is the token's owner (from the JWT). Only the
// create response carries the secret; apiClient never logs bodies, and nothing here does.

type Opts = { signal?: AbortSignal };

/** The caller's tokens, every status. No secret or hash, ever. */
export const getApiTokens = (opts?: Opts) =>
  apiClient(apiTokensPath(), {
    schema: ApiTokenListSchema,
    signal: opts?.signal,
    fallbackError: "Failed to load your tokens",
  });

/** The one response that carries the secret. Callers must not cache it (see lib/query/apiTokens.ts). */
export const createApiToken = (body: CreateApiTokenRequest) =>
  apiClient(apiTokensPath(), {
    method: "POST",
    body,
    requestSchema: CreateApiTokenRequestSchema,
    schema: CreatedApiTokenSchema,
    fallbackError: "Failed to create the token",
  });

/** Sets `revoked_at`. Idempotent; another user's id is a 404. */
export const revokeApiToken = (tokenId: string) =>
  apiClient(apiTokenPath(tokenId), {
    method: "DELETE",
    expect: "none",
    fallbackError: "Failed to revoke the token",
  });

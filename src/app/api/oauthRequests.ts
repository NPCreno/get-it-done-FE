import { apiClient } from "@/lib/apiClient";
import { OAuthDecisionRequestSchema } from "../contracts/requests";
import type { OAuthAuthorizeParams, OAuthDecisionRequest } from "../contracts/requests";
import { OAuthCheckResultSchema, OAuthDecisionResultSchema, OAuthGrantListSchema } from "../contracts/responses";
import { oauthAuthorizeCheckPath, oauthGrantPath, oauthGrantsPath } from "./paths";

// FEAT-07d OAuth connector consent and "Connected apps". The caller is the signed-in user (the
// website JWT). No token, code or secret ever passes through these helpers.

type Opts = { signal?: AbortSignal };

/**
 * The API runs on Render's free tier and sleeps when idle; waking takes about 50 s. The consent
 * page is often the first request after a sleep, so it waits longer than the default 15 s.
 */
const COLD_START_TIMEOUT_MS = 60_000;

/** The FE BFF route that forwards the decision with a same-origin check. */
export const OAUTH_DECISION_ROUTE = "/api/oauth/decision";

/** Validates the authorize parameters for display. The decision re-sends them raw. */
export const checkOAuthAuthorize = (params: OAuthAuthorizeParams, opts?: Opts) =>
  apiClient(oauthAuthorizeCheckPath(), {
    query: params,
    schema: OAuthCheckResultSchema,
    signal: opts?.signal,
    timeoutMs: COLD_START_TIMEOUT_MS,
    fallbackError: "Failed to check the connection request",
  });

/** Allow or deny, through the same-origin BFF. Returns where the browser goes next. */
export const sendOAuthDecision = (body: OAuthDecisionRequest) =>
  apiClient(OAUTH_DECISION_ROUTE, {
    method: "POST",
    sameOrigin: true,
    body,
    requestSchema: OAuthDecisionRequestSchema,
    schema: OAuthDecisionResultSchema,
    timeoutMs: COLD_START_TIMEOUT_MS,
    fallbackError: "Failed to send your answer",
  });

/** The caller's connected apps. */
export const getOAuthGrants = (opts?: Opts) =>
  apiClient(oauthGrantsPath(), {
    schema: OAuthGrantListSchema,
    signal: opts?.signal,
    fallbackError: "Failed to load your connected apps",
  });

/** Revokes the grant and every token issued under it. Idempotent; another user's id is a 404. */
export const revokeOAuthGrant = (grantId: string) =>
  apiClient(oauthGrantPath(grantId), {
    method: "DELETE",
    expect: "none",
    fallbackError: "Failed to disconnect the app",
  });

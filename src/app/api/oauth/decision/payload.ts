import { OAuthDecisionRequestSchema } from "@/app/contracts/requests";
import { OAuthDecisionResultSchema, type OAuthDecisionResult } from "@/app/contracts/responses";
import { AUTHORIZE_PARAM_KEYS } from "@/lib/oauthConsent";

/**
 * FEAT-07d pure pieces of the decision BFF route, so they are unit-tested without a server.
 * Nothing here logs: a body may carry `state` and the code challenge.
 */

/** The flat body BE `POST /api/oauth/authorize` takes: the raw authorize params plus the decision. */
export type AuthorizeDecisionBody = Record<string, string>;

/** Only the known authorize parameters and the decision are forwarded. Null when invalid. */
export function buildDecisionBody(raw: unknown): AuthorizeDecisionBody | null {
  const parsed = OAuthDecisionRequestSchema.safeParse(raw);
  if (!parsed.success) return null;
  const body: AuthorizeDecisionBody = {};
  for (const key of AUTHORIZE_PARAM_KEYS) {
    const value = parsed.data.params[key];
    if (value !== undefined) body[key] = value;
  }
  body.decision = parsed.data.decision;
  return body;
}

/** The access token from `Authorization: Bearer <token>`, or null. */
export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer ([A-Za-z0-9._~+/-]+=*)$/);
  return match ? match[1] : null;
}

type Envelope =
  | { status: "success"; data: OAuthDecisionResult }
  | { status: "error"; message: string; code?: string };

const SESSION_CODES = new Set(["TOKEN_INVALID", "TOKEN_MISSING"]);

/**
 * Maps the backend answer to what the browser gets. Only `redirect_to` leaves on success; on
 * failure the message is fixed copy (never backend text). A TOKEN_* 401 keeps its `code`, so the
 * browser API client refreshes the session and retries once.
 */
export function toDecisionResponse(status: number, json: unknown): { status: number; body: Envelope } {
  if (status >= 200 && status < 300) {
    const rec = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : null;
    // The envelope, or (tolerated) a bare object.
    const candidate = rec && rec.status === "success" ? rec.data : rec;
    const parsed = OAuthDecisionResultSchema.safeParse(candidate);
    if (parsed.success) return { status: 200, body: { status: "success", data: { redirect_to: parsed.data.redirect_to } } };
    return { status: 502, body: { status: "error", message: "Unexpected response from server" } };
  }
  const code = typeof json === "object" && json !== null ? (json as Record<string, unknown>).code : undefined;
  if (status === 401 && typeof code === "string" && SESSION_CODES.has(code)) {
    return { status: 401, body: { status: "error", code, message: "Session expired" } };
  }
  if (status === 429) return { status: 429, body: { status: "error", message: "Too many requests" } };
  if (status >= 400 && status < 500) {
    return { status, body: { status: "error", message: "This connection request isn't valid" } };
  }
  return { status: 502, body: { status: "error", message: "Failed to send your answer" } };
}

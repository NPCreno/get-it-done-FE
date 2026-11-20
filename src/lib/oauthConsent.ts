import type { OAuthAuthorizeParams } from "@/app/contracts/requests";
import type { ApiFailure } from "@/lib/apiClient";

/**
 * FEAT-07d pure helpers for the consent page (`/oauth/authorize`). The backend re-validates every
 * parameter on the decision; nothing here is a security boundary except `isSafeRedirectTarget`,
 * which decides whether the browser may leave for the URL the backend returned.
 */

/** The authorize parameters forwarded to the backend, in a fixed order. Anything else is dropped. */
export const AUTHORIZE_PARAM_KEYS = [
  "response_type",
  "client_id",
  "redirect_uri",
  "code_challenge",
  "code_challenge_method",
  "scope",
  "state",
  "resource",
] as const;

export type AuthorizeParamsRead =
  | { ok: true; params: OAuthAuthorizeParams }
  /** Missing `client_id`/`redirect_uri`, or a parameter sent twice: show the error page. */
  | { ok: false };

/**
 * Reads the known parameters from the page's query string. A parameter given twice is invalid
 * (RFC 6749 §3.1), so it is refused here rather than silently taking the first one.
 */
export function readAuthorizeParams(search: string | URLSearchParams): AuthorizeParamsRead {
  const sp = typeof search === "string" ? new URLSearchParams(search) : search;
  const params: Record<string, string> = {};
  for (const key of AUTHORIZE_PARAM_KEYS) {
    const all = sp.getAll(key);
    if (all.length > 1) return { ok: false };
    if (all.length === 1) params[key] = all[0];
  }
  if (!params.client_id || !params.redirect_uri) return { ok: false };
  return { ok: true, params: params as OAuthAuthorizeParams };
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** `localhost`, `127.0.0.1` or `[::1]` (as `URL.hostname` spells them). */
export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

/**
 * Whether the consent page may navigate to `url`: an absolute `https:` URL, or `http:` on a
 * loopback host (a client running on the user's computer, RFC 8252). Never `javascript:`, `data:`,
 * a relative URL, or a URL with a username or password in it.
 */
export function isSafeRedirectTarget(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password) return false;
  if (parsed.protocol === "https:") return parsed.hostname.length > 0;
  if (parsed.protocol === "http:") return isLoopbackHost(parsed.hostname);
  return false;
}

/**
 * Whether a failed check or decision means "this request is not valid" (the error page, never
 * a redirect) rather than "try again" (offline, timeout, a sleeping or failing server, a rate
 * limit). The backend refuses a bad request with a 4xx.
 */
export function isFatalConsentFailure(f: ApiFailure): boolean {
  if (f.kind === "forbidden" || f.kind === "api" || f.kind === "invalid_request") return true;
  if (f.kind !== "http") return false;
  return f.status >= 400 && f.status < 500 && f.status !== 408 && f.status !== 429;
}

/** The consent page's address for a "Not you? Sign out" or login link that must come back here. */
export function consentPathOf(search: string): string {
  return `/oauth/authorize${search.startsWith("?") || search === "" ? search : `?${search}`}`;
}

/**
 * FEAT-07d: where the browser goes after signing in.
 *
 * Only the OAuth consent page may be a `next` target, so a crafted login link can never send a
 * user anywhere else (an open redirect). Everything that fails a rule falls back to the dashboard.
 * Pure and edge-safe: the middleware and the login and signup forms all use it.
 */

export const DEFAULT_AFTER_LOGIN = "/dashboard";

/** The one page that keeps `next` through sign-in. */
export const CONSENT_PATH = "/oauth/authorize";

/** Longer than any real authorize URL, short enough to keep a login link sane. */
const MAX_NEXT_LENGTH = 4096;

/**
 * Returns `raw` when it is a relative link to the consent page (`/oauth/authorize` or
 * `/oauth/authorize?…`), otherwise `/dashboard`. Rejects `//host`, backslashes, schemes,
 * whitespace and control characters, and encoded tricks such as `/%2F%2Fhost`.
 */
export function safeNext(raw: string | null | undefined): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_NEXT_LENGTH) return DEFAULT_AFTER_LOGIN;
  // A backslash or any whitespace/control character: browsers "fix" these in surprising ways.
  if (/[\\\s\u0000-\u001f\u007f]/.test(raw)) return DEFAULT_AFTER_LOGIN;
  if (raw !== CONSENT_PATH && !raw.startsWith(`${CONSENT_PATH}?`)) return DEFAULT_AFTER_LOGIN;
  // Belt and braces: it must still resolve to that exact path on our own origin.
  try {
    const base = "https://origin.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base || url.pathname !== CONSENT_PATH) return DEFAULT_AFTER_LOGIN;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  return raw;
}

/**
 * The login URL the middleware sends a signed-out visitor to. Only the consent page keeps where
 * the visitor was going; every other route goes to plain `/login`, as before.
 */
export function loginPathFor(pathname: string, search: string): string {
  if (pathname !== CONSENT_PATH) return "/login";
  const next = `${pathname}${search}`;
  return safeNext(next) === next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

/** `/login` or `/signup` carrying a validated `next`; a bad or missing `next` is simply dropped. */
export function withNext(path: "/login" | "/signup", raw: string | null | undefined): string {
  const next = safeNext(raw);
  return next === DEFAULT_AFTER_LOGIN ? path : `${path}?next=${encodeURIComponent(next)}`;
}

/** Browser only: the `next` of the current page's URL (null on the server). */
export function currentNext(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

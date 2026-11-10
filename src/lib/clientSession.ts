import { getAccessToken } from "@/app/utils/utils";

/**
 * Browser-side session restore. Layers:
 *  1. in-tab singleton (one refresh at a time per tab)
 *  2. cross-tab Web Lock "gid-session"; inside it, a changed access cookie
 *     means another tab already refreshed, so we skip our own refresh
 *  3. the backend replays a recently rotated token, so even without locks
 *     concurrent refreshes are safe
 * Cookies are cleared only by an explicit logout, never on an ambiguous failure.
 */

export type RefreshOutcome = "refreshed" | "invalid" | "unavailable";

const LOCK_NAME = "gid-session";
let inFlight: Promise<RefreshOutcome> | null = null;
let expiring = false;

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request(LOCK_NAME, fn) as Promise<T>;
  }
  return fn();
}

/** POST with a manual timeout (no AbortSignal.timeout: older Safari lacks it). */
async function postWithTimeout(url: string, timeoutMs: number): Promise<Response | "network"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch {
    return "network";
  } finally {
    clearTimeout(timer);
  }
}

export function refreshSession(stale: string | null): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;
  inFlight = withLock<RefreshOutcome>(async () => {
    const current = getAccessToken();
    if (current && current !== stale) return "refreshed"; // another tab already rotated

    const res = await postWithTimeout("/api/auth/refresh", 10_000);
    if (res === "network") return "unavailable";
    if (res.ok) return "refreshed";
    if (res.status === 401) {
      // Re-check the jar before declaring the session dead.
      const now = getAccessToken();
      return now && now !== stale ? "refreshed" : "invalid";
    }
    return "unavailable"; // 403 / 503 / other
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Ends the session once: revokes server-side, clears cookies, goes to /login.
 * If the access cookie changed meanwhile, another tab holds a newer session
 * and we do not log out.
 */
export async function expireSession(stale: string | null): Promise<"expired" | "refreshed"> {
  if (expiring) return "expired";
  return withLock<"expired" | "refreshed">(async () => {
    const current = getAccessToken();
    if (current && current !== stale) return "refreshed";
    if (expiring) return "expired";
    expiring = true;
    await postWithTimeout("/api/auth/logout", 5_000);
    window.location.assign("/login");
    return "expired";
  });
}

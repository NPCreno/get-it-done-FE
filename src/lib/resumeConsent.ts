import { refreshSession } from "./clientSession";
import { currentNext, DEFAULT_AFTER_LOGIN, safeNext } from "./safeNext";

/**
 * FEAT-07d: claude.ai (or any MCP client) opens the consent page with a CROSS-SITE navigation.
 * The session cookies are SameSite=Strict, so the browser does not send them on it, and the
 * middleware sends even a signed-in user to `/login?next=…`. On the login page the session is
 * visible again, so this continues to the consent page with a same-origin navigation (which does
 * send the cookies) instead of asking for the password again.
 *
 * Only for a `next` that passes `safeNext`, at most once per `next` per tab (so a session the
 * middleware still refuses cannot bounce between the two pages), and only when the session is
 * alive: a readable access cookie, or a successful silent refresh.
 */
const TRIED_KEY = "gid.oauth.resumed";

export async function resumeConsentIfSignedIn(): Promise<boolean> {
  const next = safeNext(currentNext());
  if (next === DEFAULT_AFTER_LOGIN) return false;
  try {
    if (window.sessionStorage.getItem(TRIED_KEY) === next) return false;
    window.sessionStorage.setItem(TRIED_KEY, next);
  } catch {
    // Storage blocked: still safe, the middleware sends a dead session back here only once
    // more, and then the access cookie is gone (it is cleared on a refused token).
  }
  const outcome = await refreshSession(null);
  if (outcome !== "refreshed") return false;
  window.location.replace(next);
  return true;
}

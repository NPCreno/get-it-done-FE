import { NextRequest } from "next/server";
import { getClientIp } from "@/app/utils/clientIp";
import {
  BACKEND_COLD_START_MS,
  isSameOrigin,
  noStoreJson,
  refreshWithBackend,
  setSessionCookies,
} from "../session";

/** UX-03: the backend may take up to a minute to wake; let the function run that long. */
export const maxDuration = 60;

/**
 * Client-side silent refresh. Cookies are never cleared here: this request may
 * carry a cookie another tab has already replaced, so the client decides.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return noStoreJson({ success: false, code: "FORBIDDEN" }, 403);
  }

  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (!refreshToken) {
    return noStoreJson({ success: false, code: "NO_SESSION" }, 401);
  }

  const outcome = await refreshWithBackend(refreshToken, getClientIp(req.headers), BACKEND_COLD_START_MS);

  if (outcome.kind === "ok") {
    const res = noStoreJson({ success: true }, 200);
    setSessionCookies(res, outcome.tokens);
    return res;
  }
  if (outcome.kind === "invalid") {
    return noStoreJson({ success: false, code: "SESSION_INVALID" }, 401);
  }
  return noStoreJson({ success: false, code: "REFRESH_UNAVAILABLE" }, 503);
}

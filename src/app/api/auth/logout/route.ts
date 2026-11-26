import { NextRequest } from "next/server";
import { getClientIp } from "@/app/utils/clientIp";
import { APPEARANCE_COOKIE } from "@/lib/appearance";
import {
  clearSessionCookies,
  isSameOrigin,
  noStoreJson,
  revokeWithBackend,
} from "../session";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return noStoreJson({ success: false, code: "FORBIDDEN" }, 403);
  }

  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    await revokeWithBackend(refreshToken, getClientIp(req.headers));
  }

  const res = noStoreJson({ success: true }, 200);
  clearSessionCookies(res);
  // RD-1: the next person on this browser starts from the default look, not this account's.
  res.cookies.set(APPEARANCE_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
  return res;
}

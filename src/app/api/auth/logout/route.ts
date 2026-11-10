import { NextRequest } from "next/server";
import { getClientIp } from "@/app/utils/clientIp";
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
  return res;
}

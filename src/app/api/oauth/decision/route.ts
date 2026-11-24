import { NextRequest } from "next/server";
import { getClientIp } from "@/app/utils/clientIp";
import { BACKEND_COLD_START_MS, backendAuthHeaders, isSameOrigin, noStoreJson } from "../../auth/session";
import { bearerToken, buildDecisionBody, toDecisionResponse } from "./payload";

/** Render free can take ~50 s to wake; the browser waits 60 s for this route (UX-03: shared constant). */
export const maxDuration = 60;

/**
 * FEAT-07d `POST /api/oauth/decision`: the consent page's Allow or Deny.
 *
 * Same-origin only (defense in depth on top of the Bearer header, which a cross-site page cannot
 * send). Forwards the raw authorize parameters and the decision to BE `POST /api/oauth/authorize`
 * with the user's access token; the backend re-validates everything and returns `{ redirect_to }`.
 * The page checks that URL before it navigates. Nothing here logs the body.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return noStoreJson({ status: "error", message: "Forbidden" }, 403);

  const token = bearerToken(req.headers.get("authorization"));
  if (!token) return noStoreJson({ status: "error", code: "TOKEN_MISSING", message: "Session expired" }, 401);

  const body = buildDecisionBody(await req.json().catch(() => null));
  if (!body) return noStoreJson({ status: "error", message: "Invalid request" }, 400);

  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oauth/authorize`, {
      method: "POST",
      headers: { ...backendAuthHeaders(getClientIp(req.headers)), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_COLD_START_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    console.warn("[oauth] decision", timedOut ? "timeout" : "network");
    return noStoreJson({ status: "error", message: "Failed to send your answer" }, timedOut ? 504 : 502);
  }

  const mapped = toDecisionResponse(res.status, await res.json().catch(() => null));
  if (mapped.status !== 200) console.warn("[oauth] decision", res.status);
  const response = noStoreJson(mapped.body, mapped.status);
  const retryAfter = res.headers.get("retry-after");
  if (mapped.status === 429 && retryAfter) response.headers.set("Retry-After", retryAfter);
  return response;
}

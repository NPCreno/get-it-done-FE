import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/app/utils/clientIp";
import { BACKEND_COLD_START_MS, backendAuthHeaders } from "../session";
import { buildSignupPayload, toSignupResponse } from "./payload";

/** UX-03: the backend may take up to a minute to wake; let the function run that long. */
export const maxDuration = 60;

// Signup goes through the server so the backend sees the attested client IP
// (SEC-04) and can rate limit by it (SEC-09).
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid request" }, { status: 400 });
  }

  const payload = buildSignupPayload(raw);
  if (!payload) {
    return NextResponse.json({ status: "error", message: "Invalid request" }, { status: 400 });
  }

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/create`, {
      method: "POST",
      headers: backendAuthHeaders(getClientIp(req.headers)),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(BACKEND_COLD_START_MS),
    });
  } catch (error) {
    console.error("Signup request failed:", error instanceof Error ? error.message : "network");
    return NextResponse.json({ status: "error", message: "Failed to create account" }, { status: 502 });
  }

  const body = toSignupResponse(await apiResponse.json().catch(() => null), apiResponse.ok);
  if (!body) {
    return NextResponse.json({ status: "error", message: "Failed to create account" }, { status: 502 });
  }
  const response = NextResponse.json(body, { status: apiResponse.status });
  const retryAfter = apiResponse.headers.get("retry-after");
  if (apiResponse.status === 429 && retryAfter) response.headers.set("Retry-After", retryAfter);
  return response;
}

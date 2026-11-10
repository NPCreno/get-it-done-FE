import { NextResponse } from "next/server";

/**
 * Server-side session helpers shared by the middleware and the BFF route
 * handlers. Edge-safe: only `fetch` and `NextResponse`.
 *
 * Rule: cookies are cleared ONLY on a definitive backend verdict. Network
 * errors, timeouts, 5xx, 429 and malformed responses never touch cookies,
 * because the backend may have rotated the token even though we did not see
 * the answer (a retry is recovered by the backend grace replay).
 */

const MAX_LIFETIME_SECONDS = 31 * 24 * 60 * 60;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

export type RefreshOutcome =
  | { kind: "ok"; tokens: SessionTokens }
  | { kind: "invalid" }
  | { kind: "unavailable" };

function validLifetime(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 && n <= MAX_LIFETIME_SECONDS;
}

/** Validates the backend `data` object of a login/refresh response. */
export function parseSessionTokens(data: unknown): SessionTokens | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (
    typeof d.access_token !== "string" || !d.access_token ||
    typeof d.refresh_token !== "string" || !d.refresh_token ||
    !validLifetime(d.access_expires_in) ||
    !validLifetime(d.refresh_expires_in)
  ) {
    return null;
  }
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    accessExpiresIn: d.access_expires_in,
    refreshExpiresIn: d.refresh_expires_in,
  };
}

export function backendAuthHeaders(clientIp: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.INTERNAL_API_SECRET;
  if (secret && clientIp) {
    headers["X-Internal-Secret"] = secret;
    headers["X-Client-IP"] = clientIp;
  }
  return headers;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshWithBackend(
  refreshToken: string,
  clientIp: string
): Promise<RefreshOutcome> {
  try {
    const res = await fetchWithTimeout(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {
        method: "POST",
        headers: backendAuthHeaders(clientIp),
        body: JSON.stringify({ refreshToken }),
      },
      10_000
    );

    if (res.status === 401 || res.status === 400) return { kind: "invalid" };
    if (!res.ok) {
      console.warn("[session] refresh unavailable, status", res.status);
      return { kind: "unavailable" };
    }

    const body = (await res.json().catch(() => null)) as
      | { status?: string; data?: unknown }
      | null;
    const tokens = body?.status === "success" ? parseSessionTokens(body.data) : null;
    if (!tokens) {
      console.warn("[session] refresh unavailable, malformed response");
      return { kind: "unavailable" };
    }
    return { kind: "ok", tokens };
  } catch {
    console.warn("[session] refresh unavailable, network or timeout");
    return { kind: "unavailable" };
  }
}

/** Best effort: revokes the token family on the backend. Errors are swallowed. */
export async function revokeWithBackend(refreshToken: string, clientIp: string): Promise<void> {
  try {
    await fetchWithTimeout(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
      {
        method: "POST",
        headers: backendAuthHeaders(clientIp),
        body: JSON.stringify({ refreshToken }),
      },
      5_000
    );
  } catch {
    // best effort only
  }
}

const secure = () => process.env.NODE_ENV === "production";

/** The single definition of session cookie attributes. */
export function setSessionCookies(res: NextResponse, tokens: SessionTokens): void {
  // Readable by client JS: getAccessToken() sends it as a Bearer header.
  res.cookies.set("access_token", tokens.accessToken, {
    maxAge: Math.floor(tokens.accessExpiresIn),
    secure: secure(),
    sameSite: "strict",
    path: "/",
    httpOnly: false,
  });
  // Never exposed to client JS.
  res.cookies.set("refresh_token", tokens.refreshToken, {
    maxAge: Math.floor(tokens.refreshExpiresIn),
    secure: secure(),
    sameSite: "strict",
    path: "/",
    httpOnly: true,
  });
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set("access_token", "", {
    maxAge: 0, secure: secure(), sameSite: "strict", path: "/", httpOnly: false,
  });
  res.cookies.set("refresh_token", "", {
    maxAge: 0, secure: secure(), sameSite: "strict", path: "/", httpOnly: true,
  });
}

/** Defense in depth on top of SameSite=Strict. */
export function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try {
      if (!host || new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function noStoreJson(body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

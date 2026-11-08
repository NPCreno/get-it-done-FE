import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/app/utils/clientIp";

const REFRESH_COOKIE_DAYS = 7;
const REFRESH_COOKIE_DAYS_REMEMBER_ME = 30;

interface LoginBody {
  usernameOrEmail: string;
  password: string;
  rememberMe: boolean;
}

interface LoginApiResponse {
  message?: string;
  data?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

function parseBody(body: unknown): LoginBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { usernameOrEmail, password, rememberMe } = body as Record<string, unknown>;
  if (
    typeof usernameOrEmail !== "string" || usernameOrEmail.length === 0 ||
    typeof password !== "string" || password.length === 0
  ) {
    return null;
  }
  return { usernameOrEmail, password, rememberMe: rememberMe === true };
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  const isEmail = body.usernameOrEmail.includes("@");
  const endpoint = isEmail ? "loginEmail" : "loginUsername";
  const payload = {
    ...(isEmail ? { email: body.usernameOrEmail } : { username: body.usernameOrEmail }),
    password: body.password,
    rememberMe: body.rememberMe,
  };

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-IP": getClientIp(req.headers),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error("Login request failed:", error);
    return NextResponse.json({ success: false, message: "Login failed" }, { status: 502 });
  }

  const result = (await apiResponse.json().catch(() => ({}))) as LoginApiResponse;

  if (!apiResponse.ok || !result.data?.access_token || !result.data?.refresh_token) {
    return NextResponse.json(
      { success: false, message: result.message || "Login failed" },
      { status: apiResponse.ok ? 502 : apiResponse.status }
    );
  }

  const secure = process.env.NODE_ENV === "production";
  const refreshDays = body.rememberMe ? REFRESH_COOKIE_DAYS_REMEMBER_ME : REFRESH_COOKIE_DAYS;
  const response = NextResponse.json({ success: true });

  // Readable by client JS: getAccessToken() sends it as a Bearer header.
  response.cookies.set("access_token", result.data.access_token, {
    maxAge: result.data.expires_in,
    secure,
    sameSite: "strict",
    path: "/",
    httpOnly: false,
  });
  // Never exposed to client JS.
  response.cookies.set("refresh_token", result.data.refresh_token, {
    maxAge: refreshDays * 24 * 60 * 60,
    secure,
    sameSite: "strict",
    path: "/",
    httpOnly: true,
  });

  return response;
}

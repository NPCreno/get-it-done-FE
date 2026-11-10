import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/app/utils/clientIp";
import { backendAuthHeaders, parseSessionTokens, setSessionCookies } from "../session";

interface LoginBody {
  usernameOrEmail: string;
  password: string;
  rememberMe: boolean;
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
      headers: backendAuthHeaders(getClientIp(req.headers)),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error("Login request failed:", error instanceof Error ? error.message : "network");
    return NextResponse.json({ success: false, message: "Login failed" }, { status: 502 });
  }

  const result = (await apiResponse.json().catch(() => ({}))) as {
    message?: string;
    data?: unknown;
  };
  const tokens = apiResponse.ok ? parseSessionTokens(result.data) : null;

  if (!apiResponse.ok || !tokens) {
    return NextResponse.json(
      { success: false, message: (typeof result.message === "string" && result.message) || "Login failed" },
      { status: apiResponse.ok ? 502 : apiResponse.status }
    );
  }

  const response = NextResponse.json({ success: true });
  setSessionCookies(response, tokens);
  return response;
}

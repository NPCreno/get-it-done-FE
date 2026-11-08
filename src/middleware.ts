import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, errors } from "jose";
import { getIPAddress } from "./app/utils/utils";
import { refreshAccessToken } from "./app/api/auth/authRequests";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = 'HS256';

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set before the application starts.");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

// Pages anyone can open (the landing page "/" is handled separately).
const publicRoutes = ["/login", "/signup", "/forgot-password"];
// Login/logout route handlers: they must work without a valid session.
const authApiRoutes = ["/api/auth/login", "/api/auth/logout"];
// Every other route is protected by default.

const REFRESH_WINDOW_SECONDS = 60;

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function verifyAccessToken(token: string) {
  return jwtVerify(token, secretKey, { algorithms: [JWT_ALGORITHM] });
}

function redirectToLogin(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", req.url));
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // Login/logout endpoints handle their own cookies
  if (authApiRoutes.some(route => isRoute(pathname, route))) {
    return NextResponse.next();
  }

  // Public pages: allow anyone, send signed-in users to the dashboard
  if (pathname === "/" || publicRoutes.some(route => isRoute(pathname, route))) {
    if (token) {
      try {
        await verifyAccessToken(token);
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } catch (err) {
        // Expired tokens are left alone so the user can sign in again.
        // Forged or malformed tokens are cleared.
        if (!(err instanceof errors.JWTExpired)) {
          const response = NextResponse.next();
          response.cookies.delete("access_token");
          response.cookies.delete("refresh_token");
          return response;
        }
      }
    }
    return NextResponse.next();
  }

  // Everything else requires a cryptographically valid access token
  if (!token && !refreshToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // No access token (e.g. the cookie expired) but a refresh token exists
  if (!token) {
    const refreshResult = await refreshAccessToken(refreshToken!, await getIPAddress());
    return refreshResult ?? redirectToLogin(req);
  }

  try {
    const { payload } = await verifyAccessToken(token);
    const now = Math.floor(Date.now() / 1000);

    // Valid but about to expire: refresh ahead of time, keep going if it fails
    if (refreshToken && payload.exp && payload.exp - now < REFRESH_WINDOW_SECONDS) {
      const refreshResult = await refreshAccessToken(refreshToken, await getIPAddress());
      if (refreshResult) return refreshResult;
    }

    return NextResponse.next();
  } catch (err) {
    // Only a genuinely expired token may be refreshed.
    // Bad signature, malformed token or wrong claims are rejected.
    if (err instanceof errors.JWTExpired) {
      if (refreshToken) {
        const refreshResult = await refreshAccessToken(refreshToken, await getIPAddress());
        if (refreshResult) return refreshResult;
      }
    } else {
      console.error("Access token rejected:", err instanceof Error ? err.message : err);
    }
    return redirectToLogin(req);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

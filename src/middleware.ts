import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { base64UrlDecode, getIPAddress } from "./app/utils/utils";
import { refreshAccessToken } from "./app/api/auth/authRequests";
const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret';
const JWT_ALGORITHM = 'HS256';

const publicRoutes = ["/login", "/signup", "/forgot-password"];
const protectedRoutes = ["/dashboard", "/projects", "/notifications", "/profile-settings"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;
  const ipAddress = await getIPAddress();

  // Handle root route - redirect to dashboard if authenticated
  if (pathname === "/") {
    if (token) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret, {
          algorithms: [JWT_ALGORITHM],
        });
  
        if (payload.exp && Date.now() < payload.exp * 1000) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        const response = NextResponse.next();
        response.cookies.delete("access_token");
        response.cookies.delete("refresh_token");
        return response;
      }
    }
    return NextResponse.next();
  }

  // Handle public routes - allow access regardless of auth state
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      // If user is logged in and tries to access auth pages, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Handle protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // If no tokens at all, redirect to login
    if (!token && !refreshToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // If no access token but have refresh token, try to refresh
    if (!token && refreshToken) {
      const refreshResult = await refreshAccessToken(refreshToken, ipAddress);
      if (refreshResult) {
        // Return the response from refreshAccessToken which already has the cookies set
        return refreshResult;
      }
      
      // If refresh failed, redirect to login
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    }

    // If we have an access token, verify it
    if (token) {
      try {
        // Check if token is expired or about to expire
        const [, payload] = token.split(".");
        const decoded = JSON.parse(base64UrlDecode(payload));
        const exp = decoded.exp * 1000;
        const now = Date.now();

        // If token is expired or expiring in less than 1 minute
        if (now > exp - 60000) { // Changed from 1000ms to 60000ms (1 minute)
          if (refreshToken) {
            console.log("Access token expiring soon, attempting refresh...");
            const refreshResult = await refreshAccessToken(refreshToken, ipAddress);
            if (refreshResult) {
              // Return the response from refreshAccessToken which already has the cookies set
              return refreshResult;
            }
          }
          
          // If refresh failed or no refresh token, redirect to login
          const response = NextResponse.redirect(new URL("/login", req.url));
          response.cookies.delete("access_token");
          response.cookies.delete("refresh_token");
          return response;
        }

        // Token is still valid, continue
        return NextResponse.next();
      } catch (err) {
        console.error("Token verification failed:", err);
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("access_token");
        response.cookies.delete("refresh_token");
        return response;
      }
    }
  }

  // For all other routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

// import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
// import { NextRequest, NextResponse } from "next/server";

// export async function middleware(req: NextRequest) {
//   const res = NextResponse.next();

//   const supabase = createMiddlewareClient({ req, res });

//   const {
//     data: { session },
//   } = await supabase.auth.getSession();

//   console.log("Middleware running");
//   console.log("session: ", session);
//   if (!session) {
//     return NextResponse.redirect(new URL("/", req.url));
//   }
//   return res;
// }

// export const config = {
//   matcher: ["/dashboard", "/projects", "/notifications", "/profileSettings"],
// };

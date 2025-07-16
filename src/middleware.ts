import { NextRequest, NextResponse } from "next/server";
import { base64UrlDecode } from "./app/utils/utils";

const publicRoutes = ["/login", "/signup", "/forgot-password"];
const protectedRoutes = ["/dashboard", "/projects", "/notifications", "/profile-settings"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value;

  // Handle root route - redirect to dashboard if authenticated
  if (pathname === "/") {
    if (token) {
      try {
        // Verify token is valid
        const [, payload] = token.split(".");
        const decoded = JSON.parse(base64UrlDecode(payload));
        const exp = decoded.exp * 1000;

        if (Date.now() < exp) {
          // Token is valid, redirect to dashboard
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        // If token is invalid, continue to root
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

  // Handle protected routes - exclude root path from protection
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      // Redirect to login if no token
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      // Verify token is valid
      const [, payload] = token.split(".");
      const decoded = JSON.parse(base64UrlDecode(payload));
      const exp = decoded.exp * 1000;

      if (Date.now() > exp) {
        // Token expired
        const response = NextResponse.redirect(new URL("/login", req.url));
        // Clear the access token cookie
        response.cookies.set("access_token", "", { path: "/", expires: new Date(0) });
        return response;
      }

      // Root path is now handled at the beginning of the middleware

      return NextResponse.next();
    } catch (err) {
      console.error("Token verification failed:", err);
      const response = NextResponse.redirect(new URL("/login", req.url));
      // Clear the access token cookie
      response.cookies.set("access_token", "", { path: "/", expires: new Date(0) });
      return response;
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

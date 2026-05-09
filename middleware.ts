import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { apiLimiter, authLimiter } from "@/src/lib/rate-limit";

// Define the existing auth middleware
const authMiddleware = withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const pathname = req.nextUrl.pathname;

    // Super-admin routes: only userType === "super_admin" allowed
    if (pathname.startsWith("/api/super-admin") || pathname.startsWith("/(super-admin)")) {
      if (token?.userType !== "SUPER_ADMIN") {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
    }

    // All other protected routes just need a valid session
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;
  let response = NextResponse.next();
  let rateLimitHeaders: Record<string, string> = {};

  // 1. Rate Limiting for all /api routes
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const isAuth = pathname.startsWith("/api/auth");
    const limiter = isAuth ? authLimiter : apiLimiter;

    try {
      const { success, limit, remaining, reset } = await limiter.limit(ip);

      rateLimitHeaders = {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      };

      if (!success) {
        return NextResponse.json(
          { success: false, message: "Too Many Requests" },
          { status: 429, headers: rateLimitHeaders }
        );
      }
    } catch (error: any) {
      // Silently proceed if rate limiting fails due to Redis/Upstash issues (like NOPERM)
      // This prevents the application from breaking if the rate limiter is misconfigured
      if (error?.message?.includes("NOPERM")) {
        console.error("Rate limit error: Your Upstash token lacks 'evalsha' permissions. Please ensure your token has 'Full Access' in the Upstash console.");
      } else {
        console.error("Rate limit error:", error);
      }
    }
  }

  // 2. Determine if route needs next-auth protection
  const isProtectedApi = pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/enquiries") &&
    !pathname.startsWith("/api/testimonials");

  const isProtectedPage = pathname.startsWith("/(dashboard)") || pathname.startsWith("/(super-admin)");

  // 3. Execute Auth Middleware if necessary
  if (isProtectedApi || isProtectedPage) {
    // Typecast to any to satisfy TS, as withAuth returns a standard middleware function
    const authResponse = await (authMiddleware as any)(req, event);
    if (authResponse) {
      response = authResponse;
    }
  }

  // 4. Append rate limit headers to the final response (whether it succeeded auth or not)
  if (pathname.startsWith("/api/")) {
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Ensure the middleware runs on all API routes so rate limiting works everywhere
    "/api/:path*",
    // Also run on protected dashboard pages
    "/(dashboard)/:path*",
    "/(super-admin)/:path*",
  ],
};

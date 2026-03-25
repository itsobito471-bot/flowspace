import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const pathname = req.nextUrl.pathname;

    // Super-admin routes: only userType === "super_admin" allowed
    if (pathname.startsWith("/api/super-admin") || pathname.startsWith("/(super-admin)")) {
      if (token?.userType !== "SUPER_ADMIN") {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
    }

    // All other protected routes just need a valid session (handled by withAuth)
    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true = allow request (user is authenticated), false = redirect to signIn
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    // Protect all /api routes EXCEPT the auth endpoints themselves
    "/api/((?!auth).*)",
    // Protect all dashboard and super-admin pages
    "/(dashboard)/:path*",
    "/(super-admin)/:path*",
  ],
};

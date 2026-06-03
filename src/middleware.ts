import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    // Check authentication
    if (!token) {
      // Public API routes
      if (pathname.startsWith("/api/auth/") || pathname.match(/^\/api\/products\/[^\/]+\/preview$/)) {
        return NextResponse.next();
      }

      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // RBAC - Role-based access control
    const userRole = token.role as string;

    // Admin routes
    if (pathname.startsWith("/admin")) {
      if (userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Seller routes
    if (pathname.startsWith("/seller")) {
      if (userRole !== "SELLER") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Buyer routes
    if (pathname.startsWith("/buyer")) {
      if (userRole !== "BUYER") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // API routes - attach user info to headers for verification
    if (pathname.startsWith("/api")) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", token.sub as string);
      requestHeaders.set("x-user-role", userRole);
      if (token.sellerId) {
        requestHeaders.set("x-seller-id", token.sellerId as string);
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ["/admin/:path*", "/seller/:path*", "/buyer/:path*", "/api/:path*"],
};

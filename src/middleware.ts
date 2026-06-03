import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    if (token.role !== "admin") return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect /seller routes
  if (pathname.startsWith("/seller")) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    if (token.role !== "admin" && token.role !== "seller") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect /buyer routes
  if (pathname.startsWith("/buyer")) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    if (token.role !== "admin" && token.role !== "buyer") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/seller/:path*", "/buyer/:path*"],
};

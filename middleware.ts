import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/public") ||
    request.nextUrl.pathname.startsWith("/manifest") ||
    request.nextUrl.pathname.startsWith("/offline")
  ) {
    return NextResponse.next();
  }

  // Lightweight cookie check for protected routes
  // Full auth validation happens in layout components (server-side)
  const sessionToken = request.cookies.get("next-auth.session-token") || 
                       request.cookies.get("__Secure-next-auth.session-token");

  // Protected routes: require session cookie
  if (request.nextUrl.pathname.startsWith("/dashboard") || 
      request.nextUrl.pathname.startsWith("/admin")) {
    if (!sessionToken) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Auth pages: redirect if session cookie exists (lightweight check)
  // Full validation happens in AuthLayout
  if (request.nextUrl.pathname.startsWith("/auth/signin") || 
      request.nextUrl.pathname.startsWith("/auth/signup")) {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};


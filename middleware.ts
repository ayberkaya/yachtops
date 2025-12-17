import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-config";

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes (except auth)
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.startsWith("/api/expenses/receipts") ||
    request.nextUrl.pathname.startsWith("/api/messages") ||
    request.nextUrl.pathname.startsWith("/api/vessel-documents") ||
    request.nextUrl.pathname.startsWith("/api/crew-documents") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (request.nextUrl.pathname.startsWith("/dashboard") || 
      request.nextUrl.pathname.startsWith("/admin")) {
    try {
      const session = await auth();
      
      // If no session or invalid session, redirect to signin
      if (!session?.user?.id) {
        const signInUrl = new URL("/auth/signin", request.url);
        signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
    } catch (error) {
      // If auth check fails, redirect to signin
      console.error("Middleware auth check failed:", error);
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith("/auth/signin")) {
    try {
      const session = await auth();
      if (session?.user?.id) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (error) {
      // If auth check fails, allow access to signin page
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


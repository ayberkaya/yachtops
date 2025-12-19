import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDev = process.env.NODE_ENV === "development";

  // Guardrail: Prevent redirect loops - never redirect /auth/signin to itself
  if (pathname === "/auth/signin") {
    if (isDev) {
      console.log(`[MIDDLEWARE] Skipping /auth/signin - let AuthLayout handle auth`);
    }
    return NextResponse.next();
  }

  // Lightweight cookie check for protected routes
  // Full auth validation happens in layout components (server-side)
  const sessionToken = request.cookies.get("next-auth.session-token") || 
                       request.cookies.get("__Secure-next-auth.session-token") ||
                       request.cookies.get("authjs.session-token") ||
                       request.cookies.get("__Secure-authjs.session-token");

  // Protected routes: require session cookie
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!sessionToken) {
      if (isDev) {
        // Debug: log all cookies to see what's available
        const allCookies = request.cookies.getAll();
        console.log(`[MIDDLEWARE] No session token for ${pathname}`);
        console.log(`[MIDDLEWARE] Available cookies:`, allCookies.map(c => c.name).join(", ") || "none");
      }
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    if (isDev) {
      console.log(`[MIDDLEWARE] Session token found (${sessionToken.name}) for ${pathname}, allowing access`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/* (all Next.js internal routes including chunks, static, image, etc.)
     * - api/* (API routes)
     * - auth/* (authentication pages - handled by AuthLayout)
     * - Static assets (favicon, robots, sitemap, manifest, images, icons, fonts)
     * - Public folder
     * - Offline page
     */
    "/((?!_next|api|auth|favicon.ico|robots.txt|sitemap.xml|manifest.json|images|icons|fonts|public|offline).*)",
  ],
};


import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Guardrail: Prevent redirect loops - never redirect /auth/signin to itself
  if (pathname === "/auth/signin") {
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
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
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


import { auth } from "@/lib/auth-config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const session = req.auth;
  const path = req.nextUrl.pathname;

  // Redirect to dashboard if accessing auth pages while logged in
  if (path.startsWith("/auth") && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect to sign in if accessing protected routes without auth
  if (path.startsWith("/dashboard") && !session) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};


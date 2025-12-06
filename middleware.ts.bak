import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Temporarily disabled middleware to debug NextAuth issue
export default function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};


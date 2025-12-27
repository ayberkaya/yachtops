import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { signIn } from "@/lib/auth-config";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  
  // Only ADMIN and SUPER_ADMIN can impersonate
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    // Get the target user
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        yachtId: true,
        permissions: true,
        active: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!targetUser.active) {
      return NextResponse.json({ error: "User is inactive" }, { status: 400 });
    }

    // Store the original admin user ID in a cookie for later restoration
    const cookieStore = await cookies();
    cookieStore.set("impersonate_admin_id", session.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Return target user info - client will handle the sign-in
    return NextResponse.json({ 
      success: true,
      userId: targetUser.id,
      email: targetUser.email,
      username: targetUser.username,
    });
  } catch (error: any) {
    console.error("Impersonation error:", error);
    return NextResponse.json(
      { error: `Failed to impersonate user: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}


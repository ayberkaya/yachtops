import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email-verification";
import { hashPassword } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-auth-sync";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId, password } = body;

    if (!token || !userId || !password) {
      return NextResponse.json(
        { error: "Token, user ID, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Verify the token
    const verificationResult = await verifyEmailToken(token);

    if (!verificationResult || verificationResult.userId !== userId) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    if (!passwordHash) {
      console.error("❌ [SET-PASSWORD] Failed to hash password");
      return NextResponse.json(
        { error: "Failed to hash password" },
        { status: 500 }
      );
    }

    // Update user password and mark email as verified in a single transaction
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        active: true,
      },
    });

    // Verify password was saved correctly
    if (!updatedUser.passwordHash) {
      console.error("❌ [SET-PASSWORD] Password hash not saved correctly");
      return NextResponse.json(
        { error: "Failed to save password" },
        { status: 500 }
      );
    }

    console.log(`✅ [SET-PASSWORD] Password set successfully for user: ${updatedUser.email} (ID: ${updatedUser.id})`);
    console.log(`✅ [SET-PASSWORD] Email verified: ${updatedUser.emailVerified}, Active: ${updatedUser.active}`);

    // Update Supabase Auth password if available
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      try {
        // Get the Supabase user ID (UUID format)
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (user) {
          // Convert NextAuth ID to Supabase UUID format
          const { getUuidFromUserId } = await import("@/lib/supabase-auth-sync");
          const supabaseUserId = getUuidFromUserId(user.id);

          // Update password in Supabase Auth
          await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
            password: password,
            email_confirm: true,
          });
        }
      } catch (supabaseError) {
        console.error("Failed to update Supabase Auth password:", supabaseError);
        // Don't fail the entire operation if Supabase sync fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json(
      { error: "Failed to set password. Please try again." },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { removeUserFromSupabaseAuth } from "@/lib/supabase-auth-sync";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { active, role } = body ?? {};

  // Build update data
  const updateData: { active?: boolean; role?: UserRole } = {};
  
  if (typeof active === "boolean") {
    updateData.active = active;
  }
  
  if (role && Object.values(UserRole).includes(role as UserRole)) {
    updateData.role = role as UserRole;
  }

  // If no valid fields to update, return error
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "At least one field (active or role) must be provided" },
      { status: 400 }
    );
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      yachtId: true,
      active: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Cannot delete yourself
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  // Verify the user exists and has a yacht
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      yachtId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Only allow deletion of users who have a yacht (account creators)
  if (!user.yachtId) {
    return NextResponse.json(
      { error: "Cannot delete user without a yacht" },
      { status: 400 }
    );
  }

  try {
    // Delete the yacht first (this will cascade delete all related data)
    // Note: Cascade delete will handle:
    // - All users in the yacht (via yachtId foreign key with Cascade)
    // - All trips, tasks, expenses, etc. (via yachtId foreign keys with Cascade)
    await db.yacht.delete({
      where: { id: user.yachtId },
    });

    // Also remove from Supabase Auth
    try {
      await removeUserFromSupabaseAuth(id);
    } catch (error) {
      // Log error but don't fail the request if Supabase deletion fails
      // The user is already deleted from the database
      console.error("Failed to remove user from Supabase Auth:", error);
    }

    return NextResponse.json({ success: true, message: "User and associated yacht deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting owner:", error);
    
    // If yacht deletion fails, try to delete just the user
    if (user.yachtId && error && typeof error === "object" && "code" in error && error.code === "P2003") {
      try {
        await db.user.delete({
          where: { id },
        });
        
        // Also remove from Supabase Auth
        try {
          await removeUserFromSupabaseAuth(id);
        } catch (authError) {
          console.error("Failed to remove user from Supabase Auth:", authError);
        }
        
        return NextResponse.json({ success: true, message: "User deleted (yacht deletion failed)" });
      } catch (userDeleteError) {
        return NextResponse.json(
          { error: "Failed to delete owner and yacht" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


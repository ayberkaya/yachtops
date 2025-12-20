import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

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
  const { active } = body ?? {};
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "active boolean required" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id },
    data: { active },
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

  // Verify the user is an OWNER
  const owner = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      yachtId: true,
    },
  });

  if (!owner) {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  if (owner.role !== UserRole.OWNER) {
    return NextResponse.json(
      { error: "User is not an owner" },
      { status: 400 }
    );
  }

  try {
    // If owner has a yacht, delete the yacht first (this will cascade delete all related data)
    // Note: Cascade delete will handle:
    // - All users in the yacht (via yachtId foreign key with Cascade)
    // - All trips, tasks, expenses, etc. (via yachtId foreign keys with Cascade)
    if (owner.yachtId) {
      await db.yacht.delete({
        where: { id: owner.yachtId },
      });
    } else {
      // If no yacht, just delete the owner
      await db.user.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true, message: "Owner and associated yacht deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting owner:", error);
    
    // If yacht deletion fails, try to delete just the owner
    if (owner.yachtId && error.code === "P2003") {
      try {
        await db.user.delete({
          where: { id },
        });
        return NextResponse.json({ success: true, message: "Owner deleted (yacht deletion failed)" });
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


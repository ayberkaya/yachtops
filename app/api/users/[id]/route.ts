import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const updateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.array(z.string()).nullable().optional(),
  customRoleId: z.string().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if this is a password change request
    if (body.currentPassword && body.newPassword) {
      // User can only change their own password
      if (id !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const validated = changePasswordSchema.parse(body);

      // Verify current password
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { verifyPassword } = await import("@/lib/auth-server");
      const isValid = await verifyPassword(validated.currentPassword, user.passwordHash);

      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      // Update password
      const newPasswordHash = await hashPassword(validated.newPassword);
      await db.user.update({
        where: { id: session.user.id },
        data: { passwordHash: newPasswordHash },
      });

      return NextResponse.json({ success: true });
    }

    // Otherwise, this is a user update (only OWNER can do this)
    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // OWNER cannot be modified
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser.role === "OWNER" && id !== session!.user.id) {
      return NextResponse.json(
        { error: "Cannot modify owner user" },
        { status: 403 }
      );
    }

    console.log("📥 Received update request:", JSON.stringify(body, null, 2));
    const validated = updateUserSchema.parse(body);
    console.log("✅ Validated data:", JSON.stringify(validated, null, 2));

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.role !== undefined) updateData.role = validated.role;
    if (validated.permissions !== undefined) {
      // If permissions is null, clear custom permissions (use role defaults)
      // If permissions is an array, save it as JSON
      if (validated.permissions === null) {
        updateData.permissions = null;
        console.log("🔧 Setting permissions to null (use role defaults)");
      } else if (Array.isArray(validated.permissions)) {
        updateData.permissions = validated.permissions.length > 0 
          ? JSON.stringify(validated.permissions)
          : null;
        console.log("🔧 Setting permissions to:", updateData.permissions);
      }
    }
    if (validated.customRoleId !== undefined) {
      // Validate custom role belongs to the same vessel
      if (validated.customRoleId) {
        // STRICT TENANT ISOLATION: Ensure custom role belongs to same yacht
        if (!existingUser.yachtId) {
          return NextResponse.json(
            { error: "User must be assigned to a yacht" },
            { status: 400 }
          );
        }
        
        // Resolve tenant for scoped query
        const tenantResult = resolveTenantOrResponse(session, request);
        if (tenantResult instanceof NextResponse) {
          return tenantResult;
        }
        const { scopedSession } = tenantResult;
        
        const customRole = await db.customRole.findFirst({
          where: withTenantScope(scopedSession, {
            id: validated.customRoleId,
          }),
        });
        if (!customRole) {
          return NextResponse.json(
            { error: "Custom role not found or does not belong to this vessel" },
            { status: 400 }
          );
        }
      }
      updateData.customRoleId = validated.customRoleId;
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        customRoleId: true,
        customRole: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    if (!canManageUsers(session!.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Cannot delete yourself
    if (id === session!.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Cannot delete OWNER - check with tenant scope
    const user = await db.user.findUnique({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot delete owner user" },
        { status: 403 }
      );
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


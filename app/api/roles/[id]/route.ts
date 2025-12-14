import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageRoles } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { parsePermissions } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).min(0).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageRoles(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a vessel" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const role = await db.customRole.findFirst({
      where: {
        id,
        yachtId: tenantId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageRoles(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a vessel" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateRoleSchema.parse(body);

    // Check if role exists and belongs to the user's vessel
    const existingRole = await db.customRole.findFirst({
      where: {
        id,
        yachtId: tenantId,
      },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // If name is being updated, check for conflicts
    if (validated.name && validated.name !== existingRole.name) {
      const nameConflict = await db.customRole.findUnique({
        where: {
          yachtId_name: {
            yachtId: tenantId,
            name: validated.name,
          },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "A role with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Validate permissions if provided
    if (validated.permissions !== undefined) {
      const validPermissions = parsePermissions(JSON.stringify(validated.permissions));
      if (validPermissions.length !== validated.permissions.length) {
        return NextResponse.json(
          { error: "Invalid permissions provided" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.permissions !== undefined) {
      updateData.permissions = JSON.stringify(validated.permissions);
    }
    if (validated.active !== undefined) updateData.active = validated.active;

    const role = await db.customRole.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating role:", error);
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageRoles(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a vessel" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Check if role exists and belongs to the user's vessel
    const existingRole = await db.customRole.findFirst({
      where: {
        id,
        yachtId: tenantId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check if role is assigned to any users
    if (existingRole._count.users > 0) {
      // Instead of deleting, deactivate the role
      const role = await db.customRole.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ 
        message: "Role deactivated (users are still assigned to it)",
        role 
      });
    }

    // If no users assigned, delete the role
    await db.customRole.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


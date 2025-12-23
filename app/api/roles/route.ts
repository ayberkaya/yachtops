import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageRoles } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Permission, parsePermissions } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";

const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).min(0),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).min(0).optional(),
  active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow all authenticated users to view roles (for task assignment)
    // Only active roles are returned for task assignment purposes
    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a vessel" },
        { status: 400 }
      );
    }

    // First, get all roles (including inactive) to debug
    const allRoles = await db.customRole.findMany({
      where: {
        yachtId: tenantId,
      },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });
    
    console.log(`[API /roles] All custom roles for yacht ${tenantId}:`, allRoles);
    console.log(`[API /roles] Active roles:`, allRoles.filter((r: { active: boolean }) => r.active));
    console.log(`[API /roles] Inactive roles:`, allRoles.filter((r: { active: boolean }) => !r.active));

    // Then return only active roles
    const roles = await db.customRole.findMany({
      where: {
        yachtId: tenantId,
        active: true, // Only return active roles for task assignment
      },
      orderBy: [
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // Don't include _count for regular users (only for role management page)
        ...(canManageRoles(session.user) && {
          _count: {
            select: { users: true },
          },
        }),
      },
    });

    console.log(`[API /roles] Returning ${roles.length} active custom roles`);
    console.log(`[API /roles] Role names:`, roles.map((r: { name: string }) => r.name));

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can create roles
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

    const body = await request.json();
    console.log("📥 Received role creation request:", JSON.stringify(body, null, 2));
    
    // Validate with better error messages
    const validationResult = createRoleSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("❌ Validation error:", validationResult.error.issues);
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: validationResult.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }
    const validated = validationResult.data;

    // Validate permissions are valid
    const validPermissions = parsePermissions(JSON.stringify(validated.permissions));
    if (validPermissions.length !== validated.permissions.length) {
      return NextResponse.json(
        { error: "Invalid permissions provided" },
        { status: 400 }
      );
    }

    // Check if role name already exists for this vessel
    const existingRole = await db.customRole.findUnique({
      where: {
        yachtId_name: {
          yachtId: tenantId,
          name: validated.name,
        },
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    const role = await db.customRole.create({
      data: {
        yachtId: tenantId,
        name: validated.name,
        description: validated.description || null,
        permissions: JSON.stringify(validated.permissions),
        active: true,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


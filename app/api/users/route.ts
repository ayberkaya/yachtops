import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole),
  customRoleId: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
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

    const users = await db.user.findMany({
      where: withTenantScope(scopedSession, {}),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId } = tenantResult;
    
    if (!canManageUsers(session!.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    let validated;
    try {
      validated = userSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: validationError.issues },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(validated.password);
    const username = validated.email.split("@")[0];
    const ensuredTenantId = tenantId as string;

    // Validate custom role if provided
    if (validated.customRoleId) {
      const customRole = await db.customRole.findFirst({
        where: {
          id: validated.customRoleId,
          yachtId: ensuredTenantId,
          active: true,
        },
      });
      if (!customRole) {
        return NextResponse.json(
          { error: "Custom role not found or inactive" },
          { status: 400 }
        );
      }
    }

    const user = await db.user.create({
      data: {
        email: validated.email,
        username,
        passwordHash,
        name: validated.name || null,
        role: validated.role,
        customRoleId: validated.customRoleId || null,
        permissions: validated.permissions ? JSON.stringify(validated.permissions) : null,
        yachtId: ensuredTenantId,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


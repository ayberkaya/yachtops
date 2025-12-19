import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const categories = await db.expenseCategory.findMany({
      where: withTenantScope(scopedSession, {}),
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
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
    const ensuredTenantId = tenantId;

    const body = await request.json();
    const validated = categorySchema.parse(body);

    // Check if category already exists for this yacht
    const existing = await db.expenseCategory.findUnique({
      where: {
        yachtId_name: {
          yachtId: ensuredTenantId,
          name: validated.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      );
    }

    const category = await db.expenseCategory.create({
      data: {
        name: validated.name,
        yachtId: ensuredTenantId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


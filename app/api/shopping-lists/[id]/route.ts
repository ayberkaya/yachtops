import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ShoppingListStatus } from "@prisma/client";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ShoppingListStatus).optional(),
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

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const list = await db.shoppingList.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching shopping list:", error);
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

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateListSchema.parse(body);

    const existingList = await db.shoppingList.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!existingList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.status !== undefined) updateData.status = validated.status;

    const list = await db.shoppingList.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating shopping list:", error);
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

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const list = await db.shoppingList.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    await db.shoppingList.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


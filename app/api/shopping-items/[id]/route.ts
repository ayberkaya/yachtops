import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ItemUnit } from "@prisma/client";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.nativeEnum(ItemUnit).optional(),
  isCompleted: z.boolean().optional(),
  notes: z.string().optional().nullable(),
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
    const item = await db.shoppingItem.findUnique({
      where: { id },
      include: {
        list: {
          select: {
            id: true,
            yachtId: true,
          },
        },
      },
    });

    if (!item || item.list.yachtId !== tenantId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching shopping item:", error);
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
    const validated = updateItemSchema.parse(body);

    const existingItem = await db.shoppingItem.findUnique({
      where: { id },
      include: {
        list: {
          select: {
            id: true,
            yachtId: true,
          },
        },
      },
    });

    if (!existingItem || existingItem.list.yachtId !== tenantId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.quantity !== undefined) updateData.quantity = validated.quantity;
    if (validated.unit !== undefined) updateData.unit = validated.unit;
    if (validated.isCompleted !== undefined) updateData.isCompleted = validated.isCompleted;
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const item = await db.shoppingItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating shopping item:", error);
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
    const item = await db.shoppingItem.findUnique({
      where: { id },
      include: {
        list: {
          select: {
            id: true,
            yachtId: true,
          },
        },
      },
    });

    if (!item || item.list.yachtId !== tenantId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await db.shoppingItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


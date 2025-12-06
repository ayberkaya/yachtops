import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const updateStockSchema = z.object({
  category: z.enum(["WINE", "SPIRITS", "BEER"]).optional().nullable(),
  quantity: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
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

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateStockSchema.parse(body);

    const existing = await db.alcoholStock.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.category !== undefined) {
      updateData.category = validated.category;
    }
    if (validated.quantity !== undefined) {
      updateData.quantity = validated.quantity;
    }
    if (validated.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = validated.lowStockThreshold;
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes;
    }

    // Track quantity changes in history
    if (validated.quantity !== undefined && validated.quantity !== existing.quantity) {
      const quantityChange = validated.quantity - existing.quantity;
      const changeType = quantityChange > 0 ? "ADD" : quantityChange < 0 ? "REMOVE" : "SET";
      
      await db.alcoholStockHistory.create({
        data: {
          stockId: id,
          userId: session.user.id,
          changeType,
          quantityBefore: existing.quantity,
          quantityAfter: validated.quantity,
          quantityChange,
          notes: `Stock ${changeType.toLowerCase()}ed`,
        },
      });
    }

    const stock = await db.alcoholStock.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(stock);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating alcohol stock:", error);
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

    const existing = await db.alcoholStock.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    await db.alcoholStock.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alcohol stock:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


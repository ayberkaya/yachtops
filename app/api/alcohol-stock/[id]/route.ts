import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const updateStockSchema = z.object({
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

    const { id } = await params;
    const body = await request.json();
    const validated = updateStockSchema.parse(body);

    const existing = await db.alcoholStock.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.quantity !== undefined) {
      updateData.quantity = validated.quantity;
    }
    if (validated.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = validated.lowStockThreshold;
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes;
    }

    const stock = await db.alcoholStock.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(stock);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
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

    const { id } = await params;

    const existing = await db.alcoholStock.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
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


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const alcoholStockSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["WINE", "SPIRITS", "BEER"]).optional().nullable(),
  quantity: z.number().min(0).default(0),
  unit: z.string().default("bottle"),
  lowStockThreshold: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stocks = await db.alcoholStock.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("Error fetching alcohol stock:", error);
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

    if (!session.user.yachtId) {
      return NextResponse.json(
        { error: "User must be assigned to a yacht" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = alcoholStockSchema.parse(body);

    // Check if stock with same name already exists
    const existing = await db.alcoholStock.findUnique({
      where: {
        yachtId_name: {
          yachtId: session.user.yachtId,
          name: validated.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Alcohol stock with this name already exists" },
        { status: 400 }
      );
    }

    const stock = await db.alcoholStock.create({
      data: {
        yachtId: session.user.yachtId,
        name: validated.name,
        category: validated.category || null,
        quantity: validated.quantity,
        unit: validated.unit,
        lowStockThreshold: validated.lowStockThreshold || null,
        notes: validated.notes || null,
      },
    });

    // Create initial history entry if quantity > 0
    if (validated.quantity > 0) {
      await db.alcoholStockHistory.create({
        data: {
          stockId: stock.id,
          userId: session.user.id,
          changeType: "SET",
          quantityBefore: 0,
          quantityAfter: validated.quantity,
          quantityChange: validated.quantity,
          notes: "Initial stock",
        },
      });
    }

    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating alcohol stock:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


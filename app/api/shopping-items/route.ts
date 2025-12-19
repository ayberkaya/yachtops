import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ItemUnit } from "@prisma/client";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const itemSchema = z.object({
  listId: z.string().min(1, "List is required"),
  productId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.nativeEnum(ItemUnit),
  notes: z.string().optional().nullable(),
});

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.nativeEnum(ItemUnit).optional(),
  isCompleted: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;
    
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");

    if (!listId) {
      return NextResponse.json({ error: "listId is required" }, { status: 400 });
    }

    // Verify list belongs to yacht
    const list = await db.shoppingList.findFirst({
      where: withTenantScope(scopedSession, { id: listId }),
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const items = await db.shoppingItem.findMany({
      where: { listId },
      orderBy: [
        { isCompleted: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching shopping items:", error);
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
    const { scopedSession } = tenantResult;

    const body = await request.json();
    const validated = itemSchema.parse(body);

    // Verify list belongs to yacht
    const list = await db.shoppingList.findFirst({
      where: withTenantScope(scopedSession, { id: validated.listId }),
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const item = await db.shoppingItem.create({
      data: {
        listId: validated.listId,
        productId: validated.productId || null,
        name: validated.name,
        quantity: validated.quantity,
        unit: validated.unit,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating shopping item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


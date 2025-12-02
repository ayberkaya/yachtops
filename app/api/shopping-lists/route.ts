import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ShoppingListStatus } from "@prisma/client";
import { z } from "zod";

const listSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ShoppingListStatus).optional(),
});

const updateListSchema = listSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      yachtId: session.user.yachtId || undefined,
    };

    if (status) {
      where.status = status;
    }

    const lists = await db.shoppingList.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching shopping lists:", error);
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
    const validated = listSchema.parse(body);

    const list = await db.shoppingList.create({
      data: {
        yachtId: session.user.yachtId,
        name: validated.name,
        description: validated.description || null,
        status: validated.status || ShoppingListStatus.DRAFT,
        createdByUserId: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating shopping list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


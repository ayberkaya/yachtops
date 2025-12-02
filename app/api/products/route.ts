import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ItemUnit } from "@prisma/client";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultUnit: z.nativeEnum(ItemUnit).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await db.product.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
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
    const validated = productSchema.parse(body);

    const product = await db.product.create({
      data: {
        yachtId: session.user.yachtId,
        name: validated.name,
        defaultUnit: validated.defaultUnit || ItemUnit.PIECE,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


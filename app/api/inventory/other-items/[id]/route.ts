import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { z } from "zod";

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["SAFETY_EQUIPMENT", "WATER_SPORTS", "DECK_EQUIPMENT", "OTHER"]).optional().nullable(),
  quantity: z.number().min(0).optional(),
  unit: z.enum(["PIECE", "SET", "PAIR", "BOX", "OTHER"]).optional(),
  location: z.string().optional().nullable(),
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
    const validatedData = updateItemSchema.parse(body);

    // TODO: Replace with actual database update when OtherItem model is created
    // const item = await db.otherItem.findFirst({
    //   where: { id, yachtId: session.user.yachtId },
    // });
    // if (!item) {
    //   return NextResponse.json({ error: "Item not found" }, { status: 404 });
    // }
    // const updatedItem = await db.otherItem.update({
    //   where: { id },
    //   data: validatedData,
    // });

    // For now, return a mock response
    const mockUpdatedItem = {
      id,
      ...validatedData,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(mockUpdatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating other item:", error);
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

    // TODO: Replace with actual database delete when OtherItem model is created
    // const item = await db.otherItem.findFirst({
    //   where: { id, yachtId: session.user.yachtId },
    // });
    // if (!item) {
    //   return NextResponse.json({ error: "Item not found" }, { status: 404 });
    // }
    // await db.otherItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting other item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


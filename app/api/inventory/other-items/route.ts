import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { z } from "zod";

// TODO: Replace with actual database model when OtherItem model is created
// For now, this is a placeholder that returns empty arrays
const otherItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["SAFETY_EQUIPMENT", "WATER_SPORTS", "DECK_EQUIPMENT", "OTHER"]).optional().nullable(),
  quantity: z.number().min(0).default(0),
  unit: z.enum(["PIECE", "SET", "PAIR", "BOX", "OTHER"]).default("PIECE"),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Replace with actual database query when OtherItem model is created
    // const items = await db.otherItem.findMany({
    //   where: { yachtId: session.user.yachtId },
    //   orderBy: { name: "asc" },
    // });
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching other items:", error);
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
        { error: "User must be associated with a yacht" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = otherItemSchema.parse(body);

    // TODO: Replace with actual database insert when OtherItem model is created
    // const newItem = await db.otherItem.create({
    //   data: {
    //     yachtId: session.user.yachtId,
    //     ...validatedData,
    //   },
    // });

    // For now, return a mock response
    const mockItem = {
      id: `mock-${Date.now()}`,
      yachtId: session.user.yachtId,
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(mockItem, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating other item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


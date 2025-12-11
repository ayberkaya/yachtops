import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { z } from "zod";

const updateStockSchema = z.object({
  category: z.enum(["DETERGENTS", "DISINFECTANTS", "TOOLS", "CLOTHS", "PAPER_PRODUCTS", "SPECIALTY", "OTHER"]).optional().nullable(),
  quantity: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional().nullable(),
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
    const validated = updateStockSchema.parse(body);

    // TODO: Replace with actual database update when CleaningStock model is created
    return NextResponse.json({
      id,
      ...validated,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating cleaning stock:", error);
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

    // TODO: Replace with actual database delete when CleaningStock model is created
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cleaning stock:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

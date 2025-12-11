import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Replace with actual database query when FoodStockHistory model is created
    // const history = await db.foodStockHistory.findMany({...});
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching food stock history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

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

    // Verify stock belongs to user's yacht
    const stock = await db.alcoholStock.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    // Get history for this stock
    const history = await db.alcoholStockHistory.findMany({
      where: { stockId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to last 100 entries
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching alcohol stock history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


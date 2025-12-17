import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";

/**
 * Get low stock count without fetching full alcohol stock objects
 * Reduces bandwidth by only returning a number
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    if (!hasPermission(session.user, "inventory.alcohol.view", session.user.permissions)) {
      return NextResponse.json({ count: 0 });
    }

    // Get all alcohol stocks with only quantity and threshold fields
    const stocks = await db.alcoholStock.findMany({
      where: {
        yachtId: tenantId,
      },
      select: {
        quantity: true,
        lowStockThreshold: true,
      },
    });

    // Count low stock items
    const count = stocks.filter(
      (stock: { quantity: number | null; lowStockThreshold: number | null }) =>
        stock.lowStockThreshold !== null &&
        stock.lowStockThreshold !== undefined &&
        Number(stock.quantity) <= Number(stock.lowStockThreshold)
    ).length;

    return NextResponse.json({ count }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error("Error fetching low stock count:", error);
    return NextResponse.json(
      { error: "Internal server error", count: 0 },
      { status: 500 }
    );
  }
}


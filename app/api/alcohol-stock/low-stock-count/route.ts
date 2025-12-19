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

    // Count low stock items directly in database using raw SQL (much faster)
    // Prisma doesn't support column-to-column comparisons in WHERE clauses
    const result = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM alcohol_stocks
      WHERE yacht_id = ${tenantId}::text
        AND low_stock_threshold IS NOT NULL
        AND (quantity IS NULL OR quantity <= low_stock_threshold)
    `;

    const count = Number(result[0]?.count || 0);

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


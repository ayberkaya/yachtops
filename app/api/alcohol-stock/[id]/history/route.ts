import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;

    // Verify stock belongs to user's yacht
    const stock = await db.alcoholStock.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
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


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { ExpenseStatus } from "@prisma/client";

/**
 * Get expense counts without fetching full expense objects
 * Reduces bandwidth significantly by only returning numbers
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

    const counts: {
      pending?: number;
      reimbursable?: number;
    } = {};

    // Pending expenses count (only if user has approve permission)
    if (hasPermission(session.user, "expenses.approve", session.user.permissions)) {
      counts.pending = await db.expense.count({
        where: {
          yachtId: tenantId,
          status: ExpenseStatus.SUBMITTED,
          deletedAt: null,
        },
      });
    }

    // Reimbursable expenses count (only if user has view permission)
    if (hasPermission(session.user, "expenses.view", session.user.permissions)) {
      counts.reimbursable = await db.expense.count({
        where: {
          yachtId: tenantId,
          isReimbursable: true,
          isReimbursed: false,
          deletedAt: null,
        },
      });
    }

    return NextResponse.json(counts, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("Error fetching expense counts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


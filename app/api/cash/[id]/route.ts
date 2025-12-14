import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { createAuditLog } from "@/lib/audit-log";
import { hasPermission } from "@/lib/permissions";
import { canManageUsers } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId && !isPlatformAdmin(session)) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 400 });
    }

    // Only admins/owners/captains can delete cash transactions
    if (!canManageUsers(session.user) && !hasPermission(session.user, "expenses.delete", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Transaction id is required" }, { status: 400 });
    }

    // Find the transaction (including soft-deleted ones)
    const existingTransaction = await db.cashTransaction.findFirst({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
      include: {
        expense: {
          select: {
            id: true,
            status: true,
            description: true,
          },
        },
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Check if already deleted
    if (existingTransaction.deletedAt) {
      return NextResponse.json(
        { error: "Transaction is already deleted" },
        { status: 400 }
      );
    }

    // Prevent deletion if linked to an approved expense
    if (existingTransaction.expenseId && existingTransaction.expense) {
      if (existingTransaction.expense.status === "APPROVED") {
        return NextResponse.json(
          {
            error: "Cannot delete cash transaction linked to an approved expense. Please contact an administrator.",
          },
          { status: 400 }
        );
      }
    }

    // Soft delete
    await db.cashTransaction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedByUserId: session.user.id,
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: tenantId!,
      userId: session.user.id,
      action: AuditAction.DELETE,
      entityType: "CashTransaction",
      entityId: id,
      description: `Cash transaction deleted: ${existingTransaction.type} ${existingTransaction.amount} ${existingTransaction.currency}`,
      request,
    });

    return NextResponse.json({ success: true, message: "Cash transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting cash transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


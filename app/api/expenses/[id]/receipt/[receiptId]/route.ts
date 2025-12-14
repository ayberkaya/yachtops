import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; receiptId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id, receiptId } = await params;

    // Find the expense
    const expense = await db.expense.findFirst({
      where: {
        id,
        yachtId: tenantId,
        deletedAt: null,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Find the receipt
    const receipt = await db.expenseReceipt.findFirst({
      where: {
        id: receiptId,
        expenseId: id,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Check if already deleted
    if (receipt.deletedAt) {
      return NextResponse.json(
        { error: "Receipt is already deleted" },
        { status: 400 }
      );
    }

    // Check permissions - expense creator or document delete permission
    const canDelete = 
      expense.createdByUserId === session.user.id ||
      hasPermission(session.user, "documents.delete", session.user.permissions);

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete
    await db.expenseReceipt.update({
      where: { id: receiptId },
      data: {
        deletedAt: new Date(),
        deletedByUserId: session.user.id,
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: tenantId,
      userId: session.user.id,
      action: AuditAction.DELETE,
      entityType: "ExpenseReceipt",
      entityId: receiptId,
      description: `Receipt deleted for expense: ${expense.description}`,
      request,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Receipt deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting expense receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


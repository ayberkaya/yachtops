import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { ExpenseStatus, PaidBy, PaymentMethod, CashTransactionType, AuditAction } from "@prisma/client";
import { z } from "zod";
import { withEgressLogging } from "@/lib/egress-middleware";
import { createAuditLog } from "@/lib/audit-log";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const updateExpenseSchema = z.object({
  tripId: z.string().optional().nullable(),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidBy: z.nativeEnum(PaidBy).optional(),
  creditCardId: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  isReimbursable: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(ExpenseStatus).optional(),
  rejectReason: z.string().optional().nullable(),
  isReimbursed: z.boolean().optional(),
  reimbursedAt: z.string().optional().nullable(),
});

export const GET = withEgressLogging(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, scopedSession } = tenantResult;

    const { id } = await params || {};
    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "Expense id is required" },
        { status: 400 }
      );
    }
    
    const expense = await db.expense.findFirst({
      where: withTenantScope(scopedSession, {
        id,
        deletedAt: null, // Exclude soft-deleted expenses
      }),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true },
        },
        trip: {
          select: { id: true, name: true },
        },
        creditCard: {
          select: { id: true, ownerName: true, lastFourDigits: true },
        },
        receipts: {
          where: { deletedAt: null },
          select: { id: true, uploadedAt: true }, // REMOVED: fileUrl - use /api/expenses/receipts/[id] for file data
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const PATCH = withEgressLogging(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, scopedSession } = tenantResult;

    // Defensive: if params.id missing, derive from URL path as a fallback
    const pathParts = new URL(request.url).pathname.split("/");
    const fallbackId = pathParts[pathParts.length - 1] || undefined;
    const resolvedParams = await params;
    const id = resolvedParams?.id ?? fallbackId;
    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json(
        { error: "Expense id is required" },
        { status: 400 }
      );
    }
    console.log("Expense ID:", id);
    let body;
    try {
      body = await request.json();
      console.log("Received request body:", body);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    let validated;
    try {
      validated = updateExpenseSchema.parse(body);
      console.log("Validated data:", validated);
    } catch (error) {
      console.error("Validation error:", error);
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    // Check if expense exists and user has access (exclude soft-deleted)
    const existingExpense = await db.expense.findFirst({
      where: withTenantScope(scopedSession, {
        id,
        deletedAt: null, // Exclude soft-deleted expenses
      }),
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Check permissions for editing
    const canEdit = 
      existingExpense.createdByUserId === session!.user.id ||
      hasPermission(session!.user, "expenses.edit", session!.user.permissions);
    // Check approval permission - SUPER_ADMIN, OWNER, and CAPTAIN can always approve
    // Also check explicit permission via hasPermission
    const canApprove = 
      session!.user.role === "SUPER_ADMIN" ||
      session!.user.role === "OWNER" ||
      session!.user.role === "CAPTAIN" ||
      hasPermission(session!.user, "expenses.approve", session!.user.permissions);

    // Determine if this is a status-only change (approve/reject)
    // Check which fields are actually being updated (not undefined)
    const fieldsBeingUpdated = Object.keys(validated).filter(
      key => validated[key as keyof typeof validated] !== undefined
    );
    const isStatusOnlyChange = validated.status !== undefined && 
      fieldsBeingUpdated.length === 1 && 
      fieldsBeingUpdated[0] === 'status';

    // If not a status-only change, require edit or approve permission
    if (!isStatusOnlyChange && !canEdit && !canApprove) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      updatedByUserId: session!.user.id,
    };
    
    // Track changes for audit log
    const changes: any = {};

    // Handle status updates for approval/rejection
    if (validated.status) {
      if (!canApprove) {
        console.error("Approval denied:", {
          userId: session!.user.id,
          role: session!.user.role,
          permissions: session!.user.permissions,
        });
        return NextResponse.json({ 
          error: "Forbidden: You do not have permission to approve expenses" 
        }, { status: 403 });
      }

      if (
        validated.status === ExpenseStatus.APPROVED ||
        validated.status === ExpenseStatus.REJECTED
      ) {
        if (existingExpense.status !== ExpenseStatus.SUBMITTED) {
          return NextResponse.json(
            { error: "Can only approve/reject submitted expenses" },
            { status: 400 }
          );
        }

        // If approving and paid by Vessel, check cash balance and create transaction
        if (validated.status === ExpenseStatus.APPROVED && existingExpense.paidBy === PaidBy.VESSEL) {
          // Check if cash transaction already exists (to prevent duplicate)
          const existingCashTransaction = await db.cashTransaction.findFirst({
            where: {
              expenseId: existingExpense.id,
            },
          });

          if (!existingCashTransaction) {
            // Check cash balance
            const cashTransactions = await db.cashTransaction.findMany({
              where: withTenantScope(scopedSession, {}),
            });

            const balance = cashTransactions.reduce((acc: number, transaction: (typeof cashTransactions)[number]) => {
              if (transaction.type === CashTransactionType.DEPOSIT) {
                return acc + transaction.amount;
              } else {
                return acc - transaction.amount;
              }
            }, 0);

            if (balance < existingExpense.amount) {
              return NextResponse.json(
                {
                  error: "Insufficient cash balance",
                  balance,
                  required: existingExpense.amount,
                },
                { status: 400 }
              );
            }

            // Create cash withdrawal transaction
            if (!tenantId) {
              return NextResponse.json(
                { error: "User must be assigned to a tenant" },
                { status: 400 }
              );
            }

            await db.cashTransaction.create({
              data: {
                yachtId: tenantId,
                type: CashTransactionType.WITHDRAWAL,
                amount: existingExpense.amount,
                currency: existingExpense.currency,
                description: `Expense: ${existingExpense.description}`,
                expenseId: existingExpense.id,
                createdByUserId: session!.user.id,
              },
            });
          }
        }

        updateData.status = validated.status;
        updateData.approvedByUserId =
          validated.status === ExpenseStatus.APPROVED
            ? session!.user.id
            : null;

        changes.status = { from: existingExpense.status, to: validated.status };
        
        if (validated.status === ExpenseStatus.APPROVED) {
          changes.approvedBy = session!.user.id;
        }

        // If rejecting, add reject reason to notes
        if (validated.status === ExpenseStatus.REJECTED && validated.rejectReason) {
          const existingNotes = existingExpense.notes || "";
          const rejectNote = `Rejection reason: ${validated.rejectReason}`;
          updateData.notes = existingNotes
            ? `${existingNotes}\n\n${rejectNote}`
            : rejectNote;
          changes.rejectReason = validated.rejectReason;
        }
      }
    }

    // Handle reimbursed status updates
    if (validated.isReimbursed !== undefined) {
      changes.isReimbursed = { from: existingExpense.isReimbursed, to: validated.isReimbursed };
      updateData.isReimbursed = validated.isReimbursed;
      updateData.reimbursedAt = validated.isReimbursed 
        ? (validated.reimbursedAt ? new Date(validated.reimbursedAt) : new Date())
        : null;

      // If marking as reimbursed, create cash withdrawal transaction
      // Allow negative balance - no balance check
      if (validated.isReimbursed && !existingExpense.isReimbursed) {
        // Check if cash transaction already exists for this expense (to prevent duplicate)
        const existingCashTransaction = await db.cashTransaction.findFirst({
          where: {
            expenseId: existingExpense.id,
            deletedAt: null,
          },
        });

        if (!existingCashTransaction && tenantId) {
          // Create cash withdrawal transaction (no balance check - allow negative)
          await db.cashTransaction.create({
            data: {
              yachtId: tenantId,
              type: CashTransactionType.WITHDRAWAL,
              amount: existingExpense.amount,
              currency: existingExpense.currency,
              description: `Reimbursement: ${existingExpense.description}`,
              expenseId: existingExpense.id,
              createdByUserId: session!.user.id,
            },
          });

          // Invalidate cash cache
          const { invalidateCash } = await import("@/lib/server-cache");
          invalidateCash(tenantId);
        }
      }
      // Note: If unmarking as reimbursed (isReimbursed: false), we don't delete the cash transaction
      // to maintain audit trail. The transaction remains in the ledger.
    }

    // Handle other field updates
    if (validated.tripId !== undefined) {
      updateData.tripId = validated.tripId;
    }
    if (validated.date !== undefined) {
      updateData.date = new Date(validated.date);
    }
    if (validated.categoryId !== undefined) {
      updateData.categoryId = validated.categoryId;
    }
    if (validated.description !== undefined) {
      updateData.description = validated.description;
    }
    if (validated.amount !== undefined) {
      updateData.amount = validated.amount;
    }
    if (validated.currency !== undefined) {
      updateData.currency = validated.currency;
    }
    if (validated.paymentMethod !== undefined) {
      updateData.paymentMethod = validated.paymentMethod;
    }
    if (validated.paidBy !== undefined) {
      updateData.paidBy = validated.paidBy;
    }
    if (validated.creditCardId !== undefined) {
      updateData.creditCardId = validated.creditCardId;
    }
    if (validated.vendorName !== undefined) {
      updateData.vendorName = validated.vendorName;
    }
    if (validated.invoiceNumber !== undefined) {
      updateData.invoiceNumber = validated.invoiceNumber;
    }
    if (validated.isReimbursable !== undefined) {
      updateData.isReimbursable = validated.isReimbursable;
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes;
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      console.log("No update data, returning existing expense");
      return NextResponse.json({
        ...existingExpense,
        date: existingExpense.date.toISOString(),
        createdAt: existingExpense.createdAt.toISOString(),
        updatedAt: existingExpense.updatedAt.toISOString(),
        reimbursedAt: existingExpense.reimbursedAt ? existingExpense.reimbursedAt.toISOString() : null,
      });
    }

    console.log("Updating expense with data:", JSON.stringify(updateData, null, 2));

    let expense;
    try {
      expense = await db.expense.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          approvedBy: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          trip: {
            select: { id: true, name: true },
          },
        },
      });
      
      // Create audit log
      await createAuditLog({
        yachtId: tenantId!,
        userId: session!.user.id,
        action: validated.status === ExpenseStatus.APPROVED 
          ? AuditAction.APPROVE 
          : validated.status === ExpenseStatus.REJECTED 
          ? AuditAction.REJECT 
          : AuditAction.UPDATE,
        entityType: "Expense",
        entityId: id,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        description: validated.status === ExpenseStatus.APPROVED 
          ? `Expense approved: ${existingExpense.description}`
          : validated.status === ExpenseStatus.REJECTED
          ? `Expense rejected: ${existingExpense.description}`
          : `Expense updated: ${existingExpense.description}`,
        request,
      });
      
      // Revalidate expense pages to immediately show updated data
      revalidatePath('/dashboard/expenses');
      revalidatePath('/dashboard/expenses/pending');
      
      console.log("Expense updated successfully");
    } catch (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    // Serialize dates properly for JSON response
    try {
      const response = {
        ...expense,
        date: expense.date.toISOString(),
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
        reimbursedAt: expense.reimbursedAt ? expense.reimbursedAt.toISOString() : null,
      };
      console.log("Returning response");
      return NextResponse.json(response);
    } catch (serializeError) {
      console.error("Error serializing response:", serializeError);
      throw serializeError;
    }
  } catch (error) {
    console.error("=== ERROR IN PATCH EXPENSE ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.issues);
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse = {
      error: "Internal server error",
      details: errorMessage,
      timestamp: new Date().toISOString(),
    };
    
    console.error("Returning error response:", errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
});

export const DELETE = withEgressLogging(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, scopedSession } = tenantResult;

    const { id } = await params;
    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json(
        { error: "Expense id is required" },
        { status: 400 }
      );
    }

    // Check permissions
    if (!hasPermission(session!.user, "expenses.delete", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the expense (including soft-deleted ones for restore check)
    const existingExpense = await db.expense.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Check if already deleted
    if (existingExpense.deletedAt) {
      return NextResponse.json(
        { error: "Expense is already deleted" },
        { status: 400 }
      );
    }

    // Check for cash transaction and handle refund if needed
    const cashTransaction = existingExpense.status === ExpenseStatus.APPROVED
      ? await db.cashTransaction.findFirst({
          where: {
            expenseId: existingExpense.id,
            deletedAt: null,
          },
        })
      : null;

    let refundTransactionId: string | null = null;

    // If expense has a cash transaction, create a refund (DEPOSIT) to restore balance
    if (cashTransaction && existingExpense.status === ExpenseStatus.APPROVED) {
      try {
        // Create refund transaction (DEPOSIT) to restore the cash balance
        const refundTransaction = await db.cashTransaction.create({
          data: {
            yachtId: tenantId!,
            type: CashTransactionType.DEPOSIT,
            amount: existingExpense.amount,
            currency: existingExpense.currency,
            description: `Refund: Expense removed - ${existingExpense.description}`,
            createdByUserId: session!.user.id,
          },
        });
        refundTransactionId = refundTransaction.id;

        // Soft delete the original withdrawal transaction
        await db.cashTransaction.update({
          where: { id: cashTransaction.id },
          data: {
            deletedAt: new Date(),
            deletedByUserId: session!.user.id,
          },
        });
      } catch (error) {
        // If refund creation fails, rollback by deleting the refund transaction if it was created
        if (refundTransactionId) {
          await db.cashTransaction.delete({ where: { id: refundTransactionId } }).catch(() => {});
        }
        throw error;
      }
    }

    // Soft delete the expense
    try {
      await db.expense.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedByUserId: session!.user.id,
        },
      });
    } catch (error) {
      // If expense deletion fails, rollback refund if it was created
      if (refundTransactionId) {
        await db.cashTransaction.delete({ where: { id: refundTransactionId } }).catch(() => {});
        if (cashTransaction) {
          await db.cashTransaction.update({
            where: { id: cashTransaction.id },
            data: { deletedAt: null, deletedByUserId: null },
          }).catch(() => {});
        }
      }
      throw error;
    }

    // Create audit log
    const auditDescription = cashTransaction
      ? `Expense deleted with cash refund: ${existingExpense.description} (${existingExpense.amount} ${existingExpense.currency}) - Cash balance restored`
      : `Expense deleted: ${existingExpense.description} (${existingExpense.amount} ${existingExpense.currency})`;

    await createAuditLog({
      yachtId: tenantId!,
      userId: session!.user.id,
      action: AuditAction.DELETE,
      entityType: "Expense",
      entityId: id,
      description: auditDescription,
      request,
    });

    return NextResponse.json({ 
      success: true, 
      message: cashTransaction 
        ? "Expense deleted successfully. Cash balance has been restored."
        : "Expense deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});


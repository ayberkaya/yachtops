import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canApproveExpenses } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExpenseStatus, PaidBy, CashTransactionType } from "@prisma/client";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const updateExpenseSchema = z.object({
  status: z.nativeEnum(ExpenseStatus).optional(),
  rejectReason: z.string().optional().nullable(),
  isReimbursed: z.boolean().optional(),
  reimbursedAt: z.string().optional().nullable(),
  // Add other fields that can be updated
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params || {};
    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "Expense id is required" },
        { status: 400 }
      );
    }
    const expense = await db.expense.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
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
        receipts: {
          select: { id: true, fileUrl: true, uploadedAt: true },
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);

    // Defensive: if params.id missing, derive from URL path as a fallback
    const pathParts = new URL(request.url).pathname.split("/");
    const fallbackId = pathParts[pathParts.length - 1] || undefined;
    const id = params?.id ?? fallbackId;
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

    // Determine tenant scope
    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    // Check if expense exists and user has access
    const existingExpense = await db.expense.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    // Handle status updates for approval/rejection
    if (validated.status) {
      if (!canApproveExpenses(session.user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
              where: {
                yachtId: tenantId || undefined,
              },
            });

            const balance = cashTransactions.reduce((acc, transaction) => {
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
                createdByUserId: session.user.id,
              },
            });
          }
        }

        updateData.status = validated.status;
        updateData.approvedByUserId =
          validated.status === ExpenseStatus.APPROVED
            ? session.user.id
            : null;

        // If rejecting, add reject reason to notes
        if (validated.status === ExpenseStatus.REJECTED && validated.rejectReason) {
          const existingNotes = existingExpense.notes || "";
          const rejectNote = `Rejection reason: ${validated.rejectReason}`;
          updateData.notes = existingNotes
            ? `${existingNotes}\n\n${rejectNote}`
            : rejectNote;
        }
      }
    }

    // Handle reimbursed status updates
    if (validated.isReimbursed !== undefined) {
      updateData.isReimbursed = validated.isReimbursed;
      updateData.reimbursedAt = validated.isReimbursed 
        ? (validated.reimbursedAt ? new Date(validated.reimbursedAt) : new Date())
        : null;
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
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canApproveExpenses } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExpenseStatus, PaidBy, CashTransactionType } from "@prisma/client";
import { z } from "zod";

const updateExpenseSchema = z.object({
  status: z.nativeEnum(ExpenseStatus).optional(),
  rejectReason: z.string().optional().nullable(),
  isReimbursed: z.boolean().optional(),
  reimbursedAt: z.string().optional().nullable(),
  // Add other fields that can be updated
});

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
    const expense = await db.expense.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateExpenseSchema.parse(body);

    // Check if expense exists and user has access
    const existingExpense = await db.expense.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Only allow status updates for approval/rejection
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
                yachtId: session.user.yachtId || undefined,
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
            if (!session.user.yachtId) {
              return NextResponse.json(
                { error: "User must be assigned to a yacht" },
                { status: 400 }
              );
            }

            await db.cashTransaction.create({
              data: {
                yachtId: session.user.yachtId,
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

        // Prepare update data
        const updateData: any = {
          status: validated.status,
          approvedByUserId:
            validated.status === ExpenseStatus.APPROVED
              ? session.user.id
              : null,
        };

        // If rejecting, add reject reason to notes
        if (validated.status === ExpenseStatus.REJECTED && validated.rejectReason) {
          const existingNotes = existingExpense.notes || "";
          const rejectNote = `Rejection reason: ${validated.rejectReason}`;
          updateData.notes = existingNotes
            ? `${existingNotes}\n\n${rejectNote}`
            : rejectNote;
        }

        const expense = await db.expense.update({
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

        return NextResponse.json(expense);
      }
    }

    return NextResponse.json(existingExpense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


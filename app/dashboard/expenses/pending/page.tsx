import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canApproveExpenses } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExpenseStatus } from "@prisma/client";
import { PendingExpensesList } from "@/components/expenses/pending-expenses-list";
import { hasPermission } from "@/lib/permissions";

export default async function PendingExpensesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.approve", session.user.permissions)) {
    redirect("/dashboard");
  }

  const pendingExpenses = await db.expense.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
      status: ExpenseStatus.SUBMITTED,
      deletedAt: null, // Exclude soft-deleted expenses
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      category: {
        select: { id: true, name: true },
      },
      trip: {
        select: { id: true, name: true },
      },
      receipts: {
        where: { deletedAt: null }, // Exclude soft-deleted receipts
        select: { id: true, fileUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approval Queue</h1>
        <p className="text-muted-foreground">Review, approve, or reject submitted expenses</p>
      </div>
      <PendingExpensesList 
        expenses={pendingExpenses.map(exp => ({
          ...exp,
          date: exp.date.toISOString().split('T')[0],
          createdAt: exp.createdAt.toISOString(),
          updatedAt: exp.updatedAt.toISOString(),
        }))} 
      />
    </div>
  );
}


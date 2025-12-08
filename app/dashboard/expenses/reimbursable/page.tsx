import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ReimbursableExpensesList } from "@/components/expenses/reimbursable-expenses-list";
import { hasPermission } from "@/lib/permissions";
import { ExpenseStatus } from "@prisma/client";

export default async function ReimbursableExpensesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const reimbursableExpenses = await db.expense.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
      isReimbursable: true,
      status: { not: ExpenseStatus.SUBMITTED },
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
    },
    orderBy: {
      date: "desc",
    },
  });

  // Sort by reimbursement status (unpaid first), then by date
  const sortedExpenses = reimbursableExpenses.sort((a, b) => {
    // First sort by reimbursement status (false/unpaid comes before true/paid)
    if (a.isReimbursed !== b.isReimbursed) {
      return a.isReimbursed ? 1 : -1;
    }
    // Then sort by date (newest first)
    return b.date.getTime() - a.date.getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reimbursements</h1>
        <p className="text-muted-foreground">
          Track and update payout status for reimbursable spend
        </p>
      </div>
      <ReimbursableExpensesList 
        expenses={sortedExpenses.map(exp => ({
          ...exp,
          date: exp.date.toISOString().split('T')[0],
          reimbursedAt: exp.reimbursedAt?.toISOString() || null,
          createdAt: exp.createdAt.toISOString(),
          updatedAt: exp.updatedAt.toISOString(),
        }))} 
      />
    </div>
  );
}


import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseList } from "@/components/expenses/expense-list";
import { hasPermission } from "@/lib/permissions";
import { ExpenseStatus } from "@prisma/client";

export default async function ExpensesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // Fetch initial expenses
  const expenses = await db.expense.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
      status: { not: ExpenseStatus.SUBMITTED },
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
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  // Fetch categories, trips, and users for filters
  const [categories, trips, users] = await Promise.all([
    db.expenseCategory.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      orderBy: { name: "asc" },
    }),
    db.trip.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      orderBy: { startDate: "desc" },
      take: 50,
    }),
    db.user.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">View and manage all expenses</p>
        </div>
      </div>
      <ExpenseList
        initialExpenses={expenses.map(exp => ({
          ...exp,
          date: exp.date.toISOString().split('T')[0],
          createdAt: exp.createdAt.toISOString(),
          updatedAt: exp.updatedAt.toISOString(),
          reimbursedAt: exp.reimbursedAt ? exp.reimbursedAt.toISOString() : null,
        }))}
        categories={categories}
        trips={trips}
        users={users}
        currentUserId={session.user.id}
      />
    </div>
  );
}


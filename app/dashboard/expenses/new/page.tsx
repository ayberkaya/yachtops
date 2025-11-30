import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { hasPermission } from "@/lib/permissions";

export default async function NewExpensePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.create", session.user.permissions)) {
    redirect("/dashboard");
  }

  // Fetch categories and trips for the form
  const [categories, trips] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Expense</h1>
        <p className="text-muted-foreground">Create a new expense entry</p>
      </div>
      <ExpenseForm categories={categories} trips={trips} />
    </div>
  );
}


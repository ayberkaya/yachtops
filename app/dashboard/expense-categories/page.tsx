import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { ExpenseCategoryManager } from "@/components/expenses/expense-category-manager";

export default async function ExpenseCategoriesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.categories.manage", session.user.permissions)) {
    redirect("/dashboard");
  }

  const categories = await db.expenseCategory.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expense Categories</h1>
      </div>
      <ExpenseCategoryManager initialCategories={categories} />
    </div>
  );
}


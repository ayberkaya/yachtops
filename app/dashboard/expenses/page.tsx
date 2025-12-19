import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseList } from "@/components/expenses/expense-list";
import { hasPermission } from "@/lib/permissions";
import { ExpenseStatus } from "@prisma/client";
import { getCachedExpenseCategories, getCachedTrips, getCachedUsers } from "@/lib/server-cache";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";

export default async function ExpensesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists before proceeding
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    // Regular users without tenantId cannot access expenses
    redirect("/dashboard");
  }

  // Fetch initial expenses (exclude soft-deleted) with strict tenant scope
  const expenses = await db.expense.findMany({
    where: withTenantScope(session, {
      status: { not: ExpenseStatus.SUBMITTED },
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
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  // Fetch categories, trips, and users for filters (using cached versions)
  // tenantId is guaranteed to be string here (checked above)
  const [categories, trips, users] = await Promise.all([
    getCachedExpenseCategories(tenantId),
    getCachedTrips(tenantId, 50),
    getCachedUsers(tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Expenses</h1>
        </div>
      </div>
      <ExpenseList
        initialExpenses={expenses.map((exp: { date: Date; createdAt: Date; updatedAt: Date; reimbursedAt: Date | null }) => ({
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


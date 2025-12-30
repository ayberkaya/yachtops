import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { getCachedExpenseCategories, getCachedTrips } from "@/lib/server-cache";

export default async function NewExpensePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.create", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  if (!tenantId) {
    redirect("/dashboard");
  }

  const yachtId = tenantId;

  const defaultCategories = [
    "Fuel",
    "Marina & Port Fees",
    "Provisions",
    "Cleaning & Laundry",
    "Maintenance & Repairs",
    "Crew",
    "Tender & Toys",
    "Miscellaneous",
    "Insurance",
    "Communications & IT",
    "Safety Equipment",
    "Crew Training",
    "Guest Services",
    "Waste Disposal",
    "Dockage & Utilities",
    "Transport & Logistics",
    "Permits & Customs",
    "Fuel Additives",
  ];

  // Ensure tenant has categories; if none, seed defaults for this yachtId.
  let categories = await getCachedExpenseCategories(yachtId);

  if (categories.length === 0) {
    await Promise.all(
      defaultCategories.map((name) =>
        db.expenseCategory.upsert({
          where: {
            yachtId_name: {
              yachtId,
              name,
            },
          },
          update: {},
          create: {
            name,
            yachtId,
          },
        })
      )
    );

    // Invalidate cache after creating categories
    const { invalidateExpenseCategories } = await import("@/lib/server-cache");
    if (yachtId) {
      invalidateExpenseCategories(yachtId);
    }

    categories = await db.expenseCategory.findMany({
      where: { yachtId },
      orderBy: { name: "asc" },
    });
  }

  // Fetch trips for the form (using cached version)
  const trips = await getCachedTrips(yachtId, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Expense</h1>
      </div>
      <ExpenseForm categories={categories} trips={trips} />
    </div>
  );
}


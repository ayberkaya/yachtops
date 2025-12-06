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

  const yachtId = session.user.yachtId || undefined;

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
  let categories = await db.expenseCategory.findMany({
    where: {
      yachtId,
    },
    orderBy: { name: "asc" },
  });

  if (categories.length === 0 && yachtId) {
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

    categories = await db.expenseCategory.findMany({
      where: { yachtId },
      orderBy: { name: "asc" },
    });
  }

  // Fetch trips for the form
  const trips = await db.trip.findMany({
    where: {
      yachtId,
    },
    orderBy: { startDate: "desc" },
    take: 50,
  });

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


import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { CleaningSuppliesView } from "@/components/inventory/cleaning-supplies-view";
import { hasPermission } from "@/lib/permissions";

export default async function CleaningSuppliesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "inventory.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // For now, return empty array until database models are created
  // TODO: Replace with actual database query when models are available
  const stocks: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cleaning Supplies</h1>
        <p className="text-muted-foreground">
          Manage cleaning products, detergents, and maintenance supplies
        </p>
      </div>
      <CleaningSuppliesView initialStocks={stocks} />
    </div>
  );
}

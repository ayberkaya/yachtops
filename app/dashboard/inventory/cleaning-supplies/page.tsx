import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { CleaningSuppliesView } from "@/components/inventory/cleaning-supplies-view";
import { getInventorySection } from "@/lib/inventory-settings-store";

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

  const section = await getInventorySection(session.user.yachtId, "cleaningSupplies");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cleaning Supplies</h1>
        <p className="text-muted-foreground">
          Manage cleaning products, detergents, and maintenance supplies
        </p>
      </div>
      <CleaningSuppliesView initialStocks={section.items} />
    </div>
  );
}

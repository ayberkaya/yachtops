import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { FoodProvisionsView } from "@/components/inventory/food-provisions-view";
import { getInventorySection } from "@/lib/inventory-settings-store";

export default async function FoodProvisionsPage() {
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

  const section = await getInventorySection(session.user.yachtId, "foodProvisions");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Food & Provisions</h1>
        <p className="text-muted-foreground">
          Manage food items, groceries, and provisions inventory
        </p>
      </div>
      <FoodProvisionsView initialStocks={section.items} />
    </div>
  );
}

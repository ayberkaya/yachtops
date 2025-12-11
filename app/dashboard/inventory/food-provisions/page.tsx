import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { FoodProvisionsView } from "@/components/inventory/food-provisions-view";
import { hasPermission } from "@/lib/permissions";

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

  // For now, return empty array until database models are created
  // TODO: Replace with actual database query when models are available
  const stocks: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Food & Provisions</h1>
        <p className="text-muted-foreground">
          Manage food items, groceries, and provisions inventory
        </p>
      </div>
      <FoodProvisionsView initialStocks={stocks} />
    </div>
  );
}

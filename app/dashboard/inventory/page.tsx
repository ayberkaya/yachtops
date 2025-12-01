import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";

export default async function InventoryPage() {
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

  // Redirect to alcohol stock as default
  redirect("/dashboard/inventory/alcohol-stock");
}


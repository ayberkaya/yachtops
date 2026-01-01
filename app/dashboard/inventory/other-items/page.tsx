import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { OtherItemsView } from "@/components/inventory/other-items-view";
import { getInventorySection } from "@/lib/inventory-settings-store";

export default async function OtherItemsPage() {
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

  const section = await getInventorySection(session.user.yachtId, "otherItems");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Other Items</h1>
        <p className="text-muted-foreground">
          Manage safety equipment, water sports gear, deck equipment, and other vessel items
        </p>
      </div>
      <OtherItemsView initialItems={section.items} />
    </div>
  );
}


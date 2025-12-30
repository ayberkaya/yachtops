import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { SparePartsView } from "@/components/inventory/spare-parts-view";
import { getInventorySection } from "@/lib/inventory-settings-store";

export default async function SparePartsPage() {
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

  const section = await getInventorySection(session.user.yachtId, "spareParts");

  return (
    <div className="space-y-6">
      <div className="px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-bold break-words">Spare Parts</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2 break-words">
          Manage spare parts, tools, and equipment inventory
        </p>
      </div>
      <SparePartsView initialStocks={section.items} />
    </div>
  );
}

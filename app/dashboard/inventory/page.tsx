import { redirect } from "next/navigation";

export default function InventoryPage() {
  // Redirect to the first inventory sub-page (Items view)
  // Since /dashboard/inventory is the root, we'll redirect to the first category
  redirect("/dashboard/inventory/alcohol-stock");
}

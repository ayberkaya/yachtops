import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

export default async function InventoryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Redirect to alcohol stock as default
  redirect("/dashboard/inventory/alcohol-stock");
}


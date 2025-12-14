import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { AlcoholStockView } from "@/components/inventory/alcohol-stock-view";
import { hasPermission } from "@/lib/permissions";

export default async function AlcoholStockPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "inventory.alcohol.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const stocks = await db.alcoholStock.findMany({
    where: {
      yachtId: session.user.yachtId,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Beverage Stock</h1>
        <p className="text-muted-foreground">
          Manage every wine, spirit, and beverage level across the vessel
        </p>
      </div>
      <AlcoholStockView 
        initialStocks={stocks.map((stock: { createdAt: Date; updatedAt: Date }) => ({
          ...stock,
          createdAt: stock.createdAt.toISOString(),
          updatedAt: stock.updatedAt.toISOString(),
        }))} 
      />
    </div>
  );
}


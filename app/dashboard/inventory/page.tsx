import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

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

  // Fetch all inventory categories
  const alcoholStocks = await db.alcoholStock.findMany({
    where: {
      yachtId: session.user.yachtId,
    },
    orderBy: { name: "asc" },
  });

  // Group items by category
  const itemsByCategory: Record<string, InventoryItem[]> = {
    "Beverages": alcoholStocks.map((stock: { id: string; name: string; quantity: number; unit: string }) => ({
      id: stock.id,
      name: stock.name,
      category: "Beverages",
      quantity: stock.quantity,
      unit: stock.unit,
    })),
    "Food & Provisions": [], // TODO: Add when FoodStock model is available
    "Cleaning Supplies": [], // TODO: Add when CleaningStock model is available
    "Spare Parts": [], // TODO: Add when SparePartsStock model is available
    "Other Items": [], // TODO: Add when OtherItems model is available
  };

  // Filter out empty categories
  const categories = Object.entries(itemsByCategory).filter(
    ([_, items]) => items.length > 0
  );

  return (
    <div className="space-y-6">
      <div className="px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-bold break-words">All Inventory</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2 break-words">
          View and manage all inventory items across the vessel
        </p>
      </div>

      <div className="space-y-8">
        {categories.map(([categoryName, items]) => (
          <div key={categoryName} className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">{categoryName}</h2>
            <ul className="space-y-2 pl-4">
              {items.map((item) => (
                <li key={item.id} className="text-sm text-zinc-700">
                  {item.name}
                  {item.quantity > 0 && (
                    <span className="text-zinc-500 ml-2">
                      ({item.quantity} {item.unit})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No inventory items found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

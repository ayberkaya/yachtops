import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ShoppingListView } from "@/components/shopping/shopping-list-view";
import { hasPermission } from "@/lib/permissions";

export default async function ShoppingPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "shopping.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // Fetch lists and products
  const [lists, products] = await Promise.all([
    db.shoppingList.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.product.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shopping Lists</h1>
        <p className="text-muted-foreground">
          Create and manage your shopping lists
        </p>
      </div>
      <ShoppingListView initialLists={lists} initialProducts={products} />
    </div>
  );
}


import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ShoppingListView } from "@/components/shopping/shopping-list-view";
import { hasPermission } from "@/lib/permissions";
import { getCachedProducts } from "@/lib/server-cache";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";

export default async function ShoppingPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "shopping.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  // Fetch lists and products (products are cached)
  const [lists, products] = await Promise.all([
    db.shoppingList.findMany({
      where: withTenantScope(session, {}),
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
      getCachedProducts(tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shopping Lists</h1>
      </div>
      <ShoppingListView 
        initialLists={lists.map((list: { createdAt: Date; updatedAt: Date }) => ({
          ...list,
          createdAt: list.createdAt.toISOString(),
          updatedAt: list.updatedAt.toISOString(),
        }))} 
        initialProducts={products} 
      />
    </div>
  );
}


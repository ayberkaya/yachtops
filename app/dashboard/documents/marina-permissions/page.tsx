import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MarinaPermissionsView } from "@/components/documents/marina-permissions-view";
import { hasPermission } from "@/lib/permissions";

export default async function MarinaPermissionsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "documents.marina.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const docs = await db.marinaPermissionDocument.findMany({
    where: {
      yachtId: session.user.yachtId,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Port & Authority Permits</h1>
        <p className="text-muted-foreground">
          Store and manage all port entry letters, harbor permits, and authority clearances.
        </p>
      </div>

      <MarinaPermissionsView 
        initialDocs={docs.map((doc: { expiryDate: Date | null; createdAt: Date }) => ({
          ...doc,
          expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
          createdAt: doc.createdAt.toISOString(),
        }))} 
      />
    </div>
  );
}


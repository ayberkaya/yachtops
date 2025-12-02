import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { VesselDocumentsView } from "@/components/documents/vessel-documents-view";
import { hasPermission } from "@/lib/permissions";

export default async function VesselDocumentsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "documents.vessel.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const docs = await db.vesselDocument.findMany({
    where: {
      yachtId: session.user.yachtId,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vessel Documents</h1>
        <p className="text-muted-foreground">
          Store and manage documents related to vessel documentation.
        </p>
      </div>

      <VesselDocumentsView initialDocs={docs} />
    </div>
  );
}


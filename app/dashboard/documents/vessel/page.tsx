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
        <h1 className="text-3xl font-bold">Vessel Certificates</h1>
        <p className="text-muted-foreground">
          Centralize registry certificates, class surveys, and technical attestations.
        </p>
      </div>

      <VesselDocumentsView 
        initialDocs={docs.map((doc: { expiryDate: Date | null; createdAt: Date }) => ({
          ...doc,
          expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
          createdAt: doc.createdAt.toISOString(),
        }))} 
      />
    </div>
  );
}


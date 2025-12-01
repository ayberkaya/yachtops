import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { VesselCrewDocumentsView } from "@/components/documents/vessel-crew-documents-view";
import { hasPermission } from "@/lib/permissions";

export default async function VesselCrewDocumentsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "documents.vesselcrew.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const docs = await db.vesselCrewDocument.findMany({
    where: {
      yachtId: session.user.yachtId,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vessel & Crew Documents</h1>
        <p className="text-muted-foreground">
          Store and manage documents related to vessel and crew documentation.
        </p>
      </div>

      <VesselCrewDocumentsView initialDocs={docs} />
    </div>
  );
}


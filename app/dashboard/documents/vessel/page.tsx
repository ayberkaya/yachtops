import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { VesselCertificationDashboard } from "@/components/documents/vessel-certification-dashboard";
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
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      notes: true,
      expiryDate: true,
      createdAt: true,
      storageBucket: true,
      storagePath: true,
      fileUrl: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Transform data for the dashboard component
  // Use file endpoint URL for documents in storage, fallback to legacy fileUrl
  const transformedDocs = docs
    .filter((doc) => (doc.storageBucket && doc.storagePath) || doc.fileUrl)
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      fileUrl: doc.storageBucket && doc.storagePath 
        ? `/api/vessel-documents/${doc.id}/file`
        : doc.fileUrl || "",
      notes: doc.notes,
      expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vessel Certification Dashboard</h1>
        <p className="text-muted-foreground">
          Track expiration dates for critical vessel documents and certificates.
        </p>
      </div>

      <VesselCertificationDashboard documents={transformedDocs} />
    </div>
  );
}


import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { CrewDocumentsView } from "@/components/documents/crew-documents-view";
import { hasPermission } from "@/lib/permissions";

export default async function CrewDocumentsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "documents.crew.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const [docs, crewMembers] = await Promise.all([
    db.crewDocument.findMany({
      where: {
        yachtId: session.user.yachtId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: {
        yachtId: session.user.yachtId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crew Documents</h1>
        <p className="text-muted-foreground">
          Store and manage documents related to crew documentation.
        </p>
      </div>

      <CrewDocumentsView initialDocs={docs} crewMembers={crewMembers} />
    </div>
  );
}


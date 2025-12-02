import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MyDocumentsView } from "@/components/documents/my-documents-view";

export default async function MyDocumentsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Get only documents belonging to the current user
  const docs = await db.crewDocument.findMany({
    where: {
      yachtId: session.user.yachtId,
      userId: session.user.id,
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
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Documents</h1>
        <p className="text-muted-foreground">
          View your personal crew documents.
        </p>
      </div>

      <MyDocumentsView 
        initialDocs={docs.map(doc => ({
          ...doc,
          expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
          createdAt: doc.createdAt.toISOString(),
        }))} 
      />
    </div>
  );
}


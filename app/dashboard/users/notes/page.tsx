import { redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserNotes } from "@/components/users/user-notes";

export default async function UserNotesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const notes = await db.userNote.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      checklist: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Personal Notes</h1>
        <p className="text-muted-foreground">
          Only you can view these notes. Add private checklists for daily reminders or quick logs.
        </p>
      </div>
      <UserNotes
        initialNotes={notes.map((note) => ({
          ...note,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          checklist: note.checklist.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}


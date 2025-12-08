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
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      content: true,
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
          content: Array.isArray(note.content) ? (note.content as any[]) : [],
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}


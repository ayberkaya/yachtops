import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { TaskDetail } from "@/components/tasks/task-detail";
import { hasPermission } from "@/lib/permissions";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "tasks.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Fetch users and trips for forms
  const [users, trips] = await Promise.all([
    session.user.role !== "CREW"
      ? db.user.findMany({
          where: {
            yachtId: session.user.yachtId || undefined,
          },
          select: { id: true, name: true, email: true, role: true },
        })
      : [],
    db.trip.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
      orderBy: { startDate: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <TaskDetail
        taskId={id}
        users={users}
        trips={trips}
        currentUser={session.user}
      />
    </div>
  );
}


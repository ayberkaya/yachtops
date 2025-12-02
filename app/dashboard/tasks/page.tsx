import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { TaskList } from "@/components/tasks/task-list";
import { hasPermission } from "@/lib/permissions";

export default async function TasksPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "tasks.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // Fetch tasks
  const where: any = {
    yachtId: session.user.yachtId || undefined,
  };

  // CREW can see their own tasks OR unassigned tasks
  if (session.user.role === "CREW") {
    where.OR = [
      { assigneeId: session.user.id },
      { assigneeId: null },
    ];
  }

  const tasks = await db.task.findMany({
    where,
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      completedBy: {
        select: { id: true, name: true, email: true },
      },
      trip: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Fetch users and trips for filters/forms (only for OWNER/CAPTAIN)
  const [users, trips] = await Promise.all([
    session.user.role !== "CREW"
      ? db.user.findMany({
          where: {
            yachtId: session.user.yachtId || undefined,
          },
          select: { id: true, name: true, email: true },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            {session.user.role === "CREW" ? "My Tasks" : "Manage tasks"}
          </p>
        </div>
      </div>
      <TaskList
        initialTasks={tasks.map(task => ({
          ...task,
          dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
          completedAt: task.completedAt ? task.completedAt.toISOString() : null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        }))}
        users={users}
        trips={trips}
        currentUser={session.user}
      />
    </div>
  );
}


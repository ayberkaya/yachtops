import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { TaskList } from "@/components/tasks/task-list";
import { hasPermission } from "@/lib/permissions";
import { getCachedUsers, getCachedTrips } from "@/lib/server-cache";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";

export default async function TasksPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "tasks.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  // Build base where clause
  const baseWhere: any = {};

  // CREW can see their own tasks OR unassigned tasks
  if (session.user.role === "CREW") {
    baseWhere.OR = [
      { assigneeId: session.user.id },
      { assigneeId: null },
    ];
  }

  // Fetch tasks with strict tenant scope
  const tasks = await db.task.findMany({
    where: withTenantScope(session, baseWhere),
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      completedBy: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      trip: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Fetch users and trips for filters/forms (using cached versions)
  // tenantId is guaranteed to be string here (checked above)
  const [users, trips] = await Promise.all([
    session.user.role !== "CREW"
      ? getCachedUsers(tenantId)
      : [],
    getCachedTrips(tenantId, 50),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
        </div>
      </div>
      <TaskList
        initialTasks={tasks.map((task: { dueDate: Date | null; completedAt: Date | null; createdAt: Date; updatedAt: Date }) => ({
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


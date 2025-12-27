import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { TaskList } from "@/components/tasks/task-list";
import { hasPermission } from "@/lib/permissions";
import { getCachedUsers, getCachedTrips } from "@/lib/server-cache";
import { getTenantId } from "@/lib/tenant";
import { getTasks } from "@/lib/tasks/task-queries";
import { TaskStatus } from "@prisma/client";

interface TasksPageProps {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    assigneeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
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

  // Read search params
  const params = await searchParams;
  const tab = params.tab || "all";
  const status = (params.status as TaskStatus) || TaskStatus.TODO; // Default to TODO for fast initial load
  const assigneeId = params.assigneeId || null;
  const dateFrom = params.dateFrom || null;
  const dateTo = params.dateTo || null;

  // Fetch tasks with server-side filtering
  const tasks = await getTasks(session, {
    status,
    tab,
    assigneeId,
    dateFrom,
    dateTo,
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
        initialTasks={tasks.map((task: any) => {
          const formatDate = (date: Date | string | null): string | null => {
            if (!date) return null;
            if (typeof date === 'string') return date;
            if (date instanceof Date) return date.toISOString();
            return null;
          };

          const formatDateOnly = (date: Date | string | null): string | null => {
            if (!date) return null;
            if (typeof date === 'string') return date.split('T')[0];
            if (date instanceof Date) return date.toISOString().split('T')[0];
            return null;
          };

          return {
            ...task,
            dueDate: formatDateOnly(task.dueDate),
            completedAt: formatDate(task.completedAt),
            createdAt: formatDate(task.createdAt) || new Date().toISOString(),
            updatedAt: formatDate(task.updatedAt) || new Date().toISOString(),
          };
        })}
        users={users}
        trips={trips}
        currentUser={session.user}
        currentTab={tab}
        currentStatus={status}
        currentAssigneeId={assigneeId}
        currentDateFrom={dateFrom}
        currentDateTo={dateTo}
      />
    </div>
  );
}


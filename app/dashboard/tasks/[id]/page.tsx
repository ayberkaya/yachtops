import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { TaskDetail } from "@/components/tasks/task-detail";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";
import { getCachedUsers, getCachedTrips } from "@/lib/server-cache";

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

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Fetch users and trips for forms (using cached versions)
  const [users, trips] = await Promise.all([
    session.user.role !== "CREW"
      ? getCachedUsers(tenantId!)
      : [],
    getCachedTrips(tenantId!, 50),
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


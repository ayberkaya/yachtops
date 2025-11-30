import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/auth";
import { PerformanceView } from "@/components/performance/performance-view";

export default async function PerformancePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Get all users for filter (only for OWNER/CAPTAIN)
  const allUsers = canManageUsers(session.user)
    ? await db.user.findMany({
        where: {
          yachtId: session.user.yachtId || undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Performance Tracking</h1>
        <p className="text-muted-foreground">
          Track crew member task completion performance
        </p>
      </div>
      <PerformanceView
        allUsers={allUsers}
        currentUser={session.user}
        canManage={canManageUsers(session.user)}
      />
    </div>
  );
}


import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MaintenanceList } from "@/components/maintenance/maintenance-list";
import { hasPermission } from "@/lib/permissions";

export default async function MaintenancePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "maintenance.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const logs = await db.maintenanceLog.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maintenance & Repairs</h1>
        <p className="text-muted-foreground">
          Track and manage all vessel maintenance, repairs, and inspections.
        </p>
      </div>

      <MaintenanceList 
        initialLogs={logs.map((log: { date: Date; nextDueDate: Date | null; createdAt: Date; updatedAt: Date }) => ({
          ...log,
          date: log.date.toISOString().split('T')[0],
          nextDueDate: log.nextDueDate ? log.nextDueDate.toISOString().split('T')[0] : null,
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString(),
        }))} 
      />
    </div>
  );
}


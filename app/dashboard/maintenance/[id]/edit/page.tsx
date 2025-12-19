import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";

export default async function EditMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "maintenance.edit", session.user.permissions)) {
    redirect("/dashboard/maintenance");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const log = await db.maintenanceLog.findUnique({
    where: withTenantScope(session, { id }),
  });

  if (!log) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Maintenance Log</h1>
        <p className="text-muted-foreground">
          Update maintenance log details.
        </p>
      </div>

      <MaintenanceForm initialData={log} />
    </div>
  );
}


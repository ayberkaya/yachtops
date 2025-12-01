import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";
import { hasPermission } from "@/lib/permissions";

export default async function NewMaintenancePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "maintenance.create", session.user.permissions)) {
    redirect("/dashboard/maintenance");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Maintenance Log</h1>
        <p className="text-muted-foreground">
          Record a new maintenance, repair, or inspection.
        </p>
      </div>

      <MaintenanceForm />
    </div>
  );
}


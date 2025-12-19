import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MaintenanceDetail } from "@/components/maintenance/maintenance-detail";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "maintenance.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const log = await db.maintenanceLog.findUnique({
    where: withTenantScope(session, { id }),
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      documents: {
        select: { id: true, fileUrl: true, title: true, uploadedAt: true },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!log) {
    notFound();
  }

  const canEdit = hasPermission(session.user, "maintenance.edit", session.user.permissions);
  const canDelete = hasPermission(session.user, "maintenance.delete", session.user.permissions);

  return (
    <div className="space-y-6">
      <MaintenanceDetail log={log} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}


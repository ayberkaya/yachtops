import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageRoles } from "@/lib/auth";
import { db } from "@/lib/db";
import { RoleList } from "@/components/roles/role-list";
import { getTenantId } from "@/lib/tenant";

export default async function RolesPermissionsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user can manage roles
  if (!canManageRoles(session.user)) {
    redirect("/dashboard");
  }

  const tenantId = getTenantId(session);
  if (!tenantId) {
    redirect("/dashboard");
  }

  const roles = await db.customRole.findMany({
    where: {
      yachtId: tenantId,
    },
    orderBy: [
      { active: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="text-muted-foreground">
          Create and manage custom roles with specific permissions for your vessel
        </p>
      </div>
      <RoleList 
        initialRoles={roles.map((role) => ({
          ...role,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        }))} 
      />
    </div>
  );
}


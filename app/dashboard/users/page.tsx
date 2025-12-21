import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserList } from "@/components/users/user-list";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";

export default async function UsersPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "users.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  const users = await db.user.findMany({
    where: withTenantScope(session, {}),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        customRoleId: true,
        customRole: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
      </div>
      <UserList 
        initialUsers={users.map((user: {
          id: string;
          email: string;
          name: string | null;
          role: string;
          permissions: string | null;
          customRoleId: string | null;
          customRole: {
            id: string;
            name: string;
          } | null;
          createdAt: Date;
        }) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        }))} 
      />
    </div>
  );
}


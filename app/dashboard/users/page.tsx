import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserList } from "@/components/users/user-list";
import { hasPermission } from "@/lib/permissions";

export default async function UsersPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "users.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const users = await db.user.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
    },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage yacht users and roles</p>
      </div>
      <UserList 
        initialUsers={users.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        }))} 
      />
    </div>
  );
}


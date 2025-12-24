import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers, hasAnyRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserList } from "@/components/users/user-list";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";
import { UserRole, InviteStatus } from "@prisma/client";
import { InviteCrewForm } from "@/components/crew/invite-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PendingInvitesTable } from "@/components/crew/pending-invites-table";

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

  // Fetch pending invites if user can manage crew (OWNER or CAPTAIN)
  const canInviteCrew = hasAnyRole(session.user, [UserRole.OWNER, UserRole.CAPTAIN]);
  let pendingInvites: Array<{
    id: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    expiresAt: Date;
  }> = [];
  let availableRoles: Array<{ value: string; label: string }> = [];

  if (canInviteCrew && tenantId) {
    // Fetch pending invites
    try {
      const rawInvites = await db.yachtInvite.findMany({
        where: {
          yachtId: tenantId,
          status: InviteStatus.PENDING,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          expiresAt: true,
        },
      });
      // Convert Date objects to Date instances (they're already Date objects from Prisma)
      pendingInvites = rawInvites;
    } catch (error) {
      console.error("Error fetching pending invites:", error);
    }

    // Fetch available roles (UserRole enum + custom roles)
    try {
      const customRoles = await db.customRole.findMany({
        where: {
          yachtId: tenantId,
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      // Build available roles list
      const standardRoles: { value: string; label: string }[] = [
        { value: UserRole.CAPTAIN, label: "Captain" },
        { value: UserRole.CHEF, label: "Chef" },
        { value: UserRole.STEWARDESS, label: "Stewardess" },
        { value: UserRole.DECKHAND, label: "Deckhand" },
        { value: UserRole.ENGINEER, label: "Engineer" },
        { value: UserRole.CREW, label: "Crew" },
      ];

      // Create a Set of standard role labels for duplicate checking
      const standardRoleLabels = new Set(standardRoles.map(role => role.label.toLowerCase()));

      // Filter out custom roles that have the same name as standard roles (case-insensitive)
      const customRoleOptions = customRoles
        .filter((role: { id: string; name: string }) => {
          // Only include custom roles that don't match standard role names
          return !standardRoleLabels.has(role.name.toLowerCase());
        })
        .map((role: { id: string; name: string }) => ({
          value: `custom_${role.id}`,
          label: role.name,
        }));

      availableRoles = [...standardRoles, ...customRoleOptions];
    } catch (error) {
      console.error("Error fetching custom roles:", error);
    }
  }

  const roleLabels: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Super Admin",
    [UserRole.ADMIN]: "Admin",
    [UserRole.OWNER]: "Owner",
    [UserRole.CAPTAIN]: "Captain",
    [UserRole.CHEF]: "Chef",
    [UserRole.STEWARDESS]: "Stewardess",
    [UserRole.DECKHAND]: "Deckhand",
    [UserRole.ENGINEER]: "Engineer",
    [UserRole.CREW]: "Crew",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crew Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage crew members and invite new team members
        </p>
      </div>

      {/* Invite Crew Form - Only visible to OWNER or CAPTAIN */}
      {canInviteCrew && (
        <>
          <InviteCrewForm availableRoles={availableRoles} />

          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that have been sent but not yet accepted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitesTable invites={pendingInvites} roleLabels={roleLabels} />
            </CardContent>
          </Card>
        </>
      )}

      {/* Existing Crew Members */}
      <Card>
        <CardHeader>
          <CardTitle>Current Crew Members</CardTitle>
          <CardDescription>
            All active crew members in your yacht
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}


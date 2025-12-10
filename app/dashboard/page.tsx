import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasAnyRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { OwnerCaptainDashboard } from "@/components/dashboard/owner-captain-dashboard";
import { CrewDashboard } from "@/components/dashboard/crew-dashboard";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = session.user;
  const isOwnerOrCaptain = hasAnyRole(user, [UserRole.OWNER, UserRole.CAPTAIN]);

  return (
    <div className="space-y-6">
      {isOwnerOrCaptain ? (
        <OwnerCaptainDashboard user={user} />
      ) : (
        <CrewDashboard user={user} />
      )}
    </div>
  );
}


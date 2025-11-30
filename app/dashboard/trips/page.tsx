import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { TripList } from "@/components/trips/trip-list";
import { hasPermission } from "@/lib/permissions";

export default async function TripsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "trips.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const trips = await db.trip.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trips</h1>
          <p className="text-muted-foreground">Manage yacht trips and charters</p>
        </div>
      </div>
      <TripList initialTrips={trips} canManage={canManageUsers(session.user)} />
    </div>
  );
}


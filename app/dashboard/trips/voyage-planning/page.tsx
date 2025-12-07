import { redirect } from "next/navigation";

import { VoyagePlanning } from "@/components/trips/voyage-planning";
import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";

export default async function VoyagePlanningPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "trips.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const trips = await db.trip.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
    },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      startDate: true,
      endDate: true,
      departurePort: true,
      arrivalPort: true,
    },
    orderBy: { startDate: "desc" },
  });

  const canEdit =
    hasPermission(session.user, "trips.edit", session.user.permissions) ||
    hasPermission(session.user, "trips.create", session.user.permissions);

  return (
    <VoyagePlanning
      trips={trips.map((trip) => ({
        ...trip,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate ? trip.endDate.toISOString() : null,
      }))}
      canEdit={canEdit}
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}


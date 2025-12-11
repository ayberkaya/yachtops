import { redirect } from "next/navigation";
import { RouteFuelEstimation } from "@/components/trips/route-fuel-estimation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";

export default async function RouteFuelPage() {
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

  const movementLogs = await db.tripMovementLog.findMany({
    where: {
      trip: {
        yachtId: session.user.yachtId || undefined,
      },
    },
    select: {
      id: true,
      tripId: true,
      eventType: true,
      port: true,
      eta: true,
      etd: true,
      weather: true,
      seaState: true,
      notes: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: "desc" },
  });

  const tankLogs = await db.tripTankLog.findMany({
    where: {
      trip: {
        yachtId: session.user.yachtId || undefined,
      },
    },
    select: {
      id: true,
      tripId: true,
      fuelLevel: true,
      freshWater: true,
      greyWater: true,
      blackWater: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: "desc" },
  });

  const canEdit =
    hasPermission(session.user, "trips.edit", session.user.permissions) ||
    hasPermission(session.user, "trips.create", session.user.permissions);

  return (
    <RouteFuelEstimation
      trips={trips.map((trip) => ({
        ...trip,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate ? trip.endDate.toISOString() : null,
      }))}
      movementLogs={movementLogs.map((log) => ({
        ...log,
        eta: log.eta ? log.eta.toISOString() : null,
        etd: log.etd ? log.etd.toISOString() : null,
        recordedAt: log.recordedAt.toISOString(),
      }))}
      tankLogs={tankLogs.map((log) => ({
        ...log,
        recordedAt: log.recordedAt.toISOString(),
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

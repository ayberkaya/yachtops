import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { LogbookTabs } from "@/components/trips/logbook-tabs";
import { TripStatus, TripMovementEvent } from "@prisma/client";
import {
  getActiveTrips,
  getPastTrips,
  getFuelLogData,
} from "@/lib/trips/trip-queries";

interface TripsPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function TripsPage({ searchParams }: TripsPageProps) {
  const params = await searchParams;
  const view = (params.view as "active" | "past" | "fuel") || "active";
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "trips.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  // Conditionally fetch data based on current view
  let trips: any[] = [];
  let tripsForFuelLog: any[] | undefined = undefined;
  let movementLogs: any[] | undefined = undefined;
  let tankLogs: any[] | undefined = undefined;

  try {
    switch (view) {
      case "active":
        // Only fetch active trips
        trips = await getActiveTrips(session);
        break;

      case "past":
        // Only fetch past trips (limited to 20)
        trips = await getPastTrips(session, 20);
        break;

      case "fuel":
        // Fetch fuel log data (trips, movementLogs, tankLogs)
        const fuelLogData = await getFuelLogData(session);
        tripsForFuelLog = fuelLogData.trips.map((trip: any) => ({
          id: trip.id,
          name: trip.name,
          code: trip.code,
          status: trip.status as TripStatus,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate ? trip.endDate.toISOString() : null,
          departurePort: trip.departurePort,
          arrivalPort: trip.arrivalPort,
        }));
        movementLogs = fuelLogData.movementLogs.map((log: any) => ({
          ...log,
          eventType: log.eventType as TripMovementEvent,
          eta: log.eta ? log.eta.toISOString() : null,
          etd: log.etd ? log.etd.toISOString() : null,
          recordedAt: log.recordedAt.toISOString(),
        }));
        tankLogs = fuelLogData.tankLogs.map((log: any) => ({
          ...log,
          recordedAt: log.recordedAt.toISOString(),
        }));
        // For fuel view, trips array should be empty (not used)
        trips = [];
        break;

      default:
        // Default to active trips
        trips = await getActiveTrips(session);
    }
  } catch (error) {
    console.error("Error fetching trips data:", error);
    // On error, default to empty arrays
    trips = [];
  }

  // Transform trips for display (only for active/past views)
  const tripsForDisplay = trips.map((trip: any) => ({
    ...trip,
    startDate: trip.startDate.toISOString().split('T')[0],
    endDate: trip.endDate ? trip.endDate.toISOString().split('T')[0] : null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  }));

  const canEdit =
    hasPermission(session.user, "trips.edit", session.user.permissions) ||
    hasPermission(session.user, "trips.create", session.user.permissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
        </div>
      </div>
      <LogbookTabs
        currentView={view}
        trips={tripsForDisplay}
        tripsForFuelLog={tripsForFuelLog}
        movementLogs={movementLogs}
        tankLogs={tankLogs}
        canManage={canManageUsers(session.user)}
        canEdit={canEdit}
        currentUser={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }}
      />
    </div>
  );
}


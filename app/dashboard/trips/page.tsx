import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { LogbookTabs } from "@/components/trips/logbook-tabs";
import { AddTripButton } from "@/components/trips/add-trip-button";
import { TripStatus, TripMovementEvent } from "@prisma/client";
import {
  getActiveTrips,
  getPastTrips,
} from "@/lib/trips/trip-queries";

interface TripsPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function TripsPage({ searchParams }: TripsPageProps) {
  const params = await searchParams;
  const view = (params.view as "active" | "past") || "active";
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

      default:
        // Default to active trips
        trips = await getActiveTrips(session);
    }
  } catch (error) {
    console.error("Error fetching trips data:", error);
    // On error, default to empty arrays
    trips = [];
  }

  // Helper to safely convert Date to ISO string
  const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return null;
  };

  // Transform trips for display (only for active/past views)
  const tripsForDisplay = trips.map((trip: any) => {
    const startDateISO = toISOString(trip.startDate);
    const endDateISO = toISOString(trip.endDate);
    
    return {
      ...trip,
      startDate: startDateISO ? startDateISO.split('T')[0] : '',
      endDate: endDateISO ? endDateISO.split('T')[0] : null,
      createdAt: toISOString(trip.createdAt) || '',
      updatedAt: toISOString(trip.updatedAt) || '',
    };
  });

  const canEdit =
    hasPermission(session.user, "trips.edit", session.user.permissions) ||
    hasPermission(session.user, "trips.create", session.user.permissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
        </div>
        <AddTripButton canEdit={canEdit} />
      </div>
      <LogbookTabs
        currentView={view}
        trips={tripsForDisplay}
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


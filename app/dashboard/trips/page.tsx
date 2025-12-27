import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { TripList } from "@/components/trips/trip-list";
import { RouteFuelEstimation } from "@/components/trips/route-fuel-estimation";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";
import { LogbookTabs } from "@/components/trips/logbook-tabs";
import { TripType, TripStatus, TripMovementEvent } from "@prisma/client";

export default async function TripsPage() {
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

  const [trips, movementLogs, tankLogs] = await Promise.all([
    db.trip.findMany({
      where: withTenantScope(session, {}),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        expenses: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    }),
    db.tripMovementLog.findMany({
      where: {
        trip: withTenantScope(session, {}),
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
    }),
    db.tripTankLog.findMany({
      where: {
        trip: withTenantScope(session, {}),
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
    }),
  ]);

  // Calculate expense summaries per trip
  const tripsWithExpenseSummary = trips.map((trip: any) => {
    const approvedExpenses = trip.expenses.filter((e: any) => e.status === "APPROVED");
    const expensesByCurrency: Record<string, number> = {};
    
    approvedExpenses.forEach((exp: any) => {
      const currency = exp.currency;
      expensesByCurrency[currency] = (expensesByCurrency[currency] || 0) + Number(exp.amount);
    });

    return {
      ...trip,
      expenseSummary: expensesByCurrency,
      _count: {
        ...trip._count,
        tasks: 0, // Add tasks count with default 0
      },
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
      </div>
      <LogbookTabs
        activeTrips={tripsWithExpenseSummary
          .filter((trip: any) => 
            trip.status === TripStatus.PLANNED || trip.status === TripStatus.ONGOING
          )
          .map((trip: any) => ({
            ...trip,
            startDate: trip.startDate.toISOString().split('T')[0],
            endDate: trip.endDate ? trip.endDate.toISOString().split('T')[0] : null,
            createdAt: trip.createdAt.toISOString(),
            updatedAt: trip.updatedAt.toISOString(),
          }))}
        pastTrips={tripsWithExpenseSummary
          .filter((trip: any) => 
            trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED
          )
          .map((trip: any) => ({
            ...trip,
            startDate: trip.startDate.toISOString().split('T')[0],
            endDate: trip.endDate ? trip.endDate.toISOString().split('T')[0] : null,
            createdAt: trip.createdAt.toISOString(),
            updatedAt: trip.updatedAt.toISOString(),
          }))}
        trips={trips.map((trip: any) => ({
          id: trip.id,
          name: trip.name,
          code: trip.code,
          status: trip.status as TripStatus,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate ? trip.endDate.toISOString() : null,
          departurePort: trip.departurePort,
          arrivalPort: trip.arrivalPort,
        })) as Array<{
          id: string;
          name: string;
          code: string | null;
          status: TripStatus;
          startDate: string;
          endDate: string | null;
          departurePort: string | null;
          arrivalPort: string | null;
        }>}
        movementLogs={movementLogs.map((log: any) => ({
          ...log,
          eventType: log.eventType as TripMovementEvent,
          eta: log.eta ? log.eta.toISOString() : null,
          etd: log.etd ? log.etd.toISOString() : null,
          recordedAt: log.recordedAt.toISOString(),
        }))}
        tankLogs={tankLogs.map((log: { id: string; tripId: string; fuelLevel: number | null; freshWater: number | null; greyWater: number | null; blackWater: number | null; recordedAt: Date }) => ({
          ...log,
          recordedAt: log.recordedAt.toISOString(),
        }))}
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


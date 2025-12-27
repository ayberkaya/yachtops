import "server-only";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { TripStatus } from "@prisma/client";
import { withTenantScope } from "@/lib/tenant-guard";
import type { Session } from "next-auth";

/**
 * Cache key helper for trip queries
 */
const getCacheKey = (key: string, tenantId: string | null) => 
  `trips-${key}-${tenantId || 'none'}`;

/**
 * Fetch active trips (PLANNED or ONGOING status)
 */
export async function getActiveTrips(session: Session | null) {
  const where = withTenantScope(session, {
    status: {
      in: [TripStatus.PLANNED, TripStatus.ONGOING],
    },
  });

  const tenantId = session?.user?.yachtId || null;

  return unstable_cache(
    async () => {
      const trips = await db.trip.findMany({
        where,
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
      });

      // Calculate expense summaries per trip
      return trips.map((trip: any) => {
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
    },
    [getCacheKey("active", tenantId)],
    { revalidate: 30, tags: [`trips-${tenantId}`] }
  )();
}

/**
 * Fetch past trips (COMPLETED or CANCELLED status) with limit
 */
export async function getPastTrips(session: Session | null, limit = 20) {
  const where = withTenantScope(session, {
    status: {
      in: [TripStatus.COMPLETED, TripStatus.CANCELLED],
    },
  });

  const tenantId = session?.user?.yachtId || null;

  return unstable_cache(
    async () => {
      const trips = await db.trip.findMany({
        where,
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
        take: limit,
      });

      // Calculate expense summaries per trip
      return trips.map((trip: any) => {
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
    },
    [getCacheKey("past", tenantId), limit.toString()],
    { revalidate: 60, tags: [`trips-${tenantId}`] }
  )();
}

/**
 * Fetch data required for the Fuel Log tab
 * Returns trips, movementLogs, and tankLogs
 */
export async function getFuelLogData(session: Session | null) {
  const tripWhere = withTenantScope(session, {});
  const tenantId = session?.user?.yachtId || null;

  return unstable_cache(
    async () => {
      const [trips, movementLogs, tankLogs] = await Promise.all([
        db.trip.findMany({
          where: tripWhere,
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
        }),
        db.tripMovementLog.findMany({
          where: {
            trip: tripWhere,
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
            trip: tripWhere,
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

      return {
        trips,
        movementLogs,
        tankLogs,
      };
    },
    [getCacheKey("fuel-log", tenantId)],
    { revalidate: 30, tags: [`trips-${tenantId}`, `fuel-logs-${tenantId}`] }
  )();
}


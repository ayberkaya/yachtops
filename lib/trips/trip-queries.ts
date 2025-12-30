import "server-only";
import { dbUnscoped } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { TripStatus } from "@prisma/client";
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
  const tenantId = session?.user?.yachtId || null;
  
  // Build where clause with manual yachtId (using dbUnscoped to avoid session access in cache)
  const baseWhere: any = {
    status: {
      in: [TripStatus.PLANNED, TripStatus.ONGOING],
    },
  };
  
  if (tenantId) {
    baseWhere.yachtId = tenantId;
  }

  return unstable_cache(
    async () => {
      const trips = await dbUnscoped.trip.findMany({
        where: baseWhere,
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
  const tenantId = session?.user?.yachtId || null;
  
  // Build where clause with manual yachtId (using dbUnscoped to avoid session access in cache)
  const baseWhere: any = {
    status: {
      in: [TripStatus.COMPLETED, TripStatus.CANCELLED],
    },
  };
  
  if (tenantId) {
    baseWhere.yachtId = tenantId;
  }

  return unstable_cache(
    async () => {
      const trips = await dbUnscoped.trip.findMany({
        where: baseWhere,
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
  const tenantId = session?.user?.yachtId || null;
  
  // Build where clause with manual yachtId (using dbUnscoped to avoid session access in cache)
  const tripWhere: any = {};
  if (tenantId) {
    tripWhere.yachtId = tenantId;
  }

  return unstable_cache(
    async () => {
      const [trips, movementLogs, tankLogs] = await Promise.all([
        dbUnscoped.trip.findMany({
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
        dbUnscoped.tripMovementLog.findMany({
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
        dbUnscoped.tripTankLog.findMany({
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


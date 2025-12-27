import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { ExpenseStatus, TaskStatus } from "@prisma/client";
import { getCachedCashBalanceByCurrency, getCachedRecentExpenses } from "@/lib/server-cache";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "next-auth";

type DashboardUser = NonNullable<Session["user"]>;

// Cache key helper for yacht-scoped data
const getCacheKey = (key: string, yachtId: string | null) => 
  `dashboard-${key}-${yachtId || 'none'}`;

/**
 * Fetch pending expenses for approval
 */
export async function getPendingExpenses(yachtId: string | null) {
  if (!yachtId) return [];
  
  return unstable_cache(
    async () => db.expense.findMany({
      where: {
        yachtId: yachtId,
        status: ExpenseStatus.SUBMITTED,
        deletedAt: null,
      },
      select: {
        id: true,
        description: true,
        baseAmount: true,
        amount: true,
        currency: true,
        date: true,
        createdAt: true,
        createdBy: {
          select: { name: true, email: true },
        },
        category: {
          select: { name: true },
        },
        trip: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    [getCacheKey("pending-expenses", yachtId)],
    { revalidate: 30, tags: [`expenses-${yachtId}`] }
  )();
}

/**
 * Fetch recent expenses
 */
export async function getRecentExpenses(yachtId: string | null) {
  if (!yachtId) return [];
  return getCachedRecentExpenses(yachtId, 5);
}

/**
 * Fetch credit card expenses
 */
export async function getCreditCardExpenses(yachtId: string | null) {
  if (!yachtId) return [];
  
  return unstable_cache(
    async () => {
      const { PaymentMethod, ExpenseStatus } = await import("@prisma/client");
      return db.expense.findMany({
        where: {
          yachtId: yachtId,
          paymentMethod: PaymentMethod.CARD,
          creditCardId: { not: null },
          deletedAt: null,
          // Hide submitted expenses from general listings
          status: { not: ExpenseStatus.SUBMITTED },
        },
        select: {
          id: true,
          description: true,
          baseAmount: true,
          amount: true,
          currency: true,
          date: true,
          createdAt: true,
          category: {
            select: { name: true },
          },
          createdBy: {
            select: { name: true, email: true },
          },
          creditCard: {
            select: {
              id: true,
              ownerName: true,
              lastFourDigits: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    },
    [getCacheKey("credit-card-expenses", yachtId)],
    { revalidate: 30, tags: [`expenses-${yachtId}`] }
  )();
}

/**
 * Fetch credit cards
 */
export async function getCreditCards(yachtId: string | null) {
  if (!yachtId) return [];
  
  return unstable_cache(
    async () => db.creditCard.findMany({
      where: {
        yachtId: yachtId,
        deletedAt: null,
      },
      select: {
        id: true,
        ownerName: true,
        lastFourDigits: true,
        billingCycleEndDate: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    [getCacheKey("credit-cards", yachtId)],
    { revalidate: 60, tags: [`credit-cards-${yachtId}`] }
  )();
}

/**
 * Fetch cash balances by currency
 */
export async function getCashBalances(yachtId: string | null) {
  if (!yachtId) return [];
  return getCachedCashBalanceByCurrency(yachtId);
}

/**
 * Fetch upcoming trips
 */
export async function getUpcomingTrips(yachtId: string | null) {
  if (!yachtId) return [];
  
  return unstable_cache(
    async () => db.trip.findMany({
      where: {
        yachtId: yachtId,
        startDate: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    [getCacheKey("upcoming-trips", yachtId)],
    { revalidate: 60, tags: [`trips-${yachtId}`] }
  )();
}

/**
 * Fetch alcohol stocks (requires permission)
 */
export async function getAlcoholStocks(yachtId: string | null, user: DashboardUser) {
  if (!hasPermission(user, "inventory.alcohol.view", user.permissions) || !yachtId) {
    return [];
  }
  
  return unstable_cache(
    async () => db.alcoholStock.findMany({
      where: {
        yachtId: yachtId,
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        lowStockThreshold: true,
      },
    }),
    [getCacheKey("alcohol-stocks", yachtId)],
    { revalidate: 60, tags: [`inventory-${yachtId}`] }
  )();
}

/**
 * Fetch marina permissions (requires permission)
 */
export async function getMarinaPermissions(yachtId: string | null, user: DashboardUser) {
  if (!hasPermission(user, "documents.marina.view", user.permissions) || !yachtId) {
    return [];
  }
  
  return unstable_cache(
    async () => db.marinaPermissionDocument.findMany({
      where: {
        yachtId: yachtId,
        expiryDate: {
          not: null,
        },
        deletedAt: null,
        // Server-side filtering: only get permissions expiring within 30 days or already expired
        OR: [
          {
            expiryDate: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Within 30 days
            },
          },
          {
            expiryDate: {
              lt: new Date(), // Already expired
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        expiryDate: true,
      },
      take: 50, // Limit to prevent huge payloads
    }),
    [getCacheKey("marina-permissions", yachtId)],
    { revalidate: 60, tags: [`documents-${yachtId}`] }
  )();
}

/**
 * Fetch maintenance logs (requires permission)
 */
export async function getMaintenanceLogs(yachtId: string | null, user: DashboardUser) {
  if (!hasPermission(user, "maintenance.view", user.permissions) || !yachtId) {
    return [];
  }
  
  return unstable_cache(
    async () => db.maintenanceLog.findMany({
      where: {
        yachtId: yachtId,
        nextDueDate: {
          not: null,
          // Server-side filtering: only get maintenance due within 30 days
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Within 30 days
        },
      },
      select: {
        id: true,
        title: true,
        nextDueDate: true,
        component: true,
      },
      take: 50, // Limit to prevent huge payloads
    }),
    [getCacheKey("maintenance-logs", yachtId)],
    { revalidate: 60, tags: [`maintenance-${yachtId}`] }
  )();
}

/**
 * Fetch role-assigned tasks (requires permission)
 */
export async function getRoleTasks(yachtId: string | null, user: DashboardUser) {
  if (!hasPermission(user, "tasks.view", user.permissions) || !yachtId) {
    return [];
  }
  
  return unstable_cache(
    async () => db.task.findMany({
      where: {
        yachtId: yachtId,
        assigneeRole: user.role,
        status: {
          not: TaskStatus.DONE,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        trip: {
          select: { name: true },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 100, // Limit to prevent huge payloads
    }),
    [getCacheKey("role-tasks", yachtId), user.role],
    { revalidate: 30, tags: [`tasks-${yachtId}`] }
  )();
}


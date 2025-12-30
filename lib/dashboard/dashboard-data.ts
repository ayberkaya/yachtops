import { dbUnscoped } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { ExpenseStatus, TaskPriority, TaskStatus, Prisma } from "@prisma/client";
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
    async () => dbUnscoped.expense.findMany({
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
      return dbUnscoped.expense.findMany({
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
    async () => dbUnscoped.creditCard.findMany({
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
export async function getCalendarEvents(yachtId: string | null, user: DashboardUser) {
  if (!yachtId) return [];
  if (!hasPermission(user, "calendar.view", user.permissions)) return [];

  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return await unstable_cache(
      async () => dbUnscoped.calendarEvent.findMany({
        where: {
          yachtId: yachtId,
          OR: [
            {
              startDate: { lte: thirtyDaysFromNow },
              endDate: { gte: now },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          startDate: true,
          endDate: true,
          color: true,
          trip: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { startDate: "asc" },
        take: 20,
      }),
      [getCacheKey("calendar-events", yachtId)],
      { revalidate: 60, tags: [`calendar-${yachtId}`] }
    )();
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
}

export async function getUpcomingTrips(yachtId: string | null) {
  if (!yachtId) return [];
  
  return unstable_cache(
    async () => dbUnscoped.trip.findMany({
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
    async () => dbUnscoped.alcoholStock.findMany({
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
    async () => dbUnscoped.marinaPermissionDocument.findMany({
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
    async () => dbUnscoped.maintenanceLog.findMany({
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
    async () => dbUnscoped.task.findMany({
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

/**
 * Fetch briefing stats for the morning briefing component
 * Returns counts for: pending tasks, urgent tasks, expiring docs, low stock, unread messages
 */
export async function getBriefingStats(user: DashboardUser) {
  const yachtId = user.yachtId;
  if (!yachtId && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return {
      pendingTasksCount: 0,
      urgentTasksCount: 0,
      expiringDocsCount: 0,
      lowStockCount: 0,
      unreadMessagesCount: 0,
    };
  }

  const tenantId = yachtId;

  // Permission logic: Only OWNER and CAPTAIN can see all tasks
  const canViewAllTasks = user.role === "OWNER" || user.role === "CAPTAIN";
  const baseTaskWhere: Prisma.TaskWhereInput = {
    status: { not: TaskStatus.DONE },
    ...(tenantId ? { yachtId: tenantId } : {}),
    ...(!canViewAllTasks
      ? {
          OR: [
            { assigneeId: user.id },
            { assigneeId: null },
            { assigneeRole: user.role },
          ],
        }
      : {}),
  };

  return unstable_cache(
    async () => {
      if (!hasPermission(user, "tasks.view", user.permissions) || !tenantId) {
        return {
          urgentTasksCount: 0,
          pendingTasksCount: 0,
          expiringDocsCount: 0,
          lowStockCount: 0,
          unreadMessagesCount: 0,
        };
      }

      // Dashboard header should be O(1): use DB-side counts (not grouping) for speed.
      const [urgentTasksCount, pendingTasksCount] = await Promise.all([
        dbUnscoped.task.count({
          where: {
            ...baseTaskWhere,
            priority: TaskPriority.URGENT,
          },
        }),
        dbUnscoped.task.count({
          where: {
            ...baseTaskWhere,
            priority: { not: TaskPriority.URGENT },
          },
        }),
      ]);

      // Expiring documents count (marina permissions)
      const expiringDocsCount = hasPermission(user, "documents.marina.view", user.permissions) && tenantId
        ? await dbUnscoped.marinaPermissionDocument.count({
            where: {
              yachtId: tenantId,
              expiryDate: {
                not: null,
              },
              deletedAt: null,
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
          })
        : 0;

      // Low stock count (DB-side) - compare quantity <= threshold via SQL
      const lowStockCount =
        hasPermission(user, "inventory.alcohol.view", user.permissions) && tenantId
          ? await (async () => {
              const result = await dbUnscoped.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint AS count
                FROM alcohol_stocks
                WHERE yacht_id = ${tenantId}
                  AND low_stock_threshold IS NOT NULL
                  AND quantity <= low_stock_threshold
              `;
              return Number(result[0]?.count ?? 0n);
            })()
          : 0;

      // Unread messages count (DB-side) - single query, no channelId prefetch
      const unreadMessagesCount = tenantId
        ? await (async () => {
            const result = await dbUnscoped.$queryRaw<Array<{ count: bigint }>>`
              SELECT COUNT(*)::bigint AS count
              FROM messages m
              JOIN message_channels c ON c.id = m.channel_id
              WHERE c.yacht_id = ${tenantId}
                AND m.deleted_at IS NULL
                AND m.user_id <> ${user.id}
                AND NOT EXISTS (
                  SELECT 1
                  FROM message_reads r
                  WHERE r.message_id = m.id
                    AND r.user_id = ${user.id}
                )
            `;
            return Number(result[0]?.count ?? 0n);
          })()
        : 0;

      // Debug logging removed for production

      return {
        urgentTasksCount,
        pendingTasksCount,
        expiringDocsCount,
        lowStockCount,
        unreadMessagesCount,
      };
    },
    [`briefing-stats-v4-${tenantId}-${user.role}-${user.id}`],
    { revalidate: 10, tags: [`briefing-${tenantId}`, `tasks-${tenantId}`] }
  )();
}


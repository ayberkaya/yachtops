import { db, dbUnscoped } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { ExpenseStatus, TaskStatus, TaskPriority } from "@prisma/client";
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

  // Build base where clause for tasks
  const baseStatusFilter = {
    status: {
      not: TaskStatus.DONE,
    },
  };

  // Permission logic: Only OWNER and CAPTAIN can see all tasks
  const canViewAllTasks = user.role === "OWNER" || user.role === "CAPTAIN";
  
  // Build the where clause for urgent tasks
  const urgentWhere: any = {
    ...baseStatusFilter,
    priority: TaskPriority.URGENT,
  };

  // Build the where clause for pending (non-urgent) tasks
  const pendingWhere: any = {
    ...baseStatusFilter,
    priority: {
      not: TaskPriority.URGENT,
    },
  };

  // Add permission filter if needed
  if (!canViewAllTasks) {
    urgentWhere.AND = [
      {
        OR: [
          { assigneeId: user.id },
          { assigneeId: null },
          { assigneeRole: user.role },
        ],
      },
    ];
    pendingWhere.AND = [
      {
        OR: [
          { assigneeId: user.id },
          { assigneeId: null },
          { assigneeRole: user.role },
        ],
      },
    ];
  }

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

      // Build final where clauses with tenant scope (manual yachtId since we're using dbUnscoped)
      const urgentWhereFinal = {
        ...urgentWhere,
        yachtId: tenantId,
      };
      const pendingWhereFinal = {
        ...pendingWhere,
        yachtId: tenantId,
      };

      // Debug logging removed for production

      // Get all tasks to count unique task groups (execute sequentially to avoid connection pool exhaustion)
      // (tasks with same title, description, etc. are grouped in UI)
      const allUrgentTasks = await dbUnscoped.task.findMany({
        where: urgentWhereFinal,
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          tripId: true,
          type: true,
          priority: true,
          status: true,
          createdByUserId: true,
          cost: true,
          currency: true,
          serviceProvider: true,
        },
      });
      
      const allPendingTasks = await dbUnscoped.task.findMany({
        where: pendingWhereFinal,
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          tripId: true,
          type: true,
          priority: true,
          status: true,
          createdByUserId: true,
          cost: true,
          currency: true,
          serviceProvider: true,
        },
      });

      // Group tasks by their core properties (same as UI grouping logic)
      const createGroupKey = (task: any) => JSON.stringify({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        tripId: task.tripId,
        type: task.type,
        priority: task.priority,
        status: task.status,
        createdById: task.createdByUserId,
        cost: task.cost,
        currency: task.currency,
        serviceProvider: task.serviceProvider,
      });

      const urgentTaskGroups = new Set(allUrgentTasks.map(createGroupKey));
      const pendingTaskGroups = new Set(allPendingTasks.map(createGroupKey));

      // Execute queries sequentially to avoid connection pool exhaustion
      // Urgent tasks count - use unique groups count (matches UI display)
      const urgentTasksCount = urgentTaskGroups.size;

      // Pending tasks count - use unique groups count (matches UI display)
      const pendingTasksCount = pendingTaskGroups.size;

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

      // Low stock count - fetch all and filter client-side (Prisma doesn't support comparing two columns directly)
      const lowStockCount = hasPermission(user, "inventory.alcohol.view", user.permissions) && tenantId
        ? (await dbUnscoped.alcoholStock.findMany({
            where: {
              yachtId: tenantId,
              lowStockThreshold: {
                not: null,
              },
            },
            select: {
              quantity: true,
              lowStockThreshold: true,
            },
          })).filter((stock: { quantity: number; lowStockThreshold: number | null }) => 
            stock.lowStockThreshold !== null && 
            stock.quantity <= stock.lowStockThreshold
          ).length
        : 0;

      // Unread messages count - fetch channels and then unread counts
      const unreadMessagesCount = tenantId
        ? (async () => {
            const channels = await dbUnscoped.messageChannel.findMany({
              where: {
                yachtId: tenantId,
              },
              select: { id: true },
            });
            
            if (channels.length === 0) return 0;
            
            const channelIds = channels.map((c: { id: string }) => c.id);
            return await dbUnscoped.message.count({
              where: {
                channelId: { in: channelIds },
                deletedAt: null,
                userId: { not: user.id },
                reads: {
                  none: {
                    userId: user.id,
                  },
                },
              },
            });
          })()
        : 0;
      
      const finalUnreadMessagesCount = await unreadMessagesCount;

      // Debug logging removed for production

      return {
        urgentTasksCount,
        pendingTasksCount,
        expiringDocsCount,
        lowStockCount,
        unreadMessagesCount: finalUnreadMessagesCount,
      };
    },
    [`briefing-stats-v3-${tenantId}-${user.role}-${user.id}`],
    { revalidate: 5, tags: [`briefing-${tenantId}`, `tasks-${tenantId}`] }
  )();
}


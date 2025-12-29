import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { ExpenseStatus, TaskStatus, TaskPriority } from "@prisma/client";
import { getCachedCashBalanceByCurrency, getCachedRecentExpenses } from "@/lib/server-cache";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
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
export async function getCalendarEvents(yachtId: string | null, user: DashboardUser) {
  if (!yachtId) return [];
  if (!hasPermission(user, "calendar.view", user.permissions)) return [];

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  return unstable_cache(
    async () => db.calendarEvent.findMany({
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
}

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

  // Create a minimal session object for withTenantScope
  const mockSession = {
    user: {
      yachtId: tenantId || undefined,
      role: user.role,
    },
  } as Session;

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

      // Build final where clauses with tenant scope
      const urgentWhereFinal = withTenantScope(mockSession, urgentWhere);
      const pendingWhereFinal = withTenantScope(mockSession, pendingWhere);

      // Debug: Log the where clauses and also get all tasks to verify
      if (process.env.NODE_ENV === "development") {
        console.log("[DEBUG] Urgent where:", JSON.stringify(urgentWhereFinal, null, 2));
        console.log("[DEBUG] Pending where:", JSON.stringify(pendingWhereFinal, null, 2));
        
        // Get all pending tasks to see what we're counting
        const allPendingTasks = await db.task.findMany({
          where: {
            ...pendingWhereFinal,
          },
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            assigneeId: true,
            assigneeRole: true,
          },
        });
        console.log("[DEBUG] All pending tasks found:", allPendingTasks.length);
        console.log("[DEBUG] Tasks:", allPendingTasks.map((t: { title: string; priority: string; status: string }) => ({
          title: t.title,
          priority: t.priority,
          status: t.status,
        })));
      }

      // Get all tasks to count unique task groups
      // (tasks with same title, description, etc. are grouped in UI)
      const [allUrgentTasks, allPendingTasks] = await Promise.all([
        db.task.findMany({
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
        }),
        db.task.findMany({
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
        }),
      ]);

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

      const [
        urgentTasksCount,
        pendingTasksCount,
        expiringDocsCount,
        lowStockCount,
        unreadMessagesCount,
      ] = await Promise.all([
        // Urgent tasks count - use unique groups count (matches UI display)
        Promise.resolve(urgentTaskGroups.size),

        // Pending tasks count - use unique groups count (matches UI display)
        Promise.resolve(pendingTaskGroups.size),

        // Expiring documents count (marina permissions)
        hasPermission(user, "documents.marina.view", user.permissions) && tenantId
          ? db.marinaPermissionDocument.count({
              where: withTenantScope(mockSession, {
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
              }),
            })
          : Promise.resolve(0),

        // Low stock count - fetch all and filter client-side (Prisma doesn't support comparing two columns directly)
        hasPermission(user, "inventory.alcohol.view", user.permissions) && tenantId
          ? db.alcoholStock.findMany({
              where: withTenantScope(mockSession, {
                lowStockThreshold: {
                  not: null,
                },
              }),
              select: {
                quantity: true,
                lowStockThreshold: true,
              },
            }).then((stocks: Array<{ quantity: number; lowStockThreshold: number | null }>) => 
              stocks.filter((stock: { quantity: number; lowStockThreshold: number | null }) => 
                stock.lowStockThreshold !== null && 
                stock.quantity <= stock.lowStockThreshold
              ).length
            )
          : Promise.resolve(0),

        // Unread messages count - fetch channels and then unread counts
        tenantId
          ? db.messageChannel.findMany({
              where: withTenantScope(mockSession, {}),
              select: { id: true },
            }).then(async (channels: Array<{ id: string }>) => {
              if (channels.length === 0) return 0;
              
              const channelIds = channels.map((c: { id: string }) => c.id);
              const unreadCount = await db.message.count({
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
              
              return unreadCount;
            })
          : Promise.resolve(0),
      ]);

      // Debug: Log the counts
      if (process.env.NODE_ENV === "development") {
        console.log("[DEBUG] Briefing stats:", {
          urgentTasksCount,
          pendingTasksCount,
          expiringDocsCount,
          lowStockCount,
          unreadMessagesCount,
        });
      }

      return {
        urgentTasksCount,
        pendingTasksCount,
        expiringDocsCount,
        lowStockCount,
        unreadMessagesCount,
      };
    },
    [`briefing-stats-v3-${tenantId}-${user.role}-${user.id}`],
    { revalidate: 5, tags: [`briefing-${tenantId}`, `tasks-${tenantId}`] }
  )();
}


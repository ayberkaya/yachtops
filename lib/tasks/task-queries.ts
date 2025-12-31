import "server-only";
import { dbUnscoped } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { TaskStatus, TaskType } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * Cache key helper for task queries
 */
const getCacheKey = (
  tenantId: string | null,
  userRole: string,
  userId: string,
  status: string | null,
  type: string | null,
  assigneeId: string | null,
  dateFrom: string | null,
  dateTo: string | null
) => 
  `tasks-${tenantId || 'none'}-${userRole}-${userId}-${status || 'all'}-${type || 'all'}-${assigneeId || 'all'}-${dateFrom || 'all'}-${dateTo || 'all'}`;

/**
 * Map tab parameter to task type filter
 */
function mapTabToType(tab: string | null): TaskType[] | null {
  if (!tab || tab === "all") return null;
  
  switch (tab) {
    case "general":
      return [TaskType.GENERAL];
    case "maintenance":
      return [TaskType.MAINTENANCE, TaskType.INSPECTION];
    case "repairs":
      return [TaskType.REPAIR];
    default:
      return null;
  }
}

export interface GetTasksParams {
  status?: TaskStatus | null;
  tab?: string | null;
  assigneeId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

/**
 * Fetch tasks with server-side filtering
 */
export async function getTasks(session: Session | null, params: GetTasksParams = {}) {
  if (!session?.user) {
    throw new Error("Session required");
  }

  const tenantId = session.user.yachtId || null;
  const userRole = session.user.role;
  const userId = session.user.id;

  // Don't filter by status by default - show both active and completed tasks
  const status = params.status;
  
  // Map tab to type filter
  const types = mapTabToType(params.tab ?? null);

  // Build base where clause
  const baseWhere: any = {};

  // Status filter - only apply if explicitly provided
  if (status) {
    baseWhere.status = status;
  }

  // Type filter (from tab)
  if (types) {
    baseWhere.type = { in: types };
  }

  // Permission logic: Only OWNER and CAPTAIN can see all tasks
  // Other users can only see tasks assigned to them, their role, or unassigned tasks
  const canViewAllTasks = userRole === "OWNER" || userRole === "CAPTAIN";
  
  // Build permission filter
  const permissionFilter = canViewAllTasks
    ? {}
    : {
        OR: [
          { assigneeId: userId },
          { assigneeId: null },
          { assigneeRole: userRole },
        ],
      };

  // Assignee filter
  if (params.assigneeId) {
    const assigneeFilter = params.assigneeId === "unassigned" 
      ? { assigneeId: null }
      : { assigneeId: params.assigneeId };
    
    // If we have both assignee filter and permission filter, combine them with AND
    if (!canViewAllTasks) {
      baseWhere.AND = [
        permissionFilter,
        assigneeFilter,
      ];
    } else {
      // Can view all, just apply assignee filter directly
      baseWhere.assigneeId = assigneeFilter.assigneeId;
    }
  } else if (!canViewAllTasks) {
    // No assignee filter, just apply permission filter
    baseWhere.OR = permissionFilter.OR;
  }

  // Date range filters
  if (params.dateFrom || params.dateTo) {
    baseWhere.dueDate = {};
    if (params.dateFrom) {
      baseWhere.dueDate.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      baseWhere.dueDate.lte = new Date(params.dateTo);
    }
  }

  return unstable_cache(
    async () => {
      // Manually add yachtId for tenant isolation (using dbUnscoped to avoid session access in cache)
      const where = tenantId 
        ? { ...baseWhere, yachtId: tenantId }
        : baseWhere;
      
      return dbUnscoped.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          completedBy: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          trip: {
            select: { id: true, name: true },
          },
        },
        orderBy: { dueDate: "asc" },
      });
    },
    [
      getCacheKey(
        tenantId,
        userRole,
        userId,
        status,
        params.tab || null,
        params.assigneeId || null,
        params.dateFrom || null,
        params.dateTo || null
      ),
    ],
    { revalidate: 30, tags: [`tasks-${tenantId}`] }
  )();
}


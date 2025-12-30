import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db, dbUnscoped } from "@/lib/db";
import { z } from "zod";
import { withEgressLogging } from "@/lib/egress-middleware";
import { Prisma, TaskStatus, TaskPriority, UserRole, TaskType } from "@prisma/client";
import { sendNotificationToUser, sendNotificationToRole } from "@/lib/notifications";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { unstable_cache } from "next/cache";

const taskSchema = z.object({
  tripId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeRole: z.nativeEnum(UserRole).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.enum(["NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  type: z.nativeEnum(TaskType).optional().default(TaskType.GENERAL),
  cost: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
});

export const GET = withEgressLogging(async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, admin } = tenantResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const tripId = searchParams.get("tripId");
    // Pagination support - ENFORCED: low defaults to reduce egress
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100); // Max 100, default 25 (reduced from 200)
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.TaskWhereInput = {};

    if (status) {
      if (Object.values(TaskStatus).includes(status as TaskStatus)) {
        baseWhere.status = status as TaskStatus;
      } else {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }
    if (assigneeId) {
      baseWhere.assigneeId = assigneeId;
    }
    if (tripId) {
      baseWhere.tripId = tripId;
    }

    // Only OWNER and CAPTAIN can see all tasks
    // Other users can only see tasks assigned to them, their role, or unassigned tasks
    const canViewAllTasks = session!.user.role === "OWNER" || session!.user.role === "CAPTAIN";
    
    if (!canViewAllTasks) {
      baseWhere.OR = [
        { assigneeId: session!.user.id },
        { assigneeId: null },
        { assigneeRole: session!.user.role },
      ];
    }

    const userRole = session!.user.role;
    const userId = session!.user.id; // Extract for closure

    // Build cache key from query parameters (must include all parameters that affect the query)
    const cacheTenantKey = tenantId ?? (admin ? "all" : "missing");
    const cacheKey = `tasks-${cacheTenantKey}-${userRole}-${userId}-${status || 'all'}-${assigneeId || 'all'}-${tripId || 'all'}-${page}-${limit}`;

    // Cache tasks query for 30 seconds
    // Rebuild where clause inside closure to avoid closure issues
    const getTasks = unstable_cache(
      async (
        tenantIdParam: string | null,
        userRoleParam: UserRole,
        userIdParam: string,
        statusParam: string | null,
        assigneeIdParam: string | null,
        tripIdParam: string | null,
        skipParam: number,
        limitParam: number
      ) => {
        const baseWhereParam: Prisma.TaskWhereInput = {};
        if (statusParam) baseWhereParam.status = statusParam as TaskStatus;
        if (assigneeIdParam) baseWhereParam.assigneeId = assigneeIdParam;
        if (tripIdParam) baseWhereParam.tripId = tripIdParam;

        // Only OWNER and CAPTAIN can see all tasks
        // Other users can only see tasks assigned to them, their role, or unassigned tasks
        const canViewAllTasks = userRoleParam === "OWNER" || userRoleParam === "CAPTAIN";
        
        if (!canViewAllTasks) {
          baseWhereParam.OR = [
            { assigneeId: userIdParam },
            { assigneeId: null },
            { assigneeRole: userRoleParam },
          ];
        }

        // Use dbUnscoped to avoid headers() call inside unstable_cache
        // Manually add yachtId for tenant isolation
        const finalWhereParam = tenantIdParam
          ? { ...baseWhereParam, yachtId: tenantIdParam }
          : baseWhereParam;

        return dbUnscoped.task.findMany({
          where: finalWhereParam,
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
          skip: skipParam,
          take: limitParam,
        });
      },
      [cacheKey],
      { revalidate: 30, tags: [`tasks-${cacheTenantKey}`] }
    );

    // Cache count query separately
    const getTotalCount = unstable_cache(
      async (
        tenantIdParam: string | null,
        userRoleParam: UserRole,
        userIdParam: string,
        statusParam: string | null,
        assigneeIdParam: string | null,
        tripIdParam: string | null
      ) => {
        const baseWhereParam: Prisma.TaskWhereInput = {};
        if (statusParam) baseWhereParam.status = statusParam as TaskStatus;
        if (assigneeIdParam) baseWhereParam.assigneeId = assigneeIdParam;
        if (tripIdParam) baseWhereParam.tripId = tripIdParam;

        const canViewAllTasks = userRoleParam === "OWNER" || userRoleParam === "CAPTAIN";
        
        if (!canViewAllTasks) {
          baseWhereParam.OR = [
            { assigneeId: userIdParam },
            { assigneeId: null },
            { assigneeRole: userRoleParam },
          ];
        }

        // Use dbUnscoped to avoid headers() call inside unstable_cache
        // Manually add yachtId for tenant isolation
        const finalWhereParam = tenantIdParam
          ? { ...baseWhereParam, yachtId: tenantIdParam }
          : baseWhereParam;

        return dbUnscoped.task.count({ 
          where: finalWhereParam 
        });
      },
      [`${cacheKey}-count`],
      { revalidate: 30, tags: [`tasks-${cacheTenantKey}`] }
    );

    const [tasks, totalCount] = await Promise.all([
      getTasks(tenantId, userRole, userId, status, assigneeId, tripId, skip, limit),
      getTotalCount(tenantId, userRole, userId, status, assigneeId, tripId),
    ]);

    // Always return paginated response for consistency and egress control
    const hasPagination = true; // Always paginated now

    // Cache for 30 seconds - tasks change frequently but not instantly
    return NextResponse.json(
      {
        data: tasks,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});


export const POST = withEgressLogging(async function POST(request: NextRequest) {
  let body: unknown = null;
  
  try {
    const session = await getSession();
    
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId } = tenantResult;
    
    // Check if user has permission to create tasks
    if (!hasPermission(session!.user, "tasks.create", session!.user.permissions) && !canManageUsers(session!.user)) {
      return NextResponse.json({ error: "Forbidden: You don't have permission to create tasks" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantId;

    // Parse request body with error handling
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body", message: parseError instanceof Error ? parseError.message : "Failed to parse JSON" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Clean up the data: convert "none" strings to null for enum fields
    // Also ensure assigneeRole is a valid UserRole enum value or null
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const bodyObj = body as Record<string, unknown>;

    const assigneeRoleRaw = bodyObj.assigneeRole;
    let assigneeRoleValue: UserRole | null = null;
    if (
      assigneeRoleRaw === "none" ||
      assigneeRoleRaw === null ||
      typeof assigneeRoleRaw === "undefined" ||
      assigneeRoleRaw === ""
    ) {
      assigneeRoleValue = null;
    } else if (
      typeof assigneeRoleRaw === "string" &&
      Object.values(UserRole).includes(assigneeRoleRaw as UserRole)
    ) {
      assigneeRoleValue = assigneeRoleRaw as UserRole;
    } else {
      return NextResponse.json(
        { error: `Invalid assigneeRole. Must be one of: ${Object.values(UserRole).join(", ")}` },
        { status: 400 }
      );
    }
    
    const cleanedBody = {
      ...bodyObj,
      tripId: bodyObj.tripId === "none" || !bodyObj.tripId ? null : bodyObj.tripId,
      assigneeId: bodyObj.assigneeId === "none" || !bodyObj.assigneeId ? null : bodyObj.assigneeId,
      assigneeRole: assigneeRoleValue,
    };
    
    const validated = taskSchema.parse(cleanedBody);
    const task = await db.task.create({
      data: {
        yachtId: ensuredTenantId,
        tripId: validated.tripId || null,
        title: validated.title,
        description: validated.description || null,
        assigneeId: validated.assigneeId || null,
        assigneeRole: validated.assigneeRole || null,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        status: validated.status,
        priority: (validated.priority || "NORMAL") as TaskPriority,
        type: validated.type || TaskType.GENERAL,
        cost: validated.cost || null,
        currency: validated.currency || null,
        serviceProvider: validated.serviceProvider || null,
        createdByUserId: session!.user.id,
      },
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
    });
    
    // Send push notifications if task is assigned
    // Don't await to avoid blocking the response, but handle errors
    if (task.assigneeId || task.assigneeRole) {
      (async () => {
        try {
          if (task.assigneeId) {
            // Notify specific user
            await sendNotificationToUser(task.assigneeId, {
              title: "New Task Assigned",
              body: task.title,
              url: `/dashboard/tasks/${task.id}`,
              tag: task.id,
              requireInteraction: true,
            });
          } else if (task.assigneeRole) {
            // Notify all users with the assigned role
            await sendNotificationToRole(
              task.assigneeRole,
              {
                title: "New Role Task",
                body: `A task has been assigned to your department: ${task.title}`,
                url: `/dashboard/tasks/${task.id}`,
                tag: task.id,
                requireInteraction: true,
              },
              ensuredTenantId
            );
          }
        } catch (error) {
          console.error("Failed to send task assignment notification:", error);
          // Don't throw - notification failure shouldn't break task creation
        }
      })();
    }
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    // Always return JSON, even for errors
    if (error instanceof z.ZodError) {
      console.error("Validation error creating task:", error.issues);
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    console.error("Error creating task:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Ensure we always return a JSON response
    try {
      return NextResponse.json(
        { 
          error: "Internal server error", 
          message: errorMessage,
          ...(process.env.NODE_ENV === "development" && errorStack ? { stack: errorStack } : {})
        },
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (responseError) {
      // Fallback if JSON creation fails
      console.error("Failed to create error response:", responseError);
      return new NextResponse(
        JSON.stringify({ error: "Internal server error", message: "Failed to process request" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
});


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { z } from "zod";
import { TaskStatus, TaskPriority, UserRole } from "@prisma/client";
import { notifyTaskAssignment } from "@/lib/notifications";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const taskSchema = z.object({
  tripId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeRole: z.nativeEnum(UserRole).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const tripId = searchParams.get("tripId");

    const where: any = {
      yachtId: tenantId || undefined,
    };

    if (status) {
      where.status = status;
    }
    if (assigneeId) {
      where.assigneeId = assigneeId;
    }
    if (tripId) {
      where.tripId = tripId;
    }

    // CREW can see their own tasks, unassigned tasks, or tasks assigned to their role
    if (session.user.role === "CREW") {
      where.OR = [
        { assigneeId: session.user.id },
        { assigneeId: null },
        { assigneeRole: session.user.role },
      ];
    }

    const tasks = await db.task.findMany({
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

    return NextResponse.json(tasks);
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
}


export async function POST(request: NextRequest) {
  console.log("POST /api/tasks - Route handler called");
  let body: any = null;
  
  try {
    console.log("POST /api/tasks - Getting session...");
    const session = await getSession();
    console.log("POST /api/tasks - Session obtained:", session?.user ? "User logged in" : "No user");
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    // Check if user has permission to create tasks
    if (!hasPermission(session.user, "tasks.create", session.user.permissions) && !canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden: You don't have permission to create tasks" }, { status: 403 });
    }

    if (!tenantIdFromSession) {
      console.log("POST /api/tasks - Bad request: No tenantId");
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantIdFromSession as string;

    // Parse request body with error handling
    console.log("POST /api/tasks - Parsing request body...");
    try {
      body = await request.json();
      console.log("POST /api/tasks - Received task creation request:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body", message: parseError instanceof Error ? parseError.message : "Failed to parse JSON" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Clean up the data: convert "none" strings to null for enum fields
    // Also ensure assigneeRole is a valid UserRole enum value or null
    let assigneeRoleValue = body.assigneeRole;
    if (assigneeRoleValue === "none" || !assigneeRoleValue) {
      assigneeRoleValue = null;
    } else if (typeof assigneeRoleValue === "string") {
      // Ensure it's a valid enum value
      if (!Object.values(UserRole).includes(assigneeRoleValue as UserRole)) {
        console.error("Invalid assigneeRole value:", assigneeRoleValue);
        return NextResponse.json(
          { error: `Invalid assigneeRole: ${assigneeRoleValue}. Must be one of: ${Object.values(UserRole).join(", ")}` },
          { status: 400 }
        );
      }
    }
    
    const cleanedBody = {
      ...body,
      tripId: body.tripId === "none" || !body.tripId ? null : body.tripId,
      assigneeId: body.assigneeId === "none" || !body.assigneeId ? null : body.assigneeId,
      assigneeRole: assigneeRoleValue,
    };
    
    console.log("Cleaned task data:", JSON.stringify(cleanedBody, null, 2));
    
    const validated = taskSchema.parse(cleanedBody);
    console.log("Validated task data:", JSON.stringify(validated, null, 2));

    console.log("POST /api/tasks - Creating task in database...");
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
        priority: (validated.priority || "MEDIUM") as TaskPriority,
        createdByUserId: session.user.id,
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

    console.log("POST /api/tasks - Task created successfully:", task.id);
    
    // Create notification if task is assigned
    if (task.assigneeId || task.assigneeRole) {
      await notifyTaskAssignment(
        task.id,
        task.assigneeId,
        task.assigneeRole,
        task.title
      );
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
    console.error("Request body:", body);
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
}


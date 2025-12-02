import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/auth";
import { TaskStatus, TaskPriority, UserRole } from "@prisma/client";
import { z } from "zod";
import { notifyTaskAssignment, notifyTaskCompletion } from "@/lib/notifications";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeRole: z.nativeEnum(UserRole).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const task = await db.task.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        completedBy: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // CREW can view their own tasks, unassigned tasks, or tasks assigned to their role
    if (session.user.role === "CREW") {
      const canView = 
        !task.assigneeId || // Unassigned
        task.assigneeId === session.user.id || // Assigned to them
        task.assigneeRole === session.user.role; // Assigned to their role
      
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Clean up the data: convert "none" strings to null for enum fields
    const cleanedBody = {
      ...body,
      assigneeId: body.assigneeId === "none" || body.assigneeId === "" ? null : body.assigneeId,
      assigneeRole: body.assigneeRole === "none" || body.assigneeRole === "" ? null : body.assigneeRole,
    };
    
    const validated = updateTaskSchema.parse(cleanedBody);

    const existingTask = await db.task.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // CREW can update status of their own tasks, unassigned tasks, or tasks assigned to their role
    if (session.user.role === "CREW") {
      const canUpdate = 
        !existingTask.assigneeId || // Unassigned
        existingTask.assigneeId === session.user.id || // Assigned to them
        existingTask.assigneeRole === session.user.role; // Assigned to their role
      
      if (!canUpdate) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // CREW can only update status
      const updateData: any = {};
      if (validated.status) {
        updateData.status = validated.status;
        // If marking as DONE and not already completed, set completedBy and completedAt
        if (validated.status === TaskStatus.DONE && !existingTask.completedById) {
          updateData.completedById = session.user.id;
          updateData.completedAt = new Date();
        }
        // If marking as not DONE, clear completion info
        if (validated.status !== TaskStatus.DONE) {
          updateData.completedById = null;
          updateData.completedAt = null;
        }
      }
      
      // If no updates, return existing task
      if (Object.keys(updateData).length === 0) {
        const task = await db.task.findUnique({
          where: { id },
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
            completedBy: {
              select: { id: true, name: true, email: true },
            },
            trip: {
              select: { id: true, name: true },
            },
          },
        });
        return NextResponse.json(task);
      }
      
      const task = await db.task.update({
        where: { id },
        data: updateData,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          completedBy: {
            select: { id: true, name: true, email: true },
          },
          trip: {
            select: { id: true, name: true },
          },
        },
      });

      // Create notification if task was completed
      if (validated.status === TaskStatus.DONE && !existingTask.completedById && task.completedBy) {
        await notifyTaskCompletion(
          task.id,
          task.title,
          task.completedBy
        );
      }

      return NextResponse.json(task);
    }

    // OWNER/CAPTAIN can update everything
    const updateData: any = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.assigneeId !== undefined) {
      updateData.assigneeId = validated.assigneeId;
      // If assigning to a person, clear role assignment
      if (validated.assigneeId) {
        updateData.assigneeRole = null;
      }
    }
    if (validated.assigneeRole !== undefined) {
      updateData.assigneeRole = validated.assigneeRole;
      // If assigning to a role, clear person assignment
      if (validated.assigneeRole) {
        updateData.assigneeId = null;
      }
    }
    if (validated.dueDate !== undefined) {
      updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }
    if (validated.priority !== undefined) {
      updateData.priority = validated.priority as TaskPriority;
    }
    if (validated.status) {
      updateData.status = validated.status;
      // If marking as DONE and not already completed, set completedBy and completedAt
      if (validated.status === TaskStatus.DONE && !existingTask.completedById) {
        updateData.completedById = session.user.id;
        updateData.completedAt = new Date();
      }
      // If marking as not DONE, clear completion info
      if (validated.status !== TaskStatus.DONE) {
        updateData.completedById = null;
        updateData.completedAt = null;
      }
    }

    // If no updates, return existing task
    if (Object.keys(updateData).length === 0) {
      const task = await db.task.findUnique({
        where: { id },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          completedBy: {
            select: { id: true, name: true, email: true },
          },
          trip: {
            select: { id: true, name: true },
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          attachments: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      return NextResponse.json(task);
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        completedBy: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Create notifications
    // Check if assignment changed
    if (validated.assigneeId !== undefined && validated.assigneeId !== existingTask.assigneeId) {
      await notifyTaskAssignment(
        task.id,
        task.assigneeId,
        task.assigneeRole,
        task.title
      );
    } else if (validated.assigneeRole !== undefined && validated.assigneeRole !== existingTask.assigneeRole) {
      await notifyTaskAssignment(
        task.id,
        task.assigneeId,
        task.assigneeRole,
        task.title
      );
    }

    // Check if task was completed
    if (validated.status === TaskStatus.DONE && !existingTask.completedById && task.completedBy) {
      await notifyTaskCompletion(
        task.id,
        task.title,
        task.completedBy
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error updating task:", error.issues);
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Error updating task:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await db.task.delete({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";

const taskSchema = z.object({
  tripId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const tripId = searchParams.get("tripId");

    const where: any = {
      yachtId: session.user.yachtId || undefined,
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

    // CREW can only see their own tasks
    if (session.user.role === "CREW") {
      where.assigneeId = session.user.id;
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        assignee: {
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user.yachtId) {
      return NextResponse.json(
        { error: "User must be assigned to a yacht" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = taskSchema.parse(body);

    const task = await db.task.create({
      data: {
        yachtId: session.user.yachtId,
        tripId: validated.tripId || null,
        title: validated.title,
        description: validated.description || null,
        assigneeId: validated.assigneeId || null,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        status: validated.status,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


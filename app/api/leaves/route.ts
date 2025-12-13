import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { z } from "zod";
import { LeaveType, LeaveStatus } from "@prisma/client";

const createLeaveSchema = z.object({
  userId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  type: z.nativeEnum(LeaveType),
  reason: z.string().optional().nullable(),
  status: z.nativeEnum(LeaveStatus).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.yachtId) {
      return NextResponse.json({ error: "No yacht assigned" }, { status: 400 });
    }

    // Check permission
    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      yachtId: session.user.yachtId,
    };

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.OR = [];
      if (startDate && endDate) {
        // Find leaves that overlap with the date range
        where.OR.push({
          AND: [
            { startDate: { lte: new Date(endDate) } },
            { endDate: { gte: new Date(startDate) } },
          ],
        });
      } else if (startDate) {
        where.OR.push({
          endDate: { gte: new Date(startDate) },
        });
      } else if (endDate) {
        where.OR.push({
          startDate: { lte: new Date(endDate) },
        });
      }
    }

    const leaves = await db.leave.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { startDate: "asc" },
      ],
    });

    return NextResponse.json(
      leaves.map((leave) => ({
        ...leave,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        createdAt: leave.createdAt.toISOString(),
        updatedAt: leave.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching leaves:", error);
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

    if (!session.user.yachtId) {
      return NextResponse.json({ error: "No yacht assigned" }, { status: 400 });
    }

    // Check permission - users.view is enough to create leaves
    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createLeaveSchema.parse(body);

    // Verify user belongs to same yacht
    const user = await db.user.findUnique({
      where: { id: validated.userId },
      select: { yachtId: true },
    });

    if (!user || user.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check for overlapping leaves
    const overlappingLeaves = await db.leave.findFirst({
      where: {
        userId: validated.userId,
        yachtId: session.user.yachtId,
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(validated.endDate) } },
              { endDate: { gte: new Date(validated.startDate) } },
            ],
          },
        ],
      },
    });

    if (overlappingLeaves) {
      return NextResponse.json(
        { error: "Leave already exists for this date range" },
        { status: 400 }
      );
    }

    const leave = await db.leave.create({
      data: {
        yachtId: session.user.yachtId,
        userId: validated.userId,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        type: validated.type,
        reason: validated.reason || null,
        status: validated.status || LeaveStatus.PENDING,
        createdByUserId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...leave,
      startDate: leave.startDate.toISOString().split("T")[0],
      endDate: leave.endDate.toISOString().split("T")[0],
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating leave:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


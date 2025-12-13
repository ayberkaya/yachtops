import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { z } from "zod";

// Define enums manually to avoid Prisma client import issues
const LeaveType = {
  ANNUAL_LEAVE: "ANNUAL_LEAVE",
  SICK_LEAVE: "SICK_LEAVE",
  PERSONAL_LEAVE: "PERSONAL_LEAVE",
  EMERGENCY_LEAVE: "EMERGENCY_LEAVE",
} as const;

const LeaveStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

type LeaveType = typeof LeaveType[keyof typeof LeaveType];
type LeaveStatus = typeof LeaveStatus[keyof typeof LeaveStatus];

const updateLeaveSchema = z.object({
  userId: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  type: z.nativeEnum(LeaveType).optional(),
  reason: z.string().optional().nullable(),
  status: z.nativeEnum(LeaveStatus).optional(),
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

    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const leave = await db.leave.findUnique({
      where: { id },
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

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    if (leave.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...leave,
      startDate: leave.startDate.toISOString().split("T")[0],
      endDate: leave.endDate.toISOString().split("T")[0],
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching leave:", error);
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

    if (!session.user.yachtId) {
      return NextResponse.json({ error: "No yacht assigned" }, { status: 400 });
    }

    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateLeaveSchema.parse(body);

    const existingLeave = await db.leave.findUnique({
      where: { id },
      select: { yachtId: true, userId: true },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    if (existingLeave.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If status is being updated to APPROVED, set approvedBy
    const updateData: any = {};
    if (validated.startDate) updateData.startDate = new Date(validated.startDate);
    if (validated.endDate) updateData.endDate = new Date(validated.endDate);
    if (validated.type) updateData.type = validated.type;
    if (validated.reason !== undefined) updateData.reason = validated.reason;
    if (validated.status) {
      updateData.status = validated.status;
      if (validated.status === "APPROVED") {
        updateData.approvedByUserId = session.user.id;
      } else if (validated.status === "PENDING") {
        updateData.approvedByUserId = null;
      }
    }
    if (validated.userId) {
      // Verify new user belongs to same yacht
      const user = await db.user.findUnique({
        where: { id: validated.userId },
        select: { yachtId: true },
      });
      if (!user || user.yachtId !== session.user.yachtId) {
        return NextResponse.json({ error: "Invalid user" }, { status: 400 });
      }
      updateData.userId = validated.userId;
    }

    const leave = await db.leave.update({
      where: { id },
      data: updateData,
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

    console.error("Error updating leave:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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

    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingLeave = await db.leave.findUnique({
      where: { id },
      select: { yachtId: true, createdByUserId: true },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    if (existingLeave.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only creator or users with appropriate permissions can delete
    const canDelete =
      existingLeave.createdByUserId === session.user.id ||
      hasPermission(session.user, "users.delete", session.user.permissions);

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.leave.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting leave:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


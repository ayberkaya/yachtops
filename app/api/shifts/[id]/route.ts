import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shift = await db.shift.findUnique({
      where: { id: params.id },
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
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...shift,
      date: shift.date.toISOString().split("T")[0],
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching shift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shift = await db.shift.findUnique({
      where: { id: params.id },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, date, startTime, endTime, type, notes } = body;

    const updateData: any = {};
    if (userId !== undefined) {
      // Verify user belongs to same yacht
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { yachtId: true },
      });

      if (!user || user.yachtId !== session.user.yachtId) {
        return NextResponse.json({ error: "Invalid user" }, { status: 400 });
      }
      updateData.userId = userId;
    }
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (type !== undefined) updateData.type = type;
    if (notes !== undefined) updateData.notes = notes || null;

    const updatedShift = await db.shift.update({
      where: { id: params.id },
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
      },
    });

    return NextResponse.json({
      ...updatedShift,
      date: updatedShift.date.toISOString().split("T")[0],
      startTime: updatedShift.startTime.toISOString(),
      endTime: updatedShift.endTime.toISOString(),
      createdAt: updatedShift.createdAt.toISOString(),
      updatedAt: updatedShift.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating shift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shift = await db.shift.findUnique({
      where: { id: params.id },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.shift.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

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
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const shifts = await db.shift.findMany({
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
      },
      orderBy: [
        { date: "desc" },
        { startTime: "asc" },
      ],
    });

    return NextResponse.json(
      shifts.map((shift) => ({
        ...shift,
        date: shift.date.toISOString().split("T")[0],
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        createdAt: shift.createdAt.toISOString(),
        updatedAt: shift.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching shifts:", error);
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

    // Check permission - users.view is enough to create shifts
    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, date, startTime, endTime, type, notes } = body;

    if (!userId || !date || !startTime || !endTime || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user belongs to same yacht
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { yachtId: true },
    });

    if (!user || user.yachtId !== session.user.yachtId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const shift = await db.shift.create({
      data: {
        yachtId: session.user.yachtId,
        userId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type,
        notes: notes || null,
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
      },
    });

    return NextResponse.json({
      ...shift,
      date: shift.date.toISOString().split("T")[0],
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: any = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await db.notification.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
          },
        },
        message: {
          select: {
            id: true,
            channelId: true,
            content: true,
            channel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, read } = body;

    if (id) {
      // Mark single notification as read
      const notification = await db.notification.update({
        where: {
          id,
          userId: session.user.id, // Ensure user can only update their own notifications
        },
        data: { read: read !== undefined ? read : true },
      });
      return NextResponse.json(notification);
    } else {
      // Mark all notifications as read
      await db.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


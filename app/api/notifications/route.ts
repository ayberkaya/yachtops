import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const userId = session.user.id; // Extract to avoid closure issues

    // Cache notifications for 30 seconds to reduce database load
    const cacheKey = `notifications-${userId}-${unreadOnly}`;
    const getNotifications = unstable_cache(
      async (userIdParam: string, unreadOnlyParam: boolean) => {
        const where: any = {
          userId: userIdParam,
          // Filter out notifications for completed tasks directly in database
          OR: [
            { taskId: null }, // Notifications without tasks
            {
              task: {
                status: {
                  not: TaskStatus.DONE,
                },
              },
            },
          ],
        };

        if (unreadOnlyParam) {
          where.read = false;
        }

        return db.notification.findMany({
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
      },
      [cacheKey],
      { revalidate: 30, tags: [`notifications-${userId}`] }
    );

    const notifications = await getNotifications(userId, unreadOnly);

    return NextResponse.json(notifications, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
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


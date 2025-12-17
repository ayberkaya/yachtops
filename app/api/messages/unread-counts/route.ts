import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";

/**
 * Get unread message counts for multiple channels in a single request
 * This reduces bandwidth by batching requests and only returning counts
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const channelIds: string[] = Array.isArray(body.channelIds) ? body.channelIds : [];

    if (channelIds.length === 0) {
      return NextResponse.json({});
    }

    const tenantId = getTenantId(session);

    // Get all channels user has access to
    const channels = await db.messageChannel.findMany({
      where: {
        id: { in: channelIds },
        yachtId: tenantId || undefined,
      },
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    // Filter channels user can access
    const accessibleChannels = channels.filter((channel: { isGeneral: boolean; members: Array<{ id: string }> }) => {
      if (channel.isGeneral) return true;
      return channel.members.some((m: { id: string }) => m.id === session.user.id);
    });

    const accessibleChannelIds = accessibleChannels.map((c: { id: string }) => c.id);

    // Get unread counts for accessible channels only
    // Count messages that:
    // 1. Are in accessible channels
    // 2. Are not deleted
    // 3. Are not sent by current user
    // 4. Have no read record for current user
    const unreadCounts: Record<string, number> = {};

    // Batch count queries for better performance
    const countPromises = accessibleChannelIds.map(async (channelId: string) => {
      const count = await db.message.count({
        where: {
          channelId,
          deletedAt: null,
          userId: { not: session.user.id },
          reads: {
            none: {
              userId: session.user.id,
            },
          },
        },
      });
      return { channelId, count };
    });

    const countResults = await Promise.all(countPromises);
    for (const { channelId, count } of countResults) {
      unreadCounts[channelId] = count;
    }

    // Return counts for all requested channels (0 for inaccessible ones)
    const result: Record<string, number> = {};
    for (const channelId of channelIds) {
      result[channelId] = unreadCounts[channelId] || 0;
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=20',
      },
    });
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


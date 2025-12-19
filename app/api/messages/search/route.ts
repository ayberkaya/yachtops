import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const channelId = searchParams.get("channelId");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    // Build where clause
    // SQLite doesn't support case-insensitive search directly, so we'll use contains
    const where: any = {
      deletedAt: null,
      content: {
        contains: query,
      },
    };

    if (channelId) {
      // Check channel access
      const channel = await db.messageChannel.findFirst({
        where: withTenantScope(scopedSession, { id: channelId }),
        include: {
          members: {
            select: { id: true },
          },
        },
      });

      if (!channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }

      if (!channel.isGeneral && !channel.members.some((m: { id: string }) => m.id === session.user.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      where.channelId = channelId;
    } else {
      // Search across all accessible channels
      const accessibleChannels = await db.messageChannel.findMany({
        where: withTenantScope(scopedSession, {
          OR: [
            { isGeneral: true },
            {
              members: {
                some: {
                  id: session.user.id,
                },
              },
            },
          ],
        }),
        select: { id: true },
      });

      where.channelId = {
        in: accessibleChannels.map((ch: { id: string }) => ch.id),
      };
    }

    const messages = await db.message.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        channel: {
          select: { id: true, name: true },
        },
        reads: {
          select: {
            userId: true,
            readAt: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit results
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error searching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


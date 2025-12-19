import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const channelSchema = z.object({
  name: z.string().min(1, "Channel name is required"),
  description: z.string().optional(),
  isGeneral: z.boolean().default(false),
  memberIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    // Get all channels for the yacht
    const allChannels = await db.messageChannel.findMany({
      where: {
        yachtId: tenantId || undefined,
      },
      include: {
        members: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Filter channels based on user access
    const accessibleChannels = allChannels.filter((channel: (typeof allChannels)[number]) => {
      // General channel - everyone can access
      if (channel.isGeneral) return true;
      
      // Private channels - only members can access
      return channel.members.some((member: { id: string }) => member.id === session.user.id);
    });

    // Sort: General channel always first, then others by creation date
    const sortedChannels = accessibleChannels.sort((a, b) => {
      if (a.isGeneral && !b.isGeneral) return -1;
      if (!a.isGeneral && b.isGeneral) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json(sortedChannels);
  } catch (error) {
    console.error("Error fetching channels:", error);
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

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }
    const ensuredTenantId = tenantId as string;

    // Only OWNER/CAPTAIN can create channels
    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = channelSchema.parse(body);

    // Check if channel with same name already exists for this yacht
    const existingChannel = await db.messageChannel.findFirst({
      where: {
        yachtId: ensuredTenantId,
        name: validated.name,
      },
    });

    if (existingChannel) {
      return NextResponse.json(
        { error: `A channel with the name "${validated.name}" already exists` },
        { status: 409 } // Conflict
      );
    }

    const channel = await db.messageChannel.create({
      data: {
        yachtId: ensuredTenantId,
        name: validated.name,
        description: validated.description || null,
        isGeneral: validated.isGeneral,
        createdByUserId: session.user.id,
        members: validated.memberIds && validated.memberIds.length > 0
          ? {
              connect: validated.memberIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        members: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating channel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


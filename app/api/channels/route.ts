import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

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

    // Get all channels for the yacht
    const allChannels = await db.messageChannel.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
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
    const accessibleChannels = allChannels.filter((channel) => {
      // General channel - everyone can access
      if (channel.isGeneral) return true;
      
      // Private channels - only members can access
      return channel.members.some((member) => member.id === session.user.id);
    });

    return NextResponse.json(accessibleChannels);
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

    // Only OWNER/CAPTAIN can create channels
    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = channelSchema.parse(body);

    const channel = await db.messageChannel.create({
      data: {
        yachtId: session.user.yachtId!,
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
        { error: "Invalid input", details: error.errors },
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


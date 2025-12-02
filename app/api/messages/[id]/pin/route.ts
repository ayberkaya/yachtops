import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const pinSchema = z.object({
  isPinned: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = pinSchema.parse(body);

    const message = await db.message.findUnique({
      where: { id, deletedAt: null },
      include: {
        channel: {
          include: {
            members: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check channel access
    if (!message.channel.isGeneral && 
        !message.channel.members.some((m) => m.id === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only channel members can pin/unpin
    const hasAccess = message.channel.isGeneral || 
                     message.channel.members.some((m) => m.id === session.user.id);
    
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedMessage = await db.message.update({
      where: { id },
      data: {
        isPinned: validated.isPinned,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
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
        attachments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error pinning/unpinning message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


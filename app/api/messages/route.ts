import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const messageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1, "Message content is required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 }
      );
    }

    // Check if user has access to this channel
    const channel = await db.messageChannel.findUnique({
      where: {
        id: channelId,
        yachtId: session.user.yachtId || undefined,
      },
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Check access
    if (!channel.isGeneral && !channel.members.some((m) => m.id === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await db.message.findMany({
      where: {
        channelId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100, // Limit to last 100 messages
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
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

    const body = await request.json();
    const validated = messageSchema.parse(body);

    // Check if user has access to this channel
    const channel = await db.messageChannel.findUnique({
      where: {
        id: validated.channelId,
        yachtId: session.user.yachtId || undefined,
      },
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Check access
    if (!channel.isGeneral && !channel.members.some((m) => m.id === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await db.message.create({
      data: {
        channelId: validated.channelId,
        userId: session.user.id,
        content: validated.content,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


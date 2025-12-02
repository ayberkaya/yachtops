import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const messageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
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

    // Check if request has FormData (image upload) or JSON
    const contentType = request.headers.get("content-type") || "";
    let validated: z.infer<typeof messageSchema>;

    // Try to parse as FormData first (for image uploads)
    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const channelId = formData.get("channelId") as string;
        const content = formData.get("content") as string | null;

        let imageUrl: string | null = null;
        if (file && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = file.type || "image/jpeg";
          const base64 = buffer.toString("base64");
          imageUrl = `data:${mimeType};base64,${base64}`;
        }

        validated = messageSchema.parse({
          channelId: channelId || "",
          content: content || null,
          imageUrl,
        });
      } catch (formError) {
        console.error("Error parsing FormData:", formError);
        return NextResponse.json(
          { error: "Invalid form data" },
          { status: 400 }
        );
      }
    } else {
      // Parse as JSON
      try {
        const body = await request.json();
        validated = messageSchema.parse(body);
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        return NextResponse.json(
          { error: "Invalid JSON data" },
          { status: 400 }
        );
      }
    }

    // Validate that at least content or imageUrl is provided
    const hasContent = validated.content && validated.content.trim().length > 0;
    const hasImage = validated.imageUrl && validated.imageUrl.length > 0;
    
    if (!hasContent && !hasImage) {
      return NextResponse.json(
        { error: "Message content or image is required" },
        { status: 400 }
      );
    }

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

    const messageData: {
      channelId: string;
      userId: string;
      content: string;
      imageUrl?: string | null;
    } = {
      channelId: validated.channelId,
      userId: session.user.id,
      content: hasContent ? validated.content!.trim() : "",
    };

    if (hasImage) {
      messageData.imageUrl = validated.imageUrl!;
    }

    const message = await db.message.create({
      data: messageData,
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
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


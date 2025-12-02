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
        deletedAt: null,
        parentMessageId: null, // Only top-level messages, replies are fetched separately
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
        replies: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 10, // Limit replies per message
        },
        attachments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100, // Limit to last 100 messages
    });

    // Mark messages as read for current user when fetching
    // Only mark messages that are not sent by current user
    const unreadMessages = messages.filter(
      (msg) => msg.userId !== session.user.id
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      
      // Check which messages are already read
      const existingReads = await db.messageRead.findMany({
        where: {
          messageId: { in: messageIds },
          userId: session.user.id,
        },
        select: { messageId: true },
      });

      const alreadyReadIds = new Set(existingReads.map((r) => r.messageId));
      const toMarkAsRead = messageIds.filter((id) => !alreadyReadIds.has(id));

      // Mark unread messages as read
      if (toMarkAsRead.length > 0) {
        await db.messageRead.createMany({
          data: toMarkAsRead.map((messageId) => ({
            messageId,
            userId: session.user.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Re-fetch messages to include newly created reads
    const updatedMessages = await db.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        parentMessageId: null,
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
        replies: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 10,
        },
        attachments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(updatedMessages);
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

    console.log("POST /api/messages - Starting request processing");
    
    // Check if request has FormData (image upload) or JSON
    const contentType = request.headers.get("content-type") || "";
    console.log("Content-Type:", contentType);
    let validated: z.infer<typeof messageSchema>;
    let hasFiles = false;

    // Try to parse as FormData first (for image/uploads)
    if (contentType.includes("multipart/form-data")) {
      try {
        console.log("Parsing FormData...");
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const files = formData.getAll("file") as File[];
        const channelId = formData.get("channelId") as string;
        const content = formData.get("content") as string | null;

        console.log("FormData parsed - channelId:", channelId, "hasImage:", !!file, "hasFiles:", files.length, "hasContent:", !!content);

        if (!channelId) {
          console.error("Channel ID is missing");
          return NextResponse.json(
            { error: "Channel ID is required" },
            { status: 400 }
          );
        }

        // Check if there are files (for attachments)
        hasFiles = files.some((f) => f && f.size > 0);
        console.log("hasFiles:", hasFiles);

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
        if (formError instanceof z.ZodError) {
          return NextResponse.json(
            { error: "Invalid form data", details: formError.errors },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Invalid form data", details: formError instanceof Error ? formError.message : String(formError) },
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
        if (jsonError instanceof z.ZodError) {
          return NextResponse.json(
            { error: "Invalid JSON data", details: jsonError.errors },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Invalid JSON data", details: jsonError instanceof Error ? jsonError.message : String(jsonError) },
          { status: 400 }
        );
      }
    }

    // Validate that at least content, imageUrl, or files are provided
    const hasContent = validated.content && validated.content.trim().length > 0;
    const hasImage = validated.imageUrl && validated.imageUrl.length > 0;
    
    console.log("Validation - hasContent:", hasContent, "hasImage:", hasImage, "hasFiles:", hasFiles);
    
    if (!hasContent && !hasImage && !hasFiles) {
      console.error("Validation failed - no content, image, or files");
      return NextResponse.json(
        { error: "Message content, image, or file attachment is required" },
        { status: 400 }
      );
    }

    console.log("Checking channel access...");
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
      content: string | null;
      imageUrl?: string | null;
    } = {
      channelId: validated.channelId,
      userId: session.user.id,
      content: hasContent ? validated.content!.trim() : null,
    };

    if (hasImage) {
      messageData.imageUrl = validated.imageUrl!;
    }

    console.log("Creating message...");
    const message = await db.message.create({
      data: messageData,
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

    console.log("Message created successfully:", message.id);
    
    // Notify mentions (async, don't wait)
    const { notifyMentions } = await import("@/lib/message-notifications");
    const senderName = session.user.name || session.user.email;
    notifyMentions(
      message.id,
      validated.channelId,
      message.content,
      senderName,
      session.user.yachtId || null
    ).catch(err => console.error("Error sending mention notifications:", err));
    
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
    
    // Return more detailed error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


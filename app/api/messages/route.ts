import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { createErrorResponse } from "@/lib/api-error-handler";

const messageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;
    
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 }
      );
    }

    // Check if user has access to this channel
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

    // Check access
    if (!channel.isGeneral && !channel.members.some((m: { id: string }) => m.id === session!.user.id)) {
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
            // Removed user object from reads - not needed, saves bandwidth
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
          select: {
            id: true,
            fileName: true,
            // REMOVED: fileUrl to prevent base64 egress - use /api/messages/[id]/attachments/[attachmentId] for file data
            fileSize: true,
            mimeType: true,
            createdAt: true,
            userId: true, // Only ID, not full user object - saves bandwidth
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50, // Reduced from 100 to limit egress
    });

    // REMOVE imageUrl from response to prevent base64 egress in list endpoints
    // Use /api/messages/[id]/image endpoint for lazy loading
    const messagesWithoutImages = messages.map((msg: any) => {
      const { imageUrl, ...rest } = msg;
      return rest;
    });

    // Mark messages as read for current user when fetching (non-blocking)
    // Only mark messages that are not sent by current user
    const unreadMessages = messagesWithoutImages.filter(
      (msg: { userId: string }) => msg.userId !== session!.user.id
    );

    // Mark as read in background - don't block response
    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg: { id: string }) => msg.id);
      
      // Check which messages are already read
      db.messageRead.findMany({
        where: {
          messageId: { in: messageIds },
          userId: session!.user.id,
        },
        select: { messageId: true },
      }).then((existingReads: Array<{ messageId: string }>) => {
        const alreadyReadIds = new Set(existingReads.map((r) => r.messageId));
        const toMarkAsRead = messageIds.filter((id: string) => !alreadyReadIds.has(id));

        // Mark unread messages as read (fire and forget)
        if (toMarkAsRead.length > 0) {
          db.messageRead.createMany({
            data: toMarkAsRead.map((messageId: string) => ({
              messageId,
              userId: session!.user.id,
            })),
          }).catch(() => {
            // Silently fail - not critical
          });
        }
      }).catch(() => {
        // Silently fail - not critical
      });
    }

    // Cache for 10 seconds - messages are very dynamic
    return NextResponse.json(messagesWithoutImages, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
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
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, scopedSession } = tenantResult;
    const tenantIdFromSession = tenantId;
    console.log("POST /api/messages - Starting request processing");
    
    // Check if request has FormData (image upload) or JSON
    const contentType = request.headers.get("content-type") || "";
    console.log("Content-Type:", contentType);
    let validated: z.infer<typeof messageSchema>;
    let hasFiles = false;
    
    // Storage fields for Supabase Storage (declared at function scope)
    let imageBucket: string | null = null;
    let imagePath: string | null = null;
    let imageMimeType: string | null = null;
    let imageSize: number | null = null;

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

        // Upload image to Supabase Storage
        let imageUrl: string | null = null;

        if (file && file.size > 0) {
          try {
            const { uploadFile, STORAGE_BUCKETS, generateFilePath } = await import("@/lib/supabase-storage");
            const filePath = generateFilePath('message-images', file.name);
            const storageMetadata = await uploadFile(
              STORAGE_BUCKETS.MESSAGE_IMAGES,
              filePath,
              file,
              {
                contentType: file.type || 'image/jpeg',
              }
            );
            imageBucket = storageMetadata.bucket;
            imagePath = storageMetadata.path;
            imageMimeType = storageMetadata.mimeType;
            imageSize = storageMetadata.size;
            // imageUrl remains null for new uploads
          } catch (error) {
            console.error("Error uploading message image to Supabase Storage:", error);
            throw new Error("Failed to upload image");
          }
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
            { error: "Invalid form data", details: formError.issues },
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
            { error: "Invalid JSON data", details: jsonError.issues },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Invalid JSON data", details: jsonError instanceof Error ? jsonError.message : String(jsonError) },
          { status: 400 }
        );
      }
    }

    // Validate that at least content, image, or files are provided
    const hasContent = validated.content && validated.content.trim().length > 0;
    const hasImage = (imageBucket && imagePath) || (validated.imageUrl && validated.imageUrl.length > 0);
    
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
    const channel = await db.messageChannel.findFirst({
      where: withTenantScope(scopedSession, {
        id: validated.channelId,
      }),
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
    if (!channel.isGeneral && !channel.members.some((m: { id: string }) => m.id === session!.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messageData: {
      channelId: string;
      userId: string;
      content: string | null;
      imageUrl?: string | null;
      imageBucket?: string | null;
      imagePath?: string | null;
      imageMimeType?: string | null;
      imageSize?: number | null;
    } = {
      channelId: validated.channelId,
      userId: session!.user.id,
      content: hasContent ? validated.content!.trim() : null,
      imageUrl: null, // No base64 for new uploads
      imageBucket: imageBucket,
      imagePath: imagePath,
      imageMimeType: imageMimeType,
      imageSize: imageSize,
    };

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
            // Removed user object - not needed for message display, saves bandwidth
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            // REMOVED: fileUrl to prevent base64 egress - use /api/messages/[id]/attachments/[attachmentId] for file data
            fileSize: true,
            mimeType: true,
            createdAt: true,
            userId: true, // Only ID, not full user object - saves bandwidth
          },
        },
      },
    });

    console.log("Message created successfully:", message.id);
    
    // Notify mentions and channel members (async, don't wait)
    const { notifyMentions } = await import("@/lib/message-notifications");
    const { sendNotificationToChannel } = await import("@/lib/notifications");
    const senderName = session!.user.name || session!.user.email;
    
    // Notify mentions (keeps existing behavior)
    notifyMentions(
      message.id,
      validated.channelId,
      message.content,
      senderName,
      tenantIdFromSession || null
    ).catch(err => console.error("Error sending mention notifications:", err));
    
    // Fetch channel name for notification (reuse existing channel variable if available, otherwise fetch)
    const channelForNotification = channel || await db.messageChannel.findUnique({
      where: { id: validated.channelId },
      select: { name: true },
    });
    
    const channelName = channelForNotification?.name || "Unknown channel";
    
    // Send push notification to channel members (PRIVACY: no message content in body)
    sendNotificationToChannel(
      validated.channelId,
      session!.user.id,
      {
        title: `New Message in #${channelName}`,
        body: "You have a new message. Tap to view.",
        url: `/dashboard/messages/${validated.channelId}`,
        tag: message.id,
      }
    ).catch(err => console.error("Error sending channel notification:", err));
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return createErrorResponse(error, "Mesaj gönderilirken bir hata oluştu", 500);
  }
}


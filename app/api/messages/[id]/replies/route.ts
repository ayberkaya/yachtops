import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const replySchema = z.object({
  content: z.string().min(1, "Message content is required").optional(),
  imageUrl: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const parentMessage = await db.message.findUnique({
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

    if (!parentMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check channel access
    if (!parentMessage.channel.isGeneral && 
        !parentMessage.channel.members.some((m: { id: string }) => m.id === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const replies = await db.message.findMany({
      where: {
        parentMessageId: id,
        deletedAt: null,
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
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(replies);
  } catch (error) {
    console.error("Error fetching replies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Check if request has FormData (image upload) or JSON
    const contentType = request.headers.get("content-type") || "";
    let validated: z.infer<typeof replySchema>;
    
    // Storage fields for Supabase Storage (declared at function scope)
    let imageBucket: string | null = null;
    let imagePath: string | null = null;
    let imageMimeType: string | null = null;
    let imageSize: number | null = null;

    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const content = formData.get("content") as string | null;

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
            console.error("Error uploading reply image to Supabase Storage:", error);
            throw new Error("Failed to upload image");
          }
        }

        // Note: imageUrl is set to null for new uploads, storage fields are set separately
        validated = replySchema.parse({
          content: content || null,
          imageUrl: null, // No base64 for new uploads
        });
      } catch (formError) {
        return NextResponse.json(
          { error: "Invalid form data" },
          { status: 400 }
        );
      }
    } else {
      try {
        const body = await request.json();
        validated = replySchema.parse(body);
      } catch (jsonError) {
        return NextResponse.json(
          { error: "Invalid JSON data" },
          { status: 400 }
        );
      }
    }

    const hasContent = validated.content && validated.content.trim().length > 0;
    const hasImage = (imageBucket && imagePath) || (validated.imageUrl && validated.imageUrl.length > 0);
    
    if (!hasContent && !hasImage) {
      return NextResponse.json(
        { error: "Message content or image is required" },
        { status: 400 }
      );
    }

    // Check parent message exists and user has access
    const parentMessage = await db.message.findUnique({
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

    if (!parentMessage) {
      return NextResponse.json({ error: "Parent message not found" }, { status: 404 });
    }

    // Check channel access
    if (!parentMessage.channel.isGeneral && 
        !parentMessage.channel.members.some((m: { id: string }) => m.id === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const replyData: {
      channelId: string;
      userId: string;
      parentMessageId: string;
      content: string | null;
      imageUrl?: string | null;
      imageBucket?: string | null;
      imagePath?: string | null;
      imageMimeType?: string | null;
      imageSize?: number | null;
    } = {
      channelId: parentMessage.channelId,
      userId: session.user.id,
      parentMessageId: id,
      content: hasContent ? validated.content!.trim() : null,
      imageUrl: null, // No base64 for new uploads
      imageBucket: imageBucket,
      imagePath: imagePath,
      imageMimeType: imageMimeType,
      imageSize: imageSize,
    };

    const reply = await db.message.create({
      data: replyData,
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

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating reply:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


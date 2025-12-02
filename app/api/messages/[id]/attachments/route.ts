import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileSize: z.number().optional().nullable(),
  mimeType: z.string().optional().nullable(),
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

    const attachments = await db.messageAttachment.findMany({
      where: { messageId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
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

    // Check if request has FormData (file upload) or JSON
    const contentType = request.headers.get("content-type") || "";
    let validated: z.infer<typeof attachmentSchema>;

    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const fileName = formData.get("fileName") as string | null;

        if (!file || !fileName) {
          return NextResponse.json(
            { error: "File and fileName are required" },
            { status: 400 }
          );
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "application/octet-stream";
        const base64 = buffer.toString("base64");
        const fileUrl = `data:${mimeType};base64,${base64}`;

        validated = attachmentSchema.parse({
          fileName: fileName,
          fileUrl: fileUrl,
          fileSize: file.size,
          mimeType: mimeType,
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
        validated = attachmentSchema.parse(body);
      } catch (jsonError) {
        return NextResponse.json(
          { error: "Invalid JSON data" },
          { status: 400 }
        );
      }
    }

    // Check message exists and user has access
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

    const attachment = await db.messageAttachment.create({
      data: {
        messageId: id,
        userId: session.user.id,
        fileName: validated.fileName,
        fileUrl: validated.fileUrl,
        fileSize: validated.fileSize || null,
        mimeType: validated.mimeType || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


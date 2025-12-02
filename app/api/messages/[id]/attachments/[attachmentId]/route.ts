import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, attachmentId } = await params;

    const attachment = await db.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: {
          include: {
            channel: {
              include: {
                members: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    if (attachment.messageId !== id) {
      return NextResponse.json({ error: "Attachment does not belong to this message" }, { status: 400 });
    }

    // Only attachment uploader or message author can delete
    if (attachment.userId !== session.user.id && attachment.message.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.messageAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


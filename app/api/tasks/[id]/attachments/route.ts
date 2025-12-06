import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const attachmentSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
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

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const task = await db.task.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const attachments = await db.taskAttachment.findMany({
      where: { taskId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
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

    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const tenantId = tenantIdFromSession || (isAdmin ? null : null);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = attachmentSchema.parse(body);

    const task = await db.task.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const attachment = await db.taskAttachment.create({
      data: {
        taskId: id,
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
        { error: "Invalid input", details: error.issues },
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


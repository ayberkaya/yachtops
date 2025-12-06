import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/auth";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
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

    const { id, attachmentId } = await params;

    const task = await db.task.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const attachment = await db.taskAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.taskId !== id) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Only OWNER/CAPTAIN or the user who uploaded can delete
    if (!canManageUsers(session.user) && attachment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.taskAttachment.delete({
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


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/auth";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id, attachmentId } = await params;

    const task = await db.task.findFirst({
      where: withTenantScope(scopedSession, { id }),
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
    if (!canManageUsers(session!.user) && attachment.userId !== session!.user.id) {
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


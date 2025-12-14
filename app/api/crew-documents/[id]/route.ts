import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    // Check permissions
    if (!hasPermission(session.user, "documents.delete", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document id is required" }, { status: 400 });
    }

    // Find the document
    const existingDoc = await db.crewDocument.findFirst({
      where: {
        id,
        yachtId: tenantId,
      },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if already deleted
    if (existingDoc.deletedAt) {
      return NextResponse.json(
        { error: "Document is already deleted" },
        { status: 400 }
      );
    }

    // Soft delete
    await db.crewDocument.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedByUserId: session.user.id,
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: tenantId,
      userId: session.user.id,
      action: AuditAction.DELETE,
      entityType: "CrewDocument",
      entityId: id,
      description: `Crew document deleted: ${existingDoc.title}`,
      request,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting crew document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


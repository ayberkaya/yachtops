import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

const updateVesselDocumentSchema = z.object({
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
});

export async function PATCH(
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

    if (!hasPermission(session.user, "documents.upload", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document id is required" }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateVesselDocumentSchema.parse(body);

    // Find the document
    const existingDoc = await db.vesselDocument.findFirst({
      where: {
        id,
        yachtId: tenantId,
        deletedAt: null,
      },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Update document
    const updatedDoc = await db.vesselDocument.update({
      where: { id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
        ...(validated.expiryDate !== undefined && {
          expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
        }),
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: tenantId,
      userId: session.user.id,
      action: AuditAction.UPDATE,
      entityType: "VesselDocument",
      entityId: id,
      description: `Vessel document updated: ${updatedDoc.title}`,
      request,
    });

    return NextResponse.json(updatedDoc);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating vessel document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Check permissions - only admins can permanently delete, others can soft delete
    if (!hasPermission(session.user, "documents.delete", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document id is required" }, { status: 400 });
    }

    // Find the document
    const existingDoc = await db.vesselDocument.findFirst({
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

    // Soft delete (non-admin users can only soft delete)
    const isAdmin = isPlatformAdmin(session) || 
      hasPermission(session.user, "users.delete", session.user.permissions);

    await db.vesselDocument.update({
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
      entityType: "VesselDocument",
      entityId: id,
      description: `Vessel document deleted: ${existingDoc.title}`,
      request,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting vessel document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


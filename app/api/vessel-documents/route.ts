import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { validateFileUpload, sanitizeFileName } from "@/lib/file-upload-security";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";

export async function GET(request: NextRequest) {
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
    const ensuredTenantId = tenantId as string;

    if (!hasPermission(session.user, "documents.vessel.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const docs = await db.vesselDocument.findMany({
      where: {
        yachtId: tenantId || undefined,
        deletedAt: null, // Exclude soft-deleted documents
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Error fetching vessel documents:", error);
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

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantId as string;

    if (!hasPermission(session.user, "documents.upload", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) || "Vessel Document";
    const notes = (formData.get("notes") as string | null) || null;
    const expiryDateStr = formData.get("expiryDate") as string | null;
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file upload security
    const validation = validateFileUpload(file, "document");
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "File validation failed" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "application/pdf";
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(file.name);

    const doc = await db.vesselDocument.create({
      data: {
        yachtId: ensuredTenantId,
        title: title || sanitizedFileName,
        fileUrl: dataUrl,
        notes,
        expiryDate,
        createdByUserId: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: ensuredTenantId,
      userId: session.user.id,
      action: AuditAction.CREATE,
      entityType: "VesselDocument",
      entityId: doc.id,
      description: `Vessel document uploaded: ${doc.title}`,
      request,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Error uploading vessel document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


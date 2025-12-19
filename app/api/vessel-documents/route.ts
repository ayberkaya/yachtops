import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { validateFileUpload, sanitizeFileName } from "@/lib/file-upload-security";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, scopedSession } = tenantResult;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantId;

    if (!hasPermission(session.user, "documents.vessel.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Pagination support - ENFORCED: low defaults to reduce egress
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
    const skip = (page - 1) * limit;

    const docs = await db.vesselDocument.findMany({
      where: withTenantScope(scopedSession, {
        deletedAt: null, // Exclude soft-deleted documents
      }),
      select: {
        id: true,
        title: true,
        notes: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
        yachtId: true,
        createdByUserId: true,
        // REMOVED: fileUrl to prevent base64 egress - use /api/vessel-documents/[id]/file for file data
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalCount = await db.vesselDocument.count({
      where: withTenantScope(scopedSession, {
        deletedAt: null,
      }),
    });

    return NextResponse.json({
      data: docs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
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

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId } = tenantResult;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantId;

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

    // Upload file to Supabase Storage
    const { uploadFile, STORAGE_BUCKETS, generateFilePath } = await import("@/lib/supabase-storage");
    const filePath = generateFilePath('vessel-documents', file.name);
    const storageMetadata = await uploadFile(
      STORAGE_BUCKETS.VESSEL_DOCUMENTS,
      filePath,
      file,
      {
        contentType: file.type || 'application/pdf',
      }
    );

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(file.name);

    // Store only metadata in database (bucket, path, mimeType, size)
    const doc = await db.vesselDocument.create({
      data: {
        yachtId: ensuredTenantId,
        title: title || sanitizedFileName,
        fileUrl: null, // No base64 - file is in Supabase Storage
        storageBucket: storageMetadata.bucket,
        storagePath: storageMetadata.path,
        mimeType: storageMetadata.mimeType,
        fileSize: storageMetadata.size,
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


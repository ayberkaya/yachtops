import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";
import { validateFileUpload, sanitizeFileName } from "@/lib/file-upload-security";

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

    if (!hasPermission(session.user, "documents.crew.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Pagination support - ENFORCED: low defaults to reduce egress
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
    const skip = (page - 1) * limit;

    const docs = await db.crewDocument.findMany({
      where: {
        yachtId: ensuredTenantId,
        deletedAt: null, // Exclude soft-deleted documents
      },
      select: {
        id: true,
        title: true,
        notes: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
        yachtId: true,
        userId: true,
        createdByUserId: true,
        // REMOVED: fileUrl to prevent base64 egress - use /api/crew-documents/[id]/file for file data
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalCount = await db.crewDocument.count({
      where: {
        yachtId: ensuredTenantId,
        deletedAt: null,
      },
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
    console.error("Error fetching crew documents:", error);
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
    const title = (formData.get("title") as string | null) || "Crew Document";
    const notes = (formData.get("notes") as string | null) || null;
    const expiryDateStr = formData.get("expiryDate") as string | null;
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;
    const userId = formData.get("userId") as string | null;

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
    const filePath = generateFilePath('crew-documents', file.name);
    const storageMetadata = await uploadFile(
      STORAGE_BUCKETS.CREW_DOCUMENTS,
      filePath,
      file,
      {
        contentType: file.type || 'application/pdf',
      }
    );

    // Store only metadata in database (bucket, path, mimeType, size)
    const doc = await db.crewDocument.create({
      data: {
        yachtId: ensuredTenantId,
        userId: userId || null,
        title,
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: ensuredTenantId,
      userId: session.user.id,
      action: AuditAction.CREATE,
      entityType: "CrewDocument",
      entityId: doc.id,
      description: `Crew document uploaded: ${doc.title}`,
      request,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Error uploading crew document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


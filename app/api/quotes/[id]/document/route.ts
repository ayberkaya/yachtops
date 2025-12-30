import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { uploadFile, STORAGE_BUCKETS, generateFilePath } from "@/lib/supabase-storage";
import { validateFileUpload, sanitizeFileName } from "@/lib/file-upload-security";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    if (!hasPermission(session!.user, "quotes.edit", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const quote = await db.quote.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) || "Quote Document";

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
    const filePath = generateFilePath('quote-documents', file.name);
    const storageMetadata = await uploadFile(
      STORAGE_BUCKETS.QUOTE_DOCUMENTS,
      filePath,
      file,
      {
        contentType: file.type || 'application/pdf',
      }
    );

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(file.name);

    // Store only metadata in database
    const document = await db.quoteDocument.create({
      data: {
        quoteId: id,
        storageBucket: storageMetadata.bucket,
        storagePath: storageMetadata.path,
        mimeType: storageMetadata.mimeType,
        fileSize: storageMetadata.size,
        title: title,
        fileUrl: null, // New uploads use storage, not base64
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error uploading quote document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


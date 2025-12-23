import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { validateFileUpload } from "@/lib/file-upload-security";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";
import { uploadFile, STORAGE_BUCKETS, generateFilePath } from "@/lib/supabase-storage";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const expense = await db.expense.findFirst({
      where: withTenantScope(scopedSession, {
        id,
        deletedAt: null, // Exclude soft-deleted expenses
      }),
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Check permissions
    const canUpload = 
      expense.createdByUserId === session!.user.id ||
      hasPermission(session!.user, "documents.upload", session!.user.permissions);

    if (!canUpload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    let storageMetadata: {
      bucket: string;
      path: string;
      mimeType: string;
      size: number;
    };

    // Check if request is JSON (client-side upload) or FormData (server-side upload)
    if (contentType.includes("application/json")) {
      // Client-side upload: File already uploaded to Supabase Storage, just metadata provided
      let body: any;
      
      // Debug: Log request details
      console.log('[Receipt Upload API] Content-Type:', contentType);
      console.log('[Receipt Upload API] Request method:', request.method);
      console.log('[Receipt Upload API] Request URL:', request.url);
      
      // Read the raw body first for debugging
      const rawBody = await request.text();
      console.log('[Receipt Upload API] Raw body length:', rawBody.length);
      console.log('[Receipt Upload API] Raw body preview:', rawBody.substring(0, 200));
      console.log('[Receipt Upload API] Raw body first chars:', Array.from(rawBody.substring(0, 20)).map(c => `${c} (${c.charCodeAt(0)})`).join(', '));
      
      // Try to parse JSON
      try {
        if (!rawBody || rawBody.trim() === '') {
          console.error('[Receipt Upload API] Empty request body');
          return NextResponse.json(
            { 
              error: "Invalid request body",
              message: "Request body is empty",
            },
            { status: 400 }
          );
        }
        
        body = JSON.parse(rawBody);
        console.log('[Receipt Upload API] Parsed body:', body);
      } catch (jsonError) {
        console.error('[Receipt Upload API] Failed to parse JSON body:', jsonError);
        console.error('[Receipt Upload API] Raw body that failed to parse:', rawBody);
        return NextResponse.json(
          { 
            error: "Invalid request body",
            message: "Request body must be valid JSON",
            details: jsonError instanceof Error ? jsonError.message : String(jsonError),
          },
          { status: 400 }
        );
      }
      storageMetadata = {
        bucket: body.storageBucket || STORAGE_BUCKETS.RECEIPTS,
        path: body.storagePath,
        mimeType: body.mimeType || 'image/jpeg',
        size: body.fileSize || 0,
      };

      if (!storageMetadata.path) {
        return NextResponse.json(
          { error: "Storage path is required" },
          { status: 400 }
        );
      }
    } else {
      // Server-side upload: Upload file via FormData
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      // Validate file upload security (receipts are typically images)
      const validation = validateFileUpload(file, "image");
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "File validation failed" },
          { status: 400 }
        );
      }

      // Upload file to Supabase Storage
      console.log(`[Receipt Upload] Starting upload for expense ${id}, file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      
      try {
        const filePath = generateFilePath('receipts', file.name);
        console.log(`[Receipt Upload] Generated file path: ${filePath}`);
        
        storageMetadata = await uploadFile(
          STORAGE_BUCKETS.RECEIPTS,
          filePath,
          file,
          {
            contentType: file.type || 'image/jpeg',
          }
        );
        
        console.log(`[Receipt Upload] Upload successful:`, storageMetadata);
      } catch (uploadError) {
        console.error(`[Receipt Upload] Upload failed:`, uploadError);
        const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
        return NextResponse.json(
          { 
            error: "Failed to upload receipt to storage",
            message: errorMessage,
            details: process.env.NODE_ENV === "development" ? String(uploadError) : undefined
          },
          { status: 500 }
        );
      }
    }

    // Store only metadata in database (bucket, path, mimeType, size)
    // fileUrl is kept null for new uploads, or can store legacy base64 for backward compatibility
    const receipt = await db.expenseReceipt.create({
      data: {
        expenseId: id,
        fileUrl: null, // No base64 - file is in Supabase Storage
        storageBucket: storageMetadata.bucket,
        storagePath: storageMetadata.path,
        mimeType: storageMetadata.mimeType,
        fileSize: storageMetadata.size,
        createdByUserId: session!.user.id,
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: tenantId!,
      userId: session!.user.id,
      action: AuditAction.CREATE,
      entityType: "ExpenseReceipt",
      entityId: receipt.id,
      description: `Receipt uploaded for expense: ${expense.description}`,
      request,
    });

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error("Error uploading expense receipt:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to upload receipt",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}



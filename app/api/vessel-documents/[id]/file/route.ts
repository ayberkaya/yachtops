import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getSignedUrl } from "@/lib/supabase-storage";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

/**
 * Lazy-loading endpoint for vessel document files
 * Returns file data only when requested (not in list responses)
 */
export async function GET(
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
    const { scopedSession } = tenantResult;

    if (!hasPermission(session.user, "documents.vessel.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const doc = await db.vesselDocument.findFirst({
      where: withTenantScope(scopedSession, {
        id,
        deletedAt: null,
      }),
      select: {
        id: true,
        fileUrl: true, // Legacy base64 fallback
        storageBucket: true, // Supabase Storage bucket
        storagePath: true, // Supabase Storage path
        mimeType: true,
        fileSize: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if file is in Supabase Storage (new) or legacy base64
    if (doc.storageBucket && doc.storagePath) {
      // New: Generate signed URL for Supabase Storage file
      try {
        const signedUrl = await getSignedUrl(doc.storageBucket, doc.storagePath);
        // Redirect to signed URL (1 hour TTL, cached server-side)
        return NextResponse.redirect(signedUrl);
      } catch (error) {
        console.error("Error generating signed URL for vessel document:", error);
        return NextResponse.json(
          { error: "Failed to generate file URL" },
          { status: 500 }
        );
      }
    } else if (doc.fileUrl) {
      // Legacy: Fall back to base64 data URI
      // Check if it's a data URI
      if (!doc.fileUrl.startsWith("data:")) {
        // If it's not a data URI, redirect to the URL
        return NextResponse.redirect(doc.fileUrl);
      }

      // Parse data URI: data:application/pdf;base64,JVBERi0...
      const matches = doc.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid document format" },
          { status: 400 }
        );
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64");

      // Return file with proper headers
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } else {
      return NextResponse.json(
        { error: "Document file not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving vessel document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


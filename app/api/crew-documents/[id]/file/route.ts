import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { getSignedUrl } from "@/lib/supabase-storage";

/**
 * Lazy-loading endpoint for crew document files
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

    const { id } = await params;

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    if (!hasPermission(session.user, "documents.crew.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = await db.crewDocument.findFirst({
      where: {
        id,
        yachtId: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        fileUrl: true, // Legacy base64 fallback
        storageBucket: true, // Supabase Storage bucket
        storagePath: true, // Supabase Storage path
        mimeType: true,
        fileSize: true,
        userId: true, // Check if user can access this document
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if user can access this document (own document or has permission)
    if (doc.userId && doc.userId !== session.user.id && 
        !hasPermission(session.user, "documents.crew.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if file is in Supabase Storage (new) or legacy base64
    if (doc.storageBucket && doc.storagePath) {
      // New: Generate signed URL for Supabase Storage file
      try {
        const signedUrl = await getSignedUrl(doc.storageBucket, doc.storagePath);
        // Redirect to signed URL (1 hour TTL, cached server-side)
        return NextResponse.redirect(signedUrl);
      } catch (error) {
        console.error("Error generating signed URL for crew document:", error);
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
    console.error("Error serving crew document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


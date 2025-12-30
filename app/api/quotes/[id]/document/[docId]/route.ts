import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { getSignedUrl, STORAGE_BUCKETS } from "@/lib/supabase-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "quotes.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id, docId } = await params;

    // Verify quote exists and belongs to tenant
    const quote = await db.quote.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Get document
    const document = await db.quoteDocument.findFirst({
      where: { id: docId, quoteId: id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // If using Supabase Storage, get signed URL
    if (document.storageBucket && document.storagePath) {
      try {
        const signedUrl = await getSignedUrl(
          document.storageBucket,
          document.storagePath
        );
        return NextResponse.redirect(signedUrl);
      } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json(
          { error: "Failed to generate file URL" },
          { status: 500 }
        );
      }
    }

    // Fallback to legacy fileUrl (base64)
    if (document.fileUrl) {
      return NextResponse.redirect(document.fileUrl);
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching quote document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


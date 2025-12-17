import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { getSignedUrl } from "@/lib/supabase-storage";

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
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const receipt = await db.expenseReceipt.findFirst({
      where: { 
        id,
        deletedAt: null, // Exclude soft-deleted receipts
      },
      include: {
        expense: {
          select: {
            yachtId: true,
            deletedAt: true, // Check if expense is also not deleted
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Check if expense is soft-deleted
    if (receipt.expense.deletedAt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Check if user has access to this expense
    if (!isAdmin && receipt.expense.yachtId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if file is in Supabase Storage (new) or legacy base64
    if (receipt.storageBucket && receipt.storagePath) {
      // New: Generate signed URL for Supabase Storage file
      try {
        const signedUrl = await getSignedUrl(receipt.storageBucket, receipt.storagePath);
        // Redirect to signed URL (1 hour TTL, cached server-side)
        return NextResponse.redirect(signedUrl);
      } catch (error) {
        console.error("Error generating signed URL for receipt:", error);
        return NextResponse.json(
          { error: "Failed to generate file URL" },
          { status: 500 }
        );
      }
    } else if (receipt.fileUrl) {
      // Legacy: Fall back to base64 data URI
      // Check if it's a data URI
      if (!receipt.fileUrl.startsWith("data:")) {
        // If it's not a data URI, redirect to the URL
        return NextResponse.redirect(receipt.fileUrl);
      }

      // Parse data URI: data:image/jpeg;base64,/9j/4AAQ...
      const matches = receipt.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid receipt format" },
          { status: 400 }
        );
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64");

      // Return image with proper headers
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
        { error: "Receipt file not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


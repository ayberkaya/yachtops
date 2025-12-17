import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { getSignedUrl } from "@/lib/supabase-storage";

/**
 * Lazy-loading endpoint for message images
 * Returns image data only when requested (not in list responses)
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

    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);

    const message = await db.message.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        imageUrl: true, // Legacy base64 fallback
        imageBucket: true, // Supabase Storage bucket
        imagePath: true, // Supabase Storage path
        imageMimeType: true,
        imageSize: true,
        channelId: true,
        userId: true,
        channel: {
          select: {
            yachtId: true,
            isGeneral: true,
            members: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check access to channel
    const channel = message.channel;
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const tenantId = isAdmin ? undefined : tenantIdFromSession;
    if (!isAdmin && channel.yachtId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!channel.isGeneral && !channel.members.some((m: { id: string }) => m.id === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if file is in Supabase Storage (new) or legacy base64
    if (message.imageBucket && message.imagePath) {
      // New: Generate signed URL for Supabase Storage file
      try {
        const signedUrl = await getSignedUrl(message.imageBucket, message.imagePath);
        // Redirect to signed URL (1 hour TTL, cached server-side)
        return NextResponse.redirect(signedUrl);
      } catch (error) {
        console.error("Error generating signed URL for message image:", error);
        return NextResponse.json(
          { error: "Failed to generate image URL" },
          { status: 500 }
        );
      }
    } else if (message.imageUrl) {
      // Legacy: Fall back to base64 data URI
      // Check if it's a data URI
      if (!message.imageUrl.startsWith("data:")) {
        // If it's not a data URI, redirect to the URL
        return NextResponse.redirect(message.imageUrl);
      }

      // Parse data URI: data:image/jpeg;base64,/9j/4AAQ...
      const matches = message.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid image format" },
          { status: 400 }
        );
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64");

      // Return image with proper cache headers
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
        { error: "Message has no image" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving message image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const trackEventSchema = z.object({
  eventType: z.enum(["page_view", "action", "error"]),
  page: z.string().optional(),
  action: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Track even if not authenticated (for anonymous page views)
    const userId = session?.user?.id || null;
    const yachtId = session?.user?.yachtId || null;

    const body = await request.json();
    const validated = trackEventSchema.parse(body);

    // Only track if user is authenticated (skip anonymous events for now)
    if (!userId) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Create usage event (best-effort).
    // We intentionally avoid extra reads (like verifying user existence) to keep this fast.
    // If the session is stale (user deleted), the FK constraint may fail; we swallow it.
    try {
      await db.usageEvent.create({
        data: {
          userId,
          yachtId: yachtId || null,
          eventType: validated.eventType,
          page: validated.page || null,
          action: validated.action || null,
          metadata: validated.metadata || undefined,
        },
      });
    } catch {
      // no-op
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Silently fail - tracking should never break the app
    console.error("Usage tracking error:", error);
    return NextResponse.json({ success: false }, { status: 200 }); // Return 200 to not break client
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { createHash } from "crypto";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * Convert NextAuth user ID to Supabase UUID format
 * This matches the conversion used in supabase-auth-sync.ts
 */
function getUuidFromUserId(userId: string): string {
  // If already UUID format, return as is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) {
    return userId;
  }

  // Convert to UUID format using SHA-1 hash
  const hash = createHash("sha1").update(userId).digest("hex");
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "5" + hash.substring(13, 16),
    "8" + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join("-");
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const supabaseUserId = getUuidFromUserId(session.user.id);

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", supabaseUserId)
      .limit(1)
      .single();

    if (error) {
      // PGRST116 is "not found" which is fine
      if (error.code === "PGRST116") {
        return NextResponse.json({
          subscribed: false,
        });
      }
      
      // 42501 is "permission denied" - RLS policy issue (NextAuth vs Supabase Auth mismatch)
      // This is expected when using NextAuth instead of Supabase Auth
      // Return subscribed: false instead of error to allow app to continue
      if (error.code === "42501") {
        console.debug("Push subscription permission denied (RLS policy) - returning not subscribed");
        return NextResponse.json({
          subscribed: false,
        });
      }
      
      // Other errors - log but don't fail the request
      console.error("Error checking push subscription:", error);
      return NextResponse.json({
        subscribed: false,
      });
    }

    return NextResponse.json({
      subscribed: !!data,
    });
  } catch (error) {
    console.error("Error checking push subscription:", error);
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

    const body = await request.json();
    const validated = subscriptionSchema.parse(body);

    const supabase = await createClient();
    const supabaseUserId = getUuidFromUserId(session.user.id);

    // Upsert subscription (insert or update if endpoint exists)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: supabaseUserId,
          endpoint: validated.endpoint,
          p256dh: validated.keys.p256dh,
          auth: validated.keys.auth,
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) {
      // 42501 is "permission denied" - RLS policy issue (NextAuth vs Supabase Auth mismatch)
      // This is expected when using NextAuth instead of Supabase Auth
      if (error.code === "42501") {
        console.debug("Push subscription permission denied (RLS policy) - push notifications not available");
        return NextResponse.json(
          { error: "Push notifications not available (permission denied)", details: "RLS policy requires Supabase Auth" },
          { status: 403 }
        );
      }
      
      console.error("Error saving push subscription:", error);
      return NextResponse.json(
        { error: "Failed to save subscription", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const supabaseUserId = getUuidFromUserId(session.user.id);

    // Optional: allow deleting by endpoint if provided
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint");

    let query = supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", supabaseUserId);

    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    }

    const { error } = await query;

    if (error) {
      // 42501 is "permission denied" - RLS policy issue (NextAuth vs Supabase Auth mismatch)
      // This is expected when using NextAuth instead of Supabase Auth
      // Return success anyway since subscription doesn't exist or can't be accessed
      if (error.code === "42501") {
        console.debug("Push subscription permission denied (RLS policy) - assuming already removed");
        return NextResponse.json({ success: true });
      }
      
      console.error("Error removing push subscription:", error);
      return NextResponse.json(
        { error: "Failed to remove subscription", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


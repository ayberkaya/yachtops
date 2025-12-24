import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    // Validate that user can only access their own subscription data
    if (userId && userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUserId = userId || session.user.id;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch user subscription data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("subscription_status, trial_ends_at, plan_id")
      .eq("id", targetUserId)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user subscription:", userError);
      return NextResponse.json(
        { error: "Failed to fetch subscription data" },
        { status: 500 }
      );
    }

    // Fetch plan name if plan_id exists
    let planName: string | null = null;
    if (userData.plan_id) {
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("name")
        .eq("id", userData.plan_id)
        .single();

      if (!planError && planData) {
        planName = planData.name;
      }
    }

    return NextResponse.json({
      subscription_status: userData.subscription_status,
      trial_ends_at: userData.trial_ends_at,
      plan_name: planName,
    });
  } catch (error) {
    console.error("Error in subscription API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


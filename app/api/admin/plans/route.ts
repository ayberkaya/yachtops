import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Return fallback plans if Supabase is not configured
    return NextResponse.json([
      {
        id: "essentials",
        name: "Essentials",
        price: 299,
        currency: "USD",
        min_loa: 0,
        max_loa: 30,
      },
      {
        id: "professional",
        name: "Professional",
        price: 599,
        currency: "USD",
        min_loa: 30,
        max_loa: 60,
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: 0,
        currency: "USD",
        min_loa: 60,
        max_loa: null,
      },
    ]);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("min_loa", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      // Return fallback plans on error
      return NextResponse.json([
        {
          id: "essentials",
          name: "Essentials",
          price: 299,
          currency: "USD",
          min_loa: 0,
          max_loa: 30,
        },
        {
          id: "professional",
          name: "Professional",
          price: 599,
          currency: "USD",
          min_loa: 30,
          max_loa: 60,
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: 0,
          currency: "USD",
          min_loa: 60,
          max_loa: null,
        },
      ]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}


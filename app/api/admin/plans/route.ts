import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const fallbackPlans = [
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
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Use admin client to bypass RLS and caching
    const supabase = createAdminClient();
    console.log("Fetching plans from DB:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (!supabase) {
      console.warn("Supabase admin client not configured, returning fallback plans");
      return NextResponse.json(fallbackPlans);
    }

    const { data, error } = await supabase
      .from("plans")
      .select("id, name, price, monthly_price, yearly_price, currency, features, tier, is_popular")
      .order("tier", { ascending: true })
      .order("min_loa", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      // Return fallback plans on error
      return NextResponse.json(fallbackPlans);
    }

    if (!data || data.length === 0) {
      console.warn("No plans found in database, returning fallback plans");
      return NextResponse.json(fallbackPlans);
    }

    console.log(`Successfully fetched ${data.length} plans from database`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(fallbackPlans);
  }
}


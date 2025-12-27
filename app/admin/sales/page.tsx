import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/utils/supabase/admin";
import { SalesHub } from "@/components/admin/sales/sales-hub";

export const dynamic = "force-dynamic";

interface PlanData {
  id: string;
  name: string;
  price: number;
  monthly_price?: number | null;
  yearly_price?: number | null;
  currency: string;
  min_loa: number;
  max_loa: number | null;
  features: string[];
  activeSubscribers: number;
  status?: "active" | "archived";
  description?: string;
  sales_pitch?: string;
  sales_metadata?: any;
  is_popular?: boolean;
  tier?: number;
  limits?: {
    maxUsers?: number;
    maxStorage?: number;
    maxGuests?: number;
    maxCrewMembers?: number;
  } | null;
}

// Fallback plans if database is empty
const fallbackPlans: PlanData[] = [
  {
    id: "essentials",
    name: "Essentials",
    price: 299,
    currency: "USD",
    min_loa: 0,
    max_loa: 30,
    features: [
      "Core expense tracking",
      "Basic document management",
      "Crew management",
      "Task management",
      "Email support",
    ],
    activeSubscribers: 5,
    status: "active",
  },
  {
    id: "professional",
    name: "Professional",
    price: 599,
    currency: "USD",
    min_loa: 30,
    max_loa: 60,
    features: [
      "Everything in Essentials",
      "Advanced reporting",
      "Inventory management",
      "Voyage planning",
      "Priority support",
      "Custom integrations",
    ],
    activeSubscribers: 12,
    status: "active",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    currency: "USD",
    min_loa: 60,
    max_loa: null,
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom features",
      "24/7 support",
      "On-site training",
      "API access",
    ],
    activeSubscribers: 2,
    status: "active",
  },
];

export default async function SalesHubPage() {
  const session = await getSession();

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Initialize Supabase Admin Client
  let plans: PlanData[] = fallbackPlans;

  try {
    const supabase = createAdminClient();
    
    if (supabase) {
      // Fetch plans using admin client (bypasses RLS)
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .order("min_loa", { ascending: true });

      if (!plansError && plansData && plansData.length > 0) {
        // Map plans with real subscriber counts and new fields
        plans = (plansData as any[]).map((plan) => ({
          ...plan,
          activeSubscribers: 0, // Will be calculated if needed
          status: (plan.status as "active" | "archived") || "active",
          is_popular: plan.is_popular || false,
          tier: plan.tier || 0,
          limits: plan.limits || null,
          monthly_price: plan.monthly_price || plan.monthlyPrice || plan.price,
          yearly_price: plan.yearly_price || plan.annualPrice || plan.annual_price || null,
        }));

        // Sort by tier
        plans.sort((a, b) => (a.tier || 0) - (b.tier || 0));
      } else {
        console.warn("No plans found in database or error occurred, using fallback plans");
        plans = fallbackPlans.map((plan) => ({
          ...plan,
          activeSubscribers: 0,
          status: "active" as const,
          is_popular: false,
          tier: 0,
          limits: null,
          monthly_price: plan.price,
          yearly_price: null,
        }));
      }
    } else {
      console.warn("Supabase admin client not configured, using fallback plans");
      plans = fallbackPlans.map((plan) => ({
        ...plan,
        activeSubscribers: 0,
        status: "active" as const,
        is_popular: false,
        tier: 0,
        limits: null,
        monthly_price: plan.price,
        yearly_price: null,
      }));
    }
  } catch (error) {
    console.error("Error fetching plans:", error);
    // Fall back to hardcoded plans with 0 counts
    plans = fallbackPlans.map((plan) => ({
      ...plan,
      activeSubscribers: 0,
      status: "active" as const,
      is_popular: false,
      tier: 0,
      limits: null,
      monthly_price: plan.price,
      yearly_price: null,
    }));
  }

  return <SalesHub plans={plans} />;
}


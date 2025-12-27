import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/utils/supabase/admin";
import { Tag, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanCard, Plan } from "@/components/admin/pricing/plan-card";
import { db } from "@/lib/db";

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

interface Subscriber {
  id: string;
  name: string | null;
  email: string;
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

export default async function AdminPricingPage() {
  const session = await getSession();

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Initialize Supabase Admin Client
  let plans: PlanData[] = fallbackPlans;
  let subscribersByPlan: Record<string, Subscriber[]> = {};

  try {
    const supabase = createAdminClient();
    
    if (supabase) {
      console.log("Fetching plans from DB:", process.env.NEXT_PUBLIC_SUPABASE_URL);

      // Fetch plans using admin client (bypasses RLS)
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .order("min_loa", { ascending: true });

      if (plansError) {
        console.error("Error fetching plans:", plansError);
        console.error("Error details:", {
          code: plansError.code,
          message: plansError.message,
          details: plansError.details,
          hint: plansError.hint,
        });
      }

      if (!plansError && plansData && plansData.length > 0) {
        // Fetch subscriber counts for each plan
        // Note: This assumes users table has plan_id column
        // If using Prisma, we'll use db.user.count() instead
        
        // Try to fetch from Supabase public.users table first
        const planIds = plansData.map((p) => p.id);
        
        // Try to fetch subscribers from Supabase first
        try {
          const { data: usersData } = await supabase
            .from("users")
            .select("id, name, email, plan_id")
            .in("plan_id", planIds)
            .eq("active", true);

          // Group subscribers by plan_id
          if (usersData) {
            usersData.forEach((user: any) => {
              if (user.plan_id) {
                if (!subscribersByPlan[user.plan_id]) {
                  subscribersByPlan[user.plan_id] = [];
                }
                subscribersByPlan[user.plan_id].push({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                });
              }
            });
          }
        } catch (supabaseError) {
          // If Supabase doesn't have the users table or plan_id column,
          // try to fetch from Prisma (if plan_id is stored in user metadata)
          console.log("Supabase users table not available, trying Prisma...");
          
          try {
            // Fetch users and check their metadata for plan_id
            const allUsers = await db.user.findMany({
              where: { active: true },
              select: {
                id: true,
                name: true,
                email: true,
              },
            });

            // Note: If plan_id is stored in Supabase Auth user_metadata,
            // we'd need to fetch from Supabase Auth API
            // For now, we'll leave subscribersByPlan empty if Supabase users table doesn't exist
          } catch (prismaError) {
            console.error("Error fetching from Prisma:", prismaError);
          }
        }

        // Map plans with real subscriber counts and new fields
        plans = (plansData as any[]).map((plan) => ({
          ...plan,
          activeSubscribers: subscribersByPlan[plan.id]?.length || 0,
          status: (plan.status as "active" | "archived") || "active",
          is_popular: plan.is_popular || false,
          tier: plan.tier || 0,
          limits: plan.limits || null,
          monthly_price: plan.monthly_price || plan.price,
          yearly_price: plan.yearly_price || null,
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

  // Calculate revenue overview (mocked for now)
  const totalARR = plans.reduce((sum, plan) => {
    const yearlyPrice = plan.yearly_price || (plan.monthly_price || plan.price) * 12;
    return sum + yearlyPrice * plan.activeSubscribers;
  }, 0);

  // Convert to formatted currency (using EUR as default)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tag className="w-6 h-6 text-slate-600" />
            <h1 className="text-3xl font-bold text-slate-900">Subscription Packages</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Total ARR: {formatCurrency(totalARR)}
            </Badge>
          </div>
        </div>
        <Button className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={{
              id: plan.id,
              name: plan.name,
              price: plan.price,
              monthly_price: plan.monthly_price,
              yearly_price: plan.yearly_price,
              currency: plan.currency,
              features: plan.features,
              activeSubscribers: plan.activeSubscribers,
              status: plan.status,
              description: plan.description,
              isPopular: plan.is_popular,
              tier: plan.tier,
              limits: plan.limits,
            }}
          />
        ))}
      </div>
    </div>
  );
}


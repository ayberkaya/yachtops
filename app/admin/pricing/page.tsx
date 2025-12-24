import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { createClient } from "@supabase/supabase-js";
import { Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingTable } from "@/components/admin/pricing-table";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  min_loa: number;
  max_loa: number | null;
  features: string[];
  activeSubscribers: number;
  status?: "active" | "archived";
  description?: string;
  sales_pitch?: string;
  sales_metadata?: any; // JSONB field from database
}

interface Subscriber {
  id: string;
  name: string | null;
  email: string;
}

// Fallback plans if database is empty
const fallbackPlans: Plan[] = [
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let plans: Plan[] = fallbackPlans;
  let subscribersByPlan: Record<string, Subscriber[]> = {};

  if (supabaseUrl && supabaseServiceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .order("min_loa", { ascending: true });

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

        // Map plans with real subscriber counts
        plans = (plansData as any[]).map((plan) => ({
          ...plan,
          activeSubscribers: subscribersByPlan[plan.id]?.length || 0,
          status: (plan.status as "active" | "archived") || "active",
        }));
      } else {
        // Fallback: Try to get counts from Prisma if Supabase doesn't have the data
        try {
          // This assumes plan_id is stored in user metadata or a separate field
          // For now, we'll use the fallback plans with 0 counts
          plans = fallbackPlans.map((plan) => ({
            ...plan,
            activeSubscribers: 0,
            status: "active" as const,
          }));
        } catch (dbError) {
          console.error("Error fetching from database:", dbError);
        }
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      // Fall back to hardcoded plans with 0 counts
      plans = fallbackPlans.map((plan) => ({
        ...plan,
        activeSubscribers: 0,
        status: "active" as const,
      }));
    }
  } else {
    // No Supabase config, use fallback with 0 counts
    plans = fallbackPlans.map((plan) => ({
      ...plan,
      activeSubscribers: 0,
      status: "active" as const,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-slate-600" />
          <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>
        </div>
        <Button className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {/* Plans Table with Sheet */}
      <PricingTable plans={plans} subscribersByPlan={subscribersByPlan} />
    </div>
  );
}


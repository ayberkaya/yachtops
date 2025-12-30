import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { differenceInDays } from "date-fns";
import Link from "next/link";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type PlanDetails = {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
} | null;

type SubscriptionData = {
  subscription_status: string | null;
  trial_ends_at: Date | null;
  plan: PlanDetails;
  plan_id: string | null;
} | null;

async function getSubscriptionData(userId: string): Promise<SubscriptionData> {
  try {
    // Use Prisma with raw SQL to fetch subscription fields directly from database
    // This bypasses both RLS and Supabase API layer entirely via direct DB connection

    // Fetch user subscription fields AND yacht plan_id
    const userData = await db.$queryRaw<Array<{
      subscription_status: string | null;
      trial_ends_at: Date | null;
      plan_id: string | null;
      yacht_id: string | null;
      yacht_plan_id: string | null;
    }>>`
      SELECT 
        u.subscription_status, 
        u.trial_ends_at, 
        u.plan_id,
        u.yacht_id,
        y.current_plan_id as yacht_plan_id
      FROM users u
      LEFT JOIN yachts y ON u.yacht_id = y.id
      WHERE u.id = ${userId}
      LIMIT 1
    `;

    if (!userData || userData.length === 0) {
      console.warn("No subscription data found for user:", userId);
      return null;
    }

    const userWithPlan = userData[0];
    
    // Use yacht's plan_id if user's plan_id is null
    const effectivePlanId = userWithPlan.plan_id || userWithPlan.yacht_plan_id;
    
    let planDetails: PlanDetails = null;

    // Fetch plan details if plan_id exists (from user or yacht)
    if (effectivePlanId) {
      const planData = await db.$queryRaw<Array<{
        id: string;
        name: string;
        price: number | null;
        currency: string | null;
      }>>`
        SELECT id, name, monthly_price as price, currency
        FROM plans
        WHERE id = ${effectivePlanId}::uuid
        LIMIT 1
      `;

      if (planData && planData.length > 0) {
        planDetails = planData[0];
      } else {
        console.warn(`⚠️ Plan ID exists (${effectivePlanId}) but plan details are missing.`);
      }
    } else {
      console.warn("⚠️ No plan_id found for user or yacht:", userId);
    }

    return {
      subscription_status: userWithPlan.subscription_status,
      trial_ends_at: userWithPlan.trial_ends_at,
      plan: planDetails,
      plan_id: effectivePlanId,
    };
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    return null;
  }
}

export default async function BillingPage() {
  // Use NextAuth session instead of Supabase Auth
  const session = await getSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;

  // Fetch subscription data using admin client to bypass RLS
  const subscriptionData = await getSubscriptionData(userId);

  // Calculate days left if trial
  let daysLeft: number | null = null;
  if (subscriptionData?.subscription_status === "TRIAL" && subscriptionData.trial_ends_at) {
    const endDate = new Date(subscriptionData.trial_ends_at);
    const now = new Date();
    daysLeft = differenceInDays(endDate, now);
  } else {
  }

  // Format renewal/trial end date
  const getRenewalDate = (): string | null => {
    if (subscriptionData?.trial_ends_at) {
      return format(new Date(subscriptionData.trial_ends_at), "MMM d, yyyy");
    }
    return null;
  };

  // Format price
  const formatPrice = (price: number | null, currency: string = "USD"): string => {
    if (price === null || price === undefined) return "N/A";
    if (price === 0) return "Custom Pricing";
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Get status badge - only show if plan exists
  const getStatusBadge = () => {
    // Don't show badge if no plan is assigned
    if (!subscriptionData?.plan && !subscriptionData?.plan_id) {
      return null;
    }
    
    const status = subscriptionData?.subscription_status || "UNKNOWN";
    
    if (status === "TRIAL") {
      return (
        <Badge className="bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700">
          Trial Active
        </Badge>
      );
    } else if (status === "ACTIVE" || status === "active") {
      return (
        <Badge className="bg-blue-600 text-white border-blue-700 hover:bg-blue-700">
          Active
        </Badge>
      );
    } else if (status === "PAST_DUE" || status === "past_due") {
      return (
        <Badge variant="destructive">
          Past Due
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
    }
  };

  // Get status display text
  const getStatusText = (): string => {
    const status = subscriptionData?.subscription_status || "UNKNOWN";
    
    if (status === "TRIAL") {
      return "Trial";
    } else if (status === "ACTIVE" || status === "active") {
      return "Active";
    } else if (status === "PAST_DUE" || status === "past_due") {
      return "Past Due";
    }
    return status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your plan and payment methods.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription className="mt-2">
                {subscriptionData?.plan?.name 
                  ? subscriptionData.plan.name
                  : subscriptionData?.plan_id 
                    ? `Plan ID: ${subscriptionData.plan_id} (Details unavailable)`
                    : "No plan assigned"}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {subscriptionData?.plan || subscriptionData?.plan_id ? (
            <div className="space-y-6">
              {/* Show warning if plan_id exists but plan details are missing */}
              {subscriptionData?.plan_id && !subscriptionData?.plan && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Plan ID ({subscriptionData.plan_id}) is assigned but plan details are unavailable. 
                    This may indicate a data sync issue. Please contact support if this persists.
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <p className="text-base font-semibold">{getStatusText()}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {subscriptionData?.subscription_status === "TRIAL" ? "Trial Ends" : "Renewal Date"}
                  </p>
                  <p className="text-base font-semibold">
                    {getRenewalDate() || "N/A"}
                    {daysLeft !== null && daysLeft > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({daysLeft} {daysLeft === 1 ? "day" : "days"} left)
                      </span>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Cost</p>
                  <p className="text-base font-semibold">
                    {subscriptionData?.plan 
                      ? formatPrice(subscriptionData.plan.price, subscriptionData.plan.currency || "USD")
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Footer Action */}
              <div className="pt-4 border-t">
                {subscriptionData?.subscription_status === "TRIAL" ? (
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/dashboard/settings/billing">
                      Add Payment Method
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href="/dashboard/settings/billing">
                      Manage Subscription
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}>
                <p className="text-sm text-muted-foreground mb-4">
                  No subscription plan is currently assigned to your account.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please contact support to set up your subscription.
                </p>
              </div>
              
              <div className="pt-4 border-t">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="mailto:support@helmops.com?subject=Subscription Setup Request">
                    Contact Support
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Our support team is here to assist you with any billing questions or issues.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Have questions about your subscription, billing, or need assistance? We're here to help.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline" className="flex-1">
                <a href="mailto:support@helmops.com?subject=Billing Inquiry" className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </Button>
              
              <Button asChild variant="outline" className="flex-1">
                <a href="mailto:support@helmops.com?subject=General Support Request" className="flex items-center justify-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                For urgent matters, please include your account email and a brief description of your issue in the subject line.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


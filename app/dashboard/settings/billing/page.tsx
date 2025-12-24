import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { differenceInDays } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getSubscriptionData(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  try {
    // Try join query first, but fallback to separate queries if it fails
    let userWithPlan: any = null;
    let userError: any = null;
    let planDetails: any = null;
    // Since we're using admin client, we don't need to switch clients
    const clientToUse = supabase;

    // Attempt join query
    const joinResult = await supabase
      .from("users")
      .select("*, plans(*)") // Join with plans table
      .eq("id", userId)
      .single();

    userWithPlan = joinResult.data;
    userError = joinResult.error;

    // Debug logging
    console.log("Join Query Result - User Plan ID:", userWithPlan?.plan_id);
    console.log("Join Query Result - Plans Data:", JSON.stringify(userWithPlan?.plans, null, 2));
    console.log("Join Query Result - Error:", JSON.stringify(userError || {}, null, 2));
    console.log("Join Query Result - Raw Response:", JSON.stringify(joinResult, null, 2));

    // If join query failed, try separate queries as fallback
    if (userError || !userWithPlan) {
      console.warn("Join query failed, falling back to separate queries. Error:", JSON.stringify(userError || {}, null, 2));
      
      // Fetch user data separately
      const { data: userData, error: userDataError } = await clientToUse
        .from("users")
        .select("subscription_status, trial_ends_at, plan_id")
        .eq("id", userId)
        .single();

      if (userDataError || !userData) {
        console.error("Error fetching user data (fallback):", JSON.stringify(userDataError || {}, null, 2));
        return null;
      }

      // Successfully fetched user data
      userWithPlan = userData;

      // Fetch plan details if plan_id exists
      if (userWithPlan.plan_id) {
        const { data: plan, error: planError } = await clientToUse
          .from("plans")
          .select("id, name, price, currency")
          .eq("id", userWithPlan.plan_id)
          .single();

        if (planError) {
          console.warn("Error fetching plan details (fallback):", JSON.stringify(planError, null, 2));
        } else {
          planDetails = plan;
        }
      }
    } else {
      // Join query succeeded - extract plan details
      // Handle case where relation returns array vs object
      // Supabase can return plans as an array or single object depending on relation type
      planDetails = Array.isArray(userWithPlan?.plans) 
        ? userWithPlan.plans[0] 
        : userWithPlan?.plans;
    }

    // If plan_id exists but plans (details) is missing, log a warning
    if (userWithPlan.plan_id && !planDetails) {
      console.warn(`Plan ID exists (${userWithPlan.plan_id}) but plan details are missing. This may indicate an RLS issue or missing plan record.`);
    }

    return {
      subscription_status: userWithPlan.subscription_status,
      trial_ends_at: userWithPlan.trial_ends_at,
      plan: planDetails || null,
      plan_id: userWithPlan.plan_id, // Include plan_id for fallback display
    };
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    return null;
  }
}

export default async function BillingPage() {
  // Create authenticated Supabase client
  const supabase = await createClient();

  // Authentication check - verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Authentication error:", JSON.stringify(authError || {}, null, 2));
    redirect("/auth/signin");
  }

  // Debug log to confirm authentication
  console.log("Auth User ID:", user?.id);

  const userId = user.id;

  // Fetch subscription data using authenticated client
  const subscriptionData = await getSubscriptionData(supabase, userId);

  // Calculate days left if trial
  let daysLeft: number | null = null;
  if (subscriptionData?.subscription_status === "TRIAL" && subscriptionData.trial_ends_at) {
    const endDate = new Date(subscriptionData.trial_ends_at);
    const now = new Date();
    daysLeft = differenceInDays(endDate, now);
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

  // Get status badge
  const getStatusBadge = () => {
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
                    {subscriptionData.subscription_status === "TRIAL" ? "Trial Ends" : "Renewal Date"}
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
                      ? formatPrice(subscriptionData.plan.price, subscriptionData.plan.currency)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Footer Action */}
              <div className="pt-4 border-t">
                {subscriptionData.subscription_status === "TRIAL" ? (
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
    </div>
  );
}


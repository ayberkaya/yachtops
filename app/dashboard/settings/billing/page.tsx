import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { differenceInDays } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getSubscriptionData(userId: string) {
  try {
    const supabase = createAdminClient();
    
    if (!supabase) {
      console.error("Supabase Admin client not configured");
      return null;
    }

    // Fetch user subscription data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("subscription_status, trial_ends_at, plan_id")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return null;
    }

    // Fetch plan details if plan_id exists
    let planData = null;
    if (userData.plan_id) {
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("id, name, price, currency")
        .eq("id", userData.plan_id)
        .single();

      if (!planError && plan) {
        planData = plan;
      }
    }

    return {
      subscription_status: userData.subscription_status,
      trial_ends_at: userData.trial_ends_at,
      plan: planData,
    };
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    return null;
  }
}

export default async function BillingPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const subscriptionData = await getSubscriptionData(session.user.id);

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
                {subscriptionData?.plan?.name || "No plan assigned"}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {subscriptionData?.plan ? (
            <div className="space-y-6">
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
                    {formatPrice(subscriptionData.plan.price, subscriptionData.plan.currency)}
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
              <div className="rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 text-center">
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


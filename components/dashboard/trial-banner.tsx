import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/utils/supabase/admin";
import { differenceInDays } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function TrialBanner() {
  // Get current authenticated user
  const session = await getSession();
  
  if (!session?.user?.id) {
    return null;
  }

  // Fetch subscription data
  const supabase = createAdminClient();
  
  if (!supabase) {
    return null;
  }

  // Query user subscription details
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("subscription_status, trial_ends_at, plan_id")
    .eq("id", session.user.id)
    .single();

  if (userError || !userData) {
    return null;
  }

  // Don't show if not TRIAL status
  if (userData.subscription_status !== "TRIAL") {
    return null;
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

  // Calculate days left
  if (!userData.trial_ends_at) {
    return null;
  }

  const endDate = new Date(userData.trial_ends_at);
  const now = new Date();
  const daysLeft = differenceInDays(endDate, now);

  // Don't show if trial has expired
  if (daysLeft <= 0) {
    return null;
  }

  return (
    <div className="w-full bg-indigo-600 text-white px-4 py-3 mb-6 rounded-lg shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">🌊</span>
          <span className="text-sm font-medium">
            You are currently on the <strong>{planName || "Trial"}</strong> Trial.{" "}
            <strong>{daysLeft}</strong> {daysLeft === 1 ? "Day" : "Days"} remaining.
          </span>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-white text-indigo-600 hover:bg-indigo-50 border-0 shadow-sm"
        >
          <Link href="/dashboard/settings/billing">Upgrade Plan</Link>
        </Button>
      </div>
    </div>
  );
}


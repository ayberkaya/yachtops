import { differenceInDays } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { unstable_cache } from "next/cache";
import { dbUnscoped } from "@/lib/db";

interface TrialBannerProps {
  userId: string;
}

type TrialInfo = {
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  planName: string | null;
};

async function fetchTrialInfo(userId: string): Promise<TrialInfo | null> {
  const rows = await dbUnscoped.$queryRaw<
    Array<{
      subscription_status: string | null;
      trial_ends_at: Date | null;
      plan_name: string | null;
    }>
  >`
    SELECT
      u.subscription_status,
      u.trial_ends_at,
      p.name as plan_name
    FROM users u
    LEFT JOIN yachts y ON y.id = u.yacht_id
    LEFT JOIN plans p ON p.id = COALESCE(u.plan_id, y.current_plan_id)
    WHERE u.id = ${userId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    subscriptionStatus: row.subscription_status,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
    planName: row.plan_name,
  };
}

function getTrialInfo(userId: string): Promise<TrialInfo | null> {
  // Ensure per-user cache keys to avoid cross-user cache bleed.
  return unstable_cache(
    async () => fetchTrialInfo(userId),
    [`trial-banner-v2-${userId}`],
    { revalidate: 60 }
  )();
}

export async function TrialBanner({ userId }: TrialBannerProps) {
  const info = await getTrialInfo(userId);
  if (!info) return null;

  if (info.subscriptionStatus !== "TRIAL") return null;
  if (!info.trialEndsAt) return null;

  const endDate = info.trialEndsAt;
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
          <span className="text-sm font-medium">
            Trial: <strong>{info.planName || "Starter"}</strong>.{" "}
            <strong>{daysLeft}</strong> {daysLeft === 1 ? "day" : "days"} remaining.
          </span>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-white text-indigo-600 hover:bg-indigo-50 border-0 shadow-sm"
        >
          <Link href="/dashboard/settings/billing">Upgrade</Link>
        </Button>
      </div>
    </div>
  );
}


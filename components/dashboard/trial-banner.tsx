"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { differenceInDays } from "date-fns";

interface TrialBannerProps {
  userId: string;
  initialSubscriptionStatus?: string | null;
  initialTrialEndsAt?: string | null;
  initialPlanName?: string | null;
}

export function TrialBanner({
  userId,
  initialSubscriptionStatus,
  initialTrialEndsAt,
  initialPlanName,
}: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(initialSubscriptionStatus);
  const [trialEndsAt, setTrialEndsAt] = useState(initialTrialEndsAt);
  const [planName, setPlanName] = useState(initialPlanName);
  const [loading, setLoading] = useState(false);

  // Check if banner was dismissed in localStorage
  useEffect(() => {
    const dismissedKey = `trial-banner-dismissed-${userId}`;
    const isDismissed = localStorage.getItem(dismissedKey) === "true";
    setDismissed(isDismissed);
  }, [userId]);

  // Fetch subscription data on mount (in case it wasn't passed as props)
  useEffect(() => {
    if (!subscriptionStatus && !trialEndsAt) {
      fetchSubscriptionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/user/subscription?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscription_status);
        setTrialEndsAt(data.trial_ends_at);
        setPlanName(data.plan_name);
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    const dismissedKey = `trial-banner-dismissed-${userId}`;
    localStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  };

  // Don't show if dismissed or loading
  if (dismissed || loading) {
    return null;
  }

  // Calculate days left using date-fns
  const calculateDaysLeft = (): number | null => {
    if (!trialEndsAt) return null;
    const endDate = new Date(trialEndsAt);
    const now = new Date();
    const daysLeft = differenceInDays(endDate, now);
    return daysLeft > 0 ? daysLeft : 0;
  };

  const daysLeft = calculateDaysLeft();
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isPastDue = subscriptionStatus === "PAST_DUE";

  // Don't show if not TRIAL status
  if (subscriptionStatus !== "TRIAL") {
    return null;
  }

  // Show expired/past due banner (non-dismissible)
  if (isExpired || isPastDue) {
    return (
      <Alert variant="destructive" className="mb-6 border-red-500 bg-red-50 dark:bg-red-950/20">
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">⚠️ Trial Expired</span>
            <span className="text-sm">
              {isPastDue
                ? "Your subscription is past due. Please update your payment method to continue."
                : "Your trial period has ended. Please upgrade to continue using HelmOps."}
            </span>
          </div>
          <Button
            asChild
            size="sm"
            className="ml-4 bg-red-600 hover:bg-red-700 text-white"
          >
            <Link href="/dashboard/billing">Upgrade Now</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show trial banner (dismissible)
  // Use Amber-50 for urgency if 3 days or less, otherwise Indigo-50 for friendly reminder
  const isUrgent = daysLeft !== null && daysLeft <= 3;
  const bgColor = isUrgent 
    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200" 
    : "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200";

  if (daysLeft !== null && daysLeft > 0) {
    return (
      <Alert className={`mb-6 ${bgColor}`}>
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">🚢</span>
            <span className="text-sm text-slate-900 dark:text-slate-100">
              <strong>{planName || "Trial"}</strong> Trial: You have{" "}
              <strong>{daysLeft}</strong> {daysLeft === 1 ? "day" : "days"} left.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className={isUrgent 
                ? "bg-amber-600 hover:bg-amber-700 text-white" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white"}
            >
              <Link href="/dashboard/billing">Add Payment Method</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Don't show banner for other statuses
  return null;
}


"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { checkFeatureAction } from "@/actions/check-feature";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";

interface FeatureGateProps {
  /**
   * Feature key to check (e.g., "module:finance", "module:maintenance")
   */
  feature: string;
  /**
   * Children to render if feature is available
   */
  children: ReactNode;
  /**
   * Fallback content to show if feature is not available
   * If not provided, shows default upgrade message
   */
  fallback?: ReactNode;
  /**
   * Plan name that includes this feature (for upgrade message)
   */
  requiredPlan?: string;
  /**
   * Custom message to show when feature is locked
   */
  lockedMessage?: string;
}

/**
 * FeatureGate component - Conditionally renders children based on plan features
 * 
 * Usage:
 * ```tsx
 * <FeatureGate feature="module:finance">
 *   <FinanceDashboard />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  requiredPlan,
  lockedMessage,
}: FeatureGateProps) {
  const { data: session } = useSession();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!session?.user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const access = await checkFeatureAction(feature);
        setHasAccess(access);
      } catch (error) {
        console.error("[FeatureGate] Error checking feature:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [feature, session]);

  // Show loading state (optional - can be removed if you want instant render)
  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Checking access…</div>
      </div>
    );
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade message
  const planName = requiredPlan || "Professional";
  const message =
    lockedMessage ??
    `This feature is available in the ${planName} plan. Upgrade to unlock it.`;

  return (
    <UpgradePrompt
      title="Feature locked"
      description={message}
      featureName={feature}
      primaryCtaHref="/dashboard/settings/billing"
      primaryCtaLabel="Upgrade plan"
      secondaryCtaHref="/dashboard"
      secondaryCtaLabel="Back to dashboard"
      bullets={[
        "Unlock the module immediately after upgrading",
        "Keep your existing data and users",
      ]}
    />
  );
}

/**
 * FeatureGateLink - Wrapper for navigation links that should be locked
 * Shows a lock icon if feature is not available
 */
interface FeatureGateLinkProps {
  feature: string;
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function FeatureGateLink({
  feature,
  href,
  children,
  className,
  onClick,
}: FeatureGateLinkProps) {
  const { data: session } = useSession();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!session?.user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const access = await checkFeatureAction(feature);
        setHasAccess(access);
      } catch (error) {
        console.error("[FeatureGateLink] Error checking feature:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [feature, session]);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hasAccess) {
      e.preventDefault();
      // Optionally open upgrade modal or redirect to billing
      window.location.href = "/dashboard/settings/billing";
    }
    onClick?.();
  };

  return (
    <Link
      href={hasAccess ? href : "#"}
      onClick={handleClick}
      className={className}
      aria-disabled={!hasAccess}
    >
      {children}
      {!loading && !hasAccess && (
        <Lock className="w-3 h-3 ml-1.5 inline text-muted-foreground" />
      )}
    </Link>
  );
}


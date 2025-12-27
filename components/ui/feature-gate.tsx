"use client";

import { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { checkFeatureAction } from "@/actions/check-feature";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

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
    return null; // Or return a loading spinner
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
  const message = lockedMessage || `This feature is available in the ${planName} plan.`;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full border-2 border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/20 dark:to-teal-800/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-teal-600 dark:text-teal-400" />
          </div>
          <CardTitle className="text-xl">Feature Locked</CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/dashboard/settings/billing">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
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


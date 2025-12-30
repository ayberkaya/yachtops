import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  title?: string;
  description?: string;
  featureName?: string;
  bullets?: string[];
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
}

export function UpgradePrompt({
  title = "Upgrade required",
  description,
  featureName,
  bullets,
  primaryCtaHref = "/dashboard/settings/billing",
  primaryCtaLabel = "Upgrade plan",
  secondaryCtaHref = "/dashboard",
  secondaryCtaLabel = "Back to dashboard",
}: UpgradePromptProps) {
  const finalDescription =
    description ??
    (featureName
      ? `${featureName} is not included in your current plan. Upgrade to unlock it.`
      : "This feature is not included in your current plan. Upgrade to unlock it.");

  return (
    <div className="flex items-center justify-center min-h-[360px] p-4">
      <Card className="w-full max-w-lg border-2 border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900/20 dark:to-slate-800/20 flex items-center justify-center">
            <Lock className="w-7 h-7 text-slate-700 dark:text-slate-300" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-2">{finalDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bullets && bullets.length > 0 ? (
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full sm:flex-1">
              <Link href={primaryCtaHref}>
                <Sparkles className="w-4 h-4 mr-2" />
                {primaryCtaLabel}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:flex-1">
              <Link href={secondaryCtaHref}>{secondaryCtaLabel}</Link>
            </Button>
          </div>

          <div className="pt-3 border-t text-xs text-muted-foreground text-center">
            Need help? Email{" "}
            <a className="underline underline-offset-2" href="mailto:support@helmops.com?subject=HelmOps%20Upgrade%20Request">
              support@helmops.com
            </a>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



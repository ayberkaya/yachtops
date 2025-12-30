import Link from "next/link";
import { Construction, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ComingSoonProps {
  title: string;
  description: string;
  etaLabel?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
}

export function ComingSoon({
  title,
  description,
  etaLabel = "In progress",
  primaryCtaHref = "/dashboard/settings/billing",
  primaryCtaLabel = "Upgrade / request access",
  secondaryCtaHref = "/dashboard/inventory",
  secondaryCtaLabel = "Back to inventory",
}: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[360px] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Construction className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
              {etaLabel}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This page is intentionally disabled right now to avoid showing fake data or “temporary” items that don’t persist.
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full sm:flex-1">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:flex-1">
              <Link href={secondaryCtaHref}>{secondaryCtaLabel}</Link>
            </Button>
          </div>

          <div className="pt-3 border-t text-xs text-muted-foreground">
            Want early access? Email{" "}
            <a className="underline underline-offset-2" href="mailto:support@helmops.com?subject=HelmOps%20Early%20Access%20Request">
              support@helmops.com
            </a>{" "}
            with your yacht name and the inventory categories you need.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



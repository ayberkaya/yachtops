"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Home, Copy, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const errorId = error.digest || error.message.slice(0, 8) || "unknown";

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[dashboard/error] ", error);
    }
  }, [error]);

  const copyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <Card className="w-full max-w-md border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Dashboard error</CardTitle>
          </div>
          <CardDescription>
            This page failed to load. Try again, or go back to the dashboard home.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-sm border">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-xs text-muted-foreground">Error ID</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={copyErrorId}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="font-mono text-xs break-all text-foreground">{errorId}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground text-center">
            If this persists, contact{" "}
            <a className="underline underline-offset-2" href="mailto:support@helmops.com?subject=HelmOps%20Dashboard%20Error">
              support@helmops.com
            </a>{" "}
            and include the error ID.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



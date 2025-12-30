"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { SupportLink } from "@/components/support/support-link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const errorId = error.digest || error.message.slice(0, 8) || "unknown";

  const copyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error ID:", err);
    }
  };

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Page error:", error);
    }

    // Log to error reporting service in production
    if (process.env.NODE_ENV === "production") {
      console.error("Page error:", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            We encountered an unexpected error while loading this page. Don't worry - your data is safe. Please try again or contact support if the issue persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error ID - Always shown in production for support */}
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
            <p className="font-mono text-xs break-all text-foreground">
              {errorId}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Please include this ID when contacting support.
            </p>
          </div>

          {/* Development error details */}
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm border border-destructive/20">
              <p className="font-semibold mb-1 text-destructive">Error details (dev only):</p>
              <p className="text-destructive font-mono text-xs break-all">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">Stack trace</summary>
                  <pre className="text-xs text-muted-foreground mt-1 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={reset} variant="default" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/dashboard">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                Still having issues?
              </p>
              <SupportLink variant="outline" size="sm" className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


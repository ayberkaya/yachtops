"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportLink } from "@/components/support/support-link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const errorId = error.digest || `GLOBAL-ERR-${Date.now()}`;

  useEffect(() => {
    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "global",
        errorId: errorId,
      },
      extra: {
        digest: error.digest,
      },
    });

    // Only log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    }
  }, [error, errorId]);

  const copyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
    }
  };

  return (
    <html lang="en">
      <body>
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
          <Card className="w-full max-w-md border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Application Error</CardTitle>
              </div>
              <CardDescription>
                A critical error occurred. Don't worry - your data is safe. Please refresh the page to continue or contact support if the issue persists.
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
                <Button onClick={reset} variant="default" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Application
                </Button>
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
      </body>
    </html>
  );
}


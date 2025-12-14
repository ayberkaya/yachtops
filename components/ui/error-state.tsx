"use client";

import { AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportLink } from "@/components/support/support-link";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showSupport?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We encountered an error. Don't worry - your data is safe.",
  onRetry,
  retryLabel = "Try Again",
  showSupport = true,
  className,
}: ErrorStateProps) {
  return (
    <div className={`flex items-center justify-center min-h-[200px] p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {onRetry && (
            <Button onClick={onRetry} variant="default" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
          )}
          {showSupport && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                Need help?
              </p>
              <SupportLink variant="outline" size="sm" className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


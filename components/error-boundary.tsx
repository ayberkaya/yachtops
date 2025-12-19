"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportLink } from "@/components/support/support-link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a chunk loading error
    const isChunkError = error.message?.includes("Failed to load chunk") || 
                         error.message?.includes("turbopack") ||
                         error.message?.includes("ChunkLoadError");
    
    if (isChunkError && typeof window !== "undefined") {
      // For chunk errors, try to reload after clearing cache
      console.warn("Chunk loading error detected, attempting recovery...");
      
      // Clear Next.js cache
      if ("caches" in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this is a chunk loading error
    const isChunkError = error.message?.includes("Failed to load chunk") || 
                         error.message?.includes("turbopack") ||
                         error.message?.includes("ChunkLoadError");
    
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
      if (isChunkError) {
        console.warn("This appears to be a chunk loading error. The page will attempt to reload.");
      }
    }

    // Log to error reporting service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrate with error reporting service (e.g., Sentry)
      console.error("Application error:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        isChunkError,
      });
    }

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We encountered an unexpected error. Don't worry - your data is safe. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-semibold mb-1">Error details (dev only):</p>
                  <p className="text-destructive font-mono text-xs break-all">
                    {this.state.error.message}
                  </p>
                  {(this.state.error.message?.includes("Failed to load chunk") || 
                    this.state.error.message?.includes("turbopack")) && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <p className="font-semibold text-yellow-800">Chunk Loading Error Detected</p>
                      <p className="text-yellow-700 mt-1">
                        This is usually caused by cache issues. The page will attempt to reload automatically.
                        If the problem persists, try a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows).
                      </p>
                    </div>
                  )}
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} variant="outline" className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="default"
                    className="flex-1"
                  >
                    Refresh Page
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

    return this.props.children;
  }
}


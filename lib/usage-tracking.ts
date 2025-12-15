/**
 * Simple usage tracking utility
 * Tracks page views and key user actions for product insights
 */

export type UsageEventType = "page_view" | "action" | "error";

export interface UsageEventData {
  eventType: UsageEventType;
  page?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * Track a usage event (non-blocking)
 * Fails silently to never interrupt user flow
 */
export async function trackUsage(data: UsageEventData): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // Get current page path
    const page = data.page || window.location.pathname;

    // Send to API (fire and forget)
    fetch("/api/usage/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        page,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail - tracking should never break the app
    });
  } catch (error) {
    // Silently fail
  }
}

/**
 * Track page view
 */
export function trackPageView(page?: string): void {
  trackUsage({
    eventType: "page_view",
    page,
  });
}

/**
 * Track user action
 */
export function trackAction(action: string, metadata?: Record<string, any>): void {
  trackUsage({
    eventType: "action",
    action,
    metadata,
  });
}

/**
 * Track error
 */
export function trackError(error: Error | string, page?: string, metadata?: Record<string, any>): void {
  trackUsage({
    eventType: "error",
    page,
    action: "error",
    metadata: {
      error: typeof error === "string" ? error : error.message,
      stack: typeof error === "object" && error.stack ? error.stack : undefined,
      ...metadata,
    },
  });
}


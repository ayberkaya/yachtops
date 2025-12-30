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

function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function getClientContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  const nav = window.navigator;
  const connection = (nav as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } })
    .connection;

  return {
    referrer: document.referrer || null,
    language: nav.language || null,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    viewport: {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio,
    },
    connection: connection
      ? {
          effectiveType: connection.effectiveType ?? null,
          downlink: connection.downlink ?? null,
          rtt: connection.rtt ?? null,
        }
      : null,
  };
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

    const payload = {
      ...data,
      page,
      timestamp: new Date().toISOString(),
      metadata: {
        ...getClientContext(),
        ...(data.metadata ?? {}),
      },
    };

    // Prefer sendBeacon to avoid blocking navigation/unload.
    const json = safeJsonStringify(payload);
    if (!json) return;

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(
        "/api/usage/track",
        new Blob([json], { type: "application/json" })
      );
      if (ok) return;
    }

    // Fallback to fetch (keepalive helps on page transitions)
    fetch("/api/usage/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
      keepalive: true,
    }).catch(() => {});
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


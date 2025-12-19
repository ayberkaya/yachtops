"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { WidgetConfig, DEFAULT_WIDGETS } from "@/types/widgets";
import { WidgetCustomizer } from "./widget-customizer";

export function WidgetCustomizerButton() {
  // Always call hooks in the same order (Rules of Hooks)
  // Don't conditionally call hooks - this violates React's Rules of Hooks
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession(); // Always call, even if not mounted yet
  const router = useRouter();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Don't load widgets until component is mounted (client-side only)
    if (!mounted) {
      return;
    }

    async function loadWidgets() {
      // Wait for session to be loaded
      if (status === "loading") {
        return;
      }

      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Always set defaults first, then try to load from API
      if (session?.user?.role) {
        const defaultWidgets = DEFAULT_WIDGETS[session.user.role as keyof typeof DEFAULT_WIDGETS] || [];
        setWidgets(defaultWidgets);
        setLoading(false);
      }

      // Try to load from API in background (non-blocking) with cache
      try {
        const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets", {
          useCache: true,
          cacheTTL: 300000, // 5 minutes cache
        });
        if (response.data?.widgets && response.data.widgets.length > 0) {
          setWidgets(response.data.widgets);
        }
      } catch (error: any) {
        // Silently fail - we already have defaults set above
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.warn("Could not load widget preferences from API, using defaults:", error);
        }
      }
    }
    loadWidgets();
  }, [mounted, session, status]);

  // Get widgets to use - prefer loaded widgets, fallback to defaults based on role
  const getWidgetsToUse = (): WidgetConfig[] => {
    if (widgets.length > 0) {
      return widgets;
    }
    if (session?.user?.role) {
      return DEFAULT_WIDGETS[session.user.role as keyof typeof DEFAULT_WIDGETS] || [];
    }
    return [];
  };

  const widgetsToUse = getWidgetsToUse();

  const handleSave = async (savedWidgets: WidgetConfig[]) => {
    // Update local state immediately
    setWidgets(savedWidgets);
    
      // Clear cache and reload widgets from API
      // Cache key format: METHOD:URL:BODY (URL is full URL)
      const { offlineStorage } = await import("@/lib/offline-storage");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const cacheKey = `GET:${origin}/api/dashboard/widgets:`;
      await offlineStorage.deleteCache(cacheKey).catch(() => {}); // Ignore errors if key doesn't exist
      
      // Set flag to force WidgetRenderer to bypass cache
      if (typeof window !== "undefined") {
        sessionStorage.setItem("widgets-refresh", "true");
        // Dispatch custom event to trigger WidgetRenderer refresh in same tab
        window.dispatchEvent(new CustomEvent("widgets-refresh"));
      }
      
      // Reload widgets from API
      try {
        const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets", {
          useCache: false, // Force fresh fetch
        });
        if (response.data?.widgets && response.data.widgets.length > 0) {
          setWidgets(response.data.widgets);
        }
      } catch (error) {
        // If reload fails, keep the saved widgets
        console.warn("Failed to reload widgets after save:", error);
      }
      
      // Refresh the page to reload widgets in other components
      router.refresh();
  };

  // Don't render during SSR or before mount
  if (!mounted) {
    return null;
  }

  // Always render WidgetCustomizer - it will show the button
  return <WidgetCustomizer currentWidgets={widgetsToUse} onSave={handleSave} />;
}


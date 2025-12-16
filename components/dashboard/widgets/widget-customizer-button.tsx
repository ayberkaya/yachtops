"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { WidgetConfig, DEFAULT_WIDGETS } from "@/types/widgets";
import { WidgetCustomizer } from "./widget-customizer";

export function WidgetCustomizerButton() {
  const { data: session, status } = useSession();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

      // Try to load from API in background (non-blocking)
      try {
        const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets");
        if (response.data?.widgets && response.data.widgets.length > 0) {
          setWidgets(response.data.widgets);
        }
      } catch (error: any) {
        // Silently fail - we already have defaults set above
        console.warn("Could not load widget preferences from API, using defaults:", error);
      }
    }
    loadWidgets();
  }, [session, status]);

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

  // Always render WidgetCustomizer - it will show the button
  return <WidgetCustomizer currentWidgets={widgetsToUse} onSave={setWidgets} />;
}


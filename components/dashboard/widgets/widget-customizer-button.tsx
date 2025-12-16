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

      try {
        const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets");
        if (response.data?.widgets) {
          setWidgets(response.data.widgets);
        } else {
          // Fallback to defaults if no widgets in response
          if (session?.user?.role) {
            const defaultWidgets = DEFAULT_WIDGETS[session.user.role as keyof typeof DEFAULT_WIDGETS] || [];
            setWidgets(defaultWidgets);
          }
        }
      } catch (error: any) {
        console.error("Error loading widgets:", error);
        // Always fallback to defaults on error
        if (session?.user?.role) {
          const defaultWidgets = DEFAULT_WIDGETS[session.user.role as keyof typeof DEFAULT_WIDGETS] || [];
          setWidgets(defaultWidgets);
        }
      } finally {
        setLoading(false);
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


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
        setWidgets(response.data.widgets || []);
      } catch (error: any) {
        console.error("Error loading widgets:", error);
        // Fallback to defaults
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

  // Always show the button, WidgetCustomizer will handle the loading state
  // If no session or widgets not loaded yet, use defaults based on role
  const widgetsToUse = widgets.length > 0 
    ? widgets 
    : (session?.user?.role 
        ? DEFAULT_WIDGETS[session.user.role as keyof typeof DEFAULT_WIDGETS] || [] 
        : []);

  return <WidgetCustomizer currentWidgets={widgetsToUse} onSave={setWidgets} />;
}


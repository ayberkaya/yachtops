"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { WidgetConfig, DEFAULT_WIDGETS } from "@/types/widgets";
import { WidgetCustomizer } from "./widget-customizer";

export function WidgetCustomizerButton() {
  const { data: session } = useSession();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWidgets() {
      try {
        const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets");
        setWidgets(response.data.widgets || []);
      } catch (error) {
        console.error("Error loading widgets:", error);
        // Fallback to defaults
        if (session?.user?.role) {
          setWidgets(DEFAULT_WIDGETS[session.user.role] || []);
        }
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) {
      loadWidgets();
    }
  }, [session]);

  if (loading || !session?.user) {
    return null;
  }

  return <WidgetCustomizer currentWidgets={widgets} onSave={setWidgets} />;
}


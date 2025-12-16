"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { WidgetConfig, DEFAULT_WIDGETS } from "@/types/widgets";
import { WidgetCustomizer } from "./widget-customizer";
import { Button } from "@/components/ui/button";
import { Settings2, Loader2 } from "lucide-react";

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

  // Show button even while loading, but disable it
  if (status === "loading" || loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Customize Dashboard
      </Button>
    );
  }

  if (!session?.user) {
    return null;
  }

  return <WidgetCustomizer currentWidgets={widgets} onSave={setWidgets} />;
}


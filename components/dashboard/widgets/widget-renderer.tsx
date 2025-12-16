"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { WidgetConfig } from "@/types/widgets";
import { PendingExpensesWidget } from "./pending-expenses-widget";
import { RecentExpensesWidget } from "./recent-expenses-widget";
import { QuickStatsWidget } from "./quick-stats-widget";
import { WidgetCustomizer } from "./widget-customizer";

interface WidgetRendererProps {
  // Data for widgets
  pendingExpenses?: any[];
  recentExpenses?: any[];
  upcomingTrips?: any[];
  totalPendingAmount?: number;
  // ... other widget data
}

export function WidgetRenderer({ pendingExpenses = [], recentExpenses = [], upcomingTrips = [], totalPendingAmount = 0 }: WidgetRendererProps) {
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
      } finally {
        setLoading(false);
      }
    }
    loadWidgets();
  }, []);

  if (loading) {
    return <div>Loading widgets...</div>;
  }

  const enabledWidgets = widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.id) {
      case "pending_expenses":
        return <PendingExpensesWidget expenses={pendingExpenses} totalAmount={totalPendingAmount} />;
      case "recent_expenses":
        return <RecentExpensesWidget expenses={recentExpenses} />;
      case "quick_stats":
        return (
          <QuickStatsWidget
            stats={[
              { label: "Awaiting Approval", value: pendingExpenses.length, description: totalPendingAmount > 0 ? `${totalPendingAmount.toLocaleString("en-US", { style: "currency", currency: "EUR" })} total` : "All reviewed" },
              { label: "Upcoming Trips", value: upcomingTrips.length, description: "Scheduled trips" },
            ]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <WidgetCustomizer currentWidgets={widgets} onSave={setWidgets} />
      </div>
      <div className="space-y-4">
        {enabledWidgets.map((widget) => (
          <div key={widget.id}>{renderWidget(widget)}</div>
        ))}
      </div>
    </div>
  );
}


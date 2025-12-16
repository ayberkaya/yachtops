"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { WidgetConfig } from "@/types/widgets";
import { PendingExpensesWidget } from "./pending-expenses-widget";
import { RecentExpensesWidget } from "./recent-expenses-widget";
import { QuickStatsWidget } from "./quick-stats-widget";
import { UpcomingTripsWidget } from "./upcoming-trips-widget";
import { MyTasksWidget } from "./my-tasks-widget";
import { RoleTasksAlertWidget } from "./role-tasks-alert-widget";
import { UpcomingMaintenanceWidget } from "./upcoming-maintenance-widget";
import { ExpiringPermissionsWidget } from "./expiring-permissions-widget";
import { LowStockAlertWidget } from "./low-stock-alert-widget";
import { WidgetCustomizer } from "./widget-customizer";
import { MonthlyReportDownload } from "../monthly-report-download";

interface WidgetRendererProps {
  // Data for widgets
  pendingExpenses?: any[];
  recentExpenses?: any[];
  upcomingTrips?: any[];
  totalPendingAmount?: number;
  roleAssignedTasks?: any[];
  upcomingMaintenance?: any[];
  expiringPermissions?: any[];
  lowStockItems?: any[];
  myTasks?: any[];
  showCustomizerButton?: boolean;
}

export function WidgetRenderer({
  pendingExpenses = [],
  recentExpenses = [],
  upcomingTrips = [],
  totalPendingAmount = 0,
  roleAssignedTasks = [],
  upcomingMaintenance = [],
  expiringPermissions = [],
  lowStockItems = [],
  myTasks = [],
  showCustomizerButton = true,
}: WidgetRendererProps) {
  const { data: session } = useSession();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract role to keep dependency array stable
  const userRole = session?.user?.role;

  useEffect(() => {
    async function loadWidgets() {
      if (!userRole) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets");
        if (response.data?.widgets && response.data.widgets.length > 0) {
          setWidgets(response.data.widgets);
        } else {
          // Fallback to defaults if no widgets found
          const { DEFAULT_WIDGETS } = await import("@/types/widgets");
          const defaultWidgets = DEFAULT_WIDGETS[userRole as keyof typeof DEFAULT_WIDGETS] || [];
          setWidgets(defaultWidgets);
        }
      } catch (error) {
        console.error("Error loading widgets:", error);
        // Fallback to defaults on error
        const { DEFAULT_WIDGETS } = await import("@/types/widgets");
        const defaultWidgets = DEFAULT_WIDGETS[userRole as keyof typeof DEFAULT_WIDGETS] || [];
        setWidgets(defaultWidgets);
      } finally {
        setLoading(false);
      }
    }
    loadWidgets();
  }, [userRole]);

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
      case "upcoming_trips":
        return <UpcomingTripsWidget trips={upcomingTrips} />;
      case "my_tasks":
        return <MyTasksWidget tasks={myTasks} />;
      case "role_tasks_alert":
        return <RoleTasksAlertWidget tasks={roleAssignedTasks} />;
      case "upcoming_maintenance":
        return <UpcomingMaintenanceWidget maintenance={upcomingMaintenance} />;
      case "expiring_permissions":
        return <ExpiringPermissionsWidget permissions={expiringPermissions} />;
      case "low_stock_alert":
        return <LowStockAlertWidget items={lowStockItems} />;
      case "monthly_report":
        return <MonthlyReportDownload />;
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
      {showCustomizerButton && (
        <div className="flex justify-end">
          <WidgetCustomizer currentWidgets={widgets} onSave={setWidgets} />
        </div>
      )}
      <div className="space-y-4">
        {enabledWidgets.map((widget) => (
          <div key={widget.id}>{renderWidget(widget)}</div>
        ))}
      </div>
    </div>
  );
}


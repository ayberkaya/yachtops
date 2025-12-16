"use client";

import { useEffect, useState, useMemo, memo, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { WidgetConfig } from "@/types/widgets";
import { PendingExpensesWidget } from "./pending-expenses-widget";
import { RecentExpensesWidget } from "./recent-expenses-widget";
import { QuickStatsWidget } from "./quick-stats-widget";
// Lazy load less critical widgets - using dynamic imports for code splitting
const UpcomingTripsWidget = lazy(() => import("./upcoming-trips-widget").then(m => ({ default: m.UpcomingTripsWidget })));
const MyTasksWidget = lazy(() => import("./my-tasks-widget").then(m => ({ default: m.MyTasksWidget })));
const RoleTasksAlertWidget = lazy(() => import("./role-tasks-alert-widget").then(m => ({ default: m.RoleTasksAlertWidget })));
const UpcomingMaintenanceWidget = lazy(() => import("./upcoming-maintenance-widget").then(m => ({ default: m.UpcomingMaintenanceWidget })));
const ExpiringPermissionsWidget = lazy(() => import("./expiring-permissions-widget").then(m => ({ default: m.ExpiringPermissionsWidget })));
const LowStockAlertWidget = lazy(() => import("./low-stock-alert-widget").then(m => ({ default: m.LowStockAlertWidget })));
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

  const enabledWidgets = useMemo(
    () => widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order),
    [widgets]
  );

  const renderWidget = useMemo(
    () => (widget: WidgetConfig) => {
    switch (widget.id) {
      case "pending_expenses":
        return <PendingExpensesWidget expenses={pendingExpenses} totalAmount={totalPendingAmount} />;
      case "recent_expenses":
        return <RecentExpensesWidget expenses={recentExpenses} />;
      case "upcoming_trips":
        return (
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <UpcomingTripsWidget trips={upcomingTrips} />
          </Suspense>
        );
      case "my_tasks":
        return (
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <MyTasksWidget tasks={myTasks} />
          </Suspense>
        );
      case "role_tasks_alert":
        return (
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <RoleTasksAlertWidget tasks={roleAssignedTasks} />
          </Suspense>
        );
      case "upcoming_maintenance":
        return (
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <UpcomingMaintenanceWidget maintenance={upcomingMaintenance} />
          </Suspense>
        );
      case "expiring_permissions":
        return (
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <ExpiringPermissionsWidget permissions={expiringPermissions} />
          </Suspense>
        );
      case "low_stock_alert":
        return (
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <LowStockAlertWidget items={lowStockItems} />
          </Suspense>
        );
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
    };
    },
    [
      pendingExpenses,
      totalPendingAmount,
      recentExpenses,
      upcomingTrips,
      myTasks,
      roleAssignedTasks,
      upcomingMaintenance,
      expiringPermissions,
      lowStockItems,
    ]
  );

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


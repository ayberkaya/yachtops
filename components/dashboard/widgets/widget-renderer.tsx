"use client";

import React, { useEffect, useState, useMemo, memo, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { apiClient, CancelledRequestError } from "@/lib/api-client";
import { WidgetConfig } from "@/types/widgets";
import { PendingExpensesWidget } from "./pending-expenses-widget";
import { RecentExpensesWidget } from "./recent-expenses-widget";
import { CreditCardExpensesWidget } from "./credit-card-expenses-widget";
import { CashLedgerSummaryWidget } from "./cash-ledger-summary-widget";
import { QuickStatsWidget } from "./quick-stats-widget";
// Lazy load less critical widgets - using dynamic imports for code splitting
// Error handling: if import fails, Suspense fallback will be shown
// Removed catch handlers to avoid TypeScript type conflicts
const UpcomingTripsWidget = lazy(() => 
  import("./upcoming-trips-widget").then(m => ({ default: m.UpcomingTripsWidget }))
);

const MyTasksWidget = lazy(() => 
  import("./my-tasks-widget").then(m => ({ default: m.MyTasksWidget }))
);

const RoleTasksAlertWidget = lazy(() => 
  import("./role-tasks-alert-widget").then(m => ({ default: m.RoleTasksAlertWidget }))
);

const UpcomingMaintenanceWidget = lazy(() => 
  import("./upcoming-maintenance-widget").then(m => ({ default: m.UpcomingMaintenanceWidget }))
);

const ExpiringPermissionsWidget = lazy(() => 
  import("./expiring-permissions-widget").then(m => ({ default: m.ExpiringPermissionsWidget }))
);

const LowStockAlertWidget = lazy(() => 
  import("./low-stock-alert-widget").then(m => ({ default: m.LowStockAlertWidget }))
);
import { WidgetCustomizer } from "./widget-customizer";
import { MonthlyReportDownload } from "../monthly-report-download";

interface WidgetRendererProps {
  // Data for widgets
  pendingExpenses?: any[];
  recentExpenses?: any[];
  creditCardExpenses?: any[];
  creditCards?: Array<{ id: string; ownerName: string; lastFourDigits: string }>;
  cashBalances?: Array<{ currency: string; balance: number }>;
  upcomingTrips?: any[];
  totalPendingAmount?: number;
  roleAssignedTasks?: any[];
  upcomingMaintenance?: any[];
  expiringPermissions?: any[];
  lowStockItems?: any[];
  myTasks?: any[];
  showCustomizerButton?: boolean;
}

export const WidgetRenderer = memo(function WidgetRenderer({
  pendingExpenses = [],
  recentExpenses = [],
  creditCardExpenses = [],
  creditCards = [],
  cashBalances = [],
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
    let isMounted = true;
    
    async function loadWidgets() {
      if (!userRole) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      // Immediately set defaults to show dashboard quickly
      const { DEFAULT_WIDGETS } = await import("@/types/widgets");
      const defaultWidgets = DEFAULT_WIDGETS[userRole as keyof typeof DEFAULT_WIDGETS] || [];
      if (isMounted) {
        setWidgets(defaultWidgets);
        setLoading(false); // Show dashboard immediately with defaults
      }

      // Try to load from API in background (non-blocking)
      // Use cache by default, but allow refresh via query param or storage event
      try {
        // Check if we should bypass cache (e.g., after save)
        const shouldBypassCache = typeof window !== "undefined" && 
          (sessionStorage.getItem("widgets-refresh") === "true" || 
           new URLSearchParams(window.location.search).get("refresh") === "widgets");
        
        if (shouldBypassCache) {
          sessionStorage.removeItem("widgets-refresh");
        }
        
        const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets", {
          useCache: !shouldBypassCache,
          cacheTTL: 300000, // 5 minutes cache
        });
        if (!isMounted) return; // Component unmounted, don't update state
        
        if (response.data?.widgets && response.data.widgets.length > 0) {
          setWidgets(response.data.widgets);
        } else {
          // If API returns empty, keep defaults
          console.warn("API returned empty widgets, using defaults");
        }
      } catch (error) {
        // Silently handle abort/cancellation errors
        if (
          error instanceof CancelledRequestError ||
          (error instanceof Error && error.name === "AbortError") ||
          (error instanceof Error && error.message === "Request was cancelled")
        ) {
          return; // Request was cancelled, don't update state
        }
        
        if (!isMounted) return; // Component unmounted
        
        // Silently fail - we already have defaults set above
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.warn("Could not load widget preferences from API, using defaults:", error);
        }
      }
    }
    
    loadWidgets();
    
    // Listen for storage events to refresh widgets when saved from another tab/component
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "widgets-refresh" && e.newValue === "true") {
        loadWidgets();
      }
    };
    
    // Also listen for custom event for same-tab refresh
    const handleWidgetRefresh = () => {
      loadWidgets();
    };
    
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("widgets-refresh", handleWidgetRefresh);
    }
    
    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("widgets-refresh", handleWidgetRefresh);
      }
    };
  }, [userRole]);

  // All hooks must be called before any conditional returns
  const enabledWidgets = useMemo(() => {
    const filtered = widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);
    // Debug: Log enabled widgets in development
    if (process.env.NODE_ENV === "development" && filtered.length > 0) {
      console.log("[WidgetRenderer] Enabled widgets:", filtered.map(w => w.id));
    }
    return filtered;
  }, [widgets]);

  const renderWidget = useMemo(
    () => (widget: WidgetConfig) => {
    switch (widget.id) {
      case "cash_ledger_summary":
        return <CashLedgerSummaryWidget balances={cashBalances} />;
      case "credit_card_expenses":
        return <CreditCardExpensesWidget expenses={creditCardExpenses} creditCards={creditCards} />;
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
      creditCardExpenses,
      creditCards,
      cashBalances,
      upcomingTrips,
      myTasks,
      roleAssignedTasks,
      upcomingMaintenance,
      expiringPermissions,
      lowStockItems,
    ]
  );

  // Early return after all hooks are called
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
      </div>
    );
  }

  // Separate top priority widgets (cash_ledger_summary and credit_card_expenses) from others
  const topPriorityWidgets = enabledWidgets.filter(
    (w) => w.id === "cash_ledger_summary" || w.id === "credit_card_expenses"
  );
  const otherWidgets = enabledWidgets.filter(
    (w) => w.id !== "cash_ledger_summary" && w.id !== "credit_card_expenses"
  );

  return (
    <div className="space-y-6">
      {showCustomizerButton && (
        <div className="flex justify-end">
          <WidgetCustomizer currentWidgets={widgets} onSave={setWidgets} />
        </div>
      )}
      {/* Top Priority Widgets - Side by side on desktop, stacked on mobile */}
      {topPriorityWidgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topPriorityWidgets.map((widget) => (
            <div key={widget.id} className="flex justify-start">
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      )}
      {/* Other Widgets */}
      <div className="space-y-4">
        {otherWidgets.map((widget) => (
          <div key={widget.id}>{renderWidget(widget)}</div>
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.pendingExpenses === nextProps.pendingExpenses &&
    prevProps.recentExpenses === nextProps.recentExpenses &&
    prevProps.creditCardExpenses === nextProps.creditCardExpenses &&
    prevProps.creditCards === nextProps.creditCards &&
    prevProps.cashBalances === nextProps.cashBalances &&
    prevProps.upcomingTrips === nextProps.upcomingTrips &&
    prevProps.totalPendingAmount === nextProps.totalPendingAmount &&
    prevProps.roleAssignedTasks === nextProps.roleAssignedTasks &&
    prevProps.upcomingMaintenance === nextProps.upcomingMaintenance &&
    prevProps.expiringPermissions === nextProps.expiringPermissions &&
    prevProps.lowStockItems === nextProps.lowStockItems &&
    prevProps.myTasks === nextProps.myTasks &&
    prevProps.showCustomizerButton === nextProps.showCustomizerButton
  );
});


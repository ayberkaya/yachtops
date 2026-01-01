"use client";

import React, { useEffect, useState, useMemo, memo, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { apiClient, CancelledRequestError } from "@/lib/api-client";
import { offlineStorage } from "@/lib/offline-storage";
import { WidgetConfig } from "@/types/widgets";
import { PendingExpensesWidget } from "./pending-expenses-widget";
import { RecentExpensesWidget } from "./recent-expenses-widget";
import { CreditCardExpensesWidget } from "./credit-card-expenses-widget";
import { CashLedgerSummaryWidget } from "./cash-ledger-summary-widget";
import { QuickStatsWidget } from "./quick-stats-widget";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableWidgetWrapper } from "./sortable-widget-wrapper";
// Lazy load less critical widgets - using dynamic imports for code splitting
// Error handling: if import fails, Suspense fallback will be shown
// Removed catch handlers to avoid TypeScript type conflicts
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

const CalendarEventsWidget = lazy(() => 
  import("./calendar-events-widget").then(m => ({ default: m.CalendarEventsWidget }))
);
import { WidgetCustomizer } from "./widget-customizer";

interface WidgetRendererProps {
  // Data for widgets
  pendingExpenses?: any[];
  pendingExpensesCount?: number;
  pendingExpensesByCurrency?: Array<{ currency: string; total: number }>;
  recentExpenses?: any[];
  creditCardExpenses?: any[];
  creditCards?: Array<{ id: string; ownerName: string; lastFourDigits: string; billingCycleEndDate: number | null }>;
  cashBalances?: Array<{ currency: string; balance: number }>;
  totalPendingAmount?: number;
  roleAssignedTasks?: any[];
  upcomingMaintenance?: any[];
  expiringPermissions?: any[];
  lowStockItems?: any[];
  myTasks?: any[];
  calendarEvents?: any[];
  showCustomizerButton?: boolean;
}

export const WidgetRenderer = memo(function WidgetRenderer({
  pendingExpenses = [],
  pendingExpensesCount = 0,
  pendingExpensesByCurrency = [],
  recentExpenses = [],
  creditCardExpenses = [],
    creditCards = [],
    cashBalances = [],
    totalPendingAmount = 0,
  roleAssignedTasks = [],
  upcomingMaintenance = [],
  expiringPermissions = [],
  lowStockItems = [],
  myTasks = [],
  calendarEvents = [],
  showCustomizerButton = true,
}: WidgetRendererProps) {
  const { data: session } = useSession();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract role to keep dependency array stable
  const userRole = session?.user?.role;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Handle drag end - update widget order
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = enabledWidgets.findIndex((w) => w.id === active.id);
    const newIndex = enabledWidgets.findIndex((w) => w.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Update local state immediately for responsive UI
    const reorderedWidgets = arrayMove(enabledWidgets, oldIndex, newIndex);
    const updatedWidgets = widgets.map((widget) => {
      const newIndexInReordered = reorderedWidgets.findIndex((w) => w.id === widget.id);
      if (newIndexInReordered !== -1 && widget.enabled) {
        return { ...widget, order: newIndexInReordered };
      }
      return widget;
    });

    setWidgets(updatedWidgets);

    // Save to API in background (non-blocking)
    try {
      const widgetsToSave = updatedWidgets.map((widget, index) => ({
        id: widget.id,
        enabled: widget.enabled,
        order: widget.order ?? index,
        size: widget.size,
      }));

      await apiClient.request("/api/dashboard/widgets", {
        method: "PUT",
        body: JSON.stringify({ widgets: widgetsToSave }),
        skipQueue: true,
        queueOnOffline: false,
      });

      // Clear cache to force reload on next fetch
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const cacheKey = `GET:${origin}/api/dashboard/widgets:`;
      await offlineStorage.deleteCache(cacheKey).catch(() => {});
    } catch (error) {
      // Silently fail - user can manually save via customizer if needed
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to auto-save widget order:", error);
      }
    }
  };

  const renderWidget = useMemo(
    () => (widget: WidgetConfig) => {
    switch (widget.id) {
      case "cash_ledger_summary":
        return <CashLedgerSummaryWidget balances={cashBalances} />;
      case "credit_card_expenses":
        return <CreditCardExpensesWidget expenses={creditCardExpenses} creditCards={creditCards} />;
      case "pending_expenses":
        // Disabled - using quick_stats widget instead
        return null;
      case "recent_expenses":
        return <RecentExpensesWidget expenses={recentExpenses} />;
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
      case "calendar_events":
        return (
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <CalendarEventsWidget events={calendarEvents} />
          </Suspense>
        );
      case "quick_stats":
        // Widget removed - return null
        return null;
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
      myTasks,
      roleAssignedTasks,
      upcomingMaintenance,
      expiringPermissions,
      lowStockItems,
      calendarEvents,
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

  // All widget IDs for drag and drop
  const allWidgetIds = enabledWidgets.map((w) => w.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allWidgetIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {showCustomizerButton && (
            <div className="flex justify-end">
              <WidgetCustomizer currentWidgets={widgets} onSave={setWidgets} />
            </div>
          )}
          {/* Top Priority Widgets - Side by side on desktop, stacked on mobile */}
          {topPriorityWidgets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topPriorityWidgets.map((widget) => (
                <SortableWidgetWrapper key={widget.id} id={widget.id}>
                  <div className="flex justify-start w-full">
                    {renderWidget(widget)}
                  </div>
                </SortableWidgetWrapper>
              ))}
            </div>
          )}
          {/* Other Widgets */}
          {otherWidgets.length > 0 && (
            <div className="space-y-4">
              {otherWidgets.map((widget) => (
                <SortableWidgetWrapper key={widget.id} id={widget.id}>
                  {renderWidget(widget)}
                </SortableWidgetWrapper>
              ))}
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.pendingExpenses === nextProps.pendingExpenses &&
    prevProps.recentExpenses === nextProps.recentExpenses &&
    prevProps.creditCardExpenses === nextProps.creditCardExpenses &&
    prevProps.creditCards === nextProps.creditCards &&
    prevProps.cashBalances === nextProps.cashBalances &&
    prevProps.totalPendingAmount === nextProps.totalPendingAmount &&
    prevProps.roleAssignedTasks === nextProps.roleAssignedTasks &&
    prevProps.upcomingMaintenance === nextProps.upcomingMaintenance &&
    prevProps.expiringPermissions === nextProps.expiringPermissions &&
    prevProps.lowStockItems === nextProps.lowStockItems &&
    prevProps.myTasks === nextProps.myTasks &&
    prevProps.showCustomizerButton === nextProps.showCustomizerButton
  );
});


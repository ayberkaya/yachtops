import type { Session } from "next-auth";
import { QuickActions } from "./quick-actions";
import { WidgetCustomizerButton } from "./widgets/widget-customizer-button";
import { WidgetRenderer } from "./widgets/widget-renderer";
import { getUserWidgetSettings } from "@/lib/dashboard/widget-settings";
import {
  getPendingExpenses,
  getPendingExpensesCount,
  getPendingExpensesByCurrency,
  getRecentExpenses,
  getCreditCardExpenses,
  getCreditCards,
  getCashBalances,
  getUpcomingTrips,
  getAlcoholStocks,
  getMarinaPermissions,
  getMaintenanceLogs,
  getRoleTasks,
  getBriefingStats,
  getCalendarEvents,
} from "@/lib/dashboard/dashboard-data";
import { DashboardHeader } from "./dashboard-header";
import { Suspense } from "react";

type DashboardUser = NonNullable<Session["user"]>;

async function OwnerCaptainWidgets({
  user,
  enabledWidgetIds,
}: {
  user: DashboardUser;
  enabledWidgetIds: string[];
}) {
  const yachtId = user.yachtId;
  const enabledWidgets = new Set(enabledWidgetIds);

  // Conditionally create promises only for enabled widgets
  const pendingExpensesPromise = enabledWidgets.has("pending_expenses") || enabledWidgets.has("quick_stats")
    ? getPendingExpenses(yachtId)
    : Promise.resolve(undefined);
  
  const pendingExpensesCountPromise = enabledWidgets.has("quick_stats")
    ? getPendingExpensesCount(yachtId)
    : Promise.resolve(0);
  
  const pendingExpensesByCurrencyPromise = enabledWidgets.has("quick_stats")
    ? getPendingExpensesByCurrency(yachtId)
    : Promise.resolve([]);

  const recentExpensesPromise = enabledWidgets.has("recent_expenses")
    ? getRecentExpenses(yachtId)
    : Promise.resolve(undefined);

  const creditCardExpensesPromise = enabledWidgets.has("credit_card_expenses")
    ? getCreditCardExpenses(yachtId)
    : Promise.resolve(undefined);

  const creditCardsPromise = enabledWidgets.has("credit_card_expenses")
    ? getCreditCards(yachtId)
    : Promise.resolve(undefined);

  const cashBalancesPromise = enabledWidgets.has("cash_ledger_summary")
    ? getCashBalances(yachtId)
    : Promise.resolve(undefined);

  const upcomingTripsPromise = enabledWidgets.has("upcoming_trips")
    ? getUpcomingTrips(yachtId)
    : Promise.resolve(undefined);

  const alcoholStocksPromise = enabledWidgets.has("low_stock_alert")
    ? getAlcoholStocks(yachtId, user)
    : Promise.resolve(undefined);

  const marinaPermissionsPromise = enabledWidgets.has("expiring_permissions")
    ? getMarinaPermissions(yachtId, user)
    : Promise.resolve(undefined);

  const maintenanceLogsPromise = enabledWidgets.has("upcoming_maintenance")
    ? getMaintenanceLogs(yachtId, user)
    : Promise.resolve(undefined);

  const roleTasksPromise = enabledWidgets.has("role_tasks_alert")
    ? getRoleTasks(yachtId, user)
    : Promise.resolve(undefined);

  const calendarEventsPromise = enabledWidgets.has("calendar_events")
    ? getCalendarEvents(yachtId, user)
    : Promise.resolve(undefined);

  const [
    pendingExpenses,
    pendingExpensesCount,
    pendingExpensesByCurrency,
    recentExpenses,
    creditCardExpenses,
    creditCards,
    cashBalances,
    upcomingTrips,
    alcoholStocks,
    marinaPermissions,
    maintenanceLogs,
    roleAssignedTasks,
    calendarEvents,
  ] = await Promise.all([
    pendingExpensesPromise,
    pendingExpensesCountPromise,
    pendingExpensesByCurrencyPromise,
    recentExpensesPromise,
    creditCardExpensesPromise,
    creditCardsPromise,
    cashBalancesPromise,
    upcomingTripsPromise,
    alcoholStocksPromise,
    marinaPermissionsPromise,
    maintenanceLogsPromise,
    roleTasksPromise,
    calendarEventsPromise,
  ]);

  // Calculate total pending amount only if pending expenses are available
  const totalPendingAmount = pendingExpenses
    ? pendingExpenses.reduce(
        (sum: number, exp: { baseAmount: string | number | null; amount: string | number }) =>
          sum + Number(exp.baseAmount || exp.amount),
        0
      )
    : 0;

  // Client-side filtering for low stock (already fetched minimal data)
  const lowStockItems = alcoholStocks
    ? alcoholStocks.filter((stock: { lowStockThreshold: number | null; quantity: number }) => {
        if (stock.lowStockThreshold === null) return false;
        return stock.quantity <= stock.lowStockThreshold;
      })
    : [];

  return (
    <WidgetRenderer
      pendingExpenses={pendingExpenses}
      pendingExpensesCount={pendingExpensesCount}
      pendingExpensesByCurrency={pendingExpensesByCurrency}
      recentExpenses={recentExpenses}
      creditCardExpenses={creditCardExpenses}
      creditCards={creditCards}
      cashBalances={cashBalances}
      upcomingTrips={upcomingTrips}
      totalPendingAmount={totalPendingAmount}
      roleAssignedTasks={roleAssignedTasks}
      upcomingMaintenance={maintenanceLogs}
      expiringPermissions={marinaPermissions}
      lowStockItems={lowStockItems}
      calendarEvents={(calendarEvents || []).map(
        (event: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          startDate: Date | string;
          endDate: Date | string;
          color: string | null;
          trip: { id: string; name: string; code: string | null } | null;
        }) => ({
          ...event,
          startDate:
            event.startDate instanceof Date
              ? event.startDate.toISOString()
              : typeof event.startDate === "string"
                ? event.startDate
                : new Date(event.startDate).toISOString(),
          endDate:
            event.endDate instanceof Date
              ? event.endDate.toISOString()
              : typeof event.endDate === "string"
                ? event.endDate
                : new Date(event.endDate).toISOString(),
        })
      )}
      showCustomizerButton={false}
    />
  );
}

export async function OwnerCaptainDashboard({ user }: { user: DashboardUser }) {
  // STRICT TENANT ISOLATION: yachtId must be string (never null/undefined for regular users)
  const yachtId = user.yachtId;
  if (!yachtId && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error(
      "User must be assigned to a yacht to access dashboard. Please contact support."
    );
  }

  // Fetch minimal data first so the page can render quickly (widgets stream in).
  const widgets = await getUserWidgetSettings(user.id);
  const enabledWidgetIds = widgets.filter((w) => w.enabled).map((w) => w.id);
  const briefingStats = await getBriefingStats(user);

  return (
    <div className="space-y-6">
      {/* Compact Dashboard Header */}
      <DashboardHeader
        userRole={user.role}
        userName={user.name}
        stats={{
          pendingTasks: briefingStats.pendingTasksCount,
          urgentTasks: briefingStats.urgentTasksCount,
          expiringDocs: briefingStats.expiringDocsCount,
          lowStock: briefingStats.lowStockCount,
          unreadMessages: briefingStats.unreadMessagesCount,
        }}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <WidgetCustomizerButton />
        </div>
        <div className="flex flex-col gap-2">
          <QuickActions />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground px-4 md:px-0">
            Loading widgets…
          </div>
        }
      >
        <OwnerCaptainWidgets user={user} enabledWidgetIds={enabledWidgetIds} />
      </Suspense>
    </div>
  );
}


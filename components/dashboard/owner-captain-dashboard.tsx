import type { Session } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActions } from "./quick-actions";
import { WidgetCustomizerButton } from "./widgets/widget-customizer-button";
import { WidgetRenderer } from "./widgets/widget-renderer";
import { getUserWidgetSettings, isWidgetEnabled } from "@/lib/dashboard/widget-settings";
import { getUserFriendlyError } from "@/lib/api-error-handler";
import {
  getPendingExpenses,
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

type DashboardUser = NonNullable<Session["user"]>;

export async function OwnerCaptainDashboard({ user }: { user: DashboardUser }) {
  try {
    // STRICT TENANT ISOLATION: yachtId must be string (never null/undefined for regular users)
    const yachtId = user.yachtId;
    if (!yachtId && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      console.error("❌ [DASHBOARD] User missing yachtId:", {
        userId: user.id,
        email: user.email,
        role: user.role,
        yachtId: user.yachtId,
      });
      throw new Error("User must be assigned to a yacht to access dashboard. Please contact support.");
    }
    
    // Get user widget settings first to determine what data to fetch
    const widgets = await getUserWidgetSettings(user.id);
    
    // Fetch briefing stats (always fetch for morning briefing)
    const briefingStatsPromise = getBriefingStats(user);
    
    // Create a map of enabled widgets for quick lookup
    const enabledWidgets = new Set(
      widgets.filter(w => w.enabled).map(w => w.id)
    );

    // Conditionally create promises only for enabled widgets
    const pendingExpensesPromise = enabledWidgets.has("pending_expenses")
      ? getPendingExpenses(yachtId)
      : Promise.resolve(undefined);

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

    // Execute queries sequentially to avoid connection pool exhaustion
    // Supabase Session mode has very limited pool_size (typically 3-5)
    // Sequential execution ensures only one connection is used at a time
    let briefingStats, pendingExpenses, recentExpenses, creditCardExpenses, creditCards, cashBalances, upcomingTrips, alcoholStocks, marinaPermissions, maintenanceLogs, roleAssignedTasks, calendarEvents;

    try {
      // Execute queries one by one to avoid connection pool exhaustion
      briefingStats = await briefingStatsPromise;
      pendingExpenses = await pendingExpensesPromise;
      recentExpenses = await recentExpensesPromise;
      creditCardExpenses = await creditCardExpensesPromise;
      creditCards = await creditCardsPromise;
      cashBalances = await cashBalancesPromise;
      upcomingTrips = await upcomingTripsPromise;
      alcoholStocks = await alcoholStocksPromise;
      marinaPermissions = await marinaPermissionsPromise;
      maintenanceLogs = await maintenanceLogsPromise;
      roleAssignedTasks = await roleTasksPromise;
      calendarEvents = await calendarEventsPromise;
    } catch (error) {
      // Log error with full details - use console.error directly to ensure it's logged
      console.error("❌ [DASHBOARD] Error loading dashboard data:", error);
      
      if (error instanceof Error) {
        console.error("❌ [DASHBOARD] Error name:", error.name);
        console.error("❌ [DASHBOARD] Error message:", error.message);
        if (error.stack) {
          console.error("❌ [DASHBOARD] Error stack:", error.stack);
        }
        // Log error code if available (Prisma errors have codes)
        if ('code' in error) {
          console.error("❌ [DASHBOARD] Error code:", (error as any).code);
        }
      } else {
        console.error("❌ [DASHBOARD] Error (non-Error object):", String(error));
      }
      
      // Log user context separately to avoid serialization issues
      console.error("❌ [DASHBOARD] User ID:", user.id);
      console.error("❌ [DASHBOARD] Yacht ID:", user.yachtId);
      console.error("❌ [DASHBOARD] User Role:", user.role);
      // Return error state instead of crashing
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user.name || user.email}</p>
          </div>
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
              <CardDescription>
                Dashboard verileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

  // Calculate total pending amount only if pending expenses are available
  const totalPendingAmount = pendingExpenses
    ? pendingExpenses.reduce(
        (sum: number, exp: { baseAmount: string | number | null; amount: string | number }) => sum + Number(exp.baseAmount || exp.amount),
        0
      )
    : 0;

  // Client-side filtering for low stock (already fetched minimal data)
  // Return empty array if undefined to match WidgetRenderer's default prop type
  const lowStockItems = alcoholStocks
    ? alcoholStocks.filter((stock: { lowStockThreshold: number | null; quantity: number }) => {
        if (stock.lowStockThreshold === null) return false;
        return stock.quantity <= stock.lowStockThreshold;
      })
    : [];

  // Server-side filtering already done, no need to filter again
  const expiringPermissions = marinaPermissions;
  const upcomingMaintenance = maintenanceLogs;

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

      <WidgetRenderer
        pendingExpenses={pendingExpenses}
        recentExpenses={recentExpenses}
        creditCardExpenses={creditCardExpenses}
        creditCards={creditCards}
        cashBalances={cashBalances}
        upcomingTrips={upcomingTrips}
        totalPendingAmount={totalPendingAmount}
        roleAssignedTasks={roleAssignedTasks}
        upcomingMaintenance={upcomingMaintenance}
        expiringPermissions={expiringPermissions}
        lowStockItems={lowStockItems}
        calendarEvents={(calendarEvents || []).map((event: {
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
          startDate: event.startDate instanceof Date ? event.startDate.toISOString() : (typeof event.startDate === 'string' ? event.startDate : new Date(event.startDate).toISOString()),
          endDate: event.endDate instanceof Date ? event.endDate.toISOString() : (typeof event.endDate === 'string' ? event.endDate : new Date(event.endDate).toISOString()),
        }))}
        showCustomizerButton={false}
      />
    </div>
  );
  } catch (error) {
    console.error("❌ [DASHBOARD] Error in OwnerCaptainDashboard:", error);
    console.error("❌ [DASHBOARD] Error details:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id,
      yachtId: user.yachtId,
      role: user.role,
    });
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name || user.email}</p>
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>
              Dashboard yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
}


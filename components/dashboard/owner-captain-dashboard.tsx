import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseStatus, TaskStatus } from "@prisma/client";
// Removed unused date-fns imports - filtering now done server-side
import { hasPermission } from "@/lib/permissions";
import { QuickActions } from "./quick-actions";
import { WidgetCustomizerButton } from "./widgets/widget-customizer-button";
import { WidgetRenderer } from "./widgets/widget-renderer";
import { unstable_cache } from "next/cache";

type DashboardUser = NonNullable<Session["user"]>;

// Cache key helper for yacht-scoped data
const getCacheKey = (key: string, yachtId: string | null) => 
  `dashboard-${key}-${yachtId || 'none'}`;

export async function OwnerCaptainDashboard({ user }: { user: DashboardUser }) {
  try {
    // STRICT TENANT ISOLATION: yachtId must be string (never null/undefined for regular users)
    const yachtId = user.yachtId;
    if (!yachtId && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      throw new Error("User must be assigned to a yacht to access dashboard");
    }
    
    // Cache pending expenses query (revalidates every 30 seconds, skip if yachtId is null)
    const pendingExpensesPromise = yachtId
      ? unstable_cache(
          async () => db.expense.findMany({
            where: {
              yachtId: yachtId,
              status: ExpenseStatus.SUBMITTED,
              deletedAt: null,
            },
            select: {
              id: true,
              description: true,
              baseAmount: true,
              amount: true,
              currency: true,
              date: true,
              createdAt: true,
              createdBy: {
                select: { name: true, email: true },
              },
              category: {
                select: { name: true },
              },
              trip: {
                select: { name: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          [getCacheKey("pending-expenses", yachtId)],
          { revalidate: 30, tags: [`expenses-${yachtId}`] }
        )()
      : Promise.resolve([]);

    // Cache recent expenses query (skip if yachtId is null)
    const recentExpensesPromise = yachtId
      ? unstable_cache(
          async () => db.expense.findMany({
            where: {
              yachtId: yachtId,
              deletedAt: null,
            },
            select: {
              id: true,
              description: true,
              baseAmount: true,
              amount: true,
              currency: true,
              date: true,
              createdAt: true,
              createdBy: {
                select: { name: true, email: true },
              },
              category: {
                select: { name: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          [getCacheKey("recent-expenses", yachtId)],
          { revalidate: 30, tags: [`expenses-${yachtId}`] }
        )()
      : Promise.resolve([]);

    // Cache upcoming trips query (skip if yachtId is null)
    const upcomingTripsPromise = yachtId
      ? unstable_cache(
          async () => db.trip.findMany({
            where: {
              yachtId: yachtId,
              startDate: {
                gte: new Date(),
              },
            },
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              status: true,
            },
            orderBy: { startDate: "asc" },
            take: 5,
          }),
          [getCacheKey("upcoming-trips", yachtId)],
          { revalidate: 60, tags: [`trips-${yachtId}`] }
        )()
      : Promise.resolve([]);

    // Cache alcohol stocks query (if permission granted and yachtId exists)
    const alcoholStocksPromise = hasPermission(user, "inventory.alcohol.view", user.permissions) && yachtId
      ? unstable_cache(
          async () => db.alcoholStock.findMany({
            where: {
              yachtId: yachtId,
            },
            select: {
              id: true,
              name: true,
              quantity: true,
              lowStockThreshold: true,
            },
          }),
          [getCacheKey("alcohol-stocks", yachtId)],
          { revalidate: 60, tags: [`inventory-${yachtId}`] }
        )()
      : Promise.resolve([]);

    // Cache marina permissions query (if permission granted and yachtId exists)
    const marinaPermissionsPromise = hasPermission(user, "documents.marina.view", user.permissions) && yachtId
      ? unstable_cache(
          async () => db.marinaPermissionDocument.findMany({
            where: {
              yachtId: yachtId,
              expiryDate: {
                not: null,
              },
              deletedAt: null,
              // Server-side filtering: only get permissions expiring within 30 days or already expired
              OR: [
                {
                  expiryDate: {
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Within 30 days
                  },
                },
                {
                  expiryDate: {
                    lt: new Date(), // Already expired
                  },
                },
              ],
            },
            select: {
              id: true,
              title: true,
              expiryDate: true,
            },
            take: 50, // Limit to prevent huge payloads
          }),
          [getCacheKey("marina-permissions", yachtId)],
          { revalidate: 60, tags: [`documents-${yachtId}`] }
        )()
      : Promise.resolve([]);

    // Cache maintenance logs query (if permission granted and yachtId exists)
    const maintenanceLogsPromise = hasPermission(user, "maintenance.view", user.permissions) && yachtId
      ? unstable_cache(
          async () => db.maintenanceLog.findMany({
            where: {
              yachtId: yachtId,
              nextDueDate: {
                not: null,
                // Server-side filtering: only get maintenance due within 30 days
                gte: new Date(),
                lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Within 30 days
              },
            },
            select: {
              id: true,
              title: true,
              nextDueDate: true,
              component: true,
            },
            take: 50, // Limit to prevent huge payloads
          }),
          [getCacheKey("maintenance-logs", yachtId)],
          { revalidate: 60, tags: [`maintenance-${yachtId}`] }
        )()
      : Promise.resolve([]);

    // Cache role tasks query (if permission granted and yachtId exists)
    const roleTasksPromise = hasPermission(user, "tasks.view", user.permissions) && yachtId
      ? unstable_cache(
          async () => db.task.findMany({
            where: {
              yachtId: yachtId,
              assigneeRole: user.role,
              status: {
                not: TaskStatus.DONE,
              },
            },
            select: {
              id: true,
              title: true,
              dueDate: true,
              status: true,
              trip: {
                select: { name: true },
              },
            },
            orderBy: { dueDate: "asc" },
            take: 100, // Limit to prevent huge payloads
          }),
          [getCacheKey("role-tasks", yachtId), user.role],
          { revalidate: 30, tags: [`tasks-${yachtId}`] }
        )()
      : Promise.resolve([]);

  let pendingExpenses, recentExpenses, upcomingTrips, alcoholStocks, marinaPermissions, maintenanceLogs, roleAssignedTasks;

  try {
    [
      pendingExpenses,
      recentExpenses,
      upcomingTrips,
      alcoholStocks,
      marinaPermissions,
      maintenanceLogs,
      roleAssignedTasks,
    ] = await Promise.all([
      pendingExpensesPromise,
      recentExpensesPromise,
      upcomingTripsPromise,
      alcoholStocksPromise,
      marinaPermissionsPromise,
      maintenanceLogsPromise,
      roleTasksPromise,
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
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
              We encountered an error while loading your dashboard data. Please refresh the page to try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalPendingAmount = pendingExpenses.reduce(
    (sum: number, exp: { baseAmount: string | number | null; amount: string | number }) => sum + Number(exp.baseAmount || exp.amount),
    0
  );

  // Client-side filtering for low stock (already fetched minimal data)
  const lowStockItems = alcoholStocks.filter((stock: { lowStockThreshold: number | null; quantity: number }) => {
    if (stock.lowStockThreshold === null) return false;
    return stock.quantity <= stock.lowStockThreshold;
  });

  // Server-side filtering already done, no need to filter again
  const expiringPermissions = marinaPermissions;
  const upcomingMaintenance = maintenanceLogs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <WidgetCustomizerButton />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">
            Welcome aboard, <span className="font-bold">{user.name || user.email}</span>
          </p>
          <QuickActions />
        </div>
      </div>

      <WidgetRenderer
        pendingExpenses={pendingExpenses}
        recentExpenses={recentExpenses}
        upcomingTrips={upcomingTrips}
        totalPendingAmount={totalPendingAmount}
        roleAssignedTasks={roleAssignedTasks}
        upcomingMaintenance={upcomingMaintenance}
        expiringPermissions={expiringPermissions}
        lowStockItems={lowStockItems}
        showCustomizerButton={false}
      />
    </div>
  );
  } catch (error) {
    console.error("Error in OwnerCaptainDashboard:", error);
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
              We encountered an error while loading your dashboard. Please refresh the page to try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
}


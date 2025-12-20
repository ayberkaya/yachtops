import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatus } from "@prisma/client";
// Removed unused date-fns imports - filtering now done server-side
import { hasPermission } from "@/lib/permissions";
import { QuickActions } from "./quick-actions";
import { WidgetRenderer } from "./widgets/widget-renderer";
import { WidgetCustomizerButton } from "./widgets/widget-customizer-button";
import { unstable_cache } from "next/cache";

type DashboardUser = NonNullable<Session["user"]>;

// Cache key helper for yacht-scoped data
const getCacheKey = (key: string, yachtId: string | null, userId?: string) => 
  `dashboard-${key}-${yachtId || 'none'}${userId ? `-${userId}` : ''}`;

export async function CrewDashboard({ user }: { user: DashboardUser }) {
  try {
    // STRICT TENANT ISOLATION: yachtId must be string (never null/undefined for regular users)
    const yachtId = user.yachtId;
    if (!yachtId && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      throw new Error("User must be assigned to a yacht to access dashboard");
    }
    
    // Cache my tasks query (user-specific, revalidates every 30 seconds)
    const myTasksPromise = unstable_cache(
      async () => db.task.findMany({
        where: {
          assigneeId: user.id,
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
        take: 5,
      }),
      [getCacheKey("my-tasks", yachtId, user.id)],
      { revalidate: 30, tags: [`tasks-${yachtId}`, `user-tasks-${user.id}`] }
    )();

    // Cache role assigned tasks query (skip if yachtId is null for SUPER_ADMIN)
    const roleAssignedTasksPromise = yachtId
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
            take: 50, // Limit to prevent huge payloads
          }),
          [getCacheKey("role-tasks", yachtId), user.role],
          { revalidate: 30, tags: [`tasks-${yachtId}`] }
        )()
      : Promise.resolve([]);

    // Cache my expenses query (user-specific)
    const myExpensesPromise = unstable_cache(
      async () => db.expense.findMany({
        where: {
          createdByUserId: user.id,
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
          category: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      [getCacheKey("my-expenses", yachtId, user.id)],
      { revalidate: 30, tags: [`expenses-${yachtId}`, `user-expenses-${user.id}`] }
    )();

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

  let myTasks, roleAssignedTasks, myExpenses, alcoholStocks, marinaPermissions, maintenanceLogs;

  try {
    [
      myTasks,
      roleAssignedTasks,
      myExpenses,
      alcoholStocks,
      marinaPermissions,
      maintenanceLogs,
    ] = await Promise.all([
      myTasksPromise,
      roleAssignedTasksPromise,
      myExpensesPromise,
      alcoholStocksPromise,
      marinaPermissionsPromise,
      maintenanceLogsPromise,
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    // Return error state instead of crashing
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
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

  const pendingTasksCount = myTasks.filter((t: { status: TaskStatus }) => t.status === TaskStatus.TODO).length;

  // Client-side filtering for low stock (already fetched minimal data)
  const lowStockItems = alcoholStocks.filter((stock: { lowStockThreshold: number | null; quantity: number }) => {
    if (stock.lowStockThreshold === null) return false;
    return stock.quantity <= stock.lowStockThreshold;
  });

  // Server-side filtering already done, no need to filter again
  const expiringPermissions = marinaPermissions;
  const upcomingMaintenance = maintenanceLogs;

  // Convert myExpenses to recentExpenses format for widget
  const recentExpenses = myExpenses.map((exp: any) => ({
    ...exp,
    createdBy: { name: user.name, email: user.email },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">My Dashboard</h1>
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
        recentExpenses={recentExpenses}
        myTasks={myTasks}
        upcomingTrips={[]}
        upcomingMaintenance={upcomingMaintenance}
        showCustomizerButton={false}
      />
    </div>
  );
  } catch (error) {
    console.error("Error in CrewDashboard:", error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
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


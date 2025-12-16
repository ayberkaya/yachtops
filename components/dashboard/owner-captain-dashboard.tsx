import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseStatus, TaskStatus } from "@prisma/client";
// Removed unused date-fns imports - filtering now done server-side
import { hasPermission } from "@/lib/permissions";
import { QuickActions } from "./quick-actions";
import { WidgetCustomizerButton } from "./widgets/widget-customizer-button";
import { WidgetRenderer } from "./widgets/widget-renderer";

type DashboardUser = NonNullable<Session["user"]>;

export async function OwnerCaptainDashboard({ user }: { user: DashboardUser }) {
  try {
    const pendingExpensesPromise = db.expense.findMany({
    where: {
      yachtId: user.yachtId || undefined,
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
  });

  const recentExpensesPromise = db.expense.findMany({
    where: {
      yachtId: user.yachtId || undefined,
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
  });

  const upcomingTripsPromise = db.trip.findMany({
    where: {
      yachtId: user.yachtId || undefined,
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
  });

  const alcoholStocksPromise = hasPermission(user, "inventory.alcohol.view", user.permissions)
    ? db.alcoholStock.findMany({
        where: {
          yachtId: user.yachtId || undefined,
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          lowStockThreshold: true,
        },
      })
    : Promise.resolve([]);

  const marinaPermissionsPromise = hasPermission(user, "documents.marina.view", user.permissions)
    ? db.marinaPermissionDocument.findMany({
        where: {
          yachtId: user.yachtId || undefined,
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
      })
    : Promise.resolve([]);

  const maintenanceLogsPromise = hasPermission(user, "maintenance.view", user.permissions)
    ? db.maintenanceLog.findMany({
        where: {
          yachtId: user.yachtId || undefined,
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
      })
    : Promise.resolve([]);

  const roleTasksPromise = hasPermission(user, "tasks.view", user.permissions)
    ? db.task.findMany({
        where: {
          yachtId: user.yachtId || undefined,
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
      })
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


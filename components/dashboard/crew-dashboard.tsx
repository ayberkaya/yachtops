import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatus } from "@prisma/client";
// Removed unused date-fns imports - filtering now done server-side
import { hasPermission } from "@/lib/permissions";
import { QuickActions } from "./quick-actions";
import { WidgetRenderer } from "./widgets/widget-renderer";
import { WidgetCustomizerButton } from "./widgets/widget-customizer-button";

type DashboardUser = NonNullable<Session["user"]>;

export async function CrewDashboard({ user }: { user: DashboardUser }) {
  try {
    const myTasksPromise = db.task.findMany({
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
  });

  const roleAssignedTasksPromise = db.task.findMany({
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
    take: 50, // Limit to prevent huge payloads
  });

  const myExpensesPromise = db.expense.findMany({
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


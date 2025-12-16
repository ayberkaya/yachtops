import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatus } from "@prisma/client";
import { differenceInDays, isPast, isToday } from "date-fns";
import { hasPermission } from "@/lib/permissions";
import { QuickActions } from "./quick-actions";
import { WidgetRenderer } from "./widgets/widget-renderer";

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
    include: {
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
    include: {
      trip: {
        select: { name: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const myExpensesPromise = db.expense.findMany({
    where: {
      createdByUserId: user.id,
      deletedAt: null,
    },
    include: {
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
        },
      })
    : Promise.resolve([]);

  const maintenanceLogsPromise = hasPermission(user, "maintenance.view", user.permissions)
    ? db.maintenanceLog.findMany({
        where: {
          yachtId: user.yachtId || undefined,
          nextDueDate: {
            not: null,
          },
        },
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

  const lowStockItems = alcoholStocks.filter((stock: { lowStockThreshold: number | null; quantity: number }) => {
    if (stock.lowStockThreshold === null) return false;
    return stock.quantity <= stock.lowStockThreshold;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiringPermissions = marinaPermissions.filter((perm: { expiryDate: string | Date | null }) => {
    if (!perm.expiryDate) return false;
    const expiry = new Date(perm.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    // Show if expired or expiring within 30 days
    if (isPast(expiry) && !isToday(expiry)) return true;
    const daysUntilExpiry = differenceInDays(expiry, today);
    return daysUntilExpiry <= 30;
  });

  const upcomingMaintenance = maintenanceLogs.filter(
    (maint: { nextDueDate: Date | string | null }): maint is (typeof maintenanceLogs)[number] & { nextDueDate: Date } => {
      if (!maint.nextDueDate) return false;
      const dueDate = new Date(maint.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Show if due within 30 days
      const daysUntilDue = differenceInDays(dueDate, today);
      return daysUntilDue <= 30 && daysUntilDue >= 0;
    }
  );

  // Convert myExpenses to recentExpenses format for widget
  const recentExpenses = myExpenses.map((exp: any) => ({
    ...exp,
    createdBy: { name: user.name, email: user.email },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome aboard, <span className="font-bold">{user.name || user.email}</span>
          </p>
        </div>
        <QuickActions />
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


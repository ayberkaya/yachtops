import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { ExpenseStatus, TaskStatus } from "@prisma/client";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { DollarSign, Calendar, AlertCircle, TrendingUp, Clock, AlertTriangle, Package, FileText, Wrench, Bell, Eye } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { MonthlyReportDownload } from "./monthly-report-download";
import { QuickActions } from "./quick-actions";

type DashboardUser = NonNullable<Session["user"]>;

export async function OwnerCaptainDashboard({ user }: { user: DashboardUser }) {
  try {
    const pendingExpensesPromise = db.expense.findMany({
    where: {
      yachtId: user.yachtId || undefined,
      status: ExpenseStatus.SUBMITTED,
      deletedAt: null,
    },
    include: {
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
    include: {
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
    orderBy: { startDate: "asc" },
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

  const roleTasksPromise = hasPermission(user, "tasks.view", user.permissions)
    ? db.task.findMany({
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name || user.email}
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Role-Assigned Tasks Alert - Dikkat çekici bildirim */}
      {roleAssignedTasks.length > 0 && (
        <Card className="border-red-500 bg-red-50/80 dark:bg-red-950/40 shadow-lg animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-red-600 dark:text-red-400 animate-bounce" />
                <CardTitle className="text-red-900 dark:text-red-100 text-lg font-bold">
                  New Tasks Assigned to {user.role}
                </CardTitle>
              </div>
              <Button asChild variant="outline" size="sm" className="border-red-300 hover:bg-red-100 dark:hover:bg-red-900">
                <Link href="/dashboard/tasks">View Tasks</Link>
              </Button>
            </div>
            <CardDescription className="text-red-700 dark:text-red-300 font-medium">
              {roleAssignedTasks.length} task{roleAssignedTasks.length > 1 ? "s" : ""} assigned to your role that need{roleAssignedTasks.length === 1 ? "s" : ""} attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roleAssignedTasks.slice(0, 5).map((task: any) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      isOverdue
                        ? "bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700"
                        : "bg-white/70 dark:bg-slate-800/70 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Bell className={`h-5 w-5 ${isOverdue ? "text-red-700 dark:text-red-300" : "text-red-600 dark:text-red-400"}`} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-red-900 dark:text-red-100">{task.title}</p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          {task.trip?.name || "General"} • {task.status.replace("_", " ")}
                          {task.dueDate && ` • Due: ${format(new Date(task.dueDate), "MMM d, yyyy")}`}
                        </p>
                      </div>
                    </div>
                    {isOverdue && (
                      <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-800 px-2 py-1 rounded">
                        OVERDUE
                      </span>
                    )}
                  </div>
                );
              })}
              {roleAssignedTasks.length > 5 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    +{roleAssignedTasks.length - 5} more task{roleAssignedTasks.length - 5 > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Maintenance Alert */}
      {upcomingMaintenance.length > 0 && (
        <Card className="border-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-orange-900 dark:text-orange-100">
                  Upcoming Maintenance
                </CardTitle>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/maintenance">View Maintenance</Link>
              </Button>
            </div>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              {upcomingMaintenance.length} maintenance item{upcomingMaintenance.length > 1 ? "s" : ""} due within 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingMaintenance.map((maint: { id: string; nextDueDate: Date; title: string; component: string | null }) => {
                const dueDate = new Date(maint.nextDueDate!);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                const daysUntilDue = differenceInDays(dueDate, today);

                return (
                  <div
                    key={maint.id}
                    className="flex items-center justify-between p-2 rounded-md bg-white/50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="font-medium text-sm">{maint.title}</span>
                      {maint.component && (
                        <span className="text-xs text-muted-foreground">({maint.component})</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                        Due in {daysUntilDue} day{daysUntilDue > 1 ? "s" : ""}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(dueDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}


      {/* Expiring Marina Permissions Alert */}
      {expiringPermissions.length > 0 && (
        <Card className="border-red-500 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <CardTitle className="text-red-900 dark:text-red-100">
                  Expiring Marina Permissions
                </CardTitle>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/documents/marina-permissions">View Documents</Link>
              </Button>
            </div>
            <CardDescription className="text-red-700 dark:text-red-300">
              {expiringPermissions.length} permission{expiringPermissions.length > 1 ? "s" : ""} expired or expiring soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringPermissions.map((perm: { id: string; expiryDate: string | Date | null; title: string | null }) => {
                const expiry = perm.expiryDate ? new Date(perm.expiryDate) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isExpired = expiry && isPast(expiry) && !isToday(expiry);
                const daysUntilExpiry = expiry ? differenceInDays(expiry, today) : null;
                
                return (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between p-2 rounded-md bg-white/50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-sm">{perm.title || "Marina Permission"}</span>
                    </div>
                    <div className="text-right">
                      {isExpired && daysUntilExpiry !== null && (
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                          Expired {Math.abs(daysUntilExpiry)} day{Math.abs(daysUntilExpiry) > 1 ? "s" : ""} ago
                        </span>
                      )}
                      {!isExpired && daysUntilExpiry !== null && (
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                          Expires in {daysUntilExpiry} day{daysUntilExpiry > 1 ? "s" : ""}
                        </span>
                      )}
                      {expiry && (
                        <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                          ({format(expiry, "MMM d, yyyy")})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingExpenses.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalPendingAmount.toLocaleString("en-US", {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTrips.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled trips</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Expenses</CardTitle>
                <CardDescription>Expenses awaiting your approval</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/expenses/pending">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending expenses</p>
            ) : (
              <div className="space-y-4">
                {pendingExpenses.map((expense: { id: string; description: string | null; category: { name: string }; createdBy: { name: string | null; email: string }; baseAmount: string | number | null; amount: string | number; currency: string; date: string | Date }) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category.name} • {expense.createdBy.name || expense.createdBy.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {Number(expense.baseAmount || expense.amount).toLocaleString("en-US", {
                          style: "currency",
                          currency: expense.currency,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Latest expense entries</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/expenses">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet</p>
            ) : (
              <div className="space-y-4">
                {recentExpenses.map((expense: { id: string; description: string | null; category: { name: string }; createdBy: { name: string | null; email: string }; baseAmount: string | number | null; amount: string | number; currency: string; date: string | Date }) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category.name} • {expense.createdBy.name || expense.createdBy.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {Number(expense.baseAmount || expense.amount).toLocaleString("en-US", {
                          style: "currency",
                          currency: expense.currency,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Report Download */}
      <MonthlyReportDownload />
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


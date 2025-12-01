import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import { format } from "date-fns";
import { AlertTriangle, Package } from "lucide-react";
import { hasPermission } from "@/lib/permissions";

export async function CrewDashboard() {
  const session = await getSession();
  if (!session?.user) return null;

  // Fetch my tasks
  const myTasks = await db.task.findMany({
    where: {
      assigneeId: session.user.id,
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

  // Fetch my expenses
  const myExpenses = await db.expense.findMany({
    where: {
      createdByUserId: session.user.id,
    },
    include: {
      category: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const pendingTasksCount = myTasks.filter((t) => t.status === TaskStatus.TODO).length;
  const inProgressTasksCount = myTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;

  // Fetch low stock alcohol items (if user has inventory permission)
  const lowStockItems: any[] = [];
  if (hasPermission(session.user, "inventory.alcohol.view", session.user.permissions)) {
    const allStocks = await db.alcoholStock.findMany({
      where: {
        yachtId: session.user.yachtId || undefined,
      },
    });
    
    lowStockItems.push(
      ...allStocks.filter((stock) => {
        if (stock.lowStockThreshold === null) return false;
        return stock.quantity <= stock.lowStockThreshold;
      })
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session.user.name || session.user.email}</p>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-orange-900 dark:text-orange-100">
                  Low Stock Alert
                </CardTitle>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/inventory/alcohol-stock">View Inventory</Link>
              </Button>
            </div>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              {lowStockItems.length} alcohol item{lowStockItems.length > 1 ? "s" : ""} below threshold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md bg-white/50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                      (Threshold: {item.lowStockThreshold} {item.unit})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingTasksCount} pending, {inProgressTasksCount} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myExpenses.length}</div>
            <p className="text-xs text-muted-foreground">Total submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/expenses/new">New Expense</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Tasks</CardTitle>
                <CardDescription>Tasks assigned to you</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/tasks">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned</p>
            ) : (
              <div className="space-y-4">
                {myTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.trip?.name || "General"} • {task.status.replace("_", " ")}
                      </p>
                    </div>
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.dueDate), "MMM d")}
                      </p>
                    )}
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
                <CardTitle>My Expenses</CardTitle>
                <CardDescription>Your expense submissions</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/expenses">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {myExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet</p>
            ) : (
              <div className="space-y-4">
                {myExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category.name} • {expense.status}
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
    </div>
  );
}


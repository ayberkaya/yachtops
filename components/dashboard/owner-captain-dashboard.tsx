import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { ExpenseStatus } from "@prisma/client";
import { format } from "date-fns";
import { DollarSign, Calendar, AlertCircle, TrendingUp, Clock, AlertTriangle, Package } from "lucide-react";
import { hasPermission } from "@/lib/permissions";

export async function OwnerCaptainDashboard() {
  const session = await getSession();
  if (!session?.user) return null;

  // Fetch pending expenses
  const pendingExpenses = await db.expense.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
      status: ExpenseStatus.SUBMITTED,
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

  // Fetch recent expenses
  const recentExpenses = await db.expense.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
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

  // Fetch upcoming trips
  const upcomingTrips = await db.trip.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
      startDate: {
        gte: new Date(),
      },
    },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  // Calculate totals
  const totalPendingAmount = pendingExpenses.reduce(
    (sum, exp) => sum + Number(exp.baseAmount || exp.amount),
    0
  );

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
        <h1 className="text-3xl font-bold">Dashboard</h1>
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
                {pendingExpenses.map((expense) => (
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
                {recentExpenses.map((expense) => (
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
    </div>
  );
}


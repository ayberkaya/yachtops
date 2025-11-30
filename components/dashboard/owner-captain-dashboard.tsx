import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExpenseStatus } from "@prisma/client";
import { format } from "date-fns";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session.user.name || session.user.email}</p>
      </div>

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


import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";

interface RecentExpensesWidgetProps {
  expenses: Array<{
    id: string;
    description: string | null;
    category: { name: string };
    createdBy: { name: string | null; email: string };
    baseAmount: string | number | null;
    amount: string | number;
    currency: string;
    date: string | Date;
  }>;
}

export const RecentExpensesWidget = memo(function RecentExpensesWidget({ expenses }: RecentExpensesWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest expense entries</CardDescription>
          </div>
          {expenses.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/expenses">View All Expenses</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">No expenses recorded yet</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/dashboard/expenses/new">Create First Expense</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
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
  );
});


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { ExpenseStatus } from "@prisma/client";

interface PendingExpensesWidgetProps {
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
  totalAmount: number;
}

export function PendingExpensesWidget({ expenses, totalAmount }: PendingExpensesWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Awaiting Approval</CardTitle>
            <CardDescription>Expenses that need your review</CardDescription>
          </div>
          {expenses.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/expenses/pending">Review All</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">No expenses awaiting approval</p>
            <p className="text-xs text-muted-foreground">All submitted expenses have been reviewed</p>
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
}


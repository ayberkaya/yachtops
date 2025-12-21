"use client";

import { memo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RecentExpenseDetailDrawer } from "./recent-expense-detail-drawer";

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
    status?: string;
  }>;
}

export const RecentExpensesWidgetEnhanced = memo(function RecentExpensesWidgetEnhanced({
  expenses,
}: RecentExpensesWidgetProps) {
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  const handleCardClick = () => {
    window.location.href = "/dashboard/expenses";
  };

  const handleExpenseClick = (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    setSelectedExpenseId(expenseId);
  };

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
          "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
        )}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="View all expenses"
      >
        <CardHeader>
          <div>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest expense entries</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">No expenses recorded yet</p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Link href="/dashboard/expenses/new">Create First Expense</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    "hover:bg-muted/50 cursor-pointer",
                    "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1"
                  )}
                  onClick={(e) => handleExpenseClick(e, expense.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleExpenseClick(e as any, expense.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View expense: ${expense.description || "Untitled"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{expense.description || "Untitled"}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {expense.category.name} • {expense.createdBy.name || expense.createdBy.email}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
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

      <RecentExpenseDetailDrawer
        expenseId={selectedExpenseId}
        open={!!selectedExpenseId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExpenseId(null);
          }
        }}
      />
    </>
  );
});


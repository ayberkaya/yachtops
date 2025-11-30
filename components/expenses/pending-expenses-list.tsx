"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ExpenseStatus } from "@prisma/client";
import { Check, X } from "lucide-react";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  baseAmount: number | null;
  status: ExpenseStatus;
  createdBy: { id: string; name: string | null; email: string };
  category: { id: string; name: string };
  trip: { id: string; name: string } | null;
  receipts: { id: string; fileUrl: string }[];
}

interface PendingExpensesListProps {
  expenses: Expense[];
}

export function PendingExpensesList({ expenses: initialExpenses }: PendingExpensesListProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ExpenseStatus.APPROVED }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to approve expense");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this expense?")) {
      return;
    }

    setProcessingId(id);
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ExpenseStatus.REJECTED }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to reject expense");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No pending expenses
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <Card key={expense.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{expense.description}</CardTitle>
                <CardDescription>
                  {expense.category.name} • {format(new Date(expense.date), "MMM d, yyyy")}
                </CardDescription>
              </div>
              <Badge variant="secondary">{expense.status.replace("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold">
                    {Number(expense.baseAmount || expense.amount).toLocaleString("en-US", {
                      style: "currency",
                      currency: expense.currency,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created By</p>
                  <p className="text-sm">{expense.createdBy.name || expense.createdBy.email}</p>
                </div>
                {expense.trip && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Trip</p>
                    <p className="text-sm">{expense.trip.name}</p>
                  </div>
                )}
                {expense.receipts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receipts</p>
                    <p className="text-sm">{expense.receipts.length} receipt(s)</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/dashboard/expenses/${expense.id}`}>View Details</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleApprove(expense.id)}
                  disabled={processingId === expense.id}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {processingId === expense.id ? "Processing..." : "Approve"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(expense.id)}
                  disabled={processingId === expense.id}
                >
                  <X className="mr-2 h-4 w-4" />
                  {processingId === expense.id ? "Processing..." : "Reject"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ExpenseStatus } from "@prisma/client";
import { apiClient } from "@/lib/api-client";
import { Paperclip } from "lucide-react";

interface ExpenseDetail {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string | Date;
  status: ExpenseStatus;
  category: { name: string };
  createdBy: { name: string | null; email: string };
  notes?: string | null;
  receipts?: Array<{ id: string; uploadedAt: string | Date }>;
}

interface RecentExpenseDetailDrawerProps {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecentExpenseDetailDrawer({
  expenseId,
  open,
  onOpenChange,
}: RecentExpenseDetailDrawerProps) {
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !expenseId) {
      setExpense(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchExpense() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.request<ExpenseDetail>(
          `/api/expenses/${expenseId}`,
          { useCache: true }
        );

        if (!cancelled) {
          setExpense(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load expense details");
          setLoading(false);
        }
      }
    }

    fetchExpense();

    return () => {
      cancelled = true;
    };
  }, [expenseId, open]);

  const getStatusBadge = (status: ExpenseStatus) => {
    const variants: Record<ExpenseStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [ExpenseStatus.DRAFT]: "outline",
      [ExpenseStatus.SUBMITTED]: "secondary",
      [ExpenseStatus.APPROVED]: "default",
      [ExpenseStatus.REJECTED]: "destructive",
    };

    return (
      <Badge variant={variants[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Expense Details</DialogTitle>
          <DialogDescription>View expense information</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error && (
          <div className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {expense && !loading && (
          <div className="space-y-4 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{expense.description}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {expense.category.name}
                </p>
              </div>
              {getStatusBadge(expense.status)}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold mt-1">
                  {expense.amount.toLocaleString("en-US", {
                    style: "currency",
                    currency: expense.currency,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-lg font-semibold mt-1">
                  {format(new Date(expense.date), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Created By</p>
              <p className="text-sm">{expense.createdBy.name || expense.createdBy.email}</p>
            </div>

            {expense.receipts && expense.receipts.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Receipts ({expense.receipts.length})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {expense.receipts.length} receipt{expense.receipts.length !== 1 ? "s" : ""} attached
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    View full details to access receipts
                  </p>
                </div>
              </>
            )}

            {expense.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


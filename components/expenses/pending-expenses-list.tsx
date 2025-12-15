"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (id: string) => {
    if (!id || id === "undefined" || id === "null") {
      alert("Missing expense id");
      return;
    }
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

      // Optimistically remove the approved expense for instant feedback
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      
      // Track expense approval
      const { trackAction } = await import("@/lib/usage-tracking");
      trackAction("expense.approve", { expenseId: id });
      
      router.refresh();
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingExpenseId(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingExpenseId) return;

    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    if (!rejectingExpenseId || rejectingExpenseId === "undefined" || rejectingExpenseId === "null") {
      alert("Missing expense id");
      return;
    }

    setProcessingId(rejectingExpenseId);
    setRejectDialogOpen(false);
    
    try {
      const response = await fetch(`/api/expenses/${rejectingExpenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: ExpenseStatus.REJECTED,
          rejectReason: rejectReason.trim(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to reject expense");
        return;
      }

      // Optimistically remove the rejected expense for instant feedback
      setExpenses((prev) => prev.filter((exp) => exp.id !== rejectingExpenseId));
      
      // Track expense rejection
      const { trackAction } = await import("@/lib/usage-tracking");
      trackAction("expense.reject", { expenseId: rejectingExpenseId });
      
      router.refresh();
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
      setRejectingExpenseId(null);
      setRejectReason("");
    }
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/20">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-sm text-muted-foreground">
                There are no expenses awaiting your approval. All submitted expenses have been reviewed.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/dashboard/expenses">View All Expenses</Link>
            </Button>
          </div>
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
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApprove(expense.id)}
                  disabled={processingId === expense.id}
                  className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                >
                  <Check className="mr-2 h-4 w-4 text-green-700" />
                  {processingId === expense.id ? "Processing..." : "Approve"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRejectClick(expense.id)}
                  disabled={processingId === expense.id}
                  className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                >
                  <X className="mr-2 h-4 w-4 text-red-700" />
                  {processingId === expense.id ? "Processing..." : "Reject"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense. This will be added to the expense notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason("");
                setRejectingExpenseId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || processingId !== null}
            >
              Reject Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


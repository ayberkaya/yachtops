"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ExpenseStatus, PaidBy } from "@prisma/client";
import { CheckCircle2, Check, Eye, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  baseAmount: number | null;
  status: ExpenseStatus;
  isReimbursable: boolean;
  isReimbursed: boolean;
  reimbursedAt: string | null;
  paidBy: PaidBy;
  notes?: string | null;
  createdBy: { id: string; name: string | null; email: string };
  category: { id: string; name: string };
  trip: { id: string; name: string } | null;
}

interface ReimbursableExpensesListProps {
  expenses: Expense[];
}

export function ReimbursableExpensesList({ expenses: initialExpenses }: ReimbursableExpensesListProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleReimbursed = async (id: string, currentStatus: boolean) => {
    setProcessingId(id);
    const newStatus = !currentStatus;
    const requestBody = { 
      isReimbursed: newStatus,
      reimbursedAt: newStatus ? new Date().toISOString() : null,
    };
    
    console.log("Updating reimbursement status:", { id, currentStatus, newStatus, requestBody });
    
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      console.log("Response status:", response.status, response.statusText);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `Failed to update reimbursement status (${response.status} ${response.statusText})`;
        try {
          // Clone response to read it without consuming the stream
          const responseClone = response.clone();
          const contentType = responseClone.headers.get("content-type");
          const responseText = await responseClone.text();
          console.error("Error response text:", responseText);
          console.error("Error response length:", responseText.length);
          
          if (responseText && responseText.trim() !== '') {
            if (contentType && contentType.includes("application/json")) {
              try {
                const result = JSON.parse(responseText);
                console.error("API Error (parsed):", result);
                console.error("API Error keys:", Object.keys(result));
                errorMessage = result.error || result.details || JSON.stringify(result) || errorMessage;
              } catch (jsonError) {
                console.error("Failed to parse JSON error:", jsonError);
                errorMessage = responseText || errorMessage;
              }
            } else {
              errorMessage = responseText || errorMessage;
            }
          } else {
            console.error("Empty response body");
            errorMessage = `Server returned empty response (${response.status})`;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        alert(errorMessage);
        return;
      }

      const updatedExpense = await response.json();
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.id === id
            ? {
                ...exp,
                isReimbursed: updatedExpense.isReimbursed,
                reimbursedAt: updatedExpense.reimbursedAt 
                  ? (typeof updatedExpense.reimbursedAt === 'string' 
                      ? updatedExpense.reimbursedAt 
                      : new Date(updatedExpense.reimbursedAt).toISOString())
                  : null,
              }
            : exp
        )
      );
    } catch (error) {
      console.error("Error updating reimbursement status:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred. Please try again.";
      alert(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (filterStatus === "paid") return expense.isReimbursed;
    if (filterStatus === "unpaid") return !expense.isReimbursed;
    return true;
  });

  const getCrewPersonalLabel = (notes?: string | null) => {
    if (!notes) return null;
    const line = notes
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.toLowerCase().startsWith("crew personal:"));
    return line ? line.slice("crew personal:".length).trim() : null;
  };

  const paidCount = expenses.filter((e) => e.isReimbursed).length;
  const unpaidCount = expenses.filter((e) => !e.isReimbursed).length;

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No reimbursable expenses found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "all" | "paid" | "unpaid")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({expenses.length})</SelectItem>
              <SelectItem value="unpaid">Unpaid ({unpaidCount})</SelectItem>
              <SelectItem value="paid">Paid ({paidCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No expenses match the selected filter
          </CardContent>
        </Card>
      ) : (
        filteredExpenses.map((expense) => {
          const crewPersonalLabel =
            expense.paidBy === PaidBy.CREW_PERSONAL
              ? getCrewPersonalLabel(expense.notes)
              : null;
          const isExpanded = expandedIds.has(expense.id);
          return (
          <Card
            key={expense.id}
            className={
              expense.isReimbursed
                ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                : undefined
            }
          >
            <CardHeader
              className="cursor-pointer"
              onClick={() =>
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(expense.id)) {
                    next.delete(expense.id);
                  } else {
                    next.add(expense.id);
                  }
                  return next;
                })
              }
            >
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{expense.description}</CardTitle>
                  <CardDescription>
                    {expense.category.name} • {format(new Date(expense.date), "MMM d, yyyy")}
                    {crewPersonalLabel && (
                      <span className="ml-2 text-foreground font-medium">
                        • Reimburse to: {crewPersonalLabel}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={expense.isReimbursed ? "default" : "secondary"}
                    className={expense.isReimbursed ? "bg-green-600 text-white" : ""}
                  >
                    {expense.isReimbursed ? "Reimbursed" : "Unpaid"}
                  </Badge>
                  {!expense.isReimbursed && (
                    <Badge variant="outline">{expense.status.replace("_", " ")}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
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
                  {expense.isReimbursed && expense.reimbursedAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reimbursed At</p>
                      <p className="text-sm">
                        {format(new Date(expense.reimbursedAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant={expense.isReimbursed ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleReimbursed(expense.id, expense.isReimbursed)}
                    disabled={processingId === expense.id}
                  >
                    {processingId === expense.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : expense.isReimbursed ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Reimbursed
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Mark as Reimbursed
                      </>
                    )}
                  </Button>
                  {crewPersonalLabel && (
                    <div className="text-xs text-muted-foreground">
                      Reimburse to: <span className="font-medium text-foreground">{crewPersonalLabel}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/dashboard/expenses/${expense.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
            )}
          </Card>
          );
        })
      )}
    </div>
  );
}


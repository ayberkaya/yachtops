"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ExpenseStatus, PaymentMethod, PaidBy } from "@prisma/client";
import { ArrowLeft, Check, X } from "lucide-react";

interface ExpenseDetailProps {
  expense: any;
  canApprove: boolean;
  canEdit: boolean;
}

export function ExpenseDetail({ expense, canApprove, canEdit }: ExpenseDetailProps) {
  const router = useRouter();

  // Derive extra display info from notes for UI-only fields (crew personal, card owner)
  let crewPersonalLabel: string | null = null;
  let cardOwnerLabel: string | null = null;

  if (typeof expense.notes === "string" && expense.notes.length > 0) {
    const noteLines = expense.notes.split("\n").map((l: string) => l.trim());
    const crewLine = noteLines.find((l) =>
      l.toLowerCase().startsWith("crew personal:")
    );
    if (crewLine) {
      crewPersonalLabel = crewLine.slice("crew personal:".length).trim();
    }

    const cardLine = noteLines.find((l) =>
      l.toLowerCase().startsWith("card owner:")
    );
    if (cardLine) {
      cardOwnerLabel = cardLine.slice("card owner:".length).trim();
    }
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/expenses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Expense Details</h1>
            <p className="text-muted-foreground">{expense.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(expense.status)}
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/expenses/${expense.id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p>{format(new Date(expense.date), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p>{expense.category.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p>{expense.description}</p>
            </div>
            {expense.trip && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trip</p>
                <p>{expense.trip.name} {expense.trip.code && `(${expense.trip.code})`}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">
                {Number(expense.baseAmount || expense.amount).toLocaleString("en-US", {
                  style: "currency",
                  currency: expense.currency,
                })}
              </p>
            </div>
            {expense.currency !== "EUR" && expense.baseAmount && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Base Amount (EUR)</p>
                <p>{Number(expense.baseAmount).toLocaleString("en-US", {
                  style: "currency",
                  currency: "EUR",
                })}</p>
              </div>
            )}
            {expense.vatAmount && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">VAT Amount</p>
                <p>{Number(expense.vatAmount).toLocaleString("en-US", {
                  style: "currency",
                  currency: expense.currency,
                })}</p>
              </div>
            )}
            {expense.totalAmountWithVat && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total with VAT</p>
                <p className="text-lg font-semibold">{Number(expense.totalAmountWithVat).toLocaleString("en-US", {
                  style: "currency",
                  currency: expense.currency,
                })}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
              <p>{expense.paymentMethod.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid By</p>
              <p>{expense.paidBy.replace("_", " ")}</p>
            </div>
            {expense.paidBy === PaidBy.CREW_PERSONAL && crewPersonalLabel && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Crew Personal
                </p>
                <p>{crewPersonalLabel}</p>
              </div>
            )}
            {expense.paymentMethod === PaymentMethod.CARD && cardOwnerLabel && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Card Owner
                </p>
                <p>{cardOwnerLabel}</p>
              </div>
            )}
            {expense.vendorName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendor</p>
                <p>{expense.vendorName}</p>
              </div>
            )}
            {expense.invoiceNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                <p>{expense.invoiceNumber}</p>
              </div>
            )}
            {expense.isReimbursable && (
              <div>
                <Badge variant="outline">Reimbursable</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              {getStatusBadge(expense.status)}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created By</p>
              <p>{expense.createdBy.name || expense.createdBy.email}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(expense.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            {expense.approvedBy && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved By</p>
                <p>{expense.approvedBy.name || expense.approvedBy.email}</p>
                {expense.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(expense.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {expense.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{expense.notes}</p>
          </CardContent>
        </Card>
      )}

      {expense.receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
            <CardDescription>{expense.receipts.length} receipt(s) attached</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {expense.receipts.map((receipt: any) => (
                <div key={receipt.id} className="border rounded-lg p-2">
                  <a
                    href={receipt.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Receipt
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(receipt.uploadedAt), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canApprove && expense.status === "SUBMITTED" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4 justify-end">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirm("Are you sure you want to reject this expense?")) return;
                  try {
                    const response = await fetch(`/api/expenses/${expense.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: ExpenseStatus.REJECTED }),
                    });
                    if (response.ok) {
                      router.refresh();
                    } else {
                      const result = await response.json();
                      alert(result.error || "Failed to reject expense");
                    }
                  } catch (error) {
                    alert("An error occurred. Please try again.");
                  }
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/expenses/${expense.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: ExpenseStatus.APPROVED }),
                    });
                    if (response.ok) {
                      router.refresh();
                    } else {
                      const result = await response.json();
                      alert(result.error || "Failed to approve expense");
                    }
                  } catch (error) {
                    alert("An error occurred. Please try again.");
                  }
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


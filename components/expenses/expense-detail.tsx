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
import { ExpenseStatus, PaymentMethod, PaidBy } from "@prisma/client";
import { ArrowLeft, Check, X, Paperclip, Download, Eye, Trash2 } from "lucide-react";

interface ExpenseDetailProps {
  expense: any;
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Receipt {
  id: string;
  fileUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  uploadedAt: string;
}

export function ExpenseDetail({ expense, canApprove, canEdit, canDelete }: ExpenseDetailProps) {
  const router = useRouter();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Derive extra display info from notes for UI-only fields (crew personal)
  let crewPersonalLabel: string | null = null;

  if (typeof expense.notes === "string" && expense.notes.length > 0) {
    const noteLines = expense.notes.split("\n").map((l: string) => l.trim());
    const crewLine = noteLines.find((l: string) =>
      l.toLowerCase().startsWith("crew personal:")
    );
    if (crewLine) {
      crewPersonalLabel = crewLine.slice("crew personal:".length).trim();
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
          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isProcessing}
              className="[&_svg]:!stroke-gray-900 [&_svg]:!fill-none"
            >
              <Trash2 className="mr-2 h-4 w-4 stroke-gray-900 fill-none" strokeWidth={2} />
              Delete
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
                {Number(expense.amount).toLocaleString("en-US", {
                  style: "currency",
                  currency: expense.currency,
                })}
              </p>
            </div>
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
            {expense.paymentMethod === PaymentMethod.CARD && expense.creditCard && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Credit Card
                </p>
                <p>{expense.creditCard.ownerName} •••• {expense.creditCard.lastFourDigits}</p>
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
            <div className="space-y-2">
              {expense.receipts.map((receipt: Receipt) => {
                const receiptUrl = `/api/expenses/receipts/${receipt.id}`;
                
                return (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setPreviewReceipt(receipt);
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            Receipt
                          </span>
                          <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(receipt.uploadedAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement("a");
                          link.href = receiptUrl;
                          link.download = `receipt-${receipt.id}.jpg`;
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                onClick={() => {
                  setRejectReason("");
                  setRejectDialogOpen(true);
                }}
                disabled={isProcessing}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={async () => {
                    if (!expense.id || expense.id === "undefined" || expense.id === "null") {
                      alert("Missing expense id");
                      return;
                    }
                  setIsProcessing(true);
                  try {
                    const response = await fetch(`/api/expenses/${expense.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: ExpenseStatus.APPROVED }),
                    });
                    if (response.ok) {
                      // Refresh immediately to show updated data
                      router.refresh();
                    } else {
                      const result = await response.json();
                      alert(result.error || "Failed to approve expense");
                    }
                  } catch (error) {
                    alert("An error occurred. Please try again.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!rejectReason.trim()) {
                  alert("Please provide a reason for rejection");
                  return;
                }

                setIsProcessing(true);
                setRejectDialogOpen(false);
                
                try {
                  const response = await fetch(`/api/expenses/${expense.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      status: ExpenseStatus.REJECTED,
                      rejectReason: rejectReason.trim(),
                    }),
                  });
                  if (response.ok) {
                    router.refresh();
                  } else {
                    const result = await response.json();
                    alert(result.error || "Failed to reject expense");
                  }
                } catch (error) {
                  alert("An error occurred. Please try again.");
                } finally {
                  setIsProcessing(false);
                  setRejectReason("");
                }
              }}
              disabled={!rejectReason.trim() || isProcessing}
            >
              Reject Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!previewReceipt} onOpenChange={(open) => !open && setPreviewReceipt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0" showCloseButton={false}>
          {previewReceipt && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="truncate">Receipt</DialogTitle>
                    <DialogDescription className="mt-1">
                      {format(new Date(previewReceipt.uploadedAt), "MMM d, yyyy")}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = `/api/expenses/receipts/${previewReceipt.id}`;
                        link.download = `receipt-${previewReceipt.id}.jpg`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewReceipt(null)}
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="px-6 pb-6 overflow-auto max-h-[calc(90vh-120px)]">
                <img
                  src={`/api/expenses/receipts/${previewReceipt.id}`}
                  alt="Receipt"
                  className="max-w-full h-auto rounded-lg"
                  onError={(e) => {
                    // If image fails to load, show error message
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.error-message')) {
                      target.style.display = "none";
                      const errorDiv = document.createElement("div");
                      errorDiv.className = "error-message text-center py-8 text-muted-foreground";
                      errorDiv.textContent = "Failed to load receipt preview";
                      parent.appendChild(errorDiv);
                    }
                  }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsProcessing(true);
                try {
                  const response = await fetch(`/api/expenses/${expense.id}`, {
                    method: "DELETE",
                  });
                  if (response.ok) {
                    router.push("/dashboard/expenses");
                  } else {
                    const result = await response.json();
                    // Show more detailed error message
                    const errorMessage = result.solution 
                      ? `${result.error}\n\n${result.solution}`
                      : result.error || "Failed to delete expense";
                    alert(errorMessage);
                    setIsProcessing(false);
                  }
                } catch (error) {
                  alert("An error occurred. Please try again.");
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


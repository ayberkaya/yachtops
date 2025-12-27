"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye, Download, X } from "lucide-react";
import Link from "next/link";

interface Receipt {
  id: string;
  uploadedAt: Date | string;
  expense: {
    id: string;
    date: Date | string;
    description: string;
    amount: number;
    currency: string;
    category: {
      id: string;
      name: string;
    } | null;
  };
}

interface ReceiptsViewProps {
  receipts: Receipt[];
}

export function ReceiptsView({ receipts }: ReceiptsViewProps) {
  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Financial Documents</CardTitle>
          <CardDescription>
            All receipt and invoice scans tied to approved expenses, organized by category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved receipts found yet.
            </p>
          ) : (
            <div className="space-y-0">
              <div className="border-b border-border">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-3">Category</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="col-span-3">
                      <p className="text-sm font-medium">
                        {receipt.expense.category?.name ?? "Uncategorized"}
                      </p>
                    </div>
                    <div className="col-span-4">
                      <p className="text-sm text-foreground line-clamp-2">
                        {receipt.expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded {format(
                          typeof receipt.uploadedAt === 'string' 
                            ? new Date(receipt.uploadedAt) 
                            : receipt.uploadedAt,
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">
                        {format(
                          typeof receipt.expense.date === 'string' 
                            ? new Date(receipt.expense.date) 
                            : receipt.expense.date,
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium">
                        {receipt.expense.amount.toLocaleString("en-US", {
                          style: "currency",
                          currency: receipt.expense.currency,
                        })}
                      </p>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setPreviewReceipt(receipt)}
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                        title="View receipt"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/dashboard/expenses/${receipt.expense.id}`}
                        className="text-muted-foreground hover:text-primary text-sm flex items-center"
                        title="View expense"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                      {previewReceipt.expense.category?.name ?? "Uncategorized"} •{" "}
                      {format(
                        typeof previewReceipt.expense.date === 'string' 
                          ? new Date(previewReceipt.expense.date) 
                          : previewReceipt.expense.date,
                        "MMM d, yyyy"
                      )} •{" "}
                      {previewReceipt.expense.amount.toLocaleString("en-US", {
                        style: "currency",
                        currency: previewReceipt.expense.currency,
                      })}
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
                <div className="rounded-lg overflow-hidden border bg-muted flex items-center justify-center min-h-[200px]">
                  <img
                    src={`/api/expenses/receipts/${previewReceipt.id}`}
                    alt="Receipt"
                    className="w-full h-auto max-w-full object-contain"
                    style={{ display: "block" }}
                    onError={(e) => {
                      console.error("Failed to load receipt image:", previewReceipt.id);
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="flex flex-col items-center justify-center p-8 text-center">
                            <p class="text-sm text-muted-foreground mb-2">Failed to load receipt image</p>
                            <a href="/api/expenses/receipts/${previewReceipt.id}" target="_blank" class="text-xs text-primary hover:underline">
                              Try opening in new tab
                            </a>
                          </div>
                        `;
                      }
                    }}
                    onLoad={() => {
                      console.log("Receipt image loaded successfully:", previewReceipt.id);
                    }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {previewReceipt.expense.description}
                  </p>
                  <div className="flex gap-4 pt-2">
                    <Link
                      href={`/dashboard/expenses/${previewReceipt.expense.id}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View expense details
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


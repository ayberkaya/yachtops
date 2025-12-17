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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receipts.map((receipt) => (
                <Card 
                  key={receipt.id} 
                  className="overflow-hidden"
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {receipt.expense.category?.name ?? "Uncategorized"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          typeof receipt.expense.date === 'string' 
                            ? new Date(receipt.expense.date) 
                            : receipt.expense.date,
                          "MMM d, yyyy"
                        )}{" "}
                        •{" "}
                        {receipt.expense.amount.toLocaleString("en-US", {
                          style: "currency",
                          currency: receipt.expense.currency,
                        })}
                      </p>
                      <p className="text-xs line-clamp-2">
                        {receipt.expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded{" "}
                        {format(
                          typeof receipt.uploadedAt === 'string' 
                            ? new Date(receipt.uploadedAt) 
                            : receipt.uploadedAt,
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <button
                        onClick={() => setPreviewReceipt(receipt)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View receipt
                      </button>
                      <Link
                        href={`/dashboard/expenses/${receipt.expense.id}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        View expense
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                      className="text-sm text-primary hover:underline"
                    >
                      View expense details →
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


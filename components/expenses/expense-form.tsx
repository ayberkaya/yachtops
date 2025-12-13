"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ExpenseCategory, Trip, PaymentMethod, PaidBy, ExpenseStatus } from "@prisma/client";
import { Textarea } from "@/components/ui/textarea";

// UI-only schema for the expense form. We intentionally drop VAT/base amount fields
// to simplify the UI. The API schema still supports them optionally, but we no longer
// collect or send them from the form.
const expenseSchema = z.object({
  tripId: z.string().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("EUR"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidBy: z.nativeEnum(PaidBy),
  vendorName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  isReimbursable: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(ExpenseStatus).default(ExpenseStatus.DRAFT),
  // UI-only field to select which crew member paid when PaidBy = CREW_PERSONAL
  crewPersonalId: z.string().optional().nullable(),
  // UI-only field to capture whose card was used when paymentMethod = CARD
  cardOwner: z.string().optional().nullable(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  categories: ExpenseCategory[];
  trips: Trip[];
  initialData?: any;
}

export function ExpenseForm({ categories, trips, initialData }: ExpenseFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ExpenseFormData | null>(null);
  const [crewUsers, setCrewUsers] = useState<
    { id: string; name: string | null; email: string; role?: string | null }[]
  >([]);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: initialData
      ? {
          tripId: initialData.tripId || null,
          date: initialData.date || new Date().toISOString().split("T")[0],
          categoryId: initialData.categoryId || "",
          description: initialData.description || "",
          amount: initialData.amount ?? undefined,
          currency: initialData.currency || "EUR",
          paymentMethod: initialData.paymentMethod || PaymentMethod.CASH,
          paidBy: initialData.paidBy || PaidBy.VESSEL,
          vendorName: initialData.vendorName || null,
          invoiceNumber: initialData.invoiceNumber || null,
          isReimbursable: initialData.isReimbursable ?? false,
          notes: initialData.notes || null,
          status: initialData.status || ExpenseStatus.SUBMITTED,
          crewPersonalId: initialData.crewPersonalId || null,
          cardOwner: initialData.cardOwner || null,
        }
      : {
          tripId: null,
          date: new Date().toISOString().split("T")[0],
          categoryId: "",
          description: "",
          amount: undefined,
          currency: "EUR",
          paymentMethod: PaymentMethod.CASH,
          paidBy: PaidBy.VESSEL,
          vendorName: null,
          invoiceNumber: null,
          isReimbursable: false,
          notes: null,
          status: ExpenseStatus.SUBMITTED,
          crewPersonalId: null,
          cardOwner: null,
        },
  });

  const paidBy = form.watch("paidBy");
  const crewPersonalId = form.watch("crewPersonalId");
  const paymentMethod = form.watch("paymentMethod");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Load crew users (for PaidBy = CREW_PERSONAL dropdown)
  // Include all users except OWNER
  React.useEffect(() => {
    const loadCrew = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const data = await res.json();
        const crew = (data || []).filter(
          (u: any) => u.role !== "OWNER" && u.role !== "SUPER_ADMIN" && u.role !== "ADMIN"
        );
        setCrewUsers(crew);
      } catch (e) {
        console.error("Failed to load crew users for expense form", e);
      }
    };
    loadCrew();
  }, []);

  const performSave = async (payload: ExpenseFormData, url: string, method: "POST" | "PATCH") => {
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to save expense");
        setIsLoading(false);
        return;
      }

      if (receiptFile && result?.id) {
        try {
          const receiptFormData = new FormData();
          receiptFormData.append("file", receiptFile);
          await fetch(`/api/expenses/${result.id}/receipt`, {
            method: "POST",
            body: receiptFormData,
          });
        } catch (uploadError) {
          console.error("Failed to upload receipt image", uploadError);
        }
      }

      router.push("/dashboard/expenses");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    setError(null);

    // We don't send crewPersonalId or cardOwner directly to the API (they're UI-only).
    // Instead, we append this information into the notes field so it is stored.
    const { crewPersonalId, cardOwner, notes, ...rest } = data as any;

    let finalNotes = notes || "";
    if (rest.paidBy === PaidBy.CREW_PERSONAL && crewPersonalId) {
      const crew = crewUsers.find((u) => u.id === crewPersonalId);
      const crewLabel = crew?.name || crew?.email || "Unknown crew";
      const tag = `Crew personal: ${crewLabel}`;
      finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
    }

    if (rest.paymentMethod === PaymentMethod.CARD && cardOwner) {
      const tag = `Card owner: ${cardOwner}`;
      finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
    }

    const payload = { ...rest, notes: finalNotes } as ExpenseFormData;

    if (!initialData) {
      setPendingPayload(payload);
      setConfirmOpen(true);
      setIsLoading(false);
      return;
    }

    await performSave(payload, `/api/expenses/${initialData.id}`, "PATCH");
  };

  const handleConfirmCreate = async () => {
    if (!pendingPayload) return;
    setIsLoading(true);
    await performSave(pendingPayload, "/api/expenses", "POST");
    setConfirmOpen(false);
    setPendingPayload(null);
  };

  const categoryName =
    categories.find((cat) => cat.id === pendingPayload?.categoryId)?.name || "Not selected";
  const tripName =
    trips.find((trip) => trip.id === pendingPayload?.tripId)?.name || "No trip";

  return (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirm expense</DialogTitle>
            <DialogDescription>
              Review the expense details before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium text-right">{pendingPayload?.description}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium text-right">{categoryName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium text-right">
                {typeof pendingPayload?.amount === "number"
                  ? pendingPayload.amount.toFixed(2)
                  : pendingPayload?.amount}{" "}
                {pendingPayload?.currency}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-right">{pendingPayload?.date}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-right">{pendingPayload?.status}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Paid By</span>
              <span className="font-medium text-right">{pendingPayload?.paidBy}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium text-right">{pendingPayload?.paymentMethod}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Trip</span>
              <span className="font-medium text-right">{tripName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Reimbursable</span>
              <span className="font-medium text-right">
                {pendingPayload?.isReimbursable ? "Yes" : "No"}
              </span>
            </div>
            {pendingPayload?.notes ? (
              <div className="space-y-1">
                <p className="text-muted-foreground">Notes</p>
                <p className="rounded-lg bg-muted/40 p-3 text-sm">{pendingPayload.notes}</p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Edit
              </Button>
            </DialogClose>
            <Button onClick={handleConfirmCreate} disabled={isLoading}>
              {isLoading ? "Saving..." : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Edit Expense" : "New Expense"}</CardTitle>
          <CardDescription>Enter expense details</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            No categories available
                          </SelectItem>
                        ) : (
                          categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter expense description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={
                          field.value === undefined || field.value === null ? "" : field.value
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.trim() === "") {
                            field.onChange(undefined);
                            return;
                          }
                          const parsed = parseFloat(val);
                          field.onChange(Number.isFinite(parsed) ? parsed : undefined);
                        }}
                        className="appearance-none"
                      />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "EUR"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="TRY">TRY</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Left column: Payment Method and Card Owner */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                            <SelectItem value={PaymentMethod.CARD}>Card</SelectItem>
                            <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                            <SelectItem value={PaymentMethod.OWNER_ACCOUNT}>Owner Account</SelectItem>
                            <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* When payment method is card, show an input to specify whose card */}
                  {paymentMethod === PaymentMethod.CARD && (
                    <FormField
                      control={form.control}
                      name="cardOwner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Owner</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Whose card was used?"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the name or description of whose card was used for this payment.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Right column: Paid By and Crew Personal */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paidBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid By *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={PaidBy.VESSEL}>Vessel</SelectItem>
                            <SelectItem value={PaidBy.OWNER}>Owner</SelectItem>
                            <SelectItem value={PaidBy.CHARTERER}>Charterer</SelectItem>
                            <SelectItem value={PaidBy.CREW_PERSONAL}>Crew Personal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* When Paid By is Crew Personal, show crew member selection */}
                  {paidBy === PaidBy.CREW_PERSONAL && crewUsers.length > 0 && (
                    <FormField
                      control={form.control}
                      name="crewPersonalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crew Personal</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select crew member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {crewUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name || user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select which crew member paid this expense.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Vendor name"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* VAT-related fields removed from UI for simplicity */}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tripId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trip" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No trip</SelectItem>
                          {trips.map((trip) => (
                            <SelectItem key={trip.id} value={trip.id}>
                              {trip.name} ({trip.code || "N/A"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ExpenseStatus.SUBMITTED}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ExpenseStatus.DRAFT}>Draft</SelectItem>
                          <SelectItem value={ExpenseStatus.SUBMITTED}>Submitted</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Submit for approval or save as draft</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isReimbursable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Reimbursable</FormLabel>
                      <FormDescription>
                        Check if this expense was paid from personal funds and should be reimbursed
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Optional receipt photo upload */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Receipt Photo (optional)
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setReceiptFile(e.target.files?.[0] ?? null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  You can attach a photo of the receipt for this expense.
                </p>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : initialData ? "Update" : "Create Expense"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}


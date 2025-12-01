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
  const [crewUsers, setCrewUsers] = useState<
    { id: string; name: string | null; email: string; role?: string | null }[]
  >([]);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialData || {
      date: new Date().toISOString().split("T")[0],
      currency: "EUR",
      paymentMethod: PaymentMethod.CARD,
      paidBy: PaidBy.VESSEL,
      isReimbursable: false,
      status: ExpenseStatus.DRAFT,
    },
  });

  const paidBy = form.watch("paidBy");
  const crewPersonalId = form.watch("crewPersonalId");

  // Load crew users (for PaidBy = CREW_PERSONAL dropdown)
  React.useEffect(() => {
    const loadCrew = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const data = await res.json();
        const crew = (data || []).filter(
          (u: any) => u.role === "CREW"
        );
        setCrewUsers(crew);
      } catch (e) {
        console.error("Failed to load crew users for expense form", e);
      }
    };
    loadCrew();
  }, []);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = initialData ? `/api/expenses/${initialData.id}` : "/api/expenses";
      const method = initialData ? "PATCH" : "POST";

      // We don't send crewPersonalId directly to the API (it's UI-only).
      // Instead, if PaidBy = CREW_PERSONAL, we append the selected crew member
      // into the notes field so the information is still stored.
      const { crewPersonalId, notes, ...rest } = data as any;

      let finalNotes = notes || "";
      if (rest.paidBy === PaidBy.CREW_PERSONAL && crewPersonalId) {
        const crew = crewUsers.find((u) => u.id === crewPersonalId);
        const crewLabel = crew?.name || crew?.email || "Unknown crew";
        const tag = `Crew personal: ${crewLabel}`;
        finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
      }

      const payload = { ...rest, notes: finalNotes };

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

      router.push("/dashboard/expenses");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
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
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <FormField
                control={form.control}
                name="paidBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid By *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>

            {/* When paid by crew personal, show a dropdown to select which crew member */}
            {paidBy === PaidBy.CREW_PERSONAL && crewUsers.length > 0 && (
              <FormField
                control={form.control}
                name="crewPersonalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crew Personal</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select crew member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {crewUsers.map((crew) => (
                          <SelectItem key={crew.id} value={crew.id}>
                            {crew.name || crew.email}
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Invoice number" {...field} value={field.value || ""} />
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
                      defaultValue={field.value || "none"}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
  );
}


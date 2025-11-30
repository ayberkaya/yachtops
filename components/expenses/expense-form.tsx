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

const expenseSchema = z.object({
  tripId: z.string().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("EUR"),
  exchangeRateToBase: z.number().optional().nullable(),
  baseAmount: z.number().optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidBy: z.nativeEnum(PaidBy),
  vendorName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  vatRate: z.number().optional().nullable(),
  vatAmount: z.number().optional().nullable(),
  totalAmountWithVat: z.number().optional().nullable(),
  isReimbursable: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(ExpenseStatus).default(ExpenseStatus.DRAFT),
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

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialData || {
      date: new Date().toISOString().split("T")[0],
      currency: "EUR",
      paymentMethod: PaymentMethod.CARD,
      paidBy: PaidBy.VESSEL,
      isReimbursable: false,
      status: ExpenseStatus.DRAFT,
      exchangeRateToBase: null,
      baseAmount: null,
      vatRate: null,
      vatAmount: null,
      totalAmountWithVat: null,
    },
  });

  const amount = form.watch("amount");
  const vatRate = form.watch("vatRate");
  const currency = form.watch("currency");

  // Calculate VAT and total when amount or VAT rate changes
  React.useEffect(() => {
    if (amount && vatRate) {
      const vat = (amount * vatRate) / 100;
      const total = amount + vat;
      form.setValue("vatAmount", vat);
      form.setValue("totalAmountWithVat", total);
    }
  }, [amount, vatRate, form]);

  // Set base amount same as amount if EUR, or calculate if other currency
  React.useEffect(() => {
    if (amount) {
      if (currency === "EUR") {
        form.setValue("baseAmount", amount);
        form.setValue("exchangeRateToBase", 1);
      }
    }
  }, [amount, currency, form]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = initialData ? `/api/expenses/${initialData.id}` : "/api/expenses";
      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

            <div className="grid gap-4 md:grid-cols-3">
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

              <FormField
                control={form.control}
                name="baseAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Amount (EUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                      />
                    </FormControl>
                    <FormDescription>Amount in base currency</FormDescription>
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

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="vatRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmountWithVat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total with VAT</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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


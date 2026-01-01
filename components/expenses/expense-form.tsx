"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ExpenseCategory, Trip, PaymentMethod, PaidBy, ExpenseStatus, TripStatus } from "@prisma/client";
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
  // Credit card ID when paymentMethod = CARD
  creditCardId: z.string().optional().nullable(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  categories: ExpenseCategory[];
  trips: Pick<Trip, "id" | "name" | "code" | "startDate" | "endDate" | "status">[];
  initialData?: any;
}

export function ExpenseForm({ categories, trips, initialData }: ExpenseFormProps) {
  const router = useRouter();
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const [tripSearch, setTripSearch] = useState("");
  const [isTripSelectOpen, setIsTripSelectOpen] = useState(false);
  const tripSearchInputRef = useRef<HTMLInputElement>(null);

  // Filter categories based on search - memoized for performance
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim() || categories.length < 5) {
      return categories;
    }
    const searchLower = categorySearch.toLowerCase().trim();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchLower)
    );
  }, [categorySearch, categories]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isCategorySelectOpen && categorySearchInputRef.current && categories.length >= 5) {
      const timer = setTimeout(() => {
        categorySearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCategorySelectOpen, categories.length]);

  // Filter trips based on search - exclude COMPLETED and CANCELLED trips
  const filteredTrips = useMemo(() => {
    // First filter out completed and cancelled trips
    const activeTrips = trips.filter(
      (trip) => trip.status !== TripStatus.COMPLETED && trip.status !== TripStatus.CANCELLED
    );
    
    if (!tripSearch.trim() || activeTrips.length < 5) {
      return activeTrips;
    }
    const searchLower = tripSearch.toLowerCase().trim();
    return activeTrips.filter(
      (trip) =>
        trip.name.toLowerCase().includes(searchLower) ||
        (trip.code && trip.code.toLowerCase().includes(searchLower))
    );
  }, [tripSearch, trips]);

  // Auto-focus trip search input when dropdown opens
  useEffect(() => {
    if (isTripSelectOpen && tripSearchInputRef.current && trips.length >= 5) {
      const timer = setTimeout(() => {
        tripSearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isTripSelectOpen, trips.length]);

  // Handle keyboard input when category dropdown is open
  useEffect(() => {
    if (!isCategorySelectOpen || categories.length < 5) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      if (
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Tab" ||
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        if (categorySearchInputRef.current) {
          categorySearchInputRef.current.focus();
          setCategorySearch((prev) => prev + e.key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCategorySelectOpen, categories.length]);

  // Handle keyboard input when trip dropdown is open
  useEffect(() => {
    if (!isTripSelectOpen || trips.length < 5) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      if (
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Tab" ||
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        if (tripSearchInputRef.current) {
          tripSearchInputRef.current.focus();
          setTripSearch((prev) => prev + e.key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTripSelectOpen, trips.length]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ExpenseFormData | null>(null);
  const [crewUsers, setCrewUsers] = useState<
    { id: string; name: string | null; email: string; role?: string | null }[]
  >([]);
  const [creditCards, setCreditCards] = useState<
    { id: string; ownerName: string; lastFourDigits: string }[]
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
          creditCardId: initialData.creditCardId || null,
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
          creditCardId: null,
        },
  });

  const paidBy = form.watch("paidBy");
  const crewPersonalId = form.watch("crewPersonalId");
  const paymentMethod = form.watch("paymentMethod");
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [existingReceipts, setExistingReceipts] = useState<any[]>([]);
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);

  // Load crew users (for PaidBy = CREW_PERSONAL dropdown)
  // Include all users except OWNER, SUPER_ADMIN, and ADMIN
  React.useEffect(() => {
    const loadCrew = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const data = await res.json();
        const crew = (data || []).filter(
          (u: any) => {
            if (!u || !u.role) return false;
            const role = String(u.role).toUpperCase().trim();
            // Exclude OWNER, SUPER_ADMIN, and ADMIN
            return role !== "OWNER" && role !== "SUPER_ADMIN" && role !== "ADMIN";
          }
        );
        setCrewUsers(crew);
      } catch (e) {
        console.error("Failed to load crew users for expense form", e);
      }
    };
    loadCrew();
  }, []);

  // Load credit cards (for PaymentMethod = CARD dropdown)
  React.useEffect(() => {
    const loadCreditCards = async () => {
      try {
        const res = await fetch("/api/credit-cards");
        if (!res.ok) return;
        const data = await res.json();
        setCreditCards(data || []);
      } catch (e) {
        console.error("Failed to load credit cards for expense form", e);
      }
    };
    loadCreditCards();
  }, []);

  // Load existing receipts if editing
  React.useEffect(() => {
    if (initialData?.id) {
      const loadReceipts = async () => {
        try {
          const response = await fetch(`/api/expenses/${initialData.id}`);
          if (response.ok) {
            const expense = await response.json();
            setExistingReceipts(expense.receipts || []);
          }
        } catch (err) {
          console.error("Failed to load receipts:", err);
        }
      };
      loadReceipts();
    }
  }, [initialData?.id]);

  const performSave = async (payload: ExpenseFormData, url: string, method: "POST" | "PATCH") => {
    try {
      // Use offline-aware API client for reliable offline support
      const { apiClient } = await import("@/lib/api-client");
      
      const response = await method === "POST" 
        ? await apiClient.post(url, payload, { queueOnOffline: true })
        : await apiClient.patch(url, payload, { queueOnOffline: true });

      // If queued (offline), show success message and stay on form
      if (response.queued) {
        setError(null);
        // Store form state locally so user can see it was saved
        if (typeof window !== "undefined") {
          localStorage.setItem(`expense-queued-${Date.now()}`, JSON.stringify({
            payload,
            url,
            method,
            timestamp: Date.now(),
          }));
        }
        // Don't navigate - let user know it's queued
        alert("Expense saved offline. It will sync automatically when you're back online.");
        setIsLoading(false);
        return;
      }

      // Check for errors
      if (response.status >= 400) {
        const errorData = response.data as any;
        setError(errorData?.error || errorData?.message || "Failed to save expense");
        setIsLoading(false);
        return;
      }

      const result = response.data as any;

      // Show success toast for new expense creation
      if (method === "POST") {
        // Import toast function dynamically
        const toastModule = await import("@/components/ui/toast");
        toastModule.toast({
          description: "Masraf başarıyla oluşturuldu! Onay kuyruğuna (Pending) eklendi.",
          variant: "success",
          duration: 5000,
        });
      }

      // Track successful expense creation/update (non-blocking)
      const { trackAction } = await import("@/lib/usage-tracking");
      trackAction(method === "POST" ? "expense.create" : "expense.update", {
        expenseId: result?.id,
        categoryId: payload.categoryId,
      });

      // Navigate and refresh immediately - don't wait for receipt uploads
      router.push("/dashboard/expenses");
      router.refresh();

      // Upload receipts in background (non-blocking) after navigation
      if (receiptFiles.length > 0 && result?.id) {
        // Use setTimeout to ensure navigation happens first, then upload receipts
        setTimeout(async () => {
          try {
            // Import offline utilities
            const { compressImages } = await import("@/lib/image-compression");
            const { storeFileOffline } = await import("@/lib/offline-file-storage");
            const { offlineQueue } = await import("@/lib/offline-queue");
            const { apiClient } = await import("@/lib/api-client");

            // Compress images before upload
            const compressedFiles = await compressImages(receiptFiles, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              initialQuality: 0.85,
            });

            // Check if online
            if (offlineQueue.online && !response.queued) {
              // Online - upload in parallel for better performance
              const uploadPromises = compressedFiles.map(async (file) => {
                try {
                  const receiptFormData = new FormData();
                  receiptFormData.append("file", file);
                  
                  const receiptResponse = await apiClient.request(
                    `/api/expenses/${result.id}/receipt`,
                    {
                      method: "POST",
                      body: receiptFormData,
                      queueOnOffline: false,
                    }
                  );
                  
                  if (receiptResponse.status >= 400) {
                    const errorData = receiptResponse.data as any;
                    const errorMessage = errorData?.error || errorData?.message || "Failed to upload receipt";
                    console.error("Failed to upload receipt:", errorMessage);
                    // Fallback to offline storage
                    const fileId = await storeFileOffline(file, { expenseId: result.id });
                    await offlineQueue.enqueueFileUpload(
                      fileId,
                      `/api/expenses/${result.id}/receipt`,
                      'POST'
                    );
                  } else {
                    console.log("Receipt uploaded successfully");
                  }
                } catch (fileError) {
                  console.error("Error uploading receipt:", fileError);
                  // Fallback to offline storage
                  const fileId = await storeFileOffline(file, { expenseId: result.id });
                  await offlineQueue.enqueueFileUpload(
                    fileId,
                    `/api/expenses/${result.id}/receipt`,
                    'POST'
                  );
                }
              });

              // Wait for all uploads in parallel (but don't block UI)
              await Promise.allSettled(uploadPromises);
            } else {
              // Offline or queued - store files and queue uploads
              for (const file of compressedFiles) {
                const fileId = await storeFileOffline(file, { expenseId: result.id });
                await offlineQueue.enqueueFileUpload(
                  fileId,
                  `/api/expenses/${result.id}/receipt`,
                  'POST'
                );
              }
              
              if (response.queued) {
                console.log("Receipts queued for upload when connection is restored");
              }
            }
          } catch (uploadError) {
            console.error("Failed to upload receipt images", uploadError);
            // Silently fail - receipts will be uploaded automatically when connection is restored
          }
        }, 0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    setError(null);

    // We don't send crewPersonalId directly to the API (it's UI-only).
    // Instead, we append this information into the notes field so it is stored.
    const { crewPersonalId, notes, ...rest } = data as any;

    let finalNotes = notes || "";
    if (rest.paidBy === PaidBy.CREW_PERSONAL && crewPersonalId) {
      const crew = crewUsers.find((u) => u.id === crewPersonalId);
      const crewLabel = crew?.name || crew?.email || "Unknown crew";
      const tag = `Crew personal: ${crewLabel}`;
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
    // Close dialog immediately for better UX
    setConfirmOpen(false);
    setPendingPayload(null);
    // Perform save (which will navigate)
    await performSave(pendingPayload, "/api/expenses", "POST");
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
                      <Select
                        open={isCategorySelectOpen}
                        onOpenChange={(open) => {
                          setIsCategorySelectOpen(open);
                          if (!open) {
                            setCategorySearch("");
                          }
                        }}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setCategorySearch("");
                          setIsCategorySelectOpen(false);
                        }}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={categories.length >= 5 ? "max-h-[400px] p-0" : ""}>
                          {categories.length >= 5 && (
                            <div className="sticky top-0 z-10 bg-white border-b border-border/50 p-2 backdrop-blur-sm">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  ref={categorySearchInputRef}
                                  placeholder="Search categories..."
                                  value={categorySearch}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setCategorySearch(e.target.value);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Escape") {
                                      setCategorySearch("");
                                      setIsCategorySelectOpen(false);
                                    }
                                    if (e.key === "Enter" && categorySearch.trim()) {
                                      e.preventDefault();
                                    }
                                  }}
                                  className="pl-8 h-9 text-sm"
                                />
                              </div>
                            </div>
                          )}
                          {filteredCategories.length === 0 ? (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              {categories.length === 0
                                ? "No categories available"
                                : "No categories found"}
                            </div>
                          ) : (
                            filteredCategories.map((cat) => (
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

                  {/* When payment method is card, show a dropdown to select credit card */}
                  {paymentMethod === PaymentMethod.CARD && (
                    <FormField
                      control={form.control}
                      name="creditCardId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Card</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a credit card" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {creditCards.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  No credit cards available
                                </div>
                              ) : (
                                creditCards.map((card) => (
                                  <SelectItem key={card.id} value={card.id}>
                                    {card.ownerName} •••• {card.lastFourDigits}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the credit card used for this payment.
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
                        open={isTripSelectOpen}
                        onOpenChange={(open) => {
                          setIsTripSelectOpen(open);
                          if (!open) {
                            setTripSearch("");
                          }
                        }}
                        onValueChange={(value) => {
                          field.onChange(value === "none" ? null : value);
                          setTripSearch("");
                          setIsTripSelectOpen(false);
                        }}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trip" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={trips.length >= 5 ? "max-h-[400px] p-0" : ""}>
                          {trips.length >= 5 && (
                            <div className="sticky top-0 z-10 bg-white border-b border-border/50 p-2 backdrop-blur-sm">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  ref={tripSearchInputRef}
                                  placeholder="Search trips..."
                                  value={tripSearch}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setTripSearch(e.target.value);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Escape") {
                                      setTripSearch("");
                                      setIsTripSelectOpen(false);
                                    }
                                    if (e.key === "Enter" && tripSearch.trim()) {
                                      e.preventDefault();
                                    }
                                  }}
                                  className="pl-8 h-9 text-sm"
                                />
                              </div>
                            </div>
                          )}
                          <SelectItem value="none">No trip</SelectItem>
                          {filteredTrips.length === 0 && tripSearch.trim() ? (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              No trips found
                            </div>
                          ) : (
                            filteredTrips.map((trip) => (
                              <SelectItem key={trip.id} value={trip.id}>
                                {trip.name}{trip.code ? ` (${trip.code})` : ""}
                              </SelectItem>
                            ))
                          )}
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

              {/* Optional receipt photos upload */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Receipt Photos (optional)
                </p>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setReceiptFiles(files);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  You can attach multiple receipt photos or PDFs for this expense.
                </p>
                {receiptFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {receiptFiles.map((file, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>• {file.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptFiles(receiptFiles.filter((_, i) => i !== index));
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Existing receipts (edit mode) */}
              {initialData?.id && existingReceipts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Existing Receipts
                  </p>
                  <div className="space-y-2">
                    {existingReceipts.map((receipt: any) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Receipt {new Date(receipt.uploadedAt).toLocaleDateString()}</span>
                          <a
                            href={`/api/expenses/receipts/${receipt.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Delete this receipt?")) {
                              setDeletingReceiptId(receipt.id);
                              try {
                                const response = await fetch(`/api/expenses/${initialData.id}/receipt/${receipt.id}`, {
                                  method: "DELETE",
                                });
                                if (response.ok) {
                                  setExistingReceipts(existingReceipts.filter((r: any) => r.id !== receipt.id));
                                } else {
                                  const error = await response.json();
                                  alert(error.error || "Failed to delete receipt");
                                }
                              } catch (err) {
                                console.error("Failed to delete receipt:", err);
                                alert("Failed to delete receipt");
                              } finally {
                                setDeletingReceiptId(null);
                              }
                            }
                          }}
                          disabled={deletingReceiptId === receipt.id}
                          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingReceiptId === receipt.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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


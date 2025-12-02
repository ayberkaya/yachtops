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
import { MaintenanceType } from "@prisma/client";
import { Textarea } from "@/components/ui/textarea";

const maintenanceSchema = z.object({
  type: z.nativeEnum(MaintenanceType),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  component: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  cost: z.number().positive().optional().nullable(),
  currency: z.string().default("EUR"),
  date: z.string().min(1, "Date is required"),
  nextDueDate: z.string().optional().nullable(),
  mileage: z.number().positive().optional().nullable(),
  mileageUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormProps {
  initialData?: any;
}

export function MaintenanceForm({ initialData }: MaintenanceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: initialData
      ? {
          type: initialData.type,
          title: initialData.title,
          description: initialData.description || "",
          component: initialData.component || "",
          serviceProvider: initialData.serviceProvider || "",
          cost: initialData.cost || null,
          currency: initialData.currency || "EUR",
          date: initialData.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          nextDueDate: initialData.nextDueDate ? new Date(initialData.nextDueDate).toISOString().split("T")[0] : "",
          mileage: initialData.mileage || null,
          mileageUnit: initialData.mileageUnit || "",
          notes: initialData.notes || "",
        }
      : {
          type: MaintenanceType.PREVENTIVE,
          title: "",
          description: "",
          component: "",
          serviceProvider: "",
          cost: null,
          currency: "EUR",
          date: new Date().toISOString().split("T")[0],
          nextDueDate: "",
          mileage: null,
          mileageUnit: "hours",
          notes: "",
        },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = initialData ? `/api/maintenance/${initialData.id}` : "/api/maintenance";
      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to save maintenance log");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard/maintenance");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Maintenance Log" : "New Maintenance Log"}</CardTitle>
        <CardDescription>Record maintenance, repairs, or inspections</CardDescription>
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MaintenanceType.PREVENTIVE}>Preventive</SelectItem>
                          <SelectItem value={MaintenanceType.REPAIR}>Repair</SelectItem>
                          <SelectItem value={MaintenanceType.INSPECTION}>Inspection</SelectItem>
                          <SelectItem value={MaintenanceType.UPGRADE}>Upgrade</SelectItem>
                          <SelectItem value={MaintenanceType.EMERGENCY}>Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engine Oil Change" {...field} />
                    </FormControl>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the maintenance work"
                      {...field}
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="component"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Component</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engine, Hull, Electronics" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription className="min-h-[1.25rem]">Which part of the vessel was maintained</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Marina Name, Technician Name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription className="min-h-[1.25rem]"></FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
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
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
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
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="TRY">TRY</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="nextDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mileage/Engine Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mileageUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || "hours"}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="nm">Nautical Miles</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or observations"
                      {...field}
                      value={field.value || ""}
                      rows={3}
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
                {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


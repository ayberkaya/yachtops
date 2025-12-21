"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { ShoppingListStatus } from "@prisma/client";
import { useNotifications } from "@/components/notifications/notifications-provider";

const listSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ShoppingListStatus).optional(),
  tripId: z.string().optional().nullable(),
});

type ListFormData = z.infer<typeof listSchema>;

interface Trip {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface ShoppingListFormProps {
  list?: {
    id: string;
    name: string;
    description: string | null;
    status: ShoppingListStatus;
    tripId: string | null;
  } | null;
  onSuccess: (list: any) => void;
  onDelete?: () => void;
}

export function ShoppingListForm({ list, onSuccess, onDelete }: ShoppingListFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const { refresh } = useNotifications();

  // Fetch trips on mount
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await fetch("/api/trips?limit=100");
        if (response.ok) {
          const result = await response.json();
          const tripsData = Array.isArray(result) ? result : (result.data || []);
          setTrips(tripsData);
        }
      } catch (error) {
        console.error("Error fetching trips:", error);
      } finally {
        setLoadingTrips(false);
      }
    };
    fetchTrips();
  }, []);

  const sanitizedDefaults: ListFormData = list
    ? {
        ...list,
        description: list.description ?? "",
        status:
          list.status === ShoppingListStatus.DRAFT ? ShoppingListStatus.ACTIVE : list.status,
        tripId: list.tripId || null,
      }
    : {
        name: "",
        description: "",
        status: ShoppingListStatus.ACTIVE,
        tripId: null,
      };

  const form = useForm<ListFormData>({
    resolver: zodResolver(listSchema),
    defaultValues: sanitizedDefaults,
  });

  const statusOptions: { value: ShoppingListStatus; label: string }[] = [
    { value: ShoppingListStatus.ACTIVE, label: "Active" },
    { value: ShoppingListStatus.COMPLETED, label: "Completed" },
  ];

  const onSubmit = async (data: ListFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = list ? `/api/shopping-lists/${list.id}` : "/api/shopping-lists";
      const method = list ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save list");
      }

      const savedList = await response.json();
      onSuccess(savedList);
      refresh({ silent: true }).catch((err) => console.error("Failed to refresh notifications:", err));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!list || !onDelete) return;

    if (!confirm("Are you sure you want to delete this list?")) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/shopping-lists/${list.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete list");
      }

      onDelete();
      refresh({ silent: true }).catch((err) => console.error("Failed to refresh notifications:", err));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>List Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Shopping list name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} placeholder="Description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tripId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trip (Optional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                value={field.value || "none"}
                disabled={loadingTrips}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingTrips ? "Loading trips..." : "Select a trip"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No trip</SelectItem>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.name} {trip.code ? `(${trip.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Optionally associate this shopping list with a trip
              </FormDescription>
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
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ShoppingListStatus.ACTIVE}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Delete
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : list ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

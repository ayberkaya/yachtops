"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { TripStatus, TripType } from "@prisma/client";

const tripSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional().nullable(),
  type: z.nativeEnum(TripType).default(TripType.CHARTER),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  departurePort: z.string().optional().nullable(),
  arrivalPort: z.string().optional().nullable(),
  status: z.nativeEnum(TripStatus).default(TripStatus.PLANNED),
  mainGuest: z.string().optional().nullable(),
  guestCount: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type TripFormData = z.infer<typeof tripSchema>;

interface TripFormProps {
  trip?: any;
  onSuccess: () => void;
}

export function TripForm({ trip, onSuccess }: TripFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TripFormData>({
    resolver: zodResolver(tripSchema) as any,
    defaultValues: trip
      ? {
          name: trip.name,
          code: trip.code || "",
          type: trip.type || TripType.CHARTER,
          startDate: trip.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "",
          endDate: trip.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : "",
          departurePort: trip.departurePort || "",
          arrivalPort: trip.arrivalPort || "",
          status: trip.status,
          mainGuest: trip.mainGuest || "",
          guestCount: trip.guestCount || null,
          notes: trip.notes || "",
        }
      : {
          name: "",
          code: "",
          type: TripType.CHARTER,
          startDate: "",
          endDate: "",
          departurePort: "",
          arrivalPort: "",
          status: TripStatus.PLANNED,
          mainGuest: "",
          guestCount: null,
          notes: "",
        },
  });

  const onSubmit = async (data: TripFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = trip ? `/api/trips/${trip.id}` : "/api/trips";
      const method = trip ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to save trip");
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Trip name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="Trip code" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={TripType.CHARTER}>Charter</SelectItem>
                    <SelectItem value={TripType.PRIVATE}>Private</SelectItem>
                    <SelectItem value={TripType.DELIVERY}>Delivery</SelectItem>
                    <SelectItem value={TripType.MAINTENANCE}>Maintenance</SelectItem>
                    <SelectItem value={TripType.OTHER}>Other</SelectItem>
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
                    <SelectItem value={TripStatus.PLANNED}>Planned</SelectItem>
                    <SelectItem value={TripStatus.ONGOING}>Ongoing</SelectItem>
                    <SelectItem value={TripStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={TripStatus.CANCELLED}>Cancelled</SelectItem>
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
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="departurePort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure Port</FormLabel>
                <FormControl>
                  <Input placeholder="Departure port" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival Port</FormLabel>
                <FormControl>
                  <Input placeholder="Arrival port" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="mainGuest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Main Guest</FormLabel>
                <FormControl>
                  <Input placeholder="Primary guest name" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest Count</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Number of guests"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
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
                  placeholder="Additional notes..."
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : trip ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


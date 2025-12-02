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
import { TaskStatus, UserRole } from "@prisma/client";

const taskSchema = z.object({
  tripId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeRole: z.nativeEnum(UserRole).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: any;
  users: { id: string; name: string | null; email: string }[];
  trips: { id: string; name: string }[];
  onSuccess: () => void;
}

export function TaskForm({ task, users, trips, onSuccess }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: task || {
      title: "",
      description: "",
      assigneeId: null,
      assigneeRole: null,
      tripId: null,
      dueDate: "",
      status: TaskStatus.TODO,
    },
  });

  const assigneeId = form.watch("assigneeId");
  const assigneeRole = form.watch("assigneeRole");

  const onSubmit = async (data: TaskFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = task ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = task ? "PATCH" : "POST";

      // Clean up the data: convert "none" strings to null
      const cleanedData = {
        ...data,
        tripId: data.tripId === "none" || !data.tripId ? null : data.tripId,
        assigneeId: data.assigneeId === "none" || !data.assigneeId ? null : data.assigneeId,
        assigneeRole: data.assigneeRole === "none" || !data.assigneeRole ? null : data.assigneeRole,
        dueDate: data.dueDate || null,
        description: data.description || null,
      };

      console.log("Form data before submit:", data);
      console.log("Cleaned data to send:", cleanedData);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      let result;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          const text = await response.text();
          setError(`Server error: ${response.status} ${response.statusText}. Response: ${text.substring(0, 200)}`);
          setIsLoading(false);
          return;
        }
      } else {
        // Response is not JSON, read as text
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        setError(`Server returned non-JSON response. Status: ${response.status}. ${text.substring(0, 200)}`);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        // Show detailed error message from API
        const errorMessage = result.error || result.message || "Failed to save task";
        const errorDetails = result.details ? ` Details: ${JSON.stringify(result.details)}` : "";
        setError(`${errorMessage}${errorDetails}`);
        console.error("Task creation error:", result);
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      console.error("Task form submission error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errorMessage);
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Task description"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Person</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value === "none" ? null : value);
                    // Clear assigneeRole when assigning to a person
                    if (value !== "none") {
                      form.setValue("assigneeRole", null);
                    }
                  }}
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
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
            name="assigneeRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Role</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value === "none" ? null : value);
                    // Clear assigneeId when assigning to a role
                    if (value !== "none") {
                      form.setValue("assigneeId", null);
                    }
                  }}
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No role assignment</SelectItem>
                    <SelectItem value={UserRole.CAPTAIN}>Captain</SelectItem>
                    <SelectItem value={UserRole.CREW}>Crew</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                      {trip.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
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
                    <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                    <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : task ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


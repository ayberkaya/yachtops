"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { TaskStatus, TaskPriority, UserRole } from "@prisma/client";

// Define TaskType enum values manually for client-side use
const TaskType = {
  GENERAL: "GENERAL",
  MAINTENANCE: "MAINTENANCE",
  REPAIR: "REPAIR",
  INSPECTION: "INSPECTION",
} as const;

type TaskType = typeof TaskType[keyof typeof TaskType];
import { Trash2, ChevronDown, X } from "lucide-react";
import { VoiceInput } from "./voice-input";
import { TaskIntentResult } from "@/lib/ai/types";
import { useToast } from "@/components/ui/toast";

interface CustomRole {
  id: string;
  name: string;
  permissions: string;
  active: boolean;
}

const taskSchema = z.object({
  tripId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional().default([]),
  assigneeRole: z.union([z.nativeEnum(UserRole), z.string()]).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.enum(["NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  type: z.enum(["GENERAL", "MAINTENANCE", "REPAIR", "INSPECTION"]).default("GENERAL"),
  cost: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: any;
  initialData?: {
    title?: string;
    description?: string;
    assigneeId?: string | null;
      priority?: "NORMAL" | "HIGH" | "URGENT" | "LOW" | "MEDIUM"; // Support both old and new formats
    dueDate?: string | null;
  };
  users: { id: string; name: string | null; email: string; role?: UserRole; customRoleId?: string | null; customRole?: { id: string; name: string } | null }[];
  trips: { id: string; name: string }[];
  onSuccess: (createdTask?: any) => void;
  onDelete?: () => void;
}

export function TaskForm({ task, initialData, users, trips, onSuccess, onDelete }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const { toast } = useToast();

  // Filter out OWNER role users from assignee selection
  const assignableUsers = users.filter((user) => {
    const role = user.role ? String(user.role).toUpperCase().trim() : "";
    return role !== "OWNER" && role !== "SUPER_ADMIN" && role !== "ADMIN";
  });


  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema) as any,
    defaultValues: task ? {
      ...task,
      assigneeIds: task.assigneeId ? [task.assigneeId] : [],
      type: task.type || "GENERAL",
      cost: task.cost || null,
      currency: task.currency || null,
      serviceProvider: task.serviceProvider || null,
    } : {
      title: initialData?.title || "",
      description: initialData?.description || "",
      assigneeId: initialData?.assigneeId || null,
      assigneeIds: initialData?.assigneeId ? [initialData.assigneeId] : [],
      assigneeRole: null,
      tripId: null,
      dueDate: initialData?.dueDate || "",
      status: TaskStatus.TODO,
      priority: initialData?.priority || "NORMAL" as const,
      type: "GENERAL",
      cost: null,
      currency: "EUR",
      serviceProvider: null,
    },
  });

  // Update form when initialData changes (for voice task)
  useEffect(() => {
    if (initialData && !task) {
      if (initialData.title) form.setValue("title", initialData.title);
      if (initialData.description) form.setValue("description", initialData.description);
      if (initialData.priority) {
        // Convert AI priority format to Prisma TaskPriority enum
        const priorityMap: Record<string, "NORMAL" | "HIGH" | "URGENT"> = {
          "Normal": "NORMAL",
          "High": "HIGH",
          "Urgent": "URGENT",
          // Legacy support
          "LOW": "NORMAL",
          "MEDIUM": "NORMAL",
          "NORMAL": "NORMAL",
          "HIGH": "HIGH",
          "URGENT": "URGENT",
        };
        const mappedPriority: "NORMAL" | "HIGH" | "URGENT" = priorityMap[initialData.priority] || "NORMAL";
        form.setValue("priority", mappedPriority);
      }
      if (initialData.assigneeId) {
        form.setValue("assigneeId", initialData.assigneeId);
        form.setValue("assigneeIds", [initialData.assigneeId]);
      }
      if (initialData.dueDate) {
        form.setValue("dueDate", initialData.dueDate);
      }
    }
  }, [initialData, task, form]);

  const assigneeId = form.watch("assigneeId");
  const assigneeIds = form.watch("assigneeIds") || [];
  const assigneeRole = form.watch("assigneeRole");
  const taskType = form.watch("type");
  const showMaintenanceFields = taskType === "MAINTENANCE" || taskType === "REPAIR";

  const toggleAssignee = (userId: string) => {
    const current = assigneeIds;
    if (current.includes(userId)) {
      form.setValue("assigneeIds", current.filter((id) => id !== userId));
      // If removing the last assignee and assigneeId was set, clear it
      if (current.length === 1 && assigneeId === userId) {
        form.setValue("assigneeId", null);
      }
    } else {
      form.setValue("assigneeIds", [...current, userId]);
      // Clear assigneeRole when assigning to specific users
      form.setValue("assigneeRole", null);
    }
  };

  // Fetch custom roles on mount
  useEffect(() => {
    const fetchCustomRoles = async () => {
      try {
        const response = await fetch("/api/roles");
        if (response.ok) {
          const roles = await response.json();
          // API already returns only active roles, but filter just in case
          const activeRoles = roles.filter((r: CustomRole) => r.active !== false);
          console.log("Fetched custom roles:", activeRoles);
          console.log("Total roles received:", roles.length);
          console.log("Active roles:", activeRoles.length);
          setCustomRoles(activeRoles);
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("Failed to fetch roles:", response.status, response.statusText, errorData);
          // Even if API fails, set empty array to avoid undefined issues
          setCustomRoles([]);
        }
      } catch (error) {
        console.error("Error fetching custom roles:", error);
        // Set empty array on error
        setCustomRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchCustomRoles();
  }, []);

  const onSubmit = async (data: TaskFormData) => {
    console.log("onSubmit called", { task, data });
    setIsLoading(true);
    setError(null);

    try {
      // For editing, we only update the single task (not create multiple)
      if (task?.id) {
        console.log("Editing existing task:", task.id);
        const url = `/api/tasks/${task.id}`;
        const method = "PATCH";

        // Handle custom role selection
        let assigneeRoleValue = data.assigneeRole;
        let assigneeIdValue = data.assigneeIds && data.assigneeIds.length > 0 ? data.assigneeIds[0] : null;
        
        // Check if a custom role was selected (starts with "custom_")
        if (assigneeRoleValue && typeof assigneeRoleValue === "string" && assigneeRoleValue.startsWith("custom_")) {
          const customRoleId = assigneeRoleValue.replace("custom_", "");
          // Find users with this custom role
          try {
            const usersResponse = await fetch("/api/users");
            if (usersResponse.ok) {
              const allUsers = await usersResponse.json() as Array<{ id: string; customRoleId: string | null; active?: boolean }>;
              const usersWithCustomRole = allUsers.filter((u) => u.customRoleId === customRoleId && u.active !== false);
              if (usersWithCustomRole.length > 0) {
                assigneeIdValue = usersWithCustomRole[0].id;
                assigneeRoleValue = null;
              } else {
                setError(`No active users found with the selected custom role. Please assign to a specific person instead.`);
                setIsLoading(false);
                return;
              }
            }
          } catch (err) {
            console.error("Error fetching users for custom role assignment:", err);
            setError("Failed to find users with the selected custom role. Please try again.");
            setIsLoading(false);
            return;
          }
        }

        const cleanedData = {
          tripId: data.tripId === "none" || !data.tripId ? null : data.tripId,
          title: data.title,
          description: data.description || null,
          assigneeId: assigneeIdValue || null,
          assigneeRole: (!assigneeRoleValue || assigneeRoleValue === "none") ? null : assigneeRoleValue,
          dueDate: data.dueDate || null,
          status: data.status,
          priority: data.priority || "NORMAL",
          type: data.type || "GENERAL",
          cost: data.cost || null,
          currency: data.currency || null,
          serviceProvider: data.serviceProvider || null,
        };

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedData),
        });

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
          const text = await response.text();
          console.error("Non-JSON response received:", text);
          setError(`Server returned non-JSON response. Status: ${response.status}. ${text.substring(0, 200)}`);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          let errorMessage = "Failed to update task";
          let errorDetails = "";
          
          if (result) {
            errorMessage = result.error || result.message || errorMessage;
            if (result.details) {
              errorDetails = ` Details: ${JSON.stringify(result.details)}`;
            }
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          
          setError(`${errorMessage}${errorDetails}`);
          setIsLoading(false);
          return;
        }

        // Track successful task update
        const { trackAction } = await import("@/lib/usage-tracking");
        trackAction("task.update", {
          taskId: result?.id,
          assigneeId: cleanedData.assigneeId,
          priority: cleanedData.priority,
        });

        onSuccess(result);
        setIsLoading(false);
        return;
      }

      // For creating new tasks, handle multiple assignees
      console.log("Creating new task");
      const url = "/api/tasks";
      const method = "POST";

      // Handle custom role selection
      let assigneeRoleValue = data.assigneeRole;
      let assigneeIdsToUse = data.assigneeIds || [];
      
      // Check if a custom role was selected (starts with "custom_")
      if (assigneeRoleValue && typeof assigneeRoleValue === "string" && assigneeRoleValue.startsWith("custom_")) {
        const customRoleId = assigneeRoleValue.replace("custom_", "");
        // Find users with this custom role
        try {
            const usersResponse = await fetch("/api/users");
            if (usersResponse.ok) {
              const allUsers = await usersResponse.json() as Array<{ id: string; customRoleId: string | null; active?: boolean }>;
              const usersWithCustomRole = allUsers.filter((u) => u.customRoleId === customRoleId && u.active !== false);
              if (usersWithCustomRole.length > 0) {
                // Assign to all users with this custom role
                assigneeIdsToUse = usersWithCustomRole.map((u) => u.id);
              assigneeRoleValue = null; // Clear assigneeRole since we're assigning to specific users
            } else {
              setError(`No active users found with the selected custom role. Please assign to a specific person instead.`);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Error fetching users for custom role assignment:", err);
          setError("Failed to find users with the selected custom role. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      // If multiple assignees selected, create a task for each user
      const assigneeIdsArray = assigneeIdsToUse.length > 0 ? assigneeIdsToUse : (data.assigneeId ? [data.assigneeId] : []);
      
      // If no assignees and no role, create one unassigned task
      if (assigneeIdsArray.length === 0 && !assigneeRoleValue) {
        assigneeIdsArray.push(null as any);
      }

      // Clean up the base data
      const baseTaskData = {
        tripId: data.tripId === "none" || !data.tripId ? null : data.tripId,
        title: data.title,
        description: data.description || null,
        assigneeRole: (!assigneeRoleValue || assigneeRoleValue === "none") ? null : assigneeRoleValue,
        dueDate: data.dueDate || null,
        status: data.status,
        priority: data.priority || "NORMAL",
        type: data.type || "GENERAL",
        cost: data.cost || null,
        currency: data.currency || null,
        serviceProvider: data.serviceProvider || null,
      };

      console.log("Form data before submit:", data);
      console.log("Assignee IDs to create tasks for:", assigneeIdsArray);

      // Create tasks for each assignee
      const createdTasks = [];
      let lastResult: any = null;
      let hasError = false;

      for (const assigneeId of assigneeIdsArray) {
        const cleanedData = {
          ...baseTaskData,
          assigneeId: assigneeId || null,
        };

        console.log("Sending POST request to:", url, { method, cleanedData });
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedData),
        });
        console.log("Response received:", { status: response.status, ok: response.ok, statusText: response.statusText });

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
          let errorMessage = "Failed to save task";
          let errorDetails = "";
          
          if (result) {
            errorMessage = result.error || result.message || errorMessage;
            if (result.details) {
              errorDetails = ` Details: ${JSON.stringify(result.details)}`;
            }
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          
          setError(`${errorMessage}${errorDetails}`);
          console.error("Task creation error:", {
            status: response.status,
            statusText: response.statusText,
            result: result,
          });
          hasError = true;
          break;
        }

        createdTasks.push(result);
        lastResult = result;

        // If photo selected, upload as attachment to the first task
        if (photoFile && result?.id && createdTasks.length === 1) {
          try {
            const toDataUrl = (file: File) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
              });

            const fileUrl = await toDataUrl(photoFile);
            await fetch(`/api/tasks/${result.id}/attachments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: photoFile.name,
                fileUrl,
                fileSize: photoFile.size,
                mimeType: photoFile.type || "image/*",
              }),
            });
          } catch (uploadErr) {
            console.error("Attachment upload failed", uploadErr);
            // Don't fail the whole operation if photo upload fails
          }
        }

        // Track successful task creation/update
        const { trackAction } = await import("@/lib/usage-tracking");
        trackAction(method === "POST" ? "task.create" : "task.update", {
          taskId: result?.id,
          assigneeId: cleanedData.assigneeId,
          priority: cleanedData.priority,
        });
      }

      if (hasError) {
        setIsLoading(false);
        return;
      }

      setPhotoFile(null);
      // Return the last created task or the first one
      onSuccess(lastResult || createdTasks[0]);
    } catch (err) {
      console.error("Task form submission error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.id || !onDelete) return;

    if (!confirm("Delete this task?\n\nThis action cannot be undone. The task will be permanently removed.")) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete task");
      }

      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsDeleting(false);
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
              <div className="flex justify-center">
                <VoiceInput
                  onSuccess={(data: TaskIntentResult, transcript: string) => {
                    // Map AI priority to form priority
                    const priorityMap: Record<string, "NORMAL" | "HIGH" | "URGENT"> = {
                      Normal: "NORMAL",
                      Medium: "NORMAL",
                      High: "HIGH",
                      Urgent: "URGENT",
                      Critical: "URGENT",
                    };

                    // Fill form with AI data
                    form.setValue("title", data.title || "");
                    form.setValue("description", data.description || transcript || "");
                    form.setValue("priority", priorityMap[data.priority] || "NORMAL");
                    
                    // Set assignee if provided
                    if (data.assigneeId) {
                      const assigneeExists = users.some((u) => u.id === data.assigneeId);
                      if (assigneeExists) {
                        form.setValue("assigneeId", data.assigneeId);
                        form.setValue("assigneeIds", [data.assigneeId]);
                      } else {
                        // ID bulunamadı, console'da logla (debug için)
                        console.warn("Assignee ID not found in users list:", data.assigneeId);
                      }
                    }
                    
                    // Debug: AI'dan gelen veriyi logla
                    console.log("AI Response:", {
                      title: data.title,
                      priority: data.priority,
                      assigneeId: data.assigneeId,
                      dueDate: data.dueDate,
                      description: data.description,
                    });

                    // Set due date if provided
                    if (data.dueDate) {
                      // Convert ISO string to date input format (YYYY-MM-DD)
                      const date = new Date(data.dueDate);
                      if (!isNaN(date.getTime())) {
                        const dateString = date.toISOString().split("T")[0];
                        form.setValue("dueDate", dateString);
                      }
                    }

                    toast({
                      title: "Form Dolduruldu",
                      description: "AI tarafından dolduruldu. Lütfen kontrol edip kaydedin.",
                      variant: "success",
                    });
                  }}
                  disabled={isLoading || isDeleting}
                />
              </div>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Task title" 
                  {...field}
                />
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

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="assigneeIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to People</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-11 border-border/50 bg-white text-slate-900 hover:bg-white hover:border-border focus-visible:ring-2 focus-visible:ring-ring/20"
                      >
                        <div className="flex flex-wrap gap-1 flex-1 text-left">
                          {assigneeIds.length === 0 ? (
                            <span className="text-slate-400 font-medium">Select people...</span>
                          ) : (
                            assigneeIds.map((userId) => {
                              const user = assignableUsers.find((u) => u.id === userId) || users.find((u) => u.id === userId);
                              if (!user) return null;
                              const displayRole = user.customRole ? user.customRole.name : (user.role ? user.role.toLowerCase() : "");
                              return (
                                <Badge
                                  key={userId}
                                  variant="secondary"
                                  className="mr-1 bg-secondary text-secondary-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAssignee(userId);
                                  }}
                                  title={displayRole ? `${user.name || user.email} (${displayRole})` : user.name || user.email}
                                >
                                  {user.name || user.email}
                                  {displayRole && <span className="ml-1 text-xs opacity-75">({displayRole})</span>}
                                  <X className="ml-1 h-3 w-3" />
                                </Badge>
                              );
                            })
                          )}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-1 bg-white border-border/50 rounded-xl shadow-lg" 
                    align="start"
                    sideOffset={4}
                  >
                    <div className="max-h-64 overflow-y-auto">
                      {assignableUsers.length === 0 ? (
                        <p className="text-sm text-slate-500 p-2">No users available</p>
                      ) : (
                        <div className="space-y-0.5">
                          {assignableUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-slate-900"
                              onClick={() => toggleAssignee(user.id)}
                            >
                              <Checkbox
                                id={`assignee-${user.id}`}
                                checked={assigneeIds.includes(user.id)}
                                onCheckedChange={() => toggleAssignee(user.id)}
                                className="border-slate-300"
                              />
                              <label
                                htmlFor={`assignee-${user.id}`}
                                className="text-sm leading-none cursor-pointer flex-1 text-slate-900"
                              >
                                {user.name || user.email}
                                {user.customRole ? (
                                  <span className="text-slate-500 ml-1">
                                    ({user.customRole.name})
                                  </span>
                                ) : user.role ? (
                                  <span className="text-slate-500 ml-1">
                                    ({user.role.toLowerCase()})
                                  </span>
                                ) : null}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
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
                      // Clear assigneeIds when assigning to a role
                      if (value !== "none") {
                        form.setValue("assigneeIds", []);
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
                    <SelectItem key="none" value="none">No role assignment</SelectItem>
                    <SelectItem key={UserRole.CAPTAIN} value={UserRole.CAPTAIN}>Captain</SelectItem>
                    <SelectItem key={UserRole.CREW} value={UserRole.CREW}>Crew</SelectItem>
                    {loadingRoles ? (
                      <SelectItem key="loading" value="loading" disabled>
                        Loading roles...
                      </SelectItem>
                    ) : (
                      Array.isArray(customRoles) && customRoles.length > 0 && (
                        <>
                          {customRoles.map((role) => {
                            console.log("Rendering custom role:", role);
                            return (
                              <SelectItem key={`custom_${role.id}`} value={`custom_${role.id}`}>
                                {role.name}
                              </SelectItem>
                            );
                          })}
                        </>
                      )
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
                  <SelectItem key="none" value="none">No trip</SelectItem>
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value || "GENERAL"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="REPAIR">Repair</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || "NORMAL"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="NORMAL" value="NORMAL">Normal</SelectItem>
                    <SelectItem key="HIGH" value="HIGH">High</SelectItem>
                    <SelectItem key="URGENT" value="URGENT">Urgent</SelectItem>
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
        </div>

        {showMaintenanceFields && (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="serviceProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Provider (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Service provider name" 
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
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Cost (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : parseFloat(value));
                        }}
                        className="flex-1"
                      />
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field: currencyField }) => (
                          <Select
                            onValueChange={currencyField.onChange}
                            defaultValue={currencyField.value || "EUR"}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[100px]">
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
                        )}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="space-y-2">
          <FormLabel>Photo (optional)</FormLabel>
          <Input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const fileName = file.name.toLowerCase();
                const validExtensions = ['.jpg', '.jpeg', '.png'];
                const isValid = validExtensions.some(ext => fileName.endsWith(ext));
                if (!isValid) {
                  alert('Only JPG, JPEG, and PNG images are allowed.');
                  e.target.value = '';
                  setPhotoFile(null);
                  return;
                }
                setPhotoFile(file);
              } else {
                setPhotoFile(null);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Only JPG, JPEG, and PNG formats are supported
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || isDeleting || !task?.id}
              className="sm:mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
          <Button type="submit" disabled={isLoading || isDeleting}>
            {isLoading ? "Saving..." : task?.id ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


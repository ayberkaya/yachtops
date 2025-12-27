"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TaskStatus, TaskPriority, UserRole } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Pencil, Check, LayoutGrid, CheckCircle2, User, Ship, Calendar, Clock, Trash2, ChevronDown } from "lucide-react";
import { TaskForm } from "./task-form";
import { TaskCompletionDialog } from "./task-completion-dialog";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { hasPermission } from "@/lib/permissions";
import { SessionUser } from "@/lib/auth-utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  cost: number | null;
  currency: string | null;
  serviceProvider: string | null;
  dueDate: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  assigneeRole: UserRole | null;
  completedBy: { id: string; name: string | null; email: string } | null;
  completedAt: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  trip: { id: string; name: string } | null;
}

interface GroupedTask {
  task: Task;
  assignees: Array<{ id: string; name: string | null; email: string }>;
  roles: UserRole[];
  allTaskIds: string[];
}

interface TaskListProps {
  initialTasks: Task[];
  users: { id: string; name: string | null; email: string }[];
  trips: { id: string; name: string }[];
  currentUser: SessionUser;
  currentTab: string;
  currentStatus: string;
  currentAssigneeId: string | null;
  currentDateFrom: string | null;
  currentDateTo: string | null;
}

type ViewMode = "table" | "cards";
export function TaskList({ 
  initialTasks, 
  users, 
  trips, 
  currentUser,
  currentTab,
  currentStatus,
  currentAssigneeId,
  currentDateFrom,
  currentDateTo,
}: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Update tasks when initialTasks changes (from server refresh)
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Helper function to update URL search params
  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    router.push(`/dashboard/tasks?${params.toString()}`);
  };

  const handleTabChange = (tab: string) => {
    updateSearchParams({ tab });
  };

  const handleStatusFilterChange = (status: string) => {
    updateSearchParams({ status: status === "all" ? null : status });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    updateSearchParams({ assigneeId: assigneeId === "all" ? null : assigneeId });
  };

  const handleDateFromChange = (dateFrom: string) => {
    updateSearchParams({ dateFrom: dateFrom || null });
  };

  const handleDateToChange = (dateTo: string) => {
    updateSearchParams({ dateTo: dateTo || null });
  };

  const handleApplyFilters = () => {
    setFiltersOpen(false);
    // Filters are already applied via URL params, just close the panel
    router.refresh();
  };

  const canManage = currentUser.role !== "CREW";
  
  // Filter out OWNER, SUPER_ADMIN, and ADMIN from crew member selection
  const crewMembers = users.filter((user: any) => {
    const role = String(user.role || "").toUpperCase().trim();
    return role !== "OWNER" && role !== "SUPER_ADMIN" && role !== "ADMIN";
  });

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, "default" | "secondary" | "outline"> = {
      [TaskStatus.TODO]: "outline",
      [TaskStatus.DONE]: "default",
    };

    return (
      <Badge variant={variants[status]} className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
        {status === TaskStatus.DONE ? "Completed" : "To-Do"}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: TaskPriority | string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      LOW: "outline",
      MEDIUM: "secondary",
      HIGH: "default",
      URGENT: "destructive",
    };

    const priorityStr = typeof priority === "string" ? priority : priority;
    const isUrgent = priorityStr === "URGENT";
    const isMedium = priorityStr === "MEDIUM";
    const isHigh = priorityStr === "HIGH";
    
    return (
      <Badge 
        variant={variants[priorityStr] || "secondary"}
        className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 ${isUrgent ? "urgent-blink" : isMedium ? "bg-amber-200 text-[#2b303b]" : ""}`}
        style={
          isUrgent 
            ? { animation: "blinkRed 1s ease-in-out infinite" } 
            : isHigh
            ? { borderImage: "none", borderColor: "rgba(0, 0, 0, 0.14)" }
            : undefined
        }
      >
        {priorityStr}
      </Badge>
    );
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t))
        );
        
        // Track task completion
        if (newStatus === TaskStatus.DONE) {
          const { trackAction } = await import("@/lib/usage-tracking");
          trackAction("task.complete", { taskId });
        }
        
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Unable to delete task. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("An error occurred while deleting the task");
    }
  };

  const handleCompleteTask = async (
    taskId: string,
    photoFile?: File | null,
    note?: string
  ) => {
    try {
      // First, update task status to DONE
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: TaskStatus.DONE }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      const updatedTask = await response.json();

      // If photo provided, upload as attachment
      if (photoFile) {
        try {
          const toDataUrl = (file: File) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (err) => reject(err);
              reader.readAsDataURL(file);
            });

          const fileUrl = await toDataUrl(photoFile);
          await fetch(`/api/tasks/${taskId}/attachments`, {
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
          console.error("Photo upload failed", uploadErr);
        }
      }

      // If note provided, add as comment
      if (note && note.trim()) {
        try {
          await fetch(`/api/tasks/${taskId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: note }),
          });
        } catch (commentErr) {
          console.error("Comment creation failed", commentErr);
        }
      }

      // Refresh task data
      const refreshResponse = await fetch(`/api/tasks/${taskId}`);
      if (refreshResponse.ok) {
        const refreshedTask = await refreshResponse.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? refreshedTask : t))
        );
      } else {
        // Fallback to updated task
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t))
        );
      }

      router.refresh();
    } catch (error) {
      console.error("Error completing task:", error);
      throw error;
    }
  };

  // Group tasks by their core properties (same task with different assignees)
  // Note: Filtering is now done server-side, so we just group the tasks we receive
  const groupTasks = useMemo(() => {
    const taskGroups = new Map<string, GroupedTask>();
    
    tasks.forEach((task) => {
      // Create a group key based on task properties (excluding assignee)
      const groupKey = JSON.stringify({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        tripId: task.trip?.id || null,
        type: task.type,
        priority: task.priority,
        status: task.status,
        createdById: task.createdBy?.id || null,
        cost: task.cost,
        currency: task.currency,
        serviceProvider: task.serviceProvider,
      });
      
      if (taskGroups.has(groupKey)) {
        const group = taskGroups.get(groupKey)!;
        // Add assignee if not already present
        if (task.assignee && !group.assignees.some(a => a.id === task.assignee!.id)) {
          group.assignees.push(task.assignee);
        }
        // Add role if not already present
        if (task.assigneeRole && !group.roles.includes(task.assigneeRole)) {
          group.roles.push(task.assigneeRole);
        }
        // Add task ID
        if (!group.allTaskIds.includes(task.id)) {
          group.allTaskIds.push(task.id);
        }
        // Update task if this one is more recent or has different status
        if (task.status !== group.task.status || 
            (task.completedAt && (!group.task.completedAt || new Date(task.completedAt) > new Date(group.task.completedAt)))) {
          group.task = task;
        }
      } else {
        taskGroups.set(groupKey, {
          task,
          assignees: task.assignee ? [task.assignee] : [],
          roles: task.assigneeRole ? [task.assigneeRole] : [],
          allTaskIds: [task.id],
        });
      }
    });
    
    return Array.from(taskGroups.values());
  }, [tasks]);

  // Separate active and completed tasks
  const { activeTasks, completedTasks } = useMemo(() => {
    const active = groupTasks.filter((g) => g.task.status !== TaskStatus.DONE);
    const completed = groupTasks.filter((g) => g.task.status === TaskStatus.DONE);
    return { activeTasks: active, completedTasks: completed };
  }, [groupTasks]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setEditingTask(null)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
            className={viewMode === "cards" ? "bg-primary text-primary-foreground border-primary shadow-sm" : ""}
          >
            {viewMode === "table" ? (
              <>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Cards
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Table
              </>
            )}
          </Button>
          <div className="relative">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger>
                <Button variant="outline" size="sm">
                  Filters
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute right-0 mt-2 w-[calc(100vw-3rem)] md:w-[min(600px,calc(100vw-4rem))] max-w-[calc(100vw-3rem)] rounded-xl border bg-white dark:bg-background p-3 shadow-lg flex flex-wrap items-start gap-3 z-50 overflow-auto">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <Select value={currentStatus || "all"} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all" value="all">All Statuses</SelectItem>
                    <SelectItem key={TaskStatus.TODO} value={TaskStatus.TODO}>To-Do</SelectItem>
                    <SelectItem key={TaskStatus.DONE} value={TaskStatus.DONE}>Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Assignee</span>
                <Select value={currentAssigneeId || "all"} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all" value="all">All assignees</SelectItem>
                    <SelectItem key="unassigned" value="unassigned">Unassigned</SelectItem>
                    {crewMembers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Start date</span>
                <Input
                  type="date"
                  value={currentDateFrom || ""}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="h-11 w-[170px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">End date</span>
                <Input
                  type="date"
                  value={currentDateTo || ""}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="h-11 w-[170px]"
                />
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white h-11"
                onClick={handleApplyFilters}
              >
                Apply
              </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
        </TabsList>
        <TabsContent value={currentTab} className="mt-4">
          {groupTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No tasks match your current filters.</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or create a new task.</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="space-y-6">
          {/* Active Tasks Section */}
          {activeTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTasks.map((groupedTask) => {
                  const task = groupedTask.task;
                  const canComplete = !canManage && 
                    (groupedTask.assignees.some(a => a.id === currentUser.id) || 
                     groupedTask.roles.includes(currentUser.role)) &&
                    task.status !== TaskStatus.DONE;
            const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;

            const isTodo = task.status === TaskStatus.TODO;
            const isDone = task.status === TaskStatus.DONE;
            const isUrgent = String(task.priority) === "URGENT";
            const isHighPriority = task.priority === TaskPriority.HIGH;
            const isLowPriority = task.priority === TaskPriority.LOW;
            
            // Determine card border color
            let cardBorderColor: string | undefined;
            let clockIconColor: string | undefined;
            
            if (isDone) {
              cardBorderColor = "rgba(34, 197, 94, 1)";
            } else if (isUrgent) {
              cardBorderColor = "rgba(231, 0, 11, 1)";
            } else if (isHighPriority) {
              cardBorderColor = "rgba(255, 102, 0, 1)";
            } else if (isLowPriority) {
              cardBorderColor = "rgba(92, 92, 92, 1)";
            } else if (isTodo) {
              cardBorderColor = "rgba(254, 230, 133, 1)";
            }
            
            // Clock icon color matches border color
            if (isTodo) {
              clockIconColor = cardBorderColor;
            }
            
            const isClickable = isTodo && !canManage;
            const isExpanded = expandedTasks.has(task.id);
            
            return (
              <div
                key={task.id}
                onClick={() => {
                  if (isClickable) {
                    setSelectedTask(task);
                    setIsCompletionDialogOpen(true);
                  }
                }}
                className={isClickable ? "cursor-pointer" : ""}
              >
              <Collapsible open={isExpanded} onOpenChange={(open) => {
                setExpandedTasks(prev => {
                  const newSet = new Set(prev);
                  if (open) {
                    newSet.add(task.id);
                  } else {
                    newSet.delete(task.id);
                  }
                  return newSet;
                });
              }}>
              <Card 
                className={`flex flex-col relative pt-[11px] pb-[11px] px-3 md:p-6 gap-0 ${
                  isDone
                    ? "border-2"
                    : isUrgent
                    ? "border-2 border-red-600 dark:border-red-600"
                    : isHighPriority
                    ? "border-2"
                    : isLowPriority
                    ? "border-2"
                    : isTodo 
                    ? "border-2 border-amber-200 dark:border-amber-200 bg-amber-50/30 dark:bg-amber-950/20" 
                    : ""
                }`}
                style={
                  isDone
                    ? {
                        borderColor: "rgba(34, 197, 94, 1)",
                        backgroundColor: "rgba(34, 197, 94, 0.2)",
                        backdropFilter: "none"
                      }
                    : isUrgent
                    ? {
                        borderColor: "rgba(231, 0, 11, 1)",
                        backgroundColor: "rgba(231, 0, 11, 0.2)",
                        backdropFilter: "none"
                      }
                    : isHighPriority
                    ? {
                        borderColor: "rgba(255, 102, 0, 1)",
                        backgroundColor: "rgba(255, 102, 0, 0.2)",
                        backdropFilter: "none"
                      }
                    : isLowPriority
                    ? {
                        borderColor: "rgba(92, 92, 92, 1)",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        backdropFilter: "none"
                      }
                    : isTodo
                    ? {
                        borderColor: "rgba(254, 230, 133, 1)",
                        backgroundColor: "rgba(254, 230, 133, 0.2)",
                        backdropFilter: "none"
                      }
                    : undefined
                }
              >
                {isDone && (
                  <div className="absolute -top-[11px] -right-[11px] z-10 flex items-center justify-center w-6 h-6 bg-white dark:bg-background rounded-full border-2 border-green-500">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                )}
                {isTodo && (
                  <div className="absolute -top-[11px] -right-[11px] z-10">
                    <div 
                      className="flex items-center justify-center w-6 h-6 bg-white dark:bg-background rounded-full border-2"
                      style={{ borderColor: clockIconColor }}
                    >
                      <Clock 
                        className="h-5 w-5" 
                        style={{ color: clockIconColor }}
                      />
                    </div>
                  </div>
                )}
                <CollapsibleTrigger>
                  <CardHeader className="pb-2 md:pb-3 px-0 pt-0 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg -mx-3 md:-mx-6 px-3 md:px-6">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        {isClickable ? (
                          <span className="hover:underline">{task.title}</span>
                        ) : (
                          <span className="hover:underline">{task.title}</span>
                        )}
                      </CardTitle>
                      <div className="flex flex-col items-end gap-1 md:gap-2 flex-shrink-0">
                        {!isDone && getPriorityBadge(task.priority)}
                        {isDone && getStatusBadge(task.status)}
                      </div>
                    </div>
                    {task.description && (
                      <CardDescription className="line-clamp-2 mt-1 md:mt-2 text-xs md:text-sm">
                        {task.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                <CardContent className="flex-1 space-y-1 md:space-y-2 text-xs md:text-sm px-0 pb-0">
                  {task.createdBy && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-[10px] md:text-xs">
                        Created by <span className="font-bold">{task.createdBy.name || task.createdBy.email}</span>
                      </span>
                    </p>
                  )}
                  {(groupedTask.assignees.length > 0 || groupedTask.roles.length > 0) ? (
                    <div className="flex flex-col gap-1">
                      {groupedTask.assignees.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {groupedTask.assignees.map((assignee, idx) => (
                              <span key={assignee.id} className="truncate font-bold text-xs md:text-sm">
                                {assignee.name || assignee.email}{idx < groupedTask.assignees.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {groupedTask.roles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {groupedTask.roles.map((role, idx) => (
                              <span key={role} className="truncate font-bold text-xs md:text-sm">
                                {role}{idx < groupedTask.roles.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate text-xs md:text-sm">Unassigned</span>
                    </p>
                  )}
                  {task.trip && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <Ship className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate">{task.trip.name}</span>
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </p>
                  )}
                  {task.completedBy && (
                    <div className="flex items-center gap-1.5 md:gap-2 pt-1.5 md:pt-2 border-t mt-1.5 md:mt-2">
                      <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        Completed by <span className="font-bold">{task.completedBy.name || task.completedBy.email}</span>
                        {task.completedAt && ` on ${format(new Date(task.completedAt), "MMM d, yyyy")}`}
                      </span>
                    </div>
                  )}
                </CardContent>
                <div className="p-1 flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                    {canUncomplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, TaskStatus.TODO);
                        }}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {(task.createdBy && task.createdBy.id === currentUser.id) || 
                     hasPermission(currentUser, "tasks.delete", currentUser.permissions) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-9 md:w-9 flex-shrink-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(groupedTask.allTaskIds[0]);
                        }}
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    ) : null}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-9 md:w-9 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                </CollapsibleContent>
              </Card>
              </Collapsible>
              </div>
            );
          })}
              </div>
            </div>
          )}

          {/* Completed Tasks Section */}
          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Completed</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedTasks.map((groupedTask) => {
                  const task = groupedTask.task;
                  const canComplete = !canManage && 
                    (groupedTask.assignees.some(a => a.id === currentUser.id) || 
                     groupedTask.roles.includes(currentUser.role)) &&
                    task.status !== TaskStatus.DONE;
                  const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;

            const isTodo = task.status === TaskStatus.TODO;
            const isDone = task.status === TaskStatus.DONE;
            const isUrgent = String(task.priority) === "URGENT";
            const isHighPriority = task.priority === TaskPriority.HIGH;
            const isLowPriority = task.priority === TaskPriority.LOW;
            
            // Determine card border color
            let cardBorderColor: string | undefined;
            let clockIconColor: string | undefined;
            
            if (isDone) {
              cardBorderColor = "rgba(34, 197, 94, 1)";
            } else if (isUrgent) {
              cardBorderColor = "rgba(231, 0, 11, 1)";
            } else if (isHighPriority) {
              cardBorderColor = "rgba(255, 102, 0, 1)";
            } else if (isLowPriority) {
              cardBorderColor = "rgba(92, 92, 92, 1)";
            } else if (isTodo) {
              cardBorderColor = "rgba(254, 230, 133, 1)";
            }
            
            // Clock icon color matches border color
            if (isTodo) {
              clockIconColor = cardBorderColor;
            }
            
            const isClickable = isTodo && !canManage;
            const isExpanded = expandedTasks.has(task.id);
            
            return (
              <div
                key={task.id}
                onClick={() => {
                  if (isClickable) {
                    setSelectedTask(task);
                    setIsCompletionDialogOpen(true);
                  }
                }}
                className={isClickable ? "cursor-pointer" : ""}
              >
              <Collapsible open={isExpanded} onOpenChange={(open) => {
                setExpandedTasks(prev => {
                  const newSet = new Set(prev);
                  if (open) {
                    newSet.add(task.id);
                  } else {
                    newSet.delete(task.id);
                  }
                  return newSet;
                });
              }}>
              <Card 
                className={`flex flex-col relative pt-[11px] pb-[11px] px-3 md:p-6 gap-0 ${
                  isDone
                    ? "border-2"
                    : isUrgent
                    ? "border-2 border-red-600 dark:border-red-600"
                    : isHighPriority
                    ? "border-2"
                    : isLowPriority
                    ? "border-2"
                    : isTodo 
                    ? "border-2 border-amber-200 dark:border-amber-200 bg-amber-50/30 dark:bg-amber-950/20" 
                    : ""
                }`}
                style={
                  isDone
                    ? {
                        borderColor: "rgba(34, 197, 94, 1)",
                        backgroundColor: "rgba(34, 197, 94, 0.2)",
                        backdropFilter: "none"
                      }
                    : isUrgent
                    ? {
                        borderColor: "rgba(231, 0, 11, 1)",
                        backgroundColor: "rgba(231, 0, 11, 0.2)",
                        backdropFilter: "none"
                      }
                    : isHighPriority
                    ? {
                        borderColor: "rgba(255, 102, 0, 1)",
                        backgroundColor: "rgba(255, 102, 0, 0.2)",
                        backdropFilter: "none"
                      }
                    : isLowPriority
                    ? {
                        borderColor: "rgba(92, 92, 92, 1)",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        backdropFilter: "none"
                      }
                    : isTodo
                    ? {
                        borderColor: "rgba(254, 230, 133, 1)",
                        backgroundColor: "rgba(254, 230, 133, 0.2)",
                        backdropFilter: "none"
                      }
                    : undefined
                }
              >
                {isDone && (
                  <div className="absolute -top-[11px] -right-[11px] z-10 flex items-center justify-center w-6 h-6 bg-white dark:bg-background rounded-full border-2 border-green-500">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                )}
                {isTodo && (
                  <div className="absolute -top-[11px] -right-[11px] z-10">
                    <div 
                      className="flex items-center justify-center w-6 h-6 bg-white dark:bg-background rounded-full border-2"
                      style={{ borderColor: clockIconColor }}
                    >
                      <Clock 
                        className="h-5 w-5" 
                        style={{ color: clockIconColor }}
                      />
                    </div>
                  </div>
                )}
                <CollapsibleTrigger>
                  <CardHeader className="pb-2 md:pb-3 px-0 pt-0 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg -mx-3 md:-mx-6 px-3 md:px-6">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        {isClickable ? (
                          <span className="hover:underline">{task.title}</span>
                        ) : (
                          <span className="hover:underline">{task.title}</span>
                        )}
                      </CardTitle>
                      <div className="flex flex-col items-end gap-1 md:gap-2 flex-shrink-0">
                        {!isDone && getPriorityBadge(task.priority)}
                        {isDone && getStatusBadge(task.status)}
                      </div>
                    </div>
                    {task.description && (
                      <CardDescription className="line-clamp-2 mt-1 md:mt-2 text-xs md:text-sm">
                        {task.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                <CardContent className="flex-1 space-y-1 md:space-y-2 text-xs md:text-sm px-0 pb-0">
                  {task.createdBy && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-[10px] md:text-xs">
                        Created by <span className="font-bold">{task.createdBy.name || task.createdBy.email}</span>
                      </span>
                    </p>
                  )}
                  {(groupedTask.assignees.length > 0 || groupedTask.roles.length > 0) ? (
                    <div className="flex flex-col gap-1">
                      {groupedTask.assignees.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {groupedTask.assignees.map((assignee, idx) => (
                              <span key={assignee.id} className="truncate font-bold text-xs md:text-sm">
                                {assignee.name || assignee.email}{idx < groupedTask.assignees.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {groupedTask.roles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {groupedTask.roles.map((role, idx) => (
                              <span key={role} className="truncate font-bold text-xs md:text-sm">
                                {role}{idx < groupedTask.roles.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate text-xs md:text-sm">Unassigned</span>
                    </p>
                  )}
                  {task.trip && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <Ship className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate">{task.trip.name}</span>
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </p>
                  )}
                  {task.completedBy && (
                    <div className="flex items-center gap-1.5 md:gap-2 pt-1.5 md:pt-2 border-t mt-1.5 md:mt-2">
                      <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        Completed by <span className="font-bold">{task.completedBy.name || task.completedBy.email}</span>
                        {task.completedAt && ` on ${format(new Date(task.completedAt), "MMM d, yyyy")}`}
                      </span>
                    </div>
                  )}
                </CardContent>
                <div className="p-1 flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                    {canUncomplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, TaskStatus.TODO);
                        }}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {(task.createdBy && task.createdBy.id === currentUser.id) || 
                     hasPermission(currentUser, "tasks.delete", currentUser.permissions) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-9 md:w-9 flex-shrink-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(groupedTask.allTaskIds[0]);
                        }}
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    ) : null}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-9 md:w-9 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                </CollapsibleContent>
              </Card>
              </Collapsible>
              </div>
            );
          })}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="space-y-6">
          {/* Active Tasks Table */}
          {activeTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTasks.map((groupedTask) => {
                        const task = groupedTask.task;
                        const canComplete = !canManage && 
                          (groupedTask.assignees.some(a => a.id === currentUser.id) || 
                           groupedTask.roles.includes(currentUser.role)) &&
                          task.status !== TaskStatus.DONE;
                        const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;
                        
                        const isTodo = task.status === TaskStatus.TODO;
                        
                        return (
                          <TableRow 
                            key={groupedTask.allTaskIds[0]}
                            className={`${isTodo ? "bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-400 dark:border-l-amber-500" : ""} cursor-pointer hover:bg-zinc-50/80`}
                            onClick={(e) => {
                              // Don't navigate if clicking on buttons or interactive elements
                              const target = e.target as HTMLElement;
                              if (target.closest('button') || target.closest('select') || target.closest('a')) {
                                return;
                              }
                              router.push(`/dashboard/tasks/${task.id}`);
                            }}
                          >
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>
                              {getPriorityBadge(task.priority)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {groupedTask.assignees.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {groupedTask.assignees.map((assignee, idx) => (
                                      <span key={assignee.id} className="text-sm">
                                        {assignee.name || assignee.email}{idx < groupedTask.assignees.length - 1 ? "," : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {groupedTask.roles.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {groupedTask.roles.map((role, idx) => (
                                      <span key={role} className="text-sm font-medium">
                                        {role}{idx < groupedTask.roles.length - 1 ? "," : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {groupedTask.assignees.length === 0 && groupedTask.roles.length === 0 && (
                                  <span className="text-sm text-muted-foreground">Unassigned</span>
                                )}
                              </div>
                            </TableCell>
                      <TableCell>{task.trip?.name || "-"}</TableCell>
                      <TableCell>
                        {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                          >
                            <SelectTrigger 
                              className="w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key={TaskStatus.TODO} value={TaskStatus.TODO}>To-Do</SelectItem>
                              <SelectItem key={TaskStatus.DONE} value={TaskStatus.DONE}>Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(task.status)}
                            {canComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, TaskStatus.DONE);
                                }}
                                className="h-7"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                            {canUncomplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, TaskStatus.TODO);
                                }}
                                className="h-7"
                              >
                                Undo
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.completedBy ? (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {task.completedBy.name || task.completedBy.email}
                            </span>
                            {task.completedAt && (
                              <span className="text-xs text-muted-foreground">
                                ({format(new Date(task.completedAt), "MMM d")})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(task.createdBy && task.createdBy.id === currentUser.id) || 
                           hasPermission(currentUser, "tasks.delete", currentUser.permissions) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Completed Tasks Table */}
          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Completed</h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTasks.map((groupedTask) => {
                        const task = groupedTask.task;
                        const canComplete = !canManage && 
                          (groupedTask.assignees.some(a => a.id === currentUser.id) || 
                           groupedTask.roles.includes(currentUser.role)) &&
                          task.status !== TaskStatus.DONE;
                        const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;
                        
                        const isTodo = task.status === TaskStatus.TODO;
                        
                        return (
                          <TableRow 
                            key={groupedTask.allTaskIds[0]}
                            className={`${isTodo ? "bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-400 dark:border-l-amber-500" : ""} cursor-pointer hover:bg-zinc-50/80`}
                            onClick={(e) => {
                              // Don't navigate if clicking on buttons or interactive elements
                              const target = e.target as HTMLElement;
                              if (target.closest('button') || target.closest('select') || target.closest('a')) {
                                return;
                              }
                              router.push(`/dashboard/tasks/${task.id}`);
                            }}
                          >
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>
                              {getPriorityBadge(task.priority)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {groupedTask.assignees.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {groupedTask.assignees.map((assignee, idx) => (
                                      <span key={assignee.id} className="text-sm">
                                        {assignee.name || assignee.email}{idx < groupedTask.assignees.length - 1 ? "," : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {groupedTask.roles.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {groupedTask.roles.map((role, idx) => (
                                      <span key={role} className="text-sm font-medium">
                                        {role}{idx < groupedTask.roles.length - 1 ? "," : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {groupedTask.assignees.length === 0 && groupedTask.roles.length === 0 && (
                                  <span className="text-sm text-muted-foreground">Unassigned</span>
                                )}
                              </div>
                            </TableCell>
                      <TableCell>{task.trip?.name || "-"}</TableCell>
                      <TableCell>
                        {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                          >
                            <SelectTrigger 
                              className="w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key={TaskStatus.TODO} value={TaskStatus.TODO}>To-Do</SelectItem>
                              <SelectItem key={TaskStatus.DONE} value={TaskStatus.DONE}>Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(task.status)}
                            {canComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, TaskStatus.DONE);
                                }}
                                className="h-7"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                            {canUncomplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, TaskStatus.TODO);
                                }}
                                className="h-7"
                              >
                                Undo
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.completedBy ? (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {task.completedBy.name || task.completedBy.email}
                            </span>
                            {task.completedAt && (
                              <span className="text-xs text-muted-foreground">
                                ({format(new Date(task.completedAt), "MMM d")})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(task.createdBy && task.createdBy.id === currentUser.id) || 
                           hasPermission(currentUser, "tasks.delete", currentUser.permissions) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details" : "Create a new task"}
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            users={users}
            trips={trips}
            onSuccess={(createdTask) => {
              setIsDialogOpen(false);
              if (createdTask && !editingTask) {
                // New task created - add to state
                setTasks((prev) => [createdTask, ...prev]);
              } else if (createdTask && editingTask) {
                // Task updated - update in state
                setTasks((prev) =>
                  prev.map((t) => (t.id === createdTask.id ? createdTask : t))
                );
              } else {
                // Fallback to refresh
                router.refresh();
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskCompletionDialog
          task={selectedTask}
          open={isCompletionDialogOpen}
          onOpenChange={setIsCompletionDialogOpen}
          onComplete={handleCompleteTask}
        />
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

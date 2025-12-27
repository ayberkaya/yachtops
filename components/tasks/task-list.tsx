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
import { Plus, Pencil, Check, LayoutGrid, CheckCircle2, User, Ship, Calendar, Clock, Trash2 } from "lucide-react";
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

interface TaskListProps {
  initialTasks: Task[];
  users: { id: string; name: string | null; email: string }[];
  trips: { id: string; name: string }[];
  currentUser: SessionUser;
}

type ViewMode = "table" | "cards";
export function TaskList({ initialTasks, users, trips, currentUser }: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tabParam = searchParams.get("tab");
    return tabParam && ["all", "general", "maintenance", "repairs"].includes(tabParam) ? tabParam : "all";
  });
  const groupBy = "none";

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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Tab filtering
      if (activeTab === "general" && t.type !== "GENERAL") return false;
      if (activeTab === "maintenance" && t.type !== "MAINTENANCE" && t.type !== "INSPECTION") return false;
      if (activeTab === "repairs" && t.type !== "REPAIR") return false;
      
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (assigneeFilter === "unassigned" && t.assignee) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && t.assignee?.id !== assigneeFilter) return false;

      if (dateFrom) {
        const d = t.dueDate ? new Date(t.dueDate) : null;
        if (!d || d < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const d = t.dueDate ? new Date(t.dueDate) : null;
        if (!d || d > new Date(dateTo)) return false;
      }
      return true;
    });
  }, [tasks, activeTab, statusFilter, assigneeFilter, dateFrom, dateTo]);

  // Separate active and completed tasks
  const { activeTasks, completedTasks } = useMemo(() => {
    const active = filteredTasks.filter((t) => t.status !== TaskStatus.DONE);
    const completed = filteredTasks.filter((t) => t.status === TaskStatus.DONE);
    return { activeTasks: active, completedTasks: completed };
  }, [filteredTasks]);

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
              <CollapsibleContent className="absolute left-0 mt-2 w-[min(900px,100vw)] max-w-[calc(100vw-2rem)] rounded-xl border bg-white p-3 shadow-lg flex flex-wrap items-start gap-3 z-20">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
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
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-11 w-[170px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">End date</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-11 w-[170px]"
                />
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white h-11"
                onClick={() => {
                  setFiltersOpen(false);
                  router.refresh();
                }}
              >
                Apply
              </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {filteredTasks.length === 0 ? (
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
                {activeTasks.map((task) => {
            const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
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
                <CardHeader className="pb-2 md:pb-3 px-0 pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base md:text-lg">
                      {isClickable ? (
                        <span className="hover:underline cursor-pointer">{task.title}</span>
                      ) : (
                        <Link href={`/dashboard/tasks/${task.id}`} className="hover:underline">
                          {task.title}
                        </Link>
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
                <CardContent className="flex-1 space-y-1 md:space-y-2 text-xs md:text-sm px-0 pb-0">
                  {task.createdBy && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-[10px] md:text-xs">
                        Created by <span className="font-bold">{task.createdBy.name || task.createdBy.email}</span>
                      </span>
                    </p>
                  )}
                  {task.assignee ? (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate font-bold">{task.assignee.name || task.assignee.email}</span>
                    </p>
                  ) : task.assigneeRole ? (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate font-bold">{task.assigneeRole}</span>
                    </p>
                  ) : null}
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
                          handleDeleteTask(task.id);
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
              </Card>
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
                {completedTasks.map((task) => {
            const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
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
                <CardHeader className="pb-2 md:pb-3 px-0 pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base md:text-lg">
                      {isClickable ? (
                        <span className="hover:underline cursor-pointer">{task.title}</span>
                      ) : (
                        <Link href={`/dashboard/tasks/${task.id}`} className="hover:underline">
                          {task.title}
                        </Link>
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
                <CardContent className="flex-1 space-y-1 md:space-y-2 text-xs md:text-sm px-0 pb-0">
                  {task.createdBy && (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-[10px] md:text-xs">
                        Created by <span className="font-bold">{task.createdBy.name || task.createdBy.email}</span>
                      </span>
                    </p>
                  )}
                  {task.assignee ? (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate font-bold">{task.assignee.name || task.assignee.email}</span>
                    </p>
                  ) : task.assigneeRole ? (
                    <p className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate font-bold">{task.assigneeRole}</span>
                    </p>
                  ) : null}
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
                          handleDeleteTask(task.id);
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
              </Card>
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
                      {activeTasks.map((task) => {
                  const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
              task.status !== TaskStatus.DONE;
                  const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;
                  
                  const isTodo = task.status === TaskStatus.TODO;
                  
                  return (
                    <TableRow 
                      key={task.id}
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
                        {task.assignee
                          ? task.assignee.name || task.assignee.email
                          : task.assigneeRole
                          ? task.assigneeRole
                          : "Unassigned"}
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
                      {completedTasks.map((task) => {
                  const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
              task.status !== TaskStatus.DONE;
                  const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;
                  
                  const isTodo = task.status === TaskStatus.TODO;
                  
                  return (
                    <TableRow 
                      key={task.id}
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
                        {task.assignee
                          ? task.assignee.name || task.assignee.email
                          : task.assigneeRole
                          ? task.assigneeRole
                          : "Unassigned"}
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

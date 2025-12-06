"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Pencil, Check, LayoutGrid, CheckCircle2 } from "lucide-react";
import { TaskForm } from "./task-form";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  assigneeRole: UserRole | null;
  completedBy: { id: string; name: string | null; email: string } | null;
  completedAt: string | null;
  trip: { id: string; name: string } | null;
}

interface TaskListProps {
  initialTasks: Task[];
  users: { id: string; name: string | null; email: string }[];
  trips: { id: string; name: string }[];
  currentUser: { id: string; role: UserRole };
}

type ViewMode = "table" | "cards";
export function TaskList({ initialTasks, users, trips, currentUser }: TaskListProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const canManage = currentUser.role !== "CREW";

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, "default" | "secondary" | "outline"> = {
      [TaskStatus.TODO]: "outline",
      [TaskStatus.IN_PROGRESS]: "secondary",
      [TaskStatus.DONE]: "default",
    };

    return (
      <Badge variant={variants[status]}>
        {status.replace("_", " ")}
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
    
    return (
      <Badge 
        variant={variants[priorityStr] || "secondary"}
        className={isUrgent ? "urgent-blink" : ""}
        style={isUrgent ? { animation: "blinkRed 1s ease-in-out infinite" } : undefined}
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
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
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
  }, [tasks, statusFilter, assigneeFilter, dateFrom, dateTo]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    return { All: filteredTasks };
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
        </div>
        <div className="relative">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Filters
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="absolute right-0 mt-2 w-[min(900px,100vw)] max-w-[calc(100vw-2rem)] rounded-xl border bg-white p-3 shadow-lg flex flex-wrap items-end gap-3 z-20">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[170px]"
                placeholder="Start date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[170px]"
                placeholder="End date"
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tasks found
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
            <div key={groupKey}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupTasks.map((task) => {
            const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
              task.status !== TaskStatus.DONE;
            const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;

            const isTodo = task.status === TaskStatus.TODO;
            
            return (
              <Card 
                key={task.id} 
                className={`flex flex-col ${
                  isTodo 
                    ? "border-2 border-amber-400 dark:border-amber-500 bg-amber-50/30 dark:bg-amber-950/20" 
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      <Link href={`/dashboard/tasks/${task.id}`} className="hover:underline">
                        {task.title}
                      </Link>
                    </CardTitle>
                    <div className="flex flex-col items-end gap-2">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>
                  </div>
                  {task.description && (
                    <CardDescription className="line-clamp-2 mt-2">
                      {task.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm">
                  {task.assignee ? (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {task.assignee.name || task.assignee.email}
                    </p>
                  ) : task.assigneeRole ? (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {task.assigneeRole}
                    </p>
                  ) : null}
                  {task.trip && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Ship className="h-4 w-4" />
                      {task.trip.name}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </p>
                  )}
                  {task.completedBy && (
                    <div className="flex items-center gap-2 pt-2 border-t mt-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">
                        Completed by {task.completedBy.name || task.completedBy.email}
                        {task.completedAt && ` on ${format(new Date(task.completedAt), "MMM d, yyyy")}`}
                      </span>
                    </div>
                  )}
                </CardContent>
                <div className="p-4 border-t flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {canComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, TaskStatus.DONE)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    )}
                    {canUncomplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, TaskStatus.TODO)}
                      >
                        Undo
                      </Button>
                    )}
                    {canManage && (
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                          <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                          <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingTask(task);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "table" ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
            <div key={groupKey}>
              {groupBy !== "none" && (
                <h3 className="text-lg font-semibold mb-3">
                  {groupKey}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({groupTasks.length} {groupTasks.length === 1 ? "task" : "tasks"})
                  </span>
                </h3>
              )}
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
                      {groupTasks.map((task) => {
                  const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
              task.status !== TaskStatus.DONE;
                  const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;
                  
                  const isTodo = task.status === TaskStatus.TODO;
                  
                  return (
                    <TableRow 
                      key={task.id}
                      className={isTodo ? "bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-400 dark:border-l-amber-500" : ""}
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
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                              <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                              <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(task.status)}
                            {canComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(task.id, TaskStatus.DONE)}
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
                                onClick={() => handleStatusChange(task.id, TaskStatus.TODO)}
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
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTask(task);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ))}
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
            onSuccess={() => {
              setIsDialogOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

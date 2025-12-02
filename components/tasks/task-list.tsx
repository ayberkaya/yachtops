"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { TaskStatus, UserRole } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Pencil, Check, List, LayoutGrid, Calendar, User, Ship, CheckCircle2 } from "lucide-react";
import { TaskForm } from "./task-form";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
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

export function TaskList({ initialTasks, users, trips, currentUser }: TaskListProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

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

  const filteredTasks = statusFilter === "all" 
    ? tasks 
    : tasks.filter(t => t.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTask(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </DialogTrigger>
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
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
          >
            {viewMode === "table" ? <LayoutGrid className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
            {viewMode === "table" ? "Card View" : "Table View"}
          </Button>
        </div>
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
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tasks found
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
              task.status !== TaskStatus.DONE;
            const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;

            return (
              <Card key={task.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    {getStatusBadge(task.status)}
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const canComplete = !canManage && 
              (!task.assignee || task.assignee.id === currentUser.id) && 
              (!task.assigneeRole || task.assigneeRole === currentUser.role) &&
              task.status !== TaskStatus.DONE;
                  const canUncomplete = !canManage && task.status === TaskStatus.DONE && task.completedBy?.id === currentUser.id;
                  
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
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
      )}
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  customRole: {
    id: string;
    name: string;
  } | null;
}

interface CompletedTask {
  id: string;
  title: string;
  description: string | null;
  completedAt: string;
  completedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  assignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  trip: {
    id: string;
    name: string;
  } | null;
}

interface PerformanceViewProps {
  allUsers: User[];
  currentUser: {
    id: string;
    role: string;
  };
  canManage: boolean;
}

export function PerformanceView({ allUsers, currentUser, canManage }: PerformanceViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    canManage ? (allUsers[0]?.id || currentUser.id) : currentUser.id
  );
  const [startDate, setStartDate] = useState<string>(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [tasksByDate, setTasksByDate] = useState<Record<string, CompletedTask[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedUserId, startDate, endDate]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUserId) params.append("userId", selectedUserId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/performance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setTasksByDate(data.tasksByDate || {});
      }
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = allUsers.find((u) => u.id === selectedUserId) || {
    id: currentUser.id,
    name: null,
    email: "",
    role: currentUser.role,
  };

  const sortedDates = Object.keys(tasksByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {canManage && (
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((user) => {
                      const displayRole = user.customRole ? user.customRole.name : user.role.toLowerCase();
                      return (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email} ({displayRole})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            Performance Summary - {selectedUser.name || selectedUser.email}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Completed</p>
              <p className="text-2xl font-bold">{tasks.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Days with Tasks</p>
              <p className="text-2xl font-bold">{sortedDates.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average per Day</p>
              <p className="text-2xl font-bold">
                {sortedDates.length > 0
                  ? (tasks.length / sortedDates.length).toFixed(1)
                  : "0"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Date */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading performance data...
          </CardContent>
        </Card>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No completed tasks found for the selected period.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dateTasks = tasksByDate[date];
            return (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{format(new Date(date), "EEEE, MMMM d, yyyy")}</span>
                    <Badge variant="secondary">
                      {dateTasks.length} task{dateTasks.length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead>Completed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              {task.title}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.assignee?.name || task.assignee?.email || "Unassigned"}
                          </TableCell>
                          <TableCell>{task.trip?.name || "-"}</TableCell>
                          <TableCell>
                            {format(new Date(task.completedAt), "HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


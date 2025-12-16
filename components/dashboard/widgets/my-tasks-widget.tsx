"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface MyTasksWidgetProps {
  tasks?: any[];
}

export const MyTasksWidget = memo(function MyTasksWidget({ tasks = [] }: MyTasksWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-600" />
              My Tasks
            </CardTitle>
            <CardDescription>Tasks assigned to you</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/tasks">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No tasks assigned to you
            <div className="text-xs">All caught up!</div>
          </div>
        ) : (
          tasks.slice(0, 5).map((task: any) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between rounded-md border p-3 ${
                  isOverdue ? "border-red-300 bg-red-50/50 dark:bg-red-950/20" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{task.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {task.trip?.name ? `Trip: ${task.trip.name} • ` : ""}
                    {task.status?.replace("_", " ").toLowerCase()}
                    {task.dueDate && ` • Due ${format(new Date(task.dueDate), "MMM d")}`}
                  </div>
                </div>
                {isOverdue && (
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 ml-2" />
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});


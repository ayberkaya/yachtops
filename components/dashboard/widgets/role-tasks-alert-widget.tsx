"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface RoleTasksAlertWidgetProps {
  tasks?: any[];
}

export function RoleTasksAlertWidget({ tasks = [] }: RoleTasksAlertWidgetProps) {
  if (tasks.length === 0) {
    return null; // Don't show if no tasks
  }

  return (
    <Card className="border-red-500 bg-red-50/80 dark:bg-red-950/40 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <CardTitle className="text-red-900 dark:text-red-100 text-lg font-bold">
                Tasks Requiring Your Attention
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300 font-medium">
                {tasks.length} task{tasks.length > 1 ? "s" : ""} {tasks.length === 1 ? "needs" : "need"} your review or action
              </CardDescription>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="border-red-300 hover:bg-red-100 dark:hover:bg-red-900">
            <Link href="/dashboard/tasks">View All Tasks</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task: any) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 rounded-md ${
                  isOverdue
                    ? "bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700"
                    : "bg-white/70 dark:bg-slate-800/70 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Bell className={`h-5 w-5 ${isOverdue ? "text-red-700 dark:text-red-300" : "text-red-600 dark:text-red-400"}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-red-900 dark:text-red-100">{task.title}</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      {task.trip?.name || "General"} • {task.status?.replace("_", " ").toLowerCase()}
                      {task.dueDate && ` • Due ${format(new Date(task.dueDate), "MMM d, yyyy")}`}
                    </p>
                  </div>
                </div>
                {isOverdue && (
                  <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-800 px-2 py-1 rounded">
                    OVERDUE
                  </span>
                )}
              </div>
            );
          })}
          {tasks.length > 5 && (
            <div className="text-center pt-2">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                +{tasks.length - 5} more task{tasks.length - 5 > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


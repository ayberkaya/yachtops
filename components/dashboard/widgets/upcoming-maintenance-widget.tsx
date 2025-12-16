"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Wrench, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface UpcomingMaintenanceWidgetProps {
  maintenance?: any[];
}

export const UpcomingMaintenanceWidget = memo(function UpcomingMaintenanceWidget({ maintenance = [] }: UpcomingMaintenanceWidgetProps) {
  if (maintenance.length === 0) {
    return null; // Don't show if no maintenance
  }

  return (
    <Card className="border-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div>
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Upcoming Maintenance
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                {maintenance.length} maintenance item{maintenance.length > 1 ? "s" : ""} due within 30 days
              </CardDescription>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/maintenance">View Maintenance</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {maintenance.slice(0, 5).map((maint: any) => {
            const dueDate = new Date(maint.nextDueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntilDue = differenceInDays(dueDate, today);

            return (
              <div
                key={maint.id}
                className="flex items-center justify-between p-2 rounded-md bg-white/50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-sm">{maint.title}</span>
                  {maint.component && (
                    <span className="text-xs text-muted-foreground">({maint.component})</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Due {format(new Date(maint.nextDueDate), "MMM d, yyyy")} ({daysUntilDue} days)
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});


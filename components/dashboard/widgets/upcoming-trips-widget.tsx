"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface UpcomingTripsWidgetProps {
  trips?: any[];
}

export const UpcomingTripsWidget = memo(function UpcomingTripsWidget({ trips = [] }: UpcomingTripsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Trips
            </CardTitle>
            <CardDescription>Scheduled trips</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/trips">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {trips.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No upcoming trips scheduled
            <div className="text-xs">Create a trip to see it here</div>
          </div>
        ) : (
          trips.slice(0, 5).map((trip: any) => (
            <div key={trip.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-semibold text-sm">{trip.name}</div>
                <div className="text-xs text-muted-foreground">
                  {trip.startDate ? `Starts ${format(new Date(trip.startDate), "MMM d, yyyy")}` : "No start date"}
                  {trip.departurePort && ` • ${trip.departurePort}`}
                </div>
              </div>
              {trip.status && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {trip.status}
                </span>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
});


"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { format, isToday, isAfter, startOfDay, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  startDate: string;
  endDate: string;
  color?: string | null;
  trip?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
};

interface CalendarEventsWidgetProps {
  events?: CalendarEvent[];
}

const categoryLabels: Record<string, string> = {
  VOYAGE: "Voyage",
  MARINA: "Marina",
  OVERSEAS: "Overseas",
  FUEL_SUPPLY: "Fuel Supply",
  OTHER: "Other",
};

export const CalendarEventsWidget = memo(function CalendarEventsWidget({
  events = [],
}: CalendarEventsWidgetProps) {
  const now = new Date();
  const todayStart = startOfDay(now);

  // Filter today's events
  const todayEvents = events.filter((event) => {
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    return (
      (isToday(start) || isToday(end)) ||
      (start <= todayStart && end >= todayStart)
    );
  });

  // Filter upcoming events (after today)
  const upcomingEvents = events
    .filter((event) => {
      const start = parseISO(event.startDate);
      return isAfter(start, todayStart) && !isToday(start);
    })
    .sort((a, b) => {
      const dateA = parseISO(a.startDate);
      const dateB = parseISO(b.startDate);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Calendar
            </CardTitle>
            <CardDescription>Upcoming and today's events</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/trips/calendar">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Today</span>
            </div>
            <div className="space-y-2">
              {todayEvents.slice(0, 3).map((event) => {
                const start = parseISO(event.startDate);
                const end = parseISO(event.endDate);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        backgroundColor: event.color || "#6b7280",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(start, "HH:mm", { locale: enUS })}
                        {!isToday(end) && ` - ${format(end, "d MMM HH:mm", { locale: enUS })}`}
                      </div>
                      {event.trip && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {event.trip.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {todayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{todayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Upcoming</span>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const start = parseISO(event.startDate);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        backgroundColor: event.color || "#6b7280",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(start, "d MMM yyyy, HH:mm", { locale: enUS })}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[event.category] || "Other"}
                        </Badge>
                        {event.trip && (
                          <Badge variant="secondary" className="text-xs">
                            {event.trip.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {todayEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No upcoming or today's events
            <div className="text-xs mt-1">You can add new events from the calendar</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});


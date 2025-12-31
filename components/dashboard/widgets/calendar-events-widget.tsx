"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { format, isToday, isAfter, startOfDay, parseISO, addDays, isSameDay } from "date-fns";
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
  const [selectedDate, setSelectedDate] = useState<Date>(todayStart);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // Generate days list: selected day in center, 1 before, 1 after (total 3 visible)
  // Plus more days for scrolling
  const daysToShow = 7;
  const daysBefore = Math.floor(daysToShow / 2);
  const daysAfter = daysToShow - daysBefore - 1;
  
  const daysList = Array.from({ length: daysToShow }, (_, i) => 
    addDays(todayStart, i - daysBefore)
  );
  
  // Get 3 days to show: selected day in center, 1 before, 1 after
  const selectedIndex = daysList.findIndex(day => isSameDay(day, selectedDate));
  const validSelectedIndex = selectedIndex >= 0 ? selectedIndex : Math.floor(daysList.length / 2);

  // Check if a day has events
  const getDayEvents = (date: Date) => {
    return events.filter((event) => {
      const start = startOfDay(parseISO(event.startDate));
      const end = startOfDay(parseISO(event.endDate));
      const dayStart = startOfDay(date);
      return (
        isSameDay(start, dayStart) ||
        isSameDay(end, dayStart) ||
        (start <= dayStart && end >= dayStart)
      );
    });
  };

  // Get events for selected day
  const selectedDayEvents = getDayEvents(selectedDate);

  // Scroll selected day to center when it changes
  useEffect(() => {
    if (selectedDayRef.current && scrollContainerRef.current) {
      selectedDayRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedDate]);

  // Filter upcoming events (after selected day)
  const upcomingEvents = events
    .filter((event) => {
      const start = parseISO(event.startDate);
      const selectedDayEnd = startOfDay(addDays(selectedDate, 1));
      return isAfter(start, selectedDayEnd);
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
        {/* Scrollable 3-Day View - Selected day in center */}
        <div className="mb-4">
          <div 
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1"
          >
            {daysList.map((day, index) => {
              const dayEvents = getDayEvents(day);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={`day-${day.getTime()}`}
                  ref={isSelected ? selectedDayRef : null}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative rounded-lg border-2 text-center transition-all hover:border-primary/50 flex-shrink-0 snap-center",
                    "w-[calc(33.333%-0.333rem)] min-w-[calc(33.333%-0.333rem)]",
                    isSelected
                      ? "border-primary border-[3px] bg-primary/10 shadow-lg scale-110 p-3.5 z-10"
                      : "border-muted bg-card p-2.5",
                    isTodayDate && !isSelected && "border-primary/30",
                    !isSelected && "opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "font-medium mb-1",
                      isSelected ? "text-primary font-bold text-xs" : "text-muted-foreground text-[10px]"
                    )}
                  >
                    {format(day, "EEE", { locale: enUS })}
                  </div>
                  <div
                    className={cn(
                      "font-bold mb-1",
                      isSelected ? "text-primary text-2xl" : "text-foreground text-lg"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div
                    className={cn(
                      "font-medium",
                      isSelected ? "text-primary text-xs" : "text-muted-foreground text-[10px]"
                    )}
                  >
                    {format(day, "MMM", { locale: enUS })}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <div className={cn(
                        "rounded-full",
                        isSelected ? "h-2 w-2 bg-primary" : "h-1.5 w-1.5 bg-primary/60"
                      )} />
                    </div>
                  )}
                  {dayEvents.length > 0 && (
                    <div className={cn(
                      "mt-1.5 leading-tight",
                      isSelected ? "text-primary font-semibold text-xs" : "text-muted-foreground text-[10px]"
                    )}>
                      {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Events */}
        {selectedDayEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {isToday(selectedDate)
                  ? "Today"
                  : format(selectedDate, "EEEE, MMMM d", { locale: enUS })}
              </span>
            </div>
            <div className="space-y-2">
              {selectedDayEvents.slice(0, 3).map((event) => {
                const start = parseISO(event.startDate);
                const end = parseISO(event.endDate);
                return (
                  <Link
                    key={event.id}
                    href={`/dashboard/trips/calendar/${event.id}`}
                    className="flex items-start gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors cursor-pointer"
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
                        {!isSameDay(end, selectedDate) &&
                          ` - ${format(end, "d MMM HH:mm", { locale: enUS })}`}
                      </div>
                      {event.trip && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {event.trip.name}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
              {selectedDayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{selectedDayEvents.length - 3} more
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
                  <Link
                    key={event.id}
                    href={`/dashboard/trips/calendar/${event.id}`}
                    className="flex items-start gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors cursor-pointer"
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
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {selectedDayEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No events scheduled
            <div className="text-xs mt-1">You can add new events from the calendar</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});


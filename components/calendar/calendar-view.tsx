"use client";

import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths, addDays, subDays, isToday, isSameDay, startOfDay, endOfDay, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CalendarEventCategory } from "@prisma/client";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  category: CalendarEventCategory;
  startDate: string;
  endDate: string;
  tripId?: string | null;
  color?: string | null;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  trip?: {
    id: string;
    name: string;
    code: string | null;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type Trip = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
};

interface CalendarViewProps {
  initialEvents: CalendarEvent[];
  trips: Trip[];
  canEdit: boolean;
  currentUser: {
    id: string;
    name: string | null;
    email: string;
  };
}

const categoryLabels: Record<CalendarEventCategory, string> = {
  VOYAGE: "Voyage",
  MARINA: "Marina",
  OVERSEAS: "Overseas",
  FUEL_SUPPLY: "Fuel Supply",
  OTHER: "Other",
};

const categoryColors: Record<CalendarEventCategory, string> = {
  VOYAGE: "#3b82f6", // blue
  MARINA: "#f59e0b", // amber
  OVERSEAS: "#10b981", // green
  FUEL_SUPPLY: "#ef4444", // red
  OTHER: "#6b7280", // gray
};

export function CalendarView({ initialEvents, trips, canEdit, currentUser }: CalendarViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // When switching to day view, set selectedDate to today if not set
  useEffect(() => {
    if (viewMode === "day" && !selectedDate) {
      setSelectedDate(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: CalendarEventCategory;
    startDate: string;
    endDate: string;
    tripId: string;
    color: string;
  }>({
    title: "",
    description: "",
    category: CalendarEventCategory.OTHER,
    startDate: "",
    endDate: "",
    tripId: "none",
    color: "",
  });

  // Fetch events
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ data: CalendarEvent[] }>("/api/calendar");
      if (response.status === 200) {
        setEvents(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    if (viewMode === "day" && selectedDate) {
      return [selectedDate];
    }
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth, viewMode, selectedDate]);

  // Group events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      const days = eachDayOfInterval({ start, end });
      days.forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        if (!grouped[key]) {
          grouped[key] = [];
        }
        if (!grouped[key].find((e) => e.id === event.id)) {
          grouped[key].push(event);
        }
      });
    });
    return grouped;
  }, [events]);

  // Get events that start on a specific date (for multi-day event display)
  const getEventsStartingOnDate = (date: Date): CalendarEvent[] => {
    const key = format(date, "yyyy-MM-dd");
    return events.filter((event) => {
      const start = parseISO(event.startDate);
      const startKey = format(start, "yyyy-MM-dd");
      return startKey === key;
    });
  };

  // Get events for a specific date (legacy, for day view)
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const key = format(date, "yyyy-MM-dd");
    return eventsByDate[key] || [];
  };

  // Get event segments per row (for multi-row events)
  const getEventSegments = (event: CalendarEvent, calendarDays: Date[]) => {
    const eventStart = parseISO(event.startDate);
    const eventEnd = parseISO(event.endDate);
    const segments: Array<{ row: number; startCol: number; spanDays: number }> = [];
    
    // Group calendar days into rows (7 days per row)
    const rows: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    
    rows.forEach((rowDays, rowIndex) => {
      let rowStartCol = -1;
      let rowEndCol = -1;
      
      rowDays.forEach((day, colIndex) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const eventStartKey = format(eventStart, "yyyy-MM-dd");
        const eventEndKey = format(eventEnd, "yyyy-MM-dd");
        
        if (dayKey >= eventStartKey && dayKey <= eventEndKey) {
          if (rowStartCol === -1) {
            rowStartCol = colIndex;
          }
          rowEndCol = colIndex;
        }
      });
      
      if (rowStartCol !== -1 && rowEndCol !== -1) {
        segments.push({
          row: rowIndex,
          startCol: rowStartCol,
          spanDays: rowEndCol - rowStartCol + 1,
        });
      }
    });
    
    return segments;
  };

  const handleDateClick = (date: Date) => {
    if (viewMode === "month") {
      setSelectedDate(date);
      setViewMode("day");
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      category: event.category,
      startDate: format(parseISO(event.startDate), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(parseISO(event.endDate), "yyyy-MM-dd'T'HH:mm"),
      tripId: event.tripId || "none",
      color: event.color || categoryColors[event.category],
    });
    setIsDialogOpen(true);
  };

  const handleCreateEvent = (date?: Date) => {
    const targetDate = date || selectedDate || new Date();
    setEditingEvent(null);
    setSelectedDateForNew(targetDate);
    setFormData({
      title: "",
      description: "",
      category: CalendarEventCategory.OTHER,
      startDate: format(targetDate, "yyyy-MM-dd'T'HH:mm"),
      endDate: format(targetDate, "yyyy-MM-dd'T'HH:mm"),
      tripId: "none",
      color: categoryColors[CalendarEventCategory.OTHER],
    });
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) return;

    try {
      setIsLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        tripId: formData.tripId === "none" ? null : formData.tripId || null,
        color: formData.color || categoryColors[formData.category],
      };

      if (editingEvent) {
        const response = await apiClient.patch(`/api/calendar/${editingEvent.id}`, payload);
        if (response.status === 200) {
          await fetchEvents();
          setIsDialogOpen(false);
          setEditingEvent(null);
        }
      } else {
        const response = await apiClient.post("/api/calendar", payload);
        if (response.status === 200 || response.status === 201) {
          await fetchEvents();
          setIsDialogOpen(false);
        }
      }
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    try {
      setIsLoading(true);
      const response = await apiClient.delete(`/api/calendar/${editingEvent.id}`);
      if (response.status === 200 || response.status === 204) {
        await fetchEvents();
        setIsDialogOpen(false);
        setEditingEvent(null);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Calculate multi-day event segments with row positioning
  const multiDayEventSegments = useMemo(() => {
    // Collect all multi-day event segments
    const allSegments: Array<{
      event: CalendarEvent;
      segment: { row: number; startCol: number; spanDays: number };
    }> = [];

    events.forEach((event) => {
      const eventStart = parseISO(event.startDate);
      const eventEnd = parseISO(event.endDate);
      const startKey = format(eventStart, "yyyy-MM-dd");
      const endKey = format(eventEnd, "yyyy-MM-dd");
      const daysDiff = Math.ceil(
        (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only process multi-day events
      if (startKey === endKey || daysDiff < 1) return;

      const segments = getEventSegments(event, calendarDays);
      segments.forEach((segment) => {
        allSegments.push({ event, segment });
      });
    });

    // Group segments by row and calculate vertical positions
    const segmentsByRow: Record<
      number,
      Array<{
        event: CalendarEvent;
        segment: { row: number; startCol: number; spanDays: number };
        rowIndex: number;
      }>
    > = {};

    allSegments.forEach((item) => {
      if (!segmentsByRow[item.segment.row]) {
        segmentsByRow[item.segment.row] = [];
      }
      segmentsByRow[item.segment.row].push({
        ...item,
        rowIndex: 0, // Will be calculated
      });
    });

    // Calculate row indices for overlapping events
    Object.keys(segmentsByRow).forEach((rowKey) => {
      const rowSegments = segmentsByRow[Number(rowKey)];
      // Sort by start column
      rowSegments.sort((a, b) => a.segment.startCol - b.segment.startCol);

      // Assign row indices to avoid overlaps
      rowSegments.forEach((seg, idx) => {
        // Find the lowest available row index
        let rowIndex = 0;
        const occupiedRows = new Set<number>();

        // Check for overlaps with previous segments
        for (let i = 0; i < idx; i++) {
          const prevSeg = rowSegments[i];
          // Check if segments overlap
          const overlap =
            seg.segment.startCol < prevSeg.segment.startCol + prevSeg.segment.spanDays &&
            seg.segment.startCol + seg.segment.spanDays > prevSeg.segment.startCol;

          if (overlap) {
            occupiedRows.add(prevSeg.rowIndex);
          }
        }

        // Find first available row index
        while (occupiedRows.has(rowIndex)) {
          rowIndex++;
        }

        seg.rowIndex = rowIndex;
      });
    });

    return allSegments.map((item) => {
      const rowIndex = segmentsByRow[item.segment.row].find(
        (s) => s.event.id === item.event.id && s.segment.startCol === item.segment.startCol
      )?.rowIndex || 0;

      return {
        ...item,
        rowIndex,
      };
    });
  }, [events, calendarDays]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-lg font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: enUS })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {viewMode === "day" && selectedDate && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewMode("month");
                    setSelectedDate(null);
                  }}
                >
                  Monthly View
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button onClick={() => handleCreateEvent()}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "month" ? (
            <>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 relative">
                {/* Multi-day events as continuous bars (split by rows) */}
                {multiDayEventSegments.map((item) => {
                  // Calculate row height dynamically
                  const rowHeight = `calc(100px + 0.25rem)`; // min-h-[100px] + gap
                  const dayNumberHeight = 24; // Space for day number
                  const eventHeight = 24; // Height of each event bar
                  const eventGap = 2; // Gap between stacked events

                  // Calculate position and width for this segment
                  const cellWidth = `calc((100% - 6 * 0.25rem) / 7)`; // 7 columns with 6 gaps
                  const leftOffset = `calc(${item.segment.startCol} * (${cellWidth} + 0.25rem))`;
                  const width = `calc(${item.segment.spanDays} * ${cellWidth} + ${item.segment.spanDays - 1} * 0.25rem)`;
                  const topOffset = `calc(${item.segment.row} * ${rowHeight} + ${dayNumberHeight}px + ${item.rowIndex * (eventHeight + eventGap)}px)`;

                  return (
                    <div
                      key={`span-${item.event.id}-${item.segment.row}-${item.segment.startCol}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: leftOffset,
                        width: width,
                        top: topOffset,
                        zIndex: 10,
                      }}
                    >
                      <div
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded cursor-pointer mx-0.5",
                          "hover:opacity-80 pointer-events-auto truncate"
                        )}
                        style={{
                          backgroundColor: item.event.color || categoryColors[item.event.category],
                          color: "white",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(item.event);
                        }}
                        title={item.event.title}
                      >
                        {item.event.title}
                      </div>
                    </div>
                  );
                })}

                {/* Calendar days */}
                {calendarDays.map((day, idx) => {
                  // Get all events for this day (for fallback display)
                  const allDayEvents = getEventsForDate(day);
                  // Get events that start on this day
                  const dayEvents = getEventsStartingOnDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isCurrentDay = isToday(day);

                  // Show all events that start on this day
                  // Multi-day events are also shown here as fallback if span rendering fails
                  const eventsToShow = dayEvents.length > 0 ? dayEvents : allDayEvents.slice(0, 3);

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "min-h-[100px] border rounded-lg p-2 cursor-pointer transition-colors relative",
                        !isCurrentMonth && "bg-muted/30 opacity-50",
                        isCurrentDay && "ring-2 ring-primary",
                        "hover:bg-muted/50"
                      )}
                      onClick={() => handleDateClick(day)}
                    >
                      <div
                        className={cn(
                          "text-sm font-medium mb-1",
                          isCurrentDay && "text-primary font-bold"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="space-y-1 mt-8">
                        {eventsToShow.slice(0, 3).map((event) => {
                          const eventStart = parseISO(event.startDate);
                          const eventEnd = parseISO(event.endDate);
                          const startKey = format(eventStart, "yyyy-MM-dd");
                          const endKey = format(eventEnd, "yyyy-MM-dd");
                          const isMultiDay = startKey !== endKey;
                          
                          // Skip if it's a multi-day event that should be shown as span
                          if (isMultiDay) return null;
                          
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer",
                                "hover:opacity-80"
                              )}
                              style={{
                                backgroundColor: event.color || categoryColors[event.category],
                                color: "white",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {eventsToShow.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{eventsToShow.length - 3} daha
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {(selectedDate || viewMode === "day") && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-semibold">
                      {format(selectedDate || new Date(), "d MMMM yyyy", { locale: enUS })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const date = selectedDate || new Date();
                          setSelectedDate(subDays(date, 1));
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const date = selectedDate || new Date();
                          setSelectedDate(addDays(date, 1));
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate || new Date()).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No events on this date
                      </div>
                    ) : (
                      getEventsForDate(selectedDate || new Date()).map((event) => (
                        <Card
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleEventClick(event)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div
                                className="w-4 h-4 rounded mt-1 flex-shrink-0"
                                style={{
                                  backgroundColor: event.color || categoryColors[event.category],
                                }}
                              />
                              <div className="flex-1">
                                <div className="font-semibold">{event.title}</div>
                                {event.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {event.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">
                                    {categoryLabels[event.category]}
                                  </Badge>
                                  {event.trip && (
                                    <Badge variant="secondary">{event.trip.name}</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {format(parseISO(event.startDate), "d MMM yyyy HH:mm", {
                                    locale: enUS,
                                  })}{" "}
                                  -{" "}
                                  {format(parseISO(event.endDate), "d MMM yyyy HH:mm", {
                                    locale: enUS,
                                  })}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "New Event"}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "Edit event information"
                : "Create a new calendar event"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="E.g., Departure from Ören, Arrival at Bozburun"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="E.g., Guest Mr. Murat and friends"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      category: v as CalendarEventCategory,
                      color: categoryColors[v as CalendarEventCategory],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {editingEvent && canEdit && (
                <Button variant="destructive" onClick={handleDeleteEvent} disabled={isLoading}>
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              {canEdit && (
                <Button onClick={handleSaveEvent} disabled={isLoading || !formData.title.trim()}>
                  Save
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


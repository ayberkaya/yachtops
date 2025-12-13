"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Shift = {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "MORNING" | "AFTERNOON" | "NIGHT" | "FULL_DAY" | "ON_CALL";
  notes?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

interface ShiftCalendarProps {
  shifts: Shift[];
  onDateClick?: (date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
}

const shiftTypeColors: Record<Shift["type"], string> = {
  MORNING: "bg-blue-100 text-blue-700 border-blue-200",
  AFTERNOON: "bg-yellow-100 text-yellow-700 border-yellow-200",
  NIGHT: "bg-purple-100 text-purple-700 border-purple-200",
  FULL_DAY: "bg-green-100 text-green-700 border-green-200",
  ON_CALL: "bg-orange-100 text-orange-700 border-orange-200",
};

const shiftTypeLabels: Record<Shift["type"], string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  NIGHT: "Night",
  FULL_DAY: "Full Day",
  ON_CALL: "On Call",
};

export function ShiftCalendar({ shifts, onDateClick, onShiftClick }: ShiftCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateShifts, setSelectedDateShifts] = useState<Shift[]>([]);

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date): Shift[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter((shift) => shift.date === dateStr);
  };

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group shifts by date for quick lookup
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, Shift[]> = {};
    shifts.forEach((shift) => {
      if (!grouped[shift.date]) {
        grouped[shift.date] = [];
      }
      grouped[shift.date].push(shift);
    });
    return grouped;
  }, [shifts]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayShifts = getShiftsForDate(date);
    setSelectedDateShifts(dayShifts);
    onDateClick?.(date);
  };

  const handleShiftClick = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    onShiftClick?.(shift);
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayShifts = shiftsByDate[format(day, "yyyy-MM-dd")] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const hasShifts = dayShifts.length > 0;

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[100px] border rounded-lg p-2 cursor-pointer transition-colors",
                    !isCurrentMonth && "opacity-40 bg-muted/30",
                    isCurrentDay && "ring-2 ring-primary",
                    hasShifts && "bg-accent/50 hover:bg-accent",
                    !hasShifts && "hover:bg-muted/50"
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
                  <div className="space-y-1">
                    {dayShifts.slice(0, 3).map((shift) => (
                      <Badge
                        key={shift.id}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 w-full justify-start cursor-pointer",
                          shiftTypeColors[shift.type]
                        )}
                        onClick={(e) => handleShiftClick(shift, e)}
                      >
                        <span className="truncate">
                          {shift.user.name || shift.user.email.split("@")[0]}: {shiftTypeLabels[shift.type]}
                        </span>
                      </Badge>
                    ))}
                    {dayShifts.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayShifts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Shift Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(shiftTypeLabels).map(([type, label]) => (
              <Badge
                key={type}
                className={cn("text-xs", shiftTypeColors[type as Shift["type"]])}
              >
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={selectedDate !== null} onOpenChange={(open) => {
        if (!open) setSelectedDate(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {selectedDateShifts.length === 0
                ? "No shifts scheduled for this day"
                : `${selectedDateShifts.length} shift${selectedDateShifts.length > 1 ? "s" : ""} scheduled`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedDateShifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No shifts scheduled for this day</p>
              </div>
            ) : (
              selectedDateShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    onShiftClick?.(shift);
                    setSelectedDate(null);
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {shift.user.name || shift.user.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(shift.startTime), "HH:mm")} -{" "}
                        {format(new Date(shift.endTime), "HH:mm")}
                      </span>
                    </div>
                    <Badge className={shiftTypeColors[shift.type]}>
                      {shiftTypeLabels[shift.type]}
                    </Badge>
                    {shift.notes && (
                      <span className="text-sm text-muted-foreground truncate max-w-xs">
                        {shift.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, CalendarDays, Plus } from "lucide-react";
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
import { LeaveType, LeaveStatus } from "@prisma/client";

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

type Leave = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason?: string | null;
  status: LeaveStatus;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

interface ShiftCalendarProps {
  shifts: Shift[];
  leaves?: Leave[];
  onDateClick?: (date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
  onLeaveClick?: (leave: Leave) => void;
  onAddShift?: (date: Date) => void;
  onAddLeave?: (date: Date) => void;
  canCreate?: boolean;
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

export function ShiftCalendar({ shifts, leaves = [], onDateClick, onShiftClick, onLeaveClick, onAddShift, onAddLeave, canCreate = false }: ShiftCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateShifts, setSelectedDateShifts] = useState<Shift[]>([]);
  const [selectedDateLeaves, setSelectedDateLeaves] = useState<Leave[]>([]);

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date): Shift[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter((shift) => shift.date === dateStr);
  };

  // Get leaves for a specific date
  // End date is exclusive - person returns to work on end date
  const getLeavesForDate = (date: Date): Leave[] => {
    const checkDateStr = format(date, "yyyy-MM-dd");
    const checkDate = new Date(checkDateStr + 'T00:00:00');
    
    return leaves.filter((leave) => {
      // Parse dates and normalize to local timezone at midnight
      const startDateStr = leave.startDate.split('T')[0]; // Get YYYY-MM-DD part
      const endDateStr = leave.endDate.split('T')[0]; // Get YYYY-MM-DD part
      
      const startDate = new Date(startDateStr + 'T00:00:00');
      const endDate = new Date(endDateStr + 'T00:00:00');
      
      // Start date inclusive, end date exclusive
      return checkDate >= startDate && checkDate < endDate;
    });
  };

  // Check if a date has any leave
  const hasLeaveOnDate = (date: Date): boolean => {
    return getLeavesForDate(date).length > 0;
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

  // Group leaves by date range for quick lookup
  // End date is exclusive - person returns to work on end date
  const leavesByDate = useMemo(() => {
    const grouped: Record<string, Leave[]> = {};
    leaves.forEach((leave) => {
      // Parse dates and normalize to local timezone at midnight
      const startDateStr = leave.startDate.split('T')[0]; // Get YYYY-MM-DD part
      const endDateStr = leave.endDate.split('T')[0]; // Get YYYY-MM-DD part
      
      const start = new Date(startDateStr + 'T00:00:00');
      const end = new Date(endDateStr + 'T00:00:00');
      
      // End date is exclusive, so we subtract 1 day to get the last day of leave
      const lastDayOfLeave = new Date(end);
      lastDayOfLeave.setDate(lastDayOfLeave.getDate() - 1);
      
      // Use eachDayOfInterval which includes both start and end dates
      // This will generate all days from start to lastDayOfLeave (inclusive)
      const days = eachDayOfInterval({ start, end: lastDayOfLeave });
      days.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        grouped[dateStr].push(leave);
      });
    });
    return grouped;
  }, [leaves]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayShifts = getShiftsForDate(date);
    const dayLeaves = getLeavesForDate(date);
    setSelectedDateShifts(dayShifts);
    setSelectedDateLeaves(dayLeaves);
    onDateClick?.(date);
  };

  const handleLeaveClick = (leave: Leave, e: React.MouseEvent) => {
    e.stopPropagation();
    onLeaveClick?.(leave);
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
              const dayLeaves = leavesByDate[format(day, "yyyy-MM-dd")] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const hasShifts = dayShifts.length > 0;
              const hasLeaves = dayLeaves.length > 0;
              const uniqueLeaves = Array.from(new Map(dayLeaves.map(l => [l.id, l])).values());

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[100px] border rounded-lg p-2 cursor-pointer transition-colors",
                    !isCurrentMonth && "opacity-40 bg-muted/30",
                    isCurrentDay && "ring-2 ring-primary",
                    hasLeaves && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                    hasShifts && !hasLeaves && "bg-accent/50 hover:bg-accent",
                    !hasShifts && !hasLeaves && "hover:bg-muted/50"
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
                    {uniqueLeaves.slice(0, 3).map((leave) => (
                      <Badge
                        key={leave.id}
                        className="text-[10px] px-1.5 py-0.5 w-full justify-start cursor-pointer bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                        onClick={(e) => handleLeaveClick(leave, e)}
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />
                        <span className="truncate">
                          {leave.user.name || leave.user.email.split("@")[0]}: Leave
                        </span>
                      </Badge>
                    ))}
                    {uniqueLeaves.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{uniqueLeaves.length - 3} more leave{uniqueLeaves.length - 3 !== 1 ? "s" : ""}
                      </div>
                    )}
                    {dayShifts.slice(0, hasLeaves ? Math.max(0, 3 - uniqueLeaves.length) : 3).map((shift) => (
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
                    {dayShifts.length > (hasLeaves ? Math.max(0, 3 - uniqueLeaves.length) : 3) && (
                      <div className="text-xs text-muted-foreground">
                        +{dayShifts.length - (hasLeaves ? Math.max(0, 3 - uniqueLeaves.length) : 3)} more shift{dayShifts.length - (hasLeaves ? Math.max(0, 3 - uniqueLeaves.length) : 3) !== 1 ? "s" : ""}
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
              {selectedDateShifts.length === 0 && selectedDateLeaves.length === 0
                ? "No shifts or leaves scheduled for this day"
                : `${selectedDateShifts.length} shift${selectedDateShifts.length !== 1 ? "s" : ""}${selectedDateShifts.length > 0 && selectedDateLeaves.length > 0 ? " and " : ""}${selectedDateLeaves.length > 0 ? `${selectedDateLeaves.length} leave${selectedDateLeaves.length !== 1 ? "s" : ""}` : ""} scheduled`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedDateShifts.length === 0 && selectedDateLeaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No shifts or leaves scheduled for this day</p>
              </div>
            ) : (
              <>
                {selectedDateLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                    onClick={() => {
                      onLeaveClick?.(leave);
                      setSelectedDate(null);
                    }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="font-medium">
                          {leave.user.name || leave.user.email}
                        </span>
                      </div>
                      <Badge className="bg-red-100 text-red-700 border-red-200">
                        {leave.type.replace("_", " ")}
                      </Badge>
                      <Badge variant={leave.status === "APPROVED" ? "default" : leave.status === "REJECTED" ? "destructive" : "secondary"}>
                        {leave.status}
                      </Badge>
                      {leave.reason && (
                        <span className="text-sm text-muted-foreground truncate max-w-xs">
                          {leave.reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {selectedDateShifts.map((shift) => (
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
                ))}
              </>
            )}
            {canCreate && selectedDate && (
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button 
                  onClick={() => {
                    onAddShift?.(selectedDate);
                    setSelectedDate(null);
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Shift
                </Button>
                <Button 
                  onClick={() => {
                    onAddLeave?.(selectedDate);
                    setSelectedDate(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Add Leave
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


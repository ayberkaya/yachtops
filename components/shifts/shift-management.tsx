"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, Plus, Edit, Trash2, Filter, LayoutGrid, List, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ShiftCalendar } from "./shift-calendar";
import { LeaveForm } from "./leave-form";
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

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

interface ShiftManagementProps {
  initialShifts: Shift[];
  initialLeaves?: Leave[];
  users: User[];
}

const shiftTypeLabels: Record<Shift["type"], string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  NIGHT: "Night",
  FULL_DAY: "Full Day",
  ON_CALL: "On Call",
};

const shiftTypeColors: Record<Shift["type"], string> = {
  MORNING: "bg-blue-100 text-blue-700 border-blue-200",
  AFTERNOON: "bg-yellow-100 text-yellow-700 border-yellow-200",
  NIGHT: "bg-purple-100 text-purple-700 border-purple-200",
  FULL_DAY: "bg-green-100 text-green-700 border-green-200",
  ON_CALL: "bg-orange-100 text-orange-700 border-orange-200",
};

type ViewMode = "list" | "calendar";

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

export function ShiftManagement({ initialShifts, initialLeaves = [], users }: ShiftManagementProps) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [leaves, setLeaves] = useState<Leave[]>(initialLeaves);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  // Filter out OWNER, SUPER_ADMIN, and ADMIN from crew member selection
  const crewMembers = users.filter((user) => {
    const role = String(user.role || "").toUpperCase().trim();
    return role !== "OWNER" && role !== "SUPER_ADMIN" && role !== "ADMIN";
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "MORNING" as Shift["type"],
    notes: "",
  });

  useEffect(() => {
    fetchShifts();
    fetchLeaves();
  }, [filterUserId, filterDate]);

  const fetchLeaves = async () => {
    try {
      const params = new URLSearchParams();
      if (filterUserId !== "all") {
        params.append("userId", filterUserId);
      }
      if (filterDate) {
        params.append("startDate", filterDate);
        const endDate = new Date(filterDate);
        endDate.setMonth(endDate.getMonth() + 1);
        params.append("endDate", endDate.toISOString().split("T")[0]);
      }

      const response = await fetch(`/api/leaves?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLeaves(data);
      }
    } catch (error) {
      console.error("Error fetching leaves:", error);
    }
  };

  const fetchShifts = async () => {
    try {
      const params = new URLSearchParams();
      if (filterUserId !== "all") {
        params.append("userId", filterUserId);
      }
      if (filterDate) {
        params.append("startDate", filterDate);
        const endDate = new Date(filterDate);
        endDate.setMonth(endDate.getMonth() + 1);
        params.append("endDate", endDate.toISOString().split("T")[0]);
      }

      const response = await fetch(`/api/shifts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setShifts(data);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const handleOpenDialog = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        userId: shift.userId,
        date: shift.date,
        startTime: shift.startTime.split("T")[0] + "T" + shift.startTime.split("T")[1].substring(0, 5),
        endTime: shift.endTime.split("T")[0] + "T" + shift.endTime.split("T")[1].substring(0, 5),
        type: shift.type,
        notes: shift.notes || "",
      });
    } else {
      setEditingShift(null);
      setFormData({
        userId: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        type: "MORNING",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingShift(null);
    setFormData({
      userId: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      type: "MORNING",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts";
      const method = editingShift ? "PATCH" : "POST";

      // Combine date with time
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: formData.userId,
          date: formData.date,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          type: formData.type,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        alert(editingShift ? "Shift updated successfully" : "Shift created successfully");
        handleCloseDialog();
        fetchShifts();
        fetchLeaves();
      } else {
        const error = await response.json();
        alert(error.error || "An error occurred");
      }
    } catch (error) {
      console.error("Error saving shift:", error);
      alert("An error occurred while saving the shift");
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) {
      return;
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Shift deleted successfully");
        fetchShifts();
        fetchLeaves();
      } else {
        const error = await response.json();
        alert(error.error || "An error occurred while deleting the shift");
      }
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert("An error occurred while deleting the shift");
    }
  };

  const filteredShifts = shifts.filter((shift) => {
    if (filterUserId !== "all" && shift.userId !== filterUserId) return false;
    if (filterDate && shift.date !== filterDate) return false;
    return true;
  });

  // Group shifts by date
  const groupedShifts = filteredShifts.reduce((acc, shift) => {
    const date = shift.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  const sortedDates = Object.keys(groupedShifts).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
          <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => {
                setEditingLeave(null);
                setIsLeaveDialogOpen(true);
              }}>
                <CalendarDays className="mr-2 h-4 w-4" />
                New Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLeave ? "Edit Leave" : "New Leave"}</DialogTitle>
                <DialogDescription>
                  {editingLeave ? "Update leave information" : "Create a new leave request"}
                </DialogDescription>
              </DialogHeader>
              <LeaveForm
                leave={editingLeave || undefined}
                users={users}
                onSuccess={() => {
                  setIsLeaveDialogOpen(false);
                  setEditingLeave(null);
                  fetchLeaves();
                }}
                onDelete={() => {
                  setIsLeaveDialogOpen(false);
                  setEditingLeave(null);
                  fetchLeaves();
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                New Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingShift ? "Edit Shift" : "New Shift"}</DialogTitle>
              <DialogDescription>
                {editingShift ? "Update shift information" : "Create a new shift"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Crew Member *</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select crew member" />
                    </SelectTrigger>
                    <SelectContent>
                      {crewMembers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Shift Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Shift["type"] })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(shiftTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Notes about the shift..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">{editingShift ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Card
            style={{
              height: filtersOpen ? "auto" : "56px",
            }}
            className="overflow-hidden"
          >
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors flex items-center h-full py-0">
              <CollapsibleTrigger className="w-full">
                <CardTitle className="text-lg flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </div>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Crew Member</Label>
                  <Select value={filterUserId} onValueChange={setFilterUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All crew members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Crew Members</SelectItem>
                      {crewMembers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    placeholder="Select date"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Shifts View */}
      {viewMode === "calendar" ? (
        <ShiftCalendar
          shifts={filteredShifts}
          leaves={leaves}
          onShiftClick={(shift) => handleOpenDialog(shift)}
          onLeaveClick={(leave) => {
            setEditingLeave(leave);
            setIsLeaveDialogOpen(true);
          }}
        />
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shift records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <Card key={date} className="p-2 gap-1">
              <CardHeader className="pb-0 pt-0 px-0">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(date), "d MMMM yyyy, EEEE")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pt-0 pb-0">
                <div className="space-y-1.5">
                  {groupedShifts[date].map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between py-1.5 px-2 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">{shift.user.name || shift.user.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(shift.startTime), "HH:mm")} - {format(new Date(shift.endTime), "HH:mm")}
                          </span>
                        </div>
                        <Badge className={shiftTypeColors[shift.type]}>
                          {shiftTypeLabels[shift.type]}
                        </Badge>
                        {shift.notes && (
                          <span className="text-xs text-muted-foreground truncate max-w-xs">{shift.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(shift)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(shift.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


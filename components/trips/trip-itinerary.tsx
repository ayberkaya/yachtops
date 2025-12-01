"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { format, addDays } from "date-fns";

interface ItineraryDay {
  id?: string;
  dayIndex: number;
  date: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  activities: string | null;
}

interface TripItineraryProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string | null;
  onSuccess: () => void;
}

export function TripItinerary({ tripId, tripStartDate, tripEndDate, onSuccess }: TripItineraryProps) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchItinerary();
  }, [tripId]);

  const fetchItinerary = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/itinerary`);
      if (response.ok) {
        const data = await response.json();
        setDays(data);
      }
    } catch (error) {
      console.error("Error fetching itinerary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDateForDay = (dayIndex: number): string => {
    const startDate = new Date(tripStartDate);
    const dayDate = addDays(startDate, dayIndex - 1);
    return dayDate.toISOString().split("T")[0];
  };

  const handleAddDay = () => {
    const newDayIndex = days.length > 0 ? Math.max(...days.map((d) => d.dayIndex)) + 1 : 1;
    const newDay: ItineraryDay = {
      dayIndex: newDayIndex,
      date: calculateDateForDay(newDayIndex),
      fromLocation: null,
      toLocation: null,
      activities: null,
    };
    setEditingDay(newDay);
  };

  const handleEditDay = (day: ItineraryDay) => {
    setEditingDay({ ...day });
  };

  const handleSaveDay = async () => {
    if (!editingDay) return;

    setIsSaving(true);
    try {
      const url = editingDay.id
        ? `/api/trips/${tripId}/itinerary/${editingDay.id}`
        : `/api/trips/${tripId}/itinerary`;
      const method = editingDay.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayIndex: editingDay.dayIndex,
          date: editingDay.date || null,
          fromLocation: editingDay.fromLocation || null,
          toLocation: editingDay.toLocation || null,
          activities: editingDay.activities || null,
        }),
      });

      if (response.ok) {
        await fetchItinerary();
        setEditingDay(null);
        onSuccess();
      } else {
        const result = await response.json();
        alert(result.error || "Failed to save day");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!confirm("Are you sure you want to delete this day?")) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/itinerary/${dayId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchItinerary();
        onSuccess();
      } else {
        const result = await response.json();
        alert(result.error || "Failed to delete day");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading itinerary...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daily Itinerary</h3>
          <p className="text-sm text-muted-foreground">
            Plan daily activities and locations for this trip
          </p>
        </div>
        <Button onClick={handleAddDay} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Day
        </Button>
      </div>

      {/* Edit Form */}
      {editingDay && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Day {editingDay.dayIndex}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingDay(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editingDay.date || calculateDateForDay(editingDay.dayIndex)}
                  onChange={(e) =>
                    setEditingDay({ ...editingDay, date: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Day Index</Label>
                <Input
                  type="number"
                  value={editingDay.dayIndex}
                  onChange={(e) =>
                    setEditingDay({
                      ...editingDay,
                      dayIndex: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>From Location</Label>
                <Input
                  placeholder="Starting location"
                  value={editingDay.fromLocation || ""}
                  onChange={(e) =>
                    setEditingDay({ ...editingDay, fromLocation: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>To Location</Label>
                <Input
                  placeholder="Destination"
                  value={editingDay.toLocation || ""}
                  onChange={(e) =>
                    setEditingDay({ ...editingDay, toLocation: e.target.value || null })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Activities / Notes</Label>
              <Textarea
                placeholder="Planned activities, notes, etc."
                value={editingDay.activities || ""}
                onChange={(e) =>
                  setEditingDay({ ...editingDay, activities: e.target.value || null })
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingDay(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDay} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Days List */}
      {days.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No itinerary days added yet. Click "Add Day" to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days
                  .sort((a, b) => a.dayIndex - b.dayIndex)
                  .map((day) => (
                    <TableRow key={day.id || day.dayIndex}>
                      <TableCell className="font-medium">Day {day.dayIndex}</TableCell>
                      <TableCell>
                        {day.date
                          ? format(new Date(day.date), "MMM d, yyyy")
                          : calculateDateForDay(day.dayIndex)
                          ? format(new Date(calculateDateForDay(day.dayIndex)), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>{day.fromLocation || "-"}</TableCell>
                      <TableCell>{day.toLocation || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {day.activities || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDay(day)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {day.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDay(day.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, ArrowRight, Users, Ship, Plus, Navigation2, Flag } from "lucide-react";
import { TripStatus, TripType, TripMovementEvent } from "@prisma/client";
import { format } from "date-fns";

interface Trip {
  id: string;
  name: string;
  code: string | null;
  type: TripType;
  startDate: string;
  endDate: string | null;
  departurePort: string | null;
  arrivalPort: string | null;
  status: TripStatus;
  mainGuest: string | null;
  guestCount: number | null;
  notes: string | null;
}

interface ActiveVoyageHeroProps {
  trip: Trip;
  canEdit: boolean;
}

type MovementLog = {
  id: string;
  port: string | null;
  recordedAt: string;
};

export function ActiveVoyageHero({ trip, canEdit }: ActiveVoyageHeroProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementLogs, setMovementLogs] = useState<MovementLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formLocation, setFormLocation] = useState("");

  // Fetch movement logs to get current location
  useEffect(() => {
    const fetchMovementLogs = async () => {
      try {
        const response = await fetch(`/api/trips/${trip.id}/movement-logs`);
        if (response.ok) {
          const logs = await response.json();
          setMovementLogs(logs);
          // Get the most recent movement log's port as current location
          if (logs.length > 0 && logs[0].port) {
            setCurrentLocation(logs[0].port);
          }
        }
      } catch (error) {
        console.error("Error fetching movement logs:", error);
      }
    };

    if (trip.id) {
      fetchMovementLogs();
    }
  }, [trip.id]);

  const handleAddMovementLog = async () => {
    if (!formLocation.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/trips/${trip.id}/movement-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: TripMovementEvent.ARRIVAL,
          port: formLocation.trim(),
          recordedAt: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const newLog = await response.json();
        setMovementLogs((prev) => [newLog, ...prev]);
        setCurrentLocation(formLocation.trim());
        setIsModalOpen(false);
        setFormLocation("");
        setFormDate(format(new Date(), "yyyy-MM-dd"));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add movement log");
      }
    } catch (error) {
      console.error("Error adding movement log:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    return (
      <Badge className="bg-blue-600 text-white border-blue-700 dark:bg-blue-700 dark:text-white dark:border-blue-600 font-semibold">
        Ongoing
      </Badge>
    );
  };

  const getTypeBadge = () => {
    const colors: Record<TripType, string> = {
      [TripType.CHARTER]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      [TripType.PRIVATE]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      [TripType.DELIVERY]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      [TripType.MAINTENANCE]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      [TripType.OTHER]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return (
      <Badge className={colors[trip.type] || "bg-gray-100 text-gray-800"}>
        {trip.type}
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 dark:from-blue-950/40 dark:via-cyan-950/40 dark:to-blue-950/40 shadow-lg mb-6">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left side: Trip info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center shadow-md">
                  <Ship className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-950 dark:text-gray-50 transition-colors duration-1000">
                    {trip.name}
                  </h2>
                  {trip.code && (
                    <span className="text-lg font-medium text-gray-800 dark:text-gray-200 transition-colors duration-1000">
                      ({trip.code})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {getStatusBadge()}
                  {getTypeBadge()}
                  {trip.guestCount !== null && (
                    <Badge variant="outline" className="flex items-center gap-1.5 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 transition-colors duration-1000">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-semibold">Guests: {trip.guestCount}</span>
                    </Badge>
                  )}
                </div>

                {/* Route display - 3 steps: departure -> current -> arrival */}
                <div className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors duration-1000 flex-wrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-700 dark:text-blue-300 transition-colors duration-1000" />
                    <span>{trip.departurePort || "Departure TBD"}</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-600 dark:text-gray-300 transition-colors duration-1000" />
                  <div className="flex items-center gap-2">
                    <Navigation2 className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors duration-1000" />
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {currentLocation || "Current Location"}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-600 dark:text-gray-300 transition-colors duration-1000" />
                  <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-blue-700 dark:text-blue-300 transition-colors duration-1000" />
                    <span>{trip.arrivalPort || "Arrival TBD"}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex flex-wrap gap-6 text-sm transition-colors duration-1000">
                  <div className="text-gray-900 dark:text-gray-100">
                    <span className="font-semibold text-gray-950 dark:text-gray-50">Started:</span>{" "}
                    <span className="font-medium">{format(new Date(trip.startDate), "PPP")}</span>
                  </div>
                  {trip.endDate && (
                    <div className="text-gray-900 dark:text-gray-100">
                      <span className="font-semibold text-gray-950 dark:text-gray-50">Expected End:</span>{" "}
                      <span className="font-medium">{format(new Date(trip.endDate), "PPP")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Quick Actions */}
          {canEdit && (
            <div className="flex flex-col gap-2 md:min-w-[200px]">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Movement Log
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Movement Log Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Movement Log</DialogTitle>
            <DialogDescription>
              Record the current location and date for this trip
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Current Location</Label>
              <Input
                id="location"
                type="text"
                placeholder="Enter current location/port"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setFormLocation("");
                setFormDate(format(new Date(), "yyyy-MM-dd"));
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMovementLog}
              disabled={isLoading || !formLocation.trim()}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { TripStatus, TripMovementEvent } from "@prisma/client";
import {
  Route,
  Fuel,
  MapPin,
  Calculator,
  Plus,
  Trash2,
  Navigation,
  Clock,
  Waves,
  Cloud,
  FileText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TripOption = {
  id: string;
  name: string;
  code?: string | null;
  status: TripStatus;
  startDate: string;
  endDate: string | null;
  departurePort: string | null;
  arrivalPort: string | null;
};

type MovementLog = {
  id: string;
  tripId: string;
  eventType: TripMovementEvent;
  port: string | null;
  eta: string | null;
  etd: string | null;
  weather: string | null;
  seaState: string | null;
  notes: string | null;
  recordedAt: string;
};

type TankLog = {
  id: string;
  tripId: string;
  fuelLevel: number | null;
  freshWater: number | null;
  greyWater: number | null;
  blackWater: number | null;
  recordedAt: string;
};

type UserSummary = {
  id: string;
  name: string | null;
  email: string;
};

interface RouteFuelEstimationProps {
  trips: TripOption[];
  movementLogs: MovementLog[];
  tankLogs: TankLog[];
  canEdit: boolean;
  currentUser: UserSummary;
}

interface RouteSegment {
  id: string;
  from: string;
  to: string;
  distance: number; // nautical miles
  speed: number; // knots
  estimatedTime: number; // hours
  fuelConsumption: number; // liters per hour
  estimatedFuel: number; // liters
  weather: string;
  seaState: string;
  notes: string;
}

export function RouteFuelEstimation({
  trips,
  movementLogs,
  tankLogs,
  canEdit,
  currentUser,
}: RouteFuelEstimationProps) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    trips.find((t) => t.status === "PLANNED" || t.status === "ONGOING")?.id || trips[0]?.id || null
  );
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);

  // Default fuel consumption rates (can be customized per yacht)
  const [fuelConsumptionRate, setFuelConsumptionRate] = useState(50); // liters per hour
  const [averageSpeed, setAverageSpeed] = useState(12); // knots

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || null,
    [selectedTripId, trips]
  );

  const tripMovementLogs = useMemo(
    () => movementLogs.filter((log) => log.tripId === selectedTripId),
    [movementLogs, selectedTripId]
  );

  const tripTankLogs = useMemo(
    () => tankLogs.filter((log) => log.tripId === selectedTripId),
    [tankLogs, selectedTripId]
  );

  const addRouteSegment = () => {
    const newSegment: RouteSegment = {
      id: `segment-${Date.now()}`,
      from: "",
      to: "",
      distance: 0,
      speed: averageSpeed,
      estimatedTime: 0,
      fuelConsumption: fuelConsumptionRate,
      estimatedFuel: 0,
      weather: "",
      seaState: "",
      notes: "",
    };
    setRouteSegments([...routeSegments, newSegment]);
  };

  const removeRouteSegment = (id: string) => {
    setRouteSegments(routeSegments.filter((seg) => seg.id !== id));
  };

  const updateRouteSegment = (id: string, updates: Partial<RouteSegment>) => {
    setRouteSegments(
      routeSegments.map((seg) => {
        if (seg.id === id) {
          const updated = { ...seg, ...updates };
          // Recalculate time and fuel when distance, speed, or consumption changes
          if (updates.distance !== undefined || updates.speed !== undefined || updates.fuelConsumption !== undefined) {
            updated.estimatedTime = updated.distance > 0 && updated.speed > 0 
              ? updated.distance / updated.speed 
              : 0;
            updated.estimatedFuel = updated.estimatedTime * updated.fuelConsumption;
          }
          return updated;
        }
        return seg;
      })
    );
  };

  const totalDistance = useMemo(
    () => routeSegments.reduce((sum, seg) => sum + seg.distance, 0),
    [routeSegments]
  );

  const totalTime = useMemo(
    () => routeSegments.reduce((sum, seg) => sum + seg.estimatedTime, 0),
    [routeSegments]
  );

  const totalFuel = useMemo(
    () => routeSegments.reduce((sum, seg) => sum + seg.estimatedFuel, 0),
    [routeSegments]
  );


  const hasTrips = trips.length > 0;

  if (!hasTrips) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No trips found. Please create a trip first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Route & Fuel Estimation</h1>
          <p className="text-muted-foreground">
            Plan your voyage route and estimate fuel consumption
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm text-muted-foreground">Select trip</Label>
          <Select
            value={selectedTripId ?? undefined}
            onValueChange={(value) => setSelectedTripId(value)}
          >
            <SelectTrigger className="min-w-[240px]">
              <SelectValue placeholder="Select a trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.name} {trip.code ? `(${trip.code})` : ""} — {trip.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTrip && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Trip Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Departure Port</Label>
                  <p className="font-medium">{selectedTrip.departurePort || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Arrival Port</Label>
                  <p className="font-medium">{selectedTrip.arrivalPort || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Start Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedTrip.startDate), "PPP")}
                  </p>
                </div>
                {selectedTrip.endDate && (
                  <div>
                    <Label className="text-sm text-muted-foreground">End Date</Label>
                    <p className="font-medium">
                      {format(new Date(selectedTrip.endDate), "PPP")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Fuel Consumption Settings
                  </CardTitle>
                  <CardDescription>
                    Configure default fuel consumption rates for calculations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fuel-rate">Fuel Consumption (L/hour)</Label>
                  <Input
                    id="fuel-rate"
                    type="number"
                    value={fuelConsumptionRate}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setFuelConsumptionRate(value);
                      // Update all segments
                      setRouteSegments(
                        routeSegments.map((seg) => ({
                          ...seg,
                          fuelConsumption: value,
                          estimatedFuel: seg.estimatedTime * value,
                        }))
                      );
                    }}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="avg-speed">Average Speed (knots)</Label>
                  <Input
                    id="avg-speed"
                    type="number"
                    value={averageSpeed}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setAverageSpeed(value);
                      // Update all segments
                      setRouteSegments(
                        routeSegments.map((seg) => ({
                          ...seg,
                          speed: value,
                          estimatedTime: seg.distance > 0 ? seg.distance / value : 0,
                          estimatedFuel: seg.estimatedTime * seg.fuelConsumption,
                        }))
                      );
                    }}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Route Planning
                  </CardTitle>
                  <CardDescription>
                    Plan your route segments and calculate fuel requirements
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button onClick={addRouteSegment} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Segment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {routeSegments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No route segments added yet.</p>
                  {canEdit && (
                    <Button onClick={addRouteSegment} className="mt-4" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Segment
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Distance (NM)</TableHead>
                          <TableHead>Speed (kts)</TableHead>
                          <TableHead>Time (hrs)</TableHead>
                          <TableHead>Fuel (L)</TableHead>
                          <TableHead>Weather</TableHead>
                          {canEdit && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routeSegments.map((segment) => (
                          <TableRow key={segment.id}>
                            <TableCell>
                              <Input
                                value={segment.from}
                                onChange={(e) =>
                                  updateRouteSegment(segment.id, { from: e.target.value })
                                }
                                placeholder="Port/Location"
                                disabled={!canEdit}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={segment.to}
                                onChange={(e) =>
                                  updateRouteSegment(segment.id, { to: e.target.value })
                                }
                                placeholder="Port/Location"
                                disabled={!canEdit}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={segment.distance || ""}
                                onChange={(e) =>
                                  updateRouteSegment(segment.id, {
                                    distance: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="0"
                                disabled={!canEdit}
                                className="w-24"
                                min="0"
                                step="0.1"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={segment.speed || ""}
                                onChange={(e) =>
                                  updateRouteSegment(segment.id, {
                                    speed: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="0"
                                disabled={!canEdit}
                                className="w-20"
                                min="0"
                                step="0.1"
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {segment.estimatedTime.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {segment.estimatedFuel.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={segment.weather}
                                onChange={(e) =>
                                  updateRouteSegment(segment.id, { weather: e.target.value })
                                }
                                placeholder="Conditions"
                                disabled={!canEdit}
                                className="w-32"
                              />
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRouteSegment(segment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Total Distance</Label>
                          <p className="text-2xl font-bold">{totalDistance.toFixed(1)} NM</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Total Time</Label>
                          <p className="text-2xl font-bold">{totalTime.toFixed(1)} hours</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Total Fuel</Label>
                          <p className="text-2xl font-bold text-primary">{totalFuel.toFixed(1)} L</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )}
            </CardContent>
          </Card>

          {tripTankLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Fuel & Water Logs
                </CardTitle>
                <CardDescription>
                  Historical fuel and water level records for this trip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fuel Level</TableHead>
                        <TableHead>Fresh Water</TableHead>
                        <TableHead>Grey Water</TableHead>
                        <TableHead>Black Water</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tripTankLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.recordedAt), "PPp")}
                          </TableCell>
                          <TableCell>{log.fuelLevel?.toFixed(1) || "—"} L</TableCell>
                          <TableCell>{log.freshWater?.toFixed(1) || "—"} L</TableCell>
                          <TableCell>{log.greyWater?.toFixed(1) || "—"} L</TableCell>
                          <TableCell>{log.blackWater?.toFixed(1) || "—"} L</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {tripMovementLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Movement Logs
                </CardTitle>
                <CardDescription>
                  Port entries, departures, and movement events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tripMovementLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{log.eventType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.recordedAt), "PPp")}
                        </span>
                      </div>
                      {log.port && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.port}</span>
                        </div>
                      )}
                      {(log.eta || log.etd) && (
                        <div className="flex items-center gap-4 text-sm">
                          {log.eta && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>ETA: {format(new Date(log.eta), "PPp")}</span>
                            </div>
                          )}
                          {log.etd && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>ETD: {format(new Date(log.etd), "PPp")}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {(log.weather || log.seaState) && (
                        <div className="flex items-center gap-4 text-sm">
                          {log.weather && (
                            <div className="flex items-center gap-2">
                              <Cloud className="h-4 w-4 text-muted-foreground" />
                              <span>{log.weather}</span>
                            </div>
                          )}
                          {log.seaState && (
                            <div className="flex items-center gap-2">
                              <Waves className="h-4 w-4 text-muted-foreground" />
                              <span>{log.seaState}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {log.notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">{log.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

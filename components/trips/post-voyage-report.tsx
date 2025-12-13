"use client";

import { useMemo, useState } from "react";
import { format, formatDistance } from "date-fns";
import type { TripStatus, TripType, TripMovementEvent, TripChecklistType } from "@prisma/client";
import {
  ClipboardCheck,
  MapPin,
  DollarSign,
  CheckSquare,
  Navigation,
  Fuel,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";

type CompletedTrip = {
  id: string;
  name: string;
  code: string | null;
  type: TripType;
  status: TripStatus;
  startDate: string;
  endDate: string | null;
  departurePort: string | null;
  arrivalPort: string | null;
  mainGuest: string | null;
  guestCount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  expenses: Array<{
    id: string;
    amount: string;
    currency: string;
    status: string;
    date: string;
    description: string | null;
    category: {
      name: string;
    } | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    completedAt: string | null;
    completedBy: {
      name: string | null;
      email: string;
    } | null;
  }>;
  movementLogs: Array<{
    id: string;
    eventType: TripMovementEvent;
    port: string | null;
    eta: string | null;
    etd: string | null;
    weather: string | null;
    seaState: string | null;
    recordedAt: string;
  }>;
  tankLogs: Array<{
    id: string;
    fuelLevel: number | null;
    freshWater: number | null;
    greyWater: number | null;
    blackWater: number | null;
    recordedAt: string;
  }>;
  checklists: Array<{
    id: string;
    type: TripChecklistType;
    title: string;
    completed: boolean;
    completedAt: string | null;
    completedBy: {
      name: string | null;
    } | null;
  }>;
};

type UserSummary = {
  id: string;
  name: string | null;
  email: string;
};

interface PostVoyageReportProps {
  trips: CompletedTrip[];
  canEdit: boolean;
  currentUser: UserSummary;
}

export function PostVoyageReport({ trips, canEdit, currentUser }: PostVoyageReportProps) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(trips[0]?.id || null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    expenses: true,
    tasks: true,
    movements: true,
    tanks: true,
    checklists: true,
  });

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || null,
    [selectedTripId, trips]
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const tripDuration = useMemo(() => {
    if (!selectedTrip?.startDate || !selectedTrip?.endDate) return null;
    const start = new Date(selectedTrip.startDate);
    const end = new Date(selectedTrip.endDate);
    return formatDistance(end, start, { addSuffix: false });
  }, [selectedTrip]);

  const expenseSummary = useMemo(() => {
    if (!selectedTrip) return { total: 0, byCurrency: {}, byCategory: {} };
    
    const approved = selectedTrip.expenses.filter((e) => e.status === "APPROVED");
    const byCurrency: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let total = 0;

    approved.forEach((exp) => {
      const amount = Number(exp.amount);
      const currency = exp.currency;
      const category = exp.category?.name || "Uncategorized";

      byCurrency[currency] = (byCurrency[currency] || 0) + amount;
      byCategory[category] = (byCategory[category] || 0) + amount;
      total += amount;
    });

    return { total, byCurrency, byCategory };
  }, [selectedTrip]);

  const completedTasks = useMemo(
    () => selectedTrip?.tasks.filter((t) => t.status === "DONE") || [],
    [selectedTrip]
  );

  const fuelConsumption = useMemo(() => {
    if (!selectedTrip || selectedTrip.tankLogs.length < 2) return null;
    const sorted = [...selectedTrip.tankLogs].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first.fuelLevel && last.fuelLevel) {
      return first.fuelLevel - last.fuelLevel;
    }
    return null;
  }, [selectedTrip]);

  const exportReport = () => {
    if (!selectedTrip) return;
    
    const report = {
      trip: {
        name: selectedTrip.name,
        code: selectedTrip.code,
        type: selectedTrip.type,
        startDate: selectedTrip.startDate,
        endDate: selectedTrip.endDate,
        departurePort: selectedTrip.departurePort,
        arrivalPort: selectedTrip.arrivalPort,
        duration: tripDuration,
      },
      summary: {
        expenses: expenseSummary,
        tasksCompleted: completedTasks.length,
        totalTasks: selectedTrip.tasks.length,
        movements: selectedTrip.movementLogs.length,
        fuelConsumption,
      },
      details: {
        expenses: selectedTrip.expenses,
        tasks: selectedTrip.tasks,
        movements: selectedTrip.movementLogs,
        tankLogs: selectedTrip.tankLogs,
        checklists: selectedTrip.checklists,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voyage-report-${selectedTrip.name}-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No completed voyages found.</p>
          <p className="text-sm mt-2">Complete a voyage to generate reports here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Post-Voyage Report</h1>
          <p className="text-muted-foreground">
            Review and analyze completed voyage details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTripId ?? undefined}
            onValueChange={(value) => setSelectedTripId(value)}
          >
            <SelectTrigger className="min-w-[240px]">
              <SelectValue placeholder="Select a completed voyage" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.name} {trip.code ? `(${trip.code})` : ""} —{" "}
                  {trip.endDate ? format(new Date(trip.endDate), "MMM yyyy") : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTrip && (
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {selectedTrip && (
        <div className="space-y-6">
          {/* Trip Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Voyage Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Voyage Name</Label>
                  <p className="font-semibold">{selectedTrip.name}</p>
                  {selectedTrip.code && (
                    <p className="text-sm text-muted-foreground">Code: {selectedTrip.code}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Type</Label>
                  <Badge variant="outline">{selectedTrip.type}</Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Duration</Label>
                  <p className="font-semibold">{tripDuration || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Guests</Label>
                  <p className="font-semibold">{selectedTrip.guestCount || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Departure</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{selectedTrip.departurePort || "N/A"}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(selectedTrip.startDate), "PPP")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Arrival</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{selectedTrip.arrivalPort || "N/A"}</p>
                  </div>
                  {selectedTrip.endDate && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(selectedTrip.endDate), "PPP")}
                    </p>
                  )}
                </div>
                {selectedTrip.mainGuest && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Main Guest</Label>
                    <p className="font-semibold">{selectedTrip.mainGuest}</p>
                  </div>
                )}
                {fuelConsumption !== null && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Fuel Consumed</Label>
                    <p className="font-semibold text-primary">{fuelConsumption.toFixed(1)} L</p>
                  </div>
                )}
              </div>
              {selectedTrip.notes && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{selectedTrip.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses Summary */}
          <Card>
            <Collapsible
              open={expandedSections.expenses}
              onOpenChange={() => toggleSection("expenses")}
            >
              <CollapsibleTrigger>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      <CardTitle>Expenses</CardTitle>
                    </div>
                    {expandedSections.expenses ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <CardDescription>
                    {selectedTrip.expenses.length} expense(s) recorded
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-sm text-muted-foreground">Total Expenses</Label>
                        <p className="text-2xl font-bold">
                          {Object.entries(expenseSummary.byCurrency).map(([currency, amount]) => (
                            <span key={currency}>
                              {currency} {amount.toFixed(2)}
                              <br />
                            </span>
                          ))}
                          {Object.keys(expenseSummary.byCurrency).length === 0 && "—"}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-sm text-muted-foreground">By Category</Label>
                        <div className="mt-2 space-y-1">
                          {Object.entries(expenseSummary.byCategory).map(([category, amount]) => (
                            <div key={category} className="flex justify-between text-sm">
                              <span>{category}</span>
                              <span className="font-medium">{amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-sm text-muted-foreground">Status Breakdown</Label>
                        <div className="mt-2 space-y-1">
                          {["APPROVED", "PENDING", "DRAFT"].map((status) => {
                            const count = selectedTrip.expenses.filter(
                              (e) => e.status === status
                            ).length;
                            return (
                              <div key={status} className="flex justify-between text-sm">
                                <span>{status}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {selectedTrip.expenses.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedTrip.expenses.map((expense) => (
                              <TableRow key={expense.id}>
                                <TableCell>
                                  {format(new Date(expense.date), "PP")}
                                </TableCell>
                                <TableCell>{expense.description || "—"}</TableCell>
                                <TableCell>
                                  {expense.category?.name || "Uncategorized"}
                                </TableCell>
                                <TableCell>
                                  {expense.currency} {Number(expense.amount).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      expense.status === "APPROVED"
                                        ? "default"
                                        : expense.status === "PENDING"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {expense.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Tasks Summary */}
          <Card>
            <Collapsible
              open={expandedSections.tasks}
              onOpenChange={() => toggleSection("tasks")}
            >
              <CollapsibleTrigger>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      <CardTitle>Tasks</CardTitle>
                    </div>
                    {expandedSections.tasks ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <CardDescription>
                    {completedTasks.length} of {selectedTrip.tasks.length} task(s) completed
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {selectedTrip.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTrip.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            {task.completedAt && task.completedBy && (
                              <p className="text-sm text-muted-foreground">
                                Completed by <span className="font-bold">{task.completedBy.name || task.completedBy.email}</span> on{" "}
                                {format(new Date(task.completedAt), "PPp")}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={task.status === "DONE" ? "default" : "secondary"}
                          >
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks recorded</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Movement Logs */}
          <Card>
            <Collapsible
              open={expandedSections.movements}
              onOpenChange={() => toggleSection("movements")}
            >
              <CollapsibleTrigger>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-5 w-5" />
                      <CardTitle>Movement Logs</CardTitle>
                    </div>
                    {expandedSections.movements ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <CardDescription>
                    {selectedTrip.movementLogs.length} movement event(s) recorded
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {selectedTrip.movementLogs.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTrip.movementLogs.map((log) => (
                        <div key={log.id} className="border rounded-lg p-4 space-y-2">
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
                          {(log.weather || log.seaState) && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {log.weather && <span>Weather: {log.weather}</span>}
                              {log.seaState && <span>Sea State: {log.seaState}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No movement logs recorded</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Tank Logs */}
          {selectedTrip.tankLogs.length > 0 && (
            <Card>
              <Collapsible
                open={expandedSections.tanks}
                onOpenChange={() => toggleSection("tanks")}
              >
                <CollapsibleTrigger>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fuel className="h-5 w-5" />
                        <CardTitle>Fuel & Water Logs</CardTitle>
                      </div>
                      {expandedSections.tanks ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {selectedTrip.tankLogs.length} tank reading(s) recorded
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Fuel (L)</TableHead>
                            <TableHead>Fresh Water (L)</TableHead>
                            <TableHead>Grey Water (L)</TableHead>
                            <TableHead>Black Water (L)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTrip.tankLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {format(new Date(log.recordedAt), "PPp")}
                              </TableCell>
                              <TableCell>{log.fuelLevel?.toFixed(1) || "—"}</TableCell>
                              <TableCell>{log.freshWater?.toFixed(1) || "—"}</TableCell>
                              <TableCell>{log.greyWater?.toFixed(1) || "—"}</TableCell>
                              <TableCell>{log.blackWater?.toFixed(1) || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Checklists */}
          {selectedTrip.checklists.length > 0 && (
            <Card>
              <Collapsible
                open={expandedSections.checklists}
                onOpenChange={() => toggleSection("checklists")}
              >
                <CollapsibleTrigger>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5" />
                        <CardTitle>Checklists</CardTitle>
                      </div>
                      {expandedSections.checklists ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {selectedTrip.checklists.filter((c) => c.completed).length} of{" "}
                      {selectedTrip.checklists.length} item(s) completed
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTrip.checklists.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={item.completed ? "default" : "outline"}
                              className="min-w-[80px]"
                            >
                              {item.type}
                            </Badge>
                            <span className={item.completed ? "" : "text-muted-foreground"}>
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.completed && item.completedBy && (
                              <span className="text-sm text-muted-foreground">
                                by {item.completedBy.name}
                              </span>
                            )}
                            {item.completedAt && (
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(item.completedAt), "PP")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { format, formatDistance } from "date-fns";
import type { TripStatus, TripType, TripMovementEvent, TripChecklistType } from "@prisma/client";
import { jsPDF } from "jspdf";
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
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    expenses: true,
    tasks: true,
    movements: true,
    tanks: true,
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

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth?: number) => {
      if (maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * lineHeight;
      } else {
        doc.text(text, x, y);
        return lineHeight;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    yPos += addText("Post-Voyage Report", margin, yPos);
    yPos += sectionSpacing;

    // Voyage Overview Section
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    yPos += addText("Voyage Overview", margin, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const overviewData = [
      ["Voyage Name:", selectedTrip.name],
      ["Code:", selectedTrip.code || "N/A"],
      ["Type:", selectedTrip.type],
      ["Duration:", tripDuration || "N/A"],
      ["Departure Port:", selectedTrip.departurePort || "N/A"],
      ["Arrival Port:", selectedTrip.arrivalPort || "N/A"],
      ["Start Date:", format(new Date(selectedTrip.startDate), "PPP")],
      ["End Date:", selectedTrip.endDate ? format(new Date(selectedTrip.endDate), "PPP") : "N/A"],
      ["Guests:", selectedTrip.guestCount ? `${selectedTrip.guestCount}` : "N/A"],
    ];

    if (selectedTrip.mainGuest) {
      overviewData.push(["Main Guest:", selectedTrip.mainGuest]);
    }

    if (fuelConsumption !== null) {
      overviewData.push(["Fuel Consumed:", `${fuelConsumption.toFixed(1)} L`]);
    }

    overviewData.forEach(([label, value]) => {
      checkPageBreak(lineHeight * 2);
      doc.setFont("helvetica", "bold");
      addText(label, margin, yPos);
      doc.setFont("helvetica", "normal");
      addText(value, margin + 60, yPos);
      yPos += lineHeight;
    });

    yPos += sectionSpacing;

    // Expenses Summary
    checkPageBreak(lineHeight * 10);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    yPos += addText("Expenses Summary", margin, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    if (Object.keys(expenseSummary.byCurrency).length > 0) {
      doc.setFont("helvetica", "bold");
      yPos += addText("Total Expenses:", margin, yPos);
      doc.setFont("helvetica", "normal");
      Object.entries(expenseSummary.byCurrency).forEach(([currency, amount]) => {
        checkPageBreak(lineHeight);
        yPos += addText(`${currency} ${amount.toFixed(2)}`, margin + 10, yPos);
      });
      yPos += 3;
    }

    if (Object.keys(expenseSummary.byCategory).length > 0) {
      doc.setFont("helvetica", "bold");
      yPos += addText("By Category:", margin, yPos);
      doc.setFont("helvetica", "normal");
      Object.entries(expenseSummary.byCategory).forEach(([category, amount]) => {
        checkPageBreak(lineHeight);
        yPos += addText(`${category}: ${amount.toFixed(2)}`, margin + 10, yPos);
      });
      yPos += 3;
    }

    yPos += addText(`Total Expenses: ${selectedTrip.expenses.length}`, margin, yPos);
    yPos += sectionSpacing;

    // Tasks Summary
    checkPageBreak(lineHeight * 5);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    yPos += addText("Tasks Summary", margin, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos += addText(`${completedTasks.length} of ${selectedTrip.tasks.length} task(s) completed`, margin, yPos);
    yPos += sectionSpacing;

    // Movement Logs
    if (selectedTrip.movementLogs.length > 0) {
      checkPageBreak(lineHeight * 8);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      yPos += addText("Movement Logs", margin, yPos);
      yPos += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      selectedTrip.movementLogs.forEach((log, index) => {
        checkPageBreak(lineHeight * 5);
        doc.setFont("helvetica", "bold");
        yPos += addText(`${index + 1}. ${log.eventType}`, margin, yPos);
        doc.setFont("helvetica", "normal");
        yPos += addText(`Port: ${log.port || "N/A"}`, margin + 10, yPos);
        yPos += addText(`Date: ${format(new Date(log.recordedAt), "PPP 'at' HH:mm")}`, margin + 10, yPos);
        if (log.weather) {
          yPos += addText(`Weather: ${log.weather}`, margin + 10, yPos);
        }
        if (log.seaState) {
          yPos += addText(`Sea State: ${log.seaState}`, margin + 10, yPos);
        }
        yPos += 3;
      });
      yPos += sectionSpacing;
    }

    // Tank Logs
    if (selectedTrip.tankLogs.length > 0) {
      checkPageBreak(lineHeight * 8);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      yPos += addText("Fuel & Water Logs", margin, yPos);
      yPos += 5;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Table header
      checkPageBreak(lineHeight * 3);
      doc.setFont("helvetica", "bold");
      const tableHeaders = ["Date", "Fuel (L)", "Fresh Water", "Grey Water", "Black Water"];
      const colWidths = [60, 30, 30, 30, 30];
      let xPos = margin;
      tableHeaders.forEach((header, i) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[i];
      });
      yPos += lineHeight;
      doc.setFont("helvetica", "normal");

      // Table rows
      selectedTrip.tankLogs.forEach((log) => {
        checkPageBreak(lineHeight * 2);
        xPos = margin;
        const rowData = [
          format(new Date(log.recordedAt), "MMM dd, yyyy"),
          log.fuelLevel?.toFixed(1) || "—",
          log.freshWater?.toFixed(1) || "—",
          log.greyWater?.toFixed(1) || "—",
          log.blackWater?.toFixed(1) || "—",
        ];
        rowData.forEach((data, i) => {
          doc.text(data, xPos, yPos);
          xPos += colWidths[i];
        });
        yPos += lineHeight;
      });
      yPos += sectionSpacing;
    }

    // Notes
    if (selectedTrip.notes) {
      checkPageBreak(lineHeight * 5);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      yPos += addText("Notes", margin, yPos);
      yPos += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const notesLines = doc.splitTextToSize(selectedTrip.notes, pageWidth - margin * 2);
      notesLines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        yPos += addText(line, margin, yPos);
      });
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${i} of ${totalPages} - Generated on ${format(new Date(), "PPP")}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Save PDF
    const fileName = `voyage-report-${selectedTrip.name.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
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

        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { TripStatus, TripType } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Calendar, MapPin, Users, FileText, Filter, X, Navigation2, ClipboardCheck, DollarSign, CheckSquare } from "lucide-react";
import { TripForm } from "./trip-form";
import { TripItinerary } from "./trip-itinerary";

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
  createdBy: { id: string; name: string | null; email: string } | null;
  _count?: {
    expenses: number;
    tasks: number;
  };
  expenseSummary?: Record<string, number>;
}

interface TripListProps {
  initialTrips: Trip[];
  canManage: boolean;
  canEdit?: boolean;
}

export function TripList({ initialTrips, canManage, canEdit = false }: TripListProps) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isItineraryDialogOpen, setIsItineraryDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [selectedTripForItinerary, setSelectedTripForItinerary] = useState<Trip | null>(null);
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<Trip | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const getStatusBadge = (status: TripStatus) => {
    const statusStyles: Record<TripStatus, string> = {
      [TripStatus.PLANNED]: "bg-yellow-100 text-yellow-800 border-yellow-200",
      [TripStatus.ONGOING]: "bg-blue-100 text-blue-800 border-blue-200",
      [TripStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
      [TripStatus.CANCELLED]: "bg-red-100 text-red-800 border-red-200",
    };

    return (
      <Badge className={statusStyles[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getTypeBadge = (type: TripType) => {
    const colors: Record<TripType, string> = {
      [TripType.CHARTER]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      [TripType.PRIVATE]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      [TripType.DELIVERY]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      [TripType.MAINTENANCE]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      [TripType.OTHER]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };

    return (
      <Badge className={colors[type]}>
        {type}
      </Badge>
    );
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (statusFilter !== "all" && trip.status !== statusFilter) return false;
      if (typeFilter !== "all" && trip.type !== typeFilter) return false;
      
      if (startDateFilter) {
        const filterDate = new Date(startDateFilter);
        const tripStartDate = new Date(trip.startDate);
        if (tripStartDate < filterDate) return false;
      }
      
      if (endDateFilter) {
        const filterDate = new Date(endDateFilter);
        const tripEndDate = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate);
        if (tripEndDate > filterDate) return false;
      }
      
      return true;
    });
  }, [trips, statusFilter, typeFilter, startDateFilter, endDateFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) {
      return;
    }

    try {
      const response = await fetch(`/api/trips/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const result = await response.json();
        alert(result.error || "Unable to delete trip. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleStatusChange = async (tripId: string, newStatus: TripStatus) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const result = await response.json();
        alert(result.error || "Unable to update trip status. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setEditingTrip(null)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTrip ? "Edit Trip" : "New Trip"}</DialogTitle>
                <DialogDescription>
                  {editingTrip ? "Update trip details" : "Create a new trip or charter"}
                </DialogDescription>
              </DialogHeader>
              <TripForm
                trip={editingTrip}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  router.refresh();
                }}
                onDelete={() => {
                  setIsDialogOpen(false);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
            className={viewMode === "table" ? "" : "bg-white text-primary-foreground border-primary shadow-sm"}
          >
            {viewMode === "table" ? "Card View" : "Table View"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value={TripStatus.PLANNED}>Planned</SelectItem>
                      <SelectItem value={TripStatus.ONGOING}>Ongoing</SelectItem>
                      <SelectItem value={TripStatus.COMPLETED}>Completed</SelectItem>
                      <SelectItem value={TripStatus.CANCELLED}>Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value={TripType.CHARTER}>Charter</SelectItem>
                      <SelectItem value={TripType.PRIVATE}>Private</SelectItem>
                      <SelectItem value={TripType.DELIVERY}>Delivery</SelectItem>
                      <SelectItem value={TripType.MAINTENANCE}>Maintenance</SelectItem>
                      <SelectItem value={TripType.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date From</Label>
                  <Input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date To</Label>
                  <Input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itinerary Dialog */}
      <Dialog open={isItineraryDialogOpen} onOpenChange={setIsItineraryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Daily Itinerary - {selectedTripForItinerary?.name}</DialogTitle>
            <DialogDescription>
              Manage the daily itinerary for this trip
            </DialogDescription>
          </DialogHeader>
          {selectedTripForItinerary && (
            <TripItinerary
              tripId={selectedTripForItinerary.id}
              tripStartDate={selectedTripForItinerary.startDate}
              tripEndDate={selectedTripForItinerary.endDate}
              onSuccess={() => router.refresh()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cards View */}
      {viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.length === 0 ? (
            <div className="col-span-full p-8 text-center">
              <p className="text-muted-foreground">No trips match your current filters.</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or create a new trip.</p>
            </div>
          ) : (
            filteredTrips.map((trip) => (
              <Card 
                key={trip.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedTripForDetail(trip);
                  setIsDetailDialogOpen(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{trip.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {trip.code && <span className="mr-2">{trip.code}</span>}
                        {getTypeBadge(trip.type)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(trip.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(trip.startDate), "MMM d, yyyy")}
                      {trip.endDate && ` - ${format(new Date(trip.endDate), "MMM d, yyyy")}`}
                    </span>
                  </div>
                  
                  {(trip.departurePort || trip.arrivalPort) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {trip.departurePort || "TBD"} → {trip.arrivalPort || "TBD"}
                      </span>
                    </div>
                  )}

                  {trip.mainGuest && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {trip.mainGuest}
                        {trip.guestCount && ` (${trip.guestCount} guests)`}
                      </span>
                    </div>
                  )}

                  {trip.notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="line-clamp-2">{trip.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        {trip._count?.expenses ? `${trip._count.expenses} expenses` : ""}
                      </div>
                      {trip.expenseSummary && Object.keys(trip.expenseSummary).length > 0 && (
                        <div className="font-medium text-foreground">
                          Expenses: {Object.entries(trip.expenseSummary)
                            .map(([currency, amount]) =>
                              `${amount.toLocaleString("en-US", { style: "currency", currency })}`
                            )
                            .join(", ")}
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTripForItinerary(trip);
                            setIsItineraryDialogOpen(true);
                          }}
                        >
                          Itinerary
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTrip(trip);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(trip.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {(canManage || canEdit) && (
                    <div className="pt-2 border-t">
                      <Select
                        value={trip.status}
                        onValueChange={(value) => handleStatusChange(trip.id, value as TripStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TripStatus.PLANNED}>Planned</SelectItem>
                          <SelectItem value={TripStatus.ONGOING}>Ongoing</SelectItem>
                          <SelectItem value={TripStatus.COMPLETED}>Completed</SelectItem>
                          <SelectItem value={TripStatus.CANCELLED}>Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            {filteredTrips.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No trips match your current filters.</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or create a new trip.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{trip.name}</TableCell>
                      <TableCell>{getTypeBadge(trip.type)}</TableCell>
                      <TableCell>{format(new Date(trip.startDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {trip.endDate ? format(new Date(trip.endDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {trip.departurePort || "TBD"} → {trip.arrivalPort || "TBD"}
                      </TableCell>
                      <TableCell>
                        {trip.mainGuest || "-"}
                        {trip.guestCount && ` (${trip.guestCount})`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(trip.status)}
                          {(canManage || canEdit) && (
                            <Select
                              value={trip.status}
                              onValueChange={(value) => handleStatusChange(trip.id, value as TripStatus)}
                            >
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={TripStatus.PLANNED}>Planned</SelectItem>
                                <SelectItem value={TripStatus.ONGOING}>Ongoing</SelectItem>
                                <SelectItem value={TripStatus.COMPLETED}>Completed</SelectItem>
                                <SelectItem value={TripStatus.CANCELLED}>Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTripForItinerary(trip);
                                setIsItineraryDialogOpen(true);
                              }}
                            >
                              Itinerary
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingTrip(trip);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(trip.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trip Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTripForDetail?.name}</DialogTitle>
            <DialogDescription>
              {selectedTripForDetail?.code && `Code: ${selectedTripForDetail.code}`}
            </DialogDescription>
          </DialogHeader>
          {selectedTripForDetail && (
            <TripDetailContent trip={selectedTripForDetail} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Trip Detail Content Component
function TripDetailContent({ trip }: { trip: Trip }) {
  const [movementLogs, setMovementLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getStatusBadge = (status: TripStatus) => {
    const statusStyles: Record<TripStatus, string> = {
      [TripStatus.PLANNED]: "bg-yellow-100 text-yellow-800 border-yellow-200",
      [TripStatus.ONGOING]: "bg-blue-100 text-blue-800 border-blue-200",
      [TripStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
      [TripStatus.CANCELLED]: "bg-red-100 text-red-800 border-red-200",
    };

    return (
      <Badge className={statusStyles[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const movementLogsRes = await fetch(`/api/trips/${trip.id}/movement-logs`);

        if (movementLogsRes.ok) {
          const logs = await movementLogsRes.json();
          setMovementLogs(logs);
        }
      } catch (error) {
        console.error("Error fetching trip details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (trip.id) {
      fetchDetails();
    }
  }, [trip.id]);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Dates</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(trip.startDate), "PPP")}
                  {trip.endDate && ` - ${format(new Date(trip.endDate), "PPP")}`}
                </div>
              </div>
            </div>
            {(trip.departurePort || trip.arrivalPort) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Route</div>
                  <div className="text-sm text-muted-foreground">
                    {trip.departurePort || "TBD"} → {trip.arrivalPort || "TBD"}
                  </div>
                </div>
              </div>
            )}
            {trip.mainGuest && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Guests</div>
                  <div className="text-sm text-muted-foreground">
                    {trip.mainGuest}
                    {trip.guestCount && ` (${trip.guestCount} guests)`}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Status</div>
                {getStatusBadge(trip.status)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {trip.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{trip.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Movement Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation2 className="h-5 w-5" />
            Movement Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : movementLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movement logs recorded</p>
          ) : (
            <div className="space-y-3">
              {movementLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{log.port || "Location not specified"}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(log.recordedAt), "PPP 'at' HH:mm")}
                      </div>
                      {log.notes && (
                        <div className="text-sm mt-2">{log.notes}</div>
                      )}
                    </div>
                    <Badge variant="outline">{log.eventType}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses & Tasks Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Expenses</div>
                <div className="text-sm text-muted-foreground">
                  {trip._count?.expenses || 0} expenses
                  {trip.expenseSummary && Object.keys(trip.expenseSummary).length > 0 && (
                    <span className="ml-2">
                      ({Object.entries(trip.expenseSummary)
                        .map(([currency, amount]) =>
                          `${amount.toLocaleString("en-US", { style: "currency", currency })}`
                        )
                        .join(", ")})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Tasks</div>
                <div className="text-sm text-muted-foreground">
                  {trip._count?.tasks || 0} tasks
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

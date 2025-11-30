"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { TripStatus } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { TripForm } from "./trip-form";

interface Trip {
  id: string;
  name: string;
  code: string | null;
  startDate: string;
  endDate: string | null;
  departurePort: string | null;
  arrivalPort: string | null;
  status: TripStatus;
  createdBy: { id: string; name: string | null; email: string };
}

interface TripListProps {
  initialTrips: Trip[];
  canManage: boolean;
}

export function TripList({ initialTrips, canManage }: TripListProps) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const getStatusBadge = (status: TripStatus) => {
    const variants: Record<TripStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [TripStatus.PLANNED]: "outline",
      [TripStatus.ONGOING]: "secondary",
      [TripStatus.COMPLETED]: "default",
      [TripStatus.CANCELLED]: "destructive",
    };

    return (
      <Badge variant={variants[status]}>
        {status}
      </Badge>
    );
  };

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
        alert(result.error || "Failed to delete trip");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTrip(null)}>
                <Plus className="mr-2 h-4 w-4" />
                New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTrip ? "Edit Trip" : "New Trip"}</DialogTitle>
                <DialogDescription>
                  {editingTrip ? "Update trip details" : "Create a new trip"}
                </DialogDescription>
              </DialogHeader>
              <TripForm
                trip={editingTrip}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {trips.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No trips found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.name}</TableCell>
                    <TableCell>{trip.code || "-"}</TableCell>
                    <TableCell>{format(new Date(trip.startDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {trip.endDate ? format(new Date(trip.endDate), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>{trip.departurePort || "-"}</TableCell>
                    <TableCell>{trip.arrivalPort || "-"}</TableCell>
                    <TableCell>{getStatusBadge(trip.status)}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
    </div>
  );
}


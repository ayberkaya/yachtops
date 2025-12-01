"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MaintenanceType } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Search, SlidersHorizontal, Calendar, Wrench, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MaintenanceLog {
  id: string;
  type: MaintenanceType;
  title: string;
  description: string | null;
  component: string | null;
  serviceProvider: string | null;
  cost: number | null;
  currency: string;
  date: string;
  nextDueDate: string | null;
  mileage: number | null;
  mileageUnit: string | null;
  notes: string | null;
  createdBy: { id: string; name: string | null; email: string };
}

interface MaintenanceListProps {
  initialLogs: MaintenanceLog[];
}

export function MaintenanceList({ initialLogs }: MaintenanceListProps) {
  const { data: session } = useSession();
  const [logs, setLogs] = useState(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    component: "",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type) params.append("type", filters.type);
        if (filters.component) params.append("component", filters.component);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);

        const response = await fetch(`/api/maintenance?${params.toString()}`);
        const data = await response.json();

        let filtered = data;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = data.filter((log: MaintenanceLog) =>
            log.title.toLowerCase().includes(searchLower) ||
            log.component?.toLowerCase().includes(searchLower) ||
            log.description?.toLowerCase().includes(searchLower)
          );
        }

        setLogs(filtered);
      } catch (error) {
        console.error("Error fetching maintenance logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [filters.type, filters.component, filters.startDate, filters.endDate]);

  const getTypeBadge = (type: MaintenanceType) => {
    const variants: Record<MaintenanceType, "default" | "secondary" | "destructive" | "outline"> = {
      [MaintenanceType.PREVENTIVE]: "default",
      [MaintenanceType.REPAIR]: "destructive",
      [MaintenanceType.INSPECTION]: "secondary",
      [MaintenanceType.UPGRADE]: "outline",
      [MaintenanceType.EMERGENCY]: "destructive",
    };

    const labels: Record<MaintenanceType, string> = {
      [MaintenanceType.PREVENTIVE]: "Preventive",
      [MaintenanceType.REPAIR]: "Repair",
      [MaintenanceType.INSPECTION]: "Inspection",
      [MaintenanceType.UPGRADE]: "Upgrade",
      [MaintenanceType.EMERGENCY]: "Emergency",
    };

    return (
      <Badge variant={variants[type]}>
        {labels[type]}
      </Badge>
    );
  };

  const canCreate = session?.user && hasPermission(session.user, "maintenance.create", session.user.permissions);
  const canEdit = session?.user && hasPermission(session.user, "maintenance.edit", session.user.permissions);
  const canDelete = session?.user && hasPermission(session.user, "maintenance.delete", session.user.permissions);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/maintenance/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Failed to delete maintenance log");
        return;
      }

      // Remove from local state
      setLogs((prev) => prev.filter((log) => log.id !== id));
    } catch (error) {
      console.error("Error deleting maintenance log:", error);
      alert("An error occurred while deleting");
    }
  };

  // Get unique components for filter
  const uniqueComponents = Array.from(new Set(logs.map(log => log.component).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((open) => !open)}
          className="inline-flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{filtersOpen ? "Hide filters" : "Show filters"}</span>
        </Button>

        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/maintenance/new">
              <Plus className="mr-2 h-4 w-4" />
              New Maintenance
            </Link>
          </Button>
        )}
      </div>

      {filtersOpen && (
        <Card className="animate-in fade-in slide-in-from-top-1">
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search maintenance..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>

              <Select
                value={filters.type || "all"}
                onValueChange={(value) => setFilters({ ...filters, type: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={MaintenanceType.PREVENTIVE}>Preventive</SelectItem>
                  <SelectItem value={MaintenanceType.REPAIR}>Repair</SelectItem>
                  <SelectItem value={MaintenanceType.INSPECTION}>Inspection</SelectItem>
                  <SelectItem value={MaintenanceType.UPGRADE}>Upgrade</SelectItem>
                  <SelectItem value={MaintenanceType.EMERGENCY}>Emergency</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.component || "all"}
                onValueChange={(value) => setFilters({ ...filters, component: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Components" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Components</SelectItem>
                  {uniqueComponents.map((comp) => (
                    <SelectItem key={comp} value={comp!}>
                      {comp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No maintenance logs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Service Provider</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getTypeBadge(log.type)}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.title}</TableCell>
                    <TableCell>{log.component || "-"}</TableCell>
                    <TableCell>{log.serviceProvider || "-"}</TableCell>
                    <TableCell>
                      {log.cost
                        ? `${Number(log.cost).toLocaleString("en-US", {
                            style: "currency",
                            currency: log.currency,
                          })}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {log.nextDueDate
                        ? format(new Date(log.nextDueDate), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{log.createdBy.name || log.createdBy.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/maintenance/${log.id}`}>View</Link>
                        </Button>
                        {canEdit && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/maintenance/${log.id}/edit`}>Edit</Link>
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the maintenance log
                                  &quot;{log.title}&quot;.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(log.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
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


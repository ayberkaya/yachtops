"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import type { TripStatus } from "@prisma/client";
import {
  Anchor,
  CalendarDays,
  ClipboardCheck,
  Loader2,
  RefreshCcw,
  Route,
  UserCheck,
  ListChecks,
  Save,
  Clock3,
  CheckCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

const CHECKLIST_TYPES = {
  PRE_DEPARTURE: "PRE_DEPARTURE",
  POST_ARRIVAL: "POST_ARRIVAL",
} as const;

const CHECKLIST_TITLES: Record<ChecklistType, string> = {
  PRE_DEPARTURE: "Pre-departure Checklist",
  POST_ARRIVAL: "Post-arrival Checklist",
};

type ChecklistType = (typeof CHECKLIST_TYPES)[keyof typeof CHECKLIST_TYPES];


type ChecklistItem = {
  id: string;
  type: ChecklistType;
  title: string;
  completed: boolean;
  completedAt: string | null;
  remarks: string | null;
  completedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

const FALLBACK_PRE: ChecklistItem[] = [
  {
    id: "pre-fallback-1",
    type: CHECKLIST_TYPES.PRE_DEPARTURE,
    title: "Hydraulic systems primed",
    completed: false,
    completedAt: null,
    remarks: "Test bow/stern thrusters and steering pumps.",
    completedBy: null,
  },
  {
    id: "pre-fallback-2",
    type: CHECKLIST_TYPES.PRE_DEPARTURE,
    title: "Crew radio check",
    completed: false,
    completedAt: null,
    remarks: "All handsets on emergency channel 16/72.",
    completedBy: null,
  },
  {
    id: "pre-fallback-3",
    type: CHECKLIST_TYPES.PRE_DEPARTURE,
    title: "Navigation lights verification",
    completed: false,
    completedAt: null,
    remarks: "Confirm port, starboard, masthead, and anchor lights.",
    completedBy: null,
  },
  {
    id: "pre-fallback-4",
    type: CHECKLIST_TYPES.PRE_DEPARTURE,
    title: "Tender fuel top-off",
    completed: false,
    completedAt: null,
    remarks: "Minimum 75% fuel before departure.",
    completedBy: null,
  },
  {
    id: "pre-fallback-5",
    type: CHECKLIST_TYPES.PRE_DEPARTURE,
    title: "Deck safety walk",
    completed: false,
    completedAt: null,
    remarks: "Remove trip hazards & secure loose lines.",
    completedBy: null,
  },
];

const FALLBACK_POST: ChecklistItem[] = [
  {
    id: "post-fallback-1",
    type: CHECKLIST_TYPES.POST_ARRIVAL,
    title: "Engine room vent closedown",
    completed: false,
    completedAt: null,
    remarks: "Set dampers and fans to harbour mode.",
    completedBy: null,
  },
  {
    id: "post-fallback-2",
    type: CHECKLIST_TYPES.POST_ARRIVAL,
    title: "Shore power connected",
    completed: false,
    completedAt: null,
    remarks: "Confirm load transfer & phase alignment.",
    completedBy: null,
  },
  {
    id: "post-fallback-3",
    type: CHECKLIST_TYPES.POST_ARRIVAL,
    title: "Grey/black tanks scheduled",
    completed: false,
    completedAt: null,
    remarks: "Arrange pump-out or treatment cycle.",
    completedBy: null,
  },
  {
    id: "post-fallback-4",
    type: CHECKLIST_TYPES.POST_ARRIVAL,
    title: "Housekeeping & laundry brief",
    completed: false,
    completedAt: null,
    remarks: "Prioritize guest areas before crew spaces.",
    completedBy: null,
  },
  {
    id: "post-fallback-5",
    type: CHECKLIST_TYPES.POST_ARRIVAL,
    title: "Security log update",
    completed: false,
    completedAt: null,
    remarks: "Record visitors, contractors, local authorities.",
    completedBy: null,
  },
];

type ChecklistState = {
  preDeparture: ChecklistItem[];
  postArrival: ChecklistItem[];
};

type UserSummary = {
  id: string;
  name: string | null;
  email: string;
};

interface VoyagePlanningProps {
  trips: TripOption[];
  canEdit: boolean;
  currentUser: UserSummary;
}

export function VoyagePlanning({ trips, canEdit, currentUser }: VoyagePlanningProps) {
  const preferredTripId = useMemo(() => {
    if (trips.length === 0) return null;
    const ongoing = trips.find((t) => t.status === "ONGOING");
    if (ongoing) return ongoing.id;
    const planned = trips.find((t) => t.status === "PLANNED");
    if (planned) return planned.id;
    return trips[0].id;
  }, [trips]);

  const [selectedTripId, setSelectedTripId] = useState<string | null>(preferredTripId);
  const [checklists, setChecklists] = useState<ChecklistState>({
    preDeparture: [],
    postArrival: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remarksDrafts, setRemarksDrafts] = useState<Record<string, string>>({});
  const [remarksSavingId, setRemarksSavingId] = useState<string | null>(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [activeChecklistType, setActiveChecklistType] = useState<ChecklistType | null>(null);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || null,
    [selectedTripId, trips]
  );
  const isEditableStatus =
    selectedTrip?.status === "PLANNED" || selectedTrip?.status === "ONGOING";
  const canManageChecklist = Boolean(canEdit && isEditableStatus);

  const getChecklistData = (type: ChecklistType) => {
    const items =
      type === CHECKLIST_TYPES.PRE_DEPARTURE ? checklists.preDeparture : checklists.postArrival;
    if (items.length > 0) {
      return { items, isFallback: false };
    }
    return {
      items: type === CHECKLIST_TYPES.PRE_DEPARTURE ? FALLBACK_PRE : FALLBACK_POST,
      isFallback: true,
    };
  };

  const openChecklistDialog = (type: ChecklistType) => {
    setActiveChecklistType(type);
    setIsChecklistDialogOpen(true);
  };

  useEffect(() => {
    if (!selectedTripId) return;
    fetchChecklists(selectedTripId);
  }, [selectedTripId]);

  const fetchChecklists = async (tripId: string, { silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const load = async () => {
        const response = await fetch(`/api/trips/${tripId}/checklists`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || "Unable to load checklists");
        }

        return response.json();
      };

      let data = await load();

      const missingPre = data.preDeparture.length === 0;
      const missingPost = data.postArrival.length === 0;

      if (missingPre || missingPost) {
        await fetch(`/api/trips/${tripId}/checklists/seed`, { method: "POST" });
        data = await load();
      }

      setChecklists(data);
      setRemarksDrafts({});
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Unable to load checklists");
      }
      setChecklists({ preDeparture: [], postArrival: [] });
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const applyChecklistUpdate = (updated: ChecklistItem) => {
    setChecklists((prev) => {
      const targetKey =
        updated.type === CHECKLIST_TYPES.PRE_DEPARTURE ? "preDeparture" : "postArrival";
      return {
        ...prev,
        [targetKey]: prev[targetKey].map((item) =>
          item.id === updated.id ? updated : item
        ),
      };
    });
    setRemarksDrafts((prev) => {
      if (!(updated.id in prev)) return prev;
      const incomingValue = updated.remarks ?? "";
      if (prev[updated.id] === incomingValue) {
        const { [updated.id]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  };

  const handleToggle = async (item: ChecklistItem, completed: boolean) => {
    if (!selectedTripId || !canManageChecklist) return;
    const isFallback = item.id.startsWith("pre-fallback") || item.id.startsWith("post-fallback");
    if (isFallback) {
      applyChecklistUpdate({ ...item, completed });
      return;
    }

    setSavingId(item.id);
    applyChecklistUpdate({
      ...item,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
      completedBy: completed
        ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          }
        : null,
    });

    try {
      const response = await fetch(
        `/api/trips/${selectedTripId}/checklists/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Güncelleme başarısız");
      }

      const updated = await response.json();
      applyChecklistUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checklist update failed");
      applyChecklistUpdate(item); // revert
    } finally {
      setSavingId(null);
    }
  };

  const tripStatusBadge = (status: TripStatus) => {
    const colors: Record<TripStatus, string> = {
      PLANNED: "bg-amber-100 text-amber-800 border-amber-200",
      ONGOING: "bg-blue-100 text-blue-800 border-blue-200",
      COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const handleSaveRemarks = async (item: ChecklistItem, nextRemarks: string) => {
    if (!selectedTripId || !canManageChecklist) return;
    setRemarksSavingId(item.id);
    try {
      const response = await fetch(`/api/trips/${selectedTripId}/checklists/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: nextRemarks.length > 0 ? nextRemarks : null }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Not kaydedilemedi");
      }
      const updated = await response.json();
      applyChecklistUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save note");
    } finally {
      setRemarksSavingId(null);
    }
  };


  const renderChecklist = (title: string, type: ChecklistType, items: ChecklistItem[]) => {
    const { items: displayItems } = getChecklistData(type);
    const hasItems = displayItems.length > 0;
    const isComplete = hasItems && displayItems.every((item) => item.completed);
    const Icon = isComplete ? CheckCircle2 : Clock3;
    const readOnlyNotice = !canManageChecklist
      ? !canEdit
        ? "Checklist is read-only."
        : "Trip must be PLANNED or ONGOING to edit."
      : null;

    const previewItems = displayItems.slice(0, 2);

    return (
      <Card
        className={cn(
          "relative transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isComplete
            ? "border-emerald-300 bg-emerald-50/70 shadow-sm"
            : "border-amber-200/70 bg-background/80"
        )}
        role="button"
        tabIndex={0}
        onClick={() => openChecklistDialog(type)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openChecklistDialog(type);
          }
        }}
      >
        <div className="absolute right-4 top-4">
          <Icon
            className={cn(
              "h-5 w-5",
              isComplete ? "text-emerald-600" : "text-amber-500 animate-pulse"
            )}
          />
        </div>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pr-10">
          <div>
            <CardTitle className="flex items-center gap-2">
              {type === CHECKLIST_TYPES.PRE_DEPARTURE ? (
                <ListChecks className="h-5 w-5" />
              ) : (
                <ClipboardCheck className="h-5 w-5" />
              )}
              {title}
            </CardTitle>
            <CardDescription>
              {type === CHECKLIST_TYPES.PRE_DEPARTURE
                ? "Mandatory actions before leaving port"
                : "Shutdown and handover actions after arrival"}
            </CardDescription>
          </div>
          {readOnlyNotice && (
            <Badge variant="outline" className="text-xs">
              {readOnlyNotice}
            </Badge>
          )}
        </CardHeader>
          <CardContent />
      </Card>
    );
  };

  const renderChecklistDetail = (items: ChecklistItem[], isFallbackList: boolean) => {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">No items defined for this checklist.</p>;
    }

    return (
      <div className="space-y-3 pt-2">
        {isFallbackList && (
          <p className="text-xs text-muted-foreground">
            Sample checklist shown until real checklist items are created.
          </p>
        )}
        {items.map((item) => {
          const who = item.completedBy?.name || item.completedBy?.email;
          const completedAtLabel =
            item.completed && item.completedAt
              ? formatDistanceToNow(new Date(item.completedAt), { addSuffix: true })
              : null;
          const currentDraft = remarksDrafts[item.id] ?? item.remarks ?? "";
          const hasRemarkChanges = currentDraft !== (item.remarks ?? "");
          const isRemarkSaving = remarksSavingId === item.id;
          const isCheckboxSaving = savingId === item.id;
          const disableInteractions = !canManageChecklist;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-md border p-3 transition hover:bg-muted/40"
            >
              <Checkbox
                checked={item.completed}
                disabled={disableInteractions || isCheckboxSaving}
                onCheckedChange={(checked) => handleToggle(item, !!checked)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  {item.completed && <UserCheck className="h-4 w-4 text-emerald-600" />}
                  {isCheckboxSaving && (
                    <Badge variant="secondary" className="text-[10px]">
                      Kaydediliyor...
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                        {item.completed
                          ? `${who || "Completed by"} · ${completedAtLabel || "just now"}`
                          : isFallbackList
                            ? "Sample item (counts as completed when checked)"
                            : "Pending"}
                </p>
                {disableInteractions ? (
                  <p className="text-xs text-muted-foreground pt-2">
                    {item.remarks?.length ? item.remarks : "No notes recorded"}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground pt-2">
                    {item.remarks?.length ? item.remarks : "No notes recorded"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Henüz kayıtlı trip bulunmuyor. Önce bir trip oluşturun.
        </CardContent>
      </Card>
    );
  }

  const activeChecklistData = activeChecklistType
    ? getChecklistData(activeChecklistType)
    : null;
  const activeChecklistLabel = activeChecklistType
    ? CHECKLIST_TITLES[activeChecklistType]
    : "Checklist";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Voyage Planning & Checklists</h1>
          <p className="text-muted-foreground">
            Keep pre/post departure tasks up to date and capture who signed off every step.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm text-muted-foreground">Select trip</Label>
          <Select
            value={selectedTripId ?? undefined}
            onValueChange={(value) => setSelectedTripId(value)}
          >
            <SelectTrigger className="min-w-[240px]">
              <SelectValue placeholder="Trip seçin" />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5" />
              {selectedTrip.name}
              {tripStatusBadge(selectedTrip.status)}
            </CardTitle>
            <CardDescription>
              {selectedTrip.departurePort || "TBD"} → {selectedTrip.arrivalPort || "TBD"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {format(new Date(selectedTrip.startDate), "d MMM yyyy")}
                {selectedTrip.endDate
                  ? ` - ${format(new Date(selectedTrip.endDate), "d MMM yyyy")}`
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Route className="h-4 w-4" />
              <span>Trip code: {selectedTrip.code || "N/A"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTrip && !canManageChecklist && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="py-3 text-sm text-amber-900">
            {canEdit
              ? "Checklists can be updated while the trip is PLANNED or ONGOING."
              : "Only authorized crew members can update the checklist."}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading checklists...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {renderChecklist(
            CHECKLIST_TITLES[CHECKLIST_TYPES.PRE_DEPARTURE],
            CHECKLIST_TYPES.PRE_DEPARTURE,
            checklists.preDeparture
          )}
          {renderChecklist(
            CHECKLIST_TITLES[CHECKLIST_TYPES.POST_ARRIVAL],
            CHECKLIST_TYPES.POST_ARRIVAL,
            checklists.postArrival
          )}
        </div>
      )}

      <Dialog
        open={isChecklistDialogOpen}
        onOpenChange={(open) => {
          setIsChecklistDialogOpen(open);
          if (!open) {
            setActiveChecklistType(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeChecklistLabel}</DialogTitle>
            <DialogDescription>
              {selectedTrip ? selectedTrip.name : "Checklist details"}
            </DialogDescription>
          </DialogHeader>
          {activeChecklistData
            ? renderChecklistDetail(activeChecklistData.items, activeChecklistData.isFallback)
            : (
              <p className="text-sm text-muted-foreground">
                Unable to load checklist details.
              </p>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


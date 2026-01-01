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
  Pencil,
  X,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
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

// Helper function to safely convert completedAt to string
const normalizeCompletedAt = (value: string | null | Date | unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return null;
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

  // Helper to deduplicate checklist items by ID and title+type
  const deduplicateItems = (items: ChecklistItem[]): ChecklistItem[] => {
    const seenById = new Set<string>();
    const seenByTitleType = new Set<string>();
    
    return items.filter((item) => {
      // Skip if duplicate ID
      if (seenById.has(item.id)) {
        return false;
      }
      seenById.add(item.id);
      
      // Skip if duplicate title+type (keep first occurrence)
      const titleTypeKey = `${item.type}:${item.title}`;
      if (seenByTitleType.has(titleTypeKey)) {
        return false;
      }
      seenByTitleType.add(titleTypeKey);
      
      return true;
    });
  };

  // Wrapper for setChecklists that always deduplicates
  const setChecklistsDeduplicated = (updater: ChecklistState | ((prev: ChecklistState) => ChecklistState)) => {
    setChecklists((prev) => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      return {
        preDeparture: deduplicateItems(newState.preDeparture),
        postArrival: deduplicateItems(newState.postArrival),
      };
    });
  };
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remarksDrafts, setRemarksDrafts] = useState<Record<string, string>>({});
  const [remarksSavingId, setRemarksSavingId] = useState<string | null>(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [activeChecklistType, setActiveChecklistType] = useState<ChecklistType | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editRemarks, setEditRemarks] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState<string>("");
  const [newItemRemarks, setNewItemRemarks] = useState<string>("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

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
    
    // Aggressive deduplication: by ID and by title+type
    const deduplicateItems = (items: ChecklistItem[]): ChecklistItem[] => {
      const seenById = new Set<string>();
      const seenByTitleType = new Set<string>();
      
      return items.filter((item) => {
        // Skip if duplicate ID
        if (seenById.has(item.id)) {
          return false;
        }
        seenById.add(item.id);
        
        // Skip if duplicate title+type (keep first occurrence)
        const titleTypeKey = `${item.type}:${item.title}`;
        if (seenByTitleType.has(titleTypeKey)) {
          return false;
        }
        seenByTitleType.add(titleTypeKey);
        
        return true;
      });
    };
    
    if (items.length > 0) {
      return { items: deduplicateItems(items), isFallback: false };
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

      // Normalize the data to match ChecklistItem type and deduplicate by ID
      const normalizeItems = (items: any[]): ChecklistItem[] => {
        const normalized = items.map((item: any) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          completed: item.completed,
          completedAt: item.completedAt
            ? typeof item.completedAt === "string"
              ? item.completedAt
              : new Date(item.completedAt).toISOString()
            : null,
          remarks: item.remarks,
          completedBy: item.completedBy
            ? {
                id: item.completedBy.id,
                name: item.completedBy.name,
                email: item.completedBy.email,
              }
            : null,
        }));
        
        // Deduplicate by ID, keeping the first occurrence
        const seen = new Set<string>();
        return normalized.filter((item) => {
          if (seen.has(item.id)) {
            return false;
          }
          seen.add(item.id);
          return true;
        });
      };

      const normalized = {
        preDeparture: normalizeItems(data.preDeparture),
        postArrival: normalizeItems(data.postArrival),
      };

      setChecklistsDeduplicated(normalized);
      setRemarksDrafts({});
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Unable to load checklists");
      }
      setChecklistsDeduplicated({ preDeparture: [], postArrival: [] });
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const applyChecklistUpdate = (updated: ChecklistItem) => {
    setChecklistsDeduplicated((prev) => {
      const targetKey =
        updated.type === CHECKLIST_TYPES.PRE_DEPARTURE ? "preDeparture" : "postArrival";
      const currentList = prev[targetKey];
      const existingIndex = currentList.findIndex((item) => item.id === updated.id);
      
      let newList;
      if (existingIndex >= 0) {
        // Update existing item
        newList = currentList.map((item) =>
          item.id === updated.id
            ? {
                ...updated,
                completedAt: normalizeCompletedAt(updated.completedAt),
              }
            : item
        );
      } else {
        // Add new item if it doesn't exist
        newList = [
          ...currentList,
          {
            ...updated,
            completedAt: normalizeCompletedAt(updated.completedAt),
          },
        ];
      }
      
      return {
        ...prev,
        [targetKey]: newList,
      };
    });
  };

  const handleToggle = async (item: ChecklistItem, completed: boolean) => {
    if (!selectedTripId || !canManageChecklist) return;
    const isFallback = item.id.startsWith("pre-fallback") || item.id.startsWith("post-fallback");
    if (isFallback) {
      setChecklistsDeduplicated((prev) => {
        const typeKey =
          item.type === CHECKLIST_TYPES.PRE_DEPARTURE ? "preDeparture" : "postArrival";
        const template =
          item.type === CHECKLIST_TYPES.PRE_DEPARTURE ? FALLBACK_PRE : FALLBACK_POST;

        const currentList =
          prev[typeKey].length > 0 ? prev[typeKey] : template.map((fallback) => ({ ...fallback }));

        const updatedList = currentList.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                completed,
                completedAt: completed ? new Date().toISOString() : null,
                completedBy: completed
                  ? {
                      id: currentUser.id,
                      name: currentUser.name,
                      email: currentUser.email,
                    }
                  : null,
              }
            : entry
        );

        return {
          ...prev,
          [typeKey]: updatedList,
        };
      });
      return;
    }

    setSavingId(item.id);
    
    // Optimistic update
    const optimisticUpdate: ChecklistItem = {
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
    };
    applyChecklistUpdate(optimisticUpdate);

    try {
      const response = await fetch(
        `/api/trips/${selectedTripId}/checklists/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || `HTTP ${response.status}: Güncelleme başarısız`;
        const details = responseData.details ? `: ${responseData.details}` : "";
        throw new Error(`${errorMessage}${details}`);
      }

      // Normalize the response to match ChecklistItem type
      const normalized: ChecklistItem = {
        id: responseData.id,
        type: responseData.type || item.type,
        title: responseData.title || item.title,
        completed: responseData.completed !== undefined ? responseData.completed : completed,
        completedAt: responseData.completedAt
          ? typeof responseData.completedAt === "string"
            ? responseData.completedAt
            : new Date(responseData.completedAt).toISOString()
          : null,
        remarks: responseData.remarks ?? item.remarks ?? null,
        completedBy: responseData.completedBy
          ? {
              id: responseData.completedBy.id,
              name: responseData.completedBy.name,
              email: responseData.completedBy.email,
            }
          : null,
      };
      applyChecklistUpdate(normalized);
    } catch (err) {
      console.error("Checklist update error:", err);
      let errorMessage = "Checklist update failed";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      // Revert to original state
      applyChecklistUpdate(item);
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

  const handleEditItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditRemarks(item.remarks || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTripId || !editingItemId || !canManageChecklist) return;
    if (!editTitle.trim()) {
      setError("Title is required");
      return;
    }

    setSavingId(editingItemId);
    try {
      const response = await fetch(`/api/trips/${selectedTripId}/checklists/${editingItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          remarks: editRemarks.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Failed to update item");
      }

      const updated = await response.json();
      applyChecklistUpdate(updated);
      setIsEditDialogOpen(false);
      setEditingItemId(null);
      setEditTitle("");
      setEditRemarks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update item");
    } finally {
      setSavingId(null);
    }
  };

  const handleAddNewItem = async () => {
    if (!selectedTripId || !activeChecklistType || !canManageChecklist) return;
    if (!newItemTitle.trim()) {
      setError("Title is required");
      return;
    }

    setIsAddingItem(true);
    try {
      const { items } = getChecklistData(activeChecklistType);
      const maxOrderIndex = items.length > 0 
        ? Math.max(...items.map(item => {
            // Extract orderIndex from item if it exists, otherwise use 0
            return (item as any).orderIndex ?? 0;
          }))
        : -1;

      const response = await fetch(`/api/trips/${selectedTripId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeChecklistType,
          title: newItemTitle.trim(),
          remarks: newItemRemarks.trim() || null,
          orderIndex: maxOrderIndex + 1,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Failed to create item");
      }

      const newItem = await response.json();
      applyChecklistUpdate(newItem);
      setIsAddDialogOpen(false);
      setNewItemTitle("");
      setNewItemRemarks("");
      await fetchChecklists(selectedTripId, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create item");
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (item: ChecklistItem) => {
    if (!selectedTripId || !canManageChecklist) return;
    
    // Confirm deletion
    if (!confirm("Are you sure you want to delete this checklist item?")) {
      return;
    }

    setDeletingItemId(item.id);
    try {
      const response = await fetch(`/api/trips/${selectedTripId}/checklists/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Failed to delete item");
      }

      // Remove from state
      setChecklistsDeduplicated((prev) => {
        const targetKey =
          item.type === CHECKLIST_TYPES.PRE_DEPARTURE ? "preDeparture" : "postArrival";
        return {
          ...prev,
          [targetKey]: prev[targetKey].filter((i) => i.id !== item.id),
        };
      });

      // Refresh checklists to ensure consistency
      await fetchChecklists(selectedTripId, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete item");
    } finally {
      setDeletingItemId(null);
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
            : "border-amber-200/70 bg-white"
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
        <div className="absolute -top-[12px] -right-2 z-10">
          <Icon
            className={cn(
              "h-6 w-6",
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

  const renderChecklistDetail = (
    items: ChecklistItem[],
    isFallbackList: boolean
  ) => {
    // Aggressive deduplication: first by ID, then by title+type combination
    // This handles cases where database has duplicate records with different IDs
    const seenById = new Set<string>();
    const seenByTitleType = new Set<string>();
    
    const uniqueItems = items.filter((item) => {
      // First check: skip if we've seen this exact ID
      if (seenById.has(item.id)) {
        return false;
      }
      seenById.add(item.id);
      
      // Second check: skip if we've seen this title+type combination
      // Keep the first occurrence (earliest by ID or creation)
      const titleTypeKey = `${item.type}:${item.title}`;
      if (seenByTitleType.has(titleTypeKey)) {
        return false;
      }
      seenByTitleType.add(titleTypeKey);
      
      return true;
    });

    // Show all items
    const displayItems = uniqueItems;

    return (
      <div className="space-y-3 pt-2">
        {isFallbackList && (
          <p className="text-xs text-muted-foreground">
            Sample checklist shown until real checklist items are created.
          </p>
        )}
        {displayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items defined for this checklist.</p>
        ) : (
          displayItems.map((item) => {
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
            const isFallbackItem = item.id.startsWith("pre-fallback") || item.id.startsWith("post-fallback");

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-md border p-3 transition hover:bg-muted/40"
              >
                <Checkbox
                  checked={item.completed}
                  disabled={disableInteractions || isCheckboxSaving}
                  onCheckedChange={(checked) => handleToggle(item, !!checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    {item.completed && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <UserCheck className="h-[25px] w-[25px] text-emerald-600" />
                        <span>{who || "Completed by"}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.completed ? completedAtLabel || "just now" : "Pending"}
                  </p>
                  <p className="text-xs text-muted-foreground pt-2">
                    {item.remarks?.length ? item.remarks : "No notes recorded"}
                  </p>
                </div>
                {canManageChecklist && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className="h-8 w-8 p-0"
                      disabled={deletingItemId === item.id || isFallbackItem}
                      title="Edit item"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                      disabled={deletingItemId === item.id || isFallbackItem}
                      title="Delete item"
                    >
                      {deletingItemId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
        {canManageChecklist && (
          <Card
            className="border-dashed border-2 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => {
              setNewItemTitle("");
              setNewItemRemarks("");
              setIsAddDialogOpen(true);
            }}
          >
            <CardContent className="flex items-center justify-center gap-2 py-6">
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Add New Item</span>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const hasTrips = trips.length > 0;

  const activeChecklistData = activeChecklistType
    ? getChecklistData(activeChecklistType)
    : null;
  const activeChecklistLabel = activeChecklistType
    ? CHECKLIST_TITLES[activeChecklistType]
    : "Checklist";

  if (!hasTrips) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Henüz kayıtlı trip bulunmuyor. Önce bir trip oluşturun.
        </CardContent>
      </Card>
    );
  }

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
        <Card className="relative">
          <div className="absolute -top-3 right-0 z-10">
            {tripStatusBadge(selectedTrip.status)}
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5" />
              {selectedTrip.name}
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

      {selectedTrip?.status === "COMPLETED" ? null : isLoading ? (
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
          if (!open && savingId === null) {
            setActiveChecklistType(null);
            setIsChecklistDialogOpen(false);
          } else if (open) {
            setIsChecklistDialogOpen(true);
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
          {activeChecklistData ? (
            <>
              {renderChecklistDetail(
                activeChecklistData.items,
                activeChecklistData.isFallback
              )}
              <DialogFooter>
                <Button
                  onClick={() => setIsChecklistDialogOpen(false)}
                  disabled={savingId !== null}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to load checklist details.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Checklist Item</DialogTitle>
            <DialogDescription>
              Update the title and remarks for this checklist item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter item title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-remarks">Remarks</Label>
              <Textarea
                id="edit-remarks"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Enter remarks or notes (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingItemId(null);
                setEditTitle("");
                setEditRemarks("");
              }}
              disabled={savingId !== null}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingId !== null || !editTitle.trim()}>
              {savingId !== null ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Checklist Item</DialogTitle>
            <DialogDescription>
              Create a new item for the {activeChecklistType ? CHECKLIST_TITLES[activeChecklistType] : "checklist"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Enter item title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-remarks">Remarks</Label>
              <Textarea
                id="new-remarks"
                value={newItemRemarks}
                onChange={(e) => setNewItemRemarks(e.target.value)}
                placeholder="Enter remarks or notes (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewItemTitle("");
                setNewItemRemarks("");
              }}
              disabled={isAddingItem}
            >
              Cancel
            </Button>
            <Button onClick={handleAddNewItem} disabled={isAddingItem || !newItemTitle.trim()}>
              {isAddingItem ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { WidgetConfig, WidgetType, DEFAULT_WIDGETS } from "@/types/widgets";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { offlineStorage } from "@/lib/offline-storage";
import { SortableWidgetItem } from "./sortable-widget-item";

interface WidgetCustomizerProps {
  currentWidgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
}

const WIDGET_LABELS: Record<WidgetType, string> = {
  cash_ledger_summary: "Cash Ledger Summary",
  credit_card_expenses: "Credit Card Expenses",
  pending_expenses: "Pending Expenses",
  recent_expenses: "Recent Expenses",
  upcoming_trips: "Upcoming Trips",
  my_tasks: "My Tasks",
  role_tasks_alert: "Tasks Alert",
  upcoming_maintenance: "Upcoming Maintenance",
  expiring_permissions: "Expiring Permissions",
  low_stock_alert: "Low Stock Alert",
  monthly_report: "Monthly Report",
  quick_stats: "Quick Stats",
  calendar_events: "Calendar Events",
};

export function WidgetCustomizer({ currentWidgets, onSave }: WidgetCustomizerProps) {
  const { data: session } = useSession();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(currentWidgets);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update widgets when currentWidgets changes
  useEffect(() => {
    setWidgets(currentWidgets);
  }, [currentWidgets]);

  // Load fresh widgets from API when dialog opens to ensure we have latest state
  useEffect(() => {
    if (open) {
      // Load fresh widgets from API (bypass cache)
      const loadFreshWidgets = async () => {
        try {
          const response = await apiClient.request<{ widgets: WidgetConfig[] }>("/api/dashboard/widgets", {
            useCache: false, // Force fresh fetch
          });
          if (response.data?.widgets && response.data.widgets.length > 0) {
            setWidgets(response.data.widgets);
          } else {
            // Fallback to currentWidgets if API returns empty
            setWidgets(currentWidgets);
          }
        } catch (error) {
          // Fallback to currentWidgets on error
          console.warn("Failed to load fresh widgets, using currentWidgets:", error);
          setWidgets(currentWidgets);
        }
      };
      loadFreshWidgets();
    }
  }, [open]); // Only depend on open, not currentWidgets to avoid loops

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleToggle = (widgetId: WidgetType) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleSave = async () => {
    // If offline, avoid throwing and show friendly message
    if (!apiClient.isOnline) {
      alert("You are offline. Please reconnect to save dashboard widgets.");
      return;
    }

    setSaving(true);
    try {
      // Ensure all widgets have required fields
      const widgetsToSave = widgets.map((widget, index) => ({
        id: widget.id,
        enabled: widget.enabled,
        order: widget.order ?? index,
        size: widget.size,
      }));

      // Log for debugging
      if (process.env.NODE_ENV === "development") {
        console.log("Saving widgets:", widgetsToSave);
      }

      // Widget preferences should not be queued offline - they're not critical
      // Use skipQueue to prevent offline queue and show error immediately if offline
      const response = await apiClient.request("/api/dashboard/widgets", {
        method: "PUT",
        body: JSON.stringify({ widgets: widgetsToSave }),
        skipQueue: true, // Don't queue widget preferences offline
        queueOnOffline: false, // Explicitly disable offline queue
      });
      
      // Check if request was successful
      if (response.status >= 400) {
        const errorMsg = response.data?.error || response.data?.message || "Failed to save widget preferences";
        if (process.env.NODE_ENV === "development") {
          console.error("Save failed:", response.data);
        }
        throw new Error(errorMsg);
      }
      
      // Clear cache for widgets endpoint to force reload
      // Cache key format: METHOD:URL:BODY (URL is full URL)
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const cacheKey = `GET:${origin}/api/dashboard/widgets:`;
      await offlineStorage.deleteCache(cacheKey).catch(() => {}); // Ignore errors if key doesn't exist
      
      // Use the saved widgets from response if available, otherwise use what we sent
      const savedWidgets = response.data?.widgets || widgetsToSave;
      onSave(savedWidgets);
      setOpen(false);
    } catch (error) {
      console.error("Error saving widgets:", error);
      const errorMessage =
        error instanceof Error
          ? error.message === "Network request failed and no offline fallback available"
            ? "Network error while saving widgets. Please check your connection and try again."
            : error.message
          : "Failed to save widget preferences. Please try again.";
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!session?.user?.role) return;
    const defaultWidgets = DEFAULT_WIDGETS[session.user.role] || [];
    setWidgets(defaultWidgets);
  };

  const enabledWidgets = widgets.filter((w) => w.enabled);
  const disabledWidgets = widgets.filter((w) => !w.enabled);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10"
          aria-label="Customize Dashboard"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Drag widgets to reorder them. Toggle widgets on or off to show or hide them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Enabled Widgets</h3>
              <SortableContext
                items={enabledWidgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {enabledWidgets.map((widget) => (
                    <SortableWidgetItem
                      key={widget.id}
                      widget={widget}
                      label={WIDGET_LABELS[widget.id] || widget.id}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>

            {disabledWidgets.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Disabled Widgets</h3>
                <div className="space-y-2">
                  {disabledWidgets.map((widget) => (
                    <SortableWidgetItem
                      key={widget.id}
                      widget={widget}
                      label={WIDGET_LABELS[widget.id] || widget.id}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            )}
          </DndContext>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


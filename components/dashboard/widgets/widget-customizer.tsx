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
import { Settings2 } from "lucide-react";
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
import { SortableWidgetItem } from "./sortable-widget-item";

interface WidgetCustomizerProps {
  currentWidgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
}

const WIDGET_LABELS: Record<WidgetType, string> = {
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

  useEffect(() => {
    setWidgets(currentWidgets);
  }, [currentWidgets]);

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
    setSaving(true);
    try {
      await apiClient.request("/api/dashboard/widgets", {
        method: "PUT",
        body: JSON.stringify({ widgets }),
      });
      onSave(widgets);
      setOpen(false);
    } catch (error) {
      console.error("Error saving widgets:", error);
      alert("Failed to save widget preferences. Please try again.");
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
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Customize Dashboard
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


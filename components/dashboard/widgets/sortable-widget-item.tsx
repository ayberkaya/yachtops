"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { WidgetConfig, WidgetType } from "@/types/widgets";

interface SortableWidgetItemProps {
  widget: WidgetConfig;
  label: string;
  onToggle: (widgetId: WidgetType) => void;
}

export function SortableWidgetItem({ widget, label, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 border rounded-lg ${
        widget.enabled ? "bg-card" : "bg-muted/50"
      } ${isDragging ? "z-50" : ""}`}
    >
      {widget.enabled && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <Checkbox
        checked={widget.enabled}
        onCheckedChange={() => onToggle(widget.id)}
        id={`widget-${widget.id}`}
      />
      <label
        htmlFor={`widget-${widget.id}`}
        className={`flex-1 cursor-pointer ${
          widget.enabled ? "" : "text-muted-foreground"
        }`}
      >
        {label}
      </label>
    </div>
  );
}


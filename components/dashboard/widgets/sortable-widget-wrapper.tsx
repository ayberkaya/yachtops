"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SortableWidgetWrapperProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function SortableWidgetWrapper({ id, children, className }: SortableWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group", isDragging ? "z-50" : "", className)}
    >
      <div className="absolute left-0 top-0 h-full w-6 flex items-start justify-center pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted/50"
          aria-label="Drag to reorder widget"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      {children}
    </div>
  );
}


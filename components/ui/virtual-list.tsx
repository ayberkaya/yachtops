"use client";

import { useMemo, useRef, useEffect, useState } from "react";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    return { start: Math.max(0, start - overscan), end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(
    () => items.slice(visibleRange.start, visibleRange.end),
    [items, visibleRange.start, visibleRange.end]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) =>
            renderItem(item, visibleRange.start + index)
          )}
        </div>
      </div>
    </div>
  );
}


"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface SearchableSelectContentProps extends Omit<React.ComponentProps<typeof SelectPrimitive.Content>, "children"> {
  children: React.ReactNode;
  items: Array<{ value: string; label: string }>;
  searchPlaceholder?: string;
  minItemsForSearch?: number;
  onValueChange?: (value: string) => void;
}

export function SearchableSelectContent({
  children,
  items,
  searchPlaceholder = "Search...",
  minItemsForSearch = 5,
  onValueChange,
  className,
  ...props
}: SearchableSelectContentProps) {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  // Filter items based on search - memoized for performance
  const filteredItems = useMemo(() => {
    if (!search.trim() || items.length < minItemsForSearch) {
      return items;
    }
    const searchLower = search.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchLower) ||
        item.value.toLowerCase().includes(searchLower)
    );
  }, [search, items, minItemsForSearch]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && items.length >= minItemsForSearch) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, items.length, minItemsForSearch]);

  // Handle keyboard input when dropdown is open
  useEffect(() => {
    if (!isOpen || items.length < minItemsForSearch) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      if (
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Tab" ||
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          setSearch((prev) => prev + e.key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, items.length, minItemsForSearch]);

  const showSearch = items.length >= minItemsForSearch;

  return (
    <SelectContent
      className={`${showSearch ? "p-0" : ""} ${className || ""}`}
      {...props}
    >
      {showSearch && (
        <div className="sticky top-0 z-10 bg-white border-b border-border/50 p-2 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                e.stopPropagation();
                setSearch(e.target.value);
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  setSearch("");
                }
                if (e.key === "Enter" && search.trim()) {
                  e.preventDefault();
                }
              }}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
      )}
      {children}
    </SelectContent>
  );
}


import { useState, useEffect, useRef, useMemo } from "react";

interface UseSearchableSelectOptions<T> {
  items: T[];
  searchKeys: (item: T) => string[];
  minItemsForSearch?: number;
  onSearchChange?: (search: string) => void;
}

export function useSearchableSelect<T>({
  items,
  searchKeys,
  minItemsForSearch = 5,
  onSearchChange,
}: UseSearchableSelectOptions<T>) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search - memoized for performance
  const filteredItems = useMemo(() => {
    if (!search.trim() || items.length < minItemsForSearch) {
      return items;
    }
    const searchLower = search.toLowerCase().trim();
    return items.filter((item) =>
      searchKeys(item).some((key) => key.toLowerCase().includes(searchLower))
    );
  }, [search, items, searchKeys, minItemsForSearch]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && items.length >= minItemsForSearch) {
      // Small delay to ensure the dropdown is fully rendered
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
      // Ignore if user is already typing in the search input
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      // Ignore special keys (Escape, Enter, Arrow keys, etc.)
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

      // If it's a printable character, focus input and append it
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearch(""); // Reset search when dropdown closes
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const resetSearch = () => {
    setSearch("");
  };

  return {
    search,
    setSearch: handleSearchChange,
    isOpen,
    setIsOpen: handleOpenChange,
    filteredItems,
    searchInputRef,
    resetSearch,
    showSearch: items.length >= minItemsForSearch,
  };
}


"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { History, Pencil, Plus, Trash2, Minus, Settings, AlertTriangle, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryHistoryEntry {
  at: string;
  userId: string;
  action: "create" | "update" | "delete";
  note?: string | null;
}

interface CategoryOption {
  value: string;
  label: string;
}

interface InventorySectionViewProps {
  apiBasePath: string; // e.g. "/api/inventory/food-provisions"
  initialItems: InventoryItem[];
  categories: CategoryOption[];
  defaultUnit: string;
  unitOptions?: Array<{ value: string; label: string }>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function InventorySectionView({
  apiBasePath,
  initialItems,
  categories,
  defaultUnit,
  unitOptions,
}: InventorySectionViewProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [historyForId, setHistoryForId] = useState<string | null>(null);
  const [history, setHistory] = useState<InventoryHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsItem, setSettingsItem] = useState<InventoryItem | null>(null);
  const [settingsForm, setSettingsForm] = useState<{
    category: string;
    lowStockThreshold: string;
  }>({
    category: "NONE",
    lowStockThreshold: "",
  });

  // Sort categories alphabetically (excluding "NONE")
  const sortedCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "NONE", label: "No category" }, ...sorted];
  }, [categories]);

  const categoryOptions = useMemo(() => sortedCategories, [sortedCategories]);
  const unitOptionList = useMemo(
    () => unitOptions ?? [{ value: defaultUnit, label: defaultUnit }],
    [unitOptions, defaultUnit]
  );

  const [form, setForm] = useState<{
    name: string;
    category: string;
    quantity: string;
    unit: string;
    lowStockThreshold: string;
    location: string;
    notes: string;
  }>({
    name: "",
    category: "NONE",
    quantity: "0",
    unit: defaultUnit,
    lowStockThreshold: "",
    location: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      category: "NONE",
      quantity: "0",
      unit: defaultUnit,
      lowStockThreshold: "",
      location: "",
      notes: "",
    });
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category ?? "NONE",
      quantity: String(item.quantity),
      unit: item.unit || defaultUnit,
      lowStockThreshold: item.lowStockThreshold === null ? "" : String(item.lowStockThreshold),
      location: item.location ?? "",
      notes: item.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category === "NONE" ? null : form.category,
          quantity: Number(form.quantity || 0),
          unit: form.unit || defaultUnit,
          lowStockThreshold: form.lowStockThreshold === "" ? null : Number(form.lowStockThreshold),
          location: form.location.trim() ? form.location.trim() : null,
          notes: form.notes.trim() ? form.notes.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error || data?.message || "Failed to create item";
        alert(msg);
        return;
      }
      setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${apiBasePath}/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category === "NONE" ? null : form.category,
          quantity: Number(form.quantity || 0),
          unit: form.unit || defaultUnit,
          lowStockThreshold: form.lowStockThreshold === "" ? null : Number(form.lowStockThreshold),
          location: form.location.trim() ? form.location.trim() : null,
          notes: form.notes.trim() ? form.notes.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error || data?.message || "Failed to update item";
        alert(msg);
        return;
      }

      setItems((prev) => prev.map((it) => (it.id === editing.id ? data : it)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditOpen(false);
      setEditing(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const ok = confirm(`Delete "${item.name}"?`);
    if (!ok) return;

    setIsSaving(true);
    try {
      const res = await fetch(`${apiBasePath}/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error || data?.message || "Failed to delete item";
        alert(msg);
        return;
      }
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewHistory = async (itemId: string) => {
    setHistoryForId(itemId);
    setHistory([]);
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${apiBasePath}/${itemId}/history`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        const msg = data?.error || data?.message || "Failed to load history";
        alert(msg);
        return;
      }
      setHistory(Array.isArray(data) ? data : []);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateQuantity = async (item: InventoryItem, delta: number) => {
    const newQuantity = Math.max(0, item.quantity + delta);
    setIsSaving(true);
    try {
      const res = await fetch(`${apiBasePath}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        alert("Failed to update quantity");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSettings = (item: InventoryItem) => {
    setSettingsItem(item);
    setSettingsForm({
      category: item.category ?? "NONE",
      lowStockThreshold: item.lowStockThreshold === null ? "" : String(item.lowStockThreshold),
    });
    setSettingsOpen(true);
  };

  const handleUpdateSettings = async () => {
    if (!settingsItem) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${apiBasePath}/${settingsItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: settingsForm.category === "NONE" ? null : settingsForm.category,
          lowStockThreshold: settingsForm.lowStockThreshold === "" ? null : Number(settingsForm.lowStockThreshold),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((it) => (it.id === settingsItem.id ? updated : it)).sort((a, b) => a.name.localeCompare(b.name)));
        setSettingsOpen(false);
        setSettingsItem(null);
      } else {
        alert("Failed to update settings");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isLowStock = (item: InventoryItem): boolean => {
    if (item.lowStockThreshold === null) return false;
    return item.quantity <= item.lowStockThreshold;
  };

  const filteredItems = useMemo(() => {
    if (categoryFilter === "ALL") return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [items, categoryFilter]);

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 leading-tight">
        {category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle>Add Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Enter item name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="flex-1"
              />
              <Select value={form.category} onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Select value={form.unit} onValueChange={(v) => setForm((s) => ({ ...s, unit: v }))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptionList.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Quantity"
                value={form.quantity}
                onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
                className="w-[120px]"
              />
              <Button 
                onClick={handleCreate} 
                disabled={isSaving || !form.name.trim()}
                className="h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">Current Items</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {selectedItemId && (() => {
                const selectedItem = items.find(i => i.id === selectedItemId);
                if (!selectedItem) return null;
                return (
                  <>
                    <Dialog
                      open={historyOpen && historyForId === selectedItem.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setHistoryOpen(false);
                          setHistoryForId(null);
                          setHistory([]);
                        } else {
                          handleViewHistory(selectedItem.id);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title="View history"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Item History: {selectedItem.name}</DialogTitle>
                          <DialogDescription>
                            View all changes made to this item
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] pr-4">
                          {loadingHistory ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Loading history...</p>
                          ) : history.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No history available</p>
                          ) : (
                            <div className="space-y-4">
                              {history.map((h, idx) => (
                                <div key={`${historyForId}-${idx}`} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium">{h.action}</div>
                                    <div className="text-xs text-muted-foreground">{formatDate(h.at)}</div>
                                  </div>
                                  {h.note ? <div className="text-muted-foreground mt-1">{h.note}</div> : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title="Settings"
                      onClick={() => handleOpenSettings(selectedItem)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(selectedItem)}
                      className="h-8 w-8"
                      title="Delete"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                );
              })()}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[165px]">
                  <Filter className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Categories</SelectItem>
                  {sortedCategories.filter(c => c.value !== "NONE").map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {items.length === 0 
                ? "No items yet. Add one above to get started."
                : "No items found for selected category."}
            </p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {filteredItems.map((item) => {
                const isLow = isLowStock(item);
                return (
                  <div
                    key={item.id}
                    className={`relative flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3 px-3 md:px-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isLow
                        ? selectedItemId === item.id
                          ? "border-yellow-400 bg-red-600/95 dark:bg-red-700/95 shadow-lg ring-2 ring-yellow-400/50"
                          : "border-red-600 bg-red-600/90 dark:bg-red-700/90 shadow-sm"
                        : selectedItemId === item.id 
                          ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-2 ring-primary/20" 
                          : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                  >
                    {getCategoryBadge(item.category) && (
                      <div className="absolute -top-[12px] left-2 md:left-0 z-10">
                        {getCategoryBadge(item.category)}
                      </div>
                    )}
                    <div className={`flex-1 min-w-0 ${!isLow ? "!text-black" : ""}`}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3
                          className={`font-semibold text-sm md:text-base truncate ${isLow ? "text-white" : "!text-black"}`}
                        >
                          {item.name}
                        </h3>
                        {isLow && (
                          <Badge variant="destructive" className="gap-1 bg-red-700 hover:bg-red-800 border-red-800 text-[9px] md:text-[10px] px-1.5 py-0.5 flex-shrink-0">
                            <AlertTriangle className="h-2 w-2 md:h-2.5 md:w-2.5" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-2 md:gap-4 text-xs md:text-sm font-medium ${isLow ? "text-white" : "!text-black"}`}
                      >
                        <span className="whitespace-nowrap">
                          Quantity: <strong className={`font-semibold text-xs md:text-sm ${isLow ? "text-white" : "!text-black"}`}>
                            {item.quantity}
                          </strong> {item.unit}
                        </span>
                        {item.location && (
                          <span className="whitespace-nowrap text-xs md:text-sm">
                            Location: {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateQuantity(item, -1);
                        }}
                        className={`h-7 w-7 md:h-8 md:w-8 ${!isLow ? "!text-black [&_svg]:!stroke-black" : ""}`}
                        disabled={isSaving}
                      >
                        <Minus className={`h-3.5 w-3.5 md:h-4 md:w-4 ${!isLow ? "!text-black !stroke-black" : "text-white stroke-white"}`} />
                      </Button>
                      <span
                        className={`w-10 md:w-12 text-center font-semibold text-xs md:text-sm ${!isLow ? "!text-black" : "text-white"}`}
                      >
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateQuantity(item, 1);
                        }}
                        className={`h-7 w-7 md:h-8 md:w-8 ${!isLow ? "!text-black [&_svg]:!stroke-black" : ""}`}
                        disabled={isSaving}
                      >
                        <Plus className={`h-3.5 w-3.5 md:h-4 md:w-4 ${!isLow ? "!text-black !stroke-black" : "text-white stroke-white"}`} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Settings</DialogTitle>
            <DialogDescription>
              Update category and alert threshold for {settingsItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Category</Label>
              <Select 
                value={settingsForm.category} 
                onValueChange={(v) => setSettingsForm((s) => ({ ...s, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="Leave empty to disable alert"
                value={settingsForm.lowStockThreshold}
                onChange={(e) => setSettingsForm((s) => ({ ...s, lowStockThreshold: e.target.value }))}
              />
              {settingsItem && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current stock: {settingsItem.quantity} {settingsItem.unit}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings} disabled={isSaving}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>Update fields and save.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((s) => ({ ...s, unit: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptionList.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input inputMode="decimal" value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Low stock threshold (optional)</Label>
                <Input inputMode="decimal" value={form.lowStockThreshold} onChange={(e) => setForm((s) => ({ ...s, lowStockThreshold: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Location (optional)</Label>
              <Input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving || !form.name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}



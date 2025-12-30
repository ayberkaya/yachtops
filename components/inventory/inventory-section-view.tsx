"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { History, Pencil, Plus, Trash2 } from "lucide-react";

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

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [historyForId, setHistoryForId] = useState<string | null>(null);
  const [history, setHistory] = useState<InventoryHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const categoryOptions = useMemo(() => [{ value: "NONE", label: "None" }, ...categories], [categories]);
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
      setAddOpen(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-4 md:px-0">
        <div className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add item</DialogTitle>
              <DialogDescription>Create a new inventory item for this vessel.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Detergent" />
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
                  <Input inputMode="decimal" value={form.lowStockThreshold} onChange={(e) => setForm((s) => ({ ...s, lowStockThreshold: e.target.value }))} placeholder="e.g. 2" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Location (optional)</Label>
                <Input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} placeholder="e.g. Pantry" />
              </div>

              <div className="grid gap-2">
                <Label>Notes (optional)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSaving || !form.name.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-3 py-2">Item</th>
              <th className="text-left font-medium px-3 py-2">Qty</th>
              <th className="text-left font-medium px-3 py-2">Location</th>
              <th className="text-left font-medium px-3 py-2">Updated</th>
              <th className="text-right font-medium px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  No items yet.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-3">
                    <div className="font-medium">{it.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {it.category ? <Badge variant="secondary">{it.category}</Badge> : null}
                      {it.lowStockThreshold !== null ? (
                        <Badge variant="outline">Low ≤ {it.lowStockThreshold}</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="px-3 py-3">{it.location || "-"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDate(it.updatedAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewHistory(it.id)}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(it)} disabled={isSaving}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-2 px-4">
        {items.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">No items yet.</div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {it.quantity} {it.unit}
                    {it.location ? ` • ${it.location}` : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {it.category ? <Badge variant="secondary">{it.category}</Badge> : null}
                    {it.lowStockThreshold !== null ? (
                      <Badge variant="outline">Low ≤ {it.lowStockThreshold}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewHistory(it.id)}>
                    <History className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="destructive" onClick={() => handleDelete(it)} disabled={isSaving}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

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

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>History</DialogTitle>
            <DialogDescription>Recent changes for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {loadingHistory ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : history.length === 0 ? (
              <div className="text-muted-foreground">No history.</div>
            ) : (
              history.map((h, idx) => (
                <div key={`${historyForId}-${idx}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{h.action}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(h.at)}</div>
                  </div>
                  {h.note ? <div className="text-muted-foreground mt-1">{h.note}</div> : null}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



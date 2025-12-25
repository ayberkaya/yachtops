"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, Settings, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OtherItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OtherItemsViewProps {
  initialItems: OtherItem[];
}

const ITEM_CATEGORIES = [
  "SAFETY_EQUIPMENT",
  "WATER_SPORTS",
  "DECK_EQUIPMENT",
  "OTHER",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  SAFETY_EQUIPMENT: "Safety Equipment",
  WATER_SPORTS: "Water Sports",
  DECK_EQUIPMENT: "Deck Equipment",
  OTHER: "Other",
};

const UNITS = ["PIECE", "SET", "PAIR", "BOX", "OTHER"] as const;

const UNIT_LABELS: Record<string, string> = {
  PIECE: "Piece",
  SET: "Set",
  PAIR: "Pair",
  BOX: "Box",
  OTHER: "Other",
};

export function OtherItemsView({ initialItems }: OtherItemsViewProps) {
  const router = useRouter();
  const [items, setItems] = useState<OtherItem[]>(initialItems);
  const [customItem, setCustomItem] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("OTHER");
  const [selectedUnit, setSelectedUnit] = useState<string>("PIECE");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<OtherItem | null>(null);
  const [locationValue, setLocationValue] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const handleAddItem = async () => {
    const name = customItem.trim();
    if (!name) {
      alert("Please enter an item name");
      return;
    }

    setIsAdding(true);

    try {
      const response = await fetch("/api/inventory/other-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: selectedCategory === "OTHER" ? null : selectedCategory,
          quantity: 0,
          unit: selectedUnit,
          location: locationValue.trim() || null,
          notes: notesValue.trim() || null,
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setItems([...items, newItem].sort((a, b) => a.name.localeCompare(b.name)));
        setCustomItem("");
        setSelectedCategory("OTHER");
        setSelectedUnit("PIECE");
        setLocationValue("");
        setNotesValue("");
        router.refresh();
      } else {
        const result = await response.json();
        alert(result.error || "Failed to add item");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateQuantity = async (item: OtherItem, delta: number) => {
    const newQuantity = Math.max(0, item.quantity + delta);

    try {
      const response = await fetch(`/api/inventory/other-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (response.ok) {
        const updated = await response.json();
        setItems(
          items.map((i) => (i.id === item.id ? updated : i)).sort((a, b) => a.name.localeCompare(b.name))
        );
        router.refresh();
      } else {
        alert("Failed to update quantity");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const response = await fetch(`/api/inventory/other-items/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setItems(items.filter((i) => i.id !== id));
        router.refresh();
      } else {
        alert("Failed to delete item");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleUpdateSettings = async (item: OtherItem) => {
    const category = editingItem?.category || null;
    const location = locationValue.trim() || null;
    const notes = notesValue.trim() || null;

    try {
      const response = await fetch(`/api/inventory/other-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          location,
          notes,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setItems(
          items.map((i) => (i.id === item.id ? updated : i)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingItem(null);
        setLocationValue("");
        setNotesValue("");
        router.refresh();
      } else {
        alert("Failed to update item");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const getCategoryBadge = (category: OtherItem["category"]) => {
    if (!category) return null;
    const colors: Record<string, string> = {
      SAFETY_EQUIPMENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      WATER_SPORTS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      DECK_EQUIPMENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return (
      <Badge className={`${colors[category] || colors.OTHER} text-[10px] px-1.5 py-0.5 leading-tight`}>
        {CATEGORY_LABELS[category] || category}
      </Badge>
    );
  };

  const filteredItems = categoryFilter === "ALL"
    ? items
    : items.filter((i) => i.category === categoryFilter || (!i.category && categoryFilter === "OTHER"));

  return (
    <div className="space-y-6">
      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle>Add Other Item to Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <Input
                placeholder="Enter item name"
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Location (optional)"
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddItem}
                disabled={isAdding}
                className="h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to Inventory
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
              <p className="text-sm text-muted-foreground mt-1">
                {items.length} item{items.length !== 1 ? "s" : ""} in inventory
              </p>
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {ITEM_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {items.length === 0
                  ? "No items yet. Add one above to get started."
                  : "No items found in this category."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {getCategoryBadge(item.category)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm text-muted-foreground ml-1">
                          {UNIT_LABELS[item.unit] || item.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.location || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {item.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(item);
                                setLocationValue(item.location || "");
                                setNotesValue(item.notes || "");
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Item Settings</DialogTitle>
                              <DialogDescription>
                                Update category, location, and notes for {item.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-category">Category</Label>
                                <Select
                                  value={editingItem?.category || "OTHER"}
                                  onValueChange={(v) => {
                                    if (editingItem) {
                                      setEditingItem({ ...editingItem, category: v === "OTHER" ? null : v });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ITEM_CATEGORIES.map((cat) => (
                                      <SelectItem key={cat} value={cat}>
                                        {CATEGORY_LABELS[cat]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-location">Location</Label>
                                <Input
                                  id="edit-location"
                                  value={locationValue}
                                  onChange={(e) => setLocationValue(e.target.value)}
                                  placeholder="e.g., Deck Storage, Cabin"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-notes">Notes</Label>
                                <Input
                                  id="edit-notes"
                                  value={notesValue}
                                  onChange={(e) => setNotesValue(e.target.value)}
                                  placeholder="Additional notes..."
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingItem(null);
                                  setLocationValue("");
                                  setNotesValue("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button onClick={() => editingItem && handleUpdateSettings(editingItem)}>
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

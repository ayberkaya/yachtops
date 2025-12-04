"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { ItemUnit, ShoppingListStatus } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  defaultUnit: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: ItemUnit;
  isCompleted: boolean;
  notes: string | null;
  productId: string | null;
}

interface ShoppingListDetailProps {
  listId: string;
  products: Product[];
  onClose: () => void;
  onUpdate: (list: any) => void;
  onDelete: (listId: string) => void;
}

export function ShoppingListDetail({
  listId,
  products,
  onClose,
  onUpdate,
  onDelete,
}: ShoppingListDetailProps) {
  const router = useRouter();
  const [list, setList] = useState<any>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [lastCompletedItem, setLastCompletedItem] = useState<ShoppingItem | null>(null);
  
  // New item form state
  const [productName, setProductName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState<ItemUnit>(ItemUnit.PIECE);
  const [newItemNotes, setNewItemNotes] = useState("");

  useEffect(() => {
    fetchList();
    fetchItems();
  }, [listId]);

  const fetchList = async () => {
    try {
      const response = await fetch(`/api/shopping-lists/${listId}`);
      if (response.ok) {
        const data = await response.json();
        setList(data);
      }
    } catch (error) {
      console.error("Error fetching list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/shopping-items?listId=${listId}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const handleAddItem = async () => {
    const trimmedProductName = productName.trim();

    if (!trimmedProductName) return;

    try {
      const response = await fetch("/api/shopping-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId,
          productId: null,
          name: trimmedProductName,
          quantity: parseFloat(newItemQuantity) || 1,
          unit: newItemUnit,
          notes: newItemNotes || null,
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setItems((prev) => [...prev, newItem]);
        // Reset form
        setProductName("");
        setNewItemQuantity("1");
        setNewItemUnit(ItemUnit.PIECE);
        setNewItemNotes("");
        router.refresh();
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleUpdateItem = async (item: ShoppingItem, updates: Partial<ShoppingItem>) => {
    try {
      const response = await fetch(`/api/shopping-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        const updatedItems = items.map((i) => (i.id === item.id ? updatedItem : i));
        setItems(updatedItems);
        
        // Check if all items are completed after this update
        const allCompleted = updatedItems.length > 0 && updatedItems.every((i) => i.isCompleted);
        if (allCompleted && list?.status !== ShoppingListStatus.COMPLETED) {
          // Store the last completed item to revert if user cancels
          setLastCompletedItem(item);
          setIsCompleteDialogOpen(true);
        }
        
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const response = await fetch(`/api/shopping-items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const toggleItemComplete = async (item: ShoppingItem) => {
    await handleUpdateItem(item, { isCompleted: !item.isCompleted });
  };

  const handleCompleteList = async () => {
    if (!list) return;
    
    try {
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: ShoppingListStatus.COMPLETED,
        }),
      });

      if (response.ok) {
        const updatedList = await response.json();
        setList(updatedList);
        onUpdate(updatedList);
        setIsCompleteDialogOpen(false);
        setLastCompletedItem(null);
        router.refresh();
      }
    } catch (error) {
      console.error("Error completing list:", error);
    }
  };

  const handleCancelComplete = async () => {
    setIsCompleteDialogOpen(false);
    
    // Revert the last completed item
    if (lastCompletedItem) {
      await handleUpdateItem(lastCompletedItem, { isCompleted: false });
      setLastCompletedItem(null);
    }
  };

  const unitLabels: Record<ItemUnit, string> = {
    PIECE: "Adet",
    KG: "Kg",
    LITER: "Litre",
    GRAM: "Gram",
    PACK: "Paket",
    BOX: "Kutu",
    BOTTLE: "Şişe",
    OTHER: "Diğer",
  };


  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">Loading...</CardContent>
      </Card>
    );
  }

  if (!list) {
    return (
      <Card>
        <CardContent className="p-8 text-center">List not found</CardContent>
      </Card>
    );
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;

  const isListCompleted = list.status === ShoppingListStatus.COMPLETED;

  return (
    <Card className={isListCompleted ? "border-green-600 bg-green-600 text-white" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isListCompleted && (
              <CheckCircle2 className="h-6 w-6 text-green-200" />
            )}
            <div>
              <CardTitle className={isListCompleted ? "text-white font-bold" : ""}>
                {list.name}
              </CardTitle>
              {list.description && (
                <p className={`text-sm mt-1 ${isListCompleted ? "text-white/90" : "text-muted-foreground"}`}>{list.description}</p>
              )}
              <p className={`text-sm mt-1 ${isListCompleted ? "text-white" : "text-muted-foreground"}`}>
                {completedCount}/{totalCount} completed
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Item Form */}
        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
          <div className="flex gap-2">
            <Input
              placeholder="Product name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Qty"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              className="w-20"
            />
            <Select
              value={newItemUnit}
              onValueChange={(value) => setNewItemUnit(value as ItemUnit)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(unitLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddItem}
              disabled={!productName.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items yet. Add your first item.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className={item.isCompleted ? "opacity-60" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={item.isCompleted}
                      onCheckedChange={() => toggleItemComplete(item)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.isCompleted ? (
                      <span className="line-through">{item.name}</span>
                    ) : (
                      item.name
                    )}
                  </TableCell>
                  <TableCell>
                    {item.quantity} {unitLabels[item.unit]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setIsItemDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update item details</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <ItemEditForm
              item={editingItem}
              onSuccess={(updatedItem) => {
                setItems((prev) =>
                  prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
                );
                setIsItemDialogOpen(false);
                setEditingItem(null);
                router.refresh();
              }}
              onCancel={() => {
                setIsItemDialogOpen(false);
                setEditingItem(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Complete List Confirmation Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancelComplete();
        } else {
          setIsCompleteDialogOpen(open);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Complete Shopping List?
            </DialogTitle>
            <DialogDescription>
              All items in this shopping list have been completed. Do you want to mark this list as completed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelComplete}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteList}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ItemEditForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: ShoppingItem;
  onSuccess: (item: ShoppingItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [unit, setUnit] = useState<ItemUnit>(item.unit);
  const [notes, setNotes] = useState(item.notes || "");
  const [isLoading, setIsLoading] = useState(false);

  const unitLabels: Record<ItemUnit, string> = {
    PIECE: "Adet",
    KG: "Kg",
    LITER: "Litre",
    GRAM: "Gram",
    PACK: "Paket",
    BOX: "Kutu",
    BOTTLE: "Şişe",
    OTHER: "Diğer",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/shopping-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          quantity: parseFloat(quantity) || 1,
          unit,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        onSuccess(updatedItem);
      }
    } catch (error) {
      console.error("Error updating item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Item Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Quantity</label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Unit</label>
          <Select value={unit} onValueChange={(value) => setUnit(value as ItemUnit)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(unitLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Notes (Optional)</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

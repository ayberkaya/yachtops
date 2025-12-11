"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Minus, Trash2, Settings, AlertTriangle, History, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

// Common spare parts
const POPULAR_SPARE_PARTS = [
  "Engine Oil",
  "Fuel Filter",
  "Oil Filter",
  "Air Filter",
  "Spark Plugs",
  "Belts",
  "Hoses",
  "Fuses",
  "Light Bulbs",
  "Batteries",
  "Ropes",
  "Anchors",
  "Fenders",
  "Cleats",
  "Winches",
  "Pumps",
  "Valves",
  "Gaskets",
  "O-Rings",
  "Bolts & Nuts",
];

const SPARE_PARTS_CATEGORIES = [
  "ENGINE",
  "ELECTRICAL",
  "PLUMBING",
  "DECK",
  "RIGGING",
  "SAFETY",
  "TOOLS",
  "OTHER",
] as const;

type SparePartsCategory = typeof SPARE_PARTS_CATEGORIES[number];

interface SparePartStock {
  id: string;
  name: string;
  category: SparePartsCategory | null;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  location: string | null;
  partNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StockHistory {
  id: string;
  changeType: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface SparePartsViewProps {
  initialStocks: SparePartStock[];
}

export function SparePartsView({ initialStocks }: SparePartsViewProps) {
  const router = useRouter();
  const [stocks, setStocks] = useState<SparePartStock[]>(initialStocks);
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [customPart, setCustomPart] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SparePartsCategory | "NONE">("NONE");
  const [selectedUnit, setSelectedUnit] = useState<string>("piece");
  const [isAdding, setIsAdding] = useState(false);
  const [editingStock, setEditingStock] = useState<SparePartStock | null>(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [editingCategory, setEditingCategory] = useState<SparePartsCategory | "NONE">("NONE");
  const [locationValue, setLocationValue] = useState("");
  const [partNumberValue, setPartNumberValue] = useState("");
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<SparePartsCategory | "ALL">("ALL");

  const handleAddStock = async () => {
    if (!selectedPart && !customPart.trim()) {
      alert("Please select a part or enter a custom name");
      return;
    }

    const name = selectedPart || customPart.trim();
    setIsAdding(true);

    try {
      const response = await fetch("/api/inventory/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: selectedCategory === "NONE" ? null : selectedCategory,
          quantity: 0,
          unit: selectedUnit,
        }),
      });

      if (response.ok) {
        const newStock = await response.json();
        setStocks([...stocks, newStock].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedPart("");
        setCustomPart("");
        setSelectedCategory("NONE");
        setSelectedUnit("piece");
        router.refresh();
      } else {
        const result = await response.json();
        alert(result.error || "Failed to add spare part");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleViewHistory = async (stockId: string) => {
    setViewingHistory(stockId);
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/inventory/spare-parts/${stockId}/history`);
      if (response.ok) {
        const history = await response.json();
        setStockHistory(history);
      } else {
        alert("Failed to load stock history");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const getCategoryBadge = (category: SparePartStock["category"]) => {
    if (!category) return null;
    const colors: Record<SparePartsCategory, string> = {
      ENGINE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      ELECTRICAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      PLUMBING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      DECK: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      RIGGING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      SAFETY: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      TOOLS: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      OTHER: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    };
    return (
      <Badge className={`${colors[category]} text-[10px] px-1.5 py-0.5 leading-tight`}>
        {category}
      </Badge>
    );
  };

  const filteredStocks = categoryFilter === "ALL" 
    ? stocks 
    : stocks.filter(s => s.category === categoryFilter);

  const handleUpdateQuantity = async (stock: SparePartStock, delta: number) => {
    const newQuantity = Math.max(0, stock.quantity + delta);

    try {
      const response = await fetch(`/api/inventory/spare-parts/${stock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (response.ok) {
        const updated = await response.json();
        setStocks(
          stocks.map((s) => (s.id === stock.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
        );
        router.refresh();
      } else {
        alert("Failed to update stock");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleDeleteStock = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stock item?")) return;

    try {
      const response = await fetch(`/api/inventory/spare-parts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStocks(stocks.filter((s) => s.id !== id));
        router.refresh();
      } else {
        alert("Failed to delete stock");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleUpdateSettings = async (stock: SparePartStock) => {
    const threshold = thresholdValue === "" ? null : parseFloat(thresholdValue);
    const category = editingCategory === "NONE" ? null : editingCategory;

    try {
      const response = await fetch(`/api/inventory/spare-parts/${stock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lowStockThreshold: threshold,
          category: category,
          location: locationValue || null,
          partNumber: partNumberValue || null,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setStocks(
          stocks.map((s) => (s.id === stock.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingStock(null);
        setThresholdValue("");
        setEditingCategory("NONE");
        setLocationValue("");
        setPartNumberValue("");
        router.refresh();
      } else {
        alert("Failed to update settings");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const isLowStock = (stock: SparePartStock): boolean => {
    if (stock.lowStockThreshold === null) return false;
    return stock.quantity <= stock.lowStockThreshold;
  };

  return (
    <div className="space-y-6">
      {/* Add New Stock */}
      <Card>
        <CardHeader>
          <CardTitle>Add Spare Part to Stock</CardTitle>
          <CardDescription>
            Select from common spare parts or enter a custom name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <Select value={selectedPart} onValueChange={setSelectedPart}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select from common parts" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_SPARE_PARTS.map((part) => (
                    <SelectItem key={part} value={part}>
                      {part}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 text-center text-sm text-muted-foreground flex items-center justify-center">
                OR
              </div>
              <Input
                placeholder="Enter custom part name"
                value={customPart}
                onChange={(e) => {
                  setCustomPart(e.target.value);
                  setSelectedPart("");
                }}
                className="flex-1"
              />
            </div>
            <div className="flex gap-4">
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No category</SelectItem>
                  {SPARE_PARTS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">piece</SelectItem>
                  <SelectItem value="set">set</SelectItem>
                  <SelectItem value="pack">pack</SelectItem>
                  <SelectItem value="box">box</SelectItem>
                  <SelectItem value="meter">meter</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddStock} 
                disabled={isAdding}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Stock</CardTitle>
              <CardDescription>
                Manage quantities and set low stock alerts
              </CardDescription>
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {SPARE_PARTS_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {stocks.length === 0 
                ? "No spare parts in stock yet. Add one above to get started."
                : "No stock items found for selected category."}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredStocks.map((stock) => (
                <div
                  key={stock.id}
                  className={`p-4 border rounded-lg ${
                    isLowStock(stock) ? "bg-red-50 border-red-200 dark:bg-red-950/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-base">{stock.name}</h3>
                        {getCategoryBadge(stock.category)}
                        {isLowStock(stock) && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Quantity: <strong className="font-semibold text-foreground">{stock.quantity}</strong> {stock.unit}
                        </span>
                        {stock.partNumber && (
                          <span>Part #: <strong className="font-semibold text-foreground">{stock.partNumber}</strong></span>
                        )}
                        {stock.location && (
                          <span>Location: <strong className="font-semibold text-foreground">{stock.location}</strong></span>
                        )}
                        {stock.lowStockThreshold !== null && (
                          <span>
                            Threshold: <strong className="font-semibold text-foreground">{stock.lowStockThreshold}</strong> {stock.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleUpdateQuantity(stock, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleUpdateQuantity(stock, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditingStock(stock);
                              setThresholdValue(stock.lowStockThreshold?.toString() || "");
                              setEditingCategory(stock.category || "NONE");
                              setLocationValue(stock.location || "");
                              setPartNumberValue(stock.partNumber || "");
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Stock Settings</DialogTitle>
                            <DialogDescription>
                              Update low stock threshold, category, location, and part number
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Low Stock Threshold</Label>
                              <Input
                                type="number"
                                value={thresholdValue}
                                onChange={(e) => setThresholdValue(e.target.value)}
                                placeholder="Leave empty to disable"
                                min="0"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <Label>Category</Label>
                              <Select
                                value={editingCategory}
                                onValueChange={(v) => setEditingCategory(v as any)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">No category</SelectItem>
                                  {SPARE_PARTS_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Part Number</Label>
                              <Input
                                value={partNumberValue}
                                onChange={(e) => setPartNumberValue(e.target.value)}
                                placeholder="e.g., OEM-12345"
                              />
                            </div>
                            <div>
                              <Label>Location</Label>
                              <Input
                                value={locationValue}
                                onChange={(e) => setLocationValue(e.target.value)}
                                placeholder="e.g., Engine Room, Storage Locker"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingStock(null);
                                setThresholdValue("");
                                setEditingCategory("NONE");
                                setLocationValue("");
                                setPartNumberValue("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={() => editingStock && handleUpdateSettings(editingStock)}>
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewHistory(stock.id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Stock History</DialogTitle>
                            <DialogDescription>
                              View all changes made to {stock.name}
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[400px] pr-4">
                            {loadingHistory ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                Loading history...
                              </p>
                            ) : stockHistory.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                No history available
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {stockHistory.map((entry) => (
                                  <div
                                    key={entry.id}
                                    className="p-3 border rounded-lg text-sm"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge variant="outline">{entry.changeType}</Badge>
                                      <span className="text-muted-foreground">
                                        {format(new Date(entry.createdAt), "PPp")}
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      <span>
                                        {entry.quantityBefore} → {entry.quantityAfter} (
                                        {entry.quantityChange > 0 ? "+" : ""}
                                        {entry.quantityChange})
                                      </span>
                                      {entry.user && (
                                        <span className="ml-2">
                                          by {entry.user.name || entry.user.email}
                                        </span>
                                      )}
                                    </div>
                                    {entry.notes && (
                                      <p className="mt-1 text-muted-foreground">{entry.notes}</p>
                                    )}
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
                        onClick={() => handleDeleteStock(stock.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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

// Common cleaning supplies
const POPULAR_CLEANING_ITEMS = [
  "All-Purpose Cleaner",
  "Glass Cleaner",
  "Bleach",
  "Disinfectant",
  "Dish Soap",
  "Laundry Detergent",
  "Fabric Softener",
  "Sponges",
  "Scrub Brushes",
  "Microfiber Cloths",
  "Paper Towels",
  "Trash Bags",
  "Rubber Gloves",
  "Mop",
  "Broom",
  "Vacuum Bags",
  "Air Freshener",
  "Stain Remover",
  "Polish",
  "Wax",
];

const CLEANING_CATEGORIES = [
  "DETERGENTS",
  "DISINFECTANTS",
  "TOOLS",
  "CLOTHS",
  "PAPER_PRODUCTS",
  "SPECIALTY",
  "OTHER",
] as const;

type CleaningCategory = typeof CLEANING_CATEGORIES[number];

interface CleaningStock {
  id: string;
  name: string;
  category: CleaningCategory | null;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  location: string | null;
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

interface CleaningSuppliesViewProps {
  initialStocks: CleaningStock[];
  readOnly?: boolean;
}

export function CleaningSuppliesView({ initialStocks, readOnly = false }: CleaningSuppliesViewProps) {
  const router = useRouter();
  const [stocks, setStocks] = useState<CleaningStock[]>(initialStocks);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [customItem, setCustomItem] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CleaningCategory | "NONE">("NONE");
  const [selectedUnit, setSelectedUnit] = useState<string>("piece");
  const [isAdding, setIsAdding] = useState(false);
  const [editingStock, setEditingStock] = useState<CleaningStock | null>(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [editingCategory, setEditingCategory] = useState<CleaningCategory | "NONE">("NONE");
  const [locationValue, setLocationValue] = useState("");
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CleaningCategory | "ALL">("ALL");

  const handleAddStock = async () => {
    if (!customItem.trim()) {
      alert("Please enter a cleaning supply name");
      return;
    }

    const name = customItem.trim();
    setIsAdding(true);

    try {
      const response = await fetch("/api/inventory/cleaning-supplies", {
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
        setCustomItem("");
        setSelectedCategory("NONE");
        setSelectedUnit("piece");
        router.refresh();
      } else {
        const result = await response.json();
        alert(result.error || "Failed to add cleaning supply");
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
      const response = await fetch(`/api/inventory/cleaning-supplies/${stockId}/history`);
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

  const getCategoryBadge = (category: CleaningStock["category"]) => {
    if (!category) return null;
    const colors: Record<CleaningCategory, string> = {
      DETERGENTS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      DISINFECTANTS: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      TOOLS: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      CLOTHS: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      PAPER_PRODUCTS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      SPECIALTY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return (
      <Badge className={`${colors[category]} text-[10px] px-1.5 py-0.5 leading-tight`}>
        {category.replace("_", " ")}
      </Badge>
    );
  };

  const filteredStocks = categoryFilter === "ALL" 
    ? stocks 
    : stocks.filter(s => s.category === categoryFilter);

  const handleUpdateQuantity = async (stock: CleaningStock, delta: number) => {
    const newQuantity = Math.max(0, stock.quantity + delta);

    try {
      const response = await fetch(`/api/inventory/cleaning-supplies/${stock.id}`, {
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
      const response = await fetch(`/api/inventory/cleaning-supplies/${id}`, {
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

  const handleUpdateSettings = async (stock: CleaningStock) => {
    const threshold = thresholdValue === "" ? null : parseFloat(thresholdValue);
    const category = editingCategory === "NONE" ? null : editingCategory;

    try {
      const response = await fetch(`/api/inventory/cleaning-supplies/${stock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lowStockThreshold: threshold,
          category: category,
          location: locationValue || null,
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
        router.refresh();
      } else {
        alert("Failed to update settings");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const isLowStock = (stock: CleaningStock): boolean => {
    if (stock.lowStockThreshold === null) return false;
    return stock.quantity <= stock.lowStockThreshold;
  };

  return (
    <div className="space-y-6">
      {/* Add New Stock */}
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Add Cleaning Supply to Stock</CardTitle>
          </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <Input
                placeholder="Enter cleaning supply name"
                value={customItem}
                onChange={(e) => {
                  setCustomItem(e.target.value);
                  setSelectedItem("");
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
                  {CLEANING_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace("_", " ")}
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
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="mL">mL</SelectItem>
                  <SelectItem value="pack">pack</SelectItem>
                  <SelectItem value="box">box</SelectItem>
                  <SelectItem value="roll">roll</SelectItem>
                  <SelectItem value="bottle">bottle</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddStock} 
                disabled={isAdding}
                className="h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

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
                {CLEANING_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace("_", " ")}
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
                ? "No cleaning supplies in stock yet. Add one above to get started."
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
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Stock Settings</DialogTitle>
                            <DialogDescription>
                              Update low stock threshold, category, and location
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
                                  {CLEANING_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat.replace("_", " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Location</Label>
                              <Input
                                value={locationValue}
                                onChange={(e) => setLocationValue(e.target.value)}
                                placeholder="e.g., Storage, Cleaning Closet"
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

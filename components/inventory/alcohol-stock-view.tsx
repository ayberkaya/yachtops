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

// Top 20 most popular alcoholic beverages globally
const POPULAR_ALCOHOLS = [
  "Vodka",
  "Whiskey",
  "Rum",
  "Gin",
  "Tequila",
  "Champagne",
  "Wine (Red)",
  "Wine (White)",
  "Wine (Rosé)",
  "Beer",
  "Prosecco",
  "Cognac",
  "Brandy",
  "Scotch",
  "Bourbon",
  "Champagne Dom Pérignon",
  "Moët & Chandon",
  "Hennessy",
  "Grey Goose",
  "Johnnie Walker",
];

interface AlcoholStock {
  id: string;
  name: string;
  category: "WINE" | "SPIRITS" | "BEER" | null;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
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

interface AlcoholStockViewProps {
  initialStocks: AlcoholStock[];
}

export function AlcoholStockView({ initialStocks }: AlcoholStockViewProps) {
  const router = useRouter();
  const [stocks, setStocks] = useState<AlcoholStock[]>(initialStocks);
  const [selectedAlcohol, setSelectedAlcohol] = useState<string>("");
  const [customAlcohol, setCustomAlcohol] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"WINE" | "SPIRITS" | "BEER" | "NONE">("NONE");
  const [isAdding, setIsAdding] = useState(false);
  const [editingStock, setEditingStock] = useState<AlcoholStock | null>(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [editingCategory, setEditingCategory] = useState<"WINE" | "SPIRITS" | "BEER" | "NONE">("NONE");
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "WINE" | "SPIRITS" | "BEER">("ALL");

  const handleAddStock = async () => {
    if (!selectedAlcohol && !customAlcohol.trim()) {
      alert("Please select an alcohol or enter a custom name");
      return;
    }

    const name = selectedAlcohol || customAlcohol.trim();
    setIsAdding(true);

    try {
      const response = await fetch("/api/alcohol-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: selectedCategory === "NONE" ? null : selectedCategory,
          quantity: 0,
          unit: "bottle",
        }),
      });

      if (response.ok) {
        const newStock = await response.json();
        setStocks([...stocks, newStock].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedAlcohol("");
        setCustomAlcohol("");
        setSelectedCategory("NONE");
        router.refresh();
      } else {
        const result = await response.json();
        alert(result.error || "Failed to add alcohol stock");
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
      const response = await fetch(`/api/alcohol-stock/${stockId}/history`);
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

  const getCategoryBadge = (category: AlcoholStock["category"]) => {
    if (!category) return null;
    const colors = {
      WINE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      SPIRITS: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      BEER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    return (
      <Badge className={colors[category]}>
        {category}
      </Badge>
    );
  };

  const filteredStocks = categoryFilter === "ALL" 
    ? stocks 
    : stocks.filter(s => s.category === categoryFilter);

  const handleUpdateQuantity = async (stock: AlcoholStock, delta: number) => {
    const newQuantity = Math.max(0, stock.quantity + delta);

    try {
      const response = await fetch(`/api/alcohol-stock/${stock.id}`, {
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
      const response = await fetch(`/api/alcohol-stock/${id}`, {
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

  const handleUpdateSettings = async (stock: AlcoholStock) => {
    const threshold = thresholdValue === "" ? null : parseFloat(thresholdValue);
    const category = editingCategory === "NONE" ? null : editingCategory;

    try {
      const response = await fetch(`/api/alcohol-stock/${stock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lowStockThreshold: threshold,
          category: category,
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
        router.refresh();
      } else {
        alert("Failed to update settings");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const isLowStock = (stock: AlcoholStock): boolean => {
    if (stock.lowStockThreshold === null) return false;
    return stock.quantity <= stock.lowStockThreshold;
  };

  return (
    <div className="space-y-6">
      {/* Add New Stock */}
      <Card>
        <CardHeader>
          <CardTitle>Add Alcohol to Stock</CardTitle>
          <CardDescription>
            Select from popular alcohols or enter a custom name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <Select value={selectedAlcohol} onValueChange={setSelectedAlcohol}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select from popular alcohols" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_ALCOHOLS.map((alcohol) => (
                    <SelectItem key={alcohol} value={alcohol}>
                      {alcohol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 text-center text-sm text-muted-foreground flex items-center justify-center">
                OR
              </div>
              <Input
                placeholder="Enter custom alcohol name"
                value={customAlcohol}
                onChange={(e) => {
                  setCustomAlcohol(e.target.value);
                  setSelectedAlcohol("");
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
                  <SelectItem value="WINE">Wine</SelectItem>
                  <SelectItem value="SPIRITS">Spirits</SelectItem>
                  <SelectItem value="BEER">Beer</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddStock} 
                disabled={isAdding}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
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
                <SelectItem value="WINE">Wine</SelectItem>
                <SelectItem value="SPIRITS">Spirits</SelectItem>
                <SelectItem value="BEER">Beer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {stocks.length === 0 
                ? "No alcohol stock items yet. Add one above to get started."
                : "No stock items found for selected category."}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredStocks.map((stock) => (
                <div
                  key={stock.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isLowStock(stock) ? "border-red-600 bg-red-50 dark:bg-red-950/30 shadow-sm" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${isLowStock(stock) ? "text-red-900 dark:text-red-100" : ""}`}>
                        {stock.name}
                      </h3>
                      {getCategoryBadge(stock.category)}
                      {isLowStock(stock) && (
                        <Badge variant="destructive" className="gap-1 bg-red-600 hover:bg-red-700 border-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <div className={`flex items-center gap-4 text-sm ${isLowStock(stock) ? "text-red-800 dark:text-red-200" : "text-muted-foreground"}`}>
                      <span>
                        Quantity: <strong className={isLowStock(stock) ? "text-red-900 dark:text-red-100 font-bold" : ""}>
                          {stock.quantity}
                        </strong> {stock.unit}
                        {stock.unit !== "bottle" && stock.unit !== "liter" ? "s" : stock.unit === "bottle" ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleUpdateQuantity(stock, -1)}
                      className="h-8 w-8"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold">
                      {stock.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleUpdateQuantity(stock, 1)}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Dialog
                      open={viewingHistory === stock.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setViewingHistory(null);
                          setStockHistory([]);
                        } else {
                          handleViewHistory(stock.id);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <History className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Stock History: {stock.name}</DialogTitle>
                          <DialogDescription>
                            View all changes made to this stock item
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] pr-4">
                          {loadingHistory ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Loading history...</p>
                          ) : stockHistory.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No history available</p>
                          ) : (
                            <div className="space-y-4">
                              {stockHistory.map((entry) => (
                                <div key={entry.id} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={entry.quantityChange > 0 ? "default" : entry.quantityChange < 0 ? "destructive" : "secondary"}>
                                        {entry.changeType}
                                      </Badge>
                                      <span className="text-sm font-semibold">
                                        {entry.quantityBefore} → {entry.quantityAfter}
                                      </span>
                                      {entry.quantityChange !== 0 && (
                                        <span className={`text-sm ${entry.quantityChange > 0 ? "text-green-600" : "text-red-600"}`}>
                                          ({entry.quantityChange > 0 ? "+" : ""}{entry.quantityChange})
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}
                                    </span>
                                  </div>
                                  {entry.user && (
                                    <p className="text-xs text-muted-foreground">
                                      By: {entry.user.name || entry.user.email}
                                    </p>
                                  )}
                                  {entry.notes && (
                                    <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={editingStock?.id === stock.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingStock(null);
                          setThresholdValue("");
                          setEditingCategory("NONE");
                        } else {
                          setEditingStock(stock);
                          setThresholdValue(stock.lowStockThreshold?.toString() || "");
                          setEditingCategory(stock.category || "NONE");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure Settings</DialogTitle>
                          <DialogDescription>
                            Update category and alert threshold for {stock.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select value={editingCategory} onValueChange={(v) => setEditingCategory(v as any)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">No category</SelectItem>
                                <SelectItem value="WINE">Wine</SelectItem>
                                <SelectItem value="SPIRITS">Spirits</SelectItem>
                                <SelectItem value="BEER">Beer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="threshold">Low Stock Threshold</Label>
                            <Input
                              id="threshold"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="Leave empty to disable alert"
                              value={thresholdValue}
                              onChange={(e) => setThresholdValue(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Current stock: {stock.quantity} {stock.unit}
                              {stock.unit !== "bottle" && stock.unit !== "liter" ? "s" : stock.unit === "bottle" ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingStock(null);
                              setThresholdValue("");
                              setEditingCategory("NONE");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={() => handleUpdateSettings(stock)}>
                            Save Settings
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteStock(stock.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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


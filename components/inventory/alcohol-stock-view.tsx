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
import { Plus, Minus, Trash2, Settings, AlertTriangle } from "lucide-react";

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
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AlcoholStockViewProps {
  initialStocks: AlcoholStock[];
}

export function AlcoholStockView({ initialStocks }: AlcoholStockViewProps) {
  const router = useRouter();
  const [stocks, setStocks] = useState<AlcoholStock[]>(initialStocks);
  const [selectedAlcohol, setSelectedAlcohol] = useState<string>("");
  const [customAlcohol, setCustomAlcohol] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingStock, setEditingStock] = useState<AlcoholStock | null>(null);
  const [thresholdValue, setThresholdValue] = useState("");

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
          quantity: 0,
          unit: "bottle",
        }),
      });

      if (response.ok) {
        const newStock = await response.json();
        setStocks([...stocks, newStock].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedAlcohol("");
        setCustomAlcohol("");
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

  const handleUpdateThreshold = async (stock: AlcoholStock) => {
    const threshold = thresholdValue === "" ? null : parseFloat(thresholdValue);

    try {
      const response = await fetch(`/api/alcohol-stock/${stock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowStockThreshold: threshold }),
      });

      if (response.ok) {
        const updated = await response.json();
        setStocks(
          stocks.map((s) => (s.id === stock.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingStock(null);
        setThresholdValue("");
        router.refresh();
      } else {
        alert("Failed to update threshold");
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
            <Button onClick={handleAddStock} disabled={isAdding}>
              <Plus className="mr-2 h-4 w-4" />
              Add to Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
          <CardDescription>
            Manage quantities and set low stock alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No alcohol stock items yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {stocks.map((stock) => (
                <div
                  key={stock.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isLowStock(stock) ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{stock.name}</h3>
                      {isLowStock(stock) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Quantity: <strong>{stock.quantity}</strong> {stock.unit}
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
                      open={editingStock?.id === stock.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingStock(null);
                          setThresholdValue("");
                        } else {
                          setEditingStock(stock);
                          setThresholdValue(stock.lowStockThreshold?.toString() || "");
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
                          <DialogTitle>Configure Alert Threshold</DialogTitle>
                          <DialogDescription>
                            Set a low stock threshold for {stock.name}. You'll be alerted when stock falls below this level.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
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
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={() => handleUpdateThreshold(stock)}>
                            Save Threshold
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


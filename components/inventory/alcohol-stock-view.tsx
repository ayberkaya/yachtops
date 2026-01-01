"use client";

import { useState, useRef } from "react";
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
import { Plus, Minus, Trash2, Settings, AlertTriangle, History, Filter, Image, Eye } from "lucide-react";
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

type AlcoholCategoryType = 
  | "WINE"
  | "BEER"
  | "WHISKEY"
  | "VODKA"
  | "RUM"
  | "GIN"
  | "TEQUILA"
  | "CHAMPAGNE"
  | "COGNAC"
  | "BRANDY"
  | "SCOTCH"
  | "BOURBON"
  | "PROSECCO"
  | "SAKE"
  | "CIDER"
  | "PORT"
  | "SHERRY"
  | "LIQUEURS"
  | "VERMOUTH"
  | "ABSINTHE"
  | "SPIRITS"
  | null;

interface AlcoholStock {
  id: string;
  name: string;
  category: AlcoholCategoryType;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  notes: string | null;
  imageUrl: string | null;
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
  readOnly?: boolean;
}

export function AlcoholStockView({ initialStocks, readOnly = false }: AlcoholStockViewProps) {
  const router = useRouter();
  const [stocks, setStocks] = useState<AlcoholStock[]>(initialStocks);
  const [selectedAlcohol, setSelectedAlcohol] = useState<string>("");
  const [customAlcohol, setCustomAlcohol] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AlcoholCategoryType | "NONE">("NONE");
  const [isAdding, setIsAdding] = useState(false);
  const [editingStock, setEditingStock] = useState<AlcoholStock | null>(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [editingCategory, setEditingCategory] = useState<AlcoholCategoryType | "NONE">("NONE");
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AlcoholCategoryType>("ALL");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [editingStockImage, setEditingStockImage] = useState<File | null | "REMOVE">(null);
  const editingImageInputRef = useRef<HTMLInputElement>(null);
  const [viewingImageStockId, setViewingImageStockId] = useState<string | null>(null);

  const handleAddStock = async () => {
    if (!selectedAlcohol && !customAlcohol.trim()) {
      alert("Please select an alcohol or enter a custom name");
      return;
    }

    const name = selectedAlcohol || customAlcohol.trim();
    setIsAdding(true);

    try {
      let response: Response;
      
      if (selectedImage) {
        // Send with FormData for image
        const formData = new FormData();
        formData.append("name", name);
        formData.append("category", selectedCategory === "NONE" ? "" : selectedCategory);
        formData.append("quantity", "0");
        formData.append("unit", "bottle");
        formData.append("image", selectedImage);

        response = await fetch("/api/alcohol-stock", {
          method: "POST",
          body: formData,
        });
      } else {
        // Send with JSON if no image
        response = await fetch("/api/alcohol-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category: selectedCategory === "NONE" ? null : selectedCategory,
            quantity: 0,
            unit: "bottle",
          }),
        });
      }

      if (response.ok) {
        const newStock = await response.json();
        setStocks([...stocks, newStock].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedAlcohol("");
        setCustomAlcohol("");
        setSelectedCategory("NONE");
        setSelectedImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        router.refresh();
      } else {
        let errorMessage = "Failed to add alcohol stock";
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
          if (result.details) {
            console.error("Error details:", result.details);
            if (Array.isArray(result.details)) {
              errorMessage += "\n" + result.details.map((d: any) => d.message || d).join("\n");
            } else {
              errorMessage += "\n" + String(result.details);
            }
          }
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        alert(errorMessage);
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
    const colors: Record<string, string> = {
      WINE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      BEER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      WHISKEY: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      VODKA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      RUM: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      GIN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      TEQUILA: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
      CHAMPAGNE: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      COGNAC: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      BRANDY: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      SCOTCH: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      BOURBON: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      PROSECCO: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      SAKE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      CIDER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      PORT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      SHERRY: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      LIQUEURS: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      VERMOUTH: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      ABSINTHE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      SPIRITS: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    };
    const displayName = category.charAt(0) + category.slice(1).toLowerCase();
    return (
      <Badge className={`${colors[category] || colors.SPIRITS} text-[10px] px-1.5 py-0.5 leading-tight`}>
        {displayName}
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
      let response: Response;
      
      if (editingStockImage !== null) {
        // Send with FormData if image is being changed
        const formData = new FormData();
        formData.append("category", category || "");
        formData.append("lowStockThreshold", threshold?.toString() || "");
        if (editingStockImage === "REMOVE") {
          // If editingStockImage is "REMOVE", remove image
          formData.append("removeImage", "true");
        } else if (editingStockImage) {
          formData.append("image", editingStockImage);
        }

        response = await fetch(`/api/alcohol-stock/${stock.id}`, {
          method: "PATCH",
          body: formData,
        });
      } else {
        // Send with JSON if no image change
        response = await fetch(`/api/alcohol-stock/${stock.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            lowStockThreshold: threshold,
            category: category,
          }),
        });
      }

      if (response.ok) {
        const updated = await response.json();
        setStocks(
          stocks.map((s) => (s.id === stock.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingStock(null);
        setThresholdValue("");
        setEditingCategory("NONE");
        setEditingStockImage(null);
        if (editingImageInputRef.current) {
          editingImageInputRef.current.value = '';
        }
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
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Add Alcohol to Stock</CardTitle>
          </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex gap-2 w-full md:w-1/2">
                <Input
                  placeholder="Enter alcohol name"
                  value={customAlcohol}
                  onChange={(e) => {
                    setCustomAlcohol(e.target.value);
                    setSelectedAlcohol("");
                  }}
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedImage(file);
                    }
                  }}
                />
                {selectedImage ? (
                  <div className="relative flex-shrink-0">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Preview"
                      className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setSelectedImage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      title="Click to remove image"
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    title="Add image"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No category</SelectItem>
                  <SelectItem value="ABSINTHE">Absinthe</SelectItem>
                  <SelectItem value="BEER">Beer</SelectItem>
                  <SelectItem value="BOURBON">Bourbon</SelectItem>
                  <SelectItem value="BRANDY">Brandy</SelectItem>
                  <SelectItem value="CHAMPAGNE">Champagne</SelectItem>
                  <SelectItem value="CIDER">Cider</SelectItem>
                  <SelectItem value="COGNAC">Cognac</SelectItem>
                  <SelectItem value="GIN">Gin</SelectItem>
                  <SelectItem value="LIQUEURS">Liqueurs</SelectItem>
                  <SelectItem value="PORT">Port</SelectItem>
                  <SelectItem value="PROSECCO">Prosecco</SelectItem>
                  <SelectItem value="RUM">Rum</SelectItem>
                  <SelectItem value="SAKE">Sake</SelectItem>
                  <SelectItem value="SCOTCH">Scotch</SelectItem>
                  <SelectItem value="SHERRY">Sherry</SelectItem>
                  <SelectItem value="SPIRITS">Spirits</SelectItem>
                  <SelectItem value="TEQUILA">Tequila</SelectItem>
                  <SelectItem value="VERMOUTH">Vermouth</SelectItem>
                  <SelectItem value="VODKA">Vodka</SelectItem>
                  <SelectItem value="WHISKEY">Whiskey</SelectItem>
                  <SelectItem value="WINE">Wine</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddStock} 
                disabled={isAdding}
                className="h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">Current Stock</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {selectedStockId && (() => {
                const selectedStock = stocks.find(s => s.id === selectedStockId);
                if (!selectedStock) return null;
                const isLow = isLowStock(selectedStock);
                return (
                  <>
                    <Dialog
                      open={viewingHistory === selectedStock.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setViewingHistory(null);
                          setStockHistory([]);
                        } else {
                          handleViewHistory(selectedStock.id);
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
                          <DialogTitle>Stock History: {selectedStock.name}</DialogTitle>
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
                      open={editingStock?.id === selectedStock.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingStock(null);
                          setThresholdValue("");
                          setEditingCategory("NONE");
                          setEditingStockImage(null);
                        } else {
                          setEditingStock(selectedStock);
                          setThresholdValue(selectedStock.lowStockThreshold?.toString() || "");
                          setEditingCategory(selectedStock.category || "NONE");
                          setEditingStockImage(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure Settings</DialogTitle>
                          <DialogDescription>
                            Update category and alert threshold for {selectedStock.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Image</Label>
                            <div className="flex items-center gap-3 mt-2">
                              {editingStockImage && editingStockImage !== "REMOVE" ? (
                                <div className="relative">
                                  <img
                                    src={URL.createObjectURL(editingStockImage)}
                                    alt="Preview"
                                    className="w-20 h-20 object-cover rounded-lg border"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => {
                                      setEditingStockImage(null);
                                      if (editingImageInputRef.current) {
                                        editingImageInputRef.current.value = '';
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : editingStockImage === "REMOVE" ? (
                                <div className="w-20 h-20 border-2 border-dashed border-destructive rounded-lg flex items-center justify-center bg-destructive/10">
                                  <span className="text-xs text-destructive text-center px-2">Image will be removed</span>
                                </div>
                              ) : selectedStock?.imageUrl ? (
                                <img
                                  src={selectedStock.imageUrl}
                                  alt={selectedStock.name}
                                  className="w-20 h-20 object-cover rounded-lg border"
                                />
                              ) : (
                                <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                                  <Image className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex flex-col gap-2">
                                <input
                                  type="file"
                                  ref={editingImageInputRef}
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setEditingStockImage(file);
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => editingImageInputRef.current?.click()}
                                >
                                  <Image className="mr-2 h-4 w-4" />
                                  {editingStockImage && editingStockImage !== "REMOVE" ? "Change Image" : editingStockImage === "REMOVE" ? "Image will be removed" : "Add Image"}
                                </Button>
                                {editingStockImage && editingStockImage !== "REMOVE" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingStockImage(null);
                                      if (editingImageInputRef.current) {
                                        editingImageInputRef.current.value = '';
                                      }
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                                {selectedStock?.imageUrl && !editingStockImage && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingStockImage("REMOVE")}
                                  >
                                    Remove Current Image
                                  </Button>
                                )}
                                {editingStockImage === "REMOVE" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingStockImage(null)}
                                  >
                                    Cancel Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select value={editingCategory} onValueChange={(v) => setEditingCategory(v as any)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">No category</SelectItem>
                                <SelectItem value="ABSINTHE">Absinthe</SelectItem>
                                <SelectItem value="BEER">Beer</SelectItem>
                                <SelectItem value="BOURBON">Bourbon</SelectItem>
                                <SelectItem value="BRANDY">Brandy</SelectItem>
                                <SelectItem value="CHAMPAGNE">Champagne</SelectItem>
                                <SelectItem value="CIDER">Cider</SelectItem>
                                <SelectItem value="COGNAC">Cognac</SelectItem>
                                <SelectItem value="GIN">Gin</SelectItem>
                                <SelectItem value="LIQUEURS">Liqueurs</SelectItem>
                                <SelectItem value="PORT">Port</SelectItem>
                                <SelectItem value="PROSECCO">Prosecco</SelectItem>
                                <SelectItem value="RUM">Rum</SelectItem>
                                <SelectItem value="SAKE">Sake</SelectItem>
                                <SelectItem value="SCOTCH">Scotch</SelectItem>
                                <SelectItem value="SHERRY">Sherry</SelectItem>
                                <SelectItem value="SPIRITS">Spirits</SelectItem>
                                <SelectItem value="TEQUILA">Tequila</SelectItem>
                                <SelectItem value="VERMOUTH">Vermouth</SelectItem>
                                <SelectItem value="VODKA">Vodka</SelectItem>
                                <SelectItem value="WHISKEY">Whiskey</SelectItem>
                                <SelectItem value="WINE">Wine</SelectItem>
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
                              className="h-9 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Current stock: {selectedStock.quantity} {selectedStock.unit}
                              {selectedStock.unit !== "bottle" && selectedStock.unit !== "liter" ? "s" : selectedStock.unit === "bottle" ? "s" : ""}
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
                          <Button onClick={() => handleUpdateSettings(selectedStock)}>
                            Save Settings
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteStock(selectedStock.id)}
                      className="h-8 w-8"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                );
              })()}
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-full md:w-[165px]">
                  <Filter className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Categories</SelectItem>
                  <SelectItem value="ABSINTHE">Absinthe</SelectItem>
                  <SelectItem value="BEER">Beer</SelectItem>
                  <SelectItem value="BOURBON">Bourbon</SelectItem>
                  <SelectItem value="BRANDY">Brandy</SelectItem>
                  <SelectItem value="CHAMPAGNE">Champagne</SelectItem>
                  <SelectItem value="CIDER">Cider</SelectItem>
                  <SelectItem value="COGNAC">Cognac</SelectItem>
                  <SelectItem value="GIN">Gin</SelectItem>
                  <SelectItem value="LIQUEURS">Liqueurs</SelectItem>
                  <SelectItem value="PORT">Port</SelectItem>
                  <SelectItem value="PROSECCO">Prosecco</SelectItem>
                  <SelectItem value="RUM">Rum</SelectItem>
                  <SelectItem value="SAKE">Sake</SelectItem>
                  <SelectItem value="SCOTCH">Scotch</SelectItem>
                  <SelectItem value="SHERRY">Sherry</SelectItem>
                  <SelectItem value="SPIRITS">Spirits</SelectItem>
                  <SelectItem value="TEQUILA">Tequila</SelectItem>
                  <SelectItem value="VERMOUTH">Vermouth</SelectItem>
                  <SelectItem value="VODKA">Vodka</SelectItem>
                  <SelectItem value="WHISKEY">Whiskey</SelectItem>
                  <SelectItem value="WINE">Wine</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-3 md:space-y-4">
              {filteredStocks.map((stock) => {
                const isLow = isLowStock(stock);
                return (
                  <div
                    key={stock.id}
                    className={`relative flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3 px-3 md:px-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isLow
                        ? selectedStockId === stock.id
                          ? "border-yellow-400 bg-red-600/95 dark:bg-red-700/95 shadow-lg ring-2 ring-yellow-400/50"
                          : "border-red-600 bg-red-600/90 dark:bg-red-700/90 shadow-sm"
                        : selectedStockId === stock.id 
                          ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-2 ring-primary/20" 
                          : "border-border hover:border-primary/50"
                    }`}
                    style={
                      isLow
                        ? selectedStockId === stock.id
                          ? {
                              borderColor: "rgb(250, 204, 21)",
                              backgroundColor: "rgba(231, 0, 11, 0.95)",
                              boxShadow: "0 0 0 2px rgba(250, 204, 21, 0.3)"
                            }
                          : {
                              borderColor: "rgba(231, 0, 11, 1)",
                              backgroundColor: "rgba(231, 0, 11, 0.85)"
                            }
                        : selectedStockId === stock.id
                          ? { 
                              color: '#000000',
                              borderColor: 'hsl(var(--primary))',
                              backgroundColor: 'hsl(var(--primary) / 0.1)'
                            }
                          : { color: '#000000' }
                    }
                    onClick={() => setSelectedStockId(selectedStockId === stock.id ? null : stock.id)}
                  >
                    {getCategoryBadge(stock.category) && (
                      <div className="absolute -top-[12px] left-2 md:left-0 z-10">
                        {getCategoryBadge(stock.category)}
                      </div>
                    )}
                    <div className={`flex-1 min-w-0 ${!isLow ? "!text-black" : ""}`} style={!isLow ? { color: '#000000' } : undefined}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3
                          className={`font-semibold text-sm md:text-base truncate ${isLow ? "text-white" : "!text-black"}`}
                          style={!isLow ? { color: '#000000' } : undefined}
                        >
                          {stock.name}
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
                        style={!isLow ? { color: '#000000' } : undefined}
                      >
                        <span className="whitespace-nowrap">
                          Quantity: <strong
                            className={`font-semibold text-xs md:text-sm ${isLow ? "text-white" : "!text-black"}`}
                            style={!isLow ? { color: '#000000' } : undefined}
                          >
                            {stock.quantity}
                          </strong> {stock.unit}
                          {stock.unit !== "bottle" && stock.unit !== "liter" ? "s" : stock.unit === "bottle" ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0" style={!isLow ? { color: '#000000' } : undefined}>
                      {stock.imageUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className={`h-7 w-7 md:h-8 md:w-8 ${!isLow ? "!text-black [&_svg]:!stroke-black" : ""}`}
                            style={!isLow ? { color: '#000000' } : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingImageStockId(stock.id);
                            }}
                            title="View image"
                          >
                            <Eye className={`h-3.5 w-3.5 md:h-4 md:w-4 ${!isLow ? "!text-black !stroke-black" : "text-white stroke-white"}`} />
                          </Button>
                          <Dialog open={viewingImageStockId === stock.id} onOpenChange={(open) => setViewingImageStockId(open ? stock.id : null)}>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Image: {stock.name}</DialogTitle>
                              </DialogHeader>
                              <div className="flex items-center justify-center p-4">
                                <img
                                  src={stock.imageUrl}
                                  alt={stock.name}
                                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateQuantity(stock, -1);
                        }}
                        className={`h-7 w-7 md:h-8 md:w-8 ${!isLow ? "!text-black [&_svg]:!stroke-black" : ""}`}
                        style={!isLow ? { color: '#000000' } : undefined}
                      >
                        <Minus
                          className={`h-3.5 w-3.5 md:h-4 md:w-4 ${!isLow ? "!text-black !stroke-black" : "text-white stroke-white"}`}
                          style={!isLow ? { color: '#000000', stroke: '#000000' } : { color: '#ffffff', stroke: '#ffffff' }}
                        />
                      </Button>
                      <span
                        className={`w-10 md:w-12 text-center font-semibold text-xs md:text-sm ${!isLow ? "!text-black" : ""}`}
                        style={!isLow ? { color: '#000000' } : { color: '#ffffff' }}
                      >
                        {stock.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateQuantity(stock, 1);
                        }}
                        className={`h-7 w-7 md:h-8 md:w-8 ${!isLow ? "!text-black [&_svg]:!stroke-black" : ""}`}
                        style={!isLow ? { color: '#000000' } : undefined}
                      >
                        <Plus
                          className={`h-3.5 w-3.5 md:h-4 md:w-4 ${!isLow ? "!text-black !stroke-black" : "text-white stroke-white"}`}
                          style={!isLow ? { color: '#000000', stroke: '#000000' } : { color: '#ffffff', stroke: '#ffffff' }}
                        />
                      </Button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


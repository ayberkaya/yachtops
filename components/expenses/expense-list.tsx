"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExpenseCategory, Trip, ExpenseStatus, PaymentMethod } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Search, SlidersHorizontal, Calendar, Save, X, Bookmark, LayoutGrid, List, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  baseAmount: number | null;
  status: ExpenseStatus;
  paymentMethod: PaymentMethod;
  isReimbursable: boolean;
  vendorName: string | null;
  invoiceNumber: string | null;
  createdBy: { id: string; name: string | null; email: string };
  approvedBy: { id: string; name: string | null; email: string } | null;
  category: { id: string; name: string };
  trip: { id: string; name: string } | null;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface ExpenseListProps {
  initialExpenses: Expense[];
  categories: ExpenseCategory[];
  trips: Trip[];
  users: User[];
  currentUserId: string;
}

interface FilterState {
  status: string;
  categoryId: string;
  tripId: string;
  startDate: string;
  endDate: string;
  search: string;
  currency: string;
  paymentMethod: string;
  minAmount: string;
  maxAmount: string;
  createdBy: string;
  isReimbursable: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
}

const STORAGE_KEY = "yachtops_saved_expense_filters";

export function ExpenseList({ initialExpenses, categories, trips, users, currentUserId }: ExpenseListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isLoading, setIsLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [groupBy, setGroupBy] = useState<"none" | "category" | "date" | "trip">("none");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exchangeRates, setExchangeRates] = useState<{ base: string; rates: Record<string, number>; date: string } | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "EUR" | "TRY">("EUR");

  // Combined sort value for single dropdown
  const sortValue = `${sortBy}-${sortOrder}`;
  
  const handleSortChange = (value: string) => {
    const [field, order] = value.split("-");
    setSortBy(field as "date" | "amount" | "status");
    setSortOrder(order as "asc" | "desc");
  };


  // Initialize filters from URL params or default
  const getInitialFilters = (): FilterState => {
    const params = searchParams;
    return {
      status: params.get("status") || "",
      categoryId: params.get("categoryId") || "",
      tripId: params.get("tripId") || "",
      startDate: params.get("startDate") || "",
      endDate: params.get("endDate") || "",
      search: params.get("search") || "",
      currency: params.get("currency") || "",
      paymentMethod: params.get("paymentMethod") || "",
      minAmount: params.get("minAmount") || "",
      maxAmount: params.get("maxAmount") || "",
      createdBy: params.get("createdBy") || "",
      isReimbursable: params.get("isReimbursable") || "",
    };
  };

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  }, []);

  // Fetch exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch("/api/exchange-rates");
        if (response.ok) {
          const rates = await response.json();
          setExchangeRates(rates);
        }
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
      }
    };
    fetchExchangeRates();
  }, []);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const newUrl = queryString ? `/dashboard/expenses?${queryString}` : "/dashboard/expenses";
    router.replace(newUrl, { scroll: false });
  }, [router]);

  // Fetch expenses with filters
  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value && key !== "search") {
            params.append(key, value);
          }
        });

        const response = await fetch(`/api/expenses?${params.toString()}`);
        const data = await response.json();

        let filtered = data;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = data.filter((exp: Expense) =>
            exp.description.toLowerCase().includes(searchLower) ||
            exp.category.name.toLowerCase().includes(searchLower) ||
            exp.vendorName?.toLowerCase().includes(searchLower) ||
            exp.invoiceNumber?.toLowerCase().includes(searchLower)
          );
        }

        // Client-side amount filtering (since we filter by baseAmount or amount)
        if (filters.minAmount || filters.maxAmount) {
          filtered = filtered.filter((exp: Expense) => {
            const amount = exp.baseAmount || exp.amount;
            if (filters.minAmount && amount < parseFloat(filters.minAmount)) return false;
            if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) return false;
            return true;
          });
        }

        setExpenses(filtered);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
    updateURL(filters);
  }, [filters, updateURL]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      status: "",
      categoryId: "",
      tripId: "",
      startDate: "",
      endDate: "",
      search: "",
      currency: "",
      paymentMethod: "",
      minAmount: "",
      maxAmount: "",
      createdBy: "",
      isReimbursable: "",
    };
    setFilters(emptyFilters);
    updateURL(emptyFilters);
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...filters },
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setFilterName("");
    setSaveFilterDialogOpen(false);
  };

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    updateURL(savedFilter.filters);
  };

  const deleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    const variants: Record<ExpenseStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [ExpenseStatus.DRAFT]: "outline",
      [ExpenseStatus.SUBMITTED]: "secondary",
      [ExpenseStatus.APPROVED]: "default",
      [ExpenseStatus.REJECTED]: "destructive",
    };

    return (
      <Badge variant={variants[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const canCreate = session?.user && hasPermission(session.user, "expenses.create", session.user.permissions);

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "amount":
          comparison = (a.baseAmount || a.amount) - (b.baseAmount || b.amount);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "date":
        default:
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [expenses, sortBy, sortOrder]);

  // Convert amount to display currency
  const convertToDisplayCurrency = (amount: number, fromCurrency: string): number => {
    if (!exchangeRates || fromCurrency === displayCurrency) {
      return amount;
    }

    // Convert to EUR first
    let amountInEUR = amount;
    if (fromCurrency !== "EUR" && exchangeRates.rates[fromCurrency]) {
      amountInEUR = amount / exchangeRates.rates[fromCurrency];
    }

    // Convert from EUR to display currency
    if (displayCurrency === "EUR") {
      return amountInEUR;
    }

    return amountInEUR * (exchangeRates.rates[displayCurrency] || 1);
  };

  // Calculate group total in display currency
  const calculateGroupTotal = (groupExpenses: Expense[]): number => {
    if (!exchangeRates) {
      // If no exchange rates, sum amounts as-is (may be inaccurate)
      return groupExpenses.reduce((sum, exp) => sum + (exp.baseAmount || exp.amount), 0);
    }

    return groupExpenses.reduce((sum, exp) => {
      const amount = exp.baseAmount || exp.amount;
      const converted = convertToDisplayCurrency(amount, exp.currency);
      return sum + converted;
    }, 0);
  };

  // Group expenses
  const groupedExpenses = useMemo(() => {
    if (groupBy === "none") {
      return { "All": sortedExpenses };
    }

    const groups: Record<string, Expense[]> = {};
    
    sortedExpenses.forEach((expense) => {
      let key = "Uncategorized";
      
      switch (groupBy) {
        case "category":
          key = expense.category.name;
          break;
        case "date":
          key = format(new Date(expense.date), "MMM d, yyyy");
          break;
        case "trip":
          key = expense.trip?.name || "No Trip";
          break;
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expense);
    });
    
    return groups;
  }, [sortedExpenses, groupBy]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Description", "Category", "Trip", "Amount", "Currency", "Status", "Payment Method", "Created By", "Reimbursable"];
    const rows = expenses.map((exp) => [
      format(new Date(exp.date), "yyyy-MM-dd"),
      exp.description,
      exp.category.name,
      exp.trip?.name || "",
      (exp.baseAmount || exp.amount).toString(),
      exp.currency,
      exp.status,
      exp.paymentMethod,
      exp.createdBy.name || exp.createdBy.email,
      exp.isReimbursable ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{filtersOpen ? "Hide filters" : "Show filters"}</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {Object.values(filters).filter((v) => v !== "").length}
              </Badge>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          {savedFilters.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Saved Filters
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Saved Filters</DialogTitle>
                  <DialogDescription>Load a previously saved filter set</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {savedFilters.map((savedFilter) => (
                    <div
                      key={savedFilter.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <button
                        onClick={() => loadSavedFilter(savedFilter)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium">{savedFilter.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Object.values(savedFilter.filters).filter((v) => v !== "").length} filters
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSavedFilter(savedFilter.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Currency Selector (only show when grouping) */}
          {groupBy !== "none" && exchangeRates && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Display Currency:</span>
              <Select
                value={displayCurrency}
                onValueChange={(value) => setDisplayCurrency(value as "USD" | "EUR" | "TRY")}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="TRY">TRY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* View Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
          >
            {viewMode === "table" ? <LayoutGrid className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
            {viewMode === "table" ? "Card View" : "Table View"}
          </Button>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as typeof groupBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="trip">By Trip</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By (combined with order) */}
          <Select value={sortValue} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date ↓</SelectItem>
              <SelectItem value="date-asc">Date ↑</SelectItem>
              <SelectItem value="amount-desc">Amount ↓</SelectItem>
              <SelectItem value="amount-asc">Amount ↑</SelectItem>
              <SelectItem value="status-desc">Status ↓</SelectItem>
              <SelectItem value="status-asc">Status ↑</SelectItem>
            </SelectContent>
          </Select>

          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/expenses/new">
                <Plus className="mr-2 h-4 w-4" />
                New Expense
              </Link>
            </Button>
          )}
        </div>
      </div>

      {filtersOpen && (
        <Card className="animate-in fade-in slide-in-from-top-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filters</h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSaveFilterDialogOpen(true);
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Filters
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Status */}
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={ExpenseStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={ExpenseStatus.SUBMITTED}>Submitted</SelectItem>
                  <SelectItem value={ExpenseStatus.APPROVED}>Approved</SelectItem>
                  <SelectItem value={ExpenseStatus.REJECTED}>Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* Category */}
              <Select
                value={filters.categoryId || "all"}
                onValueChange={(value) => handleFilterChange("categoryId", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Trip */}
              <Select
                value={filters.tripId || "all"}
                onValueChange={(value) => handleFilterChange("tripId", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Trips" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trips</SelectItem>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Currency */}
              <Select
                value={filters.currency || "all"}
                onValueChange={(value) => handleFilterChange("currency", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="TRY">TRY</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Method */}
              <Select
                value={filters.paymentMethod || "all"}
                onValueChange={(value) => handleFilterChange("paymentMethod", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Payment Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Methods</SelectItem>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  <SelectItem value={PaymentMethod.CARD}>Card</SelectItem>
                  <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                  <SelectItem value={PaymentMethod.OWNER_ACCOUNT}>Owner Account</SelectItem>
                  <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Created By */}
              <Select
                value={filters.createdBy || "all"}
                onValueChange={(value) => handleFilterChange("createdBy", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reimbursable */}
              <Select
                value={filters.isReimbursable || "all"}
                onValueChange={(value) => handleFilterChange("isReimbursable", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Reimbursable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="true">Reimbursable</SelectItem>
                  <SelectItem value="false">Not Reimbursable</SelectItem>
                </SelectContent>
              </Select>

              {/* Start Date */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Start Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  End Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Min Amount */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Min Amount
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                />
              </div>

              {/* Max Amount */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Max Amount
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={saveFilterDialogOpen} onOpenChange={setSaveFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>Give a name to save your current filter settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filterName">Filter Name</Label>
              <Input
                id="filterName"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., Approved Expenses This Month"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    saveCurrentFilter();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveFilterDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveCurrentFilter} disabled={!filterName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : Object.keys(groupedExpenses).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No expenses found</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExpenses).map(([groupKey, groupExpenses]) => (
            <div key={groupKey}>
              {groupBy !== "none" && (
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {groupKey}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({groupExpenses.length} {groupExpenses.length === 1 ? "expense" : "expenses"})
                    </span>
                  </h3>
                  {groupExpenses.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total: {calculateGroupTotal(groupExpenses).toLocaleString("en-US", {
                        style: "currency",
                        currency: displayCurrency,
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {viewMode === "table" ? (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Trip</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              {format(new Date(expense.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                            <TableCell>{expense.category.name}</TableCell>
                            <TableCell>{expense.trip?.name || "-"}</TableCell>
                            <TableCell>
                              {exchangeRates ? (
                                convertToDisplayCurrency(expense.baseAmount || expense.amount, expense.currency).toLocaleString("en-US", {
                                  style: "currency",
                                  currency: displayCurrency,
                                })
                              ) : (
                                Number(expense.baseAmount || expense.amount).toLocaleString("en-US", {
                                  style: "currency",
                                  currency: expense.currency,
                                })
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(expense.status)}</TableCell>
                            <TableCell>{expense.createdBy.name || expense.createdBy.email}</TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/dashboard/expenses/${expense.id}`}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupExpenses.map((expense) => (
                    <Card key={expense.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg line-clamp-2">{expense.description}</CardTitle>
                          {getStatusBadge(expense.status)}
                        </div>
                        <CardDescription className="mt-2">
                          {format(new Date(expense.date), "MMM d, yyyy")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-medium">{expense.category.name}</span>
                        </div>
                        {expense.trip && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Trip:</span>
                            <span className="font-medium">{expense.trip.name}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-bold text-lg">
                            {exchangeRates ? (
                              convertToDisplayCurrency(expense.baseAmount || expense.amount, expense.currency).toLocaleString("en-US", {
                                style: "currency",
                                currency: displayCurrency,
                              })
                            ) : (
                              Number(expense.baseAmount || expense.amount).toLocaleString("en-US", {
                                style: "currency",
                                currency: expense.currency,
                              })
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Payment:</span>
                          <span className="font-medium">{expense.paymentMethod.replace("_", " ")}</span>
                        </div>
                        {expense.isReimbursable && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Reimbursable</Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-muted-foreground text-xs">Created by:</span>
                          <span className="text-xs">{expense.createdBy.name || expense.createdBy.email}</span>
                        </div>
                      </CardContent>
                      <div className="p-4 border-t">
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link href={`/dashboard/expenses/${expense.id}`}>View Details</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

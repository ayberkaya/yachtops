"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { ExpenseCategory, Trip, ExpenseStatus } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  baseAmount: number | null;
  status: ExpenseStatus;
  createdBy: { id: string; name: string | null; email: string };
  approvedBy: { id: string; name: string | null; email: string } | null;
  category: { id: string; name: string };
  trip: { id: string; name: string } | null;
}

interface ExpenseListProps {
  initialExpenses: Expense[];
  categories: ExpenseCategory[];
  trips: Trip[];
  currentUserId: string;
}

export function ExpenseList({ initialExpenses, categories, trips, currentUserId }: ExpenseListProps) {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    categoryId: "",
    tripId: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.append("status", filters.status);
        if (filters.categoryId) params.append("categoryId", filters.categoryId);
        if (filters.tripId) params.append("tripId", filters.tripId);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);

        const response = await fetch(`/api/expenses?${params.toString()}`);
        const data = await response.json();

        let filtered = data;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = data.filter((exp: Expense) =>
            exp.description.toLowerCase().includes(searchLower) ||
            exp.category.name.toLowerCase().includes(searchLower)
          );
        }

        setExpenses(filtered);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [filters.status, filters.categoryId, filters.tripId, filters.startDate, filters.endDate]);

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

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Button asChild>
            <Link href="/dashboard/expenses/new">
              <Plus className="mr-2 h-4 w-4" />
              New Expense
            </Link>
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-8"
              />
            </div>

            <Select
              value={filters.status || "all"}
              onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
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

            <Select
              value={filters.categoryId || "all"}
              onValueChange={(value) => setFilters({ ...filters, categoryId: value === "all" ? "" : value })}
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

            <Select
              value={filters.tripId || "all"}
              onValueChange={(value) => setFilters({ ...filters, tripId: value === "all" ? "" : value })}
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

            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />

            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No expenses found</div>
          ) : (
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
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                    <TableCell>{expense.category.name}</TableCell>
                    <TableCell>{expense.trip?.name || "-"}</TableCell>
                    <TableCell>
                      {Number(expense.baseAmount || expense.amount).toLocaleString("en-US", {
                        style: "currency",
                        currency: expense.currency,
                      })}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}


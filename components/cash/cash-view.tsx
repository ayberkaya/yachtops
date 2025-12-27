"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";
import { CashTransactionType } from "@prisma/client";
import { format } from "date-fns";

interface CashTransaction {
  id: string;
  type: CashTransactionType;
  amount: number;
  currency: string;
  description: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  expense: {
    id: string;
    description: string;
    amount: number;
  } | null;
}

interface CashData {
  transactions: CashTransaction[];
  balance: number;
}

export function CashView() {
  const router = useRouter();
  const [data, setData] = useState<CashData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: CashTransactionType.DEPOSIT,
    amount: "",
    currency: "EUR" as "USD" | "EUR" | "TRY",
    description: "",
  });

  // Calculate balance by currency from transactions
  const getBalancesByCurrency = (): Array<{ currency: string; balance: number }> => {
    if (!data || !data.transactions || data.transactions.length === 0) {
      return [];
    }

    const balancesByCurrency = new Map<string, number>();

    for (const transaction of data.transactions) {
      const currentBalance = balancesByCurrency.get(transaction.currency) || 0;
      if (transaction.type === CashTransactionType.DEPOSIT) {
        balancesByCurrency.set(transaction.currency, currentBalance + transaction.amount);
      } else {
        balancesByCurrency.set(transaction.currency, currentBalance - transaction.amount);
      }
    }

    // Convert to array and sort by currency
    return Array.from(balancesByCurrency.entries())
      .map(([currency, balance]) => ({ currency, balance }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/cash");
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      let responseData;
      
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        // Set empty data structure instead of null
        setData({
          transactions: [],
          balance: 0,
        });
        setIsLoading(false);
        return;
      }
      
      if (response.ok) {
        // Handle API response structure: { data: [...], balance, pagination }
        // Transform to component's expected structure: { transactions: [...], balance }
        const transactions = responseData.data || responseData.transactions || [];
        setData({
          transactions: Array.isArray(transactions) ? transactions : [],
          balance: responseData.balance || 0,
        });
      } else {
        console.error("Error fetching cash data:", responseData);
        // Set empty data structure instead of null
        setData({
          transactions: [],
          balance: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching cash data:", error);
      // Set empty data structure instead of null
      setData({
        transactions: [],
        balance: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/cash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: formData.type,
          amount,
          currency: formData.currency,
          description: formData.description || null,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      let responseData;
      
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        alert(`Error: Server returned non-JSON response. Status: ${response.status}`);
        setIsSubmitting(false);
        return;
      }
      
      if (response.ok) {
        alert("Transaction saved successfully");
        setIsDialogOpen(false);
        setFormData({
          type: CashTransactionType.DEPOSIT,
          amount: "",
          currency: "EUR",
          description: "",
        });
        fetchData();
        router.refresh();
      } else {
        console.error("Error response:", responseData);
        const errorMessage = responseData.error || responseData.details || "Failed to save transaction";
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!data) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cash Balance</CardTitle>
            <CardDescription>Current cash balance by currency</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {getBalancesByCurrency().length === 0 ? (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground">No cash transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {getBalancesByCurrency().map((balance, index, array) => (
                <div
                  key={balance.currency}
                  className={`flex items-center justify-between px-1.5 mb-0 rounded-lg bg-muted/50 ${
                    index < array.length - 1 ? "border-b border-border/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold">{balance.currency}</div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-semibold ${
                      balance.balance < 0 
                        ? "text-red-600 dark:text-red-500" 
                        : balance.balance > 0 
                        ? "text-green-600 dark:text-green-500" 
                        : ""
                    }`}>
                      {balance.balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit</CardTitle>
          <CardDescription>Add money to cash register</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value as "USD" | "EUR" | "TRY" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="TRY">TRY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Transaction description (optional)"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Add Deposit"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {(!data.transactions || data.transactions.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transactions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created By</TableHead>
                <TableHead className="text-right">View Expense</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.transactions || []).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          transaction.type === CashTransactionType.DEPOSIT
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {transaction.type === CashTransactionType.DEPOSIT
                          ? "+"
                          : "-"}
                        {transaction.amount.toFixed(2)} {transaction.currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.description ||
                        transaction.expense?.description ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      {transaction.createdBy.name || transaction.createdBy.email}
                    </TableCell>
                <TableCell className="text-right">
                  {transaction.type === CashTransactionType.WITHDRAWAL && transaction.expense ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/expenses/${transaction.expense.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
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


"use client";

import { useState, useEffect } from "react";
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
import { Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowRightLeft } from "lucide-react";
import { CashTransactionType } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

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

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
}

const SUPPORTED_CURRENCIES = ["USD", "EUR", "TRY"];

export function CashView() {
  const router = useRouter();
  const [data, setData] = useState<CashData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "EUR" | "TRY">("EUR");
  const [converterFrom, setConverterFrom] = useState<"USD" | "EUR" | "TRY">("EUR");
  const [converterTo, setConverterTo] = useState<"USD" | "EUR" | "TRY">("USD");
  const [converterAmount, setConverterAmount] = useState<string>("");
  const [formData, setFormData] = useState({
    type: CashTransactionType.DEPOSIT,
    amount: "",
    currency: "EUR" as "USD" | "EUR" | "TRY",
    description: "",
  });

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

  // Calculate balance in selected display currency
  // We need to sum all transactions converted to the display currency
  const getBalanceInCurrency = (): number => {
    if (!data || !exchangeRates) {
      // If no exchange rates, return original balance
      return data?.balance || 0;
    }
    
    // If no transactions, return 0
    if (data.transactions.length === 0) {
      return 0;
    }
    
    // Calculate balance by converting each transaction to display currency
    let totalBalance = 0;
    
    for (const transaction of data.transactions) {
      let amountInDisplayCurrency = transaction.amount;
      
      // If transaction currency is not the display currency, convert it
      if (transaction.currency !== displayCurrency) {
        // Convert to EUR first
        let amountInEUR = transaction.amount;
        if (transaction.currency !== "EUR" && exchangeRates.rates[transaction.currency]) {
          amountInEUR = transaction.amount / exchangeRates.rates[transaction.currency];
        }
        
        // Convert from EUR to display currency
        if (displayCurrency === "EUR") {
          amountInDisplayCurrency = amountInEUR;
        } else {
          amountInDisplayCurrency = amountInEUR * (exchangeRates.rates[displayCurrency] || 1);
        }
      }
      
      // Add or subtract based on transaction type
      if (transaction.type === CashTransactionType.DEPOSIT) {
        totalBalance += amountInDisplayCurrency;
      } else {
        totalBalance -= amountInDisplayCurrency;
      }
    }
    
    return totalBalance;
  };

  // Calculate converted amount
  const getConvertedAmount = (): number => {
    if (!converterAmount || !exchangeRates) return 0;
    const amount = parseFloat(converterAmount);
    if (isNaN(amount) || amount <= 0) return 0;
    
    // Convert from converterFrom to EUR first
    let amountInEUR = amount;
    if (converterFrom !== "EUR" && exchangeRates.rates[converterFrom]) {
      amountInEUR = amount / exchangeRates.rates[converterFrom];
    }
    
    // Convert from EUR to converterTo
    if (converterTo === "EUR") {
      return amountInEUR;
    }
    
    return amountInEUR * (exchangeRates.rates[converterTo] || 1);
  };

  useEffect(() => {
    fetchData();
    fetchExchangeRates();
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
        setData(responseData);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cash Balance</CardTitle>
              <CardDescription>Current cash balance</CardDescription>
            </div>
            <Select
              value={displayCurrency}
              onValueChange={(value) => setDisplayCurrency(value as "USD" | "EUR" | "TRY")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="TRY">TRY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {getBalanceInCurrency().toFixed(2)} {displayCurrency}
          </div>
          {exchangeRates && (
            <p className="text-sm text-muted-foreground mt-2">
              Exchange rates updated: {new Date(exchangeRates.date).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Currency Converter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Currency Converter</CardTitle>
              <CardDescription>Convert between USD, EUR, and TRY</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExchangeRates}
              disabled={!exchangeRates}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Rates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2">
                <Label htmlFor="converter-amount">Amount</Label>
                <Input
                  id="converter-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={converterAmount}
                  onChange={(e) => setConverterAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="converter-from">From</Label>
                <Select
                  value={converterFrom}
                  onValueChange={(value) => setConverterFrom(value as "USD" | "EUR" | "TRY")}
                >
                  <SelectTrigger id="converter-from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="TRY">TRY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="converter-to">To</Label>
                <Select
                  value={converterTo}
                  onValueChange={(value) => setConverterTo(value as "USD" | "EUR" | "TRY")}
                >
                  <SelectTrigger id="converter-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="TRY">TRY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {converterAmount && parseFloat(converterAmount) > 0 && (
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Result</p>
                  <p className="text-2xl font-bold">
                    {getConvertedAmount().toFixed(2)} {converterTo}
                  </p>
                </div>
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="text-sm font-medium">
                    {exchangeRates && exchangeRates.rates[converterFrom] && exchangeRates.rates[converterTo]
                      ? `1 ${converterFrom} = ${(exchangeRates.rates[converterTo] / exchangeRates.rates[converterFrom]).toFixed(4)} ${converterTo}`
                      : "N/A"}
                  </p>
                </div>
              </div>
            )}
          </div>
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
          <CardDescription>Cash transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transactions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {formatDistanceToNow(new Date(transaction.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.type === CashTransactionType.DEPOSIT ? (
                          <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>
                          {transaction.type === CashTransactionType.DEPOSIT
                            ? "Deposit"
                            : "Withdrawal"}
                        </span>
                      </div>
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


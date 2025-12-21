"use client";

import { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CreditCard as CreditCardIcon } from "lucide-react";

interface CreditCardData {
  id: string;
  ownerName: string;
  lastFourDigits: string;
  billingCycleEndDate: number | null;
}

interface Expense {
  id: string;
  description: string | null;
  category: { name: string };
  createdBy: { name: string | null; email: string };
  baseAmount: string | number | null;
  amount: string | number;
  currency: string;
  date: string | Date;
  creditCard?: {
    id: string;
    ownerName: string;
    lastFourDigits: string;
  };
}

interface CreditCardExpensesWidgetProps {
  expenses: Expense[];
  creditCards: CreditCardData[];
}

export const CreditCardExpensesWidget = memo(function CreditCardExpensesWidget({
  expenses,
  creditCards,
}: CreditCardExpensesWidgetProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>("all");

  // Get selected card info
  const selectedCard = creditCards.find((card) => card.id === selectedCardId);

  // Filter expenses by selected credit card and billing cycle
  const filteredExpenses = (() => {
    let filtered = selectedCardId === "all"
      ? expenses
      : expenses.filter((exp) => exp.creditCard?.id === selectedCardId);

    // If a specific card is selected and has billing cycle end date, filter by billing cycle
    if (selectedCardId !== "all" && selectedCard?.billingCycleEndDate) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();
      const billingDay = selectedCard.billingCycleEndDate;

      // Calculate the billing cycle start date
      // Billing cycle ends on the billing day of each month
      // The cycle starts the day after the billing day ends
      // If today is before billing day, current cycle started last month (day after last month's billing day)
      // If today is on or after billing day, current cycle started this month (day after this month's billing day)
      let cycleStartDate: Date;
      if (currentDay < billingDay) {
        // Current cycle started the day after last month's billing day
        // Handle year rollover
        if (currentMonth === 0) {
          // Last month was December of previous year
          cycleStartDate = new Date(currentYear - 1, 11, billingDay + 1);
        } else {
          cycleStartDate = new Date(currentYear, currentMonth - 1, billingDay + 1);
        }
      } else {
        // Current cycle started the day after this month's billing day
        cycleStartDate = new Date(currentYear, currentMonth, billingDay + 1);
      }

      // Filter expenses to only show those on or after the cycle start date
      filtered = filtered.filter((exp) => {
        const expenseDate = new Date(exp.date);
        return expenseDate >= cycleStartDate;
      });
    }

    return filtered;
  })();

  // Calculate totals by currency
  const totalsByCurrency = filteredExpenses.reduce((acc, exp) => {
    const currency = exp.currency;
    const amount = Number(exp.baseAmount || exp.amount);
    if (!acc[currency]) {
      acc[currency] = 0;
    }
    acc[currency] += amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="w-full md:max-w-[70%]">
      <CardHeader>
        <div>
          <CardTitle>Credit Card Expenses</CardTitle>
          <div className="mt-3">
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select card" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cards</SelectItem>
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.ownerName} •••• {card.lastFourDigits}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {creditCards.length === 0 ? (
          <div className="text-center py-6">
            <CreditCardIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">No credit cards added yet</p>
            <p className="text-xs text-muted-foreground">
              Add credit cards in Settings to track expenses
            </p>
          </div>
        ) : Object.keys(totalsByCurrency).length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">
              {selectedCardId === "all"
                ? "No credit card expenses found"
                : `No expenses found for this billing cycle`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(totalsByCurrency).map(([currency, total]) => (
              <div key={currency} className="flex items-center justify-between py-[10.2px] px-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-[15px] font-bold">{currency}</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold">
                    {total.toLocaleString("en-US", {
                      style: "currency",
                      currency: currency,
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
  );
});


"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CashBalance {
  currency: string;
  balance: number;
}

interface CashLedgerSummaryWidgetProps {
  balances: CashBalance[];
}

export const CashLedgerSummaryWidget = memo(function CashLedgerSummaryWidget({
  balances,
}: CashLedgerSummaryWidgetProps) {
  const handleCardClick = () => {
    window.location.href = "/dashboard/cash";
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        "gap-3 p-3 w-full"
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="View cash ledger"
    >
      <CardHeader className="pb-1.5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Cash Ledger</CardTitle>
            <CardDescription className="text-xs leading-tight">Current cash balance by currency</CardDescription>
          </div>
            <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Link href="/dashboard/cash">
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">View ledger</span>
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {balances.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-2">No cash transactions yet</p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Link href="/dashboard/cash">View Ledger</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {balances.map((balance, index, array) => (
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
  );
});


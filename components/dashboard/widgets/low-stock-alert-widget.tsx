"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

interface LowStockAlertWidgetProps {
  items?: any[];
}

export const LowStockAlertWidget = memo(function LowStockAlertWidget({ items = [] }: LowStockAlertWidgetProps) {
  if (items.length === 0) {
    return null; // Don't show if no low stock items
  }

  return (
    <Card className="border-purple-500 bg-purple-50/60 dark:bg-purple-950/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-600" />
          <div>
            <CardTitle className="text-purple-900 dark:text-purple-100">Low Stock</CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Items at or below threshold
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.slice(0, 5).map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-white/60 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.quantity} / {item.lowStockThreshold}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});


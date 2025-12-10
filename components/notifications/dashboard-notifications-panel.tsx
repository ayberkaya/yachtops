"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNotifications } from "./notifications-provider";
import { NOTIFICATION_BADGE_META } from "./notification-types";

export function DashboardNotificationsPanel() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refresh } =
    useNotifications();
  const [pendingExpensesCount, setPendingExpensesCount] = useState<number | null>(null);
  const [reimbursableCount, setReimbursableCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);

  const fetchFinanceAlerts = useCallback(async () => {
    setIsFinanceLoading(true);
    try {
      const [pendingRes, reimbRes, stockRes] = await Promise.all([
        fetch("/api/expenses?status=SUBMITTED", { cache: "no-store" }),
        fetch("/api/expenses?isReimbursable=true&isReimbursed=false", { cache: "no-store" }),
        fetch("/api/alcohol-stock", { cache: "no-store" }),
      ]);

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingExpensesCount(Array.isArray(pendingData) ? pendingData.length : 0);
      } else {
        setPendingExpensesCount(0);
      }

      if (reimbRes.ok) {
        const reimbData = await reimbRes.json();
        setReimbursableCount(Array.isArray(reimbData) ? reimbData.length : 0);
      } else {
        setReimbursableCount(0);
      }

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        const count = (stockData ?? []).filter(
          (item: any) =>
            item?.lowStockThreshold !== null &&
            item?.lowStockThreshold !== undefined &&
            Number(item.quantity) <= Number(item.lowStockThreshold)
        ).length;
        setLowStockCount(count);
      } else {
        setLowStockCount(0);
      }
    } catch (error) {
      console.error("Error fetching finance/stock alerts:", error);
      setPendingExpensesCount(0);
      setReimbursableCount(0);
      setLowStockCount(0);
    } finally {
      setIsFinanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceAlerts();
    const interval = setInterval(fetchFinanceAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchFinanceAlerts]);

  const financeAlerts = useMemo(() => {
    const alerts: {
      id: string;
      label: string;
      content: string;
      href: string;
      badge: string;
    }[] = [];

    if (pendingExpensesCount && pendingExpensesCount > 0) {
      alerts.push({
        id: "finance-pending",
        label: "Finance",
        content: `There ${
          pendingExpensesCount === 1 ? "is" : "are"
        } ${pendingExpensesCount} expense${pendingExpensesCount === 1 ? "" : "s"} awaiting approval.`,
        href: "/dashboard/expenses/pending",
        badge: `${pendingExpensesCount} approval${pendingExpensesCount === 1 ? "" : "s"}`,
      });
    }

    if (reimbursableCount && reimbursableCount > 0) {
      alerts.push({
        id: "finance-reimbursable",
        label: "Finance",
        content: `You have ${reimbursableCount} reimbursable expense${
          reimbursableCount === 1 ? "" : "s"
        } pending payout.`,
        href: "/dashboard/expenses/reimbursable",
        badge: `${reimbursableCount} reimbursement${reimbursableCount === 1 ? "" : "s"}`,
      });
    }

    if (lowStockCount && lowStockCount > 0) {
      alerts.push({
        id: "inventory-low-stock",
        label: "Inventory",
        content: `There ${lowStockCount === 1 ? "is" : "are"} ${lowStockCount} item${
          lowStockCount === 1 ? "" : "s"
        } below threshold in beverage stock.`,
        href: "/dashboard/inventory/alcohol-stock",
        badge: "Low Stock",
      });
    }

    return alerts;
  }, [pendingExpensesCount, reimbursableCount, lowStockCount]);

  const getBadge = (type: keyof typeof NOTIFICATION_BADGE_META) => {
    const meta = NOTIFICATION_BADGE_META[type] ?? { label: type, variant: "default" as const };
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          meta.variant === "default" && "bg-slate-100 text-slate-700",
          meta.variant === "secondary" && "bg-blue-100 text-blue-700",
          meta.variant === "outline" && "bg-amber-100 text-amber-800",
          meta.variant === "destructive" && "bg-red-100 text-red-700"
        )}
      >
        {meta.label}
      </span>
    );
  };

  const showLoading =
    isLoading && isFinanceLoading && notifications.length === 0 && financeAlerts.length === 0;
  const hasAlerts = notifications.length > 0 || financeAlerts.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-slate-200 text-primary"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {(unreadCount > 0 || (lowStockCount ?? 0) > 0) && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : "!"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 border-none p-0 shadow-xl">
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Notifications</CardTitle>
                {unreadCount > 0 && (
                  <span className="text-xs font-semibold text-primary">{unreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => refresh()}
                  title="Refresh notifications"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading notifications…
              </div>
            ) : !hasAlerts ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                You're all caught up! No notifications yet.
              </div>
            ) : (
              <ScrollArea className="max-h-64 pr-3">
                <div className="space-y-3">
                  {financeAlerts.map((alert) => {
                    const isLowStock = alert.id === "inventory-low-stock";
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-xl border px-3 py-2.5 text-sm transition-colors shadow-sm ${
                          isLowStock
                            ? "bg-red-50 dark:bg-red-950/30 border-red-500"
                            : "bg-amber-50/60 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                              isLowStock
                                ? "bg-red-600 text-white"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {alert.badge}
                          </span>
                          <Link href={alert.href} className="text-xs text-blue-600 hover:underline">
                            Review →
                          </Link>
                        </div>
                        <p
                          className={`mt-1 text-sm ${
                            isLowStock ? "text-red-900 dark:text-red-100 font-medium" : "text-foreground"
                          }`}
                        >
                          {alert.content}
                        </p>
                      </div>
                    );
                  })}
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-xl border px-3 py-2.5 text-sm transition-colors hover:bg-accent/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {getBadge(notification.type)}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), "MMM d, HH:mm")}
                          </span>
                          {!notification.read && (
                            <button
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-foreground">{notification.content}</p>
                        {notification.message?.content && (
                          <p className="text-xs text-muted-foreground">{notification.message.content}</p>
                        )}
                        {notification.task?.title && (
                          <p className="text-xs text-muted-foreground">Task: {notification.task.title}</p>
                        )}
                        {notification.link && (
                          <Link href={notification.link} className="text-xs text-blue-600 hover:underline">
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}


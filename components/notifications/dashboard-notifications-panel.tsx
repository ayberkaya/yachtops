"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNotifications } from "./notifications-provider";
import { NOTIFICATION_BADGE_META } from "./notification-types";
import { TaskStatus } from "@prisma/client";

export function DashboardNotificationsPanel() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refresh } =
    useNotifications();
  const [pendingExpensesCount, setPendingExpensesCount] = useState<number | null>(null);
  const [reimbursableCount, setReimbursableCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  // Filter out task-related notifications for completed tasks and remove duplicates
  const filteredNotifications = useMemo(() => {
    // First filter out completed tasks
    const withoutCompleted = notifications.filter((notification) => {
      // If notification has no task, always show it
      if (!notification.task) {
        return true;
      }
      // Hide notifications for completed tasks (all task-related notifications)
      if (notification.task.status === TaskStatus.DONE) {
        return false;
      }
      // Otherwise, show all notifications
      return true;
    });

    // Remove duplicates based on type, content, taskId, and messageId
    // Keep only the most recent one for each unique combination
    const seen = new Map<string, typeof notifications[0]>();
    
    for (const notification of withoutCompleted) {
      const taskId = notification.task?.id || '';
      const messageId = notification.message?.id || '';
      const key = `${notification.type}-${notification.content}-${taskId}-${messageId}`;
      const existing = seen.get(key);
      
      if (!existing || new Date(notification.createdAt) > new Date(existing.createdAt)) {
        seen.set(key, notification);
      }
    }
    
    return Array.from(seen.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications]);

  const filteredUnreadCount = filteredNotifications.filter((n) => !n.read).length;

  const showLoading =
    isLoading && isFinanceLoading && filteredNotifications.length === 0 && financeAlerts.length === 0;
  const hasAlerts = filteredNotifications.length > 0 || financeAlerts.length > 0;

  useEffect(() => {
    if (!isHovered && isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isHovered, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-slate-200 text-primary"
          aria-label="Open notifications"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Bell className="h-4 w-4" />
          {(filteredUnreadCount > 0 || (lowStockCount ?? 0) > 0) && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {filteredUnreadCount > 0 ? (filteredUnreadCount > 9 ? "9+" : filteredUnreadCount) : "!"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-[calc(100vw-2rem)] max-w-96 p-0 shadow-xl md:w-96"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sideOffset={8}
      >
        <Card className="border-0 shadow-none [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)]">
          <CardHeader className="space-y-2 border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Bell className="h-4 w-4 text-primary flex-shrink-0" />
                <CardTitle className="text-base truncate">Notifications</CardTitle>
                {filteredUnreadCount > 0 && (
                  <span className="text-xs font-semibold text-primary whitespace-nowrap flex-shrink-0">{filteredUnreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {filteredUnreadCount > 0 && (
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
                  onClick={async () => {
                    await refresh({ silent: false });
                    await fetchFinanceAlerts();
                  }}
                  title="Refresh notifications"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {showLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading notifications…
              </div>
            ) : !hasAlerts ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                You're all caught up! No notifications yet.
              </div>
            ) : (
              <div className="max-h-[calc(100vh-12rem)] overflow-y-auto -mr-2 pr-2">
                <div className="space-y-3">
                  {financeAlerts.map((alert) => {
                    const isLowStock = alert.id === "inventory-low-stock";
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-xl border px-3 py-2.5 text-sm transition-colors shadow-sm ${
                          isLowStock
                            ? "bg-red-600 dark:bg-red-700 border-red-500"
                            : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide flex-shrink-0 ${
                              isLowStock
                                ? "bg-red-700 text-white"
                                : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                            }`}
                          >
                            {alert.badge}
                          </span>
                          <Link href={alert.href} className={`text-xs hover:underline whitespace-nowrap flex-shrink-0 ${isLowStock ? "text-white" : "text-blue-600 dark:text-blue-400"}`}>
                            Review →
                          </Link>
                        </div>
                        <p
                          className={`mt-1.5 text-sm break-words ${
                            isLowStock ? "text-white font-medium" : "text-foreground"
                          }`}
                        >
                          {alert.content}
                        </p>
                      </div>
                    );
                  })}
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex-shrink-0 min-w-0">
                          {getBadge(notification.type)}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(notification.createdAt), "MMM d, HH:mm")}
                          </span>
                          {!notification.read && (
                            <button
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        <p className="text-sm text-foreground break-words">{notification.content}</p>
                        {notification.message?.content && (
                          <p className="text-xs text-muted-foreground break-words">{notification.message.content}</p>
                        )}
                        {notification.task?.title && (
                          <p className="text-xs text-muted-foreground break-words">Task: {notification.task.title}</p>
                        )}
                        {notification.link && (
                          <Link href={notification.link} className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-block">
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}


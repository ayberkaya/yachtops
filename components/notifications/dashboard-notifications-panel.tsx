"use client";

import Link from "next/link";
import { Bell, Check, CheckCheck, RefreshCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNotifications } from "./notifications-provider";
import { NOTIFICATION_BADGE_META } from "./notification-types";

export function DashboardNotificationsPanel() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refresh } =
    useNotifications();

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
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
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
            <p className="text-xs text-muted-foreground leading-relaxed">
              Stay on top of task updates, mentions, and procurement alerts without leaving the
              dashboard.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                You're all caught up! No notifications yet.
              </div>
            ) : (
              <ScrollArea className="max-h-64 pr-3">
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm transition-colors",
                        notification.read
                          ? "bg-white/30 border-slate-100"
                          : "bg-primary/5 border-primary/10 shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getBadge(notification.type)}
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(notification.createdAt), "MMM d, HH:mm")}
                          </span>
                        </div>
                        {!notification.read && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{notification.content}</p>
                      {notification.task && (
                        <Link
                          href={`/dashboard/tasks/${notification.task.id}`}
                          className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                          onClick={() => markAsRead(notification.id)}
                        >
                          View task →
                        </Link>
                      )}
                      {notification.message && (
                        <Link
                          href={`/dashboard/messages?channel=${notification.message.channelId}`}
                          className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Open channel →
                        </Link>
                      )}
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



"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: "TASK_ASSIGNED" | "TASK_COMPLETED" | "TASK_DUE_SOON" | "TASK_OVERDUE" | "MESSAGE_MENTION" | "MESSAGE_RECEIVED";
  content: string;
  read: boolean;
  createdAt: string;
  task: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  } | null;
  message: {
    id: string;
    channelId: string;
    content: string | null;
    channel: {
      id: string;
      name: string;
    };
  } | null;
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Check due dates on mount (only for OWNER/CAPTAIN)
    checkDueDates();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      checkDueDates();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkDueDates = async () => {
    try {
      // Only check if user has permission (OWNER/CAPTAIN)
      await fetch("/api/notifications/check-due-dates", {
        method: "POST",
      });
    } catch (error) {
      // Silently fail - this is a background check
      console.error("Error checking due dates:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?unreadOnly=false");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getNotificationBadge = (type: Notification["type"]) => {
    const variants: Record<Notification["type"], "default" | "secondary" | "destructive" | "outline"> = {
      TASK_ASSIGNED: "default",
      TASK_COMPLETED: "secondary",
      TASK_DUE_SOON: "outline",
      TASK_OVERDUE: "destructive",
      MESSAGE_MENTION: "default",
      MESSAGE_RECEIVED: "secondary",
    };

    const labels: Record<Notification["type"], string> = {
      TASK_ASSIGNED: "Assigned",
      TASK_COMPLETED: "Completed",
      TASK_DUE_SOON: "Due Soon",
      TASK_OVERDUE: "Overdue",
      MESSAGE_MENTION: "Mention",
      MESSAGE_RECEIVED: "Message",
    };

    return (
      <Badge variant={variants[type] || "default"}>
        {labels[type] || type}
      </Badge>
    );
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {unreadNotifications.length > 0 && (
                <div>
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-muted/50 transition-colors border-l-2 border-l-blue-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getNotificationBadge(notification.type)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm">{notification.content}</p>
                          {notification.task && (
                            <Link
                              href={`/dashboard/tasks/${notification.task.id}`}
                              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                              onClick={() => markAsRead(notification.id)}
                            >
                              View task →
                            </Link>
                          )}
                          {notification.message && (
                            <Link
                              href={`/dashboard/messages?channel=${notification.message.channelId}`}
                              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                              onClick={() => markAsRead(notification.id)}
                            >
                              View message →
                            </Link>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {readNotifications.length > 0 && (
                <div className="opacity-60">
                  {readNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getNotificationBadge(notification.type)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm">{notification.content}</p>
                          {notification.task && (
                            <Link
                              href={`/dashboard/tasks/${notification.task.id}`}
                              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View task →
                            </Link>
                          )}
                          {notification.message && (
                            <Link
                              href={`/dashboard/messages?channel=${notification.message.channelId}`}
                              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View message →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, CheckCheck, X, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./notifications-provider";
import { NOTIFICATION_BADGE_META } from "./notification-types";
import { isNotificationSoundEnabled, setNotificationSoundEnabled } from "@/lib/notification-sound";

export function NotificationsView() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled());
  }, []);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    setNotificationSoundEnabled(newValue);
  };

  const getNotificationBadge = (type: keyof typeof NOTIFICATION_BADGE_META) => {
    const meta = NOTIFICATION_BADGE_META[type] ?? { label: type, variant: "default" as const };
    return (
      <Badge variant={meta.variant}>
        {meta.label}
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSound}
              title={soundEnabled ? "Disable notification sound" : "Enable notification sound"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
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


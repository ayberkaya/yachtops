"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DashboardNotification } from "./notification-types";
import { playNotificationSoundByType } from "@/lib/notification-sound";

type NotificationsContextValue = {
  notifications: DashboardNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const hasMountedRef = useRef(false);
  const previousNotificationsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }

      try {
        const response = await fetch("/api/notifications?unreadOnly=false", {
          cache: "no-store",
        });

        if (response.ok) {
          const data: DashboardNotification[] = await response.json();
          
          // Check for new unread notifications and play sound
          if (!options?.silent && previousNotificationsRef.current.size > 0) {
            const newUnreadNotifications = data.filter(
              (notification) => 
                !notification.read && 
                !previousNotificationsRef.current.has(notification.id)
            );
            
            // Play sound for each new notification
            newUnreadNotifications.forEach((notification) => {
              playNotificationSoundByType(notification.type);
            });
          }
          
          // Update previous notifications set
          previousNotificationsRef.current = new Set(data.map((n) => n.id));
          
          setNotifications(data);
          setUnreadCount(data.filter((notification) => !notification.read).length);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const checkDueDates = useCallback(async () => {
    try {
      await fetch("/api/notifications/check-due-dates", {
        method: "POST",
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error checking due dates:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Only run once on mount
    if (hasMountedRef.current) {
      return;
    }
    hasMountedRef.current = true;

    // Initial load
    refresh().catch(() => {
      // Silently handle errors
      setIsLoading(false);
    });
    checkDueDates().catch(() => {
      // Silently handle errors
    });

    // Set up smart polling - only when tab is visible
    let interval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      if (interval) clearInterval(interval);
      
      const poll = () => {
        // Only poll if tab is visible
        if (document.hidden) return;
        
        refresh({ silent: true }).catch(() => {
          // Silently handle errors
        });
        checkDueDates().catch(() => {
          // Silently handle errors
        });
      };
      
      poll(); // Initial poll
      // OPTIMIZED: Increased interval to 2 minutes to reduce bandwidth
      interval = setInterval(poll, 120000); // 2 minutes (was 45 seconds)
    };
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        startPolling();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, read: true }),
        });

        if (response.ok) {
          setNotifications((prev) =>
            prev.map((notification) =>
              notification.id === id ? { ...notification, read: true } : notification
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}



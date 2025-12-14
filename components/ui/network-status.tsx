"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NetworkStatusProps {
  showWhenOnline?: boolean;
}

export function NetworkStatus({ showWhenOnline = false }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      if (typeof navigator !== "undefined") {
        const online = navigator.onLine;
        setIsOnline(online);
        
        if (!online) {
          setWasOffline(true);
        } else if (wasOffline && online) {
          // Just came back online
          setWasOffline(false);
        }
      }
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, [wasOffline]);

  // Don't show anything if online and showWhenOnline is false
  if (isOnline && !showWhenOnline) return null;

  if (!isOnline) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          No Internet Connection
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          You're working offline. Your changes are saved locally and will sync automatically when your connection is restored.
        </AlertDescription>
      </Alert>
    );
  }

  if (wasOffline && isOnline) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
        <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Connection Restored
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          You're back online. Your changes are being synced.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}


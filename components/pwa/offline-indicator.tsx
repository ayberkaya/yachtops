"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const updateStatus = () => {
      if (typeof navigator !== "undefined") {
        setIsOnline(navigator.onLine);
      }
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-lg dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <div className="text-sm leading-5">
          <p className="font-semibold">Working Offline</p>
          <p className="text-xs text-red-700 dark:text-red-200/80">
            No internet connection. Your changes are saved locally and will sync automatically when you're back online.
          </p>
        </div>
      </div>
    </div>
  );
}


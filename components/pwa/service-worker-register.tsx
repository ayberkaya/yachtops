"use client";

import { useEffect } from "react";
import { offlineQueue } from "@/lib/offline-queue";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker (both dev and production)
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);

          // Register background sync
          offlineQueue.registerBackgroundSync().catch(console.error);

          // Listen for service worker messages
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data && event.data.type === "SYNC_SUCCESS") {
              // Trigger UI update
              window.dispatchEvent(new Event("sync-status-change"));
            }
          });

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Auto-sync when coming online
          const handleOnline = () => {
            offlineQueue.sync().catch(console.error);
          };
          window.addEventListener("online", handleOnline);

          return () => {
            window.removeEventListener("online", handleOnline);
          };
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}


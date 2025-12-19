"use client";

import { useEffect } from "react";
import { offlineQueue } from "@/lib/offline-queue";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Disable service worker in development to prevent chunk loading issues with Turbopack
    const isDev = process.env.NODE_ENV === "development" || 
                  window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1";
    
    if (isDev) {
      // Unregister any existing service workers in dev mode
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister().then(() => {
              console.log("Service worker unregistered in dev mode to prevent chunk loading issues");
            });
          });
        });
      }
      return;
    }
    
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker (production only)
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


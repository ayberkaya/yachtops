"use client";

import { useEffect, useState } from "react";

export function PushNotificationRegister() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkSubscriptionStatus = async () => {
    try {
      // First check if VAPID keys are configured
      try {
        const vapidCheck = await fetch("/api/push/vapid-public-key");
        if (!vapidCheck.ok) {
          // VAPID keys not configured - skip subscription check
          console.debug("Push notifications not configured (VAPID keys missing)");
          setIsSupported(false);
          return;
        }
      } catch (error) {
        // Network error or VAPID not configured - skip silently
        console.debug("Cannot check VAPID keys:", error);
        setIsSupported(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      // If subscribed, verify with backend
      if (subscription) {
        try {
          const response = await fetch("/api/push/subscription", {
            method: "GET",
          });
          if (response.ok) {
            const data = await response.json();
            setIsSubscribed(data.subscribed || false);
          }
        } catch (error) {
          // Silent error - don't spam console
          console.debug("Error checking subscription status:", error);
        }
      }
    } catch (error) {
      // Silent error handling - service worker might not be ready yet
      console.debug("Error checking subscription:", error);
    }
  };

  useEffect(() => {
    // Check if push notifications are supported
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setIsSupported(true);
      checkSubscriptionStatus();
    }
  }, []);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      console.warn("Notification permission denied");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  const subscribeToPush = async (silent = false): Promise<boolean> => {
    if (!isSupported) {
      if (!silent) {
        console.warn("Push notifications are not supported");
      }
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission first
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        if (!silent) {
          console.warn("Notification permission is required for push notifications");
        }
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const vapidResponse = await fetch("/api/push/vapid-public-key");
      if (!vapidResponse.ok) {
        // Check if VAPID keys are not configured
        if (vapidResponse.status === 503 || vapidResponse.status === 500) {
          if (!silent) {
            console.warn("Push notifications are not configured (VAPID keys missing)");
          }
          setIsLoading(false);
          return false;
        }
        throw new Error("Failed to get VAPID public key");
      }
      const { publicKey } = await vapidResponse.json();

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Send subscription to backend
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        // Clear any previous failure flag
        if (typeof window !== "undefined") {
          localStorage.removeItem("push-notification-failed");
        }
        if (!silent) {
          console.log("Successfully subscribed to push notifications");
        }
        return true;
      } else {
        throw new Error("Failed to save subscription");
      }
    } catch (error) {
      // Store failure flag to prevent repeated attempts
      if (typeof window !== "undefined") {
        localStorage.setItem("push-notification-failed", Date.now().toString());
      }
      
      if (!silent) {
        console.error("Error subscribing to push notifications:", error);
      } else {
        // Silent mode - only log to console, no alert
        console.debug("Push notification subscription failed (silent):", error);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove subscription from backend
        await fetch("/api/push/subscription", {
          method: "DELETE",
        });

        setIsSubscribed(false);
        console.log("Successfully unsubscribed from push notifications");
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      // Don't show alert - just log the error
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Auto-subscribe on mount if permission is granted and not already subscribed
  // Only attempt once per session, and skip if previous attempt failed recently
  useEffect(() => {
    if (!isSupported || isSubscribed || Notification.permission !== "granted") {
      return;
    }

    // Check if we've failed recently (within last hour)
    if (typeof window !== "undefined") {
      const lastFailure = localStorage.getItem("push-notification-failed");
      if (lastFailure) {
        const failureTime = parseInt(lastFailure, 10);
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - failureTime < oneHour) {
          // Skip auto-subscribe if we failed recently
          console.debug("Skipping auto-subscribe - previous failure within last hour");
          return;
        }
      }
    }

    // Wait a bit before auto-subscribing to avoid interrupting user
    // Use silent mode to prevent alerts on errors
    const timer = setTimeout(() => {
      subscribeToPush(true).catch((error) => {
        // Silent error handling - no alert
        console.debug("Auto-subscribe failed:", error);
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed]);

  // Don't render anything - this component works silently in the background
  return null;
}


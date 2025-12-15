"use client";

import { useEffect, useState } from "react";

export function PushNotificationRegister() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkSubscriptionStatus = async () => {
    try {
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
          console.error("Error checking subscription status:", error);
        }
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
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

  const subscribeToPush = async () => {
    if (!isSupported) {
      console.warn("Push notifications are not supported");
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission first
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        alert("Notification permission is required for push notifications");
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const vapidResponse = await fetch("/api/push/vapid-public-key");
      if (!vapidResponse.ok) {
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
        console.log("Successfully subscribed to push notifications");
      } else {
        throw new Error("Failed to save subscription");
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      alert("Failed to enable push notifications. Please try again.");
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
      alert("Failed to disable push notifications. Please try again.");
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
  useEffect(() => {
    if (isSupported && !isSubscribed && Notification.permission === "granted") {
      // Wait a bit before auto-subscribing to avoid interrupting user
      const timer = setTimeout(() => {
        subscribeToPush().catch(console.error);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed]);

  // Don't render anything - this component works silently in the background
  return null;
}


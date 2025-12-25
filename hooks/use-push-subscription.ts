"use client";

import { useState, useEffect, useCallback } from "react";

export interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
  error: Error | null;
}

export interface UsePushSubscriptionReturn extends PushSubscriptionState {
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
}

/**
 * Hook for managing push notification subscriptions
 * 
 * Features:
 * - Registers service worker if not registered
 * - Requests notification permission
 * - Subscribes to push notifications
 * - Saves subscription to Supabase via API
 * 
 * @returns Push subscription state and methods
 */
export function usePushSubscription(): UsePushSubscriptionReturn {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    permission: null,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setState((prev) => ({
        ...prev,
        isSupported: supported,
        permission: supported ? Notification.permission : null,
      }));
    };

    checkSupport();
  }, []);

  /**
   * Register service worker if not already registered
   */
  const ensureServiceWorkerRegistered = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported");
    }

    // Check if already registered
    let registration = await navigator.serviceWorker.getRegistration("/sw.js");
    
    if (!registration) {
      // Register service worker
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("Service Worker registered:", registration.scope);
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      throw new Error("Notifications are not supported");
    }

    if (Notification.permission === "granted") {
      setState((prev) => ({ ...prev, permission: "granted" }));
      return true;
    }

    if (Notification.permission === "denied") {
      setState((prev) => ({ ...prev, permission: "denied" }));
      throw new Error("Notification permission denied");
    }

    const permission = await Notification.requestPermission();
    setState((prev) => ({ ...prev, permission }));

    return permission === "granted";
  }, []);

  /**
   * Convert VAPID public key from base64 URL to Uint8Array
   */
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  /**
   * Check current subscription status
   */
  const checkStatus = useCallback(async () => {
    if (!state.isSupported) {
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Check with backend
      const response = await fetch("/api/push/subscription", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          isSubscribed: data.subscribed || false,
        }));
      }

      // Also check browser subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState((prev) => ({
        ...prev,
        isSubscribed: prev.isSubscribed || !!subscription,
      }));
    } catch (error) {
      console.error("Error checking subscription status:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.isSupported]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: new Error("Push notifications are not supported"),
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Register service worker if not registered
      const registration = await ensureServiceWorkerRegistered();

      // 2. Request notification permission
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        throw new Error("Notification permission is required");
      }

      // 3. Get VAPID public key from server
      const vapidResponse = await fetch("/api/push/vapid-public-key");
      if (!vapidResponse.ok) {
        const errorData = await vapidResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to get VAPID public key"
        );
      }
      const { publicKey } = await vapidResponse.json();

      // 4. Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // 5. Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // 6. Send subscription to backend
      const subscriptionObject = subscription.toJSON();
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscriptionObject.endpoint,
          keys: {
            p256dh: subscriptionObject.keys?.p256dh,
            auth: subscriptionObject.keys?.auth,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to save subscription"
        );
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        error: null,
      }));

      return true;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({
        ...prev,
        error: errorObj,
        isSubscribed: false,
      }));
      console.error("Error subscribing to push notifications:", errorObj);
      return false;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [
    state.isSupported,
    ensureServiceWorkerRegistered,
    requestNotificationPermission,
    urlBase64ToUint8Array,
  ]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from backend
        const response = await fetch("/api/push/subscription", {
          method: "DELETE",
        });

        if (!response.ok) {
          console.warn("Failed to remove subscription from backend");
        }
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        error: null,
      }));

      return true;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({
        ...prev,
        error: errorObj,
      }));
      console.error("Error unsubscribing from push notifications:", errorObj);
      return false;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.isSupported]);

  // Check status on mount if supported
  useEffect(() => {
    if (state.isSupported) {
      checkStatus();
    }
  }, [state.isSupported, checkStatus]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkStatus,
  };
}


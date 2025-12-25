// Service Worker for HelmOps PWA (offline-first with API caching)
const CACHE_NAME = "helmops-static-v5";
const API_CACHE_NAME = "helmops-api-v2";

const PRECACHE_URLS = [
  "/",
  "/auth/signin",
  "/dashboard",
  "/dashboard/expenses",
  "/dashboard/tasks",
  "/dashboard/maintenance",
  "/dashboard/shopping",
  "/dashboard/trips",
  "/dashboard/inventory",
  "/dashboard/cash",
  "/offline",
  "/manifest",
];

const isHttp = (url) => ["http:", "https:"].includes(url.protocol);

// Helper: cache-first with background revalidate for static assets
async function staleWhileRevalidate(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// Helper: network-first with cache fallback (used for pages and API GET)
async function networkFirst(request, cacheName = CACHE_NAME, fallbackToOffline = false) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      // Cache successful responses
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    // Network failed - try cache
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // If navigation request and offline fallback enabled, return offline page
    if (fallbackToOffline && (request.mode === "navigate" || request.destination === "document")) {
      const offlineUrl = new URL("/offline", self.location.origin);
      const offlineRequest = new Request(offlineUrl);
      const offline = await cache.match(offlineRequest);
      if (offline) {
        return offline;
      }
      // If offline page not cached, create a simple offline response
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offline - HelmOps</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>You're Offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html" },
          status: 200,
        }
      );
    }
    throw error;
  }
}

// Helper: cache-first with network fallback (better for offline navigation)
async function cacheFirstWithNetwork(request, cacheName = CACHE_NAME, fallbackToOffline = false) {
  const cache = await caches.open(cacheName);
  
  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    // Also try to update in background
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone()).catch(() => {});
        }
      })
      .catch(() => {});
    return cached;
  }
  
  // Cache miss - try network
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    // Network failed and no cache - return offline page for navigation
    if (fallbackToOffline && (request.mode === "navigate" || request.destination === "document")) {
      const offlineUrl = new URL("/offline", self.location.origin);
      const offlineRequest = new Request(offlineUrl);
      const offline = await cache.match(offlineRequest);
      if (offline) {
        return offline;
      }
      // Simple offline response
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offline - HelmOps</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; }
            h1 { color: #333; }
            p { color: #666; }
            button { padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>You're Offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html" },
          status: 200,
        }
      );
    }
    throw error;
  }
}

// Install event - precache essential routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Precache essential routes
        return cache.addAll(PRECACHE_URLS).catch((error) => {
          console.error("Cache installation failed:", error);
          // Continue even if some URLs fail
        });
      })
      .catch((error) => console.error("Cache installation failed:", error))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, API_CACHE_NAME].includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return null;
        })
      )
    ).then(() => {
      // Force delete icon cache to ensure fresh icons are loaded
      return caches.open(CACHE_NAME).then((cache) => {
        return Promise.all([
          cache.delete("/icon-192.png"),
          cache.delete("/icon-512.png"),
          cache.delete(new Request("/icon-192.png")),
          cache.delete(new Request("/icon-512.png")),
        ]).catch(() => {
          // Ignore errors if icons aren't cached yet
        });
      });
    })
  );
  return self.clients.claim();
});

// Fetch event - handle GET requests with strategies
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (!isHttp(requestUrl)) return;

  const isNextAsset = requestUrl.pathname.startsWith("/_next/");
  const isAPI = requestUrl.pathname.startsWith("/api/");
  const isNavigation = event.request.mode === "navigate";

  // Next.js assets: NEVER cache in dev mode, network-only to prevent chunk loading errors
  // In production, use stale-while-revalidate but with short TTL
  if (isNextAsset) {
    // Check if we're in development mode (localhost or dev server)
    const isDev = requestUrl.hostname === "localhost" || 
                  requestUrl.hostname === "127.0.0.1" ||
                  requestUrl.port === "3000" ||
                  requestUrl.searchParams.has("dev");
    
    if (isDev) {
      // In dev mode, always fetch from network - don't cache Next.js chunks
      event.respondWith(fetch(event.request).catch(() => {
        // If fetch fails, return a response that will trigger error handling
        return new Response("Chunk loading failed", { status: 404 });
      }));
      return;
    }
    
    // In production, use stale-while-revalidate but with aggressive invalidation
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // API GET: network-first, fallback to cache
  if (isAPI) {
    event.respondWith(networkFirst(event.request, API_CACHE_NAME));
    return;
  }

  // Navigation/page requests: network-first for fresh content, fallback to cache for offline
  // Next.js pages are dynamically rendered, so we need fresh content on each navigation
  if (isNavigation || event.request.destination === "document") {
    // Use network-first to ensure fresh content on navigation
    // Falls back to cache only if network fails (offline scenario)
    event.respondWith(networkFirst(event.request, CACHE_NAME, true));
    return;
  }

  // Other GET requests: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

// Background Sync event - sync queued requests
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-queue") {
    event.waitUntil(syncQueue());
  }
});

// Sync queue from IndexedDB
async function syncQueue() {
  try {
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("helmops-offline", 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains("queue")) {
          const queueStore = db.createObjectStore("queue", { keyPath: "id" });
          queueStore.createIndex("timestamp", "timestamp", { unique: false });
          queueStore.createIndex("status", "status", { unique: false });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!db) return;

    // Get all pending items
    const transaction = db.transaction(["queue"], "readonly");
    const store = transaction.objectStore("queue");
    const statusIndex = store.index("status");
    const request = statusIndex.getAll("pending");

    const items = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (!items || items.length === 0) return;

    // Process each item
    for (const item of items) {
      try {
        // Mark as processing
        const updateTransaction = db.transaction(["queue"], "readwrite");
        const updateStore = updateTransaction.objectStore("queue");
        await new Promise((resolve, reject) => {
          const getRequest = updateStore.get(item.id);
          getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (existing) {
              existing.status = "processing";
              const putRequest = updateStore.put(existing);
              putRequest.onsuccess = () => resolve(undefined);
              putRequest.onerror = () => reject(putRequest.error);
            } else {
              resolve(undefined);
            }
          };
          getRequest.onerror = () => reject(getRequest.error);
        });

        // Execute request
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            ...item.headers,
          },
          body: item.body,
        });

        if (response.ok) {
          // Success - remove from queue
          const deleteTransaction = db.transaction(["queue"], "readwrite");
          const deleteStore = deleteTransaction.objectStore("queue");
          await new Promise((resolve, reject) => {
            const deleteRequest = deleteStore.delete(item.id);
            deleteRequest.onsuccess = () => resolve(undefined);
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });

          // Notify clients
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({
              type: "SYNC_SUCCESS",
              itemId: item.id,
            });
          });
        } else {
          // Failed - increment retries
          const updateTransaction = db.transaction(["queue"], "readwrite");
          const updateStore = updateTransaction.objectStore("queue");
          await new Promise((resolve, reject) => {
            const getRequest = updateStore.get(item.id);
            getRequest.onsuccess = () => {
              const existing = getRequest.result;
              if (existing) {
                existing.retries = (existing.retries || 0) + 1;
                existing.status = existing.retries >= 3 ? "failed" : "pending";
                const putRequest = updateStore.put(existing);
                putRequest.onsuccess = () => resolve(undefined);
                putRequest.onerror = () => reject(putRequest.error);
              } else {
                resolve(undefined);
              }
            };
            getRequest.onerror = () => reject(getRequest.error);
          });
        }
      } catch (error) {
        // Network error - increment retries
        const updateTransaction = db.transaction(["queue"], "readwrite");
        const updateStore = updateTransaction.objectStore("queue");
        await new Promise((resolve, reject) => {
          const getRequest = updateStore.get(item.id);
          getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (existing) {
              existing.retries = (existing.retries || 0) + 1;
              existing.status = existing.retries >= 3 ? "failed" : "pending";
              const putRequest = updateStore.put(existing);
              putRequest.onsuccess = () => resolve(undefined);
              putRequest.onerror = () => reject(putRequest.error);
            } else {
              resolve(undefined);
            }
          };
          getRequest.onerror = () => reject(getRequest.error);
        });
      }
    }
  } catch (error) {
    console.error("Background sync error:", error);
  }
}

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "HelmOps", body: event.data.text() || "You have a new notification" };
    }
  } else {
    data = { title: "HelmOps", body: "You have a new notification" };
  }

  const options = {
    body: data.body || "You have a new notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png", // Using icon-192.png as badge if badge.png doesn't exist
    data: data.url ? { url: data.url } : {},
    tag: data.tag || "notification",
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "HelmOps", options)
  );
});

// Notification click event - handle when user clicks on notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Message event - handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "SYNC_QUEUE") {
    // Trigger sync
    syncQueue().catch(console.error);
  }
});


// Service Worker for HelmOps PWA (offline-first with API caching)
const CACHE_NAME = "helmops-static-v3";
const API_CACHE_NAME = "helmops-api-v2";

const PRECACHE_URLS = [
  "/",
  "/auth/signin",
  "/dashboard",
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
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackToOffline && request.destination === "document") {
      const offline = await cache.match("/offline");
      if (offline) return offline;
    }
    throw error;
  }
}

// Install event - precache essential routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
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
    )
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

  // Static assets: stale-while-revalidate
  if (isNextAsset) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // API GET: network-first, fallback to cache
  if (isAPI) {
    event.respondWith(networkFirst(event.request, API_CACHE_NAME));
    return;
  }

  // Navigation/page requests: network-first with offline fallback
  if (isNavigation || event.request.destination === "document") {
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

// Message event - handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "SYNC_QUEUE") {
    // Trigger sync
    syncQueue().catch(console.error);
  }
});


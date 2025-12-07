// Service Worker for YachtOps PWA (offline-first with API caching)
const CACHE_NAME = "yachtops-static-v2";
const API_CACHE_NAME = "yachtops-api-v1";

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


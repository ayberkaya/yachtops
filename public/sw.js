// Service Worker for YachtOps PWA
const CACHE_NAME = 'yachtops-v1';
const urlsToCache = [
  '/',
  '/auth/signin',
  '/dashboard',
  '/manifest',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Skip non-HTTP/HTTPS requests (chrome-extension, data:, blob:, etc.)
  if (!['http:', 'https:'].includes(requestUrl.protocol)) {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip chrome-extension URLs
  if (requestUrl.protocol === 'chrome-extension:' || requestUrl.href.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Don't cache chrome-extension or other unsupported schemes
            const responseUrl = new URL(response.url);
            if (!['http:', 'https:'].includes(responseUrl.protocol)) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (error) {
                  // Silently fail if caching is not supported for this request
                  console.warn('Failed to cache request:', event.request.url, error);
                }
              })
              .catch((error) => {
                // Silently fail if cache operation fails
                console.warn('Cache operation failed:', error);
              });

            return response;
          })
          .catch(() => {
            // Return offline page if available
            if (event.request.destination === 'document') {
              return caches.match('/offline');
            }
          });
      })
  );
});


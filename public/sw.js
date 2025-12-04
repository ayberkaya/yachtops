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

  // Skip API requests and NextAuth routes
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/_next/')) {
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
        if (response) {
          return response;
        }
        
        return fetch(event.request)
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

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache in background (don't block response)
            caches.open(CACHE_NAME)
              .then((cache) => {
                try {
                  cache.put(event.request, responseToCache).catch((err) => {
                    console.warn('Cache put failed:', event.request.url, err);
                  });
                } catch (error) {
                  console.warn('Cache operation error:', event.request.url, error);
                }
              })
              .catch((error) => {
                console.warn('Cache open failed:', error);
              });

            return response;
          })
          .catch((error) => {
            console.warn('Fetch failed:', event.request.url, error);
            // Return offline page if available for document requests
            if (event.request.destination === 'document') {
              return caches.match('/offline');
            }
            // For other requests, let the error propagate
            throw error;
          });
      })
      .catch((error) => {
        console.warn('Cache match failed:', event.request.url, error);
        // Try to fetch directly if cache fails
        return fetch(event.request).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/offline');
          }
          throw error;
        });
      })
  );
});


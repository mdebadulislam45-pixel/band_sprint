/**
 * IELTS Sprint - Production PWA Service Worker (v2)
 * Features:
 * - Shell precaching for offline launch (`/`, `/index.html`, `/manifest.webmanifest`, `/favicon.svg`)
 * - Safe installation error handling (does not break app if offline during initial install)
 * - Dynamic runtime caching (Stale-While-Revalidate) for all visited CSS, JS, and static assets
 * - Strict network-only exclusion for all /api/ endpoints, auth, billing, and cross-origin requests
 * - Safe update strategy (omits aggressive skipWaiting/clients.claim to prevent mid-test session disruption)
 */

const CACHE_NAME = 'ielts-sprint-shell-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Precache partial failure (non-fatal):', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API requests, auth, AI evaluations, billing, or external resources
  if (url.pathname.startsWith('/api/') || url.origin !== location.origin) {
    return;
  }

  // Only handle GET requests for caching
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, return cached response if available
        return cachedResponse;
      });

      // Stale-while-revalidate: return cache immediately if available, else wait for network
      return cachedResponse || fetchPromise;
    }).catch(() => {
      // Fallback for SPA navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

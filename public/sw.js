/**
 * BandSprint - Production PWA Service Worker (v3.1.0)
 *
 * Offline Study Pack Architecture:
 * - Immediate activation via self.skipWaiting() & clients.claim()
 * - Network-First for HTML navigation so fresh deploys load immediately with offline fallback
 * - Stale-While-Revalidate for versioned app bundles (Spelling Lab 683, Mistake Vault, Vocab Deck, Pronunciation Drills)
 * - Cache-First for Google Fonts so typography remains crisp offline
 * - Strict bypass for /api/, Firebase Auth/Firestore, billing, and Vite dev endpoints
 */

const CACHE_NAME = 'bandsprint-study-pack-v3.1.0';
const FONT_CACHE_NAME = 'bandsprint-fonts-v1';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn('[BandSprint SW] Precache partial failure (non-fatal):', err);
      })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== FONT_CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Cache-First for Google Fonts stylesheets & font files
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cache.put(request, networkRes.clone());
              }
              return networkRes;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  // 2. Strict bypass for API routes, Firebase/OAuth origins, and Vite dev modules
  if (
    url.origin !== location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@react-refresh') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.startsWith('/src/') ||
    url.searchParams.has('v')
  ) {
    return;
  }

  // 3. Navigation requests: Network-First with cached offline shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
          return fallback || new Response('Offline — please reconnect to load BandSprint.', { status: 503 });
        })
    );
    return;
  }

  // 4. Static JS/CSS/Images/Icons: Stale-While-Revalidate so offline study packs stay instant
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});

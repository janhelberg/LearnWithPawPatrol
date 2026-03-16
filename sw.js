/**
 * sw.js – LearnWithPawPatrol Service Worker
 *
 * Strategy: Cache First
 *   1. On install  → pre-cache all app shell assets.
 *   2. On fetch    → serve from cache; fall back to network and update cache.
 *   3. On activate → purge stale caches so the tablet never serves old assets.
 *
 * Bump CACHE_NAME when deploying a new version to force a cache refresh.
 */

const CACHE_NAME    = 'paw-patrol-learn-v1';
const OFFLINE_PAGE  = './index.html';

/** All assets that must be available offline from day one. */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './games/colors/index.html',
  './games/shapes/index.html',
  './shared/game-common.js',
  './shared/responsive-scaling.js',
  './shared/icons/icon.svg',
];

/* ------------------------------------------------------------------ */
/* Install – pre-cache app shell                                        */
/* ------------------------------------------------------------------ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ------------------------------------------------------------------ */
/* Activate – delete old caches                                         */
/* ------------------------------------------------------------------ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ------------------------------------------------------------------ */
/* Fetch – Cache First strategy                                         */
/* ------------------------------------------------------------------ */
self.addEventListener('fetch', event => {
  // Only handle GET requests.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache immediately; refresh cache in the background.
        const networkRefresh = fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              caches.open(CACHE_NAME).then(cache =>
                cache.put(event.request, response.clone())
              );
            }
            return response;
          })
          .catch(() => { /* network unavailable – ignore */ });

        // Return the cached version without waiting for the refresh.
        void networkRefresh;
        return cached;
      }

      // Not in cache → try network, cache the response, return it.
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, toCache)
          );
          return response;
        })
        .catch(() =>
          // Network failed and nothing cached → serve offline page.
          caches.match(OFFLINE_PAGE)
        );
    })
  );
});

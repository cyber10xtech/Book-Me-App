/**
 * BookMe Service Worker
 *
 * Cache strategy per asset type:
 *   /assets/*      → Cache-First  (Vite hashes filenames → safe to cache forever)
 *   images         → Cache-First  with 30-day TTL
 *   API / Supabase → Network-First (never serve stale data)
 *   navigation     → Network-First, fallback to cached shell
 *
 * Cache names are versioned. Bump CACHE_VERSION on each deploy to evict
 * old caches automatically on the next SW activation.
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `bookme-static-${CACHE_VERSION}`;
const IMAGE_CACHE   = `bookme-images-${CACHE_VERSION}`;
const FONT_CACHE    = `bookme-fonts-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/robots.txt',
];

// Hosts that should NEVER be served from cache (always network)
const BYPASS_HOSTS = [
  'supabase.co',        // Supabase API + Realtime
  'amazonaws.com',      // Supabase storage (S3)
  'googleapis.com',     // Google services
  'fcm.googleapis.com', // Push notifications
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = new Set([STATIC_CACHE, IMAGE_CACHE, FONT_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !currentCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Helpers ────────────────────────────────────────────────────────────────
function shouldBypass(url) {
  return BYPASS_HOSTS.some((host) => url.hostname.includes(host));
}

function isStaticAsset(url) {
  // Vite outputs hashed files under /assets/
  return url.pathname.startsWith('/assets/');
}

function isImage(request) {
  return request.destination === 'image';
}

function isFont(request) {
  return request.destination === 'font';
}

function isNavigation(request) {
  return request.mode === 'navigate';
}

// Cache-First: try cache, fall back to network and cache the result
async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Optionally enforce max-age for image / font caches
    if (maxAgeSeconds) {
      const cachedDate = cached.headers.get('date');
      if (cachedDate) {
        const age = (Date.now() - new Date(cachedDate).getTime()) / 1000;
        if (age > maxAgeSeconds) {
          // Stale — refresh in background (stale-while-revalidate)
          fetchAndCache(request, cache).catch(() => {});
        }
      }
    }
    return cached;
  }

  return fetchAndCache(request, cache);
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// Network-First: try network, fall back to cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Always bypass API / backend calls
  if (shouldBypass(url)) return;

  // 2. Hashed static assets → Cache-First, immutable (365 days)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 3. Images → Cache-First, 30-day TTL
  if (isImage(event.request)) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE, 30 * 24 * 3600));
    return;
  }

  // 4. Fonts → Cache-First, 365-day TTL
  if (isFont(event.request)) {
    event.respondWith(cacheFirst(event.request, FONT_CACHE, 365 * 24 * 3600));
    return;
  }

  // 5. Navigation (HTML) → Network-First, fall back to shell
  if (isNavigation(event.request)) {
    event.respondWith(
      networkFirst(event.request, STATIC_CACHE).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match('/') || Response.error();
      })
    );
    return;
  }

  // 6. Everything else on same origin → Network-First
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(event.request, STATIC_CACHE));
  }
});

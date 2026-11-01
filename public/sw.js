const CACHE = 'smarthub-v3';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg', '/robots.txt'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin: stale-while-revalidate for app shell, JS, CSS, and static assets
  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Cross-origin API calls (Supabase, Paystack, QR API, etc.) — network-first, no aggressive caching
  if (url.protocol === 'https:') {
    e.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match(req).then((c) => c || new Response('', { status: 504 })))
    );
    return;
  }
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) {
        const copy = res.clone();
        cache.put(req, copy).catch(() => {});
      }
      return res;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

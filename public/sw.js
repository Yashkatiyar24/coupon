// Network-first for pages (deals must be fresh), cache-first for static assets,
// branded offline fallback. Cache version bumps on deploy via the build stamp
// query param in the registration URL — old caches are purged on activate.
const CACHE = 'cad-v2';
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/go/') || url.pathname.startsWith('/api/')) return; // never cache redirects/API

  if (e.request.mode === 'navigate') {
    // network-first HTML: fresh offers when online, cached page (then offline card) when not
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match(OFFLINE)))
    );
    return;
  }

  // cache-first for everything else (icons, images, fonts)
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
    )
  );
});

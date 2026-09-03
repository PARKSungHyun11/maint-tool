// Bump when the precache list changes so stale entries are dropped on activate.
const CACHE = 'maint-v1';
const BASE = self.registration.scope.endsWith('/')
  ? self.registration.scope.slice(0, -1)
  : self.registration.scope;
const assetUrl = path => new URL(path, `${BASE}/`).pathname;
// caches.addAll rejects as a unit, so every entry here must exist or the
// service worker never installs. tests/static.test.js enforces that.
const STATIC = [
  assetUrl('./'),
  assetUrl('./index.html'),
  assetUrl('./manifest.json'),
  assetUrl('./lib/core.js'),
  assetUrl('./icon-180.png'),
  assetUrl('./icon-192.png'),
  assetUrl('./icon-512.png'),
  assetUrl('./icon-maskable-512.png'),
  assetUrl('./icon.svg')
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  // App code is network-first so a deploy becomes visible right away. That
  // means index.html and lib/core.js, which carries the calculation logic —
  // serving a stale copy of it would show wrong due dates.
  if (url.pathname === assetUrl('./') ||
      url.pathname.endsWith('.html') ||
      url.pathname === assetUrl('./lib/core.js')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return r;
        })
        // Offline: serve the cached copy. Only a navigation may fall back to
        // the shell — handing index.html to a script request would break it.
        .catch(() => caches.match(e.request).then(r =>
          r || (e.request.mode === 'navigate' ? caches.match(assetUrl('./index.html')) : undefined)
        ))
    );
    return;
  }

  // Static files and CDN scripts are cache-first after the first successful load.
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});

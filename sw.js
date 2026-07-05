const CACHE = 'maint-v0';
const BASE = self.registration.scope.endsWith('/')
  ? self.registration.scope.slice(0, -1)
  : self.registration.scope;
const assetUrl = path => new URL(path, `${BASE}/`).pathname;
const STATIC = [
  assetUrl('./'),
  assetUrl('./index.html'),
  assetUrl('./manifest.json'),
  assetUrl('./icon-192.png'),
  assetUrl('./icon-512.png')
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
  // index.html is network-first so Netlify updates become visible quickly.
  if (url.pathname === assetUrl('./') || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match(assetUrl('./index.html'))))
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

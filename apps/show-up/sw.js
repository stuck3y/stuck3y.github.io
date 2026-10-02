// Show Up — per-app service worker. Scope: /apps/show-up/
//
// Same as lib/sw-app.js, plus the shared SDK files: this page is controlled
// by this worker, not the shell's, so caching ../lib/ here is what makes the
// app open offline in the garage.
const CACHE = 'app-show-up-v1';
const PREFIX = CACHE.slice(0, CACHE.lastIndexOf('-') + 1); // this app's caches only
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  '../lib/tokens.css', '../lib/sys.js', '../lib/pwa.js', '../lib/river.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n.startsWith(PREFIX) && /^v\d+$/.test(n.slice(PREFIX.length)) && n !== CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const scopePath = new URL('./', self.location.href).pathname;
  const libPath = new URL('../lib/', self.location.href).pathname;
  if (!url.pathname.startsWith(scopePath) && !url.pathname.startsWith(libPath)) return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});

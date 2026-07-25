// Service worker for the Apps launcher (scope: /apps/).
//
// Precaches the shell — launcher + SDK — so the home screen and ⌘K palette
// open instantly and work offline. Each sub-app owns its own caching through
// its own service worker; this one deliberately only manages the shell.

const CACHE = 'shell-v2';
const PREFIX = CACHE.slice(0, CACHE.lastIndexOf('-') + 1); // this app's caches only
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './lib/sys.js',
  './lib/tokens.css',
  './lib/pwa.js',
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

  // Only the shell's own files. Sub-apps are handled by their own workers.
  const shellUrls = SHELL.map((p) => new URL(p, self.location.href).pathname);
  if (!shellUrls.includes(url.pathname)) return;

  // Cache-first, refreshing in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

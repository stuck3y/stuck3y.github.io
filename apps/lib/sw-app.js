// Per-app service worker template. Copy this file into an app's folder as `sw.js`
// and edit CACHE + SHELL for that app.
//
// Example for /apps/slantboard/sw.js:
//   const CACHE = 'app-slantboard-v1';
//   const SHELL = ['./', './index.html', './styles.css', './app.js'];

const CACHE = 'app-template-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
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
  if (!url.pathname.startsWith(scopePath)) return;

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

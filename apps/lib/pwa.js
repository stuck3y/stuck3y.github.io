// Opt-in PWA helper for /apps/<slug>/ apps.
// Drop next to an app's manifest + sw.js; include with:
//   <link rel="manifest" href="./manifest.webmanifest">
//   <script src="../lib/pwa.js" defer></script>
(() => {
  if (!('serviceWorker' in navigator)) return;
  const swUrl = new URL('./sw.js', location.href).toString();
  const scope = new URL('./', location.href).pathname;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl, { scope }).catch(() => {});
  });
})();

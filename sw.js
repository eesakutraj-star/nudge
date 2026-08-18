// Minimal service worker — just enough to make the app installable.
// Intentionally does not cache API calls, so the guide always comes from a live request.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass everything straight through to the network — no offline caching of API responses.
  event.respondWith(fetch(event.request));
});

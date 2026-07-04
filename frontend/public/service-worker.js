/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'bunkerhostal-v1';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg', '/web'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions.
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Cache-first for the app shell and static build assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const isStatic = url.pathname.startsWith('/static/');
        const isShell = SHELL_ASSETS.includes(url.pathname);
        if (response.ok && (isStatic || isShell)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

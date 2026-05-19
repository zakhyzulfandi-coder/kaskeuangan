const CACHE_NAME = 'kas-mahasiswa-pwa-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan cache request ke Google Apps Script / Google API
  if (
    request.url.includes('script.google.com') ||
    request.url.includes('googleusercontent.com') ||
    request.url.includes('google.com')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Manifest dan icon dibuat network-first supaya icon baru cepat terbaca
  if (
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.endsWith('/icon-192.png') ||
    url.pathname.endsWith('/icon-512.png')
  ) {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // File lain tetap cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});

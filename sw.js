const CACHE_NAME = "my-kas-pwa-v8";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  // Jangan pakai self.skipWaiting() di sini.
  // Kalau dipakai, update langsung aktif dan tombol "Update Aplikasi" tidak sempat muncul.

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  // Jangan cache request ke Google Apps Script / Google
  if (
    request.url.includes("script.google.com") ||
    request.url.includes("googleusercontent.com") ||
    request.url.includes("google.com")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // File utama selalu cek server dulu agar update cepat terbaca
  if (
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/manifest.json") ||
    url.pathname.endsWith("/icon-192.png") ||
    url.pathname.endsWith("/icon-512.png")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  // File lain pakai cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy);
        });

        return response;
      });
    })
  );
});

// Tombol Update Aplikasi di index.html akan mengirim pesan ini
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

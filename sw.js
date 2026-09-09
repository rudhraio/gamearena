const CACHE = "gamearena-v5";
const PRECACHE = [
  "/index.html",
  "/math/index.html",
  "/levels/index.html",
  "/play/index.html",
  "/zip/index.html",
  "/zip/play/index.html",
  "/riddles/index.html",
  "/offline/index.html",
  "/css/app.css",
  "/manifest.json",
  "/partials/briefing.html",
  "/js/core/storage.js",
  "/js/core/registry.js",
  "/js/core/pwa.js",
  "/js/core/shell.js",
  "/js/core/icons.js",
  "/js/games/math.js",
  "/js/games/zip.js",
  "/js/pages/hub.js",
  "/js/pages/math.js",
  "/js/pages/levels.js",
  "/js/pages/play.js",
  "/js/pages/zip.js",
  "/js/pages/zip-play.js",
  "/js/pages/soon.js",
  "/icons/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (req.url.startsWith(self.location.origin) || req.url.includes("fonts.g") || req.url.includes("cdn.") || req.url.includes("unpkg.com") || req.url.includes("jsdelivr"))) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match("/offline/index.html"));
      return cached || fetchPromise;
    })
  );
});

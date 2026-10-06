const CACHE = "gamearena-v13";
const PAGES = ["/", "/math/", "/levels/", "/play/", "/zip/", "/zip/play/", "/sudoku/", "/memory/", "/riddles/", "/offline/"];
const ASSETS = [
  "/css/app.css", "/manifest.json", "/partials/briefing.html",
  "/js/core/storage.js", "/js/core/registry.js", "/js/core/pwa.js",
  "/js/core/shell.js", "/js/core/icons.js", "/js/vendor/alpine.min.js",
  "/js/games/math.js", "/js/games/zip.js", "/js/games/sudoku.js",
  "/js/pages/hub.js", "/js/pages/math.js", "/js/pages/levels.js",
  "/js/pages/play.js", "/js/pages/zip.js", "/js/pages/zip-play.js",
  "/js/pages/sudoku.js", "/js/pages/memory.js", "/js/pages/soon.js",
  "/icons/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/icon-512-maskable.png", "/icons/apple-touch-icon.png",
  "/fonts/outfit.woff2", "/fonts/oswald.woff2", "/fonts/jetbrains-mono.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...PAGES, ...ASSETS])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("gamearena-") && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

function pageKey(url) {
  const path = url.pathname;
  if (path === "/index.html") return "/";
  if (path.endsWith("/index.html")) return path.slice(0, -"index.html".length);
  if (PAGES.includes(path)) return path;
  if (PAGES.includes(`${path}/`)) return `${path}/`;
  return path;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        const path = pageKey(new URL(request.url));
        if (PAGES.includes(path) && response.ok && response.type === "basic") await cache.put(path, response.clone());
        return response;
      } catch {
        return (await cache.match(pageKey(new URL(request.url)))) || (await cache.match("/offline/"));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const path = new URL(request.url).pathname;
    if (!ASSETS.includes(path)) return fetch(request);
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    const freshAsset = path.startsWith("/js/") || path.startsWith("/css/") || path === "/manifest.json";
    if (!freshAsset && cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    } catch {
      if (cached) return cached;
      throw new Error("Asset unavailable offline");
    }
  })());
});

const SHELL_CACHE = "toothhub-shell-v1";
const SHELL_ASSETS = [
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/v1/");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls or clinical data — always hit the network.
  if (event.request.method !== "GET" || isApiRequest(url)) {
    return;
  }

  // Navigations: network first, offline fallback if unreachable.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline")),
    );
    return;
  }

  // Static shell assets: cache first, network fallback.
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
    );
  }
});

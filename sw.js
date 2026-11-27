/* TEHNOCELL performance cache: network-first for pages, cache-first for small static assets. */
const TC_CACHE = "tc-static-v2";
const TC_MAX_ITEMS = 80;
const TC_STATIC = /\.(?:css|js|mjs|svg|png|jpe?g|webp|avif|ico|woff2?|ttf)$/i;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("tc-static-") && key !== TC_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > TC_MAX_ITEMS) {
    await Promise.all(keys.slice(0, keys.length - TC_MAX_ITEMS).map(key => cache.delete(key)));
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never intercept Supabase, external APIs, media streams, or third-party resources.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || /\.(?:mp4|webm|mp3|m4a|aac|ogg|pdf|zip|apk)$/i.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(TC_CACHE);
      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === "basic") await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  if (!TC_STATIC.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(TC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      await trimCache(cache);
    }
    return response;
  })());
});

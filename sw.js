/* Maintenance: remove stale cached application pages and use network-only responses. */
self.addEventListener("install",e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>e.respondWith(fetch(e.request,{cache:"no-store"})));
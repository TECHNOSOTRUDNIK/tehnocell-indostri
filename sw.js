const VERSION="tc-platform-shell-v2";
const MEDIA_CACHE="tc-platform-media-v2";
const SHELL=["./platform.html","./site.webmanifest","./tehnocell-icon.svg","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"];
async function put(cacheName,request,response){if(!response||!response.ok||response.type==="opaque")return;try{const c=await caches.open(cacheName);await c.put(request,response.clone());}catch(e){}}
self.addEventListener("install",event=>event.waitUntil((async()=>{const c=await caches.open(VERSION);for(const url of SHELL){try{const res=await fetch(url,{cache:"reload"});if(res.ok)await c.put(url,res);}catch(e){}}await self.skipWaiting();})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("tc-platform-")&&![VERSION,MEDIA_CACHE,"tc-platform-media-v1"].includes(k))await caches.delete(k);await self.clients.claim();})()));
self.addEventListener("fetch",event=>{
 const req=event.request;if(req.method!=="GET")return;
 const u=new URL(req.url);
 if(u.origin===self.location.origin){
  if(req.mode==="navigate"||u.pathname.endsWith("/platform.html")){
   event.respondWith((async()=>{try{const res=await fetch(req);if(res.ok)await put(VERSION,"./platform.html",res);return res;}catch(e){return (await caches.match("./platform.html"))||Response.error();}})());return;
  }
  if(/\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(u.pathname)){
   event.respondWith((async()=>{const cached=await caches.match(req);const refresh=fetch(req).then(async res=>{if(res.ok)await put(VERSION,req,res);return res;}).catch(()=>null);if(cached){event.waitUntil(refresh);return cached;}return (await refresh)||Response.error();})());return;
  }
 }
 if(u.hostname.endsWith("supabase.co")&&u.pathname.includes("/storage/v1/object/")){
  event.respondWith((async()=>{const cache=await caches.open(MEDIA_CACHE);const cached=await cache.match(req);try{const res=await fetch(req);if(res.ok&&res.type!=="opaque")await cache.put(req,res.clone());return res;}catch(e){if(cached)return cached;return Response.error();}})());
 }
});

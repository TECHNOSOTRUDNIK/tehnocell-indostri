const VERSION="tc-platform-shell-v1";
const SHELL=["./platform.html","./site.webmanifest","./tehnocell-icon.svg","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"];
self.addEventListener("install",event=>event.waitUntil((async()=>{const c=await caches.open(VERSION);for(const url of SHELL){try{await c.add(new Request(url,{mode:"cors"}));}catch(e){}}await self.skipWaiting();})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("tc-platform-")&&k!==VERSION&&k!=="tc-platform-media-v1")await caches.delete(k);await self.clients.claim();})()));
self.addEventListener("fetch",event=>{
 const req=event.request;if(req.method!=="GET")return;
 const u=new URL(req.url);
 if(u.origin===self.location.origin){
  if(req.mode==="navigate"||u.pathname.endsWith("/platform.html")){
   event.respondWith(fetch(req).then(res=>{if(res.ok)caches.open(VERSION).then(c=>c.put("./platform.html",res.clone()));return res;}).catch(()=>caches.match("./platform.html")));
   return;
  }
  if(/\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(u.pathname)){
   event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok)caches.open(VERSION).then(c=>c.put(req,res.clone()));return res;})));
  }
  return;
 }
 if(u.hostname.endsWith("supabase.co")&&u.pathname.includes("/storage/v1/object/")){
  event.respondWith((async()=>{const cache=await caches.open("tc-platform-media-v1");try{const res=await fetch(req);if(res.ok)cache.put(req,res.clone());return res;}catch(e){const hit=await cache.match(req);if(hit)return hit;throw e;}})());
 }
});

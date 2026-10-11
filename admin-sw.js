const CACHE="temo-weight-admin-v2";
const CORE=["/weight/admin.html","/weight/admin-manifest.json","/weight/admin-icon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("temo-weight-admin-")&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})())});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  if(url.origin===self.location.origin&&url.pathname==="/weight/admin.html"){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy));}
      return response;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
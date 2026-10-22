// offline support: precache everything, serve cache-first, refresh in the background (stale-while-revalidate).
// Bump V on each release so old caches are dropped; content also refreshes on the next online load.
const P='wilson-water-pirates-',V='1.2.0-20261022h',C=P+V,A=["./", "index.html", "manifest.json", "apple-touch-icon-120.png", "apple-touch-icon-152.png", "apple-touch-icon-167.png", "apple-touch-icon.png", "favicon-32.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(P)&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll()).then(cs=>cs.forEach(c=>c.postMessage('offline-ready'))))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;const nav=r.mode==='navigate';
  e.respondWith(caches.open(C).then(async c=>{const hit=(await c.match(r,{ignoreSearch:true}))||(nav?await c.match('index.html'):null);
    const net=fetch(r).then(res=>{if(res&&res.ok&&res.type==='basic'){if(nav){c.put('index.html',res.clone())}else c.put(r,res.clone())}return res});
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}return net.catch(()=>Response.error())}))});

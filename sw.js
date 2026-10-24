// offline support: precache everything; pages+scripts network-first (cache fallback offline), media cache-first.
// Bump V on each release so old caches are dropped; content also refreshes on the next online load.
const P='wilson-water-pirates-',V='1.3.0-20261024a',C=P+V,A=["./", "index.html", "manifest.json", "apple-touch-icon-120.png", "apple-touch-icon-152.png", "apple-touch-icon-167.png", "apple-touch-icon.png", "favicon-32.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(P)&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll()).then(cs=>cs.forEach(c=>c.postMessage('offline-ready'))))});
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting()});
// network-first for pages + scripts (so updates show on the next launch), cache fallback when offline; media/images cache-first with background refresh.
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;const nav=r.mode==='navigate';
  let key=r;if(nav){let p=u.pathname;if(p.endsWith('/'))p+='index.html';key=new Request(p)}
  const fresh=nav||/\.(html?|js|json)$/.test(u.pathname);
  e.respondWith(caches.open(C).then(async c=>{const cached=async()=>(await c.match(key,{ignoreSearch:true}))||(nav?await c.match('index.html'):null);
    if(fresh){try{const res=await Promise.race([fetch(new Request(u.href,{cache:'no-cache',credentials:'same-origin'})),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),5000))]);
        if(res&&res.ok){if(res.type==='basic'&&!res.redirected)c.put(key,res.clone());if(nav&&res.redirected)return Response.redirect(res.url,302);return res}
        const h=await cached();return h||res}catch(err){const h=await cached();return h||Response.error()}}
    const hit=await cached();const net=fetch(r).then(res=>{if(res&&res.ok&&res.type==='basic'&&!res.redirected)c.put(key,res.clone());return res});
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}return net.catch(()=>Response.error())}))});

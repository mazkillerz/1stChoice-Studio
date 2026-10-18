/* Studio service worker: makes the site installable and quick to open.
   - The app shell (pages, code, styles, brand kit) is cached so Studio opens even with a weak signal.
   - Code and pages are "network first": when online you always get the newest version.
   - Images (samples, thumbs, assets) are "cache first" and refreshed in the background.
   - Supabase (sign-in, saved designs, team photos) is NEVER cached: those requests go straight to the network. */
const VERSION='studio-v4-5';
const SHELL=[
  './','index.html','manifest.webmanifest',
  'assets/studio.css','assets/studio.js','assets/cloud.js','assets/config.js','assets/vendor/supabase.js',
  'assets/icon.png','assets/icon-192.png','assets/icon-512.png',
  'brands/brands.js',
  'tools/new-place.html','tools/new-place.js','tools/photo-story.html','tools/photo-story.js',
  'tools/cinematic.html','tools/cinematic.js','tools/collage.html','tools/collage.js','tools/split.html','tools/split.js',
  'tools/restock.html','tools/restock.js','tools/offer.html','tools/offer.js',
  'tools/carousel.html','tools/carousel.js'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(/supabase\.(co|in)$/.test(url.hostname)||url.pathname.includes('/auth/v1/')||url.pathname.includes('/rest/v1/')||url.pathname.includes('/storage/v1/')) return;   // never cached
  if(FONT_HOSTS.includes(url.hostname)){ e.respondWith(cacheFirst(req)); return; }
  if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'||/\.(html|js|css|json|webmanifest)$/.test(url.pathname)||url.pathname.endsWith('/')){ e.respondWith(networkFirst(req)); return; }
  if(/\.(png|jpe?g|webp|gif|svg|woff2?)$/.test(url.pathname)){ e.respondWith(cacheFirst(req,true)); return; }
});
async function networkFirst(req){
  const c=await caches.open(VERSION);
  try{
    const res=await fetch(req);
    if(res&&res.ok) c.put(req,res.clone());
    return res;
  }catch(err){
    const hit=await c.match(req)||await c.match(req,{ignoreSearch:true});
    if(hit) return hit;
    if(req.mode==='navigate'){ const home=await c.match('index.html'); if(home) return home; }
    throw err;
  }
}
async function cacheFirst(req,refresh){
  const c=await caches.open(VERSION); const hit=await c.match(req);
  const net=fetch(req).then(res=>{ if(res&&(res.ok||res.type==='opaque')) c.put(req,res.clone()); return res; }).catch(()=>null);
  if(hit){ if(refresh) net; return hit; }
  const res=await net; if(res) return res; return Response.error();
}

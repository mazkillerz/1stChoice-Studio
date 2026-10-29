/* Studio service worker: makes the site installable and quick to open.
   - The app shell (pages, code, styles, brand kit) is cached so Studio opens even with a weak signal.
   - Code and pages are "network first": when online you always get the newest version.
   - Images (samples, thumbs, assets) are "cache first" and refreshed in the background.
   - Supabase (sign-in, saved designs, team photos) is NEVER cached: those requests go straight to the network.
   - Share target (Android, installed app): photos shared from the gallery arrive as a POST to ./share-target; they wait in
     IndexedDB ('studio' › 'files' › 'studio:shared', the same store studio.js uses) and the hub opens a "pick a tool" sheet. */
const VERSION='studio-v1-21-0';   // Studio 1.21.0
const SHELL=[
  './','index.html','manifest.webmanifest','whats-new.html','assets/whatsnew.css','assets/whatsnew.js','studio-notes/changelog.md',
  'assets/studio.css','assets/studio.js','assets/search.css','assets/search.js','assets/templates.css','assets/templates.js','assets/batch.js','assets/stickers.js','assets/welcome.css','assets/welcome.js','assets/cloud.js','assets/config.js','assets/vendor/supabase.js',
  'assets/icon.png','assets/icon-192.png','assets/icon-512.png','assets/icon-512-maskable.png','assets/studio-dragon.png',
  'brands/brands.js','assets/render.js','tools/highlight-emoji.js',
  'tools/new-place.html','tools/new-place.js','tools/photo-story.html','tools/photo-story.js',
  'tools/cinematic.html','tools/cinematic.js','tools/collage.html','tools/collage.js','tools/split.html','tools/split.js',
  'tools/restock.html','tools/restock.js','tools/offer.html','tools/offer.js',
  'tools/carousel.html','tools/carousel.js','tools/highlight.html','tools/highlight.js',
  'tools/create.html','tools/create.js','tools/create.css','tools/create-core.js','tools/create-lib.js','tools/create-templates.js','brands/1stchoice/brand.js',
  'lab/index.html','lab/lab.css','lab/lab.js','lab/board.html','lab/board.css','lab/board-lib.js','lab/board.js','lab/board-tools.js','lab/board-comp.js','lab/board-io.js','lab/board-ui.js','lab/board-panel.js','lab/board-dialogs.js','lab/board-flex.js','assets/vendor/konva.min.js','assets/vendor/qrcode.js'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method==='POST'&&url.origin===self.location.origin&&url.pathname.endsWith('/share-target')){ e.respondWith(shareIn(req)); return; }
  if(req.method!=='GET') return;
  if(/supabase\.(co|in)$/.test(url.hostname)||url.pathname.includes('/auth/v1/')||url.pathname.includes('/rest/v1/')||url.pathname.includes('/storage/v1/')) return;   // never cached
  if(FONT_HOSTS.includes(url.hostname)){ e.respondWith(cacheFirst(req)); return; }
  if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'||/\.(html|js|css|json|webmanifest|md)$/.test(url.pathname)||url.pathname.endsWith('/')){ e.respondWith(networkFirst(req)); return; }
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
/* photos shared from another app: keep up to 9 pictures, then open the hub (?shared=<count>) */
function idbPut(k,v){ return new Promise(res=>{ try{ const r=indexedDB.open('studio',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('files');
  r.onsuccess=()=>{ try{ const t=r.result.transaction('files','readwrite'); t.objectStore('files').put(v,k); t.oncomplete=()=>res(true); t.onerror=()=>res(false); }catch(_){ res(false); } };
  r.onerror=()=>res(false); }catch(_){ res(false); } }); }
async function shareIn(req){
  let files=[];
  try{ const fd=await req.formData(); files=fd.getAll('photos').filter(f=>f&&typeof f!=='string'&&f.size&&(/^image\//.test(f.type)||/\.(heic|heif)$/i.test(f.name||''))).slice(0,9); }catch(_){}
  const ok=files.length?await idbPut('studio:shared',{files,at:Date.now()}):false;
  return Response.redirect(new URL('index.html?shared='+(ok?files.length:0),self.registration.scope).href,303);
}

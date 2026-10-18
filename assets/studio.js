/* Studio engine (brand-agnostic).
   A tool page calls Studio.tool({...}) with a draw(h, o) function.
   The engine builds the steps (photos, style, words), the live preview, free text layers
   (drag, tap to edit, resize, recolour, add your own text), photo dragging/zooming, and saving.
   Everything brand-specific (logo, fonts, colours, wording, example photos) comes from the active brand kit. */
(function(){
let W=1080,H=1920;      // story size; a tool can ask for another (cfg.size), e.g. 1080×1350 for a feed carousel
const MANY=8;          // word lists longer than this show a "More…" button
const EXPORT_SCALE=2;   // saved stories are 2160×3840 so they stay sharp when zoomed; Instagram scales them down cleanly
const PHOTO_MAX_PX=12e6; // a photo is kept at full quality up to 12 megapixels (every iPhone/Android main camera photo);
                         // bigger ones (48/50/200 MP modes) are shrunk once, carefully, so phones never run out of memory
const PIN=new Path2D("M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88Zm0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32Z");
const ROOT=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/studio\.js.*$/,''):'../';
const BRANDS={};
/* installable app: the service worker caches the app shell (never Supabase calls) */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)) window.addEventListener('load',()=>{ navigator.serviceWorker.register(ROOT+'sw.js').catch(()=>{}); });
let installEvt=null; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; document.dispatchEvent(new Event('studio:installable')); });
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let BRAND=null, LOGO=null, LOGO_LIGHT=null;

/* ---------- small utilities ---------- */
function load(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
async function loadFile(file){
  let src;
  try{ src=await createImageBitmap(file,{imageOrientation:'from-image'}); }catch(_){ src=await load(URL.createObjectURL(file)); }
  const px=src.width*src.height;
  if(px<=PHOTO_MAX_PX) return src;                       // normal photos: untouched, full quality
  const k=Math.sqrt(PHOTO_MAX_PX/px), tw=Math.floor(src.width*k), th=Math.floor(src.height*k);
  const out=stepDown(src,tw,th);                         // huge photos: one careful high-quality shrink
  if(src.close) src.close();
  return out;
}
/* High-quality shrink: halve step by step, then one final resize. Avoids the jagged/blurry result of a single big jump. */
function stepDown(im,tw,th){
  let cur=im, cw=im.width, ch=im.height;
  while(cw/2>=tw&&ch/2>=th){ const c=document.createElement('canvas'); c.width=Math.round(cw/2); c.height=Math.round(ch/2); const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(cur,0,0,c.width,c.height); if(cur!==im) cur.width=cur.height=0; cur=c; cw=c.width; ch=c.height; }
  const out=document.createElement('canvas'); out.width=tw; out.height=th; const o=out.getContext('2d'); o.imageSmoothingEnabled=true; o.imageSmoothingQuality='high'; o.drawImage(cur,0,0,tw,th);
  if(cur!==im) cur.width=cur.height=0;
  return out;
}
function rr(ctx,x,y,w,h,r){r=typeof r==='number'?[r,r,r,r]:(r||[0,0,0,0]);const [a,b,c,d]=r.map(v=>Math.max(0,Math.min(v,w/2,h/2)));ctx.moveTo(x+a,y);ctx.lineTo(x+w-b,y);ctx.quadraticCurveTo(x+w,y,x+w,y+b);ctx.lineTo(x+w,y+h-c);ctx.quadraticCurveTo(x+w,y+h,x+w-c,y+h);ctx.lineTo(x+d,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-d);ctx.lineTo(x,y+a);ctx.quadraticCurveTo(x,y,x+a,y);ctx.closePath();}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function store(k,v){try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,JSON.stringify(v)); }catch(_){ return null; }}

/* ---------- tools (for the hub and for opening saved designs) ---------- */
const TOOLS={
  'new-place':{title:'New place',blurb:'A new sale point: photo, place name, pin.'},
  'photo-story':{title:'Photo story',blurb:'A tall photo, full screen, headline and logo.'},
  'cinematic':{title:'Cinematic bars',blurb:'A wide photo shown whole, text on black bars.'},
  'collage':{title:'Collage',blurb:'2, 3 or 4 whole photos in different layouts.'},
  'split':{title:'Two-photo split',blurb:'Close-up on top, wide below, words on the cut.'},
  'restock':{title:'Restock',blurb:'Back in stock: the cans, the flavours, a button.',tag:'New'},
  'offer':{title:'Offer',blurb:'Discount tiles, dates, a product photo and a button.',tag:'New'}
};
const toolPage=id=>ROOT+'tools/'+id+'.html';

/* ---------- fonts: the brand's fonts first (used by default), then a hand-picked list ---------- */
const MORE_FONTS=[
  {family:'Tajawal',wt:'800',w:'500;800'},{family:'Almarai',wt:'800',w:'400;800'},{family:'Changa',wt:'800',w:'500;800'},
  {family:'El Messiri',wt:'700',w:'600;700'},{family:'Reem Kufi',wt:'700',w:'500;700'},{family:'Noto Kufi Arabic',wt:'800',w:'600;800'},
  {family:'Readex Pro',wt:'700',w:'500;700'},{family:'Marhey',wt:'700',w:'500;700'},{family:'Lemonada',wt:'700',w:'500;700'},{family:'Amiri',wt:'700',w:'400;700'}
];
function brandFonts(){ const f=BRAND.fonts; return f.choices||[{family:f.display,wt:''},{family:f.body,wt:'800'}]; }
function fontInfo(fam){ return brandFonts().find(x=>x.family===fam)||MORE_FONTS.find(x=>x.family===fam)||null; }
const FONT_READY=new Set();
async function ensureFont(fam){
  if(!fam||FONT_READY.has(fam)) return; const f=MORE_FONTS.find(x=>x.family===fam);
  if(f&&!document.querySelector(`link[data-font="${fam}"]`)){ const l=document.createElement('link'); l.rel='stylesheet'; l.dataset.font=fam; l.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(fam).replace(/%20/g,'+')+':wght@'+f.w+'&display=swap'; document.head.appendChild(l); }
  const info=fontInfo(fam)||{wt:''}, sample=BRAND&&BRAND.lang==='ar'?'نص عربي':'Text';
  try{ await Promise.race([document.fonts.load((info.wt?info.wt+' ':'')+'64px "'+fam+'"',sample),new Promise(r=>setTimeout(r,5000))]); }catch(_){}
  FONT_READY.add(fam);
}

/* ---------- icons (inline SVG, follow the text colour) ---------- */
const svg=(d,w)=>`<svg width="${w||22}" height="${w||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON={
  undo:svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo:svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  photo:svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  text:svg('<path d="M4 7V5h16v2"/><path d="M9 19h6"/><path d="M12 5v14"/>'),
  style:svg('<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6c0-4.9-4.5-8.6-10-8.6z"/>'),
  layers:svg('<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>'),
  download:svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
  share:svg('<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  bookmark:svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',20),
  check:svg('<path d="M20 6 9 17l-5-5"/>',26),
  plus:svg('<path d="M12 5v14M5 12h14"/>'),
  shapes:svg('<circle cx="7.5" cy="7.5" r="4.5"/><rect x="12" y="12" width="9" height="9" rx="2"/>',20),
  back:svg('<path d="m15 18-6-6 6-6"/>'),
  next:svg('<path d="m9 18 6-6-6-6"/>'),
  trash:svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>',20)
};

/* ---------- assets: brand files (logo, can cut-outs, stickers) from the brand kit + built-in shapes ----------
   Shapes are drawn in a 200×200 box (or the size given) so they stay sharp at any size and take any brand colour. */
const SHAPES=[
  {id:'shape:circle',label:'Circle',w:200,h:200,draw(c){ c.beginPath(); c.arc(100,100,100,0,Math.PI*2); c.fill(); }},
  {id:'shape:blob',label:'Soft box',w:240,h:200,draw(c){ c.beginPath(); rr(c,0,0,240,200,70); c.fill(); }},
  {id:'shape:badge',label:'Badge',w:200,h:200,draw(c){ c.beginPath(); for(let i=0;i<32;i++){ const a=i/32*Math.PI*2-Math.PI/2, r=i%2?86:100; c.lineTo(100+Math.cos(a)*r,100+Math.sin(a)*r); } c.closePath(); c.fill(); }},
  {id:'shape:ring',label:'Ring',w:200,h:200,draw(c){ c.beginPath(); c.arc(100,100,100,0,Math.PI*2); c.arc(100,100,84,0,Math.PI*2,true); c.fill(); }},
  {id:'shape:arrow',label:'Arrow',w:240,h:120,draw(c){ c.beginPath(); c.moveTo(0,46); c.lineTo(160,46); c.lineTo(160,8); c.lineTo(240,60); c.lineTo(160,112); c.lineTo(160,74); c.lineTo(0,74); c.closePath(); c.fill(); }},
  {id:'shape:underline',label:'Underline',w:300,h:40,draw(c){ c.beginPath(); c.moveTo(6,30); c.quadraticCurveTo(150,-6,294,24); c.lineWidth=14; c.lineCap='round'; c.strokeStyle=c.fillStyle; c.stroke(); }},
  {id:'shape:sparkle',label:'Sparkle',w:200,h:200,draw(c){ c.beginPath(); c.moveTo(100,0); c.quadraticCurveTo(112,88,200,100); c.quadraticCurveTo(112,112,100,200); c.quadraticCurveTo(88,112,0,100); c.quadraticCurveTo(88,88,100,0); c.fill(); }},
  {id:'shape:line',label:'Line',w:300,h:12,draw(c){ c.beginPath(); rr(c,0,0,300,12,6); c.fill(); }}
];
const ASSET_IMG=new Map();   // ref -> {img} | {missing:true} | Promise
function brandAssets(){ return (BRAND&&BRAND.assets)||[]; }
function assetDef(ref){ return SHAPES.find(x=>x.id===ref)||brandAssets().find(x=>x.id===ref)||null; }
function assetUrl(a){ return BRAND.base+a.file; }
function loadAsset(ref){
  const hit=ASSET_IMG.get(ref); if(hit) return hit.then?hit:Promise.resolve(hit);
  const a=assetDef(ref); if(!a||!a.file){ return Promise.resolve(null); }
  const p=load(assetUrl(a)).then(img=>{ const v={img}; ASSET_IMG.set(ref,v); return v; }).catch(()=>{ const v={missing:true}; ASSET_IMG.set(ref,v); return v; });
  ASSET_IMG.set(ref,p); return p;
}
const TINTS=new Map();
function tinted(img,color){ const key=color; let m=TINTS.get(img); if(!m){ m={}; TINTS.set(img,m); } if(m[key]) return m[key];
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const x=c.getContext('2d'); x.drawImage(img,0,0); x.globalCompositeOperation='source-in'; x.fillStyle=color; x.fillRect(0,0,c.width,c.height); return m[key]=c; }

/* ---------- small IndexedDB store for draft photos (they're too big for localStorage) ---------- */
const idb={
  db:null,
  open(){ if(this.db) return this.db; this.db=new Promise((res,rej)=>{ const r=indexedDB.open('studio',1); r.onupgradeneeded=()=>r.result.createObjectStore('files'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); return this.db; },
  async tx(mode,fn){ try{ const db=await this.open(); return await new Promise((res,rej)=>{ const t=db.transaction('files',mode), s=t.objectStore('files'); const q=fn(s); t.oncomplete=()=>res(q&&q.result); t.onerror=()=>rej(t.error); }); }catch(_){ return null; } },
  get(k){ return this.tx('readonly',s=>s.get(k)); }, put(k,v){ return this.tx('readwrite',s=>s.put(v,k)); }, del(k){ return this.tx('readwrite',s=>s.delete(k)); }
};

/* ---------- cloud (team saved designs) ---------- */
async function cloud(){
  if(!window.STUDIO_CONFIG) await loadScript(ROOT+'assets/config.js');
  if(!window.StudioCloud) await loadScript(ROOT+'assets/cloud.js');
  return window.StudioCloud;
}
/* One sign-in dialog for every page. Resolves true once the person is signed in AND on the team. */
function dialog(html,cls){ const d=document.createElement('dialog'); d.className='dlg '+(cls||''); d.innerHTML=html; document.body.appendChild(d); d.addEventListener('close',()=>setTimeout(()=>d.remove(),50)); d.showModal(); return d; }
async function ensureMember(reason){
  const C=await cloud();
  if(await C.session()){ if(await C.isMember()) return true; }
  /* one shared team login: only the team password is asked, once per phone; it then stays signed in */
  return new Promise(resolve=>{
    const d=dialog(`<form method="dialog" class="dlg-body" action="#">
      <h3>Team sign in</h3><p class="small">${esc(reason||'Saved designs are shared with the team.')}</p>
      <input type="email" name="username" autocomplete="username" value="${esc(C.teamEmail||'')}" hidden readonly>
      <div class="field"><label class="lbl" for="siPass">Team password</label>
        <div class="inline"><input type="password" id="siPass" name="password" autocomplete="current-password" required><button type="button" class="mini" id="siShow" aria-pressed="false">Show</button></div></div>
      <span class="small">You stay signed in on this phone. Tip: add Studio to your home screen so it never forgets.</span>
      <div class="status" id="siStatus" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="siCancel">Not now</button><button type="submit" class="btn" id="siGo">Sign in</button></div>
    </form>`);
    const $=id=>d.querySelector('#'+id);
    $('siCancel').onclick=()=>{ d.close(); resolve(false); };
    $('siShow').onclick=()=>{ const p=$('siPass'), on=p.type==='password'; p.type=on?'text':'password'; $('siShow').textContent=on?'Hide':'Show'; $('siShow').setAttribute('aria-pressed',String(on)); };
    d.addEventListener('cancel',()=>resolve(false));
    d.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); $('siGo').disabled=true; $('siStatus').textContent='Checking…';
      try{ await C.signInTeam($('siPass').value);
        if(await C.isMember()){ d.close(); resolve(true); } else { $('siStatus').textContent='This login is not on the team list.'; await C.signOut(); }
      }catch(err){ $('siStatus').textContent=err.message; }
      $('siGo').disabled=false;
    });
    setTimeout(()=>$('siPass').focus(),50);
  });
}
async function canvasBlob(c,type,q){ return await new Promise(r=>c.toBlob(r,type,q)); }

/* ---------- brands ---------- */
function registerBrand(b){ BRANDS[b.id]=b; }
function brandId(){ const list=Studio.brandList||[]; const saved=store('studio:brand'); return list.includes(saved)?saved:(list[0]||null); }
async function useBrand(id){
  id=id||brandId(); if(!BRANDS[id]) await loadScript(ROOT+'brands/'+id+'/brand.js');
  BRAND=BRANDS[id]; BRAND.base=ROOT+'brands/'+id+'/';
  if(BRAND.fonts&&BRAND.fonts.google&&!document.querySelector('link[data-brand-fonts]')){
    const l=document.createElement('link'); l.rel='stylesheet'; l.dataset.brandFonts='1'; l.href='https://fonts.googleapis.com/css2?'+BRAND.fonts.google+'&display=swap'; document.head.appendChild(l);
  }
  document.documentElement.style.setProperty('--display','"'+BRAND.fonts.display+'",system-ui,sans-serif');
  document.documentElement.style.setProperty('--sans','"'+BRAND.fonts.body+'",system-ui,sans-serif');
  document.querySelectorAll('[data-brand-logo]').forEach(i=>{i.src=BRAND.base+BRAND.logo;i.alt=BRAND.name;});
  document.querySelectorAll('[data-brand-name]').forEach(e=>{e.textContent=BRAND.name;});
  const ic=document.querySelector('link[rel=icon]'); if(ic&&BRAND.icon) ic.href=BRAND.base+BRAND.icon;
  LOGO=await load(BRAND.base+BRAND.logo);
  const c=document.createElement('canvas'); c.width=LOGO.width; c.height=LOGO.height; const x=c.getContext('2d');
  x.drawImage(LOGO,0,0); x.globalCompositeOperation='source-in'; x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); LOGO_LIGHT=c;
  const D=BRAND.fonts.display, B=BRAND.fonts.body, sample=BRAND.lang==='ar'?'نص عربي':'Sample';
  try{ await Promise.race([Promise.all([document.fonts.load('120px "'+D+'"',sample),document.fonts.load('800 40px "'+B+'"',sample),document.fonts.load('600 40px "'+B+'"',sample)]),new Promise(r=>setTimeout(r,4000))]); }catch(_){}
  return BRAND;
}

/* Halve a big photo step by step down to the size it is drawn at, so saved stories stay sharp. */
/* Only used while saving; emptied right after so phones get their memory back. */
let SHARP=new Map();
function sharp(im,tw,th){
  tw=Math.round(tw); th=Math.round(th);
  if(im.width<=tw*1.02||im.height<=th*1.02) return im;   // never enlarge: the photo is drawn from its own pixels
  const key=tw+'x'+th; let cache=SHARP.get(im); if(!cache){cache={};SHARP.set(im,cache);} if(cache[key]) return cache[key];
  return cache[key]=stepDown(im,tw,th);
}
function freeSharp(){ SHARP.forEach(c=>Object.values(c).forEach(cv=>{cv.width=cv.height=0;})); SHARP=new Map(); }

/* ---------- drawing helpers handed to each tool ----------
   Every text, button, place line and logo is a LAYER with an id. The tool says where it goes by default;
   the person can then drag it, resize it, recolour it or hide it, and the change is kept as an offset. */
let onAssetLoad=null;
function makeHelpers(ctx,S,preview,reg,scale,off){
  off=off||0;   // first photo of the current page (carousels)
  const B=BRAND, C=B.colors, dir=B.dir||'ltr';
  const L=id=>S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false});
  function fitSize(text,size,weight,family,maxW){ let s=size; for(;;){ ctx.font=(weight?weight+' ':'')+s+'px "'+family+'"'; if(ctx.measureText(text).width<=maxW||s<=24) return s; s-=2; } }
  function box(m,size){ return {a:m.actualBoundingBoxAscent||size*.75, d:m.actualBoundingBoxDescent||size*.25}; }
  /* place a layer: compute its default box, apply the person's offset/scale, draw it, remember it for picking */
  function layer(id,label,bx,draw,opt){
    const l=L(id); const cx=bx.x+bx.w/2+l.dx, cy=bx.y+bx.h/2+l.dy, k=l.k;
    if(l.hidden){ reg.push({id,label,hidden:true,...opt}); return; }
    ctx.save(); ctx.translate(cx,cy); ctx.scale(k,k); ctx.translate(-bx.w/2,-bx.h/2); draw(l.color); ctx.restore();
    reg.push({id,label,x:cx-bx.w*k/2,y:cy-bx.h*k/2,w:bx.w*k,h:bx.h*k,...opt});
  }
  const h={W,H,ctx,rr,brand:B,C,dir,
    phrase(key){ return (B.phrases&&B.phrases[key])||''; },
    photoAspect(i){const p=S.photos[off+i];return p&&p.img?p.img.width/p.img.height:1.5;},
    photo(i,x,y,w,hh,opt){
      opt=opt||{}; const p=S.photos[off+i];
      ctx.save(); ctx.beginPath(); rr(ctx,x,y,w,hh,opt.r||0); ctx.clip();
      if(p&&p.img){
        const im=p.img, mode=opt.mode||'cover';
        const base=mode==='contain'?Math.min(w/im.width,hh/im.height):Math.max(w/im.width,hh/im.height);
        const sc=base*(mode==='contain'?1:p.zoom), dw=im.width*sc, dh=im.height*sc;
        const mx=Math.max(0,(dw-w)/2), my=Math.max(0,(dh-hh)/2);
        p.ox=Math.max(-mx,Math.min(mx,p.ox)); p.oy=Math.max(-my,Math.min(my,p.oy));
        ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
        ctx.drawImage(preview?im:sharp(im,dw*scale,dh*scale),x+w/2+p.ox-dw/2,y+hh/2+p.oy-dh/2,dw,dh);
      } else if(preview){
        ctx.fillStyle='#d8d6d1'; ctx.fillRect(x,y,w,hh); ctx.fillStyle='#8b8882'; ctx.font='800 '+Math.max(28,Math.min(56,w/8))+'px "'+B.fonts.body+'"'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('+',x+w/2,y+hh/2);
      }
      ctx.restore();
      reg.push({photo:off+i,x,y,w,h:hh,mode:opt.mode||'cover'});
    },
    logoH(w){return w*LOGO.height/LOGO.width;},
    /* logo layer; tone 'dark' or 'light' */
    logo(x,y,w,tone,id){
      id=id||'logo'; const hh=h.logoH(w);
      layer(id,'Logo',{x,y,w,h:hh},color=>{ const t=color?(color==='light'?'light':'dark'):tone; ctx.drawImage(t==='light'?LOGO_LIGHT:LOGO,0,0,w,hh); },{kind:'logo'});
      return L(id).hidden?0:hh;
    },
    measure(str,o){o=o||{}; const fam=o.font==='display'?B.fonts.display:B.fonts.body; const size=fitSize(str,o.size||40,o.weight||'',fam,o.maxW||936); const m=ctx.measureText(str), b=box(m,size); return {w:m.width,h:b.a+b.d,size};},
    /* text layer; align 'center' | 'start' | 'end' relative to x (start = right side in Arabic) */
    text(id,label,str,x,y,o){
      o=o||{}; if(!str) { reg.push({id,label,empty:true}); return 0; }
      const ff=L(id).font&&fontInfo(L(id).font);
      const fam=ff?ff.family:(o.font==='display'?B.fonts.display:B.fonts.body), wt=ff?ff.wt:(o.weight||'');
      const size=fitSize(str,o.size||40,wt,fam,o.maxW||936), m=ctx.measureText(str), b=box(m,size), tw=Math.ceil(m.width), th=Math.ceil(b.a+b.d);
      const al=o.align||'center'; const rightish=(al==='start'&&dir==='rtl')||(al==='end'&&dir!=='rtl');
      const bx=al==='center'?x-tw/2:(rightish?x-tw:x);
      layer(id,label,{x:bx,y,w:tw,h:th},color=>{
        ctx.font=(wt?wt+' ':'')+size+'px "'+fam+'"'; ctx.direction=dir; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.fillStyle=color||o.color||C.ink;
        if(o.shadow){ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=24;ctx.shadowOffsetY=2;}
        ctx.fillText(str,0,b.a);
      },{kind:'text'});
      return L(id).hidden?0:th;
    },
    /* rounded button layer */
    pill(id,label,str,cx,y,o){
      o=o||{}; if(!str){ reg.push({id,label,empty:true}); return 0; }
      const ff=L(id).font&&fontInfo(L(id).font), pf=ff?((ff.wt?ff.wt+' ':'')+(o.size||36)+'px "'+ff.family+'"'):('800 '+(o.size||36)+'px "'+B.fonts.body+'"');
      ctx.font=pf; const m=ctx.measureText(str), ph=o.h||76, pw=Math.ceil(m.width)+(o.pad||88), b=box(m,o.size||36);
      layer(id,label,{x:cx-pw/2,y,w:pw,h:ph},color=>{
        const bg=color||o.bg||C.ink; ctx.fillStyle=bg; ctx.beginPath(); rr(ctx,0,0,pw,ph,ph/2); ctx.fill();
        ctx.font=pf; ctx.direction=dir; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillStyle=color?(isLight(color)?C.ink:C.paper):(o.fg||C.paper); ctx.fillText(str,pw/2,ph/2+(b.a-b.d)/2);
      },{kind:'pill'});
      return L(id).hidden?0:ph;
    },
    /* place name with a map pin centred on the letters */
    pin(id,label,str,cx,y,o){
      o=o||{}; if(!str){ reg.push({id,label,empty:true}); return 0; }
      const ff=L(id).font&&fontInfo(L(id).font), fam=ff?ff.family:B.fonts.body, pw8=ff?ff.wt:'800';
      const fs=fitSize(str,o.size||44,pw8,fam,o.maxW||860), m=ctx.measureText(str), b=box(m,fs);
      const pinH=Math.round(fs*.9), kk=pinH/224, pinW=176*kk, gap=14, tw=Math.ceil(m.width), tot=tw+gap+pinW, th=Math.ceil(b.a+b.d);
      layer(id,label,{x:cx-tot/2,y,w:tot,h:th},color=>{
        ctx.font=(pw8?pw8+' ':'')+fs+'px "'+fam+'"'; ctx.direction=dir; ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle=color||o.color||C.muted;
        const textX=dir==='rtl'?0:pinW+gap, pinX=dir==='rtl'?tw+gap:0;
        ctx.fillText(str,textX,b.a);
        const mid=b.a-(b.a-b.d)/2; ctx.translate(pinX-40*kk,mid-pinH/2-16*kk); ctx.scale(kk,kk); ctx.fill(PIN);
      },{kind:'text'});
      return L(id).hidden?0:th;
    },
    /* an asset layer (brand file or shape) placed by its centre */
    asset(x){
      const a=assetDef(x.ref); if(!a){ reg.push({id:x.id,label:'Asset',empty:true}); return; }
      if(a.file){
        const got=ASSET_IMG.get(x.ref);
        if(!got||got.then){ loadAsset(x.ref).then(()=>{ if(preview&&onAssetLoad) onAssetLoad(); }); reg.push({id:x.id,label:a.label,empty:true}); return; }
        if(got.missing){ reg.push({id:x.id,label:a.label,empty:true}); return; }
        const im=got.img, hh=x.w*im.height/im.width;
        layer(x.id,a.label,{x:x.x-x.w/2,y:x.y-hh/2,w:x.w,h:hh},color=>{
          const k=L(x.id).k; let src=im; const c=color||x.color;
          if(a.tint&&c) src=tinted(im,c);
          ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
          ctx.drawImage(preview?src:sharp(src,x.w*k*scale,hh*k*scale),0,0,x.w,hh);
        },{kind:'asset'});
      } else {
        const sw=x.w, sh=x.w*a.h/a.w;
        layer(x.id,a.label,{x:x.x-sw/2,y:x.y-sh/2,w:sw,h:sh},color=>{ ctx.scale(sw/a.w,sh/a.h); ctx.fillStyle=color||x.color||C.ink; a.draw(ctx); },{kind:'asset'});
      }
    },
    /* numbers in the brand's digits (Arabic brands write ٢٠٪, not 20%) */
    digits(str){ str=String(str??''); if(B.digits!=='arabic') return str; return str.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]).replace(/%/g,'٪').replace(/,/g,'،'); },
    /* a row of small pills (e.g. flavours) as one layer; items: [{text,bg,fg,line}] */
    tags(id,label,items,cx,y,o){
      o=o||{}; items=(items||[]).filter(t=>t&&t.text); if(!items.length){ reg.push({id,label,empty:true}); return 0; }
      const size=o.size||34, ph=o.h||70, pad=o.pad||56, gap=o.gap||18, font='800 '+size+'px "'+B.fonts.body+'"';
      ctx.font=font; const ws=items.map(t=>Math.ceil(ctx.measureText(t.text).width)+pad), tot=ws.reduce((a,b)=>a+b,0)+gap*(items.length-1), b0=box(ctx.measureText(items[0].text),size);
      layer(id,label,{x:cx-tot/2,y,w:tot,h:ph},color=>{
        let x=0; const order=dir==='rtl'?items.map((t,i)=>i).reverse():items.map((t,i)=>i);
        order.forEach(i=>{ const t=items[i], w=ws[i]; ctx.beginPath(); rr(ctx,x,0,w,ph,ph/2);
          if(t.line){ ctx.lineWidth=4; ctx.strokeStyle=color||t.line; ctx.stroke(); } else { ctx.fillStyle=t.bg||C.ink; ctx.fill(); }
          ctx.font=font; ctx.direction=dir; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillStyle=t.line?(color||t.fg||t.line):(t.fg||C.paper); ctx.fillText(t.text,x+w/2,ph/2+(b0.a-b0.d)/2); x+=w+gap; });
      },{kind:'text'});
      return L(id).hidden?0:ph;
    },
    /* a custom layer drawn by the tool: draw(ctx,color) works in a box from (0,0) to (w,h) */
    block(id,label,x,y,w,hh,draw,kind){ layer(id,label,{x,y,w,h:hh},color=>draw(ctx,color),{kind:kind||'text'}); return L(id).hidden?0:hh; },
    /* page dots for carousels: n dots, i = current */
    dots(n,i,cx,y,color,dim){ if(n<2) return; const r=9, g=26, tot=(n-1)*g; for(let k=0;k<n;k++){ const kk=dir==='rtl'?n-1-k:k; ctx.beginPath(); ctx.arc(cx-tot/2+kk*g,y,k===i?r:r*.72,0,Math.PI*2); ctx.fillStyle=k===i?color:dim; ctx.fill(); } },
    shade(y0,y1,a0,a1){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(0,0,0,'+a0+')');g.addColorStop(1,'rgba(0,0,0,'+a1+')');ctx.fillStyle=g;ctx.fillRect(0,Math.min(y0,y1),W,Math.abs(y1-y0));}
  };
  return h;
}
function isLight(hex){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return false; const n=parseInt(m[1],16); return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>150; }

/* ---------- the tool page ---------- */
async function tool(cfg){
  const app=document.getElementById('app');
  app.innerHTML='<p class="hint" style="width:100%">Loading…</p>';
  if(/access_token|refresh_token|error_description/.test(location.hash)) cloud().then(c=>c.client());   // finishing an email sign-in link
  const B=await useBrand();
  const opts=v=>typeof v==='function'?v(B):v;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const fields=(cfg.fields||[]).map(f=>({...f,options:opts(f.options),default:opts(f.default)}));
  if(cfg.size){ W=cfg.size.w; H=cfg.size.h; }
  const PG=cfg.pages||null;   // carousels: {min,max,start}
  const perPage=cfg.photos.max||cfg.photos.count||1, minPhotos=cfg.photos.min||cfg.photos.count||1;
  const nPhotos=PG?PG.max*perPage:perPage;
  /* state. A story is one page; a carousel has several. values / layers / extras always mean "the page you're on". */
  const S={style:cfg.styles?cfg.styles[0].id:null,count:cfg.photos.count||cfg.photos.min||1,active:0,photos:[],P:[],page:0,sel:null};
  ['values','layers','extras'].forEach(k=>Object.defineProperty(S,k,{get(){ return S.P[S.page][k]; },set(v){ S.P[S.page][k]=v; },enumerable:false}));
  for(let i=0;i<nPhotos;i++) S.photos.push({img:null,zoom:1,ox:0,oy:0,sample:true});
  const today=()=>new Date(), iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  function fieldDefault(f,pg){
    const d=f.pageDefault?f.pageDefault(pg):f.default;
    if(f.type==='chips') return {pick:d??f.options[0],own:''};
    if(f.type==='seg') return d??f.options[0].v;
    if(f.type==='toggle') return d!==false;
    if(f.type==='multi') return {picks:clone(d??f.options.map(o=>o.v)),own:''};
    if(f.type==='tiles') return clone(d||[{small:'',big:''}]);
    if(f.type==='dates'){ const t=today(); return {on:f.on!==false,from:iso(t),to:iso(new Date(t.getTime()+6*864e5))}; }
    return {text:d||'',on:f.on!==false};
  }
  function newPage(pg){ const v={}; fields.forEach(f=>{ v[f.id]=fieldDefault(f,pg); }); return {values:v,layers:{},extras:[]}; }
  S.P.push(newPage(0)); if(PG) for(let i=1;i<(PG.start||PG.min);i++) S.P.push(newPage(i));
  const KEY='studio:'+B.id+':'+cfg.id;
  const saved=store(KEY); if(saved){ if(saved.style&&cfg.styles&&cfg.styles.some(s=>s.id===saved.style))S.style=saved.style; if(saved.count&&!PG)S.count=Math.min(perPage,Math.max(minPhotos,saved.count)); if(!PG) Object.keys(saved.values||{}).forEach(k=>{ const f=fields.find(x=>x.id===k); if(f&&f.type!=='dates') S.values[k]=saved.values[k]; }); }
  const remember=()=>store(KEY,PG?{style:S.style}:{style:S.style,count:S.count,values:S.values});

  /* ---- page ----
     Phone: the preview fills the screen, one bottom bar (Photo, Words, Style, Layers, Save) opens bottom sheets over it.
     Desktop: the same sheets show as cards beside the preview. One DOM, the CSS decides. */
  const wordFields=fields.filter(f=>f.in!=='style'), styleFields=fields.filter(f=>f.in==='style');
  const hasStyle=!!(cfg.styles||styleFields.length), hasWords=!!wordFields.length;
  const sheetHead=(id,title,n,done)=>`<header class="sheet-head"><span class="grab" aria-hidden="true"></span><h2 id="h-${id}">${n?`<span class="num">${n}</span>`:''}${esc(title)}</h2>${done!==false?`<button type="button" class="done" data-close="${id}">Done</button>`:''}</header>`;
  let step=1;
  const nav=document.querySelector('nav.top');
  if(nav){ nav.classList.add('tool-top');
    nav.insertAdjacentHTML('beforeend',`<span class="ttl" aria-hidden="true">${esc(cfg.title)}</span><div class="top-actions"><button type="button" class="icon-btn" id="undo" aria-label="Undo" title="Undo" disabled>${ICON.undo}</button><button type="button" class="icon-btn" id="redo" aria-label="Redo" title="Redo" disabled>${ICON.redo}</button></div>`); }
  let html=`<h1 class="page-title">${esc(cfg.title)}</h1>
  <div class="stage" id="stage">
    <div class="banner" id="draftBar" hidden><span>You have an unfinished story here.</span><span class="banner-btns"><button type="button" class="mini" id="draftFresh">Start fresh</button><button type="button" class="mini solid" id="draftGo">Continue</button></span></div>
    <div class="phone" id="phone" style="--ar:${W}/${H};--arn:${(W/H).toFixed(4)}"><canvas class="view" id="view" width="${W}" height="${H}" tabindex="0" aria-label="Preview. Drag text or photos to move them; tap text to edit it."></canvas><div class="drop" id="drop" hidden>Drop the photo here</div></div>
    <button type="button" class="cta-photo" id="ctaPhoto" hidden>${ICON.plus}<span>Add your photo</span></button>
    <div class="pager" id="pager" hidden></div>
    <div class="hint" id="hint">${esc(cfg.sampleNote||'Example photos. Add yours in Photo.')}</div>
    <section class="sheet insp" id="sh-insp" data-sheet="insp" aria-labelledby="inspName">
      <header class="sheet-head"><span class="grab" aria-hidden="true"></span><h2 id="inspName">Text</h2><button type="button" class="done" id="inspClose">Done</button></header>
      <div class="sheet-body">
      <input type="text" id="inspText" dir="${B.dir||'ltr'}" aria-label="Edit text" hidden>
      <div class="insp-row"><label class="lbl" for="inspSize">Size</label><input type="range" id="inspSize" min="0.4" max="2.5" step="0.01" value="1"></div>
      <div class="insp-row" id="inspFontRow"><label class="lbl" for="inspFont">Font</label><select id="inspFont" class="sel"></select></div>
      <div class="insp-row" id="inspColors" role="group" aria-label="Colour"></div>
      <div class="insp-row btns"><button type="button" class="mini" id="inspCenter">Centre</button><button type="button" class="mini" id="inspReset">Reset</button><button type="button" class="mini" id="inspHide">Hide</button><button type="button" class="mini danger" id="inspDelete" hidden>Delete</button></div>
      <div class="insp-row btns" id="inspOrder" hidden><button type="button" class="mini" id="inspBack">Send back</button><button type="button" class="mini" id="inspFwd">Bring forward</button></div>
      </div>
    </section>
    <section class="sheet" id="sh-assets" data-sheet="assets" aria-labelledby="h-assets">${sheetHead('assets','Add an asset')}<div class="sheet-body" id="assetList"></div></section>
  </div>
  <form class="panel" id="form" autocomplete="off">
  <div class="banner" id="designBar" hidden></div>
  <section class="sheet" id="sh-photo" data-sheet="photo" aria-labelledby="h-photo">${sheetHead('photo',nPhotos>1&&!cfg.pages?'Photos':'Photo',step++)}<div class="sheet-body">`;
  if(cfg.photos.min&&cfg.photos.max>cfg.photos.min){
    html+=`<span class="lbl">How many photos</span><div class="row" role="group" aria-label="How many photos">`;
    for(let k=cfg.photos.min;k<=cfg.photos.max;k++) html+=`<button type="button" class="seg" data-count="${k}" aria-pressed="false">${k}</button>`;
    html+=`</div>`;
  }
  html+=`<div class="slots" id="slots"></div><div class="small">Tap a box to add a photo${cfg.pages?' for this slide':''}. Drag a photo in the preview to move it; pinch or use the slider to zoom.</div>
  <div class="field" id="zoomRow" hidden><label class="lbl" for="zoom">Zoom</label><input type="range" id="zoom" min="1" max="3" step="0.01" value="1"><button type="button" class="link" id="fitBtn">Reset photo</button></div></div></section>`;
  if(hasStyle) html+=`<section class="sheet" id="sh-style" data-sheet="style" aria-labelledby="h-style">${sheetHead('style','Style',step++)}<div class="sheet-body">${cfg.styles?`<div class="row" role="group" aria-label="Style" id="styles">${cfg.styles.map(s=>`<button type="button" class="seg" data-style="${s.id}" aria-pressed="false">${s.swatch||''}${esc(s.label)}</button>`).join('')}</div>`:''}<div data-fields="style" class="field fields"></div></div></section>`;
  if(hasWords) html+=`<section class="sheet" id="sh-words" data-sheet="words" aria-labelledby="h-words">${sheetHead('words','Words',step++)}<div class="sheet-body"><div data-fields="words" class="field fields"></div><div class="small">Tip: tap any text in the preview to edit, move or resize it.</div></div></section>`;
  html+=`<section class="sheet" id="sh-layers" data-sheet="layers" aria-labelledby="h-layers">${sheetHead('layers','Layers')}<div class="sheet-body">
    <div class="row add-row"><button type="button" class="mini" id="addText">${ICON.text} Add text</button><button type="button" class="mini" id="addAsset" aria-controls="sh-assets">${ICON.shapes} Add asset</button></div>
    <span class="small">Top layer first. Tap one to edit it, or the eye to hide it.</span><ul id="layerList" class="layer-list" role="list"></ul>
    <button type="button" class="link" id="resetLayout">Reset layout</button></div></section>
  <section class="sheet save-sheet" id="sh-save" data-sheet="save" aria-labelledby="h-save">${sheetHead('save','Save')}<div class="sheet-body">
    <button type="button" class="btn" id="save">${ICON.download}<span>${cfg.pages?'Save slides':'Save story'}</span></button>
    <div class="progress" id="progress" hidden><div class="progress-bar" role="progressbar" aria-label="Saving" aria-valuemin="0" aria-valuemax="100" id="progressRole"><i id="progressBar"></i></div><span id="progressTxt">Making a full-quality copy…</span></div>
    <div class="done-box" id="doneBox" role="status" aria-live="polite" hidden><span class="done-ic" aria-hidden="true">${ICON.check}</span><div><b id="doneTitle">Saved!</b><span id="doneTxt"></span></div></div>
    <div class="result" id="result" hidden><img id="resultImg" alt="Your finished image"><button type="button" class="btn ghost" id="shareAgain" hidden>${ICON.share}<span>Save to Photos</span></button><span class="small" id="resultNote">Press and hold the image (or right-click) to save it.</span></div>
    <button type="button" class="btn ghost" id="saveDesign">${ICON.bookmark}<span id="saveDesignTxt">Save design to the team</span></button>
    <div class="status" id="status" role="status" aria-live="polite"></div>
    ${cfg.frameOnly?'<button type="button" class="link" id="saveFrame">Save the frame only (see-through PNG)</button>':''}
  </div></section>
  </form>
  <nav class="bar" id="bar" aria-label="Editor">
    <button type="button" class="tab" data-open="photo" aria-controls="sh-photo" aria-expanded="false">${ICON.photo}<span>Photo</span></button>
    ${hasWords?`<button type="button" class="tab" data-open="words" aria-controls="sh-words" aria-expanded="false">${ICON.text}<span>Words</span></button>`:''}
    ${hasStyle?`<button type="button" class="tab" data-open="style" aria-controls="sh-style" aria-expanded="false">${ICON.style}<span>${hasWords?'Style':'Layout'}</span></button>`:''}
    <button type="button" class="tab" data-open="layers" aria-controls="sh-layers" aria-expanded="false">${ICON.layers}<span>Layers</span></button>
    <button type="button" class="tab save" id="barSave">${ICON.download}<span>Save</span></button>
  </nav>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
  <input type="file" id="pick" accept="image/*" hidden aria-hidden="true" tabindex="-1">`;
  app.innerHTML=html; app.classList.add('tool'); document.body.classList.add('tool-page');
  const $=id=>document.getElementById(id);
  const view=$('view'), vctx=view.getContext('2d');

  /* ---- sheets + bottom bar (phone) / cards (desktop) ---- */
  const phoneUI=matchMedia('(max-width: 820px)');
  const isPhone=()=>phoneUI.matches;
  let openName=null;
  const sheetEl=n=>$('sh-'+n);
  function openSheet(n,opt){
    const el=sheetEl(n); if(!el) return;
    if(!isPhone()){   // desktop: cards are always there; bring this one into view
      if(n==='assets'||n==='insp') el.classList.add('active');
      if(!(opt&&opt.quiet)) el.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      return;
    }
    if(openName&&openName!==n) sheetEl(openName)?.classList.remove('open');
    openName=n; el.classList.add('open'); el.removeAttribute('inert'); document.body.classList.add('sheet-open');
    document.querySelectorAll('#bar [data-open]').forEach(b=>{ const on=b.dataset.open===n; b.setAttribute('aria-expanded',String(on)); b.classList.toggle('on',on); });
    fit();
  }
  /* move focus into a sheet opened from the bar (screen readers land on its title), and back to the bar on close */
  function focusSheet(n){ const h=sheetEl(n)?.querySelector('h2'); if(h){ h.setAttribute('tabindex','-1'); setTimeout(()=>h.focus({preventScroll:true}),60); } }
  function closeSheet(n){
    if(!isPhone()){ if(n==='assets'||n==='insp') sheetEl(n)?.classList.remove('active'); return; }
    if(n&&n!==openName) return; if(!openName) return;
    const el=sheetEl(openName); el.classList.remove('open'); el.setAttribute('inert',''); el.style.transform='';
    if(openName==='insp'&&S.sel){ S.sel=null; render(); }
    const was=openName; openName=null; document.body.classList.remove('sheet-open');
    if(el.contains(document.activeElement)){ const tab=document.querySelector(`#bar [data-open="${was}"]`); if(tab) tab.focus({preventScroll:true}); else view.focus({preventScroll:true}); }
    document.querySelectorAll('#bar [data-open]').forEach(b=>{ b.setAttribute('aria-expanded','false'); b.classList.remove('on'); });
    fit();
  }
  function syncSheetMode(){
    document.querySelectorAll('.sheet').forEach(el=>{ if(isPhone()&&!el.classList.contains('open')) el.setAttribute('inert',''); else el.removeAttribute('inert'); });
    if(!isPhone()){ openName=null; document.body.classList.remove('sheet-open'); document.querySelectorAll('.sheet.open').forEach(el=>el.classList.remove('open')); }
    fit();
  }
  phoneUI.addEventListener('change',syncSheetMode);
  $('bar').addEventListener('click',e=>{
    const t=e.target.closest('[data-open]'); if(t){ const n=t.dataset.open; if(openName===n) closeSheet(); else { if(S.sel&&n!=='insp'){ S.sel=null; render(); } openSheet(n); focusSheet(n); } return; }
    if(e.target.closest('#barSave')) saveTapped();
  });
  document.addEventListener('click',e=>{ const c=e.target.closest('[data-close]'); if(c) closeSheet(c.dataset.close); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&openName&&!document.querySelector('dialog[open]')) closeSheet(); });
  /* swipe a sheet down by its header to close it */
  document.querySelectorAll('.sheet-head').forEach(hd=>{
    let y0=null, el=null, dy=0;
    hd.addEventListener('pointerdown',e=>{ if(!isPhone()||e.target.closest('button')) return; el=hd.closest('.sheet'); y0=e.clientY; dy=0; el.classList.add('dragging'); hd.setPointerCapture(e.pointerId); });
    hd.addEventListener('pointermove',e=>{ if(y0==null) return; dy=Math.max(0,e.clientY-y0); el.style.transform=`translateY(${dy}px)`; });
    const end=()=>{ if(y0==null) return; el.classList.remove('dragging'); el.style.transform=''; if(dy>70) closeSheet(); y0=null; };
    hd.addEventListener('pointerup',end); hd.addEventListener('pointercancel',end);
  });
  /* fit the preview into the space left between the top bar and the open sheet (or the bottom bar) */
  function fit(){
    const ph=$('phone'), stage=$('stage');
    if(!isPhone()){ ph.style.width=ph.style.height=''; stage.style.removeProperty('--stage-bottom'); return; }
    const bar=$('bar').getBoundingClientRect(), kb=+(document.documentElement.style.getPropertyValue('--kb').replace('px','')||0);
    let bottom=kb>0?innerHeight-kb:bar.top;
    if(openName){ const el=sheetEl(openName); bottom=Math.min(bottom,bottom-el.offsetHeight); }
    const top=(document.querySelector('nav.top')?.getBoundingClientRect().bottom||0);
    const pager=($('pager').hidden?0:$('pager').offsetHeight+6)+(($('ctaPhoto').hidden||openName)?0:$('ctaPhoto').offsetHeight+6);
    stage.style.setProperty('--stage-top',top+'px'); stage.style.setProperty('--stage-bottom',Math.max(0,innerHeight-bottom)+'px');
    const availH=Math.max(120,bottom-top-16-pager), availW=innerWidth-24;
    let h=availH, w=h*W/H; if(w>availW){ w=availW; h=w*H/W; }
    ph.style.width=Math.floor(w)+'px'; ph.style.height=Math.floor(h)+'px';
  }
  addEventListener('resize',()=>fit());
  if(window.ResizeObserver){ const ro=new ResizeObserver(()=>{ if(openName) fit(); }); document.querySelectorAll('.sheet').forEach(el=>ro.observe(el)); }
  /* the on-screen keyboard: keep the open sheet just above it */
  if(window.visualViewport){ const vv=window.visualViewport; const onVV=()=>{ const kb=Math.max(0,Math.round(innerHeight-vv.height-vv.offsetTop)); document.documentElement.style.setProperty('--kb',(kb>80?kb:0)+'px'); document.body.classList.toggle('kb-open',kb>80); fit(); }; vv.addEventListener('resize',onVV); vv.addEventListener('scroll',onVV); }
  let toastT=0;
  function toast(t,ms){ const el=$('toast'); if(!t){ el.hidden=true; return; } el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },ms||3800); }

  /* ---- words ---- */
  const fieldBoxes=[...document.querySelectorAll('[data-fields]')];
  fieldBoxes.forEach(box=>{
    const list=box.dataset.fields==='style'?styleFields:wordFields;
    box.innerHTML=list.map(f=>{
      let inner;
      if(f.type==='chips') inner=`<span class="lbl">${esc(f.label)}</span><div class="chips" role="group" aria-label="${esc(f.label)}" data-f="${f.id}">${f.options.map((o,i)=>`<button type="button" class="chip${i>=MANY?' extra':''}" data-v="${esc(o)}" aria-pressed="false" dir="${B.dir||'ltr'}">${esc(o)}</button>`).join('')}${f.options.length>MANY?'<button type="button" class="chip en" data-more="1" aria-expanded="false">More…</button>':''}<button type="button" class="chip en" data-own="1" aria-pressed="false">Write my own</button>${f.none?'<button type="button" class="chip en" data-none="1" aria-pressed="false">None</button>':''}</div><input type="text" dir="${B.dir||'ltr'}" data-ownfor="${f.id}" placeholder="${esc(B.phrases.write||'')}" aria-label="Your own ${esc(f.label)}" hidden>`;
      else if(f.type==='seg') inner=`<span class="lbl">${esc(f.label)}</span><div class="row" role="group" aria-label="${esc(f.label)}" data-seg="${f.id}">${f.options.map(o=>`<button type="button" class="seg" data-v="${o.v}" aria-pressed="false">${esc(o.l)}</button>`).join('')}</div>`;
      else if(f.type==='toggle') inner=`<label class="check"><input type="checkbox" data-toggle="${f.id}"> ${esc(f.label)}</label>`;
      else if(f.type==='multi') inner=`<span class="lbl">${esc(f.label)}</span><div class="chips" role="group" aria-label="${esc(f.label)}" data-mf="${f.id}">${f.options.map(o=>`<button type="button" class="chip" data-v="${esc(o.v)}" aria-pressed="false" dir="auto">${esc(o.l)}</button>`).join('')}</div>`;
      else if(f.type==='tiles') inner=`<span class="lbl">${esc(f.label)}</span><div class="tiles-ed" data-tiles="${f.id}"></div><button type="button" class="mini" data-addtile="${f.id}">${ICON.plus} ${esc(f.addLabel||'Add one')}</button>${f.hint?`<span class="small">${esc(f.hint)}</span>`:''}`;
      else if(f.type==='dates') inner=`<label class="check"><input type="checkbox" data-don="${f.id}"> ${esc(f.label)}</label><div class="row dates-ed"><label class="field"><span class="lbl">From</span><input type="date" data-date="${f.id}:from"></label><label class="field"><span class="lbl">To</span><input type="date" data-date="${f.id}:to"></label></div>`;
      else inner=(f.toggle?`<label class="check"><input type="checkbox" data-on="${f.id}"> ${esc(f.label)}</label>`:`<label class="lbl" for="t_${f.id}">${esc(f.label)}</label>`)+`<input type="text" dir="${B.dir||'ltr'}" id="t_${f.id}" data-text="${f.id}" placeholder="${esc(opts(f.placeholder)||'')}" ${f.toggle?`aria-label="${esc(f.label)}"`:''}>`;
      return `<div class="field" data-fw="${f.id}">${inner}</div>`;
    }).join('');
    box.addEventListener('click',e=>{
      const more=e.target.closest('[data-more]'); if(more){ const g=more.parentNode, open=g.classList.toggle('open'); more.setAttribute('aria-expanded',String(open)); more.textContent=open?'Less':'More…'; return; }
      const b=e.target.closest('.chip'); if(b){ const id=b.parentNode.dataset.f, v=S.values[id];
        if(b.dataset.own){ if(v.pick!=='__own'&&!v.own) v.own=value(id); v.pick='__own'; syncUI(); const inp=document.querySelector(`[data-ownfor="${id}"]`); inp.focus(); }
        else if(b.dataset.none) v.pick='__none'; else v.pick=b.dataset.v;
        if(S.layers[id]) S.layers[id].hidden=false;
        syncUI(); remember(); render(); return; }
      const s=e.target.closest('[data-seg] .seg'); if(s){ S.values[s.parentNode.dataset.seg]=s.dataset.v; syncUI(); remember(); render(); return; }
      const m=e.target.closest('[data-mf] .chip'); if(m){ const id=m.parentNode.dataset.mf, v=S.values[id], k=v.picks.indexOf(m.dataset.v); if(k>=0) v.picks.splice(k,1); else v.picks.push(m.dataset.v); if(S.layers[id]) S.layers[id].hidden=false; syncUI(); remember(); render(); return; }
      const at=e.target.closest('[data-addtile]'); if(at){ const f=fields.find(x=>x.id===at.dataset.addtile), v=S.values[f.id]; if(v.length<(f.max||3)){ v.push({small:'',big:''}); syncUI(); render(); const ins=document.querySelectorAll(`[data-tiles="${f.id}"] input`); if(ins.length) ins[ins.length-2].focus(); } return; }
      const rt=e.target.closest('[data-rmtile]'); if(rt){ const [id,i]=rt.dataset.rmtile.split(':'); S.values[id].splice(+i,1); syncUI(); render(); return; }
    });
    box.addEventListener('input',e=>{ const t=e.target;
      if(t.dataset.ownfor) S.values[t.dataset.ownfor].own=t.value; else if(t.dataset.text) S.values[t.dataset.text].text=t.value;
      else if(t.dataset.tile){ const [id,i,k]=t.dataset.tile.split(':'); S.values[id][+i][k]=t.value; }
      else if(t.dataset.date){ const [id,k]=t.dataset.date.split(':'); if(t.value) S.values[id][k]=t.value; }
      remember(); render(); syncInspector(); });
    box.addEventListener('change',e=>{ const t=e.target; if(t.dataset.on) S.values[t.dataset.on].on=t.checked; if(t.dataset.toggle) S.values[t.dataset.toggle]=t.checked; if(t.dataset.don) S.values[t.dataset.don].on=t.checked; syncUI(); remember(); render(); });
  });
  function value(id){
    const v=S.values[id]; const f=fields.find(x=>x.id===id); if(!f) return '';
    if(f.type==='chips'){ if(v.pick==='__none') return ''; return String(v.pick==='__own'?v.own:v.pick).trim(); }
    if(f.type==='seg'||f.type==='toggle') return v;
    if(f.type==='multi') return f.options.filter(o=>v.picks.includes(o.v)).map(o=>o.l);
    if(f.type==='tiles') return v.filter(t=>String(t.small||'').trim()||String(t.big||'').trim()).map(t=>({small:String(t.small||'').trim(),big:String(t.big||'').trim()}));
    if(f.type==='dates') return v.on?dateRange(v.from,v.to):'';
    if(f.toggle&&!v.on) return ''; return String(v.text||'').trim();
  }
  /* "10 – 15 October" in the brand's language (Arabic month names and digits for an Arabic brand) */
  function dateRange(a,b){
    try{ const loc=(B.locale||B.lang||'en'), A=new Date(a+'T12:00'), Z=new Date((b||a)+'T12:00'); if(isNaN(A)) return '';
      const day=d=>new Intl.DateTimeFormat(loc,{day:'numeric'}).format(d), mon=d=>new Intl.DateTimeFormat(loc,{month:'long'}).format(d);
      if(!b||a===b) return day(A)+' '+mon(A);
      return A.getMonth()===Z.getMonth()?day(A)+' – '+day(Z)+' '+mon(Z):day(A)+' '+mon(A)+' – '+day(Z)+' '+mon(Z);
    }catch(_){ return ''; } }
  const whenOk=f=>!f.when||((f.when.count==null||f.when.count===S.count)&&(!f.when.field||[].concat(f.when.is).includes(S.values[f.when.field])));
  function paintTiles(f){
    const box=document.querySelector(`[data-tiles="${f.id}"]`), v=S.values[f.id], sig=S.page+':'+v.length;
    if(box.dataset.sig!==sig){ box.dataset.sig=sig;
      box.innerHTML=v.map((t,i)=>`<div class="tile-row"><input type="text" dir="auto" data-tile="${f.id}:${i}:small" aria-label="${esc(f.smallLabel||'Top line')} ${i+1}" placeholder="${esc(f.smallLabel||'Top line')}"><input type="text" dir="auto" data-tile="${f.id}:${i}:big" class="big" aria-label="${esc(f.bigLabel||'Big line')} ${i+1}" placeholder="${esc(f.bigLabel||'Big line')}"><button type="button" class="mini icon" data-rmtile="${f.id}:${i}" aria-label="Remove ${i+1}" ${v.length<2?'disabled':''}>${ICON.trash}</button></div>`).join(''); }
    box.querySelectorAll('[data-tile]').forEach(inp=>{ const [,i,k]=inp.dataset.tile.split(':'); const val=v[+i][k]||''; if(inp.value!==val&&document.activeElement!==inp) inp.value=val; });
    const add=document.querySelector(`[data-addtile="${f.id}"]`); if(add) add.hidden=v.length>=(f.max||3);
  }
  /* set a word field's text from the inspector (switches a chips field to "Write my own") */
  function setValue(id,text){
    const f=fields.find(x=>x.id===id); if(!f) return; const v=S.values[id];
    if(f.type==='chips'){ v.pick='__own'; v.own=text; } else { v.text=text; if(f.toggle) v.on=true; }
    syncUI(); remember();
  }

  /* ---- style, photo count ---- */
  if(cfg.styles) $('styles').addEventListener('click',e=>{const b=e.target.closest('[data-style]');if(!b)return;S.style=b.dataset.style;S.photos.forEach(p=>{p.ox=0;p.oy=0;});syncUI();remember();render();});
  document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>{S.count=+b.dataset.count;S.active=Math.min(S.active,S.count-1);syncUI();remember();render();}));

  /* ---- photo slots ---- */
  function slotsUI(){
    let s='';
    const off=photoOffset();
    for(let j=0;j<S.count;j++){ const i=off+j, p=S.photos[i], real=p.img&&!p.sample;
      s+=`<label class="slot${real?' has':''}${i===S.active&&S.count>1?' active':''}" data-slot="${i}">${real?`<img alt="" src="${p.thumb}">`:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}<span>${real?'Change':(S.count>1?'Photo '+(j+1):'Add photo')}</span><input type="file" accept="image/*" data-file="${i}" aria-label="${real?'Change photo':'Add photo'}${S.count>1?' '+(j+1):''}"></label>`; }
    $('slots').innerHTML=s;
  }
  $('slots').addEventListener('change',e=>{const t=e.target; if(t.dataset.file!=null){ setPhoto(+t.dataset.file,t.files&&t.files[0]); t.value=''; }});
  $('slots').addEventListener('click',e=>{const l=e.target.closest('[data-slot]'); if(l){S.active=+l.dataset.slot; syncZoom();}});
  async function setPhoto(i,file){
    if(!file||!/^image\//.test(file.type)){ status('That is not a photo. Try a JPG or PNG.'); return; }
    try{
      const img=await loadFile(file);
      const tc=document.createElement('canvas'), tk=240/Math.max(img.width,img.height); tc.width=Math.round(img.width*tk); tc.height=Math.round(img.height*tk); tc.getContext('2d').drawImage(img,0,0,tc.width,tc.height);
      S.photos[i]={img,zoom:1,ox:0,oy:0,sample:false,thumb:tc.toDataURL('image/jpeg',.7),file,key:'p'+Date.now().toString(36)+i};
      S.active=i; $('result').hidden=true; status('');
      $('hint').textContent='Drag text or photos to move them. Tap text to edit it.';
      syncUI(); render();
    }catch(_){ status('That photo could not be opened. Try a JPG or PNG.'); }
  }
  /* one picker for the preview and the "Add your photo" button; several photos fill the empty boxes in order */
  let pickAt=0;
  function pickPhoto(i){ pickAt=i; const p=$('pick'); p.multiple=S.count>1; p.click(); }
  function slotTargets(i){ const off=photoOffset(), t=[i]; for(let j=0;j<S.count;j++){ const k=off+j, p=S.photos[k]; if(k!==i&&(!p.img||p.sample)) t.push(k); } return t; }
  $('pick').addEventListener('change',e=>{ const fs=[...(e.target.files||[])], t=slotTargets(pickAt); fs.slice(0,t.length).forEach((f,k)=>setPhoto(t[k],f)); e.target.value=''; });
  $('ctaPhoto').addEventListener('click',()=>pickPhoto(nextEmpty()));
  function syncCta(){ $('pick').multiple=S.count>1; const off=photoOffset(); let any=false; if(needsPhoto(S.page)) for(let i=0;i<S.count;i++){ const p=S.photos[off+i]; if(!p||!p.img||p.sample) any=true; } const was=$('ctaPhoto').hidden; $('ctaPhoto').hidden=!any; if(was!==!any) fit(); $('ctaPhoto').querySelector('span').textContent=S.count>1?'Add your photos':'Add your photo'; }
  function nextEmpty(){ const off=photoOffset(); for(let j=0;j<S.count;j++){ const p=S.photos[off+j]; if(p.sample||!p.img) return off+j; } return S.active; }
  document.addEventListener('paste',e=>{ if(e.target&&e.target.tagName==='INPUT') return; const it=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/')); if(it) setPhoto(nextEmpty(),it.getAsFile());});
  let dd=0;
  document.addEventListener('dragenter',e=>{if([...(e.dataTransfer?.types||[])].includes('Files')){dd++;$('drop').hidden=false;}});
  document.addEventListener('dragleave',()=>{dd=Math.max(0,dd-1);if(!dd)$('drop').hidden=true;});
  document.addEventListener('dragover',e=>e.preventDefault());
  document.addEventListener('drop',e=>{e.preventDefault();dd=0;$('drop').hidden=true;const fs=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));const t=slotTargets(nextEmpty());fs.slice(0,t.length).forEach((f,k)=>setPhoto(t[k],f));});

  /* ---- syncing the controls with the state ---- */
  function syncUI(){
    document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===S.style)));
    document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.count===S.count)));
    fields.forEach(f=>{
      const v=S.values[f.id]; const fw=document.querySelector(`[data-fw="${f.id}"]`); if(fw) fw.hidden=!whenOk(f);
      if(f.type==='chips'){
        document.querySelectorAll(`[data-f="${f.id}"] .chip`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.own?v.pick==='__own':b.dataset.none?v.pick==='__none':v.pick===b.dataset.v)));
        const inp=document.querySelector(`[data-ownfor="${f.id}"]`); inp.hidden=v.pick!=='__own'; if(inp.value!==v.own&&document.activeElement!==inp) inp.value=v.own;
      } else if(f.type==='seg') document.querySelectorAll(`[data-seg="${f.id}"] .seg`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
      else if(f.type==='toggle') document.querySelector(`[data-toggle="${f.id}"]`).checked=!!v;
      else if(f.type==='multi') document.querySelectorAll(`[data-mf="${f.id}"] .chip`).forEach(b=>b.setAttribute('aria-pressed',String(v.picks.includes(b.dataset.v))));
      else if(f.type==='tiles') paintTiles(f);
      else if(f.type==='dates'){ document.querySelector(`[data-don="${f.id}"]`).checked=v.on; document.querySelectorAll(`[data-date^="${f.id}:"]`).forEach(inp=>{ const k=inp.dataset.date.split(':')[1]; inp.value=v[k]; inp.disabled=!v.on; }); }
      else { const t=document.querySelector(`[data-text="${f.id}"]`); if(t.value!==v.text&&document.activeElement!==t) t.value=v.text; if(f.toggle){const c=document.querySelector(`[data-on="${f.id}"]`);c.checked=v.on;t.disabled=!v.on;} }
    });
    slotsUI(); syncZoom(); syncCta();
  }
  function syncZoom(){ const p=S.photos[S.active], real=p&&p.img&&!p.sample; $('zoomRow').hidden=!real||cfg.noZoom; if(p) $('zoom').value=p.zoom; document.querySelectorAll('.slot').forEach(l=>l.classList.toggle('active',+l.dataset.slot===S.active&&S.count>1)); }
  const status=(t,ms)=>{ $('status').textContent=t; if(isPhone()&&openName!=='save') toast(t,ms); else if(!t) toast(''); };

  /* ---- drawing ---- */
  let reg=[], raf=0;
  function drawExtras(h){
    S.extras.forEach(x=>{
      if(x.type==='asset') h.asset(x);
      else h.text(x.id,'Your text',x.text,W/2,x.y,{font:x.font,weight:x.font==='display'?'':'800',size:x.size,color:x.color,shadow:x.shadow});
    });
  }
  function draw(ctx,preview,scale){
    const r=[]; ctx.save(); if(scale) ctx.scale(scale,scale); ctx.clearRect(0,0,W,H);
    const h=makeHelpers(ctx,S,preview,r,scale||1,photoOffset());
    cfg.draw(h,{style:S.style,count:S.count,value,preview,page:S.page,pages:S.P.length}); drawExtras(h);
    if(preview&&S.sel){ const b=r.find(x=>x.id===S.sel&&!x.hidden&&!x.empty); if(b){ ctx.save(); ctx.lineWidth=4; ctx.setLineDash([16,10]); ctx.strokeStyle='#3d6bff'; ctx.strokeRect(b.x-12,b.y-12,b.w+24,b.h+24); ctx.restore(); } }
    if(preview&&dragging) drawGuides(ctx);
    ctx.restore(); if(preview){ reg=r; paintLayers(); }
  }
  /* ---- alignment guides: while dragging, the story's safe zones show and snap lines appear ---- */
  const SAFE=cfg.safe||(H===1920?{top:250,bottom:300}:null);
  function drawGuides(ctx){
    ctx.save();
    if(SAFE){ ctx.fillStyle='rgba(255,45,135,.10)'; ctx.fillRect(0,0,W,SAFE.top); ctx.fillRect(0,H-SAFE.bottom,W,SAFE.bottom);
      ctx.setLineDash([14,10]); ctx.lineWidth=2; ctx.strokeStyle='rgba(255,45,135,.55)'; ctx.beginPath(); ctx.moveTo(0,SAFE.top); ctx.lineTo(W,SAFE.top); ctx.moveTo(0,H-SAFE.bottom); ctx.lineTo(W,H-SAFE.bottom); ctx.stroke(); ctx.setLineDash([]); }
    guides.forEach(g=>{ ctx.strokeStyle=g.kind==='canvas'?'rgba(61,107,255,.95)':g.kind==='safe'?'rgba(255,45,135,.95)':'rgba(255,140,0,.95)'; ctx.lineWidth=3; ctx.beginPath();
      if(g.axis==='x'){ ctx.moveTo(g.v,0); ctx.lineTo(g.v,H); } else { ctx.moveTo(0,g.v); ctx.lineTo(W,g.v); } ctx.stroke(); });
    ctx.restore();
  }
  /* snap targets: canvas edges + centre, safe-zone lines, and the edges + centres of every other visible layer */
  function snapTargets(skip){
    const xs=[{v:0,kind:'canvas'},{v:W/2,kind:'canvas'},{v:W,kind:'canvas'}], ys=[{v:0,kind:'canvas'},{v:H/2,kind:'canvas'},{v:H,kind:'canvas'}];
    if(SAFE){ ys.push({v:SAFE.top,kind:'safe'},{v:H-SAFE.bottom,kind:'safe'}); }
    reg.forEach(b=>{ if(!b.id||b.id===skip||b.hidden||b.empty) return; xs.push({v:b.x,kind:'layer'},{v:b.x+b.w/2,kind:'layer'},{v:b.x+b.w,kind:'layer'}); ys.push({v:b.y,kind:'layer'},{v:b.y+b.h/2,kind:'layer'},{v:b.y+b.h,kind:'layer'}); });
    return {xs,ys};
  }
  /* best snap for one axis: the box's start/centre/end against the targets, within tol canvas px */
  function snapAxis(a,len,targets,tol){
    let best=null; [a,a+len/2,a+len].forEach(p=>targets.forEach(t=>{ const d=t.v-p; if(Math.abs(d)<=tol&&(!best||Math.abs(d)<Math.abs(best.d))) best={d,v:t.v,kind:t.kind}; }));
    return best;
  }
  function render(){ if(raf) return; raf=requestAnimationFrame(()=>{raf=0;draw(vctx,true);}); scheduleCommit(); }

  /* ---- the design "recipe": everything needed to rebuild this story (saving, drafts, undo) ---- */
  function recipe(){
    /* v2 keeps every page; page 1's values/layers/extras are also written at the top so older readers still work */
    const p0=S.P[0];
    return {v:2,tool:cfg.id,brand:B.id,style:S.style,count:S.count,page:S.page,values:clone(p0.values),layers:clone(p0.layers),extras:clone(p0.extras),
      ...(PG?{pages:clone(S.P)}:{}),
      photos:S.photos.map(p=>({zoom:+p.zoom.toFixed(4),ox:Math.round(p.ox*10)/10,oy:Math.round(p.oy*10)/10,has:!!(p.img&&!p.sample)}))};
  }
  /* slots: optional photo objects to put in each slot (null = keep what's there) */
  function applyRecipe(r,slots){
    if(r.style&&(!cfg.styles||cfg.styles.some(s=>s.id===r.style))) S.style=r.style;
    if(r.count) S.count=Math.min(perPage,Math.max(minPhotos,r.count));
    const pages=(PG&&r.pages&&r.pages.length?r.pages:[{values:r.values,layers:r.layers,extras:r.extras}]).slice(0,PG?PG.max:1);
    S.P=pages.map((pp,i)=>{ const np=newPage(i); Object.keys(pp.values||{}).forEach(k=>{ if(k in np.values) np.values[k]=clone(pp.values[k]); }); np.layers=clone(pp.layers||{}); np.extras=clone(pp.extras||[]); return np; });
    S.page=Math.min(S.P.length-1,Math.max(0,r.page||0));
    S.P.forEach(pp=>{ extraN=pp.extras.reduce((m,x)=>Math.max(m,+(String(x.id).replace(/\D/g,''))||0),extraN); }); assetN=Math.max(assetN,extraN);
    (r.photos||[]).forEach((rp,i)=>{ if(!S.photos[i]) return; if(slots&&slots[i]) S.photos[i]={...slots[i]}; Object.assign(S.photos[i],{zoom:rp.zoom||1,ox:rp.ox||0,oy:rp.oy||0}); });
    S.sel=null;
  }
  async function fontsOf(r){ const fams=new Set(), pages=r.pages||[r]; pages.forEach(pp=>Object.values(pp.layers||{}).forEach(l=>{ if(l&&l.font) fams.add(l.font); }));
    await Promise.all([...fams].map(ensureFont)); await Promise.all(pages.flatMap(pp=>(pp.extras||[]).filter(x=>x.type==='asset').map(x=>loadAsset(x.ref)))); }

  /* ---- undo / redo: a snapshot after every pause in editing ---- */
  const hist={stack:[],i:-1,timer:0,ready:false};
  function snap(){ return {json:JSON.stringify(recipe()),photos:S.photos.map(p=>({...p}))}; }
  function same(a,b){ return a&&b&&a.json===b.json&&a.photos.every((p,i)=>p.img===b.photos[i].img); }
  function scheduleCommit(){ if(!hist.ready) return; clearTimeout(hist.timer); hist.timer=setTimeout(commit,450); }
  function commit(){
    if(pts.size) return scheduleCommit();                      // still dragging
    const s=snap(); if(same(s,hist.stack[hist.i])) return;
    hist.stack=hist.stack.slice(0,hist.i+1); hist.stack.push(s); if(hist.stack.length>80) hist.stack.shift(); hist.i=hist.stack.length-1;
    syncUndo(); saveDraft(s);
  }
  function restore(s){ applyRecipe(JSON.parse(s.json),s.photos); syncUI(); syncInspector(); paintPager(); draw(vctx,true); syncUndo(); saveDraft(s); }
  function undo(){ if(hist.i>0){ hist.i--; restore(hist.stack[hist.i]); } }
  function redo(){ if(hist.i<hist.stack.length-1){ hist.i++; restore(hist.stack[hist.i]); } }
  function syncUndo(){ $('undo').disabled=hist.i<=0; $('redo').disabled=hist.i>=hist.stack.length-1; }
  function startHistory(){ hist.stack=[snap()]; hist.i=0; hist.ready=true; syncUndo(); }

  /* ---- drafts: the unfinished story is kept on this phone, photos included ---- */
  const DKEY='studio:draft:'+B.id+':'+cfg.id; let draftTimer=0, dirty=false;
  function saveDraft(s){
    if(!hist.ready) return; if(hist.i>0) dirty=true; if(!dirty) return;
    clearTimeout(draftTimer); draftTimer=setTimeout(async()=>{
      const keys=[];
      for(let i=0;i<S.photos.length;i++){ const p=S.photos[i]; if(p.img&&!p.sample&&p.key){ keys[i]=p.key; if(!p.draftSaved){ const blob=await photoBlob(p); if(blob){ await idb.put(DKEY+':'+p.key,blob); p.draftSaved=true; } } } else keys[i]=null; }
      const old=store(DKEY); store(DKEY,{json:s.json,keys,at:Date.now(),thumb:draftThumb(),design:design&&{id:design.id,name:design.name,kind:design.kind}});
      if(old&&old.keys) old.keys.forEach(k=>{ if(k&&!keys.includes(k)) idb.del(DKEY+':'+k); });
    },800);
  }
  function draftThumb(){ try{ const c=document.createElement('canvas'), k=400/H; c.width=Math.round(W*k); c.height=400; const ctx=c.getContext('2d'); const sel=S.sel; S.sel=null; ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height); withPage(0,()=>draw(ctx,true,k)); S.sel=sel; return c.toDataURL('image/jpeg',.7); }catch(_){ return null; } }
  function clearDraft(){ const old=store(DKEY); if(old&&old.keys) old.keys.forEach(k=>{ if(k) idb.del(DKEY+':'+k); }); store(DKEY,null); dirty=false; }
  async function loadDraft(d){
    const slots=[];
    for(let i=0;i<(d.keys||[]).length;i++){ const k=d.keys[i]; if(!k) continue; const blob=await idb.get(DKEY+':'+k); if(blob) slots[i]=await photoFromBlob(blob,k,true); }
    const r=JSON.parse(d.json); await fontsOf(r); applyRecipe(r,slots);
    if(d.design){ design={...d.design,collections:[]}; showDesignBar(); }
    dirty=true;
  }
  async function photoFromBlob(blob,key,draftSaved){
    const img=await loadFile(blob); const tc=document.createElement('canvas'), tk=240/Math.max(img.width,img.height); tc.width=Math.round(img.width*tk); tc.height=Math.round(img.height*tk); tc.getContext('2d').drawImage(img,0,0,tc.width,tc.height);
    return {img,zoom:1,ox:0,oy:0,sample:false,thumb:tc.toDataURL('image/jpeg',.7),file:blob,key:key||('p'+Math.random().toString(36).slice(2,9)),draftSaved:!!draftSaved};
  }
  /* the photo as a file: the original when we still have it at full size, otherwise a high-quality JPEG */
  async function photoBlob(p){
    if(p.file&&!(p.img instanceof HTMLCanvasElement)&&/^image\/(jpeg|png|webp)$/.test(p.file.type)) return p.file;
    const c=document.createElement('canvas'); c.width=p.img.width; c.height=p.img.height; c.getContext('2d').drawImage(p.img,0,0);
    const b=await canvasBlob(c,'image/jpeg',.95); c.width=c.height=0; return b;
  }

  /* ---- saved designs (shared with the team) ---- */
  let design=null;   // {id,name,kind,collections}
  function showDesignBar(){
    const bar=$('designBar'); if(!design){ bar.hidden=true; $('saveDesignTxt').textContent='Save design to the team'; return; }
    bar.hidden=false;
    bar.innerHTML=`<span><span class="small">${design.kind==='template'?'Template':'Saved design'}</span><br><b>${esc(design.name)}</b></span><span class="banner-btns"><a class="mini" href="${ROOT}index.html#saved">All saved</a></span>`;
    $('saveDesignTxt').textContent='Update “'+design.name+'”';
  }
  function thumbBlob(){
    const k=360/W, c=document.createElement('canvas'); c.width=360; c.height=Math.round(H*k); const ctx=c.getContext('2d'); const sel=S.sel; S.sel=null;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height); withPage(0,()=>draw(ctx,true,k)); S.sel=sel; draw(vctx,true); return canvasBlob(c,'image/jpeg',.85);
  }
  async function openSaveDialog(){
    if(!(await ensureMember('Saved designs go to the team, so anyone on the team can find and reuse them.'))) return;
    const C=await cloud(); let cols=[]; try{ cols=await C.collections(B.id); }catch(_){}
    const picked=new Set(design?design.collections:[]); const hasPhotos=S.photos.some((p,i)=>photoUsed(i)&&p.img&&!p.sample);
    const d=dialog(`<form method="dialog" class="dlg-body">
      <h3>${design?'Save design':'Save design to the team'}</h3>
      <div class="field"><label class="lbl" for="dsName">Name</label><input type="text" id="dsName" dir="auto" required maxlength="80" placeholder="e.g. Restock – Al Khoud"></div>
      <div class="field"><span class="lbl">Collections</span><div class="chips" id="dsCols"></div>
        <div class="inline"><input type="text" id="dsNew" dir="auto" placeholder="New collection…" maxlength="40"><button type="button" class="mini" id="dsAdd">Add</button></div></div>
      <label class="check"><input type="checkbox" id="dsKeep" ${hasPhotos&&(!design||design.kind!=='template')?'checked':''} ${hasPhotos?'':'disabled'}> Keep the photos</label>
      <span class="small" id="dsKeepNote">${hasPhotos?'Off = a template: layout and words only, add new photos each time.':'No photos yet, so this is saved as a template.'}</span>
      <div class="status" id="dsStatus" role="status"></div>
      <div class="dlg-actions">${design?'<button type="button" class="mini" id="dsAsNew">Save as new</button>':'<button type="button" class="mini" id="dsCancel">Cancel</button>'}<button type="submit" class="btn" id="dsGo">${design?'Update':'Save'}</button></div>
    </form>`);
    const $d=id=>d.querySelector('#'+id); $d('dsName').value=design?design.name:'';
    const paint=()=>{ const all=[...new Set([...cols.map(c=>c.name),...picked])].sort((a,b)=>a.localeCompare(b)); $d('dsCols').innerHTML=all.length?all.map(n=>`<button type="button" class="chip" dir="auto" data-col="${esc(n)}" aria-pressed="${picked.has(n)}">${esc(n)}</button>`).join(''):'<span class="small">No collections yet. Add one below.</span>'; };
    paint();
    $d('dsCols').addEventListener('click',e=>{ const b=e.target.closest('[data-col]'); if(!b) return; const n=b.dataset.col; picked.has(n)?picked.delete(n):picked.add(n); paint(); });
    const addNew=()=>{ const n=$d('dsNew').value.trim(); if(n){ picked.add(n); $d('dsNew').value=''; paint(); } };
    $d('dsAdd').onclick=addNew; $d('dsNew').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addNew(); } });
    if($d('dsCancel')) $d('dsCancel').onclick=()=>d.close();
    const go=async asNew=>{
      const name=$d('dsName').value.trim(); if(!name){ $d('dsStatus').textContent='Give it a name.'; $d('dsName').focus(); return; }
      d.querySelectorAll('button').forEach(b=>b.disabled=true); $d('dsStatus').textContent='Saving…';
      try{
        const keep=$d('dsKeep').checked&&hasPhotos, r=recipe();
        const photos=keep?await Promise.all(S.photos.map(async(p,i)=>{ if(!photoUsed(i)||!p.img||p.sample) return null; if(p.path&&!p.changed&&!asNew) return {path:p.path}; return {blob:await photoBlob(p)}; })):[];
        const id=await C.saveDesign({id:asNew?null:(design&&design.id),brand:B.id,tool:cfg.id,name,kind:keep?'design':'template',recipe:r,photos,thumb:await thumbBlob(),collections:[...picked]});
        const fresh=await C.getDesign(id); (fresh.recipe.photoPaths||[]).forEach((p,i)=>{ if(p&&S.photos[i]){ S.photos[i].path=p; S.photos[i].changed=false; } });
        design={id,name,kind:keep?'design':'template',collections:[...picked]}; showDesignBar(); clearDraft();
        history.replaceState(null,'',location.pathname+'?design='+id);
        d.close(); status('Saved to the team as “'+name+'”.');
      }catch(err){ $d('dsStatus').textContent=err.message; d.querySelectorAll('button').forEach(b=>b.disabled=false); }
    };
    d.querySelector('form').addEventListener('submit',e=>{ e.preventDefault(); go(false); });
    if($d('dsAsNew')) $d('dsAsNew').onclick=()=>go(true);
    setTimeout(()=>{ const n=$d('dsName'); n.focus(); n.select(); },50);
  }
  async function openDesign(id,ready){
    status('Opening the saved design…');
    if(!(await ensureMember('This design is saved with the team. Sign in to open it.'))){ status(''); return false; }
    const C=await cloud(); const d=await C.getDesign(id); const r=d.recipe;
    if(d.tool!==cfg.id){ location.replace(toolPage(d.tool)+'?design='+id+(ready?'&go=1':'')); return false; }
    const slots=[];
    if(d.kind!=='template') await Promise.all((r.photoPaths||[]).map(async(p,i)=>{ if(!p) return; try{ const ph=await photoFromBlob(await C.download(p)); ph.path=p; ph.changed=false; slots[i]=ph; }catch(_){ } }));
    await fontsOf(r); applyRecipe(r,slots);
    design={id:d.id,name:d.name,kind:d.kind,collections:d.collectionNames}; showDesignBar(); status('');
    if(ready&&d.kind!=='template'){
      const dl=dialog(`<div class="dlg-body"><h3>${esc(d.name)}</h3><p class="small">Ready to save, exactly as it was.</p>
        <div class="dlg-actions"><button type="button" class="mini" id="rdEdit">Edit first</button><button type="button" class="btn" id="rdSave">Save story</button></div></div>`);
      dl.querySelector('#rdEdit').onclick=()=>dl.close();
      dl.querySelector('#rdSave').onclick=()=>{ dl.close(); C.touchUsed(id); save(true); };
    }
    return true;
  }

  /* ---- selecting and editing layers ---- */
  const extra=id=>S.extras.find(x=>x.id===id);
  const textExtra=id=>{ const x=extra(id); return x&&x.type!=='asset'?x:null; };
  function layerText(id){ const x=extra(id); if(x) return x.type==='asset'?null:x.text; const f=fields.find(f=>f.id===id); if(!f) return null; const t=value(id); return typeof t==='string'?t:null; }
  function select(id){
    S.sel=id; syncInspector(); render();
    if(id) openSheet('insp',{quiet:true}); else if(openName==='insp') closeSheet('insp'); else if(!isPhone()) closeSheet('insp');
  }
  function syncInspector(){
    const id=S.sel, b=reg.find(x=>x.id===id); if(!id) return;
    const l=S.layers[id]||{k:1,color:null,hidden:false}; const t=layerText(id), x=extra(id);
    $('inspName').textContent=x?(x.type==='asset'?((assetDef(x.ref)||{}).label||'Asset'):'Your text'):(b&&b.label)||'Layer';
    const ti=$('inspText'); ti.hidden=t===null; if(t!==null&&document.activeElement!==ti) ti.value=t;
    const isAsset=!!(x&&x.type==='asset'), ad=isAsset&&assetDef(x.ref);
    $('inspSize').min=isAsset?'0.2':'0.4'; $('inspSize').max=isAsset?'4':'2.5';
    $('inspSize').value=x&&!isAsset?x.size/60:l.k;
    $('inspHide').textContent=l.hidden?'Show':'Hide'; $('inspHide').hidden=!!x; $('inspDelete').hidden=!x; $('inspOrder').hidden=!x;
    if(x){ const i=S.extras.indexOf(x); $('inspBack').disabled=i<=0; $('inspFwd').disabled=i>=S.extras.length-1; }
    const C=B.colors, kind=b&&b.kind;
    const palette=[[C.ink,'Dark',C.ink],[C.paper,'White',C.paper],[C.accent,'Gold',C.accent],...(C.cream?[[C.cream,'Cream',C.cream]]:[]),...(C.muted?[[C.muted,'Grey',C.muted]]:[])];
    const sw=kind==='logo'?[['dark','Dark',C.ink],['light','Light','#ffffff']]:isAsset?(ad&&(ad.tint||!ad.file)?[[null,'Original',null],...palette]:[]):[[null,'Auto',null],[C.paper,'White',C.paper],[C.ink,'Dark',C.ink],[C.accent,'Gold',C.accent]];
    $('inspColors').hidden=!sw.length;
    $('inspFontRow').hidden=!(kind==='text'||kind==='pill');
    if(kind==='text'||kind==='pill'){
      const opt=f=>`<option value="${esc(f.family)}" style="font-family:'${esc(f.family)}'">${esc(f.label||f.family)}</option>`;
      const html=`<option value="">Brand font (default)</option><optgroup label="${esc(B.name)} fonts">${brandFonts().map(opt).join('')}</optgroup><optgroup label="More fonts">${MORE_FONTS.map(opt).join('')}</optgroup>`;
      if($('inspFont').dataset.built!=='1'){ $('inspFont').innerHTML=html; $('inspFont').dataset.built='1'; }
      $('inspFont').value=l.font||'';
    }
    const cur=x&&!isAsset?x.color:l.color;
    $('inspColors').innerHTML='<span class="lbl">Colour</span>'+sw.map(([v,n,c])=>`<button type="button" class="sw-btn" data-color="${v??''}" aria-pressed="${String((cur??'')===(v??''))}" aria-label="${n}" title="${n}" style="${c?'background:'+c:''}">${c?'':'A'}</button>`).join('');
  }
  $('inspClose').addEventListener('click',()=>select(null));
  $('inspFont').addEventListener('change',async e=>{ const id=S.sel; if(!id) return; const fam=e.target.value||null; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false});
    if(fam){ status('Loading font…'); await ensureFont(fam); status(''); } l.font=fam; render(); });
  $('undo').addEventListener('click',undo); $('redo').addEventListener('click',redo);
  document.addEventListener('keydown',e=>{ if(!(e.ctrlKey||e.metaKey)||e.altKey) return; const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT')) return;
    const k=e.key.toLowerCase(); if(k==='z'&&!e.shiftKey){ e.preventDefault(); undo(); } else if((k==='z'&&e.shiftKey)||k==='y'){ e.preventDefault(); redo(); } });
  $('saveDesign').addEventListener('click',openSaveDialog);
  $('draftFresh').addEventListener('click',()=>{ clearDraft(); $('draftBar').hidden=true; });
  $('draftGo').addEventListener('click',async()=>{ $('draftBar').hidden=true; const d=store(DKEY); if(d){ await loadDraft(d); syncUI(); draw(vctx,true); startHistory(); } });
  $('inspText').addEventListener('input',e=>{ const id=S.sel, x=extra(id); if(x) x.text=e.target.value; else setValue(id,e.target.value); render(); });
  $('inspSize').addEventListener('input',e=>{ const id=S.sel, x=textExtra(id); if(x) x.size=Math.round(+e.target.value*60); else { (S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1})).k=+e.target.value; } render(); });
  $('inspColors').addEventListener('click',e=>{ const b=e.target.closest('[data-color]'); if(!b) return; const v=b.dataset.color||null, id=S.sel, x=textExtra(id); if(x){ x.color=v||B.colors.paper; x.shadow=!(v&&!isLight(v)); } else (S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1})).color=v; syncInspector(); render(); });
  $('inspCenter').addEventListener('click',()=>{ const id=S.sel, b=reg.find(r=>r.id===id); if(!b||b.hidden) return; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1}); l.dx+=W/2-(b.x+b.w/2); render(); });
  $('inspReset').addEventListener('click',()=>{ const id=S.sel, x=textExtra(id); if(x){ x.size=60; } S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}; syncInspector(); render(); });
  $('inspHide').addEventListener('click',()=>{ const id=S.sel; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1}); l.hidden=!l.hidden; syncInspector(); render(); });
  $('inspDelete').addEventListener('click',()=>{ S.extras=S.extras.filter(x=>x.id!==S.sel); delete S.layers[S.sel]; select(null); });
  let extraN=0;
  $('addText').addEventListener('click',()=>{
    const id='extra'+(++extraN);
    // new text starts in the middle, light with a soft shadow so it reads on photos; change colour in the panel
    S.extras.push({id,text:B.phrases.write||'Text',font:'display',size:72,color:B.colors.paper,shadow:true,y:H/2-60+(S.extras.length%4)*90});
    select(id); setTimeout(()=>{ $('inspText').focus(); $('inspText').select(); },30);
  });
  /* ---- assets library: brand files (logo, cans, stickers) and shapes, added as movable layers ---- */
  function assetThumb(a){
    if(a.file) return `<img alt="" src="${esc(assetUrl(a))}"${a.tint?' data-logo':''} loading="lazy" onerror="this.closest('button').classList.add('missing');this.remove()">`;
    const c=document.createElement('canvas'), k=56/Math.max(a.w,a.h); c.width=Math.ceil(a.w*k)+4; c.height=Math.ceil(a.h*k)+4; const x=c.getContext('2d'); x.translate(2,2); x.scale(k,k); x.fillStyle=getComputedStyle(document.body).color||'#161210'; a.draw(x);
    return `<img alt="" src="${c.toDataURL()}">`;
  }
  function paintAssets(){
    const groups={}; brandAssets().forEach(a=>{ (groups[a.group||'Brand']=groups[a.group||'Brand']||[]).push(a); }); groups.Shapes=SHAPES;
    $('assetList').innerHTML=Object.entries(groups).map(([g,list])=>`<span class="lbl">${esc(g)}</span><div class="asset-grid">${list.map(a=>`<button type="button" class="asset-tile" data-asset="${esc(a.id)}" title="${esc(a.file?a.label+' ('+a.file+')':a.label)}">${assetThumb(a)}<span>${esc(a.label)}</span><i class="miss-note">Not added yet</i></button>`).join('')}</div>`).join('')
      +(brandAssets().length?'':'<p class="small">This brand kit lists no asset files yet.</p>');
  }
  let assetN=0;
  async function addAsset(ref){
    const a=assetDef(ref); if(!a) return;
    if(a.file){ const got=await loadAsset(ref); if(!got||got.missing){ status('“'+a.label+'” is not in the brand kit yet ('+a.file+').'); return; } }
    const id='asset'+(++assetN), w=a.w0||(a.file?(a.group==='Logo'?320:420):(a.w>a.h*2?420:260));
    S.extras.push({id,type:'asset',ref,w,x:W/2,y:H/2+(S.extras.length%4)*60,color:a.file?null:(a.color||B.colors.accent||B.colors.ink)});
    closeSheet('assets'); select(id);
  }
  $('addAsset').addEventListener('click',()=>{ paintAssets(); openSheet('assets'); });
  $('assetList').addEventListener('click',e=>{ const t=e.target.closest('[data-asset]'); if(t) addAsset(t.dataset.asset); });
  function moveExtra(d){ const x=extra(S.sel); if(!x) return; const i=S.extras.indexOf(x), j=i+d; if(j<0||j>=S.extras.length) return; S.extras.splice(i,1); S.extras.splice(j,0,x); syncInspector(); render(); }
  $('inspBack').addEventListener('click',()=>moveExtra(-1)); $('inspFwd').addEventListener('click',()=>moveExtra(1));
  onAssetLoad=()=>render();

  $('resetLayout').addEventListener('click',()=>{ S.layers={}; S.photos.forEach(p=>{p.ox=0;p.oy=0;p.zoom=1;}); syncZoom(); syncInspector(); render(); });

  /* ---- layers panel: every text, button and logo, top first; tap to select, eye to hide/show ---- */
  const EYE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const KIND={text:'Text',pill:'Button',logo:'Logo',asset:'Asset'};
  let layersSig='';
  function paintLayers(){
    const seen=new Set(), items=[];
    for(let j=reg.length-1;j>=0;j--){ const b=reg[j]; if(!b.id||b.empty||seen.has(b.id)) continue; seen.add(b.id); items.push(b); }
    const rows=items.map(b=>{ const t=layerText(b.id), x=extra(b.id); return {id:b.id,name:x&&x.type!=='asset'?'Your text':b.label||KIND[b.kind]||'Layer',kind:KIND[b.kind]||'',text:t&&t!==b.label?t:'',hidden:!!b.hidden,sel:S.sel===b.id}; });
    const sig=JSON.stringify(rows); if(sig===layersSig) return; layersSig=sig;
    $('layerList').innerHTML=rows.length?rows.map(r=>`<li class="lyr${r.sel?' sel':''}${r.hidden?' off':''}"><button type="button" class="lyr-pick" data-pick="${esc(r.id)}" aria-current="${r.sel}"><b>${esc(r.name)}</b>${r.text?`<span dir="auto">${esc(r.text)}</span>`:(r.kind&&r.kind!==r.name?`<span>${esc(r.kind)}</span>`:'')}</button><button type="button" class="lyr-eye" data-eye="${esc(r.id)}" aria-pressed="${!r.hidden}" aria-label="${r.hidden?'Show':'Hide'} ${esc(r.name)}" title="${r.hidden?'Show':'Hide'}">${r.hidden?EYE_OFF:EYE}</button></li>`).join(''):'<li class="small">No layers yet.</li>';
  }
  $('layerList').addEventListener('click',e=>{
    const eye=e.target.closest('[data-eye]'); if(eye){ const id=eye.dataset.eye, l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}); l.hidden=!l.hidden; if(S.sel===id) syncInspector(); render(); return; }
    const pk=e.target.closest('[data-pick]'); if(pk){ const id=pk.dataset.pick; select(S.sel===id?null:id); }
  });

  /* ---- pointer: drag layers or photos, pinch to resize/zoom, tap text to edit ---- */
  let guides=[], dragging=false; const pts=new Map(); let st=null, target=null, moved=false;
  function toCanvas(e){ const r=view.getBoundingClientRect(), k=W/r.width; return {x:(e.clientX-r.left)*k,y:(e.clientY-r.top)*k,k}; }
  function hit(pt){
    for(let j=reg.length-1;j>=0;j--){ const b=reg[j]; if(b.id&&!b.hidden&&!b.empty){ const pad=24; if(pt.x>=b.x-pad&&pt.x<=b.x+b.w+pad&&pt.y>=b.y-pad&&pt.y<=b.y+b.h+pad) return {layer:b.id}; } }
    for(let j=reg.length-1;j>=0;j--){ const b=reg[j]; if(b.photo!=null&&pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h) return {photo:b.photo,mode:b.mode}; }
    return null;
  }
  view.addEventListener('pointerdown',e=>{
    const pt=toCanvas(e); const h=pts.size?target:hit(pt);
    if(!pts.size){ target=h; moved=false; }
    if(!target){ select(null); return; }
    if(target.photo!=null){ const p=S.photos[target.photo]; if(!p.img||p.sample){ S.active=target.photo; pickPhoto(target.photo); target=null; return; } S.active=target.photo; syncZoom(); if(S.sel) select(null); }
    view.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    snapshot(); view.classList.add('dragging');
  });
  function snapshot(){
    if(!target) return;
    if(target.layer){ const id=target.layer, x=extra(id), l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}); const b=reg.find(r=>r.id===id&&!r.hidden&&!r.empty); st={dx:l.dx,dy:l.dy,k:l.k,size:x?x.size:0,box:b?{x:b.x,y:b.y,w:b.w,h:b.h}:null,snap:snapTargets(id),pts:new Map(pts)}; }
    else { const p=S.photos[target.photo]; st={ox:p.ox,oy:p.oy,zoom:p.zoom,pts:new Map(pts)}; }
  }
  view.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId)||!st||!target) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const k=W/view.getBoundingClientRect().width;
    if(pts.size===1&&st.pts.size===1){
      const p0=[...st.pts.values()][0], ddx=(e.clientX-p0.x)*k, ddy=(e.clientY-p0.y)*k;
      if(Math.hypot(ddx,ddy)>8) moved=true; if(!moved) return;
      if(target.layer){ const l=S.layers[target.layer]; let mx=ddx, my=ddy; guides=[]; dragging=true;
        if(st.box){ const tol=8*k, sx=snapAxis(st.box.x+mx,st.box.w,st.snap.xs,tol), sy=snapAxis(st.box.y+my,st.box.h,st.snap.ys,tol);
          if(sx){ mx+=sx.d; guides.push({axis:'x',v:sx.v,kind:sx.kind}); } if(sy){ my+=sy.d; guides.push({axis:'y',v:sy.v,kind:sy.kind}); } }
        l.dx=st.dx+mx; l.dy=st.dy+my;
        if(!S.sel||S.sel!==target.layer) select(target.layer);
      } else if(target.mode==='cover'){ const p=S.photos[target.photo]; p.ox=st.ox+ddx; p.oy=st.oy+ddy; }
    } else if(pts.size>=2&&st.pts.size>=2){
      moved=true; const a=[...pts.values()], c=[...st.pts.values()]; const r=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/(Math.hypot(c[0].x-c[1].x,c[0].y-c[1].y)||1);
      if(target.layer){ const x=extra(target.layer); if(x&&x.type!=='asset') x.size=Math.max(20,Math.min(220,st.size*r)); else S.layers[target.layer].k=Math.max(x?.2:.4,Math.min(x?4:2.5,st.k*r)); syncInspector(); }
      else if(target.mode==='cover'){ const p=S.photos[target.photo]; p.zoom=Math.max(1,Math.min(3,st.zoom*r)); $('zoom').value=p.zoom; }
    }
    render();
  });
  function endPtr(e){
    pts.delete(e.pointerId);
    if(!pts.size){
      view.classList.remove('dragging'); guides=[]; dragging=false;
      if(target&&target.layer&&!moved){ const already=S.sel===target.layer; select(target.layer); const ti=$('inspText'); if(already&&!ti.hidden){ ti.focus(); } }
      target=null; st=null; render();
    } else snapshot();
  }
  view.addEventListener('pointerup',endPtr); view.addEventListener('pointercancel',endPtr);
  view.addEventListener('wheel',e=>{ const t=hit(toCanvas(e)); if(!t) return; e.preventDefault();
    if(t.layer){ const x=extra(t.layer); if(x&&x.type!=='asset') x.size=Math.max(20,Math.min(220,x.size*(1-e.deltaY*.0015))); else { const l=S.layers[t.layer]||(S.layers[t.layer]={dx:0,dy:0,k:1}); l.k=Math.max(x?.2:.4,Math.min(x?4:2.5,l.k*(1-e.deltaY*.0015))); } if(S.sel!==t.layer) select(t.layer); else syncInspector(); }
    else if(t.mode==='cover'){ const p=S.photos[t.photo]; if(!p.img||p.sample) return; p.zoom=Math.max(1,Math.min(3,p.zoom-e.deltaY*.0015)); S.active=t.photo; syncZoom(); }
    render(); },{passive:false});
  view.addEventListener('keydown',e=>{ if(!S.sel) return; const l=S.layers[S.sel]||(S.layers[S.sel]={dx:0,dy:0,k:1}); const st=e.shiftKey?20:4; const m={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key]; if(m){ e.preventDefault(); l.dx+=m[0]; l.dy+=m[1]; render(); } else if(e.key==='Escape') select(null); });
  $('zoom').addEventListener('input',e=>{const p=S.photos[S.active]; if(p){p.zoom=+e.target.value;render();}});
  $('fitBtn').addEventListener('click',()=>{const p=S.photos[S.active]; if(p){p.zoom=1;p.ox=0;p.oy=0;$('zoom').value=1;render();}});
  $('form').addEventListener('submit',e=>e.preventDefault());

  /* ---- saving: full-quality lossless PNG (2x, stepping down to 1.5x / 1x only if the phone runs out of memory) ---- */
  let downloads=null; const inClaude=!!(window.claude&&window.claude.use);
  if(inClaude) window.claude.use('downloads').then(d=>{downloads=d;}).catch(()=>{});
  function fname(ext,kind,n){ const d=new Date(), z=x=>String(x).padStart(2,'0'); return (B.id+'-'+(kind||cfg.fileName||'story')).replace(/[^a-z0-9-]+/gi,'-')+'-'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds())+(n?'-'+n:'')+'.'+ext; }
  function progress(pct,txt){ $('progress').hidden=pct==null; if(pct!=null){ $('progressBar').style.width=Math.round(pct*100)+'%'; $('progressRole').setAttribute('aria-valuenow',String(Math.round(pct*100))); if(txt) $('progressTxt').textContent=txt; } }
  function done(title,txt){ $('doneBox').hidden=!title; if(title){ $('doneTitle').textContent=title; $('doneTxt').textContent=txt||''; } }
  let lastFiles=null, saving=false;
  async function shareFiles(files){
    if(!(navigator.canShare&&navigator.canShare({files}))) return false;
    try{ await navigator.share({files}); return 'shared'; }
    catch(err){ if(err&&err.name==='AbortError') return 'cancelled'; if(err&&err.name==='NotAllowedError') return 'needtap'; return false; }
  }
  async function save(withPhotos){
    if(saving) return; saving=true;
    const sel=S.sel; S.sel=null;
    openSheet('save'); $('result').hidden=true; $('shareAgain').hidden=true; done(null); status('');
    $('save').disabled=true; $('barSave').disabled=true;
    const type='image/png', ext='png', pages=pageCount(), files=[]; let used=EXPORT_SCALE;
    try{
      for(let pg=0;pg<pages;pg++){
        const tag=pages>1?'Slide '+(pg+1)+' of '+pages+': ':'';
        progress((pg+.1)/pages,tag+'Drawing at full size…'); await new Promise(r=>setTimeout(r,30));
        /* PNG = lossless: no JPEG blur or colour smudging on text, edges and photos. Same on iPhone and Android. */
        async function renderAt(K){
          const c=document.createElement('canvas'); c.width=Math.round(W*K); c.height=Math.round(H*K);
          const ctx=c.getContext('2d'); if(!ctx) return null;
          try{
            withPage(pg,()=>draw(ctx,false,K));
            if(withPhotos){ ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation='destination-over'; ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height); ctx.restore(); }
            progress((pg+.55)/pages,tag+'Making the PNG…');
            const b=await new Promise(r=>c.toBlob(r,type));
            return b&&b.size>1000?b:null;               // a tiny/empty blob means the phone ran out of room
          }catch(_){ return null; }
          finally{ freeSharp(); c.width=c.height=0; }
        }
        /* Full size first. Only if a phone truly can't, step down a little (never straight to small), and say so. */
        let blob=null;
        for(const K of [EXPORT_SCALE,1.5,1]){ if(K>used) continue; blob=await renderAt(K); if(blob){ used=K; break; } }
        if(!blob){ progress(null); status('Your phone could not make the image. Close other apps or tabs and try again.'); return; }
        files.push(new File([blob],fname(ext,withPhotos?null:'frame',pages>1?pg+1:0),{type}));
      }
      progress(1,'Done');
      const small=used<EXPORT_SCALE?' This phone was low on memory, so it is a little smaller ('+Math.round(W*used)+'×'+Math.round(H*used)+'). Close other tabs for full size.':'';
      const what=pages>1?files.length+' slides':(withPhotos?'Your story':'The frame');
      lastFiles=files;
      if(downloads){ try{ for(const f of files) await downloads.save({filename:f.name,data:f}); finish(what+' saved.',small); return; }catch(err){ if(err&&err.code==='declined'){ progress(null); status('Not saved.'); return; } } }
      const touch=matchMedia('(pointer:coarse)').matches;
      if(!inClaude&&touch){
        const r=await shareFiles(files);
        if(r==='shared'){ finish('Saved!','Choose “Save Image” if you haven’t yet. '+what+' '+(pages>1?'are':'is')+' full quality.'+small); return; }
        if(r==='cancelled'){ progress(null); done(null); status('Not saved. Tap Save again when you are ready.'); showResult(files,true); return; }
        if(r==='needtap'){ progress(null); showResult(files,true); finish('Ready!','Tap “Save to Photos” to put it in your photos.'+small,true); return; }
      }
      if(!inClaude){ for(const f of files){ const url=URL.createObjectURL(f); const a=document.createElement('a'); a.href=url; a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),1500); await new Promise(r=>setTimeout(r,250)); } }
      showResult(files,false);
      finish(inClaude?'Ready!':'Saved!',(inClaude?'Your image is ready below.':(pages>1?'Your slides are in your downloads, numbered in order.':'Your story is in your downloads.'))+small);
    } finally { saving=false; $('save').disabled=false; $('barSave').disabled=false; S.sel=sel&&reg.some(r=>r.id===sel)?sel:null; render(); }
  }
  function finish(title,txt,keepBar){ if(!keepBar) setTimeout(()=>progress(null),400); done(title,txt); }
  function showResult(files,offerShare){
    const url=URL.createObjectURL(files[0]); $('resultImg').src=url; $('result').hidden=false;
    $('shareAgain').hidden=!offerShare; $('resultNote').hidden=offerShare;
  }
  $('shareAgain').addEventListener('click',async()=>{ if(!lastFiles) return; const r=await shareFiles(lastFiles); if(r==='shared'){ done('Saved!','Your '+(lastFiles.length>1?'slides are':'story is')+' ready to post.'); $('shareAgain').hidden=true; } });
  function needsPhoto(pg){ return !cfg.pageNeedsPhoto||withPage(pg,()=>cfg.pageNeedsPhoto(value)); }
  function missingPhotos(){ const miss=[]; const off=photoOffset(); for(let pg=0;pg<pageCount();pg++){ if(!needsPhoto(pg)) continue; const o=cfg.pages?pg*S.count:off; for(let i=0;i<S.count;i++){ const p=S.photos[o+i]; if(!p||!p.img||p.sample) miss.push(cfg.pages?pg+1:i+1); } } return [...new Set(miss)]; }
  function saveTapped(){
    const miss=missingPhotos();
    if(miss.length&&!cfg.allowSamples){
      openSheet('photo');
      status(cfg.pages?'Add a photo to slide '+miss.join(', ')+' first.':S.count===1?'Add your photo first.':'Add photo '+miss.join(', ')+' first.');
      return;
    }
    save(true);
  }
  $('save').addEventListener('click',saveTapped);
  if(cfg.frameOnly) $('saveFrame').addEventListener('click',()=>save(false));
  /* pages (carousels): one page for ordinary stories */
  function pageCount(){ return S.P.length; }
  function withPage(pg,fn){ const keep=S.page; S.page=pg; try{ return fn(); } finally{ S.page=keep; } }
  function photoOffset(){ return PG?S.page*perPage:0; }
  /* slide pager: pick a slide, add one after this one, or delete this one */
  function paintPager(){
    if(!PG) return; const n=S.P.length, el=$('pager'); el.hidden=false;
    el.innerHTML=`<button type="button" class="mini icon" data-pg="prev" aria-label="Previous slide" ${S.page===0?'disabled':''}>${ICON.back}</button>
      <div class="pg-dots" role="group" aria-label="Slides">${S.P.map((_,i)=>`<button type="button" class="pg-dot" data-pg="${i}" aria-current="${i===S.page}" aria-label="Slide ${i+1}">${i+1}</button>`).join('')}</div>
      <button type="button" class="mini icon" data-pg="next" aria-label="Next slide" ${S.page>=n-1?'disabled':''}>${ICON.next}</button>
      <button type="button" class="mini icon" data-pg="add" aria-label="Add a slide after this one" ${n>=PG.max?'disabled':''}>${ICON.plus}</button>
      <button type="button" class="mini icon" data-pg="del" aria-label="Delete this slide" ${n<=PG.min?'disabled':''}>${ICON.trash}</button>`;
  }
  const blankPhoto=()=>({img:null,zoom:1,ox:0,oy:0,sample:true});
  function goPage(n){ n=Math.max(0,Math.min(S.P.length-1,n)); S.page=n; S.sel=null; S.active=photoOffset(); if(openName==='insp') closeSheet('insp'); syncUI(); syncInspector(); paintPager(); render(); }
  if(PG) $('pager').addEventListener('click',e=>{
    const b=e.target.closest('[data-pg]'); if(!b||b.disabled) return; const a=b.dataset.pg;
    if(a==='prev') goPage(S.page-1); else if(a==='next') goPage(S.page+1);
    else if(a==='add'){ if(S.P.length>=PG.max) return; const at=S.page+1; S.P.splice(at,0,newPage(at)); S.photos.splice(at*perPage,0,...Array.from({length:perPage},blankPhoto)); S.photos.length=nPhotos; goPage(at); status('Slide '+(at+1)+' added.'); }
    else if(a==='del'){ if(S.P.length<=PG.min) return; const at=S.page; S.P.splice(at,1); S.photos.splice(at*perPage,perPage); while(S.photos.length<nPhotos) S.photos.push(blankPhoto()); goPage(Math.min(at,S.P.length-1)); status('Slide deleted. Undo brings it back.'); }
    else goPage(+a);
  });
  function photoUsed(i){ return PG?i<S.P.length*perPage&&i%perPage<S.count:i<S.count; }

  /* ---- start with the brand's example photos so the tool shows what it makes ---- */
  const names=(B.samples&&B.samples[cfg.id])||[];
  const imgs=await Promise.all(names.map(n=>load(B.base+'samples/'+n+'.jpg').catch(()=>null)));
  imgs.forEach((img,i)=>{ if(img&&S.photos[i]) S.photos[i]={img,zoom:1,ox:0,oy:0,sample:true}; });
  syncUI(); draw(vctx,true);

  /* ---- then: a saved design (?design=…), a draft (?draft=1 from the hub), or offer the unfinished story ---- */
  const q=new URLSearchParams(location.search), draft=store(DKEY);
  try{
    if(q.get('design')) await openDesign(q.get('design'),q.get('go')==='1');
    else if(draft&&q.get('draft')==='1') await loadDraft(draft);
    else if(draft&&(draft.keys||[]).some(Boolean)||(draft&&draft.json!==JSON.stringify(recipe()))) $('draftBar').hidden=false;
  }catch(err){ status(err.message||'Could not open that.'); }
  syncUI(); paintPager(); fit(); draw(vctx,true); startHistory();
  Studio.debug={S,reg:()=>reg,recipe,render};   // used by the automated tests
  // web fonts can finish after the first drawing: draw again so the preview uses the right font
  if(document.fonts&&document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',()=>render());
}

/* ---------- home: continue editing, saved designs + collections, tools ---------- */
function ago(t){ const s=(Date.now()-new Date(t).getTime())/1000; if(s<60) return 'just now'; if(s<3600) return Math.round(s/60)+' min ago'; if(s<86400) return Math.round(s/3600)+' h ago'; if(s<86400*7) return Math.round(s/86400)+' d ago'; return new Date(t).toLocaleDateString(); }
async function home(){
  const B=await useBrand(); const $=id=>document.getElementById(id);
  /* tools: one card per entry in TOOLS, with a real preview made with the brand's sample photos */
  $('toolGrid').innerHTML=Object.entries(TOOLS).map(([id,t])=>`<a class="card" href="${toolPage(id)}"><span class="thumb"><img alt="" loading="lazy" src="${ROOT}assets/thumbs/${B.id}/${id}.jpg" onerror="this.style.visibility='hidden'">${t.tag?`<span class="tag">${esc(t.tag)}</span>`:''}</span><span class="txt"><b>${esc(t.title)}</b><span>${esc(t.blurb)}</span></span></a>`).join('');
  /* bottom bar (phone): jump to a section; the bar follows your scrolling */
  const secLinks=[...document.querySelectorAll('.hubbar a')];
  if(window.IntersectionObserver){ const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting) secLinks.forEach(a=>a.setAttribute('aria-current',String(a.dataset.sec===e.target.id))); }); },{rootMargin:'-45% 0px -50% 0px'}); ['continueSec','tools','saved'].forEach(id=>$(id)&&io.observe($(id))); }

  /* install hint: Android/desktop Chrome get a real Install button; iPhone gets the Share → Add to Home Screen steps */
  (function(){
    const bar=$('installBar'); if(!bar||standalone()||store('studio:installHidden')) return;
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const showPrompt=()=>{ bar.hidden=false; $('installGo').hidden=false; };
    if(installEvt) showPrompt(); document.addEventListener('studio:installable',showPrompt);
    if(ios){ bar.hidden=false; $('installGo').hidden=true; $('installTxt').innerHTML='<b>Install Studio</b><span>Tap <svg class="ios-share" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share"><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg> Share, then <b>Add to Home Screen</b>.</span>'; }
    $('installGo').onclick=async()=>{ if(!installEvt) return; installEvt.prompt(); const r=await installEvt.userChoice.catch(()=>null); installEvt=null; if(r&&r.outcome==='accepted') bar.hidden=true; };
    $('installX').onclick=()=>{ bar.hidden=true; store('studio:installHidden',1); };
    window.addEventListener('appinstalled',()=>{ bar.hidden=true; });
  })();

  /* continue editing: unfinished stories kept on this phone */
  const cont=Object.keys(TOOLS).map(id=>({id,d:store('studio:draft:'+B.id+':'+id)})).filter(x=>x.d).sort((a,b)=>b.d.at-a.d.at);
  if(cont.length){ $('continueSec').hidden=false;
    $('hubCont').hidden=false;
    $('continueList').innerHTML=cont.map(x=>`<a class="rowcard" href="${toolPage(x.id)}?draft=1"><span class="rthumb">${x.d.thumb?`<img alt="" src="${x.d.thumb}">`:''}</span><span class="rtxt"><b>${esc(TOOLS[x.id].title)}</b><span dir="auto">${x.d.design?esc(x.d.design.name)+' · ':''}${ago(x.d.at)}</span></span></a>`).join(''); }

  /* account + saved */
  const C=await cloud(); await C.client();
  let all=[], cols=[], active='all', me=null, owner=false;
  async function refreshAccount(){
    const s=await C.session(); me=s&&s.user; const member=me&&await C.isMember();
    $('acct').textContent=me?(me.email===C.teamEmail?'Team':(me.email||'Account')):'Sign in'; $('acct').classList.toggle('on',!!me);
    owner=false; if(member){ try{ const m=await C.members(); owner=m.some(x=>x.email===(me.email||'').toLowerCase()&&x.role==='owner'); }catch(_){} }
    return member;
  }
  async function loadSaved(){
    const member=await refreshAccount();
    if(!member){ $('qWrap').hidden=true; $('colChips').hidden=true; $('colTools').hidden=true; $('savedGrid').innerHTML='';
      $('savedEmpty').hidden=false; $('savedEmpty').innerHTML=`<p>${me?'This email is not on the team yet. Ask the owner to add you.':'Sign in to see the designs your team saved.'}</p>${me?'':'<button type="button" class="btn slim" id="savedSignIn">Sign in</button>'}`;
      const b=$('savedSignIn'); if(b) b.onclick=async()=>{ if(await ensureMember()) loadSaved(); };
      return; }
    $('savedEmpty').hidden=true; $('savedGrid').innerHTML='<div class="skeleton"></div><div class="skeleton"></div>';
    try{ [all,cols]=await Promise.all([C.designs(B.id),C.collections(B.id)]); }catch(err){ $('savedGrid').innerHTML=`<p class="small">${esc(err.message)}</p>`; return; }
    paint();
  }
  function paint(){
    $('qWrap').hidden=!all.length;
    $('colChips').hidden=!cols.length;
    if(active!=='all'&&!cols.some(c=>c.id===active)) active='all';
    $('colChips').innerHTML=`<button type="button" class="chip" data-col="all" aria-pressed="${active==='all'}">All <i>${all.length}</i></button>`+cols.map(c=>`<button type="button" class="chip" dir="auto" data-col="${c.id}" aria-pressed="${active===c.id}">${esc(c.name)} <i>${c.count}</i></button>`).join('');
    $('colTools').hidden=active==='all';
    const q=$('q').value.trim().toLowerCase(), colName=id=>(cols.find(c=>c.id===id)||{}).name||'';
    const list=all.filter(d=>(active==='all'||d.collections.includes(active))&&(!q||d.name.toLowerCase().includes(q)||d.collections.some(c=>colName(c).toLowerCase().includes(q))||(TOOLS[d.tool]&&TOOLS[d.tool].title.toLowerCase().includes(q))));
    if(!all.length){ $('savedEmpty').hidden=false; $('savedEmpty').innerHTML='<p>Nothing saved yet. Make a story with any tool, then tap <b>Save design to the team</b>.</p>'; $('savedGrid').innerHTML=''; return; }
    $('savedEmpty').hidden=!!list.length; if(!list.length) $('savedEmpty').innerHTML='<p>No saved design matches that.</p>';
    $('savedGrid').innerHTML=list.map(d=>`<button type="button" class="dcard" data-id="${d.id}" aria-label="${esc(d.name)}, ${esc((TOOLS[d.tool]||{}).title||d.tool)}"><span class="dthumb"><img alt="" data-path="${esc(d.thumb_path||'')}">${d.kind==='template'?'<em>Template</em>':''}</span><span class="dtxt"><b dir="auto">${esc(d.name)}</b><span>${esc((TOOLS[d.tool]||{}).title||d.tool)} · ${ago(d.updated_at)}</span></span></button>`).join('');
    C.fileUrls(list.map(d=>d.thumb_path)).then(u=>{ document.querySelectorAll('#savedGrid img[data-path]').forEach(i=>{ if(u[i.dataset.path]) i.src=u[i.dataset.path]; }); });
  }
  $('q').addEventListener('input',paint);
  $('colChips').addEventListener('click',e=>{ const b=e.target.closest('[data-col]'); if(b){ active=b.dataset.col; paint(); } });
  $('colRename').onclick=()=>{ const c=cols.find(x=>x.id===active); if(!c) return;
    const d=dialog(`<form method="dialog" class="dlg-body"><h3>Rename collection</h3><input type="text" id="crName" dir="auto" maxlength="40"><div class="status" id="crSt"></div><div class="dlg-actions"><button type="button" class="mini" id="crX">Cancel</button><button type="submit" class="btn">Rename</button></div></form>`);
    d.querySelector('#crName').value=c.name; d.querySelector('#crX').onclick=()=>d.close();
    d.querySelector('form').onsubmit=async e=>{ e.preventDefault(); try{ await C.renameCollection(c.id,d.querySelector('#crName').value); d.close(); loadSaved(); }catch(err){ d.querySelector('#crSt').textContent=err.message; } }; };
  $('colDelete').onclick=()=>{ const c=cols.find(x=>x.id===active); if(!c) return;
    const d=dialog(`<div class="dlg-body"><h3>Delete “${esc(c.name)}”?</h3><p class="small">Only the collection goes. The designs in it stay in Saved.</p><div class="dlg-actions"><button type="button" class="mini" id="cdX">Cancel</button><button type="button" class="btn danger" id="cdGo">Delete collection</button></div></div>`);
    d.querySelector('#cdX').onclick=()=>d.close(); d.querySelector('#cdGo').onclick=async()=>{ await C.deleteCollection(c.id); d.close(); active='all'; loadSaved(); }; };

  /* one saved design: use it, edit it, rename, duplicate, collections, delete */
  $('savedGrid').addEventListener('click',async e=>{
    const card=e.target.closest('[data-id]'); if(!card) return; const dsg=all.find(x=>x.id===card.dataset.id); if(!dsg) return;
    const url=await C.fileUrl(dsg.thumb_path), page=toolPage(dsg.tool);
    const names=dsg.collections.map(id=>(cols.find(c=>c.id===id)||{}).name).filter(Boolean);
    const d=dialog(`<div class="dlg-body design-sheet">
      <div class="ds-top">${url?`<img src="${url}" alt="">`:''}<div><h3 dir="auto">${esc(dsg.name)}</h3><p class="small">${esc((TOOLS[dsg.tool]||{}).title||dsg.tool)}${dsg.kind==='template'?' · template (add new photos)':''}<br>${names.length?esc(names.join(' · ')):'No collection'}</p></div></div>
      <div class="ds-main">${dsg.kind==='template'?`<a class="btn" href="${page}?design=${dsg.id}">Use template</a>`:`<a class="btn" href="${page}?design=${dsg.id}&go=1">Save story</a><a class="btn ghost" href="${page}?design=${dsg.id}">Edit</a>`}</div>
      <div class="ds-more"><button type="button" class="mini" data-act="rename">Rename</button><button type="button" class="mini" data-act="dup">Duplicate</button><button type="button" class="mini" data-act="cols">Collections</button><button type="button" class="mini danger" data-act="del">Delete</button></div>
      <div class="ds-panel" id="dsPanel"></div><div class="status" id="dsSt" role="status"></div>
      <button type="button" class="link" id="dsClose">Close</button></div>`,'sheet');
    const P=d.querySelector('#dsPanel'), st=t=>{ d.querySelector('#dsSt').textContent=t; };
    d.querySelector('#dsClose').onclick=()=>d.close();
    d.querySelector('.ds-more').addEventListener('click',async ev=>{
      const b=ev.target.closest('[data-act]'); if(!b) return; const act=b.dataset.act; st('');
      if(act==='rename'){ P.innerHTML=`<div class="inline"><input type="text" id="rn" dir="auto" maxlength="80"><button type="button" class="mini solid" id="rnGo">Save</button></div>`; const i=P.querySelector('#rn'); i.value=dsg.name; i.focus(); i.select();
        P.querySelector('#rnGo').onclick=async()=>{ try{ await C.renameDesign(dsg.id,i.value); d.close(); loadSaved(); }catch(err){ st(err.message); } }; }
      if(act==='dup'){ st('Copying…'); try{ await C.duplicateDesign(dsg.id); d.close(); loadSaved(); }catch(err){ st(err.message); } }
      if(act==='cols'){ const picked=new Set(names); const draw=()=>{ const allN=[...new Set([...cols.map(c=>c.name),...picked])].sort((a,b)=>a.localeCompare(b));
          P.innerHTML=`<div class="chips">${allN.map(n=>`<button type="button" class="chip" dir="auto" data-n="${esc(n)}" aria-pressed="${picked.has(n)}">${esc(n)}</button>`).join('')}</div><div class="inline"><input type="text" id="nc" dir="auto" placeholder="New collection…" maxlength="40"><button type="button" class="mini" id="ncAdd">Add</button></div><button type="button" class="btn slim" id="colsGo">Save collections</button>`;
          P.querySelector('.chips').onclick=ev2=>{ const c=ev2.target.closest('[data-n]'); if(c){ picked.has(c.dataset.n)?picked.delete(c.dataset.n):picked.add(c.dataset.n); draw(); } };
          P.querySelector('#ncAdd').onclick=()=>{ const v=P.querySelector('#nc').value.trim(); if(v){ picked.add(v); draw(); } };
          P.querySelector('#colsGo').onclick=async()=>{ try{ await C.setDesignCollections(B.id,dsg.id,[...picked]); d.close(); loadSaved(); }catch(err){ st(err.message); } }; };
        draw(); }
      if(act==='del'){
        const cf=dialog(`<div class="dlg-body"><h3 dir="auto">Delete “${esc(dsg.name)}”?</h3>
          <p class="small">This removes the design and all its images from Studio for the whole team. It can't be undone.</p>
          <div class="status" id="cfSt" role="status"></div>
          <div class="dlg-actions"><button type="button" class="mini" id="cfNo">Cancel</button><button type="button" class="btn danger" id="cfYes">Delete</button></div></div>`);
        cf.querySelector('#cfNo').onclick=()=>cf.close();
        cf.querySelector('#cfYes').onclick=async()=>{ cf.querySelectorAll('button').forEach(x=>x.disabled=true); cf.querySelector('#cfSt').textContent='Deleting the design and its images…';
          try{ await C.deleteDesign(dsg.id); cf.close(); d.close(); loadSaved(); }
          catch(err){ cf.querySelector('#cfSt').textContent=err.message; cf.querySelectorAll('button').forEach(x=>x.disabled=false); } };
      }
    });
  });

  /* account menu: who's signed in, team (owner), sign out */
  $('acct').addEventListener('click',async()=>{
    if(!me){ if(await ensureMember()) loadSaved(); else loadSaved(); return; }
    const d=dialog(`<div class="dlg-body"><h3>Account</h3><p class="small">${me.email===C.teamEmail?'Signed in with the team login. You stay signed in on this phone until you sign out.':'Signed in as<br><b>'+esc(me.email||'')+'</b>'}</p>
      <div id="teamBox"></div><div class="dlg-actions"><button type="button" class="mini" id="acSignOut">Sign out</button><button type="button" class="btn" id="acClose">Done</button></div></div>`);
    d.querySelector('#acClose').onclick=()=>d.close();
    d.querySelector('#acSignOut').onclick=async ev=>{ const b=ev.currentTarget; if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='Tap again to sign out'; return; } await C.signOut(); d.close(); loadSaved(); };
    if(owner){ const box=d.querySelector('#teamBox');
      const drawTeam=async()=>{ const m=await C.members(); box.innerHTML=`<span class="lbl">Team</span><ul class="team">${m.map(x=>`<li><span>${esc(x.name||'')} <span class="small">${esc(x.email)}</span></span>${x.role==='owner'?'<span class="small">owner</span>':`<button type="button" class="mini danger" data-rm="${esc(x.email)}">Remove</button>`}</li>`).join('')}</ul>
        <form class="inline" id="addForm"><input type="email" id="addEmail" placeholder="Add a teammate's email" required><button type="submit" class="mini solid">Add</button></form><div class="status" id="tmSt"></div>`;
        box.querySelector('#addForm').onsubmit=async e=>{ e.preventDefault(); try{ await C.addMember(box.querySelector('#addEmail').value); drawTeam(); }catch(err){ box.querySelector('#tmSt').textContent=err.message; } };
        box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{ try{ await C.removeMember(b.dataset.rm); drawTeam(); }catch(err){ box.querySelector('#tmSt').textContent=err.message; } }); };
      drawTeam(); }
  });
  C.onAuth(ev=>{ if(ev==='SIGNED_IN'||ev==='SIGNED_OUT') loadSaved(); });
  loadSaved();
  if(location.hash==='#saved') setTimeout(()=>$('saved').scrollIntoView(),300);
}

window.Studio={tool,home,registerBrand,useBrand,brandList:window.Studio&&window.Studio.brandList||[],W,H};
})();

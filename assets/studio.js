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
/* canvas letter spacing (Chrome, Edge, Safari 18+); the control is hidden where it isn't supported */
const LS_OK=(()=>{ try{ return 'letterSpacing' in document.createElement('canvas').getContext('2d'); }catch(_){ return false; } })();
const PIN=new Path2D("M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88Zm0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32Z");
/* Studio's version: semantic (fix = 0.1.1, feature = 0.2.0). The What's New page (whats-new.html) shows the notes from studio-notes/changelog.md. */
const VERSION='1.12.0';
const ROOT=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/studio\.js.*$/,''):'../';
const BRANDS={};
/* installable app: the service worker caches the app shell (never Supabase calls) */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)) window.addEventListener('load',()=>{ navigator.serviceWorker.register(ROOT+'sw.js').catch(()=>{}); });
let installEvt=null; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; document.dispatchEvent(new Event('studio:installable')); });
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let BRAND=null, LOGO=null, LOGO_LIGHT=null;

/* ---------- small utilities ---------- */
function load(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
/* option buttons sit in an even grid: no lone button stretched across a row (4 → 2×2, 8 → 4×2) */
function segCols(opts){ const n=opts.length, max=opts.some(o=>o.ic)?3:4; if(n<=max) return n; if(n>6&&n%4===0) return 4; /* 8 styles: two short rows, not four tall ones */ return n%max===0?max:(n%(max-1)===0?max-1:max); }
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
/* HEIC/HEIF (iPhone photos): most browsers can't open them, so a HEIC reader (assets/vendor/heic-to.js) is
   loaded the first time someone picks one. Safari opens them itself, so it's only used when needed. */
const isHeic=f=>!!f&&(/^image\/hei[cf]/i.test(f.type||'')||/\.(heic|heif)$/i.test(f.name||''));
const isPhotoFile=f=>!!f&&(/^image\//.test(f.type||'')||isHeic(f));
async function decodeHeic(file){ if(!window.HeicTo) await loadScript(ROOT+'assets/vendor/heic-to.js'); const fn=typeof window.HeicTo==='function'?window.HeicTo:window.HeicTo.heicTo; return await fn({blob:file,type:'bitmap'}); }
async function loadFile(file){
  let src=null;
  try{ src=await createImageBitmap(file,{imageOrientation:'from-image'}); }catch(_){}
  if(!src&&isHeic(file)) src=await decodeHeic(file);          // full resolution, turned the right way
  if(!src) src=await load(URL.createObjectURL(file));
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
/* Speed: the live preview draws a lighter copy of big photos and cut-outs (made once, max 2000px).
   Saving always uses the full-size original, so quality is unchanged. */
const PREV=new WeakMap(), PREV_MAX=2000;
function prev(im){
  if(!im||Math.max(im.width,im.height)<=PREV_MAX) return im;
  let c=PREV.get(im); if(c) return c;
  const k=PREV_MAX/Math.max(im.width,im.height); c=stepDown(im,Math.round(im.width*k),Math.round(im.height*k)); PREV.set(im,c); return c;
}
function rr(ctx,x,y,w,h,r){r=typeof r==='number'?[r,r,r,r]:(r||[0,0,0,0]);const [a,b,c,d]=r.map(v=>Math.max(0,Math.min(v,w/2,h/2)));ctx.moveTo(x+a,y);ctx.lineTo(x+w-b,y);ctx.quadraticCurveTo(x+w,y,x+w,y+b);ctx.lineTo(x+w,y+h-c);ctx.quadraticCurveTo(x+w,y+h,x+w-c,y+h);ctx.lineTo(x+d,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-d);ctx.lineTo(x,y+a);ctx.quadraticCurveTo(x,y,x+a,y);ctx.closePath();}
/* text matching shared by the hub search and Create's template search: lower case, no harakat / tatweel / Quranic marks,
   one form of alef, yeh, teh marbuta, waw and kaf, Arabic digits as 0-9, one space between words.
   normMap(s).m[i] = where normalised character i came from in s (so a match can be highlighted in the original). */
const AR_FOLD={'\u0623':'\u0627','\u0625':'\u0627','\u0622':'\u0627','\u0671':'\u0627','\u0629':'\u0647','\u0649':'\u064A','\u06CC':'\u064A','\u0626':'\u064A','\u0624':'\u0648','\u06A9':'\u0643'};
const AR_MARK=/[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/, AR_DIG='\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';
function normMap(s){
  s=String(s==null?'':s); let n='', m=[];
  for(let i=0;i<s.length;i++){
    const c=s[i]; if(AR_MARK.test(c)) continue;
    if(/\s/.test(c)){ if(n&&n[n.length-1]!==' '){ n+=' '; m.push(i); } continue; }
    for(const ch of c.toLowerCase()){ const d=AR_DIG.indexOf(ch); n+=d>=0?String(d%10):(AR_FOLD[ch]||ch); m.push(i); }
  }
  if(n.endsWith(' ')){ n=n.slice(0,-1); m.pop(); }
  return {n,m};
}
const normText=s=>normMap(s).n;
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function store(k,v){try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,JSON.stringify(v)); return true; }catch(_){ return null; }}

/* ---------- tools (for the hub and for opening saved designs) ---------- */
/* the hub lists tools in this order, under their group's heading: the most used first */
const TOOL_GROUPS={story:'Stories',post:'Posts and covers',free:'Make anything'};
/* what a tool makes, for the Saved page's quick filters (an Offer is a story-sized picture) */
const TOOLS={
  'restock':{title:'Restock',blurb:'Back in stock: the cans, the flavours, a button.',quick:'Photos of the cans: a story each',queue:true,icon:'restock',qi:1,group:'story',type:'story',keys:'available again stock'},
  'photo-story':{title:'Photo story',blurb:'A tall photo, full screen, headline and logo.',quick:'Tall photos: a story each',queue:true,icon:'story',qi:2,group:'story',type:'story',keys:'picture single'},
  'collage':{title:'Collage',blurb:'2 to 9 photos in grids, mosaics or scattered prints.',quick:'2 to 9 photos',icon:'collage',multi:true,qi:3,group:'story',type:'story',keys:'grid mosaic several pictures'},
  'new-place':{title:'New place',blurb:'A new sale point: photo, place name, pin.',group:'story',type:'story',keys:'shop store location map opening'},
  'split':{title:'Two-photo split',blurb:'Close-up on top, wide below, words on the cut.',group:'story',type:'story',keys:'two pictures half'},
  'cinematic':{title:'Cinematic bars',blurb:'A wide photo shown whole, text on black bars.',group:'story',type:'story',keys:'film movie wide letterbox'},
  'offer':{title:'Offer',blurb:'Discount tiles, dates, a product photo and a button.',group:'post',type:'story',keys:'sale deal promo price percent'},
  'carousel':{title:'Carousel',blurb:'A 1080×1350 feed carousel: several slides, page dots.',quick:'Up to 10 photos, a slide each',icon:'carousel',multi:true,max:10,qi:4,group:'post',type:'post',keys:'slides swipe feed post'},
  'highlight':{title:'Highlight covers',blurb:'Round covers for your story highlights: an icon, a word or a photo.',quick:'Up to 12 photos, a cover each',icon:'highlight',multi:true,max:12,qi:5,group:'post',type:'highlight',keys:'circle icons profile'},
  'create':{title:'Create',blurb:'Make anything: templates, every element, pages.',group:'free',type:'free',keys:'design blank free templates canvas'}
};
const toolPage=id=>ROOT+'tools/'+id+'.html';

/* ---------- Pinned tools: the home page shows only the tools pinned on this device; All tools has every tool.
   Kept on the device (localStorage), not with the team login, so each phone has its own home. A new device starts with Restock;
   a device that used Studio before pins came keeps its Start-from-a-photo tools, so those stay one tap away. ---------- */
const PINS_KEY='studio:pins', DEFAULT_PINS=['restock'];
function usedBefore(){ try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i)||''; if(k.startsWith('studio:')&&!/^studio:(look|pins|recentSearches|welcome)$/.test(k)) return true; } }catch(_){} return false; }
function getPins(){ let p=store(PINS_KEY);
  if(!Array.isArray(p)){ p=usedBefore()?Object.keys(TOOLS).filter(id=>TOOLS[id].quick&&TOOLS[id].qi<=3):DEFAULT_PINS; store(PINS_KEY,p); }
  return p.filter(id=>TOOLS[id]); }
/* pins keep the order you set: a new pin goes last; in All tools the pinned tools sit on top and you drag them into order (since 1.5.0) */
function setPin(id,on){ const p=getPins().filter(t=>t!==id); if(on) p.push(id); store(PINS_KEY,p); return !!on; }
function movePin(id,to){ const p=getPins(), i=p.indexOf(id); if(i<0) return p; to=Math.max(0,Math.min(p.length-1,to)); if(to!==i){ p.splice(i,1); p.splice(to,0,id); store(PINS_KEY,p); } return p; }

/* ---------- the look: motion, soft depth and one bold accent (the "fresh look", the default for everyone since 0.7.0) ---------- */
const fresh=()=>true;
/* smooth page changes: pages fade into each other where the browser can (cross-page view transitions: each page's <head> opts in
   with @view-transition, it has to be in the HTML); elsewhere the new page fades in */
(function(){ try{ localStorage.removeItem('studio:look'); }catch(_){}   // the old per-device preview switch
  document.documentElement.classList.toggle('no-vt',!('onpagereveal' in window)); })();
/* haptics: a short buzz on Android; on iPhone (iOS 18+) the system switch tick, which is the only haptic Safari allows */
let hapEl=null;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function haptic(kind){
  try{ if(navigator.vibrate){ navigator.vibrate(kind==='success'?[12,70,22]:kind==='warn'?[30,60,30]:8); return; } }catch(_){}
  if(!isIOS()) return;
  if(!hapEl){ hapEl=document.createElement('label'); hapEl.setAttribute('aria-hidden','true'); hapEl.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'; hapEl.innerHTML='<input type="checkbox" switch tabindex="-1">'; document.body.appendChild(hapEl); }
  hapEl.click(); if(kind==='success') setTimeout(()=>hapEl&&hapEl.click(),110); }
/* a satisfying "saved": a check that pops over the preview with a soft ring, plus a haptic */
function celebrate(){ haptic('success');
  const host=document.querySelector('.phone')||document.querySelector('.cr-stage')||document.body, b=document.createElement('div');
  b.className='save-burst'+(host===document.body?' fixed':''); b.setAttribute('aria-hidden','true'); b.innerHTML='<span class="sb-ring"></span><span class="sb-dot"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>';
  host.appendChild(b); setTimeout(()=>b.remove(),1500); }

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
  camera:svg('<path d="M14.5 4h-5L7.5 6.5H5A2 2 0 0 0 3 8.5v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2.5z"/><circle cx="12" cy="13" r="3.5"/>'),
  undo:svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo:svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  photo:svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  text:svg('<path d="M4 7V5h16v2"/><path d="M9 19h6"/><path d="M12 5v14"/>'),
  style:svg('<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6c0-4.9-4.5-8.6-10-8.6z"/>'),
  layers:svg('<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>'),
  download:svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
  share:svg('<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  bookmark:svg('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',20),
  check:svg('<path d="M20 6 9 17l-5-5"/>',24),
  rotate:svg('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',20),
  size:svg('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',20),
  drop:svg('<path d="M12 2.7s6 6.4 6 11.3a6 6 0 0 1-12 0c0-4.9 6-11.3 6-11.3z"/>',20),
  font:svg('<path d="M4 20 10 4h1l6 16"/><path d="M6.5 14h8"/><path d="M17 20h4"/>',20),
  grid:svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',20),
  more:svg('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',20),
  magnet:svg('<path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/>',18),
  plus:svg('<path d="M12 5v14M5 12h14"/>'),
  shapes:svg('<circle cx="7.5" cy="7.5" r="4.5"/><rect x="12" y="12" width="9" height="9" rx="2"/>',20),
  back:svg('<path d="m15 18-6-6 6-6"/>'),
  close:svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  next:svg('<path d="m9 18 6-6-6-6"/>'),
  trash:svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>',20),
  search:svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',20),
  star:svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',22),
  starFill:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',18),
  sparkle:svg('<path d="M10 3.5l1.6 4.4L16 9.5l-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>',20),
  template:svg('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18"/><path d="M9 9v12"/>',20),
  user:svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',20),
  look:svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',20),
  lab:svg('<path d="M9 3h6"/><path d="M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',20),
  install:svg('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7v7"/><path d="m9 11 3 3 3-3"/>',20),
  home:svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  folder:svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',18),
  paint:svg('<rect x="2" y="2" width="16" height="6" rx="2"/><path d="M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="8" y="16" width="4" height="6" rx="1"/>',20),
  copy:svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',20),
  pencil:svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',20),
  list:svg('<rect x="3" y="4" width="5" height="5" rx="1"/><path d="M11 6.5h10"/><rect x="3" y="15" width="5" height="5" rx="1"/><path d="M11 17.5h10"/>',20),
  move:svg('<path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/>',20),
  grip:svg('<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',22),
  sort:svg('<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',18),
  up:svg('<path d="m18 15-6-6-6 6"/>',22), down:svg('<path d="m6 9 6 6 6-6"/>',22),
  flip:svg('<path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/>',20),
  centerX:svg('<path d="M12 2v20"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="7" y="14" width="10" height="4" rx="1"/>',20),
  centerY:svg('<path d="M2 12h20"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="7" width="4" height="10" rx="1"/>',20),
  /* one icon per photo tool, so the + menu and the welcome tell them apart */
  restock:svg('<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>'),
  story:svg('<rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="14.5" cy="7.5" r="1.5"/><path d="m5 17 4.5-4.5 3 3 2-2L19 18"/>'),
  carousel:svg('<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M2 5v14"/><path d="M22 5v14"/>'),
  highlight:svg('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/>'),
  collage:svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  settings:svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  play:svg('<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',20),
  swap:svg('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',18),
  shuffle:svg('<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h2a4 4 0 0 0 3.3-1.7l5.4-8.6A4 4 0 0 1 16 6h6"/><path d="M2 6h2a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6a4 4 0 0 1-3.3-1.8l-.4-.4"/>',18)
};

/* ---------- assets: brand files (logo, can cut-outs, stickers) from the brand kit + built-in shapes ----------
   Shapes are drawn in a 200×200 box (or the size given) so they stay sharp at any size and take any brand colour. */
const SHAPES=[
  {id:'shape:panel',label:'Rounded panel',w:860,h:900,free:true,radius:56,color:'panel',path(c,w,h,r){ rr(c,0,0,w,h,r); }},
  {id:'shape:rect',label:'Rectangle',w:400,h:300,free:true,radius:0,path(c,w,h,r){ rr(c,0,0,w,h,r); }},
  {id:'shape:organic',label:'Blob',w:600,h:520,color:'blob',path(c){ c.moveTo(318,12); c.bezierCurveTo(452,0,588,92,598,236); c.bezierCurveTo(608,372,520,506,360,516); c.bezierCurveTo(214,526,40,470,8,326); c.bezierCurveTo(-22,186,120,24,318,12); c.closePath(); }},
  {id:'shape:circle',label:'Circle',w:200,h:200,path(c){ c.arc(100,100,100,0,Math.PI*2); }},
  {id:'shape:blob',label:'Soft box',w:240,h:200,radius:70,path(c,w,h,r){ rr(c,0,0,240,200,r); }},
  {id:'shape:badge',label:'Badge',w:200,h:200,path(c){ for(let i=0;i<32;i++){ const a=i/32*Math.PI*2-Math.PI/2, r=i%2?86:100; c.lineTo(100+Math.cos(a)*r,100+Math.sin(a)*r); } c.closePath(); }},
  {id:'shape:ring',label:'Ring',w:200,h:200,path(c){ c.arc(100,100,100,0,Math.PI*2); c.moveTo(184,100); c.arc(100,100,84,0,Math.PI*2,true); }},
  {id:'shape:arrow',label:'Arrow',w:240,h:120,path(c){ c.moveTo(0,46); c.lineTo(160,46); c.lineTo(160,8); c.lineTo(240,60); c.lineTo(160,112); c.lineTo(160,74); c.lineTo(0,74); c.closePath(); }},
  {id:'shape:underline',label:'Underline',w:300,h:40,line:14,path(c){ c.moveTo(6,30); c.quadraticCurveTo(150,-6,294,24); }},
  {id:'shape:sparkle',label:'Sparkle',w:200,h:200,path(c){ c.moveTo(100,0); c.quadraticCurveTo(112,88,200,100); c.quadraticCurveTo(112,112,100,200); c.quadraticCurveTo(88,112,0,100); c.quadraticCurveTo(88,88,100,0); c.closePath(); }},
  {id:'shape:line',label:'Line',w:300,h:12,radius:6,path(c,w,h,r){ rr(c,0,0,300,12,r); }}
];
/* draw a shape filling a w×h box: fill colour ('none' = no fill), optional outline colour + width, corner radius */
function drawShape(c,a,w,h,fill,o){
  o=o||{}; const r=o.r!=null?o.r:(a.radius||0);
  if(a.draw){ c.save(); c.scale(w/a.w,h/a.h); a.draw(c,fill&&fill!=='none'?fill:'#000'); c.restore(); return; }   // a sticker (assets/stickers.js)
  c.save(); c.beginPath();
  if(a.free) a.path(c,w,h,r); else { c.scale(w/a.w,h/a.h); a.path(c,a.w,a.h,r); }
  c.restore();
  if(a.line){ c.lineWidth=a.line*w/a.w; c.lineCap='round'; c.strokeStyle=fill&&fill!=='none'?fill:'#000'; c.stroke(); return; }
  if(fill&&fill!=='none'){ c.fillStyle=fill; c.fill(); }
  if(o.stroke&&o.sw>0){ c.lineWidth=o.sw; c.lineJoin='round'; c.strokeStyle=o.stroke; c.stroke(); }
}
const ASSET_IMG=new Map();   // ref -> {img} | {missing:true} | Promise
function brandAssets(){ return (BRAND&&BRAND.assets)||[]; }
const stickerList=()=>window.STUDIO_STICKERS||[];   // assets/stickers.js, loaded by tool()
function assetDef(ref){ return SHAPES.find(x=>x.id===ref)||(String(ref).startsWith('sticker:')&&stickerList().find(x=>x.id===ref))||brandAssets().find(x=>x.id===ref)||null; }
function assetUrl(a){ return BRAND.base+a.file; }
function assetPrevUrl(a){ return BRAND.base+(a.prev||a.file); }   // light copy for tiles and previews (falls back to the HD file)
function loadAsset(ref){
  const hit=ASSET_IMG.get(ref); if(hit) return hit.then?hit:Promise.resolve(hit);
  const a=assetDef(ref); if(!a||!a.file){ return Promise.resolve(null); }
  const hd=()=>load(assetUrl(a)).then(img=>{ const v={img,hd:true}; ASSET_IMG.set(ref,v); return v; }).catch(()=>{ const v={missing:true}; ASSET_IMG.set(ref,v); return v; });
  /* a light copy first (a.prev) so the can shows at once; the HD file loads behind it and takes over. Saving waits for it. */
  const p=a.prev?load(assetPrevUrl(a)).then(img=>{ const v={img,hd:false}; ASSET_IMG.set(ref,v);
      ASSET_HD.set(ref,hd().then(h=>{ if(h&&h.missing) ASSET_IMG.set(ref,v); else if(onAssetLoad) onAssetLoad(); return h; })); return v; }).catch(hd):hd();
  ASSET_IMG.set(ref,p); return p;
}
const ASSET_HD=new Map();   // ref -> promise of the HD file (only for assets that have a light copy)
const assetsHD=()=>Promise.all([...ASSET_HD.values()]);
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

/* ---------- drafts: unfinished stories kept on this phone, a LIST per tool ----------
   Each draft: localStorage 'studio:draft:<brand>:<tool>:<id>' = {json,keys,at,pfx}; its photos in IndexedDB under
   '<pfx>:<photo key>' (pfx = the draft's own key; drafts moved from the old single slot keep their old prefix) and its
   preview under '<key>:thumb'. A draft is only ever removed by the person (✕ in Continue editing) or after a team save. */
const DRAFT_CAP=20;   // more than this per tool: a warning (never silent loss)
const draftBase=(brand,tool)=>'studio:draft:'+brand+':'+tool;
function migrateDraft(brand,tool){
  const old=draftBase(brand,tool), d=store(old); if(!d) return;
  if(d.json){ const key=old+':m'+(d.at||Date.now()).toString(36); if(!store(key)&&store(key,{...d,pfx:d.pfx||old})===null) return; }   // no room: keep the old slot
  store(old,null);
}
function listDrafts(brand,tool){
  migrateDraft(brand,tool); const pre=draftBase(brand,tool)+':', out=[];
  try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(!k||!k.startsWith(pre)) continue; const id=k.slice(pre.length); if(!id||id.includes(':')) continue; const d=store(k); if(d&&(d.json||d.board)) out.push({key:k,id,tool,d}); } }catch(_){}
  return out.sort((a,b)=>(b.d.at||0)-(a.d.at||0));
}
function removeDraft(key){ const d=store(key); if(d){ const pfx=d.pfx||key; (d.keys||[]).forEach(k=>{ if(k) idb.del(pfx+':'+k); });
    if(d.board){ idb.del('board:'+d.board); idb.del('bthumb:'+d.board); (d.imgs||[]).forEach(i=>idb.del('bimg:'+i)); } }   // a Create draft: its canvas and photos
  idb.del(key+':thumb'); store(key,null); }
/* share files with the phone's share sheet: 'shared' | 'cancelled' | 'needtap' (needs a fresh tap) | false (not possible) */
async function shareFiles(files){
  if(!(navigator.canShare&&navigator.canShare({files}))) return false;
  try{ await navigator.share({files}); return 'shared'; }
  catch(err){ if(err&&err.name==='AbortError') return 'cancelled'; if(err&&err.name==='NotAllowedError') return 'needtap'; return false; }
}
async function draftThumbUrl(x){ return x.d.thumb||await idb.get(x.key+':thumb')||null; }

/* ---------- cloud (team saved designs) ---------- */
async function cloud(){
  if(!window.STUDIO_CONFIG) await loadScript(ROOT+'assets/config.js');
  if(!window.StudioCloud) await loadScript(ROOT+'assets/cloud.js');
  return window.StudioCloud;
}
/* One sign-in dialog for every page. Resolves true once the person is signed in AND on the team. */
/* scroll lock: while a pop-up, sheet or menu is open, the page behind it stays still (it used to scroll along with the pop-up's list).
   Several can be open at once (a confirm over a sheet), so each one holds its own key. */
const LOCKS=new Set();
function lockScroll(key,on){ if(on) LOCKS.add(key); else LOCKS.delete(key); document.documentElement.classList.toggle('scroll-lock',LOCKS.size>0); }
function dialog(html,cls){ const d=document.createElement('dialog'); d.className='dlg '+(cls||''); d.innerHTML=html; document.body.appendChild(d); d.addEventListener('close',()=>{ lockScroll(d,false); setTimeout(()=>d.remove(),50); }); d.showModal(); lockScroll(d,true);
  /* tapping the dimmed area outside closes it like Cancel; not while it's busy (buttons disabled = saving, deleting, signing in) */
  let downOutside=false;
  d.addEventListener('pointerdown',e=>{ downOutside=e.target===d&&outside(e); });
  d.addEventListener('click',e=>{ if(!downOutside||e.target!==d||!outside(e)) return; downOutside=false;
    const btns=[...d.querySelectorAll('button')].filter(b=>!b.hidden); if(btns.length&&btns.every(b=>b.disabled)) return;   // busy
    const ev=new Event('cancel',{cancelable:true}); d.dispatchEvent(ev); if(!ev.defaultPrevented) d.close(); });
  function outside(e){ const r=d.getBoundingClientRect(); return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom; }
  return d; }
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
  document.documentElement.style.setProperty('--brand-sans','"'+BRAND.fonts.body+'",system-ui,sans-serif');   // the interface keeps its own font (--sans)
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

/* ---------- photo looks: a few calm colour moods for a photo, drawn as blend layers over it (same result at any size,
   so the saved 2160×3840 picture matches the preview). fx = {look:'warm', light:-1…1}; kept per photo in the design. ---------- */
const PHOTO_LOOKS=[
  {id:'',label:'Original',ops:[]},
  {id:'bright',label:'Bright',ops:[['soft-light','#ffffff',.5],['screen','#ffffff',.08]]},
  {id:'warm',label:'Warm',ops:[['soft-light','#ffa75a',.38],['multiply','#fff2e0',.45]]},
  {id:'cool',label:'Cool',ops:[['soft-light','#4d94ff',.4],['multiply','#eef4ff',.4]]},
  {id:'vivid',label:'Vivid',ops:[['saturation','hsl(0,100%,50%)',.3],['soft-light','#ffffff',.18]]},
  {id:'mono',label:'B&W',ops:[['saturation','#808080',1],['soft-light','#000000',.15]]},
  {id:'soft',label:'Soft',ops:[['saturation','#808080',.3],['screen','#4a3b30',.35]]}
];
function photoFx(ctx,fx,x,y,w,h){
  if(!fx) return; const L=PHOTO_LOOKS.find(l=>l.id===(fx.look||''))||PHOTO_LOOKS[0], v=+fx.light||0;
  const ops=L.ops.slice(); if(v>0) ops.push(['soft-light','#ffffff',v*.6],['screen','#ffffff',v*.08]); if(v<0) ops.push(['soft-light','#000000',-v*.55],['source-over','#000000',-v*.1]);
  if(!ops.length) return;
  ctx.save(); ops.forEach(([m,c,a])=>{ ctx.globalCompositeOperation=m; ctx.globalAlpha=a; ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }); ctx.restore();
}
const hasFx=fx=>!!fx&&(!!fx.look||!!+fx.light);

/* ---------- drawing helpers handed to each tool ----------
   Every text, button, place line and logo is a LAYER with an id. The tool says where it goes by default;
   the person can then drag it, resize it, recolour it or hide it, and the change is kept as an offset. */
let onAssetLoad=null;
/* Flip (mirror left to right): only for pictures, stickers and shapes. Words are never mirrored: text, buttons, the logo
   (a tinted asset) and any brand asset marked noFlip:true keep their way round even if a recipe says flip. */
const canFlip=b=>!!b&&(b.kind==='asset'||b.kind==='sticker'||b.kind==='shape')&&!b.noFlip;
const BLURS=new WeakMap();   // photo -> blurred tiny copies for h.backdrop
function makeHelpers(ctx,S,preview,reg,scale,off,perPage){
  off=off||0;   // first photo of the current page (carousels)
  const ix=(i,opt)=>opt&&opt.page!=null?opt.page*(perPage||1)+i:off+i;   // opt.page: a photo from another slide (panoramas)
  const B=BRAND, C=B.colors, dir=B.dir||'ltr';
  const L=id=>S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false});
  function fitSize(text,size,weight,family,maxW){ let s=size; for(;;){ ctx.font=(weight?weight+' ':'')+s+'px "'+family+'"'; if(ctx.measureText(text).width<=maxW||s<=24) return s; s-=2; } }
  function box(m,size){ return {a:m.actualBoundingBoxAscent||size*.75, d:m.actualBoundingBoxDescent||size*.25}; }
  /* place a layer: compute its default box, apply the person's offset/scale, draw it, remember it for picking */
  function layer(id,label,bx,draw,opt){
    const l=L(id); const cx=bx.x+bx.w/2+l.dx, cy=bx.y+bx.h/2+l.dy, k=l.k;
    if(l.hidden){ reg.push({id,label,hidden:true,...opt}); return; }
    const rot=(l.rot||0)*Math.PI/180;   // rotation in degrees, around the layer's centre
    const fl=l.flip&&canFlip(opt)?-1:1;   // flip: mirrored in the layer's own frame, so it turns the same way after
    ctx.save(); if(l.op!=null&&l.op<1) ctx.globalAlpha*=Math.max(0,l.op); ctx.translate(cx,cy); if(rot) ctx.rotate(rot); ctx.scale(k*fl,k); ctx.translate(-bx.w/2,-bx.h/2); draw(l.color); ctx.restore();
    const rw=bx.w*k, rh=bx.h*k, c=Math.abs(Math.cos(rot)), s=Math.abs(Math.sin(rot)), ew=rw*c+rh*s, eh=rw*s+rh*c;   // box around the turned layer
    reg.push({id,label,x:cx-ew/2,y:cy-eh/2,w:ew,h:eh,cx,cy,rw,rh,rot,...opt});
  }
  const h={W,H,ctx,rr,brand:B,C,dir,isLight,
    phrase(key){ return (B.phrases&&B.phrases[key])||''; },
    photoAspect(i,opt){const p=S.photos[ix(i,opt)];return p&&p.img?p.img.width/p.img.height:1.5;},
    photo(i,x,y,w,hh,opt){
      opt=opt||{}; const p=S.photos[ix(i,opt)], rot=(opt.rot||0)*Math.PI/180;   // rot: degrees, around the box centre
      ctx.save(); if(rot){ ctx.translate(x+w/2,y+hh/2); ctx.rotate(rot); ctx.translate(-x-w/2,-y-hh/2); } ctx.beginPath(); rr(ctx,x,y,w,hh,opt.r||0); ctx.clip();
      if(p&&p.img){
        const im=p.img, mode=opt.mode||'cover';
        const base=mode==='contain'?Math.min(w/im.width,hh/im.height):Math.max(w/im.width,hh/im.height);
        const sc=base*(mode==='contain'?1:p.zoom), dw=im.width*sc, dh=im.height*sc;
        const mx=Math.max(0,(dw-w)/2), my=Math.max(0,(dh-hh)/2);
        p.ox=Math.max(-mx,Math.min(mx,p.ox)); p.oy=Math.max(-my,Math.min(my,p.oy));
        ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
        ctx.drawImage(preview?prev(im):sharp(im,dw*scale,dh*scale),x+w/2+p.ox-dw/2,y+hh/2+p.oy-dh/2,dw,dh);
        if(hasFx(p.fx)) photoFx(ctx,p.fx,x+w/2+p.ox-dw/2,y+hh/2+p.oy-dh/2,dw,dh);
      } else if(preview){
        ctx.fillStyle='#d8d6d1'; ctx.fillRect(x,y,w,hh); ctx.fillStyle='#8b8882'; ctx.font='800 '+Math.max(28,Math.min(56,w/8))+'px "'+B.fonts.body+'"'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('+',x+w/2,y+hh/2);
      }
      ctx.restore();
      /* opt.pad: the frame drawn around the photo counts as the photo for taps and drops (a Collage border) */
      const pad=Math.max(0,opt.pad||0);
      if(rot){ const c=Math.abs(Math.cos(rot)), sn=Math.abs(Math.sin(rot)), ew=w*c+hh*sn, eh=w*sn+hh*c; reg.push({photo:ix(i,opt),x:x+w/2-ew/2,y:y+hh/2-eh/2,w:ew,h:eh,mode:opt.mode||'cover',pad}); }
      else reg.push({photo:ix(i,opt),x,y,w,h:hh,mode:opt.mode||'cover',pad});
    },
    /* the same photo, soft-blurred and dimmed, as a backdrop (a wide photo shown whole on top of it). The blur is a tiny copy
       scaled up, so it looks the same on every phone (Safari has no canvas blur filter) and at any save size. Not a layer. */
    backdrop(i,x,y,w,hh,opt){
      opt=opt||{}; const p=S.photos[ix(i,opt)];
      if(!p||!p.img){ if(preview){ ctx.fillStyle='#d8d6d1'; ctx.fillRect(x,y,w,hh); } return; }
      const sw=Math.max(8,Math.round(w/(opt.blur||28))), sh=Math.max(8,Math.round(hh/(opt.blur||28)));
      let m=BLURS.get(p.img); if(!m){ m={}; BLURS.set(p.img,m); } const key=sw+'x'+sh;
      if(!m[key]){ const im=prev(p.img), k=Math.max(sw/im.width,sh/im.height), mid=document.createElement('canvas'), c=document.createElement('canvas');
        mid.width=sw*4; mid.height=sh*4; const mx=mid.getContext('2d'); mx.imageSmoothingQuality='high'; mx.drawImage(im,(mid.width-im.width*k*4)/2,(mid.height-im.height*k*4)/2,im.width*k*4,im.height*k*4);
        c.width=sw; c.height=sh; const cx=c.getContext('2d'); cx.imageSmoothingQuality='high'; cx.drawImage(mid,0,0,sw,sh); mid.width=mid.height=0; m[key]=c; }
      ctx.save(); ctx.beginPath(); rr(ctx,x,y,w,hh,opt.r||0); ctx.clip(); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
      const pad=Math.max(w,hh)*.06; ctx.drawImage(m[key],x-pad,y-pad,w+pad*2,hh+pad*2);   // a little bigger: no soft edge at the border
      if(hasFx(p.fx)) photoFx(ctx,p.fx,x,y,w,hh);
      if(opt.dim) { ctx.fillStyle='rgba(0,0,0,'+opt.dim+')'; ctx.fillRect(x,y,w,hh); }
      ctx.restore();
    },
    logoH(w){return w*LOGO.height/LOGO.width;},
    /* logo layer; tone 'dark' or 'light' */
    logo(x,y,w,tone,id){
      id=id||'logo'; const hh=h.logoH(w);
      layer(id,'Logo',{x,y,w,h:hh},color=>{ if(color&&color[0]==='#'){ ctx.drawImage(tinted(LOGO,color),0,0,w,hh); return; } const t=color?(color==='light'?'light':'dark'):tone; ctx.drawImage(t==='light'?LOGO_LIGHT:LOGO,0,0,w,hh); },{kind:'logo'});
      return L(id).hidden?0:hh;
    },
    measure(str,o){o=o||{}; const fam=o.font==='display'?B.fonts.display:B.fonts.body; const size=fitSize(str,o.size||40,o.weight||'',fam,o.maxW||936); const m=ctx.measureText(str), b=box(m,size); return {w:m.width,h:b.a+b.d,size};},
    /* text layer; align 'center' | 'start' | 'end' relative to x (start = right side in Arabic) */
    text(id,label,str,x,y,o){
      o=o||{}; if(!str) { reg.push({id,label,empty:true}); return 0; }
      const l=L(id), ff=l.font&&fontInfo(l.font);
      const fam=ff?ff.family:(o.font==='display'?B.fonts.display:B.fonts.body), wt=ff?ff.wt:(o.weight||'');
      const lines=String(str).split('\n'), ls=LS_OK&&l.ls?l.ls:0;   // ls: letter spacing in px (only where the browser supports it)
      const setLS=v=>{ if(LS_OK) ctx.letterSpacing=(v||0)+'px'; };
      setLS(ls);
      const size=Math.min(...lines.map(t=>fitSize(t||' ',o.size||40,wt,fam,o.maxW||936)));
      ctx.font=(wt?wt+' ':'')+size+'px "'+fam+'"';
      const ms=lines.map(t=>ctx.measureText(t||' ')), b=box(ms[0],size), bl=box(ms[ms.length-1],size);
      setLS(0);
      const adv=size*(l.lh||1.2), tw=Math.ceil(Math.max(...ms.map(m=>m.width))), th=Math.ceil(b.a+(lines.length-1)*adv+bl.d);
      const al=o.align||'center'; const rightish=(al==='start'&&dir==='rtl')||(al==='end'&&dir!=='rtl');
      const lineAl=l.align||(al==='center'?'center':rightish?'right':'left');
      const pill=l.bg&&l.bg!=='none'?l.bg:null, px=pill?Math.round(size*.5):0, py=pill?Math.round(size*.28):0;
      const bx=al==='center'?x-tw/2:(rightish?x-tw:x);
      const shadow=l.shadow!=null?l.shadow:o.shadow;
      layer(id,label,{x:bx-px,y:y-py,w:tw+px*2,h:th+py*2},color=>{
        if(pill){ ctx.fillStyle=pill; ctx.beginPath(); rr(ctx,0,0,tw+px*2,th+py*2,lines.length>1?size*.5:(th+py*2)/2); ctx.fill(); }
        ctx.font=(wt?wt+' ':'')+size+'px "'+fam+'"'; ctx.direction=dir; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.fillStyle=color||o.color||C.ink; setLS(ls);
        if(shadow){ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=24;ctx.shadowOffsetY=2;}
        lines.forEach((t,i)=>{ const w=ms[i].width, lx=lineAl==='center'?(tw-w)/2:lineAl==='right'?tw-w:0; ctx.fillText(t,px+lx,py+b.a+i*adv); });
        setLS(0);
      },{kind:'text',typ:true,shadow:!!o.shadow});
      return l.hidden?0:th;
    },
    /* rounded button layer */
    pill(id,label,str,cx,y,o){
      o=o||{}; if(!str){ reg.push({id,label,empty:true}); return 0; } str=String(str).replace(/\n/g,' ');
      const ff=L(id).font&&fontInfo(L(id).font), pf=ff?((ff.wt?ff.wt+' ':'')+(o.size||36)+'px "'+ff.family+'"'):('800 '+(o.size||36)+'px "'+B.fonts.body+'"');
      ctx.font=pf; const m=ctx.measureText(str), ph=o.h||76, ic=o.icon?Math.round((o.size||36)*.95):0, ig=ic?14:0, pw=Math.ceil(m.width)+ic+ig+(o.pad||88), b=box(m,o.size||36);
      layer(id,label,{x:cx-pw/2,y,w:pw,h:ph},color=>{
        const bg=color||o.bg||C.ink, fg=color?(isLight(color)?C.ink:C.paper):(o.fg||C.paper); ctx.fillStyle=bg; ctx.beginPath(); rr(ctx,0,0,pw,ph,ph/2); ctx.fill();
        const tw=Math.ceil(m.width), x0=(pw-tw-ic-ig)/2, textX=dir==='rtl'?x0:x0+ic+ig, icX=dir==='rtl'?x0+tw+ig:x0;
        ctx.font=pf; ctx.direction=dir; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.fillStyle=fg; ctx.fillText(str,textX,ph/2+(b.a-b.d)/2);
        if(ic) glyph(ctx,o.icon,icX,(ph-ic)/2,ic,fg);
      },{kind:'pill'});
      return L(id).hidden?0:ph;
    },
    /* place name with a map pin centred on the letters */
    pin(id,label,str,cx,y,o){
      o=o||{}; if(!str){ reg.push({id,label,empty:true}); return 0; } str=String(str).replace(/\n/g,' ');
      const ff=L(id).font&&fontInfo(L(id).font), fam=ff?ff.family:B.fonts.body, pw8=ff?ff.wt:'800';
      const fs=fitSize(str,o.size||44,pw8,fam,o.maxW||860), m=ctx.measureText(str), b=box(m,fs);
      const pinH=Math.round(fs*.9), kk=pinH/224, pinW=o.icon&&o.icon!=='pin'?pinH:176*kk, gap=14, tw=Math.ceil(m.width), tot=tw+gap+pinW, th=Math.ceil(b.a+b.d);
      layer(id,label,{x:cx-tot/2,y,w:tot,h:th},color=>{
        ctx.font=(pw8?pw8+' ':'')+fs+'px "'+fam+'"'; ctx.direction=dir; ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle=color||o.color||C.muted;
        const textX=dir==='rtl'?0:pinW+gap, pinX=dir==='rtl'?tw+gap:0;
        ctx.fillText(str,textX,b.a);
        const mid=b.a-(b.a-b.d)/2; if(o.icon&&o.icon!=='pin'){ glyph(ctx,o.icon,pinX,mid-pinH/2,pinH,ctx.fillStyle); return; } ctx.translate(pinX-40*kk,mid-pinH/2-16*kk); ctx.scale(kk,kk); ctx.fill(PIN);
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
          const k=L(x.id).k; const c=color||x.color; const base=preview?prev(im):im;
          let src=a.tint&&c?tinted(base,c):base;
          ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
          ctx.drawImage(preview?src:sharp(src,x.w*k*scale,hh*k*scale),0,0,x.w,hh);
        },{kind:'asset',noFlip:!!(a.tint||a.noFlip)});
      } else {
        const sw=x.w, sh=a.free&&x.h?x.h:x.w*a.h/a.w;
        layer(x.id,a.label,{x:x.x-sw/2,y:x.y-sh/2,w:sw,h:sh},color=>drawShape(ctx,a,sw,sh,color||x.color||C.ink,{r:x.r,stroke:x.stroke,sw:x.sw}),{kind:a.sticker?'sticker':'asset'});
      }
    },
    /* numbers in the brand's digits (Arabic brands write ٢٠٪, not 20%) */
    digits(str){ str=String(str??''); if(B.digits!=='arabic') return str; return str.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]).replace(/%/g,'٪').replace(/,/g,'،'); },
    /* a row of small pills (e.g. flavours) as one layer; items: [{text,bg,fg,line}] */
    tags(id,label,items,cx,y,o){
      o=o||{}; items=(items||[]).filter(t=>t&&t.text); if(!items.length){ reg.push({id,label,empty:true}); return 0; }
      const tf=L(id).font&&fontInfo(L(id).font), size=o.size||34, ph=o.h||70, pad=o.pad||56, gap=o.gap||18, font=tf?(tf.wt?tf.wt+' ':'')+size+'px "'+tf.family+'"':'800 '+size+'px "'+B.fonts.body+'"';
      ctx.font=font; const ws=items.map(t=>Math.ceil(ctx.measureText(t.text).width)+pad), tot=ws.reduce((a,b)=>a+b,0)+gap*(items.length-1), b0=box(ctx.measureText(items[0].text),size);
      layer(id,label,{x:cx-tot/2,y,w:tot,h:ph},color=>{
        let x=0; const order=dir==='rtl'?items.map((t,i)=>i).reverse():items.map((t,i)=>i);
        order.forEach(i=>{ const t=items[i], w=ws[i]; ctx.beginPath(); rr(ctx,x,0,w,ph,ph/2);
          if(t.line){ ctx.lineWidth=4; ctx.strokeStyle=color||t.line; ctx.stroke(); } else { ctx.fillStyle=color||t.bg||C.ink; ctx.fill(); }
          ctx.font=font; ctx.direction=dir; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillStyle=t.line?(color||t.fg||t.line):color?(isLight(color)?C.ink:C.paper):(t.fg||C.paper); ctx.fillText(t.text,x+w/2,ph/2+(b0.a-b0.d)/2); x+=w+gap; });
      },{kind:'text'});
      return L(id).hidden?0:ph;
    },
    /* a custom layer drawn by the tool: draw(ctx,color) works in a box from (0,0) to (w,h) */
    block(id,label,x,y,w,hh,draw,kind){ layer(id,label,{x,y,w,h:hh},color=>draw(ctx,color),{kind:kind||'text'}); return L(id).hidden?0:hh; },
    /* an offer tile: a small top line and a big line (numbers in the brand's digits) on a rounded tile */
    tile(id,label,small,big,cx,y,o){
      o=o||{}; small=h.digits(small||''); big=h.digits(big||''); if(!small&&!big){ reg.push({id,label,empty:true}); return 0; }
      const tw=o.w||400, th=o.h||260, tf=L(id).font&&fontInfo(L(id).font);
      layer(id,label,{x:cx-tw/2,y,w:tw,h:th},color=>{
        const bg=color||o.bg||C.ink, dk=!isLight(bg); ctx.fillStyle=bg; ctx.beginPath(); rr(ctx,0,0,tw,th,40); ctx.fill();
        ctx.direction=dir; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
        if(small){ ctx.font='800 44px "'+B.fonts.body+'"'; ctx.fillStyle=o.smallColor||(dk?(C.cream||C.paper):C.ink); ctx.fillText(small,tw/2,big?78:th/2+16,tw-40); }
        if(big){ const fam=tf?tf.family:B.fonts.display, wt=tf&&tf.wt?tf.wt+' ':''; let fs=150; ctx.font=wt+fs+'px "'+fam+'"'; while(ctx.measureText(big).width>tw-44&&fs>60){ fs-=6; ctx.font=wt+fs+'px "'+fam+'"'; }
          ctx.fillStyle=o.bigColor||(dk?(C.accent||C.paper):C.ink); ctx.fillText(big,tw/2,small?th-46:th/2+fs*.36); }
      },{kind:'pill'});
      return L(id).hidden?0:th;
    },
    /* page dots for carousels: n dots, i = current. Always left to right, like Instagram's own swipe. */
    dots(n,i,cx,y,color,dim){ if(n<2) return; const r=9, g=26, tot=(n-1)*g; for(let k=0;k<n;k++){ const kk=k; ctx.beginPath(); ctx.arc(cx-tot/2+kk*g,y,k===i?r:r*.72,0,Math.PI*2); ctx.fillStyle=k===i?color:dim; ctx.fill(); } },
    shade(y0,y1,a0,a1){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(0,0,0,'+a0+')');g.addColorStop(1,'rgba(0,0,0,'+a1+')');ctx.fillStyle=g;ctx.fillRect(0,Math.min(y0,y1),W,Math.abs(y1-y0));}
  };
  return h;
}
/* small icons drawn on the canvas in a size×size box: 'pin' (map pin), 'insta' (Instagram) */
function glyph(c,kind,x,y,size,color){
  c.save(); c.translate(x,y);
  if(kind==='insta'){ const k=size/24; c.scale(k,k); c.strokeStyle=color; c.fillStyle=color; c.lineWidth=2.2; c.beginPath(); rr(c,2.5,2.5,19,19,5.5); c.stroke(); c.beginPath(); c.arc(12,12,4.4,0,Math.PI*2); c.stroke(); c.beginPath(); c.arc(17.4,6.6,1.3,0,Math.PI*2); c.fill(); }
  else { const k=size/224; c.translate((size-176*k)/2-40*k,-16*k); c.scale(k,k); c.fillStyle=color; c.fill(PIN); }
  c.restore();
}
/* ---------- one brand palette for every colour picker (text, pills, shapes, backgrounds, collage gaps) ----------
   key: what the picker sets; cur: the current colour ('' = Auto/Original, 'none' = no colour, or #hex);
   opt.auto: label of the "use the default" swatch (omit for none); opt.none: offer "None" (no fill / no outline). */
function brandPalette(){ const C=BRAND.colors; return BRAND.palette&&BRAND.palette.length?BRAND.palette:[['White',C.paper],['Ink',C.ink],['Gold',C.accent],['Cream',C.cream],['Grey',C.muted]].filter(x=>x[1]).map(([name,hex])=>({name,hex})); }
const normHex=v=>{ v=String(v||'').trim(); if(!v) return ''; if(v==='none') return v; if(v[0]!=='#') v='#'+v; if(/^#[0-9a-f]{3}$/i.test(v)) v='#'+v.slice(1).split('').map(c=>c+c).join(''); return /^#[0-9a-f]{6}$/i.test(v)?v.toUpperCase():null; };
/* recent colours: the last custom colours picked (not already brand swatches), kept on this phone per brand */
const RECENT_N=6;
function recentColours(){ const pal=brandPalette().map(p=>p.hex.toUpperCase()); return (store('studio:recent-colours:'+(BRAND&&BRAND.id))||[]).filter(h=>!pal.includes(h)).slice(0,RECENT_N); }
function addRecentColour(hex){ hex=normHex(hex); if(!hex||hex==='none'||!BRAND) return; if(brandPalette().some(p=>p.hex.toUpperCase()===hex)) return;
  const k='studio:recent-colours:'+BRAND.id; store(k,[hex,...(store(k)||[]).filter(h=>h!==hex)].slice(0,RECENT_N)); }
function palettePicker(key,cur,opt){
  opt=opt||{}; cur=cur==null?'':String(cur); const pal=brandPalette(), up=cur.toUpperCase(), custom=cur&&cur!=='none'&&!pal.some(p=>p.hex.toUpperCase()===up);
  const b=(v,name,bg,inner)=>`<button type="button" class="sw-btn" data-c="${esc(v)}" aria-pressed="${String(v===''?cur==='':v==='none'?cur==='none':!custom&&v.toUpperCase()===up)}" aria-label="${esc(name)}" title="${esc(name)}"${bg?` style="background:${bg}"`:''}>${inner||''}</button>`;
  const rec=recentColours(), recHit=custom&&rec.includes(up);
  return `<div class="pal" data-pal="${esc(key)}" role="group">${opt.auto?b('',opt.auto,'','A'):''}${opt.none?b('none','None','','<i class="sw-none" aria-hidden="true"></i>'):''}${pal.map(p=>b(p.hex,p.name,p.hex)).join('')}`
    +(rec.length?`<span class="sw-sep" aria-hidden="true"></span>`+rec.map(h=>`<button type="button" class="sw-btn sw-recent" data-c="${h}" aria-pressed="${String(recHit&&h===up)}" aria-label="Recent colour ${h}" title="Recent ${h}" style="background:${h}"></button>`).join(''):'')
    +`<label class="sw-btn sw-custom" title="Custom colour" aria-pressed="${custom}"${custom?` style="background:${esc(cur)}"`:''}><span class="sr-only">Custom colour</span><input type="color" data-cpick value="${custom?esc(cur):'#888888'}"></label>`
    +`<input type="text" class="hex" dir="ltr" data-chex maxlength="7" placeholder="#hex" aria-label="Custom colour (hex)" value="${custom?esc(cur):''}" spellcheck="false" autocomplete="off"></div>`;
}
/* one listener for every palette on the page: onPick(key,value) with value '' | 'none' | #HEX */
function wirePalettes(root,onPick){
  root.addEventListener('click',e=>{ const b=e.target.closest('[data-pal] [data-c]'); if(!b) return; onPick(b.closest('[data-pal]').dataset.pal,b.dataset.c); });
  root.addEventListener('input',e=>{ const t=e.target, pal=t.closest&&t.closest('[data-pal]'); if(!pal) return;
    if(t.matches('[data-cpick]')){ const v=normHex(t.value); pal.querySelector('[data-chex]').value=v; onPick(pal.dataset.pal,v); }
    else if(t.matches('[data-chex]')){ const v=normHex(t.value); if(v&&v!=='none'){ pal.querySelector('[data-cpick]').value=v; onPick(pal.dataset.pal,v); } } });
  root.addEventListener('change',e=>{ const t=e.target; if(t.closest&&t.closest('[data-pal]')&&t.matches('[data-cpick],[data-chex]')) addRecentColour(t.value); });
}
/* refresh which swatch is pressed without rebuilding (so an open colour picker isn't closed) */
function syncPalette(el,cur){ if(!el) return; cur=cur==null?'':String(cur); const up=cur.toUpperCase(); let hit=false;
  el.querySelectorAll('[data-c]').forEach(b=>{ const v=b.dataset.c, on=v===''?cur==='':v==='none'?cur==='none':v.toUpperCase()===up; if(on) hit=true; b.setAttribute('aria-pressed',String(on)); });
  const cu=el.querySelector('.sw-custom'), custom=!hit&&!!cur; cu.setAttribute('aria-pressed',String(custom)); cu.style.background=custom?cur:'';
  const hx=el.querySelector('[data-chex]'); if(custom&&document.activeElement!==hx) hx.value=cur; const cp=el.querySelector('[data-cpick]'); if(custom&&document.activeElement!==cp) cp.value=cur; }
function isLight(hex){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return false; const n=parseInt(m[1],16); return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>150; }

/* ---------- the tool page ---------- */
async function tool(cfg){
  const app=document.getElementById('app');
  app.innerHTML='<p class="hint" style="width:100%">Loading…</p>';
  if(/access_token|refresh_token|error_description/.test(location.hash)) cloud().then(c=>c.client());   // finishing an email sign-in link
  const stickersReady=window.STUDIO_STICKERS?Promise.resolve(true):loadScript(ROOT+'assets/stickers.js').then(()=>true,()=>false);   // loads alongside the brand
  const B=await useBrand();
  const hasStickers=await stickersReady;
  const opts=v=>typeof v==='function'?v(B):v;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const fields=(cfg.fields||[]).map(f=>({...f,options:opts(f.options),default:opts(f.default)}));
  if(cfg.size){ W=cfg.size.w; H=cfg.size.h; }
  const PG=cfg.pages||null;   // carousels: {min,max,start}
  const PN=Object.assign({one:'slide',many:'slides',set:'carousel'},cfg.pageNoun||{}), UC=t=>t.charAt(0).toUpperCase()+t.slice(1);   // what a page is called: a carousel's slide, a highlight cover
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
    if(f.type==='place') return d||'bottom-center';
    if(f.type==='note') return null;
    if(f.type==='range') return d??f.min??0;
    if(f.type==='color') return d??null;
    if(f.type==='dates'){ const t=today(); return {on:f.on!==false,from:iso(t),to:iso(new Date(t.getTime()+6*864e5))}; }
    return {text:d||'',on:f.on!==false};
  }
  function newPage(pg){ const v={}; fields.forEach(f=>{ v[f.id]=f.global&&S.P&&S.P.length?clone(S.P[0].values[f.id]):fieldDefault(f,pg); }); return {values:v,layers:{},extras:[]}; }
  S.P.push(newPage(0)); if(PG) for(let i=1;i<(PG.start||PG.min);i++) S.P.push(newPage(i));
  const KEY='studio:'+B.id+':'+cfg.id;
  const saved=store(KEY); if(saved){ if(saved.style&&cfg.styles&&cfg.styles.some(s=>s.id===saved.style))S.style=saved.style; if(saved.count&&!PG)S.count=Math.min(perPage,Math.max(minPhotos,saved.count)); if(!PG) Object.keys(saved.values||{}).forEach(k=>{ const f=fields.find(x=>x.id===k); if(f&&f.type!=='dates') S.values[k]=saved.values[k]; }); }
  /* settings marked global (carousel "All slides") are the same on every slide */
  function syncGlobals(){ if(!PG) return; fields.forEach(f=>{ if(f.global) S.P.forEach((pp,i)=>{ if(i!==S.page) pp.values[f.id]=clone(S.values[f.id]); }); }); }
  const remember=()=>{ syncGlobals(); store(KEY,PG?{style:S.style}:{style:S.style,count:S.count,values:S.values}); };

  /* ---- page ----
     Phone: the preview fills the screen, one bottom bar (Photo, Words, Style, Layers, Save) opens bottom sheets over it.
     Desktop: the same sheets show as cards beside the preview. One DOM, the CSS decides. */
  const wordFields=fields.filter(f=>f.in!=='style'), styleFields=fields.filter(f=>f.in==='style');
  const hasStyle=!!(cfg.styles||styleFields.length), hasWords=!!wordFields.length;
  const sheetHead=(id,title,n,done)=>`<header class="sheet-head"><span class="grab" aria-hidden="true"></span><h2 id="h-${id}">${n?`<span class="num">${n}</span>`:''}${esc(title)}</h2>${done!==false?`<button type="button" class="done" data-close="${id}">Done</button>`:''}</header>`;
  let step=1;
  const nav=document.querySelector('nav.top');
  if(nav){ nav.classList.add('tool-top');
    nav.insertAdjacentHTML('beforeend',`<span class="ttl" aria-hidden="true">${esc(cfg.title)}</span><div class="top-actions"><button type="button" class="icon-btn snap-btn" id="snapBtn" aria-pressed="false" aria-label="Snap to guides" title="Snap to guides">${ICON.magnet}<span aria-hidden="true">Snap</span></button><button type="button" class="icon-btn" id="undo" aria-label="Undo" title="Undo" disabled>${ICON.undo}</button><button type="button" class="icon-btn" id="redo" aria-label="Redo" title="Redo" disabled>${ICON.redo}</button></div>`); }
  let html=`<h1 class="page-title">${esc(cfg.title)}</h1>
  <div class="stage" id="stage">
    <div class="banner queue-bar" id="queueBar" role="region" aria-label="Photos still waiting" hidden><span id="queueTxt">Photos still waiting</span><span class="banner-btns"><button type="button" class="mini" id="queueClear">Clear</button><button type="button" class="mini queue-go" id="queueGo">Continue</button></span></div><div class="banner" id="draftBar" hidden><span id="draftTxt">You have an unfinished story here.</span><span class="banner-btns"><button type="button" class="mini" id="draftFresh">Start fresh</button><button type="button" class="mini solid" id="draftGo">Continue</button></span></div>
    <div class="phone" id="phone" style="--ar:${W}/${H};--arn:${(W/H).toFixed(4)}"><canvas class="view" id="view" width="${W}" height="${H}" tabindex="0" aria-label="Preview. Drag text or photos to move them; tap text to edit it."></canvas><div class="drop" id="drop" hidden>Drop the photo here</div><div class="ready-pop" id="readyBar" role="status" hidden><span class="rp-ic" aria-hidden="true">${ICON.check}</span><span class="rp-txt"><b id="readyTxt">Your photo is in</b><span id="readySub">Tap Save when it looks good</span></span><button type="button" class="rp-skip" id="readySkip" hidden>Skip</button></div></div>
    <button type="button" class="cta-photo" id="ctaPhoto" hidden>${ICON.plus}<span>Add your photo</span></button>
    <div class="pager" id="pager" hidden></div>
    <div class="hint" id="hint">${esc(cfg.sampleNote||'Example photos. Add yours in Photo.')}</div>
    <section class="sheet insp" id="sh-insp" data-sheet="insp" aria-labelledby="inspName">
      <div class="insp-bar">
        <h2 id="inspName" class="insp-name">Text</h2>
        <div class="insp-tabs" role="group" aria-label="Edit this layer">
          <button type="button" class="itab" data-part="text" aria-pressed="false">${ICON.text}<span>Edit</span></button>
          <button type="button" class="itab" data-part="size" aria-pressed="false">${ICON.size}<span>Size</span></button>
          <button type="button" class="itab" data-part="move" aria-pressed="false">${ICON.move}<span>Move</span></button>
          <button type="button" class="itab" data-part="color" aria-pressed="false">${ICON.drop}<span>Colour</span></button>
          <button type="button" class="itab" data-part="font" aria-pressed="false">${ICON.font}<span>Font</span></button>
          <button type="button" class="itab" data-part="more" aria-pressed="false">${ICON.more}<span>More</span></button>
        </div>
        <button type="button" class="done icon" id="inspClose" aria-label="Done">${ICON.check}</button>
      </div>
      <div class="insp-parts">
        <div class="insp-part" data-part="text"><textarea id="inspText" rows="1" dir="${B.dir||'ltr'}" aria-label="Edit text"></textarea><span class="small" id="inspTextHint">New line: Enter. Done: ✓</span></div>
        <div class="insp-part insp-col" data-part="size"><div class="insp-row"><label class="lbl" for="inspSize">Size</label><input type="range" id="inspSize" min="0.4" max="2.5" step="0.01" value="1"></div>
          <div class="insp-row" id="inspWH" hidden><label class="lbl" for="inspW">Width</label><input type="range" id="inspW" min="40" max="${W}" step="2"><label class="lbl" for="inspH">Height</label><input type="range" id="inspH" min="40" max="${H}" step="2"></div></div>
        <div class="insp-part insp-col" data-part="move"><div class="insp-row move-row"><div class="nudge" role="group" aria-label="Nudge"><button type="button" class="nb" data-nudge="-1,0" aria-label="Nudge left">${ICON.back}</button><button type="button" class="nb" data-nudge="0,-1" aria-label="Nudge up">${ICON.up}</button><button type="button" class="nb" data-nudge="0,1" aria-label="Nudge down">${ICON.down}</button><button type="button" class="nb" data-nudge="1,0" aria-label="Nudge right">${ICON.next}</button></div>
          <div class="nudge" role="group" aria-label="Line up"><button type="button" class="nb wide" id="inspCenter" title="Centre across">${ICON.centerX}<span>Centre</span></button><button type="button" class="nb wide" id="inspMiddle" title="Middle, top to bottom">${ICON.centerY}<span>Middle</span></button></div></div>
          <div class="insp-row"><label class="lbl" for="inspRot">Rotate</label><input type="range" id="inspRot" min="-180" max="180" step="1" value="0"><output id="inspRotOut" for="inspRot">0°</output>
          <div class="insp-row btns rot-btns"><button type="button" class="mini" data-rot="-15" aria-label="Turn left 15 degrees">↺ 15°</button><button type="button" class="mini" data-rot="0">Straight</button><button type="button" class="mini" data-rot="15" aria-label="Turn right 15 degrees">↻ 15°</button><button type="button" class="mini" id="inspFlip" aria-pressed="false" title="Mirror left to right" hidden>${ICON.flip}<span>Flip</span></button></div></div></div>
        <div class="insp-part insp-col" data-part="font"><div class="insp-row" id="inspFontRow"><label class="lbl" for="inspFont">Font</label><select id="inspFont" class="sel"></select></div>
          <div id="inspType">
          <div class="insp-row"><span class="lbl">Align</span><div class="row tight" role="group" aria-label="Align lines" id="inspAlign">${(B.dir==='rtl'?['right','center','left']:['left','center','right']).map(a=>`<button type="button" class="seg" data-align="${a}" aria-pressed="false">${a==='center'?'Centre':a[0].toUpperCase()+a.slice(1)}</button>`).join('')}</div></div>
          <div class="insp-row"><label class="lbl" for="inspLH">Line height</label><input type="range" id="inspLH" min="0.8" max="2" step="0.05" value="1.2"></div>
          <div class="insp-row" id="inspLSRow"${LS_OK?'':' hidden'}><label class="lbl" for="inspLS">Spacing</label><input type="range" id="inspLS" min="-6" max="40" step="1" value="0"></div>
          <label class="check"><input type="checkbox" id="inspShadow"> Soft shadow</label>
          <label class="check"><input type="checkbox" id="inspPill"> Background pill</label><div id="inspPillPal"></div></div></div>
        <div class="insp-part insp-col" data-part="color"><div id="inspColors" role="group" aria-label="Colour"></div>
          <div id="inspShape" hidden><span class="lbl">Outline</span><div id="inspStroke"></div><div class="insp-row" id="inspSWRow"><label class="lbl" for="inspSW">Outline width</label><input type="range" id="inspSW" min="0" max="40" step="1" value="0"></div>
            <div class="insp-row" id="inspRRow"><label class="lbl" for="inspR">Corners</label><input type="range" id="inspR" min="0" max="300" step="2" value="0"></div></div>
          <div class="insp-row"><label class="lbl" for="inspOp">Opacity</label><input type="range" id="inspOp" min="0.05" max="1" step="0.05" value="1"></div></div>
        <div class="insp-part insp-col" data-part="more"><div class="insp-row btns"><button type="button" class="mini" id="inspReset">Reset</button><button type="button" class="mini" id="inspHide">Hide</button><button type="button" class="mini" id="inspDup" hidden>Duplicate</button><button type="button" class="mini danger" id="inspDelete" hidden>Delete</button></div>
          <div class="insp-row btns" id="inspStyleRow"><button type="button" class="mini" id="inspCopyStyle">${ICON.copy}<span>Copy style</span></button><button type="button" class="mini" id="inspPasteStyle" hidden>${ICON.paint}<span>Paste style</span></button></div>
          <div class="insp-row btns" id="inspOrder" hidden><button type="button" class="mini" id="inspBack">Send back</button><button type="button" class="mini" id="inspFwd">Bring forward</button></div></div>
      </div>
    </section>
    <section class="sheet" id="sh-assets" data-sheet="assets" aria-labelledby="h-assets">${sheetHead('assets','Add an asset')}<div class="sheet-body" id="assetList"></div></section>
    <section class="sheet" id="sh-comps" data-sheet="comps" aria-labelledby="h-comps">${sheetHead('comps','Add an element')}<div class="sheet-body"><div class="comp-grid" id="compList"></div><p class="small">Each one is a normal layer: move, size, turn, recolour, change the font, hide or delete it.</p></div></section>
    ${hasStickers?`<section class="sheet" id="sh-stickers" data-sheet="stickers" aria-labelledby="h-stickers">${sheetHead('stickers','Add a sticker')}<div class="sheet-body"><div class="sticker-grid" id="stickerList"></div><p class="small">Stickers stay sharp at any size. Move, size, turn or recolour them like any layer.</p></div></section>`:''}
  </div>
  <form class="panel" id="form" autocomplete="off">
  <div class="banner" id="designBar" hidden></div>
  <section class="sheet" id="sh-photo" data-sheet="photo" aria-labelledby="h-photo">${sheetHead('photo',nPhotos>1&&!cfg.pages?'Photos':'Photo',step++)}<div class="sheet-body">`;
  if(cfg.photos.min&&cfg.photos.max>cfg.photos.min){
    html+=`<span class="lbl">How many photos</span><div class="row seg-grid" style="--c:${segCols(Array(cfg.photos.max-cfg.photos.min+1).fill({}))}" role="group" aria-label="How many photos">`;
    for(let k=cfg.photos.min;k<=cfg.photos.max;k++) html+=`<button type="button" class="seg" data-count="${k}" aria-pressed="false">${k}</button>`;
    html+=`</div>`;
  }
  html+=`<div class="slots" id="slots"></div><div class="swap-row" id="swapRow" hidden><button type="button" class="mini" id="swapBtn" aria-pressed="false">${ICON.swap}<span>Swap two</span></button><button type="button" class="mini" id="shuffleBtn">${ICON.shuffle}<span>Shuffle</span></button></div><div class="small">Tap a box to add a photo${cfg.pages?' for this '+PN.one:''}. Drag a photo in the preview to move it; pinch or use the slider to zoom.</div>
  <div class="field" id="zoomRow" hidden><label class="lbl" for="zoom">Zoom</label><input type="range" id="zoom" min="1" max="3" step="0.01" value="1"><button type="button" class="link" id="fitBtn">Reset photo</button></div>
  ${cfg.noLook?'':`<div class="field look-row" id="lookRow" hidden><span class="lbl" id="lookLbl">Photo look</span><div class="looks" id="looks" role="group" aria-labelledby="lookLbl">${PHOTO_LOOKS.map(l=>`<button type="button" class="look" data-look="${l.id}" aria-pressed="false"><canvas width="112" height="112" aria-hidden="true"></canvas><span>${esc(l.label)}</span></button>`).join('')}</div>
    <div class="insp-row light-row"><label class="lbl" for="light">Light</label><input type="range" id="light" min="-1" max="1" step="0.05" value="0"><output id="lightOut" for="light">0</output></div>
    <button type="button" class="link" id="lookAll" hidden>Use this look on every photo</button></div>`}</div></section>`;
  if(hasStyle) html+=`<section class="sheet" id="sh-style" data-sheet="style" aria-labelledby="h-style">${sheetHead('style','Style',step++)}<div class="sheet-body">${cfg.stylesTitle?`<h3 class="fgroup">${esc(cfg.stylesTitle)}</h3>`:''}${cfg.styles?`<div class="row seg-grid" style="--c:${segCols(cfg.styles.map(x=>({ic:x.swatch})))}" role="group" aria-label="Style" id="styles">${cfg.styles.map(s=>`<button type="button" class="seg" data-style="${s.id}" aria-pressed="false">${s.swatch||''}${esc(s.label)}</button>`).join('')}</div>`:''}<div data-fields="style" class="field fields"></div></div></section>`;
  if(hasWords) html+=`<section class="sheet" id="sh-words" data-sheet="words" aria-labelledby="h-words">${sheetHead('words','Words',step++)}<div class="sheet-body"><div data-fields="words" class="field fields"></div><div class="small">Tip: tap any text in the preview to edit, move or resize it.</div></div></section>`;
  html+=`<section class="sheet" id="sh-layers" data-sheet="layers" aria-labelledby="h-layers">${sheetHead('layers','Layers')}<div class="sheet-body">
    <div class="add-row"><button type="button" class="mini" id="addText">${ICON.text} Text</button><button type="button" class="mini" id="addComp" aria-controls="sh-comps">${ICON.plus} Element</button><button type="button" class="mini" id="addAsset" aria-controls="sh-assets">${ICON.shapes} Asset</button>${hasStickers?`<button type="button" class="mini" id="addSticker" aria-controls="sh-stickers">${ICON.sparkle} Sticker</button>`:''}</div>
    <ul id="layerList" class="layer-list" role="list" aria-label="Layers, top first"></ul>
    <button type="button" class="link reset-layout" id="resetLayout">${ICON.undo} Put everything back where it started</button></div></section>
  <section class="sheet save-sheet" id="sh-save" data-sheet="save" aria-labelledby="h-save">${sheetHead('save','Save')}<div class="sheet-body">
    <div class="progress" id="progress" hidden><div class="progress-bar" role="progressbar" aria-label="Saving" aria-valuemin="0" aria-valuemax="100" id="progressRole"><i id="progressBar"></i></div><span id="progressTxt">Making a full-quality copy…</span><button type="button" class="link save-cancel" id="saveCancel" hidden>Cancel</button></div>
    <div class="done-box" id="doneBox" role="status" aria-live="polite" hidden><span class="done-ic" aria-hidden="true">${ICON.check}</span><div><b id="doneTitle">Saved!</b><span id="doneTxt"></span></div></div>
    <button type="button" class="btn queue-next" id="queueNext" hidden><span id="queueNextTxt">Next photo</span>${ICON.next}</button>
    <div class="result" id="result" hidden><img id="resultImg" alt="Your finished image"><button type="button" class="btn ghost" id="shareAgain" hidden>${ICON.share}<span>Save to Photos</span></button><span class="small" id="resultNote">Press and hold the image (or right-click) to save it.</span></div>
    <div class="team-status" id="teamStatus" role="status" aria-live="polite" hidden></div>
    <div class="save-opts" id="saveOpts">
      <label class="opt-row team-row"><span class="opt-ic">${ICON.bookmark}</span><span class="opt-txt"><b id="teamLbl">Save to the team</b><small id="teamSub">Your team finds it in Saved</small></span><input type="checkbox" class="switch" id="teamOn" role="switch"></label>
      <div class="team-box" id="teamBox" hidden>
        <div class="tb-field"><label class="lbl" for="teamName">Name</label><input type="text" id="teamName" dir="auto" maxlength="80" placeholder="Name, e.g. Restock – Al Khoud" enterkeyhint="done"></div>
        <div class="tb-field"><span class="lbl" id="teamColsLbl">Collection</span><div class="chips tb-cols" id="teamCols" role="group" aria-labelledby="teamColsLbl"></div>
          <div class="inline" id="teamNewRow" hidden><input type="text" id="teamNewCol" dir="auto" placeholder="New collection…" maxlength="40" aria-label="New collection" enterkeyhint="done"><button type="button" class="mini" id="teamAddCol">Add</button></div></div>
        <button type="button" class="link team-more" id="teamMore" aria-expanded="false" aria-controls="teamMoreBox">More options</button>
        <div class="team-more-box" id="teamMoreBox" hidden>
          <label class="check"><input type="checkbox" id="teamKeep"> Keep the photos <span class="small">(off = a template: layout and words only)</span></label>
          <label class="check" id="teamAsNewRow" hidden><input type="checkbox" id="teamAsNew"> Save as a new design instead of updating</label>
        </div>
      </div>
    </div>
    <button type="button" class="btn" id="save">${ICON.download}<span id="saveTxt">Save</span></button>
    <p class="small save-note" id="photosRow">Always a full-quality picture to your Photos${cfg.pages?', one per '+PN.one:''}.</p>
    <button type="button" class="link" id="teamOnly">Only save to the team (no picture)</button>
    ${cfg.pages?'<button type="button" class="link" id="saveThis">Save this '+PN.one+' only</button>':''}
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
  <input type="file" id="pick" accept="image/*,.heic,.heif" hidden aria-hidden="true" tabindex="-1">`;
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
      if(n==='assets'||n==='comps'||n==='stickers'||n==='insp') el.classList.add('active');
      if(!(opt&&opt.quiet)) el.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      return;
    }
    if(openName&&openName!==n) sheetEl(openName)?.classList.remove('open');
    openName=n; el.classList.add('open'); el.removeAttribute('inert'); document.body.classList.add('sheet-open');
    if(n==='layers') paintLayers();
    document.querySelectorAll('#bar [data-open]').forEach(b=>{ const on=b.dataset.open===n; b.setAttribute('aria-expanded',String(on)); b.classList.toggle('on',on); });
    fit();
  }
  /* move focus into a sheet opened from the bar (screen readers land on its title), and back to the bar on close */
  function focusSheet(n){ const h=sheetEl(n)?.querySelector('h2'); if(h){ h.setAttribute('tabindex','-1'); setTimeout(()=>h.focus({preventScroll:true}),60); } }
  function closeSheet(n){
    if(!isPhone()){ if(n==='assets'||n==='comps'||n==='stickers'||n==='insp') sheetEl(n)?.classList.remove('active'); return; }
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
  /* tapping the space around the preview closes the open panel too */
  $('stage').addEventListener('click',e=>{ if(isPhone()&&openName&&(e.target===$('stage')||e.target.classList.contains('phone'))) closeSheet(); });
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
      else if(f.type==='seg') inner=`<span class="lbl">${esc(f.label)}</span><div class="row seg-grid" style="--c:${f.cols||segCols(f.options)}" role="group" aria-label="${esc(f.label)}" data-seg="${f.id}">${f.options.map(o=>`<button type="button" class="seg${o.ic?' has-ic':''}" data-v="${o.v}" aria-pressed="false">${o.ic?`<span class="seg-ic" aria-hidden="true">${o.ic}</span>`:''}${esc(o.l)}</button>`).join('')}</div>`;
      else if(f.type==='toggle') inner=`<label class="check"><input type="checkbox" data-toggle="${f.id}"> ${esc(f.label)}</label>`;
      else if(f.type==='multi') inner=`<span class="lbl">${esc(f.label)}</span><div class="chips" role="group" aria-label="${esc(f.label)}" data-mf="${f.id}">${f.options.map(o=>`<button type="button" class="chip" data-v="${esc(o.v)}" aria-pressed="false" dir="auto">${esc(o.l)}</button>`).join('')}</div>`;
      else if(f.type==='tiles') inner=`<span class="lbl">${esc(f.label)}</span><div class="tiles-ed" data-tiles="${f.id}"></div><button type="button" class="mini" data-addtile="${f.id}">${ICON.plus} ${esc(f.addLabel||'Add one')}</button>${f.hint?`<span class="small">${esc(f.hint)}</span>`:''}`;
      else if(f.type==='place'){ const rtl=(B.dir||'ltr')==='rtl', cols=f.cols===false?['center']:(rtl?['end','center','start']:['start','center','end']), side=c=>c==='center'?'centre':((c==='start')!==rtl?'left':'right');
        inner=`<span class="lbl">${esc(f.label)}</span><div class="place-pick${f.cols===false?' one':''}" role="group" aria-label="${esc(f.label)}" data-place="${f.id}">${['top','middle','bottom'].map(r=>cols.map(c=>`<button type="button" class="pp" data-v="${r}-${c}" aria-pressed="false" aria-label="${r==='middle'?'Middle':r[0].toUpperCase()+r.slice(1)}${f.cols===false?'':', '+side(c)}"><i></i></button>`).join('')).join('')}</div>`; }
      else if(f.type==='dates') inner=`<label class="check"><input type="checkbox" data-don="${f.id}"> ${esc(f.label)}</label><div class="row dates-ed"><label class="field"><span class="lbl">From</span><input type="date" data-date="${f.id}:from"></label><label class="field"><span class="lbl">To</span><input type="date" data-date="${f.id}:to"></label></div>`;
      else if(f.type==='note') inner=`<h3 class="fgroup">${esc(f.label)}</h3>`;
      else if(f.type==='range') inner=`<label class="lbl" for="r_${f.id}">${esc(f.label)} <output data-rout="${f.id}"></output></label><input type="range" id="r_${f.id}" data-range="${f.id}" min="${f.min??0}" max="${f.max??100}" step="${f.step??1}">`;
      else if(f.type==='color') inner=`<span class="lbl">${esc(f.label)}</span>`+palettePicker('f:'+f.id,null,{auto:f.auto||'Auto'});
      else inner=(f.toggle?`<label class="check"><input type="checkbox" data-on="${f.id}"> ${esc(f.label)}</label>`:`<label class="lbl" for="t_${f.id}">${esc(f.label)}</label>`)+`<input type="text" dir="${B.dir||'ltr'}" id="t_${f.id}" data-text="${f.id}" placeholder="${esc(opts(f.placeholder)||'')}" ${f.toggle?`aria-label="${esc(f.label)}"`:''}>`;
      return `<div class="field" data-fw="${f.id}">${inner}</div>`;
    }).join('');
    box.addEventListener('click',e=>{
      const more=e.target.closest('[data-more]'); if(more){ const g=more.parentNode, open=g.classList.toggle('open'); more.setAttribute('aria-expanded',String(open)); more.textContent=open?'Less':'More…'; return; }
      const b=e.target.closest('[data-f] .chip'); if(b){ const id=b.parentNode.dataset.f, v=S.values[id];   // single-choice words only (flavours are [data-mf], below)
        if(b.dataset.own){ if(v.pick!=='__own'&&!v.own) v.own=value(id); v.pick='__own'; syncUI(); const inp=document.querySelector(`[data-ownfor="${id}"]`); inp.focus(); }
        else if(b.dataset.none) v.pick='__none'; else v.pick=b.dataset.v;
        if(S.layers[id]) S.layers[id].hidden=false;
        syncUI(); remember(); render(); return; }
      const s=e.target.closest('[data-seg] .seg'); if(s){ S.values[s.parentNode.dataset.seg]=s.dataset.v; syncUI(); remember(); render(); return; }
      const pp=e.target.closest('[data-place] .pp'); if(pp){ S.values[pp.parentNode.dataset.place]=pp.dataset.v; syncUI(); remember(); render(); return; }
      const m=e.target.closest('[data-mf] .chip'); if(m){ const id=m.parentNode.dataset.mf, v=S.values[id], k=v.picks.indexOf(m.dataset.v); if(k>=0) v.picks.splice(k,1); else v.picks.push(m.dataset.v); if(S.layers[id]) S.layers[id].hidden=false; syncUI(); remember(); render(); return; }
      const at=e.target.closest('[data-addtile]'); if(at){ const f=fields.find(x=>x.id===at.dataset.addtile), v=S.values[f.id]; if(v.length<(f.max||3)){ v.push({small:'',big:''}); syncUI(); render(); const ins=document.querySelectorAll(`[data-tiles="${f.id}"] input`); if(ins.length) ins[ins.length-2].focus(); } return; }
      const rt=e.target.closest('[data-rmtile]'); if(rt){ const [id,i]=rt.dataset.rmtile.split(':'); S.values[id].splice(+i,1); syncUI(); render(); return; }
    });
    box.addEventListener('input',e=>{ const t=e.target;
      if(t.dataset.ownfor) S.values[t.dataset.ownfor].own=t.value; else if(t.dataset.text) S.values[t.dataset.text].text=t.value;
      else if(t.dataset.tile){ const [id,i,k]=t.dataset.tile.split(':'); S.values[id][+i][k]=t.value; }
      else if(t.dataset.date){ const [id,k]=t.dataset.date.split(':'); if(t.value) S.values[id][k]=t.value; }
      else if(t.dataset.range){ S.values[t.dataset.range]=+t.value; const o=document.querySelector(`[data-rout="${t.dataset.range}"]`); if(o) o.textContent=t.value+(fields.find(x=>x.id===t.dataset.range).unit||''); }
      else return;
      remember(); render(); syncInspector(); });
    wirePalettes(box,(key,v)=>{ if(!key.startsWith('f:')) return; S.values[key.slice(2)]=v||null; syncUI(); remember(); render(); });
    box.addEventListener('change',e=>{ const t=e.target; if(t.dataset.on) S.values[t.dataset.on].on=t.checked; if(t.dataset.toggle) S.values[t.dataset.toggle]=t.checked; if(t.dataset.don) S.values[t.dataset.don].on=t.checked; syncUI(); remember(); render(); });
  });
  function value(id){
    const v=S.values[id]; const f=fields.find(x=>x.id===id); if(!f) return '';
    if(f.type==='chips'){ if(v.pick==='__none') return ''; return String(v.pick==='__own'?v.own:v.pick).trim(); }
    if(f.type==='seg'||f.type==='toggle'||f.type==='place'||f.type==='range'||f.type==='color') return v;
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
  const whenOk=f=>!f.when||((f.when.count==null||f.when.count===S.count)&&(f.when.style==null||[].concat(f.when.style).includes(S.style))&&(!f.when.field||[].concat(f.when.is).includes(S.values[f.when.field])));
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
  /* how many photos this slide takes (a carousel's slide type decides: words-only takes none, two-photo takes two) */
  function pagePhotoCount(pg){ if(!PG||!cfg.pagePhotos) return noPhotoStyle()?0:S.count; return withPage(pg,()=>cfg.pagePhotos(value,{page:pg,pageValue})); }
  /* a style that uses no photo (e.g. Restock with the brand's can cut-outs): no photo boxes, nothing to add before Save */
  function noPhotoStyle(){ return !PG&&!!cfg.photosFor&&!cfg.photosFor({style:S.style,value,count:S.count}); }
  /* a photo arrived while the style uses none: switch to the tool's photo style so it shows */
  function photoStyleNow(){ if(!noPhotoStyle()||!cfg.photoStyle) return; S.style=cfg.photoStyle; remember(); }
  const slotCount=()=>pagePhotoCount(S.page);
  function slotsUI(){
    let s=''; const off=photoOffset(), n=slotCount();
    for(let j=0;j<n;j++){ const i=off+j, p=S.photos[i], real=p.img&&!p.sample;
      s+=`<label class="slot${real?' has':''}${i===S.active&&n>1?' active':''}" data-slot="${i}">${real?`<img alt="" src="${p.thumb}">`:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}<span>${real?'Change':(n>1?'Photo '+(j+1):'Add photo')}</span><input type="file" accept="image/*,.heic,.heif" data-file="${i}" aria-label="${real?'Change photo':'Add photo'}${n>1?' '+(j+1):''}"></label>`; }
    let realN=0; for(let j=0;j<n;j++){ const p=S.photos[off+j]; if(p&&p.img&&!p.sample) realN++; }
    $('swapRow').hidden=realN<2;
    $('slots').innerHTML=n?s:PG?'<p class="small">This '+PN.one+' has no photo. Change it in Style → This '+PN.one+'.</p>'
      :`<div class="no-photo"><p class="small">${esc(cfg.noPhotoNote||'This style needs no photo. Tap Save when it looks good.')}</p>${cfg.photoStyle?'<button type="button" class="mini" id="usePhotoStyle">'+ICON.photo+' Use a photo instead</button>':''}</div>`;
  }
  $('slots').addEventListener('click',e=>{ if(!e.target.closest('#usePhotoStyle')) return; S.style=cfg.photoStyle; remember(); syncUI(); render(); pickPhoto(nextEmpty()); });
  $('slots').addEventListener('change',e=>{const t=e.target; if(t.dataset.file!=null){ setPhoto(+t.dataset.file,t.files&&t.files[0]); t.value=''; }});
  /* Swap two: tap one photo box, then another, and they change places (easier to find than hold-and-drag) */
  let swapFrom=null;
  const swapMode=on=>{ swapFrom=null; $('swapBtn').setAttribute('aria-pressed',String(!!on)); $('slots').classList.toggle('swapping',!!on); $('slots').querySelectorAll('.slot').forEach(x=>x.classList.remove('pick')); if(on) status('Tap the two photos to swap.',2600); };
  $('swapBtn').addEventListener('click',()=>swapMode($('swapBtn').getAttribute('aria-pressed')!=='true'));
  $('slots').addEventListener('click',e=>{ if($('swapBtn').getAttribute('aria-pressed')!=='true') return; const l=e.target.closest('.slot.has'); e.preventDefault(); e.stopPropagation(); if(!l) return;
    const i=+l.dataset.slot; if(swapFrom==null){ swapFrom=i; l.classList.add('pick'); haptic('tick'); return; }
    if(i!==swapFrom){ swapPhotos(swapFrom,i); haptic('tick'); } swapMode(false); },true);
  $('shuffleBtn').addEventListener('click',()=>{ const off=photoOffset(), idx=[]; for(let j=0;j<slotCount();j++){ const k=off+j, p=S.photos[k]; if(p&&p.img&&!p.sample) idx.push(k); }
    if(idx.length<2) return; swapMode(false); const ph=idx.map(k=>S.photos[k]); let order;
    do{ order=ph.slice(); for(let a=order.length-1;a>0;a--){ const b=Math.floor(Math.random()*(a+1)); [order[a],order[b]]=[order[b],order[a]]; } }while(order.every((p,a)=>p===ph[a]));
    idx.forEach((k,a)=>{ S.photos[k]=order[a]; order[a].ox=0; order[a].oy=0; order[a].zoom=1; }); haptic('tick'); syncUI(); render(); status('Shuffled. Tap again for another mix; Undo goes back.',2600); });
  $('slots').addEventListener('click',e=>{ if(slotDrag&&slotDrag.used){ e.preventDefault(); e.stopPropagation(); slotDrag=null; return; } const l=e.target.closest('[data-slot]'); if(l){S.active=+l.dataset.slot; syncZoom();}},true);
  /* in the Photo sheet: hold a photo box, drag it onto another box, let go = swap */
  let slotDrag=null;
  $('slots').addEventListener('pointerdown',e=>{ const sl=e.target.closest('.slot.has'); if(!sl||slotCount()<2) return; const i=+sl.dataset.slot;
    slotDrag={i,x:e.clientX,y:e.clientY,el:sl,on:false,timer:setTimeout(()=>{ if(slotDrag){ slotDrag.on=true; sl.classList.add('lift'); if(navigator.vibrate) navigator.vibrate(10); } },380)}; });
  $('slots').addEventListener('pointermove',e=>{ if(!slotDrag) return; const dx=e.clientX-slotDrag.x, dy=e.clientY-slotDrag.y;
    if(!slotDrag.on){ if(Math.hypot(dx,dy)>8){ clearTimeout(slotDrag.timer); slotDrag=null; } return; }
    slotDrag.el.style.transform=`translate(${dx}px,${dy}px) scale(1.05)`; const over=document.elementFromPoint(e.clientX,e.clientY)?.closest('.slot');
    $('slots').querySelectorAll('.slot').forEach(x=>x.classList.toggle('drop-here',x===over&&x!==slotDrag.el)); });
  $('slots').addEventListener('touchmove',e=>{ if(slotDrag&&slotDrag.on) e.preventDefault(); },{passive:false});
  $('slots').addEventListener('pointerup',e=>{ if(!slotDrag) return; clearTimeout(slotDrag.timer); const d=slotDrag; d.el.classList.remove('lift'); d.el.style.transform='';
    $('slots').querySelectorAll('.drop-here').forEach(x=>x.classList.remove('drop-here'));
    if(d.on){ d.used=true; e.preventDefault(); const over=document.elementFromPoint(e.clientX,e.clientY)?.closest('.slot'); if(over&&+over.dataset.slot!==d.i) swapPhotos(d.i,+over.dataset.slot); setTimeout(()=>{ if(slotDrag===d) slotDrag=null; },400); }
    else slotDrag=null; });
  $('slots').addEventListener('pointercancel',()=>{ if(slotDrag){ clearTimeout(slotDrag.timer); slotDrag.el.classList.remove('lift'); slotDrag.el.style.transform=''; slotDrag=null; } });
  $('slots').addEventListener('contextmenu',e=>{ if(e.target.closest('.slot')) e.preventDefault(); });
  async function setPhoto(i,file){
    if(!isPhotoFile(file)){ status('That is not a photo. Try a JPG, PNG or HEIC.'); return; }
    if(isHeic(file)) status('Opening your iPhone photo…',10000);
    try{
      const img=await loadFile(file); photoStyleNow();
      const tc=document.createElement('canvas'), tk=240/Math.max(img.width,img.height); tc.width=Math.round(img.width*tk); tc.height=Math.round(img.height*tk); tc.getContext('2d').drawImage(img,0,0,tc.width,tc.height);
      const fx=S.photos[i]&&S.photos[i].fx;
      S.photos[i]={img,zoom:1,ox:0,oy:0,sample:false,thumb:tc.toDataURL('image/jpeg',.7),file,key:'p'+Date.now().toString(36)+i,...(fx?{fx}:{})};
      S.active=i; $('result').hidden=true; status(''); if(PG) refreshThumbs();
      syncUI(); render();
    }catch(_){ status(isHeic(file)?'That iPhone photo could not be opened. Try sharing it as a JPG.':'That photo could not be opened. Try a JPG or PNG.'); }
  }
  /* one picker for the preview and the "Add your photo" button; several photos fill the empty boxes in order */
  let pickAt=0;
  function pickPhoto(i){ pickAt=i; const p=$('pick'); p.multiple=!!PG||slotCount()>1; p.click(); }
  function slotTargets(i){ const off=photoOffset(), t=[i]; for(let j=0;j<slotCount();j++){ const k=off+j, p=S.photos[k]; if(k!==i&&(!p.img||p.sample)) t.push(k); } return t; }
  $('pick').addEventListener('change',e=>{ const off=photoOffset(), at=pickAt>=off&&pickAt<off+slotCount()?pickAt:nextEmpty(), fs=[...(e.target.files||[])], t=slotCount()?slotTargets(at):[];
    fs.slice(0,t.length).forEach((f,k)=>setPhoto(t[k],f));
    /* carousels: more photos than this slide takes fill the next slides, adding slides if needed */
    if(PG&&fs.length>t.length){ let pg=S.page; for(const f of fs.slice(t.length)){ pg++; while(pg<S.P.length&&!pagePhotoCount(pg)) pg++; if(pg>=S.P.length){ if(S.P.length>=PG.max) break; insertPage(S.P.length,newPage(S.P.length)); pg=S.P.length-1; } setPhoto(pg*perPage,f); }
      paintPager(); status(fs.length+' photos added across the '+PN.many+'.'); }
    e.target.value=''; });
  $('ctaPhoto').addEventListener('click',()=>pickPhoto(nextEmpty()));
  function syncCta(){ const n=slotCount(); $('pick').multiple=!!PG||n>1; const off=photoOffset(); let any=false; for(let i=0;i<n;i++){ const p=S.photos[off+i]; if(!p||!p.img||p.sample) any=true; } const was=$('ctaPhoto').hidden; $('ctaPhoto').hidden=!any; if(was!==!any) fit(); $('ctaPhoto').querySelector('span').textContent=n>1||PG?'Add your photos':'Add your photo';
    const real=S.photos.some((p,i)=>photoUsed(i)&&p.img&&!p.sample);
    $('hint').textContent=noPhotoStyle()?(cfg.noPhotoHint||'No photo needed. Tap a word to change it.'):real?'Drag text or photos to move them. Tap text to edit it.':(cfg.sampleNote||'Example photos. Add yours in Photo.'); }
  function nextEmpty(){ const off=photoOffset(); for(let j=0;j<slotCount();j++){ const p=S.photos[off+j]; if(p.sample||!p.img) return off+j; } return S.active; }
  document.addEventListener('paste',e=>{ if(e.target&&e.target.tagName==='INPUT') return; const it=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/')); if(it) setPhoto(nextEmpty(),it.getAsFile());});
  let dd=0;
  document.addEventListener('dragenter',e=>{if([...(e.dataTransfer?.types||[])].includes('Files')){dd++;$('drop').hidden=false;}});
  document.addEventListener('dragleave',()=>{dd=Math.max(0,dd-1);if(!dd)$('drop').hidden=true;});
  document.addEventListener('dragover',e=>e.preventDefault());
  document.addEventListener('drop',e=>{e.preventDefault();dd=0;$('drop').hidden=true;const fs=[...(e.dataTransfer?.files||[])].filter(isPhotoFile);const t=slotTargets(nextEmpty());fs.slice(0,t.length).forEach((f,k)=>setPhoto(t[k],f));});

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
      else if(f.type==='note'){}
      else if(f.type==='range'){ const r=document.querySelector(`[data-range="${f.id}"]`); if(document.activeElement!==r) r.value=v; document.querySelector(`[data-rout="${f.id}"]`).textContent=v+(f.unit||''); }
      else if(f.type==='color') syncPalette(document.querySelector(`[data-pal="f:${f.id}"]`),v);
      else if(f.type==='place'){ const cur=String(v).includes('-')?v:v+'-start'; document.querySelectorAll(`[data-place="${f.id}"] .pp`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===cur||(f.cols===false&&b.dataset.v.split('-')[0]===cur.split('-')[0])))); }
      else if(f.type==='dates'){ document.querySelector(`[data-don="${f.id}"]`).checked=v.on; document.querySelectorAll(`[data-date^="${f.id}:"]`).forEach(inp=>{ const k=inp.dataset.date.split(':')[1]; inp.value=v[k]; inp.disabled=!v.on; }); }
      else { const t=document.querySelector(`[data-text="${f.id}"]`); if(t.value!==v.text&&document.activeElement!==t) t.value=v.text; if(f.toggle){const c=document.querySelector(`[data-on="${f.id}"]`);c.checked=v.on;t.disabled=!v.on;} }
    });
    slotsUI(); syncZoom(); syncCta();
  }
  /* whole photos (contain) can't zoom, so the slider hides for them */
  function syncZoom(){ const p=S.photos[S.active], real=p&&p.img&&!p.sample, box=reg.find(r=>r.photo===S.active); $('zoomRow').hidden=!real||cfg.noZoom||!!(box&&box.mode==='contain'); if(p) $('zoom').value=p.zoom; document.querySelectorAll('.slot').forEach(l=>l.classList.toggle('active',+l.dataset.slot===S.active&&slotCount()>1)); syncLook(); }
  /* the photo look row: shown for a real photo; its mood buttons are drawn from that photo with the same blend layers */
  const lightTxt=v=>{ v=Math.round((+v||0)*100); return v>0?'+'+v:String(v); };
  let lookFor=null;
  function syncLook(){ const row=$('lookRow'); if(!row) return; const p=S.photos[S.active], real=!!(p&&p.img&&!p.sample&&photoUsed(S.active)); row.hidden=!real; if(!real) return;
    const fx=p.fx||{}; row.querySelectorAll('.look').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.look===(fx.look||''))));
    if(document.activeElement!==$('light')) $('light').value=fx.light||0; $('lightOut').textContent=lightTxt(fx.light); $('lookAll').hidden=slotCount()<2;
    if(lookFor===p.img) return; lookFor=p.img; const im=prev(p.img);
    row.querySelectorAll('.look').forEach(b=>{ const c=b.querySelector('canvas'), x=c.getContext('2d'), k=Math.max(112/im.width,112/im.height); x.clearRect(0,0,112,112); x.drawImage(im,56-im.width*k/2,56-im.height*k/2,im.width*k,im.height*k); photoFx(x,{look:b.dataset.look},0,0,112,112); }); }
  const status=(t,ms)=>{ $('status').textContent=t; if(isPhone()&&openName!=='save') toast(t,ms); else if(!t) toast(''); };

  /* ---- drawing ---- */
  let reg=[], raf=0;
  function drawExtras(h){
    S.extras.forEach(x=>{
      if(x.type==='asset') h.asset(x);
      else if(x.type==='comp') drawComp(h,x);
      else h.text(x.id,'Your text',x.text,W/2,x.y,{font:x.font,weight:x.font==='display'?'':'800',size:x.size,color:x.color,shadow:x.shadow});
    });
  }
  function draw(ctx,preview,scale,thumb){
    const r=[]; ctx.save(); if(scale) ctx.scale(scale,scale); ctx.clearRect(0,0,W,H);
    const h=makeHelpers(ctx,S,preview,r,scale||1,photoOffset(),perPage);
    cfg.draw(h,{style:S.style,count:S.count,value,preview:preview&&!thumb,page:S.page,pages:S.P.length,pageValue,pagePhotos:pagePhotoCount}); drawExtras(h);
    if(thumb){ ctx.restore(); return; }
    if(preview&&S.sel){ const b=r.find(x=>x.id===S.sel&&!x.hidden&&!x.empty); if(b){ ctx.save(); ctx.lineWidth=4; ctx.setLineDash([16,10]); ctx.strokeStyle='#3d6bff'; if(b.rot){ ctx.translate(b.cx,b.cy); ctx.rotate(b.rot); ctx.strokeRect(-b.rw/2-12,-b.rh/2-12,b.rw+24,b.rh+24); } else ctx.strokeRect(b.x-12,b.y-12,b.w+24,b.h+24); ctx.restore(); } }
    if(preview&&dragging) drawGuides(ctx);
    if(preview&&lift&&lift.on){ ctx.save(); r.forEach(b=>{ if(b.photo===lift.i){ ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fillRect(b.x,b.y,b.w,b.h); ctx.setLineDash([18,12]); ctx.lineWidth=6; ctx.strokeStyle='rgba(61,107,255,.9)'; ctx.strokeRect(b.x+3,b.y+3,b.w-6,b.h-6); }
      if(b.photo!=null&&b.photo===lift.over){ ctx.setLineDash([]); ctx.lineWidth=12; ctx.strokeStyle='#3d6bff'; ctx.strokeRect(b.x+6,b.y+6,b.w-12,b.h-12); } }); ctx.restore(); }
    ctx.restore(); if(preview){ const had=!S.sel||reg.some(x=>x.id===S.sel&&!x.empty); reg=r; paintLayers(); if(!had&&r.some(x=>x.id===S.sel&&!x.empty)) syncInspector(); }   // a just-added layer: its edit bar can now show every tab
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
    reg.forEach(b=>{ if(!b.id||b.id===skip||b.hidden||b.empty) return; xs.push({v:b.x+b.w/2,kind:'layer'}); ys.push({v:b.y+b.h/2,kind:'layer'}); });
    return {xs,ys};
  }
  /* best snap for one axis: the box's start/centre/end against the targets, within tol canvas px */
  function snapAxis(a,len,targets,tol){
    let best=null; [a,a+len/2,a+len].forEach(p=>targets.forEach(t=>{ const d=t.v-p; if(Math.abs(d)<=tol&&(!best||Math.abs(d)<Math.abs(best.d))) best={d,v:t.v,kind:t.kind}; }));
    return best;
  }
  function render(){ if(raf) return; raf=requestAnimationFrame(()=>{raf=0;draw(vctx,true);}); scheduleCommit(); scheduleThumb(); }

  /* ---- the design "recipe": everything needed to rebuild this story (saving, drafts, undo) ---- */
  function recipe(){
    /* v2 keeps every page; page 1's values/layers/extras are also written at the top so older readers still work */
    const p0=S.P[0];
    return {v:2,tool:cfg.id,brand:B.id,style:S.style,count:S.count,pp:perPage,page:S.page,values:clone(p0.values),layers:clone(p0.layers),extras:clone(p0.extras),
      ...(PG?{pages:clone(S.P)}:{}),
      photos:S.photos.map(p=>({zoom:+p.zoom.toFixed(4),ox:Math.round(p.ox*10)/10,oy:Math.round(p.oy*10)/10,has:!!(p.img&&!p.sample),...(hasFx(p.fx)?{fx:{look:p.fx.look||'',light:+p.fx.light||0}}:{})}))};
  }
  /* slots: optional photo objects to put in each slot (null = keep what's there) */
  function applyRecipe(r,slots){
    if(r.style&&(!cfg.styles||cfg.styles.some(s=>s.id===r.style))) S.style=r.style;
    if(r.count) S.count=Math.min(perPage,Math.max(minPhotos,r.count));
    const pages=(PG&&r.pages&&r.pages.length?r.pages:[{values:r.values,layers:r.layers,extras:r.extras}]).slice(0,PG?PG.max:1);
    S.P=pages.map((pp,i)=>{ const np=newPage(i); Object.keys(pp.values||{}).forEach(k=>{ if(k in np.values) np.values[k]=clone(pp.values[k]); }); np.layers=clone(pp.layers||{}); np.extras=clone(pp.extras||[]); return np; });
    S.page=Math.min(S.P.length-1,Math.max(0,r.page||0));
    S.P.forEach(pp=>{ extraN=pp.extras.reduce((m,x)=>Math.max(m,+(String(x.id).replace(/\D/g,''))||0),extraN); }); assetN=Math.max(assetN,extraN);
    /* older carousels kept 1 photo per slide; map them onto today's layout */
    const oldPP=PG?(r.pp||1):perPage; if(oldPP!==perPage){ const map=i=>Math.floor(i/oldPP)*perPage+i%oldPP, rp2=[], sl2=[]; (r.photos||[]).forEach((x,i)=>{ rp2[map(i)]=x; }); if(slots) slots.forEach((x,i)=>{ if(x) sl2[map(i)]=x; }); r={...r,photos:rp2}; slots=slots?sl2:slots; }
    (r.photos||[]).forEach((rp,i)=>{ if(!S.photos[i]||!rp) return; if(slots&&slots[i]) S.photos[i]={...slots[i]}; Object.assign(S.photos[i],{zoom:rp.zoom||1,ox:rp.ox||0,oy:rp.oy||0}); if(hasFx(rp.fx)) S.photos[i].fx={...rp.fx}; else delete S.photos[i].fx; });
    S.sel=null;
  }
  async function fontsOf(r){ const fams=new Set(), pages=r.pages||[r]; pages.forEach(pp=>Object.values(pp.layers||{}).forEach(l=>{ if(l&&l.font) fams.add(l.font); }));
    await Promise.all([...fams].map(ensureFont)); await Promise.all(pages.flatMap(pp=>(pp.extras||[]).filter(x=>x.type==='asset').map(x=>loadAsset(x.ref)))); }

  /* ---- undo / redo: a snapshot after every pause in editing ---- */
  const hist={stack:[],i:-1,timer:0,ready:false};
  function snap(){ return {json:JSON.stringify(recipe()),photos:S.photos.map(p=>({...p}))}; }
  function same(a,b){ return a&&b&&a.json===b.json&&a.photos.every((p,i)=>p.img===b.photos[i].img); }
  function scheduleCommit(){ if(!hist.ready) return; clearTimeout(hist.timer); hist.timer=setTimeout(()=>{ hist.timer=0; commit(); },450); }
  function commit(){
    if(pts.size) return scheduleCommit();                      // still dragging
    const s=snap(); if(same(s,hist.stack[hist.i])) return;
    hist.stack=hist.stack.slice(0,hist.i+1); hist.stack.push(s); if(hist.stack.length>80) hist.stack.shift(); hist.i=hist.stack.length-1;
    syncUndo(); saveDraft(s); designChanged();
  }
  function designChanged(){ quickReady=false; if(imgDone&&!saving){ imgDone=false; syncSaveOpts(); } }   // an edit after saving: the next Save makes a new picture
  function restore(s){ applyRecipe(JSON.parse(s.json),s.photos); syncUI(); syncInspector(); paintPager(); draw(vctx,true); syncUndo(); saveDraft(s); designChanged(); }
  function flush(){ if(hist.timer){ clearTimeout(hist.timer); hist.timer=0; if(!pts.size) commit(); } }   // record an edit made just before Undo
  function undo(){ flush(); if(hist.i>0){ hist.i--; restore(hist.stack[hist.i]); } }
  function redo(){ flush(); if(hist.i<hist.stack.length-1){ hist.i++; restore(hist.stack[hist.i]); } }
  function syncUndo(){ $('undo').disabled=hist.i<=0; $('redo').disabled=hist.i>=hist.stack.length-1; }
  function startHistory(){ hist.stack=[snap()]; hist.i=0; hist.ready=true; syncUndo(); }

  /* ---- drafts: every unfinished story is kept on this phone (photos included), as a list per tool ----
     This page writes to one draft (draftId). It gets an id on the first change, so "Start fresh" never touches older drafts. */
  const DBASE=draftBase(B.id,cfg.id); let draftId=null, draftPfx=null, draftTimer=0, dirty=false, capWarned=false;
  const DKEY=()=>DBASE+':'+draftId;
  function saveDraft(s){
    if(!hist.ready) return; if(design) return;   // a saved design never goes to Continue editing
    if(hist.i>0) dirty=true; if(!dirty) return;
    if(!draftId){ const n=listDrafts(B.id,cfg.id).length; draftId=Date.now().toString(36)+Math.random().toString(36).slice(2,5); draftPfx=DKEY();
      $('draftBar').hidden=true; history.replaceState(null,'',location.pathname+'?draft='+draftId);   // a reload continues this same draft
      if(n>=DRAFT_CAP&&!capWarned){ capWarned=true; toast('You have '+(n+1)+' unfinished '+cfg.title+' stories on this phone. Remove old ones in Continue editing.',6000); } }
    clearTimeout(draftTimer); draftTimer=setTimeout(async()=>{
      if(design||!draftId) return;   // saved to the team meanwhile
      const key=DKEY(), pfx=draftPfx||key, keys=[];
      for(let i=0;i<S.photos.length;i++){ const p=S.photos[i]; if(p.img&&!p.sample&&p.key){ keys[i]=p.key; if(p.draftSaved!==pfx){ const blob=await photoBlob(p); if(blob){ await idb.put(pfx+':'+p.key,blob); p.draftSaved=pfx; } } } else keys[i]=null; }
      if(design||!draftId||key!==DKEY()) return;
      const old=store(key), thumb=draftThumb(); if(thumb) idb.put(key+':thumb',thumb);
      if(store(key,{json:s.json,keys,at:Date.now(),pfx})===null){ toast('This phone is out of room for drafts. Remove old ones in Continue editing.',6000); return; }
      if(old&&old.keys) old.keys.forEach(k=>{ if(k&&!keys.includes(k)) idb.del(pfx+':'+k); });
    },800);
  }
  function draftThumb(){ try{ const c=document.createElement('canvas'), k=400/H; c.width=Math.round(W*k); c.height=400; const ctx=c.getContext('2d'); const sel=S.sel; S.sel=null; ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height); withPage(0,()=>draw(ctx,true,k,true)); S.sel=sel; return c.toDataURL('image/jpeg',.7); }catch(_){ return null; } }
  /* the draft this page was writing is done (saved to the team): only that one goes */
  function clearDraft(){ clearTimeout(draftTimer); if(draftId) removeDraft(DKEY()); draftId=null; draftPfx=null; dirty=false; }
  async function loadDraft(x){
    const d=x.d, pfx=d.pfx||x.key, slots=[];
    for(let i=0;i<(d.keys||[]).length;i++){ const k=d.keys[i]; if(!k) continue; const blob=await idb.get(pfx+':'+k); if(blob){ slots[i]=await photoFromBlob(blob,k,true); slots[i].draftSaved=pfx; } }
    const r=JSON.parse(d.json); await fontsOf(r); applyRecipe(r,slots);
    draftId=x.id; draftPfx=pfx; dirty=true;
    if(new URLSearchParams(location.search).get('draft')!==x.id) history.replaceState(null,'',location.pathname+'?draft='+x.id);
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
    const bar=$('designBar'); syncSaveOpts(); if(!design){ bar.hidden=true; return; }
    bar.hidden=false;
    bar.innerHTML=`<span><span class="small">${design.kind==='template'?'Template':'Saved design'}</span><br><b>${esc(design.name)}</b></span><span class="banner-btns"><a class="mini" href="${ROOT}index.html#saved">All saved</a></span>`;
  }
  function thumbBlob(){
    const k=360/W, c=document.createElement('canvas'); c.width=360; c.height=Math.round(H*k); const ctx=c.getContext('2d'); const sel=S.sel; S.sel=null;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height); withPage(0,()=>draw(ctx,true,k,true)); S.sel=sel; return canvasBlob(c,'image/jpeg',.85);
  }
  /* ---- saving to the team: one function used by the Save sheet, "Only save to the team" and the leave prompt ---- */
  let teamCols=null; const teamPicked=new Set(), typedCols=new Set();   // typedCols: new collections typed on this page
  const hasPhotosNow=()=>S.photos.some((p,i)=>photoUsed(i)&&p.img&&!p.sample);
  function defaultName(){ const d=new Date(); return cfg.title+' – '+d.getDate()+' '+d.toLocaleString('en',{month:'short'}); }
  async function teamSave(o){
    o=o||{}; const C=await cloud();
    if(!(await ensureMember('Saved designs go to the team, so anyone on the team can find and reuse them.'))) throw new Error('Not saved to the team: sign in first.');
    const asNew=!!o.asNew||!design, name=(o.name||'').trim()||(design?design.name:defaultName());
    const keep=(o.keep!=null?o.keep:(design?design.kind!=='template':true))&&hasPhotosNow(), r=recipe();
    const photos=keep?await Promise.all(S.photos.map(async(p,i)=>{ if(!photoUsed(i)||!p.img||p.sample) return null; if(p.path&&!p.changed&&!asNew) return {path:p.path}; return {blob:await photoBlob(p)}; })):[];
    const cols=o.collections||(design?design.collections:[])||[];
    const id=await C.saveDesign({id:asNew?null:design.id,brand:B.id,tool:cfg.id,name,kind:keep?'design':'template',recipe:r,photos,thumb:await thumbBlob(),collections:cols});
    const fresh=await C.getDesign(id); (fresh.recipe.photoPaths||[]).forEach((p,i)=>{ if(p&&S.photos[i]){ S.photos[i].path=p; S.photos[i].changed=false; } });
    design={id,name,kind:keep?'design':'template',collections:cols}; store(LAST_COLS,cols); showDesignBar(); clearDraft(); markSaved();
    history.replaceState(null,'',location.pathname+'?design='+id);
    return name;
  }
  /* the Save sheet: one small sheet, ready to go. The name is filled in, the collection is the one you used last, and
     "Save to the team" is on when this phone is signed in to the team (for a new design: a design opened from Saved is only
     updated in the team when you switch it on, so nobody overwrites a team design by accident). One tap on Save makes the picture and adds it to the team;
     every detail can still be changed first. */
  let imgDone=false;   // the picture as it is now is already in Photos: the team switch then only adds it to the team
  let quickReady=false;   // just started from a photo on the home page and nothing edited yet: Save on the bar saves in one tap
  /* several photos from Quick start in a one-photo tool (Restock, Photo story): a story from each, one after the other (1.6.0).
     The words and the look stay; Save, then Next photo brings in the next one as a new story, ready to save in one tap. */
  const QUEUE=!PG&&!!(TOOLS[cfg.id]&&TOOLS[cfg.id].queue); let queue=[], qPos=0, qTotal=0, qSaved=false;
  let teamMember=null;   // is this phone signed in to the team? null = not checked yet (checked quietly after the page loads)
  const LAST_COLS='studio:lastCols:'+B.id;
  async function checkTeam(){ if(teamMember!==null) return teamMember; try{ const C=await cloud(); teamMember=!!(await C.session())&&!!(await C.isMember()); }catch(_){ teamMember=false; } return teamMember; }
  function syncSaveOpts(){
    const on=$('teamOn').checked;
    $('teamBox').hidden=!on;
    $('teamLbl').textContent=design?'Update “'+design.name+'” in the team':'Save to the team';
    $('teamSub').textContent=teamMember===false&&!on?'Sign in to share it with your team':design?'Saved designs keep your latest changes':'Your team finds it in Saved';
    $('teamAsNewRow').hidden=!design;
    if(document.activeElement!==$('teamName')&&!$('teamName').dataset.touched) $('teamName').value=design?design.name:defaultName();
    $('teamKeep').checked=$('teamKeep').dataset.touched?$('teamKeep').checked:(design?design.kind!=='template':true); $('teamKeep').disabled=!hasPhotosNow();
    $('saveTxt').textContent=imgDone?(on?(design?'Update in the team':'Add to the team'):'Save again'):on?(design?'Save & update':'Save & add to team'):saveAllLabel();
    $('photosRow').hidden=imgDone; $('teamOnly').hidden=imgDone||$('teamOnly').dataset.off==='1';
    if(on) paintTeamCols(); syncSaveAll();
  }
  /* the collections picked for this save: the design's own, or the ones used last time */
  function pickDefaultCols(){ teamPicked.clear(); const d=design?design.collections:store(LAST_COLS);
    (Array.isArray(d)?d:[]).forEach(n=>{ if(!n) return; if(!design&&teamCols&&teamCols.length&&!typedCols.has(n)&&!teamCols.some(c=>c.name===n)) return; teamPicked.add(n); }); }   // a remembered collection that no longer exists is dropped
  store('studio:teamSave',null);   // forget the old remembered setting
  $('teamOn').checked=false;
  $('teamOn').addEventListener('change',async e=>{ const sw=e.target; sw.dataset.touched='1'; syncSaveOpts();
    if(sw.checked&&!(await checkTeam())){ const ok=await ensureMember('Saved designs go to the team, so anyone on the team can find and reuse them.'); teamMember=ok;
      if(!ok){ sw.checked=false; } else { teamCols=null; } syncSaveOpts(); } });
  $('teamName').addEventListener('input',e=>{ e.target.dataset.touched='1'; });
  $('teamName').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
  $('teamKeep').addEventListener('change',e=>{ e.target.dataset.touched='1'; });
  let colsLoading=null;
  async function paintTeamCols(){
    if(!teamCols){ if(!colsLoading) colsLoading=(async()=>{ try{ teamCols=await checkTeam()?await (await cloud()).collections(B.id):[]; }catch(_){ teamCols=[]; }
        if(!design&&teamCols.length) [...teamPicked].forEach(n=>{ if(!typedCols.has(n)&&!teamCols.some(c=>c.name===n)) teamPicked.delete(n); }); })(); await colsLoading; colsLoading=null; }
    if(!teamCols) return;
    const all=[...new Set([...teamCols.map(c=>c.name),...teamPicked])].sort((a,b)=>a.localeCompare(b));
    $('teamCols').innerHTML=all.map(n=>`<button type="button" class="chip" dir="auto" data-col="${esc(n)}" aria-pressed="${teamPicked.has(n)}">${esc(n)}</button>`).join('')
      +`<button type="button" class="chip add" data-newcol aria-expanded="${!$('teamNewRow').hidden}">${ICON.plus}<span>New</span></button>`;
  }
  $('teamMore').addEventListener('click',()=>{ const open=$('teamMoreBox').hidden; $('teamMoreBox').hidden=!open; $('teamMore').setAttribute('aria-expanded',String(open)); $('teamMore').textContent=open?'Fewer options':'More options'; });
  $('teamCols').addEventListener('click',e=>{ if(e.target.closest('[data-newcol]')){ const r=$('teamNewRow'); r.hidden=!r.hidden; paintTeamCols(); if(!r.hidden) $('teamNewCol').focus(); return; }
    const b=e.target.closest('[data-col]'); if(!b) return; const n=b.dataset.col; teamPicked.has(n)?teamPicked.delete(n):teamPicked.add(n); haptic('tick'); paintTeamCols(); });
  const addTeamCol=()=>{ const n=$('teamNewCol').value.trim(); if(n){ teamPicked.add(n); typedCols.add(n); $('teamNewCol').value=''; $('teamNewRow').hidden=true; paintTeamCols(); } };
  $('teamAddCol').onclick=addTeamCol; $('teamNewCol').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addTeamCol(); } });
  function teamOpts(){ return {name:$('teamName').value,keep:$('teamKeep').checked,asNew:design&&$('teamAsNew').checked,collections:[...teamPicked]}; }
  function teamLine(t,ok){ const el=$('teamStatus'); el.hidden=!t; el.classList.toggle('ok',!!ok); el.innerHTML=t?(ok?ICON.check:'<span class="spin" aria-hidden="true"></span>')+'<span>'+esc(t)+'</span>':''; }
  async function runTeamSave(afterPicture){
    teamLine('Saving to the team…');
    try{ const name=await teamSave(teamOpts()); teamLine('Saved to the team as “'+name+'”',true); if(!afterPicture) celebrate(); }
    catch(err){ teamLine(''); status(err.message||'Could not save to the team.'); }
  }
  $('teamOnly').addEventListener('click',()=>{ if(!$('teamOn').checked){ $('teamOn').checked=true; syncSaveOpts(); } runTeamSave(); });

  /* ---- a saved design you're editing: changes are tracked so leaving can ask Update / Discard ---- */
  let baseJson=null;
  const curJson=()=>{ const r=recipe(); delete r.page; return JSON.stringify(r)+'|'+S.photos.map(p=>p.path||p.key||'').join(','); };
  function markSaved(){ baseJson=curJson(); }
  const designDirty=()=>!!design&&baseJson!==null&&curJson()!==baseJson;
  function leavePrompt(href){
    const d=dialog(`<div class="dlg-body"><h3 dir="auto">Save your changes to “${esc(design.name)}”?</h3><p class="small">You changed this saved design. Update it for the team, or leave it as it was.</p>
      <div class="status" id="lvSt" role="status"></div>
      <div class="dlg-actions col"><button type="button" class="btn" id="lvUpd">Update “${esc(design.name)}”</button><button type="button" class="btn ghost" id="lvDis">Discard changes</button><button type="button" class="link" id="lvKeep">Keep editing</button></div></div>`);
    d.querySelector('#lvKeep').onclick=()=>d.close();
    d.querySelector('#lvDis').onclick=()=>{ baseJson=curJson(); leaving=true; location.href=href; };
    d.querySelector('#lvUpd').onclick=async()=>{ d.querySelectorAll('button').forEach(b=>b.disabled=true); d.querySelector('#lvSt').textContent='Updating…';
      try{ await teamSave({name:design.name}); leaving=true; location.href=href; }catch(err){ d.querySelector('#lvSt').textContent=err.message; d.querySelectorAll('button').forEach(b=>b.disabled=false); } };
  }
  let leaving=false;
  document.querySelectorAll('nav.top a').forEach(a=>a.addEventListener('click',e=>{ if(designDirty()){ e.preventDefault(); leavePrompt(a.href); } }));
  addEventListener('beforeunload',e=>{ if(!leaving&&designDirty()){ e.preventDefault(); e.returnValue=''; } });
  async function openDesign(id,ready){
    status('Opening the saved design…');
    if(!(await ensureMember('This design is saved with the team. Sign in to open it.'))){ status(''); return false; }
    const C=await cloud(); const d=await C.getDesign(id); const r=d.recipe;
    if(d.tool!==cfg.id){ location.replace(toolPage(d.tool)+'?design='+id+(ready?'&go=1':'')); return false; }
    const slots=[];
    if(d.kind!=='template') await Promise.all((r.photoPaths||[]).map(async(p,i)=>{ if(!p) return; try{ const ph=await photoFromBlob(await C.download(p)); ph.path=p; ph.changed=false; slots[i]=ph; }catch(_){ } }));
    await fontsOf(r); applyRecipe(r,slots);
    design={id:d.id,name:d.name,kind:d.kind,collections:d.collectionNames}; pickDefaultCols(); showDesignBar(); status(''); markSaved();
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
  const textExtra=id=>{ const x=extra(id); return x&&!x.type?x:null; };   // "Add text" layers (they keep their own size)
  function layerText(id){ const x=extra(id); if(x) return x.type==='asset'||(x.type==='comp'&&x.text==null)?null:x.text; const f=fields.find(f=>f.id===id); if(!f) return null; const t=value(id); return typeof t==='string'?t:null; }
  let inspPart=null;   // phone: which one control of the layer bar is open (none = slim bar only)
  function select(id){
    if(id!==S.sel) inspPart=null;
    S.sel=id; syncInspector(); render();
    if(id) openSheet('insp',{quiet:true}); else if(openName==='insp') closeSheet('insp'); else if(!isPhone()) closeSheet('insp');
  }
  function syncInspector(){
    const id=S.sel, b=reg.find(x=>x.id===id); if(!id) return;
    const l=S.layers[id]||{k:1,color:null,hidden:false}; const t=layerText(id), x=extra(id);
    $('inspName').textContent=x?(x.type==='asset'?((assetDef(x.ref)||{}).label||'Asset'):x.type==='comp'?(COMP(x.comp)||{}).label||'Element':'Your text'):(b&&b.label)||'Layer';
    const ti=$('inspText'); if(t!==null&&document.activeElement!==ti) ti.value=t;
    const isAsset=!!(x&&x.type==='asset'), ad=isAsset&&assetDef(x.ref);
    $('inspSize').min=x&&x.type?'0.2':'0.4'; $('inspSize').max=x&&x.type?'4':'2.5';
    $('inspSize').value=x&&!x.type?x.size/60:l.k;
    $('inspHide').textContent=l.hidden?'Show':'Hide'; $('inspDelete').hidden=!x; $('inspDup').hidden=!x; $('inspOrder').hidden=!x;
    if(x){ const i=S.extras.indexOf(x); $('inspBack').disabled=i<=0; $('inspFwd').disabled=i>=S.extras.length-1; }
    const C=B.colors, kind=b&&b.kind, isShape=isAsset&&ad&&!ad.file, plain=isShape&&!!(ad.line||ad.sticker), comp=x&&x.type==='comp'?COMP(x.comp):null;
    /* colour: the brand palette (+ Custom) for everything that can take a colour; photos and cut-outs keep theirs */
    const canColor=!(isAsset&&ad&&ad.file&&!ad.tint);
    const cur=x&&!x.type?x.color:isShape?(l.color||x.color):l.color;
    $('inspColors').innerHTML=canColor?`<span class="lbl">${isShape&&!ad.sticker?'Fill':kind==='pill'&&!comp?'Button colour':'Colour'}</span>`+palettePicker('col',cur,{auto:x&&!x.type?null:isShape?null:(isAsset?'Original':'Auto'),none:isShape&&!plain}):'';
    $('inspShape').hidden=!isShape||plain;
    if(isShape&&!plain){ if(!$('inspStroke').firstChild||$('inspStroke').dataset.for!==id){ $('inspStroke').innerHTML=palettePicker('stroke',x.stroke||'none',{none:true}); $('inspStroke').dataset.for=id; } else syncPalette($('inspStroke').firstChild,x.stroke||'none');
      if(document.activeElement!==$('inspSW')) $('inspSW').value=x.sw||0; $('inspRRow').hidden=ad.radius==null; if(document.activeElement!==$('inspR')) $('inspR').value=x.r!=null?x.r:ad.radius||0; }
    if(document.activeElement!==$('inspOp')) $('inspOp').value=l.op!=null?l.op:1;
    $('inspWH').hidden=!(isShape&&ad.free); if(isShape&&ad.free){ $('inspW').value=x.w; $('inspH').value=x.h||Math.round(x.w*ad.h/ad.w); }
    const textish=kind==='text'||kind==='pill';
    $('inspFontRow').hidden=!textish;
    if(textish){
      const opt=f=>`<option value="${esc(f.family)}" style="font-family:'${esc(f.family)}'">${esc(f.label||f.family)}</option>`;
      const html=`<option value="">Brand font (default)</option><optgroup label="${esc(B.name)} fonts">${brandFonts().map(opt).join('')}</optgroup><optgroup label="More fonts">${MORE_FONTS.map(opt).join('')}</optgroup>`;
      if($('inspFont').dataset.built!=='1'){ $('inspFont').innerHTML=html; $('inspFont').dataset.built='1'; }
      $('inspFont').value=l.font||'';
    }
    /* line options (align, line height, spacing, shadow, background pill): plain text layers only */
    const typ=kind==='text'&&b&&b.typ; $('inspType').hidden=!typ;
    if(typ){ const al=l.align||''; document.querySelectorAll('#inspAlign [data-align]').forEach(bt=>bt.setAttribute('aria-pressed',String(bt.dataset.align===al)));
      if(document.activeElement!==$('inspLH')) $('inspLH').value=l.lh||1.2; if(document.activeElement!==$('inspLS')) $('inspLS').value=l.ls||0;
      $('inspShadow').checked=l.shadow!=null?!!l.shadow:!!b.shadow; const pill=!!(l.bg&&l.bg!=='none'); $('inspPill').checked=pill;
      if($('inspPillPal').dataset.for!==id||!$('inspPillPal').firstChild){ $('inspPillPal').innerHTML=palettePicker('pill',l.bg||C.ink); $('inspPillPal').dataset.for=id; } else syncPalette($('inspPillPal').firstChild,l.bg||C.ink);
      $('inspPillPal').hidden=!pill; }
    $('inspPasteStyle').hidden=!copiedStyle();
    $('inspTextHint').hidden=!(t!==null&&!oneLine(id));
    const has={text:t!==null,size:true,move:true,color:true,font:textish,more:true};
    const fb=$('inspFlip'); fb.hidden=!canFlip(b); fb.setAttribute('aria-pressed',String(!!l.flip&&canFlip(b)));
    const rot=l.rot||0; if(document.activeElement!==$('inspRot')) $('inspRot').value=rot; $('inspRotOut').textContent=Math.round(rot)+'°';
    if(inspPart&&!has[inspPart]) inspPart=null;
    document.querySelectorAll('#sh-insp .itab').forEach(tb=>{ tb.hidden=!has[tb.dataset.part]; tb.setAttribute('aria-pressed',String(tb.dataset.part===inspPart)); });
    document.querySelectorAll('#sh-insp .insp-part').forEach(pt=>{ pt.classList.toggle('on',pt.dataset.part===inspPart); pt.hidden=!has[pt.dataset.part]; });
    autoGrow();
  }
  $('inspClose').addEventListener('click',()=>select(null));
  document.querySelector('#sh-insp .insp-tabs').addEventListener('click',e=>{ const tb=e.target.closest('.itab'); if(!tb) return; inspPart=inspPart===tb.dataset.part?null:tb.dataset.part; syncInspector();
    if(inspPart==='text') setTimeout(()=>{ $('inspText').focus(); },30); });
  $('inspRot').addEventListener('input',e=>{ if(S.sel) setRot(S.sel,snapRot(+e.target.value)); });
  $('inspFlip').addEventListener('click',()=>{ const id=S.sel, b=reg.find(r=>r.id===id&&!r.hidden&&!r.empty); if(!id||!canFlip(b)) return; const l=LL(id); if(l.flip) delete l.flip; else l.flip=true; haptic('tick'); syncInspector(); render(); });
  document.querySelector('#sh-insp .rot-btns').addEventListener('click',e=>{ const b=e.target.closest('[data-rot]'); if(!b||!S.sel) return; const d=+b.dataset.rot, cur=(S.layers[S.sel]||{}).rot||0; setRot(S.sel,d?Math.round((cur+d)/15)*15:0); });
  /* the text box grows with its lines; Enter makes a new line (one-line layers: Enter = done) */
  function autoGrow(){ const t=$('inspText'); t.style.height='auto'; t.style.height=Math.min(160,t.scrollHeight+2)+'px'; }
  $('inspText').addEventListener('keydown',e=>{ if(e.key!=='Enter') return; if(oneLine(S.sel)||e.ctrlKey||e.metaKey){ e.preventDefault(); e.target.blur(); } });
  const LL=id=>S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false});
  const setL=(k,v)=>{ const id=S.sel; if(!id) return; const l=LL(id); if(v==null) delete l[k]; else l[k]=v; syncInspector(); render(); };
  $('inspAlign').addEventListener('click',e=>{ const b=e.target.closest('[data-align]'); if(b) setL('align',(S.layers[S.sel]||{}).align===b.dataset.align?null:b.dataset.align); });
  $('inspLH').addEventListener('input',e=>setL('lh',+e.target.value===1.2?null:+e.target.value));
  $('inspLS').addEventListener('input',e=>setL('ls',+e.target.value||null));
  $('inspShadow').addEventListener('change',e=>setL('shadow',e.target.checked));
  $('inspPill').addEventListener('change',e=>setL('bg',e.target.checked?B.colors.ink:null));
  $('inspOp').addEventListener('input',e=>setL('op',+e.target.value>=1?null:+e.target.value));
  $('inspSW').addEventListener('input',e=>{ const x=extra(S.sel); if(!x) return; x.sw=+e.target.value; if(x.sw&&!x.stroke) x.stroke=B.colors.ink; syncInspector(); render(); });
  $('inspR').addEventListener('input',e=>{ const x=extra(S.sel); if(x){ x.r=+e.target.value; render(); } });
  $('inspW').addEventListener('input',e=>{ const x=extra(S.sel), a=x&&assetDef(x.ref); if(!a) return; if(!x.h) x.h=Math.round(x.w*a.h/a.w); x.w=+e.target.value; render(); });
  $('inspH').addEventListener('input',e=>{ const x=extra(S.sel); if(x){ x.h=+e.target.value; render(); } });
  /* every colour in the layer bar comes from the same palette picker */
  wirePalettes($('sh-insp'),(key,v)=>{ const id=S.sel; if(!id) return; const x=extra(id);
    if(key==='col'){ const tx=textExtra(id); if(tx){ tx.color=v||B.colors.paper; tx.shadow=!(v&&!isLight(v)); } else LL(id).color=v||null; }
    else if(key==='stroke'&&x){ x.stroke=v==='none'?null:v; if(x.stroke&&!x.sw) x.sw=6; }
    else if(key==='pill') LL(id).bg=v||B.colors.ink;
    syncInspector(); render(); });
  $('inspFont').addEventListener('change',async e=>{ const id=S.sel; if(!id) return; const fam=e.target.value||null; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false});
    if(fam){ status('Loading font…'); await ensureFont(fam); status(''); } l.font=fam; render(); });
  let snapOn=!!store('studio:snap');   // off unless you turn it on; remembered on this phone
  const syncSnap=()=>{ $('snapBtn').setAttribute('aria-pressed',String(snapOn)); $('snapBtn').title=snapOn?'Snap to guides: on':'Snap to guides: off'; };
  syncSnap(); $('snapBtn').addEventListener('click',()=>{ snapOn=!snapOn; store('studio:snap',snapOn?1:null); syncSnap(); status(snapOn?'Snap to guides: on':'Snap to guides: off',1500); });
  $('undo').addEventListener('click',undo); $('redo').addEventListener('click',redo);
  document.addEventListener('keydown',e=>{ if(!(e.ctrlKey||e.metaKey)||e.altKey) return; const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT')) return;
    const k=e.key.toLowerCase(); if(k==='z'&&!e.shiftKey){ e.preventDefault(); undo(); } else if((k==='z'&&e.shiftKey)||k==='y'){ e.preventDefault(); redo(); } });
  /* Start fresh = a new story; the unfinished ones stay in Continue editing */
  $('draftFresh').addEventListener('click',()=>{ $('draftBar').hidden=true; status('Your other story is kept on Home.',3000); });
  $('draftGo').addEventListener('click',async()=>{ $('draftBar').hidden=true; const x=listDrafts(B.id,cfg.id)[0]; if(x){ await loadDraft(x); syncUI(); syncInspector(); paintPager(); draw(vctx,true); startHistory(); } });
  $('inspText').addEventListener('input',e=>{ const id=S.sel, x=extra(id); if(x) x.text=e.target.value; else setValue(id,e.target.value); autoGrow(); render(); });
  $('inspSize').addEventListener('input',e=>{ const id=S.sel, x=textExtra(id); if(x) x.size=Math.round(+e.target.value*60); else { (S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1})).k=+e.target.value; } render(); });
  $('inspCenter').addEventListener('click',()=>{ const id=S.sel, b=reg.find(r=>r.id===id); if(!b||b.hidden) return; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1}); l.dx+=W/2-(b.x+b.w/2); render(); });
  $('inspMiddle').addEventListener('click',()=>{ const id=S.sel, b=reg.find(r=>r.id===id); if(!b||b.hidden) return; LL(id).dy+=H/2-(b.y+b.h/2); render(); });
  /* nudge: one tap = a small step; hold to keep moving (faster after a moment) */
  { let rep=0, n=0; const step=(dx,dy)=>{ const id=S.sel; if(!id) return; const l=LL(id), k=n>12?24:8; l.dx+=dx*k; l.dy+=dy*k; n++; render(); };
    const stop=()=>{ clearTimeout(rep); rep=0; n=0; };
    const nb=e=>e.target.closest('[data-nudge]'), dir=b=>b.dataset.nudge.split(',').map(Number);
    const box=$('sh-insp');
    box.addEventListener('pointerdown',e=>{ const b=nb(e); if(!b) return; e.preventDefault(); stop(); const [dx,dy]=dir(b); step(dx,dy); haptic('tick'); const go=()=>{ step(dx,dy); rep=setTimeout(go,70); }; rep=setTimeout(go,380); });
    ['pointerup','pointercancel','pointerleave'].forEach(t=>box.addEventListener(t,e=>{ if(rep&&(t!=='pointerleave'||nb(e))) stop(); }));
    box.addEventListener('click',e=>{ const b=nb(e); if(b&&e.detail===0){ const [dx,dy]=dir(b); step(dx,dy); n=0; } });   // keyboard
    box.addEventListener('contextmenu',e=>{ if(nb(e)) e.preventDefault(); }); }
  /* ---- copy style / paste style: the look of one layer (colour, font, line options, shadow, pill, opacity, outline) onto another.
     Kept on this device, so a look copied in one story can be pasted in the next one. Size, place and rotation stay as they are. ---- */
  const STYLE_KEY='studio:style';
  const copiedStyle=()=>{ const st=store(STYLE_KEY); return st&&typeof st==='object'?st:null; };
  function styleOf(id){
    const l=S.layers[id]||{}, x=extra(id), tx=textExtra(id), ad=x&&x.type==='asset'&&assetDef(x.ref), st={};
    const color=tx?tx.color:ad&&!ad.file?(l.color||x.color):l.color; if(color) st.color=color;
    ['font','align','lh','ls','bg','op'].forEach(k=>{ if(l[k]!=null) st[k]=l[k]; });
    const b=reg.find(r=>r.id===id), sh=l.shadow!=null?l.shadow:tx?tx.shadow:b&&b.typ?b.shadow:null; if(sh!=null) st.shadow=!!sh;
    if(ad&&!ad.file&&!ad.line&&!ad.sticker){ if(x.stroke){ st.stroke=x.stroke; st.sw=x.sw||6; } if(x.r!=null) st.r=x.r; }
    return st;
  }
  async function pasteStyle(id,st){
    const b=reg.find(r=>r.id===id), l=LL(id), x=extra(id), tx=textExtra(id), ad=x&&x.type==='asset'&&assetDef(x.ref);
    const kind=b&&b.kind, textish=kind==='text'||kind==='pill', typ=kind==='text'&&b&&b.typ, shape=ad&&!ad.file, canColor=!(ad&&ad.file&&!ad.tint);
    if(canColor){ if(tx){ if(st.color) tx.color=st.color; } else if(shape){ if(st.color) l.color=st.color; } else if(st.color) l.color=st.color; else l.color=null; }
    if(textish){ if(st.font){ status('Loading font…'); await ensureFont(st.font); status(''); } if(st.font) l.font=st.font; else delete l.font; }
    if(typ){ ['align','lh','ls','bg'].forEach(k=>{ if(st[k]!=null) l[k]=st[k]; else delete l[k]; }); if(st.shadow!=null){ l.shadow=st.shadow; if(tx) tx.shadow=st.shadow; } }
    if(st.op!=null) l.op=st.op; else delete l.op;
    if(shape&&!ad.line&&!ad.sticker){ x.stroke=st.stroke||null; x.sw=st.stroke?st.sw||6:0; if(st.r!=null&&ad.radius!=null) x.r=st.r; }
  }
  $('inspCopyStyle').addEventListener('click',()=>{ const id=S.sel; if(!id) return; store(STYLE_KEY,styleOf(id)); haptic('tick'); syncInspector(); status('Style copied. Tap another layer, then More → Paste style.',2600); });
  $('inspPasteStyle').addEventListener('click',async()=>{ const id=S.sel, st=copiedStyle(); if(!id||!st) return; await pasteStyle(id,st); haptic('tick'); syncInspector(); render(); status('Style pasted. Tap undo to bring the old one back.',2600); });
  $('inspReset').addEventListener('click',()=>{ const id=S.sel, x=textExtra(id); if(x){ x.size=60; } S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}; syncInspector(); render(); });
  $('inspHide').addEventListener('click',()=>{ const id=S.sel; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1}); l.hidden=!l.hidden; syncInspector(); render(); });
  $('inspDelete').addEventListener('click',()=>{ S.extras=S.extras.filter(x=>x.id!==S.sel); delete S.layers[S.sel]; select(null); });
  /* duplicate an added layer: same look, a little lower */
  $('inspDup').addEventListener('click',()=>{ const x=extra(S.sel); if(!x) return; const n=Math.max(assetN,extraN)+1; assetN=extraN=n; const c=clone(x); c.id=(x.type==='asset'?'asset':x.type==='comp'?'comp':'extra')+n;
    const l=S.layers[x.id]; S.layers[c.id]=l?{...clone(l),dy:(l.dy||0)+60}:{dx:0,dy:60,k:1,color:null,hidden:false}; S.extras.splice(S.extras.indexOf(x)+1,0,c); select(c.id); });
  let extraN=0;
  $('addText').addEventListener('click',()=>{
    const n=Math.max(assetN,extraN)+1; assetN=extraN=n; const id='extra'+n;
    // new text starts in the middle, light with a soft shadow so it reads on photos; change colour in the panel
    S.extras.push({id,text:B.phrases.write||'Text',font:'display',size:72,color:B.colors.paper,shadow:true,y:H/2-60+(S.extras.length%4)*90});
    select(id); inspPart='text'; syncInspector(); setTimeout(()=>{ $('inspText').focus(); $('inspText').select(); },30);
  });
  /* ---- elements: every piece a tool has (button, place line, flavour pills, offer tile, dates, small line, logo,
     "map in bio" pill, Instagram handle) can be added to ANY tool as a normal layer. Words come from the brand kit. ---- */
  const COMPS=[
    {id:'button',label:'Button',oneLine:true,text:()=>(B.phrases.buttons||[])[0]||B.phrases.write||'Button'},
    {id:'bio',label:'Map in bio',oneLine:true,text:()=>B.phrases.bio||(B.phrases.buttons||[])[0]||'Map in bio'},
    {id:'place',label:'Place + pin',oneLine:true,text:()=>B.phrases.placeName||'Place'},
    {id:'flavours',label:'Flavour pills',when:()=>(B.flavours||[]).length},
    {id:'tile',label:'Offer tile',text:()=>'×3\n20%'},
    {id:'dates',label:'Dates line',oneLine:true,text:()=>dateRange(iso(today()),iso(new Date(Date.now()+6*864e5)))},
    {id:'small',label:'Small line',text:()=>(B.phrases.small||[])[0]||B.phrases.write||'Text'},
    {id:'handle',label:'Instagram handle',oneLine:true,when:()=>!!B.handle,text:()=>B.handle},
    {id:'logo',label:'Logo',asset:'logo'}
  ];
  function COMP(id){ return COMPS.find(c=>c.id===id)||null; }
  function drawComp(h,x){
    const c=COMP(x.comp); if(!c){ return; } const C=B.colors, t=x.text, id=x.id, lb=c.label;
    if(x.comp==='button') h.pill(id,lb,t,x.x,x.y-38);
    else if(x.comp==='bio') h.pill(id,lb,t,x.x,x.y-38,{icon:'pin'});
    else if(x.comp==='place') h.pin(id,lb,t,x.x,x.y-22,{color:C.muted});
    else if(x.comp==='handle') h.pin(id,lb,t,x.x,x.y-22,{icon:'insta',color:C.ink});
    else if(x.comp==='flavours') h.tags(id,lb,(B.flavours||[]).map(f=>({text:f.name,bg:f.bg,fg:f.fg})),x.x,x.y-36,{size:36,h:72});
    else if(x.comp==='tile'){ const ln=String(t||'').split('\n'); h.tile(id,lb,ln.length>1?ln[0]:'',ln.length>1?ln.slice(1).join(' '):ln[0],x.x,x.y-130); }
    else if(x.comp==='dates') h.text(id,lb,t,x.x,x.y-22,{weight:'800',size:40,color:C.muted,maxW:960});
    else if(x.comp==='small') h.text(id,lb,t,x.x,x.y-20,{weight:'800',size:38,color:C.muted,maxW:960});
  }
  /* the Element sheet shows each one drawn for real, small */
  function paintComps(){
    const list=COMPS.filter(c=>!c.when||c.when());
    $('compList').innerHTML=list.map(c=>`<button type="button" class="comp-tile" data-comp="${c.id}"><canvas width="540" height="240" aria-hidden="true"></canvas><span>${esc(c.label)}</span></button>`).join('');
    list.forEach(c=>{ const cv=$('compList').querySelector(`[data-comp="${c.id}"] canvas`), cx=cv.getContext('2d'); cx.scale(.75,.75);   // a 720×320 window onto the story
      if(c.asset){ const hh=LOGO.height/LOGO.width*380; cx.drawImage(LOGO,170,160-hh/2,380,hh); return; }
      const fake={layers:{},photos:[]}, hh=makeHelpers(cx,fake,true,[],.75,0,1); drawComp(hh,{id:'p',comp:c.id,text:c.text?c.text():null,x:360,y:160}); });
  }
  function addComp(cid){
    const c=COMP(cid); if(!c) return; closeSheet('comps');
    if(c.asset) return addAsset(c.asset);
    const n=Math.max(assetN,extraN)+1; assetN=extraN=n; const id='comp'+n;
    S.extras.push({id,type:'comp',comp:cid,text:c.text?c.text():null,x:W/2,y:H/2+(S.extras.length%4)*90});
    select(id);
  }
  $('addComp').addEventListener('click',()=>{ paintComps(); openSheet('comps'); });
  $('compList').addEventListener('click',e=>{ const t=e.target.closest('[data-comp]'); if(t) addComp(t.dataset.comp); });
  const oneLine=id=>{ const b=reg.find(r=>r.id===id), x=extra(id); if(x&&x.type==='comp'){ const c=COMP(x.comp); return !c||!!c.oneLine; } return !!(b&&b.kind!=='text'); };

  /* ---- assets library: brand files (logo, cans, stickers) and shapes, added as movable layers ---- */
  function assetThumb(a){
    if(a.file) return `<img alt="" src="${esc(assetPrevUrl(a))}"${a.tint?' data-logo':''} loading="lazy" onerror="this.closest('button').classList.add('missing');this.remove()">`;
    const c=document.createElement('canvas'), k=56/Math.max(a.w,a.h); c.width=Math.ceil(a.w*k)+4; c.height=Math.ceil(a.h*k)+4; const x=c.getContext('2d'); x.translate(2,2); x.scale(k,k); drawShape(x,a,a.w,a.h,getComputedStyle(document.body).color||'#161210');
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
    /* starting size: logo 320 wide; photos/cut-outs about 700 tall (so a pair of cans starts big enough), never wider than 960 */
    let w=a.w0; if(!w){ if(a.file){ const im=ASSET_IMG.get(ref).img; w=a.tint||a.group==='Logo'?320:Math.min(960,Math.round(700*im.width/im.height)); } else w=a.free?a.w:a.w>a.h*2?420:260; }
    const n=Math.max(assetN,extraN)+1; assetN=extraN=n; const id='asset'+n;
    const ch=a.free?a.h:undefined; S.extras.push({id,type:'asset',ref,w,...(ch?{h:ch}:{}),x:W/2,y:H/2+(S.extras.length%4)*60,color:a.file?null:((a.color&&B.colors[a.color])||B.colors.ink)});
    closeSheet('assets'); select(id);
  }
  $('addAsset').addEventListener('click',()=>{ paintAssets(); openSheet('assets'); });
  $('assetList').addEventListener('click',e=>{ const t=e.target.closest('[data-asset]'); if(t) addAsset(t.dataset.asset); });
  if(hasStickers){   /* stickers (assets/stickers.js): a sheet of previews; each one is added as a normal shape layer */
    $('addSticker').addEventListener('click',()=>{ paintStickers($('stickerList')); openSheet('stickers'); });
    $('stickerList').addEventListener('click',e=>{ const t=e.target.closest('[data-sticker]'); if(t){ closeSheet('stickers'); addAsset(t.dataset.sticker); } }); }
  function moveExtra(d){ const x=extra(S.sel); if(!x) return; const i=S.extras.indexOf(x), j=i+d; if(j<0||j>=S.extras.length) return; S.extras.splice(i,1); S.extras.splice(j,0,x); syncInspector(); render(); }
  $('inspBack').addEventListener('click',()=>moveExtra(-1)); $('inspFwd').addEventListener('click',()=>moveExtra(1));
  onAssetLoad=()=>render();

  $('resetLayout').addEventListener('click',()=>{ S.layers={}; S.photos.forEach(p=>{p.ox=0;p.oy=0;p.zoom=1;}); syncZoom(); syncInspector(); render(); toast('Layout reset. Tap undo to bring it back.'); });

  /* ---- layers panel: every text, button and logo, top first; tap to select, eye to hide/show ---- */
  const EYE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const KIND={text:'Text',pill:'Button',logo:'Logo',asset:'Asset',sticker:'Sticker'};
  let layersSig='';
  function paintLayers(){
    if(isPhone()&&openName!=='layers'){ layersSig=''; return; }   // only keep the list up to date while it's on screen
    const seen=new Set(), items=[];
    for(let j=reg.length-1;j>=0;j--){ const b=reg[j]; if(!b.id||b.empty||seen.has(b.id)) continue; seen.add(b.id); items.push(b); }
    const rows=items.map(b=>{ const t=layerText(b.id), x=extra(b.id); return {id:b.id,name:x&&!x.type?'Your text':b.label||KIND[b.kind]||'Layer',kind:KIND[b.kind]||'',text:t&&t!==b.label?t:'',hidden:!!b.hidden,sel:S.sel===b.id}; });
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
  const inBox=(pt,b)=>{ const d=b.pad||0; return pt.x>=b.x-d&&pt.x<=b.x+b.w+d&&pt.y>=b.y-d&&pt.y<=b.y+b.h+d; };   // a photo plus its frame
  function hit(pt){
    for(let j=reg.length-1;j>=0;j--){ const b=reg[j]; if(b.id&&!b.hidden&&!b.empty){ const pad=24;
      if(b.rot){ const dx=pt.x-b.cx, dy=pt.y-b.cy, c=Math.cos(-b.rot), s=Math.sin(-b.rot), lx=dx*c-dy*s, ly=dx*s+dy*c; if(Math.abs(lx)<=b.rw/2+pad&&Math.abs(ly)<=b.rh/2+pad) return {layer:b.id}; }
      else if(pt.x>=b.x-pad&&pt.x<=b.x+b.w+pad&&pt.y>=b.y-pad&&pt.y<=b.y+b.h+pad) return {layer:b.id}; } }
    for(let j=reg.length-1;j>=0;j--){ const b=reg[j]; if(b.photo!=null&&inBox(pt,b)) return {photo:b.photo,mode:b.mode}; }
    return null;
  }
  /* carousels: swipe sideways starting near the left or right edge of the preview to change slide */
  let swipe=null;
  view.addEventListener('pointerdown',e=>{ if(!PG||pts.size) return; const pt=toCanvas(e); const h0=hit(pt); if(h0&&h0.layer) return;
    if(pt.x<W*.09||pt.x>W*.91){ swipe={x:e.clientX,y:e.clientY,id:e.pointerId}; e.stopImmediatePropagation(); view.setPointerCapture(e.pointerId); } },true);
  view.addEventListener('pointermove',e=>{ if(swipe&&e.pointerId===swipe.id) e.stopImmediatePropagation(); },true);
  view.addEventListener('pointerup',e=>{ if(!swipe||e.pointerId!==swipe.id) return; e.stopImmediatePropagation(); const dx=e.clientX-swipe.x, dy=e.clientY-swipe.y; swipe=null;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)) goPage(S.page+(dx<0?1:-1)); },true);
  view.addEventListener('pointercancel',()=>{ swipe=null; },true);
  /* keepSel: a layer was selected when this touch began somewhere else. A second finger then pinches / twists
     that layer (wherever the fingers are); a one-finger tap elsewhere deselects it as before. */
  let keepSel=null;
  view.addEventListener('pointerdown',e=>{
    const pt=toCanvas(e);
    if(pts.size){   // another finger joins
      if(keepSel&&(!target||!target.layer)){ if(lift) endLift(); target={layer:keepSel}; moved=true; }
      if(!target) return;
      view.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); snapshot(); return;
    }
    target=hit(pt); moved=false; keepSel=S.sel&&!(target&&target.layer===S.sel)?S.sel:null;
    if(!target&&!keepSel){ select(null); if(openName&&openName!=='insp') closeSheet(); return; }   // tapping an empty spot closes the open panel
    if(target&&target.photo!=null){ const p=S.photos[target.photo];
      if(!p.img||p.sample){ S.active=target.photo; target.pick=true; }   // an empty photo box opens the picker when you lift your finger
      else { S.active=target.photo; syncZoom();
        /* more than one photo: hold a photo to lift it, then drop it on another to swap (Collage photos can't pan, so a plain drag lifts them) */
        if(slotCount()>1){ const i=target.photo; lift={i,on:false,instant:target.mode==='contain',x:e.clientX,y:e.clientY};
          if(!lift.instant) lift.timer=setTimeout(()=>{ if(lift&&!lift.on&&!moved&&pts.size===1) startLift(lift.x,lift.y); },380); } } }
    view.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    snapshot(); view.classList.add('dragging');
  });
  function snapshot(){
    if(!target) return;
    if(target.layer){ const id=target.layer, x=extra(id), l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}); const b=reg.find(r=>r.id===id&&!r.hidden&&!r.empty); st={dx:l.dx,dy:l.dy,k:l.k,rot:l.rot||0,size:x?x.size:0,box:b?{x:b.x,y:b.y,w:b.w,h:b.h}:null,snap:snapTargets(id),pts:new Map(pts)}; }
    else { const p=S.photos[target.photo]; st={ox:p.ox,oy:p.oy,zoom:p.zoom,pts:new Map(pts)}; }
  }
  /* rotation in degrees, kept between -180 and 180; within 4° of 0/90/180 it settles there */
  function normRot(r){ r=((r+180)%360+360)%360-180; return Math.round(r*10)/10; }
  function snapRot(r){ r=normRot(r); for(const t of [-180,-90,0,90,180]) if(Math.abs(r-t)<4) return t===-180?180:t; return r; }
  function setRot(id,r){ const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}); l.rot=normRot(r); if(!l.rot) delete l.rot; syncInspector(); render(); }
  /* ---- swapping photos: lift one, drop it on another ---- */
  let lift=null;
  function photoAt(pt){ for(let j=reg.length-1;j>=0;j--){ const b=reg[j]; if(b.photo!=null&&inBox(pt,b)) return b.photo; } return null; }
  function startLift(cx,cy){ if(!lift) return; lift.on=true; const p=S.photos[lift.i]; if(navigator.vibrate) navigator.vibrate(10);
    const g=document.createElement('img'); g.className='lift-ghost'; g.src=p.thumb||''; g.alt=''; document.body.appendChild(g); lift.ghost=g; moveGhost(cx,cy); view.classList.add('lifting'); render(); }
  function moveGhost(cx,cy){ if(lift&&lift.ghost) lift.ghost.style.transform=`translate(${cx-44}px,${cy-44}px)`; }
  function endLift(){ if(!lift) return; clearTimeout(lift.timer); if(lift.ghost) lift.ghost.remove(); view.classList.remove('lifting'); const l=lift; lift=null;
    if(l.on&&l.over!=null&&l.over!==l.i) swapPhotos(l.i,l.over); else if(l.on) render(); return l.on; }
  function swapPhotos(i,j){ const a=S.photos[i], b=S.photos[j]; S.photos[i]=b; S.photos[j]=a; [a,b].forEach(p=>{ if(p){ p.ox=0; p.oy=0; p.zoom=1; } }); S.active=j; syncUI(); render(); status('Photos swapped. Undo puts them back.',2500); }
  view.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId)||!st||!target) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const k=W/view.getBoundingClientRect().width;
    if(lift){ if(pts.size>1){ endLift(); }
      else if(lift.on){ moveGhost(e.clientX,e.clientY); const j=photoAt(toCanvas(e)); const over=j!=null&&j!==lift.i?j:null; if(over!==lift.over){ lift.over=over; render(); } return; }
      else if(Math.hypot(e.clientX-lift.x,e.clientY-lift.y)>8){ if(lift.instant){ moved=true; startLift(e.clientX,e.clientY); return; } clearTimeout(lift.timer); lift=null; } }
    if(pts.size===1&&st.pts.size===1){
      const p0=[...st.pts.values()][0], ddx=(e.clientX-p0.x)*k, ddy=(e.clientY-p0.y)*k;
      if(Math.hypot(ddx,ddy)>8) moved=true; if(!moved) return;
      if(target.layer){ const l=S.layers[target.layer]; let mx=ddx, my=ddy; guides=[]; dragging=true; document.body.classList.add('dragging-layer');
        /* snap on: a gentle pull within 6px of a line. Snap off: lines still show when you're within 2px, nothing moves you. */
        if(st.box){ const tol=(snapOn?6:2)*k, sx=snapAxis(st.box.x+mx,st.box.w,st.snap.xs,tol), sy=snapAxis(st.box.y+my,st.box.h,st.snap.ys,tol);
          if(sx){ if(snapOn) mx+=sx.d; guides.push({axis:'x',v:sx.v,kind:sx.kind}); } if(sy){ if(snapOn) my+=sy.d; guides.push({axis:'y',v:sy.v,kind:sy.kind}); } }
        l.dx=st.dx+mx; l.dy=st.dy+my;
        if(!S.sel||S.sel!==target.layer) select(target.layer);
      } else if(target.photo!=null&&!target.pick){ if(keepSel){ keepSel=null; select(null); } if(target.mode==='cover'){ const p=S.photos[target.photo]; p.ox=st.ox+ddx; p.oy=st.oy+ddy; } }
    } else if(pts.size>=2&&st.pts.size>=2){
      moved=true; const a=[...pts.values()], c=[...st.pts.values()]; const r=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/(Math.hypot(c[0].x-c[1].x,c[0].y-c[1].y)||1);
      if(target.layer){ const x=extra(target.layer); if(x&&!x.type) x.size=Math.max(20,Math.min(220,st.size*r)); else S.layers[target.layer].k=Math.max(x?.2:.4,Math.min(x?4:2.5,st.k*r));
        /* two-finger twist turns the layer; it settles on straight and right angles when close */
        const ang=(p,q)=>Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI; let rot=st.rot+ang(a[0],a[1])-ang(c[0],c[1]); S.layers[target.layer].rot=snapRot(rot); syncInspector(); }
      else if(target.mode==='cover'&&!target.pick){ const p=S.photos[target.photo]; p.zoom=Math.max(1,Math.min(3,st.zoom*r)); $('zoom').value=p.zoom; }
    }
    render();
  });
  function endPtr(e){
    pts.delete(e.pointerId);
    if(lift&&!pts.size){ if(endLift()) moved=true; }
    if(!pts.size){
      view.classList.remove('dragging'); guides=[]; dragging=false; document.body.classList.remove('dragging-layer');
      if(target&&target.layer&&!moved){ const already=S.sel===target.layer; select(target.layer); if(already&&layerText(target.layer)!==null){ inspPart='text'; syncInspector(); setTimeout(()=>$('inspText').focus(),30); } }
      else if(!moved&&(!target||!target.layer)){ if(S.sel) select(null); if(!target&&openName&&openName!=='insp') closeSheet(); if(target&&target.pick) pickPhoto(target.photo); }
      keepSel=null;
      target=null; st=null; render();
    } else snapshot();
  }
  view.addEventListener('pointerup',endPtr); view.addEventListener('pointercancel',endPtr);
  view.addEventListener('wheel',e=>{ const t=hit(toCanvas(e)); if(!t) return; e.preventDefault();
    if(t.layer){ const x=extra(t.layer); if(x&&!x.type) x.size=Math.max(20,Math.min(220,x.size*(1-e.deltaY*.0015))); else { const l=S.layers[t.layer]||(S.layers[t.layer]={dx:0,dy:0,k:1}); l.k=Math.max(x?.2:.4,Math.min(x?4:2.5,l.k*(1-e.deltaY*.0015))); } if(S.sel!==t.layer) select(t.layer); else syncInspector(); }
    else if(t.mode==='cover'){ const p=S.photos[t.photo]; if(!p.img||p.sample) return; p.zoom=Math.max(1,Math.min(3,p.zoom-e.deltaY*.0015)); S.active=t.photo; syncZoom(); }
    render(); },{passive:false});
  view.addEventListener('keydown',e=>{ if(!S.sel) return; const l=S.layers[S.sel]||(S.layers[S.sel]={dx:0,dy:0,k:1}); const st=e.shiftKey?20:4; const m={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key]; if(m){ e.preventDefault(); l.dx+=m[0]; l.dy+=m[1]; render(); }
    else if(e.key==='['||e.key===']'){ e.preventDefault(); setRot(S.sel,(l.rot||0)+(e.key===']'?1:-1)*(e.shiftKey?15:1)); } else if(e.key==='Escape') select(null); });
  $('zoom').addEventListener('input',e=>{const p=S.photos[S.active]; if(p){p.zoom=+e.target.value;render();}});
  $('fitBtn').addEventListener('click',()=>{const p=S.photos[S.active]; if(p){p.zoom=1;p.ox=0;p.oy=0;$('zoom').value=1;render();}});
  /* photo look: tap a mood, nudge the light; "every photo" copies it to the other boxes (collages) */
  if($('lookRow')){
    const setFx=(i,fx)=>{ const p=S.photos[i]; if(!p) return; if(hasFx(fx)) p.fx=fx; else delete p.fx; };
    const realAt=i=>{ const p=S.photos[i]; return p&&p.img&&!p.sample?p:null; };
    $('looks').addEventListener('click',e=>{ const b=e.target.closest('[data-look]'), p=realAt(S.active); if(!b||!p) return; setFx(S.active,{look:b.dataset.look,light:(p.fx&&p.fx.light)||0}); haptic('tick'); syncLook(); render(); });
    $('light').addEventListener('input',e=>{ const p=realAt(S.active); if(!p) return; setFx(S.active,{look:(p.fx&&p.fx.look)||'',light:+e.target.value}); $('lightOut').textContent=lightTxt(+e.target.value); render(); });
    $('lookAll').addEventListener('click',()=>{ const p=realAt(S.active); if(!p) return; const off=photoOffset(); let n=0;
      for(let j=0;j<slotCount();j++){ const k=off+j; if(k!==S.active&&realAt(k)){ setFx(k,p.fx?{...p.fx}:null); n++; } }
      render(); status(n?'Every photo has this look now.':'Add more photos first.',2200); });
  }
  $('form').addEventListener('submit',e=>e.preventDefault());

  /* ---- saving: full-quality lossless PNG (2x, stepping down to 1.5x / 1x only if the phone runs out of memory) ---- */
  let downloads=null; const inClaude=!!(window.claude&&window.claude.use);
  if(inClaude) window.claude.use('downloads').then(d=>{downloads=d;}).catch(()=>{});
  function fname(ext,kind,n,at){ const d=at||new Date(), z=x=>String(x).padStart(2,'0'); return (B.id+'-'+(kind||cfg.fileName||'story')).replace(/[^a-z0-9-]+/gi,'-')+'-'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds())+(n?'-'+n:'')+'.'+ext; }
  function progress(pct,txt){ $('progress').hidden=pct==null; if(pct!=null){ $('progressBar').style.width=Math.round(pct*100)+'%'; $('progressRole').setAttribute('aria-valuenow',String(Math.round(pct*100))); if(txt) $('progressTxt').textContent=txt; } }
  function done(title,txt){ $('doneBox').hidden=!title; if(title){ $('doneTitle').textContent=title; $('doneTxt').textContent=txt||''; } }
  /* Save all pages (1.9.0): paged tools save every page in one go, named <design>-01.png, -02.png… (the design's name, else the
     tool and the time); a phone gets one share sheet with all of them, a computer one ZIP (assets/batch.js). Cancel stops before anything is saved. */
  function saveAllLabel(){ return !PG?'Save story':pageCount()>1?'Save all '+pageCount()+' '+PN.many:'Save '+PN.one; }
  function syncSaveAll(){ if(!PG) return; if(!saving) $('saveThis').hidden=pageCount()<2||$('save').hidden; if(!imgDone&&!$('teamOn').checked) $('saveTxt').textContent=saveAllLabel();
    const zipped=!inClaude&&!matchMedia('(pointer:coarse)').matches&&!isPhone();   // a computer gets one ZIP (see save())
    $('photosRow').textContent=pageCount()>1?(zipped?'All '+pageCount()+' '+PN.many+' download at full quality in one ZIP, numbered in order.':'All '+pageCount()+' '+PN.many+' go to your Photos at full quality, one picture each.'):'Always a full-quality picture to your Photos.'; }
  function batchBase(stamp){ const n=(design?design.name:($('teamName').dataset.touched?$('teamName').value:'')).trim().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,60);
    return n||fname('x',null,0,stamp).replace(/\.x$/,''); }
  let lastFiles=null, saving=false, cancelSave=false;
  $('saveCancel').addEventListener('click',()=>{ cancelSave=true; $('saveCancel').disabled=true; $('progressTxt').textContent='Stopping…'; });
  async function save(withPhotos,only){
    if(saving) return; saving=true; cancelSave=false; syncQueue();
    const sel=S.sel; S.sel=null;
    openSheet('save'); $('result').hidden=true; $('shareAgain').hidden=true; done(null); status('');
    $('save').disabled=true; $('barSave').disabled=true;
    progress(.02,'Getting the HD pictures…'); await assetsHD();   // saving uses the HD can cut-outs, never the light preview copies
    const type='image/png', ext='png', list=only!=null?[only]:[...Array(pageCount()).keys()], pages=list.length, files=[], stamp=new Date(); let used=EXPORT_SCALE;
    const base=PG?batchBase(stamp):'', z2=n=>String(n).padStart(2,'0');
    $('saveCancel').hidden=pages<2; $('saveCancel').disabled=false;
    const stopped=()=>{ if(!cancelSave) return false; progress(null); done(null); status('Stopped. Nothing was saved.',3500); return true; };
    try{
      for(const [li,pg] of list.entries()){
        if(stopped()) return 'cancelled';
        const tag=pages>1?'Saving '+(li+1)+' of '+pages+'…':'';
        progress((li+.1)/pages,tag||'Drawing at full size…'); await new Promise(r=>setTimeout(r,30));
        /* PNG = lossless: no JPEG blur or colour smudging on text, edges and photos. Same on iPhone and Android. */
        async function renderAt(K){
          const c=document.createElement('canvas'); c.width=Math.round(W*K); c.height=Math.round(H*K);
          const ctx=c.getContext('2d'); if(!ctx) return null;
          try{
            withPage(pg,()=>draw(ctx,false,K));
            if(withPhotos){ ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation='destination-over'; ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height); ctx.restore(); }
            progress((li+.55)/pages,tag||'Making the PNG…');
            const b=await new Promise(r=>c.toBlob(r,type));
            return b&&b.size>1000?b:null;               // a tiny/empty blob means the phone ran out of room
          }catch(_){ return null; }
          finally{ freeSharp(); c.width=c.height=0; }
        }
        /* Full size first. Only if a phone truly can't, step down a little (never straight to small), and say so. */
        let blob=null;
        for(const K of [EXPORT_SCALE,1.5,1]){ if(K>used) continue; blob=await renderAt(K); if(blob){ used=K; break; } }
        if(!blob){ progress(null); status('Your phone could not make the image. Close other apps or tabs and try again.'); return; }
        files.push(new File([blob],PG&&withPhotos?base+'-'+z2(pg+1)+'.'+ext:fname(ext,withPhotos?null:'frame',PG?pg+1:0,stamp),{type}));
      }
      if(stopped()) return 'cancelled';
      $('saveCancel').hidden=true;
      progress(1,'Done');
      const small=used<EXPORT_SCALE?' This phone was low on memory, so it is a little smaller ('+Math.round(W*used)+'×'+Math.round(H*used)+'). Close other tabs for full size.':'';
      const what=pages>1?files.length+' '+PN.many:(withPhotos?'Your story':'The frame');
      lastFiles=files;
      if(downloads){ try{ for(const f of files) await downloads.save({filename:f.name,data:f}); finish(what+' saved.',small); return; }catch(err){ if(err&&err.code==='declined'){ progress(null); status('Not saved.'); return; } } }
      const touch=matchMedia('(pointer:coarse)').matches;
      if(!inClaude&&touch){
        const r=await shareFiles(files);
        if(r==='shared'){ finish('Saved!','Choose “Save Image” if you haven’t yet. '+what+' '+(pages>1?'are':'is')+' full quality.'+small); return; }
        if(r==='cancelled'){ progress(null); done(null); status('Not saved. Tap Save again when you are ready.'); showResult(files,true); return; }
        if(r==='needtap'){ progress(null); showResult(files,true); finish('Ready!','Tap “Save to Photos” to put it in your photos.'+small,true); return; }
      }
      /* a computer: several pages come as one ZIP (browsers stop a page that downloads many files at once); one by one if the ZIP can't be made */
      if(!inClaude&&!touch&&!isPhone()&&files.length>1){ let zip=null; try{ progress(1,'Packing '+files.length+' '+PN.many+' into one ZIP…'); if(!window.StudioBatch) await loadScript(ROOT+'assets/batch.js'); zip=await window.StudioBatch.zip(files,stamp); }catch(_){ zip=null; }
        if(zip){ const name=base+'.zip', url=URL.createObjectURL(zip), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); },4000);
          showResult(files,false); finish('Saved!','Your '+files.length+' '+PN.many+' are in your downloads in one ZIP ('+name+'), numbered in order.'+small); return; } }
      if(!inClaude){ for(const f of files){ const url=URL.createObjectURL(f); const a=document.createElement('a'); a.href=url; a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),1500); await new Promise(r=>setTimeout(r,250)); } }
      showResult(files,false);
      finish(inClaude?'Ready!':'Saved!',(inClaude?'Your image is ready below.':(pages>1?'Your '+PN.many+' are in your downloads, numbered in order.':'Your story is in your downloads.'))+small);
    } finally { saving=false; cancelSave=false; $('saveCancel').hidden=true; $('save').disabled=false; $('barSave').disabled=false; S.sel=sel&&reg.some(r=>r.id===sel)?sel:null; render(); }
  }
  function finish(title,txt,keepBar){ if(!keepBar){ setTimeout(()=>progress(null),400); celebrate(); if(qTotal){ qSaved=true; keepQueue(); if(!queue.length) txt='That was the last of your '+qTotal+' photos. '+(txt||''); } } done(title,txt); imgDone=true; }
  function showResult(files,offerShare){
    const url=URL.createObjectURL(files[0]); $('resultImg').src=url; $('result').hidden=false;
    $('shareAgain').hidden=!offerShare; $('resultNote').hidden=offerShare;
  }
  $('shareAgain').addEventListener('click',async()=>{ if(!lastFiles) return; const r=await shareFiles(lastFiles); if(r==='shared'){ done('Saved!','Your '+(lastFiles.length>1?PN.many+' are':'story is')+' ready to post.'); $('shareAgain').hidden=true; celebrate(); if(qTotal){ qSaved=true; syncQueue(); } } });
  /* the photos still waiting are kept on this phone (IndexedDB), so leaving the tool, or the phone reloading the page after the
     share sheet, never drops them (1.8.0). The photos are written once ({files,total}); the place in the row is a small record
     beside them ({pos,saved,draft,design}) that changes as you go. Both go once the last photo is in, or with Clear. */
  const QK=queueKey(B.id,cfg.id), QPOS=QK+':pos';
  function keepFiles(){ if(QUEUE&&queue.length) return idb.put(QK,{files:queue.slice(),total:qTotal,at:Date.now()}); }
  function keepQueue(){ if(!QUEUE||!qTotal) return; if(!queue.length) return dropQueue();
    idb.put(QPOS,{pos:qPos,saved:qSaved,draft:draftId,design:design&&design.id||null,at:Date.now()}); }
  function dropQueue(){ idb.del(QK); idb.del(QPOS); }
  /* the photos still waiting: "Next photo (2 of 3)" once this one is saved; before that, a quieter "Skip to the next photo" */
  function syncQueue(){ keepQueue(); const b=$('queueNext'), on=QUEUE&&queue.length>0&&!saving; b.hidden=!on; $('save').classList.toggle('ghost',on&&qSaved);   // Next is the main step now: Save again goes quiet
    if(!on) return;
    b.className='btn queue-next'+(qSaved?'':' ghost'); $('queueNextTxt').textContent=(qSaved?'Next photo':'Skip to the next photo')+' ('+(qPos+1)+' of '+qTotal+')'; }
  function queueNote(){ const last=qPos===qTotal; return [last?'Last photo: '+qPos+' of '+qTotal:'Photo '+qPos+' of '+qTotal+' is in',
    qPos===1?(isPhone()?'Tap Save for the next one':'Save it for the next one'):'Same words and look']; }   // one line next to Skip, even on a 360px phone
  async function nextInQueue(){ const f=queue.shift(); if(!f) return syncQueue();
    qPos++; qSaved=false; $('queueNext').hidden=true; $('queueBar').hidden=true; hideReady(true);
    if(design){ design=null; baseJson=null; showDesignBar(); }   // the story before went to the team: this one is a new design
    clearTimeout(draftTimer); draftId=null; draftPfx=null; dirty=false;   // a new unfinished story of its own; the one before stays as it was
    history.replaceState(null,'',location.pathname); delete $('teamName').dataset.touched;
    if(isPhone()) closeSheet('save');
    await setPhoto(photoOffset(),f);
    resetSaveSheet(); startHistory(); dirty=true; saveDraft(hist.stack[0]);
    quickReady=true; showReady(false,...queueNote()); syncQueue(); }
  $('queueNext').addEventListener('click',nextInQueue);
  /* Skip on the ready note: the next photo without saving this one (it stays in Continue editing), same as the Save sheet's Skip */
  $('readySkip').addEventListener('click',()=>{ haptic('tick'); nextInQueue(); });
  /* coming back to the tool with photos still waiting: "2 photos still waiting" with Clear / Continue */
  async function keptQueue(){ if(!QUEUE) return null; const w=await idb.get(QK); if(!w||!w.files||!w.files.length) return null;
    const m=(await idb.get(QPOS))||{pos:1}, left=w.files.slice(Math.max(0,(m.pos||1)-1));
    if(!left.length){ dropQueue(); return null; } return {total:w.total||left.length+1,m,left}; }
  function offerQueue(k){ const n=k.left.length; $('queueTxt').textContent=n===1?'1 photo still waiting':n+' photos still waiting';
    $('draftBar').hidden=true; $('queueBar').hidden=false; }
  function takeQueue(k){ queue=k.left.slice(); qTotal=k.total; qPos=Math.max(1,k.m.pos||1); }
  async function continueQueue(k){ $('queueBar').hidden=true; takeQueue(k);
    const x=!k.m.saved&&k.m.draft&&listDrafts(B.id,cfg.id).find(d=>d.id===k.m.draft);
    if(x&&!design&&draftId!==x.id){ await loadDraft(x); syncUI(); syncInspector(); paintPager(); draw(vctx,true); startHistory(); }   // the story you were on, not saved yet: back to it first
    if(x){ qSaved=false; quickReady=true; showReady(false,...queueNote()); syncQueue(); return; }   // as when it first came in: Save in one tap
    qSaved=true; await nextInQueue(); }
  let kept=null;
  $('queueGo').addEventListener('click',()=>{ haptic('tick'); if(kept) continueQueue(kept); });
  $('queueClear').addEventListener('click',()=>{ $('queueBar').hidden=true; dropQueue(); queue=[]; qTotal=0; qPos=0; qSaved=false; kept=null; syncQueue();
    status('The waiting photos are cleared here. They are still in your phone’s photos.',3500); });
  function needsPhoto(pg){ return pagePhotoCount(pg)>0; }
  function missingPhotos(){ const miss=[]; const off=photoOffset(); for(let pg=0;pg<pageCount();pg++){ const n=pagePhotoCount(pg); if(!n) continue; const o=cfg.pages?pg*perPage:off; for(let i=0;i<n;i++){ const p=S.photos[o+i]; if(!p||!p.img||p.sample) miss.push(cfg.pages?pg+1:i+1); } } return [...new Set(miss)]; }
  /* Save on the bar saves the picture straight away (one tap, like the computer); the Save sheet then offers "Add to the team" */
  /* Save on the bar (phone) opens the small Save sheet, ready to go; Save in it (or Save on the bar again) saves */
  function saveTapped(){
    if(quickReady&&!design){ quickReady=false; hideReady(true); resetSaveSheet(); doSave(); return; }   // Quick start, untouched: one tap, as before
    if(!isPhone()||openName==='save'){ doSave(); return; }
    resetSaveSheet(); openSheet('save'); focusSheet('save'); haptic('tick');
  }
  function resetSaveSheet(){ imgDone=false; delete $('teamOn').dataset.touched; $('teamOn').checked=teamMember===true&&!design; pickDefaultCols(); $('teamNewRow').hidden=true; $('saveOpts').hidden=false; $('teamOnly').dataset.off=''; if(PG) $('saveThis').hidden=false; $('save').hidden=false; $('result').hidden=true; done(null); progress(null); teamLine(''); syncSaveOpts(); syncQueue();
    if(teamMember===null) checkTeam().then(m=>{ if(m&&!design&&!imgDone&&!saving&&!$('teamOn').dataset.touched){ $('teamOn').checked=true; syncSaveOpts(); } }); }
  async function doSave(only){
    hideReady();
    const miss=only!=null?(missingPhotos().includes(only+1)?[only+1]:[]):missingPhotos();
    if(miss.length&&!cfg.allowSamples){
      openSheet('photo');
      status(cfg.pages?'Add a photo to '+PN.one+' '+miss.join(', ')+' first.':S.count===1?'Add your photo first.':'Add photo '+miss.join(', ')+' first.');
      return;
    }
    let team=$('teamOn').checked;
    /* the picture is already in Photos: the switch is on, so this tap only adds it to the team */
    if(imgDone&&team&&only==null){ $('save').disabled=true; await runTeamSave(); $('save').disabled=false; $('teamOn').checked=false; $('teamOnly').dataset.off='1'; syncSaveOpts(); return; }
    /* the image first (phones only allow the share sheet straight after a tap), the team save right after */
    imgDone=false; $('saveOpts').hidden=true; $('teamOnly').hidden=true; $('save').hidden=true; if(PG) $('saveThis').hidden=true;
    const asked=!$('teamOn').dataset.touched&&!design&&only==null&&teamMember===null;   // still checking the sign-in: decide after the picture
    if(await save(true,only)==='cancelled'){ $('save').hidden=false; $('saveOpts').hidden=false; syncSaveOpts(); syncQueue(); return; }
    if(!team&&asked&&await checkTeam()) team=true;
    if(team){ await runTeamSave(imgDone); $('teamOn').checked=false; }
    if(team) $('teamOnly').dataset.off='1';
    $('save').hidden=false; if(PG) $('saveThis').hidden=false; $('saveOpts').hidden=false; syncSaveOpts(); syncQueue();
  }
  $('save').addEventListener('click',()=>doSave());
  /* Quick start: a small "Your photo is in" note over the bottom of the preview. It fades by itself after about 3 seconds;
     a swipe down or a tap on it or on the photo hides it sooner, and so does any tab or edit. It never stays over the design.
     Save stays where it always is (the bar on a phone, the Save card on a computer); until the first edit it saves in one tap. */
  let readyT=0;
  function hideReady(now){ const r=$('readyBar'); clearTimeout(readyT); if(r.hidden) return;
    if(now||matchMedia('(prefers-reduced-motion: reduce)').matches){ r.hidden=true; r.classList.remove('out'); r.style.transform=''; return; }
    r.classList.add('out'); setTimeout(()=>{ if(r.classList.contains('out')){ r.hidden=true; r.classList.remove('out'); r.style.transform=''; r.style.opacity=''; } },280); }
  function showReady(many,txt,sub){ const r=$('readyBar'); $('readyTxt').textContent=txt||(many?'Your photos are in':'Your photo is in');
    $('readySub').textContent=sub||(isPhone()?'Tap Save when it looks good':'Save it when it looks good');
    const skip=QUEUE&&qTotal>0&&queue.length>0; $('readySkip').hidden=!skip; r.classList.toggle('has-skip',skip);   // a photo is waiting: Skip goes straight to it
    r.classList.remove('out'); r.style.transform=''; r.style.opacity=''; r.hidden=false; clearTimeout(readyT); readyT=setTimeout(()=>hideReady(),skip?4000:3200);
    const sv=$('barSave'); sv.classList.remove('nudge'); void sv.offsetWidth; sv.classList.add('nudge'); setTimeout(()=>sv.classList.remove('nudge'),2600); }   // a soft pulse on Save: the note points at it
  { const r=$('readyBar'); let y0=null, dy=0;
    r.addEventListener('pointerdown',e=>{ if(e.target.closest('#readySkip')){ clearTimeout(readyT); return; } y0=e.clientY; dy=0; clearTimeout(readyT); try{ r.setPointerCapture(e.pointerId); }catch(_){} });
    r.addEventListener('pointermove',e=>{ if(y0==null) return; dy=Math.max(0,e.clientY-y0); r.style.transform=`translateY(${dy}px)`; r.style.opacity=String(Math.max(.2,1-dy/90)); });
    const end=()=>{ if(y0==null) return; y0=null; if(dy>24||dy<6){ r.style.transform=`translateY(${Math.max(dy,0)}px)`; hideReady(); } else { r.style.transform=''; r.style.opacity=''; readyT=setTimeout(()=>hideReady(),1500); } };
    r.addEventListener('pointerup',end); r.addEventListener('pointercancel',end); }
  $('phone').addEventListener('pointerdown',e=>{ if(!e.target.closest('#readyBar')) hideReady(); },true);   // a tap on the photo (the note handles its own taps)
  $('bar').addEventListener('click',e=>{ if(e.target.closest('.tab')&&!e.target.closest('#barSave')) hideReady(); });
  document.addEventListener('input',()=>{ hideReady(); });   // they started editing (desktop has no tab bar)
  if(PG) $('saveThis').addEventListener('click',()=>doSave(S.page));
  if(cfg.frameOnly) $('saveFrame').addEventListener('click',()=>save(false));
  /* pages (carousels): one page for ordinary stories */
  function pageCount(){ return S.P.length; }
  function withPage(pg,fn){ const keep=S.page; S.page=pg; try{ return fn(); } finally{ S.page=keep; } }
  function photoOffset(){ return PG?S.page*perPage:0; }
  /* ---- slides (carousels): a filmstrip of real previews. Tap = open, long-press = menu, long-press + drag = reorder ---- */
  const blankPhoto=()=>({img:null,zoom:1,ox:0,oy:0,sample:true});
  const TH_W=60, TH_H=Math.round(TH_W*H/W);
  function paintPager(){
    if(!PG) return; const n=S.P.length, el=$('pager'); el.hidden=false;
    el.innerHTML=`<div class="strip" id="strip" role="group" aria-label="${UC(PN.many)}. Long-press a ${PN.one} for options or to move it.">${S.P.map((_,i)=>`<button type="button" class="sthumb" data-pg="${i}" aria-current="${i===S.page}" aria-label="${UC(PN.one)} ${i+1}"><canvas width="${TH_W*2}" height="${TH_H*2}"></canvas><span>${i+1}</span></button>`).join('')}<button type="button" class="sadd" data-pg="add" aria-label="Add a ${PN.one}" ${n>=PG.max?'disabled':''}>${ICON.plus}</button></div>
      <button type="button" class="mini icon sall" data-pg="all" aria-label="See all ${PN.many}" title="See all ${PN.many}">${ICON.grid}</button>`;
    S.P.forEach((_,i)=>drawThumb(i));
    const cur=el.querySelector('.sthumb[aria-current="true"]'); if(cur) cur.scrollIntoView({block:'nearest',inline:'nearest'});
    fit(); syncSaveAll();
  }
  function drawThumb(i,canvas){
    const c=canvas||$('pager').querySelector(`.sthumb[data-pg="${i}"] canvas`); if(!c) return; const x=c.getContext('2d');
    x.fillStyle='#000'; x.fillRect(0,0,c.width,c.height); const keep=S.sel; S.sel=null; withPage(i,()=>draw(x,true,c.width/W,true)); S.sel=keep;
  }
  let allT=0; function refreshThumbs(){ clearTimeout(allT); allT=setTimeout(()=>S.P.forEach((_,i)=>drawThumb(i)),300); }
  let thumbT=0; function scheduleThumb(){ if(!PG) return; clearTimeout(thumbT); thumbT=setTimeout(()=>drawThumb(S.page),220); }
  function goPage(n){ n=Math.max(0,Math.min(S.P.length-1,n)); S.page=n; S.sel=null; S.active=photoOffset(); if(openName==='insp') closeSheet('insp'); syncUI(); syncInspector();
    $('pager').querySelectorAll('.sthumb').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.pg===n))); const cur=$('pager').querySelector('.sthumb[aria-current="true"]'); if(cur) cur.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'}); render(); }
  function insertPage(at,page,photos){ S.P.splice(at,0,page); S.photos.splice(at*perPage,0,...(photos||Array.from({length:perPage},blankPhoto))); S.photos.length=nPhotos; for(let i=0;i<nPhotos;i++) if(!S.photos[i]) S.photos[i]=blankPhoto(); }
  /* Quick start in a paged tool (Carousel, Highlight covers): one photo per page, as many pages as photos (within the tool's min and max);
     a page whose type takes no photo switches to cfg.quickKind (an icon cover becomes a photo cover) */
  async function quickPages(fs){ const n=Math.max(PG.min,Math.min(PG.max,fs.length));
    while(S.P.length<n) insertPage(S.P.length,newPage(S.P.length));
    while(S.P.length>n) removePage(S.P.length-1);
    for(let pg=0;pg<Math.min(n,fs.length);pg++){
      if(!pagePhotoCount(pg)&&cfg.quickKind&&S.P[pg].values.kind!==undefined) S.P[pg].values.kind=cfg.quickKind;
      if(pagePhotoCount(pg)) await setPhoto(pg*perPage,fs[pg]); }
    paintPager(); goPage(0); render(); }
  function removePage(at){ S.P.splice(at,1); S.photos.splice(at*perPage,perPage); while(S.photos.length<nPhotos) S.photos.push(blankPhoto()); }
  function movePage(from,to){ if(to<0||to>=S.P.length||from===to) return; const pg=S.P[from], ph=S.photos.slice(from*perPage,from*perPage+perPage); removePage(from); insertPage(to,pg,ph); S.page=to; paintPager(); goPage(to); }
  function dupPage(at){ if(S.P.length>=PG.max) return status('A '+PN.set+' can have up to '+PG.max+' '+PN.many+'.'); const pg=clone(S.P[at]); pg.extras.forEach(x=>{ const n=Math.max(assetN,extraN)+1; assetN=extraN=n; const nid=(x.type==='asset'?'asset':x.type==='comp'?'comp':'extra')+n; if(pg.layers[x.id]){ pg.layers[nid]=pg.layers[x.id]; delete pg.layers[x.id]; } x.id=nid; });
    insertPage(at+1,pg,S.photos.slice(at*perPage,at*perPage+perPage).map(p=>({...p}))); paintPager(); goPage(at+1); status(UC(PN.one)+' '+(at+1)+' duplicated.'); }
  function deletePage(at){ if(S.P.length<=PG.min) return status('A '+PN.set+' needs at least '+PG.min+' '+(PG.min===1?PN.one:PN.many)+'.'); removePage(at); paintPager(); goPage(Math.min(at,S.P.length-1)); status(UC(PN.one)+' deleted. Undo brings it back.'); }
  /* add a slide: pick its type (or duplicate this one); panoramas add 2 or 3 slides that share one wide photo */
  function addMenu(){
    if(!(cfg.slideKinds||[]).length){ if(S.P.length>=PG.max) return; const at=S.page+1; insertPage(at,newPage(at)); paintPager(); goPage(at); return status(UC(PN.one)+' '+(at+1)+' added.'); }   // one kind of page: add it straight away
    const kinds=(cfg.slideKinds||[]).filter(k=>S.P.length+(k.slides||1)<=PG.max);
    const d=dialog(`<div class="dlg-body"><h3>Add a ${PN.one}</h3><div class="kind-grid">${kinds.map(k=>`<button type="button" class="kind" data-kind="${k.v}" data-n="${k.slides||1}">${k.ic||''}<b>${esc(k.l)}</b>${k.d?`<span>${esc(k.d)}</span>`:''}</button>`).join('')}</div>
      <div class="dlg-actions"><button type="button" class="mini" data-dup="1">Duplicate this ${PN.one}</button><button type="button" class="mini" data-x="1">Cancel</button></div></div>`);
    d.addEventListener('click',e=>{ if(e.target.closest('[data-x]')) return d.close(); if(e.target.closest('[data-dup]')){ d.close(); return dupPage(S.page); }
      const k=e.target.closest('[data-kind]'); if(!k) return; d.close(); let at=S.page+1; const n=+k.dataset.n;
      for(let j=0;j<n;j++){ const pg=newPage(at+j); if(pg.values.kind!==undefined) pg.values.kind=k.dataset.kind; if(cfg.slideDefaults) cfg.slideDefaults(k.dataset.kind,pg.values,B); insertPage(at+j,pg); }
      paintPager(); goPage(at); status(n>1?n+' panorama slides added. Add one wide photo to the first.':UC(PN.one)+' '+(at+1)+' added.'); });
  }
  function slideMenu(i){
    const d=dialog(`<div class="dlg-body"><h3>${UC(PN.one)} ${i+1}</h3><div class="menu-list">
      <button type="button" class="mini" data-a="open">Open</button><button type="button" class="mini" data-a="dup" ${S.P.length>=PG.max?'disabled':''}>Duplicate</button>
      <button type="button" class="mini" data-a="left" ${i===0?'disabled':''}>Move left</button><button type="button" class="mini" data-a="right" ${i>=S.P.length-1?'disabled':''}>Move right</button>
      <button type="button" class="mini danger" data-a="del" ${S.P.length<=PG.min?'disabled':''}>Delete</button></div><button type="button" class="link" data-a="x">Close</button></div>`);
    d.addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; d.close(); const a=b.dataset.a;
      if(a==='open') goPage(i); else if(a==='dup') dupPage(i); else if(a==='left') movePage(i,i-1); else if(a==='right') movePage(i,i+1); else if(a==='del') deletePage(i); });
  }
  function seeAll(){
    const d=dialog(`<div class="dlg-body see-all"><h3>All ${PN.many}</h3><p class="small">How the ${PN.set} flows. Tap a ${PN.one} to open it.</p><div class="sa-row">${S.P.map((_,i)=>`<button type="button" class="sa-slide" data-i="${i}" aria-label="Open ${PN.one} ${i+1}"><canvas width="${Math.round(W/4)}" height="${Math.round(H/4)}"></canvas><span>${i+1}</span></button>`).join('')}</div><button type="button" class="btn slim" data-x="1">Close</button></div>`,'wide');
    d.querySelectorAll('.sa-slide canvas').forEach((c,i)=>drawThumb(i,c));
    d.addEventListener('click',e=>{ if(e.target.closest('[data-x]')) return d.close(); const b=e.target.closest('[data-i]'); if(b){ d.close(); goPage(+b.dataset.i); } });
  }
  if(PG){
    const el=$('pager'); let press=null;
    el.addEventListener('click',e=>{ if(press&&press.used){ press=null; return; } const b=e.target.closest('[data-pg]'); if(!b||b.disabled) return; const a=b.dataset.pg;
      if(a==='add') addMenu(); else if(a==='all') seeAll(); else goPage(+a); });
    /* long-press a slide: hold still = menu; hold then drag sideways = move it */
    el.addEventListener('pointerdown',e=>{ const b=e.target.closest('.sthumb'); if(!b) return; const i=+b.dataset.pg;
      press={i,x:e.clientX,y:e.clientY,b,long:false,drag:false,used:false,timer:setTimeout(()=>{ press.long=true; b.classList.add('lift'); if(navigator.vibrate) navigator.vibrate(8); },380)}; });
    el.addEventListener('pointermove',e=>{ if(!press) return; const dx=e.clientX-press.x, dy=e.clientY-press.y;
      if(!press.long){ if(Math.hypot(dx,dy)>8){ clearTimeout(press.timer); press=null; } return; }
      press.drag=true; press.b.style.transform=`translateX(${dx}px) scale(1.06)`;
      const over=document.elementFromPoint(e.clientX,press.b.getBoundingClientRect().top+10)?.closest('.sthumb'); el.querySelectorAll('.sthumb').forEach(t=>t.classList.toggle('drop-here',t===over&&t!==press.b)); });
    el.addEventListener('touchmove',e=>{ if(press&&press.long) e.preventDefault(); },{passive:false});   // while moving a slide, the strip doesn't scroll
    const end=e=>{ if(!press) return; clearTimeout(press.timer); const p=press; p.b.classList.remove('lift'); p.b.style.transform=''; el.querySelectorAll('.drop-here').forEach(t=>t.classList.remove('drop-here'));
      if(p.long){ p.used=true; e.preventDefault(); if(p.drag){ const over=document.elementFromPoint(e.clientX,p.b.getBoundingClientRect().top+10)?.closest('.sthumb'); if(over&&+over.dataset.pg!==p.i) movePage(p.i,+over.dataset.pg); } else slideMenu(p.i); press=p; setTimeout(()=>{ if(press===p) press=null; },50); }
      else press=null; };
    el.addEventListener('pointerup',end); el.addEventListener('pointercancel',()=>{ if(press){ clearTimeout(press.timer); press.b.classList.remove('lift'); press.b.style.transform=''; press=null; } });
    el.addEventListener('contextmenu',e=>{ if(e.target.closest('.sthumb')) e.preventDefault(); });
  }
  function photoUsed(i){ if(!PG) return i<pagePhotoCount(0); const pg=Math.floor(i/perPage); return pg<S.P.length&&i%perPage<pagePhotoCount(pg); }
  function pageValue(pg,id){ return withPage(pg,()=>value(id)); }

  /* ---- start with the brand's example photos so the tool shows what it makes ---- */
  const names=(B.samples&&B.samples[cfg.id])||[];
  const imgs=await Promise.all(names.map(n=>load(B.base+'samples/'+n+'.jpg').catch(()=>null)));
  imgs.forEach((img,i)=>{ const k=PG?i*perPage:i; if(img&&S.photos[k]) S.photos[k]={img,zoom:1,ox:0,oy:0,sample:true}; });
  /* a tool with more photo boxes than example photos (Collage up to 9) shows the examples again, in turn */
  const got=imgs.filter(Boolean); if(!PG&&got.length) for(let i=got.length;i<nPhotos;i++) if(S.photos[i]&&!S.photos[i].img) S.photos[i]={img:got[i%got.length],zoom:1,ox:0,oy:0,sample:true};
  syncUI(); draw(vctx,true);

  /* ---- a template from the library (?preset=…): the brand kit's preset sets the style, photo count and words, as a new story ---- */
  function applyPreset(id){
    const pr=(B.presets||[]).find(x=>x.id===id&&x.tool===cfg.id); if(!pr) return false;
    if(pr.style&&cfg.styles&&cfg.styles.some(s=>s.id===pr.style)) S.style=pr.style;
    if(pr.count&&!PG) S.count=Math.min(perPage,Math.max(minPhotos,pr.count));
    Object.entries(pr.values||{}).forEach(([k,v])=>{ const f=fields.find(x=>x.id===k); if(!f) return;
      if(f.type==='chips') S.values[k]=v==null||v===''?{pick:'__none',own:''}:f.options.includes(v)?{pick:v,own:''}:{pick:'__own',own:String(v)};
      else if(f.type==='multi') S.values[k]={picks:[].concat(v),own:''};
      else if(!f.type||f.type==='text') S.values[k]=v===false?{...fieldDefault(f,0),on:false}:{text:String(v),on:true};
      else S.values[k]=clone(v); });
    syncGlobals(); remember(); return true;
  }
  /* ---- then: a saved design (?design=…), a draft (?draft=1 from the hub), a template (?preset=…), or offer the unfinished story ---- */
  const q=new URLSearchParams(location.search), drafts=listDrafts(B.id,cfg.id), want=q.get('draft');
  try{
    if(q.get('design')) await openDesign(q.get('design'),q.get('go')==='1');
    else if(q.get('preset')){ if(!applyPreset(q.get('preset'))) status('That template is not in this brand kit any more.'); history.replaceState(null,'',location.pathname+(q.get('quick')==='1'?'?quick=1':'')); }
    else if(want){ const x=want==='1'?drafts[0]:drafts.find(d=>d.id===want); if(x) await loadDraft(x); else { history.replaceState(null,'',location.pathname); if(want!=='1') status('That unfinished story is no longer on this phone.'); } }
    else if(q.get('quick')!=='1'){ const real=drafts.filter(x=>(x.d.keys||[]).some(Boolean)||x.d.json!==JSON.stringify(recipe()));
      if(real.length){ $('draftTxt').innerHTML=real.length>1?`You have ${real.length} unfinished stories here. <a href="${ROOT}index.html#continueSec">See all</a>`:'You have an unfinished story here.'; $('draftBar').hidden=false; } }
  }catch(err){ status(err.message||'Could not open that.'); }
  syncUI(); paintPager(); fit(); draw(vctx,true); startHistory(); pickDefaultCols(); syncSaveOpts();
  /* quietly check whether this phone is signed in to the team, so Save to the team is ready (on) when the Save sheet opens */
  setTimeout(()=>checkTeam().then(m=>{ if(m&&!design&&!imgDone&&!saving&&!$('teamOn').dataset.touched&&!$('teamOn').checked&&!$('teamOnly').dataset.off){ $('teamOn').checked=true; syncSaveOpts(); } }),1200);
  /* photos still waiting from an earlier visit (1.8.0): the page reloaded on the story you were on (after the share sheet, or
     with ?draft=) picks the row up again as it was; anything else (a fresh visit, ?queue=1 from Home) offers or continues it */
  if(QUEUE&&q.get('quick')!=='1'){ const k=await keptQueue();
    if(k){ kept=k;
      const dsg=q.get('design'), here=dsg?dsg===k.m.design:want&&want!=='1'&&!k.m.saved&&(!k.m.draft||k.m.draft===want);
      if(here){ takeQueue(k); qSaved=!!dsg; if(qSaved) offerQueue(k); else { quickReady=true; showReady(false,...queueNote()); } syncQueue(); }
      else if(q.get('queue')==='1'){ history.replaceState(null,'',location.pathname); await continueQueue(k); }
      else offerQueue(k); } }
  /* Quick start (hub): the photos picked on the home page wait in IndexedDB; put them in, as a new draft */
  if(q.get('quick')==='1'){ const qk=quickKey(B.id,cfg.id), fs=await idb.get(qk); idb.del(qk); history.replaceState(null,'',location.pathname);
    if(fs&&fs.length){ photoStyleNow(); if(!PG&&cfg.photos.max){ S.count=Math.min(perPage,Math.max(minPhotos,fs.length)); syncUI(); }
      if(PG) await quickPages(fs);
      else { const t=slotTargets(nextEmpty()); for(let i=0;i<Math.min(fs.length,t.length);i++) await setPhoto(t[i],fs[i]);
        if(QUEUE&&slotCount()===1&&fs.length>1){ queue=fs.slice(1,QUEUE_MAX); qTotal=queue.length+1; qPos=1; await keepFiles(); } }
      flush(); quickReady=true; if(qTotal) showReady(false,...queueNote()); else showReady(fs.length>1); syncQueue(); }
    else status('That photo did not come through. Tap Add your photo.'); }
  /* a style that needs no photo, opened fresh: ready as it is, so Save works in one tap (like Quick start) until the first edit */
  else if(noPhotoStyle()&&!design&&!draftId) quickReady=true;
  Studio.debug={S,reg:()=>reg,recipe,render,draftId:()=>draftId};   // used by the automated tests
  // web fonts can finish after the first drawing: draw again so the preview uses the right font
  if(document.fonts&&document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',()=>render());
}

/* ---------- Quick start: the hub hands photos to a tool through IndexedDB (too big for the URL) ---------- */
const quickKey=(brand,tool)=>'studio:quick:'+brand+':'+tool;
/* several photos in a row (queue tools): the photos still waiting, kept so leaving or a reload never drops them (1.8.0) */
const queueKey=(brand,tool)=>'studio:queue:'+brand+':'+tool;
/* how many photos a Quick start keeps: up to the tool's max (Collage 9, Carousel 10, Highlight covers 12);
   a one-photo tool with queue (Restock, Photo story) takes up to 10 and makes a story from each, one after the other (1.6.0) */
const QUEUE_MAX=10;
const quickMax=id=>TOOLS[id].multi?(TOOLS[id].max||9):TOOLS[id].queue?QUEUE_MAX:1;
/* ---------- home: continue editing, saved designs + collections, tools ---------- */
/* a day as Studio writes it in names: "24 Oct" (with the year when it is not this year); never the phone's 10/24/2026 */
function dayTag(t){ const d=new Date(t); return d.getDate()+' '+d.toLocaleString('en',{month:'short'})+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():''); }
function ago(t){ const s=(Date.now()-new Date(t).getTime())/1000; if(s<60) return 'just now'; if(s<3600) return Math.round(s/60)+' min ago'; if(s<86400) return Math.round(s/3600)+' h ago'; if(s<86400*7) return Math.round(s/86400)+' d ago'; return dayTag(t); }
async function home(){
  const firstRun=!store('studio:welcome')&&!usedBefore();   // a device that never used Studio (checked before anything is stored)
  const B=await useBrand(); const $=id=>document.getElementById(id);
  /* saved designs + account: declared first because the search can read them before the team list has loaded */
  let all=[], cols=[], filter='all', me=null, member=false, owner=false, loading=null, loadedFor=undefined, C=null;
  const SORTS={recent:'Recent',oldest:'Oldest',name:'Name A to Z'};
  let sortBy=SORTS[store('studio:savedSort')]?store('studio:savedSort'):'recent', loaded=false;
  let sel=null, shown=[];   // sel: the designs ticked in select mode (null = not selecting); shown: the Saved page's list right now
  const urls={}, toolName=t=>(TOOLS[t]||{}).title||t, colName=id=>(cols.find(c=>c.id===id)||{}).name||'';
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hubToast=(msg,undo)=>{ let t=document.getElementById('hubToast'); if(!t){ t=document.createElement('div'); t.id='hubToast'; t.className='toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
    t.innerHTML=`<span>${esc(msg)}</span>${undo?'<button type="button" class="toast-btn">Undo</button>':''}`; t.hidden=false; t.style.pointerEvents='auto';
    clearTimeout(t._h); t._h=setTimeout(()=>{ t.hidden=true; },5000); if(undo) t.querySelector('button').onclick=()=>{ t.hidden=true; undo(); }; };
  /* Your tools: only the tools pinned on this device, each a compact row with a small real preview; every tool is in All tools */
  const toolThumb=id=>`${ROOT}assets/thumbs/${B.id}/${id}-sm.jpg`;
  const thumbImg0=id=>`<img alt="" loading="lazy" decoding="async" src="${toolThumb(id)}" onerror="this.onerror=null;this.src='${ROOT}assets/thumbs/${B.id}/${id}.jpg'">`;
  const quickTools=()=>Object.entries(TOOLS).filter(([,t])=>t.quick).sort((a,b)=>(a[1].qi||9)-(b[1].qi||9));
  /* a photo-first tool (Restock, Photo story, Collage) has a camera button on its row: one tap opens the phone's camera or photos,
     then the tool opens with the photo in. The file input sits inside the label, so the picker opens straight away. */
  const quickInput=(id,t)=>`<input type="file" class="sr-only" accept="image/*,.heic,.heif" data-quick="${id}"${t.multi||t.queue?' multiple':''}>`;
  const toolRow=(id,t,i)=>`<div class="tool-item${t.quick?' has-cam':''}" style="--i:${i}"><a class="tool-row" href="${toolPage(id)}"><span class="tthumb">${thumbImg0(id)}</span><span class="ttxt"><b>${esc(t.title)}${t.tag?` <em class="tag">${esc(t.tag)}</em>`:''}</b><span>${esc(t.blurb)}</span></span><span class="chev" aria-hidden="true">${ICON.next}</span></a>${t.quick?`<label class="row-cam" title="${esc(t.title)} from a photo"><span class="sr-only">${esc(t.title)} from a photo</span>${ICON.camera}${quickInput(id,t)}</label>`:''}</div>`;
  function paintTools(){
    const pins=getPins(), n=Object.keys(TOOLS).length;
    $('toolGrid').innerHTML=pins.length?pins.map((id,i)=>toolRow(id,TOOLS[id],i)).join(''):'<p class="pin-empty">No tools pinned yet. Open <b>All tools</b> and tap the star on the ones you use most.</p>';
    $('allToolsSub').textContent=pins.length>=n?'All '+n+' tools are pinned':n+' tools · tap a star to pin one here';
  }
  paintTools();
  /* how your tools are shown: list or grid; each phone remembers its own choice (the old "compact" choice shows as grid) */
  let toolsView=store('studio:toolsView')==='list'||!store('studio:toolsView')?'list':'grid';
  function paintToolsView(){ $('toolGrid').className='grid view-'+toolsView; document.querySelectorAll('[data-view="tools"] button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===toolsView))); }
  paintToolsView();
  /* a photo picked in any Quick start button (home or search) goes to its tool through IndexedDB */
  document.addEventListener('change',async e=>{ const inp=e.target, id=inp&&inp.dataset&&inp.dataset.quick; if(!id||!TOOLS[id]) return; const fs=[...(inp.files||[])]; inp.value=''; if(!fs.length) return;
    const lbl=inp.closest('label'); if(lbl) lbl.classList.add('busy');
    const ok=await idb.put(quickKey(B.id,id),fs.slice(0,quickMax(id)));
    if(ok===null&&!(await idb.get(quickKey(B.id,id)))){ if(lbl) lbl.classList.remove('busy'); hubToast('That photo could not be opened here. Open the tool and add it there.'); return; }
    store('studio:lastQuick',id);
    if(window.StudioSearch) await StudioSearch.close();   // picked from the search: let it close (and its Back entry go) first
    location.href=toolPage(id)+'?quick=1'; });
  addEventListener('pageshow',()=>document.querySelectorAll('label.busy').forEach(l=>l.classList.remove('busy')));   // back button from the tool
  /* All tools: every tool in its group, with a star to pin or unpin it (this device only) */
  const pinBtn=id=>{ const on=getPins().includes(id), t=esc(TOOLS[id].title); return `<button type="button" class="pin-btn" data-pin="${id}" aria-pressed="${on}" aria-label="${on?'Unpin '+t+' from home':'Pin '+t+' to home'}">${on?ICON.starFill:ICON.star}</button>`; };
  function togglePin(id,fromSearch){ const on=setPin(id,!getPins().includes(id));
    paintTools(); paintToolsView(); paintLib(id); if(!fromSearch){ haptic('tick'); if(window.StudioSearch) StudioSearch.refresh(); } return on; }   // the search updates its own star
  /* All tools: the pinned tools first ("On your home", in their home order, each with a drag handle), then every other tool
     in its group. Press and drag the handle to change the order on the home screen; on a keyboard the arrow keys move it. */
  /* a tool that starts from photos gets the Home row's camera here too (pinned ones have it on Home): one tap to pick, like Home */
  const libCam=(id,t)=>`<label class="row-cam lib-cam" title="${esc(t.title)} from ${t.multi||t.queue?'photos':'a photo'}"><span class="sr-only">${esc(t.title)} from ${t.multi||t.queue?'photos':'a photo'}</span>${ICON.camera}${quickInput(id,t)}</label>`;
  const libRow=(id,t,pinned,i,n)=>`<div class="lib-row${pinned?' pinned':''}" data-id="${id}"><a class="lib-open" href="${toolPage(id)}"><span class="tthumb">${thumbImg0(id)}</span><span class="ttxt"><b>${esc(t.title)}</b><span>${esc(t.blurb)}</span></span></a>${t.quick&&!pinned?libCam(id,t):''}${pinBtn(id)}${pinned?`<button type="button" class="drag-h" data-drag="${id}" aria-label="Move ${esc(t.title)}: place ${i+1} of ${n}. Drag, or use the arrow keys." aria-describedby="libPinHint">${ICON.grip}</button>`:''}</div>`;
  function libHtml(){ const pins=getPins(); let last=null, h='';
    if(pins.length) h+=`<h4 class="tgroup" id="libPinH">On your home</h4><p class="lib-hint" id="libPinHint">${pins.length>1?'Press and drag the dots on the right to change the order.':'Pin more tools to put them in your order.'}</p><div class="lib-pins" role="group" aria-labelledby="libPinH">${pins.map((id,i)=>libRow(id,TOOLS[id],true,i,pins.length)).join('')}</div>`;
    Object.entries(TOOLS).filter(([id])=>!pins.includes(id)).forEach(([id,t])=>{ if(t.group!==last&&TOOL_GROUPS[last=t.group]) h+=`<h4 class="tgroup">${esc(TOOL_GROUPS[t.group])}</h4>`; h+=libRow(id,t,false); });
    return h; }
  /* redraw the open sheet; the star you tapped (or the handle you moved) keeps focus, the star does its little pop */
  function paintLib(popId,focusSel){ const box=document.querySelector('dialog[open] .lib-list'); if(!box) return;
    const had=popId&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest(`[data-pin="${popId}"]`);
    box.innerHTML=libHtml();
    if(popId){ const b=box.querySelector(`[data-pin="${popId}"]`); if(b){ b.classList.add('pop'); if(had) b.focus({preventScroll:true}); } }
    if(focusSel) box.querySelector(focusSel)?.focus({preventScroll:true}); }
  function pinsChanged(){ haptic('tick'); paintTools(); paintToolsView(); if(window.StudioSearch) StudioSearch.refresh(); }
  function openLibrary(){
    const d=dialog(`<div class="dlg-body lib"><div class="lib-head"><h3>All tools</h3><button type="button" class="mini solid" id="libDone">Done</button></div><p class="small">Tap the star to pin a tool to your home screen. Pins stay on this phone.</p><div class="lib-list">${libHtml()}</div></div>`,'lib-dlg');
    const list=d.querySelector('.lib-list');
    d.querySelector('#libDone').onclick=()=>d.close();
    list.addEventListener('click',e=>{ const b=e.target.closest('[data-pin]'); if(b) togglePin(b.dataset.pin); });
    list.addEventListener('keydown',e=>{ const h=e.target.closest('[data-drag]'); if(!h||!/^Arrow(Up|Down)$/.test(e.key)) return; e.preventDefault();
      const id=h.dataset.drag, i=getPins().indexOf(id), to=i+(e.key==='ArrowUp'?-1:1); if(to<0||to>=getPins().length) return;
      movePin(id,to); pinsChanged(); paintLib(null,`[data-drag="${id}"]`); });
    /* drag: the row follows the finger; the others slide out of the way; letting go puts it in its new place */
    let drag=null;
    list.addEventListener('pointerdown',e=>{ const h=e.target.closest('[data-drag]'); if(!h||e.button>0) return; e.preventDefault();
      const row=h.closest('.lib-row'), rows=[...list.querySelectorAll('.lib-pins .lib-row')], from=rows.indexOf(row);
      const tops=rows.map(r=>r.getBoundingClientRect().top), step=rows.length>1?tops[1]-tops[0]:row.offsetHeight;
      drag={id:h.dataset.drag,row,rows,from,to:from,y:e.clientY,step,pid:e.pointerId,moved:false};
      try{ h.setPointerCapture(e.pointerId); }catch(_){}
      row.classList.add('dragging'); list.classList.add('sorting'); haptic('tick'); });
    list.addEventListener('pointermove',e=>{ if(!drag||e.pointerId!==drag.pid) return;
      const dy=e.clientY-drag.y; if(Math.abs(dy)>3) drag.moved=true;
      const n=drag.rows.length, min=-drag.from*drag.step, max=(n-1-drag.from)*drag.step, y=Math.max(min-12,Math.min(max+12,dy));
      drag.row.style.transform=`translateY(${y}px)`;
      const to=Math.max(0,Math.min(n-1,drag.from+Math.round(y/drag.step)));
      if(to!==drag.to){ drag.to=to; haptic('tick');
        drag.rows.forEach((r,i)=>{ if(r===drag.row) return; const shift=drag.from<to&&i>drag.from&&i<=to?-drag.step:drag.from>to&&i<drag.from&&i>=to?drag.step:0; r.style.transform=shift?`translateY(${shift}px)`:''; }); } });
    const drop=e=>{ if(!drag||e.pointerId!==drag.pid) return; const g=drag; drag=null; list.classList.remove('sorting');
      if(g.to!==g.from){ movePin(g.id,g.to); pinsChanged(); paintLib(null,null); }
      else { g.rows.forEach(r=>{ r.style.transform=''; }); g.row.classList.remove('dragging'); } };
    list.addEventListener('pointerup',drop); list.addEventListener('pointercancel',drop);
    list.addEventListener('lostpointercapture',drop);
  }
  $('allTools').onclick=openLibrary;
  /* the + button (bottom corner, in thumb reach): start from a photo, or a new design */
  /* the photo-first tool used last on this device gets a small "Last time" tag (the order never changes) */
  const lastTag=id=>store('studio:lastQuick')===id?' <em class="fi-tag">Last time</em>':'';
  function openNew(){
    const q=quickTools().filter(([,t])=>(t.qi||9)<=3), fab=$('fab');   // the three photo tools; Carousel and Highlight covers are in All tools
    const d=dialog(`<div class="fab-menu"><p class="fab-h" id="fabH">Start from a photo</p>${q.map(([id,t],i)=>`<label class="fab-item" style="--i:${q.length-i+1}"><span class="fi-ic">${ICON[t.icon]||ICON.camera}</span><span class="fi-txt"><b>${esc(t.title)}${lastTag(id)}</b><span>${esc(t.quick)}</span></span>${quickInput(id,t)}</label>`).join('')}<span class="fab-sep" aria-hidden="true"></span>${TOOLS.create?`<a class="fab-item" href="${toolPage('create')}" style="--i:1"><span class="fi-ic new">${ICON.plus}</span><span class="fi-txt"><b>New design</b><span>Start from a blank page</span></span></a>`:''}<button type="button" class="fab-more" data-fab-more style="--i:0">More tools ›</button></div><button type="button" class="fab fab-x" aria-label="Close">${ICON.plus}</button>`,'fab-dlg');
    d.setAttribute('aria-labelledby','fabH'); fab.setAttribute('aria-expanded','true'); haptic('tick');
    d.querySelector('.fab-x').onclick=()=>d.close();
    d.querySelector('[data-fab-more]').onclick=()=>{ d.close(); openLibrary(); };
    d.addEventListener('click',e=>{ if(e.target===d) d.close(); });   // the clear space around the menu
    d.addEventListener('close',()=>fab.setAttribute('aria-expanded','false'));
  }
  $('fab').onclick=openNew;
  /* photos shared from the phone's gallery (Share → Studio, installed app on Android): sw.js keeps them in IndexedDB and
     opens the hub with ?shared=<n>; the same menu as + asks which tool to start, then hands them over like Quick start */
  async function openShared(n){
    history.replaceState(null,'',location.pathname+location.hash);
    const got=n>0?await idb.get('studio:shared'):null, fs=got&&got.files||[];
    if(!fs.length){ hubToast('That photo did not come through. Share it again, or tap + to pick it.'); return; }
    const q=quickTools(), urls=fs.slice(0,4).map(f=>{ try{ return URL.createObjectURL(f); }catch(_){ return ''; } });
    const many=fs.length>1, use=t=>!many?t.quick:t.multi?'Uses '+(fs.length>(t.max||9)?'the first ':'all ')+Math.min(fs.length,t.max||9)+' photos':t.queue?'A story from each, '+Math.min(fs.length,QUEUE_MAX)+' in a row':'Uses the first photo';
    const d=dialog(`<div class="fab-menu share-menu"><div class="share-head"><span class="share-pics" aria-hidden="true">${urls.map((u,i)=>u?`<img alt="" src="${u}" style="--i:${i}" onerror="this.remove()">`:'').join('')}</span><span class="fi-txt"><b id="shareH">${many?fs.length+' photos are in':'Your photo is in'}</b><span>Pick what to make</span></span></div>${q.map(([id,t],i)=>`<button type="button" class="fab-item" data-share="${id}" style="--i:${q.length-i}"><span class="fi-ic">${ICON[t.icon]||ICON.camera}</span><span class="fi-txt"><b>${esc(t.title)}${lastTag(id)}</b><span>${esc(use(t))}</span></span></button>`).join('')}</div><button type="button" class="fab fab-x" aria-label="Close">${ICON.plus}</button>`,'fab-dlg share-dlg');
    d.setAttribute('aria-labelledby','shareH'); d.tabIndex=-1; d.focus(); haptic('tick');   // no focus ring on the first choice
    d.querySelector('.fab-x').onclick=()=>d.close();
    d.addEventListener('close',()=>setTimeout(()=>urls.forEach(u=>u&&URL.revokeObjectURL(u)),400));
    d.querySelector('.share-menu').addEventListener('click',async e=>{ const b=e.target.closest('[data-share]'); if(!b) return; const id=b.dataset.share;
      b.classList.add('busy');
      const ok=await idb.put(quickKey(B.id,id),fs.slice(0,quickMax(id)));
      if(ok===null&&!(await idb.get(quickKey(B.id,id)))){ b.classList.remove('busy'); hubToast('That photo could not be opened here. Open the tool and add it there.'); return; }
      idb.del('studio:shared'); store('studio:lastQuick',id);
      location.href=toolPage(id)+'?quick=1'; });
  }
  { const sh=new URLSearchParams(location.search).get('shared'); if(sh!==null) openShared(+sh||0); else sharedWaiting(); }
  /* a shared photo whose pick-a-tool sheet was closed without a choice stays in IndexedDB: Home offers it again (1.3.0) */
  async function sharedWaiting(){ const bar=$('sharedBar'); if(!bar) return;
    const got=await idb.get('studio:shared'), fs=got&&got.files||[]; if(!fs.length){ bar.hidden=true; return; }
    let u=''; try{ u=URL.createObjectURL(fs[0]); }catch(_){}
    const pic=$('sharedPic'); if(u) pic.src=u; else pic.parentElement.hidden=true;
    $('sharedTxt').textContent=fs.length>1?fs.length+' photos are in':'Your photo is in';
    bar.hidden=false;
    $('sharedGo').onclick=()=>{ bar.hidden=true; openShared(fs.length).then(()=>{ const d=document.querySelector('dialog.dlg[open]'); if(d) d.addEventListener('close',()=>setTimeout(sharedWaiting,60)); }); };
    $('sharedX').onclick=()=>{ bar.hidden=true; idb.del('studio:shared'); if(u) URL.revokeObjectURL(u); hubToast('Forgot the shared photo.'); }; }
  /* photos still waiting in Restock or Photo story (several shops in a row, left before the last one): a row like the shared
     photo's, "2 photos still waiting", Continue opens the tool on the next one; ✕ clears them (1.8.0) */
  async function queueWaiting(){ document.querySelectorAll('.queue-wait').forEach(e=>e.remove());
    for(const [id,t] of Object.entries(TOOLS).filter(([,t])=>t.queue).reverse()){
      const k=queueKey(B.id,id), w=await idb.get(k); if(!w||!w.files||!w.files.length) continue;
      const m=(await idb.get(k+':pos'))||{pos:1}, left=w.files.slice(Math.max(0,(m.pos||1)-1)); if(!left.length){ idb.del(k); idb.del(k+':pos'); continue; }
      let u=''; try{ u=URL.createObjectURL(left[0]); }catch(_){}
      const n=left.length, el=document.createElement('div'); el.className='install shared-wait queue-wait'; el.setAttribute('role','region'); el.setAttribute('aria-label','Photos still waiting for '+t.title); el.dataset.queue=id;
      el.innerHTML=`<a class="qw-go" href="${toolPage(id)}?queue=1"><span class="install-ic" aria-hidden="true">${u?`<img alt="" src="${u}">`:''}</span><span class="install-txt"><b>${n===1?'1 photo still waiting':n+' photos still waiting'}</b><span>${esc(t.title)} · tap to continue</span></span><span class="qw-chev" aria-hidden="true">${ICON.next}</span></a><button type="button" class="mini icon" aria-label="Clear the ${n===1?'photo':n+' photos'} waiting for ${esc(t.title)}">✕</button>`;
      el.querySelector('button').onclick=()=>{ el.remove(); idb.del(k); idb.del(k+':pos'); if(u) URL.revokeObjectURL(u); hubToast('Cleared. The photos are still in your phone’s photos.'); };
      const at=$('sharedBar'); if(at) at.after(el); else { const h=document.querySelector('header'); if(h) h.after(el); } } }
  queueWaiting();
  /* What's New: a dot on the button until this version's notes have been opened */
  const wn=$('wnBtn'); if(wn){ const fresh=store('studio:seenVersion')!==VERSION; wn.classList.toggle('has-new',fresh); wn.setAttribute('aria-label',fresh?"What's new (new update)":"What's new"); }
  const fv=$('footVer'); if(fv) fv.textContent='Studio '+VERSION;
  /* a friendly line above the title, by the time of day on this phone */
  const hello=$('hello'); if(hello){ const hr=new Date().getHours(); hello.textContent=hr>=5&&hr<12?'Good morning':hr>=12&&hr<17?'Good afternoon':'Good evening'; }
  /* two places: Home, and the Saved page (#saved: its own history entry, so the phone's Back button returns home).
     The bottom bar (phone) lights the one you're on; its highlight is sized from the tab itself, so icon and label sit in its middle. */
  const tabs=[...document.querySelectorAll('.hubbar a')], pill=document.querySelector('.hubbar .pill');
  /* three places since 1.0.0: Home, Templates (#templates) and Saved (#saved); each page has its own Back entry */
  const VIEWS={home:'homeView',templates:'templatesView',saved:'saved'};
  const curView=()=>!$('saved').hidden?'saved':$('templatesView')&&!$('templatesView').hidden?'templates':'home';
  const onSaved=()=>curView()==='saved';
  const hashView=()=>location.hash==='#saved'?'saved':location.hash==='#templates'&&$('templatesView')?'templates':'home';
  function setTab(v){ tabs.forEach(a=>a.setAttribute('aria-current',String(a.dataset.tab===v)));
    const on=tabs.find(a=>a.dataset.tab===v); if(on&&pill&&on.offsetWidth){ pill.style.width=on.offsetWidth+'px'; pill.style.height=on.offsetHeight+'px'; pill.style.transform=`translate(${on.offsetLeft}px,${on.offsetTop}px)`; } }
  let homeY=0;
  function showView(v){ const was=curView(); setTab(v); if(v!=='saved'&&sel) endSelect(true); if(v===was) return;
    if(was==='home') homeY=scrollY;
    Object.entries(VIEWS).forEach(([k,id])=>{ const el=$(id); if(el) el.hidden=k!==v; });
    document.body.classList.toggle('on-saved',v==='saved'); document.body.classList.toggle('on-templates',v==='templates');
    window.scrollTo({top:v==='home'?homeY:0,behavior:'instant'});
    if(v==='saved'){ paintPage(); const h=$('savedH'); h.setAttribute('tabindex','-1'); h.focus({preventScroll:true}); }
    if(v==='templates') showTemplates(); }
  /* from Home a page gets its own Back entry; going from one page to the other replaces it, so Back always lands on Home */
  function openView(v){ if(curView()===v) return; try{ if(curView()!=='home'&&history.state&&history.state.sp) history.replaceState({sp:1},'','#'+v); else history.pushState({sp:1},'','#'+v); }catch(_){} showView(v); }
  function openSaved(){ openView('saved'); }
  function goHome(){ if(curView()==='home'){ window.scrollTo({top:0,behavior:reduce()?'auto':'smooth'}); return; }
    if(history.state&&history.state.sp) history.back(); else { try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){} showView('home'); } }
  addEventListener('popstate',()=>{ const want=hashView(); if(want!==curView()) showView(want); });
  tabs.forEach(a=>a.addEventListener('click',e=>{ e.preventDefault(); haptic('tick'); if(a.dataset.tab==='home') goHome(); else openView(a.dataset.tab); }));
  document.addEventListener('click',e=>{ const a=e.target.closest('[data-see-all]'); if(a){ e.preventDefault(); openSaved(); } });
  $('savedBack').onclick=()=>{ if(sel) return history.state&&history.state.sel?history.back():endSelect(); goHome(); };
  /* ---------- Templates (assets/templates.js): every ready-made start in one place, by kind, with real previews.
     Tool presets (brand kit `presets`: a tool with a style and words), Create templates (brand kit `create.templates`) and the
     team's own templates (Saved designs of kind "template"). A tap starts it at once. Previews: assets/thumbs/<brand>/tpl/<id>.jpg ---------- */
  const TPL_CATS=[{id:'all',label:'All'},{id:'restock',label:'Restock'},{id:'story',label:'Stories'},{id:'post',label:'Posts'},{id:'highlight',label:'Highlights'},{id:'team',label:'Team'}];
  const tplThumb=id=>`${ROOT}assets/thumbs/${B.id}/tpl/${id}.jpg`;
  const toolShape=t=>t==='highlight'?'circle':t==='carousel'?'post':'story';
  const TPL_SIZE={story:'Story',post:'Post',square:'Square'};
  function tplEntries(){
    const out=[];
    (B.presets||[]).forEach(p=>{ if(!TOOLS[p.tool]) return; out.push({id:'p:'+p.id,cat:p.cat||'story',title:p.label,sub:p.sub||TOOLS[p.tool].title,thumb:tplThumb(p.id),shape:p.shape||toolShape(p.tool),href:toolPage(p.tool)+'?preset='+encodeURIComponent(p.id),badge:p.badge||'',keys:TOOLS[p.tool].title}); });
    if(TOOLS.create) ((B.create&&B.create.templates)||[]).forEach(d=>{ const hl=d.layout==='highlight';
      out.push({id:'t:'+d.id,cat:d.cat||(hl?'highlight':d.size==='post'?'post':'story'),title:d.label,sub:(hl?'Cover':TPL_SIZE[d.size]||'Story')+(d.pages>1?' · '+d.pages+' pages':'')+' · Create',thumb:tplThumb(d.id),shape:hl?'circle':d.size==='post'?'post':d.size==='square'?'square':'story',href:toolPage('create')+'?tpl='+encodeURIComponent(d.id),badge:d.badge||''}); });
    all.filter(d=>d.kind==='template').forEach(d=>out.push({id:'team:'+d.id,cat:'team',title:d.name,sub:toolName(d.tool),thumb:urls[d.thumb_path]||null,shape:toolShape(d.tool),href:toolPage(d.tool)+'?design='+encodeURIComponent(d.id)}));
    return out; }
  let tplApi=null;
  function showTemplates(){
    if(!window.StudioTemplates||!$('templatesView')) return;
    if(!tplApi) tplApi=StudioTemplates.init({root:$('templatesView'),cats:TPL_CATS,entries:tplEntries,esc,haptic,store,icons:ICON,
      onBack:()=>goHome(),
      teamNote:()=>member?{text:'No team templates yet. Save a design with “Keep the photos” off, and it shows here for everyone.'}
                        :{text:'Templates your team saves show here.',action:{label:'Sign in',run:()=>$('acct').click()}}});
    tplApi.show(); const h=$('templatesView').querySelector('h1'); if(h){ h.setAttribute('tabindex','-1'); h.focus({preventScroll:true}); } }
  addEventListener('resize',()=>setTab(curView()));
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>setTab(curView()));
  if(hashView()!=='home') showView(hashView()); else requestAnimationFrame(()=>setTab('home'));
  $('savedRowList').innerHTML=skel(4);   // placeholders until the team's designs arrive

  /* install hint: Android/desktop Chrome get a real Install button; iPhone gets the Share → Add to Home Screen steps */
  (function(){
    const bar=$('installBar'); if(!bar||standalone()||store('studio:installHidden')) return;
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const showPrompt=()=>{ bar.hidden=false; $('installGo').hidden=false; if(/android/i.test(navigator.userAgent)) $('installTxt').innerHTML='<b>Install Studio</b><span>Open it like an app, and share photos to it from your gallery.</span>'; };
    if(installEvt) showPrompt(); document.addEventListener('studio:installable',showPrompt);
    if(ios){ bar.hidden=false; $('installGo').hidden=true; $('installTxt').innerHTML='<b>Install Studio</b><span>Tap <svg class="ios-share" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share"><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg> Share, then <b>Add to Home Screen</b>.</span>'; }
    $('installGo').onclick=async()=>{ if(!installEvt) return; installEvt.prompt(); const r=await installEvt.userChoice.catch(()=>null); installEvt=null; if(r&&r.outcome==='accepted') bar.hidden=true; };
    $('installX').onclick=()=>{ bar.hidden=true; store('studio:installHidden',1); };
    window.addEventListener('appinstalled',()=>{ bar.hidden=true; });
  })();

  /* continue editing: every unfinished story kept on this phone, newest first (several per tool) */
  const cont=Object.keys(TOOLS).flatMap(id=>listDrafts(B.id,id)).sort((a,b)=>(b.d.at||0)-(a.d.at||0));
  const thumbs={};
  function paintCont(){
    const list=cont.filter(x=>!x.gone);
    $('continueSec').hidden=!list.length;
    const per={}; list.forEach(x=>{ per[x.tool]=(per[x.tool]||0)+1; });
    const many=Object.entries(per).filter(([,n])=>n>=DRAFT_CAP).map(([t,n])=>n+' '+TOOLS[t].title);
    const note=$('contNote')||(()=>{ const p=document.createElement('p'); p.id='contNote'; p.className='small cont-note'; $('continueList').before(p); return p; })();
    note.hidden=!many.length; note.textContent=many.length?'Lots of unfinished stories ('+many.join(', ')+'). The oldest are at the end: remove the ones you don’t need with ✕.':'';
    $('continueList').innerHTML=list.map(x=>`<div class="ccard" data-draft="${esc(x.key)}"><a href="${toolPage(x.tool)}?draft=${encodeURIComponent(x.id)}" class="rlink"><span class="cthumb">${thumbs[x.key]?`<img alt="" src="${thumbs[x.key]}">`:''}</span><span class="rtxt"><b>${esc(TOOLS[x.tool].title)}</b><span dir="auto">${ago(x.d.at)}</span></span></a><button type="button" class="rx" data-rm="${esc(x.key)}" aria-label="Remove this ${esc(TOOLS[x.tool].title)} story from Continue editing">✕</button></div>`).join('');
    list.forEach(x=>{ if(thumbs[x.key]!==undefined) return; thumbs[x.key]=null; draftThumbUrl(x).then(u=>{ if(!u) return; thumbs[x.key]=u; const c=document.querySelector(`.ccard[data-draft="${CSS.escape(x.key)}"] .cthumb`); if(c&&!c.firstChild) c.innerHTML=`<img alt="" src="${u}">`; }); });
  }
  /* remove an unfinished story: only after you confirm; its photos are deleted from this phone */
  $('continueList').addEventListener('click',e=>{ const b=e.target.closest('[data-rm]'); if(!b) return; const x=cont.find(c=>c.key===b.dataset.rm); if(!x) return;
    const d=dialog(`<div class="dlg-body">${thumbs[x.key]?`<img class="cf-thumb" src="${thumbs[x.key]}" alt="">`:''}<h3>Remove this unfinished ${esc(TOOLS[x.tool].title)} story?</h3><p class="small">Edited ${esc(ago(x.d.at))}. It and its photos are deleted from this phone. This can't be undone.</p>
      <div class="dlg-actions"><button type="button" class="mini" id="rmNo">Keep it</button><button type="button" class="btn danger" id="rmYes">Remove</button></div></div>`);
    d.querySelector('#rmNo').onclick=()=>d.close();
    d.querySelector('#rmYes').onclick=()=>{ d.close(); x.gone=true; removeDraft(x.key); paintCont(); hubToast(TOOLS[x.tool].title+' story removed.'); }; });
  if(cont.length) paintCont();

  /* ---------- first-run welcome (assets/welcome.js): three short swipes (the main tools, pins and search, saving). Once per device,
     only on a device that never used Studio; Settings → Welcome tour (or ?welcome=1) shows it again. ---------- */
  const WKEY='studio:welcome';
  function openWelcome(){ if(!window.StudioWelcome) return Promise.resolve(null);
    const tools=quickTools().slice(0,3).map(([id,t])=>({id,title:t.title,blurb:t.quick,thumb:`${ROOT}assets/thumbs/${B.id}/${id}.jpg`}));
    const ph=B.phrases||{}, ar=(ph.restock||ph.headlines||[])[0];   // the mock search shows a tool name, then a phrase in the brand's language
    return StudioWelcome.open({tools,icons:ICON,lockScroll,haptic,queries:[tools[0]?tools[0].title:'Restock',ar||(tools[1]?tools[1].title:'Search')]}).then(r=>{ store(WKEY,'seen'); return r; }); }
  { const qs=new URLSearchParams(location.search);
    if(qs.get('welcome')==='1'){ history.replaceState(null,'',location.pathname+location.hash); setTimeout(openWelcome,300); }
    else if(firstRun&&!navigator.webdriver&&!qs.has('shared')&&!location.hash) setTimeout(openWelcome,450);   // (automated tests open it on purpose)
    else if(!firstRun&&!store(WKEY)) store(WKEY,'old'); }

  /* ---------- Settings (the gear at the top): the few things you can change, in one short list ---------- */
  function openSettings(){
    const row=(act,ic,title,sub,end)=>`<button type="button" class="act-row set-row" data-set="${act}">${ic}<span class="set-txt"><b>${title}</b><small>${sub}</small></span>${end?`<span class="set-end">${end}</span>`:''}</button>`;
    const acc=me?row('account',ICON.user,'Account',esc((C&&me.email===C.teamEmail?'Team login':me.email||'Signed in')+' · sign out')):row('account',ICON.user,'Sign in','See and save your team’s designs');
    const d=dialog(`<div class="dlg-body set"><div class="lib-head"><h3 id="setH">Settings</h3><button type="button" class="mini solid" data-x>Done</button></div>
      <div class="act-list set-list">${acc}
      ${row('view',toolsView==='list'?ICON.list:ICON.grid,'Your tools','How your pinned tools look on Home',toolsView==='list'?'List':'Grid')}
      ${row('welcome',ICON.play,'Welcome tour','The quick intro: tools, pins, search and saving')}
      ${row('new',ICON.sparkle,'What’s new','Every update, newest first')}
      ${standalone()?'':row('install',ICON.install,'Install Studio','Open it from your home screen like an app')}
      ${row('lab',ICON.lab,'Experimental','New things being tested (passcode)')}</div>
      <p class="small set-foot">Studio ${esc(VERSION)} · Pins, recent searches and unfinished stories stay on this phone.</p></div>`,'set-dlg');
    d.setAttribute('aria-labelledby','setH'); d.tabIndex=-1; d.focus();
    d.querySelector('[data-x]').onclick=()=>d.close();
    d.querySelector('.set-list').addEventListener('click',e=>{ const b=e.target.closest('[data-set]'); if(!b) return; const a=b.dataset.set; haptic('tick');
      if(a==='view'){ toolsView=toolsView==='list'?'grid':'list'; store('studio:toolsView',toolsView); paintToolsView(); b.querySelector('.set-end').textContent=toolsView==='list'?'List':'Grid'; b.firstElementChild.outerHTML=toolsView==='list'?ICON.list:ICON.grid; return; }
      d.close();
      if(a==='account') $('acct').click(); else if(a==='welcome') openWelcome(); else if(a==='new') location.href=ROOT+'whats-new.html'; else if(a==='lab') openLab();
      else if(a==='install') searchActions().find(x=>x.id==='act:install').run(); });
  }
  if($('setBtn')) $('setBtn').onclick=openSettings;

  /* ---------- universal search (assets/search.js): tools, templates, saved designs, unfinished stories, settings and actions ---------- */
  const goSaved=()=>openSaved();
  const tplSize={story:'Story',post:'Post',square:'Square'};
  let tq=null;   // saved-design thumbnails are asked for in one batch
  const thumbFor=p=>{ if(!p||!C) return Promise.resolve(null); if(urls[p]) return Promise.resolve(urls[p]);
    if(!tq){ const q=tq={paths:new Set()}; q.p=new Promise(r=>setTimeout(async()=>{ tq=null; try{ Object.assign(urls,await C.fileUrls([...q.paths])); }catch(_){} r(); },30)); }
    tq.paths.add(p); return tq.p.then(()=>urls[p]||null); };
  function searchEntries(){
    const pins=getPins(), out=[];
    Object.entries(TOOLS).forEach(([id,t])=>out.push({kind:'tool',id:'tool:'+id,title:t.title,sub:t.blurb,keys:[TOOL_GROUPS[t.group],t.quick,t.keys].filter(Boolean).join(' '),thumb:toolThumb(id),href:toolPage(id),pinned:pins.includes(id),togglePin:()=>togglePin(id,true)}));
    cont.filter(x=>!x.gone).forEach(x=>out.push({kind:'draft',id:'draft:'+x.key,title:TOOLS[x.tool].title,sub:'Unfinished · '+ago(x.d.at),keys:'continue unfinished draft editing',thumb:thumbs[x.key]||null,icon:ICON.text,href:toolPage(x.tool)+'?draft='+encodeURIComponent(x.id)}));
    if(TOOLS.create) ((B.create&&B.create.templates)||[]).forEach(d=>out.push({kind:'template',id:'tpl:'+d.id,title:d.label,sub:'Template · '+(tplSize[d.size]||'Story')+(d.pages>1?' · '+d.pages+' pages':''),keys:['template create',d.size||'story',d.cat,d.keys].concat(Object.values(d.words||{})).filter(Boolean).join(' '),thumb:tplThumb(d.id),shape:d.layout==='highlight'?'circle':d.size==='post'?'post':d.size==='square'?'square':'story',icon:ICON.template,href:toolPage('create')+'?tpl='+encodeURIComponent(d.id)}));
    (B.presets||[]).forEach(p=>{ if(TOOLS[p.tool]) out.push({kind:'template',id:'pre:'+p.id,title:p.label,sub:'Template · '+TOOLS[p.tool].title,keys:'template '+TOOLS[p.tool].title+' '+(p.cat||''),thumb:tplThumb(p.id),shape:p.shape||toolShape(p.tool),icon:ICON.template,href:toolPage(p.tool)+'?preset='+encodeURIComponent(p.id)}); });
    all.forEach(d=>{ const cn=d.collections.map(colName).filter(Boolean), tpl=d.kind==='template';
      out.push({kind:tpl?'template':'design',id:'design:'+d.id,title:d.name,sub:(tpl?'Team template · ':'')+toolName(d.tool)+(cn.length?' · '+cn.join(', '):'')+' · '+ago(d.updated_at),keys:cn.join(' ')+' '+toolName(d.tool)+(tpl?' team template':' saved design'),thumb:urls[d.thumb_path]||null,thumbAsync:()=>thumbFor(d.thumb_path),icon:ICON.bookmark,run:()=>designSheet(d)}); });
    cols.forEach(c=>out.push({kind:'design',id:'col:'+c.id,title:c.name,sub:'Collection · '+c.count+' design'+(c.count===1?'':'s'),keys:'collection folder',icon:ICON.bookmark,badge:'Collection',run:()=>{ filter='c:'+c.id; goSaved(); paintPage(); }}));
    return out.concat(searchActions());
  }
  function searchActions(){ const a=[];
    a.push({kind:'action',id:'act:all-tools',title:'All tools',sub:'Pin or unpin tools on your home screen',keys:'pin unpin star favourite favorite library tools home',icon:ICON.grid,run:openLibrary});
    a.push({kind:'action',id:'act:saved',title:'Saved designs',sub:member?'Your team’s saved designs':'Sign in to see your team’s designs',keys:'saved team designs library',icon:ICON.bookmark,run:goSaved});
    a.push(me?{kind:'action',id:'act:account',title:'Account',sub:(C&&me.email===C.teamEmail?'Team login':me.email||'Signed in')+' · sign out',keys:'account sign out log out logout team members',icon:ICON.user,run:()=>$('acct').click()}
             :{kind:'action',id:'act:signin',title:'Sign in',sub:'See and save your team’s designs',keys:'sign in log in login account team password saved designs',icon:ICON.user,run:()=>$('acct').click()});
    a.push({kind:'action',id:'act:new',title:'What’s new',sub:'Studio '+VERSION+' · every update',keys:"what's new whats news update updates changelog version release notes",icon:ICON.sparkle,href:ROOT+'whats-new.html'});
    a.push({kind:'action',id:'act:view',title:toolsView==='list'?'Show your tools as a grid':'Show your tools as a list',sub:'How your pinned tools look',keys:'view layout grid list tools display',icon:toolsView==='list'?ICON.grid:ICON.list,run:()=>{ toolsView=toolsView==='list'?'grid':'list'; store('studio:toolsView',toolsView); paintToolsView(); }});
    if(!standalone()) a.push({kind:'action',id:'act:install',title:'Install Studio',sub:'Open it from your home screen like an app',keys:'install app home screen add shortcut',icon:ICON.install,run:()=>{ if(installEvt){ installEvt.prompt(); return; }
      const d=dialog(`<div class="dlg-body"><h3>Install Studio</h3><p class="small">${isIOS()?'Tap the Share button, then <b>Add to Home Screen</b>.':'Open the browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>.'}</p><div class="dlg-actions"><button type="button" class="btn" data-x>OK</button></div></div>`); d.querySelector('[data-x]').onclick=()=>d.close(); }});
    a.push({kind:'action',id:'act:templates',title:'Templates',sub:'Ready-made stories, posts and covers',keys:'templates ready made start restock story post highlight cover library',icon:ICON.template,run:()=>openView('templates')});
    a.push({kind:'action',id:'act:settings',title:'Settings',sub:'Account, your tools, welcome tour',keys:'settings preferences options account gear',icon:ICON.settings,run:openSettings});
    a.push({kind:'action',id:'act:welcome',title:'Welcome tour',sub:'The quick intro to Studio',keys:'welcome tour intro introduction help how onboarding tutorial guide start',icon:ICON.play,run:openWelcome});
    a.push({kind:'action',id:'act:lab',title:'Experimental',sub:'New things being tested (passcode)',keys:'experimental lab labs board beta passcode test',icon:ICON.lab,run:openLab});
    return a; }
  function searchShortcuts(){ const pins=getPins(), q=quickTools(), first=q.find(([id])=>pins.includes(id))||q[0], s=[];
    if(first) s.push({kind:'tool',id:'sc:quick',title:first[1].title+' from a photo',sub:first[1].quick,icon:ICON.camera,quick:{tool:first[0],multi:!!(first[1].multi||first[1].queue)}});
    const last=cont.filter(x=>!x.gone)[0]; if(last) s.push({kind:'draft',id:'sc:cont',title:'Continue '+TOOLS[last.tool].title,sub:ago(last.d.at),icon:ICON.text,href:toolPage(last.tool)+'?draft='+encodeURIComponent(last.id)});
    s.push({kind:'action',id:'sc:all',title:'All tools',icon:ICON.grid,run:openLibrary});
    s.push({kind:'action',id:'sc:tpl',title:'Templates',icon:ICON.template,run:()=>openView('templates')});
    s.push({kind:'action',id:'sc:saved',title:'Saved designs',icon:ICON.bookmark,run:goSaved});
    s.push({kind:'action',id:'sc:new',title:'What’s new',icon:ICON.sparkle,href:ROOT+'whats-new.html'});
    return s.slice(0,6); }
  if(window.StudioSearch&&$('uq')) StudioSearch.init({input:$('uq'),root:$('uSearch'),panel:$('usPanel'),cancel:$('usCancel'),esc,store,icons:ICON,entries:searchEntries,shortcuts:searchShortcuts,haptic});

  /* ---------- Saved designs: the latest in a row on the home page (See all), and the Saved page: a picture grid with quick
     filters by type and collection. Tap a design to open it; press and hold (or ⋯, or right-click) for Duplicate, Rename, Delete… ---------- */
  C=await cloud(); await C.client();
  async function refreshAccount(){
    const s=await C.session(); me=s&&s.user; member=!!(me&&await C.isMember());
    $('acct').textContent=me?(me.email===C.teamEmail?'Team':(me.email||'Account')):'Sign in'; $('acct').classList.toggle('on',!!me);
    owner=false; if(member){ try{ const m=await C.members(); owner=m.some(x=>x.email===(me.email||'').toLowerCase()&&x.role==='owner'); }catch(_){} }
    return member;
  }
  /* load once at a time; sign-in events for the same person don't reload (that used to redraw the list under your finger) */
  function loadSaved(force){ if(loading&&!force) return loading; loading=doLoad().finally(()=>{ loading=null; }); return loading; }
  function skel(n){ return Array.from({length:n},()=>'<div class="sv-card sv-skel" aria-hidden="true"><span class="sv-open"><span class="sv-thumb"></span><span class="sv-txt"><span class="sv-line"></span><span class="sv-line short"></span></span></span></div>').join(''); }
  /* a friendly note for empty, signed-out and error states: icon, title, one line, an optional button */
  const note=(ic,title,text,btn)=>`<div class="sv-note"><span class="sn-ic" aria-hidden="true">${ic}</span><div class="sn-txt"><b>${title}</b><p>${text}</p></div>${btn||''}</div>`;
  async function doLoad(){
    const member=await refreshAccount(); loadedFor=me?me.id:null;
    if(!member){ all=[]; cols=[]; loaded=true; if(window.StudioSearch) StudioSearch.refresh(); signedOut(); return; }
    if(!all.length){ $('savedRowList').innerHTML=skel(4); $('savedGrid').innerHTML=skel(6); $('savedEmpty').hidden=true; }
    try{ [all,cols]=await Promise.all([C.designs(B.id),C.collections(B.id)]); }
    catch(err){ const m=note(ICON.rotate,'Could not load the saved designs',esc(err.message),'<button type="button" class="btn slim" data-reload>Try again</button>'); $('savedRowList').innerHTML=m; $('savedGrid').innerHTML=''; $('savedEmpty').hidden=false; $('savedEmpty').innerHTML=m; return; }
    loaded=true; paint();
  }
  function signedOut(){
    const h=me?note(ICON.user,'Not on the team yet','Ask the owner to add this email to the team.'):note(ICON.bookmark,'Your team’s designs live here','Sign in to see and open the designs your team saved.','<button type="button" class="btn slim" data-signin>Sign in</button>');
    $('savedRowList').innerHTML=h; $('savedCount').textContent=''; $('spCount').textContent='';
    endSelect(true); $('colChips').hidden=$('sortBtn').hidden=$('savedTip').hidden=$('selBtn').hidden=true; $('savedGrid').innerHTML=''; $('savedEmpty').hidden=false; $('savedEmpty').innerHTML=h;
  }
  document.addEventListener('click',async e=>{ if(e.target.closest('[data-signin]')){ if(await ensureMember()) loadSaved(true); } else if(e.target.closest('[data-reload]')) loadSaved(true); });
  const lastUse=d=>Math.max(+new Date(d.used_at||0),+new Date(d.updated_at||0));
  /* the name on a card: an automatic name ("Restock – 24 Oct") shows only "Restock" when its date is the day under it anyway,
     so the name fits on one line (1.6.0); the full name stays in the menu, Peek, search and the tooltip */
  const cardName=d=>{ const m=/^(.+) – (\d{1,2} [A-Z][a-z]{2})$/.exec(d.name||''); return m&&m[1]===toolName(d.tool)&&m[2]===dayTag(lastUse(d)).replace(/ \d{4}$/,'')?m[1]:d.name; };
  function thumbImg(d){ const u=urls[d.thumb_path]; return `<img alt="" decoding="async" draggable="false" data-path="${esc(d.thumb_path||'')}"${u?` src="${u}"`:''}>`; }
  function fillThumbs(list){ const need=list.map(d=>d.thumb_path).filter(p=>p&&!urls[p]); const apply=()=>document.querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; });
    if(!need.length) return apply(); C.fileUrls(need).then(u=>{ Object.assign(urls,u); apply(); }); }
  const svCard=(d,i)=>{ const tpl=d.kind==='template';
    return `<div class="sv-card${sel&&sel.has(d.id)?' picked':''}" data-id="${esc(d.id)}" style="--i:${Math.min(i,12)}"><a class="sv-open" href="${toolPage(d.tool)}?design=${encodeURIComponent(d.id)}" draggable="false" aria-label="${esc(d.name)}, ${esc(toolName(d.tool))}${tpl?', template':''}. Press and hold for more."><span class="sv-thumb">${thumbImg(d)}${tpl?'<em class="sv-badge">Template</em>':''}<span class="sv-check" aria-hidden="true">${ICON.check}</span></span><span class="sv-txt" dir="auto"><b title="${esc(d.name)}">${esc(cardName(d))}</b><span><bdi>${esc(ago(lastUse(d)))}</bdi></span></span></a><button type="button" class="sv-more" data-dmore="${esc(d.id)}" aria-label="More for ${esc(d.name)}">${ICON.more}</button></div>`; };
  const emptyNote=note(ICON.bookmark,'Nothing saved yet','Tap Save in any tool and your design lands here, for the whole team.','<button type="button" class="btn slim" data-new>Make a design</button>');
  function paint(){ if(window.StudioSearch) StudioSearch.refresh(); paintRow(); paintPage(); if(tplApi&&curView()==='templates') tplApi.refresh(); }
  /* home: the latest designs in one row, and See all */
  function paintRow(){
    if(!loaded||!member) return;
    const recent=[...all].sort((a,b)=>lastUse(b)-lastUse(a)).slice(0,10);
    $('savedCount').textContent=all.length?String(all.length):'';
    $('savedRowList').innerHTML=recent.length?recent.map(svCard).join('')+(all.length>recent.length?`<a class="sv-all" href="#saved" data-see-all><span>${ICON.next}</span>See all ${all.length}</a>`:''):emptyNote;
    fillThumbs(recent);
  }
  /* the Saved page: one row of collection chips (All first), the sort button, a grid of pictures */
  function paintPage(){
    if(!loaded){ if(member||!me) $('savedGrid').innerHTML=skel(6); return; }
    if(!member) return;
    const has=!!all.length;
    if(filter!=='all'&&!cols.some(c=>'c:'+c.id===filter)) filter='all';
    $('sortLbl').textContent=sortBy==='name'?'A to Z':SORTS[sortBy]; $('sortBtn').setAttribute('aria-label','Sort: '+SORTS[sortBy]); $('sortBtn').hidden=!has||!!sel;
    $('colChips').hidden=!has||!cols.length;
    $('colChips').innerHTML=`<button type="button" class="chip" data-f="all" aria-pressed="${filter==='all'}">All <i>${all.length}</i></button>`+cols.map(c=>{ const on=filter==='c:'+c.id, chip=`<button type="button" class="chip col" dir="auto" data-f="c:${esc(c.id)}" aria-pressed="${on}">${ICON.folder}<span>${esc(c.name)}</span> <i>${c.count}</i></button>`;
      return on?`<span class="col-sel">${chip}<button type="button" class="col-more" id="colMore" aria-haspopup="menu" aria-expanded="false" aria-label="Options for the ${esc(c.name)} collection">${ICON.more}</button></span>`:chip; }).join('');
    { const box=$('colChips'), on=box.querySelector('.col-sel'); if(on&&!box.hidden){ const br=box.getBoundingClientRect(), r=on.getBoundingClientRect();   // the chosen collection (and its ⋯) stays in view
      if(r.right>br.right-36) box.scrollLeft+=r.right-br.right+36; else if(r.left<br.left+8) box.scrollLeft-=br.left+8-r.left; } }
    const list=all.filter(d=>filter==='all'||d.collections.includes(filter.slice(2)));
    list.sort(sortBy==='name'?(a,b)=>a.name.localeCompare(b.name):sortBy==='oldest'?(a,b)=>lastUse(a)-lastUse(b):(a,b)=>lastUse(b)-lastUse(a));
    $('spCount').textContent=has?(list.length===all.length?all.length+' design'+(all.length===1?'':'s'):list.length+' of '+all.length):'';
    $('savedTip').hidden=!has||!list.length||list.length>=6;   // a few designs: a tip under them, so the page isn't bare
    shown=list; $('selBtn').hidden=!has;
    if(sel){ const ids=new Set(list.map(d=>d.id)); [...sel].forEach(id=>{ if(!ids.has(id)) sel.delete(id); }); }   // only what you can see stays ticked
    if(!has){ endSelect(true); $('savedGrid').innerHTML=''; $('savedEmpty').hidden=false; $('savedEmpty').innerHTML=emptyNote; return; }
    const colOn=filter.startsWith('c:')&&cols.find(c=>'c:'+c.id===filter);
    $('savedEmpty').hidden=!!list.length; if(!list.length) $('savedEmpty').innerHTML=colOn&&!colOn.count
      ?note(ICON.folder,'“'+esc(colOn.name)+'” is empty','Tap ⋯ on a design, then Collections, to add it here.','<button type="button" class="btn slim ghost" data-showall>Show all designs</button>')
      :note(ICON.search,'No saved design matches that','Try another collection.','<button type="button" class="btn slim ghost" data-showall>Show all</button>');
    $('savedGrid').innerHTML=list.map(svCard).join('');
    fillThumbs(list); paintSel();
  }
  /* Sort: a small sheet in Studio's style (not the browser's list), a tick on the choice; picking one closes it */
  $('sortBtn').addEventListener('click',()=>{ const btn=$('sortBtn'); haptic('tick');
    const d=dialog(`<div class="dlg-body sort-sheet"><h3 id="sortH">Sort by</h3><div class="sort-opts" role="radiogroup" aria-labelledby="sortH">${Object.entries(SORTS).map(([k,l])=>`<button type="button" class="sort-opt" role="radio" data-sort="${k}" aria-checked="${k===sortBy}"><span>${l}</span>${ICON.check}</button>`).join('')}</div></div>`,'sort-dlg');
    btn.setAttribute('aria-expanded','true'); d.setAttribute('aria-labelledby','sortH');
    d.querySelector('.sort-opt[aria-checked="true"]').focus({preventScroll:true});
    d.querySelector('.sort-opts').addEventListener('click',e=>{ const o=e.target.closest('[data-sort]'); if(!o) return;
      sortBy=o.dataset.sort; store('studio:savedSort',sortBy); haptic('tick'); d.close(); paintPage(); });
    d.querySelector('.sort-opts').addEventListener('keydown',e=>{ if(!/^Arrow(Up|Down)$/.test(e.key)) return; e.preventDefault(); const o=[...d.querySelectorAll('.sort-opt')], i=o.indexOf(document.activeElement); o[(i+(e.key==='ArrowDown'?1:o.length-1))%o.length].focus(); });
    d.addEventListener('close',()=>{ btn.setAttribute('aria-expanded','false'); }); });
  $('colChips').addEventListener('click',e=>{ const b=e.target.closest('[data-f]'); if(b){ filter=b.dataset.f==='all'||filter===b.dataset.f?'all':b.dataset.f; haptic('tick'); paintPage(); } });   // tap again: All
  $('savedEmpty').addEventListener('click',e=>{ if(e.target.closest('[data-showall]')){ filter='all'; paintPage(); } });
  /* the chosen collection's ⋯: a small menu with Rename and Delete (Delete still asks first) */
  $('colChips').addEventListener('click',e=>{ const b=e.target.closest('#colMore'); if(!b) return; e.stopPropagation(); haptic('tick');
    popMenu(b,[{id:'colRename',icon:ICON.pencil,label:'Rename collection',run:renameCol},{id:'colDelete',icon:ICON.trash,label:'Delete collection',danger:true,run:deleteCol}]); });
  /* "Make a design" (empty Saved): the + menu */
  document.addEventListener('click',e=>{ if(e.target.closest('[data-new]')) $('fab').click(); });
  function renameCol(){ const c=cols.find(x=>'c:'+x.id===filter); if(!c) return;
    const d=dialog(`<form method="dialog" class="dlg-body"><h3>Rename collection</h3><input type="text" id="crName" dir="auto" maxlength="40"><div class="status" id="crSt"></div><div class="dlg-actions"><button type="button" class="mini" id="crX">Cancel</button><button type="submit" class="btn">Rename</button></div></form>`);
    d.querySelector('#crName').value=c.name; d.querySelector('#crX').onclick=()=>d.close();
    d.querySelector('form').onsubmit=async e=>{ e.preventDefault(); try{ await C.renameCollection(c.id,d.querySelector('#crName').value); d.close(); loadSaved(true); }catch(err){ d.querySelector('#crSt').textContent=err.message; } }; };
  function deleteCol(){ const c=cols.find(x=>'c:'+x.id===filter); if(!c) return;
    const d=dialog(`<div class="dlg-body"><h3>Delete “${esc(c.name)}”?</h3><p class="small">Only the collection goes. The designs in it stay in Saved.</p><div class="dlg-actions"><button type="button" class="mini" id="cdX">Cancel</button><button type="button" class="btn danger" id="cdGo">Delete collection</button></div></div>`);
    d.querySelector('#cdX').onclick=()=>d.close(); d.querySelector('#cdGo').onclick=async()=>{ await C.deleteCollection(c.id); d.close(); filter='all'; loadSaved(true); }; };
  /* a small menu under a button: arrow keys move, Escape / a tap outside / scrolling closes it, focus goes back to the button */
  function popMenu(btn,items){
    const old=document.querySelector('.pop-menu'); if(old) old.remove();
    const m=document.createElement('div'); m.className='pop-menu'; m.setAttribute('role','menu'); m.setAttribute('aria-label',btn.getAttribute('aria-label')||'Options');
    m.innerHTML=items.map(it=>`<button type="button" role="menuitem" class="pm-item${it.danger?' danger':''}" id="${it.id}">${it.icon}<span>${esc(it.label)}</span></button>`).join('');
    document.body.appendChild(m);
    const r=btn.getBoundingClientRect(), w=m.offsetWidth, h=m.offsetHeight, rtl=getComputedStyle(btn).direction==='rtl';
    const x=Math.max(8,Math.min(innerWidth-w-8,rtl?r.left:r.right-w)); let y=r.bottom+8; if(y+h>innerHeight-8) y=Math.max(8,r.top-h-8);
    m.style.left=x+'px'; m.style.top=y+'px'; m.style.transformOrigin=`${rtl?'left':'right'} ${y<r.top?'bottom':'top'}`;
    btn.setAttribute('aria-expanded','true');
    const btns=[...m.querySelectorAll('[role=menuitem]')];
    const close=back=>{ m.remove(); btn.setAttribute('aria-expanded','false'); removeEventListener('pointerdown',out,true); removeEventListener('scroll',shut,true); removeEventListener('resize',shut); document.removeEventListener('keydown',key,true); if(back&&btn.isConnected) btn.focus({preventScroll:true}); };
    const out=e=>{ if(!m.contains(e.target)&&!btn.contains(e.target)) close(false); };
    const shut=e=>{ if(!e||!m.contains(e.target)) close(false); };
    const key=e=>{ const i=btns.indexOf(document.activeElement);
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(true); }
      else if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); btns[(i+(e.key==='ArrowDown'?1:btns.length-1))%btns.length].focus(); }
      else if(e.key==='Tab') close(false); };
    btn.addEventListener('click',function again(e){ if(m.isConnected){ e.stopImmediatePropagation(); close(true); } btn.removeEventListener('click',again,true); },{capture:true,once:true});
    addEventListener('pointerdown',out,true); addEventListener('scroll',shut,true); addEventListener('resize',shut); document.addEventListener('keydown',key,true);
    m.addEventListener('click',e=>{ const b=e.target.closest('[role=menuitem]'); if(!b) return; const it=items.find(x=>x.id===b.id); close(false); if(it) it.run(); });
    btns[0].focus({preventScroll:true});
  }
  /* view switch for your tools (list or grid), remembered on this phone */
  document.querySelectorAll('.vswitch[data-view="tools"]').forEach(sw=>sw.addEventListener('click',e=>{ const b=e.target.closest('[data-v]'); if(!b) return; toolsView=b.dataset.v; store('studio:toolsView',toolsView); paintToolsView(); }));

  /* Select (Saved page): tick several designs, then put them in a collection, take them out of the one you're looking at,
     or delete them, in one go. The bottom bar swaps for the actions; ✕, Escape, Back or leaving the page stops selecting. */
  const plural=(n,w)=>n+' '+w+(n===1?'':'s');
  function startSelect(id){ sel=new Set(id?[id]:[]); document.body.classList.add('selecting'); $('selBar').hidden=false; haptic('tick');
    try{ history.pushState({sp:1,sel:1},'',location.hash||'#saved'); }catch(_){}
    paintPage(); }
  function endSelect(quiet){ if(!sel) return; sel=null; document.body.classList.remove('selecting'); $('selBar').hidden=true;
    if(history.state&&history.state.sel) history.back();   // drop the select step from history, so Back goes home next
    if(quiet) paintSel(); else paintPage(); }
  function paintSel(){
    const on=!!sel, n=on?sel.size:0, back=$('savedBack');
    $('savedH').textContent=on?(n?n+' selected':'Select designs'):'Saved designs';
    if(on) $('spCount').textContent=n?'Tap more, or pick what to do below':'Tap the designs you want';
    back.innerHTML=on?ICON.close:ICON.back; back.setAttribute('aria-label',on?'Stop selecting':'Back to home');
    const sb=$('selBtn'), every=on&&shown.length&&n===shown.length;
    sb.textContent=on?(every?'Clear':'Select all'):'Select'; sb.setAttribute('aria-pressed',String(on));
    $('sortBtn').hidden=on||!all.length;
    document.querySelectorAll('#savedGrid .sv-card').forEach(c=>{ const p=on&&sel.has(c.dataset.id), a=c.querySelector('.sv-open');
      c.classList.toggle('picked',p); if(on){ a.setAttribute('role','checkbox'); a.setAttribute('aria-checked',String(p)); } else { a.removeAttribute('role'); a.removeAttribute('aria-checked'); } });
    const col=filter.startsWith('c:')&&cols.find(c=>'c:'+c.id===filter);
    $('selOut').hidden=!col; if(col) $('selOut').setAttribute('aria-label','Take them out of “'+col.name+'”');
    ['selCol','selOut','selDel'].forEach(id=>$(id).disabled=!n);
  }
  function toggleSel(id){ if(!sel) return; sel.has(id)?sel.delete(id):sel.add(id); haptic('tick'); paintSel(); }
  $('selBtn').addEventListener('click',()=>{ if(!sel) return startSelect();
    if(shown.length&&sel.size===shown.length) sel.clear(); else shown.forEach(d=>sel.add(d.id)); haptic('tick'); paintSel(); });
  addEventListener('popstate',()=>{ if(sel&&!(history.state&&history.state.sel)) endSelect(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&sel&&!document.querySelector('dialog[open],.pop-menu')){ e.preventDefault(); history.state&&history.state.sel?history.back():endSelect(); } });
  const picked=()=>all.filter(d=>sel&&sel.has(d.id));
  /* run one call per design, with a running count; stops at the first error and says how far it got */
  async function eachDesign(list,st,verb,fn){ for(let i=0;i<list.length;i++){ st(verb+' '+(i+1)+' of '+list.length+'…'); await fn(list[i]); } }
  $('selDel').addEventListener('click',()=>{ const list=picked(); if(!list.length) return; const one=list.length===1;
    const cf=dialog(`<div class="dlg-body"><h3 dir="auto">Delete ${one?'“'+esc(list[0].name)+'”':plural(list.length,'design')}?</h3>
      <p class="small">This removes ${one?'the design and all its images':'these designs and all their images'} from Studio for the whole team. It can't be undone.</p>
      <div class="status" id="cfSt" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="cfNo">Cancel</button><button type="button" class="btn danger" id="cfYes">Delete${one?'':' '+list.length}</button></div></div>`);
    const st=t=>{ cf.querySelector('#cfSt').textContent=t; };
    cf.querySelector('#cfNo').onclick=()=>cf.close();
    cf.querySelector('#cfYes').onclick=async()=>{ cf.querySelectorAll('button').forEach(x=>x.disabled=true); let done=0;
      try{ await eachDesign(list,st,'Deleting',async d=>{ await C.deleteDesign(d.id); done++; }); cf.close(); endSelect(true);
        all=all.filter(x=>!list.includes(x)); paint(); hubToast(one?'“'+list[0].name+'” deleted.':plural(list.length,'design')+' deleted.'); loadSaved(true); }
      catch(err){ st((done?plural(done,'design')+' deleted, then: ':'')+err.message); cf.querySelectorAll('button').forEach(x=>x.disabled=false); if(done) loadSaved(true); } }; });
  $('selCol').addEventListener('click',()=>{ const list=picked(); if(!list.length) return; let pick=filter.startsWith('c:')?'':(cols[0]||{}).name||'';
    const d=dialog(`<div class="dlg-body"><h3>Add ${plural(list.length,'design')} to a collection</h3><div class="chips" id="scChips"></div>
      <div class="inline"><input type="text" id="scNew" dir="auto" placeholder="New collection…" maxlength="40" aria-label="New collection"></div>
      <div class="status" id="scSt" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="scX">Cancel</button><button type="button" class="btn" id="scGo">Add</button></div></div>`);
    const chips=d.querySelector('#scChips'), inp=d.querySelector('#scNew'), go=d.querySelector('#scGo'), st=t=>{ d.querySelector('#scSt').textContent=t; };
    const draw=()=>{ chips.hidden=!cols.length; chips.innerHTML=cols.map(c=>`<button type="button" class="chip" dir="auto" data-n="${esc(c.name)}" aria-pressed="${!inp.value.trim()&&pick===c.name}">${esc(c.name)}</button>`).join('');
      const name=inp.value.trim()||pick; go.disabled=!name; go.textContent=name?'Add to “'+name+'”':'Add'; };
    chips.onclick=e=>{ const c=e.target.closest('[data-n]'); if(!c) return; pick=c.dataset.n; inp.value=''; haptic('tick'); draw(); };
    inp.addEventListener('input',draw); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go.click(); } });
    d.querySelector('#scX').onclick=()=>d.close();
    go.onclick=async()=>{ const name=inp.value.trim()||pick; if(!name) return; d.querySelectorAll('button,input').forEach(x=>x.disabled=true);
      try{ await eachDesign(list,st,'Adding',async x=>{ const names=x.collections.map(colName).filter(Boolean); if(!names.includes(name)) await C.setDesignCollections(B.id,x.id,[...names,name]); });
        d.close(); endSelect(true); hubToast('Added '+plural(list.length,'design')+' to “'+name+'”.'); loadSaved(true); }
      catch(err){ st(err.message); d.querySelectorAll('button,input').forEach(x=>x.disabled=false); draw(); loadSaved(true); } };
    draw(); if(!cols.length) setTimeout(()=>inp.focus(),60); });
  $('selOut').addEventListener('click',async()=>{ const list=picked(), col=filter.startsWith('c:')&&cols.find(c=>'c:'+c.id===filter); if(!list.length||!col) return;
    const b=$('selOut'); b.disabled=true;
    try{ await eachDesign(list,()=>{},'',x=>C.setDesignCollections(B.id,x.id,x.collections.map(colName).filter(n=>n&&n!==col.name)));
      endSelect(true); hubToast('Took '+plural(list.length,'design')+' out of “'+col.name+'”.'); loadSaved(true); }
    catch(err){ hubToast('Could not take them out: '+err.message); b.disabled=false; loadSaved(true); } });

  /* press and hold a saved design (phones), right-click or ⋯ (computers): its actions. A short tap opens it. */
  let lp=null;
  const designOf=el=>{ const c=el&&el.closest('.sv-card'); return c?all.find(x=>x.id===c.dataset.id):null; };
  const cancelLp=()=>{ if(lp&&!lp.fired){ clearTimeout(lp.t); lp.a.classList.remove('pressing'); lp=null; } };
  document.addEventListener('pointerdown',e=>{ cancelLp(); lp=null; const a=e.target.closest('.sv-open'); if(!a||e.button>0||sel) return; const d=designOf(a); if(!d) return;
    a.classList.add('pressing'); const me2={x:e.clientX,y:e.clientY,a,fired:false}; me2.t=setTimeout(()=>{ me2.fired=true; a.classList.remove('pressing'); haptic('tick'); designSheet(d); },480); lp=me2; });
  document.addEventListener('pointermove',e=>{ if(lp&&!lp.fired&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10) cancelLp(); },{passive:true});
  document.addEventListener('pointerup',cancelLp); document.addEventListener('pointercancel',cancelLp);
  addEventListener('scroll',()=>{ if(lp) cancelLp(); },{passive:true,capture:true});
  document.addEventListener('keydown',()=>{ lp=null; });
  document.addEventListener('click',e=>{
    const a=e.target.closest('.sv-open'); if(a&&lp&&lp.fired){ e.preventDefault(); lp=null; return; }
    if(a&&sel){ e.preventDefault(); e.stopPropagation(); const c=a.closest('.sv-card'); if(c) toggleSel(c.dataset.id); return; }
    const m=e.target.closest('[data-dmore]'); if(m){ const d=all.find(x=>x.id===m.dataset.dmore); if(d) designSheet(d); } },true);
  document.addEventListener('contextmenu',e=>{ const a=e.target.closest('.sv-open'); if(!a) return; e.preventDefault(); if(lp&&lp.fired||sel) return; cancelLp(); const d=designOf(a); if(d&&!document.querySelector('dialog[open]')) designSheet(d); });
  function designSheet(dsg){
    try{
      const page=toolPage(dsg.tool), names=dsg.collections.map(colName).filter(Boolean), url=urls[dsg.thumb_path], tpl=dsg.kind==='template', open=page+'?design='+encodeURIComponent(dsg.id);
      const row=(act,ic,label,cls)=>`<button type="button" class="act-row${cls?' '+cls:''}" data-act="${act}">${ic}<span>${label}</span></button>`;
      const d=dialog(`<div class="dlg-body design-sheet">
      <div class="ds-top" dir="auto"><button type="button" class="ds-peek" aria-label="See it big">${url?`<img src="${url}" alt="">`:'<span class="ds-ph"></span>'}</button><div><h3>${esc(dsg.name)}</h3><p class="small"><bdi>${esc(toolName(dsg.tool))}${tpl?' · template (add new photos)':''} · ${esc(ago(dsg.updated_at))}</bdi><br>${names.length?esc(names.join(' · ')):'No collection'}</p></div></div>
      <a class="btn" href="${open}" autofocus>${tpl?'Use template':'Open'}</a>
      <div class="act-list">${tpl?'':`<a class="act-row" href="${open}&go=1">${ICON.download}<span>Save the picture again</span></a>`}${row('dup',ICON.copy,'Duplicate')}${row('rename',ICON.pencil,'Rename')}${row('cols',ICON.folder,'Collections')}${onSaved()?row('sel',ICON.check,'Select more'):''}${row('del',ICON.trash,'Delete','danger')}</div>
      <div class="ds-panel" id="dsPanel"></div><div class="status" id="dsSt" role="status"></div>
      <button type="button" class="link" id="dsClose">Close</button></div>`,'design-dlg');
      if(!url) C.fileUrl(dsg.thumb_path).then(u=>{ if(u){ urls[dsg.thumb_path]=u; const ph=d.querySelector('.ds-ph'); if(ph) ph.outerHTML=`<img src="${u}" alt="">`; } }).catch(()=>{});
    const P=d.querySelector('#dsPanel'), st=t=>{ d.querySelector('#dsSt').textContent=t; };
    d.querySelector('#dsClose').onclick=()=>d.close();
    d.querySelector('.ds-peek').onclick=()=>{ d.close(); peek(dsg); };
    d.querySelector('.act-list').addEventListener('click',async ev=>{
      const b=ev.target.closest('[data-act]'); if(!b) return; const act=b.dataset.act; st('');
      d.querySelectorAll('.act-row').forEach(x=>x.classList.toggle('on',x===b&&(act==='rename'||act==='cols')));
      if(act==='rename'){ P.innerHTML=`<div class="inline"><label class="sr-only" for="rn">New name</label><input type="text" id="rn" dir="auto" maxlength="80"><button type="button" class="mini solid" id="rnGo">Save</button></div>`; const i=P.querySelector('#rn'); i.value=dsg.name; i.focus(); i.select();
        const go=async()=>{ const v=i.value.trim(); if(!v) return; try{ await C.renameDesign(dsg.id,v); dsg.name=v; d.close(); paint(); hubToast('Renamed to “'+v+'”.'); loadSaved(true); }catch(err){ st(err.message); } };
        P.querySelector('#rnGo').onclick=go; i.addEventListener('keydown',e2=>{ if(e2.key==='Enter'){ e2.preventDefault(); go(); } }); }
      if(act==='sel'){ d.close(); startSelect(dsg.id); return; }
      if(act==='dup'){ st('Copying…'); b.disabled=true; try{ await C.duplicateDesign(dsg.id); d.close(); hubToast('Copied “'+dsg.name+'”.'); loadSaved(true); }catch(err){ st(err.message); b.disabled=false; } }
      if(act==='cols'){ const picked=new Set(names); const draw=()=>{ const allN=[...new Set([...cols.map(c=>c.name),...picked])].sort((a,b)=>a.localeCompare(b));
          P.innerHTML=`<div class="chips">${allN.map(n=>`<button type="button" class="chip" dir="auto" data-n="${esc(n)}" aria-pressed="${picked.has(n)}">${esc(n)}</button>`).join('')}</div><div class="inline"><input type="text" id="nc" dir="auto" placeholder="New collection…" maxlength="40" aria-label="New collection"><button type="button" class="mini" id="ncAdd">Add</button></div><button type="button" class="btn slim" id="colsGo">Save collections</button>`;
          P.querySelector('.chips').onclick=ev2=>{ const c=ev2.target.closest('[data-n]'); if(c){ picked.has(c.dataset.n)?picked.delete(c.dataset.n):picked.add(c.dataset.n); draw(); } };
          P.querySelector('#ncAdd').onclick=()=>{ const v=P.querySelector('#nc').value.trim(); if(v){ picked.add(v); draw(); } };
          P.querySelector('#colsGo').onclick=async()=>{ try{ await C.setDesignCollections(B.id,dsg.id,[...picked]); d.close(); loadSaved(true); }catch(err){ st(err.message); } }; };
        draw(); }
      if(act==='del'){
        const cf=dialog(`<div class="dlg-body"><h3 dir="auto">Delete “${esc(dsg.name)}”?</h3>
          <p class="small">This removes the design and all its images from Studio for the whole team. It can't be undone.</p>
          <div class="status" id="cfSt" role="status"></div>
          <div class="dlg-actions"><button type="button" class="mini" id="cfNo">Cancel</button><button type="button" class="btn danger" id="cfYes">Delete</button></div></div>`);
        cf.querySelector('#cfNo').onclick=()=>cf.close();
        cf.querySelector('#cfYes').onclick=async()=>{ cf.querySelectorAll('button').forEach(x=>x.disabled=true); cf.querySelector('#cfSt').textContent='Deleting the design and its images…';
          try{ await C.deleteDesign(dsg.id); cf.close(); d.close(); all=all.filter(x=>x.id!==dsg.id); paint(); hubToast('“'+dsg.name+'” deleted.'); loadSaved(true); }
          catch(err){ cf.querySelector('#cfSt').textContent=err.message; cf.querySelectorAll('button').forEach(x=>x.disabled=false); } };
      }
    });
    }catch(err){ hubToast('Could not open that design: '+(err.message||err)); }
  }

  /* Peek (1.3.0): a saved design big, swipe (or the arrows) to the one next to it in the same list; Open or More from here.
     The list is the cards shown around it right now (Saved with its filter, or the Saved row on Home). */
  function peek(dsg){
    const card=[...document.querySelectorAll('.sv-card[data-id]')].find(c=>c.dataset.id===dsg.id&&c.offsetParent);
    const ids=card?[...card.parentElement.querySelectorAll('.sv-card[data-id]')].map(c=>c.dataset.id):[dsg.id];
    const list=ids.map(id=>all.find(x=>x.id===id)).filter(Boolean); let i=Math.max(0,list.findIndex(x=>x.id===dsg.id)); if(!list.length) list.push(dsg);
    const d=dialog(`<div class="pk-wrap"><button type="button" class="pk-x" aria-label="Close">${ICON.close}</button>
      <div class="pk-stage"><img class="pk-img" alt=""><button type="button" class="pk-nav prev" aria-label="Previous design">${ICON.back}</button><button type="button" class="pk-nav next" aria-label="Next design">${ICON.next}</button></div>
      <div class="pk-info" dir="auto"><b class="pk-name"></b><span class="pk-sub small"></span></div>
      <div class="pk-acts"><button type="button" class="mini" data-pk="more">${ICON.more}<span>More</span></button><a class="btn" data-pk="open">Open</a></div></div>`,'peek-dlg');
    const img=d.querySelector('.pk-img');
    const show=dir=>{ const x=list[i], u=urls[x.thumb_path], tpl=x.kind==='template';
      d.querySelector('.pk-name').textContent=x.name;
      d.querySelector('.pk-sub').innerHTML=`<bdi>${esc(toolName(x.tool))}${tpl?' · template':''} · ${esc(ago(x.updated_at))}</bdi>${list.length>1?` · <bdi>${i+1} of ${list.length}</bdi>`:''}`;
      const a=d.querySelector('[data-pk="open"]'); a.href=toolPage(x.tool)+'?design='+encodeURIComponent(x.id); a.textContent=tpl?'Use template':'Open';
      d.querySelector('.prev').disabled=i===0; d.querySelector('.next').disabled=i===list.length-1;
      img.classList.remove('in-l','in-r'); void img.offsetWidth; if(dir) img.classList.add(dir>0?'in-r':'in-l');
      if(u) img.src=u; else { img.removeAttribute('src'); if(x.thumb_path) C.fileUrl(x.thumb_path).then(v=>{ if(v){ urls[x.thumb_path]=v; if(list[i]===x) img.src=v; } }).catch(()=>{}); } };
    const go=n=>{ const j=i+n; if(j<0||j>=list.length) return; i=j; haptic('tick'); show(n); };
    d.querySelector('.pk-x').onclick=()=>d.close();
    d.querySelector('.prev').onclick=()=>go(-1); d.querySelector('.next').onclick=()=>go(1);
    d.querySelector('[data-pk="more"]').onclick=()=>{ const x=list[i]; d.close(); designSheet(x); };
    d.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ e.preventDefault(); go((e.key==='ArrowRight')!==(document.dir==='rtl')?1:-1); } });
    /* swipe: left = next, right = previous (the picture follows the finger a little) */
    const st=d.querySelector('.pk-stage'); let x0=null,y0=0;
    st.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; x0=e.clientX; y0=e.clientY; });
    st.addEventListener('pointermove',e=>{ if(x0===null) return; const dx=e.clientX-x0; if(Math.abs(dx)>Math.abs(e.clientY-y0)) img.style.transform=`translateX(${dx*.4}px)`; });
    const up=e=>{ if(x0===null) return; const dx=e.clientX-x0, dy=e.clientY-y0; x0=null; img.style.transform=''; if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)) go(dx<0?1:-1); };
    st.addEventListener('pointerup',up); st.addEventListener('pointercancel',()=>{ x0=null; img.style.transform=''; });
    d.tabIndex=-1; d.focus({preventScroll:true}); show(0);   // focus on the sheet, so no ring on a button it opened with
  }

  /* account menu: who's signed in, team (owner), sign out */
  $('acct').addEventListener('click',async()=>{
    if(!me){ await ensureMember(); loadSaved(true); return; }
    const d=dialog(`<div class="dlg-body"><h3>Account</h3><p class="small">${me.email===C.teamEmail?'Signed in with the team login. You stay signed in on this phone until you sign out.':'Signed in as<br><b>'+esc(me.email||'')+'</b>'}</p>
      <div id="teamBox"></div><div class="dlg-actions"><button type="button" class="mini" id="acSignOut">Sign out</button><button type="button" class="btn" id="acClose">Done</button></div></div>`);
    d.querySelector('#acClose').onclick=()=>d.close();
    d.querySelector('#acSignOut').onclick=async ev=>{ const b=ev.currentTarget; if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='Tap again to sign out'; return; } await C.signOut(); d.close(); loadSaved(true); };
    if(owner){ const box=d.querySelector('#teamBox');
      const drawTeam=async()=>{ const m=await C.members(); box.innerHTML=`<span class="lbl">Team</span><ul class="team">${m.map(x=>`<li><span>${esc(x.name||'')} <span class="small">${esc(x.email)}</span></span>${x.role==='owner'?'<span class="small">owner</span>':`<button type="button" class="mini danger" data-rm="${esc(x.email)}">Remove</button>`}</li>`).join('')}</ul>
        <form class="inline" id="addForm"><input type="email" id="addEmail" placeholder="Add a teammate's email" required><button type="submit" class="mini solid">Add</button></form><div class="status" id="tmSt"></div>`;
        box.querySelector('#addForm').onsubmit=async e=>{ e.preventDefault(); try{ await C.addMember(box.querySelector('#addEmail').value); drawTeam(); }catch(err){ box.querySelector('#tmSt').textContent=err.message; } };
        box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{ try{ await C.removeMember(b.dataset.rm); drawTeam(); }catch(err){ box.querySelector('#tmSt').textContent=err.message; } }); };
      drawTeam(); }
  });
  C.onAuth((ev,sess)=>{ const uid=sess&&sess.user?sess.user.id:null; if(ev==='SIGNED_OUT'||(ev==='SIGNED_IN'&&loadedFor!==undefined&&uid!==loadedFor)) loadSaved(true); });
  /* Experimental area (lab/): hidden behind a passcode so unfinished experiments stay out of the way.
     The code only hides the area; it is not security. Unlocking is remembered on this device. */
  const LAB_CODE='6790';
  function openLab(){
    if(store('studio:lab')==='1'){ location.href=ROOT+'lab/index.html'; return; }
    const d=dialog(`<form method="dialog" class="dlg-body lab-gate" action="#"><h3>Experimental</h3>
      <p class="small">A space for testing new things before they join the studio. Enter the passcode.</p>
      <input type="password" id="labCode" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="Passcode" aria-label="Passcode" class="code-in">
      <div class="status" id="labSt" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="labNo">Cancel</button><button type="submit" class="btn" id="labGo">Enter</button></div></form>`);
    const i=d.querySelector('#labCode'); setTimeout(()=>i.focus(),50);
    d.querySelector('#labNo').onclick=()=>d.close();
    d.querySelector('form').onsubmit=e=>{ e.preventDefault();
      if(i.value.trim()===LAB_CODE){ store('studio:lab','1'); location.href=ROOT+'lab/index.html'; }
      else{ d.querySelector('#labSt').textContent='That passcode is not right.'; i.value=''; i.focus(); const f=d.querySelector('form'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); } };
  }
  const labBtn=$('labBtn'); if(labBtn) labBtn.onclick=openLab;
  if(location.hash==='#lab') setTimeout(openLab,200);
  loadSaved();
}

/* helpers shared with the experimental area (lab/) so it reuses the same photo loading, fonts and dialogs */
const lab={ROOT,assetPrevUrl,recentColours,addRecentColour,loadFile,isPhotoFile,isHeic,dialog,store,idb,esc,canvasBlob,stepDown,MORE_FONTS,ensureFont,brandFonts,brandAssets,assetUrl,SHAPES,
  cloud,ensureMember,shareFiles,draftBase,listDrafts,removeDraft,DRAFT_CAP,TOOLS,toolPage,ICON,brandPalette,haptic,celebrate,fresh,lockScroll,getPins,setPin,movePin,
  brand:()=>BRAND, logo:()=>LOGO, unlocked:()=>store('studio:lab')==='1', lock:()=>store('studio:lab',null)};
window.Studio={version:VERSION,tool,home,registerBrand,useBrand,lab,normText,normMap,brandList:window.Studio&&window.Studio.brandList||[],W,H};
})();

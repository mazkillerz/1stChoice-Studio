/* Studio engine (brand-agnostic).
   A tool page calls Studio.tool({...}) with a draw(h, o) function.
   The engine builds the steps (photos, style, words), the live preview, free text layers
   (drag, tap to edit, resize, recolour, add your own text), photo dragging/zooming, and saving.
   Everything brand-specific (logo, fonts, colours, wording, example photos) comes from the active brand kit. */
(function(){
const W=1080,H=1920;
const MANY=8;          // word lists longer than this show a "More…" button
const EXPORT_SCALE=2;   // saved stories are 2160×3840 so they stay sharp when zoomed; Instagram scales them down cleanly
const PHOTO_MAX_PX=12e6; // a photo is kept at full quality up to 12 megapixels (every iPhone/Android main camera photo);
                         // bigger ones (48/50/200 MP modes) are shrunk once, carefully, so phones never run out of memory
const PIN=new Path2D("M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88Zm0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32Z");
const ROOT=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/studio\.js.*$/,''):'../';
const BRANDS={};
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
function store(k,v){try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); }catch(_){ return null; }}

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
function makeHelpers(ctx,S,preview,reg,scale){
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
    photoAspect(i){const p=S.photos[i];return p&&p.img?p.img.width/p.img.height:1.5;},
    photo(i,x,y,w,hh,opt){
      opt=opt||{}; const p=S.photos[i];
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
        ctx.fillStyle='#d8d6d1'; ctx.fillRect(x,y,w,hh); ctx.fillStyle='#8b8882'; ctx.font='800 '+Math.max(28,Math.min(56,w/8))+'px "'+B.fonts.body+'"'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('+ '+(i+1),x+w/2,y+hh/2);
      }
      ctx.restore();
      reg.push({photo:i,x,y,w,h:hh,mode:opt.mode||'cover'});
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
      const fam=o.font==='display'?B.fonts.display:B.fonts.body, wt=o.weight||'';
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
      ctx.font='800 '+(o.size||36)+'px "'+B.fonts.body+'"'; const m=ctx.measureText(str), ph=o.h||76, pw=Math.ceil(m.width)+(o.pad||88), b=box(m,o.size||36);
      layer(id,label,{x:cx-pw/2,y,w:pw,h:ph},color=>{
        const bg=color||o.bg||C.ink; ctx.fillStyle=bg; ctx.beginPath(); rr(ctx,0,0,pw,ph,ph/2); ctx.fill();
        ctx.font='800 '+(o.size||36)+'px "'+B.fonts.body+'"'; ctx.direction=dir; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillStyle=color?(isLight(color)?C.ink:C.paper):(o.fg||C.paper); ctx.fillText(str,pw/2,ph/2+(b.a-b.d)/2);
      },{kind:'pill'});
      return L(id).hidden?0:ph;
    },
    /* place name with a map pin centred on the letters */
    pin(id,label,str,cx,y,o){
      o=o||{}; if(!str){ reg.push({id,label,empty:true}); return 0; }
      const fam=B.fonts.body, fs=fitSize(str,o.size||44,'800',fam,o.maxW||860), m=ctx.measureText(str), b=box(m,fs);
      const pinH=Math.round(fs*.9), kk=pinH/224, pinW=176*kk, gap=14, tw=Math.ceil(m.width), tot=tw+gap+pinW, th=Math.ceil(b.a+b.d);
      layer(id,label,{x:cx-tot/2,y,w:tot,h:th},color=>{
        ctx.font='800 '+fs+'px "'+fam+'"'; ctx.direction=dir; ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle=color||o.color||C.muted;
        const textX=dir==='rtl'?0:pinW+gap, pinX=dir==='rtl'?tw+gap:0;
        ctx.fillText(str,textX,b.a);
        const mid=b.a-(b.a-b.d)/2; ctx.translate(pinX-40*kk,mid-pinH/2-16*kk); ctx.scale(kk,kk); ctx.fill(PIN);
      },{kind:'text'});
      return L(id).hidden?0:th;
    },
    shade(y0,y1,a0,a1){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(0,0,0,'+a0+')');g.addColorStop(1,'rgba(0,0,0,'+a1+')');ctx.fillStyle=g;ctx.fillRect(0,Math.min(y0,y1),W,Math.abs(y1-y0));}
  };
  return h;
}
function isLight(hex){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return false; const n=parseInt(m[1],16); return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>150; }

/* ---------- the tool page ---------- */
async function tool(cfg){
  const app=document.getElementById('app');
  app.innerHTML='<p class="hint" style="width:100%">Loading…</p>';
  const B=await useBrand();
  const opts=v=>typeof v==='function'?v(B):v;
  const fields=(cfg.fields||[]).map(f=>({...f,options:opts(f.options),default:opts(f.default)}));
  const nPhotos=cfg.photos.max||cfg.photos.count||1, minPhotos=cfg.photos.min||cfg.photos.count||1;
  const S={style:cfg.styles?cfg.styles[0].id:null,count:cfg.photos.count||cfg.photos.min||1,active:0,photos:[],values:{},layers:{},extras:[],sel:null};
  for(let i=0;i<nPhotos;i++) S.photos.push({img:null,zoom:1,ox:0,oy:0,sample:true});
  fields.forEach(f=>{ S.values[f.id]=f.type==='chips'?{pick:f.default??f.options[0],own:''}:f.type==='seg'?f.options[0].v:f.type==='toggle'?(f.default!==false):{text:f.default||'',on:f.on!==false}; });
  const KEY='studio:'+B.id+':'+cfg.id;
  const saved=store(KEY); if(saved){ if(saved.style&&cfg.styles&&cfg.styles.some(s=>s.id===saved.style))S.style=saved.style; if(saved.count)S.count=Math.min(nPhotos,Math.max(minPhotos,saved.count)); Object.keys(saved.values||{}).forEach(k=>{ if(k in S.values) S.values[k]=saved.values[k]; }); }
  const remember=()=>store(KEY,{style:S.style,count:S.count,values:S.values});

  /* ---- page ---- */
  let step=1;
  let html=`<h1>${esc(cfg.title)}</h1>
  <div class="stage">
    <div class="phone"><canvas class="view" id="view" width="${W}" height="${H}" tabindex="0" aria-label="Story preview. Drag text or photos to move them; tap text to edit it."></canvas><div class="drop" id="drop" hidden>Drop the photo here</div></div>
    <div class="inspector" id="insp" hidden>
      <div class="insp-head"><b id="inspName">Text</b><button type="button" class="x" id="inspClose" aria-label="Done">Done</button></div>
      <input type="text" id="inspText" dir="${B.dir||'ltr'}" aria-label="Edit text" hidden>
      <div class="insp-row"><label class="lbl" for="inspSize">Size</label><input type="range" id="inspSize" min="0.4" max="2.5" step="0.01" value="1"></div>
      <div class="insp-row" id="inspColors" role="group" aria-label="Colour"></div>
      <div class="insp-row btns"><button type="button" class="mini" id="inspCenter">Centre</button><button type="button" class="mini" id="inspReset">Reset</button><button type="button" class="mini" id="inspHide">Hide</button><button type="button" class="mini danger" id="inspDelete" hidden>Delete</button></div>
    </div>
    <div class="hint" id="hint">${esc(cfg.sampleNote||'Example photos. Add yours in step 1.')}</div>
    <div class="tools"><button type="button" class="mini" id="addText">+ Add text</button><button type="button" class="mini" id="resetLayout">Reset layout</button></div>
  </div>
  <form class="panel" id="form" autocomplete="off">
  <section class="step"><h2><span class="num">${step++}</span>${nPhotos>1?'Photos':'Photo'}</h2>`;
  if(cfg.photos.min&&cfg.photos.max>cfg.photos.min){
    html+=`<span class="lbl">How many photos</span><div class="row" role="group" aria-label="How many photos">`;
    for(let k=cfg.photos.min;k<=cfg.photos.max;k++) html+=`<button type="button" class="seg" data-count="${k}" aria-pressed="false">${k}</button>`;
    html+=`</div>`;
  }
  html+=`<div class="slots" id="slots"></div><div class="small">Tap a box to add a photo, or drop / paste one. Drag a photo in the preview to move it; pinch or use the slider to zoom.</div>
  <div class="field" id="zoomRow" hidden><label class="lbl" for="zoom">Zoom</label><input type="range" id="zoom" min="1" max="3" step="0.01" value="1"><button type="button" class="link" id="fitBtn" style="align-self:flex-start;padding:0">Reset photo</button></div></section>`;
  if(cfg.styles) html+=`<section class="step"><h2><span class="num">${step++}</span>Style</h2><div class="row" role="group" aria-label="Style" id="styles">${cfg.styles.map(s=>`<button type="button" class="seg" data-style="${s.id}" aria-pressed="false">${s.swatch||''}${esc(s.label)}</button>`).join('')}</div></section>`;
  if(fields.length) html+=`<section class="step"><h2><span class="num">${step++}</span>Words</h2><div id="fields" class="field" style="gap:16px"></div><div class="small">Tip: tap any text in the preview to edit, move or resize it.</div></section>`;
  html+=`<button type="button" class="btn" id="save">Save story</button><div class="status" id="status" role="status"></div>
  <div class="result" id="result" hidden><img id="resultImg" alt="Your finished story"><span class="small">Press and hold the image (or right-click) to save it.</span></div>
  ${cfg.frameOnly?'<button type="button" class="link" id="saveFrame">Save the frame only (see-through PNG)</button>':''}
  </form>`;
  app.innerHTML=html;
  const $=id=>document.getElementById(id);
  const view=$('view'), vctx=view.getContext('2d');

  /* ---- words ---- */
  if(fields.length){
    $('fields').innerHTML=fields.map(f=>{
      let inner;
      if(f.type==='chips') inner=`<span class="lbl">${esc(f.label)}</span><div class="chips" role="group" aria-label="${esc(f.label)}" data-f="${f.id}">${f.options.map((o,i)=>`<button type="button" class="chip${i>=MANY?' extra':''}" data-v="${esc(o)}" aria-pressed="false" dir="${B.dir||'ltr'}">${esc(o)}</button>`).join('')}${f.options.length>MANY?'<button type="button" class="chip en" data-more="1" aria-expanded="false">More…</button>':''}<button type="button" class="chip en" data-own="1" aria-pressed="false">Write my own</button>${f.none?'<button type="button" class="chip en" data-none="1" aria-pressed="false">None</button>':''}</div><input type="text" dir="${B.dir||'ltr'}" data-ownfor="${f.id}" placeholder="${esc(B.phrases.write||'')}" aria-label="Your own ${esc(f.label)}" hidden>`;
      else if(f.type==='seg') inner=`<span class="lbl">${esc(f.label)}</span><div class="row" role="group" aria-label="${esc(f.label)}" data-seg="${f.id}">${f.options.map(o=>`<button type="button" class="seg" data-v="${o.v}" aria-pressed="false">${esc(o.l)}</button>`).join('')}</div>`;
      else if(f.type==='toggle') inner=`<label class="check"><input type="checkbox" data-toggle="${f.id}"> ${esc(f.label)}</label>`;
      else inner=(f.toggle?`<label class="check"><input type="checkbox" data-on="${f.id}"> ${esc(f.label)}</label>`:`<label class="lbl" for="t_${f.id}">${esc(f.label)}</label>`)+`<input type="text" dir="${B.dir||'ltr'}" id="t_${f.id}" data-text="${f.id}" placeholder="${esc(opts(f.placeholder)||'')}" ${f.toggle?`aria-label="${esc(f.label)}"`:''}>`;
      return `<div class="field" data-fw="${f.id}">${inner}</div>`;
    }).join('');
    $('fields').addEventListener('click',e=>{
      const more=e.target.closest('[data-more]'); if(more){ const g=more.parentNode, open=g.classList.toggle('open'); more.setAttribute('aria-expanded',String(open)); more.textContent=open?'Less':'More…'; return; }
      const b=e.target.closest('.chip'); if(b){ const id=b.parentNode.dataset.f, v=S.values[id];
        if(b.dataset.own){ if(v.pick!=='__own'&&!v.own) v.own=value(id); v.pick='__own'; syncUI(); const inp=document.querySelector(`[data-ownfor="${id}"]`); inp.focus(); }
        else if(b.dataset.none) v.pick='__none'; else v.pick=b.dataset.v;
        if(S.layers[id]) S.layers[id].hidden=false;
        syncUI(); remember(); render(); return; }
      const s=e.target.closest('[data-seg] .seg'); if(s){ S.values[s.parentNode.dataset.seg]=s.dataset.v; syncUI(); remember(); render(); }
    });
    $('fields').addEventListener('input',e=>{ const t=e.target; if(t.dataset.ownfor) S.values[t.dataset.ownfor].own=t.value; else if(t.dataset.text) S.values[t.dataset.text].text=t.value; remember(); render(); syncInspector(); });
    $('fields').addEventListener('change',e=>{ const t=e.target; if(t.dataset.on) S.values[t.dataset.on].on=t.checked; if(t.dataset.toggle) S.values[t.dataset.toggle]=t.checked; syncUI(); remember(); render(); });
  }
  function value(id){
    const v=S.values[id]; const f=fields.find(x=>x.id===id); if(!f) return '';
    if(f.type==='chips'){ if(v.pick==='__none') return ''; return String(v.pick==='__own'?v.own:v.pick).trim(); }
    if(f.type==='seg'||f.type==='toggle') return v;
    if(f.toggle&&!v.on) return ''; return String(v.text||'').trim();
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
    for(let i=0;i<S.count;i++){ const p=S.photos[i], real=p.img&&!p.sample;
      s+=`<label class="slot${real?' has':''}${i===S.active&&S.count>1?' active':''}" data-slot="${i}">${real?`<img alt="" src="${p.thumb}">`:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}<span>${real?'Change':(S.count>1?'Photo '+(i+1):'Add photo')}</span><input type="file" accept="image/*" data-file="${i}" aria-label="Photo ${i+1}"></label>`; }
    $('slots').innerHTML=s;
  }
  $('slots').addEventListener('change',e=>{const t=e.target; if(t.dataset.file!=null){ setPhoto(+t.dataset.file,t.files&&t.files[0]); t.value=''; }});
  $('slots').addEventListener('click',e=>{const l=e.target.closest('[data-slot]'); if(l){S.active=+l.dataset.slot; syncZoom();}});
  async function setPhoto(i,file){
    if(!file||!/^image\//.test(file.type)){ status('That is not a photo. Try a JPG or PNG.'); return; }
    try{
      const img=await loadFile(file);
      const tc=document.createElement('canvas'), tk=240/Math.max(img.width,img.height); tc.width=Math.round(img.width*tk); tc.height=Math.round(img.height*tk); tc.getContext('2d').drawImage(img,0,0,tc.width,tc.height);
      S.photos[i]={img,zoom:1,ox:0,oy:0,sample:false,thumb:tc.toDataURL('image/jpeg',.7)};
      S.active=i; $('result').hidden=true; status('');
      $('hint').textContent='Drag text or photos to move them. Tap text to edit it.';
      syncUI(); render();
    }catch(_){ status('That photo could not be opened. Try a JPG or PNG.'); }
  }
  function nextEmpty(){ for(let i=0;i<S.count;i++){ if(S.photos[i].sample||!S.photos[i].img) return i; } return S.active; }
  document.addEventListener('paste',e=>{ if(e.target&&e.target.tagName==='INPUT') return; const it=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/')); if(it) setPhoto(nextEmpty(),it.getAsFile());});
  let dd=0;
  document.addEventListener('dragenter',e=>{if([...(e.dataTransfer?.types||[])].includes('Files')){dd++;$('drop').hidden=false;}});
  document.addEventListener('dragleave',()=>{dd=Math.max(0,dd-1);if(!dd)$('drop').hidden=true;});
  document.addEventListener('dragover',e=>e.preventDefault());
  document.addEventListener('drop',e=>{e.preventDefault();dd=0;$('drop').hidden=true;const fs=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));const i0=nextEmpty();fs.forEach((f,k)=>setPhoto(Math.min(S.count-1,i0+k),f));});

  /* ---- syncing the controls with the state ---- */
  function syncUI(){
    document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===S.style)));
    document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.count===S.count)));
    fields.forEach(f=>{
      const v=S.values[f.id]; const fw=document.querySelector(`[data-fw="${f.id}"]`); if(fw) fw.hidden=!!(f.when&&f.when.count!==S.count);
      if(f.type==='chips'){
        document.querySelectorAll(`[data-f="${f.id}"] .chip`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.own?v.pick==='__own':b.dataset.none?v.pick==='__none':v.pick===b.dataset.v)));
        const inp=document.querySelector(`[data-ownfor="${f.id}"]`); inp.hidden=v.pick!=='__own'; if(inp.value!==v.own&&document.activeElement!==inp) inp.value=v.own;
      } else if(f.type==='seg') document.querySelectorAll(`[data-seg="${f.id}"] .seg`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
      else if(f.type==='toggle') document.querySelector(`[data-toggle="${f.id}"]`).checked=!!v;
      else { const t=document.querySelector(`[data-text="${f.id}"]`); if(t.value!==v.text&&document.activeElement!==t) t.value=v.text; if(f.toggle){const c=document.querySelector(`[data-on="${f.id}"]`);c.checked=v.on;t.disabled=!v.on;} }
    });
    slotsUI(); syncZoom();
  }
  function syncZoom(){ const p=S.photos[S.active], real=p&&p.img&&!p.sample; $('zoomRow').hidden=!real||cfg.noZoom; if(p) $('zoom').value=p.zoom; document.querySelectorAll('.slot').forEach(l=>l.classList.toggle('active',+l.dataset.slot===S.active&&S.count>1)); }
  const status=t=>{$('status').textContent=t;};

  /* ---- drawing ---- */
  let reg=[], raf=0;
  function drawExtras(h){
    S.extras.forEach(x=>{ h.text(x.id,'Your text',x.text,W/2,x.y,{font:x.font,weight:x.font==='display'?'':'800',size:x.size,color:x.color,shadow:x.shadow}); });
  }
  function draw(ctx,preview,scale){
    const r=[]; ctx.save(); if(scale) ctx.scale(scale,scale); ctx.clearRect(0,0,W,H);
    const h=makeHelpers(ctx,S,preview,r,scale||1);
    cfg.draw(h,{style:S.style,count:S.count,value,preview}); drawExtras(h);
    if(preview&&S.sel){ const b=r.find(x=>x.id===S.sel&&!x.hidden&&!x.empty); if(b){ ctx.save(); ctx.lineWidth=4; ctx.setLineDash([16,10]); ctx.strokeStyle='#3d6bff'; ctx.strokeRect(b.x-12,b.y-12,b.w+24,b.h+24); ctx.restore(); } }
    if(preview&&guide){ ctx.save(); ctx.strokeStyle='rgba(61,107,255,.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.restore(); }
    ctx.restore(); if(preview) reg=r;
  }
  function render(){ if(raf) return; raf=requestAnimationFrame(()=>{raf=0;draw(vctx,true);}); }

  /* ---- selecting and editing layers ---- */
  const extra=id=>S.extras.find(x=>x.id===id);
  function layerText(id){ const x=extra(id); if(x) return x.text; const f=fields.find(f=>f.id===id); return f?value(id):null; }
  function select(id){ S.sel=id; syncInspector(); render(); }
  function syncInspector(){
    const id=S.sel, b=reg.find(x=>x.id===id); if(!id){ $('insp').hidden=true; return; }
    const l=S.layers[id]||{k:1,color:null,hidden:false}; const t=layerText(id), x=extra(id);
    $('insp').hidden=false; $('inspName').textContent=x?'Your text':(b&&b.label)||'Layer';
    const ti=$('inspText'); ti.hidden=t===null; if(t!==null&&document.activeElement!==ti) ti.value=t;
    $('inspSize').value=x?x.size/60:l.k;
    $('inspHide').textContent=l.hidden?'Show':'Hide'; $('inspHide').hidden=!!x; $('inspDelete').hidden=!x;
    const C=B.colors, kind=b&&b.kind;
    const sw=kind==='logo'?[['dark','Dark',C.ink],['light','Light','#ffffff']]:[[null,'Auto',null],[C.paper,'White',C.paper],[C.ink,'Dark',C.ink],[C.accent,'Gold',C.accent]];
    const cur=x?x.color:l.color;
    $('inspColors').innerHTML='<span class="lbl">Colour</span>'+sw.map(([v,n,c])=>`<button type="button" class="sw-btn" data-color="${v??''}" aria-pressed="${String((cur??'')===(v??''))}" aria-label="${n}" title="${n}" style="${c?'background:'+c:''}">${c?'':'A'}</button>`).join('');
  }
  $('inspClose').addEventListener('click',()=>select(null));
  $('inspText').addEventListener('input',e=>{ const id=S.sel, x=extra(id); if(x) x.text=e.target.value; else setValue(id,e.target.value); render(); });
  $('inspSize').addEventListener('input',e=>{ const id=S.sel, x=extra(id); if(x) x.size=Math.round(+e.target.value*60); else { (S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1})).k=+e.target.value; } render(); });
  $('inspColors').addEventListener('click',e=>{ const b=e.target.closest('[data-color]'); if(!b) return; const v=b.dataset.color||null, id=S.sel, x=extra(id); if(x){ x.color=v||B.colors.paper; x.shadow=!(v&&!isLight(v)); } else (S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1})).color=v; syncInspector(); render(); });
  $('inspCenter').addEventListener('click',()=>{ const id=S.sel, b=reg.find(r=>r.id===id); if(!b||b.hidden) return; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1}); l.dx+=W/2-(b.x+b.w/2); render(); });
  $('inspReset').addEventListener('click',()=>{ const id=S.sel, x=extra(id); if(x){ x.size=60; } S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}; syncInspector(); render(); });
  $('inspHide').addEventListener('click',()=>{ const id=S.sel; const l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1}); l.hidden=!l.hidden; syncInspector(); render(); });
  $('inspDelete').addEventListener('click',()=>{ S.extras=S.extras.filter(x=>x.id!==S.sel); delete S.layers[S.sel]; select(null); });
  let extraN=0;
  $('addText').addEventListener('click',()=>{
    const id='extra'+(++extraN);
    // new text starts in the middle, light with a soft shadow so it reads on photos; change colour in the panel
    S.extras.push({id,text:B.phrases.write||'Text',font:'display',size:72,color:B.colors.paper,shadow:true,y:H/2-60+(S.extras.length%4)*90});
    select(id); setTimeout(()=>{ $('inspText').focus(); $('inspText').select(); },30);
  });
  $('resetLayout').addEventListener('click',()=>{ S.layers={}; S.photos.forEach(p=>{p.ox=0;p.oy=0;p.zoom=1;}); syncZoom(); syncInspector(); render(); });

  /* ---- pointer: drag layers or photos, pinch to resize/zoom, tap text to edit ---- */
  let guide=false; const pts=new Map(); let st=null, target=null, moved=false;
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
    if(target.photo!=null){ const p=S.photos[target.photo]; if(!p.img||p.sample){ S.active=target.photo; const inp=document.querySelector(`[data-file="${target.photo}"]`); if(inp) inp.click(); target=null; return; } S.active=target.photo; syncZoom(); if(S.sel) select(null); }
    view.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    snapshot(); view.classList.add('dragging');
  });
  function snapshot(){
    if(!target) return;
    if(target.layer){ const id=target.layer, x=extra(id), l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}); const b=reg.find(r=>r.id===id&&!r.hidden&&!r.empty); st={dx:l.dx,dy:l.dy,k:l.k,size:x?x.size:0,cx:b?b.x+b.w/2:null,pts:new Map(pts)}; }
    else { const p=S.photos[target.photo]; st={ox:p.ox,oy:p.oy,zoom:p.zoom,pts:new Map(pts)}; }
  }
  view.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId)||!st||!target) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const k=W/view.getBoundingClientRect().width;
    if(pts.size===1&&st.pts.size===1){
      const p0=[...st.pts.values()][0], ddx=(e.clientX-p0.x)*k, ddy=(e.clientY-p0.y)*k;
      if(Math.hypot(ddx,ddy)>8) moved=true; if(!moved) return;
      if(target.layer){ const l=S.layers[target.layer]; let nx=st.dx+ddx; l.dy=st.dy+ddy; guide=false;
        if(st.cx!=null){ const c=st.cx+(nx-st.dx); if(Math.abs(c-W/2)<18){ nx=st.dx+(W/2-st.cx); guide=true; } }
        l.dx=nx;
        if(!S.sel||S.sel!==target.layer) select(target.layer);
      } else if(target.mode==='cover'){ const p=S.photos[target.photo]; p.ox=st.ox+ddx; p.oy=st.oy+ddy; }
    } else if(pts.size>=2&&st.pts.size>=2){
      moved=true; const a=[...pts.values()], c=[...st.pts.values()]; const r=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/(Math.hypot(c[0].x-c[1].x,c[0].y-c[1].y)||1);
      if(target.layer){ const x=extra(target.layer); if(x) x.size=Math.max(20,Math.min(220,st.size*r)); else S.layers[target.layer].k=Math.max(.4,Math.min(2.5,st.k*r)); syncInspector(); }
      else if(target.mode==='cover'){ const p=S.photos[target.photo]; p.zoom=Math.max(1,Math.min(3,st.zoom*r)); $('zoom').value=p.zoom; }
    }
    render();
  });
  function endPtr(e){
    pts.delete(e.pointerId);
    if(!pts.size){
      view.classList.remove('dragging'); guide=false;
      if(target&&target.layer&&!moved){ const already=S.sel===target.layer; select(target.layer); const ti=$('inspText'); if(already&&!ti.hidden){ ti.focus(); } }
      target=null; st=null; render();
    } else snapshot();
  }
  view.addEventListener('pointerup',endPtr); view.addEventListener('pointercancel',endPtr);
  view.addEventListener('wheel',e=>{ const t=hit(toCanvas(e)); if(!t) return; e.preventDefault();
    if(t.layer){ const x=extra(t.layer); if(x) x.size=Math.max(20,Math.min(220,x.size*(1-e.deltaY*.0015))); else { const l=S.layers[t.layer]||(S.layers[t.layer]={dx:0,dy:0,k:1}); l.k=Math.max(.4,Math.min(2.5,l.k*(1-e.deltaY*.0015))); } if(S.sel!==t.layer) select(t.layer); else syncInspector(); }
    else if(t.mode==='cover'){ const p=S.photos[t.photo]; if(!p.img||p.sample) return; p.zoom=Math.max(1,Math.min(3,p.zoom-e.deltaY*.0015)); S.active=t.photo; syncZoom(); }
    render(); },{passive:false});
  view.addEventListener('keydown',e=>{ if(!S.sel) return; const l=S.layers[S.sel]||(S.layers[S.sel]={dx:0,dy:0,k:1}); const st=e.shiftKey?20:4; const m={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key]; if(m){ e.preventDefault(); l.dx+=m[0]; l.dy+=m[1]; render(); } else if(e.key==='Escape') select(null); });
  $('zoom').addEventListener('input',e=>{const p=S.photos[S.active]; if(p){p.zoom=+e.target.value;render();}});
  $('fitBtn').addEventListener('click',()=>{const p=S.photos[S.active]; if(p){p.zoom=1;p.ox=0;p.oy=0;$('zoom').value=1;render();}});
  $('form').addEventListener('submit',e=>e.preventDefault());

  /* ---- saving ---- */
  let downloads=null; const inClaude=!!(window.claude&&window.claude.use);
  if(inClaude) window.claude.use('downloads').then(d=>{downloads=d;}).catch(()=>{});
  function fname(ext,kind){ const d=new Date(), z=n=>String(n).padStart(2,'0'); return (B.id+'-'+(kind||cfg.fileName||'story')).replace(/[^a-z0-9-]+/gi,'-')+'-'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds())+'.'+ext; }
  async function save(withPhotos){
    const sel=S.sel; S.sel=null;
    status('Making a full-quality copy…'); await new Promise(r=>setTimeout(r,30));
    /* PNG = lossless: no JPEG blur or colour smudging on text, edges and photos. Same on iPhone and Android. */
    const type='image/png', ext='png';
    async function renderAt(K){
      const c=document.createElement('canvas'); c.width=Math.round(W*K); c.height=Math.round(H*K);
      const ctx=c.getContext('2d'); if(!ctx) return null;
      try{
        draw(ctx,false,K);
        if(withPhotos){ ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation='destination-over'; ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height); ctx.restore(); }
        const b=await new Promise(r=>c.toBlob(r,type));
        return b&&b.size>1000?b:null;               // a tiny/empty blob means the phone ran out of room
      }catch(_){ return null; }
      finally{ freeSharp(); c.width=c.height=0; }
    }
    /* Full size first. Only if a phone truly can't, step down a little (never straight to small), and say so. */
    let blob=null, used=0;
    for(const K of [EXPORT_SCALE,1.5,1]){ blob=await renderAt(K); if(blob){ used=K; break; } }
    S.sel=sel; render();
    if(!blob){ status('Your phone could not make the image. Close other apps or tabs and try again.'); return; }
    const name=fname(ext,withPhotos?null:'frame');
    status(used<EXPORT_SCALE?'Saved a slightly smaller copy ('+Math.round(W*used)+'×'+Math.round(H*used)+'): this phone was low on memory. Close other tabs for full size.':'');
    if(downloads){ try{ await downloads.save({filename:name,data:blob}); status('Saved.'); return; }catch(err){ if(err&&err.code==='declined'){ status('Not saved.'); return; } } }
    const file=new File([blob],name,{type}), touch=matchMedia('(pointer:coarse)').matches;
    if(!inClaude&&touch&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file]}); status('Done. Choose “Save Image” to put it in your photos.'); return; }
      catch(err){ if(err&&err.name==='AbortError') return; }
    }
    const url=URL.createObjectURL(blob);
    if(!inClaude){ const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),1500); status('Saved to your downloads.'); }
    $('resultImg').src=url; $('result').hidden=!(inClaude||touch); if(inClaude) status('Your image is ready below.');
  }
  $('save').addEventListener('click',()=>{
    const miss=[]; for(let i=0;i<S.count;i++){ if(!S.photos[i].img||S.photos[i].sample) miss.push(i+1); }
    if(miss.length){ status(S.count===1?'Add your photo first (step 1).':'Add photo '+miss.join(', ')+' first (step 1).'); return; }
    save(true);
  });
  if(cfg.frameOnly) $('saveFrame').addEventListener('click',()=>save(false));

  /* ---- start with the brand's example photos so the tool shows what it makes ---- */
  const names=(B.samples&&B.samples[cfg.id])||[];
  const imgs=await Promise.all(names.map(n=>load(B.base+'samples/'+n+'.jpg').catch(()=>null)));
  imgs.forEach((img,i)=>{ if(img&&S.photos[i]) S.photos[i]={img,zoom:1,ox:0,oy:0,sample:true}; });
  syncUI(); render();
}

/* home page: brand name and logo */
async function home(){
  const B=await useBrand();
  document.querySelectorAll('[data-thumb]').forEach(i=>{ i.src=ROOT+'assets/thumbs/'+B.id+'/'+i.dataset.thumb+'.jpg'; });
}

window.Studio={tool,home,registerBrand,useBrand,brandList:window.Studio&&window.Studio.brandList||[],W,H};
})();

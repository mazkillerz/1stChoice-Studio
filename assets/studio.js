/* 1st Choice Studio engine.
   A tool page calls Studio.tool({...}). The engine builds the steps (photos, style, words),
   the live preview, dragging/zooming photos, and saving. The tool only says how to draw. */
(function(){
const W=1080,H=1920;
const C={ink:'#161210',white:'#FFFFFF',black:'#000000',muted:'#5f5c57',mutedDark:'#cfcdc8',gold:'#D6B078',cream:'#F3EADC'};
const PIN=new Path2D("M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88Zm0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32Z");
const ROOT=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/studio\.js.*$/,''):'../';

/* Phrases from the owner's Omani phrasebook (approved lines only). */
const PHRASES={
  headlines:['يسرسح ثلج','جربته؟','ترا فنان','ما يتفوت','عالميييي','تعرف ويش؟','مشتهيه؟','صبر شوي...','اطلب الحين','وين تلقانا؟','رجع متوفر','وفرنا كمية جديدة','خذلك كولد برو','هذا ولا هذا؟','أنت أي واحد؟','اختيارك؟','منشن ربعك','صباح الخير','روّق','ياخذ وقته...','الجو حرّ اليوم؟','مليت؟','متأخر؟','مشغول؟'],
  small:['خذلك كولد برو','الرابط في البايو','شوف أقرب نقطة بيع لك','راسلنا خاص','كولد برو','كلاسيك / باشن فروت','يسرسح ثلج','ما مر','منعش','يصحصحك','الكمية محدودة','اختيارك الأول، دائماً'],
  pills:['الرابط في البايو','راسلنا خاص','اطلب الحين','شوف أقرب نقطة بيع لك']
};

function load(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
async function loadFile(file){
  try{ return await createImageBitmap(file,{imageOrientation:'from-image'}); }
  catch(_){ return await load(URL.createObjectURL(file)); }
}
function rr(ctx,x,y,w,h,r){r=typeof r==='number'?[r,r,r,r]:(r||[0,0,0,0]);const [a,b,c,d]=r;ctx.moveTo(x+a,y);ctx.lineTo(x+w-b,y);ctx.quadraticCurveTo(x+w,y,x+w,y+b);ctx.lineTo(x+w,y+h-c);ctx.quadraticCurveTo(x+w,y+h,x+w-c,y+h);ctx.lineTo(x+d,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-d);ctx.lineTo(x,y+a);ctx.quadraticCurveTo(x,y,x+a,y);ctx.closePath();}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

let LOGO=null, LOGO_W=null;
async function brandReady(){
  if(!LOGO){
    LOGO=await load(ROOT+'assets/logo.png');
    const c=document.createElement('canvas'); c.width=LOGO.width; c.height=LOGO.height; const x=c.getContext('2d');
    x.drawImage(LOGO,0,0); x.globalCompositeOperation='source-in'; x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); LOGO_W=c;
  }
  try{ await Promise.all([document.fonts.load('120px Lalezar','نقطة بيع'),document.fonts.load('800 40px Cairo','اسم المكان'),document.fonts.load('600 40px Cairo','كولد برو')]); }catch(_){}
}

/* ---------- drawing helpers handed to each tool ---------- */
function makeHelpers(ctx,S,preview,hits){
  const h={W,H,C,ctx,rr,
    roundRect(x,y,w,hh,r,fill){ctx.beginPath();rr(ctx,x,y,w,hh,r);ctx.fillStyle=fill;ctx.fill();},
    photoAspect(i){const p=S.photos[i];return p&&p.img?p.img.width/p.img.height:1.5;},
    hasPhoto(i){return !!(S.photos[i]&&S.photos[i].img);},
    /* draw photo slot i into rect; mode 'cover' (fills, can drag/zoom) or 'contain' (whole photo) */
    photo(i,x,y,w,hh,opt){
      opt=opt||{}; const p=S.photos[i];
      ctx.save(); ctx.beginPath(); rr(ctx,x,y,w,hh,opt.r||0); ctx.clip();
      if(p&&p.img){
        const im=p.img; const mode=opt.mode||'cover';
        const base=mode==='contain'?Math.min(w/im.width,hh/im.height):Math.max(w/im.width,hh/im.height);
        const sc=base*(mode==='contain'?1:p.zoom); const dw=im.width*sc, dh=im.height*sc;
        const mx=Math.max(0,(dw-w)/2), my=Math.max(0,(dh-hh)/2);
        p.ox=Math.max(-mx,Math.min(mx,p.ox)); p.oy=Math.max(-my,Math.min(my,p.oy));
        ctx.imageSmoothingQuality='high';
        ctx.drawImage(im,x+w/2+p.ox-dw/2,y+hh/2+p.oy-dh/2,dw,dh);
      } else if(preview){
        ctx.fillStyle='#d8d6d1'; ctx.fillRect(x,y,w,hh);
        ctx.fillStyle='#8b8882'; ctx.font='800 '+Math.max(28,Math.min(56,w/8))+'px Cairo'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.direction='rtl';
        ctx.fillText('+ صورة '+(i+1),x+w/2,y+hh/2);
      }
      ctx.restore();
      hits.push({i,x,y,w,h:hh,mode:opt.mode||'cover'});
    },
    logo(x,y,w,color){const im=color==='white'?LOGO_W:LOGO; const hh=w*im.height/im.width; ctx.drawImage(im,x,y,w,hh); return hh;},
    logoH(w){return w*LOGO.height/LOGO.width;},
    fit(text,size,weight,family,maxW){let s=size;for(;;){ctx.font=(weight?weight+' ':'')+s+'px '+family;if(ctx.measureText(text).width<=maxW||s<=28)return s;s-=2;}},
    /* text with top-left anchoring by its real letter box; returns height used */
    text(str,x,y,o){
      o=o||{}; const fam=o.family||'Cairo', wt=o.weight||'', size=h.fit(str,o.size||40,wt,fam,o.maxW||936);
      ctx.save(); ctx.direction='rtl'; ctx.textBaseline='alphabetic'; ctx.fillStyle=o.color||C.ink; ctx.textAlign=o.align||'center';
      const m=ctx.measureText(str), a=m.actualBoundingBoxAscent||size*.75, d=m.actualBoundingBoxDescent||size*.25;
      if(o.shadow){ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=24;ctx.shadowOffsetY=2;}
      ctx.fillText(str,x,y+a); ctx.restore(); return a+d;
    },
    measure(str,o){o=o||{};const size=h.fit(str,o.size||40,o.weight||'',o.family||'Cairo',o.maxW||936);const m=ctx.measureText(str);return {w:m.width,h:(m.actualBoundingBoxAscent||size*.75)+(m.actualBoundingBoxDescent||size*.25)};},
    pill(str,cx,y,o){
      o=o||{}; ctx.save(); ctx.font='800 '+(o.size||36)+'px Cairo'; ctx.direction='rtl';
      const m=ctx.measureText(str), ph=o.h||76, pw=m.width+(o.pad||88);
      ctx.fillStyle=o.bg||C.ink; ctx.beginPath(); rr(ctx,cx-pw/2,y,pw,ph,ph/2); ctx.fill();
      const a=m.actualBoundingBoxAscent||26, d=m.actualBoundingBoxDescent||8;
      ctx.fillStyle=o.fg||C.white; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillText(str,cx,y+ph/2+(a-d)/2); ctx.restore(); return ph;
    },
    /* place name with a map pin centred on the letters */
    pinLine(str,cx,y,o){
      o=o||{}; ctx.save(); ctx.direction='rtl'; ctx.textBaseline='alphabetic';
      const fs=h.fit(str,o.size||44,'800','Cairo',o.maxW||860); const m=ctx.measureText(str);
      const tA=m.actualBoundingBoxAscent||fs*.7, tD=m.actualBoundingBoxDescent||fs*.2;
      const pinH=Math.round(fs*.9), k=pinH/224, pinW=176*k, gap=14, tot=m.width+gap+pinW, left=cx-tot/2, base=y+tA;
      ctx.fillStyle=o.color||C.muted; ctx.textAlign='left'; ctx.fillText(str,left,base);
      const mid=base-(tA-tD)/2; ctx.translate(left+m.width+gap-40*k,mid-pinH/2-16*k); ctx.scale(k,k); ctx.fill(PIN);
      ctx.restore(); return tA+tD;
    },
    shade(y0,y1,a0,a1){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(0,0,0,'+a0+')');g.addColorStop(1,'rgba(0,0,0,'+a1+')');ctx.fillStyle=g;ctx.fillRect(0,Math.min(y0,y1),W,Math.abs(y1-y0));}
  };
  return h;
}

/* ---------- the tool page ---------- */
async function tool(cfg){
  const app=document.getElementById('app');
  const nPhotos=cfg.photos.max||cfg.photos.count||1, minPhotos=cfg.photos.min||cfg.photos.count||1;
  const S={style:cfg.styles?cfg.styles[0].id:null,count:cfg.photos.count||cfg.photos.min||1,active:0,photos:[],values:{},isSample:true};
  for(let i=0;i<nPhotos;i++) S.photos.push({img:null,zoom:1,ox:0,oy:0,sample:true});
  (cfg.fields||[]).forEach(f=>{ S.values[f.id]=f.type==='chips'?{pick:f.default??f.options[0],own:'',on:true}:f.type==='seg'?f.options[0].v:f.type==='toggle'?(f.default!==false):{text:f.default||'',on:f.on!==false}; });

  // remember text choices on this device
  const KEY='studio:'+cfg.id;
  try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d){ if(d.style&&cfg.styles&&cfg.styles.some(s=>s.id===d.style))S.style=d.style; if(d.count)S.count=Math.min(nPhotos,Math.max(minPhotos,d.count)); Object.keys(d.values||{}).forEach(k=>{ if(k in S.values) S.values[k]=d.values[k]; }); } }catch(_){}
  function remember(){ try{ localStorage.setItem(KEY,JSON.stringify({style:S.style,count:S.count,values:S.values})); }catch(_){} }

  /* UI */
  let html=`<h1>${esc(cfg.title)}</h1>
  <div class="stage"><div class="phone"><canvas class="view" id="view" width="${W}" height="${H}" aria-label="Story preview. Drag a photo to move it."></canvas><div class="drop" id="drop" hidden>Drop the photo here</div></div>
  <div class="tools" id="photoTools" hidden><button type="button" class="mini" id="fitBtn">Reset photo</button></div>
  <div class="hint" id="hint">${esc(cfg.sampleNote||'Example photos. Add yours in step 1.')}</div></div>
  <form class="panel" id="form" autocomplete="off">`;
  let step=1;
  html+=`<section class="step"><h2><span class="num">${step++}</span>${nPhotos>1?'Photos':'Photo'}</h2>`;
  if(cfg.photos.min&&cfg.photos.max&&cfg.photos.max>cfg.photos.min){
    html+=`<span class="lbl">How many photos</span><div class="row" role="group" aria-label="How many photos">`;
    for(let k=cfg.photos.min;k<=cfg.photos.max;k++) html+=`<button type="button" class="seg" data-count="${k}" aria-pressed="false">${k}</button>`;
    html+=`</div>`;
  }
  html+=`<div class="slots" id="slots"></div><div class="small">Tap a box to add a photo. You can also drop or paste a photo. Drag the photo in the preview to move it.</div>
  <div class="field" id="zoomRow" hidden><label class="lbl" for="zoom">Zoom in</label><input type="range" id="zoom" min="1" max="3" step="0.01" value="1"></div></section>`;
  if(cfg.styles){
    html+=`<section class="step"><h2><span class="num">${step++}</span>Style</h2><div class="row" role="group" aria-label="Style" id="styles"></div></section>`;
  }
  if(cfg.fields&&cfg.fields.length){
    html+=`<section class="step"><h2><span class="num">${step++}</span>Words</h2><div id="fields" class="field" style="gap:14px"></div></section>`;
  }
  html+=`<button type="button" class="btn" id="save">Save story</button><div class="status" id="status" role="status"></div>
  <div class="result" id="result" hidden><img id="resultImg" alt="Your finished story"><span class="small">Press and hold the image (or right-click) to save it.</span></div>
  ${cfg.frameOnly?'<button type="button" class="link" id="saveFrame">Save the frame only (see-through PNG)</button>':''}
  </form>`;
  app.innerHTML=html;
  const $=id=>document.getElementById(id);
  const view=$('view'), vctx=view.getContext('2d');

  // styles
  if(cfg.styles){
    $('styles').innerHTML=cfg.styles.map(s=>`<button type="button" class="seg" data-style="${s.id}" aria-pressed="false">${s.swatch||''}${esc(s.label)}</button>`).join('');
    $('styles').addEventListener('click',e=>{const b=e.target.closest('[data-style]');if(!b)return;S.style=b.dataset.style;S.photos.forEach(p=>{p.ox=0;p.oy=0;});syncUI();remember();render();});
  }
  // fields
  if(cfg.fields){
    $('fields').innerHTML=cfg.fields.map(f=>`<div data-fw="${f.id}" class="field">`+(()=>{
      if(f.type==='chips') return `<div class="field" data-f="${f.id}"><span class="lbl">${esc(f.label)}</span><div class="chips" role="group" aria-label="${esc(f.label)}">${f.options.map(o=>`<button type="button" class="chip" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}<button type="button" class="chip en" data-own="1" aria-pressed="false">My own</button>${f.none?'<button type="button" class="chip en" data-none="1" aria-pressed="false">None</button>':''}</div><input type="text" dir="rtl" data-ownfor="${f.id}" placeholder="${esc(f.placeholder||'اكتب هنا')}" aria-label="Your own ${esc(f.label)}" hidden></div>`;
      if(f.type==='seg') return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="row" role="group" aria-label="${esc(f.label)}" data-seg="${f.id}">${f.options.map(o=>`<button type="button" class="seg" data-v="${o.v}" aria-pressed="false">${esc(o.l)}</button>`).join('')}</div></div>`;
      if(f.type==='toggle') return `<label class="check"><input type="checkbox" data-toggle="${f.id}"> ${esc(f.label)}</label>`;
      return `<div class="field">${f.toggle?`<label class="check"><input type="checkbox" data-on="${f.id}"> ${esc(f.label)}</label>`:`<label class="lbl" for="t_${f.id}">${esc(f.label)}</label>`}<input type="text" dir="rtl" id="t_${f.id}" data-text="${f.id}" placeholder="${esc(f.placeholder||'')}" ${f.toggle?`aria-label="${esc(f.label)}"`:''}></div>`;
    })()+`</div>`).join('');
    $('fields').addEventListener('click',e=>{
      const b=e.target.closest('.chip'); if(b){ const id=b.closest('[data-f]').dataset.f, v=S.values[id];
        if(b.dataset.own){v.pick='__own'; syncUI(); const inp=document.querySelector(`[data-ownfor="${id}"]`); inp.focus();}
        else if(b.dataset.none){v.pick='__none';} else v.pick=b.dataset.v;
        syncUI();remember();render();return; }
      const s=e.target.closest('[data-seg] .seg'); if(s){ S.values[s.parentNode.dataset.seg]=s.dataset.v; syncUI();remember();render(); }
    });
    $('fields').addEventListener('input',e=>{
      const t=e.target;
      if(t.dataset.ownfor){S.values[t.dataset.ownfor].own=t.value;}
      else if(t.dataset.text){S.values[t.dataset.text].text=t.value;}
      remember();render();
    });
    $('fields').addEventListener('change',e=>{
      const t=e.target;
      if(t.dataset.on){S.values[t.dataset.on].on=t.checked;}
      if(t.dataset.toggle){S.values[t.dataset.toggle]=t.checked;}
      syncUI();remember();render();
    });
  }
  // photo count
  document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>{S.count=+b.dataset.count;S.active=Math.min(S.active,S.count-1);syncUI();remember();render();}));

  function value(id){ // what the tool reads
    const v=S.values[id]; const f=cfg.fields.find(x=>x.id===id);
    if(f.type==='chips'){ if(v.pick==='__none')return ''; return (v.pick==='__own'?v.own:v.pick).trim(); }
    if(f.type==='seg'||f.type==='toggle') return v;
    if(f.toggle&&!v.on) return ''; return (v.text||'').trim();
  }

  function slotsUI(){
    let s='';
    for(let i=0;i<S.count;i++){ const p=S.photos[i]; const real=p.img&&!p.sample;
      s+=`<label class="slot${real?' has':''}${i===S.active&&S.count>1?' active':''}" data-slot="${i}">${real?`<img alt="" src="${p.thumb}">`:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}<span>${real?'Change':(S.count>1?'Photo '+(i+1):'Add photo')}</span><input type="file" accept="image/*" data-file="${i}" aria-label="Photo ${i+1}"></label>`; }
    $('slots').innerHTML=s;
  }
  $('slots').addEventListener('change',e=>{const t=e.target; if(t.dataset.file!=null){ setPhoto(+t.dataset.file,t.files&&t.files[0]); t.value=''; }});
  $('slots').addEventListener('click',e=>{const l=e.target.closest('[data-slot]'); if(l){S.active=+l.dataset.slot; syncZoom();}});

  function syncUI(){
    document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===S.style)));
    document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.count===S.count)));
    (cfg.fields||[]).forEach(f=>{
      const v=S.values[f.id];
      const fw=document.querySelector(`[data-fw="${f.id}"]`); if(fw) fw.hidden=!!(f.when&&f.when.count!==S.count);
      if(f.type==='chips'){
        document.querySelectorAll(`[data-f="${f.id}"] .chip`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.own?v.pick==='__own':b.dataset.none?v.pick==='__none':v.pick===b.dataset.v)));
        const inp=document.querySelector(`[data-ownfor="${f.id}"]`); inp.hidden=v.pick!=='__own'; if(inp.value!==v.own) inp.value=v.own;
      } else if(f.type==='seg'){ document.querySelectorAll(`[data-seg="${f.id}"] .seg`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v))); }
      else if(f.type==='toggle'){ document.querySelector(`[data-toggle="${f.id}"]`).checked=!!v; }
      else { const t=document.querySelector(`[data-text="${f.id}"]`); if(t.value!==v.text)t.value=v.text; if(f.toggle){const c=document.querySelector(`[data-on="${f.id}"]`);c.checked=v.on;t.disabled=!v.on;} }
    });
    slotsUI(); syncZoom();
  }
  function syncZoom(){ const p=S.photos[S.active]; const real=p&&p.img&&!p.sample; $('zoomRow').hidden=!real||cfg.noZoom; $('photoTools').hidden=!real; if(p) $('zoom').value=p.zoom; document.querySelectorAll('.slot').forEach(l=>l.classList.toggle('active',+l.dataset.slot===S.active&&S.count>1)); }

  async function setPhoto(i,file){
    if(!file||!/^image\//.test(file.type)){ $('status').textContent='That is not a photo. Try a JPG or PNG.'; return; }
    try{
      const img=await loadFile(file);
      const tc=document.createElement('canvas'); const tk=240/Math.max(img.width,img.height); tc.width=Math.round(img.width*tk); tc.height=Math.round(img.height*tk); tc.getContext('2d').drawImage(img,0,0,tc.width,tc.height);
      S.photos[i]={img,zoom:1,ox:0,oy:0,sample:false,thumb:tc.toDataURL('image/jpeg',.7)};
      S.active=i; $('result').hidden=true; $('status').textContent='';
      $('hint').textContent=cfg.photos.count===1||S.count===1?'Drag the photo to move it.':'Drag a photo to move it. Tap a box to choose which photo the zoom changes.';
      syncUI(); render();
    }catch(_){ $('status').textContent='That photo could not be opened. Try a JPG or PNG.'; }
  }
  function nextEmpty(){ for(let i=0;i<S.count;i++){ if(S.photos[i].sample||!S.photos[i].img) return i; } return S.active; }

  // paste / drop
  document.addEventListener('paste',e=>{const it=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/')); if(it) setPhoto(nextEmpty(),it.getAsFile());});
  let dd=0;
  document.addEventListener('dragenter',e=>{if([...(e.dataTransfer?.types||[])].includes('Files')){dd++;$('drop').hidden=false;}});
  document.addEventListener('dragleave',()=>{dd=Math.max(0,dd-1);if(!dd)$('drop').hidden=true;});
  document.addEventListener('dragover',e=>e.preventDefault());
  document.addEventListener('drop',e=>{e.preventDefault();dd=0;$('drop').hidden=true;const fs=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));const i0=nextEmpty();fs.forEach((f,k)=>setPhoto(Math.min(S.count-1,i0+k),f));});

  // render
  let hits=[]; let raf=0;
  function draw(ctx,preview){ const hs=[]; ctx.save(); ctx.clearRect(0,0,W,H); cfg.draw(makeHelpers(ctx,S,preview,hs),{style:S.style,count:S.count,value,preview}); ctx.restore(); if(preview) hits=hs; }
  function render(){ if(raf)return; raf=requestAnimationFrame(()=>{raf=0;draw(vctx,true);}); }

  // drag / pinch / wheel on the preview
  const pts=new Map(); let st=null, dragSlot=-1;
  function slotAt(e){ const r=view.getBoundingClientRect(), k=W/r.width, x=(e.clientX-r.left)*k, y=(e.clientY-r.top)*k; for(let j=hits.length-1;j>=0;j--){const h=hits[j]; if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h) return h;} return null; }
  view.addEventListener('pointerdown',e=>{
    const h=slotAt(e); if(!h) return;
    const p=S.photos[h.i];
    if(!p.img||p.sample){ S.active=h.i; const inp=document.querySelector(`[data-file="${h.i}"]`); if(inp) inp.click(); return; }
    S.active=h.i; syncZoom(); dragSlot=h.mode==='cover'?h.i:-1;
    view.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); st={ox:p.ox,oy:p.oy,zoom:p.zoom,pts:new Map(pts)}; view.classList.add('dragging');
  });
  view.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId)||!st||dragSlot<0) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const p=S.photos[dragSlot], k=W/view.getBoundingClientRect().width;
    if(pts.size===1&&st.pts.size===1){const p0=[...st.pts.values()][0]; p.ox=st.ox+(e.clientX-p0.x)*k; p.oy=st.oy+(e.clientY-p0.y)*k;}
    else if(pts.size>=2&&st.pts.size>=2){const a=[...pts.values()],b=[...st.pts.values()];const d1=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),d0=Math.hypot(b[0].x-b[1].x,b[0].y-b[1].y)||1;p.zoom=Math.max(1,Math.min(3,st.zoom*d1/d0));$('zoom').value=p.zoom;}
    render();
  });
  function endPtr(e){ pts.delete(e.pointerId); const p=S.photos[dragSlot]; st=pts.size&&p?{ox:p.ox,oy:p.oy,zoom:p.zoom,pts:new Map(pts)}:null; if(!pts.size){view.classList.remove('dragging');dragSlot=-1;} }
  view.addEventListener('pointerup',endPtr); view.addEventListener('pointercancel',endPtr);
  view.addEventListener('wheel',e=>{const h=slotAt(e); if(!h||h.mode!=='cover')return; const p=S.photos[h.i]; if(!p.img||p.sample)return; e.preventDefault(); S.active=h.i; p.zoom=Math.max(1,Math.min(3,p.zoom-e.deltaY*.0015)); syncZoom(); render();},{passive:false});
  $('zoom').addEventListener('input',e=>{const p=S.photos[S.active]; if(p){p.zoom=+e.target.value;render();}});
  $('fitBtn').addEventListener('click',()=>{const p=S.photos[S.active]; if(p){p.zoom=1;p.ox=0;p.oy=0;$('zoom').value=1;render();}});
  $('form').addEventListener('submit',e=>e.preventDefault());

  // saving
  let downloads=null; const inClaude=!!(window.claude&&window.claude.use);
  if(inClaude){ window.claude.use('downloads').then(d=>{downloads=d;}).catch(()=>{}); }
  function fname(ext,kind){ const d=new Date(), z=n=>String(n).padStart(2,'0'); return '1st-Choice-'+String(kind||cfg.fileName||'story').replace(/\s+/g,'-')+'-'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds())+'.'+ext; }
  async function save(withPhotos){
    const c=document.createElement('canvas'); c.width=W; c.height=H; const ctx=c.getContext('2d');
    if(withPhotos){ ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); }
    draw(ctx,false);
    const type=withPhotos?'image/jpeg':'image/png', ext=withPhotos?'jpg':'png';
    const blob=await new Promise(r=>c.toBlob(r,type,.95)); const name=fname(ext,withPhotos?null:'frame');
    $('status').textContent='';
    if(downloads){ try{ await downloads.save({filename:name,data:blob}); $('status').textContent='Saved.'; return; }catch(err){ if(err&&err.code==='declined'){ $('status').textContent='Not saved.'; return; } } }
    const file=new File([blob],name,{type});
    const touch=matchMedia('(pointer:coarse)').matches;
    if(!inClaude&&touch&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file]}); $('status').textContent='Done. Pick “Save Image” to put it in your photos.'; return; }
      catch(err){ if(err&&err.name==='AbortError'){ $('status').textContent=''; return; } }
    }
    const url=URL.createObjectURL(blob);
    if(!inClaude){ const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),1500); $('status').textContent='Saved to your downloads.'; }
    $('resultImg').src=url; $('result').hidden=!(inClaude||touch);
    if(inClaude) $('status').textContent='Your image is ready below.';
  }
  $('save').addEventListener('click',()=>{
    const missing=[]; for(let i=0;i<S.count;i++){ if(!S.photos[i].img||S.photos[i].sample) missing.push(i+1); }
    if(missing.length){ $('status').textContent=S.count===1?'Add your photo first (step 1).':'Add photo '+missing.join(', ')+' first (step 1).'; return; }
    save(true);
  });
  if(cfg.frameOnly) $('saveFrame').addEventListener('click',()=>save(false));

  // start: example photos so the tool shows what it makes
  await brandReady();
  const samples=await Promise.all((cfg.samples||[]).map(n=>load(ROOT+'assets/samples/'+n+'.jpg').catch(()=>null)));
  samples.forEach((img,i)=>{ if(img&&S.photos[i]) S.photos[i]={img,zoom:1,ox:0,oy:0,sample:true}; });
  syncUI(); render();
}

window.Studio={tool,PHRASES,C,W,H};
})();

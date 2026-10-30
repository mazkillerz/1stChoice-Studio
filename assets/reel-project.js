/* Video projects (brand-agnostic): your own clips, photos, text and sound plus coded reels, as one video. See docs/reels.md.
     StudioMedia   files that stay on this device (IndexedDB 'studio:vmedia:<id>'): put, get, thumbs, wave, decoded, remove
     StudioProject fromRecipe(recipe) -> v2 recipe;  create(recipe,{brandBase,onProgress}) -> project
   A project draws any frame from the time t (draw), seeks its video clips for export (prepare), keeps them in step for
   the preview (syncPreview) and mixes the whole sound (audio, play). Every text animation is a pure function of t. */
(function(){
'use strict';
const SR=48000, KEY='studio:vmedia:', ANIM=0.35, TYPE=0.6, PREF={ok:1};
const idb=()=>Studio.lab.idb, db=g=>Math.pow(10,g/20), dbOf=x=>20*Math.log10(x);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;
const clone=o=>JSON.parse(JSON.stringify(o));
const withTimeout=(p,ms,v)=>Promise.race([p,new Promise(r=>setTimeout(()=>r(v),ms))]);
const once=(el,ev,ms)=>new Promise(res=>{ let to; const f=()=>{ clearTimeout(to); el.removeEventListener(ev,f); res(true); }; el.addEventListener(ev,f); to=setTimeout(()=>{ el.removeEventListener(ev,f); res(false); },ms); });

/* ======================= StudioMedia ======================= */
const cache=new Map(), thumbCache=new Map(), waveCache=new Map(), decCache=new Map();
const typeOf=f=>{ const t=(f.type||'').split('/')[0]; if(t==='video'||t==='image'||t==='audio') return t;
  const e=(f.name||'').toLowerCase().split('.').pop(); return /^(mp4|mov|m4v|webm|3gp)$/.test(e)?'video':/^(jpe?g|png|webp|gif|heic|heif|avif)$/.test(e)?'image':/^(mp3|m4a|aac|wav|ogg|opus|flac|caf)$/.test(e)?'audio':'video'; };
function videoEl(url){ const v=document.createElement('video'); v.muted=true; v.playsInline=true; v.preload='auto'; v.setAttribute('playsinline',''); v.src=url; return v; }
async function readMeta(blob,type,id){
  const url=URL.createObjectURL(blob); let el=null, meta={id,name:blob.name||id,type,dur:0,w:0,h:0};
  if(type==='image'){ el=new Image(); el.src=url; try{ await el.decode(); }catch(e){ URL.revokeObjectURL(url); throw new Error('This photo cannot be opened here.'); } meta.w=el.naturalWidth; meta.h=el.naturalHeight; }
  else if(type==='video'){ el=videoEl(url); const ok=await Promise.race([once(el,'loadeddata',8000),once(el,'error',8000).then(()=>false)]);
    if(!ok&&!el.videoWidth){ URL.revokeObjectURL(url); throw new Error('This video cannot be opened here.'); }
    meta.dur=el.duration||0; meta.w=el.videoWidth; meta.h=el.videoHeight; }
  else { const a=new Audio(); a.preload='metadata'; a.src=url; await Promise.race([once(a,'loadedmetadata',8000),once(a,'error',8000)]); meta.dur=a.duration;
    if(!isFinite(meta.dur)){ const d=await decodeBlob(blob); meta.dur=d?d.L.length/SR:0; } }
  return {url,el,meta};
}
async function decodeBlob(blob){
  try{ const ab=await blob.arrayBuffer(), d=await new OfflineAudioContext(2,1,SR).decodeAudioData(ab);
    const L=new Float32Array(d.getChannelData(0)); return {L,R:d.numberOfChannels>1?new Float32Array(d.getChannelData(1)):L.slice()}; }catch(e){ return null; }
}
const Media={
  async put(file){
    const type=typeOf(file), id='m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), r=await readMeta(file,type,id);
    const ok=await idb().put(KEY+id,file); if(ok==null){ URL.revokeObjectURL(r.url); throw new Error('This device has no room to keep the file.'); }
    cache.set(id,Promise.resolve({id,blob:file,url:r.url,el:r.el,meta:r.meta})); return r.meta;
  },
  get(id){
    if(!cache.has(id)) cache.set(id,(async()=>{
      const blob=await idb().get(KEY+id); if(!blob) { cache.delete(id); return null; }
      try{ const r=await readMeta(blob,typeOf(blob),id); return {id,blob,url:r.url,el:r.el,meta:r.meta}; }catch(e){ cache.delete(id); return null; }
    })());
    return cache.get(id);
  },
  async thumbs(id,n,h){
    const key=[id,n,h].join('|'); if(thumbCache.has(key)) return thumbCache.get(key);
    const p=(async()=>{
      const m=await Media.get(id); if(!m||m.meta.type==='audio') return [];
      const aspect=(m.meta.w||9)/(m.meta.h||16), w=Math.max(1,Math.round(h*aspect)), mk=()=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
      if(m.meta.type==='image'){ const c=mk(); c.getContext('2d').drawImage(m.el,0,0,w,h); return Array.from({length:n},()=>c); }
      const v=videoEl(m.url), out=[]; await once(v,'loadeddata',8000); const D=m.meta.dur||v.duration||1;
      for(let i=0;i<n;i++){ v.currentTime=Math.min(D-0.05,(i+0.5)/n*D); await once(v,'seeked',2000); const c=mk(); try{ c.getContext('2d').drawImage(v,0,0,w,h); }catch(e){} out.push(c); }
      v.removeAttribute('src'); v.load(); return out;
    })();
    thumbCache.set(key,p); return p;
  },
  decoded(id){   // the whole sound of a file at 48 kHz: {L,R} or null (no sound / cannot decode)
    if(!decCache.has(id)) decCache.set(id,(async()=>{ const m=await Media.get(id); return m&&m.meta.type!=='image'?decodeBlob(m.blob):null; })());
    return decCache.get(id);
  },
  async wave(id,n){
    const key=id+'|'+n; if(waveCache.has(key)) return waveCache.get(key);
    const p=(async()=>{ const d=await Media.decoded(id), out=new Float32Array(n); if(!d) return out; const len=d.L.length;
      for(let i=0;i<n;i++){ const a=Math.floor(i*len/n), b=Math.max(a+1,Math.floor((i+1)*len/n)); let m=0; for(let k=a;k<b;k++){ const v=Math.max(Math.abs(d.L[k]),Math.abs(d.R[k])); if(v>m) m=v; } out[i]=Math.min(1,m); }
      return out; })();
    waveCache.set(key,p); return p;
  },
  async remove(id){
    const m=cache.get(id)&&await cache.get(id).catch(()=>null); if(m&&m.url) URL.revokeObjectURL(m.url);
    cache.delete(id); decCache.delete(id); for(const c of [thumbCache,waveCache]) for(const k of [...c.keys()]) if(k.startsWith(id+'|')) c.delete(k);
    await idb().del(KEY+id);
  }
};

/* ======================= recipe ======================= */
let uid=0; const newId=p=>p+Date.now().toString(36)+(uid++).toString(36);
function fromRecipe(r){
  r=clone(r||{});
  if(r.v!==2){   // a phase-1 reel recipe becomes one reel clip that plays to the end
    const o={v:2,kind:'video',brand:r.brand,size:[1080,1920],fps:30,clips:[],texts:[],audio:[],media:{}};
    if(r.reel) o.clips.push({id:'c1',kind:'reel',reel:r.reel,in:0,out:null,texts:r.texts||{},mix:r.mix||{},duck:r.duck!==false});
    return o;
  }
  r.kind='video'; r.size=Array.isArray(r.size)?r.size:[1080,1920]; r.fps=r.fps||30;
  for(const k of ['clips','texts','audio']) if(!Array.isArray(r[k])) r[k]=[];
  if(!r.media||typeof r.media!=='object') r.media={};
  for(const c of r.clips){ if(!c.id) c.id=newId('c'); if(c.kind==='reel'){ c.texts=c.texts||{}; c.mix=c.mix||{}; if(c.duck==null) c.duck=true; if(c.in==null) c.in=0; if(c.out===undefined) c.out=null; } }
  for(const t of r.texts) if(!t.id) t.id=newId('t');
  for(const a of r.audio) if(!a.id) a.id=newId('a');
  return r;
}

/* ======================= text ======================= */
const RTL=/[֐-ࣿיִ-﷿ﹰ-﻿]/, LTR=/\p{L}/u;
const dirOf=s=>{ for(const ch of String(s)){ if(RTL.test(ch)) return 'rtl'; if(LTR.test(ch)) return 'ltr'; } return 'ltr'; };
const seg=window.Intl&&Intl.Segmenter?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
const graphemes=s=>seg?Array.from(seg.segment(s),x=>x.segment):Array.from(s);
const meas=document.createElement('canvas').getContext('2d');
function fontOf(tx){
  let fam='sans-serif', wt='';
  try{ const B=Studio.lab.brand(), F=B.fonts, f=tx.font==='body'?F.body:tx.font==='display'||!tx.font?F.display:tx.font; fam='"'+f+'",sans-serif';
    if(tx.font==='body') wt=/800/.test(F.google||'')?'800 ':'700 '; }catch(e){}
  return wt+Math.round(tx.size||96)+'px '+fam;
}
const backOut=p=>{ const c1=1.2, c3=c1+1, x=p-1; return 1+c3*x*x*x+c1*x*x; };
function anim(tx,t){   // opacity, scale, y offset and how many letters at time t
  let a=1, s=1, dy=0, frac=1; const ti=tx.in||'none', to=tx.out||'none';
  const pi=clamp((t-tx.start)/ANIM,0,1), po=clamp((tx.end-t)/ANIM,0,1);
  if(ti==='fade') a*=pi; else if(ti==='pop'){ a*=Math.min(1,pi*1.5); s*=0.6+0.4*backOut(pi); } else if(ti==='slide'){ a*=pi; dy+=60*(1-pi); }
  else if(ti==='type') frac=clamp((t-tx.start)/TYPE,0,1);
  if(to==='fade') a*=po; else if(to==='pop'){ a*=po; s*=0.6+0.4*po; } else if(to==='slide'){ a*=po; dy+=60*(1-po); }
  return {a,s,dy,frac};
}
function layoutText(tx,c){   // lines, widths and the box (relative to the centre) of a text layer
  const size=tx.size||96, lines=String(tx.value==null?'':tx.value).split('\n'), lh=size*1.15;
  c.save(); c.font=fontOf(tx); c.direction=dirOf(tx.value); const ws=lines.map(l=>c.measureText(l).width); c.restore();
  const w=Math.max(0,...ws), h=lines.length*lh, pad=tx.box?0.3*size:0;
  return {lines,ws,w,h,lh,size,pad,bw:w+2*pad,bh:h+2*pad};
}
function drawText(ctx,tx,t){
  if(t<tx.start||t>=tx.end) return; const A=anim(tx,t); if(A.a<=0.003||A.s<=0) return;
  const L=layoutText(tx,ctx), dir=dirOf(tx.value); let left=null;
  if(tx.in==='type'&&A.frac<1){   // letters appear one by one: count graphemes over all lines
    const all=L.lines.map(graphemes), total=all.reduce((n,g)=>n+g.length,0); let k=Math.ceil(total*A.frac-1e-9); if(k<=0) return;
    left=all.map(g=>{ const n=Math.min(g.length,Math.max(0,k)); k-=g.length; return g.slice(0,n).join(''); });
  }
  ctx.save(); ctx.globalAlpha*=A.a; ctx.translate(tx.x,tx.y+A.dy); ctx.scale(A.s,A.s);
  if(tx.box){ ctx.fillStyle=tx.box; ctx.beginPath(); const x=-L.bw/2, y=-L.bh/2, r=Math.min(L.pad,L.bh/2);
    if(ctx.roundRect) ctx.roundRect(x,y,L.bw,L.bh,r); else ctx.rect(x,y,L.bw,L.bh); ctx.fill(); }
  ctx.font=fontOf(tx); ctx.direction=dir; ctx.textBaseline='middle'; ctx.fillStyle=tx.color||'#111';
  L.lines.forEach((ln,i)=>{ const y=-L.h/2+L.lh*(i+0.5);
    if(left){ ctx.textAlign=dir==='rtl'?'right':'left'; ctx.fillText(left[i],dir==='rtl'?L.ws[i]/2:-L.ws[i]/2,y); }
    else { ctx.textAlign='center'; ctx.fillText(ln,0,y); } });
  ctx.restore();
}

/* ======================= project ======================= */
let actx=null; const live=new Set();
const audioCtx=()=>{ if(!actx){ const C=window.AudioContext||window.webkitAudioContext; actx=new C(); } if(actx.state==='suspended') actx.resume(); return actx; };

async function create(recipe0,opt){
  opt=opt||{}; const recipe=fromRecipe(recipe0), brandBase=opt.brandBase||'../brands/'+(recipe.brand||'')+'/';
  const reels=new Map(), mixes=new Map(), media=new Map(), pend=new Set();   // id -> reel / mix promise / entry|null
  let done=0, total=0; const report=()=>{ if(opt.onProgress) opt.onProgress(total?done/total:1); };
  const job=p=>{ total++; return p.then(v=>{ done++; report(); return v; },e=>{ done++; report(); throw e; }); };
  const P={recipe,W:1080,H:1920,fps:30,duration:0,cuts:[]}; let starts=[], lens=[], ver=0;

  const mediaMeta=id=>{ const m=media.get(id); return (m&&m.meta)||recipe.media[id]||null; };
  function clipLen(c){
    if(c.kind==='reel'){ const r=reels.get(c.reel); const end=c.out!=null?c.out:(r?r.duration:0); return Math.max(0,end-(c.in||0)); }
    if(c.kind==='photo') return Math.max(0,num(c.dur,3));
    const m=mediaMeta(c.media), end=c.out!=null?c.out:(m?m.dur:0); return Math.max(0,end-(c.in||0));
  }
  function layout(){
    P.W=recipe.size[0]||1080; P.H=recipe.size[1]||1920; P.fps=recipe.fps||30; starts=[]; lens=[]; let t=0;
    for(const c of recipe.clips){ starts.push(t); const l=clipLen(c); lens.push(l); t+=l; }
    P.duration=t; const cuts=new Set();
    recipe.clips.forEach((c,i)=>{ if(i>0&&lens[i-1]>0) cuts.add(+starts[i].toFixed(4));
      if(c.kind==='reel'){ const r=reels.get(c.reel); for(const k of (r&&r.cuts)||[]) if(k>(c.in||0)&&k<(c.in||0)+lens[i]) cuts.add(+(starts[i]+k-(c.in||0)).toFixed(4)); } });
    P.cuts=[...cuts].sort((a,b)=>a-b);
  }
  const wanted=()=>{ const r=new Set(), m=new Set();
    for(const c of recipe.clips){ if(c.kind==='reel') r.add(c.reel); else if(c.media) m.add(c.media); }
    for(const a of recipe.audio) if(a.media) m.add(a.media); return {r,m}; };
  function ensure(){   // start loading what is new; a Promise when something must load
    const w=wanted(), jobs=[];
    for(const id of w.r) if(!reels.has(id)){
      const base=brandBase+'reels/'+id+'/'; reels.set(id,null);
      jobs.push(job(StudioReel.load(base).then(async rl=>{ reels.set(id,rl);
        mixes.set(id,StudioReelAudio.load(rl.M,base).catch(()=>null)); await mixes.get(id); },()=>{ reels.delete(id); })));
    }
    for(const id of w.m) if(!media.has(id)){ media.set(id,null); jobs.push(job(Media.get(id).then(e=>{ media.set(id,e||false); },()=>{ media.set(id,false); }))); }
    if(!jobs.length) return;
    return Promise.all(jobs).then(()=>{ layout(); });
  }
  P.update=()=>{ ver++; layout(); return ensure(); };
  await ensure(); layout();

  const entry=id=>media.get(id)||null;
  P.starts=()=>starts.slice();
  P.missing=()=>{ const w=wanted(), out=[]; for(const id of w.m) if(media.get(id)===false) out.push(id); return out; };
  P.clipAt=t=>{ const n=recipe.clips.length; if(!n||t<0||t>P.duration+1e-6) return null;
    let i=n-1; for(let k=0;k<n;k++) if(t<starts[k]+lens[k]-1e-9&&lens[k]>0){ i=k; break; }
    if(lens[i]<=0) return null; const c=recipe.clips[i]; return {clip:c,index:i,start:starts[i],local:(c.in||0)+Math.min(lens[i],t-starts[i])}; };

  function cover(ctx,src,sw,sh,zoom){ const s=Math.max(P.W/sw,P.H/sh)*(zoom||1), w=sw*s, h=sh*s; ctx.drawImage(src,(P.W-w)/2,(P.H-h)/2,w,h); }
  function dark(ctx,msg){ ctx.fillStyle='#14110f'; ctx.fillRect(0,0,P.W,P.H);
    if(msg){ ctx.fillStyle='#bdb6ad'; ctx.font='600 56px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.direction='ltr'; ctx.fillText(msg,P.W/2,P.H/2); } }
  P.draw=(ctx,t,o)=>{
    o=o||{}; const k=ctx.canvas.width/P.W, a=P.clipAt(t);
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.fillStyle='#000'; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    try{
      if(a){ const c=a.clip;
        if(c.kind==='reel'){ const r=reels.get(c.reel); if(r) r.draw(ctx,a.local,{texts:c.texts}); }
        else { ctx.setTransform(k,0,0,k,0,0); const e=entry(c.media);
          if(!e) dark(ctx,'Missing on this device');
          else if(c.kind==='photo'){ const l=lens[a.index]; cover(ctx,e.el,e.meta.w,e.meta.h,c.motion==='zoom'?1+0.08*clamp((t-a.start)/(l||1),0,1):1); }
          else if(e.el.readyState>=2&&e.el.videoWidth) cover(ctx,e.el,e.el.videoWidth,e.el.videoHeight,1);
          else dark(ctx); }
      }
      ctx.setTransform(k,0,0,k,0,0);
      for(const tx of recipe.texts) if(tx.id!==o.hideText) drawText(ctx,tx,t);
    } finally{ ctx.restore(); }
  };

  // export: put the video clip at t on the exact frame before drawing
  async function seekTo(el,target){
    target=clamp(target,0,Math.max(0,(el.duration||target)-0.001));
    if(!el.paused) el.pause();
    if(Math.abs(el.currentTime-target)<0.0004&&!el.seeking&&el.readyState>=2) return;
    const seeked=once(el,'seeked',1500); el.currentTime=target; await seeked;
    if(el.requestVideoFrameCallback&&PREF.ok){   // wait until the new frame is ready; if the browser never answers, stop waiting for good
      const got=await new Promise(res=>{ const to=setTimeout(()=>res(false),1500); el.requestVideoFrameCallback(()=>{ clearTimeout(to); res(true); }); });
      if(!got) PREF.ok=0; }
  }
  P.prepare=async t=>{ const a=P.clipAt(t); if(!a||a.clip.kind!=='video') return; const e=entry(a.clip.media); if(e&&e.el) await seekTo(e.el,a.local+0.001); };

  // preview: keep the playing clip's picture in step with the clock
  P.syncPreview=(t,playing)=>{
    const a=P.clipAt(t), cur=a&&a.clip.kind==='video'?entry(a.clip.media):null;
    for(const e of media.values()) if(e&&e.el&&e.meta.type==='video'&&e!==cur&&!e.el.paused) e.el.pause();
    if(!cur) return; const el=cur.el, want=a.local; el.muted=true;
    const drift=Math.abs(el.currentTime-want);
    if(playing){ if(el.paused||drift>0.12){ try{ el.currentTime=want; }catch(e){} } if(el.paused) el.play().catch(()=>{}); }
    else { if(!el.paused) el.pause(); if(drift>0.03&&!el.seeking) try{ el.currentTime=want; }catch(e){} }
  };

  P.textInfo=id=>{ const tx=recipe.texts.find(x=>x.id===id); return tx?{dir:dirOf(tx.value),lines:String(tx.value).split('\n').length}:null; };
  P.textBox=(id,ctx)=>{ const tx=recipe.texts.find(x=>x.id===id); if(!tx) return null; const L=layoutText(tx,ctx||meas);
    const w=tx.box?L.bw:L.w, h=tx.box?L.bh:L.h; return {x:tx.x-w/2,y:tx.y-h/2,w,h}; };
  P.textAt=(x,y,t)=>{ for(let i=recipe.texts.length-1;i>=0;i--){ const tx=recipe.texts[i]; if(t<tx.start||t>=tx.end) continue;
    const b=P.textBox(tx.id); if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h) return tx.id; } return null; };

  /* ---- sound ---- */
  const audioCache=new Map();
  function audioKey(){ return JSON.stringify([P.duration,starts,lens,recipe.clips.map(c=>({k:c.kind,r:c.reel,m:c.media,i:c.in,o:c.out,db:c.db,mu:c.mute,mx:c.mix,d:c.duck})),recipe.audio,
    [...wanted().m].map(id=>[id,!!media.get(id)])]); }
  const add=(dst,src,at,gain,from,to,fade)=>{   // sum src[from..to] into dst at sample 'at' with a gain and optional linear fades (seconds)
    const n=Math.min(to-from,dst[0].length-at); if(n<=0) return; const fi=Math.round((fade&&fade.in||0)*SR), fo=Math.round((fade&&fade.out||0)*SR), tot=to-from;
    for(let i=0;i<n;i++){ let g=gain; if(fi&&i<fi) g*=i/fi; if(fo&&tot-i<fo) g*=Math.max(0,(tot-i)/fo); dst[0][at+i]+=src.L[from+i]*g; dst[1][at+i]+=src.R[from+i]*g; } };
  async function mix(){
    const N=Math.round(P.duration*SR), sum=[new Float64Array(N),new Float64Array(N)]; let lufsT=-14, ceil=-1.5, hasReel=false;
    for(let i=0;i<recipe.clips.length;i++){ const c=recipe.clips[i], at=Math.round(starts[i]*SR), len=Math.round(lens[i]*SR); if(len<=0) continue;
      if(c.kind==='reel'){ const m=await mixes.get(c.reel); if(!m||!m.renderRaw) continue; const raw=m.renderRaw({mix:c.mix||{},duck:c.duck!==false}), from=Math.round((c.in||0)*SR);
        add(sum,raw,at,1,from,Math.min(raw.L.length,from+len)); const M=reels.get(c.reel).M.master; if(M&&!hasReel){ lufsT=M.lufs; ceil=M.ceiling==null?-1.5:M.ceiling; hasReel=true; } }
      else if(c.kind==='video'&&!c.mute){ const d=await Media.decoded(c.media); if(!d) continue; const from=Math.round((c.in||0)*SR); add(sum,d,at,db(c.db||0),from,Math.min(d.L.length,from+len)); } }
    for(const a of recipe.audio){ if(a.mute) continue; const d=await Media.decoded(a.media); if(!d) continue;
      const from=Math.round((a.in||0)*SR), to=Math.min(d.L.length,a.out!=null?Math.round(a.out*SR):d.L.length); if(to<=from) continue;
      add(sum,d,Math.round((a.start||0)*SR),db(a.db||0),from,to,{in:a.fadeIn,out:a.fadeOut}); }
    // master like reel-audio: integrated loudness, then the soft-knee ceiling
    const cur=StudioReelAudio.lufs(sum[0],sum[1],SR), g=isFinite(cur)?db(lufsT-cur):1, c=db(ceil), kn=0.8*c, w=0.2*c, L=new Float32Array(N), R=new Float32Array(N); let pk=0;
    const lim=x=>{ x*=g; const a=Math.abs(x); return a>kn?Math.sign(x)*(kn+w*Math.tanh((a-kn)/w)):x; };
    for(let i=0;i<N;i++){ const l=lim(sum[0][i]), r=lim(sum[1][i]); L[i]=l; R[i]=r; pk=Math.max(pk,Math.abs(l),Math.abs(r)); }
    return {L,R,sampleRate:SR,lufs:StudioReelAudio.lufs(L,R,SR),peakDb:pk>0?dbOf(pk):-Infinity};
  }
  P.audio=async settings=>{
    const key=audioKey()+(settings?JSON.stringify(settings):''); if(!audioCache.has(key)){ if(audioCache.size>2) audioCache.delete(audioCache.keys().next().value); audioCache.set(key,mix()); }
    return audioCache.get(key);
  };

  P.play=from=>{
    from=Math.max(0,from||0); if(from>=P.duration) from=0; const ctx=audioCtx(), t0=ctx.currentTime; let src=null, ended=false;
    const h={playing:true,_end:null,
      stop(){ if(ended) return; ended=true; h.playing=false; live.delete(h); try{ src&&src.stop(); }catch(e){} },
      position(){ return h.playing?Math.min(P.duration,from+ctx.currentTime-t0):(h._end!=null?h._end:from); }};
    P.audio().then(b=>{ if(ended||!b.L.length) { if(!ended&&!b.L.length){ ended=true; h.playing=false; live.delete(h); h._end=P.duration; } return; }
      const buf=ctx.createBuffer(2,b.L.length,SR); buf.copyToChannel(b.L,0); buf.copyToChannel(b.R,1);
      src=ctx.createBufferSource(); src.buffer=buf; src.connect(ctx.destination);
      src.onended=()=>{ if(!ended){ ended=true; h._end=P.duration; h.playing=false; live.delete(h); } };
      src.start(0,Math.min(from+(ctx.currentTime-t0),b.L.length/SR-0.01)); });
    live.add(h); return h;
  };
  P.stopAll=()=>{ for(const h of [...live]) h.stop(); for(const e of media.values()) if(e&&e.el&&e.meta.type==='video') e.el.pause(); };
  return P;
}

window.StudioMedia=Media;
window.StudioProject={fromRecipe,create};
})();

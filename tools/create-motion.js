/* Create: moving stories (w3-mp4, plan 3.4), behind the `motion` preview flag. Loaded by Create only when the flag is on and the
   person opens "Moving story…". Each layer of a page can have an entrance: layer attr enter:{type,delay,dur,dir}
     pop | slide (dir up|down|left|right|start|end; start = the left edge, the right edge for Arabic) | fade | wipe (crayon wipe: a reveal
     mask that follows the reading direction) | peek (a picture rising from the page edge it touches) | none
   The page keeps motion:{len,sound} (length 5–8 s, a sound id from the brand kit's motion.sounds). Both are plain attrs, so they are saved
   with the design like everything else. Export = Create's own renderer at 1080×1920, one picture per frame, H.264 through the same
   encoder and muxer as the Video editor (assets/reel-export.js, WebCodecs + mp4-muxer); the last frame is the still design.
   Brand-agnostic: sounds come from brand.motion.sounds (files of the brand's reels); nothing here names a brand.
   CRMotion.open(host) with host = {openSheet,closeSheet,toast,esc,I,fname,savePicture}. */
(function(){
const BD=window.BD, U=BD.util, {kind,frames,items,fsize,prect}=U;
const FPS=30, W0=1080, H0=1920, MEAN_DB=-28, PEAK_DB=-9;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ROOT=new URL('../',document.currentScript?document.currentScript.src:location.href).href;
const TYPES=[['none','None'],['pop','Pop'],['slide','Slide'],['fade','Fade'],['wipe','Crayon wipe'],['peek','Peek in']];
const DIRS=[['up','Up'],['down','Down'],['left','Left'],['right','Right']];
const DEF={pop:.5,slide:.6,fade:.6,wipe:.8,peek:.7};
const easeOut=p=>1-Math.pow(1-p,3), easeInOut=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const easeBack=p=>{ const c1=1.70158, c3=c1+1, q=p-1; return 1+c3*q*q*q+c1*q*q; };
const isRtl=n=>{ const ts=kind(n)==='text'?[n]:(n.find?n.find('Text'):[]); return ts.some(t=>t.direction&&t.direction()==='rtl'); };
const layers=f=>items(f).filter(n=>!n.hasName('frame-bg'));
const getMotion=f=>Object.assign({len:6,sound:''},f&&f.getAttr('motion')||{});
const getEnter=n=>{ const e=n.getAttr('enter'); return e&&e.type&&e.type!=='none'?{type:e.type,delay:+e.delay||0,dur:+e.dur||DEF[e.type]||.6,dir:e.dir||'up'}:null; };
const endOf=n=>{ const e=getEnter(n); return e?e.delay+e.dur:0; };

/* ---------- the rig: sets every animated layer to how it looks at time t, and puts it all back ---------- */
function makeRig(f){
  const s=fsize(f), list=[];
  layers(f).forEach(n=>{ const en=getEnter(n); if(!en) return;
    const r=prect(n,f), box=n.getClientRect({skipTransform:true,skipShadow:true});
    list.push({n,en,r,box,orig:{x:n.x(),y:n.y(),sx:n.scaleX(),sy:n.scaleY(),op:n.opacity(),sf:n.attrs.sceneFunc,cf:n.attrs.clipFunc,hadSf:'sceneFunc' in n.attrs,hadCf:'clipFunc' in n.attrs},rtl:isRtl(n)}); });
  const setWipe=(it,p)=>{ const n=it.n, b=it.box, pad=60, w=(b.width+2*pad)*p, rtl=it.rtl, x0=rtl?b.x+b.width+pad-w:b.x-pad;
    const clip=ctx=>{ ctx.beginPath(); ctx.rect(x0,b.y-pad,w,b.height+2*pad); };
    if(n.getClassName()==='Group'){ n.attrs.clipFunc=function(ctx){ clip(ctx); }; return; }
    const base=it.orig.hadSf?it.orig.sf:n._sceneFunc||n.sceneFunc();
    n.attrs.sceneFunc=function(ctx,shape){ ctx.save(); clip(ctx); ctx.clip(); try{ base.call(shape,ctx,shape); } finally{ ctx.restore(); } }; };
  const place=(it,dx,dy,k,op)=>{ const n=it.n, o=it.orig, cx=it.r.x+it.r.width/2, cy=it.r.y+it.r.height/2;   // scale k about the layer's centre, then move
    n.scale({x:o.sx*k,y:o.sy*k}); n.position({x:cx+k*(o.x-cx)+dx,y:cy+k*(o.y-cy)+dy}); n.opacity(o.op*op); };
  function reset(it){ const n=it.n, o=it.orig; n.scale({x:o.sx,y:o.sy}); n.position({x:o.x,y:o.y}); n.opacity(o.op);
    if(o.hadSf) n.attrs.sceneFunc=o.sf; else delete n.attrs.sceneFunc; if(o.hadCf) n.attrs.clipFunc=o.cf; else delete n.attrs.clipFunc; }
  function at(t){ list.forEach(it=>{ reset(it); const e=it.en, p=clamp((t-e.delay)/e.dur,0,1); if(p>=1) return;
    if(e.type==='pop'){ const q=easeBack(p); place(it,0,0,.55+.45*q,clamp(p*3,0,1)); }
    else if(e.type==='fade'){ place(it,0,0,1,easeInOut(p)); }
    else if(e.type==='slide'){ let d=e.dir; if(d==='start') d=it.rtl?'right':'left'; if(d==='end') d=it.rtl?'left':'right';
      const k=1-easeOut(p), D=240, v={up:[0,D],down:[0,-D],left:[-D,0],right:[D,0]}[d]||[0,D]; place(it,v[0]*k,v[1]*k,1,clamp(p*2.5,0,1)); }
    else if(e.type==='wipe'){ place(it,0,0,1,1); setWipe(it,easeInOut(p)); }
    else if(e.type==='peek'){ const r=it.r, g={l:r.x,r:s.w-(r.x+r.width),t:r.y,b:s.h-(r.y+r.height)}, side=Object.keys(g).sort((a,b)=>g[a]-g[b])[0];
      const dist={b:s.h-r.y,t:r.y+r.height,l:r.x+r.width,r:s.w-r.x}[side], k=1-easeBack(p), v={b:[0,1],t:[0,-1],l:[-1,0],r:[1,0]}[side]; place(it,v[0]*dist*k,v[1]*dist*k,1,1); } }); }
  const restore=()=>list.forEach(reset);
  return {at,restore,count:list.length};
}

/* ---------- Auto: sensible staggered entrances by role (background first, headline, product, button, logo last) ---------- */
const ORDER={bg:0,photo:0,bleed:1,headline:2,product:3,sub:4,button:5,handle:6,logo:7};
async function autoPlan(f,len){
  if(!(BD.resize&&BD.resize.roles)) await Studio.loadScript(new URL('create-resize.js',document.currentScript?document.currentScript.src:location.href).href);
  const roles=BD.resize.roles(f), s=fsize(f), list=layers(f);
  const touchesEdge=n=>{ const r=prect(n,f), m=Math.max(6,s.w*.012); return r.x<=m||r.y<=m||r.x+r.width>=s.w-m||r.y+r.height>=s.h-m; };
  const crayon=n=>kind(n)==='text'?!!n.getAttr('fillTex'):kind(n)==='asset'&&/crayon/i.test(String(n.getAttr('imgId')||''));
  const seq=list.map((n,i)=>({n,i,role:roles.get(n)||'product'})).sort((a,b)=>(ORDER[a.role]??3)-(ORDER[b.role]??3)||a.i-b.i);
  const back=seq.filter(x=>ORDER[x.role]===0), rest=seq.filter(x=>ORDER[x.role]!==0);
  const avail=Math.max(.6,len-1.6-.6), step=clamp(avail/Math.max(1,rest.length-1),.18,.55), out=new Map();
  back.forEach(x=>out.set(x.n,{type:'fade',delay:0,dur:.5,dir:'up'}));
  rest.forEach((x,k)=>{ const n=x.n, rtl=isRtl(n), delay=+(.45+k*step).toFixed(2); let e;
    if(crayon(n)) e={type:'wipe',dur:.8}; else if(x.role==='headline') e={type:'slide',dur:.6,dir:rtl?'right':'up'};
    else if(kind(n)==='asset'&&x.role!=='logo'&&touchesEdge(n)) e={type:'peek',dur:.7};
    else if(x.role==='product'||x.role==='button') e={type:'pop',dur:.5};
    else if(x.role==='bleed') e={type:'slide',dur:.7,dir:'up'};
    else e={type:'fade',dur:.6};
    out.set(n,Object.assign({delay,dir:'up'},e)); });
  return out;
}

/* ---------- sound: hits on every entrance, mixed by the reel audio engine, then levelled (mean ≈ -28 dB, peaks <= -9 dB) ---------- */
const brandSounds=()=>((BD.B&&BD.B.motion&&BD.B.motion.sounds)||[]).filter(x=>x&&x.id&&x.reel&&x.file);
function levelTo(A){   // gain to mean -28 dB; a soft ceiling keeps peaks <= -9 dB (sparse hits need a little limiting to reach the mean)
  const n=A.L.length, c=Math.pow(10,PEAK_DB/20), k=.8*c, w=.2*c; let pk=0; for(let i=0;i<n;i++) pk=Math.max(pk,Math.abs(A.L[i]),Math.abs(A.R[i]));
  if(!(pk>0)) return {meanDb:-120,peakDb:-120};
  const lim=x=>{ const a=Math.abs(x); return a>k?Math.sign(x)*(k+w*Math.tanh((a-k)/w)):x; };
  const meanAt=g=>{ let sum=0; for(let i=0;i<n;i++){ const l=lim(A.L[i]*g), r=lim(A.R[i]*g); sum+=l*l+r*r; } return 10*Math.log10(sum/(2*n)+1e-14); };
  let lo=c/pk*.5, hi=lo*Math.pow(10,16/20);   // the gain that just fits the peak, up to +8 dB more, searched for the mean
  for(let i=0;i<14;i++){ const mid=Math.sqrt(lo*hi); if(meanAt(mid)<MEAN_DB) lo=mid; else hi=mid; }
  const g=lo; let sum=0,p2=0; for(let i=0;i<n;i++){ const l=lim(A.L[i]*g), r=lim(A.R[i]*g); A.L[i]=l; A.R[i]=r; sum+=l*l+r*r; p2=Math.max(p2,Math.abs(l),Math.abs(r)); }
  return {meanDb:10*Math.log10(sum/(2*n)+1e-14),peakDb:20*Math.log10(p2)}; }
async function buildAudio(f,id,len){
  const so=brandSounds().find(x=>x.id===id); if(!so) return null;
  await Studio.lazy('reel-audio');
  const hits=layers(f).map(n=>({n,e:getEnter(n)})).filter(x=>x.e&&x.e.delay>=0.05).map(x=>x.e.delay+(x.e.type==='fade'?.0:.03)).sort((a,b)=>a-b)
    .filter((t,i,a)=>i===0||t-a[i-1]>=.12).filter(t=>t<len-.4);
  if(!hits.length) return null;
  const M={duration:len,music:null,sounds:[{id:'hit',label:'Hit',file:so.file,level:so.level==null?-24:so.level,hits:hits.map(at=>({at}))}],master:{lufs:-26,lufsNoMusic:-27,ceiling:-9.5}};
  const mix=await StudioReelAudio.load(M,((BD.B.base||'')+'reels/'+so.reel+'/')), r=await mix.render(mix.defaults());
  const A={L:r.L,R:r.R,sampleRate:r.sampleRate}; A.level=levelTo(A); return A;
}

/* ---------- the sheet ---------- */
function open(host){
  const {esc,toast}=host; let cur=null, prev=null, busy=false, body=null, ctl=null, last=null;
  const page=()=>BD.activeFrame();
  const fmt=n=>{ const e=getEnter(n); if(!e) return 'No motion'; const t=(TYPES.find(x=>x[0]===e.type)||[])[1]||e.type; return t+(e.type==='slide'?' '+(DIRS.find(x=>x[0]===e.dir)||[0,e.dir])[1].toLowerCase():'')+' · '+e.delay.toFixed(1)+' s'; };
  const touch=()=>{ BD.changed(); };
  const setMotion=patch=>{ const f=page(); f.setAttr('motion',Object.assign(getMotion(f),patch)); touch(); };
  function setEnter(n,patch){ const old=getEnter(n)||{type:'none',delay:.3,dur:.6,dir:'up'}, e=Object.assign({},old,patch);
    if(patch.type&&!patch.dur) e.dur=DEF[patch.type]||e.dur; if(patch.type==='slide'&&!patch.dir) e.dir=isRtl(n)?'right':'up';
    if(e.type==='none') n.setAttr('enter',null); else n.setAttr('enter',{type:e.type,delay:+(+e.delay).toFixed(2),dur:+(+e.dur).toFixed(2),dir:e.dir}); touch(); }
  function fit(f,len){ layers(f).forEach(n=>{ const e=getEnter(n); if(e&&e.delay+e.dur>len-1){ n.setAttr('enter',Object.assign({},n.getAttr('enter'),{delay:+Math.max(0,len-1-e.dur).toFixed(2)})); } }); }
  function paint(){ const f=page(); if(!f||!body) return; const m=getMotion(f), ls=layers(f), sounds=brandSounds();
    if(!cur||!ls.some(n=>n.id()===cur)) cur=(BD.S.sel[0]&&ls.includes(BD.S.sel[0])?BD.S.sel[0]:ls[1]||ls[0]||{id:()=>null}).id();
    const n=ls.find(x=>x.id()===cur), en=n&&getEnter(n), type=en?en.type:'none', text=n&&kind(n)==='text';
    body.innerHTML=`<div class="cm">
      <p class="small cm-how">${ls.some(x=>getEnter(x))?'Your story already moves. <b>Play preview</b> to watch it, then <b>Save video</b>. Want it different? Tap a thing below and pick how it arrives.':'Tap <b>Auto</b> and your story moves by itself, then <b>Save video</b>.'} The video ends on your design as it is.</p>
      <div class="cm-act"><button type="button" class="btn ghost" data-a="auto">Auto</button><button type="button" class="btn ghost" data-a="play">${prev?'Stop':'Play preview'}</button><button type="button" class="btn" data-a="save"${busy?' disabled':''}>Save video</button></div>
      <div class="cr-status" id="cmSt" role="status" aria-live="polite"></div><div class="cr-result cm-res" id="cmRes" hidden></div>
      <span class="lbl">Length</span><div class="cr-seg" data-g="len">${[5,6,7,8].map(v=>`<button type="button" data-len="${v}" aria-pressed="${v===m.len}">${v} s</button>`).join('')}</div>
      ${sounds.length?`<span class="lbl">Sound (optional)</span><div class="cr-seg" data-g="snd"><button type="button" data-snd="" aria-pressed="${!m.sound}">No sound</button>${sounds.map(x=>`<button type="button" data-snd="${esc(x.id)}" aria-pressed="${x.id===m.sound}" dir="auto">${esc(x.label||x.id)}</button>`).join('')}</div>`:''}
      <span class="lbl">Things on this page</span><div class="cm-list">${ls.map(x=>`<button type="button" class="cm-row" data-l="${esc(x.id())}" aria-pressed="${x.id()===cur}"><b dir="auto">${esc(U.nameOf(x))}</b><small>${esc(fmt(x))}</small></button>`).join('')||'<p class="small">Nothing on this page yet.</p>'}</div>
      ${n?`<span class="lbl">How “${esc(U.nameOf(n)).slice(0,24)}” arrives</span>
      <div class="cr-seg" data-g="type">${TYPES.filter(x=>!(x[0]==='peek'&&text)).map(x=>`<button type="button" data-t="${x[0]}" aria-pressed="${x[0]===type}">${x[1]}</button>`).join('')}</div>
      ${type==='slide'?`<div class="cr-seg" data-g="dir">${DIRS.map(x=>`<button type="button" data-d="${x[0]}" aria-pressed="${x[0]===en.dir}">${x[1]}</button>`).join('')}</div>`:''}
      ${en?`<div class="cr-row"><label class="lbl" for="cmDelay">Starts at</label><input type="range" id="cmDelay" min="0" max="${m.len-1}" step=".05" value="${Math.min(en.delay,m.len-1)}"><output id="cmDelayO">${en.delay.toFixed(2)} s</output></div>
      <div class="cr-row"><label class="lbl" for="cmDur">Takes</label><input type="range" id="cmDur" min=".2" max="1.5" step=".05" value="${en.dur}"><output id="cmDurO">${en.dur.toFixed(2)} s</output></div>`:''}`:''}</div>`;
    const st=body.querySelector('#cmSt'); if(ctl&&ctl.msg) st.innerHTML=ctl.msg; if(last) showResult(); }
  const status=(t,ok,spin)=>{ ctl=ctl||{}; ctl.msg=t?(spin?'<span class="spin" aria-hidden="true"></span>':'')+'<span>'+esc(t)+'</span>':''; const el=body&&body.querySelector('#cmSt'); if(el){ el.classList.toggle('ok',!!ok); el.innerHTML=ctl.msg; } };

  /* preview on the canvas */
  function stopPreview(){ if(!prev) return; cancelAnimationFrame(prev.raf); prev.rig.restore(); prev.f.getLayer().batchDraw(); prev=null; BD.select(prev0.sel.filter(n=>n.getStage()),{quiet:true}); const b=body&&body.querySelector('[data-a="play"]'); if(b) b.textContent='Play preview'; }
  let prev0={sel:[]};
  function play(){ if(prev){ stopPreview(); return; } const f=page(), m=getMotion(f), rig=makeRig(f); if(!rig.count){ toast('Give something a motion first, or tap Auto.'); return; }
    prev0={sel:BD.S.sel.slice()}; BD.select([],{quiet:true}); const t0=performance.now(); prev={f,rig,raf:0};
    const step=()=>{ if(!prev) return; const t=(performance.now()-t0)/1000; rig.at(Math.min(t,m.len)); f.getLayer().batchDraw(); if(t>=m.len){ stopPreview(); return; } prev.raf=requestAnimationFrame(step); };
    const b=body.querySelector('[data-a="play"]'); if(b) b.textContent='Stop'; step(); }

  /* the export */
  async function save(){
    if(busy) return; stopPreview(); const f=page(), m=getMotion(f);
    let sup=null; try{ await Studio.lazy('reel-export'); sup=await StudioReelExport.support(); }catch(_){ sup=null; }
    if(!sup||sup.mode!=='webcodecs'||!sup.video||!window.VideoEncoder) return fallback();
    const rig=makeRig(f); if(!rig.count){ toast('Give something a motion first, or tap Auto.'); return; }
    busy=true; last=null; paint(); const t0=performance.now(); const sig=(ctl=ctl||{}).ac=new AbortController();
    const keep=BD.S.sel.slice(), stage=BD.stage, old={x:stage.x(),y:stage.y(),k:stage.scaleX()}, vis=f.visible(); let undoSharp=null, lock=null;
    const s=fsize(f), W=s.w, H=s.h;
    try{
      try{ if(navigator.wakeLock) lock=await navigator.wakeLock.request('screen'); }catch(_){}
      status('Getting the pictures and fonts ready…',false,true); BD.select([],{quiet:true});
      try{ await BD.fontsInDoc(); }catch(_){} try{ await document.fonts.ready; }catch(_){} await BD.hdReady();
      let A=null, note='';
      if(m.sound){ status('Getting the sound ready…',false,true);
        try{ A=await buildAudio(f,m.sound,m.len); }catch(err){ console.warn(err); note=' The sound could not be loaded, so this video has no sound.'; }
        if(A&&!sup.audio){ A=null; note=' This browser cannot add sound to a video, so this one has no sound.'; } }
      f.visible(true); stage.scale({x:1,y:1}); stage.position({x:0,y:0}); undoSharp=BD.sharpen?BD.sharpen(f,1):null;
      const reel={W,H,fps:FPS,duration:m.len,cuts:[],draw(cx,t){ rig.at(t); const c=f.toCanvas({x:f.x(),y:f.y(),width:W,height:H,pixelRatio:1}); cx.drawImage(c,0,0,W,H); c.width=c.height=0; }};
      const r=await StudioReelExport.run({reel,texts:{},audio:A,signal:sig.signal,sub:1,onProgress:(p,i,n)=>{
        const pc=Math.round(clamp(p,0,1)*100), el=(performance.now()-t0)/1000, left=p>.04&&el>2?Math.ceil(el*(1-p)/p):0;
        status('Making your video: '+pc+'%'+(left?' · about '+left+' s left':''),false,true); const bar=document.getElementById('cmBar'); if(bar) bar.style.width=pc+'%'; }});
      last={blob:r.blob,name:host.fname(1,1,new Date()).replace(/\.png$/,'.mp4'),url:URL.createObjectURL(r.blob),note,ms:Math.round(performance.now()-t0)};
      window.CRMotion.last={size:r.blob.size,type:r.blob.type,codec:r.codec,frames:r.frames,ms:last.ms,audio:!!A,level:A&&A.level||null,len:m.len,url:last.url};
      status('Your video is ready.'+note,true);
    }catch(err){ if(sig.signal.aborted||(err&&err.name==='AbortError')) status('Stopped. Nothing was saved.'); else { console.warn(err); status('The video did not finish. Your design is untouched. Close other tabs or apps and try again, or save the picture.'); } }
    finally{ rig.restore(); if(undoSharp) try{ undoSharp(); }catch(_){} stage.scale({x:old.k,y:old.k}); stage.position({x:old.x,y:old.y}); f.visible(vis); BD.select(keep.filter(n=>n.getStage()),{quiet:true}); BD.main.batchDraw();
      if(lock){ try{ lock.release(); }catch(_){} } busy=false; if(body){ paint(); } }
  }
  function showResult(){ const el=body.querySelector('#cmRes'); if(!el||!last) return; el.hidden=false;
    el.innerHTML=`<video id="cmVid" src="${last.url}" playsinline muted controls preload="metadata" aria-label="Your moving story"></video><button type="button" class="btn" data-a="out">${matchMedia('(pointer:coarse)').matches?'Share or save':'Download'}</button>`; }
  function fallback(){ const f=page(); busy=false; ctl=ctl||{};
    ctl.msg=`<span>This browser cannot make video files (it needs H.264 video). Your still picture saves as usual.</span>`; const st=body&&body.querySelector('#cmSt'); if(st) st.innerHTML=ctl.msg;
    const res=body&&body.querySelector('#cmRes'); if(res){ res.hidden=false; res.innerHTML='<button type="button" class="btn" data-a="still">Save the picture instead</button>'; } }
  async function out(){ if(!last) return; const file=new File([last.blob],last.name,{type:'video/mp4'});
    if(matchMedia('(pointer:coarse)').matches){ const r=await Studio.lab.shareFiles([file]); if(r) return; }
    const a=document.createElement('a'); a.href=last.url; a.download=last.name; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),1000); }

  body=host.openSheet('motion','Moving story',`<div></div>`,{tool:true,onClose:()=>{ stopPreview(); if(ctl&&ctl.ac&&busy) ctl.ac.abort(); body=null; }});
  body.addEventListener('click',async e=>{ const b=e.target.closest('button'); if(!b) return; const f=page(), d=b.dataset;
    if(d.a==='auto'){ const len=getMotion(f).len; status('',false); try{ const plan=await autoPlan(f,len); layers(f).forEach(n=>{ const p=plan.get(n); n.setAttr('enter',p||null); }); touch(); paint(); toast('Auto set the order. Tap Play preview to watch it.'); }catch(err){ console.warn(err); toast('Could not set Auto. Try again.'); } return; }
    if(d.a==='play'){ play(); return; } if(d.a==='save'){ save(); return; } if(d.a==='out'){ out(); return; }
    if(d.a==='still'){ try{ await host.savePicture(f); }catch(err){ console.warn(err); toast('Could not save the picture.'); } return; }
    if(d.len){ const len=+d.len; setMotion({len}); fit(f,len); touch(); paint(); return; }
    if(d.snd!==undefined){ setMotion({sound:d.snd}); paint(); return; }
    if(d.l){ cur=d.l; const n=f.findOne('#'+d.l); if(n) BD.select([n]); paint(); return; }
    const n=cur&&f.findOne('#'+cur); if(!n) return;
    if(d.t){ setEnter(n,d.t==='none'?{type:'none'}:{type:d.t,delay:(getEnter(n)||{}).delay!=null?getEnter(n).delay:.3}); paint(); return; }
    if(d.d){ setEnter(n,{dir:d.d}); paint(); } });
  body.addEventListener('input',e=>{ const f=page(), n=cur&&f.findOne('#'+cur); if(!n) return; if(e.target.id==='cmDelay'){ setEnter(n,{delay:+e.target.value}); body.querySelector('#cmDelayO').textContent=(+e.target.value).toFixed(2)+' s'; }
    if(e.target.id==='cmDur'){ setEnter(n,{dur:+e.target.value}); body.querySelector('#cmDurO').textContent=(+e.target.value).toFixed(2)+' s'; }
    const row=body.querySelector('.cm-row[data-l="'+cur+'"] small'); if(row) row.textContent=fmt(n); });
  BD.on('select',()=>{ if(!body) return; const n=BD.S.sel[0]; if(n&&page()&&layers(page()).includes(n)&&n.id()!==cur&&!busy&&!prev){ cur=n.id(); paint(); } });
  BD.on('doc',()=>{ if(body&&!busy&&!prev) paint(); });
  paint();
  /* 2.5.0 (owner: "make it simple"): a page with no motion yet gets Auto straight away, so opening + Save video is all it takes */
  { const f=page(); if(f&&!layers(f).some(n=>getEnter(n))) autoPlan(f,getMotion(f).len).then(plan=>{ if(!body||busy||prev) return; layers(f).forEach(n=>{ const p=plan.get(n); n.setAttr('enter',p||null); }); touch(); paint(); }).catch(()=>{}); }
}
window.CRMotion={open,makeRig,autoPlan,getEnter,getMotion,levelTo};
})();

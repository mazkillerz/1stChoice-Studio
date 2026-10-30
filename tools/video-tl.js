/* Video editor, timeline: a fixed playhead in the middle, the lanes (Clips, Text, Audio) scroll under it.
   Scrolling scrubs (t = scrollLeft / pps); while playing it follows. Select a block to get edge handles (trim) and, for text and sound,
   to drag it in time. Hold a clip, then drag, to reorder. Pinch (or the zoom buttons) changes the scale. */
(function(){
const V=window.VD, st=V.st, L=V.L, $=V.$, esc=V.esc, I=V.I, clamp=V.clamp;
const sc=$('vtScroll'), inn=$('vtIn'), CH=56, AH=28;
const PPS_MIN=20, PPS_MAX=240, MIN_LEN=0.2, PHOTO_MIN=0.5, PHOTO_MAX=15;
const dpr=()=>Math.min(2,window.devicePixelRatio||1);

/* ---------- scale + scroll ---------- */
V.defaultPps=()=>{ const w=sc.clientWidth||390, d=Math.max(V.dur(),1); return clamp(Math.round(3*w/d),PPS_MIN,PPS_MAX); };
let setL=-1;
function setScroll(x){ x=Math.round(x); setL=x; sc.scrollLeft=x; }
V.scrollTo=t=>setScroll(t*st.pps);
sc.addEventListener('scroll',()=>{ if(Math.abs(sc.scrollLeft-setL)<=1.5) return; if(!st.ready) return; V.scrub(sc.scrollLeft/st.pps); });
sc.addEventListener('pointerdown',()=>{ if(st.playing) V.pause(); },true);
function setPps(p){ p=clamp(p,PPS_MIN,PPS_MAX); if(Math.abs(p-st.pps)<.01) return; st.pps=p; renderTl(); setScroll(st.t*p); }
$('vdZoomIn').addEventListener('click',()=>setPps(st.pps*1.4));
$('vdZoomOut').addEventListener('click',()=>setPps(st.pps/1.4));
(function(){   // pinch: the listeners sit on the touched element itself, because a re-draw can remove it from the page mid-gesture
  let pz=null; const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  const mv=e=>{ if(pz&&e.touches.length===2){ e.preventDefault(); setPps(pz.p*dist(e.touches)/pz.d); } };
  const end=e=>{ if(e.touches.length<2&&pz){ pz.el.removeEventListener('touchmove',mv); pz.el.removeEventListener('touchend',end); pz.el.removeEventListener('touchcancel',end); pz=null; } };
  sc.addEventListener('touchstart',e=>{ if(e.touches.length===2&&!pz){ const el=e.target; pz={d:dist(e.touches),p:st.pps,el}; el.addEventListener('touchmove',mv,{passive:false}); el.addEventListener('touchend',end); el.addEventListener('touchcancel',end); } },{passive:true});
})();
sc.addEventListener('keydown',e=>{ if(!st.ready) return; let d=0;
  if(e.key==='ArrowRight'||e.key==='ArrowUp') d=1; else if(e.key==='ArrowLeft'||e.key==='ArrowDown') d=-1;
  if(d){ e.preventDefault(); const step=e.shiftKey?1:1/V.fps(); V.setT(Math.round((st.t+d*step)*V.fps())/V.fps(),{keep:true}); return; }
  if(e.key==='Home'){ e.preventDefault(); V.setT(0,{keep:true}); } else if(e.key==='End'){ e.preventDefault(); V.setT(V.dur()); }
  else if(e.key===' '||e.code==='Space'||e.key==='Enter'){ e.preventDefault(); V.toggle(); } });
new ResizeObserver(()=>{ if(st.ready) { renderTl(); setScroll(st.t*st.pps); } }).observe(sc);

/* ---------- thumbnails and waves (made on the side, kept per clip, stretched until the sharp one is ready) ---------- */
const strips=new Map(), waves=new Map(), mediaThumbs=new Map(); let genT=0; const genQ=new Set();
const sig=c=>[c.kind,c.media||c.reel,c.in,c.out,c.dur].join('|');
function cover(cx,src,x,y,w,h){ const sw=src.width, sh=src.height; if(!sw||!sh) return; const k=Math.max(w/sw,h/sh), dw=sw*k, dh=sh*k; cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip(); cx.drawImage(src,x+(w-dw)/2,y+(h-dh)/2,dw,dh); cx.restore(); }
async function mThumbs(id){ if(!mediaThumbs.has(id)) mediaThumbs.set(id,StudioMedia.thumbs(id,12,Math.round(CH*dpr())).catch(()=>[])); return mediaThumbs.get(id); }
async function makeStrip(c,start,wpx){
  const cv=document.createElement('canvas'), k=Math.min(dpr(),4096/Math.max(1,wpx)); cv.width=Math.max(1,Math.round(wpx*k)); cv.height=Math.round(CH*dpr());
  const cx=cv.getContext('2d'), tw=Math.round(CH*9/16), n=Math.max(1,Math.ceil(wpx/tw)), tpx=cv.width/n, len=V.clipLen(c);
  if(c.kind==='reel'){
    const kf=Math.min(n,6), frames=[], T=document.createElement('canvas'); T.width=36; T.height=64; const tc=T.getContext('2d');
    for(let j=0;j<kf;j++){ const t=start+Math.min(len-0.05,(j+.5)/kf*len); try{ st.P.draw(tc,t,{preview:true,hideText:true}); const f=document.createElement('canvas'); f.width=36; f.height=64; f.getContext('2d').drawImage(T,0,0); frames.push(f); }catch(_){ frames.push(null); } await new Promise(r=>setTimeout(r,16)); }
    for(let i=0;i<n;i++){ const f=frames[Math.floor(i*kf/n)]; if(f) cover(cx,f,i*tpx,0,tpx+1,cv.height); }
  } else {
    const th=await mThumbs(c.media), m=(st.R.media[c.media]||{}), D=m.dur||len;
    if(!th.length) return null;
    for(let i=0;i<n;i++){ const tm=c.kind==='photo'?0:(c.in||0)+(i+.5)/n*len, f=th[clamp(Math.floor(tm/Math.max(D,.01)*th.length),0,th.length-1)]; if(f) cover(cx,f,i*tpx,0,tpx+1,cv.height); }
  }
  return cv;
}
function wantStrip(c,start,wpx){ const key=c.id, e=strips.get(key); if(e&&e.sig===sig(c)&&Math.abs(e.w-wpx)<3) return; genQ.add(c.id); clearTimeout(genT); genT=setTimeout(runGen,st.playing?600:120); }
async function runGen(){
  if(st.playing){ genT=setTimeout(runGen,600); return; }
  const ids=[...genQ]; genQ.clear();
  for(const id of ids){
    const l=V.lay().find(x=>x.c.id===id); if(!l) continue; const c=l.c, wpx=Math.max(8,V.clipLen(c)*st.pps-2);
    if(V.missing().has(c.media)) continue;
    try{ const cv=await makeStrip(c,l.start,wpx); if(!cv) continue; strips.set(id,{sig:sig(c),w:wpx,cv}); const old=inn.querySelector(`.vt-blk[data-id="${CSS.escape(id)}"] .vt-th`);
      if(old){ cv.className='vt-th'; old.replaceWith(cv); } }catch(err){ V.log('thumb',String(err&&err.message||err)); }
  }
}
V.afterPause=()=>{ if(genQ.size) runGen(); };
async function makeWave(a,wpx){
  const m=st.R.media[a.media]||{}, D=Math.max(.1,m.dur||a.out), N=Math.min(4000,Math.ceil(D*40)); const w=await StudioMedia.wave(a.media,N);
  let mx=0; for(const v of w) if(v>mx) mx=v; mx=mx||1;
  const cv=document.createElement('canvas'), k=Math.min(dpr(),4096/Math.max(1,wpx)); cv.width=Math.max(1,Math.round(wpx*k)); cv.height=Math.round(AH*dpr());
  const cx=cv.getContext('2d'); cx.fillStyle=getComputedStyle(document.body).getPropertyValue('--vt-wave').trim()||'#888';
  const step=Math.max(2,Math.round(3*k)), mid=cv.height/2;
  for(let x=0;x<cv.width;x+=step){ const t=a.in+(x/cv.width)*(a.out-a.in), i=clamp(Math.floor(t/D*N),0,N-1), h=Math.max(2,w[i]/mx*(cv.height-6)); cx.fillRect(x,mid-h/2,Math.max(1,step-1.5),h); }
  return cv;
}
async function wantWave(a,wpx){ const e=waves.get(a.id), s=[a.media,a.in,a.out].join('|'); if(e&&e.sig===s&&Math.abs(e.w-wpx)<3) return;
  try{ const cv=await makeWave(a,wpx); waves.set(a.id,{sig:s,w:wpx,cv}); const old=inn.querySelector(`.vt-blk[data-id="${CSS.escape(a.id)}"] .vt-th`); if(old){ cv.className='vt-th'; old.replaceWith(cv); } }catch(err){ V.log('wave',String(err&&err.message||err)); } }

/* ---------- drawing the lanes ---------- */
const lenLab=n=>`<bdi>${(Math.round(n*10)/10).toFixed(1)} s</bdi>`;
function ruler(d,pps,pad){
  const steps=[1,2,5,10,15,30,60,120,300], step=steps.find(s=>s*pps>=56)||600; let h='';
  for(let s=0;s<=Math.floor(d)+1;s++){ const major=s%step===0; if(pps<40&&!major) continue; h+=`<i class="${major?'mj':''}" style="left:${pad+s*pps}px">${major?`<b><bdi>${s>=60?Math.floor(s/60)+':'+String(s%60).padStart(2,'0'):s}</bdi></b>`:''}</i>`; }
  return h;
}
function renderTl(){
  if(!st.R) return;
  const R=st.R, d=V.dur(), pps=st.pps, pad=st.pad=Math.round(sc.clientWidth/2)||195, miss=V.missing(), sel=st.sel;
  inn.style.width=Math.ceil(pad*2+d*pps)+'px';
  $('vtRuler').innerHTML=ruler(d,pps,pad);
  const lay=V.lay(), handles='<i class="vt-h l" data-h="l"></i><i class="vt-h r" data-h="r"></i>';
  const isSel=(k,id)=>sel&&sel.kind===k&&sel.id===id;
  let h=lay.map(x=>{ const c=x.c, w=(x.end-x.start)*pps, s=isSel('clip',c.id), m=c.media&&miss.has(c.media);
    const ic=c.kind==='reel'?I.reel:c.kind==='photo'?I.image:I.video;
    return `<div class="vt-blk vt-clip k-${c.kind}${s?' sel':''}${m?' missing':''}" data-k="clip" data-id="${esc(c.id)}" role="button" tabindex="-1" aria-label="${esc(c.kind==='reel'?'Reel':c.kind==='photo'?'Photo':'Video')} clip, ${(x.end-x.start).toFixed(1)} seconds${m?', missing':''}" style="left:${pad+x.start*pps+1}px;width:${Math.max(6,w-2)}px"><span class="vt-th"></span>${m?`<span class="vt-miss">Missing on this ${L.devWord()}</span>`:''}${w>=46?`<span class="vt-lab">${ic}${w>=70?lenLab(x.end-x.start):''}</span>`:''}${s?handles:''}</div>`; }).join('');
  h+=`<button type="button" class="vt-add" id="vtAdd" aria-label="Add a clip" style="left:${pad+d*pps+10}px">${I.plus}</button>`;
  $('vtClips').innerHTML=h;
  $('vtTexts').innerHTML=R.texts.map(t=>{ const s=isSel('text',t.id), w=(t.end-t.start)*pps;
    return `<div class="vt-blk vt-text${s?' sel':''}" data-k="text" data-id="${esc(t.id)}" role="button" tabindex="-1" aria-label="Text: ${esc(String(t.value).slice(0,30))}" style="left:${pad+t.start*pps}px;width:${Math.max(6,w)}px"><span class="vt-t" dir="auto">${esc(String(t.value).replace(/\n/g,' '))}</span>${s?handles:''}</div>`; }).join('');
  $('vtAudios').innerHTML=R.audio.map(a=>{ const s=isSel('audio',a.id), w=(a.out-a.in)*pps, m=miss.has(a.media), nm=(R.media[a.media]||{}).name||'Sound';
    return `<div class="vt-blk vt-audio${s?' sel':''}${m?' missing':''}${a.mute?' off':''}" data-k="audio" data-id="${esc(a.id)}" role="button" tabindex="-1" aria-label="Sound: ${esc(nm)}" style="left:${pad+a.start*pps}px;width:${Math.max(6,w)}px"><span class="vt-th"></span><span class="vt-t" dir="auto">${m?'Missing on this '+L.devWord():esc(nm)}</span>${s?handles:''}</div>`; }).join('');
  /* pictures: kept ones now, new ones soon */
  lay.forEach(x=>{ const c=x.c, w=Math.max(8,(x.end-x.start)*pps-2), e=strips.get(c.id), slot=inn.querySelector(`.vt-clip[data-id="${CSS.escape(c.id)}"] .vt-th`);
    if(e&&slot){ const cv=e.cv; cv.className='vt-th'; slot.replaceWith(cv); } if(!miss.has(c.media)) wantStrip(c,x.start,w); });
  R.audio.forEach(a=>{ const e=waves.get(a.id), slot=inn.querySelector(`.vt-audio[data-id="${CSS.escape(a.id)}"] .vt-th`); if(e&&slot){ e.cv.className='vt-th'; slot.replaceWith(e.cv); } if(!miss.has(a.media)) wantWave(a,Math.max(8,(a.out-a.in)*pps)); });
  $('vtTexts').classList.toggle('blank',!R.texts.length); $('vtAudios').classList.toggle('blank',!R.audio.length);
}
V.renderTl=renderTl;

/* ---------- tapping blocks ---------- */
let swallow=0;
inn.addEventListener('click',e=>{
  if(Date.now()<swallow) return;
  const add=e.target.closest('.vt-add'); if(add){ V.openSheet('add'); return; }
  if(e.target.closest('.vt-h')) return;
  const b=e.target.closest('.vt-blk');
  if(b){ const sel={kind:b.dataset.k,id:b.dataset.id}; if(st.sel&&st.sel.kind===sel.kind&&st.sel.id===sel.id) return; V.select(sel); L.haptic&&L.haptic('tick'); }
  else if(st.sel) V.select(null);
});
inn.addEventListener('keydown',e=>{ const b=e.target.closest('.vt-blk'); if(b&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); V.select({kind:b.dataset.k,id:b.dataset.id}); } });

/* ---------- dragging: trim, move in time, reorder ---------- */
const guide=document.createElement('i'); guide.className='vt-snap'; guide.hidden=true; inn.appendChild(guide);
function snapper(exclude){   // candidates: the playhead, 0, the end and every clip edge
  const pts=[0,V.dur(),st.t]; V.lay().forEach(x=>{ if(x.c.id!==exclude){ pts.push(x.start,x.end); } });
  return time=>{ let best=time, bd=8/st.pps; for(const p of pts){ if(Math.abs(p-time)<bd){ bd=Math.abs(p-time); best=p; } } if(best!==time){ guide.hidden=false; guide.style.left=(st.pad+best*st.pps)+'px'; } else guide.hidden=true; return best; };
}
function srcMax(c){ if(c.kind==='reel'){ const r=st.reels[c.reel]; return r?r.M.duration:c.out; } const m=st.R.media[c.media]; return m&&m.dur?m.dur:c.out; }
function startDrag(e,el,onMove,onEnd){
  const x0=e.clientX, id=e.pointerId; let moved=false;
  try{ el.setPointerCapture(id); }catch(_){}
  const mv=ev=>{ if(ev.pointerId!==id) return; const dx=ev.clientX-x0; if(!moved&&Math.abs(dx)<3) return; moved=true; ev.preventDefault(); onMove(dx/st.pps,ev); };
  const up=ev=>{ if(ev.pointerId!==id) return; el.removeEventListener('pointermove',mv); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',up); guide.hidden=true; if(moved) swallow=Date.now()+300; onEnd(moved,ev.type==='pointercancel'); };
  el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
}
inn.addEventListener('pointerdown',e=>{
  if(!st.ready||(e.button&&e.button>0)) return;
  const h=e.target.closest('.vt-h'), b=e.target.closest('.vt-blk'); if(!b) return;
  const k=b.dataset.k, id=b.dataset.id, side=h&&h.dataset.h;
  if(h){ e.preventDefault(); return trim(e,b,k,id,side); }
  if((k==='text'||k==='audio')&&b.classList.contains('sel')){ e.preventDefault(); return moveBar(e,b,k,id); }
  if(k==='clip') return holdReorder(e,b,id);
});

function trim(e,b,k,id,side){
  const item=V.byId(k==='clip'?st.R.clips:k==='text'?st.R.texts:st.R.audio,id); if(!item) return;
  const d=V.dur(), pad=st.pad, pps=st.pps, o=JSON.parse(JSON.stringify(item)); let apply=null;
  const lay=V.lay().find(x=>x.c.id===id), snap=snapper(k==='clip'?id:null);
  if(k==='clip'){
    const c=item, s=lay.start, len=V.clipLen(c);
    if(side==='r'){ const max=c.kind==='photo'?PHOTO_MAX:srcMax(c)-(c.in||0), min=c.kind==='photo'?PHOTO_MIN:MIN_LEN;
      apply=dt=>{ let nl=clamp(len+dt,min,max); nl=clamp(snap(s+nl)-s,min,max); b.style.width=Math.max(6,nl*pps-2)+'px';
        return ()=>{ if(c.kind==='photo') c.dur=+nl.toFixed(3); else c.out=+((c.in||0)+nl).toFixed(3); }; };
    } else {
      const min=c.kind==='photo'?PHOTO_MIN:MIN_LEN;
      apply=dt=>{ let dd=c.kind==='photo'?clamp(dt,len-PHOTO_MAX,len-min):clamp(dt,-(c.in||0),len-min); dd=clamp(snap(s+dd)-s,c.kind==='photo'?len-PHOTO_MAX:-(c.in||0),len-min);
        b.style.left=(pad+(s+dd)*pps+1)+'px'; b.style.width=Math.max(6,(len-dd)*pps-2)+'px';
        return ()=>{ if(c.kind==='photo') c.dur=+(len-dd).toFixed(3); else c.in=+((c.in||0)+dd).toFixed(3); }; };
    }
  } else if(k==='text'){
    const t=item;
    if(side==='r') apply=dt=>{ const ne=clamp(snap(t.end+dt),t.start+MIN_LEN,Math.max(d,t.start+MIN_LEN)); b.style.width=Math.max(6,(ne-t.start)*pps)+'px'; return ()=>{ t.end=+ne.toFixed(3); }; };
    else apply=dt=>{ const ns=clamp(snap(t.start+dt),0,t.end-MIN_LEN); b.style.left=(pad+ns*pps)+'px'; b.style.width=Math.max(6,(t.end-ns)*pps)+'px'; return ()=>{ t.start=+ns.toFixed(3); }; };
  } else {
    const a=item, md=(st.R.media[a.media]||{}).dur||a.out;
    if(side==='r') apply=dt=>{ let no=clamp(a.out+dt,a.in+MIN_LEN,md); if(d>0) no=Math.min(no,Math.max(a.in+MIN_LEN,a.in+(d-a.start))); const ns=snap(a.start+(no-a.in)); no=clamp(a.in+(ns-a.start),a.in+MIN_LEN,md);
      b.style.width=Math.max(6,(no-a.in)*pps)+'px'; return ()=>{ a.out=+no.toFixed(3); }; };
    else apply=dt=>{ let dd=clamp(dt,-Math.min(a.in,a.start),a.out-a.in-MIN_LEN); dd=clamp(snap(a.start+dd)-a.start,-Math.min(a.in,a.start),a.out-a.in-MIN_LEN);
      b.style.left=(pad+(a.start+dd)*pps)+'px'; b.style.width=Math.max(6,(a.out-a.in-dd)*pps)+'px'; return ()=>{ a.start=+(a.start+dd).toFixed(3); a.in=+(a.in+dd).toFixed(3); }; };
  }
  let commit=null; if(st.playing) V.pause();
  startDrag(e,b,dt=>{ commit=apply(dt); },(moved,cancel)=>{ if(moved&&commit&&!cancel){ commit(); V.touch({fit:k==='clip',bar:true}); } else renderTl(); });
}

function moveBar(e,b,k,id){
  const item=V.byId(k==='text'?st.R.texts:st.R.audio,id); if(!item) return;
  const d=V.dur(), pad=st.pad, pps=st.pps, snap=snapper(null);
  const start=item.start, len=k==='text'?item.end-item.start:item.out-item.in, maxS=Math.max(0,d-len); let ns=start;
  if(st.playing) V.pause();
  startDrag(e,b,dt=>{ ns=clamp(start+dt,0,maxS); const s1=snap(ns), s2=snap(ns+len)-len; ns=clamp(Math.abs(s1-ns)<=Math.abs(s2-ns)&&s1!==ns?s1:(s2!==ns?s2:ns),0,maxS); b.style.left=(pad+ns*pps)+'px'; },
    (moved,cancel)=>{ if(moved&&!cancel){ item.start=+ns.toFixed(3); if(k==='text') item.end=+(ns+len).toFixed(3); V.touch({bar:true}); } else renderTl(); });
}

/* press and hold a clip (400 ms), then drag: a line shows where it will land. Move earlier / Move later do the same without dragging. */
function holdReorder(e,b,id){
  const x0=e.clientX, y0=e.clientY, pid=e.pointerId; let timer=0, on=false, target=0;
  const lay=V.lay(), from=lay.findIndex(x=>x.c.id===id); if(from<0) return;
  const others=lay.filter(x=>x.c.id!==id), bw=parseFloat(b.style.width), bl=parseFloat(b.style.left);
  const block=ev=>{ if(on) ev.preventDefault(); };
  sc.addEventListener('touchmove',block,{passive:false});
  const cleanup=()=>{ clearTimeout(timer); b.removeEventListener('pointermove',mv); b.removeEventListener('pointerup',up); b.removeEventListener('pointercancel',up); sc.removeEventListener('touchmove',block); guide.hidden=true; b.classList.remove('lift'); b.style.transform=''; };
  const slotX=k=>{ const s=k<=0?0:others[k-1].end; return st.pad+s*st.pps; };
  const mv=ev=>{ if(ev.pointerId!==pid) return;
    if(!on){ if(Math.hypot(ev.clientX-x0,ev.clientY-y0)>8) cleanup(); return; }
    ev.preventDefault(); b.style.transform=`translateX(${ev.clientX-x0}px)`;
    const r=sc.getBoundingClientRect(), tp=(sc.scrollLeft+ev.clientX-r.left-st.pad)/st.pps; target=others.filter(x=>(x.start+x.end)/2<tp).length;
    guide.hidden=false; guide.style.left=slotX(target)+'px'; };
  const up=ev=>{ if(ev.pointerId!==pid) return; const was=on; const t=target; cleanup();
    if(was){ swallow=Date.now()+300; if(t!==from){ const [c]=st.R.clips.splice(from,1); st.R.clips.splice(t,0,c); V.touch({bar:true}); } else renderTl(); } };
  b.addEventListener('pointermove',mv); b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up);
  timer=setTimeout(()=>{ on=true; target=from; try{ b.setPointerCapture(pid); }catch(_){} b.classList.add('lift'); L.haptic&&L.haptic('tick'); },400);
}
})();

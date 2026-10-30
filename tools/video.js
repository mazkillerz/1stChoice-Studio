/* Video editor, core: a project of clips (your videos and photos, or a reel template), text layers and sound tracks.
   This file: state, opening/new/saved projects, the preview (draw, pick and drag text), playing, saving, the debug panel.
   video-tl.js = the timeline; video-ui.js = the bottom bar, the context bar and every sheet. All share window.VD.
   Brand-agnostic: reels, words and colours come from the brand kit. A saved video is a normal Saved design (tool 'video') that holds
   settings only (docs/reels.md, "Projects"); the files you add stay on this device (assets/reel-project.js, IndexedDB). */
(function(){
const L=Studio.lab, esc=L.esc, $=id=>document.getElementById(id);
const TOOL='video', SAFE_KEY='studio:video:safe';
const q=new URLSearchParams(location.search);
const V=window.VD={L,esc,$,q,TOOL};
const st=V.st={B:null,P:null,R:null,reels:{},reelP:{},mixP:{},sel:null,t:0,playing:false,h:null,p0:0,t0:0,raf:0,pps:100,pad:195,
  design:null,base:'',clean:'',ready:false,busy:false,leaving:false,sup:null,safe:false,last:0,sheet:null,drawMs:0,skip:0,cssW:0,draftId:null,drawErr:'',loadErr:'',audioErr:'',log:[],solo:null};
const clone=V.clone=o=>JSON.parse(JSON.stringify(o));
const svg=(d,s,x)=>`<svg width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${x||''}>${d}</svg>`;
const I=V.I={
  x:svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',18),
  warn:svg('<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',18),
  vol:svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/>',22),
  mute:svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',22),
  play:svg('<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',20,' fill="currentColor"'),
  plus:svg('<path d="M5 12h14"/><path d="M12 5v14"/>',22),
  video:svg('<path d="m16 13 5.2 3.1a.5.5 0 0 0 .8-.4V8.3a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',14),
  image:svg('<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',14),
  reel:svg('<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',14),
  music:svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',22),
  type:svg('<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',22),
  scissors:svg('<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',22),
  trash:svg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',22),
  left:svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',22),
  right:svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',22),
  copy:svg('<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',22),
  pencil:svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',22),
  mix:svg('<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',22),
  fade:svg('<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',22),
  zoom:svg('<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',22),
  clock:svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',22),
  upload:svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',22)
};
const fmt=V.fmt=s=>{ s=Math.max(0,s||0); const m=Math.floor(s/60), r=Math.floor((s-m*60)*10+1e-6)/10; return m+':'+(r<10?'0':'')+r.toFixed(1); };
const sec=V.sec=s=>(Math.round((s||0)*10)/10).toFixed(1)+' s';
const isTouch=()=>matchMedia('(pointer:coarse)').matches;
const prog01=p=>{ if(typeof p==='number') return Math.max(0,Math.min(1,p>1?p/100:p)); if(p&&p.total) return Math.max(0,Math.min(1,p.loaded/p.total)); return 0; };
const slug=s=>String(s||'').trim().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,60);
const clamp=V.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const RENDER=q.get('render')==='1';   // Saved's hidden renderer: it never writes a draft
V.devWord=()=>L.devWord();

/* ---------- the project's numbers (from the recipe, so they are right before the engine has caught up) ---------- */
const clipLen=V.clipLen=c=>c.kind==='photo'?(+c.dur||0):Math.max(0,(+c.out||0)-(+c.in||0));
V.lay=()=>{ let t=0; return ((st.R&&st.R.clips)||[]).map((c,i)=>{ const s=t; t+=clipLen(c); return {c,i,start:s,end:t}; }); };
const dur=V.dur=()=>V.lay().reduce((a,b)=>b.end,0);
const fps=V.fps=()=>(st.P&&st.P.fps)||(st.R&&st.R.fps)||30;
V.clipAt=t=>{ const l=V.lay(); if(!l.length) return null; return l.find(x=>t>=x.start&&t<x.end)||(t>=l[l.length-1].end?l[l.length-1]:l[0]); };
V.byId=(list,id)=>(list||[]).find(x=>x.id===id);
V.uid=(prefix)=>{ const R=st.R, all=[...R.clips,...R.texts,...R.audio].map(x=>x.id); let n=all.length+1; while(all.includes(prefix+n)) n++; return prefix+n; };
V.empty=()=>!st.R||!st.R.clips.length;
const cur=V.cur=()=>JSON.stringify(st.R);
const nameNow=V.nameNow=()=>$('vdName').value.trim()||st.defName||'Video';
V.hasOwnFiles=()=>!!(st.R&&(st.R.clips.some(c=>c.kind==='video'||c.kind==='photo')||st.R.audio.length));
V.missing=()=>{ try{ return st.P?new Set(st.P.missing()||[]):new Set(); }catch(_){ return new Set(); } };

/* ---------- reels of the brand kit: loaded on demand, kept by id ---------- */
V.reelList=()=>(st.B&&st.B.reels)||[];
V.ensureReel=id=>st.reelP[id]||(st.reelP[id]=(async()=>{
  const base=st.B.base+'reels/'+id+'/', reel=await StudioReel.load(base); return st.reels[id]={id,base,reel,M:reel.M,mix:null};
})().catch(err=>{ delete st.reelP[id]; throw err; }));
V.ensureMix=async id=>{ const r=await V.ensureReel(id); if(r.mix||r.mixErr) return r;
  if(!st.mixP[id]) st.mixP[id]=(window.StudioReelAudio?StudioReelAudio.load(r.M,r.base):Promise.reject(new Error('no audio engine')))
    .then(m=>{ r.mix=m; return r; },err=>{ console.warn('sound failed',err); r.mixErr=String(err&&err.message||err).slice(0,80); return r; });
  return st.mixP[id]; };
V.reelInfo=async id=>{ try{ const j=await (await fetch(st.B.base+'reels/'+id+'/reel.json')).json(); return {id,title:j.title||id,sub:j.sub||'',dur:j.duration}; }catch(_){ return {id,title:id,sub:'',dur:0}; } };

/* ---------- logging for the debug panel ---------- */
V.log=(k,v)=>{ st.log.push(k+': '+v); if(st.log.length>40) st.log.shift(); };
addEventListener('error',e=>V.log('error',e.message));
addEventListener('unhandledrejection',e=>V.log('promise',String(e.reason&&e.reason.message||e.reason)));

/* ---------- stage: preview size, drawing ---------- */
function stageLayout(){
  const wrap=$('vdWrap'), cs=getComputedStyle(wrap), px=v=>parseFloat(v)||0;
  const aw=wrap.clientWidth-px(cs.paddingLeft)-px(cs.paddingRight), ah=wrap.clientHeight-px(cs.paddingTop)-px(cs.paddingBottom);
  const W=(st.P&&st.P.W)||1080, H=(st.P&&st.P.H)||1920, asp=W/H;
  if(aw<=0||ah<=0) return;
  const w=Math.max(60,Math.floor(Math.min(aw,ah*asp))), h=Math.round(w/asp), pv=$('vdPv');
  pv.style.width=w+'px'; pv.style.height=h+'px';
  st.cssW=w; sizeCv(); drawNow(); placeSel();
}
/* the preview's pixel size: full device sharpness when paused or scrubbing, at most 540 px wide while playing (phones can't keep up at 1080).
   Returns true when the size changed (the canvas is cleared then, so the caller draws again). */
const PLAY_W=540;
function sizeCv(){
  const W=(st.P&&st.P.W)||1080, H=(st.P&&st.P.H)||1920, asp=W/H, w=st.cssW||$('vdPv').clientWidth||216;
  const cv=$('vdCv'), dpr=Math.min(3,window.devicePixelRatio||1); let cw=Math.min(W,Math.round(w*dpr)); if(st.playing) cw=Math.min(cw,PLAY_W);
  const ch=Math.round(cw/asp); if(cv.width===cw&&cv.height===ch) return false; cv.width=cw; cv.height=ch; return true;
}
V.stageLayout=stageLayout;
function showErr(msg){ $('vdLoad').hidden=true; $('vdErr').hidden=false; $('vdErrTxt').textContent=msg; $('vdErr').dataset.kind=''; }
function showDrawErr(err){
  const m=String(err&&err.message||err); st.drawErr=m; V.log('draw',m);
  if(!st.warned){ st.warned=true; console.error('draw failed',err); }
  $('vdLoad').hidden=true; $('vdErr').hidden=false; $('vdErr').dataset.kind='draw';
  $('vdErrTxt').textContent='The video could not be drawn on this '+L.devWord()+'. ('+m+')';
}
V.fail=(err,what)=>{ const m=String(err&&err.message||err); console.error(what||'error',err); V.log(what||'error',m); return m; };
function drawNow(){
  const cv=$('vdCv'), cx=cv.getContext('2d');
  if(!st.P||V.empty()){ cx.setTransform(1,0,0,1,0,0); cx.clearRect(0,0,cv.width,cv.height); return; }
  const t0=performance.now();
  try{ st.P.draw(cx,Math.min(st.t,Math.max(0,dur()-0.5/fps())),{preview:true}); st.drawMs=performance.now()-t0;
    if(st.drawErr){ st.drawErr=''; const e=$('vdErr'); if(e.dataset.kind==='draw') e.hidden=true; } }
  catch(err){ showDrawErr(err); }
}
V.drawNow=drawNow;
let prepTok=0;
function seekPaint(){
  drawNow();
  if(!st.P||V.empty()||st.playing) return;
  const tok=++prepTok;
  Promise.resolve().then(()=>st.P.prepare(st.t)).then(()=>{ if(tok===prepTok&&!st.playing) drawNow(); },err=>{ if(tok===prepTok) showDrawErr(err); });
}
function paint(){
  const t=st.t, d=dur();
  if(st.playing) drawNow(); else seekPaint();
  $('vdNow').textContent=fmt(t); placeSel();
  const sc=$('vtScroll'), now=performance.now();
  if(!st.playing||now-st.last>400){ st.last=now; sc.setAttribute('aria-valuenow',t.toFixed(2)); sc.setAttribute('aria-valuetext',t.toFixed(1)+' seconds of '+d.toFixed(0)); }
}
V.paint=paint;
function setT(t,o){
  o=o||{}; t=clamp(t,0,dur()); const was=st.playing;
  if(was&&!o.keep) pause();
  st.t=t; if(!o.noScroll&&V.scrollTo) V.scrollTo(t);
  paint();
  if(was&&o.keep){ stopAudio(); startClock(t); }
}
V.setT=setT;
V.scrub=t=>{ if(st.playing) pause(); stopSolo(); st.t=clamp(t,0,dur()); paint(); };

/* ---------- empty state ---------- */
function syncEmpty(){
  const e=V.empty(); $('vdEmpty').hidden=!e||!st.ready;
  $('vdSave').disabled=!st.ready||e; $('vdPlay').disabled=!st.ready||e;
  $('vdMain').classList.toggle('is-empty',e);
}
V.syncEmpty=syncEmpty;

/* ---------- playback: the audio clock is the master when there is audio ---------- */
function stopAudio(){ if(st.h){ try{ st.h.stop(); }catch(_){} st.h=null; } }
function stopSolo(){ if(st.solo){ try{ st.solo.stop(); }catch(_){} st.solo=null; } document.querySelectorAll('.vd-solo.on').forEach(b=>b.classList.remove('on')); }
V.stopSolo=stopSolo;
function startClock(from){
  st.t0=from; st.p0=performance.now(); st.h=null;
  try{ st.h=st.P.play(from)||null; }catch(err){ V.fail(err,'sound'); st.h=null; }
}
function curT(){
  if(st.h&&st.h.playing){ const p=st.h.position(); if(Number.isFinite(p)) return p; }
  if(st.h&&!st.h.playing&&st.t<dur()-0.15){ st.t0=st.t; st.p0=performance.now(); st.h=null; }   // the sound ended early: keep going on the clock
  return st.t0+(performance.now()-st.p0)/1000;
}
function setPlayUI(){
  const b=$('vdPlay'), on=st.playing; b.setAttribute('aria-label',on?'Pause':'Play');
  b.querySelector('.i-play').hidden=on; b.querySelector('.i-pause').hidden=!on;
}
function tickFrame(){
  if(!st.playing) return;
  const t=curT();
  if(t>=dur()){ st.t=dur(); pause(); if(V.scrollTo) V.scrollTo(st.t); paint(); return; }
  st.t=t;
  if(st.skip){ st.skip=0; st.raf=requestAnimationFrame(tickFrame); return; }   // the last picture took too long: let this tick go, the sound clock keeps the time
  try{ st.P.syncPreview(t,true); }catch(_){}
  if(V.scrollTo) V.scrollTo(t);
  paint(); if(st.drawMs>40) st.skip=1; st.raf=requestAnimationFrame(tickFrame);
}
function play(){
  if(!st.ready||st.busy||V.empty()) return;
  stopSolo();
  if(st.t>=dur()-0.5/fps()) st.t=0;
  st.playing=true; st.skip=0; if(sizeCv()) drawNow(); startClock(st.t); setPlayUI(); cancelAnimationFrame(st.raf);
  Promise.resolve().then(()=>st.P.prepare(st.t)).catch(()=>{}).then(()=>{ if(st.playing){ st.raf=requestAnimationFrame(tickFrame); } });
}
function pause(){
  if(!st.playing) return;
  st.playing=false; cancelAnimationFrame(st.raf); stopAudio(); setPlayUI();
  try{ st.P.syncPreview(st.t,false); }catch(_){}
  if(sizeCv()) drawNow();
  if(V.afterPause) V.afterPause();
}
const toggle=()=>{ st.playing?pause():play(); };
V.play=play; V.pause=pause; V.toggle=toggle; V.stopAudio=stopAudio;
let restartT=0;
V.restartPlay=()=>{ clearTimeout(restartT); restartT=setTimeout(()=>{ if(st.playing){ const t=curT(); stopAudio(); startClock(t); } },120); };
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ pause(); stopSolo(); draftNow(); } });
$('vdPlay').addEventListener('click',()=>{ L.haptic&&L.haptic('tick'); toggle(); });
document.addEventListener('keydown',e=>{ if((e.key===' '||e.code==='Space')&&!e.target.closest('input,textarea,button,select,a,label,[role=tab],#vtScroll')&&!document.querySelector('dialog[open]')&&st.ready){ e.preventDefault(); toggle(); } });

/* ---------- Safe zones: Instagram's covered areas, only ever drawn on top in the editor ---------- */
function setSafe(on,keep){
  st.safe=!!on; $('vdSafe').hidden=!on; const b=$('vdSafeBtn'); b.setAttribute('aria-pressed',String(!!on));
  if(!keep) L.store(SAFE_KEY,!!on);
}
$('vdSafeBtn').addEventListener('click',()=>setSafe(!st.safe));

/* ---------- history: Undo / Redo ----------
   The whole recipe as JSON after each finished edit. A drag, trim or slider is ONE step (committed on pointer-up / change); typing in a
   text box merges into one step per ~600 ms pause; anything else is committed 700 ms after the last change. 60 steps at most. */
const H=V.hist={stack:[],i:-1,pending:false,mute:0,down:false,toastAt:null,fb:0,ty:0,dirty:false,unsaved:false,MAX:60};
const NEEDSEL=new Set(['edit','vol','fades','len','zoom','words','mix']);
function syncHist(){ $('vdUndo').disabled=H.i<=0; $('vdRedo').disabled=H.i>=H.stack.length-1; }
H.reset=()=>{ clearTimeout(H.fb); clearTimeout(H.ty); H.stack=[cur()]; H.i=0; H.pending=false; H.toastAt=null; syncHist(); };
H.mark=()=>{
  if(H.mute||!st.ready) return; H.pending=true; H.dirty=true; clearTimeout(H.fb);
  H.fb=setTimeout(function fb(){ if(H.down){ H.fb=setTimeout(fb,300); return; } H.commit(); },700);
  const r=$('vdResume'); if(r) r.hidden=true; saveSoon();
};
H.commit=()=>{
  clearTimeout(H.fb); clearTimeout(H.ty); if(!H.pending) return; H.pending=false; const s=cur(); if(s===H.stack[H.i]) return;
  H.stack.length=H.i+1; H.stack.push(s); if(H.stack.length>H.MAX) H.stack.shift(); H.i=H.stack.length-1; syncHist();
  const t=document.getElementById('vdToast'); if(t&&H.toastAt!==H.i) t.hidden=true;
};
function applyRecipe(s){
  const o=JSON.parse(s), R=st.R;
  Object.keys(R).forEach(k=>{ if(!(k in o)) delete R[k]; });
  Object.keys(o).forEach(k=>{
    if(k==='clips'||k==='texts'||k==='audio') R[k].splice(0,R[k].length,...o[k]);
    else if(k==='media'){ Object.keys(R.media).forEach(x=>delete R.media[x]); Object.assign(R.media,o.media); }
    else R[k]=o[k]; });
  if(st.sel&&!V.selItem()) st.sel=null;
  if(st.sheet&&NEEDSEL.has(st.sheet.name)&&!st.sel&&V.closeSheet) V.closeSheet(true);   // a sheet about something that is gone
  H.mute++; try{ V.touch({bar:true}); } finally{ H.mute--; }
  if(st.sheet&&V.refreshSheet){ V.refreshSheet(); const a=document.activeElement; if(isTouch()&&a&&a.matches&&a.matches('textarea,input[type=text]')) a.blur(); }
  H.dirty=true; saveSoon();
}
H.go=dir=>{ H.commit(); const j=H.i+dir; if(j<0||j>=H.stack.length) return false; H.i=j; applyRecipe(H.stack[j]); syncHist(); const t=document.getElementById('vdToast'); if(t) t.hidden=true; return true; };
V.undo=()=>H.go(-1); V.redo=()=>H.go(1);
$('vdUndo').addEventListener('click',()=>{ L.haptic&&L.haptic('tick'); V.undo(); });
$('vdRedo').addEventListener('click',()=>{ L.haptic&&L.haptic('tick'); V.redo(); });
document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey||!st.ready||document.querySelector('dialog[open]')) return; const k=e.key.toLowerCase();
  if(e.target&&e.target.id==='vdName') return;   // the name field keeps the browser's own undo
  if(k==='z'&&!e.shiftKey){ e.preventDefault(); V.undo(); } else if((k==='z'&&e.shiftKey)||k==='y'){ e.preventDefault(); V.redo(); } });
/* when a step is finished */
['pointerup','pointercancel','change','click'].forEach(ev=>document.addEventListener(ev,()=>{ if(H.pending) setTimeout(H.commit,0); },true));
document.addEventListener('pointerdown',()=>{ H.down=true; },true);
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>{ H.down=false; },true));
document.addEventListener('input',e=>{ if(e.target.matches&&e.target.matches('input[type=text],textarea')){ clearTimeout(H.ty); H.ty=setTimeout(H.commit,600); } },true);

/* ---------- the draft kept on this device (like the other tools): localStorage 'studio:draft:<brand>:video:<id>' ----------
   {video: recipe, name, at, design: saved design id or null, pfx: its own key}; a small picture in IndexedDB at '<key>:thumb'.
   Your own clips are already in IndexedDB (StudioMedia), so nothing is copied. */
const draftKey=id=>L.draftBase(st.B.id,TOOL)+':'+id;
let saveT=0, thC=null;
function saveSoon(){ if(RENDER||!st.ready) return; H.unsaved=true; clearTimeout(saveT); saveT=setTimeout(()=>writeDraft(false),800); }
function draftThumb(){   // the frame at the playhead (the reel's poster at 0), 180×320
  if(V.empty()) return null;
  try{ if(!thC){ thC=document.createElement('canvas'); thC.width=180; thC.height=320; }
    const t=st.t>0.05?st.t:posterT(); st.P.draw(thC.getContext('2d'),Math.min(t,Math.max(0,dur()-0.5/fps())),{preview:true}); return thC.toDataURL('image/jpeg',.7); }catch(_){ return null; }
}
function writeDraft(force){
  clearTimeout(saveT); saveT=0; if(RENDER||!st.ready||!(force||H.unsaved)) return; H.unsaved=false;
  if(!st.draftId){ if(st.design) return;   // a saved design opened from the team is not a draft
    st.draftId=Date.now().toString(36)+Math.random().toString(36).slice(2,5); try{ history.replaceState(null,'',location.pathname+'?draft='+st.draftId); }catch(_){} }
  const key=draftKey(st.draftId), rec={video:st.R,name:$('vdName').value.trim(),at:Date.now(),design:st.design?st.design.id:null,pfx:key};
  if(st.design) rec.base=st.base;
  const th=draftThumb(); if(th) L.idb.put(key+':thumb',th);
  if(L.store(key,rec)===null) V.log('draft','no room'); syncStatus();
}
function draftNow(){ if(RENDER||!st.ready) return; H.commit(); if(H.unsaved) writeDraft(false); }
$('vdName').addEventListener('input',()=>{ H.dirty=true; saveSoon(); });
function latestDraft(){
  const pre=L.draftBase(st.B.id,TOOL)+':'; let best=null;
  try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(!k||!k.startsWith(pre)) continue; const id=k.slice(pre.length); if(!id||id.includes(':')) continue;
    const d=L.store(k); if(d&&d.video&&d.video.clips&&d.video.clips.length&&(!best||(d.at||0)>(best.d.at||0))) best={id,d}; } }catch(_){}
  return best;
}
function offerResume(){
  const dr=latestDraft(); if(!dr) return; const box=$('vdResume'); box.hidden=false;
  $('vdResumeGo').onclick=()=>{ st.leaving=true; location.href=location.pathname+'?draft='+encodeURIComponent(dr.id); };
  $('vdResumeX').onclick=()=>{ box.hidden=true; };
}

/* ---------- changes: every edit goes through touch() ---------- */
function syncStatus(){ $('vdStatus').textContent=st.design?(cur()!==st.base?'Not saved to the team':'Saved to the team'):(st.draftId?'Kept on this '+L.devWord():''); }
V.syncStatus=syncStatus;
/* keep text and sound layers inside the video after the clips change */
V.fitLayers=()=>{ const d=dur(); if(d<=0) return;
  st.R.texts.forEach(t=>{ if(t.start>d-0.2) t.start=Math.max(0,d-1); t.end=Math.min(Math.max(t.end,t.start+0.2),Math.max(d,t.start+0.2)); if(t.end>d) t.end=d; if(t.end-t.start<0.2) t.start=Math.max(0,t.end-0.2); });
  st.R.audio.forEach(a=>{ if(a.start>d-0.2){ a.start=Math.max(0,d-Math.min(1,a.out-a.in)); } }); };
V.touch=function(o){
  o=o||{}; const P=st.P; H.mark();
  if(o.fit) V.fitLayers();
  if(o.tl!==false&&V.renderTl) V.renderTl();
  syncEmpty(); $('vdDur').textContent=fmt(dur()); $('vtScroll').setAttribute('aria-valuemax',String(dur()));
  if(st.t>dur()) st.t=dur();
  let r; try{ r=P.update(); }catch(err){ const m=V.fail(err,'update'); showDrawErr(new Error(m)); }
  const fin=()=>{ if(o.tl!==false&&V.renderTl) V.renderTl(); syncStatus(); if(V.renderBar&&o.bar) V.renderBar(); paint(); if(o.restart!==false) V.restartPlay(); };
  syncStatus(); paint();
  if(r&&typeof r.then==='function') return r.then(fin,err=>{ const m=V.fail(err,'update'); showDrawErr(new Error(m)); });
  fin(); return Promise.resolve();
};

/* ---------- selection: a block on the timeline or a text on the preview ---------- */
V.select=function(sel,o){
  o=o||{}; const same=st.sel&&sel&&st.sel.kind===sel.kind&&st.sel.id===sel.id;
  st.sel=sel||null;
  if(!same&&!o.keepSheet&&st.sheet) V.closeSheet&&V.closeSheet(true);
  if(V.renderTl) V.renderTl(); if(V.renderBar) V.renderBar(); placeSel();
};
V.selItem=()=>{ const s=st.sel; if(!s) return null; const list=s.kind==='clip'?st.R.clips:s.kind==='text'?st.R.texts:st.R.audio; return V.byId(list,s.id)||null; };
function placeSel(){
  const bx=$('vdSelBox'), s=st.sel, tx=s&&s.kind==='text'?V.byId(st.R.texts,s.id):null;
  if(!tx||st.t<tx.start||st.t>tx.end||V.empty()){ bx.hidden=true; return; }
  let b=null; try{ b=st.P.textBox(tx.id); }catch(_){}
  if(!b||!(b.w>0)){ bx.hidden=true; return; }
  const W=st.P.W||1080, H=st.P.H||1920;
  bx.hidden=false; bx.style.left=(b.x/W*100)+'%'; bx.style.top=(b.y/H*100)+'%'; bx.style.width=(b.w/W*100)+'%'; bx.style.height=(b.h/H*100)+'%';
}
V.placeSel=placeSel;

/* tap a text on the preview to select it, drag to move it (it snaps to the middle), double-tap to edit */
(function(){
  const ov=$('vdOver'); let g=null, lastTap={t:0,id:null};
  const pos=e=>{ const r=$('vdPv').getBoundingClientRect(), W=st.P?st.P.W||1080:1080, H=st.P?st.P.H||1920:1920; return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H,k:W/r.width}; };
  ov.addEventListener('pointerdown',e=>{
    if(!st.ready||V.empty()||(e.button&&e.button>0)) return;
    const p=pos(e); let id=null; try{ id=st.P.textAt(p.x,p.y,st.t); }catch(_){}
    if(!id){ g={none:true,x0:e.clientX,y0:e.clientY,id:e.pointerId}; return; }
    const tx=V.byId(st.R.texts,id); if(!tx) return;
    ov.setPointerCapture(e.pointerId); e.preventDefault();
    if(st.playing) pause();
    if(!(st.sel&&st.sel.kind==='text'&&st.sel.id===id)) V.select({kind:'text',id},{keepSheet:true});
    g={id:e.pointerId,tid:id,x0:p.x,y0:p.y,ox:tx.x,oy:tx.y,k:p.k,moved:false};
  });
  ov.addEventListener('pointermove',e=>{
    if(!g||g.none||g.id!==e.pointerId) return;
    const p=pos(e), tx=V.byId(st.R.texts,g.tid); if(!tx) return;
    if(!g.moved&&Math.hypot(p.x-g.x0,p.y-g.y0)/g.k<5) return;
    g.moved=true; let nx=g.ox+(p.x-g.x0), ny=g.oy+(p.y-g.y0), gx=false, gy=false;
    const W=st.P.W||1080, H=st.P.H||1920, near=8*g.k;
    if(Math.abs(nx-W/2)<near){ nx=W/2; gx=true; } if(Math.abs(ny-H/2)<near){ ny=H/2; gy=true; }
    tx.x=Math.round(nx); tx.y=Math.round(ny);
    $('vdGx').hidden=!gx; $('vdGy').hidden=!gy;
    V.touch({tl:false,restart:false});
  });
  const up=e=>{
    if(!g||g.id!==e.pointerId) return; const was=g; g=null; $('vdGx').hidden=true; $('vdGy').hidden=true;
    if(was.none){ if(Math.hypot(e.clientX-was.x0,e.clientY-was.y0)<8&&st.sel&&st.sel.kind==='text') V.select(null); return; }
    if(was.moved){ V.touch({tl:false}); return; }
    const now=Date.now(); if(lastTap.id===was.tid&&now-lastTap.t<400){ lastTap={t:0,id:null}; V.openSheet&&V.openSheet('edit'); } else lastTap={t:now,id:was.tid};
  };
  ov.addEventListener('pointerup',up); ov.addEventListener('pointercancel',up);
})();

/* ---------- the name menu ---------- */
(function(){
  const box=$('vdMenuBox');
  const items=()=>[{label:'New video',run:()=>newVideo()},{label:'All saved designs',run:()=>{ if(st.ready&&cur()!==st.clean&&st.design){ leavePrompt(L.ROOT+'index.html#saved'); } else { st.leaving=true; location.href=L.ROOT+'index.html#saved'; } }}];
  $('vdMenu').addEventListener('click',e=>{
    const its=items(); box.innerHTML=its.map((m,i)=>`<button type="button" role="menuitem" data-i="${i}">${esc(m.label)}</button>`).join(''); box.hidden=false;
    const r=e.currentTarget.getBoundingClientRect(), mr=box.getBoundingClientRect();
    box.style.left=Math.max(8,Math.min(r.left,innerWidth-mr.width-8))+'px'; box.style.top=Math.min(r.bottom+6,innerHeight-mr.height-8)+'px';
    box.onclick=ev=>{ const b=ev.target.closest('[data-i]'); if(!b) return; box.hidden=true; its[+b.dataset.i].run(); };
    box.querySelector('button').focus({preventScroll:true});
    setTimeout(()=>document.addEventListener('pointerdown',function off(ev){ if(!box.contains(ev.target)){ box.hidden=true; document.removeEventListener('pointerdown',off,true); } },true),0);
  });
  box.addEventListener('keydown',e=>{ if(e.key==='Escape'){ box.hidden=true; $('vdMenu').focus(); } });
})();
function newVideo(){
  const go=()=>{ draftNow(); st.leaving=true; location.href=location.pathname+'?new=1'; };
  if(!st.ready||cur()===st.clean||V.empty()||st.draftId||!st.design) return go();   // an unfinished video is kept on this device; only edits to a saved design ask first
  const d=L.dialog(`<div class="dlg-body"><h3>Start a new video?</h3><p class="small">Your edits are not saved. ${st.design?'Update the saved video first to keep them.':'Save to the team first to keep them.'}</p>
    <div class="dlg-actions col"><button type="button" class="btn" id="nvGo">Start a new video</button><button type="button" class="link" id="nvKeep">Keep editing</button></div></div>`);
  d.tabIndex=-1; d.querySelector('#nvKeep').onclick=()=>d.close(); d.querySelector('#nvGo').onclick=go;
}
V.newVideo=newVideo;

/* ---------- leaving ---------- */
function leavePrompt(href){
  const nm=st.design.name;
  const d=L.dialog(`<div class="dlg-body"><h3 dir="auto">Save your changes to “${esc(nm)}”?</h3><p class="small">You changed this saved video. Update it for the team, or leave it as it was.</p>
    <div class="status" id="lvSt" role="status"></div>
    <div class="dlg-actions col"><button type="button" class="btn" id="lvUpd">Update “${esc(nm)}”</button><button type="button" class="btn ghost" id="lvDis">Discard changes</button><button type="button" class="link" id="lvKeep">Keep editing</button></div></div>`);
  d.tabIndex=-1;
  d.querySelector('#lvKeep').onclick=()=>d.close();
  d.querySelector('#lvDis').onclick=()=>{ st.leaving=true; location.href=href; };
  d.querySelector('#lvUpd').onclick=async()=>{ d.querySelectorAll('button').forEach(b=>b.disabled=true); d.querySelector('#lvSt').textContent='Updating…';
    try{ await teamSave(); st.leaving=true; location.href=href; }catch(err){ d.querySelector('#lvSt').textContent=err.message; d.querySelectorAll('button').forEach(b=>b.disabled=false); } };
}
$('vdBack').addEventListener('click',e=>{ if(st.ready&&st.design&&cur()!==st.base){ e.preventDefault(); leavePrompt(e.currentTarget.href); } });
addEventListener('beforeunload',e=>{ if(!st.leaving&&(st.busy||(st.ready&&!st.draftId&&!RENDER&&cur()!==st.clean))){ e.preventDefault(); e.returnValue=''; } });
addEventListener('pagehide',()=>{ stopAudio(); stopSolo(); draftNow(); });

/* ---------- team save ---------- */
function posterT(){
  const l=V.lay(), f=l.find(x=>x.c.kind==='reel');
  if(f){ const r=st.reels[f.c.reel]; const p=r&&r.M&&r.M.poster; if(p!=null&&p>=f.c.in&&p<=f.c.out) return f.start+(p-f.c.in); }
  return Math.min(1,Math.max(0,dur()-0.1));
}
async function thumbBlob(){
  const c=document.createElement('canvas'); c.width=360; c.height=640; const t=posterT();
  try{ await st.P.prepare(t); st.P.draw(c.getContext('2d'),t,{preview:false}); }catch(err){ V.fail(err,'thumb'); }
  return L.canvasBlob(c,'image/jpeg',.85).finally(()=>{ c.width=c.height=0; });
}
async function teamSave(){
  const C=await L.cloud();
  if(!(await L.ensureMember('Saved designs go to the team, so anyone on the team can find and reuse them.'))) throw new Error('Not saved to the team: sign in first.');
  const name=nameNow(), recipe=clone(st.R); recipe.v=2; recipe.kind='video'; recipe.brand=st.B.id;
  const id=await C.saveDesign({id:st.design?st.design.id:null,brand:st.B.id,tool:TOOL,name,kind:'design',recipe,photos:[],thumb:await thumbBlob()});
  st.design={id,name}; st.base=cur(); history.replaceState(null,'',location.pathname+'?design='+id); syncStatus(); if(st.draftId) writeDraft(true);
  return id;
}
V.teamSave=teamSave;

/* ---------- Save sheet ---------- */
function fileName(){ const d=new Date(), z=n=>String(n).padStart(2,'0'); return (slug($('vdName').value)||slug(st.defName)||'video')+' '+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+'.mp4'; }
/* how long saving takes: draw 3 frames at full size (and seek the clips), times frames and sub-frames; rounded to 10 s / 1 min */
const estText=s=>s<90?'About '+Math.max(10,Math.round(s/10)*10)+' s':'About '+Math.max(2,Math.round(s/60))+' min';
const leftText=s=>s<60?'About '+Math.max(5,Math.round(s/5)*5)+' s left':'About '+Math.ceil(s/60)+' min left';
async function benchmark(){
  const P=st.P, total=dur(), cv=document.createElement('canvas'); cv.width=P.W||1080; cv.height=P.H||1920; const cx=cv.getContext('2d'), D=[], Pr=[];
  for(const f of [.2,.5,.8]){ const t=Math.max(0,Math.min(total-0.05,total*f)), a=performance.now();
    try{ await P.prepare(t); }catch(_){} const b=performance.now(); P.draw(cx,t,{}); const c=performance.now(); Pr.push(b-a); D.push(c-b); }
  cv.width=cv.height=0; try{ await P.prepare(st.t); }catch(_){}
  const med=a=>a.slice().sort((x,y)=>x-y)[1]; return {draw:med(D),prep:med(Pr)};
}
const mb=n=>n>=1e6?(n/1e6).toFixed(1)+' MB':Math.max(1,Math.round(n/1e3))+' kB';
async function openSave(){
  if(!st.ready||st.busy||V.empty()) return;
  pause(); stopSolo();
  const d=L.dialog('<div class="dlg-body vd-save-d" id="vsBody"></div>','vd-dlg'); d.tabIndex=-1; d.focus();
  const body=d.querySelector('#vsBody'), ctl={ac:null,url:null,lock:null,est:null,sub:undefined};
  let sup={mode:'none'}; try{ sup=await (st.sup||(st.sup=StudioReelExport.support())); }catch(_){}
  d.addEventListener('cancel',e=>{ if(st.busy){ e.preventDefault(); if(ctl.ac) ctl.ac.abort(); } });
  d.addEventListener('close',()=>{ if(ctl.url) setTimeout(()=>URL.revokeObjectURL(ctl.url),60000); });
  const bind=(id,fn)=>{ const b=body.querySelector('#'+id); if(b) b.onclick=fn; };
  function ready(msg){
    const total=dur(), W=st.P.W||1080, H=st.P.H||1920, miss=[...V.missing()], size=`MP4 · ${W}×${H} · ${Math.round(total)} s`;
    const heavy=V.lay().some(x=>x.c.kind==='reel'&&st.reels[x.c.reel]&&st.reels[x.c.reel].M.heavy), hasVid=st.R.clips.some(c=>c.kind==='video');
    const noGo=sup.mode==='none'||miss.length>0||total<=0;
    body.innerHTML=`<h3>Save</h3>
      <button type="button" class="btn" id="vsGo"${noGo?' disabled':''}><span>Save video</span><small><bdi>${size}</bdi></small></button>
      <p class="vd-note" id="vsEst" role="status"></p>
      <p class="vd-note warn" id="vsHeavy"${heavy?'':' hidden'}>This video takes longer to save (3D). Keep Studio open.</p>
      ${sup.mode==='recorder'?`<p class="vd-note">This browser makes the video in real time (<bdi>${Math.round(total)}</bdi> s)${hasVid?' and it may stutter where your clips play':''}. Keep Studio open.</p>`:''}
      ${sup.mode==='none'?'<p class="vd-note" role="status">This browser can’t make videos. Open Studio in Chrome, or in Safari on iOS 17 or newer.</p>':''}
      ${miss.length?`<p class="vd-note" role="status">${miss.length===1?'A file is':'Some files are'} missing on this ${L.devWord()}. Add ${miss.length===1?'it':'them'} again on the timeline first.</p>`:''}
      <button type="button" class="btn ghost" id="vsTeam"><span>Save edits to the team</span><small>Keeps your clips’ order, words and sound settings, not the video.</small></button>
      ${V.hasOwnFiles()?`<p class="vd-note" id="vsOwn">Your clips, photos and sounds stay on this ${L.devWord()}; the team gets your edits.</p>`:''}
      <div class="status" id="vsSt" role="status">${esc(msg||(st.design?(cur()!==st.base?'Not saved to the team':'Saved to the team'):''))}</div>
      <div class="dlg-actions"><button type="button" class="link" id="vsClose">Close</button></div>`;
    bind('vsClose',()=>d.close()); bind('vsGo',()=>exportIt()); bind('vsTeam',async()=>{
      const b=body.querySelector('#vsTeam'), s=body.querySelector('#vsSt'); b.disabled=true; s.textContent='Saving to the team…';
      try{ await teamSave(); s.textContent='Saved to the team'; L.celebrate&&L.celebrate(); }catch(err){ s.textContent=err.message||'Could not save. Try again.'; }
      b.disabled=false; });
    body.querySelector('#vsGo:not(:disabled)')&&body.querySelector('#vsGo').focus({preventScroll:true});
    if(!noGo) estimate(sup,total);
  }
  async function estimate(sup,total){
    const put=()=>{ const e=body.querySelector('#vsEst'), hv=body.querySelector('#vsHeavy'); if(!e) return; const r=ctl.est; if(!r) return;
      e.innerHTML=`<bdi>${estText(r.secs)}</bdi> on this ${L.devWord()}`; if(r.secs>120&&hv) hv.hidden=false; };
    if(ctl.est) return put();
    await wait(60);   // let the sheet paint first
    if(!d.open) return;
    let b={draw:0,prep:0}; try{ b=await benchmark(); } catch(err){ V.fail(err,'bench'); }
    if(!d.open) return;
    const frames=Math.max(1,Math.round(total*fps())), per=b.draw+b.prep; ctl.sub=per>250?2:4;   // a slow device makes 2 sub-frames (still smooth)
    const secs=sup.mode==='recorder'?total:frames*(ctl.sub*per+10)/1000;
    ctl.est={secs,per}; window.__videoBench={draw:b.draw,prep:b.prep,sub:ctl.sub,secs}; put();
  }
  async function exportIt(){
    st.busy=true; ctl.ac=new AbortController(); const sig=ctl.ac.signal;
    body.innerHTML=`<h3>Making your video…</h3>
      <div class="progress"><div class="progress-bar" role="progressbar" aria-label="Making your video" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="vsRole"><i id="vsBar"></i></div><span id="vsTxt" dir="auto">Getting the sound ready…</span></div>
      <p class="vd-note">Keep Studio open until it’s done.</p>
      <div class="dlg-actions"><button type="button" class="mini" id="vsCancel">Cancel</button></div>`;
    bind('vsCancel',()=>{ body.querySelector('#vsCancel').disabled=true; body.querySelector('#vsTxt').textContent='Stopping…'; ctl.ac.abort(); });
    try{ if(navigator.wakeLock) ctl.lock=await navigator.wakeLock.request('screen'); }catch(_){}
    try{
      const audio=await st.P.audio();
      if(sig.aborted) throw Object.assign(new Error('Cancelled'),{name:'AbortError'});
      const t0=performance.now();
      const r=await StudioReelExport.run({reel:st.P,texts:{},audio,signal:sig,sub:ctl.sub,onProgress:(f,i,n)=>{
        const p=Math.round(Math.max(0,Math.min(1,f))*100), bar=body.querySelector('#vsBar'); if(!bar) return;
        bar.style.width=p+'%'; body.querySelector('#vsRole').setAttribute('aria-valuenow',String(p));
        const el=(performance.now()-t0)/1000, left=f>0.03&&el>2?leftText(el*(1-f)/f):'';
        body.querySelector('#vsTxt').innerHTML=`<bdi>Frame ${Math.min(n,(i||0)+1)} of ${n}</bdi>${left?` · <bdi>${left}</bdi>`:''}`; }});
      window.__videoLast={size:r.blob.size,type:r.blob.type,mode:r.mode,frames:r.frames,duration:dur()};
      st.clean=cur(); done(r.blob);
    }catch(err){
      if(sig.aborted||(err&&err.name==='AbortError')){ ready('Stopped. Nothing was saved.'); }
      else { V.fail(err,'export'); failed(err); }
    }finally{ st.busy=false; if(ctl.lock){ try{ ctl.lock.release(); }catch(_){} ctl.lock=null; } }
  }
  function done(blob){
    const name=fileName(), touch=isTouch(); ctl.url=URL.createObjectURL(blob);
    const dl=()=>{ const a=document.createElement('a'); a.href=ctl.url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),1000); };
    body.innerHTML=`<h3>Your video is ready</h3>
      <p class="vd-note"><bdi dir="auto">${esc(name)}</bdi> · <bdi>${mb(blob.size)}</bdi></p>
      <button type="button" class="btn" id="vsOut">${touch?'Share or save':'Download'}</button>
      <div class="dlg-actions"><button type="button" class="link" id="vsClose">Close</button></div>`;
    bind('vsClose',()=>d.close());
    bind('vsOut',async()=>{ L.haptic&&L.haptic('tick');
      if(touch){ const r=await L.shareFiles([new File([blob],name,{type:blob.type||'video/mp4'})]); if(r!==false) return; }
      dl(); });
    body.querySelector('#vsOut').focus({preventScroll:true});
    L.celebrate&&L.celebrate();
  }
  function failed(err){
    body.innerHTML=`<h3>The video did not finish</h3><p class="vd-note">Something went wrong while making it. Your edits are still here. Close other tabs or apps and try again.</p>
      <p class="vd-note" dir="auto">${esc(String(err&&err.message||err).slice(0,120))}</p>
      <button type="button" class="btn" id="vsGo">Try again</button>
      <div class="dlg-actions"><button type="button" class="link" id="vsClose">Close</button></div>`;
    bind('vsClose',()=>d.close()); bind('vsGo',()=>exportIt());
  }
  ready();
}
$('vdSave').addEventListener('click',()=>{ L.haptic&&L.haptic('tick'); openSave(); });

/* ---------- debug panel (?debug=1): everything the owner can screenshot when a preview stays blank ---------- */
function debugPanel(){
  const el=$('vdDbg'); el.hidden=false;
  const rows=async()=>{
    const out=[]; const add=(k,v)=>out.push(`<tr><th>${esc(k)}</th><td dir="ltr">${esc(String(v))}</td></tr>`);
    add('brand',st.B?st.B.id+' · base '+st.B.base:'—'); add('page',location.pathname.split('/').slice(-2).join('/'));
    const cv=$('vdCv'); add('canvas',cv.width+'×'+cv.height+' · dpr '+(window.devicePixelRatio||1));
    add('last draw',st.drawMs.toFixed(1)+' ms'); add('draw error',st.drawErr||'none'); add('load error',st.loadErr||'none');
    for(const id of Object.keys(st.reels)){ const r=st.reels[id]; add('reel '+id,r.base);
      for(const [k,p] of Object.entries((r.M&&r.M.images)||{})){ let s=st.imgStat&&st.imgStat[r.base+p]; add('  image '+k,s||'…'); } }
    for(const [id,m] of Object.entries((st.R&&st.R.media)||{})){ let s='…'; try{ const g=await StudioMedia.get(id); s=g?'ok '+(m.type||'')+' '+(m.dur?m.dur.toFixed(1)+' s':''):'MISSING'; }catch(e){ s='error '+e.message; } add('  media '+id+' '+(m.name||''),s); }
    let ac='—'; try{ const C=window.AudioContext||window.webkitAudioContext; ac=window.__acState||(C?'available':'none'); }catch(_){}
    add('audio',ac); try{ const sp=await StudioReelExport.support(); add('export',sp.mode+(sp.video?' '+sp.video:'')); }catch(e){ add('export','error '+e.message); }
    add('clips',(st.R?st.R.clips.length:0)+' · '+dur().toFixed(1)+' s'); add('log',st.log.slice(-4).join(' | ')||'—');
    el.querySelector('table').innerHTML=out.join('');
  };
  el.innerHTML='<div class="dbg-h"><b>Debug</b><button type="button" class="mini" id="dbgX">Close</button></div><table></table>';
  el.querySelector('#dbgX').onclick=()=>{ el.hidden=true; clearInterval(tm); };
  const tm=setInterval(rows,1500); rows();
  if(window.AudioContext) try{ const a=new AudioContext(); window.__acState=a.state; a.close(); }catch(e){ window.__acState='error '+e.message; }
  st.imgStat={}; Object.values(st.reels).forEach(r=>Object.values((r.M&&r.M.images)||{}).forEach(p=>fetch(r.base+p,{method:'GET'}).then(x=>{ st.imgStat[r.base+p]=x.status+' '+(x.headers.get('content-type')||''); }).catch(e=>{ st.imgStat[r.base+p]='failed: '+e.message; })));
}

/* ---------- start ---------- */
function setLoad(p){ $('vdLoadTxt').textContent='Loading the reel… '+p+'%'; }
async function openProject(recipe,design,draft){
  const r0=StudioProject.fromRecipe(recipe), pr={a:0}, upd=()=>setLoad(Math.round(pr.a*100));
  const P=await StudioProject.create(r0,{brandBase:st.B.base,onProgress:p=>{ pr.a=prog01(p); upd(); }});
  st.P=P; st.R=P.recipe; st.R.clips=st.R.clips||[]; st.R.texts=st.R.texts||[]; st.R.audio=st.R.audio||[]; st.R.media=st.R.media||{};
  await Promise.all([...new Set(st.R.clips.filter(c=>c.kind==='reel').map(c=>c.reel))].map(id=>V.ensureReel(id)));
  st.R.clips.forEach(c=>{ if(c.kind==='reel'&&c.out==null) c.out=st.reels[c.reel].M.duration; });
  try{ const u=P.update(); if(u&&u.then) await u; }catch(err){ V.fail(err,'update'); }
  const first=st.R.clips.find(c=>c.kind==='reel'); st.defName=first&&st.reels[first.reel]?st.reels[first.reel].M.title:'Video';
  if(design){ st.design={id:design.id,name:design.name}; $('vdName').value=design.name; }
  if(draft&&draft.name) $('vdName').value=draft.name;
  $('vdName').placeholder=st.defName;
  $('vdLoad').hidden=true; $('vdErr').hidden=true;
  st.t=0; st.pps=V.defaultPps?V.defaultPps():100; st.sel=null;
  $('vdDur').textContent=fmt(dur());
  stageLayout(); if(V.renderTl) V.renderTl(); if(V.renderBar) V.renderBar();
  paint(); $('vdSafeBtn').hidden=false; setSafe(L.store(SAFE_KEY)===true,true);
  st.base=st.clean=cur(); if(draft&&design&&typeof draft.base==='string') st.base=draft.base;
  H.reset(); H.dirty=false; H.unsaved=false; st.ready=true; syncEmpty(); setPlayUI(); syncStatus();
  st.sup=StudioReelExport.support().catch(()=>({mode:'none'}));
  if(V.afterOpen) V.afterOpen();
  if(q.get('debug')==='1') debugPanel();
}
V.openProject=openProject;
async function start(){
  $('vdErr').hidden=true; $('vdLoad').hidden=false; setLoad(0);
  try{
    st.B=await Studio.useBrand();
    const did=q.get('design'), dr=q.get('draft'); let recipe=null, design=null, rec=null;
    if(dr&&!did){ rec=L.store(draftKey(dr)); if(rec&&rec.video){ st.draftId=dr; } else { rec=null; try{ history.replaceState(null,'',location.pathname); }catch(_){} } }
    if(did){
      if(!(await L.ensureMember('This design is saved with the team. Sign in to open it.'))) return showErr('Sign in with the team password to open this saved video.');
      const C=await L.cloud(); const d=await C.getDesign(did);
      if(d.tool!==TOOL){ st.leaving=true; location.replace(L.toolPage(d.tool)+'?design='+encodeURIComponent(did)); return; }
      design=d; recipe=d.recipe||{};
    } else if(rec){
      recipe=rec.video; if(rec.design) design={id:rec.design,name:rec.name||'Video'};
    } else if(q.get('new')==='1'){
      recipe={v:2,kind:'video',brand:st.B.id,size:[1080,1920],fps:30,clips:[],texts:[],audio:[],media:{}};
    } else {
      const id=q.get('reel')||((st.B.reels||[])[0]||{}).id;
      if(!id){ recipe={v:2,kind:'video',brand:st.B.id,size:[1080,1920],fps:30,clips:[],texts:[],audio:[],media:{}}; }
      else recipe={v:1,kind:'reel',brand:st.B.id,reel:id,texts:{},mix:{},duck:true};
    }
    await openProject(recipe,design,rec);
    if(!did&&!dr&&!q.get('new')&&!q.get('reel')&&!RENDER) offerResume();
  }catch(err){ st.loadErr=String(err&&err.message||err); V.log('load',st.loadErr); console.error(err); showErr('The video could not be opened. Check your connection and try again. ('+st.loadErr+')'); if(q.get('debug')==='1'&&$('vdDbg').hidden) debugPanel(); }
}
V.start=start;
$('vdRetry').addEventListener('click',start);
$('vdName').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
new ResizeObserver(stageLayout).observe($('vdWrap'));
window.__video=()=>({t:st.t,playing:st.playing,ready:st.ready,design:st.design&&st.design.id,duration:dur(),clips:st.R?st.R.clips.length:0,recipe:st.R?clone(st.R):null,sel:st.sel,pps:st.pps,h:!!st.h,sheet:st.sheet&&st.sheet.name,drawErr:st.drawErr,hist:{i:H.i,n:H.stack.length},draftId:st.draftId,cvw:$('vdCv').width});
if(RENDER){ $('vdLoad').hidden=true; }   // Saved's hidden renderer never opens videos; nothing heavy here
else document.addEventListener('DOMContentLoaded',()=>start());
stageLayout();
})();

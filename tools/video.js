/* Video editor: opens a coded reel from the brand kit (brands/<brand>/reels/<id>/), lets you change the words and the sound mix,
   plays it exactly as it will be saved, and makes the MP4 (assets/reel*.js do the drawing, the mixing and the encoding).
   Brand-agnostic: reels, words and phrases come from the brand kit. A saved video is a normal Saved design (tool 'video')
   that holds settings only (docs/reels.md). */
(function(){
const L=Studio.lab, esc=L.esc, $=id=>document.getElementById(id);
const TOOL='video', SAFE_KEY='studio:video:safe';
const q=new URLSearchParams(location.search);
const st={B:null,reel:null,M:null,mix:null,audioErr:'',texts:{},orig:{},settings:{mix:{},duck:true},t:0,playing:false,h:null,off:0,p0:0,t0:0,raf:0,
  solo:null,design:null,base:'',clean:'',ready:false,busy:false,leaving:false,tab:'text',dragging:false,sup:null,safe:false,last:0};
const clone=o=>JSON.parse(JSON.stringify(o));
const svg=(d,s,x)=>`<svg width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${x||''}>${d}</svg>`;
const I={
  x:svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',18),
  warn:svg('<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',18),
  vol:svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/>',22),
  mute:svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',22),
  play:svg('<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',20,' fill="currentColor"')
};
const fmt=s=>{ s=Math.max(0,s||0); const m=Math.floor(s/60), r=Math.floor((s-m*60)*10+1e-6)/10; return m+':'+(r<10?'0':'')+r.toFixed(1); };
const isTouch=()=>matchMedia('(pointer:coarse)').matches;
const prog01=p=>{ if(typeof p==='number') return Math.max(0,Math.min(1,p>1?p/100:p)); if(p&&p.total) return Math.max(0,Math.min(1,p.loaded/p.total)); return 0; };
const slug=s=>String(s||'').trim().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,60);
const nameNow=()=>$('vdName').value.trim()||(st.M?st.M.title:'')||'Video';
const cur=()=>JSON.stringify([st.texts,st.settings]);
const dur=()=>st.M?st.M.duration:10;
const fps=()=>st.M?st.M.fps:30;
const cfg=id=>st.settings.mix[id]||(st.settings.mix[id]={db:0,mute:false});
const rowDb=id=>{ const c=st.settings.mix[id]; return c&&typeof c.db==='number'?c.db:0; };
const rowMute=id=>!!(st.settings.mix[id]&&st.settings.mix[id].mute);
const dbText=db=>db===0?'0 dB':(db>0?'+'+db:'−'+Math.abs(db))+' dB';

/* ---------- stage: preview size, drawing ---------- */
function layout(){
  const wrap=$('vdWrap'), cs=getComputedStyle(wrap), px=v=>parseFloat(v)||0;
  const aw=wrap.clientWidth-px(cs.paddingLeft)-px(cs.paddingRight), ah=wrap.clientHeight-px(cs.paddingTop)-px(cs.paddingBottom);
  const W=st.M?st.M.size[0]:1080, H=st.M?st.M.size[1]:1920, asp=W/H;
  if(aw<=0||ah<=0) return;
  const w=Math.max(60,Math.floor(Math.min(aw,ah*asp))), h=Math.round(w/asp), pv=$('vdPv');
  pv.style.width=w+'px'; pv.style.height=h+'px';
  const cv=$('vdCv'), dpr=Math.min(3,window.devicePixelRatio||1), cw=Math.min(W,Math.round(w*dpr)), ch=Math.round(cw/asp);
  if(cv.width!==cw||cv.height!==ch){ cv.width=cw; cv.height=ch; }
  fitLabels(); drawNow();
}
function drawNow(){
  if(!st.reel) return;
  try{ st.reel.draw($('vdCv').getContext('2d'),Math.min(st.t,dur()-0.5/fps()),{texts:st.texts}); }
  catch(err){ if(!st.drawErr){ st.drawErr=true; console.error('draw failed',err); showError('The reel could not be drawn on this '+L.devWord()+'. ('+(err&&err.message||err)+')'); } }
}
function paint(){
  drawNow();
  const t=st.t, d=dur();
  $('vdNow').textContent=fmt(t); $('vdHead').style.left=(t/d*100)+'%';
  const tr=$('vdTrack'), now=performance.now();
  if(!st.playing||now-st.last>400){ st.last=now; tr.setAttribute('aria-valuenow',t.toFixed(2)); tr.setAttribute('aria-valuetext',t.toFixed(1)+' seconds of '+d.toFixed(0)); }
}
function setT(t,keepPlaying){
  t=Math.max(0,Math.min(dur(),t)); const was=st.playing;
  if(was&&!keepPlaying) pause();
  st.t=t; paint();
  if(was&&keepPlaying){ stopAudio(); startClock(t); }
}

/* ---------- playback: the audio clock is the master when there is audio ---------- */
const allMuted=()=>!st.mix||st.mix.rows.every(r=>rowMute(r.id));
function stopAudio(){ if(st.h){ try{ st.h.stop(); }catch(_){} st.h=null; } }
function stopSolo(){ if(st.solo){ try{ st.solo.stop(); }catch(_){} st.solo=null; } document.querySelectorAll('.vd-solo.on').forEach(b=>b.classList.remove('on')); }
function startClock(from){
  st.t0=from; st.p0=performance.now(); st.off=0; st.h=null;
  if(st.mix&&!allMuted()){ try{ st.h=st.mix.play(clone(st.settings),from); }catch(err){ console.warn('sound failed',err); st.h=null; } }
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
  let t=curT();
  if(t>=dur()){ st.t=dur(); pause(); paint(); return; }
  st.t=t; paint(); st.raf=requestAnimationFrame(tickFrame);
}
function play(){
  if(!st.ready||st.busy) return;
  stopSolo();
  if(st.t>=dur()-0.5/fps()) st.t=0;
  st.playing=true; startClock(st.t); setPlayUI(); cancelAnimationFrame(st.raf); st.raf=requestAnimationFrame(tickFrame);
}
function pause(){
  if(!st.playing) return;
  st.playing=false; cancelAnimationFrame(st.raf); stopAudio(); setPlayUI();
}
const toggle=()=>{ st.playing?pause():play(); };
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ pause(); stopSolo(); } });

/* ---------- timeline ---------- */
function buildTrack(){
  const d=dur();
  $('vdSegs').innerHTML=(st.M.scenes||[]).map(s=>`<div class="vd-seg" title="${esc(s.label)}" style="left:${s.start/d*100}%;width:${(s.end-s.start)/d*100}%"><span>${esc(s.label)}</span></div>`).join('');
  $('vdDur').textContent=fmt(d); $('vdTrack').setAttribute('aria-valuemax',String(d));
  renderMarks(); fitLabels();
}
function fitLabels(){
  const tr=$('vdTrack'), wide=tr.clientWidth>=480;
  tr.querySelectorAll('.vd-seg').forEach(seg=>{ const sp=seg.firstElementChild; if(!sp) return; sp.hidden=false; sp.hidden=!wide||sp.scrollWidth>seg.clientWidth-8; });
}
function renderMarks(){
  const m=$('vdMarks'); if(!st.mix){ m.hidden=true; return; }
  m.hidden=st.tab!=='sound'; const d=dur();
  m.innerHTML=st.mix.rows.filter(r=>r.kind!=='music').flatMap(r=>(r.hits||[]).map(h=>`<i class="${rowMute(r.id)?'off':''}" style="left:${h/d*100}%"></i>`)).join('');
}
(function(){
  const tr=$('vdTrack'); let id=null, was=false;
  const at=e=>{ const r=tr.getBoundingClientRect(); const f=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)); return Math.round(f*dur()*fps())/fps(); };
  tr.addEventListener('pointerdown',e=>{ if(!st.ready||e.button>0) return; id=e.pointerId; tr.setPointerCapture(id); was=st.playing; if(was) pause(); stopSolo(); st.dragging=true; st.t=at(e); paint(); e.preventDefault(); tr.focus({preventScroll:true}); });
  tr.addEventListener('pointermove',e=>{ if(id!==e.pointerId) return; st.t=at(e); paint(); });
  const up=e=>{ if(id!==e.pointerId) return; id=null; st.dragging=false; if(was){ was=false; play(); } };
  tr.addEventListener('pointerup',up); tr.addEventListener('pointercancel',up);
  tr.addEventListener('keydown',e=>{ if(!st.ready) return; let d=0;
    if(e.key==='ArrowRight'||e.key==='ArrowUp') d=1; else if(e.key==='ArrowLeft'||e.key==='ArrowDown') d=-1;
    if(d){ e.preventDefault(); const step=e.shiftKey?1:1/fps(); setT(Math.round((st.t+d*step)*fps())/fps(),true); return; }
    if(e.key==='Home'){ e.preventDefault(); setT(0,true); } else if(e.key==='End'){ e.preventDefault(); setT(dur()); }
    else if(e.key===' '||e.code==='Space'||e.key==='Enter'){ e.preventDefault(); toggle(); } });
})();
document.addEventListener('keydown',e=>{ if((e.key===' '||e.code==='Space')&&!e.target.closest('input,textarea,button,select,a,[role=tab],#vdTrack')&&!document.querySelector('dialog[open]')&&st.ready){ e.preventDefault(); toggle(); } });
$('vdPlay').addEventListener('click',()=>{ L.haptic&&L.haptic('tick'); toggle(); });

/* ---------- Safe zones: Instagram's covered areas, only ever drawn on top in the editor ---------- */
function setSafe(on,keep){
  st.safe=!!on; $('vdSafe').hidden=!on; const b=$('vdSafeBtn'); b.setAttribute('aria-pressed',String(!!on));
  if(!keep) L.store(SAFE_KEY,!!on);
}
$('vdSafeBtn').addEventListener('click',()=>setSafe(!st.safe));

/* ---------- tabs ---------- */
function switchTab(name,focus){
  st.tab=name;
  document.querySelectorAll('.vd-tab').forEach(b=>{ const on=b.dataset.tab===name; b.setAttribute('aria-selected',String(on)); b.tabIndex=on?0:-1; if(on&&focus) b.focus(); });
  $('paneText').hidden=name!=='text'; $('paneSound').hidden=name!=='sound';
  if(name!=='sound') stopSolo();
  renderMarks();
}
$('vdTabs').addEventListener('click',e=>{ const b=e.target.closest('.vd-tab'); if(b) switchTab(b.dataset.tab); });
$('vdTabs').addEventListener('keydown',e=>{ if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return; e.preventDefault(); switchTab(st.tab==='text'?'sound':'text',true); });

/* ---------- Text tab ---------- */
const sid=id=>String(id).replace(/[^\w-]/g,'_');
function buildText(){
  $('paneText').innerHTML=st.M.texts.map(s=>`<div class="vd-slot" data-id="${esc(s.id)}">
    <div class="vd-lblrow"><label for="vdT_${sid(s.id)}">${esc(s.label)}</label><span class="small">Appears at <bdi>${fmt(s.in!=null?s.in:s.show)}</bdi></span></div>
    <div class="vd-field"><input id="vdT_${sid(s.id)}" type="text" dir="auto" maxlength="60" enterkeyhint="done" autocomplete="off" spellcheck="false" value="${esc(st.texts[s.id])}"><button type="button" class="vd-clear" data-clear aria-label="Clear ${esc(s.label)}">${I.x}</button></div>
    <div class="vd-warn" data-warn role="status"></div>
    <p class="small vd-hint" data-hint dir="auto"></p>
    <div class="vd-links"><button type="button" class="link" data-orig>Use the original words</button><button type="button" class="link" data-phrase>Pick a phrase</button></div>
  </div>`).join('');
  st.M.texts.forEach(s=>updateSlot(s.id));
}
function updateSlot(id){
  const el=document.querySelector(`.vd-slot[data-id="${CSS.escape(id)}"]`); if(!el) return;
  const slot=st.M.texts.find(s=>s.id===id), v=st.texts[id]||'', info=(st.reel.textInfo(st.texts)||{})[id]||{};
  el.querySelector('[data-warn]').innerHTML=info.warn?I.warn+'<span>Too long for its spot: the words get smaller to fit. Shorten them to keep them big.</span>':'';
  const inp=el.querySelector('input'); inp.parentElement.dataset.d=inp.matches(':dir(rtl)')?'rtl':'ltr';
  el.querySelector('[data-clear]').hidden=!v;
  el.querySelector('[data-orig]').hidden=v===slot.value;
  el.querySelector('[data-hint]').textContent=v?'':'Nothing shows here while this is empty.';
}
const paneText=$('paneText');
paneText.addEventListener('input',e=>{ const inp=e.target.closest('input'); if(!inp) return; const id=inp.closest('.vd-slot').dataset.id; st.texts[id]=inp.value; updateSlot(id); changed(); });
paneText.addEventListener('focusin',e=>{ const inp=e.target.closest('input'); if(!inp) return; const slot=st.M.texts.find(s=>s.id===inp.closest('.vd-slot').dataset.id); if(slot){ pause(); setT(slot.show!=null?slot.show:slot.in||0); } });
paneText.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('input')){ e.preventDefault(); e.target.blur(); } });
function setWords(id,v){ st.texts[id]=v; const inp=document.getElementById('vdT_'+sid(id)); if(inp) inp.value=v; updateSlot(id); changed(); }
paneText.addEventListener('click',e=>{
  const slotEl=e.target.closest('.vd-slot'); if(!slotEl) return; const id=slotEl.dataset.id, slot=st.M.texts.find(s=>s.id===id);
  if(e.target.closest('[data-clear]')){ setWords(id,''); slotEl.querySelector('input').focus(); }
  else if(e.target.closest('[data-orig]')){ setWords(id,slot.value); pause(); setT(slot.show!=null?slot.show:0); }
  else if(e.target.closest('[data-phrase]')) pickPhrase(id,slot); });
function pickPhrase(id,slot){
  pause();
  const list=[{v:slot.value,tag:'Original'}], seen=new Set([slot.value]);
  ((st.B.phrases&&st.B.phrases.headlines)||[]).forEach(p=>{ if(!seen.has(p)){ seen.add(p); list.push({v:p}); } });
  const d=L.dialog(`<div class="dlg-body"><h3>Pick a phrase</h3><div class="vd-phr">${list.map((p,i)=>`<button type="button" data-i="${i}"><span dir="auto">${esc(p.v)}</span>${p.tag?`<small>${esc(p.tag)}</small>`:''}</button>`).join('')}</div>
    <div class="dlg-actions"><button type="button" class="mini" id="phX">Close</button></div></div>`);
  d.tabIndex=-1; d.querySelector('#phX').onclick=()=>d.close();
  d.querySelector('.vd-phr').onclick=e=>{ const b=e.target.closest('[data-i]'); if(!b) return; d.close(); setWords(id,list[+b.dataset.i].v); setT(slot.show!=null?slot.show:0); };
}

/* ---------- Sound tab ---------- */
function buildSound(){
  const p=$('paneSound'), credits=st.M.credits?`<p class="vd-credits" dir="auto">${esc(st.M.credits)}</p>`:'';
  if(!st.mix){ p.innerHTML=`<p class="small vd-nosound" role="status">The sounds could not be loaded${st.audioErr?' ('+esc(st.audioErr)+')':''}, so the preview is silent and a saved video would have no sound. Check your connection and reload this page.</p>${credits}`; return; }
  const rows=[...st.mix.rows].sort((a,b)=>(a.kind==='music'?0:1)-(b.kind==='music'?0:1));
  p.innerHTML=`<label class="vd-duck"><span class="txt"><b>Duck the music under big sounds</b><small>The music dips when the big sounds hit</small></span><input type="checkbox" class="switch" role="switch" id="vdDuck"${st.settings.duck?' checked':''}></label>
    <div class="vd-rows">${rows.map(r=>{ const n=(r.hits||[]).length, db=rowDb(r.id), m=rowMute(r.id);
      return `<div class="vd-row${m?' muted':''}" data-id="${esc(r.id)}">
      <div class="vd-r1"><button type="button" class="vd-name-btn" data-jump title="Go to this sound"><span class="n">${esc(r.label)}</span>${n?`<span class="at"><bdi>${fmt(Math.min(...r.hits))}</bdi>${n>1?' ×'+n:''}</span>`:''}</button><span class="vd-val"><bdi data-val>${m?'Muted':dbText(db)}</bdi></span></div>
      <div class="vd-r2"><button type="button" class="icon-btn vd-mute" data-mute aria-pressed="${m}" aria-label="Mute ${esc(r.label)}">${m?I.mute:I.vol}</button>
        <input type="range" min="-24" max="6" step="1" value="${db}" data-db aria-label="${esc(r.label)} volume" aria-valuetext="${dbText(db)}"${m?' disabled':''}>
        <button type="button" class="icon-btn vd-solo" data-solo aria-label="Play ${esc(r.label)} on its own">${I.play}</button></div></div>`; }).join('')}</div>
    <div class="vd-foot"><button type="button" class="link" id="vdReset">Reset to original mix</button>${credits}</div>`;
  refreshReset();
}
function refreshReset(){ const b=document.getElementById('vdReset'); if(b&&st.mix) b.disabled=st.mix.isDefault(st.settings); }
let restartT=0;
function soundChanged(){ changed(); clearTimeout(restartT); restartT=setTimeout(()=>{ if(st.playing){ const t=st.t; stopAudio(); startClock(t); } },120); }
const paneSound=$('paneSound');
paneSound.addEventListener('change',e=>{ if(e.target.id==='vdDuck'){ st.settings.duck=e.target.checked; soundChanged(); } });
paneSound.addEventListener('input',e=>{ const r=e.target.closest('[data-db]'); if(!r) return; const row=r.closest('.vd-row'), id=row.dataset.id, v=+r.value;
  cfg(id).db=v; r.setAttribute('aria-valuetext',dbText(v)); row.querySelector('[data-val]').textContent=dbText(v); soundChanged(); });
paneSound.addEventListener('click',e=>{
  const row=e.target.closest('.vd-row');
  if(row){ const id=row.dataset.id, r=st.mix.rows.find(x=>x.id===id);
    if(e.target.closest('[data-mute]')){ const c=cfg(id); c.mute=!c.mute; const m=c.mute; row.classList.toggle('muted',m);
      const b=row.querySelector('[data-mute]'); b.setAttribute('aria-pressed',String(m)); b.innerHTML=m?I.mute:I.vol;
      row.querySelector('[data-db]').disabled=m; row.querySelector('[data-val]').textContent=m?'Muted':dbText(c.db||0); soundChanged(); }
    else if(e.target.closest('[data-jump]')){ if(r&&r.hits&&r.hits.length){ pause(); stopSolo(); setT(Math.max(0,Math.min(...r.hits)-0.3)); } }
    else if(e.target.closest('[data-solo]')){ const b=e.target.closest('[data-solo]'), was=b.classList.contains('on'); pause(); stopSolo();
      if(!was&&st.mix){ try{ st.solo=st.mix.solo(id,clone(st.settings)); b.classList.add('on'); }catch(err){ console.warn(err); } } }
    return; }
  if(e.target.id==='vdReset'&&st.mix){ stopSolo(); st.settings=st.mix.defaults(); buildSound(); soundChanged(); } });

/* ---------- changes, status, leaving ---------- */
function syncStatus(){ $('vdStatus').textContent=st.design?(cur()!==st.base?'Not saved to the team':'Saved to the team'):''; }
function changed(){ syncStatus(); refreshReset(); renderMarks(); if(!st.playing) paint(); }
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
addEventListener('beforeunload',e=>{ if(!st.leaving&&(st.busy||(st.ready&&cur()!==st.clean))){ e.preventDefault(); e.returnValue=''; } });
addEventListener('pagehide',()=>{ stopAudio(); stopSolo(); });

/* ---------- team save ---------- */
function thumbBlob(){
  const c=document.createElement('canvas'); c.width=360; c.height=640;
  try{ st.reel.draw(c.getContext('2d'),st.M.poster!=null?st.M.poster:dur()/2,{texts:st.texts}); }catch(err){ console.error(err); }
  return L.canvasBlob(c,'image/jpeg',.85).finally(()=>{ c.width=c.height=0; });
}
async function teamSave(){
  const C=await L.cloud();
  if(!(await L.ensureMember('Saved designs go to the team, so anyone on the team can find and reuse them.'))) throw new Error('Not saved to the team: sign in first.');
  const name=nameNow(), recipe={v:1,kind:'reel',brand:st.B.id,reel:st.M.id,texts:{...st.texts},mix:clone(st.settings.mix),duck:!!st.settings.duck};
  const id=await C.saveDesign({id:st.design?st.design.id:null,brand:st.B.id,tool:TOOL,name,kind:'design',recipe,photos:[],thumb:await thumbBlob()});
  st.design={id,name}; st.base=cur(); history.replaceState(null,'',location.pathname+'?design='+id); syncStatus();
  return id;
}

/* ---------- Save sheet ---------- */
function fileName(){ const d=new Date(), z=n=>String(n).padStart(2,'0'); return (slug($('vdName').value)||slug(st.M.title)||'video')+' '+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+'.mp4'; }
const mb=n=>n>=1e6?(n/1e6).toFixed(1)+' MB':Math.max(1,Math.round(n/1e3))+' kB';
async function openSave(){
  if(!st.ready||st.busy) return;
  pause(); stopSolo();
  const M=st.M, d=L.dialog('<div class="dlg-body vd-save-d" id="vsBody"></div>','vd-dlg'); d.tabIndex=-1; d.focus();
  const body=d.querySelector('#vsBody'), ctl={ac:null,url:null,lock:null};
  let sup={mode:'none'}; try{ sup=await (st.sup||(st.sup=StudioReelExport.support())); }catch(_){}
  d.addEventListener('cancel',e=>{ if(st.busy){ e.preventDefault(); if(ctl.ac) ctl.ac.abort(); } });
  d.addEventListener('close',()=>{ if(ctl.url) setTimeout(()=>URL.revokeObjectURL(ctl.url),60000); });
  const bind=(id,fn)=>{ const b=body.querySelector('#'+id); if(b) b.onclick=fn; };
  const size=`MP4 · ${M.size[0]}×${M.size[1]} · ${Math.round(M.duration)} s`;
  function ready(msg){
    body.innerHTML=`<h3>Save</h3>
      <button type="button" class="btn" id="vsGo"${sup.mode==='none'?' disabled':''}><span>Save video</span><small><bdi>${size}</bdi></small></button>
      ${M.heavy?'<p class="vd-note">This reel is heavy (3D): saving takes longer.</p>':''}
      ${sup.mode==='recorder'?`<p class="vd-note">This browser makes the video in real time (<bdi>${Math.round(M.duration)}</bdi> s). Keep Studio open.</p>`:''}
      ${sup.mode==='none'?'<p class="vd-note" role="status">This browser can’t make videos. Open Studio in Chrome, or in Safari on iOS 17 or newer.</p>':''}
      ${!st.mix?'<p class="vd-note">The sounds did not load, so this video would be silent.</p>':''}
      <button type="button" class="btn ghost" id="vsTeam"><span>Save edits to the team</span><small>Keeps your words and your mix, not the video.</small></button>
      <div class="status" id="vsSt" role="status">${esc(msg||(st.design?(cur()!==st.base?'Not saved to the team':'Saved to the team'):''))}</div>
      <div class="dlg-actions"><button type="button" class="link" id="vsClose">Close</button></div>`;
    bind('vsClose',()=>d.close()); bind('vsGo',()=>exportIt()); bind('vsTeam',async()=>{
      const b=body.querySelector('#vsTeam'), s=body.querySelector('#vsSt'); b.disabled=true; s.textContent='Saving to the team…';
      try{ await teamSave(); s.textContent='Saved to the team'; L.celebrate&&L.celebrate(); }catch(err){ s.textContent=err.message||'Could not save. Try again.'; }
      b.disabled=false; });
    body.querySelector('#vsGo:not(:disabled)')&&body.querySelector('#vsGo').focus({preventScroll:true});
  }
  async function exportIt(){
    st.busy=true; ctl.ac=new AbortController(); const sig=ctl.ac.signal;
    body.innerHTML=`<h3>Making your video…</h3>
      <div class="progress"><div class="progress-bar" role="progressbar" aria-label="Making your video" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="vsRole"><i id="vsBar"></i></div><span id="vsTxt" dir="auto">Getting the sound ready…</span></div>
      <p class="vd-note">Keep Studio open until it’s done.</p>
      <div class="dlg-actions"><button type="button" class="mini" id="vsCancel">Cancel</button></div>`;
    bind('vsCancel',()=>{ body.querySelector('#vsCancel').disabled=true; body.querySelector('#vsTxt').textContent='Stopping…'; ctl.ac.abort(); });
    try{ if(navigator.wakeLock) ctl.lock=await navigator.wakeLock.request('screen'); }catch(_){}
    const settings=clone(st.settings), texts={...st.texts};
    try{
      const audio=st.mix?await st.mix.render(settings):null;
      if(sig.aborted) throw Object.assign(new Error('Cancelled'),{name:'AbortError'});
      const r=await StudioReelExport.run({reel:st.reel,texts,audio,mix:st.mix,settings,signal:sig,onProgress:(f,i,n)=>{
        const p=Math.round(Math.max(0,Math.min(1,f))*100), bar=body.querySelector('#vsBar'); if(!bar) return;
        bar.style.width=p+'%'; body.querySelector('#vsRole').setAttribute('aria-valuenow',String(p));
        body.querySelector('#vsTxt').innerHTML=`<bdi>Frame ${Math.min(n,(i||0)+1)} of ${n}</bdi>`; }});
      window.__videoLast={size:r.blob.size,type:r.blob.type,mode:r.mode,frames:r.frames};
      st.clean=cur(); done(r.blob);
    }catch(err){
      if(sig.aborted||(err&&err.name==='AbortError')){ ready('Stopped. Nothing was saved.'); }
      else { console.error('export failed',err); failed(); }
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
  function failed(){
    body.innerHTML=`<h3>The video did not finish</h3><p class="vd-note">Something went wrong while making it. Your words and your mix are still here. Close other tabs or apps and try again.</p>
      <button type="button" class="btn" id="vsGo">Try again</button>
      <div class="dlg-actions"><button type="button" class="link" id="vsClose">Close</button></div>`;
    bind('vsClose',()=>d.close()); bind('vsGo',()=>exportIt());
  }
  ready();
}
$('vdSave').addEventListener('click',()=>{ L.haptic&&L.haptic('tick'); openSave(); });

/* ---------- start ---------- */
function setLoad(p){ $('vdLoadTxt').textContent='Loading the reel… '+p+'%'; }
function showError(msg){ $('vdLoad').hidden=true; $('vdErr').hidden=false; $('vdErrTxt').textContent=msg; }
async function openReel(id,design){
  const base=st.B.base+'reels/'+id+'/';
  const res=await fetch(base+'reel.json'); if(!res.ok) throw new Error('missing');
  const M0=await res.json(), pr={a:0,b:0}, upd=()=>setLoad(Math.round((pr.a+pr.b)/2*100));
  const ap=(window.StudioReelAudio?StudioReelAudio.load(M0,base,{onProgress:p=>{ pr.b=prog01(p); upd(); }}):Promise.reject(new Error('no audio engine')))
    .catch(err=>{ console.warn('sound failed',err); st.audioErr=String(err&&err.message||err).slice(0,80); pr.b=1; upd(); return null; });
  const rp=StudioReel.load(base,{onProgress:p=>{ pr.a=prog01(p); upd(); }});
  const [reel,mix]=await Promise.all([rp,ap]);
  st.reel=reel; st.M=reel.M; st.mix=mix;
  st.orig={}; st.M.texts.forEach(s=>{ st.orig[s.id]=s.value; }); st.texts={...st.orig};
  st.settings=mix?clone(mix.defaults()):{mix:{},duck:true};
  if(design){ const r=design.recipe||{};
    Object.keys(r.texts||{}).forEach(k=>{ if(k in st.texts&&typeof r.texts[k]==='string') st.texts[k]=r.texts[k]; });
    if(mix){ mix.rows.forEach(row=>{ const sv=(r.mix||{})[row.id]; if(sv) st.settings.mix[row.id]=Object.assign({},st.settings.mix[row.id],sv); }); if(typeof r.duck==='boolean') st.settings.duck=r.duck; }
    else st.settings={mix:r.mix||{},duck:r.duck!==false};
    st.design={id:design.id,name:design.name}; $('vdName').value=design.name; }
  $('vdName').placeholder=st.M.title;
  $('vdLoad').hidden=true; $('vdErr').hidden=true;
  buildText(); buildSound(); buildTrack(); layout();
  st.t=0; paint(); $('vdSafeBtn').hidden=false; setSafe(L.store(SAFE_KEY)===true,true);
  st.base=st.clean=cur(); st.ready=true; $('vdPlay').disabled=false; $('vdSave').disabled=false; setPlayUI(); syncStatus();
  st.sup=StudioReelExport.support().catch(()=>({mode:'none'}));
}
async function start(){
  $('vdErr').hidden=true; $('vdLoad').hidden=false; setLoad(0);
  try{
    st.B=await Studio.useBrand();
    let id=q.get('reel'), design=null;
    const did=q.get('design');
    if(did){
      if(!(await L.ensureMember('This design is saved with the team. Sign in to open it.'))) return showError('Sign in with the team password to open this saved video.');
      const C=await L.cloud(); const d=await C.getDesign(did);
      if(d.tool!==TOOL){ st.leaving=true; location.replace(L.toolPage(d.tool)+'?design='+encodeURIComponent(did)); return; }
      design=d; id=(d.recipe||{}).reel;
    }
    id=id||((st.B.reels||[])[0]||{}).id;
    if(!id) return showError('There is no reel in this brand kit yet.');
    await openReel(id,design);
  }catch(err){ console.error(err); showError('The reel could not be opened. Check your connection and try again. ('+(err&&err.message||err)+')'); }
}
$('vdRetry').addEventListener('click',start);
$('vdName').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
new ResizeObserver(layout).observe($('vdWrap'));
new ResizeObserver(fitLabels).observe($('vdTrack'));
window.__video=()=>({t:st.t,playing:st.playing,ready:st.ready,design:st.design&&st.design.id,texts:{...st.texts},settings:clone(st.settings),audio:!!st.mix,h:!!st.h});
layout();
if(q.get('render')==='1'){ $('vdLoad').hidden=true; }   // Saved's hidden renderer never opens videos; nothing heavy here
else start();
})();

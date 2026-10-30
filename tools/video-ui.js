/* Video editor, controls: the bottom bar (Add / Text / Sound), the context bar for whatever is selected, and every sheet.
   Sheets sit over the timeline only, so the preview stays visible above while you edit. */
(function(){
const V=window.VD, st=V.st, L=V.L, $=V.$, esc=V.esc, I=V.I, clamp=V.clamp, fmt=V.fmt, sec=V.sec;
const bar=$('bar'), sheetEl=$('vdSheet'), shB=$('vdShB'), shT=$('vdShT'), main=$('vdMain');
const desk=()=>matchMedia('(min-width:900px)').matches;
const dbText=db=>db===0?'0 dB':(db>0?'+'+db:'−'+Math.abs(db))+' dB';
const sid=id=>String(id).replace(/[^\w-]/g,'_');
const brandInk=()=>{ const c=(L.brand()||{}).colors||{}; return c.ink||'#111111'; };
const brandPaper=()=>{ const c=(L.brand()||{}).colors||{}; return c.paper||'#FFFFFF'; };

/* ---------- the bar ---------- */
const bb=(attrs,icon,label,extra)=>`<button type="button" class="vd-bb" ${attrs}${extra||''}>${icon}<span>${label}</span></button>`;
V.renderBar=function(){
  if(!st.ready&&!st.R) return;
  const s=st.sel, it=V.selItem(), open=st.sheet&&st.sheet.name;
  if(!s||!it){
    bar.classList.remove('ctx');
    bar.innerHTML=bb('data-open="add"',I.plus,'Add',open==='add'||open==='reels'?' aria-pressed="true"':' aria-pressed="false"')+bb('data-open="text"',I.type,'Text',open==='text'?' aria-pressed="true"':' aria-pressed="false"')+bb('data-open="sound"',I.music,'Sound',open==='sound'?' aria-pressed="true"':' aria-pressed="false"');
    return;
  }
  bar.classList.add('ctx');
  const lay=V.lay(), x=s.kind==='clip'?lay.find(l=>l.c.id===s.id):null, t=st.t;
  const canSplit=s.kind==='clip'?(x&&t-x.start>=0.2&&x.end-t>=0.2):s.kind==='audio'?(t-it.start>=0.2&&it.start+(it.out-it.in)-t>=0.2):false;
  const dis=(c,why)=>c?'':' disabled aria-disabled="true"';
  const on=n=>open===n?' aria-pressed="true"':'';
  let h=`<button type="button" class="vd-bb done" data-do="done">${I.x.replace('width="18" height="18"','width="22" height="22"')}<span>Done</span></button>`;
  if(s.kind==='clip'){
    const miss=it.media&&V.missing().has(it.media), i=x.i, n=lay.length;
    if(miss) h+=`<label class="vd-bb again" tabindex="0">${I.upload}<span>Add again</span><input type="file" accept="${it.kind==='photo'?'image/*':'video/*'}" data-again="${esc(it.media)}"></label>`;
    if(it.kind==='reel') h+=bb('data-open="words"',I.type,'Words',on('words'))+bb('data-open="mix"',I.mix,'Mix',on('mix'));
    if(it.kind==='video') h+=bb('data-open="vol"',I.vol,'Volume',on('vol'));
    if(it.kind==='photo') h+=bb('data-open="len"',I.clock,'Length',on('len'))+bb('data-open="zoom"',I.zoom,'Zoom',on('zoom'));
    h+=bb('data-do="split"',I.scissors,'Split',dis(canSplit))+bb('data-do="earlier" aria-label="Move earlier"',I.left,'Earlier',dis(i>0))+bb('data-do="later" aria-label="Move later"',I.right,'Later',dis(i<n-1))+bb('data-do="del"',I.trash,'Delete');
  } else if(s.kind==='text'){
    h+=bb('data-open="edit"',I.pencil,'Edit',on('edit'))+bb('data-do="dup"',I.copy,'Duplicate')+bb('data-do="del"',I.trash,'Delete');
  } else {
    h+=bb('data-open="vol"',I.vol,'Volume',on('vol'))+bb('data-open="fades"',I.fade,'Fades',on('fades'))+bb('data-do="split"',I.scissors,'Split',dis(canSplit))+bb('data-do="del"',I.trash,'Delete');
  }
  bar.innerHTML=h;
};
bar.addEventListener('click',e=>{
  const o=e.target.closest('[data-open]'), a=e.target.closest('[data-do]');
  if(o){ const n=o.dataset.open; if(st.sheet&&(st.sheet.name===n||(n==='add'&&st.sheet.name==='reels'))&&!desk()) V.closeSheet(); else V.openSheet(n); }
  else if(a&&!a.disabled) act(a.dataset.do);
});
bar.addEventListener('change',e=>{ const f=e.target.closest('[data-again]'); if(f&&f.files[0]) replaceMedia(f.dataset.again,f.files[0]); f&&(f.value=''); });

/* ---------- editing actions ---------- */
/* the words a new text layer starts with: the brand kit's own "write here" phrase (approved wording), else a neutral default */
const newWords=()=>(st.B&&st.B.phrases&&st.B.phrases.write)||'Your text';
let toastT=0;
V.toast=(msg,undo)=>{ let el=document.getElementById('vdToast'); if(!el){ el=document.createElement('div'); el.id='vdToast'; el.className='vd-toast'; el.setAttribute('role','status'); main.appendChild(el); }
  el.innerHTML=`<span>${esc(msg)}</span>${undo?'<button type="button" class="link" data-undo>Undo</button>':''}`; el.hidden=false;
  if(undo) V.hist.toastAt=V.hist.i;
  el.onclick=e=>{ if(e.target.closest('[data-undo]')){ el.hidden=true; clearTimeout(toastT); if(V.hist.toastAt===V.hist.i) undo(); } };
  clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },5000); };
function act(a){
  const s=st.sel, R=st.R; if(a==='done'){ V.closeSheet(true); V.select(null); return; }
  if(!s) return; const it=V.selItem(); if(!it) return;
  if(s.kind==='clip'){
    const i=R.clips.indexOf(it), x=V.lay()[i];
    if(a==='split'){ const local=st.t-x.start; if(local<0.2||x.end-st.t<0.2) return; const c2=JSON.parse(JSON.stringify(it)); c2.id=V.uid('c');
      if(it.kind==='photo'){ c2.dur=+(V.clipLen(it)-local).toFixed(3); it.dur=+local.toFixed(3); } else { c2.in=+(it.in+local).toFixed(3); it.out=c2.in; }
      R.clips.splice(i+1,0,c2); V.touch({bar:true}); }
    else if(a==='earlier'&&i>0){ R.clips.splice(i-1,0,R.clips.splice(i,1)[0]); V.touch({bar:true}); V.setT(V.lay()[i-1].start); }
    else if(a==='later'&&i<R.clips.length-1){ R.clips.splice(i+1,0,R.clips.splice(i,1)[0]); V.touch({bar:true}); V.setT(V.lay()[i+1].start); }
    else if(a==='del'){ R.clips.splice(i,1); st.sel=null; V.closeSheet(true); V.touch({fit:true,bar:true}); V.renderBar(); V.hist.commit(); V.toast('Clip deleted',()=>V.undo()); }
  } else if(s.kind==='text'){
    if(a==='dup'){ const t2=JSON.parse(JSON.stringify(it)); t2.id=V.uid('t'); t2.y=Math.min(1800,it.y+140); t2.start=Math.min(it.start+0.3,Math.max(0,V.dur()-0.5)); t2.end=Math.min(V.dur(),t2.start+(it.end-it.start)); R.texts.push(t2); V.select({kind:'text',id:t2.id}); V.touch({bar:true}); }
    else if(a==='del'){ R.texts.splice(R.texts.indexOf(it),1); st.sel=null; V.closeSheet(true); V.touch({bar:true}); V.renderBar(); V.hist.commit(); V.toast('Text deleted',()=>V.undo()); }
  } else {
    if(a==='split'){ const len=it.out-it.in, local=st.t-it.start; if(local<0.2||len-local<0.2) return; const a2=JSON.parse(JSON.stringify(it)); a2.id=V.uid('a');
      a2.start=+st.t.toFixed(3); a2.in=+(it.in+local).toFixed(3); a2.fadeIn=0; it.out=a2.in; it.fadeOut=0; R.audio.splice(R.audio.indexOf(it)+1,0,a2); V.touch({bar:true}); }
    else if(a==='del'){ R.audio.splice(R.audio.indexOf(it),1); st.sel=null; V.closeSheet(true); V.touch({bar:true}); V.renderBar(); V.hist.commit(); V.toast('Sound deleted',()=>V.undo()); }
  }
}

/* ---------- adding media ---------- */
const metaOf=m=>({name:m.name,type:m.type,dur:m.dur,w:m.w,h:m.h});
function insertIndex(){ const lay=V.lay(); if(!lay.length) return 0; if(st.t>=V.dur()) return lay.length; return V.clipAt(st.t).i+1; }
async function addFiles(files,say){
  const list=[...files]; if(!list.length) return; const R=st.R, wasEmpty=V.empty(); let at=insertIndex(), added=0, firstStart=null, bad=[];
  for(let i=0;i<list.length;i++){
    say(list.length>1?`Adding ${i+1} of ${list.length}…`:'Adding…');
    let m; try{ m=await StudioMedia.put(list[i]); }catch(err){ bad.push(list[i].name+': '+(err&&err.message||err)); continue; }
    R.media[m.id]=metaOf(m);
    if(m.type==='audio'){ addAudioFrom(m); added++; continue; }
    const c=m.type==='image'?{id:V.uid('c'),kind:'photo',media:m.id,dur:3,motion:'zoom'}:{id:V.uid('c'),kind:'video',media:m.id,in:0,out:+(m.dur||1).toFixed(3),db:0,mute:false};
    if(firstStart===null) firstStart=V.lay().slice(0,at).reduce((a,b)=>b.end,0);
    R.clips.splice(at++,0,c); added++;
  }
  if(!added){ say(bad[0]||'Nothing was added.'); return; }
  if(wasEmpty) st.pps=V.defaultPps();
  await V.touch({bar:true}); V.hist.commit(); if(firstStart!==null) V.setT(firstStart);
  say(bad.length?bad[0]:''); V.closeSheet(true);
}
function addAudioFrom(m){
  const R=st.R, d=V.dur(), start=clamp(st.t,0,Math.max(0,d-0.5)), room=d>0?Math.max(0.5,d-start):m.dur;
  R.audio.push({id:V.uid('a'),media:m.id,start:+start.toFixed(3),in:0,out:+Math.min(m.dur||room,room).toFixed(3),db:0,mute:false,fadeIn:0,fadeOut:0});
  R.media[m.id]=metaOf(m);
}
async function addReel(id,say){
  try{ say&&say('Adding…'); const r=await V.ensureReel(id), wasEmpty=V.empty(), at=insertIndex(), start=V.lay().slice(0,at).reduce((a,b)=>b.end,0);
    st.R.clips.splice(at,0,{id:V.uid('c'),kind:'reel',reel:id,in:0,out:r.M.duration,texts:{},mix:{},duck:true});
    if(wasEmpty){ st.pps=V.defaultPps(); st.defName=r.M.title; $('vdName').placeholder=st.defName; }
    await V.touch({bar:true}); V.hist.commit(); V.setT(start); V.closeSheet(true); }
  catch(err){ say&&say('Could not add the reel. ('+(err&&err.message||err)+')'); V.fail(err,'reel'); }
}
async function replaceMedia(oldId,file){
  const R=st.R;
  try{ const m=await StudioMedia.put(file), old=R.media[oldId]||{};
    R.clips.forEach(c=>{ if(c.media===oldId){ c.media=m.id; if(c.kind==='video'){ c.out=Math.min(c.out,m.dur||c.out); if(c.in>=c.out) c.in=0; } } });
    R.audio.forEach(a=>{ if(a.media===oldId){ a.media=m.id; a.out=Math.min(a.out,m.dur||a.out); } });
    R.media[m.id]=Object.assign(metaOf(m),{name:old.name||m.name}); delete R.media[oldId];
    await V.touch({bar:true}); V.hist.commit(); V.toast('Added again'); }
  catch(err){ V.toast('Could not add the file: '+(err&&err.message||err)); V.fail(err,'media'); }
}
$('vdEmptyFile').addEventListener('change',e=>{ const f=e.target.files; if(f&&f.length) addFiles(f,m=>{ $('vdEmptySt').textContent=m; }).finally(()=>{ e.target.value=''; }); });
$('vdEmptyReel').addEventListener('click',()=>{ const id=(V.reelList()[0]||{}).id; if(!id) return; if(V.reelList().length>1) V.openSheet('reels'); else addReel(id,m=>{ $('vdEmptySt').textContent=m; }); });
$('vdEmptyAdd').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('vdEmptyFile').click(); } });

/* ---------- sheets ---------- */
let cur=null;   // {name, h:{input,change,click,focusin}}
const SHEETS={};
V.openSheet=function(name,arg){
  const def=SHEETS[name]; if(!def) return;
  if(V.stopSolo) V.stopSolo();
  st.sheet={name,arg}; main.classList.add('sheeted'); sheetEl.hidden=false; sheetEl.dataset.name=name; sheetEl.classList.remove('idle'); $('vdShX').hidden=false;
  const r=def(arg)||{}; cur=r; shT.textContent=r.title||''; shB.innerHTML=r.html||''; shB.scrollTop=0;
  if(r.bind) r.bind(shB); V.renderBar&&V.renderBar();
  if(!desk()) requestAnimationFrame(()=>V.stageLayout());
  if(r.focus){ const el=shB.querySelector(r.focus); if(el){ el.focus({preventScroll:true}); if(r.select&&el.select) el.select(); } }
};
V.refreshSheet=()=>{ if(st.sheet) V.openSheet(st.sheet.name,st.sheet.arg); };
V.closeSheet=function(quiet){
  if(V.stopSolo) V.stopSolo();
  st.sheet=null; cur=null; main.classList.remove('sheeted');
  if(desk()) idle(); else sheetEl.hidden=true;
  if(!quiet){ V.renderBar&&V.renderBar(); }
  requestAnimationFrame(()=>{ V.stageLayout(); if(V.renderTl) V.renderTl(); if(V.scrollTo) V.scrollTo(st.t); });
};
function idle(){ sheetEl.hidden=false; sheetEl.classList.add('idle'); shT.textContent='Edit'; $('vdShX').hidden=true; cur=null;
  shB.innerHTML='<p class="small vd-idle">Tap a clip, text or sound on the timeline to edit it. Use Add, Text and Sound below the timeline to put something new in.</p>'; }
$('vdShX').addEventListener('click',()=>{ V.closeSheet(); });
['input','change','click','focusin','keydown'].forEach(ev=>shB.addEventListener(ev,e=>{ if(cur&&cur[ev]) cur[ev](e); }));
matchMedia('(min-width:900px)').addEventListener('change',()=>{ if(!st.sheet) V.closeSheet(true); });

/* small pieces */
const range=(lab,key,min,max,step,val,txt,aria)=>`<div class="vd-rg"><div class="vd-lblrow"><label for="vdR_${key}">${esc(lab)}</label><span class="vd-val"><bdi data-val="${key}">${txt}</bdi></span></div><input type="range" id="vdR_${key}" data-r="${key}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${esc(aria||lab)}" aria-valuetext="${txt}"></div>`;
const chips=(key,list,val,label)=>`<div class="vd-chips" role="group" aria-label="${esc(label)}">${list.map(([v,t])=>`<button type="button" class="chip" data-chip="${key}" data-v="${v}" aria-pressed="${val===v}">${t}</button>`).join('')}</div>`;
const sw=(on,label)=>`<label class="vd-switch"><span class="txt"><b>${esc(label[0])}</b>${label[1]?`<small>${esc(label[1])}</small>`:''}</span><input type="checkbox" class="switch" role="switch"${on?' checked':''}></label>`;
const setRange=(body,key,txt)=>{ const r=body.querySelector(`[data-r="${key}"]`); if(r) r.setAttribute('aria-valuetext',txt); const v=body.querySelector(`[data-val="${key}"]`); if(v) v.textContent=txt; };

/* ---- Add ---- */
SHEETS.add=()=>({title:'Add',
  html:`<div class="vd-list">
    <label class="vd-item" tabindex="0"><span class="ic">${I.video}</span><span class="tx"><b>Clips and photos</b><small>From this ${L.devWord()}</small></span><input type="file" accept="video/*,image/*" multiple data-f="media"></label>
    <button type="button" class="vd-item" data-reels><span class="ic">${I.reel}</span><span class="tx"><b>Reel template</b><small>Ready-made reels with sound</small></span></button>
    <label class="vd-item" tabindex="0"><span class="ic">${I.music}</span><span class="tx"><b>Music or sound</b><small>Placed at the playhead</small></span><input type="file" accept="audio/*" data-f="audio"></label>
  </div><div class="vd-note" id="vdAddSt" role="status"></div>`,
  change(e){ const f=e.target.closest('[data-f]'); if(f&&f.files.length){ const say=m=>{ const s=$('vdAddSt'); if(s) s.textContent=m; }; addFiles(f.files,say).finally(()=>{ f.value=''; }); } },
  click(e){ if(e.target.closest('[data-reels]')) V.openSheet('reels'); },
  keydown(e){ const l=e.target.closest('label.vd-item'); if(l&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); l.querySelector('input').click(); } }});
SHEETS.reels=()=>({title:'Reel template',
  html:`<div class="vd-list" id="vdReelList"><p class="small">Loading…</p></div><div class="vd-note" id="vdAddSt" role="status"></div>`,
  bind(){ Promise.all(V.reelList().map(r=>V.reelInfo(r.id))).then(list=>{ const el=$('vdReelList'); if(!el||!st.sheet||st.sheet.name!=='reels') return;
    el.innerHTML=list.map(r=>`<button type="button" class="vd-item" data-reel="${esc(r.id)}"><span class="ic">${I.reel}</span><span class="tx"><b dir="auto">${esc(r.title)}</b><small dir="auto">${esc(r.sub||'')}${r.dur?' · ':''}${r.dur?`<bdi>${Math.round(r.dur)} s</bdi>`:''}</small></span></button>`).join(''); }); },
  click(e){ const b=e.target.closest('[data-reel]'); if(b) addReel(b.dataset.reel,m=>{ const s=$('vdAddSt'); if(s) s.textContent=m; }); }});

/* ---- reel words (the phase-1 Text panel for one reel clip) ---- */
const reelClipAtPlayhead=()=>{ const x=V.clipAt(st.t); if(x&&x.c.kind==='reel') return x.c; const f=V.lay().find(l=>l.c.kind==='reel'); return f?f.c:null; };   // the reel under the playhead, else the first reel: its words are always in Text
function slotsHTML(c,r){
  const info=(r.reel.textInfo(c.texts)||{});
  return r.M.texts.map(s=>{ const v=c.texts[s.id]!=null?c.texts[s.id]:s.value, w=s.in!=null?s.in:s.show;
    return `<div class="vd-slot" data-id="${esc(s.id)}">
    <div class="vd-lblrow"><label for="vdT_${sid(s.id)}">${esc(s.label)}</label><span class="small">Appears at <bdi>${fmt(w)}</bdi></span></div>
    <div class="vd-field"><input id="vdT_${sid(s.id)}" type="text" dir="auto" maxlength="60" enterkeyhint="done" autocomplete="off" spellcheck="false" value="${esc(v)}"><button type="button" class="vd-clear" data-clear aria-label="Clear ${esc(s.label)}">${I.x}</button></div>
    <div class="vd-warn" data-warn role="status"></div>
    <p class="small vd-hint" data-hint dir="auto"></p>
    <div class="vd-links"><button type="button" class="link" data-orig>Use the original words</button><button type="button" class="link" data-phrase>Pick a phrase</button></div>
  </div>`; }).join('');
}
function updateSlot(body,c,r,id){
  const el=body.querySelector(`.vd-slot[data-id="${CSS.escape(id)}"]`); if(!el) return;
  const slot=r.M.texts.find(s=>s.id===id), v=c.texts[id]!=null?c.texts[id]:slot.value, info=(r.reel.textInfo(c.texts)||{})[id]||{};
  el.querySelector('[data-warn]').innerHTML=info.warn?I.warn+'<span>Too long for its spot: the words get smaller to fit. Shorten them to keep them big.</span>':'';
  const inp=el.querySelector('input'); inp.parentElement.dataset.d=inp.matches(':dir(rtl)')?'rtl':'ltr';
  el.querySelector('[data-clear]').hidden=!v; el.querySelector('[data-orig]').hidden=v===slot.value;
  el.querySelector('[data-hint]').textContent=v?'':'Nothing shows here while this is empty.';
}
function wordsHandlers(getClip,getR){
  const body=()=>shB;
  const setWords=(c,r,id,v)=>{ const slot=r.M.texts.find(s=>s.id===id); if(v===slot.value) delete c.texts[id]; else c.texts[id]=v; const inp=document.getElementById('vdT_'+sid(id)); if(inp&&inp.value!==v) inp.value=v; updateSlot(body(),c,r,id); V.touch({tl:false}); };
  const jump=(c,slot)=>{ const x=V.lay().find(l=>l.c===c), w=slot.show!=null?slot.show:slot.in||0; if(x&&w>=c.in&&w<=c.out){ V.pause(); V.setT(x.start+(w-c.in)); } };
  return {
    input(e){ const inp=e.target.closest('.vd-slot input'); if(!inp) return; const c=getClip(), r=getR(c), id=inp.closest('.vd-slot').dataset.id; if(!c||!r) return; const slot=r.M.texts.find(s=>s.id===id);
      if(inp.value===slot.value) delete c.texts[id]; else c.texts[id]=inp.value; updateSlot(body(),c,r,id); V.touch({tl:false}); },
    focusin(e){ const inp=e.target.closest('.vd-slot input'); if(!inp) return; const c=getClip(), r=getR(c); if(!c||!r) return; const slot=r.M.texts.find(s=>s.id===inp.closest('.vd-slot').dataset.id); if(slot) jump(c,slot); },
    keydown(e){ if(e.key==='Enter'&&e.target.matches('.vd-slot input')){ e.preventDefault(); e.target.blur(); } },
    click(e){ const el=e.target.closest('.vd-slot'); if(!el) return; const c=getClip(), r=getR(c); if(!c||!r) return; const id=el.dataset.id, slot=r.M.texts.find(s=>s.id===id);
      if(e.target.closest('[data-clear]')){ setWords(c,r,id,''); el.querySelector('input').focus(); }
      else if(e.target.closest('[data-orig]')){ setWords(c,r,id,slot.value); jump(c,slot); }
      else if(e.target.closest('[data-phrase]')) pickPhrase(c,r,id,slot,setWords,jump); }
  };
}
function pickPhrase(c,r,id,slot,setWords,jump){
  V.pause();
  const list=[{v:slot.value,tag:'Original'}], seen=new Set([slot.value]);
  ((st.B.phrases&&st.B.phrases.headlines)||[]).forEach(p=>{ if(!seen.has(p)){ seen.add(p); list.push({v:p}); } });
  const d=L.dialog(`<div class="dlg-body"><h3>Pick a phrase</h3><div class="vd-phr">${list.map((p,i)=>`<button type="button" data-i="${i}"><span dir="auto">${esc(p.v)}</span>${p.tag?`<small>${esc(p.tag)}</small>`:''}</button>`).join('')}</div>
    <div class="dlg-actions"><button type="button" class="mini" id="phX">Close</button></div></div>`);
  d.tabIndex=-1; d.querySelector('#phX').onclick=()=>d.close();
  d.querySelector('.vd-phr').onclick=e=>{ const b=e.target.closest('[data-i]'); if(!b) return; d.close(); setWords(c,r,id,list[+b.dataset.i].v); jump(c,slot); };
}

/* ---- Text (main bar): the template words first, then your own text ---- */
SHEETS.text=()=>{
  const c=reelClipAtPlayhead(), r=c&&st.reels[c.reel];
  const words=(c&&r)?`<section class="vd-sec"><h3>${esc(r.M.title||'Words')}</h3>${slotsHTML(c,r)}</section>`:'';
  const mine=st.R.texts.length?`<section class="vd-sec"><h3>Your text</h3><div class="vd-list">${st.R.texts.map(t=>`<button type="button" class="vd-item sm" data-t="${esc(t.id)}"><span class="ic">${I.type.replace('width="22" height="22"','width="18" height="18"')}</span><span class="tx"><b dir="auto">${esc(String(t.value).replace(/\n/g,' '))}</b></span><small><bdi>${fmt(t.start)}</bdi></small></button>`).join('')}</div></section>`:'';
  const wh=wordsHandlers(()=>reelClipAtPlayhead(),c=>c&&st.reels[c.reel]);
  return {title:'Text',html:words+mine+`<button type="button" class="link vd-addtxt" data-addtxt>${I.plus.replace('width="22" height="22"','width="18" height="18"')}Add text</button>`,
    bind(b){ if(c&&r) r.M.texts.forEach(s=>updateSlot(b,c,r,s.id)); },
    input:wh.input,focusin:wh.focusin,keydown:wh.keydown,
    click(e){ if(e.target.closest('[data-addtxt]')) return addText(); const t=e.target.closest('[data-t]'); if(t){ V.select({kind:'text',id:t.dataset.t},{keepSheet:true}); const tx=V.byId(st.R.texts,t.dataset.t); if(tx&&(st.t<tx.start||st.t>=tx.end)) V.setT(tx.start); V.openSheet('edit'); return; } wh.click(e); }};
};
SHEETS.words=()=>{
  const c=V.selItem(), r=c&&st.reels[c.reel]; if(!c||!r) return {title:'Words',html:''};
  const wh=wordsHandlers(()=>V.selItem(),c=>c&&st.reels[c.reel]);
  return {title:'Words',html:slotsHTML(c,r),bind(b){ r.M.texts.forEach(s=>updateSlot(b,c,r,s.id)); },...wh};
};
function addText(){
  const d=V.dur(); let s=clamp(st.t,0,Math.max(0,d-0.5)); if(d>0&&d-s<2.5) s=Math.max(0,d-2.5);
  const e=d>0?Math.min(d,s+2.5):s+2.5, id=V.uid('t');
  st.R.texts.push({id,value:newWords(),start:+s.toFixed(3),end:+e.toFixed(3),x:540,y:960,size:96,font:'display',color:brandInk(),box:null,in:'pop',out:'fade'});
  V.select({kind:'text',id},{keepSheet:true}); V.touch({bar:true});
  if(d>0) V.setT(Math.min(e,s+0.5));   // show the words fully (past their entrance) while you type
  V.openSheet('edit');
}

/* ---- Edit a text layer ---- */
const IN_ANIM=[['none','None'],['fade','Fade'],['pop','Pop'],['slide','Slide'],['type','Type']], OUT_ANIM=[['none','None'],['fade','Fade'],['pop','Pop'],['slide','Slide']];
function swatches(key,val){
  const pal=L.brandPalette(), rec=L.recentColours(), up=String(val||'').toUpperCase();
  const all=[...pal.map(p=>({hex:p.hex,name:p.name||p.hex})),...rec.map(h=>({hex:h,name:h}))];
  return `<div class="vd-sws" role="group" aria-label="${key==='color'?'Text colour':'Box colour'}">${all.map(p=>`<button type="button" class="vd-sw" data-sw="${key}" data-hex="${esc(p.hex)}" style="--c:${esc(p.hex)}" aria-label="${esc(p.name)}" aria-pressed="${up===p.hex.toUpperCase()}"></button>`).join('')}<label class="vd-sw custom" aria-label="Custom colour"><input type="color" data-sw-custom="${key}" value="${/^#[0-9a-f]{6}$/i.test(val||'')?val:'#888888'}">${I.plus.replace('width="22" height="22"','width="18" height="18"')}</label></div>`;
}
SHEETS.edit=()=>{
  const t=st.sel&&st.sel.kind==='text'?V.byId(st.R.texts,st.sel.id):null; if(!t) return {title:'Edit text',html:'<p class="small">Pick a text on the timeline or the preview first.</p>'};
  const timing=()=>`<div class="vd-times"><div class="vd-tm"><span>Starts <bdi data-ts>${sec(t.start)}</bdi></span><button type="button" class="mini" data-at="start">Start at playhead</button></div><div class="vd-tm"><span>Ends <bdi data-te>${sec(t.end)}</bdi></span><button type="button" class="mini" data-at="end">End at playhead</button></div></div>`;
  const html=`<div class="vd-edit">
    <textarea id="vdTx" dir="auto" rows="2" maxlength="200" spellcheck="false" autocomplete="off" aria-label="Words">${esc(t.value)}</textarea>
    <section class="vd-sec"><h3>Colour</h3>${swatches('color',t.color)}</section>
    <section class="vd-sec"><h3>Font</h3>${chips('font',[['display','Headline'],['body','Body']],t.font,'Font')}</section>
    ${range('Size','size',32,240,2,t.size,String(t.size),'Text size')}
    <section class="vd-sec" id="vdBoxSec">${sw(!!t.box,['Box behind',''])}<div id="vdBoxCols" ${t.box?'':'hidden'}>${swatches('box',t.box||'')}</div></section>
    <section class="vd-sec"><h3>Animation in</h3>${chips('in',IN_ANIM,t.in||'none','Animation in')}</section>
    <section class="vd-sec"><h3>Animation out</h3>${chips('out',OUT_ANIM,t.out||'none','Animation out')}</section>
    <section class="vd-sec"><h3>Timing</h3>${timing()}</section></div>`;
  const redo=()=>{ V.touch({tl:true,restart:false}); };
  return {title:'Edit text',html,focus:'#vdTx',select:t.value===newWords(),
    bind(b){ b.querySelector('#vdTx').dataset.d=''; },
    input(e){
      if(e.target.id==='vdTx'){ t.value=e.target.value; V.touch({tl:true,restart:false}); return; }
      const r=e.target.closest('[data-r]'); if(r){ t.size=+r.value; setRange(shB,'size',String(t.size)); V.touch({tl:false,restart:false}); return; }
    },
    change(e){
      if(e.target.matches('.vd-switch input')){ const on=e.target.checked; const ink=brandInk(), paper=brandPaper(); const lum=h=>{ const n=parseInt(String(h).replace('#','').slice(0,6),16)||0; return ((n>>16)*.3+((n>>8)&255)*.59+(n&255)*.11); };
        t.box=on?(t.box||(lum(t.color)>140?ink:paper)):null; $('vdBoxCols').hidden=!on; if(on) $('vdBoxCols').innerHTML=swatches('box',t.box); redo(); return; }
      const cc=e.target.closest('[data-sw-custom]'); if(cc){ const key=cc.dataset.swCustom; L.addRecentColour(cc.value); t[key==='color'?'color':'box']=cc.value; V.openSheetKeep(); redo(); }
    },
    click(e){
      const s=e.target.closest('[data-sw]'); if(s){ const k=s.dataset.sw; t[k==='color'?'color':'box']=s.dataset.hex; shB.querySelectorAll(`[data-sw="${k}"]`).forEach(x=>x.setAttribute('aria-pressed',String(x===s))); redo(); return; }
      const c=e.target.closest('[data-chip]'); if(c){ const k=c.dataset.chip; t[k]=c.dataset.v; shB.querySelectorAll(`[data-chip="${k}"]`).forEach(x=>x.setAttribute('aria-pressed',String(x===c))); redo(); if(k!=='font'){ replay(t); } return; }
      const a=e.target.closest('[data-at]'); if(a){ const now=+st.t.toFixed(3);
        if(a.dataset.at==='start'){ t.start=clamp(now,0,t.end-0.2); } else { t.end=clamp(Math.max(now,t.start+0.2),t.start+0.2,Math.max(V.dur(),t.start+0.2)); }
        shB.querySelector('[data-ts]').textContent=sec(t.start); shB.querySelector('[data-te]').textContent=sec(t.end); redo(); }
    }};
};
V.openSheetKeep=()=>{ const y=shB.scrollTop; V.openSheet('edit'); shB.scrollTop=y; };
function replay(t){ /* show the animation: jump a little before the text starts and play */ if(V.dur()<=0) return; V.setT(Math.max(0,t.start)); V.play(); }

/* ---- Volume (video clip, sound track) and Fades ---- */
function volSheet(it,title){
  const m=!!it.mute, db=it.db||0;
  return {title,html:`<div class="vd-row${m?' muted':''}"><div class="vd-r1"><span class="n">${title}</span><span class="vd-val"><bdi data-val="db">${m?'Muted':dbText(db)}</bdi></span></div>
    <div class="vd-r2"><button type="button" class="icon-btn vd-mute" data-mute aria-pressed="${m}" aria-label="Mute">${m?I.mute:I.vol}</button><input type="range" min="-24" max="6" step="1" value="${db}" data-r="db" aria-label="${title}" aria-valuetext="${dbText(db)}"${m?' disabled':''}></div></div>`,
    input(e){ const r=e.target.closest('[data-r="db"]'); if(!r) return; it.db=+r.value; r.setAttribute('aria-valuetext',dbText(it.db)); shB.querySelector('[data-val="db"]').textContent=dbText(it.db); V.touch({tl:false}); },
    click(e){ if(!e.target.closest('[data-mute]')) return; it.mute=!it.mute; V.openSheetKeep2(); V.touch({tl:true}); }};
}
V.openSheetKeep2=()=>V.openSheet(st.sheet.name,st.sheet.arg);
SHEETS.vol=()=>{ const it=V.selItem(); if(!it) return {title:'Volume',html:''}; return volSheet(it,'Volume'); };
SHEETS.fades=()=>{ const a=V.selItem(); if(!a||st.sel.kind!=='audio') return {title:'Fades',html:''};
  const f=x=>(Math.round(x*10)/10).toFixed(1)+' s';
  return {title:'Fades',html:range('Fade in','fadeIn',0,3,0.1,a.fadeIn||0,f(a.fadeIn||0))+range('Fade out','fadeOut',0,3,0.1,a.fadeOut||0,f(a.fadeOut||0)),
    input(e){ const r=e.target.closest('[data-r]'); if(!r) return; a[r.dataset.r]=+r.value; setRange(shB,r.dataset.r,f(a[r.dataset.r])); V.touch({tl:false}); }}; };
SHEETS.len=()=>{ const c=V.selItem(); if(!c||c.kind!=='photo') return {title:'Length',html:''};
  return {title:'Length',html:range('Length','dur',0.5,15,0.1,c.dur,sec(c.dur),'Photo length'),
    input(e){ const r=e.target.closest('[data-r]'); if(!r) return; c.dur=+r.value; setRange(shB,'dur',sec(c.dur)); V.touch({fit:true,bar:true}); }}; };
SHEETS.zoom=()=>{ const c=V.selItem(); if(!c||c.kind!=='photo') return {title:'Zoom',html:''};
  return {title:'Zoom',html:sw(c.motion==='zoom',['Slow zoom','The photo moves in slowly']),
    change(e){ if(e.target.matches('.switch')){ c.motion=e.target.checked?'zoom':'none'; V.touch({tl:false}); } }}; };

/* ---- Mix (the phase-1 Sound panel for one reel clip) ---- */
const rowCfg=(c,id)=>(c.mix||(c.mix={}))[id]||(c.mix[id]={db:0,mute:false});
const rowDb=(c,id)=>{ const x=c.mix&&c.mix[id]; return x&&typeof x.db==='number'?x.db:0; };
const rowMute=(c,id)=>!!(c.mix&&c.mix[id]&&c.mix[id].mute);
const duckOn=c=>c.duck!==false;
function mixHTML(c,r){
  const credits=r.M.credits?`<p class="vd-credits" dir="auto">${esc(r.M.credits)}</p>`:'';
  if(!r.mix) return `<p class="small vd-nosound" role="status">The sounds could not be loaded${r.mixErr?' ('+esc(r.mixErr)+')':''}, so this reel would be silent. Check your connection and reload this page.</p>${credits}`;
  const rows=[...r.mix.rows].sort((a,b)=>(a.kind==='music'?0:1)-(b.kind==='music'?0:1));
  return `<label class="vd-duck"><span class="txt"><b>Duck the music under big sounds</b><small>The music dips when the big sounds hit</small></span><input type="checkbox" class="switch" role="switch" data-duck${duckOn(c)?' checked':''}></label>
    <div class="vd-rows">${rows.map(x=>{ const n=(x.hits||[]).length, db=rowDb(c,x.id), m=rowMute(c,x.id);
      return `<div class="vd-row${m?' muted':''}" data-id="${esc(x.id)}">
      <div class="vd-r1"><button type="button" class="vd-name-btn" data-jump title="Go to this sound"><span class="n">${esc(x.label)}</span>${n?`<span class="at"><bdi>${fmt(Math.min(...x.hits))}</bdi>${n>1?' ×'+n:''}</span>`:''}</button><span class="vd-val"><bdi data-val>${m?'Muted':dbText(db)}</bdi></span></div>
      <div class="vd-r2"><button type="button" class="icon-btn vd-mute" data-mute aria-pressed="${m}" aria-label="Mute ${esc(x.label)}">${m?I.mute:I.vol}</button>
        <input type="range" min="-24" max="6" step="1" value="${db}" data-db aria-label="${esc(x.label)} volume" aria-valuetext="${dbText(db)}"${m?' disabled':''}>
        <button type="button" class="icon-btn vd-solo" data-solo aria-label="Play ${esc(x.label)} on its own">${I.play}</button></div></div>`; }).join('')}</div>
    <div class="vd-foot"><button type="button" class="link" data-reset>Reset to original mix</button>${credits}</div>`;
}
function refreshReset(body,c,r){ const b=body.querySelector('[data-reset]'); if(b&&r.mix) b.disabled=r.mix.isDefault({mix:c.mix||{},duck:duckOn(c)}); }
function mixHandlers(getC){
  const ctx=e=>{ const sec=e.target.closest('[data-clip]'); const c=sec?V.byId(st.R.clips,sec.dataset.clip):getC(); return c?{c,r:st.reels[c.reel],sec:sec||shB}:null; };
  return {
    change(e){ if(!e.target.matches('[data-duck]')) return; const x=ctx(e); if(!x) return; x.c.duck=e.target.checked; refreshReset(x.sec,x.c,x.r); V.touch({tl:false}); },
    input(e){ const rg=e.target.closest('[data-db]'); if(!rg) return; const x=ctx(e); if(!x) return; const row=rg.closest('.vd-row'), id=row.dataset.id, v=+rg.value;
      rowCfg(x.c,id).db=v; rg.setAttribute('aria-valuetext',dbText(v)); row.querySelector('[data-val]').textContent=dbText(v); refreshReset(x.sec,x.c,x.r); V.touch({tl:false}); },
    click(e){ const x=ctx(e); if(!x) return; const row=e.target.closest('.vd-row');
      if(row){ const id=row.dataset.id, mr=x.r.mix.rows.find(q=>q.id===id);
        if(e.target.closest('[data-mute]')){ const cf=rowCfg(x.c,id); cf.mute=!cf.mute; const m=cf.mute; row.classList.toggle('muted',m);
          const b=row.querySelector('[data-mute]'); b.setAttribute('aria-pressed',String(m)); b.innerHTML=m?I.mute:I.vol; row.querySelector('[data-db]').disabled=m; row.querySelector('[data-val]').textContent=m?'Muted':dbText(cf.db||0); refreshReset(x.sec,x.c,x.r); V.touch({tl:false}); }
        else if(e.target.closest('[data-jump]')){ if(mr&&mr.hits&&mr.hits.length){ const l=V.lay().find(q=>q.c===x.c), h=Math.max(x.c.in,Math.min(...mr.hits)-0.3); V.pause(); V.stopSolo(); if(l) V.setT(l.start+Math.max(0,h-x.c.in)); } }
        else if(e.target.closest('[data-solo]')){ const b=e.target.closest('[data-solo]'), was=b.classList.contains('on'); V.pause(); V.stopSolo();
          if(!was){ try{ st.solo=x.r.mix.solo(id,{mix:JSON.parse(JSON.stringify(x.c.mix||{})),duck:duckOn(x.c)}); b.classList.add('on'); }catch(err){ console.warn(err); } } }
        return; }
      if(e.target.closest('[data-reset]')){ V.stopSolo(); x.c.mix={}; x.c.duck=true; V.openSheet(st.sheet.name,st.sheet.arg); V.touch({tl:false}); } }
  };
}
SHEETS.mix=()=>{
  const c=V.selItem(); if(!c||c.kind!=='reel') return {title:'Mix',html:''};
  const mh=mixHandlers(()=>V.selItem());
  return {title:'Mix',html:`<div data-clip="${esc(c.id)}"><p class="small">Loading the sounds…</p></div>`,
    bind(b){ V.ensureMix(c.reel).then(r=>{ if(!st.sheet||st.sheet.name!=='mix') return; const el=b.querySelector('[data-clip]'); if(!el) return; el.innerHTML=mixHTML(c,r); refreshReset(el,c,r); }); },...mh};
};

/* ---- Sound (main bar): add, your tracks, and the mix of every reel ---- */
SHEETS.sound=()=>{
  const reels=st.R.clips.filter(c=>c.kind==='reel');
  const trk=st.R.audio.map(a=>{ const nm=(st.R.media[a.media]||{}).name||'Sound', m=!!a.mute, db=a.db||0;
    return `<div class="vd-row vd-trk${m?' muted':''}" data-aid="${esc(a.id)}"><div class="vd-r1"><button type="button" class="vd-name-btn" data-pick title="Show on the timeline"><span class="n" dir="auto">${esc(nm)}</span><span class="at"><bdi>${fmt(a.start)}</bdi></span></button><span class="vd-val"><bdi data-val>${m?'Muted':dbText(db)}</bdi></span></div>
      <div class="vd-r2"><button type="button" class="icon-btn vd-mute" data-tmute aria-pressed="${m}" aria-label="Mute ${esc(nm)}">${m?I.mute:I.vol}</button><input type="range" min="-24" max="6" step="1" value="${db}" data-tdb aria-label="${esc(nm)} volume" aria-valuetext="${dbText(db)}"${m?' disabled':''}></div></div>`; }).join('');
  const sections=reels.map(c=>`<section class="vd-sec" data-clip="${esc(c.id)}"><h3 dir="auto">Mix · ${esc((st.reels[c.reel]&&st.reels[c.reel].M.title)||'Reel')}</h3><p class="small">Loading the sounds…</p></section>`).join('');
  const mh=mixHandlers(()=>null);
  return {title:'Sound',
    html:`<label class="vd-item" tabindex="0"><span class="ic">${I.music}</span><span class="tx"><b>Add music or sound</b><small>Placed at the playhead</small></span><input type="file" accept="audio/*" data-f="audio"></label><div class="vd-note" id="vdAddSt" role="status"></div>
      ${trk?`<section class="vd-sec"><h3>Your sounds</h3><div class="vd-rows">${trk}</div></section>`:''}${sections}`,
    bind(b){ reels.forEach(c=>V.ensureMix(c.reel).then(r=>{ if(!st.sheet||st.sheet.name!=='sound') return; const el=b.querySelector(`[data-clip="${CSS.escape(c.id)}"]`); if(!el) return; el.innerHTML=`<h3 dir="auto">Mix · ${esc(r.M.title||'Reel')}</h3>`+mixHTML(c,r); refreshReset(el,c,r); })); },
    keydown(e){ const l=e.target.closest('label.vd-item'); if(l&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); l.querySelector('input').click(); } },
    change(e){ const f=e.target.closest('[data-f]'); if(f){ if(f.files.length) addFiles(f.files,m=>{ const s=$('vdAddSt'); if(s) s.textContent=m; }).finally(()=>{ f.value=''; }); return; } mh.change(e); },
    input(e){ const r=e.target.closest('[data-tdb]'); if(r){ const row=r.closest('.vd-trk'), a=V.byId(st.R.audio,row.dataset.aid); a.db=+r.value; r.setAttribute('aria-valuetext',dbText(a.db)); row.querySelector('[data-val]').textContent=dbText(a.db); V.touch({tl:false}); return; } mh.input(e); },
    click(e){ const row=e.target.closest('.vd-trk'); if(row){ const a=V.byId(st.R.audio,row.dataset.aid);
        if(e.target.closest('[data-tmute]')){ a.mute=!a.mute; const m=a.mute; row.classList.toggle('muted',m); const b=row.querySelector('[data-tmute]'); b.setAttribute('aria-pressed',String(m)); b.innerHTML=m?I.mute:I.vol; row.querySelector('[data-tdb]').disabled=m; row.querySelector('[data-val]').textContent=m?'Muted':dbText(a.db||0); V.touch({tl:true}); }
        else if(e.target.closest('[data-pick]')){ V.select({kind:'audio',id:a.id},{keepSheet:true}); V.closeSheet(); V.setT(a.start); }
        return; } mh.click(e); }};
};

/* start with the right bar once the project is open */
V.afterOpen=()=>{ if(desk()) idle(); };
})();

/* Create: the page around the editor (create-core.js). The edit bar shows what you can do with what's selected;
   sheets hold the details (words, colour, font, size, arrange, photo, page). Add, Text, Photo, Templates, Layers, Save
   in the bottom bar. Templates (brand kit + team), drafts in Continue editing, saving like every tool (2× lossless PNG,
   team designs and team templates). Brand-agnostic: words, colours, fonts and pictures come from the brand kit. */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S, CR=window.CR, esc=L.esc, $=id=>document.getElementById(id);
const {kind,isFrame,frames,items,fsize}=U;
const TOOL='create', TITLE='Create';
let B=null;
const st={ready:false,dirty:false,design:null,base:null,draftKey:null,blobs:new Map(),paths:new Map(),thumbT:0,capWarned:false,pickTarget:null,replaceTarget:null,leaving:false,saving:false};
const isPhone=()=>innerWidth<900;
const tick=ms=>new Promise(r=>setTimeout(r,ms||0));
const svg=(d,s)=>`<svg width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={
  check:svg('<path d="M20 6 9 17l-5-5"/>'),words:svg('<path d="M4 7V5h16v2"/><path d="M9 19h6"/><path d="M12 5v14"/>'),
  color:svg('<path d="M12 2.7s6 6.4 6 11.3a6 6 0 0 1-12 0c0-4.9 6-11.3 6-11.3z"/>'),font:svg('<path d="M4 20 10 4h1l6 16"/><path d="M6.5 14h8"/><path d="M17 20h4"/>'),
  size:svg('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>'),arrange:svg('<rect x="3" y="3" width="11" height="11" rx="2"/><rect x="10" y="10" width="11" height="11" rx="2"/>'),
  dup:svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),trash:svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>'),
  more:svg('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),crop:svg('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>'),
  photo:svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),swap:svg('<path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>'),
  several:svg('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M15 5h4v4M5 15v4h4"/>'),all:svg('<rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 3"/>'),
  page:svg('<rect x="5" y="2" width="14" height="20" rx="2"/>'),group:svg('<rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="4 3"/><rect x="7" y="7" width="5" height="5" rx="1"/><rect x="12" y="12" width="5" height="5" rx="1"/>'),
  lock:svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),unlock:svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'),
  eye:svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),eyeOff:svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/>'),
  al:svg('<path d="M4 3v18"/><rect x="8" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="7" height="4" rx="1"/>'),ahc:svg('<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>'),
  ar:svg('<path d="M20 3v18"/><rect x="4" y="6" width="12" height="4" rx="1"/><rect x="9" y="14" width="7" height="4" rx="1"/>'),at:svg('<path d="M3 4h18"/><rect x="6" y="8" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="7" rx="1"/>'),
  avc:svg('<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>'),ab:svg('<path d="M3 20h18"/><rect x="6" y="4" width="4" height="12" rx="1"/><rect x="14" y="9" width="4" height="7" rx="1"/>'),
  front:svg('<rect x="8" y="8" width="13" height="13" rx="2" fill="currentColor" stroke="none"/><path d="M3 15V5a2 2 0 0 1 2-2h10"/>'),back:svg('<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M21 9v10a2 2 0 0 1-2 2H9"/>'),
  up:svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),down:svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),flip:svg('<path d="M12 3v18"/><path d="M8 7 3 12l5 5V7z"/><path d="M16 7l5 5-5 5V7z"/>'),
  dh:svg('<rect x="3" y="7" width="4" height="10" rx="1"/><rect x="10" y="7" width="4" height="10" rx="1"/><rect x="17" y="7" width="4" height="10" rx="1"/>'),dv:svg('<rect x="7" y="3" width="10" height="4" rx="1"/><rect x="7" y="10" width="10" height="4" rx="1"/><rect x="7" y="17" width="10" height="4" rx="1"/>'),
  text:svg('<path d="M4 7V5h16v2"/><path d="M12 5v14"/>'),shape:svg('<circle cx="8" cy="8" r="5"/><rect x="12" y="12" width="9" height="9" rx="2"/>'),img:svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
  line:svg('<path d="M4 20 20 4"/>'),grp:svg('<rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="4 3"/>'),plus:svg('<path d="M12 5v14M5 12h14"/>'),
  bookmark:svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>')
};

/* ---------- toast + menu ---------- */
let toastT=0;
function toast(t,ms){ const el=$('crToast'); el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },ms||3200); }
BD.toast=toast;
function openMenu(anchor,entries){ const m=$('crMenuBox'); m.innerHTML=entries.map((e,i)=>e==='-'?'<div class="sep"></div>':e.head?`<div class="hd">${esc(e.head)}</div>`:`<button type="button" role="menuitem" data-i="${i}">${e.check!=null?(e.check?'✓ ':'<span style="width:12px;display:inline-block"></span>'):''}${esc(e.label)}</button>`).join('');
  m.hidden=false; const r=anchor.getBoundingClientRect(), mr=m.getBoundingClientRect(); m.style.left=Math.max(8,Math.min(r.left,innerWidth-mr.width-8))+'px'; m.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-mr.height-8))+'px';
  m.onclick=e=>{ const b=e.target.closest('[data-i]'); if(!b) return; m.hidden=true; entries[+b.dataset.i].run(); };
  setTimeout(()=>document.addEventListener('pointerdown',function off(e){ if(!m.contains(e.target)){ m.hidden=true; document.removeEventListener('pointerdown',off,true); } },true),0); }

/* ---------- sheets: tool sheets (the page stays usable) and big ones (Templates, Save, Add) ---------- */
let sheet=null;   // {name,tool,onClose,sel}
function openSheet(name,title,html,opt){ opt=opt||{}; closeSheet(true); sheet={name,tool:!!opt.tool,onClose:opt.onClose||null,sel:!!opt.sel};
  const el=$('crSheet'); el.classList.toggle('tool',!!opt.tool); el.dataset.name=name; $('crSheetT').textContent=title; $('crSheetB').innerHTML=html; el.hidden=false; $('crScrim').hidden=!!opt.tool; $('crSheetB').scrollTop=0;
  syncBar(); requestAnimationFrame(padForSheet); return $('crSheetB'); }
function closeSheet(quiet){ if(!sheet) return; const s=sheet; sheet=null; $('crSheet').hidden=true; $('crScrim').hidden=true; $('crSheetB').innerHTML=''; syncBar(); padForSheet(); if(s.onClose&&!quiet) s.onClose(); }
/* the page moves up (phone) or left (computer) so a tool sheet never covers it */
function padForSheet(){ const el=$('crSheet'); if(!sheet||!sheet.tool||el.hidden){ BD.setPad({bottom:16,right:16}); return; }
  if(isPhone()){ const r=el.getBoundingClientRect(), m=$('crMain').getBoundingClientRect(); BD.setPad({bottom:Math.max(16,m.bottom-r.top+12),right:16}); } else BD.setPad({bottom:16,right:420}); }
addEventListener('resize',()=>requestAnimationFrame(padForSheet));
$('crSheetX').onclick=()=>closeSheet(); $('crScrim').onclick=()=>{ if(!st.saving) closeSheet(); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&sheet&&!st.saving&&!BD.cropping()){ e.stopPropagation(); closeSheet(); } },true);
if(window.visualViewport){ const vv=visualViewport; const on=()=>{ const kb=Math.max(0,Math.round(innerHeight-vv.height-vv.offsetTop)); document.body.classList.toggle('kb-open',kb>80); document.documentElement.style.setProperty('--kb',(kb>80?kb:0)+'px'); }; vv.addEventListener('resize',on); vv.addEventListener('scroll',on); }

/* ---------- bottom bar ---------- */
function syncBar(){ document.querySelectorAll('#crBar [data-cr]').forEach(b=>b.classList.toggle('on',!!sheet&&b.dataset.cr===sheet.name&&b.dataset.cr!=='save')); }
$('crBar').addEventListener('click',e=>{ const b=e.target.closest('[data-cr]'); if(!b) return; const k=b.dataset.cr;
  if(sheet&&sheet.name===k&&k!=='save'){ closeSheet(); return; }
  if(k==='add') openAdd(); if(k==='text') addText(); if(k==='photo') photoTapped(); if(k==='templates') openTemplates(); if(k==='layers') openLayers(); if(k==='save') openSave(); });

/* ---------- what's selected ---------- */
const sel=()=>S.sel.filter(n=>n.getStage());
const textsIn=n=>kind(n)==='text'?[n]:(n.find?n.find(c=>kind(c)==='text'):[]);
const isPhoto=n=>kind(n)==='image';
const isSlot=n=>CR.isSlot(n);
const pal=()=>(B.palette&&B.palette.length?B.palette:[{name:'White',hex:'#FFFFFF'},{name:'Ink',hex:'#161210'}]);
const hex6=v=>{ const k=Konva.Util.colorToRGBA(v||'#000'); return k?'#'+[k.r,k.g,k.b].map(x=>x.toString(16).padStart(2,'0')).join(''):'#000000'; };
function after(){ BD.main.batchDraw(); BD.tr.forceUpdate(); BD.paintUI(); }
function relayout(n){ CR.relayoutAround(n); after(); }

/* the edit bar */
function cx(act,icon,label,o){ o=o||{}; return `<button type="button" class="cx${o.cls?' '+o.cls:''}" data-x="${act}"${o.pressed!=null?` aria-pressed="${!!o.pressed}"`:''} aria-label="${esc(o.aria||label)}">${icon}${label?`<span>${esc(label)}</span>`:''}</button>`; }
function paintCtx(){ const el=$('crCtx'), list=sel(); let h='';
  if(BD.cropping()){ el.innerHTML=`<span class="cx-info">Move and zoom the photo, then Done</span>`; return; }
  if(!list.length){ const fs=frames(), i=fs.indexOf(BD.activeFrame());
    h=S.multi?`<span class="cx-info">Tap things to select them</span>`+cx('multi',I.several,'Done selecting',{pressed:true}):cx('page',I.page,fs.length>1?'Page '+(i+1)+' of '+fs.length:'Page')+cx('bg',I.color,'Background')+cx('multi',I.several,'Select several')+cx('all',I.all,'Select all'); }
  else if(list.length===1&&!S.multi){ const n=list[0], locked=U.isLocked(n);
    h=cx('done',I.check,'',{cls:'done',aria:'Done (deselect)'});
    if(locked) h+=`<span class="cx-info">Locked</span>`+cx('unlock',I.unlock,'Unlock');
    else { if(isSlot(n)) h+=cx('slot',I.photo,'Add photo');
      if(textsIn(n).length) h+=cx('words',I.words,'Words');
      if(colorTargets(n).length) h+=cx('color',I.color,'Colour');
      if(textsIn(n).length) h+=cx('font',I.font,'Font');
      if(isPhoto(n)) h+=cx('crop',I.crop,'Crop')+cx('replace',I.swap,'Replace');
      h+=cx('size',I.size,'Size')+cx('arrange',I.arrange,'Arrange')+cx('dup',I.dup,'Duplicate')+cx('del',I.trash,'Delete',{cls:'danger'})+cx('more',I.more,'More'); } }
  else { h=cx('done',I.check,'',{cls:'done',aria:'Done (deselect)'})+`<span class="cx-info">${list.length} selected</span>`;
    if(S.multi) h+=cx('multi',I.several,'Done selecting',{pressed:true});
    if(list.some(n=>colorTargets(n).length)) h+=cx('color',I.color,'Colour'); if(list.some(n=>textsIn(n).length)) h+=cx('font',I.font,'Font');
    h+=cx('size',I.size,'Size')+cx('arrange',I.arrange,'Align')+(list.length>1?cx('group',I.group,'Group'):'')+cx('dup',I.dup,'Duplicate')+cx('del',I.trash,'Delete',{cls:'danger'})+cx('more',I.more,'More'); }
  el.innerHTML=h; }
$('crCtx').addEventListener('click',e=>{ const b=e.target.closest('[data-x]'); if(!b) return; const a=b.dataset.x, n=sel()[0];
  const run={done:()=>{ BD.setMulti(false); BD.select([]); },multi:()=>{ BD.setMulti(!S.multi); paintCtx(); if(S.multi) toast('Tap things to add or remove them.'); },all:()=>BD.selectAll(),
    page:()=>openPage(),bg:()=>openPageBg(),unlock:()=>BD.act.lock(false),slot:()=>pickInto(n),words:()=>openWords(),color:()=>openColor(),font:()=>openFont(),
    crop:()=>startCrop(n),replace:()=>{ st.replaceTarget=n; $('crReplace').click(); },size:()=>openSize(),arrange:()=>openArrange(),dup:()=>BD.act.duplicate(),del:()=>BD.act.del(),
    group:()=>BD.act.group(),more:()=>moreMenu(b)};
  if(run[a]) run[a](); });
function moreMenu(anchor){ const list=sel(), n=list[0]; const e=[];
  if(list.length===1&&isPhoto(n)) e.push({label:'Fill the page',run:()=>BD.act.fillPage(n)});
  if(list.some(x=>kind(x)==='group')) e.push({label:'Ungroup',run:()=>BD.act.ungroup()});
  if(list.length>1) e.push({label:'Group',run:()=>BD.act.group()});
  e.push({label:'Flip',run:()=>BD.act.flip()},{label:'Lock',run:()=>BD.act.lock(true)},{label:'Hide',run:()=>{ list.forEach(x=>BD.act.hide(x)); }});
  e.push('-',{label:S.multi?'Stop selecting several':'Select several',run:()=>{ BD.setMulti(!S.multi); paintCtx(); }},{label:'Select all on this page',run:()=>BD.selectAll()});
  openMenu(anchor,e); }
BD.on('select',()=>{ paintCtx(); if(sheet&&sheet.sel){ if(!sel().length) closeSheet(); else reopenSel(); } if(sheet&&sheet.name==='layers') paintLayerList(); });
BD.on('dbl',n=>{ if(isSlot(n)) pickInto(n); else if(isPhoto(n)) startCrop(n); else if(textsIn(n).length) openWords(); });
BD.on('crop',()=>paintCtx());

/* ---------- property sheets ---------- */
let reopen=null;
function reopenSel(){ if(reopen) reopen(); }
function selSheet(name,title,html,fn){ reopen=fn; return openSheet(name,title,html,{tool:true,sel:true}); }

/* Words: every text in the selected thing */
function openWords(){ const list=sel(); if(!list.length) return; const texts=list.flatMap(textsIn); if(!texts.length) return;
  const body=selSheet('words','Words',texts.map((t,i)=>`<label class="lbl" for="crW${i}">${esc(texts.length>1?(t.getAttr('label')||'Words '+(i+1)):'Words')}</label><textarea class="cr-words" id="crW${i}" data-i="${i}" dir="auto" rows="${Math.min(4,Math.max(1,(t.text()||'').split('\n').length))}">${esc(t.text())}</textarea>`).join('')+'<p class="small">New line: Enter. Close with Done.</p>',openWords);
  body.querySelectorAll('textarea').forEach(ta=>{ const t=texts[+ta.dataset.i];
    ta.addEventListener('input',()=>{ t.text(ta.value||' '); BD.prepText(t); if(t.getAttr('autoW')) t.width(undefined); relayout(t); });
    ta.addEventListener('change',()=>BD.changed()); });
  const first=body.querySelector('textarea'); if(first){ setTimeout(()=>{ first.focus({preventScroll:true}); if(first.value===CR.write()) first.select(); },60); } }

/* Colour: the parts of the selected thing that can take a colour */
function colorTargets(n){ const k=kind(n), out=[];
  const add=(label,get,set,o)=>out.push(Object.assign({label,get,set},o||{}));
  if(k==='text') add('Words',()=>n.fill(),v=>n.fill(v));
  else if(k==='rect'||k==='ellipse'||k==='path'){ add('Fill',()=>n.fill(),v=>n.fill(v||''),{none:true}); add('Outline',()=>n.stroke(),v=>{ n.stroke(v||''); if(v&&!n.strokeWidth()) n.strokeWidth(8); },{none:true,width:true,node:n}); }
  else if(k==='icon'||k==='line') add('Line',()=>n.stroke(),v=>{ n.stroke(v); if(n.getClassName()==='Arrow') n.fill(v); });
  else if(k==='group'){ const kids=n.find(c=>c.getClassName()!=='Group'); const bg=kids.filter(c=>c.getAttr('role')==='bg'), tx=kids.filter(c=>kind(c)==='text'), ic=kids.filter(c=>c.getAttr('role')==='icon'||kind(c)==='icon'||c.getAttr('iconId')==='pin-fill');
    const shapes=kids.filter(c=>['rect','ellipse','path'].includes(kind(c))&&!bg.includes(c)&&!ic.includes(c));
    const fillOf=c=>c.getAttr('iconId')==='pin-fill'||kind(c)!=='icon'?'fill':'stroke';
    if(bg.length&&!n.getAttr('slot')) add('Background',()=>bg[0].fill(),v=>bg.forEach(c=>c.fill(v)));
    if(tx.length) add('Words',()=>tx[0].fill(),v=>tx.forEach(c=>c.fill(v)));
    if(ic.length) add('Icon',()=>ic[0][fillOf(ic[0])](),v=>ic.forEach(c=>c[fillOf(c)](v)));
    if(shapes.length) add(bg.length?'Shapes':'Fill',()=>shapes[0].fill(),v=>shapes.forEach(c=>c.fill(v))); }
  return out; }
function swatches(key,cur,o){ o=o||{}; const c=String(cur||'').toLowerCase(); let hit=false;
  const sw=pal().map(p=>{ const on=!!c&&p.hex.toLowerCase()===c.slice(0,7); if(on) hit=true; return `<button type="button" class="cr-sw" style="--c:${p.hex}" data-k="${key}" data-c="${p.hex}" aria-label="${esc(p.name)}" title="${esc(p.name)}" aria-pressed="${on}"></button>`; }).join('');
  const rec=(L.recentColours?L.recentColours():[]).map(h=>{ const on=!hit&&!!c&&h.toLowerCase()===c.slice(0,7); if(on) hit=true; return `<button type="button" class="cr-sw recent" style="--c:${h}" data-k="${key}" data-c="${h}" aria-label="Recent colour ${h}" title="Recent ${h}" aria-pressed="${on}"></button>`; }).join('');
  return `<div class="cr-sws">${sw}${rec?'<span class="cr-sw-sep" aria-hidden="true"></span>'+rec:''}${o.none?`<button type="button" class="cr-sw none" data-k="${key}" data-c="" aria-label="None" title="None" aria-pressed="${!c}"></button>`:''}<label class="cr-sw custom" title="Custom colour"><input type="color" data-k="${key}" value="${hex6(cur||'#000000')}" aria-label="Custom colour"></label></div>`; }
function openColor(){ const list=sel(); if(!list.length) return; const first=list.find(n=>colorTargets(n).length); if(!first) return; const tg=colorTargets(first);
  const body=selSheet('color','Colour',tg.map((t,i)=>`<span class="lbl">${esc(t.label)}</span>${swatches(i,typeof t.get()==='string'?t.get():'',t)}${t.width?`<div class="cr-row"><span class="lbl">Outline width</span><input type="range" min="0" max="60" step="1" value="${Math.round(t.node.strokeWidth()||0)}" data-sw="${i}"></div>`:''}`).join('')+(list.length>1?'<p class="small">Changes every selected thing that has this part.</p>':''),openColor);
  const apply=(i,v)=>{ const label=tg[i].label; list.forEach(n=>{ const t=colorTargets(n).find(x=>x.label===label)||(colorTargets(n).length===1?colorTargets(n)[0]:null); if(t) t.set(v); }); after(); };
  body.addEventListener('click',e=>{ const b=e.target.closest('.cr-sw[data-c]'); if(!b) return; apply(+b.dataset.k,b.dataset.c); BD.changed(); body.querySelectorAll(`.cr-sw[data-k="${b.dataset.k}"]`).forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
  body.addEventListener('input',e=>{ const t=e.target; if(t.type==='color') apply(+t.dataset.k,t.value); if(t.dataset.sw!=null){ list.forEach(n=>{ if(n.strokeWidth&&kind(n)!=='group') n.strokeWidth(+t.value); }); after(); } });
  body.addEventListener('change',e=>{ if(e.target.type==='color'&&L.addRecentColour) L.addRecentColour(e.target.value); BD.changed(); }); }
function openPageBg(){ const f=BD.activeFrame(); if(!f) return; const bg=U.frameBg(f); reopen=null;
  const body=openSheet('pagebg','Page background',swatches(0,typeof bg.fill()==='string'?bg.fill():'#ffffff')+'<p class="small">White is the main look; Cream is the second look. Keep one look per design.</p>',{tool:true});
  body.addEventListener('click',e=>{ const b=e.target.closest('.cr-sw[data-c]'); if(!b) return; bg.fill(b.dataset.c||'#ffffff'); BD.main.batchDraw(); BD.changed(); body.querySelectorAll('.cr-sw[data-c]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
  body.addEventListener('input',e=>{ if(e.target.type==='color'){ bg.fill(e.target.value); BD.main.batchDraw(); } }); body.addEventListener('change',e=>{ if(e.target.type==='color'&&L.addRecentColour) L.addRecentColour(e.target.value); BD.changed(); }); }

/* Font */
const MORE=(L.MORE_FONTS||[]).map(f=>f.family);
function openFont(){ const list=sel(); const texts=list.flatMap(textsIn); if(!texts.length) return; const t=texts[0];
  const fams=[...L.brandFonts().map(f=>f.family),...MORE].filter((v,i,a)=>a.indexOf(v)===i); const one=list.length===1&&kind(list[0])==='text';
  const al=['right','center','left'];
  const body=selSheet('font','Font',`<div class="cr-row"><span class="lbl">Font</span><select class="cr-sel" id="fFam">${fams.map(f=>`<option ${f===t.fontFamily()?'selected':''}>${esc(f)}</option>`).join('')}${fams.includes(t.fontFamily())?'':`<option selected>${esc(t.fontFamily())}</option>`}</select></div>
    <div class="cr-row"><span class="lbl">Size</span><input type="range" id="fSize" min="12" max="400" step="1" value="${Math.round(t.fontSize())}"><output id="fSizeO">${Math.round(t.fontSize())}</output></div>
    <div class="cr-row"><span class="lbl">Weight</span><div class="cr-seg" id="fW">${[['400','Regular'],['600','Semi-bold'],['800','Bold']].map(([w,l])=>`<button type="button" data-w="${w}" aria-pressed="${(String(t.fontStyle()).match(/\d{3}/)||['400'])[0]===w}">${l}</button>`).join('')}</div></div>
    ${one?`<div class="cr-row"><span class="lbl">Align</span><div class="cr-seg" id="fAl">${al.map(a=>`<button type="button" data-a="${a}" aria-pressed="${t.align()===a}">${a==='center'?'Centre':a[0].toUpperCase()+a.slice(1)}</button>`).join('')}</div></div>
    <div class="cr-row"><span class="lbl">Line height</span><input type="range" id="fLH" min="0.8" max="2.2" step="0.05" value="${t.lineHeight()}"></div>
    <div class="cr-row"><span class="lbl">Spacing</span><input type="range" id="fLS" min="-10" max="60" step="1" value="${t.letterSpacing()||0}"></div>
    <span class="lbl">Background pill</span>${swatches('tbg',t.getAttr('tbg')||'',{none:true})}`:''}`,openFont);
  const base=texts.map(x=>x.fontSize()), k0=t.fontSize();
  const each=fn=>{ texts.forEach(fn); texts.forEach(x=>{ BD.prepText(x); if(x.getAttr('autoW')) x.width(undefined); CR.relayoutAround(x); }); after(); };
  body.querySelector('#fFam').onchange=async e=>{ const fam=e.target.value; await Promise.all(texts.map(x=>BD.ensureFont(fam,x.fontStyle()))); each(x=>x.fontFamily(fam)); BD.changed(); };
  body.querySelector('#fSize').oninput=e=>{ const v=+e.target.value; body.querySelector('#fSizeO').textContent=v; each((x,i)=>x.fontSize(Math.max(6,base[i]*v/k0))); };
  body.querySelector('#fSize').onchange=()=>BD.changed();
  body.querySelector('#fW').onclick=async e=>{ const b=e.target.closest('[data-w]'); if(!b) return; await Promise.all(texts.map(x=>BD.ensureFont(x.fontFamily(),b.dataset.w))); each(x=>x.fontStyle(b.dataset.w==='400'?'normal':b.dataset.w)); body.querySelectorAll('#fW button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); BD.changed(); };
  if(one){ body.querySelector('#fAl').onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b) return; each(x=>x.align(b.dataset.a)); body.querySelectorAll('#fAl button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); BD.changed(); };
    body.querySelector('#fLH').oninput=e=>each(x=>x.lineHeight(+e.target.value)); body.querySelector('#fLS').oninput=e=>each(x=>x.letterSpacing(+e.target.value));
    body.querySelectorAll('#fLH,#fLS').forEach(i=>i.onchange=()=>BD.changed());
    const pill=v=>each(x=>{ x.setAttr('tbg',v||undefined); x.setAttr('tbgR',v?Math.round(x.fontSize()*.5):undefined); x.padding(v?Math.round(x.fontSize()*.28):0); });
    body.addEventListener('click',e=>{ const b=e.target.closest('.cr-sw[data-c]'); if(!b) return; pill(b.dataset.c); BD.changed(); body.querySelectorAll('.cr-sw[data-k="tbg"]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
    body.addEventListener('input',e=>{ if(e.target.type==='color'&&e.target.dataset.k==='tbg') pill(e.target.value); }); } }

/* Size: bigger / smaller, turn, see-through, corners */
function openSize(){ const list=sel().filter(n=>!U.isLocked(n)); if(!list.length) return; const n=list[0], f=BD.activeFrame();
  const corners=list.length===1&&(kind(n)==='rect'||isPhoto(n)||isSlot(n));
  const cr0=corners?(isSlot(n)?n.getAttr('slotR')||0:(Array.isArray(n.cornerRadius())?n.cornerRadius()[0]:n.cornerRadius()||0)):0;
  const body=selSheet('size','Size',`<div class="cr-row"><span class="lbl">Size</span><input type="range" id="sK" min="0.1" max="4" step="0.01" value="1"><output id="sKo">100%</output></div>
    <div class="cr-row"><span class="lbl">Turn</span><input type="range" id="sR" min="-180" max="180" step="1" value="${Math.round(n.rotation())}"><output id="sRo">${Math.round(n.rotation())}°</output></div>
    <div class="cr-row"><span class="lbl"></span><div class="cr-seg" id="sRb"><button type="button" data-r="-15">↺ 15°</button><button type="button" data-r="0">Straight</button><button type="button" data-r="15">↻ 15°</button></div></div>
    <div class="cr-row"><span class="lbl">Opacity</span><input type="range" id="sO" min="0.05" max="1" step="0.05" value="${n.opacity()}"></div>
    ${corners?`<div class="cr-row"><span class="lbl">Corners</span><input type="range" id="sC" min="0" max="400" step="2" value="${Math.round(cr0)}"></div>`:''}`,openSize);
  let base;
  const snapBase=()=>{ base=list.map(x=>({x,r:U.prect(x,f),s:{x:x.scaleX(),y:x.scaleY()},fs:x.fontSize?x.fontSize():0,w:x.width(),h:x.height(),k:kind(x)})); }; snapBase();
  const centre=o=>{ const r=U.prect(o.x,f); o.x.x(o.x.x()+(o.r.x+o.r.width/2)-(r.x+r.width/2)); o.x.y(o.x.y()+(o.r.y+o.r.height/2)-(r.y+r.height/2)); };
  body.querySelector('#sK').oninput=e=>{ const k=+e.target.value; body.querySelector('#sKo').textContent=Math.round(k*100)+'%';
    base.forEach(o=>{ const x=o.x; if(o.k==='text'){ x.fontSize(Math.max(6,o.fs*k)); if(x.getAttr('autoW')) x.width(undefined); else x.width(o.w*k); } else if(o.k==='rect'||o.k==='image'){ x.width(Math.max(4,o.w*k)); x.height(Math.max(4,o.h*k)); if(o.k==='image') BD.applyCrop(x); } else x.scale({x:o.s.x*k,y:o.s.y*k}); centre(o); }); after(); };
  body.querySelector('#sR').oninput=e=>{ const v=+e.target.value; body.querySelector('#sRo').textContent=v+'°'; base.forEach(o=>{ o.x.rotation(v); centre(o); }); after(); };
  body.querySelector('#sRb').onclick=e=>{ const b=e.target.closest('[data-r]'); if(!b) return; const d=+b.dataset.r; base.forEach(o=>{ o.x.rotation(d===0?0:o.x.rotation()+d); centre(o); }); body.querySelector('#sR').value=Math.round(n.rotation()); body.querySelector('#sRo').textContent=Math.round(n.rotation())+'°'; after(); BD.changed(); snapBase(); };
  body.querySelector('#sO').oninput=e=>{ list.forEach(x=>x.opacity(+e.target.value)); after(); };
  if(corners) body.querySelector('#sC').oninput=e=>{ const v=+e.target.value; if(isSlot(n)){ n.setAttr('slotR',v); const bg=n.findOne(c=>c.getAttr('role')==='bg'); if(bg) bg.cornerRadius(v); } else n.cornerRadius(v); after(); };
  body.querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{ BD.changed(); snapBase(); if(i.id==='sK'){ i.value=1; body.querySelector('#sKo').textContent='100%'; } })); }

/* Arrange: layer order, align, spread out, flip */
function openArrange(){ const list=sel(); if(!list.length) return; const many=list.length>1;
  const body=selSheet('arrange',many?'Align':'Arrange',`<span class="lbl">${many?'Line them up':'On the page'}</span>
    <div class="cr-grid3">${[['left',I.al,'Left'],['hc',I.ahc,'Centre'],['right',I.ar,'Right'],['top',I.at,'Top'],['vc',I.avc,'Middle'],['bottom',I.ab,'Bottom']].map(([a,i,l])=>`<button type="button" class="cr-btn" data-al="${a}">${i}${l}</button>`).join('')}</div>
    ${list.length>2?`<span class="lbl">Spread out evenly</span><div class="cr-grid3"><button type="button" class="cr-btn" data-di="h">${I.dh}Across</button><button type="button" class="cr-btn" data-di="v">${I.dv}Down</button></div>`:''}
    <span class="lbl">Layer order</span><div class="cr-grid4">${[['front',I.front,'To front'],['up',I.up,'Forward'],['down',I.down,'Backward'],['back',I.back,'To back']].map(([a,i,l])=>`<button type="button" class="cr-btn" data-or="${a}">${i}${l}</button>`).join('')}</div>
    <div class="cr-row"><button type="button" class="cr-btn" data-fl="1">${I.flip}Flip</button>${many?`<button type="button" class="cr-btn" data-gr="1">${I.group}Group</button>`:''}${list.some(n=>kind(n)==='group')?`<button type="button" class="cr-btn" data-ug="1">${I.group}Ungroup</button>`:''}</div>`,openArrange);
  body.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
    if(d.al) BD.act.align(d.al); if(d.di) BD.act.distribute(d.di); if(d.or) BD.act.order(d.or); if(d.fl) BD.act.flip(); if(d.gr) BD.act.group(); if(d.ug) BD.act.ungroup(); }); }

/* Page: size, copy as, add, duplicate, move, delete */
const SIZES=[
  {id:'story',label:'Story',w:1080,h:1920,sub:'1080×1920'},
  {id:'post',label:'Post',w:1080,h:1350,sub:'1080×1350'},
  {id:'square',label:'Square',w:1080,h:1080,sub:'1080×1080'},
  {id:'carousel',label:'Carousel',w:1080,h:1350,pages:3,sub:'3 slides'},
  {id:'highlight',label:'Highlight',w:1080,h:1080,round:true,sub:'cover'}
];
const sizeOf=id=>SIZES.find(s=>s.id===id)||SIZES[0];
const pvStyle=(w,h,m)=>{ m=m||40; const k=m/Math.max(w,h); return `width:${Math.round(w*k)}px;height:${Math.round(h*k)}px`; };
function sizeRow(){ return `<div class="cr-sizes">${SIZES.map(s=>`<button type="button" class="cr-size" data-size="${s.id}"><span class="pv${s.round?' round':''}${s.pages?' multi':''}" style="${pvStyle(s.w,s.h,s.round?34:40)}"></span>${esc(s.label)}<small>${esc(s.sub)}</small></button>`).join('')}</div>`; }
function openPage(){ const f=BD.activeFrame(); if(!f) return; reopen=null; const fs=frames(), i=fs.indexOf(f), s=fsize(f);
  const body=openSheet('page','Page '+(i+1)+(fs.length>1?' of '+fs.length:''),`<span class="lbl">Make this page a… (${s.w}×${s.h} now)</span>
    <div class="cr-seg">${SIZES.filter(x=>!x.pages).map(x=>`<button type="button" data-rs="${x.id}" aria-pressed="${x.w===s.w&&x.h===s.h&&!!x.round===!!f.getAttr('round')}">${esc(x.label)}</button>`).join('')}</div>
    <span class="lbl">Copy this page as</span><div class="cr-seg"><button type="button" data-cp="story">A story</button><button type="button" data-cp="post">A post</button><button type="button" data-cp="square">A square</button></div>
    <span class="lbl">Pages</span><div class="cr-seg"><button type="button" data-pg="add">${I.plus} Add a page</button><button type="button" data-pg="dup">${I.dup} Duplicate</button>${i>0?`<button type="button" data-pg="left">Move earlier</button>`:''}${i<fs.length-1?`<button type="button" data-pg="right">Move later</button>`:''}${fs.length>1?`<button type="button" data-pg="del" class="danger">Delete page</button>`:''}</div>
    <div class="cr-row"><label class="check"><input type="checkbox" id="pSafe" ${BD.showSafe?'checked':''}> Show the story safe zones</label></div>`,{tool:true});
  body.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
    if(d.rs){ resizePage(f,sizeOf(d.rs)); openPage(); }
    if(d.cp){ const c=copyPage(f); resizePage(c,sizeOf(d.cp)); BD.showPage(c); paintPages(); closeSheet(); toast('Copied as a '+sizeOf(d.cp).label.toLowerCase()+'.'); }
    if(d.pg==='add'){ closeSheet(); addPage(); }
    if(d.pg==='dup'){ const c=copyPage(f); BD.showPage(c); paintPages(); closeSheet(); }
    if(d.pg==='left'||d.pg==='right'){ d.pg==='left'?f.moveDown():f.moveUp(); BD.changed(); BD.emitDoc(); paintPages(); openPage(); }
    if(d.pg==='del'){ if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='Tap again to delete'; return; } const next=fs[i+1]||fs[i-1]; f.destroy(); BD.showPage(next); BD.changed(); BD.emitDoc(); paintPages(); closeSheet(); } });
  body.querySelector('#pSafe').onchange=e=>{ BD.showSafe=e.target.checked; BD.paintUI(); }; }
function copyPage(f){ const c=BD.rebuild(BD.toObj(f),true); BD.main.add(c); c.zIndex(f.zIndex()+1); c.setAttr('label',(f.getAttr('label')||'Page')+' copy'); c.find('Image').forEach(n=>BD.applyFx(n)); BD.changed(); BD.emitDoc(); return c; }
/* a new size for a page: everything is scaled to fit and centred; a photo that filled the page fills it again */
function resizePage(f,sz){ const s=fsize(f), k=Math.min(sz.w/s.w,sz.h/s.h), ox=(sz.w-s.w*k)/2, oy=(sz.h-s.h*k)/2;
  items(f).forEach(n=>{ if(n.hasName('frame-bg')) return; const kd=kind(n), r=U.prect(n,f), full=kd==='image'&&Math.abs(r.x)<2&&Math.abs(r.y)<2&&Math.abs(r.width-s.w)<3&&Math.abs(r.height-s.h)<3;
    if(full){ n.setAttrs({x:0,y:0,width:sz.w,height:sz.h}); BD.applyCrop(n); return; }
    n.position({x:n.x()*k+ox,y:n.y()*k+oy});
    if(kd==='text'){ n.fontSize(n.fontSize()*k); if(!n.getAttr('autoW')) n.width(n.width()*k); n.padding(n.padding()*k); }
    else if(kd==='rect'||kd==='image'){ n.width(n.width()*k); n.height(n.height()*k); if(typeof n.cornerRadius()==='number') n.cornerRadius(n.cornerRadius()*k); if(kd==='image') BD.applyCrop(n); }
    else n.scale({x:n.scaleX()*k,y:n.scaleY()*k}); });
  BD.setFrameSize(f,sz.w,sz.h); f.setAttr('round',sz.round?1:undefined); BD.showPage(f); BD.changed(); BD.emitDoc(); }
function addPage(sz){ const cur=BD.activeFrame(), s=sz||(cur?fsize(cur):{w:1080,h:1920}); const f=BD.makeFrame(0,0,s.w,s.h,{label:'Page '+(frames().length+1),fill:cur&&!sz&&typeof U.frameBg(cur).fill()==='string'?U.frameBg(cur).fill():'#FFFFFF'});
  if(cur&&!sz&&cur.getAttr('round')) f.setAttr('round',1); if(cur) f.zIndex(cur.zIndex()+1); BD.showPage(f); touch(); BD.changed(); BD.emitDoc(); paintPages(); return f; }

/* ---------- pages strip ---------- */
function paintPages(){ const el=$('crPages'), fs=frames(); if(!st.ready||!fs.length){ el.innerHTML=''; return; } const cur=BD.activeFrame();
  el.innerHTML=(fs.length>1?fs.map((f,i)=>`<button type="button" class="cr-pg" data-pg="${f.id()}" aria-current="${f===cur}" aria-label="Page ${i+1}">${i+1}</button>`).join(''):'')+`<button type="button" class="cr-pg add" data-pg="+" aria-label="Add a page" title="Add a page">+</button>`; }
$('crPages').addEventListener('click',e=>{ const b=e.target.closest('[data-pg]'); if(!b) return; if(b.dataset.pg==='+'){ addPage(); return; } const f=BD.main.findOne('#'+b.dataset.pg); if(!f) return; if(f===BD.activeFrame()) openPage(); else BD.showPage(f); });
BD.on('page',()=>{ paintPages(); paintCtx(); if(sheet&&sheet.name==='layers') paintLayerList(); });
BD.on('doc',()=>{ paintPages(); if(sheet&&sheet.name==='layers') paintLayerList(); });

/* ---------- adding things ---------- */
async function addText(){ const f=BD.activeFrame(); if(!f) return; await BD.ensureFont(BD.displayFont(),'');
  const n=BD.make.text(CR.write(),{fontFamily:BD.displayFont(),fontSize:Math.round(fsize(f).w*.11),fill:CR.colors().ink}); BD.place(n); openWords(); }
function photoTapped(){ const n=sel()[0]; st.pickTarget=isSlot(n)?n:null; $('crPick').click(); }
function pickInto(slot){ st.pickTarget=slot; $('crPick').click(); }
$('crPick').addEventListener('change',async e=>{ const files=[...e.target.files].filter(L.isPhotoFile); e.target.value=''; if(!files.length) return;
  let target=st.pickTarget; st.pickTarget=null; const rest=[]; BD.busy(files.length>1?'Adding '+files.length+' photos…':'Adding the photo…');
  try{ for(const file of files){ const slot=target&&target.getStage()?target:CR.emptySlot(BD.activeFrame()); target=null;
      if(slot){ try{ await CR.fillSlot(slot,file); }catch(_){ toast('Could not open '+(file.name||'that photo')+'.'); } } else rest.push(file); }
    if(rest.length) await BD.addPhotos(rest); }
  finally{ BD.busy(null); } });
$('crReplace').addEventListener('change',async e=>{ const file=e.target.files[0]; e.target.value=''; const n=st.replaceTarget; st.replaceTarget=null; if(!file||!n||!n.getStage()) return;
  BD.busy('Replacing the photo…'); try{ const id=await BD.addPhotoFile(file), im=BD.IMGS.get(id); n.setAttrs({imgId:id,cropZ:1,focX:.5,focY:.5}); n.image(im.el); BD.applyCrop(n); BD.main.batchDraw(); BD.changed(); }catch(_){ toast('Could not open that photo.'); } finally{ BD.busy(null); } });
function startCrop(n){ if(!n) return; closeSheet(true); BD.startCrop(n); $('crCrop').hidden=false; $('crCropZ').value=n.getAttr('cropZ')||1; paintCtx(); }
$('crCropZ').oninput=e=>BD.cropZoom(+e.target.value); BD.on('cropz',z=>{ $('crCropZ').value=z; });
$('crCropDone').onclick=()=>{ $('crCrop').hidden=true; BD.endCrop(); };

/* Add sheet: elements, brand pictures, shapes, lines, icons, emoji */
function openAdd(){ reopen=null; const as=L.brandAssets();
  const els=CR.ELEMENTS.filter(e=>!e.when||e.when());
  const shapeSvg=(d,stroke)=>`<svg viewBox="${stroke?'-6 -6 112 112':'0 0 100 100'}" aria-hidden="true"><path d="${d}" ${stroke?'fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"':'fill="currentColor"'}/></svg>`;
  const native={rect:'M8 8H92V92H8Z',rounded:'M30 8H70A22 22 0 0 1 92 30V70A22 22 0 0 1 70 92H30A22 22 0 0 1 8 70V30A22 22 0 0 1 30 8Z',ellipse:'M92 50A42 42 0 1 1 8 50A42 42 0 1 1 92 50Z',triangle:'M50 8L94 88H6Z',pentagon:'M50 6L94 38L77 90H23L6 38Z',hexagon:'M28 10H72L94 50L72 90H28L6 50Z',star:'M50 4L61 37H96L68 58L79 92L50 71L21 92L32 58L4 37H39Z',star8:'M50 2L60 26L84 16L74 40L98 50L74 60L84 84L60 74L50 98L40 74L16 84L26 60L2 50L26 40L16 16L40 26Z',ring:'M50 6A44 44 0 1 1 49.9 6ZM50 26A24 24 0 1 0 50.1 26Z',line:'M8 50H92',arrow:'M8 50H86M66 30L88 50L66 70'};
  const body=openSheet('add','Add',`<div class="cr-jump">${[['els','Elements'],['brand','Brand'],['shapes','Shapes'],['lines','Lines'],['icons','Icons'],['emoji','Emoji']].map(([i,l])=>`<button type="button" data-j="${i}">${l}</button>`).join('')}</div>
    <span class="lbl" id="j-els">Elements</span><div class="cr-els">${els.map(e=>`<button type="button" class="cr-el" data-el="${e.id}"><span class="im" data-prev="${e.id}"></span>${esc(e.label)}</button>`).join('')}</div>
    <p class="small">Each element is ordinary layers: move, size, recolour, change the words (double-tap), or ungroup it.</p>
    <span class="lbl" id="j-brand">Brand</span><div class="cr-els">${as.map(a=>`<button type="button" class="cr-el" data-asset="${a.id}"><span class="im"><img alt="" loading="lazy" src="${L.assetPrevUrl(a)}"></span>${esc(a.label)}</button>`).join('')}<button type="button" class="cr-el" data-photo="1"><span class="im">${I.photo}</span>Your photos</button></div>
    <span class="lbl" id="j-shapes">Shapes</span><div class="cr-icons">${BD.SHAPES.map(s=>`<button type="button" data-shape="${s.id}" aria-label="${esc(s.label)}" title="${esc(s.label)}">${shapeSvg(s.path||native[s.id]||native.rect)}</button>`).join('')}</div>
    <span class="lbl" id="j-lines">Lines</span><div class="cr-icons">${BD.STROKES.map(s=>`<button type="button" data-stroke="${s.id}" aria-label="${esc(s.label)}" title="${esc(s.label)}">${shapeSvg(s.path||native[s.id],true)}</button>`).join('')}</div>
    <span class="lbl" id="j-icons">Icons</span><div class="cr-icons">${CR.allIcons().map(i=>`<button type="button" data-icon="${i.id}" aria-label="${esc(i.id.replace(/-/g,' '))}" title="${esc(i.id.replace(/-/g,' '))}">${svg(`<path d="${i.d}"/>`,24)}</button>`).join('')}</div>
    <span class="lbl" id="j-emoji">Emoji</span><div class="cr-icons">${String(BD.EMOJI||'').split(/\s+/).filter(Boolean).map(e=>`<button type="button" data-emoji="${e}" style="font-size:24px">${e}</button>`).join('')}</div>`);
  body.querySelectorAll('[data-prev]').forEach(sp=>{ const e=CR.element(sp.dataset.prev); if(e&&e.asset){ const a=as.find(x=>x.id===e.asset); if(a) sp.innerHTML=`<img alt="" src="${L.assetPrevUrl(a)}">`; return; } const u=CR.preview(sp.dataset.prev); if(u) sp.innerHTML=`<img alt="" src="${u}">`; });
  body.addEventListener('click',async e=>{ const b=e.target.closest('button'); if(!b) return; const d=b.dataset, f=BD.activeFrame(), w=f?fsize(f).w:1080, c=CR.colors();
    if(d.j){ const t=body.querySelector('#j-'+d.j); if(t) body.scrollTo({top:t.offsetTop-56,behavior:'smooth'}); return; }
    if(d.photo){ closeSheet(); photoTapped(); return; }
    if(!(d.el||d.asset||d.shape||d.stroke||d.icon||d.emoji)) return;
    closeSheet(true);
    if(d.el) await CR.addElement(d.el);
    if(d.asset){ const a=as.find(x=>x.id===d.asset); if(a) await BD.addAsset(a); }
    if(d.shape){ const s=BD.SHAPES.find(x=>x.id===d.shape); BD.place(BD.make.shape(s,Math.round(w*.4),c.blob)); }
    if(d.stroke){ const s=BD.STROKES.find(x=>x.id===d.stroke); BD.place(BD.make.shape(Object.assign({stroke:!s.make},s),Math.round(w*.4),c.ink)); }
    if(d.icon){ const s=CR.iconDef(d.icon); BD.place(BD.make.icon(s,Math.round(w*.16),c.ink)); }
    if(d.emoji){ BD.place(BD.make.text(d.emoji,{fontSize:Math.round(w*.16),fontFamily:'system-ui'})); } }); }

/* Layers: what's on this page, top first */
const kindIcon=n=>{ const k=kind(n); return k==='text'?I.text:k==='image'||k==='asset'?I.img:k==='group'?I.grp:k==='line'||k==='icon'?I.line:I.shape; };
function openLayers(){ reopen=null; openSheet('layers','Layers',`<div class="cr-layers" id="crLy"></div><p class="small">Tap to select. The eye hides a thing; the lock stops it moving or being picked by a tap.</p>`,{tool:true}); paintLayerList(); }
function paintLayerList(){ const el=$('crLy'); if(!el) return; const f=BD.activeFrame(); if(!f) return; const list=items(f).filter(n=>!n.hasName('frame-bg')).reverse();
  el.innerHTML=list.length?list.map(n=>{ const on=S.sel.includes(n), lk=U.isLocked(n), vis=n.visible(); return `<div class="cr-ly${vis?'':' hid'}" role="option" aria-selected="${on}" data-id="${n.id()}"><span class="kd">${kindIcon(n)}</span><span class="nm" dir="auto">${esc(U.nameOf(n))}</span><button type="button" class="ib" data-eye="${n.id()}" aria-pressed="${!vis}" aria-label="${vis?'Hide':'Show'}">${vis?I.eye:I.eyeOff}</button><button type="button" class="ib" data-lk="${n.id()}" aria-pressed="${lk}" aria-label="${lk?'Unlock':'Lock'}">${lk?I.lock:I.unlock}</button></div>`; }).join(''):'<div class="cr-empty">Nothing on this page yet. Add something with Add, Text or Photo.</div>'; }
$('crSheetB').addEventListener('click',e=>{ const ly=$('crLy'); if(!ly||!ly.contains(e.target)) return; const nOf=id=>BD.main.findOne('#'+id);
  const eye=e.target.closest('[data-eye]'), lk=e.target.closest('[data-lk]'), row=e.target.closest('[data-id]');
  if(eye){ const n=nOf(eye.dataset.eye); if(n){ BD.act.hide(n); paintLayerList(); } return; }
  if(lk){ const n=nOf(lk.dataset.lk); if(n){ n.setAttr('locked',U.isLocked(n)?undefined:true); if(U.isLocked(n)) BD.select(S.sel.filter(x=>x!==n)); BD.changed(); paintLayerList(); paintCtx(); } return; }
  if(row){ const n=nOf(row.dataset.id); if(!n||!n.visible()) return; if(S.multi) BD.select(S.sel.includes(n)?S.sel.filter(x=>x!==n):[...S.sel,n]); else BD.select([n]); paintLayerList(); } });

/* ---------- templates ---------- */
const TH=new Map(); let thumbChain=Promise.resolve();
const hash=t=>{ let h=5381; for(let i=0;i<t.length;i++) h=(h*33^t.charCodeAt(i))>>>0; return h.toString(36); };
const TPL_LOOK='p3';   // bump when the template drawing code (create-templates.js / create-lib.js) changes, so kept previews are redrawn
const thKey=def=>'cr:th:'+TPL_LOOK+':'+(B&&B.id)+':'+def.id+':'+hash(JSON.stringify(def));
/* template previews are drawn once, then kept on this phone (IndexedDB) so the start sheet opens instantly next time.
   A preview is only kept when the brand fonts had loaded, so an offline first visit never sticks with fallback letters. */
const fontsReady=()=>{ try{ const f=B&&B.fonts; return !f||[f.display,f.body].filter(Boolean).every(n=>document.fonts.check('40px "'+n+'"')); }catch(_){ return false; } };
function tplThumb(def){ if(TH.has(def.id)) return Promise.resolve(TH.get(def.id));
  const p=thumbChain.then(async()=>{ if(TH.has(def.id)) return TH.get(def.id);
    let url=null; try{ url=await L.idb.get(thKey(def)); }catch(_){}
    if(url){ TH.set(def.id,url); return url; }
    await new Promise(r=>setTimeout(r,0));   // let the sheet paint and stay responsive between previews
    let made=[];
    try{ BD.previewOnly=true; made=await CR.buildTemplate(def.id,{at:{x:-200000,y:-200000}}).finally(()=>{ BD.previewOnly=false; }); made.forEach(f=>f.visible(false)); const f=made[0]; if(f){ const s=fsize(f), c=BD.renderFrame(f,260/s.w); url=c.toDataURL('image/jpeg',.82); c.width=c.height=0; } }catch(err){ console.warn(err); }
    made.forEach(f=>f.destroy()); BD.main.batchDraw(); TH.set(def.id,url); if(url&&fontsReady()) L.idb.put(thKey(def),url); return url; });
  thumbChain=p.catch(()=>{}); return p; }
/* template search: label, id, layout, size and words; Arabic is normalised (marks, alef/yaa/taa forms) so spellings match */
const TPL_SEARCH=`<div class="cr-tsearch"><input type="search" id="crTplQ" dir="auto" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Search templates" aria-label="Search templates"><button type="button" class="cr-tclear" id="crTplClear" aria-label="Clear search" title="Clear" hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
const normQ=t=>Studio.normText(String(t||'').replace(/[-_]+/g,' '));   // the hub search's matching, plus - and _ as spaces
function tplSearch(body,list){ const q=body.querySelector('#crTplQ'); if(!q) return; const clr=body.querySelector('#crTplClear'), none=body.querySelector('#crTplNone');
  const hay=new Map(list.map(d=>[d.id,normQ([d.label,d.id,d.layout,d.size].concat(Object.values(d.words||{})).join(' '))]));
  const run=()=>{ const toks=normQ(q.value).split(/\s+/).filter(Boolean); let n=0;
    body.querySelectorAll('.cr-tpl').forEach(b=>{ const h=hay.get(b.dataset.tpl)||'', show=toks.every(t=>h.includes(t)); b.hidden=!show; if(show) n++; });
    none.hidden=n>0; clr.hidden=!q.value; };
  q.addEventListener('input',run); clr.addEventListener('click',e=>{ e.stopPropagation(); q.value=''; run(); q.focus(); }); }
async function openTemplates(opt){ opt=opt||{}; reopen=null; const start=!!opt.start, list=CR.templates();
  const body=openSheet('templates',start?'What are you making?':'Templates',
    `<span class="lbl">${start?'Start blank':'Add a blank page'}</span>${sizeRow()}
     <span class="lbl">Templates</span>${list.length>=6?TPL_SEARCH:''}${list.length?`<div class="cr-tpls">${list.map(d=>{ const s=CR.templateSize(d); return `<button type="button" class="cr-tpl${opt.focus===d.id?' hl':''}" data-tpl="${esc(d.id)}"><span class="th ${esc(d.size||'story')} loading">${s.pages>1?`<span class="n">${s.pages}</span>`:''}</span><span class="nm">${esc(d.label)}</span></button>`; }).join('')}</div><div class="cr-empty" id="crTplNone" hidden>No templates match</div>`:'<div class="cr-empty">This brand kit has no templates yet.</div>'}
     <span class="lbl">Team templates</span><div id="crTeamT"><div class="cr-empty">Looking…</div></div>
     <p class="small">Templates are starting points: every word, picture and shape can be changed.</p>`);
  body.addEventListener('click',async e=>{ const sz=e.target.closest('[data-size]'), tp=e.target.closest('[data-tpl]'), tt=e.target.closest('[data-team]'), si=e.target.closest('#crTeamSign');
    if(sz){ closeSheet(true); if(start||isBlank()) startBlank(sz.dataset.size); else addBlank(sz.dataset.size); }
    if(tp) chooseMode(mode=>applyTemplate(tp.dataset.tpl,mode));
    if(tt) chooseMode(mode=>applyTeam(tt.dataset.team,mode));
    if(si){ if(await L.ensureMember('Team templates are shared with the team. Sign in to see them.')) paintTeam(); } });
  tplSearch(body,list); if(opt.focus){ const f=body.querySelector(`[data-tpl="${CSS.escape(opt.focus)}"]`); if(f) setTimeout(()=>f.scrollIntoView({block:'center'}),60); }
  paintTeam();
  for(const d of list){ const url=await tplThumb(d); if(!sheet||sheet.name!=='templates') return; const th=body.querySelector(`[data-tpl="${CSS.escape(d.id)}"] .th`); if(th){ th.classList.remove('loading'); if(url) th.insertAdjacentHTML('afterbegin',`<img alt="" src="${url}">`); } } }
async function paintTeam(){ const box=$('crTeamT'); if(!box) return;
  try{ const C=await L.cloud(); if(!(await C.session())||!(await C.isMember())){ box.innerHTML='<div class="cr-empty">Templates the team saves show here. <button type="button" class="link" id="crTeamSign">Sign in</button></div>'; return; }
    const all=(await C.designs(B.id)).filter(d=>d.tool===TOOL&&d.kind==='template'); if(!$('crTeamT')) return;
    if(!all.length){ box.innerHTML='<div class="cr-empty">No team templates yet. Make a design, then in Save choose “Save as a team template”.</div>'; return; }
    const urls=await C.fileUrls(all.map(d=>d.thumb_path)).catch(()=>({}));
    box.innerHTML=`<div class="cr-tpls">${all.map(d=>`<button type="button" class="cr-tpl" data-team="${esc(d.id)}"><span class="th">${urls[d.thumb_path]?`<img alt="" src="${urls[d.thumb_path]}">`:''}</span><span class="nm" dir="auto">${esc(d.name)}</span></button>`).join('')}</div>`;
  }catch(_){ box.innerHTML='<div class="cr-empty">Team templates could not load. Check the connection.</div>'; } }
const isBlank=()=>frames().length<=1&&frames().every(f=>items(f).filter(n=>!n.hasName('frame-bg')).length===0);
function chooseMode(run){ if(isBlank()){ closeSheet(true); run('replace'); return; }
  const d=L.dialog(`<div class="dlg-body"><h3>Use this template</h3><p class="small">Add it as new pages after what you have, or start over with it.</p>
    <div class="dlg-actions col"><button type="button" class="btn" id="tmAdd">Add as new pages</button><button type="button" class="btn ghost" id="tmRep">Replace everything</button><button type="button" class="link" id="tmNo">Cancel</button></div></div>`);
  d.querySelector('#tmNo').onclick=()=>d.close(); d.querySelector('#tmAdd').onclick=()=>{ d.close(); closeSheet(true); run('add'); }; d.querySelector('#tmRep').onclick=()=>{ d.close(); closeSheet(true); run('replace'); }; }
function clearAll(){ BD.select([]); BD.main.destroyChildren(); BD.main.batchDraw(); }
async function applyTemplate(id,mode){ BD.busy('Building the template…'); await thumbChain;
  try{ if(mode==='replace') clearAll(); const made=await CR.buildTemplate(id,{at:{x:0,y:0}}); afterBuild(made); }
  catch(err){ console.error(err); toast('Could not build that template.'); } finally{ BD.busy(null); } }
async function applyTeam(id,mode){ BD.busy('Opening the team template…');
  try{ const C=await L.cloud(); const d=await C.getDesign(id); const doc=(d.recipe||{}).doc; if(!doc) throw new Error('empty'); if(mode==='replace') clearAll(); const made=await addDocNodes(doc); afterBuild(made); }
  catch(err){ console.error(err); toast('Could not open that template.'); } finally{ BD.busy(null); } }
async function addDocNodes(doc){ const ids=new Set(); (doc.nodes||[]).forEach(o=>BD.collectImgs(o,ids)); await Promise.all([...ids].map(BD.getImg));
  const nodes=(doc.nodes||[]).map(o=>BD.rebuild(o,true)); nodes.forEach(n=>BD.main.add(n)); BD.main.find('Image').forEach(n=>BD.applyFx(n)); await BD.fontsInDoc(); fixMissingPhotos(); return nodes.filter(isFrame); }
function fixMissingPhotos(){ BD.main.find(n=>kind(n)==='image'&&!BD.IMGS.get(n.getAttr('imgId'))).forEach(n=>{ const g=CR.slotFromImage(n), p=n.getParent(), z=n.zIndex(); p.add(g); g.zIndex(z); n.destroy(); }); }
function afterBuild(made){ BD.showPage(made&&made.length?made[0]:frames()[0]); touch(); BD.changed(); BD.emitDoc(); paintPages(); }
function makePages(size){ const s=sizeOf(size), out=[]; for(let i=0;i<(s.pages||1);i++){ const f=BD.makeFrame(0,0,s.w,s.h,{label:s.pages?'Slide '+(frames().length+1):s.label,fill:'#FFFFFF'}); if(s.round) f.setAttr('round',1); out.push(f); } return out; }
function startBlank(size){ clearAll(); afterBuild(makePages(size)); }
function addBlank(size){ afterBuild(makePages(size)); }

/* ---------- drafts: kept on this phone, listed in Continue editing ---------- */
const DKEY=()=>L.draftBase(B.id,TOOL)+':'+S.id;
function touch(){ if(!st.ready||st.design) return; st.dirty=true;
  if(!S.id){ const n=L.listDrafts(B.id,TOOL).length; S.id=U.uid(); history.replaceState(null,'',location.pathname+'?draft='+S.id);
    if(n>=L.DRAFT_CAP&&!st.capWarned){ st.capWarned=true; toast('You have '+(n+1)+' unfinished designs on this phone. Remove old ones in Continue editing.',6000); } }
  BD.scheduleSave(); }
BD.onSaved=d=>{ if(st.design||!S.id||!st.dirty) return; const key=DKEY(); st.draftKey=key;
  if(L.store(key,{board:S.id,at:Date.now(),imgs:d.imgs||[],name:S.name,pages:frames().length})===null){ toast('This phone is out of room for drafts. Remove old ones in Continue editing.',6000); return; }
  clearTimeout(st.thumbT); st.thumbT=setTimeout(draftThumb,1200); };
function draftThumb(){ const f=frames()[0]; if(!f||!st.draftKey||st.design) return; try{ const s=fsize(f), c=BD.renderFrame(f,Math.min(1,400/s.h)); L.idb.put(st.draftKey+':thumb',c.toDataURL('image/jpeg',.72)); c.width=c.height=0; }catch(_){} }
function syncUndo(){ $('crUndo').disabled=!BD.canUndo(); $('crRedo').disabled=!BD.canRedo(); }
$('crUndo').onclick=()=>BD.undo(); $('crRedo').onclick=()=>BD.redo();
BD.on('history',syncUndo);
BD.on('changed',()=>{ syncUndo(); if(!st.ready) return; const n=S.sel[0]; if(n&&CR.relayoutAround(n)) after(); if(st.design){ syncSaved(); return; } touch(); });

/* ---------- photos as files (for the team) ---------- */
async function blobOf(id){ let b=st.blobs.get(id); if(!b){ try{ b=await L.idb.get('bimg:'+id); }catch(_){} }
  if(b&&/^image\/(jpeg|png|webp)$/.test(b.type)) return b;
  const im=BD.IMGS.get(id); if(!im) return b||null;
  const c=document.createElement('canvas'); c.width=im.w; c.height=im.h; c.getContext('2d').drawImage(im.el,0,0); const out=await L.canvasBlob(c,'image/jpeg',.95); c.width=c.height=0; return out; }
const usedImgs=doc=>[...BD.collectImgs({k:doc.nodes||[]},new Set())].filter(id=>!String(id).startsWith('brand:'));
function templateDoc(doc){ const swap=o=>{ (o.k||[]).forEach((k,i)=>{ if(k.c==='Image'&&k.a&&k.a.kind==='image'&&!String(k.a.imgId||'').startsWith('brand:')){ const n=BD.rebuild(k), g=CR.slotFromImage(n); o.k[i]=BD.toObj(g); n.destroy(); g.destroy(); } else swap(k); }); };
  doc=JSON.parse(JSON.stringify(doc)); swap({k:doc.nodes}); return doc; }
function thumbBlob(){ const f=frames()[0]; const s=fsize(f), c=BD.renderFrame(f,360/s.w); return L.canvasBlob(c,'image/jpeg',.85).finally(()=>{ c.width=c.height=0; }); }
function defaultName(){ const n=($('crName').value||'').trim(); if(n) return n; const d=new Date(); return TITLE+' – '+d.getDate()+' '+d.toLocaleString('en',{month:'short'}); }

/* ---------- saving to the team (designs and templates) ---------- */
async function teamSave(o){ o=o||{}; const C=await L.cloud();
  if(!(await L.ensureMember('Saved designs go to the team, so anyone on the team can find and reuse them.'))) throw new Error('Not saved to the team: sign in first.');
  let doc=JSON.parse(BD.docJson()); const imgs0=usedImgs(doc);
  const tpl=o.kind==='template'||!(o.keep!==false&&imgs0.length), kindOut=tpl?'template':'design';
  const asNew=!!o.asNew||!st.design||(st.design.kind!==kindOut);
  if(tpl) doc=templateDoc(doc);
  const imgs=tpl?[]:imgs0, name=(o.name||'').trim()||(st.design&&!asNew?st.design.name:defaultName());
  const photos=await Promise.all(imgs.map(async id=>{ const p=st.paths.get(id); if(p&&!asNew) return {path:p}; const b=await blobOf(id); return b?{blob:b}:null; }));
  const cols=o.collections||(st.design&&!asNew?st.design.collections:[])||[];
  const id=await C.saveDesign({id:asNew?null:st.design.id,brand:B.id,tool:TOOL,name,kind:kindOut,recipe:{v:1,kind:'board',doc,imgs},photos,thumb:await thumbBlob(),collections:cols});
  if(tpl&&o.kind==='template'&&!st.design) return {id,name,kind:kindOut};   // a template saved from a draft: keep working on the draft
  const fresh=await C.getDesign(id); (fresh.recipe.photoPaths||[]).forEach((p,i)=>{ if(p&&imgs[i]) st.paths.set(imgs[i],p); });
  for(const im of imgs){ if(!st.blobs.has(im)){ const b=await blobOf(im); if(b) st.blobs.set(im,b); } }
  if(st.draftKey){ L.removeDraft(st.draftKey); st.draftKey=null; } S.id=null; st.dirty=false;
  st.design={id,name,kind:kindOut,collections:cols}; markSaved(); history.replaceState(null,'',location.pathname+'?design='+id); syncSaved();
  return {id,name,kind:kindOut}; }
const curJson=()=>{ const d=JSON.parse(BD.docJson()); delete d.name; return JSON.stringify(d); };
function markSaved(){ st.base=curJson(); }
const designDirty=()=>!!st.design&&st.base!=null&&curJson()!==st.base;
function syncSaved(){ $('crSaved').textContent=st.design?(designDirty()?'Not saved to the team':(st.design.kind==='template'?'Team template':'Saved to the team')):''; }
function leavePrompt(href){ const d=L.dialog(`<div class="dlg-body"><h3 dir="auto">Save your changes to “${esc(st.design.name)}”?</h3><p class="small">You changed this saved design. Update it for the team, or leave it as it was.</p>
    <div class="status" id="lvSt" role="status"></div>
    <div class="dlg-actions col"><button type="button" class="btn" id="lvUpd">Update “${esc(st.design.name)}”</button><button type="button" class="btn ghost" id="lvDis">Discard changes</button><button type="button" class="link" id="lvKeep">Keep editing</button></div></div>`);
  d.querySelector('#lvKeep').onclick=()=>d.close();
  d.querySelector('#lvDis').onclick=()=>{ st.leaving=true; location.href=href; };
  d.querySelector('#lvUpd').onclick=async()=>{ d.querySelectorAll('button').forEach(b=>b.disabled=true); d.querySelector('#lvSt').textContent='Updating…';
    try{ await teamSave({name:st.design.name,kind:st.design.kind}); st.leaving=true; location.href=href; }catch(err){ d.querySelector('#lvSt').textContent=err.message; d.querySelectorAll('button').forEach(b=>b.disabled=false); } }; }
document.querySelector('.cr-back').addEventListener('click',e=>{ if(designDirty()){ e.preventDefault(); leavePrompt(e.currentTarget.href); } else if(S.id) BD.saveNow(); });
addEventListener('beforeunload',e=>{ if(!st.leaving&&designDirty()){ e.preventDefault(); e.returnValue=''; } });
addEventListener('pagehide',()=>{ if(S.id&&!st.design) BD.saveNow(); });
async function openDesign(id,ready){
  if(!(await L.ensureMember('This design is saved with the team. Sign in to open it.'))) return false;
  BD.busy('Opening the saved design…');
  try{ const C=await L.cloud(); const d=await C.getDesign(id); if(d.tool!==TOOL){ location.replace(L.toolPage(d.tool)+'?design='+id+(ready?'&go=1':'')); return 'away'; }
    const r=d.recipe||{}, imgs=r.imgs||[], paths=r.photoPaths||[];
    if(d.kind!=='template') await Promise.all(imgs.map(async(img,i)=>{ const p=paths[i]; if(!p) return; try{ const blob=await C.download(p); const el=await L.loadFile(blob); BD.IMGS.set(img,{el,w:el.width,h:el.height}); st.blobs.set(img,blob); st.paths.set(img,p); }catch(_){} }));
    clearAll(); await addDocNodes(r.doc||{nodes:[]}); S.id=null; S.name=d.name; S.imgs=new Set(imgs);
    BD.showPage(frames()[0]); BD.resetHistory();
    st.design={id:d.id,name:d.name,kind:d.kind,collections:d.collectionNames||[]}; markSaved();
    if(ready&&d.kind!=='template'){ C.touchUsed&&C.touchUsed(id); st.openSaveAfter=true; }
    return true; }
  catch(err){ console.error(err); toast('Could not open that saved design.'); return false; }
  finally{ BD.busy(null); } }

/* ---------- Save sheet: to the phone (2× lossless PNG) and/or to the team ---------- */
function fname(n,total,at){ const d=at||new Date(), z=x=>String(x).padStart(2,'0'); return (B.id+'-create').replace(/[^a-z0-9-]+/gi,'-')+'-'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds())+(total>1?'-'+n:'')+'.png'; }
function openSave(){ reopen=null; const fs=frames(); if(!fs.length){ toast('Add a page first.'); return; }
  const many=fs.length>1, upd=st.design&&st.design.kind==='design';
  const body=openSheet('save','Save',`<div class="cr-save" style="display:flex;flex-direction:column;gap:14px">
    ${many?`<div><span class="lbl">Pages</span><div class="cr-pagepick" id="crPP">${fs.map((f,i)=>`<label><input type="checkbox" data-f="${f.id()}" checked><img alt="" data-pth="${f.id()}">${i+1}</label>`).join('')}</div></div>`:''}
    <button type="button" class="btn" id="crGo">${many?'Save '+fs.length+' pages':'Save image'}</button>
    <p class="small">Full quality: ${fs.map(f=>fsize(f)).map(s=>s.w*2+'×'+s.h*2).filter((v,i,a)=>a.indexOf(v)===i).join(', ')} PNG, lossless.</p>
    <div class="cr-status" id="crSt" role="status" aria-live="polite"></div>
    <div class="cr-result" id="crRes" hidden></div>
    <div class="cr-team">
      <label class="opt-row"><span class="opt-ic">${I.bookmark}</span><span class="opt-txt"><b>${upd?'Update “'+esc(st.design.name)+'” in the team':'Also save to the team'}</b><small>${upd?'Saved designs keep your latest changes':'Find and reuse it in Saved'}</small></span><input type="checkbox" class="switch" id="crTeamOn" role="switch"></label>
      <div id="crTeamBox" hidden style="display:flex;flex-direction:column;gap:10px">
        <label class="lbl" for="crTName">Name</label><input type="text" id="crTName" dir="auto" maxlength="80">
        <label class="lbl" for="crCol">Collection (optional)</label><input type="text" id="crCol" dir="auto" maxlength="60" placeholder="e.g. Ramadan">
        <label class="check"><input type="checkbox" id="crKeep" checked> Keep the photos (off = a template)</label>
        ${st.design?'<label class="check"><input type="checkbox" id="crAsNew"> Save as a new design</label>':''}
        <button type="button" class="mini" id="crTeamOnly">Only save to the team</button>
      </div>
      <button type="button" class="link" id="crAsTpl">Save as a team template (words and layout, no personal photos)</button>
    </div></div>`);
  if(many) fs.forEach(f=>{ try{ const s=fsize(f), c=BD.renderFrame(f,112/s.w); body.querySelector(`[data-pth="${f.id()}"]`).src=c.toDataURL('image/jpeg',.7); c.width=c.height=0; }catch(_){} });
  const hasPhotos=usedImgs(JSON.parse(BD.docJson())).length>0; $('crKeep').checked=hasPhotos&&(!st.design||st.design.kind!=='template'); $('crKeep').disabled=!hasPhotos;
  $('crTName').value=st.design?st.design.name:defaultName(); if(st.design&&st.design.collections&&st.design.collections[0]) $('crCol').value=st.design.collections[0];
  const checked=()=>many?[...body.querySelectorAll('#crPP input:checked')].map(i=>BD.main.findOne('#'+i.dataset.f)).filter(Boolean):fs;
  const syncT=()=>{ $('crTeamBox').hidden=!$('crTeamOn').checked; $('crGo').textContent=($('crTeamOn').checked?(upd&&!($('crAsNew')||{}).checked?'Save & update':'Save & add to team'):(many?'Save '+checked().length+' pages':'Save image')); };
  $('crTeamOn').onchange=syncT; if($('crAsNew')) $('crAsNew').onchange=syncT; body.querySelectorAll('#crPP input').forEach(i=>i.onchange=syncT);
  const opts=()=>({name:$('crTName').value,keep:$('crKeep').checked,asNew:!!($('crAsNew')&&$('crAsNew').checked),collections:$('crCol').value.trim()?[$('crCol').value.trim()]:(st.design?st.design.collections:[])});
  $('crGo').onclick=async()=>{ const list=checked(); if(!list.length){ line('Pick at least one page.'); return; } await saveImages(list); if($('crTeamOn')&&$('crTeamOn').checked) await runTeam(opts()); };
  $('crTeamOnly').onclick=()=>runTeam(opts());
  $('crAsTpl').onclick=()=>runTeam(Object.assign(opts(),{kind:'template',asNew:!(st.design&&st.design.kind==='template'),name:$('crTeamOn').checked?$('crTName').value:defaultName()}));
  syncT(); }
function line(t,ok,spin){ const el=$('crSt'); if(!el) return; el.classList.toggle('ok',!!ok); el.innerHTML=t?(spin?'<span class="spin" aria-hidden="true"></span>':'')+'<span>'+esc(t)+'</span>':''; }
async function runTeam(o){ st.saving=true; line(o.kind==='template'?'Saving the team template…':'Saving to the team…',false,true);
  try{ const r=await teamSave(o); line(r.kind==='template'?'Saved as a team template: “'+r.name+'”':'Saved to the team as “'+r.name+'”',true); L.celebrate&&L.celebrate(); }
  catch(err){ line(err.message||'Could not save to the team.'); } finally{ st.saving=false; } }
async function saveImages(list){ if(st.saving) return; st.saving=true; const btn=$('crGo'); if(btn) btn.disabled=true; const keep=S.sel.slice(); BD.select([],{quiet:true});
  const files=[], stamp=new Date(); let low=false;
  try{ for(const [i,f] of list.entries()){ line((list.length>1?'Page '+(i+1)+' of '+list.length+': ':'')+'making the full-size PNG…',false,true); await tick(30);
      const r=await BD.exportFrame(f,{scale:2,type:'image/png'}); if(r.scale<2) low=true; files.push(new File([r.blob],fname(i+1,list.length,stamp),{type:'image/png'})); }
    const small=low?' This phone was low on memory, so '+(files.length>1?'some pages are':'it is')+' a little smaller. Close other tabs for full size.':'';
    const what=files.length>1?files.length+' pages':'Your design';
    if(matchMedia('(pointer:coarse)').matches){ const r=await L.shareFiles(files);
      if(r==='shared'){ line('Saved! Choose “Save Image” if you haven’t yet.'+small,true); showResult(files); L.celebrate&&L.celebrate(); return; }
      if(r==='cancelled'){ line('Not saved. Tap Save again when you are ready.'); showResult(files); return; }
      if(r==='needtap'){ line('Ready! Tap a picture below to save it.'+small,true); showResult(files,true); return; } }
    for(const f of files){ const url=URL.createObjectURL(f), a=document.createElement('a'); a.href=url; a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); },4000); await tick(250); }
    line(what+' saved to your downloads'+(files.length>1?', numbered in order.':'.')+small,true); showResult(files); L.celebrate&&L.celebrate(); }
  catch(err){ line(err.message||'Could not make the image. Close other apps or tabs and try again.'); }
  finally{ st.saving=false; if(btn) btn.disabled=false; BD.select(keep.filter(n=>n.getStage()),{quiet:true}); paintCtx(); } }
function showResult(files,tapToShare){ const el=$('crRes'); if(!el) return; el.hidden=false; el.innerHTML=files.map((f,i)=>`<img alt="Page ${i+1}" data-i="${i}" src="${URL.createObjectURL(f)}">`).join('');
  if(tapToShare) el.onclick=async e=>{ const im=e.target.closest('img'); if(im) await L.shareFiles([files[+im.dataset.i]]); }; }

/* ---------- design menu ---------- */
$('crMenu').onclick=e=>openMenu(e.currentTarget,[
  {label:'New design',run:()=>{ if(S.id) BD.saveNow(); location.href=location.pathname+'?new=1'; }},
  {label:'Templates',run:()=>openTemplates()},
  {label:'Save…',run:openSave},
  '-',{label:'This page…',run:openPage},{label:'Add a page',run:()=>addPage()},
  {label:'Story safe zones',check:!!BD.showSafe,run:()=>{ BD.showSafe=!BD.showSafe; BD.paintUI(); }},
  {label:'Snap to guides',check:S.snap,run:()=>{ S.snap=!S.snap; toast('Snapping '+(S.snap?'on':'off')+'.'); }},
  {label:'All saved designs',run:()=>{ location.href=L.ROOT+'index.html#saved'; }}]);
$('crName').addEventListener('input',()=>{ S.name=$('crName').value.trim(); });
$('crName').addEventListener('change',()=>{ S.name=$('crName').value.trim(); if(st.design) syncSaved(); else if(st.ready){ touch(); BD.changed(); } });
$('crName').addEventListener('keydown',e=>{ if(e.key==='Enter') e.target.blur(); });
document.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='s'){ e.preventDefault(); openSave(); } },true);

/* ---------- start ---------- */
(async function(){
  await BD.start(); B=BD.B; BD.ICONS=CR.allIcons(); document.title=TITLE+' · Studio';
  const q=new URLSearchParams(location.search), draft=q.get('draft'), design=q.get('design'), tpl=q.get('tpl'), team=q.get('team'), size=q.get('size');
  let startWith=null;
  if(draft){ const x=L.listDrafts(B.id,TOOL).find(d=>d.id===draft); if(x&&x.d.board&&await BD.openStored(x.d.board)){ st.dirty=true; st.draftKey=x.key; } else toast('That unfinished design is no longer on this phone.'); }
  if(!S.id&&design){ const r=await openDesign(design,q.get('go')==='1'); if(r==='away') return; }
  if(!S.id&&!st.design){ history.replaceState(null,'',location.pathname); const f=BD.makeFrame(0,0,1080,1920,{label:'Story',fill:'#FFFFFF'}); BD.showPage(f); BD.resetHistory();
    if(tpl&&CR.templates().some(d=>d.id===tpl)) startWith=()=>applyTemplate(tpl,'replace');
    else if(team) startWith=()=>applyTeam(team,'replace');
    else if(size&&SIZES.some(s=>s.id===size)) startWith=()=>startBlank(size);
    else startWith=()=>openTemplates({start:true}); }
  $('crName').value=S.name||''; if(st.design) document.title=st.design.name+' · '+TITLE+' · Studio';
  st.ready=true; paintPages(); paintCtx(); syncUndo(); syncSaved();
  if(startWith) await startWith();
  else if(tpl&&CR.templates().some(d=>d.id===tpl)) await openTemplates({focus:tpl});   // opened on a draft/design: show the picker on the asked-for template
  if(st.openSaveAfter) openSave();
  window.CRUI={openSheet,closeSheet,openWords,openColor,openFont,openSize,openArrange,openLayers,openAdd,openPage,openSave,openTemplates,paintCtx,st};
})();
})();

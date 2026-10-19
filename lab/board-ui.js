/* Board (experimental): the editor around the canvas — top bar, floating tool dock, quick-edit bar,
   layers and frames, assets, colour picker, menus, quick find (Ctrl+K), keyboard and opening files.
   board-panel.js draws the right panel; board-dialogs.js the bigger dialogs (export, print sizes, repeat…). */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S, esc=L.esc;
const $=id=>document.getElementById(id);
const {kind,isFrame,isLocked,frames,items,fsize,wrect,unionRect,frameOf,nameOf,frameBg,clamp}=U;
const svg=(d,w)=>`<svg width="${w||18}" height="${w||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={
  select:svg('<path d="M5 3l14 8-6 2-2 6z"/>'),hand:svg('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8l-1.5-1.5a2 2 0 0 0-3 2.6L6 20a6 6 0 0 0 5 2h2a7 7 0 0 0 7-7v-4a2 2 0 0 0-4 0"/>'),
  frame:svg('<path d="M7 3v18M17 3v18M3 7h18M3 17h18"/>'),rect:svg('<rect x="4" y="4" width="16" height="16" rx="1.5"/>'),ellipse:svg('<circle cx="12" cy="12" r="8.5"/>'),
  line:svg('<path d="M5 19 19 5"/>'),arrow:svg('<path d="M5 19 19 5M10 5h9v9"/>'),pen:svg('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>'),
  marker:svg('<path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>'),eraser:svg('<path d="M7 21h10"/><path d="M5.5 15.5 13 8l5 5-7.5 7.5H8z"/><path d="m13 8 3-3 5 5-3 3"/>'),
  text:svg('<path d="M4 7V5h16v2"/><path d="M9 19h6"/><path d="M12 5v14"/>'),arc:svg('<path d="M4 16a8 8 0 0 1 16 0"/><path d="M9 20h6M12 12v8"/>'),
  image:svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),upload:svg('<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>'),
  star:svg('<path d="M12 2l3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.2-6.2 3.2L7 14.1 2 9.3l6.9-1z"/>'),poly:svg('<path d="M12 3l9 16H3z"/>'),shapes:svg('<circle cx="7.5" cy="7.5" r="4.5"/><rect x="12" y="12" width="9" height="9" rx="2"/>'),
  brand:svg('<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/>'),more:svg('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),
  caret:svg('<path d="m6 15 6-6 6 6"/>',12),caretR:svg('<path d="m9 6 6 6-6 6"/>',12),back:svg('<path d="m15 18-6-6 6-6"/>'),
  undo:svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',19),redo:svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',19),
  search:svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',17),ruler:svg('<path d="M3 17 17 3l4 4L7 21z"/><path d="m7.5 12.5 2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',19),
  layersI:svg('<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',19),sliders:svg('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',19),play:svg('<path d="M6 4l14 8-14 8z"/>',19),
  eye:svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',14),eyeOff:svg('<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/>',14),
  lock:svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',14),unlock:svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.2"/>',14),
  group:svg('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/>',16),mask:svg('<circle cx="9" cy="12" r="6"/><rect x="11" y="6" width="10" height="12" rx="2"/>',16),
  dup:svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',17),trash:svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',17),
  flipX:svg('<path d="M12 3v18M8 7l-5 5 5 5M16 7l5 5-5 5"/>',17),flipY:svg('<path d="M3 12h18M7 8l5-5 5 5M7 16l5 5 5-5"/>',17),
  front:svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',17),back2:svg('<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M20 8v10a2 2 0 0 1-2 2H8"/>',17),
  al:svg('<path d="M4 3v18M8 7h12v4H8zM8 14h7v4H8z"/>',17),ah:svg('<path d="M12 3v18M6 7h12v4H6zM8 14h8v4H8z"/>',17),ar:svg('<path d="M20 3v18M4 7h12v4H4zM9 14h7v4H9z"/>',17),
  at:svg('<path d="M3 4h18M7 8h4v12H7zM14 8h4v7h-4z"/>',17),av:svg('<path d="M3 12h18M7 6h4v12H7zM14 8h4v8h-4z"/>',17),ab:svg('<path d="M3 20h18M7 4h4v12H7zM14 9h4v7h-4z"/>',17),
  dh:svg('<path d="M4 3v18M20 3v18M9 8h6v8H9z"/>',17),dv:svg('<path d="M3 4h18M3 20h18M8 9h8v6H8z"/>',17),
  tl:svg('<path d="M4 6h16M4 12h10M4 18h13"/>',16),tc:svg('<path d="M4 6h16M7 12h10M5.5 18h13"/>',16),tr:svg('<path d="M4 6h16M10 12h10M7 18h13"/>',16),tj:svg('<path d="M4 6h16M4 12h16M4 18h16"/>',16),
  drop:svg('<path d="M2 22l1-1h3l9-9M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4z"/>',16),
  link:svg('<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8"/>',15),swap:svg('<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',15),crop:svg('<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',15),
  barcode:svg('<path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/>'),qr:svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/>'),
  grid:svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>'),repeat:svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  history:svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),findr:svg('<circle cx="10" cy="10" r="6"/><path d="m20 20-5.5-5.5M7 10h6"/>'),palette:svg('<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6c0-4.9-4.5-8.6-10-8.6z"/>'),
  print:svg('<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="8" rx="2"/><path d="M6 14h12v8H6z"/>'),emoji:svg('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>'),
  icons:svg('<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>'),tpl:svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
  bold:'<b class="qb-b">B</b>',plus:svg('<path d="M12 5v14M5 12h14"/>',16),close:svg('<path d="M18 6 6 18M6 6l12 12"/>',15),check:svg('<path d="M20 6 9 17l-5-5"/>',15)
};
const isMac=/Mac|iPhone|iPad/.test(navigator.platform||''), mod=isMac?'⌘':'Ctrl';
document.documentElement.dataset.dark=matchMedia('(prefers-color-scheme: dark)').matches?'1':'0';
const UI=BD.UI={IC,$,esc,mod,svg};

/* ---------- toasts ---------- */
let toastT=0;
function toast(t,ms,undo){ const el=$('bToast'); el.innerHTML=esc(t)+(undo?' <button type="button" class="link" id="tUndo">Undo</button>':''); el.hidden=false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },ms||(undo?6000:3200)); if(undo) $('tUndo').onclick=()=>{ el.hidden=true; undo(); }; }
UI.toast=toast; BD.on('toast',t=>toast(t)); BD.on('busy',t=>{ if(t) toast(t,60000); else $('bToast').hidden=true; });
BD.on('saving',on=>{ const el=$('bSaved'); el.textContent=on?'Saving…':'Saved'; el.classList.toggle('on',!on); });

/* ---------- top bar ---------- */
$('undoB').innerHTML=IC.undo; $('redoB').innerHTML=IC.redo; $('findB').innerHTML=IC.search+'<span class="bt-find-t">Find</span><kbd>'+mod+' K</kbd>'; $('rulerB').innerHTML=IC.ruler; $('panelL').innerHTML=IC.layersI; $('panelR').innerHTML=IC.sliders; $('presentB').innerHTML=IC.play;
$('undoB').onclick=()=>BD.undo(); $('redoB').onclick=()=>BD.redo();
function syncUndo(){ $('undoB').disabled=!BD.canUndo(); $('redoB').disabled=!BD.canRedo(); }
BD.on('history',syncUndo); BD.on('changed',syncUndo);
const nameIn=$('bName');
nameIn.addEventListener('change',()=>{ S.name=nameIn.value.trim()||'Untitled board'; nameIn.value=S.name; document.title=S.name+' · Board'; BD.saveNow(); });
nameIn.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key==='Escape'){ e.preventDefault(); nameIn.blur(); } });
function setUnit(u){ S.unit=u; $('unitSel').value=u; BD.paintUI(); BD.drawRulers(); BD.scheduleSave(); UI.paintProps&&UI.paintProps(); paintQbar(); paintPages(); }
UI.setUnit=setUnit;
$('unitSel').onchange=e=>setUnit(e.target.value);
const UNIT_NAMES={px:'Pixels',mm:'Millimetres',cm:'Centimetres',in:'Inches',pt:'Points'};
$('rulerC').onclick=e=>{ const r=e.currentTarget.getBoundingClientRect(); openMenu(r.left,r.bottom+4,BD.units.list.map(u=>({label:UNIT_NAMES[u]+' ('+u+')',check:S.unit===u,run:()=>setUnit(u)}))); };
function setRulers(v){ S.rulers=v; $('rulerB').setAttribute('aria-pressed',String(v)); BD.paintUI(); BD.view.changed(); BD.scheduleSave(); placeQbar(); }
UI.setRulers=setRulers;
$('rulerB').onclick=()=>setRulers(!S.rulers);
function panel(side,open){ const el=$(side==='L'?'left':'right'), b=$(side==='L'?'panelL':'panelR'); const on=open!=null?open:!el.classList.contains('open');
  el.classList.toggle('open',on); b.setAttribute('aria-pressed',String(on)); if(on&&innerWidth<900){ const o=$(side==='L'?'right':'left'); o.classList.remove('open'); $(side==='L'?'panelR':'panelL').setAttribute('aria-pressed','false'); } }
UI.panel=panel;
$('panelL').onclick=()=>panel('L'); $('panelR').onclick=()=>panel('R');
$('zoomB').onclick=e=>{ const r=e.currentTarget.getBoundingClientRect(), c={x:BD.stage.width()/2,y:BD.stage.height()/2}; openMenu(r.left,r.bottom+6,[
  {label:'Zoom in',key:mod+' +',run:()=>BD.view.zoomBy(1.25)},{label:'Zoom out',key:mod+' −',run:()=>BD.view.zoomBy(.8)},'-',
  {label:'50%',run:()=>BD.view.zoomAt(.5,c)},{label:'100%',key:'Shift+0',run:()=>BD.view.zoomAt(1,c)},{label:'200%',run:()=>BD.view.zoomAt(2,c)},'-',
  {label:'Fit everything',key:'Shift+1',run:()=>BD.view.fitAll()},{label:'Zoom to selection',key:'Shift+2',run:()=>BD.view.fitSel(),disabled:!S.sel.length},'-',
  {label:'Dot grid',check:S.grid,run:()=>{ S.grid=!S.grid; BD.view.changed(); }},{label:'Snapping',check:S.snap,run:()=>{ S.snap=!S.snap; toast('Snapping '+(S.snap?'on':'off')+'.'); }},
  {label:'Rulers and guides',key:'Shift+R',check:S.rulers,run:()=>setRulers(!S.rulers)},{label:'Story safe zones',check:S.safe,run:()=>{ S.safe=!S.safe; BD.paintUI(); }}]); };
BD.on('view',()=>{ $('zoomB').textContent=Math.round(BD.stage.scaleX()*100)+'%'; drawMini(); placeQbar(); });

/* ---------- menus ---------- */
const menu=$('menu');
function openMenu(x,y,entries,opt){
  menu.innerHTML=entries.map((e,i)=>e==='-'?'<div class="m-sep" role="separator"></div>':e.head?`<div class="m-head">${esc(e.head)}</div>`:`<button type="button" role="${e.check!=null?'menuitemcheckbox':'menuitem'}" ${e.check!=null?`aria-checked="${!!e.check}"`:''} data-i="${i}" ${e.disabled?'disabled':''}${e.danger?' class="danger"':''}>${e.icon?`<span class="m-ic">${e.icon}</span>`:e.check!=null?`<span class="m-ic">${e.check?IC.check:''}</span>`:''}<span class="m-l">${esc(e.label)}</span>${e.key?`<kbd>${esc(e.key)}</kbd>`:''}</button>`).join('');
  menu.hidden=false; menu.classList.remove('in'); void menu.offsetWidth; menu.classList.add('in'); const r=menu.getBoundingClientRect();
  const top=opt&&opt.above?y-r.height-8:y; menu.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px'; menu.style.top=Math.max(8,Math.min(top,innerHeight-r.height-8))+'px';
  menu.onclick=ev=>{ const b=ev.target.closest('[data-i]'); if(!b) return; closeMenu(); entries[+b.dataset.i].run(); };
  const f=menu.querySelector('button:not([disabled])'); if(f) f.focus({preventScroll:true}); }
function closeMenu(){ menu.hidden=true; }
UI.openMenu=openMenu; UI.closeMenu=closeMenu;
document.addEventListener('pointerdown',e=>{ if(!menu.hidden&&!menu.contains(e.target)&&!e.target.closest('[data-menu-owner]')) closeMenu(); if(!pop.hidden&&!pop.contains(e.target)&&!e.target.closest('[data-pop-owner]')) closePop(); if(!$('palette').hidden&&!$('palette').contains(e.target)) closePalette(); },true);
menu.addEventListener('keydown',e=>{ const bs=[...menu.querySelectorAll('button:not([disabled])')], i=bs.indexOf(document.activeElement);
  if(e.key==='Escape'){ closeMenu(); e.stopPropagation(); } if(e.key==='ArrowDown'){ e.preventDefault(); (bs[i+1]||bs[0]).focus(); } if(e.key==='ArrowUp'){ e.preventDefault(); (bs[i-1]||bs[bs.length-1]).focus(); } });

/* ---------- pop-overs (colour picker, looks, brand…) ---------- */
const pop=$('pop');
function openPop(anchor,html,opt){ opt=opt||{}; pop.innerHTML=html; pop.className='b-pop'+(opt.cls?' '+opt.cls:''); pop.hidden=false; pop.onclick=null; pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in');
  const r=anchor.getBoundingClientRect(), pr=pop.getBoundingClientRect(); const left=opt.center?r.left+r.width/2-pr.width/2:r.left-20; let top=r.bottom+6;
  if(opt.above||top+pr.height>innerHeight-8) top=r.top-pr.height-6; pop.style.left=Math.max(8,Math.min(left,innerWidth-pr.width-8))+'px'; pop.style.top=Math.max(8,top)+'px'; return pop; }
function closePop(){ pop.hidden=true; pop.innerHTML=''; }
UI.openPop=openPop; UI.closePop=closePop;
const hex6=c=>{ if(!c||typeof c!=='string') return '#000000'; if(/^#[0-9a-f]{6}/i.test(c)) return c.slice(0,7).toLowerCase(); if(/^#[0-9a-f]{3}$/i.test(c)) return ('#'+c.slice(1).split('').map(x=>x+x).join('')).toLowerCase(); const k=Konva.Util.colorToRGBA(c); if(!k) return '#000000'; return '#'+[k.r,k.g,k.b].map(v=>v.toString(16).padStart(2,'0')).join(''); };
const alphaOf=c=>{ if(typeof c==='string'&&/^#[0-9a-f]{8}$/i.test(c)) return Math.round(parseInt(c.slice(7),16)/2.55); const k=c&&Konva.Util.colorToRGBA(c); return k?Math.round(k.a*100):100; };
const withAlpha=(h,a)=>{ a=clamp(Math.round(a),0,100); return a>=100?h:h+Math.round(a*2.55).toString(16).padStart(2,'0'); };
Object.assign(UI,{hex6,alphaOf,withAlpha});
function docColors(){ const set=new Set(); BD.main.find(n=>{ ['fill','stroke'].forEach(k=>{ const v=n.getAttr(k); if(typeof v==='string'&&v.startsWith('#')) set.add(v.slice(0,7).toLowerCase()); }); return false; }); return [...set].slice(0,16); }
function brandSwatches(){ const c=(BD.B&&BD.B.colors)||{}, out=new Set(Object.values(c).map(v=>String(v).toLowerCase())); ((BD.B&&BD.B.flavours)||[]).forEach(f=>out.add(f.bg.toLowerCase())); return [...out]; }
const BASIC=['#ffffff','#f2f2f2','#bdbdbd','#757575','#333333','#000000','#e53935','#fb8c00','#fdd835','#43a047','#00897b','#1e88e5','#3949ab','#8e24aa','#d81b60','#6d4c41'];
S.recent=L.store('lab:recentColors')||[];
/* pick a colour straight from the design */
function canvasPick(cb){ const w=BD.wrap; w.classList.add('picking'); toast('Click anywhere on the design to pick its colour. Esc to cancel.',8000);
  const done=()=>{ w.classList.remove('picking'); w.removeEventListener('pointerdown',h,true); window.removeEventListener('keydown',k,true); $('bToast').hidden=true; };
  const k=e=>{ if(e.key==='Escape'){ e.stopPropagation(); done(); } };
  const h=e=>{ e.stopPropagation(); e.preventDefault(); const r=BD.stage.container().getBoundingClientRect(), c=BD.main.getCanvas(), pr=c.getPixelRatio(), x=Math.round((e.clientX-r.left)*pr), y=Math.round((e.clientY-r.top)*pr);
    try{ const d=c.getContext()._context.getImageData(x,y,1,1).data; if(d[3]>0) cb('#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('')); }catch(_){} done(); };
  w.addEventListener('pointerdown',h,true); window.addEventListener('keydown',k,true); }
UI.canvasPick=canvasPick;
function colorPop(anchor,value,onChange,opt){ opt=opt||{}; let h=hex6(value), a=value?alphaOf(value):100;
  const sw=list=>list.map(c=>`<button type="button" class="sw" data-c="${c}" style="--c:${c}" aria-label="${c}" title="${c}"></button>`).join('');
  const saved=(S.styles.colors||[]);
  openPop(anchor,`<div class="cp">
    <div class="cp-row"><input type="color" id="cpNative" value="${h}" aria-label="Pick a colour"><input type="text" id="cpHex" value="${h}" maxlength="7" class="b-in mono" aria-label="Hex colour" spellcheck="false"><button type="button" class="ib" id="cpEye" aria-label="Pick from the design" title="Pick from the design">${IC.drop}</button></div>
    <label class="cp-a"><span>Opacity</span><input type="range" id="cpA" min="0" max="100" value="${a}"><output id="cpAo">${a}%</output></label>
    <div class="cp-sec"><span class="lbl">Brand</span><div class="sws">${sw(brandSwatches())}</div></div>
    <div class="cp-sec"><div class="lbl-row"><span class="lbl">Saved</span><button type="button" class="link tiny" id="cpSave">+ Save this colour</button></div><div class="sws">${saved.length?sw(saved):'<span class="hint">Colours you save show here.</span>'}</div></div>
    ${docColors().length?`<div class="cp-sec"><span class="lbl">In this board</span><div class="sws">${sw(docColors())}</div></div>`:''}
    ${S.recent.length?`<div class="cp-sec"><span class="lbl">Recent</span><div class="sws">${sw(S.recent)}</div></div>`:''}
    <div class="cp-sec"><span class="lbl">Basic</span><div class="sws">${sw(BASIC)}</div></div>
    ${opt.none?'<button type="button" class="mini cp-none" id="cpNone">No colour</button>':''}</div>`,{cls:'pop-color'});
  const send=rec=>{ onChange(withAlpha(h,a)); if(rec){ S.recent=[h,...S.recent.filter(x=>x!==h)].slice(0,8); L.store('lab:recentColors',S.recent); } const hx=pop.querySelector('#cpHex'); if(hx){ hx.value=h; pop.querySelector('#cpNative').value=h; pop.querySelector('#cpAo').textContent=a+'%'; } };
  pop.querySelector('#cpNative').oninput=e=>{ h=e.target.value; send(); }; pop.querySelector('#cpNative').onchange=()=>send(true);
  pop.querySelector('#cpHex').onchange=e=>{ const v=e.target.value.trim(); if(/^#?[0-9a-f]{6}$/i.test(v)){ h=(v[0]==='#'?v:'#'+v).toLowerCase(); send(true); } };
  pop.querySelector('#cpA').oninput=e=>{ a=+e.target.value; send(); };
  pop.querySelectorAll('.sw').forEach(b=>b.onclick=()=>{ h=b.dataset.c.slice(0,7); send(true); });
  pop.querySelector('#cpSave').onclick=()=>{ BD.tools.addColor(h); colorPop(anchor,withAlpha(h,a),onChange,opt); };
  pop.querySelector('#cpEye').onclick=()=>{ closePop(); canvasPick(c=>{ h=c; onChange(withAlpha(h,a)); UI.paintProps&&UI.paintProps(); paintQbar(); }); };
  const none=pop.querySelector('#cpNone'); if(none) none.onclick=()=>{ onChange(''); closePop(); }; }
UI.colorPop=colorPop;

/* ---------- applying changes to the selection ---------- */
const targets=()=>S.sel.filter(n=>!isLocked(n));
function apply(fn,opt){ const list=targets(); list.forEach(fn); list.forEach(n=>{ BD.applyFill(n); BD.decorate(n); if(n.isCached&&n.isCached()) BD.applyFx(n); const p=n.getParent(); if(p&&kind(p)==='mask') BD.decorate(p); }); BD.tr.forceUpdate(); BD.main.batchDraw(); BD.paintUI(); BD.changed(); if(opt&&opt.repaint) UI.paintProps(); placeQbar(); }
Object.assign(UI,{targets,apply});

/* ---------- the floating tool dock (bottom) ---------- */
const SHAPE_TOOLS=[['rect','Rectangle','R'],['ellipse','Ellipse','O'],['poly','Triangle','Y'],['star','Star','S'],['line','Line','L'],['arrow','Arrow','Shift+L']];
const DRAW_T=[['pen','Pen','P'],['marker','Highlighter','Shift+P'],['eraser','Eraser','E']];
let lastShape=L.store('lab:lastShape')||'rect', lastDraw='pen';
function paintDock(){ const t=S.tool, sh=SHAPE_TOOLS.find(x=>x[0]===lastShape)||SHAPE_TOOLS[0];
  const drawOn=t==='pen'||t==='eraser', drawIc=t==='eraser'?'eraser':(t==='pen'?(S.pen.mode==='marker'?'marker':'pen'):lastDraw);
  const btn=(id,ic,label,on,fly)=>`<div class="dk-g${fly?' has-fly':''}"><button type="button" class="dk" data-dk="${id}" aria-pressed="${!!on}" aria-label="${esc(label)}" title="${esc(label)}">${ic}</button>${fly?`<button type="button" class="dk-fly" data-fly="${id}" aria-label="More ${esc(label.split(' (')[0].toLowerCase())} options" title="More options" data-menu-owner>${IC.caret}</button>`:''}</div>`;
  $('dock').innerHTML=btn('select',t==='hand'?IC.hand:IC.select,t==='hand'?'Hand (H)':'Move (V)',t==='select'||t==='hand',1)+btn('frame',IC.frame,'Frame (F)',t==='frame',1)+
    btn('shape',IC[sh[0]],sh[1]+' ('+sh[2]+')',SHAPE_TOOLS.some(x=>x[0]===t),1)+btn('text',IC.text,'Text (T)',t==='text',1)+btn('draw',IC[drawIc],(drawIc==='eraser'?'Eraser (E)':drawIc==='marker'?'Highlighter (Shift+P)':'Pen (P)'),drawOn,1)+
    '<span class="dk-sep" aria-hidden="true"></span>'+btn('upload',IC.upload,'Upload photos, SVG or PDF (I)',false)+btn('brand',IC.brand,'Brand kit',false)+btn('more',IC.more,'More tools',false); }
BD.on('tool',t=>{ BD.wrap.dataset.tool=t; paintDock(); paintQbar(); UI.paintProps&&UI.paintProps(); });
$('dock').addEventListener('click',e=>{ const f=e.target.closest('[data-fly]'); if(f){ dockFly(f.dataset.fly,f); return; } const b=e.target.closest('[data-dk]'); if(!b) return; const id=b.dataset.dk;
  /* tapping the tool that's already on opens its options (that's how phones reach them) */
  if(b.getAttribute('aria-pressed')==='true'&&b.parentElement.querySelector('[data-fly]')&&id!=='select'){ dockFly(id,b); return; }
  if(id==='select') BD.setTool(S.tool==='hand'?'hand':'select');
  if(id==='frame') BD.setTool('frame'); if(id==='shape') BD.setTool(lastShape); if(id==='text') BD.setTool('text');
  if(id==='draw'){ if(lastDraw==='eraser') BD.setTool('eraser'); else { S.pen.mode=lastDraw==='marker'?'marker':'pen'; BD.setTool('pen'); } }
  if(id==='upload') $('pickImg').click(); if(id==='brand') brandPop(b); if(id==='more') morePop(b); });
function dockFly(id,el){ const r=el.closest('.dk-g').getBoundingClientRect(), x=r.left, y=r.top;
  if(id==='select') openMenu(x,y,[{label:'Move',key:'V',icon:IC.select,run:()=>BD.setTool('select')},{label:'Hand',key:'H',icon:IC.hand,run:()=>BD.setTool('hand')}],{above:true});
  if(id==='frame') openMenu(x,y,[{label:'Draw a frame',key:'F',icon:IC.frame,run:()=>BD.setTool('frame')},{label:'Print size (mm, label, bleed)…',icon:IC.print,run:()=>UI.printFrameDialog()},'-',{head:'Social'},...BD.PRESETS.filter(p=>p.group==='Social').map(p=>({label:p.label+'  ·  '+p.w+'×'+p.h,run:()=>UI.addFrame(p)})),{head:'Print'},...BD.PRINT.map(p=>({label:p.label+'  ·  '+p.w+'×'+p.h+' mm',run:()=>UI.addPrintFrame(p.w,p.h,p.label)}))],{above:true});
  if(id==='shape') openMenu(x,y,[...SHAPE_TOOLS.map(([t,l,k])=>({label:l,key:k,icon:IC[t],run:()=>{ lastShape=t; L.store('lab:lastShape',t); BD.setTool(t); }})),'-',{label:'More shapes…',icon:IC.shapes,run:()=>openAssets('shapes')}],{above:true});
  if(id==='text') openMenu(x,y,[{label:'Text',key:'T',icon:IC.text,run:()=>BD.setTool('text')},{label:'Curved text',icon:IC.arc,run:()=>BD.tools.makeArc()},{label:'Text styles…',icon:IC.palette,run:()=>openAssets('text')}],{above:true});
  if(id==='draw') openMenu(x,y,DRAW_T.map(([t,l,k])=>({label:l,key:k,icon:IC[t],run:()=>{ lastDraw=t; if(t==='eraser') BD.setTool('eraser'); else { S.pen.mode=t==='marker'?'marker':'pen'; BD.setTool('pen'); } paintDock(); }})),{above:true}); }
function brandPop(anchor){ const as=L.brandAssets(), ph=(BD.B&&BD.B.phrases)||{}; const words=[...(ph.headlines||[]),...(ph.buttons||[])].filter((v,i,a)=>a.indexOf(v)===i).slice(0,14);
  openPop(anchor,`<div class="bpop"><span class="lbl">Brand assets</span><div class="agrid">${as.map(a=>`<button type="button" class="ag" data-asset="${a.id}" title="${esc(a.label)}" aria-label="${esc(a.label)}"><img src="${L.assetUrl(a)}" alt="" loading="lazy"></button>`).join('')}</div>
    <span class="lbl">Approved wording</span><div class="phr" dir="auto">${words.map(p=>`<button type="button" class="chip sm" data-phrase="${esc(p)}" dir="auto">${esc(p)}</button>`).join('')}</div>
    <button type="button" class="link" id="bpAll">All brand assets and wording</button></div>`,{above:true,center:true,cls:'pop-wide'});
  pop.onclick=e=>{ const it=e.target.closest('[data-asset],[data-phrase]'); if(it){ addItem(it); closePop(); } if(e.target.id==='bpAll'){ closePop(); openAssets('brand'); } }; }
function morePop(anchor){ const r=anchor.getBoundingClientRect(); openMenu(r.left-120,r.top,[
  {label:'Barcode (EAN / UPC)…',icon:IC.barcode,run:()=>UI.barcodeDialog()},{label:'QR code…',icon:IC.qr,run:()=>UI.qrDialog()},{label:'Curved text',icon:IC.arc,run:()=>BD.tools.makeArc()},'-',
  {label:'Mask (photo inside a shape)',icon:IC.mask,run:()=>BD.tools.mask(),disabled:!BD.tools.canMask(S.sel)},{label:'Repeat in a grid…',icon:IC.repeat,run:()=>UI.repeatDialog(),disabled:!S.sel.some(n=>!isFrame(n))},'-',
  {label:'Find and replace…',icon:IC.findr,key:mod+'+F',run:()=>UI.findDialog()},{label:'Replace a colour…',icon:IC.palette,run:()=>UI.colorsDialog()},{label:'Versions…',icon:IC.history,run:()=>UI.versionsDialog()},'-',
  {label:'Rulers and guides',icon:IC.ruler,check:S.rulers,run:()=>setRulers(!S.rulers)},{label:'Quick find…',icon:IC.search,key:mod+' K',run:openPalette}],{above:true}); }

/* ---------- quick-edit bar above the selection ---------- */
const qbar=$('qbar'); let qHide=false;
function qb(act,inner,label,on){ return `<button type="button" class="qb" data-q="${act}" aria-label="${esc(label)}" title="${esc(label)}"${on!=null?` aria-pressed="${!!on}"`:''}>${inner}</button>`; }
function qsw(key,val,label){ return `<button type="button" class="qb qsw" data-qc="${key}" aria-label="${esc(label)}" title="${esc(label)}" data-pop-owner><i style="--c:${val||'transparent'}" class="${val?'':'empty'}"></i></button>`; }
function paintQbar(){ const list=S.sel; if(!list.length||BD.editing()||(S.tool!=='select'&&S.tool!=='hand')||(UI.cropping&&UI.cropping())){ qbar.hidden=true; return; }
  const n=list[0], k=kind(n), one=list.length===1, all=list.every(x=>kind(x)===k), locked=list.every(isLocked); let h='';
  if(locked){ h=qb('unlock',IC.unlock,'Unlock'); }
  else if(one&&k==='frame'){ const s=fsize(n), dp=BD.units.dpiOf(n); h=`<button type="button" class="qb qtxt" data-q="frameSize" title="Frame size">${BD.units.fmt(s.w,dp)} × ${BD.units.fmt(s.h,dp)}${S.unit==='px'?'':' '+S.unit}</button>`+qsw('bgFill',typeof frameBg(n).fill()==='string'?frameBg(n).fill():'','Background colour')+qb('exportFrame','Export','Export this frame'); }
  else if(all&&(k==='text'||k==='arc')){ const fams=BD.allFonts(); h=`<select class="qsel" data-qs="fontFamily" aria-label="Font">${fams.map(f=>`<option ${f.family===n.fontFamily()?'selected':''}>${esc(f.family)}</option>`).join('')}${fams.some(f=>f.family===n.fontFamily())?'':`<option selected>${esc(n.fontFamily())}</option>`}</select>
      <input class="qnum" type="number" data-qs="fontSize" value="${Math.round(n.fontSize())}" min="4" aria-label="Font size">`+qsw('oFill',typeof n.fill()==='string'?n.fill():'','Text colour')+qb('bold',IC.bold,'Bold',/[6-9]00|bold/.test(n.fontStyle()))+(k==='text'?qb('align',IC[{left:'tl',center:'tc',right:'tr',justify:'tj'}[n.align()]||'tc'],'Alignment'):''); }
  else if(all&&(k==='image'||k==='asset')){ h=(one&&k==='image'?qb('crop',IC.crop+'<span>Crop</span>','Crop / move photo'):'')+qb('looks','Looks','Photo looks')+(one&&k==='image'?qb('replace','Replace','Replace photo'):'')+(one?qb('fillFrame','Fill frame','Fill the frame'):''); }
  else if(all&&['rect','ellipse','poly','star','ring','path','icon','stroke','line','arrow','pen'].includes(k)){ const ln=['line','arrow','pen','stroke','icon'].includes(k); h=(ln?'':qsw('oFill',typeof n.fill()==='string'?n.fill():'','Fill'))+qsw('stroke',n.stroke()||'',ln?'Line colour':'Outline'); }
  else if(all&&(k==='barcode'||k==='qr')){ h=qb(k==='qr'?'editQR':'editBarcode','Edit '+(k==='qr'?'QR code':'barcode'),'Change it'); }
  if(!locked&&!(one&&k==='frame')){ const r=unionRect(list), dp=BD.units.dpiOf(n); h+=`<span class="qsep"></span><button type="button" class="qb qtxt" data-q="size" title="Width × height (change it in the Design panel)">${BD.units.fmt(r.width,dp)} × ${BD.units.fmt(r.height,dp)}</button>`;
    if(list.length>1) h+=qb('group',IC.group,'Group ('+mod+'+G)'); if(list.some(x=>kind(x)==='group')) h+=qb('ungroup',IC.group+'<span>Ungroup</span>','Ungroup');
    if(BD.tools.canMask(list)) h+=qb('mask',IC.mask+'<span>Mask</span>','Mask (put inside the shape)'); if(list.some(x=>kind(x)==='mask')) h+=qb('unmask','Unmask','Release the mask'); }
  if(!locked) h+=`<span class="qsep"></span>`+qb('dup',IC.dup,'Duplicate ('+mod+'+D)')+qb('del',IC.trash,'Delete');
  h+=qb('menu',IC.more,'More');
  qbar.innerHTML=h; qbar.hidden=qHide; placeQbar(); }
function placeQbar(){ if(qbar.hidden||!S.sel.length) return; const r=unionRect(S.sel), w=BD.wrap.getBoundingClientRect(), t=U.toScreen({x:r.x+r.width/2,y:r.y}), b=U.toScreen({x:r.x,y:r.y+r.height});
  const qw=qbar.offsetWidth, qh=qbar.offsetHeight, top0=S.rulers?28:8; let x=t.x-qw/2, y=t.y-qh-(isFrame(S.sel[0])?34:46);
  if(y<top0) y=b.y+18; if(y>w.height-qh-92) y=Math.max(top0,w.height-qh-92); x=clamp(x,(S.rulers?28:8),Math.max(8,w.width-qw-8)); qbar.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`; }
UI.paintQbar=paintQbar;
BD.on('select',()=>{ closePop(); paintQbar(); markLayers(); markPages(); UI.paintProps&&UI.paintProps(); });
BD.on('geom',()=>{ const sz=qbar.querySelector('[data-q="size"],[data-q="frameSize"]'); const n=S.sel[0]; if(sz&&n){ const r=isFrame(n)&&S.sel.length===1?{width:fsize(n).w,height:fsize(n).h}:unionRect(S.sel), dp=BD.units.dpiOf(n); sz.textContent=BD.units.fmt(r.width,dp)+' × '+BD.units.fmt(r.height,dp)+(isFrame(n)&&S.unit!=='px'?' '+S.unit:''); } placeQbar(); });
BD.wrap.addEventListener('pointerdown',e=>{ if(e.target.closest('.qbar,.dock,.b-corner,.ruler-c')) return; qHide=true; qbar.hidden=true; },true);
window.addEventListener('pointerup',()=>{ if(qHide){ qHide=false; setTimeout(paintQbar,30); } });
BD.tr.on('transformstart',()=>{ qbar.hidden=true; }); BD.tr.on('transformend',()=>setTimeout(paintQbar,30));
qbar.addEventListener('click',e=>{ const c=e.target.closest('[data-qc]'); if(c){ qColor(c); return; } const b=e.target.closest('[data-q]'); if(!b) return; const a=b.dataset.q, n=S.sel[0];
  const acts={unlock:()=>BD.act.lock(false),dup:()=>BD.act.duplicate(),del:()=>BD.act.del(),group:()=>BD.act.group(),ungroup:()=>BD.act.ungroup(),mask:()=>BD.tools.mask(),unmask:()=>BD.tools.unmask(),
    frameSize:()=>{ panel('R',true); UI.focusField&&UI.focusField('w'); }, size:()=>{ panel('R',true); UI.focusField&&UI.focusField('w'); }, exportFrame:()=>UI.exportDialog([n]),
    bold:()=>apply(x=>{ const w=(x.fontStyle().match(/\d{3}/)||[/bold/.test(x.fontStyle())?'700':'400'])[0], it=/italic/.test(x.fontStyle()); const nb=+w>=600?'400':'700'; BD.ensureFont(x.fontFamily(),nb).then(()=>{ if(kind(x)==='text'&&x._setTextData) x._setTextData(); BD.main.batchDraw(); }); x.fontStyle(((it?'italic ':'')+nb)); if(kind(x)==='text') BD.prepText(x); },{repaint:true}),
    align:()=>apply(x=>{ const o=['left','center','right'], i=o.indexOf(x.align()); x.align(o[(i+1)%3]); },{repaint:true}),
    crop:()=>UI.startCrop(n), replace:()=>UI.replacePhoto(n), fillFrame:()=>BD.act.fillFrame(n), looks:()=>looksPop(b), editQR:()=>UI.qrDialog(n), editBarcode:()=>UI.barcodeDialog(n),
    menu:()=>{ const r=b.getBoundingClientRect(); contextMenu(r.left,r.bottom+4); }};
  if(acts[a]) acts[a](); if(a!=='looks'&&a!=='menu') paintQbar(); });
qbar.addEventListener('change',e=>{ const t=e.target, k=t.dataset.qs; if(!k) return;
  if(k==='fontFamily'){ const fam=t.value; Promise.all(targets().map(n=>BD.ensureFont(fam,n.fontStyle()))).then(()=>apply(n=>{ n.fontFamily(fam); if(kind(n)==='text') BD.prepText(n); },{repaint:true})); }
  if(k==='fontSize'&&+t.value>=1) apply(n=>n.fontSize(+t.value),{repaint:true}); });
qbar.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.tagName==='INPUT'){ e.target.dispatchEvent(new Event('change',{bubbles:true})); e.target.blur(); } e.stopPropagation(); });
function qColor(btn){ const key=btn.dataset.qc, n=S.sel[0]; const cur=key==='bgFill'?frameBg(n).fill():key==='stroke'?n.stroke():n.fill();
  colorPop(btn,(typeof cur==='string'&&cur)||'#000000',v=>{ if(key==='bgFill') apply(f=>{ const bg=frameBg(f); bg.fill(v||'#ffffff'); bg.setAttr('fillType','solid'); BD.applyFill(bg); });
    else if(key==='stroke') apply(x=>{ x.stroke(v); if(v&&!x.strokeWidth()) x.strokeWidth(kind(x)==='text'?4:6); if(kind(x)==='arrow') x.fill(v); });
    else apply(x=>{ x.fill(v); x.setAttr('fillType','solid'); x.fillPriority('color'); if(kind(x)==='arrow') x.stroke(v||x.stroke()); });
    const i=btn.querySelector('i'); if(i){ i.style.setProperty('--c',v||'transparent'); i.classList.toggle('empty',!v); } UI.paintProps&&UI.paintProps(); },{none:key!=='bgFill'}); }
function looksPop(anchor){ if(!S.sel[0]) return;
  openPop(anchor,`<div class="looks">${BD.LOOKS.map(l=>`<button type="button" class="look" data-look="${l.id}">${esc(l.label)}</button>`).join('')}</div>`,{cls:'pop-looks'});
  pop.onclick=e=>{ const b=e.target.closest('[data-look]'); if(!b) return; const l=BD.LOOKS.find(x=>x.id===b.dataset.look); apply(x=>{ x.setAttr('fx',Object.assign({},l.fx)); BD.applyFx(x); },{repaint:true}); }; }

/* ---------- right-click menu ---------- */
function contextMenu(x,y,world){ const sel=S.sel, one=sel[0], k=one&&kind(one), objs=sel.filter(n=>!isFrame(n)); const e=[];
  if(!sel.length){ e.push({label:'Paste',key:mod+'+V',run:()=>BD.paste()},{label:'Upload photos, SVG or PDF…',run:()=>$('pickImg').click()},{label:'Add a frame here',run:()=>{ const w=world||U.toWorld({x:BD.stage.width()/2,y:BD.stage.height()/2}); const f=BD.makeFrame(w.x,w.y,1080,1920,{label:'Frame '+(frames().length+1)}); BD.select([f]); BD.changed(); BD.paintUI(); }},'-',{label:'Select all',key:mod+'+A',run:BD.act.selectAll},{label:'Fit everything',key:'Shift+1',run:BD.view.fitAll},{label:'Quick find…',key:mod+' K',run:openPalette}); openMenu(x,y,e); return; }
  e.push({label:'Copy',key:mod+'+C',run:()=>BD.copy()},{label:'Cut',key:mod+'+X',run:()=>BD.copy(true)},{label:'Paste',key:mod+'+V',run:()=>BD.paste()},{label:'Duplicate',key:mod+'+D',run:()=>BD.act.duplicate()},{label:'Delete',key:'Del',danger:true,run:BD.act.del},'-');
  e.push({label:'Copy style',key:mod+'+Alt+C',run:BD.act.copyStyle},{label:'Paste style',key:mod+'+Alt+V',run:BD.act.pasteStyle},'-');
  e.push({label:'Bring to front',key:mod+'+Shift+]',run:()=>BD.act.order('front')},{label:'Bring forward',key:mod+'+]',run:()=>BD.act.order('up')},{label:'Send backward',key:mod+'+[',run:()=>BD.act.order('down')},{label:'Send to back',key:mod+'+Shift+[',run:()=>BD.act.order('back')},'-');
  if(objs.length>1) e.push({label:'Group',key:mod+'+G',run:BD.act.group}); if(sel.some(n=>kind(n)==='group')) e.push({label:'Ungroup',key:mod+'+Shift+G',run:BD.act.ungroup});
  if(BD.tools.canMask(sel)) e.push({label:'Mask (put inside the shape)',run:BD.tools.mask}); if(sel.some(n=>kind(n)==='mask')) e.push({label:'Release mask',run:BD.tools.unmask});
  e.push({label:sel.every(isLocked)?'Unlock':'Lock',key:mod+'+Shift+L',run:()=>BD.act.lock()},{label:'Hide',key:mod+'+Shift+H',run:()=>BD.act.hide(true)});
  if(objs.length) e.push({label:'Flip horizontal',key:'Shift+H',run:()=>BD.act.flip('x')},{label:'Flip vertical',key:'Shift+V',run:()=>BD.act.flip('y')},{label:'Repeat in a grid…',run:()=>UI.repeatDialog()});
  if(objs.length===1&&frameOf(one)) e.push('-',{label:'Fill the frame',run:()=>BD.act.fillFrame(one)});
  if(k==='image') e.push({label:'Crop / move photo',run:()=>UI.startCrop(one)},{label:'Replace photo…',run:()=>UI.replacePhoto(one)},{label:'Make frame background',run:()=>BD.act.fillFrame(one,true)});
  if(objs.length===1) e.push({label:'Spread across frames',run:BD.act.spread});
  if(k==='frame'&&sel.length===1) e.push('-',{label:'Rename frame',run:()=>UI.renameNode(one)},{label:'Export frame…',run:()=>UI.exportDialog([one])});
  e.push('-',{label:'Export selection as PNG',run:()=>UI.exportSel()});
  openMenu(x,y,e); }
UI.contextMenu=contextMenu;
BD.on('context',({x,y,world})=>contextMenu(x,y,world));
BD.on('rename',n=>UI.renameNode(n));
BD.on('editspecial',n=>{ const k=kind(n); if(k==='barcode') UI.barcodeDialog(n); else if(k==='qr') UI.qrDialog(n); else if(k==='arc'){ panel('R',true); UI.focusField&&setTimeout(()=>{ const i=document.querySelector('#props input[data-k="arcText"]'); if(i){ i.focus(); i.select(); } },60); } });

/* ---------- frames list (top of the Layers tab) ---------- */
const pagesEl=$('pages'); const thumbs=new Map(); let thumbT=0;
function paintPages(){ const fs=frames(); $('pagesN').textContent=fs.length||'';
  pagesEl.innerHTML=fs.length?fs.map(f=>{ const s=fsize(f), dp=BD.units.dpiOf(f); return `<div class="pg" data-id="${f.id()}" draggable="true" aria-current="${S.sel.some(n=>n===f||frameOf(n)===f)}" role="button" tabindex="0"><span class="pg-th"><img alt="" data-th="${f.id()}"></span><span class="pg-t"><b dir="auto">${esc(nameOf(f))}</b><small>${BD.units.fmt(s.w,dp)} × ${BD.units.fmt(s.h,dp)}${S.unit==='px'?'':' '+S.unit}${f.getAttr('print')?' · print':''}</small></span></div>`; }).join(''):'<p class="ps-note">No frames yet. Press F and drag, or pick a size from the frame button below.</p>';
  pagesEl.querySelectorAll('img[data-th]').forEach(i=>{ const t=thumbs.get(i.dataset.th); if(t) i.src=t; }); thumbsSoon(); }
UI.paintPages=paintPages;
function thumbsSoon(){ clearTimeout(thumbT); thumbT=setTimeout(async()=>{ for(const f of frames()){ if(!f.getStage()) continue; try{ const s=fsize(f), k=Math.min(1,96/Math.max(s.w,s.h)); const c=BD.renderFrame(f,k); const u=c.toDataURL('image/png'); c.width=c.height=0; thumbs.set(f.id(),u); const i=pagesEl.querySelector(`img[data-th="${f.id()}"]`); if(i) i.src=u; }catch(_){} await new Promise(r=>setTimeout(r,0)); } },900); }
function markPages(){ pagesEl.querySelectorAll('.pg').forEach(p=>p.setAttribute("aria-current",String(S.sel.some(n=>n.id()===p.dataset.id||(frameOf(n)&&frameOf(n).id()===p.dataset.id))))); }
pagesEl.addEventListener('click',e=>{ const p=e.target.closest('.pg'); if(!p) return; const f=BD.main.findOne('#'+p.dataset.id); if(f){ BD.select([f]); BD.view.fitSel(); if(innerWidth<900) panel('L',false); } });
pagesEl.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const p=e.target.closest('.pg'); if(p) p.click(); } });
pagesEl.addEventListener('dblclick',e=>{ const p=e.target.closest('.pg'); const f=p&&BD.main.findOne('#'+p.dataset.id); if(f) UI.renameNode(f); });
let pgDrag=null;
pagesEl.addEventListener('dragstart',e=>{ pgDrag=e.target.closest('.pg'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain','pg'); });
pagesEl.addEventListener('dragover',e=>{ const p=e.target.closest('.pg'); if(!p||!pgDrag||p===pgDrag) return; e.preventDefault(); pagesEl.querySelectorAll('.drop-a,.drop-b').forEach(x=>x.classList.remove('drop-a','drop-b')); const r=p.getBoundingClientRect(); p.classList.add(e.clientY<r.top+r.height/2?'drop-a':'drop-b'); });
pagesEl.addEventListener('drop',e=>{ const p=e.target.closest('.pg'); if(!p||!pgDrag) return; e.preventDefault(); const a=BD.main.findOne('#'+pgDrag.dataset.id), b=BD.main.findOne('#'+p.dataset.id); if(!a||!b) return;
  const fs=frames(), r=p.getBoundingClientRect(), before=e.clientY<r.top+r.height/2; const order=fs.filter(f=>f!==a); order.splice(order.indexOf(b)+(before?0:1),0,a);
  /* frames are laid out left to right in the new order */
  let x=Math.min(...fs.map(f=>f.x())); order.forEach(f=>{ f.x(x); x+=fsize(f).w+160; f.moveToTop(); }); BD.paintUI(); BD.changed(); paintPages(); paintLayers(); });
pagesEl.addEventListener('dragend',()=>{ pgDrag=null; pagesEl.querySelectorAll('.drop-a,.drop-b').forEach(x=>x.classList.remove('drop-a','drop-b')); });
document.querySelector('[data-fold="pages"]').onclick=e=>{ const b=e.currentTarget, on=b.getAttribute('aria-expanded')!=='true'; b.setAttribute('aria-expanded',String(on)); pagesEl.hidden=!on; L.store('lab:fold:pages',on?null:1); };
if(L.store('lab:fold:pages')){ document.querySelector('[data-fold="pages"]').setAttribute('aria-expanded','false'); pagesEl.hidden=true; }

/* ---------- layers ---------- */
const layersEl=$('layers'); const open=new Set(); let layT=0;
function paintLayersSoon(){ clearTimeout(layT); layT=setTimeout(()=>{ paintLayers(); paintPages(); },60); }
UI.paintLayersSoon=paintLayersSoon;
function kindIcon(n){ if(n.getAttr('isMask')) return IC.mask; const k=kind(n); return ({frame:IC.frame,text:IC.text,arc:IC.arc,rect:IC.rect,ellipse:IC.ellipse,poly:IC.poly,star:IC.star,ring:IC.ellipse,path:IC.shapes,icon:IC.icons,line:IC.line,arrow:IC.arrow,pen:IC.pen,image:IC.image,asset:IC.brand,group:IC.group,mask:IC.mask,stroke:IC.line,barcode:IC.barcode,qr:IC.qr})[k]||IC.rect; }
function autoOpen(){ const s=S.sel[0]; if(!s){ const f=BD.activeFrame&&BD.activeFrame(); if(f) open.add(f.id()); return; } let p=isFrame(s)?s:s.getParent(); while(p&&p!==BD.main){ open.add(p.id()); p=p.getParent(); } }
function row(n,d){ const box=isFrame(n)||['group','mask'].includes(kind(n)), kids=box?items(n):[], on=box&&open.has(n.id()), lk=isLocked(n), vis=n.visible();
  return `<div class="lr${isFrame(n)?' lr-frame':''}${vis?'':' off'}${n.getAttr('isMask')?' lr-mask':''}" role="treeitem" draggable="true" data-id="${n.id()}" style="--d:${d}" aria-selected="${S.sel.includes(n)}" ${box?`aria-expanded="${on}"`:''}>
    ${box&&kids.length?`<button type="button" class="lr-caret" data-caret aria-label="${on?'Collapse':'Expand'}">${IC.caretR}</button>`:'<span class="lr-caret"></span>'}<span class="lr-ic">${kindIcon(n)}</span><span class="lr-n" dir="auto">${esc(n.getAttr('isMask')?'Mask shape':nameOf(n))}</span>
    <button type="button" class="lr-b${lk?' on':''}" data-lock aria-label="${lk?'Unlock':'Lock'}" title="${lk?'Unlock':'Lock'}">${lk?IC.lock:IC.unlock}</button><button type="button" class="lr-b${vis?'':' on'}" data-eye aria-label="${vis?'Hide':'Show'}" title="${vis?'Hide':'Show'}">${vis?IC.eye:IC.eyeOff}</button></div>`; }
function paintLayers(){ autoOpen(); const rows=[];
  const walk=(c,d)=>{ items(c).slice().reverse().forEach(n=>{ rows.push(row(n,d)); if((isFrame(n)||['group','mask'].includes(kind(n)))&&open.has(n.id())) walk(n,d+1); }); };
  walk(BD.main,0);
  layersEl.innerHTML=rows.join('')||'<p class="ps-note">Nothing here yet. Add a frame, text or a photo with the tools below.</p>'; }
UI.paintLayers=paintLayers;
function markLayers(){ const before=open.size; autoOpen(); if(open.size!==before) paintLayers();
  layersEl.querySelectorAll('.lr').forEach(r=>r.setAttribute('aria-selected',String(S.sel.some(n=>n.id()===r.dataset.id))));
  const first=layersEl.querySelector('.lr[aria-selected="true"]'); if(first&&!$('layersPane').hidden){ const pr=$('layersPane').getBoundingClientRect(), rr=first.getBoundingClientRect(); if(rr.top<pr.top||rr.bottom>pr.bottom) first.scrollIntoView({block:'nearest'}); } }
const nodeOf=r=>r&&BD.main.findOne('#'+r.dataset.id);
layersEl.addEventListener('click',e=>{ const r=e.target.closest('.lr'); if(!r) return; const n=nodeOf(r); if(!n) return;
  if(e.target.closest('[data-caret]')){ open.has(n.id())?open.delete(n.id()):open.add(n.id()); paintLayers(); return; }
  if(e.target.closest('[data-eye]')){ n.visible(!n.visible()); if(!n.visible()) BD.select(S.sel.filter(x=>x!==n)); BD.main.batchDraw(); BD.paintUI(); BD.changed(); paintLayers(); return; }
  if(e.target.closest('[data-lock]')){ n.setAttr('locked',isLocked(n)?undefined:true); BD.select(S.sel.filter(x=>x!==n||!isLocked(n))); BD.changed(); paintLayers(); return; }
  if(!n.visible()) return;
  const par=n.getParent(); S.entered=par&&par!==BD.main&&!isFrame(par)?par:null;
  if(e.shiftKey||e.metaKey||e.ctrlKey) BD.select(S.sel.includes(n)?S.sel.filter(x=>x!==n):[...S.sel,n]); else BD.select([n]);
  BD.paintUI(); if(innerWidth<900) panel('L',false); });
layersEl.addEventListener('dblclick',e=>{ const r=e.target.closest('.lr'); const n=nodeOf(r); if(!n||e.target.closest('button')) return; const span=r.querySelector('.lr-n');
  const i=document.createElement('input'); i.className='lr-in'; i.value=nameOf(n); i.dir='auto'; span.replaceWith(i); i.focus(); i.select();
  const done=ok=>{ if(ok) n.setAttr('label',i.value.trim()||undefined); BD.paintUI(); BD.changed(); paintLayers(); paintPages(); UI.paintProps(); };
  i.onkeydown=ev=>{ ev.stopPropagation(); if(ev.key==='Enter') done(true); if(ev.key==='Escape') done(false); }; i.onblur=()=>done(true); });
layersEl.addEventListener('mouseover',e=>{ const n=nodeOf(e.target.closest('.lr')); BD.hoverNode&&BD.hoverNode(n&&!S.sel.includes(n)?n:null); });
layersEl.addEventListener('mouseleave',()=>BD.hoverNode&&BD.hoverNode(null));
let dragRow=null;
layersEl.addEventListener('dragstart',e=>{ const r=e.target.closest('.lr'); if(!r) return; dragRow=r; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',r.dataset.id); r.classList.add('dragging'); });
layersEl.addEventListener('dragend',()=>{ if(dragRow) dragRow.classList.remove('dragging'); dragRow=null; layersEl.querySelectorAll('.drop-a,.drop-b,.drop-in').forEach(x=>x.classList.remove('drop-a','drop-b','drop-in')); });
function dropPos(r,e){ const b=r.getBoundingClientRect(), y=(e.clientY-b.top)/b.height, t=nodeOf(r); const box=t&&(isFrame(t)||['group','mask'].includes(kind(t))); if(box&&y>.3&&y<.7) return 'in'; return y<.5?'a':'b'; }
layersEl.addEventListener('dragover',e=>{ const r=e.target.closest('.lr'); if(!r||!dragRow||r===dragRow) return; e.preventDefault(); layersEl.querySelectorAll('.drop-a,.drop-b,.drop-in').forEach(x=>x.classList.remove('drop-a','drop-b','drop-in')); r.classList.add('drop-'+dropPos(r,e)); });
layersEl.addEventListener('drop',e=>{ const r=e.target.closest('.lr'); if(!r||!dragRow) return; e.preventDefault(); const n=nodeOf(dragRow), t=nodeOf(r); if(!n||!t||n===t||n.isAncestorOf(t)) return; const pos=dropPos(r,e);
  if(pos==='in'){ if(isFrame(n)) return; U.reparent(n,t); n.moveToTop(); }
  else { const par=t.getParent(); if(isFrame(n)&&par!==BD.main) return; if(par!==n.getParent()) U.reparent(n,par); else n.moveToTop(); const idx=t.zIndex(); n.zIndex(pos==='a'?Math.min(idx+1,par.children.length-1):idx); if(isFrame(par)) frameBg(par).moveToBottom(); }
  BD.main.find('.obj').forEach(x=>{ if(kind(x)==='mask') BD.decorate(x); }); BD.main.batchDraw(); BD.tr.forceUpdate(); BD.paintUI(); BD.changed(); paintLayers(); });
(function(){ const box=new Konva.Rect({stroke:'#2f7bff',strokeWidth:1.5,strokeScaleEnabled:false,listening:false,visible:false}); BD.ui.add(box);
  BD.hoverNode=n=>{ if(n&&n.visible()){ const r=wrect(n); box.setAttrs({...r,visible:true}); } else box.visible(false); BD.ui.batchDraw(); }; })();
BD.on('doc',()=>{ paintLayersSoon(); drawMini(); paintQbar(); });

/* tabs */
document.querySelector('#left .bp-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(b) showTab(b.dataset.tab); });
function showTab(t){ document.querySelectorAll('#left .bp-tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t))); $('layersPane').hidden=t!=='layers'; $('addPane').hidden=t!=='add'; if(t==='add') paintAdd(); }
function openAssets(cat){ panel('L',true); showTab('add'); addCat=cat||null; addQ=''; $('addQ').value=''; paintAdd(); }
UI.openAssets=openAssets;

/* ---------- assets: categories, then what's inside ---------- */
const addList=$('addList'); let addQ='', addCat=null;
$('addBack').innerHTML=IC.back; $('addBack').onclick=()=>{ addCat=null; paintAdd(); };
$('addQ').addEventListener('input',e=>{ addQ=e.target.value.trim().toLowerCase(); paintAdd(); });
const CATS=[['brand','Brand','brand'],['text','Text','text'],['photos','Photos & files','image'],['shapes','Shapes','shapes'],['lines','Lines','line'],['icons','Icons','icons'],['emoji','Emoji','emoji'],['codes','Barcode & QR','qr'],['frames','Frame sizes','frame'],['templates','Templates','tpl']];
function shapeThumb(d,stroke){ return `<svg viewBox="${stroke?'-6 -6 112 112':'0 0 100 100'}" width="34" height="34" aria-hidden="true"><path d="${d}" ${stroke?'fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"':'fill="currentColor"'}/></svg>`; }
const nativeShape={rect:'M8 8H92V92H8Z',rounded:'M30 8H70A22 22 0 0 1 92 30V70A22 22 0 0 1 70 92H30A22 22 0 0 1 8 70V30A22 22 0 0 1 30 8Z',ellipse:'M92 50A42 42 0 1 1 8 50A42 42 0 1 1 92 50Z',triangle:'M50 8L94 88H6Z',pentagon:'M50 6L94 38L77 90H23L6 38Z',hexagon:'M28 10H72L94 50L72 90H28L6 50Z',
  star:'M50 4L61 37H96L68 58L79 92L50 71L21 92L32 58L4 37H39Z',star8:'M50 2L60 26L84 16L74 40L98 50L74 60L84 84L60 74L50 98L40 74L16 84L26 60L2 50L26 40L16 16L40 26Z',ring:'M50 6A44 44 0 1 1 49.9 6ZM50 26A24 24 0 1 0 50.1 26Z',line:'M8 50H92',arrow:'M8 50H86M66 30L88 50L66 70'};
const pv=(w,h,m)=>{ m=m||18; const k=m/Math.max(w,h); return `width:${Math.max(4,Math.round(w*k))}px;height:${Math.max(4,Math.round(h*k))}px`; };
UI.pv=pv;
function catBody(id,q){ const m=s=>!q||String(s).toLowerCase().includes(q); const B=BD.B||{}, ph=B.phrases||{};
  if(id==='brand'){ const as=L.brandAssets().filter(a=>m(a.label)||m(a.group||'')||m('brand')); const words=[...(ph.headlines||[]),...(ph.small||[]),...(ph.buttons||[])].filter((v,i,a)=>a.indexOf(v)===i&&m(v));
    return (as.length?`<div class="agrid">${as.map(a=>`<button type="button" class="ag" data-asset="${a.id}" draggable="true" title="${esc(a.label)}" aria-label="${esc(a.label)}"><img src="${L.assetUrl(a)}" alt="" loading="lazy"></button>`).join('')}</div>`:'')+
      (words.length?`<span class="lbl sub">Approved wording</span><div class="phr" dir="auto">${words.map(p=>`<button type="button" class="chip sm" data-phrase="${esc(p)}" draggable="true" dir="auto">${esc(p)}</button>`).join('')}</div>`:''); }
  if(id==='text'){ const st=(S.styles.text||[]).filter(t=>m(t.name)); const base=[['Heading','h1'],['Subheading','h2'],['Body text','body']].filter(([l])=>m(l)||m('text'));
    return `<div class="tadd">${base.map(([l,t])=>`<button type="button" class="ta ta-${t}" data-addtext="${t}" draggable="true">${l}</button>`).join('')}${m('curved')||m('text')?`<button type="button" class="ta ta-arc" data-arc="1">${IC.arc} Curved text</button>`:''}</div>`+
      `<span class="lbl sub">Saved text styles</span>`+(st.length?`<div class="tstyles">${st.map(t=>`<div class="tst"><button type="button" class="tst-b" data-tstyle="${t.id}" style="font-family:'${esc(t.attrs.fontFamily)}';font-weight:${(String(t.attrs.fontStyle||'').match(/\d{3}/)||['400'])[0]}">${esc(t.name)}</button><button type="button" class="ib" data-tsdel="${t.id}" aria-label="Remove ${esc(t.name)}">${IC.close}</button></div>`).join('')}</div>`:'<p class="hint">Select some text and press “Save as style” in the Design panel to keep it here.</p>'); }
  if(id==='photos'){ const photos=[...new Set(BD.main.find('Image').filter(n=>kind(n)==='image'&&!n.getAttr('isBg')).map(n=>n.getAttr('imgId')))];
    return `<button type="button" class="mini wide" data-act2="upload">${IC.upload} Upload photos, SVG or PDF</button>${photos.length?`<div class="agrid ph">${photos.map(id=>`<button type="button" class="ag" data-photo="${id}" draggable="true" aria-label="Add this photo again"><canvas data-thumb="${id}" width="80" height="80"></canvas></button>`).join('')}</div>`:''}<p class="hint">You can also drop or paste files on the canvas. SVG files keep their layers; each PDF page becomes a frame.</p>`; }
  if(id==='shapes'){ const sh=BD.SHAPES.filter(s=>m(s.label)||m('shape')); return sh.length?`<div class="sgrid">${sh.map(s=>`<button type="button" class="sg" data-shape="${s.id}" draggable="true" title="${esc(s.label)}" aria-label="${esc(s.label)}">${shapeThumb(s.path||nativeShape[s.id]||nativeShape.rect)}</button>`).join('')}</div>`:''; }
  if(id==='lines'){ const st=BD.STROKES.filter(s=>m(s.label)||m('line')); return st.length?`<div class="sgrid">${st.map(s=>`<button type="button" class="sg" data-stroke="${s.id}" draggable="true" title="${esc(s.label)}" aria-label="${esc(s.label)}">${shapeThumb(s.path||nativeShape[s.id],true)}</button>`).join('')}</div>`:''; }
  if(id==='icons'){ const ic=BD.ICONS.filter(i=>m(i.id.replace(/-/g,' '))||m('icon')); return ic.length?`<div class="sgrid">${ic.map(i=>`<button type="button" class="sg" data-icon="${i.id}" draggable="true" title="${esc(i.id.replace(/-/g,' '))}" aria-label="${esc(i.id.replace(/-/g,' '))}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${i.d}"/></svg></button>`).join('')}</div>`:''; }
  if(id==='emoji') return !q||m('emoji')?`<div class="egrid">${BD.EMOJI.map(e=>`<button type="button" class="eg" data-emoji="${e}" draggable="true" aria-label="${e}">${e}</button>`).join('')}</div>`:'';
  if(id==='codes') return !q||m('barcode')||m('qr')||m('code')?`<div class="tadd"><button type="button" class="ta" data-code="barcode">${IC.barcode} Barcode (EAN-13 / UPC-A)</button><button type="button" class="ta" data-code="qr">${IC.qr} QR code</button></div><p class="hint">Made as sharp shapes, so they print crisp at any size.</p>`:'';
  if(id==='frames'){ const fr=BD.PRESETS.filter(p=>m(p.label)||m('frame')), pr=BD.PRINT.filter(p=>m(p.label)||m('print')||m('mm'));
    return (fr.length?`<div class="preset-list">${fr.map(p=>`<button type="button" class="pl" data-addframe="${p.id}"><span class="pv" style="${pv(p.w,p.h)}"></span><span>${esc(p.label)}</span><small>${p.w}×${p.h}</small></button>`).join('')}</div>`:'')+
      (pr.length||m('print')?`<span class="lbl sub">Print (real size)</span><div class="preset-list">${pr.map(p=>`<button type="button" class="pl" data-addprint="${p.id}"><span class="pv" style="${pv(p.w,p.h)}"></span><span>${esc(p.label)}</span><small>${p.w}×${p.h} mm</small></button>`).join('')}<button type="button" class="pl" data-act2="printDialog"><span class="pv" style="${pv(1,1)}"></span><span>Custom print size…</span><small>mm · cm · in</small></button></div>`:''); }
  if(id==='templates'){ const tp=BD.TEMPLATES.filter(t=>m(t.label)||m('template')); return tp.length?`<div class="tpl">${tp.map(t=>`<button type="button" class="tp" data-tpl="${t.id}"><span class="pv" style="${pv(t.w,t.h,30)}"></span><span>${esc(t.label)}</span></button>`).join('')}</div>`:''; }
  return ''; }
function paintAdd(){ const q=addQ; $('addBack').hidden=!addCat||!!q;
  if(!addCat&&!q){ addList.innerHTML=`<div class="cats">${CATS.map(([id,l,ic])=>`<button type="button" class="cat" data-cat="${id}"><span class="cat-ic">${IC[ic]}</span><span>${l}</span></button>`).join('')}</div>`; return; }
  const ids=q?CATS.map(c=>c[0]):[addCat]; const out=ids.map(id=>{ const body=catBody(id,q); if(!body) return ''; const c=CATS.find(x=>x[0]===id); return `<section class="ps"><h3>${esc(c[1])}</h3>${body}</section>`; }).join('');
  addList.innerHTML=out||'<p class="ps-note">Nothing matches. Try another word.</p>';
  addList.querySelectorAll('canvas[data-thumb]').forEach(c=>{ const im=BD.IMGS.get(c.dataset.thumb); if(!im) return; const x=c.getContext('2d'), k=Math.max(80/im.w,80/im.h); x.drawImage(im.el,(80-im.w*k)/2,(80-im.h*k)/2,im.w*k,im.h*k); }); }
UI.paintAdd=paintAdd;
BD.on('photos',()=>{ if(!$('addPane').hidden) paintAdd(); });
function addItem(el,at){ const d=el.dataset, c=BD.brandColors();
  const tf=()=>at?BD.frameAt(at):BD.targetFrame();
  if(d.addtext){ const f=tf(), fw=f?fsize(f).w:1080; const o=d.addtext==='h1'?{fontSize:Math.round(fw*.12),fontFamily:BD.displayFont()}:d.addtext==='h2'?{fontSize:Math.round(fw*.06),fontFamily:BD.bodyFont(),fontStyle:'800'}:{fontSize:Math.round(fw*.036),fontFamily:BD.bodyFont(),fontStyle:'600',lineHeight:1.4};
    const ar=(BD.B&&BD.B.lang)==='ar'; const n=BD.make.text(d.addtext==='h1'?(ar?'عنوان':'Heading'):d.addtext==='h2'?(ar?'عنوان فرعي':'Subheading'):(ar?'اكتب هنا':'Write something here'),o);
    BD.ensureFont(n.fontFamily(),n.fontStyle()).then(()=>{ BD.place(n,{frame:f,at}); BD.startEdit(n,true); }); return; }
  if(d.arc){ BD.tools.makeArc(); return; }
  if(d.tstyle){ const st=S.styles.text.find(x=>x.id===d.tstyle); if(st) BD.tools.applyTextStyle(st); return; }
  if(d.phrase){ const f=tf(), fw=f?fsize(f).w:1080; BD.place(BD.make.text(d.phrase,{fontSize:Math.round(fw*.09)}),{frame:f,at}); return; }
  if(d.asset){ const a=L.brandAssets().find(x=>x.id===d.asset); if(a) BD.addAsset(a,at); return; }
  if(d.photo){ const im=BD.IMGS.get(d.photo); if(!im) return; const f=tf(), box=f?fsize(f):{w:1080,h:1080}, k=Math.min(1,box.w*.8/im.w,box.h*.8/im.h); BD.place(BD.make.image(d.photo,Math.round(im.w*k),Math.round(im.h*k)),{frame:f,at}); return; }
  if(d.shape){ const s=BD.SHAPES.find(x=>x.id===d.shape), f=tf(); BD.place(BD.make.shape(s,f?Math.round(fsize(f).w*.4):300,c.accent),{frame:f,at}); return; }
  if(d.stroke){ const s=BD.STROKES.find(x=>x.id===d.stroke), f=tf(); BD.place(BD.make.shape(Object.assign({stroke:!s.make},s),f?Math.round(fsize(f).w*.4):300,c.ink),{frame:f,at}); return; }
  if(d.icon){ const s=BD.ICONS.find(x=>x.id===d.icon), f=tf(); BD.place(BD.make.icon(s,f?Math.round(fsize(f).w*.18):160,c.ink),{frame:f,at}); return; }
  if(d.emoji){ const f=tf(); BD.place(BD.make.text(d.emoji,{fontSize:f?Math.round(fsize(f).w*.16):160,fontFamily:'system-ui'}),{frame:f,at}); return; }
  if(d.code==='barcode'){ UI.barcodeDialog(); return; } if(d.code==='qr'){ UI.qrDialog(); return; }
}
UI.addItem=addItem;
addList.addEventListener('click',async e=>{
  const cat=e.target.closest('[data-cat]'); if(cat){ addCat=cat.dataset.cat; paintAdd(); $('addPane').scrollTop=0; return; }
  const a2=e.target.closest('[data-act2]'); if(a2){ if(a2.dataset.act2==='upload') $('pickImg').click(); if(a2.dataset.act2==='printDialog') UI.printFrameDialog(); return; }
  const fr=e.target.closest('[data-addframe]'); if(fr){ UI.addFrame(BD.PRESETS.find(p=>p.id===fr.dataset.addframe)); return; }
  const pr=e.target.closest('[data-addprint]'); if(pr){ const p=BD.PRINT.find(x=>x.id===pr.dataset.addprint); UI.addPrintFrame(p.w,p.h,p.label); return; }
  const tp=e.target.closest('[data-tpl]'); if(tp){ await BD.buildTemplate(tp.dataset.tpl,true); return; }
  const del=e.target.closest('[data-tsdel]'); if(del){ S.styles.text=S.styles.text.filter(x=>x.id!==del.dataset.tsdel); BD.scheduleSave(); paintAdd(); return; }
  const it=e.target.closest('[data-addtext],[data-arc],[data-tstyle],[data-phrase],[data-asset],[data-photo],[data-shape],[data-stroke],[data-icon],[data-emoji],[data-code]'); if(it){ addItem(it); if(innerWidth<900) panel('L',false); } });
addList.addEventListener('dragstart',e=>{ const it=e.target.closest('[draggable]'); if(!it) return; e.dataTransfer.setData('application/x-board-add',JSON.stringify(Object.assign({},it.dataset))); e.dataTransfer.effectAllowed='copy'; });

/* ---------- opening files: photos, SVG (layers), PDF (pages), board files ---------- */
const isSvg=f=>/svg/.test(f.type||'')||/\.svg$/i.test(f.name||''), isPdf=f=>/pdf|illustrator/.test(f.type||'')||/\.(pdf|ai)$/i.test(f.name||''), isBoard=f=>/\.board$/i.test(f.name||'');
async function openFiles(files,at){ files=[...files]; const photos=files.filter(f=>!isSvg(f)&&!isPdf(f)&&!isBoard(f)&&L.isPhotoFile(f));
  for(const f of files.filter(isBoard)){ try{ const id=await BD.importBoardFile(f); await BD.saveNow(); location.href='board.html?id='+id; return; }catch(err){ toast(err.message); } }
  if(photos.length) await BD.addPhotos(photos,at);
  for(const f of files.filter(isSvg)) await openSvg(f,at);
  for(const f of files.filter(isPdf)) await openPdf(f);
  const other=files.filter(f=>!isSvg(f)&&!isPdf(f)&&!isBoard(f)&&!L.isPhotoFile(f)); if(other.length) toast('Can\'t open '+other.map(f=>f.name).join(', ')+'. Use photos, SVG, PDF or board files.');
  paintAdd(); }
UI.openFiles=openFiles;
function openSvg(file,at){ return new Promise(resolve=>{ const tf=at?BD.frameAt(at):BD.targetFrame();
  const d=L.dialog(`<div class="dlg-body"><h3>Open “${esc(file.name)}”</h3><p class="small">SVG files open as layers you can change: shapes, colours, text and pictures.</p>
    <div class="dlg-actions col"><button type="button" class="btn" data-m="frame">As a new frame</button>${tf?`<button type="button" class="btn ghost" data-m="into">Into “${esc(nameOf(tf))}”</button>`:''}<button type="button" class="btn ghost" data-m="pic">As one picture</button></div>
    <div class="status" id="svSt" role="status"></div><button type="button" class="link" id="svNo">Cancel</button></div>`);
  d.addEventListener('close',()=>resolve());
  d.querySelector('#svNo').onclick=()=>d.close();
  d.addEventListener('click',async e=>{ const b=e.target.closest('[data-m]'); if(!b) return; const m=b.dataset.m; d.querySelectorAll('button').forEach(x=>x.disabled=true); d.querySelector('#svSt').textContent='Opening…';
    try{ if(m==='pic'){ await svgAsPicture(file,at); d.close(); return; }
      const r=await BD.io.importSVG(await file.text(),{name:file.name.replace(/\.svg$/i,''),into:m==='into'?tf:null}); d.close(); toast('Opened with '+r.count+' layer'+(r.count===1?'':'s')+'. '+(r.warn||'Double-click a group to change what\'s inside.'),6000); }
    catch(err){ d.querySelector('#svSt').textContent=err.message||'Could not open it.'; d.querySelectorAll('button').forEach(x=>x.disabled=false); } }); }); }
async function svgAsPicture(file,at){ const url=URL.createObjectURL(file); const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error('That SVG could not be drawn.')); i.src=url; });
  const w=img.naturalWidth||1000, h=img.naturalHeight||1000, k=Math.min(4,4000/Math.max(w,h)), c=document.createElement('canvas'); c.width=Math.round(w*k); c.height=Math.round(h*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
  const blob=await L.canvasBlob(c,'image/png'); c.width=c.height=0; await BD.addPhotos([new File([blob],file.name.replace(/\.svg$/i,'.png'),{type:'image/png'})],at); }
function openPdf(file){ return new Promise(resolve=>{
  const d=L.dialog(`<div class="dlg-body"><h3>Open “${esc(file.name)}”</h3><p class="small">Each page becomes a frame at its real print size. Text becomes editable where the file still has real text; everything else comes in as the page picture underneath.</p>
    <label class="tg"><input type="checkbox" id="pdText" checked><span>Make the text editable</span></label>
    <label class="f wide"><span>Quality</span><select id="pdDpi" class="b-sel"><option value="300" selected>300 dpi (print)</option><option value="150">150 dpi (lighter)</option></select></label>
    <div class="status" id="pdSt" role="status"></div>
    <div class="dlg-actions"><button type="button" class="mini" id="pdNo">Cancel</button><button type="button" class="btn" id="pdGo">Open</button></div></div>`);
  d.addEventListener('close',()=>resolve()); d.querySelector('#pdNo').onclick=()=>d.close();
  d.querySelector('#pdGo').onclick=async()=>{ d.querySelectorAll('button,input,select').forEach(x=>x.disabled=true); d.querySelector('#pdSt').textContent='Reading the PDF…';
    try{ const r=await BD.io.importPDF(file,{text:d.querySelector('#pdText').checked,dpi:+d.querySelector('#pdDpi').value}); d.close();
      if(S.unit==='px') setUnit('mm');
      toast('Opened '+r.shown+' page'+(r.shown===1?'':'s')+(r.pages>r.shown?' (of '+r.pages+')':'')+'. '+(r.text?r.text+' text line'+(r.text===1?'':'s')+' can be edited.':'No editable text in this file, only the page pictures.'),7000); }
    catch(err){ BD.busy(null); d.querySelector('#pdSt').textContent=(err&&err.name==='PasswordException')?'This PDF is locked with a password.':(err.message||'Could not open that PDF.'); d.querySelectorAll('button,input,select').forEach(x=>x.disabled=false); } }; }); }
$('pickImg').onchange=async e=>{ const f=[...e.target.files]; e.target.value=''; await openFiles(f); };
const wrapEl=BD.wrap; let dragDepth=0;
wrapEl.addEventListener('dragenter',e=>{ if(e.dataTransfer.types.includes('Files')){ dragDepth++; $('dropHint').hidden=false; } });
wrapEl.addEventListener('dragleave',()=>{ dragDepth=Math.max(0,dragDepth-1); if(!dragDepth) $('dropHint').hidden=true; });
wrapEl.addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='copy'; });
wrapEl.addEventListener('drop',async e=>{ e.preventDefault(); dragDepth=0; $('dropHint').hidden=true;
  const r=BD.stage.container().getBoundingClientRect(), at=U.toWorld({x:e.clientX-r.left,y:e.clientY-r.top});
  const add=e.dataTransfer.getData('application/x-board-add'); if(add){ const el=document.createElement('i'); Object.assign(el.dataset,JSON.parse(add)); addItem(el,at); return; }
  if(e.dataTransfer.files.length) await openFiles(e.dataTransfer.files,at); });

/* ---------- photos: replace, crop mode ---------- */
let replaceFor=null;
UI.replacePhoto=n=>{ replaceFor=n; $('replaceImg').click(); };
$('replaceImg').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f||!replaceFor) return; const n=replaceFor; replaceFor=null;
  const [m]=await BD.addPhotos([f]); if(!m) return; const id=m.getAttr('imgId'); m.destroy(); n.setAttrs({imgId:id,image:BD.IMGS.get(id).el,cropZ:1,focX:.5,focY:.5,stretch:undefined}); BD.applyCrop(n); BD.applyFx(n); BD.select([n]); BD.changed(); };
let crop=null;
BD.on('crop',n=>UI.startCrop(n));
UI.startCrop=n=>{ if(!n||isLocked(n)||kind(n)!=='image') return; crop={n}; BD.select([n]); BD.tr.nodes([]); qbar.hidden=true; $('cropBar').hidden=false; $('cropPad').hidden=false; $('cropZ').value=n.getAttr('cropZ')||1; BD.hoverNode(n); };
function endCrop(){ if(!crop) return; const n=crop.n; crop=null; $('cropBar').hidden=true; $('cropPad').hidden=true; BD.hoverNode(null); BD.applyFx(n); BD.select([n]); BD.changed(); }
UI.cropping=()=>!!crop;
$('cropDone').onclick=endCrop;
$('cropZ').oninput=e=>{ if(!crop) return; crop.n.setAttr('cropZ',+e.target.value); BD.applyCrop(crop.n); if(crop.n.isCached()) crop.n.clearCache(); BD.main.batchDraw(); };
(function(){ const pad=$('cropPad'); let s=null;
  pad.addEventListener('pointerdown',e=>{ if(!crop) return; pad.setPointerCapture(e.pointerId); const n=crop.n, im=BD.IMGS.get(n.getAttr('imgId')); if(!im) return; const c=n.crop(); s={x:e.clientX,y:e.clientY,fx:n.getAttr('focX')??.5,fy:n.getAttr('focY')??.5,ex:im.w-c.width,ey:im.h-c.height,k:n.width()/c.width*n.getAbsoluteScale().x}; if(n.isCached()) n.clearCache(); });
  pad.addEventListener('pointermove',e=>{ if(!s||!crop) return; const n=crop.n; const dx=(e.clientX-s.x)/s.k, dy=(e.clientY-s.y)/s.k; const sx=Math.sign(n.scaleX())||1, sy=Math.sign(n.scaleY())||1;
    n.setAttr('focX',s.ex>0?clamp(s.fx-dx*sx/s.ex,0,1):.5); n.setAttr('focY',s.ey>0?clamp(s.fy-dy*sy/s.ey,0,1):.5); BD.applyCrop(n); BD.main.batchDraw(); });
  pad.addEventListener('pointerup',()=>{ s=null; });
  pad.addEventListener('wheel',e=>{ if(!crop) return; e.preventDefault(); const n=crop.n, z=clamp((n.getAttr('cropZ')||1)*Math.exp(-e.deltaY*.002),1,4); n.setAttr('cropZ',z); $('cropZ').value=z; BD.applyCrop(n); if(n.isCached()) n.clearCache(); BD.main.batchDraw(); },{passive:false});
  pad.addEventListener('dblclick',endCrop); })();

/* ---------- wheel: scroll to pan, pinch or Ctrl/⌘ + scroll to zoom ---------- */
wrapEl.addEventListener('wheel',e=>{ if(e.target.closest('.b-corner,.crop-bar,.qbar,.dock')) return; e.preventDefault(); const r=BD.stage.container().getBoundingClientRect(), p={x:e.clientX-r.left,y:e.clientY-r.top};
  if(e.ctrlKey||e.metaKey){ const d=clamp(e.deltaY*(e.deltaMode===1?16:1),-60,60); BD.view.zoomAt(BD.stage.scaleX()*Math.exp(-d*.012),p); }
  else { const dx=(e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX)*(e.deltaMode===1?16:1), dy=(e.shiftKey?0:e.deltaY)*(e.deltaMode===1?16:1); BD.stage.position({x:BD.stage.x()-dx,y:BD.stage.y()-dy}); BD.view.changed(); } },{passive:false});

/* ---------- mini map ---------- */
const mini=$('mini'); let miniRaf=0, miniMap=null;
function drawMini(){ if(miniRaf) return; miniRaf=requestAnimationFrame(()=>{ miniRaf=0; const fs=frames(); const dpr=devicePixelRatio||1, W=180, Hh=120; if(mini.width!==W*dpr){ mini.width=W*dpr; mini.height=Hh*dpr; }
  const x=mini.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,Hh); if(!fs.length){ miniMap=null; return; }
  const k0=BD.stage.scaleX(), vw={x:-BD.stage.x()/k0,y:-BD.stage.y()/k0,width:BD.stage.width()/k0,height:BD.stage.height()/k0};
  const all=unionRect(fs), r={x:Math.min(all.x,vw.x),y:Math.min(all.y,vw.y)}; r.width=Math.max(all.x+all.width,vw.x+vw.width)-r.x; r.height=Math.max(all.y+all.height,vw.y+vw.height)-r.y;
  const k=Math.min((W-12)/r.width,(Hh-12)/r.height), ox=(W-r.width*k)/2-r.x*k, oy=(Hh-r.height*k)/2-r.y*k; miniMap={k,ox,oy};
  fs.forEach(f=>{ if(!f.visible()) return; const s=fsize(f), bg=frameBg(f).fill(); x.fillStyle=typeof bg==='string'&&bg?bg:'#fff'; x.fillRect(f.x()*k+ox,f.y()*k+oy,Math.max(1,s.w*k),Math.max(1,s.h*k)); x.strokeStyle=S.sel.includes(f)?'#2f7bff':'rgba(128,128,128,.6)'; x.lineWidth=1; x.strokeRect(f.x()*k+ox+.5,f.y()*k+oy+.5,Math.max(1,s.w*k-1),Math.max(1,s.h*k-1)); });
  x.strokeStyle='#ff3d7f'; x.lineWidth=1.5; x.strokeRect(vw.x*k+ox,vw.y*k+oy,vw.width*k,vw.height*k); }); }
UI.drawMini=drawMini;
(function(){ let on=false; const go=e=>{ if(!miniMap) return; const b=mini.getBoundingClientRect(), wx=(e.clientX-b.left-miniMap.ox)/miniMap.k, wy=(e.clientY-b.top-miniMap.oy)/miniMap.k, k=BD.stage.scaleX(); BD.view.set(BD.stage.width()/2-wx*k,BD.stage.height()/2-wy*k,k); };
  mini.addEventListener('pointerdown',e=>{ on=true; mini.setPointerCapture(e.pointerId); go(e); e.stopPropagation(); }); mini.addEventListener('pointermove',e=>{ if(on) go(e); }); mini.addEventListener('pointerup',()=>{ on=false; }); })();
$('zIn').onclick=()=>BD.view.zoomBy(1.25); $('zOut').onclick=()=>BD.view.zoomBy(.8); $('zFit').onclick=()=>BD.view.fitAll();

/* ---------- frames helpers ---------- */
UI.addFrame=p=>{ const fs=frames(); let x=0,y=0; if(fs.length){ const r=unionRect(fs); x=Math.round(r.x+r.width+160); y=Math.round(fs[fs.length-1].y()); }
  const f=BD.makeFrame(x,y,p.w,p.h,{label:p.label||'Frame'}); BD.select([f]); BD.paintUI(); BD.view.fitSel(); BD.changed(); paintLayersSoon(); return f; };
UI.addPrintFrame=(wv,hv,label,opt)=>{ opt=opt||{}; const dpi=opt.dpi||300, u=opt.unit||'mm', conv=v=>BD.units.fromUnit(v,dpi,u), w=conv(wv), h=conv(hv), b=conv(opt.bleed||0), sm=conv(opt.safe||0);
  const fs=frames(); let x=0,y=0; if(fs.length){ const r=unionRect(fs); x=Math.round(r.x+r.width+160); y=Math.round(r.y); }
  const f=BD.makeFrame(x,y,w,h,{label:label||('Print '+wv+' × '+hv+' '+u),print:true,dpi,bleed:b,safe:sm}); if(S.unit==='px'||S.unit!==u&&u!=='px') setUnit(u==='px'?'mm':u);
  BD.select([f]); BD.paintUI(); BD.view.fitSel(); BD.changed(); paintLayersSoon(); return f; };

/* ---------- present ---------- */
let pIdx=0;
async function present(){ const fs=frames().filter(f=>f.visible()); if(!fs.length){ toast('Add a frame first.'); return; } const sel=S.sel[0]&&(isFrame(S.sel[0])?S.sel[0]:frameOf(S.sel[0])); pIdx=Math.max(0,fs.indexOf(sel)); BD.select([]); $('present').hidden=false; try{ await document.documentElement.requestFullscreen(); }catch(_){} showSlide(); }
function showSlide(){ const fs=frames().filter(f=>f.visible()); if(!fs.length) return; pIdx=(pIdx+fs.length)%fs.length; const f=fs[pIdx], s=fsize(f), k=Math.min(innerWidth*(devicePixelRatio||1)/s.w,innerHeight*(devicePixelRatio||1)/s.h,2);
  const c=BD.renderFrame(f,k); const img=$('presentImg'); if(img.src) URL.revokeObjectURL(img.src); c.toBlob(b=>{ img.src=URL.createObjectURL(b); c.width=c.height=0; }); $('pNum').textContent=(pIdx+1)+' / '+fs.length; }
function closePresent(){ $('present').hidden=true; if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }
$('presentB').onclick=present; $('pPrev').onclick=()=>{ pIdx--; showSlide(); }; $('pNext').onclick=()=>{ pIdx++; showSlide(); }; $('pClose').onclick=closePresent; $('presentImg').onclick=()=>{ pIdx++; showSlide(); };
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement&&!$('present').hidden) $('present').hidden=true; });
UI.present=present;

/* ---------- quick find (Ctrl+K) ---------- */
const palette=$('palette'), palQ=$('palQ'), palList=$('palList'); let palItems=[], palSel=0;
function commands(){ const c=[], sel=S.sel, has=sel.length>0, objs=sel.filter(n=>!isFrame(n));
  const add=(label,run,o)=>c.push(Object.assign({label,run},o||{}));
  [['Move','select','V'],['Hand','hand','H'],['Frame','frame','F'],['Rectangle','rect','R'],['Ellipse circle','ellipse','O'],['Triangle polygon','poly','Y'],['Star','star','S'],['Line','line','L'],['Arrow','arrow','Shift+L'],['Pen draw','pen','P'],['Eraser','eraser','E'],['Text','text','T']].forEach(([l,t,k])=>add(l+' tool',()=>{ if(t==='pen') S.pen.mode='pen'; BD.setTool(t); },{key:k,group:'Tools'}));
  add('Highlighter',()=>{ S.pen.mode='marker'; BD.setTool('pen'); },{key:'Shift+P',group:'Tools'});
  add('Upload photos, SVG or PDF',()=>$('pickImg').click(),{key:'I',group:'Add'}); add('Curved text',()=>BD.tools.makeArc(),{group:'Add'}); add('Barcode EAN UPC',()=>UI.barcodeDialog(),{group:'Add'}); add('QR code',()=>UI.qrDialog(),{group:'Add'});
  ['brand','text','photos','shapes','lines','icons','emoji','templates'].forEach(k=>add('Open '+k+' assets',()=>openAssets(k),{group:'Add'}));
  BD.PRESETS.forEach(p=>add('New frame '+p.label+' '+p.w+'×'+p.h,()=>UI.addFrame(p),{group:'Frames'})); BD.PRINT.forEach(p=>add('New print frame '+p.label+' '+p.w+'×'+p.h+' mm',()=>UI.addPrintFrame(p.w,p.h,p.label),{group:'Frames'}));
  add('Custom print size: mm, label, bleed…',()=>UI.printFrameDialog(),{group:'Frames'});
  add('Export…',()=>UI.exportDialog(),{key:mod+'+E',group:'Export'}); ['PNG','JPG','WebP','PDF','SVG'].forEach(f=>add('Export '+f,()=>UI.exportDialog(null,f.toLowerCase()),{group:'Export'})); if(has) add('Export selection as PNG',()=>UI.exportSel(),{group:'Export'});
  add('Download board file',()=>UI.downloadBoard(),{group:'Board'}); add('Present full screen',present,{group:'Board'}); add('Versions…',()=>UI.versionsDialog(),{group:'Board'}); add('Save a version now',()=>BD.tools.saveVersion().then(()=>toast('Version saved.')),{group:'Board'});
  add('Find and replace text…',()=>UI.findDialog(),{key:mod+'+F',group:'Board'}); add('Replace a colour everywhere…',()=>UI.colorsDialog(),{group:'Board'}); add('Keyboard shortcuts',()=>UI.shortcuts(),{key:'?',group:'Board'});
  BD.units.list.forEach(u=>add('Units: '+UNIT_NAMES[u]+' ('+u+')',()=>setUnit(u),{group:'View'})); add((S.rulers?'Hide':'Show')+' rulers and guides',()=>setRulers(!S.rulers),{key:'Shift+R',group:'View'}); add('Zoom to fit everything',BD.view.fitAll,{key:'Shift+1',group:'View'}); add('Zoom to 100%',()=>BD.view.zoomAt(1,{x:BD.stage.width()/2,y:BD.stage.height()/2}),{key:'Shift+0',group:'View'});
  add((S.snap?'Turn off':'Turn on')+' snapping',()=>{ S.snap=!S.snap; },{group:'View'});
  if(has){ add('Duplicate',()=>BD.act.duplicate(),{key:mod+'+D',group:'Selection'}); add('Delete',BD.act.del,{key:'Del',group:'Selection'}); add('Lock or unlock',()=>BD.act.lock(),{group:'Selection'}); add('Hide',()=>BD.act.hide(true),{group:'Selection'});
    add('Bring to front',()=>BD.act.order('front'),{group:'Selection'}); add('Send to back',()=>BD.act.order('back'),{group:'Selection'}); add('Copy style',BD.act.copyStyle,{group:'Selection'}); add('Paste style',BD.act.pasteStyle,{group:'Selection'});
    if(objs.length){ ['left','hcenter','right','top','vcenter','bottom'].forEach(a=>add('Align '+({hcenter:'centre',vcenter:'middle'}[a]||a),()=>BD.act.align(a),{group:'Selection'})); add('Flip horizontal',()=>BD.act.flip('x'),{group:'Selection'}); add('Flip vertical',()=>BD.act.flip('y'),{group:'Selection'}); add('Repeat in a grid…',()=>UI.repeatDialog(),{group:'Selection'}); add('Fill the frame',()=>BD.act.fillFrame(objs[0]),{group:'Selection'}); }
    if(objs.length>1) add('Group',BD.act.group,{key:mod+'+G',group:'Selection'}); if(sel.some(n=>kind(n)==='group')) add('Ungroup',BD.act.ungroup,{group:'Selection'});
    if(objs.length>2){ add('Space evenly across',()=>BD.act.distribute('x'),{group:'Selection'}); add('Space evenly down',()=>BD.act.distribute('y'),{group:'Selection'}); }
    if(BD.tools.canMask(sel)) add('Mask photo inside shape',BD.tools.mask,{group:'Selection'}); if(sel.some(n=>kind(n)==='mask')) add('Release mask',BD.tools.unmask,{group:'Selection'}); }
  return c; }
function openPalette(){ palette.hidden=false; palQ.value=''; palSel=0; paintPalette(); setTimeout(()=>palQ.focus(),10); }
function closePalette(){ palette.hidden=true; }
UI.openPalette=openPalette;
function paintPalette(){ const q=palQ.value.trim().toLowerCase().split(/\s+/).filter(Boolean); palItems=commands().filter(c=>q.every(w=>(c.label+' '+(c.group||'')).toLowerCase().includes(w))).slice(0,40); palSel=Math.min(palSel,Math.max(0,palItems.length-1));
  palList.innerHTML=palItems.length?palItems.map((c,i)=>`<button type="button" role="option" class="pal-i" data-i="${i}" aria-selected="${i===palSel}"><span>${esc(c.label)}</span><small>${esc(c.group||'')}</small>${c.key?`<kbd>${esc(c.key)}</kbd>`:''}</button>`).join(''):'<p class="ps-note">Nothing found.</p>'; }
palQ.addEventListener('input',()=>{ palSel=0; paintPalette(); });
palQ.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closePalette(); e.stopPropagation(); } if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); palSel=clamp(palSel+(e.key==='ArrowDown'?1:-1),0,Math.max(0,palItems.length-1)); paintPalette(); const s=palList.querySelector('[aria-selected="true"]'); if(s) s.scrollIntoView({block:'nearest'}); }
  if(e.key==='Enter'){ e.preventDefault(); const c=palItems[palSel]; if(c){ closePalette(); c.run(); } } e.stopPropagation(); });
palList.addEventListener('click',e=>{ const b=e.target.closest('[data-i]'); if(!b) return; const c=palItems[+b.dataset.i]; closePalette(); c.run(); });
$('findB').onclick=openPalette;

/* ---------- keyboard ---------- */
const typing=e=>{ const t=e.target; if(!t) return false; if(t.isContentEditable||/^(TEXTAREA|SELECT)$/.test(t.tagName)) return true; return t.tagName==='INPUT'&&/^(text|number|search|email|password|url|tel)$/.test(t.type||'text'); };
window.addEventListener('keydown',e=>{
  if(!$('present').hidden){ if(e.key==='ArrowRight'||e.key===' '){ pIdx++; showSlide(); } if(e.key==='ArrowLeft'){ pIdx--; showSlide(); } if(e.key==='Escape') closePresent(); e.preventDefault(); return; }
  if(crop){ if(e.key==='Escape'||e.key==='Enter'){ e.preventDefault(); endCrop(); } return; }
  const c=e.ctrlKey||e.metaKey, k=e.key, K=k.length===1?k.toLowerCase():k;
  if(c&&K==='k'){ e.preventDefault(); palette.hidden?openPalette():closePalette(); return; }
  if(typing(e)||document.querySelector('dialog[open]')||!palette.hidden) return;
  if(k==='Alt'){ e.preventDefault(); BD.setAlt(true); return; }
  if(k===' '){ e.preventDefault(); if(!e.repeat) BD.setSpace(true); return; }
  if(k==='/'){ e.preventDefault(); openPalette(); return; }
  if(c&&K==='z'){ e.preventDefault(); e.shiftKey?BD.redo():BD.undo(); return; }
  if(c&&K==='y'){ e.preventDefault(); BD.redo(); return; }
  if(c&&e.altKey&&K==='c'){ e.preventDefault(); BD.act.copyStyle(); return; }
  if(c&&e.altKey&&K==='v'){ e.preventDefault(); BD.act.pasteStyle(); return; }
  if(c&&K==='d'){ e.preventDefault(); BD.act.duplicate(); return; }
  if(c&&K==='a'){ e.preventDefault(); BD.act.selectAll(); return; }
  if(c&&K==='f'){ e.preventDefault(); UI.findDialog(); return; }
  if(c&&K==='g'){ e.preventDefault(); e.shiftKey?BD.act.ungroup():BD.act.group(); return; }
  if(c&&e.shiftKey&&K==='l'){ e.preventDefault(); BD.act.lock(); return; }
  if(c&&e.shiftKey&&K==='h'){ e.preventDefault(); BD.act.hide(); return; }
  if(c&&(k===']'||k==='}')){ e.preventDefault(); BD.act.order(e.shiftKey?'front':'up'); return; }
  if(c&&(k==='['||k==='{')){ e.preventDefault(); BD.act.order(e.shiftKey?'back':'down'); return; }
  if(c&&(k==='='||k==='+')){ e.preventDefault(); BD.view.zoomBy(1.25); return; }
  if(c&&(k==='-'||k==='_')){ e.preventDefault(); BD.view.zoomBy(.8); return; }
  if(c&&k==='0'){ e.preventDefault(); BD.view.zoomAt(1,{x:BD.stage.width()/2,y:BD.stage.height()/2}); return; }
  if(c&&K==='s'){ e.preventDefault(); BD.saveNow().then(()=>toast('Saved on this device.')); return; }
  if(c&&K==='e'){ e.preventDefault(); UI.exportDialog(); return; }
  if(c) return;
  if(e.shiftKey&&(k==='!'||e.code==='Digit1')){ e.preventDefault(); BD.view.fitAll(); return; }
  if(e.shiftKey&&(k==='@'||e.code==='Digit2')){ e.preventDefault(); BD.view.fitSel(); return; }
  if(e.shiftKey&&(k===')'||e.code==='Digit0')){ e.preventDefault(); BD.view.zoomAt(1,{x:BD.stage.width()/2,y:BD.stage.height()/2}); return; }
  if(e.shiftKey&&K==='r'){ setRulers(!S.rulers); return; }
  if(e.shiftKey&&K==='h'){ BD.act.flip('x'); return; }
  if(e.shiftKey&&K==='v'){ BD.act.flip('y'); return; }
  if(e.shiftKey&&K==='p'){ S.pen.mode='marker'; lastDraw='marker'; BD.setTool('pen'); return; }
  if(k==='Delete'||k==='Backspace'){ e.preventDefault(); BD.act.del(); return; }
  if(k==='Escape'){ closeMenu(); closePop(); if(S.tool!=='select'){ BD.setTool('select'); return; } if(S.entered){ const g=S.entered; S.entered=null; BD.select([g]); return; } BD.select([]); return; }
  if(k==='Enter'){ const n=S.sel[0]; if(!n) return; e.preventDefault(); if(kind(n)==='text') BD.startEdit(n); else if(['group','mask'].includes(kind(n))){ S.entered=n; BD.select(items(n)); BD.paintUI(); } else if(isFrame(n)) BD.select(items(n).filter(x=>!isLocked(x))); return; }
  if(k.startsWith('Arrow')){ e.preventDefault(); const s=e.shiftKey?10:1; BD.act.nudge(k==='ArrowLeft'?-s:k==='ArrowRight'?s:0,k==='ArrowUp'?-s:k==='ArrowDown'?s:0); return; }
  if(k==='?'){ UI.shortcuts(); return; }
  const map={v:'select',h:'hand',f:'frame',a:'frame',r:'rect',o:'ellipse',y:'poly',s:'star',l:e.shiftKey?'arrow':'line',p:'pen',t:'text',e:'eraser'};
  if(K==='i'){ $('pickImg').click(); return; }
  if(map[K]){ if(K==='p'){ S.pen.mode='pen'; lastDraw='pen'; } if(K==='e') lastDraw='eraser'; if(SHAPE_TOOLS.some(x=>x[0]===map[K])){ lastShape=map[K]; L.store('lab:lastShape',lastShape); } BD.setTool(map[K]); }
});
window.addEventListener('keyup',e=>{ if(e.key===' ') BD.setSpace(false); if(e.key==='Alt'){ BD.setAlt(false); e.preventDefault(); } });
window.addEventListener('blur',()=>{ BD.setSpace(false); BD.setAlt(false); });
document.addEventListener('copy',e=>{ if(typing(e)||!S.sel.length||BD.editing()) return; const t=BD.copy(); if(t){ e.clipboardData.setData('text/plain',t); e.preventDefault(); } });
document.addEventListener('cut',e=>{ if(typing(e)||!S.sel.length||BD.editing()) return; const t=BD.copy(true); if(t){ e.clipboardData.setData('text/plain',t); e.preventDefault(); } });
document.addEventListener('paste',async e=>{ if(typing(e)||BD.editing()) return; const dt=e.clipboardData; if(!dt) return; e.preventDefault();
  const files=[...dt.files]; if(files.length){ await openFiles(files); return; }
  const t=dt.getData('text/plain'); if(t&&t.startsWith('board-clip:')){ try{ await BD.paste(JSON.parse(t.slice(11))); }catch(_){ } return; }
  if(t&&/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(t)){ try{ const r=await BD.io.importSVG(t,{name:'Pasted SVG',into:BD.targetFrame()}); toast('Pasted with '+r.count+' layers.'); }catch(err){ toast(err.message); } return; }
  if(t&&t.trim()){ const f=BD.targetFrame(); BD.place(BD.make.text(t.trim().slice(0,2000),{fontSize:f?Math.round(fsize(f).w*.06):64,fontFamily:BD.bodyFont(),fontStyle:'800'})); return; }
  BD.paste(); });
window.addEventListener('beforeunload',()=>{ BD.saveNow(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden) BD.saveNow(); });

/* ---------- start (called once the panel and dialogs are loaded) ---------- */
UI.boot=function(){ paintDock(); if(innerWidth>=900){ $('left').classList.add('open'); $('right').classList.add('open'); }
  BD.start().then(()=>{ nameIn.value=S.name; document.title=S.name+' · Board'; $('unitSel').value=S.unit; $('rulerB').setAttribute('aria-pressed',String(S.rulers)); BD.wrap.style.backgroundColor=S.bg||'';
    paintLayers(); paintPages(); UI.paintProps(); drawMini(); syncUndo(); $('zoomB').textContent=Math.round(BD.stage.scaleX()*100)+'%'; BD.view.changed(); })
  .catch(err=>{ console.error(err); toast('Could not open the board: '+(err.message||err)); }); };
BD.on('opened',()=>{ nameIn.value=S.name; });
})();

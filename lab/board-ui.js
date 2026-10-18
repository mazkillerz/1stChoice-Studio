/* Board (experimental): panels, menus and shortcuts on top of the engine in board.js. */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S, esc=L.esc;
const $=id=>document.getElementById(id);
const pv=(w,h,m)=>{ m=m||18; const k=m/Math.max(w,h); return `width:${Math.max(4,Math.round(w*k))}px;height:${Math.max(4,Math.round(h*k))}px`; };
const {kind,isFrame,isLocked,frames,items,fsize,wrect,unionRect,frameOf,nameOf,frameBg,clamp,AR}=U;
const svg=(d,w)=>`<svg width="${w||18}" height="${w||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={
  select:svg('<path d="M5 3l14 8-6 2-2 6z"/>'),hand:svg('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8l-1.5-1.5a2 2 0 0 0-3 2.6L6 20a6 6 0 0 0 5 2h2a7 7 0 0 0 7-7v-4a2 2 0 0 0-4 0"/>'),
  frame:svg('<path d="M7 3v18M17 3v18M3 7h18M3 17h18"/>'),rect:svg('<rect x="4" y="4" width="16" height="16" rx="1.5"/>'),ellipse:svg('<circle cx="12" cy="12" r="8.5"/>'),
  line:svg('<path d="M5 19 19 5"/>'),arrow:svg('<path d="M5 19 19 5M10 5h9v9"/>'),pen:svg('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>'),
  text:svg('<path d="M4 7V5h16v2"/><path d="M9 19h6"/><path d="M12 5v14"/>'),image:svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  star:svg('<path d="M12 2l3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.2-6.2 3.2L7 14.1 2 9.3l6.9-1z"/>'),poly:svg('<path d="M12 3l9 16H3z"/>'),
  eye:svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',14),eyeOff:svg('<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/>',14),
  lock:svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',14),unlock:svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.2"/>',14),
  caret:svg('<path d="m9 6 6 6-6 6"/>',12),group:svg('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/>',14),
  dup:svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),trash:svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>'),
  flipX:svg('<path d="M12 3v18M8 7l-5 5 5 5M16 7l5 5-5 5"/>'),flipY:svg('<path d="M3 12h18M7 8l5-5 5 5M7 16l5 5 5-5"/>'),
  front:svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>'),back:svg('<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M20 8v10a2 2 0 0 1-2 2H8"/>'),
  al:svg('<path d="M4 3v18M8 7h12v4H8zM8 14h7v4H8z"/>'),ah:svg('<path d="M12 3v18M6 7h12v4H6zM8 14h8v4H8z"/>'),ar:svg('<path d="M20 3v18M4 7h12v4H4zM9 14h7v4H9z"/>'),
  at:svg('<path d="M3 4h18M7 8h4v12H7zM14 8h4v7h-4z"/>'),av:svg('<path d="M3 12h18M7 6h4v12H7zM14 8h4v8h-4z"/>'),ab:svg('<path d="M3 20h18M7 4h4v12H7zM14 9h4v7h-4z"/>'),
  dh:svg('<path d="M4 3v18M20 3v18M9 8h6v8H9z"/>'),dv:svg('<path d="M3 4h18M3 20h18M8 9h8v6H8z"/>'),
  tl:svg('<path d="M4 6h16M4 12h10M4 18h13"/>',16),tc:svg('<path d="M4 6h16M7 12h10M5.5 18h13"/>',16),tr:svg('<path d="M4 6h16M10 12h10M7 18h13"/>',16),tj:svg('<path d="M4 6h16M4 12h16M4 18h16"/>',16),
  drop:svg('<path d="M2 22l1-1h3l9-9M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4z"/>',16),
  more:svg('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),link:svg('<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8"/>',14),
  swap:svg('<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',16),crop:svg('<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',16)
};
const TOOLS=[['select','Move','V'],['hand','Hand','H'],['frame','Frame','F'],['rect','Rectangle','R'],['ellipse','Ellipse','O'],['poly','Triangle','Y'],['star','Star','S'],['line','Line','L'],['arrow','Arrow','Shift+L'],['pen','Draw','P'],['text','Text','T']];
const isMac=/Mac|iPhone|iPad/.test(navigator.platform||'');
const mod=isMac?'⌘':'Ctrl';
const dark=()=>matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.dark=dark()?'1':'0';

/* ---------- toasts, busy ---------- */
let toastT=0;
function toast(t,undo){ const el=$('bToast'); el.innerHTML=esc(t)+(undo?' <button type="button" class="link" id="tUndo">Undo</button>':''); el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },undo?6000:3200); if(undo) $('tUndo').onclick=()=>{ el.hidden=true; undo(); }; }
BD.on('toast',t=>toast(t));
BD.on('busy',t=>{ if(t) toast(t); });
BD.on('saving',on=>{ const el=$('bSaved'); el.textContent=on?'Saving…':'Saved'; el.classList.toggle('on',!on); });

/* ---------- tool bar ---------- */
$('tools').innerHTML=TOOLS.map(([id,label,key])=>`<button type="button" class="bt-tool" data-tool="${id}" aria-label="${label} (${key})" title="${label} (${key})" aria-pressed="${id==='select'}">${IC[id]}</button>`).join('')+
  `<span class="bt-sep"></span><button type="button" class="bt-tool" id="imgB" aria-label="Add photos (I)" title="Add photos (I)">${IC.image}</button>`;
$('tools').addEventListener('click',e=>{ const b=e.target.closest('[data-tool]'); if(b){ BD.setTool(b.dataset.tool); if(b.dataset.tool==='pen') paintProps(); } });
$('imgB').onclick=()=>$('pickImg').click();
$('pickImg').onchange=async e=>{ const f=[...e.target.files]; e.target.value=''; await BD.addPhotos(f); paintAdd(); };
BD.on('tool',t=>{ document.querySelectorAll('.bt-tool[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===t))); paintProps(); });
$('undoB').onclick=()=>BD.undo(); $('redoB').onclick=()=>BD.redo();
BD.on('history',syncUndo); BD.on('changed',syncUndo);
function syncUndo(){ $('undoB').disabled=!BD.canUndo(); $('redoB').disabled=!BD.canRedo(); }

/* board name */
const nameIn=$('bName');
BD.on('opened',()=>{ nameIn.value=S.name; document.title=S.name+' · Board'; paintAll(); });
nameIn.addEventListener('change',()=>{ S.name=nameIn.value.trim()||'Untitled board'; nameIn.value=S.name; document.title=S.name+' · Board'; BD.saveNow(); });
nameIn.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key==='Escape'){ e.preventDefault(); nameIn.blur(); } });

/* side panels on small screens */
function panel(side,open){ const el=$(side==='L'?'left':'right'), b=$(side==='L'?'panelL':'panelR'); const on=open!=null?open:!el.classList.contains('open');
  el.classList.toggle('open',on); b.setAttribute('aria-pressed',String(on)); if(on){ const o=$(side==='L'?'right':'left'); if(innerWidth<900){ o.classList.remove('open'); $(side==='L'?'panelR':'panelL').setAttribute('aria-pressed','false'); } } }
$('panelL').onclick=()=>panel('L'); $('panelR').onclick=()=>panel('R');

/* ---------- menus (zoom, board, right click) ---------- */
const menu=$('menu');
function openMenu(x,y,entries){
  menu.innerHTML=entries.map((e,i)=>e==='-'?'<div class="m-sep" role="separator"></div>':`<button type="button" role="menuitem" data-i="${i}" ${e.disabled?'disabled':''}${e.danger?' class="danger"':''}><span>${esc(e.label)}</span>${e.key?`<kbd>${esc(e.key)}</kbd>`:''}</button>`).join('');
  menu.hidden=false; const r=menu.getBoundingClientRect(); menu.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px'; menu.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';
  menu.onclick=ev=>{ const b=ev.target.closest('[data-i]'); if(!b) return; closeMenu(); entries[+b.dataset.i].run(); };
  const f=menu.querySelector('button:not([disabled])'); if(f) f.focus({preventScroll:true}); }
function closeMenu(){ menu.hidden=true; }
document.addEventListener('pointerdown',e=>{ if(!menu.hidden&&!menu.contains(e.target)) closeMenu(); if(!pop.hidden&&!pop.contains(e.target)&&!e.target.closest('[data-pop-owner]')) closePop(); },true);
menu.addEventListener('keydown',e=>{ const bs=[...menu.querySelectorAll('button:not([disabled])')], i=bs.indexOf(document.activeElement);
  if(e.key==='Escape'){ closeMenu(); e.stopPropagation(); } if(e.key==='ArrowDown'){ e.preventDefault(); (bs[i+1]||bs[0]).focus(); } if(e.key==='ArrowUp'){ e.preventDefault(); (bs[i-1]||bs[bs.length-1]).focus(); } });

$('zoomB').onclick=e=>{ const r=e.currentTarget.getBoundingClientRect(); openMenu(r.left,r.bottom+6,[
  {label:'Zoom in',key:mod+' +',run:()=>BD.view.zoomBy(1.25)},{label:'Zoom out',key:mod+' −',run:()=>BD.view.zoomBy(.8)},
  {label:'Zoom to 100%',key:'Shift+0',run:()=>BD.view.zoomAt(1,{x:BD.stage.width()/2,y:BD.stage.height()/2})},{label:'Zoom to 50%',run:()=>BD.view.zoomAt(.5,{x:BD.stage.width()/2,y:BD.stage.height()/2})},{label:'Zoom to 200%',run:()=>BD.view.zoomAt(2,{x:BD.stage.width()/2,y:BD.stage.height()/2})},'-',
  {label:'Fit everything',key:'Shift+1',run:()=>BD.view.fitAll()},{label:'Zoom to selection',key:'Shift+2',run:()=>BD.view.fitSel(),disabled:!S.sel.length},'-',
  {label:(S.grid?'Hide':'Show')+' dot grid',run:()=>{ S.grid=!S.grid; BD.view.changed(); }},{label:(S.snap?'Turn off':'Turn on')+' snapping',run:()=>{ S.snap=!S.snap; toast('Snapping '+(S.snap?'on':'off')+'.'); paintProps(); }},
  {label:(S.safe?'Hide':'Show')+' story safe zones',run:()=>{ S.safe=!S.safe; BD.paintUI(); paintProps(); }}]); };
BD.on('view',()=>{ $('zoomB').textContent=Math.round(BD.stage.scaleX()*100)+'%'; drawMini(); });
$('zIn').onclick=()=>BD.view.zoomBy(1.25); $('zOut').onclick=()=>BD.view.zoomBy(.8); $('zFit').onclick=()=>BD.view.fitAll();

$('fileMenu').onclick=e=>{ const r=e.currentTarget.getBoundingClientRect(); openMenu(r.left,r.bottom+6,[
  {label:'New board',run:()=>newBoardDialog()},{label:'All boards',run:()=>{ BD.saveNow().then(()=>location.href='index.html'); }},{label:'Duplicate this board',run:dupBoard},'-',
  {label:'Rename',run:()=>{ nameIn.focus(); nameIn.select(); }},{label:'Download board file',run:downloadBoard},{label:'Open board file…',run:()=>$('pickBoard').click()},'-',
  {label:'Keyboard shortcuts',key:'?',run:shortcuts},{label:'Delete this board',danger:true,run:deleteBoard}]); };
$('pickBoard').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; try{ const id=await BD.importBoardFile(f); await BD.saveNow(); location.href='board.html?id='+id; }catch(err){ toast(err.message||'Could not open that file.'); } };
async function dupBoard(){ await BD.saveNow(); const raw=await L.idb.get('board:'+S.id); const d=JSON.parse(raw); const id=U.uid(); d.name=S.name+' copy'; await L.idb.put('board:'+id,JSON.stringify(d)); const list=BD.boards(); list.unshift({id,name:d.name,created:Date.now(),updated:Date.now()}); BD.saveIndex(list); location.href='board.html?id='+id; }
async function downloadBoard(){ toast('Packing the board…'); const blob=await BD.exportBoardFile(); saveBlob(blob,fileBase()+'.board'); }
function deleteBoard(){ const d=L.dialog(`<div class="dlg-body"><h3>Delete “${esc(S.name)}”?</h3><p class="small">The board and its photos are removed from this device. It can't be undone.</p><div class="dlg-actions"><button type="button" class="mini" id="dNo">Cancel</button><button type="button" class="btn danger" id="dYes">Delete</button></div></div>`);
  d.querySelector('#dNo').onclick=()=>d.close();
  d.querySelector('#dYes').onclick=async()=>{ const raw=await L.idb.get('board:'+S.id); try{ const others=new Set(); for(const o of BD.boards()){ if(o.id===S.id) continue; const r=await L.idb.get('board:'+o.id); if(r) (JSON.parse(r).imgs||[]).forEach(x=>others.add(x)); } const doc=JSON.parse(raw); for(const id of (doc.imgs||[])) if(!others.has(id)) await L.idb.del('bimg:'+id); }catch(_){}
    await L.idb.del('board:'+S.id); await L.idb.del('bthumb:'+S.id); BD.saveIndex(BD.boards().filter(b=>b.id!==S.id)); S.id=null; location.href='index.html'; }; }
function newBoardDialog(){ const d=L.dialog(`<div class="dlg-body"><h3>New board</h3><p class="small">Start with one frame. You can add more frames of any size later.</p>
  <div class="preset-grid">${BD.PRESETS.slice(0,8).map(p=>`<button type="button" class="preset" data-p="${p.id}"><span class="pv" style="${pv(p.w,p.h)}"></span><b>${esc(p.label)}</b><small>${p.w} × ${p.h}</small></button>`).join('')}</div>
  <span class="lbl">Or a template</span><div class="chips">${BD.TEMPLATES.map(t=>`<button type="button" class="chip" data-t="${t.id}">${esc(t.label)}</button>`).join('')}</div>
  <div class="dlg-actions"><button type="button" class="mini" id="nbNo">Cancel</button></div></div>`,'wide');
  d.querySelector('#nbNo').onclick=()=>d.close();
  d.addEventListener('click',async e=>{ const p=e.target.closest('[data-p]'), t=e.target.closest('[data-t]'); if(!p&&!t) return; d.close(); await BD.saveNow(); location.href='board.html?'+(p?'preset='+p.dataset.p:'template='+t.dataset.t); }); }

/* right click */
BD.on('context',({x,y,world})=>{ const sel=S.sel, one=sel[0], k=one&&kind(one), objs=sel.filter(n=>!isFrame(n));
  const e=[];
  if(!sel.length){ e.push({label:'Paste',key:mod+'+V',run:()=>BD.paste()},{label:'Add photos…',run:()=>$('pickImg').click()},{label:'Add a frame here',run:()=>{ const f=BD.makeFrame(world.x,world.y,1080,1920,{label:'Frame '+(frames().length+1)}); BD.select([f]); BD.changed(); BD.paintUI(); }},'-',{label:'Select all',key:mod+'+A',run:BD.act.selectAll},{label:'Fit everything',key:'Shift+1',run:BD.view.fitAll}); openMenu(x,y,e); return; }
  e.push({label:'Copy',key:mod+'+C',run:()=>BD.copy()},{label:'Cut',key:mod+'+X',run:()=>BD.copy(true)},{label:'Paste',key:mod+'+V',run:()=>BD.paste()},{label:'Duplicate',key:mod+'+D',run:()=>BD.act.duplicate()},{label:'Delete',key:'Del',danger:true,run:BD.act.del},'-');
  e.push({label:'Copy style',key:mod+'+Alt+C',run:BD.act.copyStyle},{label:'Paste style',key:mod+'+Alt+V',run:BD.act.pasteStyle},'-');
  e.push({label:'Bring to front',key:mod+'+Shift+]',run:()=>BD.act.order('front')},{label:'Bring forward',key:mod+'+]',run:()=>BD.act.order('up')},{label:'Send backward',key:mod+'+[',run:()=>BD.act.order('down')},{label:'Send to back',key:mod+'+Shift+[',run:()=>BD.act.order('back')},'-');
  if(objs.length>1) e.push({label:'Group',key:mod+'+G',run:BD.act.group});
  if(sel.some(n=>kind(n)==='group')) e.push({label:'Ungroup',key:mod+'+Shift+G',run:BD.act.ungroup});
  e.push({label:sel.every(isLocked)?'Unlock':'Lock',key:mod+'+Shift+L',run:()=>BD.act.lock()},{label:'Hide',key:mod+'+Shift+H',run:()=>BD.act.hide(true)});
  if(objs.length) e.push({label:'Flip horizontal',key:'Shift+H',run:()=>BD.act.flip('x')},{label:'Flip vertical',key:'Shift+V',run:()=>BD.act.flip('y')});
  if(objs.length===1&&frameOf(one)) e.push('-',{label:'Fill the frame',run:()=>BD.act.fillFrame(one)});
  if(k==='image') e.push({label:'Crop / move photo',run:()=>startCrop(one)},{label:'Replace photo…',run:()=>replacePhoto(one)},{label:'Make frame background',run:()=>BD.act.fillFrame(one,true)});
  if(objs.length===1) e.push({label:'Spread across frames',run:BD.act.spread});
  if(k==='frame'&&sel.length===1) e.push('-',{label:'Rename frame',run:()=>renameNode(one)},{label:'Export frame…',run:()=>exportDialog([one])});
  e.push('-',{label:'Export selection as PNG',run:()=>exportSel()});
  openMenu(x,y,e); });
BD.on('rename',n=>renameNode(n));
function renameNode(n){ const d=L.dialog(`<form method="dialog" class="dlg-body" action="#"><h3>Rename</h3><input type="text" id="rnIn" maxlength="60" dir="auto" class="b-in"><div class="dlg-actions"><button type="button" class="mini" id="rnNo">Cancel</button><button type="submit" class="btn">Save</button></div></form>`);
  const i=d.querySelector('#rnIn'); i.value=nameOf(n); setTimeout(()=>{ i.focus(); i.select(); },30); d.querySelector('#rnNo').onclick=()=>d.close();
  d.querySelector('form').onsubmit=e=>{ e.preventDefault(); n.setAttr('label',i.value.trim()||undefined); d.close(); BD.paintUI(); BD.changed(); paintLayers(); paintProps(); }; }

/* ---------- colour picker ---------- */
const pop=$('pop');
function closePop(){ pop.hidden=true; pop.innerHTML=''; }
function hex6(c){ if(!c||typeof c!=='string') return '#000000'; if(/^#[0-9a-f]{6}/i.test(c)) return c.slice(0,7); if(/^#[0-9a-f]{3}$/i.test(c)) return '#'+c.slice(1).split('').map(x=>x+x).join(''); const k=Konva.Util.colorToRGBA(c); if(!k) return '#000000'; return '#'+[k.r,k.g,k.b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function alphaOf(c){ if(typeof c==='string'&&/^#[0-9a-f]{8}$/i.test(c)) return Math.round(parseInt(c.slice(7),16)/2.55); const k=c&&Konva.Util.colorToRGBA(c); return k?Math.round(k.a*100):100; }
function withAlpha(h,a){ a=clamp(Math.round(a),0,100); return a>=100?h:h+Math.round(a*2.55).toString(16).padStart(2,'0'); }
function docColors(){ const set=new Set(); BD.main.find(n=>{ ['fill','stroke'].forEach(k=>{ const v=n.getAttr(k); if(typeof v==='string'&&v.startsWith('#')) set.add(v.slice(0,7).toLowerCase()); }); return false; }); return [...set].slice(0,14); }
function brandSwatches(){ const c=(BD.B&&BD.B.colors)||{}, out=new Set(Object.values(c).map(v=>String(v).toLowerCase())); ((BD.B&&BD.B.flavours)||[]).forEach(f=>{ out.add(f.bg.toLowerCase()); }); return [...out]; }
const BASIC=['#ffffff','#f2f2f2','#bdbdbd','#757575','#333333','#000000','#e53935','#fb8c00','#fdd835','#43a047','#00897b','#1e88e5','#3949ab','#8e24aa','#d81b60','#6d4c41'];
function colorPop(anchor,value,onChange,opt){ opt=opt||{};
  let h=hex6(value), a=value?alphaOf(value):100; const r=anchor.getBoundingClientRect();
  const sw=list=>list.map(c=>`<button type="button" class="sw" data-c="${c}" style="--c:${c}" aria-label="${c}" title="${c}"></button>`).join('');
  pop.innerHTML=`<div class="cp">
    <div class="cp-row"><input type="color" id="cpNative" value="${h}" aria-label="Pick a colour"><input type="text" id="cpHex" value="${h}" maxlength="7" class="b-in mono" aria-label="Hex colour" spellcheck="false">${window.EyeDropper?`<button type="button" class="ib" id="cpEye" aria-label="Pick from screen" title="Pick from screen">${IC.drop}</button>`:''}</div>
    <label class="cp-a"><span>Opacity</span><input type="range" id="cpA" min="0" max="100" value="${a}"><output id="cpAo">${a}%</output></label>
    <span class="lbl">Brand</span><div class="sws">${sw(brandSwatches())}</div>
    ${docColors().length?`<span class="lbl">In this board</span><div class="sws">${sw(docColors())}</div>`:''}
    ${S.recent.length?`<span class="lbl">Recent</span><div class="sws">${sw(S.recent)}</div>`:''}
    <span class="lbl">Basic</span><div class="sws">${sw(BASIC)}</div>
    ${opt.none?'<button type="button" class="mini cp-none" id="cpNone">No colour</button>':''}</div>`;
  pop.hidden=false; pop.style.left=Math.max(8,Math.min(r.left-120,innerWidth-268))+'px'; const ph=pop.getBoundingClientRect().height; pop.style.top=(r.bottom+6+ph>innerHeight?Math.max(8,r.top-ph-6):r.bottom+6)+'px';
  const send=(rec)=>{ const v=withAlpha(h,a); onChange(v); if(rec){ S.recent=[h,...S.recent.filter(x=>x!==h)].slice(0,8); L.store('lab:recentColors',S.recent); } pop.querySelector('#cpHex').value=h; pop.querySelector('#cpNative').value=h; pop.querySelector('#cpAo').textContent=a+'%'; };
  pop.querySelector('#cpNative').oninput=e=>{ h=e.target.value; send(); }; pop.querySelector('#cpNative').onchange=()=>send(true);
  pop.querySelector('#cpHex').onchange=e=>{ const v=e.target.value.trim(); if(/^#?[0-9a-f]{6}$/i.test(v)){ h=(v[0]==='#'?v:'#'+v).toLowerCase(); send(true); } };
  pop.querySelector('#cpA').oninput=e=>{ a=+e.target.value; send(); };
  pop.querySelectorAll('.sw').forEach(b=>b.onclick=()=>{ h=b.dataset.c.slice(0,7); send(true); });
  const eye=pop.querySelector('#cpEye'); if(eye) eye.onclick=async()=>{ try{ const res=await new EyeDropper().open(); h=res.sRGBHex.slice(0,7); send(true); }catch(_){} };
  const none=pop.querySelector('#cpNone'); if(none) none.onclick=()=>{ onChange(''); closePop(); };
}
S.recent=L.store('lab:recentColors')||[];

/* ---------- design panel ---------- */
const props=$('props');
const WEIGHTS=[['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold'],['800','Extra bold'],['900','Black']];
const BLENDS=[['source-over','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['darken','Darken'],['lighten','Lighten'],['color-dodge','Color dodge'],['color-burn','Color burn'],['hard-light','Hard light'],['soft-light','Soft light'],['difference','Difference'],['exclusion','Exclusion'],['hue','Hue'],['saturation','Saturation'],['color','Color'],['luminosity','Luminosity']];
const FX=[['bright','Brightness',-100,100],['contrast','Contrast',-100,100],['sat','Saturation',-100,100],['temp','Warmth',-100,100],['hue','Hue',-180,180],['fade','Fade',0,100],['vignette','Vignette',0,100],['blur','Blur',0,40],['noise','Grain',0,100],['gray','Black & white',0,100],['sepia','Sepia',0,100]];
const has=(list,ks)=>list.some(n=>ks.includes(kind(n)));
const FILLABLE=['rect','ellipse','poly','star','ring','path','text','arrow'];
const STROKABLE=['rect','ellipse','poly','star','ring','path','text','line','arrow','pen','stroke','icon','image','asset'];
const n0=()=>S.sel[0];
function weightOf(n){ const s=n.fontStyle()||''; const m=s.match(/\d{3}/); return m?m[0]:/bold/.test(s)?'700':'400'; }
function italicOf(n){ return /italic/.test(n.fontStyle()||''); }
function setStyle(n,w,it){ n.fontStyle(((it?'italic ':'')+(w||'400')).trim()); }
function num(v,d){ return Math.round((+v||0)*(d||1))/(d||1); }
function geomOf(){ const list=S.sel; if(!list.length) return null; if(list.length===1){ const n=list[0], p=isFrame(n)?null:frameOf(n), r=wrect(n); return {x:Math.round(r.x-(p?p.x():0)),y:Math.round(r.y-(p?p.y():0)),w:Math.round(r.width),h:Math.round(r.height),r:num(n.rotation(),10)}; }
  const r=unionRect(list), p=frameOf(list[0]); const sameF=list.every(n=>frameOf(n)===p&&!isFrame(n)); return {x:Math.round(r.x-(sameF&&p?p.x():0)),y:Math.round(r.y-(sameF&&p?p.y():0)),w:Math.round(r.width),h:Math.round(r.height),r:null}; }

function field(label,key,val,o){ o=o||{}; return `<label class="f ${o.cls||''}" title="${esc(o.title||label)}"><span>${esc(label)}</span><input type="number" data-k="${key}" value="${val==null?'':val}" ${o.min!=null?`min="${o.min}"`:''} ${o.max!=null?`max="${o.max}"`:''} step="${o.step||1}" ${val==null?'placeholder="Mixed"':''}></label>`; }
function range(label,key,val,min,max,step,unit){ return `<label class="rg"><span>${esc(label)}</span><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step||1}" value="${val}"><output>${val}${unit||''}</output></label>`; }
function swatch(key,val,label,none){ const v=val||''; return `<button type="button" class="swb" data-color="${key}" ${none?'data-none="1"':''} data-pop-owner aria-label="${esc(label)}" title="${esc(label)}"><i style="--c:${v||'transparent'}" class="${v?'':'empty'}"></i><span>${v?esc(hex6(v)).toUpperCase()+(alphaOf(v)<100?' · '+alphaOf(v)+'%':''):(key==='workspace'?'Default':'None')}</span></button>`; }
function seg(key,val,opts){ return `<div class="seg2" role="group">${opts.map(([v,l,ic])=>`<button type="button" data-seg="${key}" data-v="${v}" aria-pressed="${String(val)===String(v)}" title="${esc(l)}" aria-label="${esc(l)}">${ic||esc(l)}</button>`).join('')}</div>`; }
function toggle(key,on,label){ return `<label class="tg"><input type="checkbox" data-k="${key}" ${on?'checked':''}><span>${esc(label)}</span></label>`; }
function sec(title,body,o){ o=o||{}; return `<section class="ps ${o.cls||''}"><h3>${esc(title)}${o.extra||''}</h3>${body}</section>`; }

function paintProps(){
  const list=S.sel, n=n0();
  if(S.tool==='pen'&&!list.length){ props.innerHTML=penPanel(); return; }
  if(!list.length){ props.innerHTML=boardPanel(); return; }
  const k=kind(n), all=list.every(x=>kind(x)===k), g=geomOf(), objs=list.filter(x=>!isFrame(x)), lockedAll=list.every(isLocked);
  let h=`<div class="ps-head"><b>${list.length>1?list.length+' selected':esc(nameOf(n))}</b><span class="ps-kind">${list.length>1?'':esc(kindLabel(n))}</span></div>`;
  h+=`<div class="qa">${qa('dup','Duplicate ('+mod+'+D)',IC.dup)}${qa('front','Bring to front',IC.front)}${qa('back','Send to back',IC.back)}${objs.length?qa('flipX','Flip horizontal',IC.flipX)+qa('flipY','Flip vertical',IC.flipY):''}${qa('lock',lockedAll?'Unlock':'Lock',lockedAll?IC.unlock:IC.lock)}${objs.length>1?qa('group','Group ('+mod+'+G)',IC.group):''}${list.some(x=>kind(x)==='group')?qa('ungroup','Ungroup',IC.group):''}${qa('del','Delete',IC.trash,'danger')}</div>`;
  if(lockedAll){ props.innerHTML=h+'<p class="ps-note">Locked. Unlock it to change it.</p>'; return; }
  if(objs.length) h+=sec('Align',`<div class="al">${['left:al','hcenter:ah','right:ar','top:at','vcenter:av','bottom:ab'].map(x=>{ const [a,i]=x.split(':'); return `<button type="button" class="ib" data-align="${a}" aria-label="Align ${a}" title="Align ${a==='hcenter'?'centre':a==='vcenter'?'middle':a}${list.length===1?' in the frame':''}">${IC[i]}</button>`; }).join('')}${list.length>2?`<button type="button" class="ib" data-dist="x" title="Space evenly across" aria-label="Space evenly across">${IC.dh}</button><button type="button" class="ib" data-dist="y" title="Space evenly down" aria-label="Space evenly down">${IC.dv}</button>`:''}</div>`);
  h+=sec(list.length>1?'Selection':'Position',`<div class="grid2">${field('X','x',g.x)}${field('Y','y',g.y)}${field('W','w',g.w,{min:1})}${field('H','h',g.h,{min:1})}${g.r!=null&&!isFrame(n)?field('↻','rot',g.r,{step:.1,title:'Rotation (degrees)'}):''}${list.length===1&&!isFrame(n)?`<button type="button" class="ib ratio" data-act="ratio" aria-pressed="${!!S.lockRatio}" title="Keep proportions when typing a size" aria-label="Keep proportions">${IC.link}</button>`:''}</div>`);
  if(k==='frame'&&list.length===1) h+=framePanel(n);
  if(all&&k==='text') h+=textPanel(list);
  if(objs.length&&has(objs,FILLABLE)&&!(all&&k==='image')) h+=fillPanel(objs.filter(x=>FILLABLE.includes(kind(x))));
  if(objs.length&&has(objs,STROKABLE)) h+=strokePanel(objs.filter(x=>STROKABLE.includes(kind(x))));
  if(list.length===1) h+=shapePanel(n);
  if(all&&(k==='image'||k==='asset')) h+=imagePanel(list);
  if(objs.length) h+=effectsPanel(objs);
  h+=sec('Export',`<div class="row"><button type="button" class="mini" data-act="expSel">Export ${list.length>1?'these':isFrame(n)?'frame':'this'} as PNG</button></div>`);
  props.innerHTML=h;
}
function kindLabel(n){ return ({frame:'Frame',text:'Text',rect:'Rectangle',ellipse:'Ellipse',poly:'Polygon',star:'Star',ring:'Ring',path:'Shape',icon:'Icon',line:'Line',arrow:'Arrow',pen:'Drawing',image:'Photo',asset:'Brand asset',group:'Group',stroke:'Line'})[kind(n)]||''; }
function qa(act,label,ic,cls){ return `<button type="button" class="ib ${cls||''}" data-act="${act}" aria-label="${esc(label)}" title="${esc(label)}">${ic}</button>`; }
function boardPanel(){
  const fs=frames();
  return `<div class="ps-head"><b>Board</b><span class="ps-kind">${fs.length} frame${fs.length===1?'':'s'}</span></div>`+
    sec('Add a frame',`<div class="preset-list">${BD.PRESETS.map(p=>`<button type="button" class="pl" data-addframe="${p.id}"><span class="pv" style="${pv(p.w,p.h)}"></span><span>${esc(p.label)}</span><small>${p.w}×${p.h}</small></button>`).join('')}</div>
      <div class="grid2 custom">${field('W','cfw',1080,{min:1})}${field('H','cfh',1920,{min:1})}<button type="button" class="mini" data-act="customFrame">Add</button></div>`)+
    sec('Canvas',`<div class="row">${swatch('workspace',S.bg||'','Canvas colour')}${S.bg?'<button type="button" class="link" data-act="bgReset">Reset</button>':''}</div>${toggle('grid',S.grid,'Dot grid')}${toggle('snap',S.snap,'Snap to edges and centres')}${toggle('safe',S.safe,'Story safe zones')}`)+
    sec('Frames',fs.length?`<ul class="flist">${fs.map(f=>`<li><button type="button" class="link fl" data-goto="${f.id()}" dir="auto">${esc(nameOf(f))}</button><small>${fsize(f).w}×${fsize(f).h}</small></li>`).join('')}</ul><button type="button" class="mini" data-act="exportAll">Export all frames</button>`:'<p class="ps-note">No frames yet. Press F and drag, or pick a size above.</p>')+
    `<p class="ps-note">Tip: press <kbd>?</kbd> for shortcuts. Drop photos anywhere on the canvas.</p>`;
}
function penPanel(){ const p=S.pen; return `<div class="ps-head"><b>Draw</b><span class="ps-kind">Pen</span></div>`+sec('Brush',`${seg('penMode',p.mode,[['pen','Pen'],['marker','Highlighter']])}<div class="row">${swatch('pen',p.color,'Brush colour')}</div>${range('Size','penSize',p.size,1,120,1,'px')}`)+`<p class="ps-note">Drag on the canvas to draw. Press V or Esc when you're done.</p>`; }
function framePanel(f){ const s=fsize(f), bg=frameBg(f), pr=BD.PRESETS.find(p=>p.w===s.w&&p.h===s.h);
  return sec('Frame',`<label class="f wide"><span>Size</span><select data-k="framePreset" class="b-sel"><option value="">${pr?'':'Custom '}${pr?'':s.w+'×'+s.h}</option>${BD.PRESETS.map(p=>`<option value="${p.id}" ${pr&&pr.id===p.id?'selected':''}>${esc(p.label)} · ${p.w}×${p.h}</option>`).join('')}</select></label>
    <div class="row"><button type="button" class="mini" data-act="swapWH">${IC.swap} Turn</button><button type="button" class="mini" data-act="fitContent">Fit to content</button></div>
    <label class="f wide" title="Makes a copy in another size and fits everything into it"><span>Copy to</span><select data-k="copyTo" class="b-sel"><option value="">Another size…</option>${BD.PRESETS.filter(p=>!(p.w===s.w&&p.h===s.h)).map(p=>`<option value="${p.id}">${esc(p.label)} · ${p.w}×${p.h}</option>`).join('')}</select></label>
    ${toggle('clip',f.clipWidth()!=null&&!f.getAttr('noClip'),'Hide things outside the frame')}`)+
    sec('Background',fillControls(bg,'bg'))+
    sec('Frame actions',`<div class="row"><button type="button" class="mini" data-act="dupFrame">Duplicate frame</button><button type="button" class="mini" data-act="selChildren">Select contents</button></div>`); }
function fillControls(n,prefix){ const t=n.getAttr('fillType')||'solid';
  return `${seg(prefix+'FillType',t,[['solid','Solid'],['linear','Linear'],['radial','Radial']])}
    <div class="row">${t==='solid'?swatch(prefix+'Fill',n.fill(),'Colour',prefix!=='bg'):swatch(prefix+'GradA',n.getAttr('gradA')||'#ffffff','Gradient start')+swatch(prefix+'GradB',n.getAttr('gradB')||'#000000','Gradient end')}</div>
    ${t==='linear'?range('Angle',prefix+'GradAngle',n.getAttr('gradAngle')??90,0,360,1,'°'):''}`; }
function textPanel(list){ const n=list[0], fonts=BD.allFonts(), fam=n.fontFamily(), w=weightOf(n), dec=n.textDecoration()||'';
  const groups=[['brand','Brand'],['ar','Arabic'],['latin','Latin'],['system','System']];
  const ar=AR.test(n.text()||'');
  return sec('Text',`<label class="f wide"><span>Font</span><select data-k="fontFamily" class="b-sel">${groups.map(([g,l])=>`<optgroup label="${l}">${fonts.filter(f=>f.tag===g).map(f=>`<option value="${esc(f.family)}" ${f.family===fam?'selected':''}>${esc(f.label||f.family)}</option>`).join('')}</optgroup>`).join('')}${fonts.some(f=>f.family===fam)?'':`<option selected>${esc(fam)}</option>`}</select></label>
    <div class="grid2"><label class="f"><span>Weight</span><select data-k="weight" class="b-sel">${WEIGHTS.map(([v,l])=>`<option value="${v}" ${v===w?'selected':''}>${l}</option>`).join('')}</select></label>${field('Size','fontSize',num(n.fontSize(),10),{min:4,step:1})}</div>
    <div class="row tight">${seg('align',n.align(),[['left','Left',IC.tl],['center','Centre',IC.tc],['right','Right',IC.tr],['justify','Justify',IC.tj]])}
      <div class="seg2"><button type="button" data-act="italic" aria-pressed="${italicOf(n)}" title="Italic" aria-label="Italic"><i>I</i></button><button type="button" data-act="underline" aria-pressed="${/underline/.test(dec)}" title="Underline" aria-label="Underline"><u>U</u></button><button type="button" data-act="strike" aria-pressed="${/line-through/.test(dec)}" title="Strikethrough" aria-label="Strikethrough"><s>S</s></button></div></div>
    <div class="grid2">${field('Line','lineHeight',num(n.lineHeight(),100),{step:.05,min:.5,title:'Line height'})}${field('Spacing','letterSpacing',num(n.letterSpacing(),10),{step:.5,title:'Letter spacing'})}</div>
    ${ar&&n.letterSpacing()?'<p class="ps-note warn">Arabic letters may not join when letter spacing isn\'t 0.</p>':''}
    ${toggle('autoW',!!n.getAttr('autoW'),'Width follows the text')}
    <div class="row"><button type="button" class="mini" data-act="editText">Edit text</button>${/[a-z]/i.test(n.text())?'<button type="button" class="mini" data-act="caseUp">AA</button><button type="button" class="mini" data-act="caseLow">aa</button>':''}</div>`)+
    sec('Text background',`<div class="row">${swatch('tbg',n.getAttr('tbg')||'','Box colour',true)}</div>${n.getAttr('tbg')?range('Padding','padding',num(n.padding()),0,200,1,'px')+range('Corners','tbgR',n.getAttr('tbgR')||0,0,200,1,'px'):''}`); }
function fillPanel(list){ const n=list[0]; if(!n) return ''; return sec('Fill',fillControls(n,'o')); }
function strokePanel(list){ const n=list[0]; if(!n) return ''; const k=kind(n), isLine=['line','arrow','pen','stroke','icon'].includes(k), d=n.dash()||[];
  const dashV=!d.length?'solid':d[0]<=n.strokeWidth()*0.2?'dot':'dash';
  let b=`<div class="row">${swatch('stroke',n.stroke()||'',isLine?'Line colour':'Outline colour',!isLine)}</div>${range(isLine?'Thickness':'Width','strokeWidth',num(n.strokeWidth(),10),0,k==='icon'?6:120,k==='icon'?.25:1,k==='icon'?'':'px')}`;
  if(isLine||k==='rect'||k==='ellipse') b+=seg('dash',dashV,[['solid','Solid'],['dash','Dashed'],['dot','Dotted']]);
  if(k==='arrow') b+=`<div class="row">${toggle('pStart',n.pointerAtBeginning(),'Arrow at start')}${toggle('pEnd',n.pointerAtEnding()!==false,'Arrow at end')}</div>${range('Head size','pointerLength',num(n.pointerLength()),4,200,1,'px')}`;
  if(k==='line'||k==='pen'||k==='arrow') b+=toggle('roundCap',n.lineCap()==='round','Round ends');
  return sec(isLine?'Line':'Outline',b); }
function shapePanel(n){ const k=kind(n); let b='';
  if(k==='rect') b=range('Corners','cornerRadius',num(typeof n.cornerRadius()==='number'?n.cornerRadius():0),0,Math.round(Math.min(n.width(),n.height())/2),1,'px');
  if(k==='poly') b=range('Sides','sides',n.sides(),3,12,1,'');
  if(k==='star') b=range('Points','numPoints',n.numPoints(),3,24,1,'')+range('Inner size','innerRatio',Math.round(n.innerRadius()/n.outerRadius()*100),5,95,1,'%');
  if(k==='ring') b=range('Thickness','ringRatio',Math.round((1-n.innerRadius()/n.outerRadius())*100),2,98,1,'%');
  if(k==='line'&&n.getAttr('kind')==='line') b='';
  return b?sec('Shape',b):''; }
function imagePanel(list){ const n=list[0], fx=n.getAttr('fx')||{}, one=list.length===1, cr=typeof n.cornerRadius()==='number'?n.cornerRadius():0;
  return (one?sec('Photo',`<div class="row"><button type="button" class="mini" data-act="crop">${IC.crop} Crop / move</button><button type="button" class="mini" data-act="replace">Replace</button></div>
      <div class="row"><button type="button" class="mini" data-act="fillFrame">Fill the frame</button><button type="button" class="mini" data-act="asBg">Make background</button></div>
      ${range('Zoom','cropZ',num(n.getAttr('cropZ')||1,100),1,4,.01,'×')}
      ${range('Corners','cornerRadius',num(cr),0,Math.round(Math.min(n.width(),n.height())/2),1,'px')}
      <div class="row"><button type="button" class="link" data-act="circle">Make it a circle</button><button type="button" class="link" data-act="resetCrop">Reset crop</button><button type="button" class="link" data-act="natural">Original size</button></div>`):'')+
    sec('Look',`<div class="looks">${BD.LOOKS.map(l=>`<button type="button" class="look" data-look="${l.id}" aria-pressed="${lookIs(fx,l.fx)}">${esc(l.label)}</button>`).join('')}</div>`)+
    sec('Adjust',FX.map(([k,l,a,b])=>range(l,'fx:'+k,fx[k]||0,a,b,1,'')).join('')+`<div class="row">${toggle('fx:invert',!!fx.invert,'Invert colours')}<button type="button" class="link" data-act="fxReset">Reset</button></div>`,{cls:'adjust'}); }
function lookIs(fx,l){ const ks=new Set([...Object.keys(fx).filter(k=>fx[k]),...Object.keys(l)]); for(const k of ks) if((fx[k]||0)!==(l[k]||0)) return false; return true; }
function effectsPanel(list){ const n=list[0], shp=list.every(x=>typeof x.shadowEnabled==='function'), sh=shp&&!!n.shadowEnabled()&&n.shadowOpacity()>0&&(n.shadowBlur()||n.shadowOffsetX()||n.shadowOffsetY()||n.getAttr('shadowOn'));
  return sec('Effects',`${range('Opacity','opacity',Math.round(n.opacity()*100),0,100,1,'%')}
    <label class="f wide"><span>Blend</span><select data-k="blend" class="b-sel">${BLENDS.map(([v,l])=>`<option value="${v}" ${(n.globalCompositeOperation()||'source-over')===v?'selected':''}>${l}</option>`).join('')}</select></label>
    ${shp?toggle('shadowOn',sh,'Shadow'):''}
    ${sh?`<div class="row">${swatch('shadowColor',n.shadowColor()||'#000000','Shadow colour')}</div>${range('Blur','shadowBlur',num(n.shadowBlur()),0,200,1,'px')}${range('Move X','shadowOffsetX',num(n.shadowOffsetX()),-200,200,1,'px')}${range('Move Y','shadowOffsetY',num(n.shadowOffsetY()),-200,200,1,'px')}${range('Strength','shadowOpacity',Math.round(n.shadowOpacity()*100),0,100,1,'%')}`:''}`); }

/* only the numbers update while dragging, so typing in a field never jumps */
BD.on('geom',()=>{ const g=geomOf(); if(!g) return; ['x','y','w','h','rot'].forEach(k=>{ const i=props.querySelector(`input[data-k="${k}"]`); if(i&&document.activeElement!==i) i.value=k==='rot'?(g.r??''):g[k]; }); });
BD.on('select',()=>{ closePop(); paintProps(); markLayers(); });
BD.on('doc',()=>{ paintLayersSoon(); drawMini(); });

function targets(){ return S.sel.filter(n=>!isLocked(n)); }
function apply(fn,opt){ const list=targets(); list.forEach(fn); list.forEach(n=>{ BD.applyFill(n); }); BD.tr.forceUpdate(); BD.main.batchDraw(); BD.paintUI(); BD.changed(); if(opt&&opt.repaint) paintProps(); }
function rerot(n,r){ const b=wrect(n), c={x:b.x+b.width/2,y:b.y+b.height/2}; n.rotation(r); const b2=wrect(n); U.moveByWorld(n,c.x-(b2.x+b2.width/2),c.y-(b2.y+b2.height/2)); }
function setW(n,w,h){ const k=kind(n), r=wrect(n);
  if(k==='frame'){ BD.setFrameSize(n,w??fsize(n).w,h??fsize(n).h); return; }
  if(n.rotation()){ const kx=w!=null?w/r.width:1, ky=h!=null?h/r.height:1; n.scaleX(n.scaleX()*(S.lockRatio&&w!=null?kx:kx)); n.scaleY(n.scaleY()*(S.lockRatio&&w!=null?kx:ky)); return; }
  let kx=w!=null?w/r.width:null, ky=h!=null?h/r.height:null; if(S.lockRatio){ if(kx!=null) ky=kx; else if(ky!=null) kx=ky; } kx=kx??1; ky=ky??1;
  if(k==='text'){ if(kx!==1&&ky===1){ n.width(Math.max(10,n.width()*kx)); n.setAttr('autoW',false); } else { n.fontSize(n.fontSize()*ky); if(!n.getAttr('autoW')) n.width(n.width()*kx); } return; }
  if(k==='rect'||k==='image'||k==='asset'){ n.width(n.width()*kx); n.height(n.height()*ky); if(k!=='rect'){ BD.applyCrop(n); BD.applyFx(n); } return; }
  if(k==='ellipse'){ n.radiusX(n.radiusX()*kx); n.radiusY(n.radiusY()*ky); return; }
  n.scaleX(n.scaleX()*kx); n.scaleY(n.scaleY()*ky); }

props.addEventListener('input',e=>{ const t=e.target, k=t.dataset.k; if(!k) return;
  const out=t.parentElement.querySelector('output'); if(out&&t.type==='range') out.textContent=t.value+(out.textContent.match(/[^\d.\-]+$/)||[''])[0];
  if(t.type==='number'&&e.inputType===undefined) return;
  liveSet(k,t); });
props.addEventListener('keydown',e=>{ const t=e.target; if(t.tagName==='INPUT'&&(e.key==='Enter'||e.key==='Escape')){ if(e.key==='Enter') t.dispatchEvent(new Event('change',{bubbles:true})); t.blur(); e.preventDefault(); e.stopPropagation(); } });
props.addEventListener('change',e=>{ const t=e.target, k=t.dataset.k; if(!k) return; liveSet(k,t,true); });
function val(t){ return t.type==='checkbox'?t.checked:t.type==='number'||t.type==='range'?+t.value:t.value; }
function liveSet(k,t,final){ const v=val(t); const n=n0();
  if(t.type==='number'&&!final&&t.value==='') return;
  switch(k){
    case 'x': case 'y': { const g=geomOf(); if(!g) return; const d=v-(k==='x'?g.x:g.y); targets().forEach(n=>U.moveByWorld(n,k==='x'?d:0,k==='y'?d:0)); apply(()=>{}); return; }
    case 'w': case 'h': if(S.sel.length!==1||v<1) return; apply(n=>setW(n,k==='w'?v:null,k==='h'?v:null)); if(final) paintProps(); else BD.emitGeom&&BD.emitGeom(); return;
    case 'rot': apply(n=>rerot(n,v)); return;
    case 'cfw': case 'cfh': return;
    case 'grid': S.grid=v; BD.view.changed(); return;
    case 'snap': S.snap=v; return;
    case 'safe': S.safe=v; BD.paintUI(); return;
    case 'penSize': S.pen.size=v; return;
    case 'fontFamily': { const fam=v; Promise.all(targets().map(n=>BD.ensureFont(fam,n.fontStyle()))).then(()=>{ apply(n=>{ n.fontFamily(fam); BD.prepText(n); }); }); return; }
    case 'weight': { Promise.all(targets().map(n=>BD.ensureFont(n.fontFamily(),v))).then(()=>apply(n=>setStyle(n,v,italicOf(n)))); return; }
    case 'fontSize': if(v>=1) apply(n=>n.fontSize(v)); return;
    case 'lineHeight': if(v>0) apply(n=>n.lineHeight(v)); return;
    case 'letterSpacing': apply(n=>n.letterSpacing(v)); if(final) paintProps(); return;
    case 'autoW': apply(n=>{ n.setAttr('autoW',v); if(v) n.width(undefined); else n.width(n.width()); }); return;
    case 'padding': apply(n=>n.padding(v)); return;
    case 'tbgR': apply(n=>n.setAttr('tbgR',v)); return;
    case 'copyTo': { const p=BD.PRESETS.find(x=>x.id===v); if(p&&n){ const c=BD.act.resizeWithContent(n,p.w,p.h,true,p.label); if(c){ BD.view.fitSel(); toast('Made a '+p.label+' copy.'); } } t.value=''; return; }
    case 'framePreset': { const p=BD.PRESETS.find(x=>x.id===v); if(p) apply(f=>BD.setFrameSize(f,p.w,p.h),{repaint:true}); return; }
    case 'clip': apply(f=>{ if(v){ f.setAttr('noClip',undefined); const s=fsize(f); } f.setAttr('noClip',v?undefined:true); if(v){ const bg=frameBg(f); f.clipWidth(bg.width()); f.clipHeight(bg.height()); } else { f.clipWidth(undefined); f.clipHeight(undefined); } }); return;
    case 'bgGradAngle': apply(f=>{ const bg=frameBg(f); bg.setAttr('gradAngle',v); BD.applyFill(bg); }); return;
    case 'oGradAngle': apply(n=>n.setAttr('gradAngle',v)); return;
    case 'strokeWidth': apply(n=>{ n.strokeWidth(v); if(v>0&&!n.stroke()) n.stroke(BD.brandColors().ink); if(n.dash()&&n.dash().length) n.dash(dashFor(n,n.getAttr('dashV'))); }); return;
    case 'pStart': apply(n=>n.pointerAtBeginning(v)); return;
    case 'pEnd': apply(n=>n.pointerAtEnding(v)); return;
    case 'pointerLength': apply(n=>{ n.pointerLength(v); n.pointerWidth(v); }); return;
    case 'roundCap': apply(n=>n.lineCap(v?'round':'butt')); return;
    case 'cornerRadius': apply(n=>n.cornerRadius(v)); return;
    case 'sides': apply(n=>n.sides(v)); return;
    case 'numPoints': apply(n=>n.numPoints(v)); return;
    case 'innerRatio': apply(n=>n.innerRadius(n.outerRadius()*v/100)); return;
    case 'ringRatio': apply(n=>n.innerRadius(n.outerRadius()*(1-v/100))); return;
    case 'cropZ': apply(n=>{ n.setAttr('cropZ',v); BD.applyCrop(n); BD.applyFx(n); }); return;
    case 'opacity': apply(n=>n.opacity(v/100)); return;
    case 'blend': apply(n=>n.globalCompositeOperation(v)); return;
    case 'shadowOn': apply(n=>{ if(v) n.setAttrs({shadowEnabled:true,shadowOn:true,shadowColor:n.shadowColor()||'#000000',shadowBlur:n.shadowBlur()||30,shadowOffsetX:n.shadowOffsetX()||0,shadowOffsetY:n.shadowOffsetY()||16,shadowOpacity:n.shadowOpacity()<1?n.shadowOpacity():.35}); else n.setAttrs({shadowEnabled:false,shadowOn:undefined}); },{repaint:true}); return;
    case 'shadowBlur': case 'shadowOffsetX': case 'shadowOffsetY': apply(n=>n.setAttr(k,v)); return;
    case 'shadowOpacity': apply(n=>n.shadowOpacity(v/100)); return;
  }
  if(k.startsWith('fx:')){ const f=k.slice(3); apply(n=>{ const fx=Object.assign({},n.getAttr('fx')||{}); fx[f]=f==='invert'?(v?1:0):v; n.setAttr('fx',fx); BD.applyFx(n); }); if(final) markLooks(); }
}
function markLooks(){ const n=n0(); if(!n) return; const fx=n.getAttr('fx')||{}; props.querySelectorAll('[data-look]').forEach(b=>{ const l=BD.LOOKS.find(x=>x.id===b.dataset.look); b.setAttribute('aria-pressed',String(lookIs(fx,l.fx))); }); }
function dashFor(n,v){ const w=Math.max(1,n.strokeWidth()); return v==='dot'?[0.001,w*2]:v==='dash'?[w*3,w*2]:[]; }

props.addEventListener('click',e=>{
  const sw=e.target.closest('[data-color]'); if(sw){ colorFor(sw); return; }
  const sg=e.target.closest('[data-seg]'); if(sg){ segSet(sg.dataset.seg,sg.dataset.v); return; }
  const al=e.target.closest('[data-align]'); if(al){ BD.act.align(al.dataset.align); return; }
  const di=e.target.closest('[data-dist]'); if(di){ BD.act.distribute(di.dataset.dist); return; }
  const lk=e.target.closest('[data-look]'); if(lk){ const l=BD.LOOKS.find(x=>x.id===lk.dataset.look); apply(n=>{ n.setAttr('fx',Object.assign({},l.fx)); BD.applyFx(n); },{repaint:true}); return; }
  const af=e.target.closest('[data-addframe]'); if(af){ addFrame(BD.PRESETS.find(p=>p.id===af.dataset.addframe)); return; }
  const go=e.target.closest('[data-goto]'); if(go){ const f=BD.main.findOne('#'+go.dataset.goto); if(f){ BD.select([f]); BD.view.fitSel(); } return; }
  const b=e.target.closest('[data-act]'); if(!b) return; const a=b.dataset.act, n=n0();
  const acts={dup:()=>BD.act.duplicate(),front:()=>BD.act.order('front'),back:()=>BD.act.order('back'),flipX:()=>BD.act.flip('x'),flipY:()=>BD.act.flip('y'),lock:()=>{ BD.act.lock(); },group:BD.act.group,ungroup:BD.act.ungroup,del:BD.act.del,
    ratio:()=>{ S.lockRatio=!S.lockRatio; b.setAttribute('aria-pressed',String(S.lockRatio)); },
    customFrame:()=>{ const w=+props.querySelector('[data-k=cfw]').value, h=+props.querySelector('[data-k=cfh]').value; if(w>0&&h>0&&w<=10000&&h<=10000) addFrame({w:Math.round(w),h:Math.round(h),label:'Frame'}); else toast('Pick a size from 1 to 10000 pixels.'); },
    workspace:()=>{}, bgReset:()=>{ S.bg=null; applyWorkspace(); BD.scheduleSave(); paintProps(); }, exportAll:()=>exportDialog(frames()),
    swapWH:()=>apply(f=>{ const s=fsize(f); BD.setFrameSize(f,s.h,s.w); },{repaint:true}),
    fitContent:()=>{ const f=n, list=items(f); if(!list.length) return; const r=unionRect(list); const dx=r.x-f.x(), dy=r.y-f.y(); f.position({x:Math.round(r.x),y:Math.round(r.y)}); list.forEach(c=>{ c.x(c.x()-dx); c.y(c.y()-dy); }); BD.setFrameSize(f,r.width,r.height); BD.tr.forceUpdate(); BD.paintUI(); BD.changed(); paintProps(); },
    dupFrame:()=>BD.act.duplicate(), selChildren:()=>BD.select(items(n).filter(x=>!isLocked(x))),
    italic:()=>apply(n=>setStyle(n,weightOf(n),!italicOf(n)),{repaint:true}),
    underline:()=>apply(n=>{ const d=n.textDecoration()||''; n.textDecoration(/underline/.test(d)?d.replace('underline','').trim():(d+' underline').trim()); },{repaint:true}),
    strike:()=>apply(n=>{ const d=n.textDecoration()||''; n.textDecoration(/line-through/.test(d)?d.replace('line-through','').trim():(d+' line-through').trim()); },{repaint:true}),
    editText:()=>BD.startEdit(n), caseUp:()=>apply(n=>n.text(n.text().toUpperCase())), caseLow:()=>apply(n=>n.text(n.text().toLowerCase())),
    crop:()=>startCrop(n), replace:()=>replacePhoto(n), fillFrame:()=>BD.act.fillFrame(n), asBg:()=>BD.act.fillFrame(n,true),
    circle:()=>apply(n=>{ const s=Math.min(n.width(),n.height()); const r=wrect(n); n.width(s); n.height(s); BD.applyCrop(n); n.cornerRadius(s/2); const r2=wrect(n); U.moveByWorld(n,r.x+r.width/2-(r2.x+r2.width/2),r.y+r.height/2-(r2.y+r2.height/2)); BD.applyFx(n); },{repaint:true}),
    resetCrop:()=>apply(n=>{ n.setAttrs({cropZ:1,focX:.5,focY:.5}); BD.applyCrop(n); BD.applyFx(n); },{repaint:true}),
    natural:()=>apply(n=>{ const im=BD.IMGS.get(n.getAttr('imgId')); if(!im) return; const f=frameOf(n), box=f?fsize(f):{w:im.w,h:im.h}, k=Math.min(1,box.w/im.w,box.h/im.h); n.setAttrs({width:Math.round(im.w*k),height:Math.round(im.h*k),cropZ:1,focX:.5,focY:.5}); BD.applyCrop(n); BD.applyFx(n); },{repaint:true}),
    fxReset:()=>apply(n=>{ n.setAttr('fx',{}); BD.applyFx(n); },{repaint:true}),
    expSel:()=>exportSel()};
  if(acts[a]) acts[a]();
});
function segSet(key,v){
  if(key==='align') return apply(n=>n.align(v),{repaint:true});
  if(key==='penMode'){ S.pen.mode=v; return paintProps(); }
  if(key==='dash') return apply(n=>{ n.setAttr('dashV',v); if(v!=='solid'&&!n.strokeWidth()) n.strokeWidth(4); if(v!=='solid'&&!n.stroke()) n.stroke(BD.brandColors().ink); n.dash(dashFor(n,v)); if(v==='dot') n.lineCap('round'); },{repaint:true});
  if(key==='bgFillType') return apply(f=>{ const bg=frameBg(f); setFillType(bg,v); },{repaint:true});
  if(key==='oFillType') return apply(n=>setFillType(n,v),{repaint:true});
}
function setFillType(n,v){ if(v!=='solid'){ if(!n.getAttr('gradA')) n.setAttr('gradA',typeof n.fill()==='string'&&n.fill()?hex6(n.fill()):'#ffffff'); if(!n.getAttr('gradB')) n.setAttr('gradB',BD.brandColors().ink); if(n.getAttr('gradAngle')==null) n.setAttr('gradAngle',180); }
  n.setAttr('fillType',v); if(v==='solid'&&!n.fill()) n.fill(n.getAttr('gradA')||'#ffffff'); BD.applyFill(n); }
function colorFor(btn){ const key=btn.dataset.color, n=n0(); let cur='';
  const get={workspace:()=>S.bg||'',pen:()=>S.pen.color,bgFill:()=>frameBg(n).fill(),bgGradA:()=>frameBg(n).getAttr('gradA'),bgGradB:()=>frameBg(n).getAttr('gradB'),oFill:()=>n.fill(),oGradA:()=>n.getAttr('gradA'),oGradB:()=>n.getAttr('gradB'),stroke:()=>n.stroke(),tbg:()=>n.getAttr('tbg'),shadowColor:()=>n.shadowColor()};
  cur=(get[key]||(()=>''))()||'';
  colorPop(btn,cur||'#000000',v=>{
    const set={workspace:()=>{ S.bg=v||null; applyWorkspace(); BD.scheduleSave(); }, pen:()=>{ S.pen.color=v; },
      bgFill:()=>apply(f=>{ const bg=frameBg(f); bg.fill(v||'#ffffff'); bg.setAttr('fillType','solid'); BD.applyFill(bg); }),
      bgGradA:()=>apply(f=>{ const bg=frameBg(f); bg.setAttr('gradA',v); BD.applyFill(bg); }), bgGradB:()=>apply(f=>{ const bg=frameBg(f); bg.setAttr('gradB',v); BD.applyFill(bg); }),
      oFill:()=>apply(n=>{ n.fill(v); if(kind(n)==='arrow') n.stroke(v||n.stroke()); }), oGradA:()=>apply(n=>n.setAttr('gradA',v)), oGradB:()=>apply(n=>n.setAttr('gradB',v)),
      stroke:()=>apply(n=>{ n.stroke(v); if(v&&!n.strokeWidth()) n.strokeWidth(kind(n)==='text'?4:6); if(kind(n)==='arrow') n.fill(v); }),
      tbg:()=>apply(n=>{ n.setAttr('tbg',v||undefined); if(v&&!n.padding()) n.padding(Math.round(n.fontSize()*.3)); }), shadowColor:()=>apply(n=>n.shadowColor(v))};
    (set[key]||(()=>{}))();
    const i=btn.querySelector('i'), s=btn.querySelector('span'); if(i){ i.style.setProperty('--c',v||'transparent'); i.classList.toggle('empty',!v); } if(s) s.textContent=v?hex6(v).toUpperCase()+(alphaOf(v)<100?' · '+alphaOf(v)+'%':''):'None';
    if(key==='tbg'&&!!v!==!!cur){ cur=v; setTimeout(paintProps,0); }
  },{none:!!btn.dataset.none}); }
function applyWorkspace(){ BD.wrap.style.backgroundColor=S.bg||''; }
BD.on('opened',applyWorkspace);
function addFrame(p){ const fs=frames(); let x=0,y=0; if(fs.length){ const r=unionRect(fs); x=Math.round(r.x+r.width+120); y=Math.round(fs[fs.length-1].y()); }
  const f=BD.makeFrame(x,y,p.w,p.h,{label:p.label||'Frame'}); BD.select([f]); BD.paintUI(); BD.view.fitSel(); BD.changed(); BD.on&&paintLayersSoon(); }

/* ---------- layers panel ---------- */
const layersEl=$('layers'); const collapsed=new Set(); let layT=0;
function paintLayersSoon(){ clearTimeout(layT); layT=setTimeout(paintLayers,60); }
function kindIcon(n){ const k=kind(n); return ({frame:IC.frame,text:IC.text,rect:IC.rect,ellipse:IC.ellipse,poly:IC.poly,star:IC.star,ring:IC.ellipse,path:IC.star,icon:IC.star,line:IC.line,arrow:IC.arrow,pen:IC.pen,image:IC.image,asset:IC.image,group:IC.group,stroke:IC.line})[k]||IC.rect; }
function paintLayers(){
  const rows=[]; const walk=(c,d)=>{ const list=items(c).slice().reverse(); list.forEach(n=>{ const box=isFrame(n)||kind(n)==='group', kids=box?items(n):[], open=box&&!collapsed.has(n.id());
    rows.push(`<div class="lr${isFrame(n)?' lr-frame':''}${n.visible()?'':' off'}" role="treeitem" draggable="true" data-id="${n.id()}" style="--d:${d}" aria-selected="${S.sel.includes(n)}" ${box?`aria-expanded="${open}"`:''}>
      ${box&&kids.length?`<button type="button" class="lr-caret" data-caret aria-label="${open?'Collapse':'Expand'}">${IC.caret}</button>`:'<span class="lr-caret"></span>'}<span class="lr-ic">${kindIcon(n)}</span><span class="lr-n" dir="auto">${esc(nameOf(n))}</span>
      <button type="button" class="lr-b${isLocked(n)?' on':''}" data-lock aria-label="${isLocked(n)?'Unlock':'Lock'}" title="${isLocked(n)?'Unlock':'Lock'}">${isLocked(n)?IC.lock:IC.unlock}</button><button type="button" class="lr-b${n.visible()?'':' on'}" data-eye aria-label="${n.visible()?'Hide':'Show'}" title="${n.visible()?'Hide':'Show'}">${n.visible()?IC.eye:IC.eyeOff}</button></div>`);
    if(open) walk(n,d+1); }); };
  walk(BD.main,0);
  layersEl.innerHTML=rows.join('')||'<p class="ps-note">Nothing here yet. Add a frame, text or a photo.</p>';
}
function markLayers(){ layersEl.querySelectorAll('.lr').forEach(r=>{ const on=S.sel.some(n=>n.id()===r.dataset.id); r.setAttribute('aria-selected',String(on)); });
  const first=layersEl.querySelector('.lr[aria-selected="true"]'); if(first&&!$('layersPane').hidden){ const pr=$('layersPane').getBoundingClientRect(), rr=first.getBoundingClientRect(); if(rr.top<pr.top||rr.bottom>pr.bottom) first.scrollIntoView({block:'nearest'}); }
  const sel=S.sel[0]; if(sel){ let p=sel.getParent(), need=false; while(p&&p!==BD.main){ if(collapsed.has(p.id())){ collapsed.delete(p.id()); need=true; } p=p.getParent(); } if(need) paintLayers(); } }
const nodeOf=r=>r&&BD.main.findOne('#'+r.dataset.id);
layersEl.addEventListener('click',e=>{ const r=e.target.closest('.lr'); if(!r) return; const n=nodeOf(r); if(!n) return;
  if(e.target.closest('[data-caret]')){ collapsed.has(n.id())?collapsed.delete(n.id()):collapsed.add(n.id()); paintLayers(); return; }
  if(e.target.closest('[data-eye]')){ n.visible(!n.visible()); if(!n.visible()) BD.select(S.sel.filter(x=>x!==n)); BD.main.batchDraw(); BD.paintUI(); BD.changed(); paintLayers(); return; }
  if(e.target.closest('[data-lock]')){ n.setAttr('locked',isLocked(n)?undefined:true); BD.select(S.sel.filter(x=>x!==n||!isLocked(n))); BD.changed(); paintLayers(); return; }
  if(!n.visible()) return;
  if(e.shiftKey||e.metaKey||e.ctrlKey){ BD.select(S.sel.includes(n)?S.sel.filter(x=>x!==n):[...S.sel,n]); } else BD.select([n]);
  if(innerWidth<900) panel('L',false); });
layersEl.addEventListener('dblclick',e=>{ const r=e.target.closest('.lr'); const n=nodeOf(r); if(!n||e.target.closest('button')) return; const span=r.querySelector('.lr-n');
  const i=document.createElement('input'); i.className='lr-in'; i.value=nameOf(n); i.dir='auto'; span.replaceWith(i); i.focus(); i.select();
  const done=ok=>{ if(ok) n.setAttr('label',i.value.trim()||undefined); BD.paintUI(); BD.changed(); paintLayers(); paintProps(); };
  i.onkeydown=ev=>{ ev.stopPropagation(); if(ev.key==='Enter') done(true); if(ev.key==='Escape') done(false); }; i.onblur=()=>done(true); });
layersEl.addEventListener('mouseover',e=>{ const n=nodeOf(e.target.closest('.lr')); BD.hoverNode&&BD.hoverNode(n&&!S.sel.includes(n)?n:null); });
layersEl.addEventListener('mouseleave',()=>BD.hoverNode&&BD.hoverNode(null));
let dragRow=null;
layersEl.addEventListener('dragstart',e=>{ const r=e.target.closest('.lr'); if(!r) return; dragRow=r; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',r.dataset.id); r.classList.add('dragging'); });
layersEl.addEventListener('dragend',()=>{ if(dragRow) dragRow.classList.remove('dragging'); dragRow=null; layersEl.querySelectorAll('.drop-a,.drop-b,.drop-in').forEach(x=>x.classList.remove('drop-a','drop-b','drop-in')); });
function dropPos(r,e){ const b=r.getBoundingClientRect(), y=(e.clientY-b.top)/b.height, t=nodeOf(r); const box=t&&(isFrame(t)||kind(t)==='group'); if(box&&y>.3&&y<.7) return 'in'; return y<.5?'a':'b'; }
layersEl.addEventListener('dragover',e=>{ const r=e.target.closest('.lr'); if(!r||!dragRow||r===dragRow) return; e.preventDefault(); layersEl.querySelectorAll('.drop-a,.drop-b,.drop-in').forEach(x=>x.classList.remove('drop-a','drop-b','drop-in')); r.classList.add('drop-'+dropPos(r,e)); });
layersEl.addEventListener('drop',e=>{ const r=e.target.closest('.lr'); if(!r||!dragRow) return; e.preventDefault(); const n=nodeOf(dragRow), t=nodeOf(r); if(!n||!t||n===t||n.isAncestorOf(t)) return; const pos=dropPos(r,e);
  if(pos==='in'){ if(isFrame(n)) return; U.reparent(n,t); n.moveToTop(); }
  else { const par=t.getParent(); if(isFrame(n)&&par!==BD.main) return; if(par!==n.getParent()) U.reparent(n,par); else n.moveToTop(); const idx=t.zIndex(); n.zIndex(pos==='a'?Math.min(idx+1,par.children.length-1):idx); if(isFrame(par)) frameBg(par).moveToBottom(); }
  BD.main.batchDraw(); BD.tr.forceUpdate(); BD.paintUI(); BD.changed(); paintLayers(); });

/* hover outline from the layers list */
(function(){ const box=new Konva.Rect({stroke:'#2f7bff',strokeWidth:1.5,strokeScaleEnabled:false,listening:false,visible:false}); BD.ui.add(box);
  BD.hoverNode=n=>{ if(n&&n.visible()){ const r=wrect(n); box.setAttrs({...r,visible:true}); } else box.visible(false); BD.ui.batchDraw(); }; })();

/* tabs */
document.querySelector('.bp-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(!b) return; showTab(b.dataset.tab); });
function showTab(t){ document.querySelectorAll('.bp-tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t))); $('layersPane').hidden=t!=='layers'; $('addPane').hidden=t!=='add'; if(t==='add') paintAdd(); }

/* ---------- add panel: text, frames, templates, shapes, icons, emoji, brand, photos ---------- */
const addList=$('addList');
let addQ='';
$('addQ').addEventListener('input',e=>{ addQ=e.target.value.trim().toLowerCase(); paintAdd(); });
function shapeThumb(d,stroke,box){ box=box||100; return `<svg viewBox="${stroke?'-6 -6 112 112':'0 0 '+box+' '+box}" width="36" height="36" aria-hidden="true"><path d="${d}" ${stroke?'fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"':'fill="currentColor"'}/></svg>`; }
const nativeShape={rect:'M8 8H92V92H8Z',rounded:'M30 8H70A22 22 0 0 1 92 30V70A22 22 0 0 1 70 92H30A22 22 0 0 1 8 70V30A22 22 0 0 1 30 8Z',ellipse:'M92 50A42 42 0 1 1 8 50A42 42 0 1 1 92 50Z',triangle:'M50 8L94 88H6Z',pentagon:'M50 6L94 38L77 90H23L6 38Z',hexagon:'M28 10H72L94 50L72 90H28L6 50Z',
  star:'M50 4L61 37H96L68 58L79 92L50 71L21 92L32 58L4 37H39Z',star8:'M50 2L60 26L84 16L74 40L98 50L74 60L84 84L60 74L50 98L40 74L16 84L26 60L2 50L26 40L16 16L40 26Z',ring:'M50 6A44 44 0 1 1 49.9 6ZM50 26A24 24 0 1 0 50.1 26Z',line:'M8 50H92',arrow:'M8 50H86M66 30L88 50L66 70'};
function paintAdd(){
  const q=addQ, m=s=>!q||s.toLowerCase().includes(q);
  const B=BD.B||{}, ph=B.phrases||{}, h=[];
  const textBtns=[['Heading','h1'],['Subheading','h2'],['Body text','body']].filter(([l])=>m(l)||m('text'));
  if(textBtns.length) h.push(sec('Text',`<div class="tadd">${textBtns.map(([l,t])=>`<button type="button" class="ta ta-${t}" data-addtext="${t}" draggable="true">${l}</button>`).join('')}</div>`));
  const phr=[...(ph.headlines||[]),...(ph.small||[]),...(ph.buttons||[])].filter((v,i,a)=>a.indexOf(v)===i&&m(v));
  if(phr.length&&(q||true)) h.push(sec('Brand wording',`<div class="phr" dir="auto">${phr.slice(0,q?60:24).map(p=>`<button type="button" class="chip sm" data-phrase="${esc(p)}" draggable="true" dir="auto">${esc(p)}</button>`).join('')}</div>`,{cls:'phrases'}));
  const fr=BD.PRESETS.filter(p=>m(p.label)||m('frame'));
  if(fr.length) h.push(sec('Frames',`<div class="preset-list">${fr.map(p=>`<button type="button" class="pl" data-addframe2="${p.id}"><span class="pv" style="${pv(p.w,p.h)}"></span><span>${esc(p.label)}</span><small>${p.w}×${p.h}</small></button>`).join('')}</div>`));
  const tp=BD.TEMPLATES.filter(t=>m(t.label)||m('template'));
  if(tp.length) h.push(sec('Templates',`<div class="tpl">${tp.map(t=>`<button type="button" class="tp" data-tpl="${t.id}"><span class="pv" style="${pv(t.w,t.h,28)}"></span><span>${esc(t.label)}</span></button>`).join('')}</div>`));
  const assets=L.brandAssets().filter(a=>m(a.label)||m(a.group||'')||m('brand'));
  if(assets.length) h.push(sec('Brand assets',`<div class="agrid">${assets.map(a=>`<button type="button" class="ag" data-asset="${a.id}" draggable="true" title="${esc(a.label)}" aria-label="${esc(a.label)}"><img src="${L.assetUrl(a)}" alt="" loading="lazy"></button>`).join('')}</div>`));
  const photos=[...new Set(BD.main.find('Image').filter(n=>kind(n)==='image').map(n=>n.getAttr('imgId')))];
  if(m('photo')||m('image')||!q) h.push(sec('Photos',`<button type="button" class="mini wide" data-act2="upload">${IC.image} Upload photos</button>${photos.length?`<div class="agrid ph">${photos.map(id=>`<button type="button" class="ag" data-photo="${id}" draggable="true" aria-label="Add this photo again"><canvas data-thumb="${id}" width="80" height="80"></canvas></button>`).join('')}</div>`:''}<p class="ps-note">Or drop photos on the canvas, or paste them.</p>`));
  const shapes=BD.SHAPES.filter(s=>m(s.label)||m('shape'));
  if(shapes.length) h.push(sec('Shapes',`<div class="sgrid">${shapes.map(s=>`<button type="button" class="sg" data-shape="${s.id}" draggable="true" title="${esc(s.label)}" aria-label="${esc(s.label)}">${shapeThumb(s.path||nativeShape[s.id]||nativeShape.rect)}</button>`).join('')}</div>`));
  const strokes=BD.STROKES.filter(s=>m(s.label)||m('line'));
  if(strokes.length) h.push(sec('Lines',`<div class="sgrid">${strokes.map(s=>`<button type="button" class="sg" data-stroke="${s.id}" draggable="true" title="${esc(s.label)}" aria-label="${esc(s.label)}">${shapeThumb(s.path||nativeShape[s.id],true)}</button>`).join('')}</div>`));
  const icons=BD.ICONS.filter(i=>m(i.id.replace(/-/g,' '))||m('icon'));
  if(icons.length) h.push(sec('Icons',`<div class="sgrid">${icons.map(i=>`<button type="button" class="sg" data-icon="${i.id}" draggable="true" title="${esc(i.id.replace(/-/g,' '))}" aria-label="${esc(i.id.replace(/-/g,' '))}"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${i.d}"/></svg></button>`).join('')}</div>`));
  if(!q||m('emoji')) h.push(sec('Emoji',`<div class="egrid">${BD.EMOJI.map(e=>`<button type="button" class="eg" data-emoji="${e}" draggable="true" aria-label="${e}">${e}</button>`).join('')}</div>`));
  addList.innerHTML=h.join('')||'<p class="ps-note">Nothing matches.</p>';
  addList.querySelectorAll('canvas[data-thumb]').forEach(c=>{ const im=BD.IMGS.get(c.dataset.thumb); if(!im) return; const x=c.getContext('2d'), k=Math.max(80/im.w,80/im.h); x.drawImage(im.el,(80-im.w*k)/2,(80-im.h*k)/2,im.w*k,im.h*k); });
}
BD.on('photos',()=>{ if(!$('addPane').hidden) paintAdd(); });
function addItem(el,at){ const d=el.dataset, c=BD.brandColors();
  if(d.addtext){ const f=at?BD.frameAt(at):BD.targetFrame(), fw=f?fsize(f).w:1080;
    const o=d.addtext==='h1'?{fontSize:Math.round(fw*.12),fontFamily:BD.displayFont()}:d.addtext==='h2'?{fontSize:Math.round(fw*.06),fontFamily:BD.bodyFont(),fontStyle:'800'}:{fontSize:Math.round(fw*.036),fontFamily:BD.bodyFont(),fontStyle:'600',lineHeight:1.4};
    const ar=(BD.B&&BD.B.lang)==='ar'; const n=BD.make.text(d.addtext==='h1'?(ar?'عنوان':'Heading'):d.addtext==='h2'?(ar?'عنوان فرعي':'Subheading'):(ar?'اكتب هنا':'Write something here'),o);
    BD.ensureFont(n.fontFamily(),n.fontStyle()).then(()=>{ BD.place(n,{frame:f,at}); BD.startEdit(n,true); }); return; }
  if(d.phrase){ const f=at?BD.frameAt(at):BD.targetFrame(), fw=f?fsize(f).w:1080; const n=BD.make.text(d.phrase,{fontSize:Math.round(fw*.09)}); BD.place(n,{frame:f,at}); return; }
  if(d.asset){ const a=L.brandAssets().find(x=>x.id===d.asset); if(a) BD.addAsset(a,at); return; }
  if(d.photo){ const im=BD.IMGS.get(d.photo); if(!im) return; const f=at?BD.frameAt(at):BD.targetFrame(), box=f?fsize(f):{w:1080,h:1080}, k=Math.min(1,box.w*.8/im.w,box.h*.8/im.h); BD.place(BD.make.image(d.photo,Math.round(im.w*k),Math.round(im.h*k)),{frame:f,at}); return; }
  if(d.shape){ const s=BD.SHAPES.find(x=>x.id===d.shape); const f=at?BD.frameAt(at):BD.targetFrame(); BD.place(BD.make.shape(s,f?Math.round(fsize(f).w*.4):300,c.accent),{frame:f,at}); return; }
  if(d.stroke){ const s=BD.STROKES.find(x=>x.id===d.stroke); const f=at?BD.frameAt(at):BD.targetFrame(); BD.place(BD.make.shape(Object.assign({stroke:!s.make},s),f?Math.round(fsize(f).w*.4):300,c.ink),{frame:f,at}); return; }
  if(d.icon){ const s=BD.ICONS.find(x=>x.id===d.icon); const f=at?BD.frameAt(at):BD.targetFrame(); BD.place(BD.make.icon(s,f?Math.round(fsize(f).w*.18):160,c.ink),{frame:f,at}); return; }
  if(d.emoji){ const f=at?BD.frameAt(at):BD.targetFrame(); const n=BD.make.text(d.emoji,{fontSize:f?Math.round(fsize(f).w*.16):160,fontFamily:'system-ui'}); BD.place(n,{frame:f,at}); return; }
}
addList.addEventListener('click',async e=>{
  const up=e.target.closest('[data-act2="upload"]'); if(up){ $('pickImg').click(); return; }
  const fr=e.target.closest('[data-addframe2]'); if(fr){ addFrame(BD.PRESETS.find(p=>p.id===fr.dataset.addframe2)); return; }
  const tp=e.target.closest('[data-tpl]'); if(tp){ await BD.buildTemplate(tp.dataset.tpl,true); return; }
  const it=e.target.closest('[data-addtext],[data-phrase],[data-asset],[data-photo],[data-shape],[data-stroke],[data-icon],[data-emoji]'); if(it){ addItem(it); if(innerWidth<900) panel('L',false); }
});
addList.addEventListener('dragstart',e=>{ const it=e.target.closest('[draggable]'); if(!it) return; e.dataTransfer.setData('application/x-board-add',JSON.stringify(Object.assign({},it.dataset))); e.dataTransfer.effectAllowed='copy'; });

/* drop onto the canvas: things from the Add panel, photo files, board files */
const wrapEl=BD.wrap; let dragDepth=0;
wrapEl.addEventListener('dragenter',e=>{ if(e.dataTransfer.types.includes('Files')){ dragDepth++; $('dropHint').hidden=false; } });
wrapEl.addEventListener('dragleave',()=>{ dragDepth=Math.max(0,dragDepth-1); if(!dragDepth) $('dropHint').hidden=true; });
wrapEl.addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='copy'; });
wrapEl.addEventListener('drop',async e=>{ e.preventDefault(); dragDepth=0; $('dropHint').hidden=true;
  const r=BD.stage.container().getBoundingClientRect(), at=U.toWorld({x:e.clientX-r.left,y:e.clientY-r.top});
  const add=e.dataTransfer.getData('application/x-board-add'); if(add){ const el=document.createElement('i'); Object.assign(el.dataset,JSON.parse(add)); addItem(el,at); return; }
  const files=[...e.dataTransfer.files]; const board=files.find(f=>/\.board$/i.test(f.name)); if(board){ try{ const id=await BD.importBoardFile(board); location.href='board.html?id='+id; }catch(err){ toast(err.message); } return; }
  if(files.length){ await BD.addPhotos(files,at); paintAdd(); } });

/* ---------- photos: replace, crop mode ---------- */
let replaceFor=null;
function replacePhoto(n){ replaceFor=n; $('replaceImg').click(); }
$('replaceImg').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f||!replaceFor) return; const n=replaceFor; replaceFor=null;
  const [m]=await BD.addPhotos([f]); if(!m) return; const id=m.getAttr('imgId'); m.destroy(); n.setAttrs({imgId:id,image:BD.IMGS.get(id).el,cropZ:1,focX:.5,focY:.5}); BD.applyCrop(n); BD.applyFx(n); BD.select([n]); BD.changed(); };
let crop=null;
BD.on('crop',n=>startCrop(n));
function startCrop(n){ if(!n||isLocked(n)) return; crop={n}; BD.select([n]); BD.tr.nodes([]); $('cropBar').hidden=false; $('cropPad').hidden=false; $('cropZ').value=n.getAttr('cropZ')||1; BD.hoverNode(n); }
function endCrop(){ if(!crop) return; const n=crop.n; crop=null; $('cropBar').hidden=true; $('cropPad').hidden=true; BD.hoverNode(null); BD.applyFx(n); BD.select([n]); BD.changed(); paintProps(); }
$('cropDone').onclick=endCrop;
$('cropZ').oninput=e=>{ if(!crop) return; crop.n.setAttr('cropZ',+e.target.value); BD.applyCrop(crop.n); if(crop.n.isCached()) crop.n.clearCache(); BD.main.batchDraw(); };
(function(){ const pad=$('cropPad'); let s=null;
  pad.addEventListener('pointerdown',e=>{ if(!crop) return; pad.setPointerCapture(e.pointerId); const n=crop.n, im=BD.IMGS.get(n.getAttr('imgId')); if(!im) return; const c=n.crop(); s={x:e.clientX,y:e.clientY,fx:n.getAttr('focX')??.5,fy:n.getAttr('focY')??.5,ex:im.w-c.width,ey:im.h-c.height,k:n.width()/c.width*n.getAbsoluteScale().x}; if(n.isCached()) n.clearCache(); });
  pad.addEventListener('pointermove',e=>{ if(!s||!crop) return; const n=crop.n; const dx=(e.clientX-s.x)/s.k, dy=(e.clientY-s.y)/s.k; const sx=Math.sign(n.scaleX())||1, sy=Math.sign(n.scaleY())||1;
    n.setAttr('focX',s.ex>0?clamp(s.fx-dx*sx/s.ex,0,1):.5); n.setAttr('focY',s.ey>0?clamp(s.fy-dy*sy/s.ey,0,1):.5); BD.applyCrop(n); BD.main.batchDraw(); });
  pad.addEventListener('pointerup',()=>{ s=null; });
  pad.addEventListener('wheel',e=>{ if(!crop) return; e.preventDefault(); const n=crop.n, z=clamp((n.getAttr('cropZ')||1)*Math.exp(-e.deltaY*.002),1,4); n.setAttr('cropZ',z); $('cropZ').value=z; BD.applyCrop(n); if(n.isCached()) n.clearCache(); BD.main.batchDraw(); },{passive:false});
  pad.addEventListener('dblclick',endCrop);
})();

/* ---------- wheel: scroll to pan, pinch or Ctrl/⌘ + scroll to zoom ---------- */
wrapEl.addEventListener('wheel',e=>{ if(e.target.closest('.b-corner,.crop-bar')) return; e.preventDefault(); const r=BD.stage.container().getBoundingClientRect(), p={x:e.clientX-r.left,y:e.clientY-r.top};
  if(e.ctrlKey||e.metaKey){ const d=clamp(e.deltaY*(e.deltaMode===1?16:1),-60,60); BD.view.zoomAt(BD.stage.scaleX()*Math.exp(-d*.012),p); }
  else { const dx=(e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX)*(e.deltaMode===1?16:1), dy=(e.shiftKey?0:e.deltaY)*(e.deltaMode===1?16:1); BD.stage.position({x:BD.stage.x()-dx,y:BD.stage.y()-dy}); BD.view.changed(); } },{passive:false});

/* ---------- mini map ---------- */
const mini=$('mini'); let miniRaf=0, miniMap=null;
function drawMini(){ if(miniRaf) return; miniRaf=requestAnimationFrame(()=>{ miniRaf=0; const fs=frames(); const dpr=devicePixelRatio||1, W=180, Hh=120; if(mini.width!==W*dpr){ mini.width=W*dpr; mini.height=Hh*dpr; }
  const x=mini.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,Hh); if(!fs.length){ miniMap=null; return; }
  const k0=BD.stage.scaleX(), vw={x:-BD.stage.x()/k0,y:-BD.stage.y()/k0,width:BD.stage.width()/k0,height:BD.stage.height()/k0};
  const all=unionRect(fs), r={x:Math.min(all.x,vw.x),y:Math.min(all.y,vw.y)}; r.width=Math.max(all.x+all.width,vw.x+vw.width)-r.x; r.height=Math.max(all.y+all.height,vw.y+vw.height)-r.y;
  const k=Math.min((W-12)/r.width,(Hh-12)/r.height), ox=(W-r.width*k)/2-r.x*k, oy=(Hh-r.height*k)/2-r.y*k; miniMap={k,ox,oy};
  const cs=getComputedStyle(document.body);
  fs.forEach(f=>{ if(!f.visible()) return; const s=fsize(f), bg=frameBg(f).fill(); x.fillStyle=typeof bg==='string'&&bg?bg:'#fff'; x.fillRect(f.x()*k+ox,f.y()*k+oy,Math.max(1,s.w*k),Math.max(1,s.h*k)); x.strokeStyle=S.sel.includes(f)?'#2f7bff':'rgba(128,128,128,.6)'; x.lineWidth=1; x.strokeRect(f.x()*k+ox+.5,f.y()*k+oy+.5,Math.max(1,s.w*k-1),Math.max(1,s.h*k-1)); });
  x.strokeStyle='#ff3d7f'; x.lineWidth=1.5; x.strokeRect(vw.x*k+ox,vw.y*k+oy,vw.width*k,vw.height*k); }); }
(function(){ let on=false; const go=e=>{ if(!miniMap) return; const b=mini.getBoundingClientRect(), wx=(e.clientX-b.left-miniMap.ox)/miniMap.k, wy=(e.clientY-b.top-miniMap.oy)/miniMap.k, k=BD.stage.scaleX(); BD.view.set(BD.stage.width()/2-wx*k,BD.stage.height()/2-wy*k,k); };
  mini.addEventListener('pointerdown',e=>{ on=true; mini.setPointerCapture(e.pointerId); go(e); e.stopPropagation(); }); mini.addEventListener('pointermove',e=>{ if(on) go(e); }); mini.addEventListener('pointerup',()=>{ on=false; }); })();

/* ---------- export ---------- */
function fileBase(){ return ((BD.B&&BD.B.id)||'board')+'-'+(S.name||'board').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,40); }
function stamp(){ const d=new Date(), z=x=>String(x).padStart(2,'0'); return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes()); }
function saveBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },4000); }
const phoneShare=()=>matchMedia('(pointer:coarse)').matches&&navigator.canShare;
async function deliver(files){
  if(phoneShare()&&navigator.canShare({files})){ try{ await navigator.share({files}); return true; }catch(err){ if(err&&err.name==='AbortError') return false; } }
  for(const f of files){ saveBlob(f,f.name); await new Promise(r=>setTimeout(r,350)); } return true; }
function exportDialog(list){
  const fs=frames(); if(!fs.length){ toast('Add a frame first.'); return; }
  const pre=new Set((list&&list.length?list:(S.sel.length?[...new Set(S.sel.map(n=>isFrame(n)?n:frameOf(n)).filter(Boolean))]:fs)).map(f=>f.id()));
  if(!pre.size) fs.forEach(f=>pre.add(f.id()));
  const d=L.dialog(`<div class="dlg-body exp"><h3>Export</h3>
    <div class="exp-list">${fs.map(f=>`<label class="tg"><input type="checkbox" value="${f.id()}" ${pre.has(f.id())?'checked':''}><span dir="auto">${esc(nameOf(f))} <small>${fsize(f).w}×${fsize(f).h}</small></span></label>`).join('')}</div>
    <div class="row"><button type="button" class="link" id="exAll">All</button><button type="button" class="link" id="exNone">None</button></div>
    <span class="lbl">Format</span>${seg('fmt','png',[['png','PNG (best)'],['jpg','JPG (smaller)']])}
    <span class="lbl">Size</span>${seg('scale','2',[['1','1×'],['2','2× (sharp)'],['3','3×']])}
    <p class="small" id="exInfo"></p><div class="status" id="exSt" role="status"></div>
    <div class="dlg-actions"><button type="button" class="mini" id="exNo">Cancel</button>${navigator.clipboard&&window.ClipboardItem?'<button type="button" class="mini" id="exCopy">Copy image</button>':''}<button type="button" class="btn" id="exGo">Export</button></div></div>`,'wide');
  let fmt='png', scale=2;
  const info=()=>{ const ids=[...d.querySelectorAll('.exp-list input:checked')].map(i=>i.value), f=ids.map(id=>BD.main.findOne('#'+id)).filter(Boolean)[0]; d.querySelector('#exInfo').textContent=ids.length?(ids.length+' image'+(ids.length>1?'s':'')+(f?' · '+Math.round(fsize(f).w*scale)+' × '+Math.round(fsize(f).h*scale)+' px'+(ids.length>1?' each':''):'')):'Pick at least one frame.'; d.querySelector('#exGo').disabled=!ids.length; };
  d.addEventListener('click',e=>{ const sg=e.target.closest('[data-seg]'); if(!sg) return; d.querySelectorAll(`[data-seg="${sg.dataset.seg}"]`).forEach(b=>b.setAttribute('aria-pressed',String(b===sg))); if(sg.dataset.seg==='fmt') fmt=sg.dataset.v; else scale=+sg.dataset.v; info(); });
  d.querySelector('.exp-list').addEventListener('change',info); d.querySelector('#exAll').onclick=()=>{ d.querySelectorAll('.exp-list input').forEach(i=>i.checked=true); info(); }; d.querySelector('#exNone').onclick=()=>{ d.querySelectorAll('.exp-list input').forEach(i=>i.checked=false); info(); };
  d.querySelector('#exNo').onclick=()=>d.close(); info();
  const run=async copy=>{ const ids=[...d.querySelectorAll('.exp-list input:checked')].map(i=>i.value); const st=d.querySelector('#exSt'); d.querySelectorAll('button').forEach(b=>b.disabled=true); const files=[]; let low=false;
    try{ for(let i=0;i<ids.length;i++){ const f=BD.main.findOne('#'+ids[i]); st.textContent='Making '+(i+1)+' of '+ids.length+'…'; await new Promise(r=>setTimeout(r,30));
        const res=await BD.exportFrame(f,{type:fmt==='jpg'?'image/jpeg':'image/png',scale}); if(res.scale<scale) low=true;
        files.push(new File([res.blob],fileBase()+'-'+(nameOf(f).replace(/[^\p{L}\p{N}]+/gu,'-').toLowerCase().slice(0,30)||'frame')+'-'+stamp()+(ids.length>1?'-'+(i+1):'')+'.'+(fmt==='jpg'?'jpg':'png'),{type:res.blob.type})); }
      if(copy){ await navigator.clipboard.write([new ClipboardItem({[files[0].type]:files[0]})]); d.close(); toast('Copied. Paste it anywhere.'); return; }
      d.close(); await deliver(files); toast(files.length>1?files.length+' images saved.':'Image saved.'+(low?' (Saved a bit smaller: this device can\'t make it that big.)':''));
    }catch(err){ st.textContent=err.message||'Could not export.'; d.querySelectorAll('button').forEach(b=>b.disabled=false); } };
  d.querySelector('#exGo').onclick=()=>run(false); const cp=d.querySelector('#exCopy'); if(cp) cp.onclick=()=>{ if(fmt==='jpg'){ fmt='png'; } run(true); };
}
async function exportSel(){ if(!S.sel.length) return; if(S.sel.length===1&&isFrame(S.sel[0])){ exportDialog([S.sel[0]]); return; }
  try{ toast('Exporting…'); const res=await BD.exportSelection({scale:2}); const f=new File([res.blob],fileBase()+'-selection-'+stamp()+'.png',{type:'image/png'}); await deliver([f]); toast('Saved with a see-through background.'); }catch(err){ toast(err.message); } }
$('exportB').onclick=()=>exportDialog();

/* ---------- present ---------- */
let pIdx=0;
async function present(){ const fs=frames().filter(f=>f.visible()); if(!fs.length){ toast('Add a frame first.'); return; } const sel=S.sel[0]&&(isFrame(S.sel[0])?S.sel[0]:frameOf(S.sel[0])); pIdx=Math.max(0,fs.indexOf(sel)); BD.select([]); $('present').hidden=false; try{ await document.documentElement.requestFullscreen(); }catch(_){} showSlide(); }
function showSlide(){ const fs=frames().filter(f=>f.visible()); if(!fs.length) return; pIdx=(pIdx+fs.length)%fs.length; const f=fs[pIdx], s=fsize(f), k=Math.min(innerWidth*(devicePixelRatio||1)/s.w,innerHeight*(devicePixelRatio||1)/s.h,2);
  const c=BD.renderFrame(f,k); const img=$('presentImg'); if(img.src) URL.revokeObjectURL(img.src); c.toBlob(b=>{ img.src=URL.createObjectURL(b); c.width=c.height=0; }); $('pNum').textContent=(pIdx+1)+' / '+fs.length; }
function closePresent(){ $('present').hidden=true; if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }
$('presentB').onclick=present; $('pPrev').onclick=()=>{ pIdx--; showSlide(); }; $('pNext').onclick=()=>{ pIdx++; showSlide(); }; $('pClose').onclick=closePresent;
$('presentImg').onclick=()=>{ pIdx++; showSlide(); };
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement&&!$('present').hidden) $('present').hidden=true; });

/* ---------- shortcuts ---------- */
function shortcuts(){ const rows=[['Move / select','V'],['Hand (pan)','H or hold Space'],['Frame','F'],['Rectangle','R'],['Ellipse','O'],['Triangle','Y'],['Star','S'],['Line / arrow','L / Shift+L'],['Draw','P'],['Text','T'],['Add photos','I'],
  ['Undo / redo',mod+'+Z / '+mod+'+Shift+Z'],['Copy / cut / paste',mod+'+C / X / V'],['Duplicate',mod+'+D or Alt+drag'],['Delete','Delete'],['Select all',mod+'+A'],['Group / ungroup',mod+'+G / '+mod+'+Shift+G'],
  ['Forward / backward',mod+'+] / '+mod+'+['],['To front / back',mod+'+Shift+] / ['],['Lock / hide',mod+'+Shift+L / H'],['Flip',"Shift+H / Shift+V"],['Copy / paste style',mod+'+Alt+C / V'],['Nudge','Arrows (Shift = 10)'],
  ['Zoom','Pinch, '+mod+'+scroll, '+mod+' + / −'],['Fit all / selection / 100%','Shift+1 / 2 / 0'],['Edit text / open group','Enter or double-click'],['Pick inside a group',mod+'+click'],['Don’t snap while moving','Hold '+mod],['Measure distances','Hold Alt and point'],['Straight lines, squares','Hold Shift'],['Export',mod+'+E'],['Save now',mod+'+S']];
  const d=L.dialog(`<div class="dlg-body"><h3>Shortcuts</h3><dl class="keys">${rows.map(([a,b])=>`<dt>${esc(a)}</dt><dd><kbd>${esc(b)}</kbd></dd>`).join('')}</dl><div class="dlg-actions"><button type="button" class="btn" id="kOk">Done</button></div></div>`,'wide'); d.querySelector('#kOk').onclick=()=>d.close(); }

/* ---------- keyboard ---------- */
const typing=e=>{ const t=e.target; if(!t) return false; if(t.isContentEditable||/^(TEXTAREA|SELECT)$/.test(t.tagName)) return true; return t.tagName==='INPUT'&&/^(text|number|search|email|password|url|tel)$/.test(t.type||'text'); };
window.addEventListener('keydown',e=>{
  if(!$('present').hidden){ if(e.key==='ArrowRight'||e.key===' '){ pIdx++; showSlide(); } if(e.key==='ArrowLeft'){ pIdx--; showSlide(); } if(e.key==='Escape') closePresent(); e.preventDefault(); return; }
  if(crop){ if(e.key==='Escape'||e.key==='Enter'){ e.preventDefault(); endCrop(); } return; }
  if(typing(e)||document.querySelector('dialog[open]')) return;
  const c=e.ctrlKey||e.metaKey, k=e.key, K=k.length===1?k.toLowerCase():k;
  if(k==='Alt'){ e.preventDefault(); BD.setAlt(true); return; }
  if(k===' '){ e.preventDefault(); if(!e.repeat) BD.setSpace(true); return; }
  if(c&&K==='z'){ e.preventDefault(); e.shiftKey?BD.redo():BD.undo(); return; }
  if(c&&K==='y'){ e.preventDefault(); BD.redo(); return; }
  if(c&&e.altKey&&K==='c'){ e.preventDefault(); BD.act.copyStyle(); return; }
  if(c&&e.altKey&&K==='v'){ e.preventDefault(); BD.act.pasteStyle(); return; }
  if(c&&K==='d'){ e.preventDefault(); BD.act.duplicate(); return; }
  if(c&&K==='a'){ e.preventDefault(); BD.act.selectAll(); return; }
  if(c&&K==='g'){ e.preventDefault(); e.shiftKey?BD.act.ungroup():BD.act.group(); return; }
  if(c&&e.shiftKey&&K==='l'){ e.preventDefault(); BD.act.lock(); return; }
  if(c&&e.shiftKey&&K==='h'){ e.preventDefault(); BD.act.hide(); return; }
  if(c&&(k===']'||k==='}')){ e.preventDefault(); BD.act.order(e.shiftKey?'front':'up'); return; }
  if(c&&(k==='['||k==='{')){ e.preventDefault(); BD.act.order(e.shiftKey?'back':'down'); return; }
  if(c&&(k==='='||k==='+')){ e.preventDefault(); BD.view.zoomBy(1.25); return; }
  if(c&&(k==='-'||k==='_')){ e.preventDefault(); BD.view.zoomBy(.8); return; }
  if(c&&k==='0'){ e.preventDefault(); BD.view.zoomAt(1,{x:BD.stage.width()/2,y:BD.stage.height()/2}); return; }
  if(c&&K==='s'){ e.preventDefault(); BD.saveNow().then(()=>toast('Saved on this device.')); return; }
  if(c&&K==='e'){ e.preventDefault(); exportDialog(); return; }
  if(c) return;   // let the browser handle copy/cut/paste events below
  if(e.shiftKey&&(k==='!'||e.code==='Digit1')){ e.preventDefault(); BD.view.fitAll(); return; }
  if(e.shiftKey&&(k==='@'||e.code==='Digit2')){ e.preventDefault(); BD.view.fitSel(); return; }
  if(e.shiftKey&&(k===')'||e.code==='Digit0')){ e.preventDefault(); BD.view.zoomAt(1,{x:BD.stage.width()/2,y:BD.stage.height()/2}); return; }
  if(e.shiftKey&&K==='h'){ BD.act.flip('x'); return; }
  if(e.shiftKey&&K==='v'){ BD.act.flip('y'); return; }
  if(k==='Delete'||k==='Backspace'){ e.preventDefault(); BD.act.del(); return; }
  if(k==='Escape'){ closeMenu(); closePop(); if(S.tool!=='select'){ BD.setTool('select'); return; } if(S.entered){ const g=S.entered; S.entered=null; BD.select([g]); return; } BD.select([]); return; }
  if(k==='Enter'){ const n=S.sel[0]; if(!n) return; e.preventDefault(); if(kind(n)==='text') BD.startEdit(n); else if(kind(n)==='group'){ S.entered=n; BD.select(items(n)); } else if(isFrame(n)) BD.select(items(n).filter(x=>!isLocked(x))); return; }
  if(k.startsWith('Arrow')){ e.preventDefault(); const s=e.shiftKey?10:1; BD.act.nudge(k==='ArrowLeft'?-s:k==='ArrowRight'?s:0,k==='ArrowUp'?-s:k==='ArrowDown'?s:0); return; }
  if(k==='?'){ shortcuts(); return; }
  const map={v:'select',h:'hand',f:'frame',a:'frame',r:'rect',o:'ellipse',y:'poly',s:'star',l:e.shiftKey?'arrow':'line',p:'pen',t:'text'};
  if(K==='i'){ $('pickImg').click(); return; }
  if(map[K]){ BD.setTool(map[K]); }
});
window.addEventListener('keyup',e=>{ if(e.key===' ') BD.setSpace(false); if(e.key==='Alt'){ BD.setAlt(false); e.preventDefault(); } });
window.addEventListener('blur',()=>{ BD.setSpace(false); BD.setAlt(false); });
document.addEventListener('copy',e=>{ if(typing(e)||!S.sel.length||BD.editing()) return; const t=BD.copy(); if(t){ e.clipboardData.setData('text/plain',t); e.preventDefault(); } });
document.addEventListener('cut',e=>{ if(typing(e)||!S.sel.length||BD.editing()) return; const t=BD.copy(true); if(t){ e.clipboardData.setData('text/plain',t); e.preventDefault(); } });
document.addEventListener('paste',async e=>{ if(typing(e)||BD.editing()) return; const dt=e.clipboardData; if(!dt) return; e.preventDefault();
  const files=[...dt.files].filter(L.isPhotoFile); if(files.length){ await BD.addPhotos(files); paintAdd(); return; }
  const t=dt.getData('text/plain'); if(t&&t.startsWith('board-clip:')){ try{ await BD.paste(JSON.parse(t.slice(11))); }catch(_){ } return; }
  if(t&&t.trim()){ const f=BD.targetFrame(); const n=BD.make.text(t.trim().slice(0,2000),{fontSize:f?Math.round(fsize(f).w*.06):64,fontFamily:BD.bodyFont(),fontStyle:'800'}); BD.place(n); return; }
  BD.paste(); });

/* save before leaving */
window.addEventListener('beforeunload',()=>{ BD.saveNow(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden) BD.saveNow(); });

/* ---------- templates (built from the brand kit; wording only from the approved lists) ---------- */
BD.buildTemplate=async function(id,select){
  const B=BD.B||{}, ph=B.phrases||{}, c=BD.brandColors(), D=BD.displayFont(), Bf=BD.bodyFont();
  const head=(ph.headlines||[])[0]||'Your headline', small=(ph.small||[])[0]||'A short line', btn=(ph.buttons||[])[0]||'Learn more', rest=(ph.restock||[])[0]||head;
  await Promise.all([BD.ensureFont(D,''),BD.ensureFont(Bf,'800')]);
  const fs=frames(); let x0=0, y0=0; if(fs.length){ const r=unionRect(fs); x0=Math.round(r.x+r.width+160); y0=Math.round(r.y); }
  const made=[];
  const asset=async(aid,f,w,cx,cy,o)=>{ const a=L.brandAssets().find(x=>x.id===aid); if(!a) return null; const im=await BD.getImg('brand:'+aid); if(!im) return null; const h=Math.round(im.h*w/im.w); const n=BD.make.image('brand:'+aid,w,h,'asset'); n.setAttrs(Object.assign({x:Math.round(cx-w/2),y:Math.round(cy-h/2),label:a.label},o||{})); f.add(n); BD.applyFx(n); return n; };
  const text=(f,t,o)=>{ const n=BD.make.text(t,Object.assign({fontFamily:D},o)); f.add(n); if(o.cx!=null){ const w=n.width(); n.x(Math.round(o.cx-w/2)); } return n; };
  const pill=(f,t,cx,y,w,bg,fg)=>{ const h=Math.round(w*.2); const r=new Konva.Rect({id:U.uid(),name:'obj',kind:'rect',x:Math.round(cx-w/2),y,width:w,height:h,cornerRadius:h/2,fill:bg,label:'Button'}); f.add(r);
    const n=BD.make.text(t,{fontFamily:Bf,fontStyle:'800',fontSize:Math.round(h*.42),fill:fg,width:w,autoW:false,x:Math.round(cx-w/2),align:'center'}); n.y(Math.round(y+(h-n.height())/2)); f.add(n); return r; };
  if(id==='headline'){ const f=BD.makeFrame(x0,y0,1080,1920,{label:'Headline story',fill:c.cream}); made.push(f);
    f.add(new Konva.Ellipse({id:U.uid(),name:'obj',kind:'ellipse',x:540,y:1060,radiusX:430,radiusY:430,fill:c.blob,label:'Soft circle'}));
    await asset('cans-pair-shadow',f,760,540,1080);
    text(f,head,{fontSize:170,fill:c.ink,y:250,cx:540}); text(f,small,{fontFamily:Bf,fontStyle:'800',fontSize:56,fill:c.brown,y:470,cx:540});
    pill(f,btn,540,1560,560,c.ink,c.paper); await asset('logo',f,300,540,1800); }
  if(id==='product'){ const f=BD.makeFrame(x0,y0,1080,1350,{label:'Product post',fill:c.ink}); made.push(f); const bg=frameBg(f); bg.setAttrs({fillType:'radial',gradA:'#3a2a1f',gradB:c.ink}); BD.applyFill(bg);
    await asset('cans-pair-shadow',f,700,540,760); text(f,head,{fontSize:140,fill:c.accent,y:110,cx:540}); text(f,small,{fontFamily:Bf,fontStyle:'800',fontSize:48,fill:c.paper,y:1150,cx:540});
    const lg=await asset('logo',f,220,540,1270); if(lg){ lg.setAttr('fx',{invert:1}); BD.applyFx(lg); } }
  if(id==='square'){ const f=BD.makeFrame(x0,y0,1080,1080,{label:'Square promo',fill:c.accent}); made.push(f);
    text(f,rest,{fontSize:150,fill:c.ink,y:90,cx:540}); await asset('cans-pair',f,560,540,600);
    const fl=B.flavours||[]; fl.slice(0,2).forEach((v,i)=>pill(f,v.name,fl.length>1?(i?760:320):540,900,360,v.bg,v.fg)); }
  if(id==='carousel'){ for(let i=0;i<3;i++){ const f=BD.makeFrame(x0+i*1080,y0,1080,1350,{label:'Slide '+(i+1),fill:c.cream}); made.push(f); }
    const [a,b,d]=made; text(a,head,{fontSize:160,fill:c.ink,y:480,cx:540}); text(a,small,{fontFamily:Bf,fontStyle:'800',fontSize:52,fill:c.brown,y:720,cx:540});
    const ph1=new Konva.Rect({id:U.uid(),name:'obj',kind:'rect',x:90,y:90,width:900,height:1170,cornerRadius:40,fill:c.blob,label:'Photo spot (drop a photo, then Fill the frame)'}); b.add(ph1);
    text(b,'+',{fontFamily:Bf,fontSize:160,fill:c.brown,y:560,cx:540});
    await asset('cans-pair-shadow',d,600,540,560); pill(d,btn,540,1000,560,c.ink,c.paper); await asset('logo',d,240,540,1230); }
  if(id==='menu'){ const f=BD.makeFrame(x0,y0,1920,1080,{label:'Landscape banner',fill:c.cream}); made.push(f);
    f.add(new Konva.Rect({id:U.uid(),name:'obj',kind:'rect',x:1060,y:0,width:860,height:1080,fill:c.blob,label:'Panel'}));
    await asset('cans-pair-shadow',f,700,1490,560); text(f,head,{fontSize:180,fill:c.ink,y:300,cx:520}); text(f,small,{fontFamily:Bf,fontStyle:'800',fontSize:60,fill:c.brown,y:560,cx:520}); pill(f,btn,520,720,560,c.ink,c.paper); }
  made.forEach(f=>frameBg(f).moveToBottom());
  BD.paintUI(); if(select){ BD.select(made); BD.view.fitSel(); BD.changed(); } paintLayersSoon(); drawMini();
  return made;
};

/* ---------- start ---------- */
function paintAll(){ paintLayers(); paintProps(); drawMini(); syncUndo(); }
if(innerWidth>=900){ $('left').classList.add('open'); $('right').classList.add('open'); }
BD.start().then(()=>{ paintAll(); $('zoomB').textContent=Math.round(BD.stage.scaleX()*100)+'%'; }).catch(err=>{ console.error(err); toast('Could not open the board: '+(err.message||err)); });
BD.ui_={paintProps,paintLayers,paintAdd,exportDialog,present,shortcuts,openMenu,colorPop};
})();

/* Create: the tool that can make anything. The Board editor (lab/board*.js) inside a Studio tool page:
   sizes (story, post, square, carousel, highlight cover), every element, brand templates and team templates,
   photo spots, pages, drafts in Continue editing, and saving like every tool (2× lossless PNG; team designs and templates).
   Brand-agnostic: words, colours, fonts, pictures and templates come from the brand kit. */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S, UI=BD.UI, CR=window.CR, esc=L.esc, $=id=>document.getElementById(id);
const {kind,isFrame,frames,items,fsize,frameOf}=U;
const TOOL='create', TITLE='Create';
let B=null;
const st={ready:false,dirty:false,design:null,base:null,draftKey:null,blobs:new Map(),paths:new Map(),thumbT:0,capWarned:false,pickTarget:null,leaving:false,saving:false};
const isPhone=()=>innerWidth<900;
const toast=(t,ms)=>UI.toast(t,ms);
const tick=ms=>new Promise(r=>setTimeout(r,ms||0));

/* ---------- sizes ---------- */
const SIZES=[
  {id:'story',label:'Story',w:1080,h:1920,sub:'1080×1920'},
  {id:'post',label:'Post',w:1080,h:1350,sub:'1080×1350'},
  {id:'square',label:'Square',w:1080,h:1080,sub:'1080×1080'},
  {id:'carousel',label:'Carousel',w:1080,h:1350,pages:3,sub:'3 slides'},
  {id:'highlight',label:'Highlight',w:1080,h:1080,round:true,sub:'cover'}
];
const sizeOf=id=>SIZES.find(s=>s.id===id)||SIZES[0];
const pvStyle=(w,h,m)=>{ m=m||40; const k=m/Math.max(w,h); return `width:${Math.round(w*k)}px;height:${Math.round(h*k)}px`; };
function rightOfAll(gap){ const fs=frames(); if(!fs.length) return {x:0,y:0}; const r=U.unionRect(fs); return {x:Math.round(r.x+r.width+(gap||120)),y:Math.round(fs[0].y())}; }
function makePages(size,at){ const s=sizeOf(size), n=s.pages||1, out=[]; let x=at?at.x:0; const y=at?at.y:0;
  for(let i=0;i<n;i++){ const f=BD.makeFrame(x,y,s.w,s.h,{label:n>1?'Slide '+(frames().length+1):s.label,fill:'#FFFFFF'}); if(s.round) f.setAttr('round',1); out.push(f); x+=s.w+120; }
  return out; }
const isBlank=()=>frames().length<=1&&frames().every(f=>items(f).length===0);

/* ---------- a highlight cover shows the circle Instagram keeps ---------- */
const roundG=new Konva.Group({listening:false}); BD.ui.add(roundG);
function paintRound(){ roundG.destroyChildren(); frames().forEach(f=>{ if(!f.getAttr('round')||!f.visible()) return; const s=fsize(f), r=Math.min(s.w,s.h)/2;
  roundG.add(new Konva.Circle({x:f.x()+s.w/2,y:f.y()+s.h/2,radius:r,stroke:'#2f7bff',strokeWidth:1.5,dash:[8,6],strokeScaleEnabled:false,listening:false})); }); BD.ui.batchDraw(); }
['view','doc','geom','changed','opened'].forEach(n=>BD.on(n,()=>{ paintRound(); paintPages(); }));

/* ---------- the sheet (Templates, Save, Start) ---------- */
let sheetName=null, sheetClose=null;
function openSheet(name,title,html,onClose){ closeSheet(true); sheetName=name; sheetClose=onClose||null; $('crSheetT').textContent=title; $('crSheetB').innerHTML=html; $('crSheet').hidden=false; $('crScrim').hidden=false; $('crSheet').dataset.name=name;
  if(isPhone()){ UI.panel('L',false); UI.panel('R',false); } syncBar(); setTimeout(()=>{ const h=$('crSheetT'); h.setAttribute('tabindex','-1'); h.focus({preventScroll:true}); },40); return $('crSheetB'); }
function closeSheet(quiet){ if($('crSheet').hidden) return; $('crSheet').hidden=true; $('crScrim').hidden=true; const f=sheetClose; sheetName=null; sheetClose=null; $('crSheetB').innerHTML=''; syncBar(); if(f&&!quiet) f(); }
$('crSheetX').onclick=()=>closeSheet(); $('crScrim').onclick=()=>{ if(!st.saving) closeSheet(); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('crSheet').hidden&&!st.saving){ e.preventDefault(); e.stopPropagation(); closeSheet(); } },true);

/* ---------- bottom bar (phone) ---------- */
function syncBar(){ const L1=$('left').classList.contains('open'), lay=L1&&!$('layersPane').hidden, add=L1&&!$('addPane').hidden;
  document.querySelectorAll('#crBar [data-cr]').forEach(b=>{ const k=b.dataset.cr; b.classList.toggle('on',(k==='layers'&&lay)||(k==='add'&&add)||(k==='templates'&&sheetName==='templates')||(k==='save'&&sheetName==='save')&&k!=='save'); }); }
new MutationObserver(syncBar).observe($('left'),{attributes:true,attributeFilter:['class']});
$('crBar').addEventListener('click',e=>{ const b=e.target.closest('[data-cr]'); if(!b) return; const k=b.dataset.cr; if(BD.editing()) BD.commitEdit();
  const lOpen=$('left').classList.contains('open');
  if(k==='add'){ if(lOpen&&!$('addPane').hidden){ UI.panel('L',false); return; } closeSheet(true); UI.openAssets(); }
  if(k==='layers'){ if(lOpen&&!$('layersPane').hidden){ UI.panel('L',false); return; } closeSheet(true); UI.panel('L',true); $('tabLayers').click(); }
  if(k==='text') addText();
  if(k==='photo') photoTapped();
  if(k==='templates') openTemplates();
  if(k==='save') openSave();
  syncBar(); });
$('crTplTop').onclick=()=>openTemplates(); $('crSaveTop').onclick=()=>openSave();
/* a "Done" on each panel when it's a bottom sheet */
['left','right'].forEach(side=>{ const tabs=$(side).querySelector('.bp-tabs'); if(!tabs) return; const b=document.createElement('button'); b.type='button'; b.className='bp-close'; b.textContent='Done'; b.setAttribute('aria-label','Close'); b.onclick=()=>UI.panel(side==='left'?'L':'R',false); tabs.appendChild(b); });

/* ---------- adding things ---------- */
async function addText(){ const f=BD.targetFrame(), fw=f?fsize(f).w:1080; await BD.ensureFont(BD.displayFont(),'');
  const n=BD.make.text(CR.write(),{fontFamily:BD.displayFont(),fontSize:Math.round(fw*.11),fill:CR.colors().ink}); BD.place(n,{frame:f}); BD.startEdit(n,true); }
function photoTapped(){ const n=S.sel[0]; st.pickTarget=CR.isSlot(n)?n:null; $('crPick').click(); }
function pickInto(slot){ st.pickTarget=slot; $('crPick').click(); }
$('crPick').addEventListener('change',async e=>{ const files=[...e.target.files].filter(L.isPhotoFile); e.target.value=''; if(!files.length) return;
  let target=st.pickTarget; st.pickTarget=null; const rest=[]; BD.busy&&BD.busy(files.length>1?'Adding '+files.length+' photos…':'Adding the photo…');
  try{ for(const file of files){ const af=BD.activeFrame&&BD.activeFrame(); const slot=target&&target.getStage()?target:(CR.emptySlot(af)||CR.emptySlot(null)); target=null;
      if(slot){ try{ await CR.fillSlot(slot,file); }catch(_){ toast('Could not open '+(file.name||'that photo')+'.'); } } else rest.push(file); } }
  finally{ BD.busy&&BD.busy(null); }
  if(rest.length) await BD.addPhotos(rest); });

/* Elements and icons in the Add panel */
BD.extraCats=[{id:'elements',label:'Elements',icon:UI.svg('<rect x="3" y="4" width="18" height="6" rx="3"/><circle cx="7" cy="17" r="3"/><path d="M13 15h8M13 19h5"/>'),sel:'[data-crel]',
  body(q,m){ const list=CR.ELEMENTS.filter(e=>(!e.when||e.when())&&(m(e.label)||m('element')));
    return list.length?`<div class="cr-els">${list.map(e=>`<button type="button" class="cr-el" data-crel="${e.id}" title="${esc(e.label)}"><span class="im" data-crprev="${e.id}"></span><span>${esc(e.label)}</span></button>`).join('')}</div><p class="hint">Each one is normal layers you can move, size, recolour or ungroup. Double-tap to change the words.</p>`:''; },
  async add(el){ await CR.addElement(el.dataset.crel); },
  after(root){ root.querySelectorAll('[data-crprev]').forEach(sp=>{ const id=sp.dataset.crprev, e=CR.element(id);
    if(e&&e.asset){ const a=L.brandAssets().find(x=>x.id===e.asset); if(a) sp.innerHTML=`<img alt="" src="${L.assetUrl(a)}">`; return; }
    const u=CR.preview(id); if(u) sp.innerHTML=`<img alt="" src="${u}">`; }); }}];

/* quick bar: photo spots and smart elements */
function textOf(n){ if(!n) return null; if(kind(n)==='text') return n; if(n.getAttr('el')&&n.find){ const t=n.find(c=>c.getAttr('role')==='text'&&kind(c)==='text')[0]; return t||null; } return null; }
UI.qbarExtra=list=>{ if(list.length!==1) return ''; const n=list[0];
  if(CR.isSlot(n)) return UI.qb('crSlot',UI.IC.image+'<span>Add photo</span>','Add a photo here').replace('class="qb"','class="qb cr-q"');
  if(n.getAttr('el')&&textOf(n)) return UI.qb('crEdit',UI.IC.text+'<span>Words</span>','Change the words').replace('class="qb"','class="qb cr-q"');
  return ''; };
UI.qbarAct=a=>{ const n=S.sel[0]; if(a==='crSlot'&&CR.isSlot(n)) pickInto(n); if(a==='crEdit'){ const t=textOf(n); if(t) BD.startEdit(t); } };
/* double-tap (phone) or double-click a smart element: edit its words straight away */
let lastTap={t:0,x:0,y:0}, handledAt=0;
function onDouble(){ const n=S.sel[0]; if(!n||BD.editing()) return false; if(CR.isSlot(n)){ pickInto(n); return true; } if(n.getAttr('el')){ const t=textOf(n); if(t){ BD.startEdit(t); return true; } } return false; }
BD.wrap.addEventListener('pointerup',e=>{ if(e.pointerType==='mouse'||e.target.closest('.qbar,.ed-text,.b-corner')) return; const now=Date.now(), near=Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<34;
  if(now-lastTap.t<340&&near){ lastTap.t=0; setTimeout(()=>{ if(onDouble()) handledAt=Date.now(); },0); } else lastTap={t:now,x:e.clientX,y:e.clientY}; });
BD.wrap.addEventListener('dblclick',e=>{ if(Date.now()-handledAt<700){ e.stopImmediatePropagation(); return; } const n=S.sel[0]; if(n&&(n.getAttr('el')||CR.isSlot(n))&&!e.target.closest('.ed-text')){ if(onDouble()){ e.stopImmediatePropagation(); e.preventDefault(); } } },true);

/* ---------- pages strip ---------- */
function paintPages(){ const el=$('crPages'); if(!el) return; const fs=frames().filter(f=>f.visible()); if(!st.ready||!fs.length){ el.hidden=true; return; }
  const cur=BD.activeFrame&&BD.activeFrame(); el.hidden=false;
  const html=fs.map((f,i)=>`<button type="button" class="cr-pg" data-pg="${f.id()}" aria-current="${f===cur}" aria-label="Page ${i+1}">${i+1}</button>`).join('')+`<button type="button" class="cr-pg add" data-pg="+" aria-label="Add a page" title="Add a page">+</button>`;
  if(el.innerHTML!==html) el.innerHTML=html; }
$('crPages').addEventListener('click',e=>{ const b=e.target.closest('[data-pg]'); if(!b) return; if(b.dataset.pg==='+'){ addPage(); return; } const f=BD.main.findOne('#'+b.dataset.pg); if(f){ BD.select([f]); BD.view.fitSel(); } });
function addPage(){ const cur=BD.activeFrame&&BD.activeFrame(), s=cur?fsize(cur):{w:1080,h:1920}, at=rightOfAll();
  const f=BD.makeFrame(at.x,at.y,s.w,s.h,{label:'Page '+(frames().length+1),fill:cur&&typeof U.frameBg(cur).fill()==='string'?U.frameBg(cur).fill():'#FFFFFF'}); if(cur&&cur.getAttr('round')) f.setAttr('round',1);
  BD.paintUI(); BD.select([f]); BD.view.fitSel(); BD.changed(); BD.emitDoc(); UI.paintLayersSoon(); }
BD.on('select',()=>paintPages());

/* ---------- templates ---------- */
const TH=new Map(); let thumbChain=Promise.resolve();
const thKey=def=>'cr:th:'+(B&&B.id)+':'+def.id+':'+JSON.stringify(def).length;
function tplThumb(def){ if(TH.has(def.id)) return Promise.resolve(TH.get(def.id));
  try{ const c=sessionStorage.getItem(thKey(def)); if(c){ TH.set(def.id,c); return Promise.resolve(c); } }catch(_){}
  const p=thumbChain.then(async()=>{ if(TH.has(def.id)) return TH.get(def.id); let url=null, made=[];
    try{ made=await CR.buildTemplate(def.id,{at:{x:-200000,y:-200000}}); const f=made[0]; if(f){ const s=fsize(f), c=BD.renderFrame(f,260/s.w); url=c.toDataURL('image/jpeg',.82); c.width=c.height=0; } }catch(err){ console.warn(err); }
    made.forEach(f=>f.destroy()); BD.main.batchDraw(); TH.set(def.id,url); try{ if(url) sessionStorage.setItem(thKey(def),url); }catch(_){} return url; });
  thumbChain=p.catch(()=>{}); return p; }
function sizeRow(start){ return `<div class="cr-sizes" role="group" aria-label="${start?'Start blank':'Add a blank page'}">${SIZES.map(s=>`<button type="button" class="cr-size" data-size="${s.id}"><span class="pv${s.round?' round':''}${s.pages?' multi':''}" style="${pvStyle(s.w,s.h,s.round?34:40)}"></span>${esc(s.label)}<small>${esc(s.sub)}</small></button>`).join('')}</div>`; }
async function openTemplates(opt){ opt=opt||{}; const start=!!opt.start, list=CR.templates();
  const body=openSheet('templates',start?'What are you making?':'Templates',
    `<span class="lbl">${start?'Start blank':'Add a blank page'}</span>${sizeRow(start)}
     <span class="lbl">Templates</span>${list.length?`<div class="cr-tpls" id="crTpls">${list.map(d=>{ const s=CR.templateSize(d); return `<button type="button" class="cr-tpl" data-tpl="${esc(d.id)}"><span class="th ${esc(d.size||'story')} loading">${s.pages>1?`<span class="n">${s.pages}</span>`:''}</span>${esc(d.label)}${d.note?`<small>${esc(d.note)}</small>`:''}</button>`; }).join('')}</div>`:'<div class="cr-empty">This brand kit has no templates yet.</div>'}
     <span class="lbl">Team templates</span><div id="crTeamT"><div class="cr-empty">Looking…</div></div>
     <p class="small">Templates are starting points: every word, picture and shape can be changed.</p>`);
  body.addEventListener('click',async e=>{ const sz=e.target.closest('[data-size]'), tp=e.target.closest('[data-tpl]'), tt=e.target.closest('[data-team]'), si=e.target.closest('#crTeamSign');
    if(sz){ closeSheet(true); if(start||isBlank()) startBlank(sz.dataset.size); else addBlank(sz.dataset.size); }
    if(tp) chooseMode(mode=>applyTemplate(tp.dataset.tpl,mode));
    if(tt) chooseMode(mode=>applyTeam(tt.dataset.team,mode));
    if(si){ if(await L.ensureMember('Team templates are shared with the team. Sign in to see them.')) paintTeam(); } });
  paintTeam();
  for(const d of list){ const url=await tplThumb(d); if(sheetName!=='templates') return; const th=body.querySelector(`[data-tpl="${CSS.escape(d.id)}"] .th`); if(th){ th.classList.remove('loading'); if(url) th.insertAdjacentHTML('afterbegin',`<img alt="" src="${url}">`); } } }
async function paintTeam(){ const box=$('crTeamT'); if(!box) return;
  try{ const C=await L.cloud(); if(!(await C.session())||!(await C.isMember())){ box.innerHTML='<div class="cr-empty">Templates the team saves show here. <button type="button" class="link" id="crTeamSign">Sign in</button></div>'; return; }
    const all=(await C.designs(B.id)).filter(d=>d.tool===TOOL&&d.kind==='template'); if(!$('crTeamT')) return;
    if(!all.length){ box.innerHTML='<div class="cr-empty">No team templates yet. Make a design, then in Save choose “Save as a team template”.</div>'; return; }
    const urls=await C.fileUrls(all.map(d=>d.thumb_path)).catch(()=>({}));
    box.innerHTML=`<div class="cr-tpls">${all.map(d=>`<button type="button" class="cr-tpl" data-team="${esc(d.id)}"><span class="th">${urls[d.thumb_path]?`<img alt="" src="${urls[d.thumb_path]}">`:''}</span><span dir="auto">${esc(d.name)}</span></button>`).join('')}</div>`;
  }catch(_){ box.innerHTML='<div class="cr-empty">Team templates could not load. Check the connection.</div>'; } }
/* empty design: use it straight away; otherwise ask whether to add pages or replace */
function chooseMode(run){ if(isBlank()){ closeSheet(true); run('replace'); return; }
  const d=L.dialog(`<div class="dlg-body"><h3>Use this template</h3><p class="small">Add it as new pages next to what you have, or start over with it.</p>
    <div class="dlg-actions col"><button type="button" class="btn" id="tmAdd">Add as new pages</button><button type="button" class="btn ghost" id="tmRep">Replace everything</button><button type="button" class="link" id="tmNo">Cancel</button></div></div>`);
  d.querySelector('#tmNo').onclick=()=>d.close(); d.querySelector('#tmAdd').onclick=()=>{ d.close(); closeSheet(true); run('add'); }; d.querySelector('#tmRep').onclick=()=>{ d.close(); closeSheet(true); run('replace'); }; }
function clearAll(){ BD.select([]); BD.main.destroyChildren(); BD.main.batchDraw(); }
async function applyTemplate(id,mode){ BD.busy&&BD.busy('Building the template…'); await thumbChain;
  try{ if(mode==='replace') clearAll(); const made=await CR.buildTemplate(id,mode==='replace'?{at:{x:0,y:0}}:null); afterBuild(made); }
  catch(err){ console.error(err); toast('Could not build that template.'); } finally{ BD.busy&&BD.busy(null); } }
async function applyTeam(id,mode){ BD.busy&&BD.busy('Opening the team template…');
  try{ const C=await L.cloud(); const d=await C.getDesign(id); const doc=(d.recipe||{}).doc; if(!doc) throw new Error('empty');
    if(mode==='replace') clearAll(); const at=mode==='replace'?{x:0,y:0}:rightOfAll(); const made=await addDocNodes(doc,at); afterBuild(made); }
  catch(err){ console.error(err); toast('Could not open that template.'); } finally{ BD.busy&&BD.busy(null); } }
/* put a saved design's pages on the canvas (fresh ids), the first one at `at` */
async function addDocNodes(doc,at){ const ids=new Set(); (doc.nodes||[]).forEach(o=>BD.collectImgs(o,ids)); await Promise.all([...ids].map(BD.getImg));
  const nodes=(doc.nodes||[]).map(o=>BD.rebuild(o,true)); let minX=Infinity,minY=Infinity; nodes.forEach(n=>{ minX=Math.min(minX,n.x()); minY=Math.min(minY,n.y()); });
  nodes.forEach(n=>{ BD.main.add(n); n.x(n.x()-minX+at.x); n.y(n.y()-minY+at.y); });
  await fontsOfDoc(); fixMissingPhotos(); return nodes.filter(isFrame); }
async function fontsOfDoc(){ const set=new Set(); BD.main.find('Text').forEach(t=>set.add(t.fontFamily()+'|'+t.fontStyle())); await Promise.all([...set].map(s=>{ const [f,w]=s.split('|'); return BD.ensureFont(f,w); })); BD.main.find('Text').forEach(t=>{ if(t._setTextData) t._setTextData(); }); }
/* a photo that couldn't be opened becomes an empty photo spot again */
function fixMissingPhotos(){ BD.main.find(n=>kind(n)==='image'&&!BD.IMGS.get(n.getAttr('imgId'))).forEach(n=>{ const g=CR.slotFromImage(n), p=n.getParent(), z=n.zIndex(); p.add(g); g.zIndex(z); n.destroy(); }); }
function afterBuild(made){ BD.paintUI(); BD.select([]); if(made&&made.length){ if(made.length===1) BD.view.fitRect(U.wrect(made[0]),40); else BD.view.fitRect(U.unionRect(made),40); }
  touch(); BD.changed(); BD.emitDoc(); UI.paintLayersSoon(); UI.drawMini&&UI.drawMini(); paintRound(); paintPages(); }
function startBlank(size){ clearAll(); const made=makePages(size,{x:0,y:0}); afterBuild(made); }
function addBlank(size){ const made=makePages(size,rightOfAll()); afterBuild(made); }

/* ---------- drafts: kept on this phone, listed in Continue editing ---------- */
const DKEY=()=>L.draftBase(B.id,TOOL)+':'+S.id;
/* the first real change makes this a draft (opening Create and leaving does not) */
function touch(){ if(!st.ready||st.design) return; st.dirty=true;
  if(!S.id){ const n=L.listDrafts(B.id,TOOL).length; S.id=U.uid(); history.replaceState(null,'',location.pathname+'?draft='+S.id);
    if(n>=L.DRAFT_CAP&&!st.capWarned){ st.capWarned=true; toast('You have '+(n+1)+' unfinished designs on this phone. Remove old ones in Continue editing.',6000); } }
  BD.scheduleSave(); }
BD.cfg.url=id=>location.pathname+'?draft='+id;
BD.cfg.onSave=d=>{ if(st.design||!S.id||!st.dirty) return; const key=DKEY(); st.draftKey=key;
  if(L.store(key,{board:S.id,at:Date.now(),imgs:d.imgs||[],name:S.name,pages:frames().length})===null){ toast('This phone is out of room for drafts. Remove old ones in Continue editing.',6000); return; }
  clearTimeout(st.thumbT); st.thumbT=setTimeout(draftThumb,1200); };
function draftThumb(){ const f=frames()[0]; if(!f||!st.draftKey||st.design) return; try{ const s=fsize(f), c=BD.renderFrame(f,Math.min(1,400/s.h)); L.idb.put(st.draftKey+':thumb',c.toDataURL('image/jpeg',.72)); c.width=c.height=0; }catch(_){} }
BD.on('changed',()=>{ if(!st.ready) return; const n=S.sel[0]; if(n&&CR.relayoutAround(n)){ BD.main.batchDraw(); BD.tr.forceUpdate(); } if(st.design){ syncDesignBar(); return; } touch(); });

/* ---------- photos as files (for the team) ---------- */
async function blobOf(id){ let b=st.blobs.get(id); if(!b){ try{ b=await L.idb.get('bimg:'+id); }catch(_){} }
  if(b&&/^image\/(jpeg|png|webp)$/.test(b.type)) return b;
  const im=BD.IMGS.get(id); if(!im) return b||null;   // HEIC and others: a high-quality JPEG of the photo
  const c=document.createElement('canvas'); c.width=im.w; c.height=im.h; c.getContext('2d').drawImage(im.el,0,0); const out=await L.canvasBlob(c,'image/jpeg',.95); c.width=c.height=0; return out; }
const usedImgs=doc=>[...BD.collectImgs({k:doc.nodes||[]},new Set())].filter(id=>!String(id).startsWith('brand:'));
/* a team template keeps no personal photos: each one becomes an empty photo spot */
function templateDoc(doc){ const swap=o=>{ (o.k||[]).forEach((k,i)=>{ if(k.c==='Image'&&k.a&&k.a.kind==='image'&&!String(k.a.imgId||'').startsWith('brand:')){ const n=BD.rebuild(k), g=CR.slotFromImage(n); o.k[i]=BD.toObj(g); n.destroy(); g.destroy(); } else swap(k); }); };
  doc=JSON.parse(JSON.stringify(doc)); swap({k:doc.nodes}); return doc; }
function thumbBlob(){ const f=frames()[0]; const s=fsize(f), c=BD.renderFrame(f,360/s.w); return L.canvasBlob(c,'image/jpeg',.85).finally(()=>{ c.width=c.height=0; }); }
function defaultName(){ const n=($('bName').value||'').trim(); if(n&&!/^untitled/i.test(n)) return n; const d=new Date(); return TITLE+' – '+d.getDate()+' '+d.toLocaleString('en',{month:'short'}); }

/* ---------- saving to the team (designs and templates) ---------- */
async function teamSave(o){ o=o||{}; const C=await L.cloud();
  if(!(await L.ensureMember('Saved designs go to the team, so anyone on the team can find and reuse them.'))) throw new Error('Not saved to the team: sign in first.');
  if(BD.editing()) BD.commitEdit();
  let doc=JSON.parse(BD.docJson()); const imgs0=usedImgs(doc);
  const tpl=o.kind==='template'||!(o.keep!==false&&imgs0.length), kindOut=tpl?'template':'design';
  const asNew=!!o.asNew||!st.design||(st.design.kind!==kindOut);
  if(tpl) doc=templateDoc(doc);
  const imgs=tpl?[]:imgs0, name=(o.name||'').trim()||(st.design&&!asNew?st.design.name:defaultName());
  const photos=await Promise.all(imgs.map(async id=>{ const p=st.paths.get(id); if(p&&!asNew) return {path:p}; const b=await blobOf(id); return b?{blob:b}:null; }));
  const cols=o.collections||(st.design&&!asNew?st.design.collections:[])||[];
  const id=await C.saveDesign({id:asNew?null:st.design.id,brand:B.id,tool:TOOL,name,kind:kindOut,recipe:{v:1,kind:'board',doc,imgs},photos,thumb:await thumbBlob(),collections:cols});
  if(tpl&&o.kind==='template'&&st.design==null) return {id,name,kind:kindOut,keepEditing:true};   // a template saved from a draft: keep working on the draft
  const fresh=await C.getDesign(id); (fresh.recipe.photoPaths||[]).forEach((p,i)=>{ if(p&&imgs[i]) st.paths.set(imgs[i],p); });
  for(const im of imgs){ if(!st.blobs.has(im)){ const b=await blobOf(im); if(b) st.blobs.set(im,b); } }   // keep the photos in memory: the draft copy goes
  if(st.draftKey){ L.removeDraft(st.draftKey); st.draftKey=null; } S.id=null; st.dirty=false;
  st.design={id,name,kind:kindOut,collections:cols}; markSaved(); history.replaceState(null,'',location.pathname+'?design='+id); syncDesignBar();
  return {id,name,kind:kindOut}; }
/* a saved design you're editing: leaving with changes asks Update / Discard */
const curJson=()=>{ const d=JSON.parse(BD.docJson()); delete d.name; return JSON.stringify(d); };
function markSaved(){ st.base=curJson(); }
const designDirty=()=>!!st.design&&st.base!=null&&curJson()!==st.base;
function syncDesignBar(){ const el=$('bSaved'); if(!el) return; if(st.design){ el.textContent=designDirty()?'Changes not saved to the team':(st.design.kind==='template'?'Team template':'Saved to the team'); el.classList.toggle('on',!designDirty()); } }
function leavePrompt(href){ const d=L.dialog(`<div class="dlg-body"><h3 dir="auto">Save your changes to “${esc(st.design.name)}”?</h3><p class="small">You changed this saved design. Update it for the team, or leave it as it was.</p>
    <div class="status" id="lvSt" role="status"></div>
    <div class="dlg-actions col"><button type="button" class="btn" id="lvUpd">Update “${esc(st.design.name)}”</button><button type="button" class="btn ghost" id="lvDis">Discard changes</button><button type="button" class="link" id="lvKeep">Keep editing</button></div></div>`);
  d.querySelector('#lvKeep').onclick=()=>d.close();
  d.querySelector('#lvDis').onclick=()=>{ st.leaving=true; location.href=href; };
  d.querySelector('#lvUpd').onclick=async()=>{ d.querySelectorAll('button').forEach(b=>b.disabled=true); d.querySelector('#lvSt').textContent='Updating…';
    try{ await teamSave({name:st.design.name,kind:st.design.kind}); st.leaving=true; location.href=href; }catch(err){ d.querySelector('#lvSt').textContent=err.message; d.querySelectorAll('button').forEach(b=>b.disabled=false); } }; }
document.querySelector('.bt-back').addEventListener('click',e=>{ if(designDirty()){ e.preventDefault(); leavePrompt(e.currentTarget.href); } else if(S.id) BD.saveNow(); });
addEventListener('beforeunload',e=>{ if(!st.leaving&&designDirty()){ e.preventDefault(); e.returnValue=''; } });
addEventListener('pagehide',()=>{ if(S.id&&!st.design) BD.saveNow(); });

/* opening a saved design (or team template) by its id */
async function openDesign(id,ready){
  if(!(await L.ensureMember('This design is saved with the team. Sign in to open it.'))) return false;
  BD.busy&&BD.busy('Opening the saved design…');
  try{ const C=await L.cloud(); const d=await C.getDesign(id); if(d.tool!==TOOL){ location.replace(L.toolPage(d.tool)+'?design='+id+(ready?'&go=1':'')); return 'away'; }
    const r=d.recipe||{}, imgs=r.imgs||[], paths=r.photoPaths||[];
    if(d.kind!=='template') await Promise.all(imgs.map(async(img,i)=>{ const p=paths[i]; if(!p) return; try{ const blob=await C.download(p); const el=await L.loadFile(blob); BD.IMGS.set(img,{el,w:el.width,h:el.height}); st.blobs.set(img,blob); st.paths.set(img,p); }catch(_){} }));
    clearAll(); await addDocNodes(r.doc||{nodes:[]},{x:0,y:0}); S.id=null; S.name=d.name; $('bName').value=d.name; S.imgs=new Set(imgs);
    BD.paintUI(); BD.view.fitAll(); BD.resetHistory(); UI.paintLayersSoon();
    st.design={id:d.id,name:d.name,kind:d.kind,collections:d.collectionNames||[]}; markSaved(); syncDesignBar();
    if(ready&&d.kind!=='template'){ C.touchUsed&&C.touchUsed(id); st.openSaveAfter=true; }
    return true; }
  catch(err){ console.error(err); toast('Could not open that saved design.'); return false; }
  finally{ BD.busy&&BD.busy(null); } }

/* ---------- Save sheet: to the phone (2× lossless PNG) and/or to the team ---------- */
let lastFiles=null;
function fname(n,total,at){ const d=at||new Date(), z=x=>String(x).padStart(2,'0'); return (B.id+'-create').replace(/[^a-z0-9-]+/gi,'-')+'-'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds())+(total>1?'-'+n:'')+'.png'; }
function openSave(){ if(BD.editing()) BD.commitEdit(); const fs=frames().filter(f=>f.visible()); if(!fs.length){ toast('Add a page first.'); return; }
  const many=fs.length>1, upd=st.design&&st.design.kind==='design';
  const body=openSheet('save','Save',`<div class="cr-save" style="display:flex;flex-direction:column;gap:14px">
    ${many?`<div><span class="lbl">Pages</span><div class="cr-pagepick" id="crPP">${fs.map((f,i)=>`<label><input type="checkbox" data-f="${f.id()}" checked><img alt="" data-pth="${f.id()}">${i+1}</label>`).join('')}</div></div>`:''}
    <button type="button" class="btn" id="crGo">${many?'Save '+fs.length+' pages':'Save image'}</button>
    <p class="small">Full quality: ${fs.map(f=>fsize(f)).map(s=>s.w*2+'×'+s.h*2).filter((v,i,a)=>a.indexOf(v)===i).join(', ')} PNG, lossless.</p>
    <div class="cr-status" id="crSt" role="status" aria-live="polite"></div>
    <div class="cr-result" id="crRes" hidden></div>
    <div class="cr-team">
      <label class="opt-row"><span class="opt-ic">${L.ICON.bookmark}</span><span class="opt-txt"><b>${upd?'Update “'+esc(st.design.name)+'” in the team':'Also save to the team'}</b><small>${upd?'Saved designs keep your latest changes':'Find and reuse it in Saved'}</small></span><input type="checkbox" class="switch" id="crTeamOn" role="switch"></label>
      <div id="crTeamBox" hidden style="display:flex;flex-direction:column;gap:10px">
        <label class="lbl" for="crName">Name</label><input type="text" id="crName" dir="auto" maxlength="80">
        <label class="lbl" for="crCol">Collection (optional)</label><input type="text" id="crCol" dir="auto" maxlength="60" placeholder="e.g. Ramadan">
        <label class="check"><input type="checkbox" id="crKeep" checked> Keep the photos (off = a template)</label>
        ${st.design?'<label class="check"><input type="checkbox" id="crAsNew"> Save as a new design</label>':''}
        <button type="button" class="mini" id="crTeamOnly">Only save to the team</button>
      </div>
      <button type="button" class="link" id="crAsTpl">Save as a team template (words and layout, no personal photos)</button>
    </div></div>`);
  if(many) fs.forEach(f=>{ try{ const s=fsize(f), c=BD.renderFrame(f,112/s.w); body.querySelector(`[data-pth="${f.id()}"]`).src=c.toDataURL('image/jpeg',.7); c.width=c.height=0; }catch(_){} });
  const hasPhotos=usedImgs(JSON.parse(BD.docJson())).length>0; $('crKeep').checked=hasPhotos&&(!st.design||st.design.kind!=='template'); $('crKeep').disabled=!hasPhotos;
  $('crName').value=st.design?st.design.name:defaultName(); if(st.design&&st.design.collections&&st.design.collections[0]) $('crCol').value=st.design.collections[0];
  const syncT=()=>{ $('crTeamBox').hidden=!$('crTeamOn').checked; $('crGo').textContent=($('crTeamOn').checked?(upd&&!($('crAsNew')||{}).checked?'Save & update':'Save & add to team'):(many?'Save '+checked().length+' pages':'Save image')); };
  const checked=()=>many?[...body.querySelectorAll('#crPP input:checked')].map(i=>BD.main.findOne('#'+i.dataset.f)).filter(Boolean):fs;
  $('crTeamOn').onchange=syncT; if($('crAsNew')) $('crAsNew').onchange=syncT; body.querySelectorAll('#crPP input').forEach(i=>i.onchange=syncT);
  const opts=()=>({name:$('crName').value,keep:$('crKeep').checked,asNew:!!($('crAsNew')&&$('crAsNew').checked),collections:$('crCol').value.trim()?[$('crCol').value.trim()]:(st.design?st.design.collections:[])});
  $('crGo').onclick=async()=>{ const list=checked(); if(!list.length){ line('Pick at least one page.'); return; } await saveImages(list); if($('crTeamOn')&&$('crTeamOn').checked) await runTeam(opts()); };
  $('crTeamOnly').onclick=()=>runTeam(opts());
  $('crAsTpl').onclick=()=>runTeam(Object.assign(opts(),{kind:'template',asNew:!(st.design&&st.design.kind==='template'),name:$('crTeamOn').checked?$('crName').value:defaultName()}));
  syncT(); }
function line(t,ok,spin){ const el=$('crSt'); if(!el) return; el.classList.toggle('ok',!!ok); el.innerHTML=t?(spin?'<span class="spin" aria-hidden="true"></span>':'')+'<span>'+esc(t)+'</span>':''; }
async function runTeam(o){ st.saving=true; line(o.kind==='template'?'Saving the team template…':'Saving to the team…',false,true);
  try{ const r=await teamSave(o); line(r.kind==='template'?'Saved as a team template: “'+r.name+'”':'Saved to the team as “'+r.name+'”',true); }
  catch(err){ line(err.message||'Could not save to the team.'); } finally{ st.saving=false; } }
async function saveImages(list){ if(st.saving) return; st.saving=true; const btn=$('crGo'); if(btn) btn.disabled=true; const sel=S.sel.slice(); BD.select([]);
  const files=[], stamp=new Date(); let low=false;
  try{ for(const [i,f] of list.entries()){ line((list.length>1?'Page '+(i+1)+' of '+list.length+': ':'')+'making the full-size PNG…',false,true); await tick(30);
      const r=await BD.exportFrame(f,{scale:2,type:'image/png'}); if(r.scale<2) low=true; files.push(new File([r.blob],fname(i+1,list.length,stamp),{type:'image/png'})); }
    lastFiles=files; const small=low?' This phone was low on memory, so '+(files.length>1?'some pages are':'it is')+' a little smaller. Close other tabs for full size.':'';
    const what=files.length>1?files.length+' pages':'Your design';
    if(matchMedia('(pointer:coarse)').matches){ const r=await L.shareFiles(files);
      if(r==='shared'){ line('Saved! Choose “Save Image” if you haven’t yet.'+small,true); showResult(files); return; }
      if(r==='cancelled'){ line('Not saved. Tap Save again when you are ready.'); showResult(files); return; }
      if(r==='needtap'){ line('Ready! Tap a picture below to save it.'+small,true); showResult(files,true); return; } }
    for(const f of files){ const url=URL.createObjectURL(f), a=document.createElement('a'); a.href=url; a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); },4000); await tick(250); }
    line(what+' saved to your downloads'+(files.length>1?', numbered in order.':'.')+small,true); showResult(files); }
  catch(err){ line(err.message||'Could not make the image. Close other apps or tabs and try again.'); }
  finally{ st.saving=false; if(btn) btn.disabled=false; BD.select(sel.filter(n=>n.getStage())); } }
function showResult(files,tapToShare){ const el=$('crRes'); if(!el) return; el.hidden=false; el.innerHTML=files.map((f,i)=>`<img alt="Page ${i+1}" data-i="${i}" src="${URL.createObjectURL(f)}">`).join('');
  if(tapToShare) el.onclick=async e=>{ const im=e.target.closest('img'); if(im) await L.shareFiles([files[+im.dataset.i]]); }; }

/* ---------- design menu (the caret next to the name) ---------- */
function resizePage(id){ const f=BD.activeFrame&&BD.activeFrame(); if(!f) return; const s=sizeOf(id); BD.act.resizeWithContent(f,s.w,s.h,false); if(s.round) f.setAttr('round',1); else f.setAttr('round',undefined); BD.view.fitSel(); paintRound(); }
function copyAs(id){ const f=BD.activeFrame&&BD.activeFrame(); if(!f) return; const s=sizeOf(id); const c=BD.act.resizeWithContent(f,s.w,s.h,true,s.label+' copy'); if(c){ c.setAttr('round',s.round?1:undefined); BD.view.fitSel(); paintRound(); } }
$('fileMenu').onclick=e=>{ const r=e.currentTarget.getBoundingClientRect(); UI.openMenu(r.left,r.bottom+6,[
  {label:'New design',run:()=>{ if(S.id) BD.saveNow(); location.href=location.pathname+'?new=1'; }},
  {label:'Templates',run:()=>openTemplates()},
  {label:'Save…',key:UI.mod+'+S',run:openSave},
  '-',{head:'This page'},
  {label:'Add a page',run:addPage},
  ...SIZES.filter(s=>!s.pages).map(s=>({label:'Make it '+(s.id==='highlight'?'a highlight cover':'a '+s.label.toLowerCase())+' ('+s.sub+')',run:()=>resizePage(s.id)})),
  {label:'Copy as a story',run:()=>copyAs('story')},{label:'Copy as a post',run:()=>copyAs('post')},
  '-',
  {label:'Story safe zones',check:S.safe,run:()=>{ S.safe=!S.safe; BD.paintUI(); }},
  {label:'Present',run:()=>UI.present&&UI.present()},
  {label:'More export options (PDF, SVG, JPG)',run:()=>UI.exportDialog()},
  {label:'All saved designs',run:()=>{ location.href=L.ROOT+'index.html#saved'; }}]); };
document.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='s'){ e.preventDefault(); e.stopPropagation(); openSave(); } },true);

/* ---------- start ---------- */
let started; const startP=new Promise(r=>{ started=r; });
BD.cfg.start=async function(q){
  try{ B=BD.B; BD.ICONS=CR.allIcons();
    const draft=q.get('draft'), design=q.get('design'), tpl=q.get('tpl'), team=q.get('team'), size=q.get('size');
    if(draft){ const x=L.listDrafts(B.id,TOOL).find(d=>d.id===draft); if(x&&x.d.board&&await BD.openBoard(x.d.board)){ st.dirty=true; st.draftKey=x.key; BD.view.fitAll(); return; }
      toast('That unfinished design is no longer on this phone.'); }
    if(design){ const r=await openDesign(design,q.get('go')==='1'); if(r==='away'||r===true) return; }
    await BD.newBoard({preset:'story',name:'Untitled design'}); try{ await L.idb.del('board:'+S.id); }catch(_){} S.id=null; history.replaceState(null,'',location.pathname);
    if(tpl&&CR.templates().some(d=>d.id===tpl)) st.startWith=()=>applyTemplate(tpl,'replace');
    else if(team) st.startWith=()=>applyTeam(team,'replace');
    else if(size&&SIZES.some(s=>s.id===size)) st.startWith=()=>startBlank(size);
    else st.startWith=()=>openTemplates({start:true});
  } finally{ started(); } };
UI.boot();
startP.then(async()=>{ await tick(30); document.title=(st.design?st.design.name+' · ':'')+TITLE+' · Studio'; if(!st.design&&/^untitled/i.test(S.name||'')) $('bName').placeholder='Untitled design';
  st.ready=true; paintRound(); paintPages(); syncDesignBar();
  if(st.startWith){ const f=st.startWith; st.startWith=null; await f(); }
  if(st.openSaveAfter) openSave(); });
$('bName').addEventListener('change',()=>{ if(st.design) syncDesignBar(); else touch(); });
})();

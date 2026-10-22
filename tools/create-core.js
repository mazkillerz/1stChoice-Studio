/* Create: its own simple, phone-first editor (not the Lab's Board). One page on screen at a time, fitted to the screen.
   Selecting: tap a thing to select it, tap empty space (or ✓ Done) to deselect. Finger-sized handles.
   Several at once: drag on empty space to box-select, long-press a thing to add it, "Select several" mode, or Shift-click.
   Moving snaps to the page edges and centre and to other things. Two fingers on a selected thing: size and turn it;
   two fingers elsewhere: zoom the view. Double-tap: change the words / crop the photo.
   The saved format (pages as Konva groups) is the same as before, so drafts, team designs and templates keep working.
   Exposes window.BD with the small API the element library and templates use. Uses Konva (assets/vendor/konva.min.js, MIT). */
(function(){
const L=Studio.lab;
const BD=window.BD=window.BD||{};
const $=id=>document.getElementById(id);
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const AR=/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const ACCENT='#2f7bff', GUIDE='#ff3d7f';
const coarse=()=>matchMedia('(pointer:coarse)').matches;
let B=null;

/* ---------- state + events ---------- */
const S={id:null,name:'',sel:[],cur:null,imgs:new Set(),multi:false,snap:true,crop:null};
BD.S=S;
const ev=new EventTarget(); BD.on=(n,f)=>ev.addEventListener(n,e=>f(e.detail)); const emit=(n,d)=>ev.dispatchEvent(new CustomEvent(n,{detail:d}));

/* ---------- stage ---------- */
const wrap=$('crStage');
const stage=new Konva.Stage({container:wrap,width:wrap.clientWidth||390,height:wrap.clientHeight||600});
const main=new Konva.Layer(), ui=new Konva.Layer();
stage.add(main); stage.add(ui);
const T=coarse()?20:12;   // handle size on screen
const tr=new Konva.Transformer({anchorSize:T,anchorCornerRadius:T/2,anchorStroke:ACCENT,anchorStrokeWidth:2,anchorFill:'#fff',borderStroke:ACCENT,borderStrokeWidth:2,
  rotateAnchorOffset:coarse()?42:28,padding:coarse()?6:3,keepRatio:true,flipEnabled:false,ignoreStroke:true,rotationSnaps:[0,90,180,270],rotationSnapTolerance:6,
  anchorStyleFunc:a=>{ const big=coarse()?46:24, w=a.width(), h=a.height(); a.hitFunc((ctx,shape)=>{ ctx.beginPath(); ctx.rect(-(big-w)/2,-(big-h)/2,big,big); ctx.fillStrokeShape(shape); }); }});
const guides=new Konva.Group({listening:false}), marquee=new Konva.Rect({fill:'rgba(47,123,255,.1)',stroke:ACCENT,strokeWidth:1,strokeScaleEnabled:false,visible:false,listening:false});
const multiBoxes=new Konva.Group({listening:false}), safeG=new Konva.Group({listening:false});
ui.add(safeG,multiBoxes,guides,marquee,tr);
BD.stage=stage; BD.main=main; BD.ui=ui; BD.tr=tr; BD.wrap=wrap;

/* ---------- node helpers ---------- */
const kind=n=>n&&n.getAttr&&n.getAttr('kind');
const isFrame=n=>kind(n)==='frame';
const isObj=n=>!!n&&n.hasName&&n.hasName('obj');
const isLocked=n=>!!(n&&n.getAttr('locked'));
const frameBg=f=>f.findOne('.frame-bg');
const frames=()=>main.getChildren(isFrame);
const items=c=>c.getChildren(n=>isObj(n)||isFrame(n));
const fsize=f=>({w:f.getAttr('fw')||1080,h:f.getAttr('fh')||1920});
function wrect(n){ return n.getClientRect({relativeTo:stage,skipShadow:true}); }
function unionRect(list){ if(!list.length) return null; let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; list.forEach(n=>{ const r=n.getClientRect?wrect(n):n; a=Math.min(a,r.x); b=Math.min(b,r.y); c=Math.max(c,r.x+r.width); d=Math.max(d,r.y+r.height); }); return {x:a,y:b,width:c-a,height:d-b}; }
function frameOf(n){ let p=n; while(p&&p!==main){ if(isFrame(p)) return p; p=p.getParent&&p.getParent(); } return null; }
function nameOf(n){ const l=n.getAttr('label'); if(l) return l; const k=kind(n); if(k==='text'){ const t=(n.text()||'').replace(/\s+/g,' ').trim(); return t.slice(0,28)||'Text'; }
  return ({rect:'Box',ellipse:'Circle',path:'Shape',icon:'Icon',line:'Line',image:'Photo',asset:'Picture',group:'Group'})[k]||'Layer'; }
const prect=(n,f)=>n.getClientRect({relativeTo:f||frameOf(n),skipShadow:true});   // box in page units
BD.util={kind,isFrame,isObj,isLocked,frames,items,fsize,wrect,unionRect,frameOf,nameOf,frameBg,uid,clamp,AR,prect};

/* ---------- photos ---------- */
const IMGS=new Map(); BD.IMGS=IMGS;
async function getImg(id){ if(IMGS.has(id)) return IMGS.get(id);
  try{ if(String(id).startsWith('brand:')){ const a=L.brandAssets().find(x=>x.id===id.slice(6)); if(!a) return null; const im=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=L.assetUrl(a); }); const v={el:im,w:im.width,h:im.height}; IMGS.set(id,v); return v; }
    const blob=await L.idb.get('bimg:'+id); if(!blob) return null; const el=await L.loadFile(blob); const v={el,w:el.width,h:el.height}; IMGS.set(id,v); return v; }catch(_){ return null; } }
async function addPhotoFile(file){ const id=uid(); const el=await L.loadFile(file); IMGS.set(id,{el,w:el.width,h:el.height}); S.imgs.add(id); await L.idb.put('bimg:'+id,file); return id; }
BD.getImg=getImg; BD.addPhotoFile=addPhotoFile;
/* cover crop: a photo always fills its box; zoom and the focus point move it inside */
function applyCrop(n){ const im=IMGS.get(n.getAttr('imgId')); if(!im) return;
  const w=n.width(), h=n.height(), z=n.getAttr('cropZ')||1, fx=n.getAttr('focX')??.5, fy=n.getAttr('focY')??.5;
  const k=Math.max(w/im.w,h/im.h)*z, cw=Math.min(im.w,w/k), ch=Math.min(im.h,h/k);
  n.crop({x:(im.w-cw)*fx,y:(im.h-ch)*fy,width:cw,height:ch}); }
/* the only photo effect templates use: invert (a light logo on dark) */
function applyFx(n){ if(!n||!n.getStage) return; const f=n.getAttr('fx')||{};
  if(f.invert){ n.filters([Konva.Filters.Invert]); if(n.getStage()){ try{ n.clearCache(); n.cache({pixelRatio:3}); }catch(_){} } } else if(n.isCached&&n.isCached()){ n.clearCache(); n.filters([]); } }
BD.applyCrop=applyCrop; BD.applyFx=applyFx;

/* ---------- text: right-to-left for Arabic, and an optional coloured box behind the words ---------- */
function textScene(ctx,shape){ const bg=shape.getAttr('tbg');
  if(bg){ const r=shape.getAttr('tbgR')||0, w=shape.width(), h=shape.height(); ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(0,0,w,h,Math.min(r,w/2,h/2)); else ctx.rect(0,0,w,h); ctx.fillStyle=bg; ctx.fill(); }
  Konva.Text.prototype._sceneFunc.call(shape,ctx); }
function prepText(n){ n.sceneFunc(textScene); n.direction(AR.test(n.text()||'')?'rtl':'inherit'); }
BD.prepText=prepText;
BD.applyFill=()=>{};

/* ---------- fonts ---------- */
const FONTS=new Set();
BD.ensureFont=async function(fam,style){ if(!fam) return; const key=fam+'|'+(style||''); if(FONTS.has(key)) return; FONTS.add(key);
  try{ await L.ensureFont(fam); }catch(_){}
  try{ const w=(String(style||'').match(/\d{3}/)||[/bold/.test(style||'')?'700':'400'])[0]; await document.fonts.load(w+' 40px "'+fam+'"','عربي abc'); }catch(_){} };
BD.displayFont=()=>(B&&B.fonts&&B.fonts.display)||'system-ui';
BD.bodyFont=()=>(B&&B.fonts&&B.fonts.body)||'system-ui';
BD.brandColors=()=>{ const c=(B&&B.colors)||{}; return {ink:c.ink||'#161210',paper:c.paper||'#ffffff',accent:c.accent||'#D6B078',cream:c.cream||'#F3EADC',blob:c.blob||'#E5D5C0',brown:c.brown||'#7A563A'}; };

/* ---------- making things ---------- */
function makeFrame(x,y,w,h,opt){ opt=opt||{};
  const f=new Konva.Group({id:uid(),x:Math.round(x),y:Math.round(y),kind:'frame',label:opt.label||'Page '+(frames().length+1),fw:w,fh:h,clipX:0,clipY:0,clipWidth:w,clipHeight:h});
  f.add(new Konva.Rect({name:'frame-bg',width:w,height:h,fill:opt.fill||'#ffffff'})); main.add(f); return f; }
function setFrameSize(f,w,h){ f.setAttrs({fw:w,fh:h,clipX:0,clipY:0,clipWidth:w,clipHeight:h}); frameBg(f).setAttrs({x:0,y:0,width:w,height:h}); }
BD.makeFrame=makeFrame; BD.setFrameSize=setFrameSize;
function obj(cls,attrs){ return new Konva[cls](Object.assign({id:uid(),name:'obj'},attrs)); }
function makeText(text,o){ o=o||{}; const n=obj('Text',Object.assign({kind:'text',text,autoW:o.width==null,fontFamily:BD.displayFont(),fontSize:96,fontStyle:'normal',fill:BD.brandColors().ink,align:'center',lineHeight:1.15,padding:0},o)); prepText(n); return n; }
function makeIcon(def,size,color){ const s=size||200; return obj('Path',{kind:'icon',data:def.d,stroke:color||BD.brandColors().ink,strokeWidth:2,lineCap:'round',lineJoin:'round',fill:'',scaleX:s/24,scaleY:s/24,hitStrokeWidth:8,iconId:def.id}); }
function makeImage(imgId,w,h,k){ const im=IMGS.get(imgId); const n=obj('Image',{kind:k||'image',imgId,image:im&&im.el,width:w,height:h,cropZ:1,focX:.5,focY:.5}); if(k!=='asset') applyCrop(n); return n; }
function makeShape(def,size,color){ const s=size||300, c=color||BD.brandColors().accent;
  if(def.make==='rect') return obj('Rect',{kind:'rect',width:s,height:s,fill:c,cornerRadius:def.radius||0});
  if(def.make==='ellipse') return obj('Ellipse',{kind:'ellipse',radiusX:s/2,radiusY:s/2,fill:c});
  if(def.make==='line') return obj('Line',{kind:'line',points:[0,0,s*1.4,0],stroke:c,strokeWidth:12,lineCap:'round',hitStrokeWidth:30});
  if(def.make==='arrow') return obj('Arrow',{kind:'line',points:[0,0,s*1.4,0],stroke:c,fill:c,strokeWidth:12,pointerLength:36,pointerWidth:36,lineCap:'round',hitStrokeWidth:30});
  if(def.make==='poly') return obj('RegularPolygon',{kind:'path',sides:def.sides,radius:s/2,fill:c});
  if(def.make==='star') return obj('Star',{kind:'path',numPoints:def.points||5,innerRadius:s/2*(def.inner||.45),outerRadius:s/2,fill:c});
  if(def.make==='ring') return obj('Ring',{kind:'path',innerRadius:s*.34,outerRadius:s/2,fill:c});
  if(def.stroke||def.strokeOnly) return obj('Path',{kind:'icon',data:def.path,stroke:c,strokeWidth:8,lineCap:'round',lineJoin:'round',fill:'',scaleX:s/100,scaleY:s/100,strokeScaleEnabled:false,hitStrokeWidth:30});
  return obj('Path',{kind:'path',data:def.path,fill:c,scaleX:s/100,scaleY:s/100,strokeScaleEnabled:false}); }
BD.make={text:makeText,icon:makeIcon,image:makeImage,shape:makeShape,frame:makeFrame}; BD.obj=obj;

/* the page you're working on */
function activeFrame(){ return S.cur&&S.cur.getStage()?S.cur:frames()[0]||null; }
BD.activeFrame=activeFrame; BD.targetFrame=activeFrame; BD.frameAt=()=>activeFrame();
/* add a thing to the current page, centred (or at a page point), and select it */
function place(n,opt){ opt=opt||{}; const f=opt.frame||activeFrame(); if(!f) return n; f.add(n);
  const r=n.getClientRect({relativeTo:f}), s=fsize(f), at=opt.at||{x:s.w/2,y:s.h/2};
  n.x(Math.round(n.x()+at.x-(r.x+r.width/2))); n.y(Math.round(n.y()+at.y-(r.y+r.height/2)));
  if(kind(n)==='image'||kind(n)==='asset') applyFx(n);
  select([n]); changed(); emit('doc'); return n; }
BD.place=place;
async function addPhotos(files){ const out=[]; for(const file of files){ try{ const id=await addPhotoFile(file), im=IMGS.get(id), f=activeFrame(), s=fsize(f), k=Math.min(1,s.w*.8/im.w,s.h*.6/im.h);
    const n=makeImage(id,Math.round(im.w*k),Math.round(im.h*k)); n.setAttr('label','Photo'); f.add(n); const r=n.getClientRect({relativeTo:f}); n.position({x:Math.round((s.w-r.width)/2+out.length*30),y:Math.round((s.h-r.height)/2+out.length*30)}); out.push(n); }
  catch(_){ BD.toast&&BD.toast('Could not open '+(file.name||'that photo')+'.'); } }
  if(out.length){ select(out); changed(); emit('doc'); } return out; }
async function addAsset(a){ const im=await getImg('brand:'+a.id); if(!im){ BD.toast&&BD.toast(a.label+' is not in the brand kit yet.'); return null; }
  const f=activeFrame(), s=fsize(f), k=Math.min(1,s.w*.55/im.w,s.h*.5/im.h); const n=makeImage('brand:'+a.id,Math.round(im.w*k),Math.round(im.h*k),'asset'); n.setAttr('label',a.label); return place(n,{frame:f}); }
BD.addPhotos=addPhotos; BD.addAsset=addAsset;

/* ---------- view: the current page fits the free space; two fingers zoom ---------- */
let fitPad={top:16,right:16,bottom:16,left:16};
BD.setPad=p=>{ fitPad=Object.assign({},fitPad,p); fitPage(); };
function setView(x,y,k){ stage.scale({x:k,y:k}); stage.position({x,y}); paintUI(); emit('view'); }
function fitPage(){ const f=activeFrame(); if(!f) return; const s=fsize(f), W=stage.width()-fitPad.left-fitPad.right, H=stage.height()-fitPad.top-fitPad.bottom;
  const k=Math.max(.02,Math.min(W/s.w,H/s.h)); setView(fitPad.left+(W-s.w*k)/2-f.x()*k,fitPad.top+(H-s.h*k)/2-f.y()*k,k); BD.fitK=k; }
function zoomAt(k,pt){ const old=stage.scaleX(), base=BD.fitK||old; k=clamp(k,base*.6,base*8); const w={x:(pt.x-stage.x())/old,y:(pt.y-stage.y())/old}; setView(pt.x-w.x*k,pt.y-w.y*k,k); }
BD.view={fit:fitPage,fitAll:fitPage,fitSel:fitPage,fitRect:()=>fitPage(),zoomAt,changed:paintUI};
function resize(){ stage.size({width:wrap.clientWidth,height:wrap.clientHeight}); fitPage(); }
new ResizeObserver(()=>resize()).observe(wrap);
/* show one page: the others are hidden while you work (they're all there and all saved) */
function showPage(f,keepSel){ if(!f) return; S.cur=f; frames().forEach(x=>x.visible(x===f)); if(!keepSel) select([]); fitPage(); main.batchDraw(); emit('page',f); }
BD.showPage=showPage;
function toWorld(p){ return stage.getAbsoluteTransform().copy().invert().point(p); }
function toPage(p){ const f=activeFrame(), w=toWorld(p); return {x:w.x-f.x(),y:w.y-f.y()}; }
BD.toPage=toPage;

/* ---------- selection ---------- */
const SIDE=['text','rect','image','line'];
function select(list,opt){ list=(list||[]).filter(n=>n&&n.getStage&&n.getStage()&&n.isVisible()); S.sel=list;
  const t=list.filter(n=>!isLocked(n)); tr.nodes(t);
  const one=t.length===1?t[0]:null, k=one&&kind(one);
  tr.enabledAnchors(!one?['top-left','top-right','bottom-left','bottom-right']:
    k==='text'?['top-left','top-right','bottom-left','bottom-right','middle-left','middle-right']:
    k==='line'?['middle-left','middle-right']:
    (k==='rect'||k==='image'||one.getAttr('slot'))?['top-left','top-center','top-right','middle-right','middle-left','bottom-left','bottom-center','bottom-right']:['top-left','top-right','bottom-left','bottom-right']);
  tr.rotateEnabled(true); tr.keepRatio(true);
  if(!list.length&&S.multi) S.multi=false;
  paintUI(); if(!(opt&&opt.quiet)) emit('select',list); }
BD.select=select;
BD.selectAll=()=>{ const f=activeFrame(); if(f) select(items(f).filter(n=>!isLocked(n)&&n.visible())); };
BD.setMulti=v=>{ S.multi=!!v; paintUI(); emit('select',S.sel); };
/* the layer a tap lands on: the thing directly on the page (an element group is picked as one) */
function hitAt(p){ const sh=main.getIntersection(p); if(!sh) return {empty:true};   // the design only: the selection box never hides what's under it
  const f=activeFrame(); let n=sh; while(n&&n.getParent()&&n.getParent()!==f) n=n.getParent();
  if(!n||n.getParent()!==f||n.hasName('frame-bg')) return {empty:true}; if(isLocked(n)) return {empty:true,locked:n}; return {node:n}; }
BD.hitAt=hitAt;
function inTr(sh){ let p=sh; while(p){ if(p===tr) return true; p=p.getParent&&p.getParent(); } return false; }

/* ---------- overlay: guides, the boxes of a multiple selection, story safe zones ---------- */
function paintUI(){ multiBoxes.destroyChildren(); const k=stage.scaleX();
  if(S.sel.length>1) S.sel.forEach(n=>{ const r=wrect(n); multiBoxes.add(new Konva.Rect({...r,stroke:ACCENT,strokeWidth:1,dash:[4/k,3/k],strokeScaleEnabled:true,listening:false})); });
  safeG.destroyChildren(); const f=activeFrame();
  if(f&&BD.showSafe){ const s=fsize(f); if(Math.abs(s.w/s.h-9/16)<.01){ const top=s.h*250/1920, bot=s.h*300/1920; safeG.add(new Konva.Rect({x:f.x(),y:f.y(),width:s.w,height:top,fill:'rgba(255,61,127,.10)'}),new Konva.Rect({x:f.x(),y:f.y()+s.h-bot,width:s.w,height:bot,fill:'rgba(255,61,127,.10)'})); } }
  if(f&&f.getAttr('round')){ const s=fsize(f); safeG.add(new Konva.Circle({x:f.x()+s.w/2,y:f.y()+s.h/2,radius:Math.min(s.w,s.h)/2,stroke:ACCENT,strokeWidth:1.5/k,dash:[8/k,6/k]})); }
  tr.anchorSize(T); tr.forceUpdate(); ui.batchDraw(); }
BD.paintUI=paintUI;
function drawGuides(gx,gy){ guides.destroyChildren(); const f=activeFrame(); if(!f) return; const s=fsize(f), k=stage.scaleX();
  (gx||[]).forEach(x=>guides.add(new Konva.Line({points:[f.x()+x,f.y()-20/k,f.x()+x,f.y()+s.h+20/k],stroke:GUIDE,strokeWidth:1.5/k})));
  (gy||[]).forEach(y=>guides.add(new Konva.Line({points:[f.x()-20/k,f.y()+y,f.x()+s.w+20/k,f.y()+y],stroke:GUIDE,strokeWidth:1.5/k}))); ui.batchDraw(); }
function clearGuides(){ guides.destroyChildren(); ui.batchDraw(); }

/* ---------- snapping (page edges + centre, other things) ---------- */
function snapTargets(skip){ const f=activeFrame(), s=fsize(f), xs=[0,s.w/2,s.w], ys=[0,s.h/2,s.h];
  items(f).forEach(n=>{ if(skip.includes(n)||!n.visible()) return; const r=prect(n,f); xs.push(r.x,r.x+r.width/2,r.x+r.width); ys.push(r.y,r.y+r.height/2,r.y+r.height); }); return {xs,ys}; }
function snapDelta(r,T0){ const tol=(coarse()?10:6)/stage.scaleX(); let dx=0,dy=0,gx=null,gy=null,bx=tol+1,by=tol+1;
  [r.x,r.x+r.width/2,r.x+r.width].forEach(c=>T0.xs.forEach(t=>{ const d=t-c; if(Math.abs(d)<Math.abs(bx)&&Math.abs(d)<=tol){ bx=d; gx=t; } }));
  [r.y,r.y+r.height/2,r.y+r.height].forEach(c=>T0.ys.forEach(t=>{ const d=t-c; if(Math.abs(d)<Math.abs(by)&&Math.abs(d)<=tol){ by=d; gy=t; } }));
  if(gx!=null) dx=bx; if(gy!=null) dy=by; return {dx,dy,gx,gy}; }

/* ---------- handles: turn stretching into real sizes so text, corners and photos stay crisp ---------- */
function bake(n){ const k=kind(n), sx=Math.abs(n.scaleX()), sy=Math.abs(n.scaleY()), a=tr.getActiveAnchor()||'';
  if(k==='text'){ if(/middle-(left|right)/.test(a)){ n.width(Math.max(30,n.width()*sx)); n.setAttr('autoW',false); n.wrap('word'); } else { n.fontSize(Math.max(6,n.fontSize()*sy)); if(!n.getAttr('autoW')) n.width(Math.max(30,n.width()*sx)); } n.scale({x:1,y:1}); if(n.getAttr('autoW')) n.width(undefined); return; }
  if(k==='rect'||k==='image'){ n.width(Math.max(4,n.width()*sx)); n.height(Math.max(4,n.height()*sy)); n.scale({x:1,y:1}); if(k==='image') applyCrop(n); return; }
  if(n.getAttr('slot')&&/(top|bottom)-center|middle-(left|right)/.test(a)){ const bg=n.findOne(c=>c.getAttr('role')==='bg'), w=Math.max(20,n.getAttr('slotW')*sx), h=Math.max(20,n.getAttr('slotH')*sy);
    n.scale({x:1,y:1}); n.setAttrs({slotW:Math.round(w),slotH:Math.round(h)}); if(bg) bg.setAttrs({width:w,height:h}); const m=n.findOne(c=>c.getAttr('role')==='mark'); if(m){ const ms=m.scaleX()*24; m.position({x:(w-ms)/2,y:(h-ms)/2}); } return; }
  if(k==='line'){ n.points(n.points().map((v,i)=>i%2?v:v*sx)); n.scale({x:1,y:1}); } }
tr.on('transform',()=>{ tr.nodes().forEach(bake); paintUI(); emit('geom'); });
tr.on('transformend',()=>{ clearGuides(); changed(); emit('geom'); });

/* ---------- pointer: tap, drag to move, box-select, long-press, two fingers ---------- */
const ptrs=new Map(); let g=null, lastTap={t:0,x:0,y:0,n:null}, lpT=0;
const pt=e=>{ const r=wrap.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
const moveTol=()=>coarse()?9:4;
wrap.addEventListener('pointerdown',e=>{
  if(BD.cropping&&BD.cropping()) return;
  const p=pt(e); ptrs.set(e.pointerId,p);
  if(ptrs.size===2){ clearTimeout(lpT); const [a,b]=[...ptrs.values()]; const onSel=g&&(g.type==='move'||g.type==='press')&&S.sel.length>0;
    const c={x:(a.x+b.x)/2,y:(a.y+b.y)/2}, d=Math.hypot(a.x-b.x,a.y-b.y), ang=Math.atan2(b.y-a.y,b.x-a.x);
    if(onSel&&S.sel.length&&S.sel.every(n=>!isLocked(n))){ restoreMove(); g={type:'pinchSel',d0:d,a0:ang,start:S.sel.map(n=>({n,s:{x:n.scaleX(),y:n.scaleY()},r:n.rotation(),pos:n.position(),k:kind(n),fs:n.fontSize?n.fontSize():0})),c0:toWorld(c)}; }
    else g={type:'pinch',d0:d,k0:stage.scaleX(),c0:c,s0:stage.position()};
    return; }
  if(ptrs.size>2) return;
  if(e.button===2) return;
  const sh=stage.getIntersection(p); if(sh&&inTr(sh)&&!sh.hasName('back')) return;   // a handle: Konva does it
  wrap.setPointerCapture(e.pointerId);
  const hit=hitAt(p);
  if(hit.node){ const n=hit.node, inSel=S.sel.includes(n);
    if(e.shiftKey||e.metaKey||e.ctrlKey){ select(inSel?S.sel.filter(x=>x!==n):[...S.sel,n]); g={type:'none'}; return; }
    /* touch: with something else selected, wait — a long-press adds this one, a tap or a drag picks it alone */
    const defer=coarse()&&!inSel&&!S.multi&&S.sel.length>0;
    if(!inSel&&!S.multi&&!defer) select([n]);
    g={type:'press',n,p0:p,inSel,moved:false,defer};
    if(coarse()) lpT=setTimeout(()=>{ if(g&&g.type==='press'&&!g.moved){ S.multi=true; select(inSel&&S.sel.length>1?S.sel.filter(x=>x!==n):[...new Set([...S.sel,n])]); g={type:'none'}; if(navigator.vibrate) navigator.vibrate(12); } },480);
    return; }
  /* empty space: box-select (or a tap = deselect) */
  g={type:'empty',p0:p,w0:toWorld(p),moved:false};
});
wrap.addEventListener('pointermove',e=>{ if(!ptrs.has(e.pointerId)) return; const p=pt(e); ptrs.set(e.pointerId,p); if(!g) return;
  if(g.type==='pinch'&&ptrs.size===2){ const [a,b]=[...ptrs.values()], d=Math.hypot(a.x-b.x,a.y-b.y), c={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const k=clamp(g.k0*d/g.d0,(BD.fitK||1)*.6,(BD.fitK||1)*8), w={x:(g.c0.x-g.s0.x)/g.k0,y:(g.c0.y-g.s0.y)/g.k0}; setView(c.x-w.x*k,c.y-w.y*k,k); return; }
  if(g.type==='pinchSel'&&ptrs.size===2){ const [a,b]=[...ptrs.values()], f=Math.max(.05,Math.hypot(a.x-b.x,a.y-b.y)/g.d0), rot=(Math.atan2(b.y-a.y,b.x-a.x)-g.a0)*180/Math.PI;
    const c=g.c0, rad=rot*Math.PI/180, cos=Math.cos(rad), sin=Math.sin(rad), par=activeFrame();
    g.start.forEach(o=>{ const n=o.n, cx=c.x-par.x(), cy=c.y-par.y(), dx=o.pos.x-cx, dy=o.pos.y-cy;
      n.position({x:cx+(dx*cos-dy*sin)*f,y:cy+(dx*sin+dy*cos)*f}); n.rotation(o.r+rot);
      if(o.k==='text'){ n.fontSize(Math.max(6,o.fs*f)); if(n.getAttr('autoW')) n.width(undefined); } else n.scale({x:o.s.x*f,y:o.s.y*f}); });
    tr.forceUpdate(); paintUI(); return; }
  if(ptrs.size>1) return;
  const d=Math.hypot(p.x-g.p0.x,p.y-g.p0.y);
  if((g.type==='press'||g.type==='empty')&&!g.moved&&d>moveTol()){ g.moved=true; clearTimeout(lpT);
    if(g.type==='press'){ if(g.defer) select([g.n]); if(S.multi&&!S.sel.includes(g.n)) select([...S.sel,g.n]); const list=S.sel.filter(n=>!isLocked(n)); if(!list.length){ g={type:'none'}; return; }
      const f=activeFrame(); g={type:'move',p0:g.p0,list,start:list.map(n=>n.position()),box:unionRect(list.map(n=>prect(n,f))),T:snapTargets(list),n:g.n}; }
    else { g.type='marquee'; marquee.visible(true); } }
  if(g.type==='move'){ const k=stage.scaleX(); let dx=(p.x-g.p0.x)/k, dy=(p.y-g.p0.y)/k; let gx=[],gy=[];
    if(S.snap&&!e.altKey){ const r={x:g.box.x+dx,y:g.box.y+dy,width:g.box.width,height:g.box.height}, s=snapDelta(r,g.T); dx+=s.dx; dy+=s.dy; if(s.gx!=null) gx=[s.gx]; if(s.gy!=null) gy=[s.gy]; }
    g.list.forEach((n,i)=>n.position({x:Math.round((g.start[i].x+dx)*10)/10,y:Math.round((g.start[i].y+dy)*10)/10})); drawGuides(gx,gy); tr.forceUpdate(); paintUI(); emit('geom'); }
  if(g.type==='marquee'){ const w=toWorld(p); marquee.setAttrs({x:Math.min(w.x,g.w0.x),y:Math.min(w.y,g.w0.y),width:Math.abs(w.x-g.w0.x),height:Math.abs(w.y-g.w0.y)}); ui.batchDraw(); }
});
function restoreMove(){ if(g&&g.type==='move') g.list.forEach((n,i)=>n.position(g.start[i])); }
function endPtr(e){ if(!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); clearTimeout(lpT); if(!g) return; const p=pt(e);
  if(g.type==='pinch'||g.type==='pinchSel'){ if(!ptrs.size){ if(g.type==='pinchSel') changed(); g=null; } return; }
  if(g.type==='move'){ clearGuides(); changed(); emit('doc'); g=null; return; }
  if(g.type==='marquee'){ marquee.visible(false); const r=marquee.getClientRect({relativeTo:stage}); const f=activeFrame();
    const hits=items(f).filter(n=>!isLocked(n)&&n.visible()&&Konva.Util.haveIntersection(r,wrect(n)));
    select(e.shiftKey||S.multi?[...new Set([...S.sel,...hits])]:hits); if(hits.length>1) S.multi=coarse(); ui.batchDraw(); g=null; return; }
  if(g.type==='empty'){ select([]); S.multi=false;
    const now=Date.now(); if(now-lastTap.t<320&&!lastTap.n&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<30){ fitPage(); lastTap.t=0; } else lastTap={t:now,x:p.x,y:p.y,n:null}; g=null; return; }
  if(g.type==='press'){ const n=g.n; if(g.defer) select([n]);
    if(S.multi&&g.inSel){ select(S.sel.filter(x=>x!==n)); }
    else if(S.multi&&!g.inSel){ /* added on down */ if(!S.sel.includes(n)) select([...S.sel,n]); }
    else if(g.inSel&&S.sel.length>1){ select([n]); }
    const now=Date.now(); if(now-lastTap.t<340&&lastTap.n===n&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<34){ lastTap.t=0; emit('dbl',n); } else lastTap={t:now,x:p.x,y:p.y,n};
    g=null; return; }
  g=null; }
wrap.addEventListener('pointerup',endPtr); wrap.addEventListener('pointercancel',e=>{ if(g&&g.type==='move'){ restoreMove(); clearGuides(); } g=null; ptrs.delete(e.pointerId); });
wrap.addEventListener('wheel',e=>{ e.preventDefault(); const p=pt(e); if(e.ctrlKey||e.metaKey) zoomAt(stage.scaleX()*Math.exp(-e.deltaY*.01),p); else setView(stage.x()-e.deltaX,stage.y()-e.deltaY,stage.scaleX()); },{passive:false});
wrap.addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- actions ---------- */
const act={};
act.del=()=>{ const list=S.sel.filter(n=>!isLocked(n)); if(!list.length) return; list.forEach(n=>n.destroy()); select([]); changed(); emit('doc'); };
act.duplicate=()=>{ const list=S.sel.filter(n=>!isFrame(n)); if(!list.length) return; const out=list.map(n=>{ const c=rebuild(toObj(n),true); n.getParent().add(c); c.zIndex(Math.min(n.zIndex()+1,n.getParent().children.length-1)); c.x(c.x()+40); c.y(c.y()+40); if(kind(c)==='image'||kind(c)==='asset') applyFx(c); return c; }); select(out); changed(); emit('doc'); };
act.order=how=>{ const list=S.sel.slice(); const par=list[0]&&list[0].getParent(); if(!par) return;
  list.forEach(n=>{ if(how==='front') n.moveToTop(); if(how==='back') n.moveToBottom(); if(how==='up') n.moveUp(); if(how==='down') n.moveDown(); }); if(isFrame(par)) frameBg(par).moveToBottom(); select(list,{quiet:true}); changed(); emit('doc'); };
act.lock=v=>{ const on=v!=null?v:!S.sel.every(isLocked); S.sel.forEach(n=>n.setAttr('locked',on||undefined)); select(on?[]:S.sel); changed(); emit('doc'); };
act.hide=n=>{ n.visible(!n.visible()); if(!n.visible()) select(S.sel.filter(x=>x!==n)); main.batchDraw(); changed(); emit('doc'); };
act.group=()=>{ const list=S.sel.filter(n=>!isFrame(n)); if(list.length<2) return; const par=list[0].getParent(); const z=Math.max(...list.map(n=>n.zIndex()));
  const gr=new Konva.Group({id:uid(),name:'obj',kind:'group',label:'Group'}); par.add(gr); gr.zIndex(Math.min(z,par.children.length-1)); list.sort((a,b)=>a.zIndex()-b.zIndex()).forEach(n=>{ const m=n.getAbsoluteTransform().copy(); n.moveTo(gr); const inv=gr.getAbsoluteTransform().copy().invert(); inv.multiply(m); const d=inv.decompose(); n.setAttrs({x:d.x,y:d.y,rotation:d.rotation,scaleX:d.scaleX,scaleY:d.scaleY,skewX:d.skewX,skewY:d.skewY}); });
  S.multi=false; select([gr]); changed(); emit('doc'); };
act.ungroup=()=>{ const out=[]; S.sel.filter(n=>kind(n)==='group').forEach(gr=>{ const par=gr.getParent(); let z=gr.zIndex(); [...gr.getChildren()].forEach(c=>{ const m=c.getAbsoluteTransform().copy(); c.moveTo(par); const inv=par.getAbsoluteTransform().copy().invert(); inv.multiply(m); const d=inv.decompose(); c.setAttrs({x:d.x,y:d.y,rotation:d.rotation,scaleX:d.scaleX,scaleY:d.scaleY,skewX:d.skewX,skewY:d.skewY,role:undefined}); c.zIndex(Math.min(++z,par.children.length-1)); out.push(c); }); gr.destroy(); });
  if(out.length){ S.multi=out.length>1&&coarse(); select(out); changed(); emit('doc'); } };
/* align to the page (one thing) or to each other (several) */
act.align=how=>{ const list=S.sel.filter(n=>!isLocked(n)); if(!list.length) return; const f=activeFrame(), s=fsize(f);
  const box=list.length>1?unionRect(list.map(n=>prect(n,f))):{x:0,y:0,width:s.w,height:s.h};
  list.forEach(n=>{ const r=prect(n,f); let dx=0,dy=0;
    if(how==='left') dx=box.x-r.x; if(how==='hc') dx=box.x+box.width/2-(r.x+r.width/2); if(how==='right') dx=box.x+box.width-(r.x+r.width);
    if(how==='top') dy=box.y-r.y; if(how==='vc') dy=box.y+box.height/2-(r.y+r.height/2); if(how==='bottom') dy=box.y+box.height-(r.y+r.height);
    n.x(n.x()+dx); n.y(n.y()+dy); }); tr.forceUpdate(); paintUI(); changed(); };
act.distribute=axis=>{ const list=S.sel.filter(n=>!isLocked(n)); if(list.length<3) return; const f=activeFrame(); const rs=list.map(n=>({n,r:prect(n,f)})).sort((a,b)=>axis==='h'?a.r.x-b.r.x:a.r.y-b.r.y);
  const first=rs[0].r, last=rs[rs.length-1].r, total=rs.reduce((t,o)=>t+(axis==='h'?o.r.width:o.r.height),0), span=axis==='h'?last.x+last.width-first.x:last.y+last.height-first.y, gap=(span-total)/(rs.length-1);
  let at=axis==='h'?first.x:first.y; rs.forEach(o=>{ if(axis==='h'){ o.n.x(o.n.x()+at-o.r.x); at+=o.r.width+gap; } else { o.n.y(o.n.y()+at-o.r.y); at+=o.r.height+gap; } }); tr.forceUpdate(); paintUI(); changed(); };
act.flip=()=>{ S.sel.filter(n=>!isLocked(n)).forEach(n=>{ const f=activeFrame(), r=prect(n,f), c=r.x+r.width/2; n.scaleX(-n.scaleX()); const r2=prect(n,f); n.x(n.x()+c-(r2.x+r2.width/2)); }); tr.forceUpdate(); changed(); };
act.nudge=(dx,dy)=>{ S.sel.filter(n=>!isLocked(n)).forEach(n=>{ n.x(n.x()+dx); n.y(n.y()+dy); }); tr.forceUpdate(); paintUI(); changed(); };
/* a photo covers the whole page */
act.fillPage=n=>{ n=n||S.sel[0]; if(!n||kind(n)!=='image') return; const f=activeFrame(), s=fsize(f); n.setAttrs({x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:s.w,height:s.h,cornerRadius:0}); applyCrop(n); n.moveToBottom(); frameBg(f).moveToBottom(); select([n]); changed(); emit('doc'); };
BD.act=act;

/* ---------- photo crop mode: drag the photo inside its box, pinch or slider to zoom ---------- */
let crop=null;
BD.cropping=()=>!!crop;
BD.startCrop=n=>{ if(!n||kind(n)!=='image') return; crop={n,z0:n.getAttr('cropZ')||1}; tr.nodes([]); paintUI(); emit('crop',n); };
BD.endCrop=()=>{ if(!crop) return; const n=crop.n; crop=null; select([n]); changed(); emit('crop',null); };
BD.cropZoom=z=>{ if(!crop) return; crop.n.setAttr('cropZ',clamp(z,1,5)); applyCrop(crop.n); main.batchDraw(); };
(function(){ let d=null; const cp=new Map();
  wrap.addEventListener('pointerdown',e=>{ if(!crop) return; cp.set(e.pointerId,pt(e)); const n=crop.n, im=IMGS.get(n.getAttr('imgId')); if(!im) return;
    if(cp.size===2){ const [a,b]=[...cp.values()]; d={pinch:true,d0:Math.hypot(a.x-b.x,a.y-b.y),z0:n.getAttr('cropZ')||1}; return; }
    d={p0:pt(e),fx:n.getAttr('focX')??.5,fy:n.getAttr('focY')??.5}; wrap.setPointerCapture(e.pointerId); },true);
  wrap.addEventListener('pointermove',e=>{ if(!crop||!d||!cp.has(e.pointerId)) return; cp.set(e.pointerId,pt(e)); const n=crop.n, im=IMGS.get(n.getAttr('imgId'));
    if(d.pinch&&cp.size===2){ const [a,b]=[...cp.values()]; n.setAttr('cropZ',clamp(d.z0*Math.hypot(a.x-b.x,a.y-b.y)/d.d0,1,5)); applyCrop(n); main.batchDraw(); emit('cropz',n.getAttr('cropZ')); return; }
    if(d.pinch) return; const p=pt(e), c=n.crop(), k=stage.scaleX()*n.width()/c.width; const ox=im.w-c.width, oy=im.h-c.height;
    n.setAttrs({focX:ox>0?clamp(d.fx-(p.x-d.p0.x)/k/ox,0,1):.5,focY:oy>0?clamp(d.fy-(p.y-d.p0.y)/k/oy,0,1):.5}); applyCrop(n); main.batchDraw(); },true);
  const up=e=>{ if(!crop) return; cp.delete(e.pointerId); if(!cp.size) d=null; };
  wrap.addEventListener('pointerup',up,true); wrap.addEventListener('pointercancel',up,true); })();

/* ---------- saving the design as data (same format as before) ---------- */
const SKIP=new Set(['image','filters','sceneFunc','dragBoundFunc','container']);
function toObj(n){ const a={}; Object.entries(n.attrs).forEach(([k,v])=>{ if(SKIP.has(k)||typeof v==='function'||v==null) return; if(typeof v==='object'&&!Array.isArray(v)&&v.constructor!==Object) return; a[k]=v; });
  if(isFrame(n)) delete a.visible; const o={c:n.getClassName(),a}; if(n.getChildren) o.k=n.getChildren().map(toObj); return o; }
function collectImgs(o,set){ if(o.a&&o.a.imgId) set.add(o.a.imgId); (o.k||[]).forEach(k=>collectImgs(k,set)); return set; }
function rebuild(o,fresh){ const a=Object.assign({},o.a); if(fresh&&a.id) a.id=uid(); if(a.kind==='frame') delete a.visible;
  const n=new Konva[o.c](a); (o.k||[]).forEach(k=>n.add(rebuild(k,fresh)));
  if(o.c==='Image'){ const im=IMGS.get(a.imgId); if(im) n.image(im.el); if(a.kind!=='asset') applyCrop(n); }
  if(o.c==='Text') prepText(n);
  if(isFrame(n)){ const s=fsize(n); n.setAttrs({clipX:0,clipY:0,clipWidth:s.w,clipHeight:s.h}); }
  return n; }
BD.toObj=toObj; BD.rebuild=rebuild; BD.collectImgs=collectImgs;
function docJson(){ return JSON.stringify({v:1,name:S.name,nodes:main.getChildren().map(toObj)}); }
BD.docJson=docJson;
async function loadDoc(d){ tr.nodes([]); main.destroyChildren(); const ids=new Set(); (d.nodes||[]).forEach(o=>collectImgs(o,ids)); await Promise.all([...ids].map(getImg));
  (d.nodes||[]).forEach(o=>main.add(rebuild(o))); await fontsInDoc(); main.find('Image').forEach(n=>applyFx(n));
  const cur=S.cur&&main.findOne('#'+S.cur.id()); S.cur=cur||frames()[0]||null; frames().forEach(f=>f.visible(f===S.cur)); main.batchDraw(); }
async function fontsInDoc(){ const fams=new Set(); main.find('Text').forEach(t=>fams.add(t.fontFamily()+'|'+t.fontStyle())); await Promise.all([...fams].map(s=>{ const [f,st]=s.split('|'); return BD.ensureFont(f,st); })); main.find('Text').forEach(t=>{ if(t._setTextData) t._setTextData(); }); main.batchDraw(); }
BD.loadDoc=loadDoc; BD.fontsInDoc=fontsInDoc;
BD.loadDocJson=async raw=>{ await loadDoc(JSON.parse(raw)); select([]); fitPage(); changed(); emit('doc'); };

/* ---------- undo / redo ---------- */
const H={stack:[],i:-1,t:0};
function changed(){ clearTimeout(H.t); H.t=setTimeout(commit,260); emit('changed'); scheduleSave(); }
function commit(){ H.t=0; const s=docJson(); if(H.stack[H.i]===s) return; H.stack=H.stack.slice(0,H.i+1); H.stack.push(s); if(H.stack.length>100) H.stack.shift(); H.i=H.stack.length-1; emit('history'); }
function flushHist(){ if(H.t){ clearTimeout(H.t); commit(); } }
async function restore(s){ const ids=S.sel.map(n=>n.id()), cur=S.cur&&S.cur.id(); await loadDoc(JSON.parse(s)); const f=cur&&main.findOne('#'+cur); if(f) showPage(f,true); select(ids.map(id=>main.findOne('#'+id)).filter(Boolean)); scheduleSave(); emit('doc'); emit('history'); emit('changed'); }
BD.undo=async()=>{ flushHist(); if(H.i>0){ H.i--; await restore(H.stack[H.i]); } };
BD.redo=async()=>{ flushHist(); if(H.i<H.stack.length-1){ H.i++; await restore(H.stack[H.i]); } };
BD.canUndo=()=>H.i>0||!!H.t; BD.canRedo=()=>H.i<H.stack.length-1;
BD.resetHistory=()=>{ clearTimeout(H.t); H.t=0; H.stack=[docJson()]; H.i=0; emit('history'); };
BD.changed=changed; BD.emitDoc=()=>emit('doc'); BD.emitSelect=()=>emit('select',S.sel);

/* ---------- this phone's copy (IndexedDB) while it's a draft; the host page decides when ---------- */
let saveT=0;
function scheduleSave(){ if(!S.id) return; clearTimeout(saveT); saveT=setTimeout(saveNow,700); }
async function saveNow(){ clearTimeout(saveT); if(!S.id) return; const d=JSON.parse(docJson()); d.imgs=[...S.imgs]; d.cur=S.cur&&S.cur.id(); await L.idb.put('board:'+S.id,JSON.stringify(d)); if(BD.onSaved) BD.onSaved(d); }
async function openStored(id){ const raw=await L.idb.get('board:'+id); if(!raw) return false; const d=JSON.parse(raw); S.id=id; S.name=d.name||''; S.imgs=new Set(d.imgs||[]);
  await loadDoc(d); const f=d.cur&&main.findOne('#'+d.cur); showPage(f||frames()[0]); BD.resetHistory(); emit('doc'); return true; }
BD.scheduleSave=scheduleSave; BD.saveNow=saveNow; BD.openStored=openStored;

/* ---------- exporting: lossless PNG at 2×, stepping down to 1.5× / 1× only if the device runs out of memory ---------- */
const MAX_PX=16777216;
/* big photos are shrunk in halves to the size they're drawn at, so they stay sharp (never enlarged) */
function sharpen(f,scale){ const undo=[]; f.find('Image').forEach(n=>{ const im=IMGS.get(n.getAttr('imgId')); if(!im||!n.isVisible()) return; const c=n.crop(), sc=n.getAbsoluteScale(), k=scale/stage.scaleX();
    const tw=n.width()*Math.abs(sc.x)*k, th=n.height()*Math.abs(sc.y)*k, cw=c.width||im.w, ch=c.height||im.h; if(cw<tw*2.2||ch<th*2.2) return;
    const r=Math.max(tw/cw,th/ch)*1.15, sw=Math.round(im.w*r), sh=Math.round(im.h*r); if(sw<8||sh<8) return; let cv; try{ cv=L.stepDown(im.el,sw,sh); }catch(_){ return; }
    const rx=cv.width/im.w, ry=cv.height/im.h; undo.push([n,n.image(),{...c}]); n.image(cv); n.crop({x:c.x*rx,y:c.y*ry,width:cw*rx,height:ch*ry}); });
  return ()=>undo.forEach(([n,el,c])=>{ const cv=n.image(); n.image(el); n.crop(c); if(cv&&cv!==el&&cv.width!=null) cv.width=cv.height=0; }); }
function renderFrame(f,scale){ const s=fsize(f), vis=f.visible(), sel=tr.nodes(); tr.nodes([]); f.visible(true); const old={x:stage.x(),y:stage.y(),k:stage.scaleX()};
  stage.scale({x:1,y:1}); stage.position({x:0,y:0}); const undo=sharpen(f,scale);
  try{ return f.toCanvas({x:f.x(),y:f.y(),width:s.w,height:s.h,pixelRatio:scale}); }
  finally{ undo(); stage.scale({x:old.k,y:old.k}); stage.position({x:old.x,y:old.y}); f.visible(vis); tr.nodes(sel); main.batchDraw(); } }
async function exportFrame(f,opt){ opt=opt||{}; const s=fsize(f), want=opt.scale||2;
  for(const k of [want,1.5,1].filter((v,i,a)=>v<=want&&a.indexOf(v)===i)){ if(s.w*s.h*k*k>MAX_PX) continue; let c=null;
    try{ c=renderFrame(f,k); const blob=await L.canvasBlob(c,opt.type||'image/png'); c.width=c.height=0; if(blob&&blob.size>1000) return {blob,scale:k}; }catch(_){ if(c) c.width=c.height=0; } }
  throw new Error('Your phone could not make the image. Close other apps or tabs and try again.'); }
BD.renderFrame=renderFrame; BD.exportFrame=exportFrame;

/* ---------- keyboard (computer) ---------- */
document.addEventListener('keydown',e=>{ const t=e.target; if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; if(document.querySelector('dialog[open]')) return;
  const mod=e.metaKey||e.ctrlKey, k=e.key.toLowerCase();
  if(mod&&k==='z'){ e.preventDefault(); e.shiftKey?BD.redo():BD.undo(); return; } if(mod&&k==='y'){ e.preventDefault(); BD.redo(); return; }
  if(mod&&k==='a'){ e.preventDefault(); BD.selectAll(); return; } if(mod&&k==='d'){ e.preventDefault(); act.duplicate(); return; }
  if(mod&&k==='g'){ e.preventDefault(); e.shiftKey?act.ungroup():act.group(); return; }
  if(e.key==='Delete'||e.key==='Backspace'){ if(S.sel.length){ e.preventDefault(); act.del(); } return; }
  if(e.key==='Escape'){ if(crop) BD.endCrop(); else { S.multi=false; select([]); } return; }
  const step=e.shiftKey?10:1; if(S.sel.length&&['arrowleft','arrowright','arrowup','arrowdown'].includes(k)){ e.preventDefault(); act.nudge(k==='arrowleft'?-step:k==='arrowright'?step:0,k==='arrowup'?-step:k==='arrowdown'?step:0); } });

/* the brand's font stylesheet must be in before fonts can load (else the first drawings use a fallback font) */
async function fontSheet(){ const link=document.querySelector('link[data-brand-fonts]'); if(!link) return; try{ if(link.sheet&&link.sheet.cssRules) return; }catch(_){ return; }
  await new Promise(r=>{ link.addEventListener('load',r,{once:true}); link.addEventListener('error',r,{once:true}); setTimeout(r,5000); }); }
BD.start=async function(){ B=await Studio.useBrand(); BD.B=B; await fontSheet(); await Promise.all([BD.ensureFont(BD.displayFont(),''),BD.ensureFont(BD.bodyFont(),'800'),BD.ensureFont(BD.bodyFont(),'600')]); try{ await document.fonts.ready; }catch(_){}
  if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ main.find('Text').forEach(t=>{ if(t._setTextData) t._setTextData(); }); main.batchDraw(); tr.forceUpdate(); }); };
BD.busy=t=>{ const el=$('crBusy'); if(!el) return; el.hidden=!t; if(t) el.querySelector('span').textContent=t; };
})();

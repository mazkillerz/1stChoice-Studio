/* Board (experimental): a free canvas editor. Frames (artboards) on an endless canvas, with text, shapes,
   photos, brand assets, icons and drawings you can move, resize, rotate, style and export.
   This file is the engine: canvas, objects, selection, moving, snapping, undo and saving.
   board-ui.js draws the panels and menus on top of it. Uses Konva (assets/vendor/konva.min.js, MIT). */
(function(){
const BD=window.BD=window.BD||{};
const L=Studio.lab;
const $=id=>document.getElementById(id);
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const AR=/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const ACCENT='#2f7bff', GUIDE='#ff3d7f';
let B=null;

/* ---------- canvas ---------- */
const wrap=$('stageWrap');
const stage=new Konva.Stage({container:'stage',width:wrap.clientWidth||800,height:wrap.clientHeight||600});
const main=new Konva.Layer();               // the design: frames and loose objects
const ui=new Konva.Layer();                 // selection box, guides, frame names (never exported)
stage.add(main); stage.add(ui);
const tr=new Konva.Transformer({rotateAnchorOffset:26,anchorSize:9,anchorCornerRadius:2,anchorStroke:ACCENT,anchorFill:'#fff',borderStroke:ACCENT,borderStrokeWidth:1.5,
  ignoreStroke:true,flipEnabled:false,rotationSnaps:[0,45,90,135,180,225,270,315],rotationSnapTolerance:4,padding:0,keepRatio:true});
ui.add(tr);
const hoverBox=new Konva.Rect({stroke:ACCENT,strokeWidth:1.5,strokeScaleEnabled:false,listening:false,visible:false});
const marquee=new Konva.Rect({fill:'rgba(47,123,255,.08)',stroke:ACCENT,strokeWidth:1,strokeScaleEnabled:false,listening:false,visible:false});
const groupBox=new Konva.Rect({stroke:ACCENT,strokeWidth:1,dash:[4,4],strokeScaleEnabled:false,listening:false,visible:false});
const guideG=new Konva.Group({listening:false});
const labelG=new Konva.Group();
const overlayG=new Konva.Group({listening:false});   // safe zones, drop target
ui.add(overlayG,labelG,groupBox,hoverBox,guideG,marquee); tr.moveToTop();

/* ---------- state ---------- */
const S={id:null,name:'Untitled board',tool:'select',sel:[],entered:null,snap:true,grid:true,safe:false,bg:null,clean:true,
  pen:{color:'#161210',size:12,mode:'pen'},recent:[],imgs:new Set()};
BD.S=S; BD.stage=stage; BD.main=main; BD.ui=ui; BD.tr=tr;
const IMGS=new Map();   // imgId -> {el,w,h} (photo pixels, kept in memory while the board is open)
BD.IMGS=IMGS;
const ev=new EventTarget(); BD.on=(n,f)=>ev.addEventListener(n,e=>f(e.detail)); const emit=(n,d)=>ev.dispatchEvent(new CustomEvent(n,{detail:d}));

/* ---------- node helpers ---------- */
const kind=n=>n&&n.getAttr('kind');
const isFrame=n=>kind(n)==='frame';
const isObj=n=>!!n&&n.hasName&&n.hasName('obj');
const isLocked=n=>!!(n&&n.getAttr('locked'));
const frameBg=f=>f.findOne('.frame-bg');
const frames=()=>main.getChildren(isFrame);
const items=c=>c.getChildren(n=>isObj(n)||isFrame(n));
const fsize=f=>({w:f.clipWidth(),h:f.clipHeight()});
const sc=()=>stage.scaleX();
function wrect(n){ return n.getClientRect({relativeTo:stage,skipShadow:true}); }   // box in canvas (world) units
function unionRect(list){ if(!list.length) return null; let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; list.forEach(n=>{ const r=wrect(n); a=Math.min(a,r.x); b=Math.min(b,r.y); c=Math.max(c,r.x+r.width); d=Math.max(d,r.y+r.height); }); return {x:a,y:b,width:c-a,height:d-b}; }
function toWorld(p){ return stage.getAbsoluteTransform().copy().invert().point(p); }
function toScreen(p){ return stage.getAbsoluteTransform().point(p); }
function toLocal(container,screenPt){ return container.getAbsoluteTransform().copy().invert().point(screenPt); }
function frameAt(w,skip){ const fs=frames().filter(f=>f!==skip&&f.visible()); for(let i=fs.length-1;i>=0;i--){ const f=fs[i], s=fsize(f); if(w.x>=f.x()&&w.x<=f.x()+s.w&&w.y>=f.y()&&w.y<=f.y()+s.h) return f; } return null; }
function frameOf(n){ let p=n; while(p&&p!==main){ if(isFrame(p)) return p; p=p.getParent(); } return null; }
/* keep a node exactly where it is on screen while moving it to another parent */
function reparent(n,to,index){ const m=n.getAbsoluteTransform().copy(); n.moveTo(to); if(index!=null) n.zIndex(index); const inv=to.getAbsoluteTransform().copy().invert(); inv.multiply(m); const d=inv.decompose(); n.setAttrs({x:d.x,y:d.y,rotation:d.rotation,scaleX:d.scaleX,scaleY:d.scaleY,skewX:d.skewX,skewY:d.skewY}); if(isFrame(to)) frameBg(to).moveToBottom(); }
function moveByWorld(n,dx,dy){ const p=n.absolutePosition(), k=sc(); n.absolutePosition({x:p.x+dx*k,y:p.y+dy*k}); }
function nameOf(n){ const l=n.getAttr('label'); if(l) return l; const k=kind(n);
  if(k==='text'){ const t=(n.text()||'').replace(/\s+/g,' ').trim(); return t.slice(0,28)||'Text'; }
  return ({frame:'Frame',rect:'Rectangle',ellipse:'Ellipse',poly:'Polygon',star:'Star',ring:'Ring',path:'Shape',icon:'Icon',line:'Line',arrow:'Arrow',pen:'Drawing',image:'Photo',asset:'Asset',group:'Group',stroke:'Line'})[k]||'Layer'; }
BD.util={kind,isFrame,isObj,isLocked,frames,items,fsize,wrect,unionRect,toWorld,toScreen,frameOf,nameOf,frameBg,uid,clamp,AR,reparent,moveByWorld};

/* ---------- photos ---------- */
async function imgFromBlob(blob){ const el=await L.loadFile(blob); return {el,w:el.width,h:el.height}; }
async function getImg(id){
  if(IMGS.has(id)) return IMGS.get(id);
  try{
    if(id.startsWith('brand:')){ const a=L.brandAssets().find(x=>x.id===id.slice(6)); if(!a) return null; const im=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=L.assetUrl(a); }); const v={el:im,w:im.width,h:im.height}; IMGS.set(id,v); return v; }
    const blob=await L.idb.get('bimg:'+id); if(!blob) return null; const v=await imgFromBlob(blob); IMGS.set(id,v); return v;
  }catch(_){ return null; }
}
async function addPhotoFile(file){
  const id=uid(); const v=await imgFromBlob(file); IMGS.set(id,v); S.imgs.add(id);
  await L.idb.put('bimg:'+id,file); return id;
}
BD.getImg=getImg;

/* cover crop: the photo always fills its box; side handles crop instead of stretching */
function applyCrop(n){
  const im=IMGS.get(n.getAttr('imgId')); if(!im) return;
  const w=n.width(), h=n.height(), z=n.getAttr('cropZ')||1, fx=n.getAttr('focX')??.5, fy=n.getAttr('focY')??.5;
  const k=Math.max(w/im.w,h/im.h)*z, cw=Math.min(im.w,w/k), ch=Math.min(im.h,h/k);
  n.crop({x:(im.w-cw)*fx,y:(im.h-ch)*fy,width:cw,height:ch});
}
/* one-pass photo adjust filter (brightness, contrast, saturation, warmth, fade, vignette, B&W, sepia, invert) */
function Adjust(id){
  const f=this.getAttr('fx')||{}, d=id.data, W=id.width, H=id.height;
  const br=(f.bright||0)*1.4, C=(f.contrast||0)*1.28, cf=(259*(C+255))/(255*(259-C)), sat=1+(f.sat||0)/100, tp=(f.temp||0)*.45;
  const fade=(f.fade||0)/100*.4, vig=(f.vignette||0)/100, gray=(f.gray||0)/100, sep=(f.sepia||0)/100, inv=!!f.invert;
  const cx=W/2, cy=H/2, md=Math.sqrt(cx*cx+cy*cy);
  for(let y=0;y<H;y++){ const dy=y-cy;
    for(let x=0;x<W;x++){ const i=(y*W+x)*4; let r=d[i],g=d[i+1],b=d[i+2];
      r+=br; g+=br; b+=br;
      r=cf*(r-128)+128; g=cf*(g-128)+128; b=cf*(b-128)+128;
      let l=.299*r+.587*g+.114*b; r=l+(r-l)*sat; g=l+(g-l)*sat; b=l+(b-l)*sat;
      r+=tp; b-=tp;
      if(gray){ l=.299*r+.587*g+.114*b; r+=(l-r)*gray; g+=(l-g)*gray; b+=(l-b)*gray; }
      if(sep){ const sr=r*.393+g*.769+b*.189, sg=r*.349+g*.686+b*.168, sb=r*.272+g*.534+b*.131; r+=(sr-r)*sep; g+=(sg-g)*sep; b+=(sb-b)*sep; }
      if(fade){ r=r*(1-fade)+fade*190; g=g*(1-fade)+fade*185; b=b*(1-fade)+fade*180; }
      if(vig){ const dx=x-cx, t=Math.sqrt(dx*dx+dy*dy)/md, k=1-vig*Math.max(0,(t-.35)/.65)**1.6; r*=k; g*=k; b*=k; }
      if(inv){ r=255-r; g=255-g; b=255-b; }
      d[i]=r; d[i+1]=g; d[i+2]=b; } }
}
const FX_KEYS=['bright','contrast','sat','temp','fade','vignette','gray','sepia','invert','blur','noise','hue'];
function hasFx(n){ const f=n.getAttr('fx'); return !!f&&FX_KEYS.some(k=>f[k]); }
function applyFx(n,pr){
  if(kind(n)!=='image'&&kind(n)!=='asset') return;
  if(!hasFx(n)){ if(n.isCached()) n.clearCache(); n.filters([]); return; }
  const f=n.getAttr('fx'), list=[Adjust];
  if(f.hue){ list.push(Konva.Filters.HSL); n.hue(f.hue); }
  if(f.blur){ list.push(Konva.Filters.Blur); n.blurRadius(f.blur); }
  if(f.noise){ list.push(Konva.Filters.Noise); n.noise(f.noise/100); }
  n.filters(list);
  const big=Math.max(n.width()*Math.abs(n.scaleX()),n.height()*Math.abs(n.scaleY()));
  n.cache({pixelRatio:pr||Math.min(2,4096/Math.max(1,big))});
}
BD.applyFx=applyFx; BD.applyCrop=applyCrop; BD.hasFx=hasFx;

/* text background (a coloured box behind the words) is drawn by wrapping Konva's own text drawing */
function textScene(ctx,shape){
  const bg=shape.getAttr('tbg');
  if(bg){ const r=shape.getAttr('tbgR')||0, w=shape.width(), h=shape.height(); ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(0,0,w,h,Math.min(r,w/2,h/2)); else ctx.rect(0,0,w,h); ctx.fillStyle=bg; ctx.fill(); }
  Konva.Text.prototype._sceneFunc.call(shape,ctx);
}
function prepText(n){ n.sceneFunc(textScene); n.direction(AR.test(n.text()||'')?'rtl':'inherit'); }
BD.prepText=prepText;

/* fills: solid, linear or radial gradient (angle in degrees) */
function applyFill(n){
  const t=n.getAttr('fillType')||'solid';
  if(t==='solid'||kind(n)==='image'){ n.fillPriority('color'); return; }
  const r=n.getSelfRect(), a=(n.getAttr('gradAngle')??90)*Math.PI/180, A=n.getAttr('gradA')||'#ffffff', Bc=n.getAttr('gradB')||'#000000';
  const cx=r.x+r.width/2, cy=r.y+r.height/2, len=(Math.abs(r.width*Math.sin(a))+Math.abs(r.height*Math.cos(a)))/2;
  if(t==='linear') n.setAttrs({fillPriority:'linear-gradient',fillLinearGradientStartPoint:{x:cx-Math.sin(a)*len,y:cy+Math.cos(a)*len},fillLinearGradientEndPoint:{x:cx+Math.sin(a)*len,y:cy-Math.cos(a)*len},fillLinearGradientColorStops:[0,A,1,Bc]});
  else{ const rad=Math.max(r.width,r.height)/2; n.setAttrs({fillPriority:'radial-gradient',fillRadialGradientStartPoint:{x:cx,y:cy},fillRadialGradientEndPoint:{x:cx,y:cy},fillRadialGradientStartRadius:0,fillRadialGradientEndRadius:rad,fillRadialGradientColorStops:[0,A,1,Bc]}); }
}
BD.applyFill=applyFill;

/* ---------- making things ---------- */
function brandColors(){ const c=(B&&B.colors)||{}; return {ink:c.ink||'#161210',paper:c.paper||'#ffffff',accent:c.accent||'#D6B078',cream:c.cream||'#F3EADC',blob:c.blob||'#E5D5C0',brown:c.brown||'#7A563A'}; }
function displayFont(){ return (B&&B.fonts&&B.fonts.display)||'system-ui'; }
function bodyFont(){ return (B&&B.fonts&&B.fonts.body)||'system-ui'; }
BD.brandColors=brandColors; BD.displayFont=displayFont; BD.bodyFont=bodyFont;

function makeFrame(x,y,w,h,opt){ opt=opt||{};
  const f=new Konva.Group({id:uid(),x:Math.round(x),y:Math.round(y),clipX:0,clipY:0,clipWidth:w,clipHeight:h,kind:'frame',label:opt.label||'Frame '+(frames().length+1)});
  f.add(new Konva.Rect({name:'frame-bg',width:w,height:h,fill:opt.fill||'#ffffff'}));
  main.add(f); return f; }
function setFrameSize(f,w,h){ w=Math.max(1,Math.round(w)); h=Math.max(1,Math.round(h)); f.clipWidth(w); f.clipHeight(h); const bg=frameBg(f); bg.size({width:w,height:h}); applyFill(bg); }
BD.makeFrame=makeFrame; BD.setFrameSize=setFrameSize;

function obj(cls,attrs){ const n=new Konva[cls](Object.assign({id:uid(),name:'obj'},attrs)); return n; }
function makeText(text,o){ o=o||{}; const n=obj('Text',Object.assign({kind:'text',text,autoW:o.width==null,fontFamily:displayFont(),fontSize:96,fontStyle:'normal',fill:brandColors().ink,align:'center',lineHeight:1.15,padding:0,fillAfterStrokeEnabled:true},o)); prepText(n); return n; }
function makeShape(def,size,color){ const s=size||300, c=color||brandColors().accent; let n;
  if(def.make==='rect') n=obj('Rect',{kind:'rect',width:s,height:s,fill:c,cornerRadius:def.radius||0});
  else if(def.make==='ellipse') n=obj('Ellipse',{kind:'ellipse',radiusX:s/2,radiusY:s/2,fill:c});
  else if(def.make==='poly') n=obj('RegularPolygon',{kind:'poly',sides:def.sides,radius:s/2,fill:c});
  else if(def.make==='star') n=obj('Star',{kind:'star',numPoints:def.points||5,innerRadius:s/2*(def.inner||.45),outerRadius:s/2,fill:c});
  else if(def.make==='ring') n=obj('Ring',{kind:'ring',innerRadius:s*.34,outerRadius:s/2,fill:c});
  else if(def.make==='line') n=obj('Line',{kind:'line',points:[0,0,s*1.4,0],stroke:c,strokeWidth:12,lineCap:'round',lineJoin:'round',hitStrokeWidth:30});
  else if(def.make==='arrow') n=obj('Arrow',{kind:'arrow',points:[0,0,s*1.4,0],stroke:c,fill:c,strokeWidth:12,pointerLength:36,pointerWidth:36,lineCap:'round',lineJoin:'round',hitStrokeWidth:30});
  else if(def.stroke) n=obj('Path',{kind:'stroke',data:def.path,stroke:c,strokeWidth:8,lineCap:'round',lineJoin:'round',scaleX:s/100,scaleY:s/100,strokeScaleEnabled:false,hitStrokeWidth:30});
  else n=obj('Path',{kind:'path',data:def.path,fill:c,scaleX:s/100,scaleY:s/100,strokeScaleEnabled:false});
  return n; }
function makeIcon(def,size,color){ const s=size||200; return obj('Path',{kind:'icon',data:def.d,stroke:color||brandColors().ink,strokeWidth:2,lineCap:'round',lineJoin:'round',fill:'',scaleX:s/24,scaleY:s/24,hitStrokeWidth:6,iconId:def.id}); }
function makeImage(imgId,w,h,k){ const im=IMGS.get(imgId); const n=obj('Image',{kind:k||'image',imgId,image:im&&im.el,width:w,height:h,cropZ:1,focX:.5,focY:.5}); applyCrop(n); return n; }
BD.make={text:makeText,shape:makeShape,icon:makeIcon,image:makeImage,frame:makeFrame};

/* place a new object in the frame you're looking at (or the selected one), centred */
function targetFrame(){ const s=S.sel[0]; if(s){ if(isFrame(s)) return s; const f=frameOf(s); if(f) return f; }
  const c=toWorld({x:stage.width()/2,y:stage.height()/2}); return frameAt(c)||frames().slice(-1)[0]||null; }
function place(n,opt){ opt=opt||{}; const f=opt.frame!==undefined?opt.frame:targetFrame(); const parent=f||main;
  parent.add(n);
  const r=n.getClientRect({relativeTo:parent}), pos=n.position();
  let cx,cy; if(opt.at){ const l=toLocal(parent,toScreen(opt.at)); cx=l.x; cy=l.y; } else if(f){ const s=fsize(f); cx=s.w/2; cy=s.h/2; } else { const c=toLocal(parent,{x:stage.width()/2,y:stage.height()/2}); cx=c.x; cy=c.y; }
  n.position({x:Math.round(pos.x+cx-(r.x+r.width/2)),y:Math.round(pos.y+cy-(r.y+r.height/2))});
  if(kind(n)==='image'||kind(n)==='asset') applyFx(n);
  applyFill(n); select([n]); changed(); return n; }
BD.place=place; BD.targetFrame=targetFrame;

async function addPhotos(files,at){
  const list=[...files].filter(L.isPhotoFile); if(!list.length) return [];
  busy('Adding '+(list.length>1?list.length+' photos':'the photo')+'…');
  const out=[];
  for(const file of list){ try{ const id=await addPhotoFile(file), im=IMGS.get(id), f=at?frameAt(at):targetFrame(), box=f?fsize(f):{w:1080,h:1080};
      const k=Math.min(1,box.w*.8/im.w,box.h*.8/im.h), n=makeImage(id,Math.round(im.w*k),Math.round(im.h*k));
      n.setAttr('label',(file.name||'Photo').replace(/\.[a-z0-9]+$/i,'').slice(0,40));
      place(n,{frame:f,at:at&&out.length===0?at:null}); if(at) at={x:at.x+40,y:at.y+40}; out.push(n);
    }catch(err){ toast('Could not open '+(file.name||'that photo')+'.'); } }
  busy(null); if(out.length>1) select(out); emit('photos'); return out;
}
async function addAsset(a,at){ const id='brand:'+a.id; const im=await getImg(id); if(!im){ toast(a.label+' is not added to the brand kit yet.'); return; }
  const f=at?frameAt(at):targetFrame(), box=f?fsize(f):{w:1080,h:1080}, k=Math.min(1,box.w*.6/im.w,box.h*.6/im.h);
  const n=makeImage(id,Math.round(im.w*k),Math.round(im.h*k),'asset'); n.setAttr('label',a.label); return place(n,{frame:f,at}); }
BD.addPhotos=addPhotos; BD.addAsset=addAsset;

/* ---------- selection ---------- */
function canTransform(list){ return list.length&&list.every(n=>!isLocked(n)); }
function select(list,opt){
  list=(list||[]).filter(n=>n&&n.getStage()&&n.visible());
  S.sel=list;
  const t=list.filter(n=>!isLocked(n));
  const onlyText=t.length&&t.every(n=>kind(n)==='text');
  const anyFrame=t.some(isFrame);
  tr.nodes(t);
  tr.rotateEnabled(!anyFrame);
  tr.resizeEnabled(!(anyFrame&&t.length>1));
  tr.enabledAnchors(onlyText?['top-left','top-right','bottom-left','bottom-right','middle-left','middle-right']:
    t.length===1&&['line','arrow'].includes(kind(t[0]))?['middle-left','middle-right']:
    ['top-left','top-center','top-right','middle-right','middle-left','bottom-left','bottom-center','bottom-right']);
  tr.keepRatio(t.length>1||t.some(n=>['icon','path','stroke','star','poly','ring','group','pen','asset'].includes(kind(n))));
  hoverBox.visible(false);
  paintUI();
  if(!(opt&&opt.quiet)) emit('select',list);
}
BD.select=select;
function selectAll(){ const scope=S.entered||(S.sel[0]&&frameOf(S.sel[0])&&!isFrame(S.sel[0])?frameOf(S.sel[0]):main); select(items(scope).filter(n=>!isLocked(n)&&n.visible())); }
BD.selectAll=selectAll;

/* ---------- drawing the overlay: frame names, safe zones, entered group ---------- */
function paintUI(){
  const k=sc(); labelG.destroyChildren(); overlayG.destroyChildren();
  frames().forEach(f=>{ if(!f.visible()) return; const s=fsize(f), on=S.sel.includes(f);
    const t=new Konva.Text({x:f.x(),y:f.y()-20/k,text:nameOf(f)+'   '+s.w+' × '+s.h,fontSize:12/k,fontFamily:'system-ui,sans-serif',fill:on?ACCENT:(document.documentElement.dataset.dark==='1'?'#a9a49b':'#6b665e'),fontStyle:on?'bold':'normal',frameRef:f.id(),width:Math.max(40/k,s.w),wrap:'none',ellipsis:true,hitStrokeWidth:0});
    labelG.add(t);
    if(S.safe&&Math.abs(s.w/s.h-9/16)<.01){ const top=s.h*250/1920, bot=s.h*340/1920;
      overlayG.add(new Konva.Rect({x:f.x(),y:f.y(),width:s.w,height:top,fill:'rgba(255,61,127,.10)'}),new Konva.Rect({x:f.x(),y:f.y()+s.h-bot,width:s.w,height:bot,fill:'rgba(255,61,127,.10)'}),
        new Konva.Text({x:f.x()+8/k,y:f.y()+6/k,text:'Kept clear of the app’s top bar',fontSize:11/k,fill:'#ff3d7f'}),new Konva.Text({x:f.x()+8/k,y:f.y()+s.h-bot+6/k,text:'Kept clear of the reply bar',fontSize:11/k,fill:'#ff3d7f'})); }
  });
  if(S.entered&&S.entered.getStage()){ const r=wrect(S.entered); groupBox.setAttrs({x:r.x,y:r.y,width:r.width,height:r.height,visible:true}); } else groupBox.visible(false);
  ui.batchDraw();
}
BD.paintUI=paintUI;

/* ---------- view: pan and zoom ---------- */
function setView(x,y,k){ k=clamp(k,.02,8); stage.scale({x:k,y:k}); stage.position({x,y}); viewChanged(); }
function zoomAt(k,pt){ const old=sc(); k=clamp(k,.02,8); const w={x:(pt.x-stage.x())/old,y:(pt.y-stage.y())/old}; setView(pt.x-w.x*k,pt.y-w.y*k,k); }
function zoomBy(f){ zoomAt(sc()*f,{x:stage.width()/2,y:stage.height()/2}); }
function fitRect(r,pad){ if(!r||!r.width) return; pad=pad==null?60:pad; const k=clamp(Math.min((stage.width()-pad*2)/r.width,(stage.height()-pad*2)/r.height),.02,8);
  setView(stage.width()/2-(r.x+r.width/2)*k,stage.height()/2-(r.y+r.height/2)*k,k); }
function fitAll(){ const list=items(main); if(!list.length){ setView(stage.width()/2,stage.height()/2,1); return; } fitRect(unionRect(list)); }
function fitSel(){ if(S.sel.length) fitRect(unionRect(S.sel),80); else fitAll(); }
let viewT=0;
function viewChanged(){ const k=sc(), g=20*k;
  wrap.style.backgroundSize=S.grid&&g>=6?g+'px '+g+'px':'0 0'; wrap.style.backgroundPosition=stage.x()+'px '+stage.y()+'px';
  paintUI(); if(edit) placeEditor(); emit('view'); clearTimeout(viewT); viewT=setTimeout(()=>scheduleSave(),800); }
BD.view={set:setView,zoomAt,zoomBy,fitRect,fitAll,fitSel,changed:viewChanged};
function resize(){ stage.size({width:wrap.clientWidth,height:wrap.clientHeight}); viewChanged(); }
new ResizeObserver(()=>resize()).observe(wrap);

/* ---------- snapping ---------- */
const TOL=6;
function snapLines(skip,scopeNodes){
  const xs=[], ys=[];
  scopeNodes.forEach(n=>{ if(skip.includes(n)||!n.visible()) return; const r=wrect(n); xs.push(r.x,r.x+r.width/2,r.x+r.width); ys.push(r.y,r.y+r.height/2,r.y+r.height); });
  return {xs,ys};
}
function targetsFor(list){
  const out=[]; const f=list.length&&!isFrame(list[0])?frameOf(list[0]):null;
  if(f){ out.push(f); items(f).forEach(n=>out.push(n)); }
  else items(main).forEach(n=>out.push(n));
  if(S.entered) items(S.entered).forEach(n=>out.push(n));
  return snapLines(list,out);
}
function snapBox(r,lines){ const k=sc(), tol=TOL/k; let dx=0,dy=0,bx=null,by=null;
  const cand=[r.x,r.x+r.width/2,r.x+r.width]; let best=tol+1;
  cand.forEach(c=>lines.xs.forEach(l=>{ const d=l-c; if(Math.abs(d)<Math.abs(best)&&Math.abs(d)<=tol){ best=d; bx=l; } })); if(bx!=null) dx=best;
  const cy=[r.y,r.y+r.height/2,r.y+r.height]; best=tol+1;
  cy.forEach(c=>lines.ys.forEach(l=>{ const d=l-c; if(Math.abs(d)<Math.abs(best)&&Math.abs(d)<=tol){ best=d; by=l; } })); if(by!=null) dy=best;
  return {dx,dy,gx:bx,gy:by}; }
function drawGuides(gx,gy,r){ guideG.destroyChildren(); const big=1e6;
  if(gx!=null) guideG.add(new Konva.Line({points:[gx,r?Math.min(r.y-80/sc(),r.y):-big,gx,r?r.y+r.height+80/sc():big],stroke:GUIDE,strokeWidth:1,strokeScaleEnabled:false}));
  if(gy!=null) guideG.add(new Konva.Line({points:[r?r.x-80/sc():-big,gy,r?r.x+r.width+80/sc():big,gy],stroke:GUIDE,strokeWidth:1,strokeScaleEnabled:false}));
  ui.batchDraw(); }
function clearGuides(){ guideG.destroyChildren(); ui.batchDraw(); }

/* resize handles snap too (only for objects that aren't turned) */
let anchorLines=null;
tr.anchorDragBoundFunc((oldPos,newPos)=>{
  if(!S.snap||!anchorLines) return newPos; if(tr.nodes().some(n=>Math.abs(n.getAbsoluteRotation()%90)>.01)) return newPos;
  const k=sc(), tol=TOL; let x=newPos.x, y=newPos.y, gx=null, gy=null;
  const a=tr.getActiveAnchor()||''; const hx=!/center/.test(a), vy=!/middle/.test(a);
  if(hx) for(const l of anchorLines.xs){ const sx=l*k+stage.x(); if(Math.abs(sx-x)<=tol){ x=sx; gx=l; break; } }
  if(vy) for(const l of anchorLines.ys){ const sy=l*k+stage.y(); if(Math.abs(sy-y)<=tol){ y=sy; gy=l; break; } }
  drawGuides(gx,gy,null); return {x,y}; });

/* turn the stretch the handles make into real sizes, so strokes, corners and text stay crisp */
function bakeScale(n){
  const k=kind(n), sx=n.scaleX(), sy=n.scaleY(), ax=Math.abs(sx), ay=Math.abs(sy), anchor=tr.getActiveAnchor()||'';
  if(k==='frame'){ setFrameSize(n,fsize(n).w*ax,fsize(n).h*ay); n.scale({x:1,y:1}); return; }
  if(k==='text'){ if(/middle-(left|right)/.test(anchor)){ n.width(Math.max(24,n.width()*ax)); n.setAttr('autoW',false); }
      else { n.fontSize(Math.max(4,n.fontSize()*ay)); if(!n.getAttr('autoW')) n.width(Math.max(24,n.width()*ax)); n.padding(n.padding()*ay); }
      n.scale({x:Math.sign(sx)||1,y:Math.sign(sy)||1}); if(n.getAttr('autoW')) n.width(undefined); return; }
  if(k==='rect'||k==='image'||k==='asset'){ n.width(Math.max(2,n.width()*ax)); n.height(Math.max(2,n.height()*ay)); n.scale({x:Math.sign(sx)||1,y:Math.sign(sy)||1}); if(k!=='rect') applyCrop(n); return; }
  if(k==='ellipse'){ n.radiusX(Math.max(1,n.radiusX()*ax)); n.radiusY(Math.max(1,n.radiusY()*ay)); n.scale({x:Math.sign(sx)||1,y:Math.sign(sy)||1}); return; }
  if(k==='line'||k==='arrow'){ n.points(n.points().map((v,i)=>i%2?v*ay:v*ax)); n.scale({x:Math.sign(sx)||1,y:Math.sign(sy)||1}); return; }
}
tr.on('transformstart',()=>{ if(drag&&drag.type!=='move'&&drag.type!=='pan'&&drag.type!=='pinch'){ const p=drag.prevSel; drag=null; marquee.visible(false); if(p) select(p,{quiet:true}); } anchorLines=S.snap?targetsFor(tr.nodes()):null; transforming=true; });
tr.on('transform',()=>{ tr.nodes().forEach(n=>{ bakeScale(n); applyFill(n); }); badge(); paintUI(); emit('geom'); });
tr.on('transformend',()=>{ transforming=false; anchorLines=null; clearGuides(); tr.nodes().forEach(n=>{ applyFx(n); }); badge(true); changed(); emit('geom'); });
let transforming=false;

/* ---------- size badge (W × H under the selection while moving/resizing) ---------- */
const badgeEl=$('badge');
function badge(hide,txt){ if(hide){ badgeEl.hidden=true; return; } const r=S.sel.length?unionRect(S.sel):null; if(!r){ badgeEl.hidden=true; return; }
  const p=toScreen({x:r.x+r.width/2,y:r.y+r.height}); badgeEl.textContent=txt||Math.round(r.width)+' × '+Math.round(r.height); badgeEl.style.transform=`translate(${Math.round(p.x)}px,${Math.round(p.y+12)}px) translateX(-50%)`; badgeEl.hidden=false; }
BD.badge=badge;

/* ---------- pointer: select, move, marquee, draw, pan ---------- */
let drag=null, spaceDown=false, edit=null;
const ptrs=new Map();
function spt(e){ const r=stage.container().getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
function nearAnchor(p){ if(!tr.nodes().length||!tr.visible()) return false; return tr.getChildren(c=>c.getClassName()==='Rect'&&c.name()!=='back'&&c.visible()&&c.listening()).some(a=>{ const r=a.getClientRect(); return p.x>=r.x-3&&p.x<=r.x+r.width+3&&p.y>=r.y-3&&p.y<=r.y+r.height+3; }); }
function trPart(shape){ let p=shape; while(p){ if(p===tr) return true; p=p.getParent(); } return false; }
function pick(shape,deep){
  if(!shape) return null;
  if(shape.getLayer()===ui){ const ref=shape.getAttr('frameRef'); if(ref){ const f=main.findOne('#'+ref); return f?{node:f,label:true}:null; } return null; }
  if(shape.hasName('frame-bg')){ const f=shape.getParent(); return isLocked(f)?{empty:true}:{bg:f}; }
  let n=shape;
  if(deep){ while(n.getParent()&&!isObj(n)&&n.getParent()!==main) n=n.getParent(); }
  else while(n.getParent()&&n.getParent()!==main&&!isFrame(n.getParent())&&n.getParent()!==S.entered) n=n.getParent();
  if(!isObj(n)&&!isFrame(n)) return null;
  for(let p=n;p&&p!==main;p=p.getParent()) if(isLocked(p)&&!isFrame(p)) return {locked:n,bg:frameOf(n)};
  return {node:n};
}
BD.pick=pick;
function setTool(t){ S.tool=t; wrap.dataset.tool=t; if(t!=='select'&&S.entered){ S.entered=null; } emit('tool',t); }
BD.setTool=setTool;
const DRAW_TOOLS=['frame','rect','ellipse','line','arrow','text','pen','star','poly'];

wrap.addEventListener('contextmenu',e=>{ e.preventDefault(); if(e.target.closest(OVER)) return; const p=spt(e), hit=pick(stage.getIntersection(p));
  if(hit&&hit.node&&!S.sel.includes(hit.node)) select([hit.node]); else if(!hit||hit.empty||(hit.bg&&!hit.node)) { if(hit&&hit.bg&&!items(hit.bg).length) select([hit.bg]); }
  emit('context',{x:e.clientX,y:e.clientY,world:toWorld(p)}); });

/* clicks on the canvas never steal focus (so a new text box keeps it); a field in a panel gives it back */
wrap.addEventListener('mousedown',e=>{ if(!e.target.closest('.ed-text,input,textarea,select,button')) e.preventDefault(); });
const OVER='.ed-text,.crop-pad,.crop-bar,.b-corner,.drop-hint';
wrap.addEventListener('pointerdown',e=>{
  if(e.target.closest(OVER)) return;
  const ae=document.activeElement; if(ae&&ae!==document.body&&!ae.classList.contains('ed-text')&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) ae.blur();
  const p=spt(e); ptrs.set(e.pointerId,p);
  if(edit) commitEdit();
  if(ptrs.size===2){ // two fingers: pinch to zoom, move to pan
    cancelDrag(); const [a,b]=[...ptrs.values()]; drag={type:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),k0:sc(),c0:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},s0:stage.position()}; return; }
  if(ptrs.size>2) return;
  if(e.button===2) return;
  const shape=stage.getIntersection(p);
  if(shape&&trPart(shape)) return;     // the selection handles take it from here
  if(nearAnchor(p)) return;
  wrap.setPointerCapture(e.pointerId);
  const w=toWorld(p);
  const touchPan=e.pointerType==='touch'&&S.tool==='select'&&!shape;
  if(e.button===1||spaceDown||S.tool==='hand'||touchPan){ drag={type:'pan',p0:p,s0:stage.position()}; wrap.classList.add('panning'); e.preventDefault(); return; }
  if(DRAW_TOOLS.includes(S.tool)){ startDraw(w,p,e); return; }
  const prevSel=[...S.sel];
  const hit=pick(shape,e.ctrlKey||e.metaKey);
  if(S.entered&&(!hit||!hit.node||!S.entered.isAncestorOf(hit.node))){ S.entered=null; paintUI(); }
  const inSelBox=S.sel.length>1&&!e.shiftKey&&(()=>{ const r=unionRect(S.sel); return w.x>=r.x&&w.x<=r.x+r.width&&w.y>=r.y&&w.y<=r.y+r.height; })();
  if(hit&&hit.node){
    const n=hit.node;
    if(e.shiftKey){ if(S.sel.includes(n)) select(S.sel.filter(x=>x!==n)); else select([...S.sel.filter(x=>!isFrame(x)||isFrame(n)),n]); }
    else if(!S.sel.includes(n)&&!inSelBox) select([n]);
    drag={type:'pending',p0:p,w0:w,alt:e.altKey,via:hit.label?'label':'node',prevSel}; return;
  }
  if(inSelBox){ drag={type:'pending',p0:p,w0:w,alt:e.altKey,prevSel}; return; }
  if(hit&&hit.bg&&!items(hit.bg).length&&!e.shiftKey){ select([hit.bg]); drag={type:'pending',p0:p,w0:w,alt:e.altKey,prevSel}; return; }
  // empty canvas or a frame's empty area: drag a box to select
  if(!e.shiftKey) select([]);
  drag={type:'marquee',w0:w,scope:hit&&hit.bg?hit.bg:main,base:e.shiftKey?[...S.sel]:[],prevSel};
});
wrap.addEventListener('pointermove',e=>{ if(!drag&&e.target.closest(OVER)) return;
  const p=spt(e); if(ptrs.has(e.pointerId)) ptrs.set(e.pointerId,p);
  if(!drag){ hover(p); return; }
  if(drag.type==='pinch'){ if(ptrs.size<2) return; const [a,b]=[...ptrs.values()], d=Math.hypot(a.x-b.x,a.y-b.y), c={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const k=clamp(drag.k0*d/Math.max(1,drag.d0),.02,8), w0={x:(drag.c0.x-drag.s0.x)/drag.k0,y:(drag.c0.y-drag.s0.y)/drag.k0};
    setView(c.x-w0.x*k,c.y-w0.y*k,k); return; }
  if(drag.type==='pan'){ stage.position({x:drag.s0.x+p.x-drag.p0.x,y:drag.s0.y+p.y-drag.p0.y}); viewChanged(); return; }
  const w=toWorld(p);
  if(drag.type==='pending'){ if(Math.hypot(p.x-drag.p0.x,p.y-drag.p0.y)<4) return; startMove(drag.alt); }
  if(drag.type==='move'){ moveTo(w,e); return; }
  if(drag.type==='marquee'){ const r=normRect(drag.w0,w); marquee.setAttrs({...r,visible:true});
    const hits=items(drag.scope).filter(n=>n.visible()&&!isLocked(n)&&Konva.Util.haveIntersection(r,wrect(n)));
    select([...new Set([...drag.base,...hits])],{quiet:true}); ui.batchDraw(); return; }
  if(drag.type==='draw'){ drawMove(w,e); return; }
});
function endPtr(e){
  ptrs.delete(e.pointerId);
  if(!drag) return;
  if(drag.type==='pinch'){ if(ptrs.size<2){ drag=null; } return; }
  const d=drag; drag=null;
  if(d.type==='pan'){ wrap.classList.remove('panning'); return; }
  if(d.type==='move'){ endMove(); return; }
  if(d.type==='marquee'){ marquee.visible(false); ui.batchDraw(); emit('select',S.sel); return; }
  if(d.type==='draw'){ endDraw(d); return; }
}
wrap.addEventListener('pointerup',endPtr); wrap.addEventListener('pointercancel',endPtr);
wrap.addEventListener('dblclick',e=>{ if(e.target.closest(OVER)) return;
  const p=spt(e), shape=stage.getIntersection(p); if(shape&&trPart(shape)){ const n=S.sel[0]; if(n&&kind(n)==='text') startEdit(n); else if(n&&kind(n)==='image') emit('crop',n); return; }
  const hit=pick(shape); if(!hit) return;
  if(hit.label){ emit('rename',hit.node); return; }
  const n=hit.node; if(!n) return;
  if(kind(n)==='text'){ startEdit(n); return; }
  if(kind(n)==='group'){ S.entered=n; const inner=pick(shape,true); paintUI(); if(inner&&inner.node) select([inner.node]); return; }
  if(kind(n)==='image') emit('crop',n);
});
function normRect(a,b){ return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)}; }
function cancelDrag(){ if(drag&&drag.type==='move') endMove(); if(drag&&drag.type==='marquee'){ marquee.visible(false); } drag=null; }

/* hold Alt to measure: distances from the selection to the thing under the pointer (or its frame) */
let altDown=false, lastP=null;
const frameRect=f=>({x:f.x(),y:f.y(),width:fsize(f).w,height:fsize(f).h});
function measure(p){ guideG.destroyChildren(); if(!altDown||!S.sel.length||drag){ ui.batchDraw(); return; }
  const a=unionRect(S.sel); let t=null;
  if(p){ const sh=stage.getIntersection(p), h=sh&&!trPart(sh)?pick(sh):null; if(h&&h.node&&!S.sel.includes(h.node)&&!h.label) t=wrect(h.node); else if(h&&h.bg&&!S.sel.includes(h.bg)) t=frameRect(h.bg); }
  if(!t){ const f=!isFrame(S.sel[0])&&frameOf(S.sel[0]); if(f) t=frameRect(f); }
  if(!t){ ui.batchDraw(); return; }
  const k=sc(), L=[], ay=a.y+a.height/2, ax=a.x+a.width/2, ar=a.x+a.width, ab=a.y+a.height, tr_=t.x+t.width, tb=t.y+t.height;
  if(ar<=t.x) L.push([ar,ay,t.x,ay]); else if(tr_<=a.x) L.push([tr_,ay,a.x,ay]); else { if(t.x<a.x) L.push([t.x,ay,a.x,ay]); if(tr_>ar) L.push([ar,ay,tr_,ay]); }
  if(ab<=t.y) L.push([ax,ab,ax,t.y]); else if(tb<=a.y) L.push([ax,tb,ax,a.y]); else { if(t.y<a.y) L.push([ax,t.y,ax,a.y]); if(tb>ab) L.push([ax,ab,ax,tb]); }
  guideG.add(new Konva.Rect({...t,stroke:GUIDE,strokeWidth:1,dash:[4,3],strokeScaleEnabled:false}));
  L.forEach(([x1,y1,x2,y2])=>{ const len=Math.round(Math.hypot(x2-x1,y2-y1)); if(len<1) return;
    guideG.add(new Konva.Line({points:[x1,y1,x2,y2],stroke:GUIDE,strokeWidth:1,strokeScaleEnabled:false}));
    const lb=new Konva.Label({x:(x1+x2)/2,y:(y1+y2)/2}); lb.add(new Konva.Tag({fill:GUIDE,cornerRadius:3/k})); lb.add(new Konva.Text({text:String(len),fontSize:11/k,padding:3/k,fill:'#fff',fontFamily:'system-ui,sans-serif',fontStyle:'bold'}));
    lb.offsetX(lb.width()/2); lb.offsetY(lb.height()/2); guideG.add(lb); });
  ui.batchDraw(); }
BD.setAlt=v=>{ if(altDown===v) return; altDown=v; measure(v?lastP:null); };
let hoverRaf=0;
function hover(p){ lastP=p; if(altDown){ measure(p); } if(hoverRaf) return; hoverRaf=requestAnimationFrame(()=>{ hoverRaf=0; if(drag||transforming){ hoverBox.visible(false); return; }
  const shape=stage.getIntersection(p); const hit=shape&&!trPart(shape)?pick(shape):null; const n=hit&&hit.node;
  if(n&&!S.sel.includes(n)){ const r=wrect(n); hoverBox.setAttrs({...r,visible:true}); } else hoverBox.visible(false);
  ui.batchDraw(); }); }

/* moving the selection */
function startMove(dup){
  let list=S.sel.filter(n=>!isLocked(n)); if(!list.length){ drag=null; return; }
  if(dup){ list=duplicate(list,0); }
  const r=unionRect(list);
  drag={type:'move',list,w0:drag.w0,r0:r,start:list.map(n=>n.absolutePosition()),lines:S.snap?targetsFor(list):null};
  hoverBox.visible(false);
}
function moveTo(w,e){
  const d=drag; let dx=w.x-d.w0.x, dy=w.y-d.w0.y;
  if(e.shiftKey){ if(Math.abs(dx)>Math.abs(dy)) dy=0; else dx=0; }
  let gx=null, gy=null;
  if(d.lines&&!e.ctrlKey&&!e.metaKey){ const s=snapBox({x:d.r0.x+dx,y:d.r0.y+dy,width:d.r0.width,height:d.r0.height},d.lines); dx+=s.dx; dy+=s.dy; gx=s.gx; gy=s.gy; }
  dx=Math.round(dx); dy=Math.round(dy);
  const k=sc();
  d.list.forEach((n,i)=>{ n.absolutePosition({x:d.start[i].x+dx*k,y:d.start[i].y+dy*k}); });
  // objects follow the frame under them (so they never vanish behind a frame's edge)
  d.list.forEach((n,i)=>{ if(isFrame(n)||(n.getParent()!==main&&!isFrame(n.getParent()))) return; const r=wrect(n), c={x:r.x+r.width/2,y:r.y+r.height/2}, f=frameAt(c)||main;
    if(f!==n.getParent()){ reparent(n,f); d.start[i]=n.absolutePosition(); d.start[i]={x:d.start[i].x-dx*k,y:d.start[i].y-dy*k}; tr.nodes(tr.nodes()); } });
  const r={x:d.r0.x+dx,y:d.r0.y+dy,width:d.r0.width,height:d.r0.height};
  if(gx!=null||gy!=null) drawGuides(gx,gy,r); else clearGuides();
  tr.forceUpdate(); paintUI(); badge(false,(Math.round(r.x)-(frameOrigin(d.list[0]).x))+',  '+(Math.round(r.y)-frameOrigin(d.list[0]).y));
  emit('geom');
}
function frameOrigin(n){ const f=n&&!isFrame(n)&&frameOf(n); return f?{x:f.x(),y:f.y()}:{x:0,y:0}; }
function endMove(){ clearGuides(); badge(true); if(drag) drag=null; changed(); emit('geom'); emit('doc'); }

/* drawing new shapes, frames, text and freehand lines */
function startDraw(w,p,e){
  const t=S.tool, c=brandColors();
  if(t==='text'){ const f=frameAt(w); const n=makeText('',{fontSize:f?Math.round(fsize(f).w/12):72,autoW:true}); (f||main).add(n); const l=toLocal(f||main,p); n.position({x:Math.round(l.x),y:Math.round(l.y-n.fontSize()/2)}); select([n]); setTool('select'); startEdit(n,true); return; }
  const parent=t==='frame'?main:(frameAt(w)||main), l=toLocal(parent,p);
  let n;
  if(t==='frame'){ n=makeFrame(w.x,w.y,1,1); n.setAttr('label','Frame '+frames().length); }
  else if(t==='rect') n=obj('Rect',{kind:'rect',x:l.x,y:l.y,width:1,height:1,fill:c.accent});
  else if(t==='ellipse') n=obj('Ellipse',{kind:'ellipse',x:l.x,y:l.y,radiusX:1,radiusY:1,fill:c.accent});
  else if(t==='star') n=obj('Star',{kind:'star',x:l.x,y:l.y,numPoints:5,innerRadius:1,outerRadius:2,fill:c.accent});
  else if(t==='poly') n=obj('RegularPolygon',{kind:'poly',x:l.x,y:l.y,sides:3,radius:1,fill:c.accent});
  else if(t==='line') n=obj('Line',{kind:'line',x:l.x,y:l.y,points:[0,0,0,0],stroke:c.ink,strokeWidth:10,lineCap:'round',lineJoin:'round',hitStrokeWidth:30});
  else if(t==='arrow') n=obj('Arrow',{kind:'arrow',x:l.x,y:l.y,points:[0,0,0,0],stroke:c.ink,fill:c.ink,strokeWidth:10,pointerLength:32,pointerWidth:32,lineCap:'round',lineJoin:'round',hitStrokeWidth:30});
  else if(t==='pen'){ const pen=S.pen; n=obj('Line',{kind:'pen',x:l.x,y:l.y,points:[0,0],stroke:pen.color,strokeWidth:pen.size,lineCap:'round',lineJoin:'round',tension:.4,hitStrokeWidth:Math.max(20,pen.size),
      opacity:pen.mode==='marker'?.45:1,globalCompositeOperation:pen.mode==='marker'?'multiply':'source-over'}); }
  if(t!=='frame') parent.add(n);
  select([],{quiet:true});
  drag={type:'draw',tool:t,node:n,w0:w,l0:l,parent,p0:p};
}
function drawMove(w,e){
  const d=drag, n=d.node, l=toLocal(d.parent,toScreen(w));
  let dx=l.x-d.l0.x, dy=l.y-d.l0.y;
  if(d.tool==='pen'){ const pts=n.points(); const lx=pts[pts.length-2], ly=pts[pts.length-1]; if(Math.hypot(dx-lx,dy-ly)>2/sc()) n.points(pts.concat([dx,dy])); main.batchDraw(); return; }
  if(d.tool==='line'||d.tool==='arrow'){ if(e.shiftKey){ const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4), len=Math.hypot(dx,dy); dx=Math.cos(a)*len; dy=Math.sin(a)*len; } n.points([0,0,dx,dy]); badge(false,Math.round(Math.hypot(dx,dy))+' px'); main.batchDraw(); return; }
  if(e.shiftKey){ const m=Math.max(Math.abs(dx),Math.abs(dy)); dx=Math.sign(dx||1)*m; dy=Math.sign(dy||1)*m; }
  const x=Math.min(d.l0.x,d.l0.x+dx), y=Math.min(d.l0.y,d.l0.y+dy), W=Math.abs(dx), H=Math.abs(dy);
  if(d.tool==='frame'){ n.position({x:Math.round(x),y:Math.round(y)}); setFrameSize(n,W,H); paintUI(); }
  else if(d.tool==='rect') n.setAttrs({x,y,width:W,height:H});
  else if(d.tool==='ellipse') n.setAttrs({x:x+W/2,y:y+H/2,radiusX:W/2,radiusY:H/2});
  else if(d.tool==='star') n.setAttrs({x:x+W/2,y:y+H/2,outerRadius:Math.max(W,H)/2,innerRadius:Math.max(W,H)/2*.45});
  else if(d.tool==='poly') n.setAttrs({x:x+W/2,y:y+H/2,radius:Math.max(W,H)/2});
  badge(false,Math.round(W)+' × '+Math.round(H)); main.batchDraw();
}
function endDraw(d){
  const n=d.node; badge(true);
  const r=n.getClientRect({relativeTo:d.parent});
  const small=r.width*sc()<6&&r.height*sc()<6;
  if(d.tool==='pen'){ if(n.points().length<4){ n.points([0,0,.1,.1]); } changed(); emit('doc'); return; }
  if(small){ // a click without dragging: drop a default size
    if(d.tool==='frame'){ setFrameSize(n,1080,1920); n.position({x:Math.round(d.w0.x),y:Math.round(d.w0.y)}); }
    else if(d.tool==='rect') n.setAttrs({width:300,height:300,x:d.l0.x-150,y:d.l0.y-150});
    else if(d.tool==='ellipse') n.setAttrs({radiusX:150,radiusY:150});
    else if(d.tool==='star') n.setAttrs({outerRadius:150,innerRadius:68});
    else if(d.tool==='poly') n.setAttrs({radius:150});
    else if(d.tool==='line'||d.tool==='arrow') n.points([0,0,400,0]);
  }
  if(d.tool==='frame'){ const s=fsize(n); setFrameSize(n,s.w,s.h); }
  if(n.width&&kind(n)==='rect'){ n.width(Math.round(n.width())); n.height(Math.round(n.height())); }
  applyFill(n); setTool('select'); select([n]); changed(); emit('doc'); paintUI();
}

/* ---------- editing text in place ---------- */
function startEdit(n,fresh){
  if(isLocked(n)) return;
  const ta=document.createElement('textarea'); ta.className='ed-text'; ta.value=n.text(); ta.setAttribute('dir','auto'); ta.spellcheck=false;
  wrap.appendChild(ta); edit={n,ta,fresh,before:n.text()}; tr.nodes([]); n.opacity(n.opacity()); n.hide(); main.batchDraw();
  placeEditor(); ta.focus(); if(fresh) ta.select(); else ta.select();
  ta.addEventListener('input',()=>{ n.text(ta.value||' '); prepText(n); placeEditor(); });
  ta.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Escape'||(e.key==='Enter'&&(e.metaKey||e.ctrlKey))){ e.preventDefault(); commitEdit(); } });
  ta.addEventListener('blur',()=>setTimeout(()=>{ if(edit&&edit.ta===ta) commitEdit(); },0));
}
function placeEditor(){ if(!edit) return; const {n,ta}=edit, k=n.getAbsoluteScale().x, p=n.absolutePosition(), rot=n.getAbsoluteRotation();
  const fs=n.fontSize()*k, pad=n.padding()*k;
  Object.assign(ta.style,{left:p.x+'px',top:p.y+'px',fontSize:fs+'px',fontFamily:'"'+n.fontFamily()+'"',fontWeight:/\d{3}|bold/.test(n.fontStyle())?(n.fontStyle().match(/\d{3}/)||['700'])[0]:'400',
    fontStyle:/italic/.test(n.fontStyle())?'italic':'normal',lineHeight:n.lineHeight(),letterSpacing:(n.letterSpacing()*k)+'px',textAlign:n.align(),color:typeof n.fill()==='string'&&n.fill()?n.fill():'#000',
    padding:pad+'px',transform:`rotate(${rot}deg)`,transformOrigin:'0 0'});
  if(n.getAttr('autoW')){ ta.style.width='1px'; ta.style.width=Math.max(fs*.6,ta.scrollWidth+2)+'px'; } else ta.style.width=n.width()*k+'px';
  ta.style.height='1px'; ta.style.height=ta.scrollHeight+'px'; }
function commitEdit(){ if(!edit) return; const {n,ta}=edit; edit=null; ta.remove();
  const v=ta.value; if(!v.trim()){ n.destroy(); select([]); } else { n.text(v); prepText(n); if(n.getAttr('autoW')) n.width(undefined); n.show(); select([n]); }
  main.batchDraw(); changed(); emit('doc'); }
BD.startEdit=startEdit; BD.commitEdit=commitEdit; BD.editing=()=>!!edit;

/* ---------- actions on the selection ---------- */
function del(){ const list=S.sel.filter(n=>!isLocked(n)); if(!list.length) return; list.forEach(n=>n.destroy()); select([]); changed(); emit('doc'); paintUI(); }
function duplicate(list,off){ list=list||S.sel; off=off==null?24:off; const out=[];
  list.forEach(n=>{ const c=rebuild(toObj(n),true); n.getParent().add(c); c.zIndex(Math.min(n.getParent().children.length-1,n.zIndex()+1)); if(isFrame(c)){ c.x(c.x()+fsize(n).w+80); c.setAttr('label',nameOf(n)+' copy'); } else { c.x(c.x()+off); c.y(c.y()+off); } out.push(c); });
  select(out); changed(); emit('doc'); return out; }
function nudge(dx,dy){ const list=S.sel.filter(n=>!isLocked(n)); if(!list.length) return; list.forEach(n=>{ n.x(n.x()+dx); n.y(n.y()+dy); }); tr.forceUpdate(); paintUI(); changed(); emit('geom'); }
function order(how){ S.sel.forEach(n=>{ if(how==='front') n.moveToTop(); if(how==='back'){ n.moveToBottom(); const p=n.getParent(); if(isFrame(p)) frameBg(p).moveToBottom(); }
    if(how==='up') n.moveUp(); if(how==='down'){ n.moveDown(); const p=n.getParent(); if(isFrame(p)) frameBg(p).moveToBottom(); } }); main.batchDraw(); changed(); emit('doc'); }
function group(){ const list=S.sel.filter(n=>!isFrame(n)); if(list.length<2) return; const parent=list[0].getParent(); if(!list.every(n=>n.getParent()===parent)){ toast('Pick things inside the same frame to group them.'); return; }
  const top=Math.max(...list.map(n=>n.zIndex())); const g=new Konva.Group({id:uid(),name:'obj',kind:'group'}); parent.add(g); g.zIndex(Math.min(top,parent.children.length-1));
  list.sort((a,b)=>a.zIndex()-b.zIndex()).forEach(n=>reparent(n,g)); select([g]); changed(); emit('doc'); }
function ungroup(){ const out=[]; S.sel.filter(n=>kind(n)==='group').forEach(g=>{ const p=g.getParent(); let z=g.zIndex(); [...g.getChildren()].forEach(c=>{ reparent(c,p); c.zIndex(++z>p.children.length-1?p.children.length-1:z); out.push(c); }); g.destroy(); });
  if(out.length){ S.entered=null; select(out); changed(); emit('doc'); } }
function flip(axis){ S.sel.filter(n=>!isFrame(n)&&!isLocked(n)).forEach(n=>{ const r=wrect(n), c={x:r.x+r.width/2,y:r.y+r.height/2};
    if(axis==='x') n.scaleX(-n.scaleX()); else n.scaleY(-n.scaleY()); const r2=wrect(n); moveByWorld(n,c.x-(r2.x+r2.width/2),c.y-(r2.y+r2.height/2)); }); tr.forceUpdate(); main.batchDraw(); changed(); }
function lock(v){ const on=v!=null?v:!S.sel.every(isLocked); S.sel.forEach(n=>n.setAttr('locked',on||undefined)); select(on?[]:S.sel); changed(); emit('doc'); }
function hide(v){ const list=S.sel; const on=v!=null?v:list.some(n=>n.visible()); list.forEach(n=>n.visible(!on)); select([]); main.batchDraw(); paintUI(); changed(); emit('doc'); }
/* align to the frame (one thing) or to the selection box (several) */
function align(how){ const list=S.sel.filter(n=>!isLocked(n)); if(!list.length) return;
  let ref; if(list.length===1){ const f=isFrame(list[0])?null:frameOf(list[0]); if(!f) return; ref={x:f.x(),y:f.y(),width:fsize(f).w,height:fsize(f).h}; } else ref=unionRect(list);
  list.forEach(n=>{ const r=wrect(n); let dx=0,dy=0;
    if(how==='left') dx=ref.x-r.x; if(how==='hcenter') dx=ref.x+ref.width/2-(r.x+r.width/2); if(how==='right') dx=ref.x+ref.width-(r.x+r.width);
    if(how==='top') dy=ref.y-r.y; if(how==='vcenter') dy=ref.y+ref.height/2-(r.y+r.height/2); if(how==='bottom') dy=ref.y+ref.height-(r.y+r.height);
    moveByWorld(n,Math.round(dx),Math.round(dy)); });
  tr.forceUpdate(); main.batchDraw(); paintUI(); changed(); emit('geom'); }
function distribute(axis){ const list=S.sel.filter(n=>!isLocked(n)); if(list.length<3) return; const rs=list.map(n=>({n,r:wrect(n)}));
  const k=axis==='x'?'x':'y', sz=axis==='x'?'width':'height'; rs.sort((a,b)=>a.r[k]-b.r[k]);
  const total=rs.reduce((s,o)=>s+o.r[sz],0), span=rs[rs.length-1].r[k]+rs[rs.length-1].r[sz]-rs[0].r[k], gap=(span-total)/(rs.length-1);
  let at=rs[0].r[k]+rs[0].r[sz]+gap; for(let i=1;i<rs.length-1;i++){ const o=rs[i], d=at-o.r[k]; moveByWorld(o.n,axis==='x'?d:0,axis==='y'?d:0); at+=o.r[sz]+gap; }
  tr.forceUpdate(); main.batchDraw(); changed(); emit('geom'); }
/* make one object cover its frame (photo backgrounds) */
function fillFrame(n,lockIt,quiet){ n=n||S.sel[0]; const f=n&&frameOf(n); if(!f) return; const s=fsize(f);
  n.rotation(0); n.scale({x:Math.sign(n.scaleX())||1,y:Math.sign(n.scaleY())||1});
  if(n.width&&['image','asset','rect'].includes(kind(n))){ n.setAttrs({x:n.scaleX()<0?s.w:0,y:n.scaleY()<0?s.h:0,width:s.w,height:s.h}); if(kind(n)!=='rect') applyCrop(n); applyFx(n); }
  else { const r=n.getClientRect({relativeTo:f}), k=Math.max(s.w/r.width,s.h/r.height); n.scale({x:n.scaleX()*k,y:n.scaleY()*k}); const r2=n.getClientRect({relativeTo:f}); n.x(n.x()+s.w/2-(r2.x+r2.width/2)); n.y(n.y()+s.h/2-(r2.y+r2.height/2)); }
  if(quiet) return;
  if(lockIt){ n.moveToBottom(); frameBg(f).moveToBottom(); n.setAttr('locked',true); n.setAttr('isBg',true); n.setAttr('label',(n.getAttr('label')||nameOf(n)).replace(/ \(background\)$/,'')+' (background)'); select([]); } else select([n]);
  changed(); emit('doc'); }
/* copy a frame to another size, scaling and centring what's inside (backgrounds are filled again) */
function resizeWithContent(f,w,h,copy,label){ if(!isFrame(f)) return null;
  if(copy){ const c=rebuild(toObj(f),true); main.add(c); const r=unionRect(frames()); c.position({x:Math.round(r.x+r.width+160),y:f.y()}); c.setAttr('label',label||nameOf(f)+' copy'); c.find('Image').forEach(n=>applyFx(n)); f=c; }
  const s=fsize(f), k=Math.min(w/s.w,h/s.h), kids=items(f), bgs=kids.filter(n=>n.getAttr('isBg'));
  const g=new Konva.Group(); f.add(g); kids.forEach(n=>reparent(n,g)); g.scale({x:k,y:k}); g.position({x:(w-s.w*k)/2,y:(h-s.h*k)/2});
  setFrameSize(f,w,h); [...g.getChildren()].forEach(n=>reparent(n,f)); g.destroy(); frameBg(f).moveToBottom();
  kids.forEach(n=>{ const sw=n.strokeWidth&&n.strokeWidth(); const was=['text','rect','image','asset','ellipse','line','arrow'].includes(kind(n));
    if(was){ bakeScale(n); if(sw&&n.strokeScaleEnabled&&n.strokeScaleEnabled()!==false) n.strokeWidth(sw*k); if(n.shadowBlur&&n.shadowBlur()) n.setAttrs({shadowBlur:n.shadowBlur()*k,shadowOffsetX:n.shadowOffsetX()*k,shadowOffsetY:n.shadowOffsetY()*k}); }
    applyFill(n); applyFx(n); });
  bgs.forEach(n=>{ const l=n.getAttr('locked'); n.setAttr('locked',undefined); fillFrame(n,false,true); n.setAttr('locked',l); });
  select([f]); paintUI(); changed(); emit('doc'); return f; }

/* one photo across several frames (carousel panoramas): a copy goes into each frame it touches */
function spread(){ const n=S.sel[0]; if(!n||isFrame(n)) return; const r=wrect(n); const hit=frames().filter(f=>{ const s=fsize(f); return Konva.Util.haveIntersection(r,{x:f.x(),y:f.y(),width:s.w,height:s.h}); });
  if(hit.length<2){ toast('Move it so it overlaps two or more frames first.'); return; }
  const json=toObj(n), abs=n.getAbsoluteTransform().copy(), out=[];
  hit.forEach(f=>{ const c=rebuild(json,true); main.add(c); c.setAttrs(abs.decompose()); reparent(c,f); out.push(c); });
  n.destroy(); select(out); changed(); emit('doc'); toast('Spread across '+hit.length+' frames.'); }
/* copy and paste a look (fill, stroke, shadow, font…) */
const STYLE_KEYS=['fill','fillType','gradA','gradB','gradAngle','stroke','strokeWidth','dash','opacity','shadowEnabled','shadowColor','shadowBlur','shadowOffsetX','shadowOffsetY','shadowOpacity','globalCompositeOperation','cornerRadius',
  'fontFamily','fontStyle','fontSize','textDecoration','align','lineHeight','letterSpacing','tbg','tbgR','fx'];
let styleClip=null;
function copyStyle(){ const n=S.sel[0]; if(!n) return; styleClip={}; STYLE_KEYS.forEach(k=>{ const v=n.getAttr(k); if(v!==undefined) styleClip[k]=JSON.parse(JSON.stringify(v)); }); toast('Style copied.'); }
function pasteStyle(){ if(!styleClip) return; S.sel.filter(n=>!isFrame(n)).forEach(n=>{ Object.entries(styleClip).forEach(([k,v])=>{ if(k==='fontSize'&&kind(n)!=='text') return; if(k==='fx'&&kind(n)!=='image'&&kind(n)!=='asset') return; n.setAttr(k,JSON.parse(JSON.stringify(v))); });
    if(kind(n)==='text') prepText(n); applyFill(n); applyFx(n); }); main.batchDraw(); tr.forceUpdate(); changed(); emit('select',S.sel); }
BD.act={resizeWithContent,del,duplicate,nudge,order,group,ungroup,flip,lock,hide,align,distribute,fillFrame,spread,copyStyle,pasteStyle,selectAll};

/* ---------- copy / paste (also between tabs and boards, through the clipboard) ---------- */
let clip=null;
function copy(cut){ if(!S.sel.length) return null; clip={items:S.sel.map(n=>({o:toObj(n),abs:n.getAbsoluteTransform().copy().getMatrix(),parent:(frameOf(n)&&!isFrame(n))?frameOf(n).id():null}))};
  try{ localStorage.setItem('lab:clip',JSON.stringify(clip)); }catch(_){}
  if(cut) del(); return 'board-clip:'+JSON.stringify(clip); }
async function paste(data){ let c=data||clip; if(!c) try{ c=JSON.parse(localStorage.getItem('lab:clip')||'null'); }catch(_){}
  if(!c||!c.items) return;
  const ids=new Set(); c.items.forEach(it=>collectImgs(it.o,ids)); for(const id of ids) await getImg(id);
  const selFrame=S.sel.length===1&&isFrame(S.sel[0])?S.sel[0]:null, out=[];
  c.items.forEach(it=>{ const n=rebuild(it.o,true);
    if(isFrame(n)){ main.add(n); n.x(n.x()+40); n.y(n.y()+40); out.push(n); return; }
    const par=selFrame||(it.parent&&main.findOne('#'+it.parent))||targetFrame()||main;
    par.add(n);
    const sameSpot=par.id()===it.parent&&!selFrame;
    if(sameSpot){ const m=new Konva.Transform(it.abs); const inv=par.getAbsoluteTransform().copy().invert(); inv.multiply(m); n.setAttrs(inv.decompose()); n.x(n.x()+24); n.y(n.y()+24); }
    out.push(n); });
  if(selFrame&&out.length){ const r=unionRect(out), s=fsize(selFrame); out.forEach(n=>moveByWorld(n,selFrame.x()+s.w/2-(r.x+r.width/2),selFrame.y()+s.h/2-(r.y+r.height/2))); }
  out.forEach(n=>{ n.find('Image').concat(kind(n)==='image'||kind(n)==='asset'?[n]:[]).forEach(applyFx); });
  select(out); changed(); emit('doc'); }
BD.copy=copy; BD.paste=paste;

/* ---------- saving the design as data ---------- */
const SKIP=new Set(['image','filters','sceneFunc','dragBoundFunc','container']);
function toObj(n){ const a={}; Object.entries(n.attrs).forEach(([k,v])=>{ if(SKIP.has(k)||typeof v==='function'||v==null) return; if(typeof v==='object'&&!Array.isArray(v)&&v.constructor!==Object) return; a[k]=v; });
  const o={c:n.getClassName(),a}; if(n.getChildren) o.k=n.getChildren().map(toObj); return o; }
function collectImgs(o,set){ if(o.a&&o.a.imgId) set.add(o.a.imgId); (o.k||[]).forEach(k=>collectImgs(k,set)); return set; }
function rebuild(o,fresh){ const a=Object.assign({},o.a); if(fresh&&a.id) a.id=uid();
  const n=new Konva[o.c](a); (o.k||[]).forEach(k=>n.add(rebuild(k,fresh)));
  if(o.c==='Image'){ const im=IMGS.get(a.imgId); if(im) n.image(im.el); applyCrop(n); }
  if(o.c==='Text') prepText(n);
  if(o.c==='Image') setTimeout(()=>{ applyFx(n); main.batchDraw(); },0);
  return n; }
BD.toObj=toObj; BD.rebuild=rebuild; BD.collectImgs=collectImgs;
function docJson(){ const en=edit&&edit.n; if(en) en.visible(true); try{ return JSON.stringify({v:1,name:S.name,bg:S.bg,nodes:main.getChildren().map(toObj)}); } finally{ if(en&&edit) en.visible(false); } }
async function loadDoc(d){ tr.nodes([]); main.destroyChildren(); S.entered=null; const ids=new Set(); (d.nodes||[]).forEach(o=>collectImgs(o,ids));
  await Promise.all([...ids].map(getImg)); (d.nodes||[]).forEach(o=>main.add(rebuild(o)));
  await fontsInDoc(); main.find('Image').forEach(n=>applyFx(n)); main.batchDraw(); paintUI(); }
async function fontsInDoc(){ const fams=new Set(); main.find('Text').forEach(t=>fams.add(t.fontFamily()+'|'+t.fontStyle())); await Promise.all([...fams].map(s=>{ const [f,st]=s.split('|'); return BD.ensureFont(f,st); })); main.find('Text').forEach(t=>{ if(t._setTextData) t._setTextData(); }); main.batchDraw(); }
BD.docJson=docJson;

/* ---------- undo / redo ---------- */
const H={stack:[],i:-1,t:0};
function snap(){ return docJson(); }
function changed(){ S.clean=false; clearTimeout(H.t); H.t=setTimeout(commit,250); scheduleSave(); emit('changed'); }
function commit(){ H.t=0; if(edit){ H.t=setTimeout(commit,250); return; } const s=snap(); if(H.stack[H.i]===s) return; H.stack=H.stack.slice(0,H.i+1); H.stack.push(s); if(H.stack.length>120) H.stack.shift(); H.i=H.stack.length-1; emit('history'); }
function flushHist(){ if(H.t){ clearTimeout(H.t); commit(); } }
async function restore(s){ const ids=S.sel.map(n=>n.id()); await loadDoc(JSON.parse(s)); select(ids.map(id=>main.findOne('#'+id)).filter(Boolean)); scheduleSave(); emit('doc'); emit('history'); }
async function undo(){ if(edit) commitEdit(); flushHist(); if(H.i>0){ H.i--; await restore(H.stack[H.i]); } }
async function redo(){ flushHist(); if(H.i<H.stack.length-1){ H.i++; await restore(H.stack[H.i]); } }
BD.changed=changed; BD.undo=undo; BD.redo=redo; BD.canUndo=()=>H.i>0||!!H.t; BD.canRedo=()=>H.i<H.stack.length-1;

/* ---------- boards on this device (IndexedDB), with a list in localStorage ---------- */
const INDEX='lab:boards';
function boards(){ return L.store(INDEX)||[]; }
function saveIndex(list){ L.store(INDEX,list); }
let saveT=0;
function scheduleSave(){ if(!S.id) return; clearTimeout(saveT); emit('saving',true); saveT=setTimeout(saveNow,900); }
async function saveNow(){ clearTimeout(saveT); if(!S.id) return; const view={x:stage.x(),y:stage.y(),k:sc()};
  const d=JSON.parse(docJson()); d.view=view; d.imgs=[...S.imgs]; await L.idb.put('board:'+S.id,JSON.stringify(d));
  const list=boards(); let e=list.find(b=>b.id===S.id); if(!e){ e={id:S.id,created:Date.now()}; list.unshift(e); }
  e.name=S.name; e.updated=Date.now(); e.frames=frames().length; saveIndex(list);
  thumbSoon(); S.clean=true; emit('saving',false); }
let thumbT=0;
function thumbSoon(){ clearTimeout(thumbT); thumbT=setTimeout(async()=>{ const f=frames()[0]; if(!f) return; try{ const c=renderFrame(f,Math.min(1,360/Math.max(fsize(f).w,fsize(f).h))); await L.idb.put('bthumb:'+S.id,c.toDataURL('image/jpeg',.75)); c.width=c.height=0; }catch(_){} },1500); }
async function openBoard(id){ const raw=await L.idb.get('board:'+id); if(!raw) return false; const d=JSON.parse(raw);
  S.id=id; S.name=d.name||'Untitled board'; S.bg=d.bg||null; S.imgs=new Set(d.imgs||[]);
  await loadDoc(d); if(d.view) setView(d.view.x,d.view.y,d.view.k); else fitAll();
  H.stack=[snap()]; H.i=0; emit('history'); emit('doc'); emit('opened'); return true; }
async function newBoard(opt){ opt=opt||{}; S.id=uid(); S.name=opt.name||'Untitled board'; S.imgs=new Set(); main.destroyChildren();
  if(opt.template) await BD.buildTemplate(opt.template); else { const p=BD.PRESETS.find(x=>x.id===(opt.preset||'story'))||BD.PRESETS[0]; makeFrame(0,0,p.w,p.h,{label:p.label}); }
  paintUI(); fitAll(); H.stack=[snap()]; H.i=0; await saveNow(); history.replaceState(null,'','?id='+S.id); emit('history'); emit('doc'); emit('opened'); }
BD.boards=boards; BD.saveIndex=saveIndex; BD.saveNow=saveNow; BD.openBoard=openBoard; BD.newBoard=newBoard; BD.scheduleSave=scheduleSave;

/* ---------- exporting (same quality rules as the studio: lossless PNG at 2×, falling back to 1.5× then 1×) ---------- */
const MAX_PX=16.7e6;
/* big photos are shrunk in halves to the exact size they're drawn at, so exports stay sharp (never enlarged) */
function sharpen(scale){ const undo=[];
  main.find('Image').forEach(n=>{ if(!n.isVisible()||n.isCached()) return; const im=IMGS.get(n.getAttr('imgId')); if(!im) return; const c=n.crop(), ak=n.getAbsoluteScale(), k=scale;
    const tw=Math.max(1,Math.round(n.width()*Math.abs(ak.x)*k)), th=Math.max(1,Math.round(n.height()*Math.abs(ak.y)*k));
    if(!c.width||c.width<=tw*2||c.height<=th*2) return;
    let src=document.createElement('canvas'); src.width=Math.round(c.width); src.height=Math.round(c.height); src.getContext('2d').drawImage(im.el,c.x,c.y,c.width,c.height,0,0,src.width,src.height);
    const out=L.stepDown(src,tw,th); src.width=src.height=0;
    undo.push([n,n.image(),{...c}]); n.image(out); n.crop({x:0,y:0,width:out.width,height:out.height}); });
  return ()=>undo.forEach(([n,img,c])=>{ n.image(img); n.crop(c); }); }
function renderRegion(rect,scale,keep){
  const view={x:stage.x(),y:stage.y(),k:sc()}, hidden=[];
  ui.hide(); stage.scale({x:1,y:1}); stage.position({x:0,y:0});
  if(keep) main.getChildren().forEach(n=>{ if(!keep.includes(n)&&n.visible()){ n.hide(); hidden.push(n); } });
  const recache=[]; main.find('Image').forEach(n=>{ if(n.isCached()&&n.isVisible()){ applyFx(n,scale); recache.push(n); } });
  const restoreImgs=sharpen(scale);
  let c;
  try{ c=stage.toCanvas({x:rect.x,y:rect.y,width:rect.width,height:rect.height,pixelRatio:scale}); }
  finally{ restoreImgs(); hidden.forEach(n=>n.show()); recache.forEach(n=>applyFx(n)); stage.scale({x:view.k,y:view.k}); stage.position({x:view.x,y:view.y}); ui.show(); main.batchDraw(); ui.batchDraw(); }
  return c; }
function renderFrame(f,scale){ const s=fsize(f); return renderRegion({x:f.x(),y:f.y(),width:s.w,height:s.h},scale,[f]); }
function scalesFor(w,h,want){ const list=[want,2,1.5,1].filter((v,i,a)=>v<=want&&a.indexOf(v)===i).sort((a,b)=>b-a); const ok=list.filter(s=>w*h*s*s<=MAX_PX&&w*s<=16384&&h*s<=16384); return ok.length?ok:[Math.sqrt(MAX_PX/(w*h))]; }
async function exportFrame(f,opt){ opt=opt||{}; const s=fsize(f), type=opt.type||'image/png';
  for(const k of scalesFor(s.w,s.h,opt.scale||2)){ let c=null; try{ c=renderFrame(f,k); const blob=await L.canvasBlob(c,type,type==='image/jpeg'?.95:undefined); c.width=c.height=0; if(blob) return {blob,scale:k}; }catch(_){ if(c){ c.width=c.height=0; } } }
  throw new Error('This frame is too big to save on this device.'); }
async function exportSelection(opt){ opt=opt||{}; const list=S.sel.length?S.sel:[]; if(!list.length) return null; const r=unionRect(list); const type=opt.type||'image/png';
  const tops=list.map(n=>{ let p=n; while(p.getParent()!==main) p=p.getParent(); return p; });
  /* only the picked things: hide their siblings for a moment */
  const hid=[]; list.forEach(n=>{ const par=n.getParent(); par.getChildren().forEach(c=>{ if(!list.includes(c)&&c.visible()&&!c.isAncestorOf(n)){ c.hide(); hid.push(c); } }); });
  try{ for(const k of scalesFor(r.width,r.height,opt.scale||2)){ let c=null; try{ c=renderRegion(r,k,[...new Set(tops)]); const blob=await L.canvasBlob(c,type,type==='image/jpeg'?.95:undefined); c.width=c.height=0; if(blob) return {blob,scale:k}; }catch(_){ if(c) c.width=c.height=0; } } }
  finally{ hid.forEach(c=>c.show()); main.batchDraw(); }
  throw new Error('Too big to save on this device.'); }
BD.renderFrame=renderFrame; BD.exportFrame=exportFrame; BD.exportSelection=exportSelection;

/* ---------- board files (.board): the whole board with its photos, to move it to another computer ---------- */
async function exportBoardFile(){ await saveNow(); const d=JSON.parse(docJson()); const ids=new Set(); d.nodes.forEach(o=>collectImgs(o,ids)); d.files={};
  for(const id of ids){ if(id.startsWith('brand:')) continue; const blob=await L.idb.get('bimg:'+id); if(blob) d.files[id]={type:blob.type,data:await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob); })}; }
  return new Blob([JSON.stringify(d)],{type:'application/json'}); }
async function importBoardFile(file){ const d=JSON.parse(await file.text()); if(!d||!d.nodes) throw new Error('That is not a board file.');
  const id=uid(); const map={};
  for(const [old,f] of Object.entries(d.files||{})){ const nid=uid(); const blob=await (await fetch(f.data)).blob(); await L.idb.put('bimg:'+nid,blob); map[old]=nid; }
  const swap=o=>{ if(o.a&&o.a.imgId&&map[o.a.imgId]) o.a.imgId=map[o.a.imgId]; (o.k||[]).forEach(swap); }; d.nodes.forEach(swap); delete d.files; d.imgs=Object.values(map);
  d.name=(d.name||'Imported board'); await L.idb.put('board:'+id,JSON.stringify(d)); const list=boards(); list.unshift({id,name:d.name,created:Date.now(),updated:Date.now()}); saveIndex(list); return id; }
BD.exportBoardFile=exportBoardFile; BD.importBoardFile=importBoardFile;

/* ---------- fonts ---------- */
const FONT_OK=new Set();
BD.allFonts=function(){ const out=[]; const seen=new Set(); const add=(f,tag)=>{ if(seen.has(f.family)) return; seen.add(f.family); out.push(Object.assign({tag},f)); };
  L.brandFonts().forEach(f=>add(f,'brand')); (L.MORE_FONTS||[]).forEach(f=>add(f,'ar')); BD.FONTS_EXTRA.forEach(f=>add(f,f.tag||'latin')); ['system-ui','Georgia','Courier New'].forEach(f=>add({family:f,w:''},'system')); return out; };
function cssReady(l){ if(!l||l.sheet) return Promise.resolve(); return new Promise(r=>{ l.addEventListener('load',r,{once:true}); l.addEventListener('error',r,{once:true}); setTimeout(r,4000); }); }
BD.ensureFont=async function(fam,style){ const key=fam+'|'+(style||''); if(FONT_OK.has(key)) return;
  const info=BD.FONTS_EXTRA.find(x=>x.family===fam)||(L.MORE_FONTS||[]).find(x=>x.family===fam);
  if(info&&info.w&&!document.querySelector(`link[data-font="${fam}"]`)){ const l=document.createElement('link'); l.rel='stylesheet'; l.dataset.font=fam; l.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(fam).replace(/%20/g,'+')+':wght@'+info.w+'&display=swap'; document.head.appendChild(l); }
  await cssReady(document.querySelector(`link[data-font="${fam}"]`)||document.querySelector('link[data-brand-fonts]'));
  try{ await Promise.race([document.fonts.load(((style||'').replace('normal','')||'')+' 64px "'+fam+'"','Aaنص'),new Promise(r=>setTimeout(r,5000))]); }catch(_){}
  FONT_OK.add(key); };

/* ---------- little status helpers (the UI fills these) ---------- */
function toast(t){ emit('toast',t); } function busy(t){ emit('busy',t); }
BD.toast=toast; BD.busy=busy;

/* ---------- start ---------- */
BD.start=async function(){
  B=await Studio.useBrand(); BD.B=B;
  await Promise.all([BD.ensureFont(displayFont(),''),BD.ensureFont(bodyFont(),'800'),BD.ensureFont(bodyFont(),'600')]);
  /* when a font finishes loading later, measure and draw the words again */
  if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ main.find('Text').forEach(t=>{ if(t._setTextData) t._setTextData(); }); main.batchDraw(); if(tr.nodes().length) tr.forceUpdate(); });
  const q=new URLSearchParams(location.search);
  const id=q.get('id');
  if(id&&await openBoard(id)) return;
  await newBoard({template:q.get('template')||null,preset:q.get('preset')||null});
};
BD.setSpace=v=>{ spaceDown=v; wrap.classList.toggle('space',v); };
BD.frameAt=frameAt; BD.wrap=wrap;
})();

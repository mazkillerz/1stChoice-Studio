/* Board (experimental): two ideas from Penpot (penpot.app, the open-source design tool).
   1. Combine shapes: union, subtract, intersect and exclude. The shapes stay editable inside a
      'bool' group (double-click to move one); the bottom shape's colour paints the result.
   2. Components: make a main component, place copies anywhere on the board, and every copy follows
      the main one. Words typed into a copy are kept as that copy's own (an override). */
(function(){
const BD=window.BD, S=BD.S, U=BD.util;
const {kind,isFrame,isLocked,frameOf,nameOf,uid,reparent}=U;
const dbl=()=>matchMedia('(pointer:coarse)').matches?'Double-tap':'Double-click';

/* ---------- combine shapes ---------- */
const OPS=[['union','Union','Join into one shape'],['subtract','Subtract','Cut the top shape out'],['intersect','Intersect','Keep only the overlap'],['exclude','Exclude','Remove the overlap']];
const BOOLABLE=['rect','ellipse','poly','star','ring','path'];
const Bo={OPS,BOOLABLE};
Bo.can=list=>list.length>=2&&list.every(n=>BOOLABLE.includes(kind(n))&&!isLocked(n))&&list.every(n=>n.getParent()===list[0].getParent());
Bo.make=function(op){
  const sel=S.sel.filter(n=>!isFrame(n)&&!isLocked(n));
  if(!Bo.can(sel)){ BD.toast('Pick two or more shapes (boxes, circles, stars, polygons) in the same frame.'); return null; }
  const par=sel[0].getParent(), list=sel.slice().sort((a,b)=>a.zIndex()-b.zIndex()), top=Math.max(...list.map(n=>n.zIndex()));
  const g=new Konva.Group({id:uid(),name:'obj',kind:'bool',boolOp:op||'union',label:(OPS.find(o=>o[0]===op)||OPS[0])[1]});
  par.add(g); g.zIndex(Math.min(top,par.children.length-1));
  list.forEach(n=>reparent(n,g)); BD.decorate(g);
  BD.select([g]); BD.changed(); BD.paintUI(); BD.main.batchDraw();
  BD.toast('Combined. '+dbl()+' to move a shape inside.'); return g; };
Bo.setOp=function(g,op){ const old=g.getAttr('boolOp'); g.setAttr('boolOp',op);
  const lab=g.getAttr('label'); if(!lab||OPS.some(o=>o[1]===lab)) g.setAttr('label',(OPS.find(o=>o[0]===op)||OPS[0])[1]);
  if(old!==op){ BD.main.batchDraw(); BD.changed(); } };
Bo.release=function(){ const out=[];
  S.sel.filter(n=>kind(n)==='bool').forEach(g=>{ const p=g.getParent(); let z=g.zIndex();
    [...g.getChildren()].forEach(c=>{ reparent(c,p); BD.decorate(c); c.zIndex(Math.min(++z,p.children.length-1)); out.push(c); }); g.destroy(); });
  if(out.length){ S.entered=null; BD.select(out); BD.changed(); BD.paintUI(); BD.main.batchDraw(); } };
Bo.base=g=>g.getChildren(c=>c.visible()&&!!c._sceneFunc)[0]||null;
BD.bool=Bo;

/* ---------- components ---------- */
const C={};
const compOf=n=>{ let p=n; while(p&&p!==BD.main){ if(p.getAttr&&p.getAttr('comp')) return p; p=p.getParent(); } return null; };
const isMain=n=>!!(n&&n.getAttr('comp')&&n.getAttr('compMain'));
const isCopy=n=>!!(n&&n.getAttr('comp')&&!n.getAttr('compMain'));
C.compOf=compOf; C.isMain=isMain; C.isCopy=isCopy;
C.mains=()=>BD.main.find(n=>isMain(n));
C.mainOf=id=>BD.main.findOne(n=>isMain(n)&&n.getAttr('comp')===id)||null;
C.copiesOf=id=>BD.main.find(n=>isCopy(n)&&n.getAttr('comp')===id);
C.can=list=>list.length>=1&&list.every(n=>!isFrame(n)&&!isLocked(n))&&!(list.length===1&&list[0].getAttr('comp'))&&list.every(n=>n.getParent()===list[0].getParent());

C.make=function(){
  let sel=S.sel.filter(n=>!isFrame(n)&&!isLocked(n));
  if(!C.can(sel)){ BD.toast('Pick the things (in one frame) that should become a component.'); return null; }
  let g=sel.length===1&&kind(sel[0])==='group'?sel[0]:null;
  if(!g){ const par=sel[0].getParent(), list=sel.slice().sort((a,b)=>a.zIndex()-b.zIndex()), top=Math.max(...list.map(n=>n.zIndex()));
    g=new Konva.Group({id:uid(),name:'obj',kind:'group'}); par.add(g); g.zIndex(Math.min(top,par.children.length-1)); list.forEach(n=>reparent(n,g)); }
  const n=C.mains().length+1;
  g.setAttrs({comp:uid(),compMain:true,label:g.getAttr('label')||'Component '+n});
  BD.select([g]); BD.changed(); BD.paintUI(); BD.emitDoc();
  BD.toast('Component made. Copies of it follow every change you make here.'); return g; };

/* a copy of the main, placed beside it (or in the middle of a frame) */
C.addCopy=function(m,frame){ if(!m) return null;
  const c=BD.rebuild(BD.toObj(m),true); c.setAttr('compMain',undefined); clearOvr(c);
  if(frame){ frame.add(c); const r=U.wrect(c), s=U.fsize(frame); U.moveByWorld(c,frame.x()+s.w/2-(r.x+r.width/2),frame.y()+s.h/2-(r.y+r.height/2)); }
  else { m.getParent().add(c); c.zIndex(Math.min(m.getParent().children.length-1,m.zIndex()+1)); const r=U.wrect(m); U.moveByWorld(c,r.width+40,0); }
  BD.select([c]); BD.changed(); BD.paintUI(); return c; };
C.detach=function(list){ (list||S.sel).forEach(n=>{ if(!n.getAttr('comp')) return; n.setAttrs({comp:undefined,compMain:undefined}); clearOvr(n); }); BD.changed(); BD.paintUI(); };
C.reset=function(c){ clearOvr(c); C.sync(); BD.main.batchDraw(); BD.changed(); };
C.goMain=function(c){ const m=C.mainOf(c.getAttr('comp')); if(!m){ BD.toast('The main component is not on this board any more.'); return; } BD.select([m]); BD.view.fitSel(); };
C.selectCopies=function(m){ const l=C.copiesOf(m.getAttr('comp')); if(l.length) BD.select(l); };
C.rename=function(m,name){ m.setAttr('label',name||undefined); BD.changed(); };

/* words typed into a copy stay as that copy's own */
C.markText=function(t){ const c=compOf(t); if(c&&isCopy(c)) t.setAttr('ovr',true); };
function clearOvr(g){ g.find(n=>n.getAttr('ovr')).forEach(n=>n.setAttr('ovr',undefined)); }
function walk(g,fn,path){ (g.getChildren?g.getChildren():[]).forEach((c,i)=>{ const p=(path?path+'.':'')+i; fn(c,p); walk(c,fn,p); }); }
const TXT_OVR=['text','ovr','width','height','direction','autoW'];
function sigOf(g,ovr){ const strip=(o,p)=>{ const a=Object.assign({},o.a); delete a.id; delete a.ovr; if(ovr.has(p)) TXT_OVR.forEach(k=>delete a[k]); return {c:o.c,a,k:(o.k||[]).map((k,i)=>strip(k,p+'.'+i))}; };
  return JSON.stringify((g.getChildren()).map((ch,i)=>strip(BD.toObj(ch),String(i)))); }
function inside(a,b){ let p=a.getParent(); while(p){ if(p===b) return true; p=p.getParent(); } return false; }

/* make every copy match its main (runs before each undo step is stored) */
let warned=false;
C.sync=function(){
  const mains=new Map();
  BD.main.find(n=>isMain(n)).forEach(n=>{ const id=n.getAttr('comp'); if(mains.has(id)) n.setAttr('compMain',undefined); else mains.set(id,n); });   // a duplicate of a main becomes a copy
  let n=0;
  mains.forEach((m,id)=>{ C.copiesOf(id).forEach(c=>{ if(inside(c,m)||inside(m,c)) return;
    const ovr=new Map(); walk(c,(x,p)=>{ if(x.getAttr('ovr')&&kind(x)==='text') ovr.set(p,{text:x.text(),w:x.getAttr('autoW')?null:x.width(),autoW:x.getAttr('autoW')}); });
    const keys=new Set(ovr.keys()); if(sigOf(c,keys)===sigOf(m,keys)) return;
    const wasSel=S.sel.some(s=>s===c||inside(s,c)), entered=S.entered&&(S.entered===c||inside(S.entered,c));
    c.destroyChildren(); m.getChildren().forEach(ch=>c.add(BD.rebuild(BD.toObj(ch),true)));
    walk(c,(x,p)=>{ const o=ovr.get(p); if(o&&kind(x)==='text'){ x.text(o.text); x.setAttrs({ovr:true,autoW:o.autoW}); if(o.w!=null) x.width(o.w); else x.width(undefined); x.direction(U.AR.test(o.text||'')?'rtl':'inherit'); } });
    BD.decorate(c); n++;
    if(entered){ S.entered=null; }
    if(wasSel&&S.sel.some(s=>!s.getStage())){ BD.select([c],{quiet:true}); if(!warned){ warned=true; BD.toast('Copies follow the main component. Change the main one, or Detach this copy.'); } } }); });
  if(n){ BD.main.batchDraw(); BD.paintUI(); }
  return n; };
BD.comps=C;
})();

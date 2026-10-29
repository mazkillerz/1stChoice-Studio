/* Board (experimental, preview): flex layout, an idea from Penpot (penpot.app, the open-source design tool).
   A frame or a group can stack the things inside it in a column or a row, with a gap, padding and alignment.
   The stack re-flows whenever something inside changes (a text gets longer and the rest moves along),
   and a group (or a frame set to "Fit contents") grows with what's inside. Great for price lists and menus.
   Saved on the frame or group as its 'flex' attribute: {dir:'col'|'row', gap, px, py, align, justify, hug, rtl, w, h, fill, r}.
   A group stack keeps an invisible box (a 'flex-bg' rect, coloured when fill is set) so its padding can be seen and tapped.
   Boards without the attribute are never touched. The panel controls show while the preview is on
   (Board panel › Previews, the quick find, or ?flex=1 / ?flex=0 in the address). */
(function(){
const BD=window.BD, S=BD.S, U=BD.util, L=Studio.lab;
const {kind,isFrame,isLocked,items,fsize,AR}=U;
const KEY='lab:flex';
try{ const q=new URLSearchParams(location.search).get('flex'); if(q==='1'||q==='on') L.store(KEY,true); if(q==='0'||q==='off') L.store(KEY,null); }catch(_){}

const F={};
F.enabled=()=>!!L.store(KEY);
F.setEnabled=v=>{ L.store(KEY,v?true:null); };
const can=n=>!!n&&!!n.getStage&&(isFrame(n)||kind(n)==='group');
F.can=can;
F.of=n=>can(n)&&n.getAttr('flex')||null;
/* the stack a thing sits in (null when its parent has no layout) */
F.parentOf=n=>{ const p=n&&n.getParent&&n.getParent(); return p&&F.of(p)?p:null; };
const DEF={dir:'col',gap:24,px:0,py:0,align:'start',justify:'start'};
const cfg=c=>Object.assign({},DEF,c.getAttr('flex'));
const hugOf=(c,f)=>isFrame(c)?!!f.hug:f.hug!==false;
F.hug=c=>hugOf(c,cfg(c));
const r2=v=>Math.round(v*100)/100;

/* the things that take part: visible, not locked, not a frame's background photo */
function flowKids(c){ const ed=BD.editNode&&BD.editNode(); return items(c).filter(n=>(n.visible()||n===ed)&&!n.getAttr('isBg')&&!isLocked(n)); }
F.kids=flowKids;
function box(n,c){ const ed=BD.editNode&&BD.editNode(), hid=n===ed&&!n.visible(); if(hid) n.visible(true);
  try{ return n.getClientRect({relativeTo:c,skipShadow:true}); } finally{ if(hid) n.visible(false); } }

/* lay one stack out; returns true when anything moved or changed size */
function layout(c){ const f=cfg(c), row=f.dir==='row', rtl=row&&!!f.rtl, fr=isFrame(c), hug=hugOf(c,f);
  const px=Math.max(0,+f.px||0), py=Math.max(0,+f.py||0), gap=Math.max(0,+f.gap||0);
  const rs=flowKids(c).map(n=>({n,r:box(n,c)})); if(rtl) rs.reverse();
  const M=o=>row?o.r.width:o.r.height, X=o=>row?o.r.height:o.r.width;
  const sum=rs.reduce((s,o)=>s+M(o),0)+gap*Math.max(0,rs.length-1), cross=rs.reduce((m,o)=>Math.max(m,X(o)),0);
  const natW=(row?sum:cross)+2*px, natH=(row?cross:sum)+2*py;
  let W,H; if(hug){ W=natW; H=natH; } else if(fr){ const s=fsize(c); W=s.w; H=s.h; } else { W=f.w||natW; H=f.h||natH; }
  const inM=row?W-2*px:H-2*py, inX=row?H-2*py:W-2*px, free=inM-sum;
  let at=0, g=gap, just=f.justify; if(rtl&&(just==='start'||just==='end')) just=just==='start'?'end':'start';
  if(!hug&&rs.length){ if(just==='center') at=free/2; else if(just==='end') at=free; else if(just==='between'&&rs.length>1&&free>0) g=gap+free/(rs.length-1); }
  let moved=false;
  rs.forEach(o=>{ const x=X(o), a=f.align==='center'?(inX-x)/2:f.align==='end'?inX-x:0;
    const tx=row?px+at:px+a, ty=row?py+a:py+at, dx=r2(tx)-o.r.x, dy=r2(ty)-o.r.y;
    if(Math.abs(dx)>.005||Math.abs(dy)>.005){ o.n.x(r2(o.n.x()+dx)); o.n.y(r2(o.n.y()+dy)); moved=true; }
    at+=M(o)+g; });
  if(fr){ if(hug){ const s=fsize(c); if(Math.abs(s.w-W)>.01||Math.abs(s.h-H)>.01){ BD.setFrameSize(c,Math.max(1,W),Math.max(1,H)); moved=true; } } }
  else if(paintBox(c,f,Math.max(1,W),Math.max(1,H))) moved=true;
  return moved; }
/* a group stack's box: sized to the stack, see-through unless it has a colour */
function paintBox(g,f,W,H){ let b=g.findOne(n=>n.getParent()===g&&n.hasName('flex-bg'));
  const fill=f.fill||'rgba(0,0,0,0)', r=Math.max(0,+f.r||0);
  if(!b){ b=new Konva.Rect({name:'flex-bg',x:0,y:0,width:W,height:H,fill,cornerRadius:r}); g.add(b); b.moveToBottom(); return true; }
  const same=b.x()===0&&b.y()===0&&Math.abs(b.width()-W)<.01&&Math.abs(b.height()-H)<.01&&b.fill()===fill&&(b.cornerRadius()||0)===r;
  if(!same) b.setAttrs({x:0,y:0,width:W,height:H,fill,cornerRadius:r});
  if(b.zIndex()!==0) b.moveToBottom();
  return !same; }
const depth=n=>{ let d=0, p=n; while(p&&p!==BD.main){ d++; p=p.getParent(); } return d; };

/* re-flow every stack on the board, innermost first (a group's new size moves the stack it sits in) */
let busy=false;
F.reflow=function(){ if(busy) return false; const list=BD.main.find(n=>can(n)&&!!n.getAttr('flex')); if(!list.length) return false;
  busy=true; let any=false, frameGrew=false;
  try{ list.sort((a,b)=>depth(b)-depth(a)).forEach(c=>{ const s=isFrame(c)&&fsize(c); if(layout(c)){ any=true; if(s){ const t=fsize(c); if(t.w!==s.w||t.h!==s.h) frameGrew=true; } } }); }
  finally{ busy=false; }
  if(any){ BD.tr.forceUpdate(); BD.main.batchDraw(); if(frameGrew) BD.paintUI(); }
  return any; };

/* order: the stack follows the layer order (bottom layer first); this puts the given things in that order */
function reorder(c,sorted){ const kids=flowKids(c), slots=kids.map(n=>n.zIndex()).sort((a,b)=>a-b);
  const want=c.getChildren().slice(); slots.forEach((z,i)=>{ want[z]=sorted[i]; });
  want.forEach((n,i)=>{ if(n.zIndex()!==i) n.zIndex(i); }); }
const mainPos=(c,n)=>{ const f=cfg(c), r=box(n,c); return f.dir==='row'?r.x+r.width/2:r.y+r.height/2; };
/* after a drag inside a stack: the dropped things take the place where they were let go */
F.dropped=function(list){ const cs=new Set(); (list||[]).forEach(n=>{ const c=F.parentOf(n); if(c) cs.add(c); });
  cs.forEach(c=>{ const f=cfg(c), rtl=f.dir==='row'&&!!f.rtl; const s=flowKids(c).map(n=>({n,p:mainPos(c,n)})).sort((a,b)=>rtl?b.p-a.p:a.p-b.p).map(o=>o.n); reorder(c,s); }); };

/* a good first guess from how things are placed now: direction, order, gap, alignment */
function guess(kids,c,want){ const rs=kids.map(n=>({n,r:box(n,c)}));
  if(!rs.length) return {dir:want||'col',gap:24,align:'start',sorted:[]};
  const cx=rs.map(o=>o.r.x+o.r.width/2), cy=rs.map(o=>o.r.y+o.r.height/2), rng=a=>Math.max(...a)-Math.min(...a);
  const row=want?want==='row':rs.length>1&&rng(cx)>rng(cy), A=row?'y':'x', Z=row?'height':'width', P=row?'x':'y', Q=row?'width':'height';
  const ar=kids.filter(n=>kind(n)==='text').filter(n=>AR.test(n.text()||'')).length, txt=kids.filter(n=>kind(n)==='text').length, rtl=row&&txt>0&&ar*2>txt;
  const sorted=rs.slice().sort((a,b)=>rtl?(b.r[P]+b.r[Q])-(a.r[P]+a.r[Q]):a.r[P]-b.r[P]);
  const gaps=[]; const byPos=rs.slice().sort((a,b)=>a.r[P]-b.r[P]); for(let i=1;i<byPos.length;i++){ const d=byPos[i].r[P]-(byPos[i-1].r[P]+byPos[i-1].r[Q]); if(d>0) gaps.push(d); }
  const gap=gaps.length?Math.round(gaps.reduce((s,v)=>s+v,0)/gaps.length):24;
  const spread=fn=>rng(rs.map(fn)), sa=spread(o=>o.r[A]), sc=spread(o=>o.r[A]+o.r[Z]/2), se=spread(o=>o.r[A]+o.r[Z]);
  const align=rs.length<2?'start':sc<=sa&&sc<=se?'center':se<sa?'end':'start';
  return {dir:row?'row':'col',gap,align,rtl:rtl||undefined,sorted:sorted.map(o=>o.n),rs}; }
F.guess=guess;

/* move a group's origin to a point (in its own units) without moving what's inside */
function originAt(g,lx,ly){ if(!lx&&!ly) return; const p=g.getTransform().point({x:lx,y:ly}); g.getChildren().forEach(k=>{ k.x(k.x()-lx); k.y(k.y()-ly); }); g.position(p); }

/* turn a frame or group into a stack (opt overrides the guess) */
F.add=function(c,opt){ if(!can(c)) return null; opt=opt||{};
  const kids=flowKids(c), G=guess(kids,c,opt.dir), f={dir:G.dir,gap:opt.gap!=null?opt.gap:G.gap,align:opt.align||G.align,justify:opt.justify||'start'};
  if(f.dir==='row'&&(opt.rtl!=null?opt.rtl:G.rtl)) f.rtl=true;
  const sorted=G.sorted;
  if(isFrame(c)){ const s=fsize(c), rs=kids.map(n=>box(n,c)), row=f.dir==='row';
    const lo=a=>rs.length?Math.max(0,Math.round(Math.min(...a))):0, minL=lo(rs.map(r=>r.x)), minT=lo(rs.map(r=>r.y)), minR=lo(rs.map(r=>s.w-r.x-r.width)), minB=lo(rs.map(r=>s.h-r.y-r.height));
    const side=(al,a,b)=>al==='center'?Math.min(a,b):al==='end'?b:a;
    f.px=opt.px!=null?opt.px:row?minL:side(f.align,minL,minR); f.py=opt.py!=null?opt.py:row?side(f.align,minT,minB):minT;
    if(opt.hug) f.hug=true; }
  else { f.px=opt.px||0; f.py=opt.py||0; if(opt.hug===false){ f.hug=false; }
    if(kids.length){ let a=Infinity,b=Infinity; kids.forEach(n=>{ const r=box(n,c); a=Math.min(a,r.x); b=Math.min(b,r.y); }); originAt(c,a-f.px,b-f.py); } }
  reorder(c,sorted); c.setAttr('flex',f); F.reflow(); BD.changed(); BD.paintUI(); BD.emitDoc(); return c; };
F.set=function(c,patch){ if(!F.of(c)) return; const f=Object.assign({},c.getAttr('flex'),patch); Object.keys(f).forEach(k=>{ if(f[k]===undefined) delete f[k]; });
  if(patch.hug===false&&!isFrame(c)){ const b=c.findOne('.flex-bg'); if(b){ f.w=b.width(); f.h=b.height(); } }
  if(patch.hug===true){ delete f.w; delete f.h; }
  if(patch.dir&&patch.dir!==c.getAttr('flex').dir){ const kids=flowKids(c), s=kids.map(n=>({n,r:box(n,c)})).sort((a,b)=>patch.dir==='row'?a.r.x-b.r.x:a.r.y-b.r.y).map(o=>o.n); reorder(c,s); if(patch.dir!=='row') delete f.rtl; }
  c.setAttr('flex',f); F.reflow(); };
F.remove=function(c){ if(!F.of(c)) return; c.setAttr('flex',undefined); c.getChildren(n=>n.hasName('flex-bg')).forEach(n=>n.destroy()); BD.main.batchDraw(); BD.changed(); BD.paintUI(); BD.emitDoc(); };
/* several things picked: put them in a new group that stacks them, in the order they're placed now */
F.stack=function(dir){ const sel=S.sel.filter(n=>!isFrame(n)&&!isLocked(n));
  if(sel.length<2||!sel.every(n=>n.getParent()===sel[0].getParent())){ BD.toast('Pick two or more things in the same frame to stack them.'); return null; }
  BD.select(sel,{quiet:true}); BD.act.group(); const g=S.sel[0]; if(!g||kind(g)!=='group') return null;
  g.setAttr('label','Stack'); F.add(g,dir?{dir}:{}); BD.select([g]); return g; };
/* menu entries for the right-click menu, quick find and Shift+A (only while the preview is on) */
F.items=function(sel){ if(!F.enabled()) return []; sel=sel||S.sel; const out=[], one=sel.length===1?sel[0]:null, objs=sel.filter(n=>!isFrame(n)&&!isLocked(n));
  if(one&&can(one)&&!isLocked(one)){ if(F.of(one)) out.push({label:'Remove flex layout',run:()=>F.remove(one)}); else out.push({label:'Add flex layout',key:'Shift+A',run:()=>{ F.add(one); BD.select([one]); }}); }
  if(objs.length>1&&objs.every(n=>n.getParent()===objs[0].getParent())) out.push({label:'Stack in a column',key:'Shift+A',run:()=>F.stack('col')},{label:'Stack in a row',run:()=>F.stack('row')});
  const p=one&&F.parentOf(one); if(p) out.push({label:'Select the stack',run:()=>BD.select([p])});
  return out; };
F.quick=function(){ const it=F.items().find(i=>i.key==='Shift+A'); if(it) it.run(); else if(S.sel.length) BD.toast('Pick a frame or group, or two or more things, to stack them.'); };
/* a group stack with a fixed size: its box gets bigger or smaller, the things inside keep their size */
F.resize=function(g,kx,ky){ const f=F.of(g); if(!f||isFrame(g)) return; if(F.hug(g)) F.set(g,{hug:false}); const nf=Object.assign({},g.getAttr('flex')), b=g.findOne('.flex-bg');
  nf.w=Math.max(1,r2((nf.w||(b?b.width():1))*kx)); nf.h=Math.max(1,r2((nf.h||(b?b.height():1))*ky)); g.setAttr('flex',nf); F.reflow(); };
/* resizing a stack that fits its contents by hand gives it a fixed size */
BD.tr.on('transformstart.flex',()=>{ BD.tr.nodes().forEach(n=>{ const f=F.of(n); if(!f||!hugOf(n,f)) return; if(isFrame(n)){ const nf=Object.assign({},f); delete nf.hug; n.setAttr('flex',nf); } else F.set(n,{hug:false}); }); });
BD.flex=F;
})();

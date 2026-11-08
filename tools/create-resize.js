/* Create: one-tap resize (w2-resize). "Resize to…" makes a NEW page next to the original (the original is never touched) in
   another format (Story, Post, Square, Highlight) and re-lays it out by the role of each layer instead of just scaling it:
     headline / sub / product / button  = "content": one shared fit into the target's safe zone (same proportions, same reading order)
     logo, handle                       = pinned to the top or bottom band they were in
     background (full-frame fill), photo (full-frame picture, keeps its focus point) = cover the new frame
     bleed art                          = keeps bleeding past the same edges
   A layer's role is its own attr `role` (headline|sub|product|button|logo|handle|bg|bleed|photo) when a template sets one, else it is
   read from the layer (full-frame, `bleed`, a picture named like a logo, Latin @handle, the biggest words).
   A template can fix one layer for one format: attr `hints:{post:{x,y,w,size}}` (x,y = top-left in page units, w = width, size = font size).
   Brand-agnostic: reads Studio.tokens(format).safe; no brand names. Loaded by Create only when the Page sheet asks for it. */
(function(){
const BD=window.BD, U=BD.util, {kind,frames,items,fsize,prect}=U;
const FORMATS={story:{id:'story',label:'Story',w:1080,h:1920},post:{id:'post',label:'Post',w:1080,h:1350},square:{id:'square',label:'Square',w:1080,h:1080},
  highlight:{id:'highlight',label:'Highlight',w:1080,h:1080,round:true}};
const ROLES=['headline','sub','product','button','logo','handle','bg','bleed','photo'];
const formatOf=f=>{ const s=fsize(f); if(f.getAttr('round')) return 'highlight'; return s.h>=1900?'story':s.h>=1300?'post':'square'; };
const textsOf=n=>kind(n)==='text'?[n]:(n.find?n.find('Text'):[]);
const hasArabic=n=>textsOf(n).some(t=>U.AR.test(t.text()||''));
const isLogo=n=>{ const id=String(n.getAttr('imgId')||''); return /(^|[-_:])logo($|[-_])/i.test(id)||!!(BD.B&&(BD.B.assets||[]).some(a=>('brand:'+a.id)===id&&(a.role==='logo')))||n.getAttr('role')==='logo'; };
const isHandle=n=>{ const ts=textsOf(n); if(!ts.length||hasArabic(n)) return false; const insta=n.find&&n.find(c=>/instagram/i.test(c.getAttr('iconId')||'')).length;
  return !!insta||ts.every(t=>/@/.test(t.text()||'')); };

/* the role of each top-level layer of page f */
function roles(f){ const s=fsize(f), list=items(f).filter(n=>!n.hasName('frame-bg')), out=new Map();
  const maxFs=Math.max(0,...list.filter(n=>kind(n)==='text'&&!isHandle(n)).map(n=>n.fontSize()));
  list.forEach(n=>{ const ex=n.getAttr('role'); if(ROLES.includes(ex)){ out.set(n,ex); return; }
    const r=prect(n,f), kd=kind(n), rot=!!n.rotation();
    const full=!rot&&(kd==='rect'||kd==='image'||kd==='asset')&&r.width>=s.w*.95&&r.height>=s.h*.95&&r.x<=s.w*.03&&r.y<=s.h*.03;
    if(full&&kd==='rect'){ out.set(n,'bg'); return; }
    if(full&&kd==='image'){ out.set(n,'photo'); return; }
    if(n.getAttr('bleed')){ out.set(n,'bleed'); return; }
    if(full&&kd==='asset'){ out.set(n,'bg'); return; }
    if(kd==='asset'||kd==='image'){ out.set(n,isLogo(n)?'logo':'product'); return; }
    if(isHandle(n)){ out.set(n,'handle'); return; }
    if(kd==='text'){ out.set(n,n.fontSize()>=maxFs*.85?'headline':'sub'); return; }
    if(kd==='group'){ out.set(n,n.find('Text').length&&n.find(c=>c.getAttr&&(c.getAttr('role')==='bg'||c.className==='Rect')).length?'button':n.find('Text').length?'sub':'product'); return; }
    out.set(n,'product'); });
  return out; }

/* change a layer's size by factor s (words: font size and box; pictures and shapes: their box or scale) */
function sizeBy(n,s){ const kd=kind(n);
  if(kd==='text'){ n.fontSize(Math.max(6,n.fontSize()*s)); if(!n.getAttr('autoW')) n.width(n.width()*s); if(n.padding()) n.padding(n.padding()*s); if(n.getAttr('tbgR')) n.setAttr('tbgR',n.getAttr('tbgR')*s); }
  else if(kd==='rect'||(kd==='image')){ n.width(n.width()*s); n.height(n.height()*s); if(typeof n.cornerRadius()==='number') n.cornerRadius(n.cornerRadius()*s); if(n.strokeWidth&&n.strokeWidth()) n.strokeWidth(n.strokeWidth()*s); if(kd==='image') BD.applyCrop(n); }
  else n.scale({x:n.scaleX()*s,y:n.scaleY()*s}); }
const left=(n,f,x)=>{ const r=prect(n,f); n.x(n.x()+x-r.x); };
const top=(n,f,y)=>{ const r=prect(n,f); n.y(n.y()+y-r.y); };
const centreAt=(n,f,cx,cy)=>{ const r=prect(n,f); n.position({x:n.x()+cx-(r.x+r.width/2),y:n.y()+cy-(r.y+r.height/2)}); };
/* stretch a full-frame background to the new frame (gradients follow) */
function fillFrame(n,W,H,s0){ const o={w:n.width(),h:n.height()};
  if(kind(n)==='asset'){ const k=Math.max(W/o.w,H/o.h); n.width(o.w*k); n.height(o.h*k); n.position({x:(W-o.w*k)/2,y:(H-o.h*k)/2}); return; }
  n.setAttrs({x:0,y:0,rotation:0,width:W,height:H}); if(kind(n)==='image') BD.applyCrop(n);
  ['fillLinearGradientStartPoint','fillLinearGradientEndPoint'].forEach(k=>{ const p=n.getAttr(k); if(p&&p.x!=null) n.setAttr(k,{x:p.x*W/o.w,y:p.y*H/o.h}); }); }

function resizeTo(f,id){ const T=FORMATS[id]; if(!T||!f) return null; const src=fsize(f), sRoles=roles(f);
  const tok=Studio.tokens(id==='highlight'?'square':id), round=!!T.round, story=id==='story';
  const inset=round?Math.round(T.w*.146):0;
  const side=round?inset:Math.max(tok.safe.side||0,48), topSafe=round?inset:story?tok.safe.top:Math.max(tok.safe.top,60), botSafe=round?inset:story?tok.safe.bottom:Math.max(tok.safe.bottom,60);
  /* the copy: a new page right of everything, just after the original in the page order */
  const c=BD.rebuild(BD.toObj(f),true); BD.main.add(c); c.zIndex(f.zIndex()+1);
  const all=U.unionRect(frames().filter(x=>x!==c)); c.position({x:Math.round(all.x+all.width+120),y:Math.round(f.y())});
  BD.setFrameSize(c,T.w,T.h); c.setAttr('round',round?1:undefined); c.setAttr('label',(f.getAttr('label')||'Page')+' · '+T.label);
  c.find('Image').forEach(n=>BD.applyFx(n));
  /* pair copy layers with the originals by order */
  const srcL=items(f).filter(n=>!n.hasName('frame-bg')), dstL=items(c).filter(n=>!n.hasName('frame-bg')); const role=new Map(); const orig=new Map();
  dstL.forEach((n,i)=>{ role.set(n,sRoles.get(srcL[i])); orig.set(n,prect(srcL[i],f)); });
  const of=n=>orig.get(n);
  const content=dstL.filter(n=>!['bg','photo','bleed','logo','handle'].includes(role.get(n)));
  /* 1 pinned: logo and handle go back to the top or bottom band they were in */
  const pinned=dstL.filter(n=>['logo','handle'].includes(role.get(n))), stack={top:round?topSafe:0,bot:0}, sides={top:[],bot:[]};
  pinned.forEach(n=>sides[of(n).y+of(n).height/2<src.h/2?'top':'bot'].push(n));
  const edgeM=n=>role.get(n)==='logo'?(round?inset:story?200:64):0;
  let topEdge=topSafe, botEdge=T.h-botSafe;
  ['top','bot'].forEach(sd=>{ const ls=sides[sd].slice().sort((a,b)=>sd==='top'?of(a).y-of(b).y:of(b).y-of(a).y); let cur=sd==='top'?(ls.some(n=>role.get(n)==='logo')?Math.min(topSafe,edgeM(ls[0])||topSafe):topSafe):(T.h-(ls.some(n=>role.get(n)==='logo')?edgeM(ls.find(n=>role.get(n)==='logo')):botSafe));
    ls.forEach(n=>{ if(role.get(n)==='handle'&&sd==='bot') cur=Math.min(cur,T.h-botSafe); if(round) sizeBy(n,.85);
      const r=prect(n,c), o=of(n); let y=sd==='top'?cur:cur-r.height; top(n,c,y); cur=sd==='top'?y+r.height+16:y-16;
      const cx=o.x+o.width/2; let x; if(cx<src.w/3) x=Math.max(side,o.x); else if(cx>src.w*2/3) x=T.w-Math.max(side,src.w-(o.x+o.width))-r.width; else x=(T.w-r.width)/2; left(n,c,x);
      if(sd==='top') topEdge=Math.max(topEdge,y+r.height+24); else botEdge=Math.min(botEdge,y-24); }); });
  /* 2 content: one fit of all of it into what is left of the safe zone */
  const sc=content.length?U.unionRect(content.map(n=>of(n))):null;
  let kPos=1,kS=1,mx=src.w/2,my=src.h/2,tmx=T.w/2,tmy=T.h/2;
  if(sc){ const bandH=Math.max(200,botEdge-topEdge), kk=Math.min(bandH/sc.height,(T.w-2*side)/sc.width); kPos=Math.min(1.25,Math.max(.3,kk)); kS=Math.min(kPos,1.12);
    mx=sc.x+sc.width/2; my=sc.y+sc.height/2; tmx=T.w/2; tmy=topEdge+bandH/2; }
  const mapY=y=>tmy+(y-my)*kPos, mapX=x=>tmx+(x-mx)*kPos;
  content.forEach(n=>{ const o=of(n); sizeBy(n,kS); centreAt(n,c,mapX(o.x+o.width/2),mapY(o.y+o.height/2)); });
  /* 3 background and photo cover the page; bleed art keeps bleeding past the same edges */
  dstL.forEach(n=>{ const rl=role.get(n); if(rl==='bg'||rl==='photo') fillFrame(n,T.w,T.h); else if(rl==='bleed') bleed(n,of(n)); });
  function bleed(n,o){ const w=n.getClientRect({relativeTo:c,skipShadow:true}).width, cL=o.x<-1, cR=o.x+o.width>src.w+1, cT=o.y<-1, cB=o.y+o.height>src.h+1, fullW=o.width>=src.w-2;
    if(kind(n)==='rect'&&fullW&&(cT!==cB)){ const inner=cB?mapY(o.y):mapY(o.y+o.height), ov=(cB?(o.y+o.height-src.h):(-o.y))*kS; n.setAttrs({x:o.x,width:o.width+(T.w-src.w)});
      if(cB){ const bt=Math.max(T.h+4,T.h+ov); n.y(inner); n.height(bt-inner); } else { const tp=Math.min(-4,-ov); n.y(tp); n.height(inner-tp); } return; }
    let s=kS; if(cL&&cR) s=Math.max(s,(T.w+16)/o.width); if(cT&&cB) s=Math.max(s,(T.h+16)/o.height); if(fullW&&!cL&&!cR) s=Math.max(s,T.w/o.width);
    /* a piece that bleeds off the bottom (or top) keeps its inner edge where the content put it, and bleeds further instead of climbing over the words (at most 35% hidden) */
    if(cB&&!cT&&!(cL&&cR)) s=Math.max(.3,Math.min(s,(T.h-mapY(o.y))/(.65*o.height))); else if(cT&&!cB&&!(cL&&cR)) s=Math.max(.3,Math.min(s,mapY(o.y+o.height)/(.65*o.height)));
    if(fullW&&!cL&&!cR) s=Math.max(s,T.w/o.width);
    sizeBy(n,s); const W=o.width*s, H=o.height*s; let x,y;
    if(cL&&cR) x=Math.min(-8,Math.max(T.w+8-W,(T.w-W)/2+(o.x+o.width/2-src.w/2)*s)); else if(cL) x=Math.min(-4,o.x*s); else if(cR) x=Math.max(T.w+4,T.w+(o.x+o.width-src.w)*s)-W; else if(fullW) x=(T.w-W)/2; else x=mapX(o.x+o.width/2)-W/2;
    if(cT&&cB) y=Math.min(-8,Math.max(T.h+8-H,mapY(o.y+o.height/2)-H/2)); else if(cT) y=Math.min(-4,mapY(o.y+o.height)-H); else if(cB) y=Math.max(mapY(o.y),T.h+4-H); else y=mapY(o.y+o.height/2)-H/2;
    left(n,c,x); top(n,c,y); }
  /* 4 words stay inside the safe zone (not turned ones, not bleed) */
  dstL.forEach(n=>{ if(role.get(n)==='bleed'||role.get(n)==='bg'||!textsOf(n).length||n.rotation()) return;
    let r=prect(n,c); const aw=T.w-2*side; if(r.width>aw){ sizeBy(n,aw/r.width); r=prect(n,c); }
    const ah=T.h-topSafe-botSafe; if(r.height>ah){ sizeBy(n,ah/r.height); r=prect(n,c); }
    left(n,c,Math.min(Math.max(r.x,side),T.w-side-r.width)); if(role.get(n)!=='logo') top(n,c,Math.min(Math.max(r.y,topSafe),T.h-botSafe-r.height)); });
  /* 5 a template's own hints for this format win */
  dstL.forEach(n=>{ const h=(n.getAttr('hints')||{})[id]; if(!h) return;
    if(h.size&&kind(n)==='text'){ n.fontSize(h.size); if(n.getAttr('autoW')) n.width(undefined); }
    if(h.w){ if(kind(n)==='text'){ n.width(h.w); n.setAttr('autoW',false); } else { const r=prect(n,c); sizeBy(n,h.w/r.width); } }
    if(h.x!=null) left(n,c,h.x); if(h.y!=null) top(n,c,h.y); });
  c.find('Image').forEach(n=>BD.applyFx(n));
  return c; }

BD.resize={FORMATS,formatOf,roles,resizeTo};
})();

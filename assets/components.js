/* Shared design components (mega w2, plan 2.1): ONE drawing of each recurring piece of the brand's look, used by every tool.
   Studio.comp.<name>(h or ctx, opts) draws the piece and returns the box it took ({x,y,w,h}) so a layout can go on from there.
   - h = a tool's draw helper (h.ctx, h.dir, h.C, h.brand, h.tok, h.rr ...), or a plain canvas context (then pass opts.colors / opts.dir / opts.fonts).
   - Brand-agnostic: radii and shadows come from the brand's tokens (Studio.tokens(), h.tok), colours and fonts from the brand kit passed in.
   - Layered pieces (logo, handle, bio) need h: they add the normal movable layer; pill, panel, tile, step and badge draw straight onto the canvas.
   Pieces: pill, panel, tile, step (number in a circle), badge (rotated sticker with words), logo, handle, bio (map-in-bio pill).
   Create's Konva builders for the same pieces are Studio.comp.pillDoc / stepDoc / badgeDoc / panelDoc / handleDoc / bioDoc (tools/create-lib.js). */
(function(){
const S=window.Studio=window.Studio||{};
const ownRR=(c,x,y,w,h,r)=>{ r=typeof r==='number'?[r,r,r,r]:(r||[0,0,0,0]); const [a,b,k,d]=r.map(v=>Math.max(0,Math.min(v,w/2,h/2)));
  c.moveTo(x+a,y); c.lineTo(x+w-b,y); c.quadraticCurveTo(x+w,y,x+w,y+b); c.lineTo(x+w,y+h-k); c.quadraticCurveTo(x+w,y+h,x+w-k,y+h); c.lineTo(x+d,y+h); c.quadraticCurveTo(x,y+h,x,y+h-d); c.lineTo(x,y+a); c.quadraticCurveTo(x,y,x+a,y); c.closePath(); };
const ownLight=hex=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return false; const n=parseInt(m[1],16); return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>150; };
/* h, or a bare canvas context made to look like an h */
const env=(hc,o)=>{ if(hc&&hc.ctx&&hc.rr) return hc; o=o||{};
  return {ctx:hc,rr:ownRR,isLight:ownLight,dir:o.dir||'ltr',C:o.colors||{},brand:{fonts:o.fonts||{}},glyph:null,get tok(){ return S.tokens?S.tokens():{radius:{pill:999},shadow:{}}; }}; };
const ascent=(m,size)=>({a:m.actualBoundingBoxAscent||size*.75,d:m.actualBoundingBoxDescent||size*.25});
const tokRadius=(e,r,fallback)=>{ if(Array.isArray(r)) return r; if(typeof r==='number') return r; const t=(e.tok||{}).radius||{}; return r&&t[r]!=null?t[r]:fallback; };
const tokShadow=(e,s)=>typeof s==='string'?((e.tok||{}).shadow||{})[s]:s;
/* a pill outline: the brand's pill radius (token radius.pill, 999 = fully round), never more than half the height */
const pillPath=(hc,x,y,w,hh,r)=>{ const e=env(hc); e.ctx.beginPath(); e.rr(e.ctx,x,y,w,hh,r!=null?r:Math.min(((e.tok||{}).radius||{}).pill??999,hh/2)); };

/* ---------- pill / button: words (and an optional icon) in a rounded box ---------- */
function pillGeom(hc,str,o){
  const e=env(hc,o), c=e.ctx, size=o.size||36, font=o.fontCss||('800 '+size+'px "'+((e.brand.fonts||{}).body||'sans-serif')+'"');
  c.font=font; const m=c.measureText(str), ph=o.h||76, ic=o.icon?Math.round(size*.95):0, ig=ic?14:0, w=Math.ceil(m.width)+ic+ig+(o.pad||88);
  return {e,font,m,h:ph,w,ic,ig,b:ascent(m,size),size};
}
/* paint at (x,y); color = the person's colour override on the layer (a light one turns the words dark) */
function pillPaint(hc,str,o,g,x,y,color){
  const e=g.e, c=e.ctx, C=e.C, dir=e.dir, ph=g.h, pw=g.w;
  const bg=color||o.bg||C.ink, fg=color?(e.isLight(color)?C.ink:C.paper):(o.fg||C.paper);
  c.save(); c.translate(x,y); c.fillStyle=bg; pillPath(e,0,0,pw,ph,o.r!=null?tokRadius(e,o.r,ph/2):null); c.fill();
  const tw=Math.ceil(g.m.width), x0=(pw-tw-g.ic-g.ig)/2, textX=dir==='rtl'?x0:x0+g.ic+g.ig, icX=dir==='rtl'?x0+tw+g.ig:x0;
  c.font=g.font; c.direction=dir; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle=fg; c.fillText(str,textX,ph/2+(g.b.a-g.b.d)/2);
  if(g.ic&&e.glyph) e.glyph(c,o.icon,icX,(ph-g.ic)/2,g.ic,fg);
  c.restore();
}
/* Studio.comp.pill(h, {text, x|cx, y, h:76, size:36, pad:88, bg, fg, icon:'pin'|'insta', r, fontCss}) */
function pill(hc,o){ o=o||{}; const str=String(o.text==null?'':o.text).replace(/\n/g,' '); const g=pillGeom(hc,str,o), x=o.x!=null?o.x:(o.cx||0)-g.w/2, y=o.y||0;
  pillPaint(hc,str,o,g,x,y); return {x,y,w:g.w,h:g.h}; }
pill.geom=pillGeom; pill.paint=pillPaint; pill.path=pillPath;

/* ---------- panel: a soft rounded card (optional lift shadow) ----------
   r: pixels, 'sm'|'md'|'lg'|'pill' (token radius) or [tl,tr,br,bl]; shadow: {blur,y,color} or a token name ('soft'|'lift');
   scale:false keeps the shadow unscaled (a tool that always did) */
function panel(hc,o){ o=o||{}; const e=env(hc,o), c=e.ctx, x=o.x||0, y=o.y||0, w=o.w, hh=o.h, r=tokRadius(e,o.r==null?'md':o.r,0), sh=tokShadow(e,o.shadow);
  if(sh){ const sc=o.scale===false?1:(c.getTransform&&c.getTransform().a)||1;   // canvas shadows ignore the save scale: keep them in proportion
    c.save(); c.shadowColor=sh.color; c.shadowBlur=sh.blur*sc; c.shadowOffsetY=(sh.y||0)*sc; c.fillStyle=o.fill; c.beginPath(); e.rr(c,x,y,w,hh,r); c.fill(); c.restore(); }
  else { c.fillStyle=o.fill; c.beginPath(); e.rr(c,x,y,w,hh,r); c.fill(); }
  if(o.stroke){ c.save(); c.strokeStyle=o.stroke; c.lineWidth=o.sw||4; c.beginPath(); e.rr(c,x,y,w,hh,r); c.stroke(); c.restore(); }
  return {x,y,w,h:hh}; }

/* ---------- tile: a small top line and a big line on a rounded tile (the offer tile) ----------
   o: {x,y,w:400,h:260,small,big (already in the brand's digits),bg,smallColor,bigColor,r:'sm',family (display),smallSize:44,bigSize:150,wt} */
function tile(hc,o){ o=o||{}; const e=env(hc,o), c=e.ctx, x=o.x||0, y=o.y||0, tw=o.w||400, th=o.h||260, small=o.small||'', big=o.big||'', fonts=e.brand.fonts||{};
  c.save(); c.translate(x,y); c.fillStyle=o.bg||e.C.ink; c.beginPath(); e.rr(c,0,0,tw,th,tokRadius(e,o.r==null?'sm':o.r,40)); c.fill();
  c.direction=e.dir; c.textAlign='center'; c.textBaseline='alphabetic';
  if(small){ c.font='800 '+(o.smallSize||44)+'px "'+(o.smallFamily||fonts.body)+'"'; c.fillStyle=o.smallColor; c.fillText(small,tw/2,big?78:th/2+16,tw-40); }
  if(big){ const fam=o.family||fonts.display, wt=o.wt?o.wt+' ':''; let fs=o.bigSize||150; c.font=wt+fs+'px "'+fam+'"'; while(c.measureText(big).width>tw-44&&fs>60){ fs-=6; c.font=wt+fs+'px "'+fam+'"'; }
    c.fillStyle=o.bigColor; c.fillText(big,tw/2,small?th-46:th/2+fs*.36); }
  c.restore(); return {x,y,w:tw,h:th}; }

/* ---------- step number: a number in a circle ---------- */
function step(hc,o){ o=o||{}; const e=env(hc,o), c=e.ctx, r=o.r||46, cx=o.cx||0, cy=o.cy||0, fonts=e.brand.fonts||{}, n=e.digits?e.digits(String(o.n)):String(o.n);
  c.save(); c.fillStyle=o.bg||e.C.ink; c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fill();
  c.font=(o.size||Math.round(r*1.1))+'px "'+(o.family||fonts.display||fonts.body)+'"'; c.direction=e.dir; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle=o.fg||e.C.paper; c.fillText(n,cx,cy+r*.06);
  c.restore(); return {x:cx-r,y:cy-r,w:r*2,h:r*2}; }

/* ---------- sticker badge: a short line of words on a rounded label, turned a little ----------
   o: {text,cx,cy,rot:-6 (degrees),size:44,bg,fg,font:'display'|'body',padX,padY,r} -> the box round the turned badge */
function badge(hc,o){ o=o||{}; const e=env(hc,o), c=e.ctx, fonts=e.brand.fonts||{}, size=o.size||44, fam=o.font==='body'?fonts.body:(fonts.display||fonts.body), wt=o.font==='body'?'800 ':'';
  const px=o.padX!=null?o.padX:Math.round(size*.7), py=o.padY!=null?o.padY:Math.round(size*.38), str=String(o.text||'');
  c.save(); c.font=wt+size+'px "'+fam+'"'; const m=c.measureText(str), b=ascent(m,size), tw=Math.ceil(m.width), w=tw+px*2, hh=Math.ceil(b.a+b.d)+py*2, cx=o.cx||0, cy=o.cy||0, rot=(o.rot==null?-6:o.rot)*Math.PI/180;
  c.translate(cx,cy); c.rotate(rot); c.fillStyle=o.bg||e.C.ink; c.beginPath(); e.rr(c,-w/2,-hh/2,w,hh,tokRadius(e,o.r==null?'sm':o.r,hh/2)); c.fill();
  c.direction=e.dir; c.textAlign='center'; c.textBaseline='alphabetic'; c.fillStyle=o.fg||e.C.paper; c.fillText(str,0,(b.a-b.d)/2); c.restore();
  const cs=Math.abs(Math.cos(rot)), sn=Math.abs(Math.sin(rot)), ew=w*cs+hh*sn, eh=w*sn+hh*cs; return {x:cx-ew/2,y:cy-eh/2,w:ew,h:eh,rot:o.rot==null?-6:o.rot}; }

/* ---------- layered pieces (need h): the logo, the handle, the map-in-bio pill ---------- */
/* Studio.comp.logo(h,{x|cx,y,w,tone,id}) -> {x,y,w,h} (h:0 when the person hid it) */
function logo(h,o){ o=o||{}; const w=o.w, x=o.x!=null?o.x:(o.cx!=null?o.cx-w/2:0), hh=h.logoH(w), got=h.logo(x,o.y||0,w,o.tone,o.id); return {x,y:o.y||0,w,h:got?hh:0}; }
/* the Instagram handle: icon + words. font:'display' = the brand's display font (a Latin handle looks best there); default = the body words used by Elements */
function handle(h,o){ o=o||{}; const str='text' in o?o.text:h.brand.handle; if(!str) return {x:0,y:0,w:0,h:0}; const id=o.id||'handle', label=o.label||'Instagram handle', color=o.color||h.C.ink, cx=o.cx!=null?o.cx:(o.x||0), y=o.y||0;
  if(o.font!=='display'){ const hh=h.pin(id,label,str,cx,y,{icon:'insta',color,size:o.size,maxW:o.maxW}); return {x:cx,y,w:0,h:hh}; }
  const size=o.size||44, fam=h.brand.fonts.display||h.brand.fonts.body, c=h.ctx; c.font=size+'px "'+fam+'"'; const m=c.measureText(str), b=ascent(m,size), ic=Math.round(size*.9), gap=14, tw=Math.ceil(m.width), tot=tw+gap+ic, th=Math.ceil(b.a+b.d);
  const hh=h.block(id,label,cx-tot/2,y,tot,th,(g,col)=>{ g.font=size+'px "'+fam+'"'; g.direction=h.dir; g.textAlign='left'; g.textBaseline='alphabetic'; g.fillStyle=col||color;
    const tx=h.dir==='rtl'?0:ic+gap, ix=h.dir==='rtl'?tw+gap:0; g.fillText(str,tx,b.a); h.glyph(g,'insta',ix,(th-ic)/2,ic,g.fillStyle); });
  return {x:cx-tot/2,y,w:tot,h:hh}; }
/* the map-in-bio pill: a button with the map pin */
function bio(h,o){ o=o||{}; const id=o.id||'pill', label=o.label||'Button', ph=h.pill(id,label,o.text,o.cx!=null?o.cx:(o.x||0),o.y||0,{...o.opts,icon:'pin',bg:o.bg,fg:o.fg,size:o.size,h:o.h,pad:o.pad}); return {x:0,y:o.y||0,w:0,h:ph}; }

S.comp={pill,panel,tile,step,badge,logo,handle,bio,pillPath,env};
})();

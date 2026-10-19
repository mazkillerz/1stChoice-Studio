/* Board (experimental): opening files (SVG with its layers, PDF pages with editable text)
   and saving them (print PDF with exact page size, bleed and crop marks; layered SVG; ZIP; PNG/JPG with print DPI). */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S;
const {kind,isFrame,frames,items,fsize,unionRect,frameOf,nameOf,frameBg,uid}=U;
const IO={}; BD.io=IO;
const baseName=n=>(n||'File').replace(/\.[a-z0-9]+$/i,'').slice(0,50);

/* ======================================================================
   SVG → editable layers
   ====================================================================== */
const NAMED={black:'#000000',white:'#ffffff',red:'#ff0000',green:'#008000',blue:'#0000ff',yellow:'#ffff00',gray:'#808080',grey:'#808080',orange:'#ffa500',purple:'#800080',transparent:'rgba(0,0,0,0)'};
const INHERIT=['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-miterlimit','fill-opacity','stroke-opacity','fill-rule','font-family','font-size','font-weight','font-style','text-anchor','letter-spacing','color','visibility','direction','text-decoration'];
function lenPx(v,ref){ if(v==null||v==='') return null; const m=String(v).trim().match(/^(-?[\d.]+(?:e-?\d+)?)\s*(px|pt|mm|cm|in|%|em)?$/i); if(!m) return null; const n=parseFloat(m[1]), u=(m[2]||'px').toLowerCase();
  return u==='px'?n:u==='pt'?n*96/72:u==='mm'?n*96/25.4:u==='cm'?n*96/2.54:u==='in'?n*96:u==='%'?(ref||0)*n/100:u==='em'?n*16:n; }
function parseCss(doc){ const rules=[]; doc.querySelectorAll('style').forEach(st=>{ const t=(st.textContent||'').replace(/\/\*[\s\S]*?\*\//g,''); const re=/([^{}]+)\{([^{}]*)\}/g; let m;
  while((m=re.exec(t))){ const decl=parseDecl(m[2]); m[1].split(',').map(x=>x.trim()).filter(Boolean).forEach(sel=>rules.push({sel,decl})); } }); return rules; }
function parseDecl(t){ const o={}; (t||'').split(';').forEach(p=>{ const i=p.indexOf(':'); if(i>0){ const k=p.slice(0,i).trim().toLowerCase(), v=p.slice(i+1).trim().replace(/\s*!important$/,''); if(k) o[k]=v; } }); return o; }
function matchSel(el,sel){ if(/[\s>+~:\[]/.test(sel)) return false; try{ return el.matches(sel); }catch(_){ return false; } }
function styleOf(el,parent,rules){ const s=Object.assign({},parent); INHERIT.forEach(k=>{ if(!(k in s)) s[k]=undefined; });
  ['opacity','display','clip-path','mask','stop-color','stop-opacity','filter','mix-blend-mode'].forEach(k=>delete s[k]);
  for(const a of el.attributes){ if(a.name!=='style'&&a.name!=='class') s[a.name]=a.value; }
  rules.forEach(r=>{ if(matchSel(el,r.sel)) Object.assign(s,r.decl); });
  Object.assign(s,parseDecl(el.getAttribute('style'))); return s; }
function color(v,op,cur){ if(v==null||v==='none'||v==='transparent') return null; v=String(v).trim(); if(v==='currentColor') v=cur||'#000000'; if(NAMED[v.toLowerCase()]) v=NAMED[v.toLowerCase()];
  const k=Konva.Util.colorToRGBA(v); if(!k) return null; const a=(k.a??1)*(op==null?1:+op); return a>=1?'#'+[k.r,k.g,k.b].map(x=>x.toString(16).padStart(2,'0')).join(''):`rgba(${k.r},${k.g},${k.b},${Math.round(a*1000)/1000})`; }
function parseTransform(t){ let m=new Konva.Transform(); if(!t) return m; const re=/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let x;
  while((x=re.exec(t))){ const a=x[2].trim().split(/[\s,]+/).map(Number);
    if(x[1]==='matrix') m.multiply(new Konva.Transform(a.slice(0,6)));
    else if(x[1]==='translate') m.translate(a[0]||0,a[1]||0);
    else if(x[1]==='scale') m.scale(a[0],a.length>1?a[1]:a[0]);
    else if(x[1]==='rotate'){ if(a.length>2){ m.translate(a[1],a[2]); m.rotate(a[0]*Math.PI/180); m.translate(-a[1],-a[2]); } else m.rotate(a[0]*Math.PI/180); }
    else if(x[1]==='skewX') m.multiply(new Konva.Transform([1,0,Math.tan(a[0]*Math.PI/180),1,0,0]));
    else if(x[1]==='skewY') m.multiply(new Konva.Transform([1,Math.tan(a[0]*Math.PI/180),0,1,0,0])); }
  return m; }
const decomp=m=>{ const d=m.decompose(); return {x:d.x,y:d.y,rotation:d.rotation,scaleX:d.scaleX,scaleY:d.scaleY,skewX:d.skewX,skewY:d.skewY}; };
function href(el){ return el.getAttribute('href')||el.getAttributeNS('http://www.w3.org/1999/xlink','href')||el.getAttribute('xlink:href'); }
function layerName(el){ return el.getAttribute('data-name')||el.getAttribute('inkscape:label')||el.getAttribute('aria-label')||(el.id&&!/^(_|[a-z]{0,2}\d|clip|path|svg|g\d|SVGID|glyph|image|mask|pattern|linear|radial|filter|use|symbol|text|rect|circle|group|layer\d|Layer_\d)/i.test(el.id)?el.id:null)||undefined; }

function svgImporter(doc,rules,warn){
  const ids={}; doc.querySelectorAll('[id]').forEach(e=>{ ids[e.id]=e; });
  const ref=v=>{ const m=String(v||'').match(/url\(\s*['"]?#([^'")]+)['"]?\s*\)/); return m?ids[m[1]]:(String(v||'').startsWith('#')?ids[String(v).slice(1)]:null); };
  const imgs=[];
  /* gradients become Konva gradient settings in the shape's own coordinates */
  function stopsOf(g){ let e=g, guard=0; while(e&&!e.querySelector('stop')&&href(e)&&guard++<5) e=ids[href(e).slice(1)]; const out=[];
    (e?e.querySelectorAll('stop'):[]).forEach(st=>{ const s=styleOf(st,{},rules); let o=String(s.offset||'0'); o=o.endsWith('%')?parseFloat(o)/100:parseFloat(o); out.push(Math.max(0,Math.min(1,o||0)),color(s['stop-color']||'#000',s['stop-opacity'])||'rgba(0,0,0,0)'); }); return out; }
  function gattr(g,k){ let e=g, guard=0; while(e&&guard++<6){ if(e.hasAttribute(k)) return e.getAttribute(k); e=href(e)?ids[href(e).slice(1)]:null; } return null; }
  function applyGradient(n,g,off,op){ const st=stopsOf(g); if(st.length<2){ if(st.length) n.fill(st[1]); return; }
    if(op!=null&&op<1) for(let i=1;i<st.length;i+=2) st[i]=color(st[i],op)||st[i];
    const bbox=gattr(g,'gradientUnits')!=='userSpaceOnUse', r=n.getSelfRect(), gt=parseTransform(gattr(g,'gradientTransform'));
    const P=(x,y)=>{ let p={x,y}; p=gt.point(p); if(bbox) return {x:r.x+p.x*r.width,y:r.y+p.y*r.height}; return {x:p.x-off.x,y:p.y-off.y}; };
    const num=(k,d,ref)=>{ const v=gattr(g,k); if(v==null) return d; return String(v).endsWith('%')?parseFloat(v)/100*(bbox?1:ref):parseFloat(v); };
    if(g.nodeName==='linearGradient'){ const a=P(num('x1',0,r.width),num('y1',0,r.height)), b=P(num('x2',bbox?1:r.width,r.width),num('y2',0,r.height));
      n.setAttrs({fillType:'svg',fillPriority:'linear-gradient',fillLinearGradientStartPoint:a,fillLinearGradientEndPoint:b,fillLinearGradientColorStops:st}); }
    else { const cx=num('cx',bbox?.5:r.width/2,r.width), cy=num('cy',bbox?.5:r.height/2,r.height), rr=num('r',bbox?.5:Math.max(r.width,r.height)/2,Math.max(r.width,r.height)), fx=num('fx',cx,r.width), fy=num('fy',cy,r.height);
      const c=P(cx,cy), f=P(fx,fy), e=P(cx+rr,cy), rad=Math.hypot(e.x-c.x,e.y-c.y);
      n.setAttrs({fillType:'svg',fillPriority:'radial-gradient',fillRadialGradientStartPoint:f,fillRadialGradientEndPoint:c,fillRadialGradientStartRadius:0,fillRadialGradientEndRadius:rad,fillRadialGradientColorStops:st}); } }
  function paint(n,s,off){ const cur=s.color, fo=s['fill-opacity'], so=s['stroke-opacity'];
    const fill=s.fill===undefined?'#000000':s.fill, gf=ref(fill);
    if(gf&&/Gradient$/.test(gf.nodeName)) n.setAttr('_grad',{g:gf,off,op:fo==null?null:+fo});
    else if(gf&&gf.nodeName==='pattern'){ n.fill('#cccccc'); warn('patterns'); }
    else { const c=color(fill,fo,cur); if(c) n.fill(c); }
    if(s.stroke&&s.stroke!=='none'){ const gs=ref(s.stroke); const c=gs?(stopsOf(gs)[1]||'#000000'):color(s.stroke,so,cur); if(c){ n.stroke(c); n.strokeWidth(lenPx(s['stroke-width'])??1); }
      if(s['stroke-linecap']) n.lineCap(s['stroke-linecap']); if(s['stroke-linejoin']) n.lineJoin(s['stroke-linejoin']); if(s['stroke-miterlimit']) n.miterLimit(+s['stroke-miterlimit']);
      if(s['stroke-dasharray']&&s['stroke-dasharray']!=='none') n.dash(s['stroke-dasharray'].split(/[\s,]+/).map(Number).filter(x=>!isNaN(x))); }
    if(s['fill-rule']==='evenodd') n.fillRule('evenodd'); }
  function common(n,el,s){ if(s.opacity!=null&&s.opacity!=='') n.opacity(+s.opacity); const nm=layerName(el); if(nm) n.setAttr('label',nm);
    if(s['mix-blend-mode']&&s['mix-blend-mode']!=='normal') n.globalCompositeOperation(s['mix-blend-mode']); }
  const pts=t=>String(t||'').trim().split(/[\s,]+/).map(Number).filter(x=>!isNaN(x));
  function shapeOf(el,s,M){ const tag=el.nodeName.replace(/^svg:/,''); let n=null, off={x:0,y:0};
    const num=(k,d)=>{ const v=lenPx(s[k]); return v==null?(d||0):v; };
    if(tag==='rect'){ const x=num('x'), y=num('y'), w=num('width'), h=num('height'); if(w<=0||h<=0) return null; let rx=lenPx(s.rx), ry=lenPx(s.ry); rx=rx??ry??0;
      off={x,y}; n=new Konva.Rect({width:w,height:h,cornerRadius:Math.min(rx,w/2,h/2)}); n.setAttrs(decomp(M.copy().translate(x,y))); n.setAttr('kind','rect'); }
    else if(tag==='circle'||tag==='ellipse'){ const cx=num('cx'), cy=num('cy'), rx=tag==='circle'?num('r'):num('rx'), ry=tag==='circle'?num('r'):num('ry'); if(rx<=0||ry<=0) return null;
      off={x:cx,y:cy}; n=new Konva.Ellipse({radiusX:rx,radiusY:ry}); n.setAttrs(decomp(M.copy().translate(cx,cy))); n.setAttr('kind','ellipse'); }
    else if(tag==='line'){ n=new Konva.Path({data:`M${num('x1')} ${num('y1')}L${num('x2')} ${num('y2')}`}); n.setAttrs(decomp(M)); n.setAttr('kind','path'); if(!s.stroke) return null; }
    else if(tag==='polyline'||tag==='polygon'){ const p=pts(s.points); if(p.length<4) return null; let d='M'+p[0]+' '+p[1]; for(let i=2;i<p.length;i+=2) d+='L'+p[i]+' '+p[i+1]; if(tag==='polygon') d+='Z';
      n=new Konva.Path({data:d}); n.setAttrs(decomp(M)); n.setAttr('kind','path'); }
    else if(tag==='path'){ const d=s.d; if(!d) return null; n=new Konva.Path({data:d}); n.setAttrs(decomp(M)); n.setAttr('kind','path'); }
    if(!n) return null;
    n.setAttrs({id:uid(),name:'obj'}); paint(n,s,off); if(tag==='line'||tag==='polyline') n.fill(s.fill&&s.fill!=='none'?n.fill():undefined);
    return n; }
  function textOf(el,s,M){ const out=[], fam0=String(s['font-family']||'').split(',')[0].replace(/['"]/g,'').trim()||'system-ui', fs0=lenPx(s['font-size'])||16;
    const make=(txt,st)=>{ const fz=lenPx(st['font-size'])||fs0, w=String(st['font-weight']||'400').replace('bold','700').replace('normal','400'), it=/italic/.test(st['font-style']||'');
      const n=new Konva.Text({id:uid(),name:'obj',kind:'text',text:txt.replace(/\s+/g,' '),fontFamily:String(st['font-family']||fam0).split(',')[0].replace(/['"]/g,'').trim()||fam0,fontSize:fz,fontStyle:(it?'italic ':'')+w,autoW:true,lineHeight:1,letterSpacing:lenPx(st['letter-spacing'])||0,fillAfterStrokeEnabled:true});
      n.fill(color(st.fill===undefined?'#000':st.fill,st['fill-opacity'],st.color)||'#000000'); if(st['text-decoration']&&/underline|line-through/.test(st['text-decoration'])) n.textDecoration(st['text-decoration']);
      if(st.stroke&&st.stroke!=='none'){ const c=color(st.stroke,st['stroke-opacity'],st.color); if(c){ n.stroke(c); n.strokeWidth(lenPx(st['stroke-width'])||1); } }
      BD.prepText(n); common(n,el,st); n.setAttr('label',undefined); return n; };
    /* pieces that flow on from each other form one line; a piece with its own x starts a new line */
    const lines=[]; let cur=null; const startLine=(x,y,st)=>{ cur={x,y,anc:st['text-anchor']||s['text-anchor']||'start',runs:[]}; lines.push(cur); };
    startLine(lenPx(String(s.x||'0').split(/[\s,]+/)[0])||0,lenPx(String(s.y||'0').split(/[\s,]+/)[0])||0,s);
    const walkT=(node,st)=>{ [...node.childNodes].forEach(c=>{ if(c.nodeType===3){ if(c.textContent.trim()||cur.runs.length) cur.runs.push({t:c.textContent,st}); return; }
      if(c.nodeType!==1||!/tspan$/.test(c.nodeName)) return; const ss=styleOf(c,st,rules); if(ss.display==='none') return;
      const hasX=c.hasAttribute('x'), hasY=c.hasAttribute('y'), dy=lenPx(c.getAttribute('dy'))||0, dx=lenPx(c.getAttribute('dx'))||0;
      if(hasX||hasY||dy){ startLine(hasX?lenPx(c.getAttribute('x').split(/[\s,]+/)[0]):cur.x+dx,(hasY?lenPx(c.getAttribute('y').split(/[\s,]+/)[0]):cur.y)+dy,ss); }
      walkT(c,ss); }); };
    walkT(el,s);
    const rtlBase=s.direction==='rtl';
    lines.forEach(l=>{ const runs=l.runs.filter(r=>r.t.trim()); if(!runs.length) return; const nodes=runs.map(r=>make(r.t,r.st)); const total=nodes.reduce((a,n)=>a+n.width(),0);
      const sx=l.anc==='middle'?l.x-total/2:((l.anc==='end')!==rtlBase?l.x-total:l.x); let x=sx;
      const order=rtlBase?nodes.slice().reverse():nodes; order.forEach(n=>{ const fz=n.fontSize(); n.setAttrs(decomp(M.copy().translate(x,l.y-fz*.8))); x+=n.width(); out.push(n); }); });
    if(out.length===1&&layerName(el)) out[0].setAttr('label',layerName(el));
    return out; }
  function imageOf(el,s,M){ const h=href(el); if(!h){ return null; } if(!/^data:image\//.test(h)){ warn('linked pictures'); return null; }
    const x=lenPx(s.x)||0, y=lenPx(s.y)||0, w=lenPx(s.width), hh=lenPx(s.height);
    const n=new Konva.Image({id:uid(),name:'obj',kind:'image',cropZ:1,focX:.5,focY:.5,label:layerName(el)||'Picture'}); n.setAttr('_src',{h,x,y,w,hh,par:s.preserveAspectRatio||'xMidYMid meet',M:M.getMatrix()}); imgs.push(n); return n; }
  function clipFor(el,s,M,build){ const cp=ref(s['clip-path'])||ref(s.mask); if(!cp) return build(M);
    const g=new Konva.Group({id:uid(),name:'obj',kind:'mask',label:layerName(el)||'Clipped'}); g.setAttrs(decomp(M));
    const content=build(new Konva.Transform()); if(!content) return null; [].concat(content).forEach(c=>{ if(c.getAttr('label')===g.getAttr('label')) c.setAttr('label',undefined); }); (Array.isArray(content)?content:[content]).forEach(c=>g.add(c));
    const unitsBox=cp.getAttribute('clipPathUnits')==='objectBoundingBox';
    let mt=new Konva.Transform(); if(unitsBox){ const r=g.getClientRect({relativeTo:g}); mt.translate(r.x,r.y); mt.scale(r.width,r.height); }
    let any=false; [...cp.children].forEach(c=>{ walk(c,{},mt,null,true).forEach(m=>{ if(m.getClassName()==='Text') return; m.setAttrs({isMask:true,maskOpacity:1,opacity:0}); g.add(m); m.moveToBottom(); any=true; }); });
    if(!any) return content; BD.decorate(g); return g; }
  /* walk the tree; returns Konva nodes for this element */
  function walk(el,ps,PM,_,inClip){ const tag=el.nodeName.replace(/^svg:/,'');
    if(['defs','style','title','desc','metadata','clipPath','mask','linearGradient','radialGradient','pattern','symbol','marker','filter','script'].includes(tag)) return [];
    if(el.namespaceURI&&el.namespaceURI!=='http://www.w3.org/2000/svg') return [];
    const s=styleOf(el,ps,rules); if(s.display==='none'||s.visibility==='hidden') return [];
    const M=PM.copy().multiply(parseTransform(el.getAttribute('transform')));
    const build=Mx=>{
      if(tag==='g'||tag==='a'||tag==='switch'){ const kids=[...el.children].flatMap(c=>walk(c,s,new Konva.Transform(),null,inClip)); if(!kids.length) return null;
        if(inClip) return kids.map(k=>{ k.setAttrs(decomp(Mx.copy().multiply(k.getTransform()))); return k; });
        const g=new Konva.Group({id:uid(),name:'obj',kind:'group',label:layerName(el)}); g.setAttrs(decomp(Mx)); kids.forEach(k=>g.add(k)); common(g,el,s); return g; }
      if(tag==='svg'){ const vb=(el.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number), w=lenPx(el.getAttribute('width')), h=lenPx(el.getAttribute('height')); const T=Mx.copy().translate(lenPx(el.getAttribute('x'))||0,lenPx(el.getAttribute('y'))||0);
        if(vb.length===4&&w&&h) { T.scale(w/vb[2],h/vb[3]); T.translate(-vb[0],-vb[1]); }
        const kids=[...el.children].flatMap(c=>walk(c,s,new Konva.Transform(),null,inClip)); if(!kids.length) return null; const g=new Konva.Group({id:uid(),name:'obj',kind:'group',label:layerName(el)}); g.setAttrs(decomp(T)); kids.forEach(k=>g.add(k)); return g; }
      if(tag==='use'){ const t=ids[(href(el)||'').slice(1)]; if(!t) return null; const T=Mx.copy().translate(lenPx(el.getAttribute('x'))||0,lenPx(el.getAttribute('y'))||0);
        let kids; if(t.nodeName==='symbol'){ const vb=(t.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number), w=lenPx(el.getAttribute('width')), h=lenPx(el.getAttribute('height')); if(vb.length===4&&w&&h){ T.scale(w/vb[2],h/vb[3]); T.translate(-vb[0],-vb[1]); }
          kids=[...t.children].flatMap(c=>walk(c,s,new Konva.Transform(),null,inClip)); }
        else kids=walk(t,s,new Konva.Transform(),null,inClip);
        if(!kids.length) return null; if(kids.length===1&&!inClip){ const k=kids[0]; k.setAttrs(decomp(T.copy().multiply(k.getTransform()))); if(!k.getAttr('label')&&layerName(el)) k.setAttr('label',layerName(el)); return k; }
        if(inClip) return kids.map(k=>{ k.setAttrs(decomp(T.copy().multiply(k.getTransform()))); return k; });
        const g=new Konva.Group({id:uid(),name:'obj',kind:'group',label:layerName(el)}); g.setAttrs(decomp(T)); kids.forEach(k=>g.add(k)); return g; }
      if(tag==='text') { const t=textOf(el,s,Mx); return t.length?t:null; }
      if(tag==='image') return imageOf(el,s,Mx);
      const n=shapeOf(el,s,Mx); if(n) common(n,el,s); return n; };
    const r=inClip?build(M):clipFor(el,s,M,build);
    return r?(Array.isArray(r)?r:[r]):[]; }
  return {walk,imgs,applyGradients(root){ (root.find?root.find(n=>!!n.getAttr('_grad')):[]).concat(root.getAttr&&root.getAttr('_grad')?[root]:[]).forEach(n=>{ const g=n.getAttr('_grad'); n.setAttr('_grad',undefined); applyGradient(n,g.g,g.off,g.op); }); }};
}
async function finishImages(list){ for(const n of list){ const s=n.getAttr('_src'); n.setAttr('_src',undefined); try{
    const blob=await (await fetch(s.h)).blob(); const id=await BD.addPhotoFile(new File([blob],'svg-image',{type:blob.type})); const im=BD.IMGS.get(id);
    let w=s.w??im.w, h=s.hh??im.h, x=s.x, y=s.y; const par=String(s.par||'');
    if(!/none/.test(par)&&w&&h){ const slice=/slice/.test(par); const k=slice?Math.max(w/im.w,h/im.h):Math.min(w/im.w,h/im.h); if(!slice){ const nw=im.w*k, nh=im.h*k; const ax=/xMin/.test(par)?0:/xMax/.test(par)?1:.5, ay=/YMin/.test(par)?0:/YMax/.test(par)?1:.5; x+=(w-nw)*ax; y+=(h-nh)*ay; w=nw; h=nh; } }
    else n.setAttr('stretch',true);
    n.setAttrs({imgId:id,image:im.el,width:w,height:h}); n.setAttrs(decomp(new Konva.Transform(s.M).translate(x,y))); BD.applyCrop(n);
  }catch(_){ n.destroy(); } } }

IO.importSVG=async function(text,opt){ opt=opt||{}; const doc=new DOMParser().parseFromString(text,'image/svg+xml'); const svg=doc.documentElement;
  if(!svg||svg.nodeName.replace(/^svg:/,'')!=='svg'||doc.querySelector('parsererror')) throw new Error('That SVG file could not be read.');
  const warnings=new Set(), rules=parseCss(doc), imp=svgImporter(doc,rules,w=>warnings.add(w));
  const vb=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number), hasVB=vb.length===4&&vb.every(isFinite)&&vb[2]>0&&vb[3]>0;
  const rawW=svg.getAttribute('width'), rawH=svg.getAttribute('height'), print=/(mm|cm|in|pt)\s*$/i.test(rawW||'');
  let W=lenPx(rawW,hasVB?vb[2]:300), H=lenPx(rawH,hasVB?vb[3]:150); if(!W||!H){ W=hasVB?vb[2]:300; H=hasVB?vb[3]:150; }
  /* print-sized files (mm, cm…) become a print frame at 300 dpi; others keep their pixel size */
  const k=print?300/96:1, FW=W*k, FH=H*k;
  const root=new Konva.Transform(); root.scale(k,k); if(hasVB){ root.scale(W/vb[2],H/vb[3]); root.translate(-vb[0],-vb[1]); }
  /* load the fonts the text uses first, so each piece is measured with its real font */
  const fams=new Set(); doc.querySelectorAll('text,tspan').forEach(t=>{ const st=styleOf(t,{},rules), f=String(st['font-family']||'').split(',')[0].replace(/['"]/g,'').trim(); if(f) fams.add(f+'|'+String(st['font-weight']||'400').replace('bold','700').replace('normal','400')); });
  doc.querySelectorAll('[font-family],[style*="font-family"]').forEach(t=>{ const st=styleOf(t,{},rules), f=String(st['font-family']||'').split(',')[0].replace(/['"]/g,'').trim(); if(f) fams.add(f+'|400'); });
  await Promise.all([...fams].map(x=>{ const [f,w]=x.split('|'); return BD.ensureFont(f,w).catch(()=>{}); }));
  const kids=[...svg.children].flatMap(c=>imp.walk(c,{},root,null,false));
  if(!kids.length) throw new Error('Nothing in that SVG could be turned into layers.');
  await finishImages(imp.imgs);
  const name=opt.name||'SVG';
  let target;
  if(opt.into){ const f=opt.into, g=new Konva.Group({id:uid(),name:'obj',kind:'group',label:name}); kids.forEach(c=>g.add(c)); f.add(g); imp.applyGradients(g);
    const r=g.getClientRect({relativeTo:f}), s=fsize(f), sc=Math.min(1,s.w*.9/r.width,s.h*.9/r.height); g.scale({x:sc,y:sc}); const r2=g.getClientRect({relativeTo:f}); g.x(g.x()+s.w/2-(r2.x+r2.width/2)); g.y(g.y()+s.h/2-(r2.y+r2.height/2)); target=g; }
  else { const fs=frames(); let x=0,y=0; if(fs.length){ const r=unionRect(fs); x=Math.round(r.x+r.width+160); y=Math.round(r.y); }
    const f=BD.makeFrame(x,y,FW,FH,{label:name,print:print||undefined,fill:'#ffffff'}); if(print) f.setAttr('dpi',300);
    /* a full-size background shape becomes the frame's background colour */
    kids.forEach(c=>f.add(c)); imp.applyGradients(f); frameBg(f).moveToBottom();
    const first=kids[0]; if(first&&first.getClassName()==='Rect'&&!first.rotation()){ const r=first.getClientRect({relativeTo:f}); if(r.x<=1&&r.y<=1&&r.width>=FW-2&&r.height>=FH-2&&typeof first.fill()==='string'&&first.fillPriority()==='color'){ frameBg(f).fill(first.fill()); first.destroy(); } }
    target=f; }
  await Promise.all(target.find('Text').map(t=>BD.ensureFont(t.fontFamily(),t.fontStyle()).catch(()=>{}))); target.find('Text').forEach(t=>{ if(t._setTextData) t._setTextData(); });
  BD.main.find(n=>n.getAttr('kind')==='mask').forEach(BD.decorate); BD.main.find('Image').forEach(n=>BD.applyFx(n));
  BD.paintUI(); BD.main.batchDraw(); BD.select([target]); BD.view.fitSel(); BD.changed();
  const count=target.find('.obj').length, w=[...warnings];
  return {node:target,count,warn:w.length?'Not brought in: '+w.join(', ')+'.':''}; };

/* ======================================================================
   PDF pages → frames (page artwork + editable text where the file has real text)
   ====================================================================== */
async function pdfjs(){ if(!window.pdfjsLib){ await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=L.ROOT+'assets/vendor/pdfjs/pdf.min.js'; s.onload=res; s.onerror=()=>rej(new Error('The PDF reader could not load.')); document.head.appendChild(s); });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=L.ROOT+'assets/vendor/pdfjs/pdf.worker.min.js'; } return window.pdfjsLib; }
const FONT_GUESS=n=>{ n=String(n||''); const fam=n.replace(/^[A-Z]{6}\+/,'').split(/[-,]/)[0].replace(/(MT|PS|Std|Pro)$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').trim();
  const wt=/Black|Heavy/i.test(n)?'900':/ExtraBold|UltraBold/i.test(n)?'800':/SemiBold|DemiBold/i.test(n)?'600':/Bold/i.test(n)?'700':/Medium/i.test(n)?'500':/Light/i.test(n)?'300':'400';
  return {fam,wt,it:/Italic|Oblique/i.test(n)}; };
IO.importPDF=async function(file,opt){ opt=opt||{}; const lib=await pdfjs(); const data=new Uint8Array(await file.arrayBuffer());
  const pdf=await lib.getDocument({data,cMapUrl:L.ROOT+'assets/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:L.ROOT+'assets/vendor/pdfjs/standard_fonts/',isEvalSupported:false}).promise;
  const max=Math.min(pdf.numPages,opt.maxPages||40), made=[]; let editable=0;
  const fonts=new Set(BD.allFonts().map(f=>f.family.toLowerCase()));
  for(let pi=1;pi<=max;pi++){ BD.busy('Reading page '+pi+' of '+max+'…');
    const page=await pdf.getPage(pi), v1=page.getViewport({scale:1});
    let dpi=opt.dpi||300; const lim=v=>Math.max(v1.width,v1.height)*v/72; while(dpi>72&&(lim(dpi)>8000||v1.width*v1.height*(dpi/72)**2>36e6)) dpi-=25;
    const k=dpi/72, vp=page.getViewport({scale:k}), W=Math.round(vp.width), H=Math.round(vp.height);
    const full=document.createElement('canvas'); full.width=W; full.height=H; const fctx=full.getContext('2d'); fctx.fillStyle='#fff'; fctx.fillRect(0,0,W,H);
    await page.render({canvasContext:fctx,viewport:vp}).promise;
    let art=full, texts=[];
    if(opt.text!==false){ const tc=await page.getTextContent(); const items=tc.items.filter(it=>it.str&&it.str.trim());
      if(items.length){ const bare=document.createElement('canvas'); bare.width=W; bare.height=H; const bctx=bare.getContext('2d'); bctx.fillStyle='#fff'; bctx.fillRect(0,0,W,H);
        bctx.fillText=()=>{}; bctx.strokeText=()=>{}; await page.render({canvasContext:bctx,viewport:vp}).promise; art=bare;
        const A=fctx.getImageData(0,0,W,H).data, Bd=bctx.getImageData(0,0,W,H).data;
        /* merge pieces on the same line, then find each line's colour from the pixels the text changed */
        const runs=[]; items.forEach(it=>{ const t=lib.Util.transform(vp.transform,it.transform), fz=Math.hypot(t[2],t[3]), ang=Math.atan2(t[1],t[0]);
          let fn=''; try{ if(page.commonObjs.has(it.fontName)) fn=(page.commonObjs.get(it.fontName)||{}).name||''; }catch(_){}
          const st=(tc.styles||{})[it.fontName]||{}, w=it.width*k, x=t[4], y=t[5], prev=runs[runs.length-1], str=it.str.normalize('NFKC');
          if(prev&&Math.abs(prev.ang-ang)<.01&&Math.abs(prev.y-y)<fz*.25&&Math.abs(prev.fz-fz)<fz*.1&&prev.fn===fn&&x-(prev.x+prev.w)<fz*.6&&x-(prev.x+prev.w)>-fz*.4&&it.dir===prev.dir){
            const gap=x-(prev.x+prev.w); prev.str+=(gap>fz*.15&&!/\s$/.test(prev.str)?' ':'')+str; prev.w=x+w-prev.x; }
          else runs.push({str,x,y,w,fz,ang,fn,asc:st.ascent||.8,generic:st.fontFamily||'sans-serif',dir:it.dir}); });
        runs.forEach(r=>{ let rr=0,gg=0,bb=0,c=0; const x0=Math.max(0,Math.floor(r.x)), x1=Math.min(W,Math.ceil(r.x+r.w)), y0=Math.max(0,Math.floor(r.y-r.fz)), y1=Math.min(H,Math.ceil(r.y+r.fz*.25)), step=Math.max(1,Math.floor((x1-x0)*(y1-y0)/4000));
          if(!r.ang) for(let yy=y0;yy<y1;yy++) for(let xx=x0;xx<x1;xx+=step){ const i=(yy*W+xx)*4, df=Math.abs(A[i]-Bd[i])+Math.abs(A[i+1]-Bd[i+1])+Math.abs(A[i+2]-Bd[i+2]); if(df>60){ const wt=df*df*df; rr+=A[i]*wt; gg+=A[i+1]*wt; bb+=A[i+2]*wt; c+=wt; } }
          r.color=c?'#'+[rr/c,gg/c,bb/c].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''):'#000000'; });
        texts=runs; } }
    const blob=await L.canvasBlob(art,'image/png'); full.width=full.height=0; if(art!==full){ art.width=art.height=0; }
    const imgId=await BD.addPhotoFile(new File([blob],'pdf-page-'+pi+'.png',{type:'image/png'}));
    const fs=frames(); let x=0,y=0; if(fs.length){ const r=unionRect(fs); x=Math.round(r.x+r.width+160); y=Math.round(r.y); }
    const f=BD.makeFrame(x,y,W,H,{label:baseName(file.name)+(pdf.numPages>1?' · page '+pi:''),print:true,dpi,fill:'#ffffff'}); f.setAttr('dpi',dpi);
    const im=BD.make.image(imgId,W,H); im.setAttrs({label:'Page artwork',locked:true,isBg:true}); f.add(im);
    for(const r of texts){ const g=FONT_GUESS(r.fn); let fam=g.fam&&fonts.has(g.fam.toLowerCase())?BD.allFonts().find(x=>x.family.toLowerCase()===g.fam.toLowerCase()).family:null;
      if(!fam) fam=/serif/i.test(r.generic)&&!/sans/i.test(r.generic)?'Georgia':/mono/i.test(r.generic)?'Courier New':'system-ui';
      await BD.ensureFont(fam,g.wt);
      const n=BD.make.text(r.str,{fontFamily:fam,fontSize:Math.round(r.fz*10)/10,fontStyle:(g.it?'italic ':'')+g.wt,fill:r.color,align:'left',lineHeight:1,autoW:true});
      if(r.dir==='rtl') n.direction('rtl');
      const asc=Math.min(.95,Math.max(.6,r.asc||.8)); n.position({x:r.x,y:r.y-r.fz*asc}); if(r.ang) n.rotation(r.ang*180/Math.PI); f.add(n); editable++; }
    made.push(f); page.cleanup(); }
  BD.busy(null); BD.paintUI(); BD.main.batchDraw(); BD.select(made); BD.view.fitSel(); BD.changed(); BD.emitDoc&&BD.emitDoc();
  return {frames:made,pages:pdf.numPages,shown:max,text:editable}; };

/* ======================================================================
   Saving: PNG/JPG with print DPI, PDF, SVG, ZIP
   ====================================================================== */
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u8,crc){ crc=(crc===undefined?0xffffffff:crc); for(let i=0;i<u8.length;i++) crc=CRC[(crc^u8[i])&0xff]^(crc>>>8); return crc; }
const crcDone=u8=>(crc32(u8)^0xffffffff)>>>0;
/* write the print resolution into the file so printers read the real size (e.g. 205 × 85 mm) */
IO.withDpi=async function(blob,dpi){ if(!dpi) return blob; const b=new Uint8Array(await blob.arrayBuffer());
  if(blob.type==='image/png'&&b[12]===0x49&&b[13]===0x48){ const ppm=Math.round(dpi/0.0254), chunk=new Uint8Array(21), dv=new DataView(chunk.buffer);
    dv.setUint32(0,9); chunk.set([0x70,0x48,0x59,0x73],4); dv.setUint32(8,ppm); dv.setUint32(12,ppm); chunk[16]=1; dv.setUint32(17,crcDone(chunk.subarray(4,17)));
    const at=8+25; return new Blob([b.subarray(0,at),chunk,b.subarray(at)],{type:'image/png'}); }
  if(blob.type==='image/jpeg'&&b[2]===0xff&&b[3]===0xe0&&b[6]===0x4a&&b[7]===0x46){ const o=b.slice(); o[13]=1; o[14]=dpi>>8; o[15]=dpi&255; o[16]=dpi>>8; o[17]=dpi&255; return new Blob([o],{type:'image/jpeg'}); }
  return blob; };

/* ZIP (stored; the pictures are already compressed) */
IO.zip=async function(files){ const enc=new TextEncoder(), parts=[], cd=[]; let off=0;
  for(const f of files){ const data=new Uint8Array(await f.blob.arrayBuffer()), name=enc.encode(f.name), crc=crcDone(data);
    const h=new Uint8Array(30), v=new DataView(h.buffer); v.setUint32(0,0x04034b50,true); v.setUint16(4,20,true); v.setUint16(6,0x0800,true); v.setUint16(8,0,true); v.setUint32(14,crc,true); v.setUint32(18,data.length,true); v.setUint32(22,data.length,true); v.setUint16(26,name.length,true);
    parts.push(h,name,data);
    const c=new Uint8Array(46), w=new DataView(c.buffer); w.setUint32(0,0x02014b50,true); w.setUint16(4,20,true); w.setUint16(6,20,true); w.setUint16(8,0x0800,true); w.setUint32(16,crc,true); w.setUint32(20,data.length,true); w.setUint32(24,data.length,true); w.setUint16(28,name.length,true); w.setUint32(42,off,true);
    cd.push(c,name); off+=30+name.length+data.length; }
  const cdSize=cd.reduce((s,x)=>s+x.length,0), end=new Uint8Array(22), e=new DataView(end.buffer); e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,cdSize,true); e.setUint32(16,off,true);
  return new Blob([...parts,...cd,end],{type:'application/zip'}); };

/* PDF: each page is the frame as a lossless picture at its print resolution, on a page of the exact size */
async function deflate(u8){ if(!window.CompressionStream) return null; const cs=new CompressionStream('deflate'); const out=new Blob([u8]).stream().pipeThrough(cs); return new Uint8Array(await new Response(out).arrayBuffer()); }
IO.pdf=async function(pages){ /* pages: [{canvas, w (pt), h (pt), x, y, iw, ih, marks:{trim:{x,y,w,h}, bleed}}] */
  const enc=new TextEncoder(), chunks=[], offs=[]; let pos=0; const push=x=>{ const u=typeof x==='string'?enc.encode(x):x; chunks.push(u); pos+=u.length; };
  const objs=[]; const add=()=>{ objs.push(null); return objs.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const catalog=add(), pagesId=add(), kids=[];
  const write=(id,body)=>{ offs[id]=pos; push(id+' 0 obj\n'); if(Array.isArray(body)){ body.forEach(push); } else push(body); push('\nendobj\n'); };
  for(const p of pages){ const c=p.canvas, W=c.width, H=c.height, data=c.getContext('2d').getImageData(0,0,W,H).data;
    let opaque=true; const rgb=new Uint8Array(W*H*3), a=new Uint8Array(W*H); for(let i=0,j=0,k=0;i<data.length;i+=4){ rgb[j++]=data[i]; rgb[j++]=data[i+1]; rgb[j++]=data[i+2]; a[k++]=data[i+3]; if(data[i+3]!==255) opaque=false; }
    let img=await deflate(rgb), filter='/FlateDecode', smaskId=null;
    if(!img){ const jb=await L.canvasBlob(c,'image/jpeg',.97); img=new Uint8Array(await jb.arrayBuffer()); filter='/DCTDecode'; opaque=true; }
    const imgId=add(); if(!opaque){ smaskId=add(); const am=await deflate(a); write(smaskId,[`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${am.length} >>\nstream\n`,am,'\nendstream']); }
    write(imgId,[`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter ${filter} ${smaskId?`/SMask ${smaskId} 0 R `:''}/Length ${img.length} >>\nstream\n`,img,'\nendstream']);
    const f=n=>(Math.round(n*1000)/1000).toString();
    let cs=`q ${f(p.iw)} 0 0 ${f(p.ih)} ${f(p.x)} ${f(p.h-p.y-p.ih)} cm /Im0 Do Q\n`;
    if(p.marks){ const t=p.marks.trim, b=p.marks.bleed, o=b+3, L2=12, y=(v)=>p.h-v; cs+='q 0.3 w 0 0 0 RG\n';
      [[t.x,t.y],[t.x+t.w,t.y],[t.x,t.y+t.h],[t.x+t.w,t.y+t.h]].forEach(([cx,cy],i)=>{ const sx=i%2?1:-1, sy=i<2?-1:1;
        cs+=`${f(cx)} ${f(y(cy+sy*o))} m ${f(cx)} ${f(y(cy+sy*(o+L2)))} l S\n${f(cx+sx*o)} ${f(y(cy))} m ${f(cx+sx*(o+L2))} ${f(y(cy))} l S\n`; });
      cs+='Q\n'; }
    const cb=enc.encode(cs), contId=add(); write(contId,[`<< /Length ${cb.length} >>\nstream\n`,cb,'\nendstream']);
    const pid=add(); kids.push(pid);
    write(pid,`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f(p.w)} ${f(p.h)}] ${p.marks?`/TrimBox [${f(p.marks.trim.x)} ${f(p.h-p.marks.trim.y-p.marks.trim.h)} ${f(p.marks.trim.x+p.marks.trim.w)} ${f(p.h-p.marks.trim.y)}] /BleedBox [${f(p.x)} ${f(p.h-p.y-p.ih)} ${f(p.x+p.iw)} ${f(p.h-p.y)}] `:''}/Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contId} 0 R >>`);
    c.width=c.height=0; }
  write(pagesId,`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`);
  write(catalog,`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const xref=pos; let x=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objs.length;i++) x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
  push(x+`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R /Producer (Studio Board) >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks,{type:'application/pdf'}); };
/* page size in points: print frames use their DPI (exact mm); screen frames count 96 px per inch */
IO.pdfPage=async function(f,opt){ opt=opt||{}; const print=!!f.getAttr('print'), dpi=print?BD.units.dpiOf(f):96, s=fsize(f), b=opt.bleed?U.bleedOf(f):0, pt=v=>v/dpi*72;
  const res=await BD.exportFrame(f,{canvas:true,scale:print?1:(opt.scale||2),bleed:!!b,transparent:opt.transparent});
  const mm=opt.marks?6/25.4*72*1.6:0, iw=pt(s.w+2*b), ih=pt(s.h+2*b);
  return {canvas:res.canvas,w:iw+2*mm,h:ih+2*mm,x:mm,y:mm,iw,ih,marks:opt.marks?{trim:{x:mm+pt(b),y:mm+pt(b),w:pt(s.w),h:pt(s.h)},bleed:pt(b)}:null}; };

/* SVG: frames with their layers, so the file opens again in Board, Figma, Illustrator or a browser */
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=v=>Math.round(v*1000)/1000;
function paintAttrs(n,defs){ let o='';
  const fp=n.fillPriority&&n.fillPriority();
  if(fp==='linear-gradient'&&n.fillLinearGradientColorStops()){ const id='g'+uid(), s=n.fillLinearGradientStartPoint(), e=n.fillLinearGradientEndPoint(), st=n.fillLinearGradientColorStops();
    defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(s.x)}" y1="${num(s.y)}" x2="${num(e.x)}" y2="${num(e.y)}">${stops(st)}</linearGradient>`); o+=` fill="url(#${id})"`; }
  else if(fp==='radial-gradient'&&n.fillRadialGradientColorStops()){ const id='g'+uid(), c=n.fillRadialGradientEndPoint(), f=n.fillRadialGradientStartPoint(), st=n.fillRadialGradientColorStops();
    defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(c.x)}" cy="${num(c.y)}" fx="${num(f.x)}" fy="${num(f.y)}" r="${num(n.fillRadialGradientEndRadius())}">${stops(st)}</radialGradient>`); o+=` fill="url(#${id})"`; }
  else { const f=n.fill&&n.fill(); o+=fillA('fill',f); }
  const st=n.stroke&&n.stroke(), sw=n.strokeWidth&&n.strokeWidth(); if(st&&sw&&n.strokeEnabled()!==false){ o+=fillA('stroke',st)+` stroke-width="${num(sw)}"`; if(n.lineCap&&n.lineCap()) o+=` stroke-linecap="${n.lineCap()}"`; if(n.lineJoin&&n.lineJoin()) o+=` stroke-linejoin="${n.lineJoin()}"`; const d=n.dash&&n.dash(); if(d&&d.length) o+=` stroke-dasharray="${d.map(num).join(' ')}"`; if(n.strokeScaleEnabled&&n.strokeScaleEnabled()===false) o+=' vector-effect="non-scaling-stroke"'; }
  if(n.fillRule&&n.fillRule()==='evenodd') o+=' fill-rule="evenodd"';
  return o; }
function fillA(k,c){ if(!c||typeof c!=='string') return ` ${k}="none"`; const x=Konva.Util.colorToRGBA(c); if(!x) return ` ${k}="none"`; const h='#'+[x.r,x.g,x.b].map(v=>v.toString(16).padStart(2,'0')).join(''); return ` ${k}="${h}"`+(x.a<1?` ${k}-opacity="${num(x.a)}"`:''); }
function stops(st){ let o=''; for(let i=0;i<st.length;i+=2){ const k=Konva.Util.colorToRGBA(st[i+1])||{r:0,g:0,b:0,a:1}; o+=`<stop offset="${num(st[i])}" stop-color="#${[k.r,k.g,k.b].map(v=>v.toString(16).padStart(2,'0')).join('')}"${k.a<1?` stop-opacity="${num(k.a)}"`:''}/>`; } return o; }
function common(n,defs){ let o=''; const m=n.getTransform().getMatrix(); if(!(m[0]===1&&m[1]===0&&m[2]===0&&m[3]===1&&m[4]===0&&m[5]===0)) o+=` transform="matrix(${m.map(num).join(' ')})"`;
  if(n.opacity()<1) o+=` opacity="${num(n.opacity())}"`; const g=n.globalCompositeOperation&&n.globalCompositeOperation(); if(g&&g!=='source-over') o+=` style="mix-blend-mode:${g}"`;
  const nm=n.getAttr('label'); if(nm) o+=` data-name="${esc(nm)}"`;
  const fx=[]; if(n.shadowEnabled&&n.shadowEnabled()&&n.getAttr('shadowOn')){ const c=Konva.Util.colorToRGBA(n.shadowColor()||'#000')||{r:0,g:0,b:0}; fx.push(`<feDropShadow dx="${num(n.shadowOffsetX())}" dy="${num(n.shadowOffsetY())}" stdDeviation="${num(n.shadowBlur()/2)}" flood-color="rgb(${c.r},${c.g},${c.b})" flood-opacity="${num(n.shadowOpacity())}"/>`); }
  if(n.getAttr('lblur')) fx.push(`<feGaussianBlur stdDeviation="${num(n.getAttr('lblur')/2)}"/>`);
  if(fx.length){ const id='f'+uid(); defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${fx.join('')}</filter>`); o+=` filter="url(#${id})"`; }
  return o; }
function polyPath(pts,closed){ if(pts.length<2) return ''; let d=`M${num(pts[0])} ${num(pts[1])}`; for(let i=2;i<pts.length;i+=2) d+=`L${num(pts[i])} ${num(pts[i+1])}`; return d+(closed?'Z':''); }
function linePath(n){ const p=n.points(); if(n.tension&&n.tension()&&p.length>4&&n.getTensionPoints){ const tp=n.getTensionPoints(); let d=`M${num(p[0])} ${num(p[1])}Q${num(tp[0])} ${num(tp[1])} ${num(tp[2])} ${num(tp[3])}`; let i=4; while(i<tp.length-2){ d+=`C${num(tp[i++])} ${num(tp[i++])} ${num(tp[i++])} ${num(tp[i++])} ${num(tp[i++])} ${num(tp[i++])}`; } d+=`Q${num(tp[tp.length-2])} ${num(tp[tp.length-1])} ${num(p[p.length-2])} ${num(p[p.length-1])}`; return d; } return polyPath(p,n.closed&&n.closed()); }
async function nodeSvg(n,defs,fontsUsed){ if(!n.visible()) return ''; const cls=n.getClassName(), k=kind(n), c=common(n,defs);
  if(k==='mask'){ const id='c'+uid(); const ms=n.getChildren(x=>x.getAttr('isMask')); let cp=''; for(const m of ms){ const mm=m.clone({opacity:1}); cp+=await nodeSvg(mm,defs,fontsUsed); } defs.push(`<clipPath id="${id}">${cp}</clipPath>`);
    let inner=''; for(const ch of n.getChildren(x=>!x.getAttr('isMask'))) inner+=await nodeSvg(ch,defs,fontsUsed); return `<g${c} clip-path="url(#${id})">${inner}</g>`; }
  if(cls==='Group'){ let inner=''; for(const ch of n.getChildren()) inner+=await nodeSvg(ch,defs,fontsUsed); return `<g${c}>${inner}</g>`; }
  if(cls==='Rect'){ const w=n.width(), h=n.height(), r=n.cornerRadius(); if(Array.isArray(r)&&r.some(Boolean)){ const [a,b,cc,d]=r.map(v=>Math.min(v||0,w/2,h/2)); return `<path${c} d="M${a} 0H${w-b}Q${w} 0 ${w} ${b}V${h-cc}Q${w} ${h} ${w-cc} ${h}H${d}Q0 ${h} 0 ${h-d}V${a}Q0 0 ${a} 0Z"${paintAttrs(n,defs)}/>`; }
    return `<rect${c} width="${num(w)}" height="${num(h)}"${r?` rx="${num(Math.min(r,w/2,h/2))}"`:''}${paintAttrs(n,defs)}/>`; }
  if(cls==='Ellipse'||cls==='Circle') return `<ellipse${c} rx="${num(n.radiusX?n.radiusX():n.radius())}" ry="${num(n.radiusY?n.radiusY():n.radius())}"${paintAttrs(n,defs)}/>`;
  if(cls==='Path') return `<path${c} d="${esc(n.data())}"${paintAttrs(n,defs)}/>`;
  if(cls==='Star'){ const pts=[]; const np=n.numPoints(); for(let i=0;i<np*2;i++){ const r=i%2?n.innerRadius():n.outerRadius(), a=i*Math.PI/np; pts.push(r*Math.sin(a),-r*Math.cos(a)); } return `<path${c} d="${polyPath(pts,true)}"${paintAttrs(n,defs)}/>`; }
  if(cls==='RegularPolygon'){ const pts=[]; for(let i=0;i<n.sides();i++){ const a=i*2*Math.PI/n.sides(); pts.push(n.radius()*Math.sin(a),-n.radius()*Math.cos(a)); } return `<path${c} d="${polyPath(pts,true)}"${paintAttrs(n,defs)}/>`; }
  if(cls==='Ring'){ const o=n.outerRadius(), i=n.innerRadius(); return `<path${c} fill-rule="evenodd" d="M${o} 0A${o} ${o} 0 1 1 ${-o} 0A${o} ${o} 0 1 1 ${o} 0ZM${i} 0A${i} ${i} 0 1 1 ${-i} 0A${i} ${i} 0 1 1 ${i} 0Z"${paintAttrs(n,defs)}/>`; }
  if(cls==='Line'||cls==='Arrow'){ let o=`<path d="${linePath(n)}"${paintAttrs(n,defs).replace(/ fill="[^"]*"( fill-opacity="[^"]*")?/,n.closed&&n.closed()?'$&':' fill="none"')}/>`;
    if(cls==='Arrow'){ const p=n.points(), L2=n.pointerLength(), W2=n.pointerWidth()/2, col=n.stroke(); const head=(x1,y1,x2,y2)=>{ const a=Math.atan2(y2-y1,x2-x1), bx=x2-L2*Math.cos(a), by=y2-L2*Math.sin(a); return `<path d="M${num(x2)} ${num(y2)}L${num(bx+W2*Math.sin(a))} ${num(by-W2*Math.cos(a))}L${num(bx-W2*Math.sin(a))} ${num(by+W2*Math.cos(a))}Z"${fillA('fill',col)}/>`; };
      if(n.pointerAtEnding()!==false) o+=head(p[p.length-4],p[p.length-3],p[p.length-2],p[p.length-1]); if(n.pointerAtBeginning()) o+=head(p[2],p[3],p[0],p[1]); }
    return `<g${c}>${o}</g>`; }
  if(cls==='Text'){ fontsUsed.add(n.fontFamily()); const lh=n.fontSize()*n.lineHeight(), pad=n.padding(), W=n.width(), rtl=n.direction()==='rtl'; let o='';
    if(n.getAttr('tbg')){ const r=n.getAttr('tbgR')||0; o+=`<rect width="${num(W)}" height="${num(n.height())}" rx="${num(Math.min(r,W/2,n.height()/2))}"${fillA('fill',n.getAttr('tbg'))}/>`; }
    const fw=(n.fontStyle().match(/\d{3}/)||[/bold/.test(n.fontStyle())?'700':'400'])[0], it=/italic/.test(n.fontStyle());
    const base=` font-family="${esc(n.fontFamily())}" font-size="${num(n.fontSize())}" font-weight="${fw}"${it?' font-style="italic"':''}${n.letterSpacing()?` letter-spacing="${num(n.letterSpacing())}"`:''}${n.textDecoration()?` text-decoration="${esc(n.textDecoration())}"`:''}${paintAttrs(n,defs)}${n.getAttr('fillAfterStrokeEnabled')?' paint-order="stroke"':''}${rtl?' direction="rtl"':''}`;
    (n.textArr||[]).forEach((ln,i)=>{ const lw=ln.width; let x=pad; const al=n.align(); if(al==='center') x=(W-lw)/2; else if(al==='right') x=W-pad-lw; const y=pad+i*lh+lh/2;
      o+=`<text x="${num(rtl?x+lw:x)}" y="${num(y)}" dominant-baseline="middle"${rtl?' text-anchor="end"':''}${base}>${esc(ln.text)}</text>`; });
    return `<g${c}>${o}</g>`; }
  if(cls==='TextPath'){ fontsUsed.add(n.fontFamily()); const id='p'+uid(); defs.push(`<path id="${id}" d="${esc(n.data())}"/>`); const fw=(n.fontStyle().match(/\d{3}/)||['400'])[0];
    return `<text${c} font-family="${esc(n.fontFamily())}" font-size="${num(n.fontSize())}" font-weight="${fw}"${n.letterSpacing()?` letter-spacing="${num(n.letterSpacing())}"`:''}${paintAttrs(n,defs)}><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(n.text())}</textPath></text>`; }
  if(cls==='Image'){ /* the photo as it looks (crop, corners, looks) as a lossless picture */
    const im=BD.IMGS.get(n.getAttr('imgId')), cw=n.crop().width||n.width(), pr=Math.max(1,Math.min(4,im?cw/n.width():2));
    const cl=n.clone({x:0,y:0,rotation:0,scaleX:Math.sign(n.scaleX())||1,scaleY:Math.sign(n.scaleY())||1,skewX:0,skewY:0,opacity:1,shadowEnabled:false,globalCompositeOperation:'source-over'}); BD.applyFx(cl,pr);
    const r=cl.getClientRect(); let url=''; try{ url=cl.toDataURL({pixelRatio:pr,x:r.x,y:r.y,width:r.width,height:r.height}); }catch(_){} cl.destroy();
    return `<image${c} x="${num(r.x)}" y="${num(r.y)}" width="${num(r.width)}" height="${num(r.height)}" preserveAspectRatio="none" href="${url}"/>`; }
  return ''; }
IO.svg=async function(f,opt){ opt=opt||{}; const s=fsize(f), b=opt.bleed?U.bleedOf(f):0, defs=[], fonts=new Set(); let body='';
  const bg=frameBg(f); if(!opt.transparent) body+=`<rect x="${-b}" y="${-b}" width="${num(s.w+2*b)}" height="${num(s.h+2*b)}"${paintAttrs(bg,defs)}/>`;
  for(const ch of items(f)) body+=await nodeSvg(ch,defs,fonts);
  const gf=BD.allFonts().filter(x=>fonts.has(x.family)&&x.tag!=='system').map(x=>'family='+encodeURIComponent(x.family).replace(/%20/g,'+')+(x.w?':wght@'+x.w:''));
  const brand=BD.B&&BD.B.fonts&&BD.B.fonts.google;
  const css=gf.length||brand?`<style><![CDATA[@import url('https://fonts.googleapis.com/css2?${[brand,...gf].filter(Boolean).join('&')}&display=swap');]]></style>`:'';
  const print=!!f.getAttr('print'), dpi=BD.units.dpiOf(f), W=s.w+2*b, H=s.h+2*b, dim=print?`width="${num(W/dpi*25.4)}mm" height="${num(H/dpi*25.4)}mm"`:`width="${num(W)}" height="${num(H)}"`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${dim} viewBox="${-b} ${-b} ${num(W)} ${num(H)}" data-name="${esc(nameOf(f))}">${css}<defs>${defs.join('')}</defs><g clip-path="none">${body}</g></svg>`; };
})();

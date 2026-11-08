/* Create: import a Claude Design board (mega 3.1, behind the `import` preview flag).
   Lazy-loaded by create.js the first time someone picks or drops a board. The board (.dc.html, a self-contained .html,
   or a .zip with its pictures) is drawn in a SANDBOXED IFRAME (srcdoc, sandbox="allow-same-origin" only: no scripts, no
   forms, no popups; a CSP meta also blocks every request except blob:/data: pictures and the font files). Scripts stay
   off on purpose: the walk reads the finished DOM from outside, so the board never needs to run code, and running
   scripts together with same-origin access would let the file reach Studio. A board that only draws itself with
   scripts therefore opens empty, and the person is told to export it as a .dc.html or a static HTML.
   Then the DOM walk (a port of studio-notes/reference/claude-design-import/layers.js) turns every piece into a layer
   description, and build() makes a Create document: pictures, shapes, text, one layer each. Clipped groups (overflow
   hidden that really clips) are drawn once with Konva and become one picture. Pictures from the file are kept as draft
   photos (IndexedDB, like Create's own photos) until the design is saved to the team.
   Brand-agnostic: fonts, crayon-style text fills and the body font come from the brand kit (brand.importMap is optional:
   {texClasses:{cr:'crayon-red'}} maps a board's class names to the kit's textFills). */
(function(){
'use strict';
const L=Studio.lab, U=()=>BD.util, esc=L.esc;
const uid=()=>Math.random().toString(36).slice(2,12);
const AR=/[؀-ۿݐ-ݿࢠ-ࣿ]/;
const GENERIC=/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[\w-]+|-apple-system|blinkmacsystemfont|emoji|math|fangsong|inherit|initial|unset)$/i;
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif',woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',otf:'font/otf',html:'text/html',htm:'text/html'};
async function sniff(blob){ const h=new Uint8Array(await blob.slice(0,12).arrayBuffer()), t=new TextDecoder().decode(h);
  const type=h[0]===0xFF&&h[1]===0xD8?'image/jpeg':h[0]===0x89&&h[1]===0x50?'image/png':t.startsWith('GIF8')?'image/gif':t.startsWith('RIFF')&&t.slice(8,12)==='WEBP'?'image/webp':/^\s*(<\?xml|<svg)/i.test(t)?'image/svg+xml':'';
  return type&&type!==blob.type?new Blob([blob],{type}):blob; }
const extOf=n=>(String(n).split(/[?#]/)[0].match(/\.(\w+)$/)||[])[1]||'';
const baseOf=n=>decodeURIComponent(String(n).split(/[?#]/)[0]).split(/[\\/]/).pop();

/* ---------- zip (store + deflate, no dependency; zip64 not supported) ---------- */
async function inflate(data){ return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); }
async function unzip(file){
  const buf=new Uint8Array(await file.arrayBuffer()), dv=new DataView(buf.buffer); let e=buf.length-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50) e--; if(e<0) throw new Error('not a zip');
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true); const out=[], td=new TextDecoder();
  for(let i=0;i<n&&dv.getUint32(p,true)===0x02014b50;i++){
    const flags=dv.getUint16(p+8,true), method=dv.getUint16(p+10,true), cs=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lho=dv.getUint32(p+42,true);
    const name=td.decode(buf.subarray(p+46,p+46+nl)); p+=46+nl+xl+cl;
    if(name.endsWith('/')||/(^|\/)(__MACOSX|\.DS_Store)/.test(name)) continue;
    const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true), data=buf.subarray(start,start+cs);
    out.push({name,bytes:method===0?data:method===8?await inflate(data):null}); }
  return out.filter(x=>x.bytes); }

/* the file the person picked -> {html, res:Map(name -> Blob), title} */
async function readInput(file){
  const res=new Map(); let html=null; const nm=file.name||'board';
  const head=new Uint8Array(await file.slice(0,4).arrayBuffer());
  if(/\.zip$/i.test(nm)||(head[0]===0x50&&head[1]===0x4b)){
    const ents=await unzip(file), pages=ents.filter(x=>/\.html?$/i.test(x.name));
    const pick=pages.find(x=>/\.dc\.html$/i.test(x.name))||pages.find(x=>/(^|\/)index\.html?$/i.test(x.name))||pages.sort((a,b)=>b.bytes.length-a.bytes.length)[0];
    if(!pick) throw new Error('no board in the zip');
    html=new TextDecoder().decode(pick.bytes);
    ents.forEach(x=>{ if(x!==pick&&!/\.html?$/i.test(x.name)){ const b=new Blob([x.bytes],{type:MIME[extOf(x.name).toLowerCase()]||''}); res.set(x.name,b); } });
  } else html=await file.text();
  return {html,res,title:nm.replace(/\.(dc\.html|html?|zip)$/i,'').replace(/[-_]+/g,' ').trim()}; }

/* ---------- the sandboxed iframe ---------- */
const CSP="default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com; font-src 'self' data: blob: https://fonts.gstatic.com";
function prepare(html,res){
  const urls=new Map(), blobs=new Map(), missing=new Set();   // name -> blob url, blob url -> Blob
  const find=u=>{ let k=String(u||'').trim(); if(!k||/^(data:|blob:|#)/i.test(k)) return null; k=k.replace(/^file:\/\//,'').replace(/^\/_blob\//,'').replace(/^\.?\//,'');
    let nm=null; try{ nm=decodeURIComponent(k.split(/[?#]/)[0]); }catch(_){ nm=k; }
    for(const [name,b] of res){ if(name===nm||name.endsWith('/'+nm)||baseOf(name)===baseOf(nm)||name===k) return [name,b]; }
    const bare=x=>baseOf(x).replace(/\.\w{2,5}$/,''); for(const [name,b] of res){ if(bare(name)===bare(nm)) return [name,b]; } return null; };   // /_blob/key may be stored as key.png
  const fix=u=>{ const f=find(u); if(!f){ if(u&&!/^(data:|blob:|#)/i.test(u.trim())) missing.add(u); return /^(data:|blob:)/i.test((u||'').trim())?u:'data:,'; } const [name,b]=f;
    if(!urls.has(name)){ const bu=URL.createObjectURL(b); urls.set(name,bu); blobs.set(bu,b); } return urls.get(name); };
  let dims=null, body, styles='';
  const raw=html, x=raw.match(/<x-dc[^>]*>([\s\S]*?)<\/x-dc>/i);
  const d=new DOMParser().parseFromString(x?'<!doctype html><body>'+x[1]:raw,'text/html');
  const m=raw.match(/"width"\s*:\s*(\d{3,5})\s*,\s*"height"\s*:\s*(\d{3,5})/); if(m) dims=[+m[1],+m[2]];
  d.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv],helmet,link[rel~=preload],link[rel~=modulepreload]').forEach(e=>e.remove());
  d.querySelectorAll('link[rel~=stylesheet]').forEach(e=>e.remove());   // Google Fonts etc.: the fonts are loaded by Studio itself
  d.querySelectorAll('[src]').forEach(e=>{ e.setAttribute('src',fix(e.getAttribute('src'))); e.removeAttribute('srcset'); e.removeAttribute('loading'); });
  d.querySelectorAll('[srcset]').forEach(e=>e.removeAttribute('srcset'));
  const css=s=>s.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g,(a,q,u)=>/^(data:|blob:)/i.test(u.trim())?a:'url("'+fix(u)+'")');
  d.querySelectorAll('[style]').forEach(e=>e.setAttribute('style',css(e.getAttribute('style'))));
  d.querySelectorAll('style').forEach(e=>{ e.textContent=css(e.textContent.replace(/@import[^;]+;/g,'')); styles+=e.outerHTML; e.remove(); });
  d.querySelectorAll('a[href]').forEach(a=>a.removeAttribute('href'));
  const links=[...document.querySelectorAll('link[data-brand-fonts],link[data-font]')].map(l=>l.href);
  const doc='<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+CSP+'">'+links.map(h=>'<link rel="stylesheet" href="'+h+'">').join('')+'<style>html,body{margin:0;padding:0}</style>'+styles+'</head><body style="margin:0">'+d.body.innerHTML+'</body></html>';
  return {doc,dims,blobs,missing:[...missing]}; }

async function frame(html,res,opt){
  const P=prepare(html,res), W=P.dims?P.dims[0]:1080, H=P.dims?P.dims[1]:1920;
  const f=document.createElement('iframe'); f.setAttribute('sandbox','allow-same-origin'); f.setAttribute('aria-hidden','true'); f.tabIndex=-1;
  f.style.cssText='position:fixed;left:-30000px;top:0;border:0;pointer-events:none;width:'+W+'px;height:'+H+'px';
  await new Promise(r=>{ f.onload=r; f.srcdoc=P.doc; document.body.appendChild(f); });
  const w=f.contentWindow, d=w.document;
  /* the font replacements are decided here, so what gets measured is what Create will draw */
  const fm=fontPlan(w); await ready(w,P.blobs);
  return {f,w,d,P,fm}; }
async function ready(w,blobs){ const d=w.document, imgs=[...d.images];
  await Promise.race([Promise.all(imgs.map(i=>i.complete?null:new Promise(r=>{ i.onload=i.onerror=r; }))),new Promise(r=>setTimeout(r,8000))]);
  await Promise.all(imgs.map(i=>i.decode?i.decode().catch(()=>{}):null));
  try{ await Promise.race([d.fonts.ready,new Promise(r=>setTimeout(r,5000))]); }catch(_){}
  await new Promise(r=>w.requestAnimationFrame(()=>w.requestAnimationFrame(r))); }

/* ---------- fonts ---------- */
const famList=s=>String(s||'').split(',').map(x=>x.trim().replace(/^["']|["']$/g,'')).filter(Boolean);
function resolveFam(css,plan){ const B=L.brand(), body=(B.fonts&&B.fonts.body)||'system-ui', brand=L.brandFonts().map(f=>f.family), more=L.MORE_FONTS.map(f=>f.family);
  const lst=famList(css); for(const f of lst){ if(brand.includes(f)) return f; if(more.includes(f)){ plan.more.add(f); return f; } }
  const named=lst.filter(f=>!GENERIC.test(f)&&!/^(arial|helvetica( neue)?|times( new roman)?|georgia|verdana|tahoma|courier( new)?|segoe ui|roboto|inter)$/i.test(f));   // system names are no news; anything else is a font we do not have
  named.forEach(f=>plan.unknown.add(f)); return body; }
function fontPlan(w){ const plan={more:new Set(),unknown:new Set(),swap:new Map()}, d=w.document;
  [...d.body.querySelectorAll('*')].forEach(e=>{ const cs=w.getComputedStyle(e); if(!cs.fontFamily) return; const fam=resolveFam(cs.fontFamily,plan); if(famList(cs.fontFamily)[0]!==fam) e.style.setProperty('font-family','"'+fam+'"','important'); });
  return plan; }

/* ---------- the DOM walk (port of reference layers.js; runs from outside the iframe, so no scripts are needed) ---------- */
function walk(w,fm,dims){
  const d=w.document, CS=e=>w.getComputedStyle(e), DM=w.DOMMatrix, DP=w.DOMPoint;
  const root=[...d.body.children].find(e=>e.tagName==='DIV')||d.body.firstElementChild; if(!root) return null;
  const all=[...root.querySelectorAll('*')], tfs=L.brandTextFills(), B=L.brand(), map=(B.importMap&&B.importMap.texClasses)||{};
  const mat=new Map(); mat.set(root,new DM());
  const local=(e,par)=>{ const cs=CS(e); let m=new DM().translate(e.offsetLeft+(par.clientLeft||0),e.offsetTop+(par.clientTop||0));
    if(cs.transform&&cs.transform!=='none'){ const [ox,oy]=cs.transformOrigin.split(' ').map(parseFloat); m=m.translate(ox,oy).multiply(new DM(cs.transform)).translate(-ox,-oy); } return m; };
  const full=e=>{ if(mat.has(e)) return mat.get(e); const par=e.offsetParent&&root.contains(e.offsetParent)?e.offsetParent:root; const m=full(par).multiply(local(e,par)); mat.set(e,m); return m; };
  all.forEach(e=>{ if(CS(e).display!=='inline') full(e); });
  const dec=(m,lx,ly)=>{ const p=m.transformPoint(new DP(lx||0,ly||0)), sx=Math.hypot(m.a,m.b), det=m.a*m.d-m.b*m.c, sy=sx?det/sx:1;
    return {x:+p.x.toFixed(2),y:+p.y.toFixed(2),rotation:+(Math.atan2(m.b,m.a)*180/Math.PI).toFixed(3),scaleX:+sx.toFixed(4),scaleY:+sy.toFixed(4)}; };
  const rgba=s=>{ const m=(s||'').match(/[\d.]+/g); if(!m) return null; const [r,g,b,a]=m.map(Number); if(a===0) return null; return a!=null&&a<1?`rgba(${r},${g},${b},${a})`:'#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('').toUpperCase(); };
  const ownText=el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
  const isClipText=cs=>(cs.backgroundClip==='text'||cs.webkitBackgroundClip==='text');
  const urlOf=bg=>{ const m=(bg||'').match(/url\(["']?([^"')]+)["']?\)/); return m&&m[1]; };
  /* a crayon-style text fill: background-clip:text with a picture. Which of the kit's fills: a class the brand names, else the file name, else the first */
  const texOf=el=>{ for(let e=el;e&&e!==root.parentElement;e=e.parentElement){ const cs=CS(e); if(!isClipText(cs)) continue;
      if(!tfs.length) return {none:true};
      for(const c of e.classList){ if(map[c]&&tfs.some(f=>f.id===map[c])) return {id:map[c]}; }
      const u=(urlOf(cs.backgroundImage)||'').toLowerCase(), hit=tfs.find(f=>u&&(u.includes(f.id)||u.includes(String(f.asset||'').replace(/^.*?-/,''))));
      return {id:(hit||tfs[0]).id}; }
    return null; };
  const famOf=cs=>resolveFam(cs.fontFamily,{more:new Set(),unknown:new Set()});
  /* clipped groups: only where something really pokes out, or a rounded clip holds a picture */
  const clips=e=>{ const cs=CS(e); if(e===root||!e.children.length||e.tagName==='IMG'||!/hidden|clip/.test(cs.overflow)) return false;
    const r=e.getBoundingClientRect(), rad=cs.borderTopLeftRadius&&cs.borderTopLeftRadius!=='0px';
    return [...e.querySelectorAll('*')].some(c=>{ const k=c.getBoundingClientRect(); return k.width&&k.height&&(k.left<r.left-2||k.top<r.top-2||k.right>r.right+2||k.bottom>r.bottom+2||(rad&&c.tagName==='IMG')); }); };
  const clipSet=new Set(all.filter(clips));
  /* text, measured with every transform switched off (local boxes), then switched back on */
  const saved=all.concat([root]).map(e=>[e,e.style.transform]); saved.forEach(([e])=>e.style.setProperty('transform','none','important'));
  const textInfo=new Map(), blocks=all.filter(e=>ownText(e)&&CS(e).display!=='inline');
  all.filter(e=>ownText(e)&&CS(e).display==='inline').forEach(sp=>{ let b=sp; while(b&&CS(b).display==='inline') b=b.parentElement; if(b&&!blocks.includes(b)&&root.contains(b)) blocks.push(b); });
  for(const b of blocks){ const br=b.getBoundingClientRect(), cs=CS(b);
    const segs=[]; const tw=d.createTreeWalker(b,4); let n; while(n=tw.nextNode()){ if(n.textContent.trim()) segs.push(n); }
    const mine=segs.filter(t=>{ let e=t.parentElement; while(e!==b){ if(CS(e).display!=='inline') return false; e=e.parentElement; } return true; });
    if(!mine.length) continue;
    const st=mine.map(t=>{ const e=t.parentElement, c=CS(e), tx=texOf(e); return {col:rgba(c.color),tex:tx&&tx.id,fam:famOf(c),wt:c.fontWeight,fs:parseFloat(c.fontSize),it:c.fontStyle==='italic'}; });
    const key=s=>[s.col,s.tex,s.fam,s.wt,s.fs,s.it].join('|'), same=st.every(s=>key(s)===key(st[0]));
    let align=cs.textAlign; if(cs.display.includes('flex')) align=cs.justifyContent==='flex-start'?'left':cs.justifyContent==='flex-end'?'right':'center';
    if(align==='start') align=cs.direction==='rtl'?'right':'left'; if(align==='end') align=cs.direction==='rtl'?'left':'right'; if(align==='justify') align='left';
    const items=[];
    if(same){ const s=st[0], rg=d.createRange(); rg.selectNodeContents(b); const tr=rg.getBoundingClientRect(), txt=b.innerText.trim();
      const lines=txt.split('\n').length, lh=cs.lineHeight==='normal'?+(tr.height/lines/s.fs).toFixed(3):parseFloat(cs.lineHeight)/s.fs;
      items.push({text:txt,dx:0,dy:tr.top-br.top,w:br.width,fam:s.fam,wt:s.wt,fs:s.fs,it:s.it,col:s.col,tex:s.tex,align,lh,ls:parseFloat(cs.letterSpacing)||0});
    } else {   // mixed colours / fonts: one layer per coloured run on a line
      mine.forEach((t,i)=>{ const s=st[i]; if(!s.col&&!s.tex) return; const txt=t.textContent; let cur=null; const runs=[];
        for(let k=0;k<txt.length;k++){ const rg=d.createRange(); rg.setStart(t,k); rg.setEnd(t,k+1); const rr=rg.getClientRects()[0]; if(!rr) continue;
          if(!cur||Math.abs(rr.top-cur.top)>s.fs*0.4){ cur={top:rr.top,bottom:rr.bottom,l:rr.left,r:rr.right,s:''}; runs.push(cur); }
          cur.s+=txt[k]; cur.l=Math.min(cur.l,rr.left); cur.r=Math.max(cur.r,rr.right); cur.top=Math.min(cur.top,rr.top); cur.bottom=Math.max(cur.bottom,rr.bottom); }
        runs.forEach(u=>{ const str=u.s.trim(); if(!str) return; items.push({text:str,dx:u.l-br.left-4,dy:u.top-br.top,w:u.r-u.l+8,fam:s.fam,wt:s.wt,fs:s.fs,it:s.it,col:s.col,tex:s.tex,align:'center',lh:+((u.bottom-u.top)/s.fs).toFixed(3),ls:0}); }); }); }
    textInfo.set(b,items); }
  saved.forEach(([e,v])=>{ if(v) e.style.transform=v; else e.style.removeProperty('transform'); });
  /* painting order */
  const gradient=(bg,w0,h0)=>{ const m=bg.match(/linear-gradient\((.*)\)$/); if(!m) return null; const parts=m[1].split(/,(?![^(]*\))/).map(s=>s.trim()); let dir='to bottom'; if(/^to |deg$/.test(parts[0])) dir=parts.shift();
    const stops=[]; parts.forEach((p,i)=>{ const c=p.match(/rgba?\([^)]*\)|#[0-9a-f]+/i); if(!c) return; const pc=p.match(/([\d.]+)%\s*$/); stops.push(pc?+pc[1]/100:i/(parts.length-1),rgba(c[0])||'rgba(0,0,0,0)'); });
    if(stops.length<4) return null; let pts={ 'to bottom':[[0,0],[0,h0]],'to top':[[0,h0],[0,0]],'to right':[[0,0],[w0,0]],'to left':[[w0,0],[0,0]] }[dir];
    const dg=dir.match(/^(-?[\d.]+)deg$/); if(dg){ const a=(+dg[1])*Math.PI/180, sx=Math.sin(a), sy=-Math.cos(a), L2=Math.abs(w0*sx)+Math.abs(h0*sy); pts=[[w0/2-sx*L2/2,h0/2-sy*L2/2],[w0/2+sx*L2/2,h0/2+sy*L2/2]]; }
    pts=pts||[[0,0],[0,h0]];
    return {fillLinearGradientStartPoint:{x:pts[0][0],y:pts[0][1]},fillLinearGradientEndPoint:{x:pts[1][0],y:pts[1][1]},fillLinearGradientColorStops:stops,fillPriority:'linear-gradient'}; };
  const shadow=s=>{ if(!s||s==='none'||/inset/.test(s)) return {}; const c=s.match(/rgba?\([^)]*\)|#[0-9a-f]+/i), nums=s.replace(/rgba?\([^)]*\)/,'').match(/-?[\d.]+px/g)||[], [ox,oy,bl]=nums.map(parseFloat);
    return {shadowColor:c?c[0].replace(/\s/g,''):'rgba(0,0,0,.2)',shadowOffsetX:ox||0,shadowOffsetY:oy||0,shadowBlur:(bl||0)/2,shadowEnabled:true}; };
  const radius=(cs,w0,h0)=>{ const r=cs.borderTopLeftRadius; if(!r||r==='0px') return 0; if(r.endsWith('%')) return Math.min(w0,h0)*parseFloat(r)/100; return Math.min(parseFloat(r),Math.min(w0,h0)/2); };
  const border=cs=>{ const s=['Top','Right','Bottom','Left'].map(k=>[parseFloat(cs['border'+k+'Width'])||0,cs['border'+k+'Style'],cs['border'+k+'Color']]); return s[0][0]&&s.every(x=>x[0]===s[0][0]&&x[1]!=='none'&&x[2]===s[0][2])?{w:s[0][0],c:rgba(s[0][2])}:null; };
  const imgs=[];
  const visit=(e,ctx,inh)=>{ const cs=CS(e); if(cs.display==='none'||cs.visibility==='hidden') return; const m=ctx.inv.multiply(full(e)), w0=e.offsetWidth, h0=e.offsetHeight, op=inh*parseFloat(cs.opacity), out=ctx.out;
    if(e!==root&&clipSet.has(e)){ const sub={inv:full(e).inverse(),out:[]}, bg0=rgba(cs.backgroundColor), br=border(cs);
      if(bg0||br) sub.out.push({t:'rect',x:0,y:0,rotation:0,scaleX:1,scaleY:1,w:w0,h:h0,fill:bg0||undefined,stroke:br?br.c:undefined,strokeWidth:br?br.w:undefined,cornerRadius:radius(cs,w0,h0)});
      [...e.children].forEach(c=>{ if(CS(c).display==='inline'&&!c.children.length&&!textInfo.has(c)) return; visit(c,sub,1); });
      if(textInfo.has(e)) textInfo.get(e).forEach(it=>sub.out.push({t:'text',...it,...dec(sub.inv.multiply(full(e)),it.dx,it.dy),opacity:1,boxW:w0}));
      out.push({t:'flat',...dec(m),w:w0,h:h0,cornerRadius:radius(cs,w0,h0),opacity:op,nodes:sub.out,...shadow(cs.boxShadow)}); return; }
    if(e.tagName==='IMG'){ const bw=parseFloat(cs.borderTopWidth)||0, rad=radius(cs,w0,h0), pos=(cs.objectPosition||'50% 50%').split(' ').map(v=>v.endsWith('%')?parseFloat(v)/100:.5);
      if(bw) out.push({t:'rect',...dec(m),w:w0,h:h0,fill:rgba(cs.borderTopColor),cornerRadius:rad,opacity:op,...shadow(cs.boxShadow)});
      out.push({t:'img',src:e.currentSrc||e.src,alt:e.alt,ok:e.complete&&e.naturalWidth>0,nw:e.naturalWidth,nh:e.naturalHeight,...dec(m,bw,bw),w:w0-2*bw,h:h0-2*bw,fit:cs.objectFit,focX:pos[0],focY:pos[1],cornerRadius:Math.max(0,rad-bw),opacity:op,...(bw?{}:shadow(cs.boxShadow))}); return; }
    const bgU=e===root?null:urlOf(cs.backgroundImage);
    {   const bg=e===root?null:rgba(cs.backgroundColor), gr=e!==root&&cs.backgroundImage&&cs.backgroundImage.startsWith('linear-gradient')?gradient(cs.backgroundImage,w0,h0):null, br=e===root?null:border(cs), clipT=isClipText(cs);
      if(!clipT&&w0&&h0&&(bg||gr||br)) out.push({t:'rect',...dec(m),w:w0,h:h0,fill:bg||undefined,...(gr||{}),stroke:br?br.c:undefined,strokeWidth:br?br.w:undefined,cornerRadius:radius(cs,w0,h0),opacity:op,...shadow(cs.boxShadow)});
      if(!clipT&&bgU&&w0&&h0){ const sz=cs.backgroundSize, bp=(cs.backgroundPosition||'50% 50%').split(' ').map(v=>v.endsWith('%')?parseFloat(v)/100:.5);
        out.push({t:'img',src:bgU,ok:true,...dec(m),w:w0,h:h0,fit:/contain/.test(sz)?'contain':/cover/.test(sz)?'cover':'fill',focX:bp[0],focY:bp[1],cornerRadius:radius(cs,w0,h0),opacity:op}); } }
    if(textInfo.has(e)) textInfo.get(e).forEach(it=>out.push({t:'text',...it,...dec(m,it.dx,it.dy),opacity:op,boxW:w0}));
    [...e.children].forEach(c=>{ if(CS(c).display==='inline'&&!c.children.length&&!textInfo.has(c)) return; visit(c,ctx,op); }); };
  const top={inv:new DM(),out:[]}; visit(root,top,1);
  /* a white copy right under a crayon copy of the same words = one "crayon on white" word */
  const nodes=[]; top.out.forEach((n,i)=>{ if(n.t==='text'&&n.col==='#FFFFFF'&&!n.tex){ const tw=top.out.find((o,j)=>j>i&&o.t==='text'&&o.tex&&o.text===n.text&&Math.abs(o.x-n.x)<3&&Math.abs(o.y-n.y)<3); if(tw){ tw.solid=true; return; } } nodes.push(n); });
  const rr=root.getBoundingClientRect(), rc=CS(root), rbg=rgba(rc.backgroundColor)||'#FFFFFF';
  const rgr=rc.backgroundImage&&rc.backgroundImage.startsWith('linear-gradient')?gradient(rc.backgroundImage,root.offsetWidth,root.offsetHeight):null;
  if(rgr) nodes.unshift({t:'rect',x:0,y:0,rotation:0,scaleX:1,scaleY:1,w:root.offsetWidth,h:root.offsetHeight,...rgr,cornerRadius:0,opacity:1});
  const rU=urlOf(rc.backgroundImage); if(rU) nodes.unshift({t:'img',src:rU,ok:true,x:0,y:0,rotation:0,scaleX:1,scaleY:1,w:root.offsetWidth,h:root.offsetHeight,fit:/contain/.test(rc.backgroundSize)?'contain':'cover',focX:.5,focY:.5,cornerRadius:0,opacity:1});
  return {w:dims?dims[0]:Math.round(rr.width),h:dims?dims[1]:Math.round(rr.height),bg:rbg,nodes}; }

/* describe(file): the layer description of a board (what the tests compare), and everything build() needs */
async function describe(file){
  const inp=await readInput(file), F=await frame(inp.html,inp.res);
  try{ const desc=walk(F.w,F.fm,F.P.dims);
    if(!desc||!desc.nodes.length) throw Object.assign(new Error('empty'),{empty:true});
    desc.title=inp.title; desc.fonts={more:[...F.fm.more],unknown:[...F.fm.unknown]}; desc.missing=F.P.missing.length;
    const bl=new Map(F.P.blobs); const srcs=new Set(); (function g(a){ a.forEach(n=>{ if(n.t==='img') srcs.add(n.src); if(n.nodes) g(n.nodes); }); })(desc.nodes);
    const data=new Map(); for(const s of srcs){ if(bl.has(s)) data.set(s,await sniff(bl.get(s))); else if(/^data:/.test(s)&&s!=='data:,'){ try{ data.set(s,await sniff(await (await fetch(s)).blob())); }catch(_){} } }
    return {desc,data};
  } finally { F.f.remove(); } }

/* ---------- building the Create document ---------- */
const isoLatin=t=>AR.test(t)?t.replace(/[A-Za-z0-9@#][A-Za-z0-9@#._\-\/:%+]*/g,m=>/[A-Za-z]/.test(m)?'⁦'+m+'⁩':m):t;   // Latin runs inside Arabic keep their order
async function rasterSvg(blob,w,h){ const url=URL.createObjectURL(blob);
  try{ const im=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    let iw=im.naturalWidth||w||300, ih=im.naturalHeight||h||300; const k=Math.min(Math.max(1,Math.max(w||iw,h||ih)*2/Math.max(iw,ih)),2400/Math.max(iw,ih)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(iw*k)); c.height=Math.max(1,Math.round(ih*k));
    c.getContext('2d').drawImage(im,0,0,c.width,c.height); return await L.canvasBlob(c,'image/png'); }
  finally{ URL.revokeObjectURL(url); } }
const GEO=['x','y','rotation','scaleX','scaleY'];
const geo=n=>{ const a={x:n.x,y:n.y}; if(Math.abs(n.rotation)>=1e-3) a.rotation=n.rotation; if(Math.abs(n.scaleX-1)>=1e-4) a.scaleX=n.scaleX; if(Math.abs(n.scaleY-1)>=1e-4) a.scaleY=n.scaleY; return a; };
const SH=['shadowColor','shadowOffsetX','shadowOffsetY','shadowBlur','shadowEnabled'];
const r2=v=>Math.round(v*100)/100;
const shiftLocal=(a,dx,dy)=>{ const t=(a.rotation||0)*Math.PI/180; a.x=r2(a.x+dx*Math.cos(t)-dy*Math.sin(t)); a.y=r2(a.y+dx*Math.sin(t)+dy*Math.cos(t)); };

async function build(D){
  const {desc,data}=D, W=desc.w, H=desc.h, tfs=L.brandTextFills(), B=L.brand(), disp=(B.fonts&&B.fonts.display)||'', bodyF=(B.fonts&&B.fonts.body)||'system-ui', ink=BD.brandColors().ink;
  const warn={missing:desc.missing||0,fonts:desc.fonts};
  /* 1. pictures first: every picture is loaded before any layer is rebuilt */
  const pics=new Map(), want=new Map(); (function g(a){ a.forEach(n=>{ if(n.t==='img'&&n.ok!==false){ const p=want.get(n.src)||{w:0,h:0}; p.w=Math.max(p.w,n.w*Math.hypot(n.scaleX||1,0)); p.h=Math.max(p.h,n.h); want.set(n.src,p); } if(n.nodes) g(n.nodes); }); })(desc.nodes);
  let k=0;
  for(const [src,sz] of want){ let blob=data.get(src); if(!blob){ warn.missing++; pics.set(src,null); continue; }
    const type=blob.type||(/^data:([^;,]+)/.exec(src)||[])[1]||MIME[extOf(src).toLowerCase()]||'';
    try{ if(/svg/.test(type)||/\.svg(\?|$)/i.test(src)){ blob=await rasterSvg(blob,sz.w,sz.h); }
      const f=new File([blob],'import-'+(++k)+(blob.type==='image/jpeg'?'.jpg':'.png'),{type:blob.type||'image/png'});
      const id=await BD.addPhotoFile(f), im=BD.IMGS.get(id); pics.set(src,{id,w:im.w,h:im.h,photo:blob.type==='image/jpeg'}); }
    catch(_){ warn.missing++; pics.set(src,null); } }
  /* 2. fonts the board uses (More fonts load from Google; the kit's own are there) */
  const fams=new Set(); (function g(a){ a.forEach(n=>{ if(n.t==='text') fams.add(n.fam+'|'+n.wt); if(n.nodes) g(n.nodes); }); })(desc.nodes);
  await Promise.all([...fams].map(s=>{ const [f,w]=s.split('|'); return BD.ensureFont(f,+w===400?'':w).catch(()=>{}); }));
  /* 3. text on white: the crayon picture laid on white, stored as a draft picture */
  const solids=new Map(); async function solidFill(tid){ if(solids.has(tid)) return solids.get(tid); const fill=tfs.find(f=>f.id===tid), v=fill&&await BD.getImg('brand:'+fill.asset); let id=null;
    if(v&&v.el){ const c=document.createElement('canvas'); c.width=v.w; c.height=v.h; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(v.el,0,0); const b=await L.canvasBlob(c,'image/png'); c.width=c.height=0; id=await BD.addPhotoFile(new File([b],'on-white.png',{type:'image/png'})); }
    solids.set(tid,id); return id; }
  const label=[]; let counts={pics:0,shapes:0,text:0,clips:0};
  const bleedOf=a=>{ const w0=(a.width||0)*(a.scaleX||1), h0=(a.height||0)*(a.scaleY||1), t=(a.rotation||0)*Math.PI/180, c=Math.abs(Math.cos(t)), s=Math.abs(Math.sin(t));
    const bw=w0*c+h0*s, bh=w0*s+h0*c; return (a.x<-2&&!a.rotation)||a.y<-2||a.x+bw>W+2||a.y+bh>H+2||a.x<-2; };
  async function mk(n,top){
    const op=n.opacity<0.999?{opacity:+n.opacity.toFixed(3)}:{}, out=[];
    if(n.t==='img'){ const p=pics.get(n.src); let w=n.w, h=n.h; counts.pics++;
      const a={id:uid(),name:'obj',kind:'image',imgId:p?p.id:'import-missing:'+uid(),width:r2(w),height:r2(h),...geo(n),cropZ:1,focX:n.focX,focY:n.focY,label:n.alt||'Picture',...op};
      if(p){ const asp=p.w/p.h, box=w/h, off=Math.abs(asp/box-1)>0.02;
        if(!p.photo&&(!off||n.fit==='fill'||n.fit==='none'&&!off)) a.kind='asset';   // art: exact size, no crop
        else if(!p.photo&&n.fit==='contain'){ a.kind='asset'; const k2=Math.min(w/p.w,h/p.h), nw=p.w*k2, nh=p.h*k2; shiftLocal(a,(w-nw)*n.focX,(h-nh)*n.focY); a.width=r2(nw); a.height=r2(nh); }
        else if(!p.photo&&!off) a.kind='asset'; }
      if(n.cornerRadius) a.cornerRadius=r2(n.cornerRadius); SH.forEach(k2=>{ if(k2 in n) a[k2]=n[k2]; }); if(top&&bleedOf(a)) a.bleed=true; out.push({c:'Image',a}); }
    else if(n.t==='rect'){ const a={id:uid(),name:'obj',kind:'rect',width:r2(n.w),height:r2(n.h),...geo(n),label:'fillLinearGradientColorStops' in n?'Shade':'Shape',...op}; counts.shapes++;
      ['fill','cornerRadius','stroke','strokeWidth','fillLinearGradientStartPoint','fillLinearGradientEndPoint','fillLinearGradientColorStops','fillPriority',...SH].forEach(k2=>{ if(n[k2]!==undefined&&n[k2]!==null&&n[k2]!==0&&n[k2]!=='') a[k2]=n[k2]; });
      if(!a.fill&&!a.fillLinearGradientColorStops) a.fill=''; if(top&&bleedOf(a)) a.bleed=true; out.push({c:'Rect',a}); }
    else if(n.t==='text'){ counts.text++; const t=n, rot=Math.abs(t.rotation||0)>1e-3, th=(t.rotation||0)*Math.PI/180;
      const sl=Math.round(t.w*0.18+40), dx=-(t.align==='right'?sl:t.align==='center'?sl/2:0); let w=t.w+sl, x=t.x+dx*Math.cos(th), y=t.y+dx*Math.sin(th);   // slack: a single line never re-wraps
      if(t.lh<=1.05){ const nd=Math.round(t.fs*0.12); y+=nd*Math.cos(th); x-=nd*Math.sin(th); }   // tight line height: numbers back into their circles
      if(top&&!rot){ if(t.align==='center'){ const cx=x+w/2, half=Math.min(w/2,cx,W-cx); x=cx-half; w=2*half; } else { const l0=Math.max(0,x), rr=Math.min(W,x+w); x=l0; w=rr-l0; } }
      const single=L.brandFonts().find(f=>f.family===t.fam), style=single&&single.wt===''?'normal':(+t.wt===400?'normal':String(t.wt));
      const fill=tfs.find(f=>f.id===t.tex);
      const a={id:uid(),name:'obj',kind:'text',text:isoLatin(t.text),autoW:false,width:Math.max(10,Math.round(w)),x:r2(x),y:r2(y),fontFamily:t.fam,fontSize:r2(t.fs),fontStyle:t.it?(style==='normal'?'italic':'italic '+style):style,
        fill:t.col||(fill&&fill.color)||ink,align:t.align,lineHeight:Math.round(t.lh*1000)/1000,padding:0,label:t.fam===disp?'Headline':'Text',...op};
      if(t.ls) a.letterSpacing=t.ls; if(rot) a.rotation=+t.rotation.toFixed(3);
      if(fill){ a.fillTex='brand:'+fill.asset; a.fillPriority='pattern'; if(t.solid){ const sid=await solidFill(fill.id); if(sid) a.fillTex=sid; } }
      if(top&&rot&&bleedOf({x:t.x,y:t.y,width:t.w,height:t.fs*t.lh,rotation:t.rotation})) a.bleed=true;   /* measured on the words' own box, not the slack */ out.push({c:'Text',a}); }
    else if(n.t==='flat'){ counts.clips++; const kids=[]; for(const c of n.nodes) kids.push(...await mk(c,false));
      const g=BD.rebuild({c:'Group',a:{id:uid(),x:0,y:0},k:kids}), r=Math.min(n.cornerRadius||0,n.w/2,n.h/2);
      g.clipFunc(ctx=>{ ctx.beginPath(); if(r&&ctx.roundRect) ctx.roundRect(0,0,n.w,n.h,r); else ctx.rect(0,0,n.w,n.h); });
      const cont=document.createElement('div'), stg=new Konva.Stage({container:cont,width:Math.ceil(n.w),height:Math.ceil(n.h)}), ly=new Konva.Layer(); stg.add(ly); ly.add(g);
      g.find('Image').forEach(i=>BD.applyFx(i)); await Promise.all(g.find('Text').map(t=>t._texP).filter(Boolean)); await new Promise(r3=>setTimeout(r3,0));
      const pr=Math.min(2,3000/Math.max(n.w,n.h)); ly.draw(); const cv=stg.toCanvas({pixelRatio:pr}); const blob=await L.canvasBlob(cv,'image/png'); stg.destroy(); cv.width=cv.height=0;
      const id=await BD.addPhotoFile(new File([blob],'clip.png',{type:'image/png'}));
      const a={id:uid(),name:'obj',kind:'asset',imgId:id,width:r2(n.w),height:r2(n.h),...geo(n),cropZ:1,focX:.5,focY:.5,label:'Picture',...op}; SH.forEach(k2=>{ if(k2 in n) a[k2]=n[k2]; }); if(top&&bleedOf(a)) a.bleed=true; out.push({c:'Image',a}); }
    return out; }
  const kids=[{c:'Rect',a:{name:'frame-bg',width:W,height:H,fill:desc.bg}}];
  for(const n of desc.nodes) kids.push(...await mk(n,true));
  const name=desc.title||'Imported board';
  return {doc:{v:1,name,nodes:[{c:'Group',a:{id:uid(),x:0,y:0,kind:'frame',label:name,fw:W,fh:H,clipX:0,clipY:0,clipWidth:W,clipHeight:H},k:kids}]},counts,warn}; }

/* ---------- the whole thing, into Create ---------- */
async function run(file,X){   // X = the hooks create.js hands over (CRX)
  X.busy('Reading the board…'); let r;
  try{ const D=await describe(file); X.busy('Building the layers…'); r=await build(D); }
  catch(err){ X.busy(null); console.warn('board import:',err);
    X.toast(err&&err.empty?'That board came out empty. Export it as a .dc.html or a static HTML (a board that needs scripts to draw itself can not be read).':'Could not read that board. Pick a .dc.html, an HTML file, or a .zip with its pictures.',6000); return false; }
  try{ const mode=await X.mode(); if(!mode){ X.busy(null); return false; }
    X.busy('Opening it in Create…'); if(mode==='replace') X.clearAll(); const made=await X.addDocNodes(r.doc); X.afterBuild(made);
    if(r.doc.name){ const ni=document.getElementById('crName'); if(ni&&!ni.value){ ni.value=r.doc.name; ni.dispatchEvent(new Event('input',{bubbles:true})); } }
  } finally { X.busy(null); }
  const c=r.counts, bits=[c.pics&&c.pics+' picture'+(c.pics>1?'s':''),c.shapes&&c.shapes+' shape'+(c.shapes>1?'s':''),c.text&&c.text+' text'+(c.text>1?'s':''),c.clips&&c.clips+' clipped group'+(c.clips>1?'s':'')].filter(Boolean);
  const notes=[]; if(r.warn.fonts.unknown.length) notes.push((r.warn.fonts.unknown.length>1?'Fonts ':'Font ')+r.warn.fonts.unknown.join(', ')+(r.warn.fonts.unknown.length>1?' are':' is')+' not in Studio, so the body font is used.');
  if(r.warn.missing) notes.push(r.warn.missing+' picture'+(r.warn.missing>1?'s were':' was')+' not in the file: empty photo spots instead.');
  X.toast('Imported: '+(bits.join(', ')||'an empty board')+'.'+(notes.length?' '+notes.join(' '):''),notes.length?8000:4500); window.__importLast={counts:c,warn:r.warn}; return true; }

window.CRImport={run,describe,build,readInput,unzip,walk,isoLatin,version:1};
})();

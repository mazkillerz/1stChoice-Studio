() => {
const root=[...document.body.children].find(e=>e.tagName==='DIV');
const all=[...root.querySelectorAll('*')];
const CS=e=>getComputedStyle(e);
/* 1. the full transform of each element, from the board's top-left (computed before any measuring) */
const mat=new Map(); mat.set(root,new DOMMatrix());
const local=e=>{ const cs=CS(e); let m=new DOMMatrix().translate(e.offsetLeft,e.offsetTop);
  if(cs.transform&&cs.transform!=='none'){ const [ox,oy]=cs.transformOrigin.split(' ').map(parseFloat); m=m.translate(ox,oy).multiply(new DOMMatrix(cs.transform)).translate(-ox,-oy); } return m; };
const full=e=>{ if(mat.has(e)) return mat.get(e); const par=e.offsetParent&&root.contains(e.offsetParent)?e.offsetParent:root; const m=full(par).multiply(local(e)); mat.set(e,m); return m; };
all.forEach(e=>{ if(CS(e).display!=='inline') full(e); });
const dec=(m,lx,ly)=>{ const p=m.transformPoint(new DOMPoint(lx||0,ly||0)); const sx=Math.hypot(m.a,m.b), det=m.a*m.d-m.b*m.c, sy=det/sx;
  return {x:+p.x.toFixed(2),y:+p.y.toFixed(2),rotation:+(Math.atan2(m.b,m.a)*180/Math.PI).toFixed(3),scaleX:+sx.toFixed(4),scaleY:+sy.toFixed(4)}; };
const rgba=s=>{ const m=(s||'').match(/[\d.]+/g); if(!m) return null; const [r,g,b,a]=m.map(Number); if(a===0) return null; return a!=null&&a<1?`rgba(${r},${g},${b},${a})`:'#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('').toUpperCase(); };
const ownText=el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
const famOf=cs=>/Lalezar/.test(cs.fontFamily)?'Lalezar':/Modak/.test(cs.fontFamily)?'Modak':'Cairo';
const texOf=el=>el.closest('.cr')?'red':el.closest('.cg')?'green':null;
/* 2. clipped groups become one picture */
const flatten=[]; let fk=0;
const clips=e=>{ const cs=CS(e); return cs.overflow==='hidden'&&e!==root&&e.children.length>0&&e.tagName!=='IMG'; };
/* 3. measure text with every transform switched off (local boxes), then switch them back */
const saved=all.map(e=>[e,e.style.transform]); all.forEach(e=>e.style.setProperty('transform','none','important'));
const textInfo=new Map();
const blocks=all.filter(e=>ownText(e)&&CS(e).display!=='inline');
all.filter(e=>ownText(e)&&CS(e).display==='inline').forEach(sp=>{ let b=sp; while(b&&CS(b).display==='inline') b=b.parentElement; if(b&&!blocks.includes(b)) blocks.push(b); });
for(const b of blocks){ const br=b.getBoundingClientRect(), cs=CS(b);
  const segs=[]; const tw=document.createTreeWalker(b,NodeFilter.SHOW_TEXT); let n; while(n=tw.nextNode()){ if(n.textContent.trim()&&n.parentElement.closest('[style]')&&!(n.parentElement!==b&&!b.contains(n.parentElement))) segs.push(n); }
  // text that belongs to an inner block is that block's job
  const mine=segs.filter(t=>{ let e=t.parentElement; while(e!==b){ if(CS(e).display!=='inline') return false; e=e.parentElement; } return true; });
  const st=mine.map(t=>{ const e=t.parentElement, c=CS(e); return {col:rgba(c.color),tex:texOf(e),fam:famOf(c),wt:c.fontWeight,fs:parseFloat(c.fontSize)}; });
  if(!mine.length) continue;
  const key=s=>[s.col,s.tex,s.fam,s.wt,s.fs].join('|'), same=st.every(s=>key(s)===key(st[0]));
  let align=cs.textAlign; if(cs.display.includes('flex')) align=cs.justifyContent==='flex-start'?'left':cs.justifyContent==='flex-end'?'right':'center';
  if(align==='start') align=cs.direction==='rtl'?'right':'left'; if(align==='end') align=cs.direction==='rtl'?'left':'right';
  const items=[];
  if(same){ const s=st[0]; const rg=document.createRange(); rg.selectNodeContents(b); const tr=rg.getBoundingClientRect(); const txt=b.innerText.trim();
    const lines=txt.split('\n').length, lh=cs.lineHeight==='normal'?+(tr.height/lines/s.fs).toFixed(3):parseFloat(cs.lineHeight)/s.fs;
    items.push({text:txt,dx:0,dy:tr.top-br.top,w:br.width,fam:s.fam,wt:s.wt,fs:s.fs,col:s.col,tex:s.tex,align,lh});
  } else {
    mine.forEach((t,i)=>{ const s=st[i]; if(!s.col&&!s.tex) return; const txt=t.textContent; let cur=null; const runs=[];
      for(let k=0;k<txt.length;k++){ const rg=document.createRange(); rg.setStart(t,k); rg.setEnd(t,k+1); const rr=rg.getClientRects()[0]; if(!rr) continue;
        if(!cur||Math.abs(rr.top-cur.top)>s.fs*0.4){ cur={top:rr.top,bottom:rr.bottom,l:rr.left,r:rr.right,s:''}; runs.push(cur); }
        cur.s+=txt[k]; cur.l=Math.min(cur.l,rr.left); cur.r=Math.max(cur.r,rr.right); cur.top=Math.min(cur.top,rr.top); cur.bottom=Math.max(cur.bottom,rr.bottom); }
      runs.forEach(u=>{ const str=u.s.trim(); if(!str) return; items.push({text:str,dx:u.l-br.left-4,dy:u.top-br.top,w:u.r-u.l+8,fam:s.fam,wt:s.wt,fs:s.fs,col:s.col,tex:s.tex,align:'center',lh:+((u.bottom-u.top)/s.fs).toFixed(3)}); }); }); }
  textInfo.set(b,items); }
saved.forEach(([e,v])=>{ if(v) e.style.transform=v; else e.style.removeProperty('transform'); });
/* 4. walk in painting order */
const nodes=[];
const gradient=(bg,w,h)=>{ const m=bg.match(/linear-gradient\((.*)\)$/); if(!m) return null; let parts=m[1].split(/,(?![^(]*\))/).map(s=>s.trim()); let dir='to bottom'; if(/^to |deg$/.test(parts[0])) dir=parts.shift();
  const stops=[]; parts.forEach((p,i)=>{ const c=p.match(/rgba?\([^)]*\)|#[0-9a-f]+/i)[0]; const pc=p.match(/([\d.]+)%\s*$/); stops.push(pc?+pc[1]/100:i/(parts.length-1),rgba(c)||'rgba(0,0,0,0)'); });
  const pts={ 'to bottom':[[0,0],[0,h]],'to top':[[0,h],[0,0]],'to right':[[0,0],[w,0]],'to left':[[w,0],[0,0]] }[dir]||[[0,0],[0,h]];
  return {fillLinearGradientStartPoint:{x:pts[0][0],y:pts[0][1]},fillLinearGradientEndPoint:{x:pts[1][0],y:pts[1][1]},fillLinearGradientColorStops:stops,fillPriority:'linear-gradient'}; };
const shadow=s=>{ if(!s||s==='none') return {}; const c=s.match(/rgba?\([^)]*\)|#[0-9a-f]+/i); const nums=s.replace(/rgba?\([^)]*\)/,'').match(/-?[\d.]+px/g)||[]; const [ox,oy,bl]=nums.map(parseFloat);
  return {shadowColor:c?c[0].replace(/\s/g,''):'rgba(0,0,0,.2)',shadowOffsetX:ox||0,shadowOffsetY:oy||0,shadowBlur:(bl||0)/2,shadowEnabled:true}; };
const radius=(cs,w,h)=>{ const r=cs.borderTopLeftRadius; if(!r||r==='0px') return 0; if(r.endsWith('%')) return Math.min(w,h)*parseFloat(r)/100; return parseFloat(r); };
const visit=e=>{ const cs=CS(e); if(cs.display==='none'||cs.visibility==='hidden') return; const m=full(e), w=e.offsetWidth, h=e.offsetHeight, op=parseFloat(cs.opacity);
  if(e!==root&&clips(e)){ const k='f'+(fk++); e.setAttribute('data-flat',k); flatten.push({key:k,...dec(m),w,h,opacity:op}); nodes.push({t:'flat',key:k,...dec(m),w,h,opacity:op}); return; }
  if(e.tagName==='IMG'){ const bw=parseFloat(cs.borderTopWidth)||0, rad=radius(cs,w,h);
    if(bw){ nodes.push({t:'rect',...dec(m),w,h,fill:rgba(cs.borderTopColor),cornerRadius:rad,opacity:op,...shadow(cs.boxShadow)}); }
    const pos=(cs.objectPosition||'50% 50%').split(' ').map(v=>v.endsWith('%')?parseFloat(v)/100:.5);
    nodes.push({t:'img',src:decodeURIComponent(e.src.replace('file://','')),alt:e.alt,...dec(m,bw,bw),w:w-2*bw,h:h-2*bw,fit:cs.objectFit,focX:pos[0],focY:pos[1],cornerRadius:Math.max(0,rad-bw),opacity:op,...(bw?{}:shadow(cs.boxShadow))}); return; }
  if(e!==root){ const bg=rgba(cs.backgroundColor), gr=cs.backgroundImage&&cs.backgroundImage.startsWith('linear-gradient')?gradient(cs.backgroundImage,w,h):null, bw=parseFloat(cs.borderTopWidth)||0;
    const isTexText=e.classList.contains('cr')||e.classList.contains('cg');
    if(!isTexText&&(bg||gr||bw)){ nodes.push({t:'rect',...dec(m),w,h,fill:bg||undefined,...(gr||{}),stroke:bw?rgba(cs.borderTopColor):undefined,strokeWidth:bw||undefined,cornerRadius:radius(cs,w,h),opacity:op,...shadow(cs.boxShadow)}); } }
  if(textInfo.has(e)) textInfo.get(e).forEach(it=>nodes.push({t:'text',...it,...dec(m,it.dx,it.dy),opacity:op,boxW:w}));
  [...e.children].forEach(c=>{ if(CS(c).display==='inline'&&!c.children.length) return; visit(c); }); };
visit(root);
/* a white copy right under a crayon copy of the same words = one "crayon on white" word */
const out=[]; nodes.forEach((n,i)=>{ if(n.t==='text'&&n.col==='#FFFFFF'&&!n.tex){ const tw=nodes.find((o,j)=>j>i&&o.t==='text'&&o.tex&&o.text===n.text&&Math.abs(o.x-n.x)<3&&Math.abs(o.y-n.y)<3); if(tw){ tw.solid=true; return; } } out.push(n); });
const rr=root.getBoundingClientRect();
return {w:rr.width,h:rr.height,bg:rgba(CS(root).backgroundColor)||'#FFFFFF',nodes:out,flatten};
}

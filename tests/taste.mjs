/* Taste suite: the owner's recurring complaints (studio-notes/taste.md, "Recurring issues") as automatic checks, so they are caught before he sees them.
   It reports; it never fixes. A FAIL here is a real finding, not a flaky test: fix the app (or, if the TEST is wrong, the wait/selector), never the threshold.
   Screens: Home, + menu, All tools, Settings, welcome tour, search (Arabic), Templates, Saved (+ chips, design sheet, collection menu), What's New,
   and Restock / Photo story / Collage with every bottom-bar sheet and the layer bar. Saved designs are seeded with approved Arabic names (tests/seed.js).
   Checks (numbers = the rows of the table in taste.md):
    #4  alignment      menu/sheet headings start where the row icons start; icons in one list share an x; page title / first chip / first card share an edge;
                       sheet head text starts where the first control starts; sibling icons (bottom bars, + menu) have equal sizes; the three photo tools have different icons
    #6  contrast       every visible text >= 4.5:1 (3:1 large) in light AND dark, selected states included, and a selected control differs from its unselected sibling
    #3  pop-ups        toast <= 2 lines, <= 15% of the preview, gone in 4.5 s; "Your photo is in" <= 15% and gone in 4 s; dialogs inside the viewport (390 and 1280), no page scroll jump
    #1  tap budget     Restock / Photo story from a photo to a saved 2160x3840 PNG in <= 2 taps; Restock "Cans" with no photo in 1 tap
    #2  clutter        first view of Home and each tool: <= 2 accent-filled controls (not the + button), no two controls with the same name;
                       every state (open sheets too): <= 2 accent-filled buttons (chosen chips aside) (1.15.0)
    #10 links          no button or link is underlined (1.15.0)
    #5  RTL            Arabic text runs right to left; text fields have dir=auto/rtl
    #8  small phones   at 360x740: no sideways scroll, no clipped text, the last item scrolls clear of the fixed bottom bar
    #7  tap targets    every visible control is >= 44x44 (or has a ::after hit area that reaches it)
        page errors    none.
   Needs the server on :8080 (npx http-server -p 8080 -c-1 .) or BASE=...  Exit code 1 on any FAIL. About 2 to 3 minutes (jobs run in parallel). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';   // local pages skip the sandbox proxy (Google Fonts still use it)
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SEED=seedDesigns();
/* approved Arabic phrases only (they are in brands/1stchoice/brand.js): Arabic-first, English-first and pure-Arabic names, one Arabic collection */
const NAMES=['رجع متوفر – Classic','خذلك كولد برو · Passion fruit','وفرنا كمية جديدة','Photo story – ترا فنان'];
Object.values(SEED.designs).slice(0,4).forEach((d,i)=>{ d.name=NAMES[i]; });
SEED.cols['icy']={id:'icy',name:'يسرسح ثلج',brand:'1stchoice'}; Object.values(SEED.designs)[1].cols.push('icy'); Object.values(SEED.designs)[4].cols.push('icy');
const TOOLS=['restock','photo-story','collage'];
const MORE=['carousel','highlight'];   // 1.4.0: Carousel and Highlight covers get the same sweep as the photo tools; Create (CREATE) is read-only: first view only
const CREATE='create';

/* ---------- results ---------- */
const res=[], skips=[]; const t0=Date.now();
const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const skip=(n,why)=>{ res.push('SKIP '+n+' ('+why+')'); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const R={};   // key -> {bad:[], cnt, n, min, max, ...}
const A=k=>R[k]||(R[k]={bad:[],cnt:0,n:0,min:Infinity,max:-Infinity,x:{}});
const bad=(k,screen,list)=>{ const a=A(k); (Array.isArray(list)?list:[list]).forEach(m=>a.bad.push(screen+' → '+m)); };
const num=(k,v)=>{ const a=A(k); a.n++; if(v<a.min) a.min=v; if(v>a.max) a.max=v; };
const short=(l,n=7)=>{ const u=[...new Set(l)].sort(); return u.slice(0,n).join(' | ')+(u.length>n?` | … +${u.length-n} more`:''); };
const miss=[], errs=[], r1=x=>Math.round(x*10)/10;

/* ---------- the in-page toolkit (installed on every page of every context) ---------- */
const LIB=()=>{
  const T=window.__taste={};
  const lin=c=>{ c/=255; return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4); };
  let cv=null, cx=null; const cache=new Map();
  /* any CSS colour -> {r,g,b,a}; rgb()/rgba() fast; color(srgb ...) / color-mix / oklab results go through a canvas, which normalises them */
  const parse=s=>{ if(!s||s==='transparent') return s==='transparent'?{r:0,g:0,b:0,a:0}:null; if(cache.has(s)) return cache.get(s); let out=null;
    const m=s.match(/^rgba?\(([^)]+)\)$/);
    if(m){ const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(v=>v.endsWith('%')?parseFloat(v)/100:Number(v)); out={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
    else { try{ if(!cx){ cv=document.createElement('canvas'); cv.width=cv.height=1; cx=cv.getContext('2d'); } cx.fillStyle='#010203'; cx.fillStyle=s; const n=cx.fillStyle;
      if(n!=='#010203'||/010203/i.test(s)){ const h=n.match(/^#([0-9a-f]{6})$/i); if(h) out={r:parseInt(h[1].slice(0,2),16),g:parseInt(h[1].slice(2,4),16),b:parseInt(h[1].slice(4,6),16),a:1};
        else { const q=n.match(/rgba?\(([^)]+)\)/); if(q){ const p=q[1].split(/[ ,\/]+/).filter(Boolean).map(Number); out={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; } } } }catch(e){} }
    cache.set(s,out); return out; };
  const over=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
  const L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
  const ratio=(a,b)=>{ const x=L(a),y=L(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
  const q1=(s,root)=>{ const r=(root||document).querySelector(s); return r; };
  T.parse=parse;
  /* visible: has a box, overlaps the viewport, and no ancestor is hidden / nearly transparent */
  T.vis=e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) return false;
    for(let x=e;x;x=x.parentElement){ const cs=getComputedStyle(x); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.5) return false; } return true; };
  /* displayed anywhere on the page (scrolled out of view is fine) */
  T.shown=e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height) return false; for(let x=e;x;x=x.parentElement){ const cs=getComputedStyle(x); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.5) return false; } return true; };
  /* the element is the top-most thing at its centre (so a closed sheet, or the page behind a dialog, does not count). Centre outside the viewport: accepted. */
  T.hit=e=>{ const r=e.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2; if(x<0||y<0||x>=innerWidth||y>=innerHeight) return true; const t=document.elementFromPoint(x,y); return !!t&&(e===t||e.contains(t)||t.contains(e)); };
  /* the colour actually behind an element: its ancestors' backgrounds, plus an absolutely positioned highlight layer that sits under it (the nav pill). null = an image is behind: unknown */
  T.behind=el=>{ const stack=[], er=el.getBoundingClientRect(), ex=er.left+er.width/2, ey=er.top+er.height/2;
    for(let e=el;e;e=e.parentElement){ const cs=getComputedStyle(e); if(cs.backgroundImage&&cs.backgroundImage!=='none'&&!/gradient/.test(cs.backgroundImage)) return null;
      const c=parse(cs.backgroundColor); if(c&&c.a>0){ stack.push(c); if(c.a>=1) break; }
      const p=e.parentElement; if(p){ const under=[]; for(const s of p.children){ if(s===e) break; const sc=getComputedStyle(s); if(sc.position==='absolute'||sc.position==='fixed'){ const sr=s.getBoundingClientRect(); if(ex>=sr.left&&ex<=sr.right&&ey>=sr.top&&ey<=sr.bottom){ const b=parse(sc.backgroundColor); if(b&&b.a>0) under.push(b); } } }
        under.reverse().forEach(b=>stack.push(b)); if(stack.some(b=>b.a>=1)) break; } }
    let col=null; for(let x=document.documentElement;x&&!col;x=null){ const b=parse(getComputedStyle(document.body).backgroundColor); if(b&&b.a>=1) col=b; else { const h=parse(getComputedStyle(document.documentElement).backgroundColor); if(h&&h.a>=1) col=h; } }
    if(!col) col=matchMedia('(prefers-color-scheme: dark)').matches?{r:18,g:17,b:16,a:1}:{r:255,g:255,b:255,a:1};
    for(let i=stack.length-1;i>=0;i--) col=over(stack[i],col); return col; };
  const SKIP=new Set(['SCRIPT','STYLE','SVG','PATH','CANVAS','OPTION','NOSCRIPT','TEMPLATE','TITLE','HEAD','META','LINK']);
  const FIELD_SKIP=['file','range','checkbox','radio','color','hidden','submit','button','image','reset'];
  const isField=el=>/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)&&!FIELD_SKIP.includes(el.type);
  const ownText=el=>[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
  T.root=()=>document.querySelector('dialog[open]')||document.body;
  const all=root=>{ const r=root||T.root(); return r===document.body?[...document.body.querySelectorAll('*')]:[r,...r.querySelectorAll('*')]; };
  T.texts=(root,vis)=>{ const out=[]; for(const el of all(root)){ if(SKIP.has(el.tagName.toUpperCase())||el.closest('svg')) continue; const field=isField(el);
      const text=field?(el.tagName==='SELECT'?(el.selectedOptions[0]||{}).textContent||'':(el.value||el.placeholder||'')):ownText(el);
      if(!text||el.closest('.sr-only')||!(vis||T.vis)(el)) continue; out.push({el,text,field}); } return out; };
  const desc=el=>el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.classList.length?'.'+[...el.classList].slice(0,2).join('.'):'');
  T.desc=desc;
  const colourOf=(el,field)=>{ const cs=getComputedStyle(el); let col=cs.color; if(field&&!el.value&&el.placeholder) col=getComputedStyle(el,'::placeholder').color; return col; };
  const ratioOf=(el,field)=>{ let fg=parse(colourOf(el,field)); if(!fg) return null; let op=1; for(let x=el;x;x=x.parentElement) op*=+getComputedStyle(x).opacity; fg={...fg,a:fg.a*op};
    const bg=T.behind(el); if(!bg) return null; return ratio(over(fg,bg),bg); };
  const needOf=el=>{ const cs=getComputedStyle(el), size=parseFloat(cs.fontSize), w=+cs.fontWeight; return (size>=24||(size>=18.66&&w>=600))?3:4.5; };
  const isDis=el=>el.disabled||el.closest('[disabled],[aria-disabled="true"]');
  /* 3. contrast of every visible text */
  T.contrast=()=>{ const low=[]; let n=0, min=99; const seen=new Set();
    for(const {el,text,field} of T.texts()){ if(isDis(el)) continue; const r=ratioOf(el,field); if(r==null) continue; n++; const need=needOf(el); if(r<min) min=r;
      if(r<need){ const k=desc(el)+'|'+text.slice(0,20); if(!seen.has(k)){ seen.add(k); low.push(`${r.toFixed(2)}<${need} ${desc(el)} "${text.slice(0,28)}"`); } } }
    return {n,min,low}; };
  /* 3. selected states: aria-pressed="true" / aria-current="true" */
  T.selected=()=>{ const low=[], same=[], names=[]; let n=0, min=99, looks=0;
    document.querySelectorAll('[aria-pressed="true"],[aria-current="true"]').forEach(el=>{ if(!T.vis(el)||el.closest('.sr-only')||isDis(el)) return;
      n++; names.push(desc(el)); if(el.matches('.look')) looks++;
      const parts=[el,...el.querySelectorAll('*')].filter(x=>!SKIP.has(x.tagName.toUpperCase())&&!x.closest('svg')&&ownText(x)&&T.vis(x)); let worst=99, need=4.5, who='';
      if(parts.length){ for(const x of parts){ const r=ratioOf(x,false); if(r==null) continue; const nd=needOf(x); if(r-nd<worst-need){ worst=r; need=nd; who=desc(x)+' "'+ownText(x).slice(0,18)+'"'; } } }
      else { const fg=parse(getComputedStyle(el).color), bg=T.behind(el); if(fg&&bg){ worst=ratio(over(fg,bg),bg); need=3; who=desc(el)+' (icon)'; } }
      if(worst<99){ if(worst<min) min=worst; if(worst<need) low.push(`${worst.toFixed(2)}<${need} selected ${who}`); }
      /* it must look different from an unselected sibling of the same kind: background or text colour */
      const cont=el.closest('[role=group],[role=tablist],nav,ul,.chips,.row,.looks,.seg-grid,.tp-chips,.vswitch')||el.parentElement; const cls=el.classList[0];
      const sib=cont&&[...cont.querySelectorAll(el.tagName.toLowerCase()+(cls?'.'+CSS.escape(cls):''))].find(s=>s!==el&&(s.getAttribute('aria-pressed')==='false'||s.getAttribute('aria-current')==='false')&&T.shown(s));
      if(sib){ const sig=x=>{ const cs=getComputedStyle(x), t=[x,...x.querySelectorAll('*')].find(y=>ownText(y)&&!y.closest('svg'))||x; const pe=w=>{ const p=getComputedStyle(x,w); return p.content==='none'?'':p.backgroundColor+' '+p.width; }, kid=x.firstElementChild?getComputedStyle(x.firstElementChild):null;
          return [cs.backgroundColor,cs.color,getComputedStyle(t).color,cs.borderTopColor+' '+cs.borderTopWidth,cs.boxShadow,cs.outlineStyle+' '+cs.outlineColor,Math.round(x.getBoundingClientRect().width),pe('::before'),pe('::after'),kid?kid.backgroundColor+' '+kid.width:'']; };   // a dot that grows, or a ring, counts as a difference
        const a=sig(el), b=sig(sib); if(a.every((v,i)=>v===b[i])) same.push(`${desc(el)} "${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,16)}" looks like its unselected sibling (bg ${a[0]}, text ${a[1]})`); }
    });
    return {n,min,low,same,names,looks}; };
  /* 5. RTL */
  const TXT_IN=['text','search','email','number','tel','url','password',''];
  T.rtl=()=>{ const badRun=[], badIn=[]; let n=0, nin=0;
    for(const {el,text,field} of T.texts()){ if(field) continue; const first=(text.match(/[A-Za-z֐-ࣿ]/)||[''])[0]; if(!/[֐-ࣿ]/.test(first)) continue; n++;
      const cs=getComputedStyle(el); let isR=cs.direction==='rtl'; try{ isR=isR||el.matches(':dir(rtl)'); }catch(e){}
      if(!isR&&cs.unicodeBidi!=='plaintext') badRun.push(`${desc(el)} "${text.slice(0,24)}" runs ${cs.direction}`); }
    for(const el of all()){ if(!(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&TXT_IN.includes((el.getAttribute('type')||'').toLowerCase())))||el.closest('.sr-only')||!T.vis(el)) continue; nin++;
      const d=(el.getAttribute('dir')||'').toLowerCase(); if(d!=='auto'&&d!=='rtl'&&d!=='ltr') badIn.push(`${desc(el)} has dir="${d}"`); }
    return {n,nin,bad:[...badRun,...badIn]}; };
  /* 7. tap targets (tests/tapscan.mjs logic, plus hit-testing so closed sheets and the page behind a dialog do not count) */
  T.taps=()=>{ const out=[], px=v=>parseFloat(v)||0; let n=0;
    for(const el of all(document.body)){ if(!el.matches('button,a,input,select,textarea,[role=button],[role=menuitem],[role=tab],label.check,label:has(input[type=file])')) continue;
      if(el.classList.contains('sr-only')||el.closest('.sr-only')) continue; if(el.tagName==='INPUT'&&['hidden','file'].includes(el.type)) continue;
      if(el.tagName==='INPUT'&&['checkbox','radio'].includes(el.type)&&el.closest('label')) continue;   // the label is the target
      if(!T.vis(el)||!T.hit(el)) continue; const r=el.getBoundingClientRect(); let w=r.width, h=r.height;
      const a=getComputedStyle(el,'::after'); if(a.content!=='none'&&a.position==='absolute'){ w=Math.max(w,r.width-px(a.left)-px(a.right)); h=Math.max(h,r.height-px(a.top)-px(a.bottom)); }
      n++; if(h<43.5||w<43.5) out.push(`${desc(el)} ${Math.round(w)}x${Math.round(h)} "${(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,18)}"`); }
    return {n,bad:out}; };
  /* 9. icon-only controls (no visible text) need an accessible name */
  T.labels=()=>{ const out=[]; let n=0;
    for(const el of document.body.querySelectorAll('button,a[href],[role=button],[role=tab],[role=menuitem],select,input:not([type=hidden])')){ if(el.closest('.sr-only')||el.classList.contains('sr-only')||!T.vis(el)) continue;
      if(el.tagName==='INPUT'&&['file','checkbox','radio','range'].includes(el.type)&&!el.labels?.length&&!el.getAttribute('aria-label')&&el.closest('label')) continue;
      const visible=(el.innerText||'').trim(); if(visible) continue; n++; if(!T.name(el)) out.push(desc(el)); }
    return {n,bad:out}; };
  /* 2. clutter */
  T.name=el=>{ let t=el.getAttribute('aria-label'); if(!t){ const lb=el.getAttribute('aria-labelledby'); if(lb) t=lb.split(/\s+/).map(i=>(document.getElementById(i)||{}).textContent||'').join(' '); }
    if(!t&&el.labels&&el.labels.length) t=[...el.labels].map(l=>l.textContent).join(' '); if(!t) t=(el.innerText||el.textContent||'').trim();
    if(!t){ const im=el.querySelector('img[alt]'); t=im&&im.alt; } if(!t) t=el.getAttribute('title')||el.getAttribute('placeholder')||''; return t.replace(/\s+/g,' ').trim().toLowerCase(); };
  T.clutter=()=>{ const probe=document.createElement('i'); probe.style.cssText='position:fixed;left:-9px;top:0;width:1px;height:1px;background:var(--accent)'; document.body.appendChild(probe);
    const acc=getComputedStyle(probe).backgroundColor, accP=parse(acc); probe.remove();
    const ctl=[...document.body.querySelectorAll('button,a[href],[role=button],select,textarea,input:not([type=hidden]):not([type=file]),label:has(input[type=file])')].filter(e=>!e.closest('.sr-only')&&!e.classList.contains('sr-only')&&T.vis(e)&&T.hit(e));
    const accent=[], names={};
    for(const e of ctl){ if(e.id==='fab'||e.classList.contains('fab')) continue; const cs=getComputedStyle(e), b=parse(cs.backgroundColor); if(cs.backgroundColor===acc||(b&&accP&&b.a>=1&&b.r===accP.r&&b.g===accP.g&&b.b===accP.b)) accent.push(`${desc(e)} "${T.name(e).slice(0,20)}"`); }
    for(const e of ctl){ const nm=T.name(e); if(nm) (names[nm]=names[nm]||[]).push(desc(e)); }
    const dups=Object.entries(names).filter(([,v])=>v.length>1).map(([k,v])=>`"${k.slice(0,26)}" x${v.length} (${v.slice(0,2).join(', ')})`);
    /* 1.15.0: the same count in every state of a screen (an open sheet too), without chosen chips (a state, not a button) */
    const act=ctl.filter(e=>!(e.id==='fab'||e.classList.contains('fab'))&&!e.matches('.chip,.seg,[aria-pressed="true"],[aria-checked="true"]')&&(()=>{ const cs=getComputedStyle(e), b=parse(cs.backgroundColor); return cs.backgroundColor===acc||(b&&accP&&b.a>=1&&b.r===accP.r&&b.g===accP.g&&b.b===accP.b); })()).map(e=>`${desc(e)} "${T.name(e).slice(0,20)}"`);
    return {accent,act,dups,n:ctl.length}; };
  /* 1.15.0: a button or link never shows an underline (row 10: the owner turned down underlined links in 0.7.1) */
  T.underlined=()=>[...document.body.querySelectorAll('button,a[href],[role=button]')].filter(e=>T.vis(e)&&!e.closest('.sr-only')&&getComputedStyle(e).textDecorationLine.includes('underline')).map(e=>`${desc(e)} "${T.name(e).slice(0,20)}"`);
  /* 4. dialogs inside the viewport */
  T.dialogs=()=>[...document.querySelectorAll('dialog[open]')].map(d=>{ const scrolls=/(auto|scroll)/.test(getComputedStyle(d).overflowY); const parts=[d,...[...d.children].filter(c=>{ if(scrolls) return false; const r=c.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(c).display!=='none'; })]; const out=[];
    parts.forEach(p=>{ const r=p.getBoundingClientRect(); if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5) out.push(`${desc(p)} ${Math.round(r.left)},${Math.round(r.top)}→${Math.round(r.right)},${Math.round(r.bottom)} in ${innerWidth}x${innerHeight}`); });
    return {name:desc(d),bad:out}; });
  /* 1. alignment */
  const textLeft=el=>{ const r=document.createRange(); r.selectNodeContents(el); const rs=[...r.getClientRects()].filter(x=>x.width>0); return rs.length?Math.min(...rs.map(x=>x.left)):el.getBoundingClientRect().left; };
  const left=el=>el.getBoundingClientRect().left;
  T.lists=()=>{ const out=[]; document.querySelectorAll('.fab-menu,.set-list,.act-list,.lib-list,.pop-menu').forEach(c=>{ if(!T.vis(c)) return;
      const rows=[...c.children].filter(r=>!/^(H[1-6]|P)$/.test(r.tagName)&&!r.classList.contains('fab-sep')&&r.getBoundingClientRect().height>0);
      const icons=rows.map(r=>r.querySelector('.fi-ic')||r.querySelector('.tthumb')||r.querySelector(':scope > svg')||r.querySelector('svg')).filter(Boolean).map(i=>left(i));
      const heads=[...c.querySelectorAll('.fab-h,.tgroup')].filter(T.vis).map(h=>({kind:h.classList.contains('fab-h')?'fab-h':'tgroup',text:h.textContent.trim().slice(0,22),x:textLeft(h)}));
      out.push({list:desc(c),icons,heads}); }); return out; };
  T.pageAlign=kind=>{ const q=s=>[...document.querySelectorAll(s)].find(T.vis);
    const t=q(kind==='templates'?'.tp-ttl':'#savedBack'), c=q(kind==='templates'?'.tp-chip':'#colChips .chip'), k=q(kind==='templates'?'.tp-card':'.sv-card');   // Saved: Back + title share one row; the row starts at Back
    if(!t||!c||!k) return null; const ic=t.querySelector('svg'), bare=getComputedStyle(t).backgroundColor==='rgba(0, 0, 0, 0)';   // a back arrow with no background: its icon box is the edge
    return {title:kind==='templates'?textLeft(t):bare&&ic?left(ic):left(t),chip:left(c),card:left(k)}; };
  T.sheetAlign=()=>{ const s=document.querySelector('.sheet.open:not(.insp)'); if(!s) return null; const h=s.querySelector('.sheet-head h2'); if(!h) return null;
    const f=[...s.querySelectorAll('.sheet-body button,.sheet-body select,.sheet-body textarea,.sheet-body a[href],.sheet-body label.slot,.sheet-body input:not([type=file]):not([type=hidden])')].find(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&T.shown(e); });
    if(!f) return null; return {id:s.id,head:textLeft(h),first:left(f),ctl:desc(f)}; };
  T.sizes=sel=>[...document.querySelectorAll(sel)].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&T.shown(e); }).map(e=>{ const r=e.getBoundingClientRect(); return [r1(r.width),r1(r.height)]; });
  const r1=x=>Math.round(x*10)/10;
  T.toolIcons=()=>[...document.querySelectorAll('.fab-item:has([data-quick])')].map(r=>({id:r.querySelector('[data-quick]').dataset.quick,svg:r.querySelector('.fi-ic').innerHTML}));
  /* 8. small phones */
  T.clip=()=>{ const out=[];
    for(const {el,text,field} of T.texts(document.body)){ if(field||el.tagName==='BODY'||el.tagName==='HTML') continue; const cs=getComputedStyle(el);
      if(el.clientWidth<=2||cs.textOverflow==='ellipsis') continue;   // 1px = visually hidden (screen-reader title) const lc=cs.getPropertyValue('-webkit-line-clamp'); if(lc&&lc!=='none') continue;
      if(cs.overflowX==='auto'||cs.overflowX==='scroll') continue;
      const rg=document.createRange(); rg.selectNodeContents(el); const tw=Math.max(0,...[...rg.getClientRects()].map(r=>r.right))-Math.min(...[...rg.getClientRects()].map(r=>r.left)), er=el.getBoundingClientRect();
      if(el.scrollWidth>el.clientWidth+1&&(tw>er.width+1||[...rg.getClientRects()].some(r=>r.left<er.left-1||r.right>er.right+1))) out.push(`${desc(el)} "${text.slice(0,22)}" ${el.scrollWidth}>${el.clientWidth}`); }
    return {sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,bad:out}; };
  T.lastClear=()=>{ const bars=[...document.querySelectorAll('.hubbar,#bar')].filter(b=>T.shown(b)&&getComputedStyle(b).position==='fixed'); if(!bars.length) return null;
    scrollTo(0,1e7); const barTop=Math.min(...bars.map(b=>b.getBoundingClientRect().top)); let maxB=0, who='';
    const fixedUp=e=>{ for(let x=e;x&&x!==document.body;x=x.parentElement){ const p=getComputedStyle(x).position; if(p==='fixed'||p==='sticky') return true; } return false; };
    for(const el of document.body.querySelectorAll('*')){ if(el.closest('svg')&&el.tagName.toLowerCase()!=='svg') continue; if(el.children.length&&!/^(IMG|CANVAS|svg|BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) continue;
      if(el.closest('dialog,.sr-only,[hidden]')||!T.shown(el)||fixedUp(el)) continue; const r=el.getBoundingClientRect(); if(r.bottom>maxB){ maxB=r.bottom; who=desc(el); } }
    for(const c of document.querySelectorAll('.tp-card,.sv-card,.tool-item,.lyr')){ if(!T.shown(c)||fixedUp(c)) continue; const r=c.getBoundingClientRect(); if(r.bottom>maxB){ maxB=r.bottom; who=desc(c); } }
    const y=scrollY; return {barTop,maxB,who,y}; };
};
/* the pop-up monitor: records every toast / "Your photo is in" note while it is shown (lines of text, share of the preview covered, how long) */
const MON=()=>{
  const eps=window.__tm={eps:[]}; const area=r=>Math.max(0,r.width)*Math.max(0,r.height);
  setInterval(()=>{ const t=performance.now(), ph=document.getElementById('phone'), pr=ph&&ph.getBoundingClientRect();
    document.querySelectorAll('.toast,.ready-pop').forEach(el=>{ const cs=getComputedStyle(el), shown=!el.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>.05&&el.getBoundingClientRect().height>0;
      if(shown&&!el.__ep){ el.__ep={kind:el.classList.contains('toast')?'toast':'ready',id:el.id||el.className,start:t,end:t,lines:0,cover:0,text:(el.textContent||'').trim().slice(0,40),big:false}; eps.eps.push(el.__ep); }
      if(!shown&&el.__ep){ el.__ep.done=true; el.__ep=null; return; }
      if(shown&&el.__ep){ const ep=el.__ep; ep.end=t;
        if(t-ep.start>450){   // the entrance animation is over
          const r=el.getBoundingClientRect(), pad=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((s,k)=>s+(parseFloat(cs[k])||0),0), lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.3;
          ep.lines=Math.max(ep.lines,(r.height-pad)/lh); if(pr&&area(pr)){ const ix=Math.max(0,Math.min(r.right,pr.right)-Math.max(r.left,pr.left)), iy=Math.max(0,Math.min(r.bottom,pr.bottom)-Math.max(r.top,pr.top)); ep.cover=Math.max(ep.cover,ix*iy/area(pr)); } } } }); },50);
};

/* ---------- browser + contexts ---------- */
const b=await chromium.launch({proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined});
async function mk(o){   // o: tag, scheme, w, h, touch, motion, dl, prof, ls (extra localStorage), pins
  const touch=o.touch!==false;
  const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',acceptDownloads:true,colorScheme:o.scheme||'light',ignoreHTTPSErrors:true,reducedMotion:o.motion||'reduce'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(SEED)});
  await ctx.addInitScript({content:`try{ if(!localStorage.getItem('studio:pins')) localStorage.setItem('studio:pins',JSON.stringify(['restock','photo-story','collage'])); ${o.ls?`if(!localStorage.getItem(${JSON.stringify(o.ls[0])})) localStorage.setItem(${JSON.stringify(o.ls[0])},${JSON.stringify(o.ls[1])});`:''} }catch(e){}`});
  await ctx.addInitScript({content:`(${LIB})()`}); await ctx.addInitScript({content:`(${MON})()`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(`${o.tag}: ${pg.url().replace(BASE,'')}: ${e.message}`));
  const c={pg,ctx,tag:o.tag,scheme:o.scheme||'light',touch,prof:o.prof||{},w:o.w||390};
  c.wait=ms=>pg.waitForTimeout(ms);
  c.go=async u=>{ await pg.goto(BASE+u); await Promise.race([pg.evaluate(()=>document.fonts.ready.then(()=>1)),pg.waitForTimeout(3000)]).catch(()=>{}); };
  c.press=async(sel,opt)=>{ try{ await pg.locator(sel).first()[touch?'tap':'click']({timeout:4000,...opt}); return true; }catch(e){ miss.push(`${o.tag}: ${sel}`); return false; } };
  c.js=async sel=>{ const r=await pg.evaluate(s=>{ const e=document.querySelector(s); if(!e) return false; e.click(); return true; },sel); if(!r) miss.push(`${o.tag}: ${sel}`); return r; };
  c.scan=(name,fl)=>scan(c,name,fl); c.modal=(name,sel,fl)=>modal(c,name,sel,fl);
  return c;
}

/* ---------- scanning one screen state ---------- */
async function scan(c,name,fl={}){
  const {pg,prof,scheme}=c, ev=(f,a)=>pg.evaluate(f,a);
  let ys=[null];
  if(fl.page) ys=await ev(()=>{ const H=innerHeight, max=document.documentElement.scrollHeight-H, a=[0]; for(let y=H*.8;y<max-4&&a.length<7;y+=H*.8) a.push(Math.round(y)); if(max>4) a.push(Math.round(max)); return [...new Set(a)]; });
  for(const y of ys){
    if(y!=null){ await ev(y=>scrollTo(0,y),y); await c.wait(70); }
    if(prof.colour){
      const k=await ev(()=>__taste.contrast()); const a=A('contrast:'+scheme); a.cnt+=k.n; a.n++; if(k.min<a.min) a.min=k.min; bad('contrast:'+scheme,name,k.low);
      const s=await ev(()=>__taste.selected()); const sa=A('selected:'+scheme); sa.cnt+=s.n; sa.x.looks=(sa.x.looks||0)+s.looks; if(s.min<sa.min) sa.min=s.min; bad('selected:'+scheme,name,[...s.low,...s.same]);
      const r=await ev(()=>__taste.rtl()); const ra=A('rtl:'+scheme); ra.cnt+=r.n; ra.x.inputs=(ra.x.inputs||0)+r.nin; bad('rtl:'+scheme,name,r.bad);
    }
    if(prof.layout&&c.touch){
      const t=await ev(()=>__taste.taps()); A('tap').cnt+=t.n; bad('tap',name,t.bad);
      const lb=await ev(()=>__taste.labels()); A('labels').cnt+=lb.n; bad('labels',name,lb.bad);
    }
    if(prof.small){
      const k=await ev(()=>__taste.clip()); num('small:overflow',Math.max(k.sw,k.bw)); if(k.sw>c.w||k.bw>c.w) bad('small:overflow',name,`scrollWidth ${k.sw}/${k.bw} > ${c.w}`);
      A('small:clip').cnt++; bad('small:clip',name,k.bad);
    }
  }
  if(ys.length>1) await ev(()=>scrollTo(0,0));
  if(prof.layout){
    if(fl.first){ const k=await ev(()=>__taste.clutter()); A('clutter:accent').cnt++; num('clutter:accent',k.accent.length); if(k.accent.length>2) bad('clutter:accent',name,`${k.accent.length} accent-filled: ${k.accent.join(', ')}`);
      A('clutter:dups').cnt++; bad('clutter:dups',name,k.dups); }
    { const k=await ev(()=>__taste.clutter()); A('clutter:states').cnt++; num('clutter:states',k.act.length); if(k.act.length>2) bad('clutter:states',name,`${k.act.length} accent-filled buttons: ${k.act.join(', ')}`);
      const u=await ev(()=>__taste.underlined()); A('links:underline').cnt++; bad('links:underline',name,u); }
    const lists=await ev(()=>__taste.lists());
    for(const l of lists){ const xs=l.icons; if(xs.length>1){ const sp=Math.max(...xs)-Math.min(...xs); A('align:icons').cnt++; num('align:icons',sp); if(sp>1.01) bad('align:icons',name,`${l.list}: icons start at x=${xs.map(r1).join(',')} (spread ${r1(sp)}px)`); }
      for(const h of l.heads){ if(!xs.length) continue; const key=h.kind==='fab-h'?'align:heading':'align:group'; const dx=h.x-Math.min(...xs); A(key).cnt++; num(key,Math.abs(dx)); if(Math.abs(dx)>1.01) bad(key,name,`${l.list} heading "${h.text}" text starts at x=${r1(h.x)}, row icons at x=${r1(Math.min(...xs))} (${r1(dx)}px)`); } }
    if(fl.align){ const p=await ev(k=>__taste.pageAlign(k),fl.align); if(!p) miss.push(`${c.tag}: ${fl.align} title/chip/card`); else { const xs=[p.title,p.chip,p.card], sp=Math.max(...xs)-Math.min(...xs); A('align:page').cnt++; num('align:page',sp);
        if(sp>1.01) bad('align:page',name,`title text x=${r1(p.title)}, first chip x=${r1(p.chip)}, first card x=${r1(p.card)} (spread ${r1(sp)}px)`); } }
    const sh=await ev(()=>__taste.sheetAlign());
    if(sh){ const d=Math.abs(sh.head-sh.first); A('align:sheet').cnt++; num('align:sheet',d); if(d>2.01) bad('align:sheet',name,`${sh.id} heading text x=${r1(sh.head)}, first control (${sh.ctl}) x=${r1(sh.first)} (${r1(sh.head-sh.first)}px)`); }
    for(const [key,sel,label] of [['hubbar','.hubbar a svg','bottom bar'],['bar','#bar .tab svg','tool bar'],['fab','.fi-ic svg','+ menu']]){
      const z=await ev(s=>__taste.sizes(s),sel); if(z.length>1){ const w=z.map(a=>a[0]), h=z.map(a=>a[1]), sp=Math.max(Math.max(...w)-Math.min(...w),Math.max(...h)-Math.min(...h)); const kk='icons:'+key; A(kk).cnt++; A(kk).x.sizes=z.map(a=>a.join('x')).join(' '); num(kk,sp);
        if(sp>1.01) bad(kk,name,`${label} icons render ${[...new Set(z.map(a=>a.join('x')))].join(', ')} (${z.length} icons)`); } }
    if(fl.tools){ const ic=await ev(()=>__taste.toolIcons()); A('icons:distinct').cnt++; const m=new Map(); ic.forEach(i=>{ (m.get(i.svg)||m.set(i.svg,[]).get(i.svg)).push(i.id); });
      A('icons:distinct').x.n=ic.length; if(ic.length<3) miss.push(`${c.tag}: + menu photo-tool rows (${ic.length})`); [...m.values()].filter(v=>v.length>1).forEach(v=>bad('icons:distinct',name,`${v.join(' and ')} share the same icon`)); }
  }
  if(prof.layout||prof.dialogs){ const dl=await ev(()=>__taste.dialogs()); for(const d of dl){ A('dialog:'+c.w).cnt++; bad('dialog:'+c.w,name,d.bad.map(x=>d.name+' '+x)); } }
  if(prof.small&&fl.last){ const k=await ev(()=>__taste.lastClear()); if(k){ A('small:last').cnt++; const gap=k.barTop-k.maxB; num('small:last',gap); if(gap<-0.5) bad('small:last',name,`last item (${k.who}) ends at y=${r1(k.maxB)}, the fixed bar starts at y=${r1(k.barTop)} (hidden by ${r1(-gap)}px)`); } else miss.push(`${c.tag}: no fixed bar on ${name}`); await ev(()=>scrollTo(0,0)); }
}
/* a dialog: scroll the page a little, open it, check it fits and the page did not move, scan it, close it */
async function modal(c,name,sel,fl={}){
  const {pg}=c; const y0=await pg.evaluate(()=>{ const m=document.documentElement.scrollHeight-innerHeight; scrollTo(0,Math.min(140,Math.max(0,m))); return scrollY; });
  const opened=await c.js(sel); if(!opened) return false;
  const up=await pg.waitForSelector('dialog[open]',{timeout:3000}).then(()=>true,()=>false);
  if(!up){ miss.push(`${c.tag}: no dialog after ${sel}`); return false; }
  await c.wait(c.prof.motion||500);
  const y1=await pg.evaluate(()=>scrollY); const k='scroll:'+c.w; A(k).cnt++; A(k).x.y0=y0; if(y1!==y0) bad(k,name,`page scrolled from ${y0} to ${y1} while the dialog was open`);
  await scan(c,name,{...fl,modal:true});
  await pg.keyboard.press('Escape'); await pg.waitForSelector('dialog[open]',{state:'detached',timeout:2500}).catch(()=>{}); await c.wait(150);
  const y2=await pg.evaluate(()=>scrollY); if(y2!==y0) bad(k,name,`page scrolled from ${y0} to ${y2} after the dialog closed`);
  await pg.evaluate(()=>scrollTo(0,0)); return true;
}

/* the welcome tour (index.html?welcome=1 opens dialog.wl); false when this build has none yet */
async function welcome(c){
  await c.go('index.html?welcome=1'); const up=await c.pg.waitForSelector('dialog.wl[open]',{timeout:3500}).then(()=>true,()=>false); if(!up) return false;
  await c.wait(1000); await scan(c,'welcome tour',{modal:true}); await c.pg.keyboard.press('Escape'); await c.wait(300); return true;
}
/* ---------- the hub (Home, menus, Templates, Saved, search, What's New) ---------- */
async function hub(c){
  const {pg}=c;
  await c.go('index.html'); await pg.waitForSelector('#tools',{timeout:8000}).catch(()=>miss.push(c.tag+': #tools')); await c.wait(900);
  await c.scan('home',{page:true,first:true,last:true});
  await modal(c,'+ menu','#fab',{tools:true});
  await modal(c,'All tools','#allTools');
  await modal(c,'Settings','#setBtn');
  c.welcome=await welcome(c);
  /* search with an Arabic query */
  await c.go('index.html?s=1'); await c.wait(600);
  if(await c.press('#uq')){ await c.wait(500); await c.scan('search (idle)'); await pg.fill('#uq','رجع'); await c.wait(900); await c.scan('search (Arabic)',{page:true}); await pg.evaluate(()=>{ const x=document.getElementById('usCancel'); if(x&&!x.hidden) x.click(); }); }
  /* Templates, then a chip */
  await c.go('index.html'); await c.wait(700);
  if(await c.press('a[data-tab="templates"]')){ await pg.waitForSelector('#templatesView .tp-card',{timeout:6000}).catch(()=>miss.push(c.tag+': templates cards')); await c.wait(900);
    await c.scan('templates',{page:true,last:true,align:'templates'});
    if(await c.press('.tp-chip[data-id="restock"]')){ await c.wait(800); await c.scan('templates (Restock chip on)',{page:true}); } }
  /* Saved, chips, design sheet, collection menu */
  await c.go('index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card',{timeout:8000}).catch(()=>miss.push(c.tag+': saved cards')); await c.wait(900);
  await c.scan('saved',{page:true,last:true,align:'saved'});
  await modal(c,'sort sheet','#sortBtn');
  if(await c.press('#colChips .chip.col')){ await c.wait(600); await c.scan('saved (collection chip on)',{page:true});
    if(await c.press('#colMore')){ await c.wait(500); await c.scan('collection menu'); await pg.keyboard.press('Escape'); await c.wait(300); } }
  await modal(c,'design sheet','#savedGrid [data-dmore]');
  await c.go('whats-new.html'); await c.wait(1000); await c.scan("What's New",{page:true,last:false});
}

/* ---------- a tool page: first view, every sheet, a style, the layer bar ---------- */
async function tool(c,id,fl={}){
  const {pg}=c, T=id;
  await c.go('tools/'+id+'.html'); await pg.waitForSelector('#bar',{timeout:10000}).catch(()=>miss.push(`${c.tag}: ${id} #bar`)); await c.wait(1600);
  await pg.evaluate(()=>{ const b=document.getElementById('draftFresh'); if(b&&b.offsetParent) b.click(); }); await c.wait(300);
  await c.scan(T,{first:true,last:true});
  const open=async sh=>{ const r=await c.press(`#bar [data-open="${sh}"]`); if(r){ await pg.waitForSelector(`#sh-${sh}.open`,{timeout:3000}).catch(()=>miss.push(`${c.tag}: ${id} sheet ${sh} did not open`)); await c.wait(500); } return r; };
  const close=async sh=>{ await c.press(`#sh-${sh} [data-close="${sh}"]`,{timeout:2500}); await c.wait(350); };
  /* Photo: empty, then with a photo (the Photo look row appears) */
  if(await open('photo')){ await c.scan(T+' · Photo sheet');
    const inp=pg.locator('#slots input[data-file="0"]'); if(await inp.count()){ await inp.setInputFiles(S+'pair.jpg').catch(()=>{}); await pg.waitForSelector('#lookRow:not([hidden])',{timeout:4000}).catch(()=>{}); await c.wait(500); await c.scan(T+' · Photo sheet with a photo'); }
    await close('photo'); }
  if(await pg.$('#bar [data-open="words"]')&&await open('words')){ await c.scan(T+' · Words sheet'); await close('words'); }
  if(await open('style')){ await c.scan(T+' · Style sheet');
    if(await c.press('#styles .seg[aria-pressed="false"]')){ await c.wait(700); await c.scan(T+' · Style sheet, another style chosen'); }
    await close('style'); }
  if(fl.slides&&await open('style')){   // Carousel: each slide type shows different fields; the first view is the Cover, so try the others
    for(const [k,lab] of [['two','Two photos'],['number','Big number'],['end','End slide'],['pano','Panorama']]){
      if(await c.press(`[data-seg="kind"] .seg[data-v="${k}"]`)){ await c.wait(500); await c.scan(`${T} · Style sheet, slide type ${lab}`); } }
    if(await c.press('[data-seg="dots"] .seg[data-v="num"]')){ await c.wait(400); await c.scan(T+' · Style sheet, counter 1 / 5'); }
    await close('style'); }
  if(await open('layers')){ await c.scan(T+' · Layers sheet');
    if(fl.toast){ await c.press('#resetLayout'); await c.wait(500); }
    await close('layers'); }
  /* the layer bar: tap the headline in the picture, then Move */
  const box=await pg.evaluate(()=>{ const reg=Studio.debug.reg(), r=reg.find(b=>b.id==='head')||reg.filter(b=>b.id&&!b.hidden&&!b.empty&&b.cx!=null&&b.id!=='logo').sort((a,b)=>b.w*b.h-a.w*a.h)[0]||reg.find(b=>b.id==='logo'&&!b.hidden&&!b.empty&&b.cx!=null); return r?{x:r.cx,y:r.cy,id:r.id}:null; }).catch(()=>null);
  const vv=await pg.locator('#view').boundingBox().catch(()=>null);
  if(box&&vv){ const k=vv.width/1080; await pg.touchscreen.tap(vv.x+box.x*k,vv.y+box.y*k); await pg.waitForSelector('#sh-insp.open',{timeout:3000}).catch(()=>{}); await c.wait(500);
    if(await pg.evaluate(()=>!!document.querySelector('#sh-insp.open'))){ await c.scan(T+' · layer bar'); if(await c.press('.itab[data-part="move"]')){ await c.wait(450); await c.scan(T+' · layer bar, Move'); } }
    else miss.push(`${c.tag}: ${id} layer bar did not open (tapped ${box.id})`); }
  else miss.push(`${c.tag}: ${id} headline box not found`);
  if(fl.toast){ await pg.waitForFunction(()=>![...document.querySelectorAll('.toast')].some(t=>!t.hidden),null,{timeout:6000}).catch(()=>{}); await c.wait(300); c.eps=await pg.evaluate(()=>window.__tm.eps.map(e=>({...e}))); }
}

/* Create: read-only, first view only (no taps inside the editor) */
async function create(c){
  await c.go('tools/'+CREATE+'.html'); await c.wait(2000);
  await c.scan('create',{first:true});
}

/* ---------- the tap budget: a photo to a saved PNG ---------- */
const pngSize=async d=>{ const x=fs.readFileSync(await d.path()); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
async function budget(tag,id){
  const c=await mk({tag,motion:'no-preference',prof:{}}), {pg}=c; const dls=[]; pg.on('download',d=>dls.push(d));
  const waitDl=async(n,ms=9000)=>{ for(let i=0;i<ms/250&&dls.length<n;i++) await pg.waitForTimeout(250); return dls[n-1]; };
  await c.go('index.html'); await pg.waitForSelector(`input[data-quick="${id}"]`,{state:'attached',timeout:8000}).catch(()=>miss.push(`${tag}: input[data-quick="${id}"]`)); await c.wait(500);
  let taps=0;
  await Promise.all([pg.waitForURL(new RegExp(id+'\\.html'),{timeout:12000}),pg.setInputFiles(`input[data-quick="${id}"]`,S+'pair.jpg')]).catch(()=>miss.push(tag+': quick start did not open '+id)); taps++;   // tap 1: the camera button on Home
  await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{});
  await pg.waitForFunction(()=>window.__tm&&window.__tm.eps.some(e=>e.kind==='ready'),null,{timeout:3000}).catch(()=>{});
  await pg.waitForFunction(()=>document.getElementById('readyBar').hidden,null,{timeout:6500}).catch(()=>{});   // let the note run its course (measured by the monitor)
  const eps=await pg.evaluate(()=>window.__tm.eps.map(e=>({...e})));
  await c.press('#barSave'); taps++;                                                                                 // tap 2: Save in the bar
  let d=await waitDl(1,9000), png=d?await pngSize(d):'';
  if(!d){ const open=await pg.evaluate(()=>!!document.querySelector('#sh-save.open')); if(open){ await c.press('#save'); taps++; d=await waitDl(1,9000); png=d?await pngSize(d):''; } }
  await pg.waitForFunction(()=>![...document.querySelectorAll('.toast')].some(t=>!t.hidden),null,{timeout:6000}).catch(()=>{});
  const eps2=await pg.evaluate(()=>window.__tm.eps.map(e=>({...e})));
  await c.ctx.close(); return {taps,png,eps:eps2.length>=eps.length?eps2:eps};
}
async function cans(){
  const c=await mk({tag:'cans',motion:'no-preference',ls:['studio:1stchoice:restock','{"style":"cans"}']}), {pg}=c; const dls=[]; pg.on('download',d=>dls.push(d));
  await c.go('tools/restock.html'); await pg.waitForSelector('#barSave',{timeout:10000}).catch(()=>{}); await c.wait(2200);
  const style=await pg.evaluate(()=>Studio.debug.S.style).catch(()=>null);
  if(style!=='cans'){ await c.ctx.close(); return {skip:`style "cans" is not applied (style is ${style})`}; }
  let taps=0; await c.press('#barSave'); taps++;
  let d; for(let i=0;i<36&&!dls.length;i++) await pg.waitForTimeout(250); d=dls[0]; let png=d?await pngSize(d):'';
  if(!d){ const open=await pg.evaluate(()=>!!document.querySelector('#sh-save.open')); if(open){ await c.press('#save'); taps++; for(let i=0;i<36&&!dls.length;i++) await pg.waitForTimeout(250); d=dls[0]; png=d?await pngSize(d):''; } }
  await c.ctx.close(); return {taps,png};
}

/* ---------- run everything: independent jobs in parallel ---------- */
const jobs=[], EPS=[], W={};
const P390=(tag,scheme)=>({tag,scheme,prof:{colour:true,layout:scheme==='light'}});
for(const scheme of ['light','dark']) jobs.push((async()=>{
  const c=await mk(P390('390-'+scheme,scheme)); await hub(c); W[scheme]=c.welcome; await c.ctx.close();
  for(const id of [...TOOLS,...MORE]){ const t=await mk(P390(`390-${scheme}-${id}`,scheme)); await tool(t,id,{toast:scheme==='light'&&id==='restock',slides:id==='carousel'}); if(t.eps) EPS.push(...t.eps); await t.ctx.close(); }
  { const t=await mk(P390(`390-${scheme}-create`,scheme)); await create(t); await t.ctx.close(); }
})());
jobs.push((async()=>{   // 360x740: overflow, clipped text, the last item clear of the bar
  const prof={small:true}; const c=await mk({tag:'360',w:360,h:740,prof}); await hub(c); await c.ctx.close();
  for(const id of [...TOOLS,...MORE]){ const t=await mk({tag:'360-'+id,w:360,h:740,prof}); await tool(t,id); await t.ctx.close(); }
  { const t=await mk({tag:'360-create',w:360,h:740,prof}); await create(t); await t.ctx.close(); }
})());
jobs.push((async()=>{   // 1280x800: dialogs fit and the page stays put
  const c=await mk({tag:'1280',w:1280,h:800,touch:false,prof:{dialogs:true}});
  await c.go('index.html'); await c.wait(1200);
  await modal(c,'+ menu','#fab'); await modal(c,'All tools','#allTools'); await modal(c,'Settings','#setBtn');
  await welcome(c);
  await c.go('index.html#saved'); await c.pg.waitForSelector('#savedGrid .sv-card',{timeout:8000}).catch(()=>miss.push('1280: saved cards')); await c.wait(900);
  await modal(c,'design sheet','#savedGrid [data-dmore]');
  await c.ctx.close();
})());
const flows={};
jobs.push((async()=>{ flows.restock=await budget('flow-restock','restock'); })());
jobs.push((async()=>{ flows['photo-story']=await budget('flow-photo-story','photo-story'); flows.cans=await cans(); })());
await Promise.all(jobs.map(j=>j.catch(e=>{ errs.push('JOB CRASH: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' / ')); })));
await b.close();

/* ---------- report ---------- */
const line=(key,name,fmt)=>{ const a=R[key]; if(!a||(!a.cnt&&!a.n)){ ok(name,false,'nothing was measured: the screen could not be reached'); return; } ok(name,!a.bad.length,a.bad.length?short(a.bad):fmt(a)); };
for(const sc of ['light','dark']){
  line('contrast:'+sc,`${sc}: every visible text is >= 4.5:1 (>= 3:1 if large) on Home, menus, Templates, Saved, search, What's New and the tools with every sheet`,a=>({texts:a.cnt,screens:a.n,lowest:r1(a.min)}));
  line('selected:'+sc,`${sc}: selected chips/segs/tabs/looks are readable and differ from their unselected sibling`,a=>({selectedControls:a.cnt,lookButtons:a.x.looks,lowest:r1(a.min)}));
  line('rtl:'+sc,`${sc}: Arabic text runs right to left, text fields have dir=auto/rtl`,a=>({arabicTexts:a.cnt,textFields:a.x.inputs}));
}
line('align:heading','light: a menu heading starts where its row icons start (+ menu)',a=>({headings:a.cnt,worst:r1(a.max)+'px'}));
line('align:group','light: All tools group headings start where the row thumbnails start',a=>({headings:a.cnt,worst:r1(a.max)+'px'}));
line('align:icons','light: row icons in one menu/list share the same x (+ menu, Settings, All tools, design sheet, collection menu)',a=>({lists:a.cnt,worstSpread:r1(a.max)+'px'}));
line('align:page','light: Templates and Saved: page title, first chip and first card share one left edge',a=>({pages:a.cnt,worstSpread:r1(a.max)+'px'}));
line('align:sheet','light: tool sheet heading text starts where the first control starts (+-2px)',a=>({sheets:a.cnt,worst:r1(a.max)+'px'}));
line('icons:hubbar','light: bottom bar icons render the same size',a=>({sizes:a.x.sizes}));
line('icons:bar','light: tool bar icons render the same size',a=>({sizes:a.x.sizes}));
line('icons:fab','light: + menu icons render the same size',a=>({sizes:a.x.sizes}));
line('icons:distinct','light: Restock, Photo story and Collage have different icons in the + menu',a=>({photoTools:a.x.n}));
/* pop-ups */
{ const toasts=EPS.filter(e=>e.kind==='toast');
  const fl2=[...(flows.restock?flows.restock.eps||[]:[]),...(flows['photo-story']?flows['photo-story'].eps||[]:[])];
  const allT=[...toasts,...fl2.filter(e=>e.kind==='toast')], allR=fl2.filter(e=>e.kind==='ready');
  const secs=e=>Math.round((e.end-e.start)/100)/10;
  if(!allT.length) ok('light: a toast shows when something changes in a tool',false,'no toast was seen (Layers sheet "Put everything back" and Save were tried)');
  else { const b2=allT.filter(e=>e.lines>2.6||e.cover>.15||secs(e)>4.5||(!e.done&&secs(e)>4.5)).map(e=>`"${e.text}" ${r1(e.lines)} lines, covers ${Math.round(e.cover*100)}% of the preview, shown ${secs(e)} s`);
    ok('light: toasts are at most 2 lines, cover <= 15% of the preview and are gone within 4.5 s',!b2.length,b2.length?short(b2):allT.map(e=>`"${e.text.slice(0,22)}" ${r1(e.lines)} lines, ${Math.round(e.cover*100)}%, ${secs(e)} s`).join(' | ')); }
  if(!allR.length) ok('light: the "Your photo is in" note shows after Quick start',false,'no note was seen after the camera button');
  else { const b2=allR.filter(e=>e.cover>.15||secs(e)>4).map(e=>`"${e.text}" covers ${Math.round(e.cover*100)}% of the preview, shown ${secs(e)} s`);
    ok('light: the "Your photo is in" note covers <= 15% of the preview and is gone within 4 s',!b2.length,b2.length?short(b2):allR.map(e=>`${Math.round(e.cover*100)}%, ${secs(e)} s`).join(' | ')); } }
for(const w of [390,1280]){
  line('dialog:'+w,`light: every open dialog is fully inside the viewport at ${w===390?'390x844':'1280x800'}`,a=>({dialogs:a.cnt}));
  line('scroll:'+w,`light: the page does not scroll while a dialog is open at ${w===390?'390x844':'1280x800'}`,a=>({dialogs:a.cnt,pageWasScrolledTo:a.x.y0}));
}
/* tap budget */
for(const [id,f] of [['restock',flows.restock],['photo-story',flows['photo-story']]]){
  ok(`tap budget: ${id} from a photo to a saved 2160x3840 PNG in <= 2 taps`,!!f&&f.taps<=2&&f.png==='2160x3840',f?{taps:f.taps,png:f.png||'no download'}:'flow did not run'); }
if(flows.cans&&flows.cans.skip) skip('tap budget: Restock "Cans" with no photo saves a 2160x3840 PNG in 1 tap',flows.cans.skip);
else ok('tap budget: Restock "Cans" with no photo saves a 2160x3840 PNG in 1 tap after opening',!!flows.cans&&flows.cans.taps<=1&&flows.cans.png==='2160x3840',flows.cans?{taps:flows.cans.taps,png:flows.cans.png||'no download'}:'flow did not run');
/* clutter */
line('clutter:accent','light: first view of Home and each tool has at most 2 accent-filled controls (not counting +)',a=>({screens:a.cnt,most:a.max}));
line('clutter:dups','light: no two visible controls share a name on the first view of Home and each tool',a=>({screens:a.cnt}));
line('clutter:states','light: every state (open sheets too) has at most 2 accent-filled buttons (not counting + or chosen chips)',a=>({states:a.cnt,most:a.max}));
line('links:underline','light: no button or link is underlined (secondary actions are text buttons)',a=>({states:a.cnt}));
/* tap targets */
line('tap','light: every visible control is >= 44x44 (or has a hit area that reaches it)',a=>({controls:a.cnt}));
/* small phones */
line('labels','light: every icon-only control has an accessible name (aria-label, title, label) on Home, menus, Saved and the tools',a=>({iconOnlyControls:a.cnt}));
line('small:overflow','360x740: no sideways page scroll on any screen',a=>({screens:a.n,widest:a.max}));
line('small:clip','360x740: no clipped text (scrollWidth <= clientWidth + 1 unless ellipsis/line-clamp)',a=>({screens:a.cnt}));
line('small:last','360x740: the last item scrolls clear of the fixed bottom bar (Home, Templates, Saved, the tools)',a=>({pages:a.cnt,smallestGap:r1(a.min)+'px'}));
if(W.light===false) skip('welcome tour checks (contrast, RTL, tap targets, dialog fit, 360 overflow)','dialog.wl did not open for index.html?welcome=1');
ok('every screen and control the suite needs was reachable',!miss.length,miss.length?short(miss,12):'');
ok('no page errors',!errs.length,short(errs,6));
console.log(res.join('\n')); console.log(`taste: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${res.filter(x=>x.startsWith('SKIP')).length} skip, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

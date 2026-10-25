/* Studio Templates library (brand-agnostic). A calm, Photos-style browser for templates: a header, category chips that stick to the top,
   and a grid of preview cards. The page hands in the data and helpers:
   StudioTemplates.init({root,cats,entries,onOpen,onBack,teamNote,esc,haptic,store,icons}) -> {show(cat?),refresh(),cat}.
   Entry = {id,cat,title,sub,thumb,shape:'story'|'post'|'square'|'circle',href,badge?,keys?}. Uses only the tokens from studio.css; classes are tp-*. */
(function(){
'use strict';
const KEY='studio:tplCat', SHAPES=['story','post','square','circle'], MORE={id:'more',label:'More'};
const SVG=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
/* used when the page has no icon of its own */
const FB={back:SVG('<path d="m15 18-6-6 6-6"/>'),template:SVG('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18"/><path d="M9 9v12"/>')};
let cur=null;

function make(o){
  const root=o.root;
  const esc=o.esc||(s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const ic=k=>(o.icons&&o.icons[k])||FB[k]||'', hap=k=>{ try{ o.haptic&&o.haptic(k); }catch(_){} };
  const rd=()=>{ try{ const v=o.store&&o.store(KEY); return typeof v==='string'&&v?v:''; }catch(_){ return ''; } };
  const wr=v=>{ try{ o.store&&o.store(KEY,v); }catch(_){} };
  const reduce=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){ return false; } };
  const ac=new AbortController(), on=(t,ev,fn,opt)=>t.addEventListener(ev,fn,Object.assign({signal:ac.signal},opt));
  let cats=(Array.isArray(o.cats)?o.cats:[]).filter(c=>c&&c.id).map(c=>({id:String(c.id),label:String(c.label==null?c.id:c.label)}));
  if(!cats.some(c=>c.id==='all')) cats.unshift({id:'all',label:'All'});
  let data=null, loading=false, loadId=0, cat=rd()||'all', shown=[], noteAct=null, swapT=0, say=0;

  /* ---- the frame of the page; built once, the parts below are redrawn ---- */
  root.classList.add('tp');
  root.innerHTML=`<div class="tp-head"><div class="tp-in">
      <button type="button" class="tp-back" aria-label="Back to home">${ic('back')}</button>
      <div class="tp-ttlrow"><h1 class="tp-ttl">Templates</h1><span class="tp-count"></span></div>
      <p class="tp-lead">Tap one to start. Every word and photo can be changed.</p>
    </div></div>
    <div class="tp-bar"><div class="tp-chips" role="group" aria-label="Template categories"></div></div>
    <div class="tp-in"><div class="tp-body"></div></div>
    <div class="tp-sr" role="status" aria-live="polite"></div>`;
  const q=s=>root.querySelector(s), ui={head:q('.tp-head'),bar:q('.tp-bar'),chips:q('.tp-chips'),body:q('.tp-body'),count:q('.tp-count'),sr:q('.tp-sr')};

  /* ---- data ---- */
  const normal=l=>(Array.isArray(l)?l:[]).filter(e=>e&&typeof e==='object').map(e=>Object.assign({},e,{cat:String(e.cat==null?'':e.cat),shape:SHAPES.includes(e.shape)?e.shape:'story'}));
  const known=()=>new Set(cats.map(c=>c.id));
  const countOf=id=>!data?0:id==='all'?data.length:data.filter(e=>e.cat===id).length;
  const chipsNow=()=>cats.filter(c=>c.id==='all'||c.id==='team'||countOf(c.id)>0);
  const valid=id=>chipsNow().some(c=>c.id===id);
  const curCat=()=>!data||valid(cat)?cat:'all';
  const plural=n=>n+(n===1?' template':' templates');
  const note=()=>{ try{ const n=o.teamNote&&o.teamNote(); return n&&n.text?n:null; }catch(_){ return null; } };

  /* ---- drawing ---- */
  function card(e,i){
    const t=String(e.title==null?'':e.title), s=e.sub==null?'':String(e.sub), k=shown.push(e)-1;
    const label=[t,s,e.badge].filter(Boolean).join(', ');
    const img=e.thumb?`<img class="tp-img" src="${esc(e.thumb)}" alt="" loading="lazy" decoding="async" draggable="false">`:'';
    const badge=e.badge?`<span class="tp-badge">${esc(e.badge)}</span>`:'';
    /* dir="auto" on the text block: the title decides, so title and line below always start on the same side */
    return `<li class="tp-li" role="listitem"><a class="tp-card" href="${esc(e.href||'#')}" data-i="${k}" style="--i:${Math.min(i,14)}" aria-label="${esc(label)}"><span class="tp-frame tp-${e.shape} ${e.thumb?'tp-wait':'tp-none'}"><span class="tp-ph" aria-hidden="true">${ic('template')}</span>${img}${badge}</span><span class="tp-tx" dir="auto"><span class="tp-t">${esc(t)}</span>${s?`<span class="tp-s">${esc(s)}</span>`:''}</span></a></li>`;
  }
  const grid=list=>`<ul class="tp-grid" role="list">${list.map(card).join('')}</ul>`;
  function noteHtml(n){
    noteAct=n.action&&n.action.run?n.action:null;
    return `<div class="tp-note"><p class="tp-nt" dir="auto">${esc(n.text)}</p>${n.action&&n.action.label?`<button type="button" class="mini tp-na">${esc(n.action.label)}</button>`:''}</div>`;
  }
  const emptyHtml=()=>`<div class="tp-empty"><span class="tp-ei" aria-hidden="true">${ic('template')}</span><p>No templates here yet.</p></div>`;
  const skeleton=()=>`<ul class="tp-grid" aria-hidden="true">${'<li class="tp-li"><span class="tp-frame tp-story tp-wait"></span><span class="tp-tx"><span class="tp-bone"></span><span class="tp-bone short"></span></span></li>'.repeat(6)}</ul>`;
  const sec=(c,list,body)=>`<section class="tp-sec" data-cat="${esc(c.id)}"><h2 class="tp-h"><span>${esc(c.label)}</span>${list.length?`<span class="tp-n">${list.length}</span>`:''}</h2>${body}</section>`;

  function drawChips(){
    const keep=ui.chips.scrollLeft, c0=curCat();
    ui.chips.removeAttribute('aria-busy');
    if(loading){ ui.chips.setAttribute('aria-busy','true'); ui.chips.innerHTML='<span class="tp-pill" style="width:72px"></span><span class="tp-pill" style="width:104px"></span><span class="tp-pill" style="width:96px"></span><span class="tp-pill" style="width:88px"></span>'; return; }
    ui.chips.innerHTML=chipsNow().map(c=>{ const n=countOf(c.id); return `<button type="button" class="tp-chip" data-id="${esc(c.id)}" aria-pressed="${c.id===c0}"><span class="tp-cl">${esc(c.label)}</span>${n?`<span class="tp-cn">${n}</span>`:''}</button>`; }).join('');
    ui.chips.scrollLeft=keep;
  }
  function drawBody(anim){
    shown=[]; noteAct=null; const c0=curCat(); let html='';
    ui.body.removeAttribute('aria-busy');
    if(loading){ ui.body.setAttribute('aria-busy','true'); html=skeleton(); }
    else if(c0==='all'){
      const ids=known(), groups=cats.filter(c=>c.id!=='all').map(c=>({c,list:data.filter(e=>e.cat===c.id)}));
      const rest=data.filter(e=>!ids.has(e.cat)); if(rest.length) groups.push({c:MORE,list:rest});
      groups.forEach(({c,list})=>{
        if(list.length) html+=sec(c,list,grid(list));
        else if(c.id==='team'){ const n=note(); if(n) html+=sec(c,list,noteHtml(n)); }
      });
      if(!data.length) html=emptyHtml()+html;   // nothing at all yet: say so, then the Team note if there is one
    } else {
      const c=cats.find(x=>x.id===c0)||{label:c0}, list=data.filter(e=>e.cat===c0);
      if(list.length) html=`<h2 class="tp-sr">${esc(c.label)}</h2>`+grid(list);
      else { const n=c0==='team'?note():null; html=n?noteHtml(n):emptyHtml(); }
    }
    ui.body.innerHTML=html;
    if(anim) ui.body.setAttribute('data-anim',''); else ui.body.removeAttribute('data-anim');
    ui.body.querySelectorAll('.tp-img').forEach(settle);
  }
  function paint(anim){
    ui.count.textContent=data&&!loading?plural(data.length):'';
    drawChips(); drawBody(anim);
  }

  /* ---- images: shimmer until loaded, then fade in; a missing or failed picture becomes the placeholder icon ---- */
  function settle(img){ if(img.complete&&img.naturalWidth) good(img); else if(img.complete&&img.getAttribute('src')) bad(img); }
  function good(img){ const f=img.parentNode; if(f&&f.classList) f.classList.remove('tp-wait'); img.classList.add('on'); }
  function bad(img){ const f=img.parentNode; if(f&&f.classList){ f.classList.remove('tp-wait'); f.classList.add('tp-none'); } img.remove(); }
  on(root,'load',e=>{ if(e.target.classList&&e.target.classList.contains('tp-img')) good(e.target); },{capture:true});
  on(root,'error',e=>{ if(e.target.classList&&e.target.classList.contains('tp-img')) bad(e.target); },{capture:true});

  /* ---- loading ---- */
  function load(anim){
    const id=++loadId; let r;
    try{ r=o.entries(); }catch(err){ console.error(err); r=[]; }
    const done=l=>{ if(id!==loadId) return; data=normal(l); loading=false; paint(anim); };
    if(r&&typeof r.then==='function'){
      if(!data){ loading=true; paint(false); }   // first time: shimmer cards while they come; a refresh keeps what is on screen until the new list is there
      r.then(done,err=>{ console.error(err); if(id===loadId&&!data) done([]); });
    } else done(r);
  }

  /* ---- choosing a category ---- */
  /* once the chips are stuck to the top, go back up to where they start */
  function scroller(){
    for(let n=root.parentElement;n&&n!==document.body&&n!==document.documentElement;n=n.parentElement){ const y=getComputedStyle(n).overflowY; if((y==='auto'||y==='scroll')&&n.scrollHeight>n.clientHeight) return n; }
    return null;
  }
  function toTop(){
    const sc=scroller(), stick=parseFloat(getComputedStyle(ui.bar).top)||0;
    const d=ui.head.getBoundingClientRect().bottom-(sc?sc.getBoundingClientRect().top:0)-stick;   // negative once the chips are stuck
    if(d<-1) (sc||window).scrollBy({top:d,behavior:'instant'});
  }
  function mark(){
    const c0=curCat();
    ui.chips.querySelectorAll('.tp-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===c0)));
    const b=ui.chips.querySelector('.tp-chip[aria-pressed="true"]'); if(b&&b.scrollIntoView) b.scrollIntoView({block:'nearest',inline:'center',behavior:reduce()?'auto':'smooth'});
  }
  function announce(){
    const c0=curCat(), c=cats.find(x=>x.id===c0), n=countOf(c0); clearTimeout(say);
    say=setTimeout(()=>{ ui.sr.textContent=(c?c.label:'')+', '+plural(n); },300);
  }
  /* a quick cross-fade: the old cards fade out, the new ones fade in (no fade under reduced motion) */
  function pick(id){
    if(!valid(id)) return;
    if(id===curCat()){ toTop(); return; }
    cat=id; wr(id); mark(); announce();
    const b=ui.body, swap=()=>{ drawBody(false); toTop(); };
    b.getAnimations&&b.getAnimations().forEach(a=>a.cancel());
    if(reduce()||!b.animate){ swap(); return; }
    b.animate([{opacity:1},{opacity:0}],{duration:70,easing:'ease-out',fill:'forwards'}).finished.then(()=>{
      b.getAnimations().forEach(a=>a.cancel()); swap(); b.animate([{opacity:0},{opacity:1}],{duration:120,easing:'ease-out'});
    },()=>{});
  }

  /* ---- events ---- */
  on(root,'click',e=>{
    const t=e.target; if(!t.closest) return;
    if(t.closest('.tp-back')){ hap('tick'); try{ o.onBack&&o.onBack(); }catch(err){ console.error(err); } return; }
    const chip=t.closest('.tp-chip'); if(chip){ hap('tick'); pick(chip.dataset.id); return; }
    if(t.closest('.tp-na')){ if(noteAct){ hap('tick'); try{ noteAct.run(); }catch(err){ console.error(err); } } return; }
    const a=t.closest('.tp-card'); if(!a) return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;   // let "open in a new tab" work
    const en=shown[+a.dataset.i]; if(!en) return;
    hap('tick');
    let r; try{ r=o.onOpen&&o.onOpen(en,e); }catch(err){ console.error(err); }
    if(r===false) e.preventDefault();
  });

  return {
    show(c){
      if(typeof c==='string'&&c&&(!data||valid(c))){ cat=c; wr(c); }
      if(!data&&!loading) load(true); else if(data){ paint(true); announce(); }
    },
    refresh(){ load(false); },
    get cat(){ return curCat(); },
    destroy(){ ac.abort(); clearTimeout(say); loadId++; root.classList.remove('tp'); root.innerHTML=''; }
  };
}

window.StudioTemplates={
  init(o){ if(cur) cur.destroy(); cur=make(o); return cur; }
};
})();

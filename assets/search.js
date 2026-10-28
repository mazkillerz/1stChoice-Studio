/* Studio universal search (brand-agnostic). One field on the home page finds tools, templates, saved designs,
   unfinished stories and actions. The page hands in the data and helpers: StudioSearch.init({input,root,panel,cancel,esc,store,icons,entries,shortcuts,haptic}).
   Phone: opening makes a full-screen layer (one history entry, so Back closes it). Desktop: a dropdown card under the field. */
(function(){
'use strict';
const KEY='studio:recentSearches', MAX_RECENT=6;
/* kind -> heading and how many rows show before "Show N more" */
const GROUPS=[['tool','Tools',1e9],['draft','Continue editing',3],['template','Templates',5],['design','Saved designs',6],['action','Settings and actions',5]];
/* Arabic-aware matching (marks, letter forms, Arabic digits) comes from the engine, so Create's template search matches the same way */
const nmap=s=>Studio.normMap(s), norm=s=>Studio.normText(s);
/* our own clear button (the browser's native one jumps onto the magnifier when the text is Arabic): a soft disc with a small x */
const X_ICON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" fill-opacity=".16" stroke="none"/><path d="M15.5 8.5 8.5 15.5"/><path d="m8.5 8.5 7 7"/></svg>';
const thumbs=new Map(), pending=new Set();   // saved-design thumbnails resolved so far (kept across re-inits)
let cur=null;

function make(cfg){
  const {input,root,panel,cancel}=cfg;
  const esc=cfg.esc||(s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const ic=k=>(cfg.icons&&cfg.icons[k])||'', hap=k=>{ try{ cfg.haptic&&cfg.haptic(k); }catch(_){} };
  const rd=()=>{ try{ const a=cfg.store(KEY); return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x):[]; }catch(_){ return []; } };
  const wr=a=>{ try{ cfg.store(KEY,a&&a.length?a:null); }catch(_){} };
  const phone=()=>matchMedia('(max-width:820px)').matches;
  const ac=new AbortController(), on=(t,ev,fn,o)=>t.addEventListener(ev,fn,Object.assign({signal:ac.signal},o));
  const status=document.createElement('div'); status.className='sr-only'; status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); root.appendChild(status);
  let isOpen=false, pushed=false, popRes=null, popT=0, closing=null, kb=-1, shown=[], view='', raf=0, stT=0, spacer=null, going=false;
  const expanded=new Set();
  input.setAttribute('aria-controls',panel.id||(panel.id='usPanel')); input.setAttribute('aria-expanded','false');
  /* clear button: inside the field, right after the input; shown only while there is text */
  if(input.parentNode) input.parentNode.querySelectorAll(':scope>.us-x').forEach(x=>x.remove());
  const xb=document.createElement('button'); xb.type='button'; xb.className='us-x'; xb.hidden=true; xb.setAttribute('aria-label','Clear search'); xb.innerHTML=X_ICON; input.after(xb);
  const syncX=()=>{ xb.hidden=!input.value; };
  syncX();

  /* ---- searching ---- */
  function search(q){
    const nq=norm(q); if(!nq) return null;
    const words=nq.split(' '), groups={}; let total=0, all=[];
    try{ all=cfg.entries()||[]; }catch(_){}
    all.forEach((e,i)=>{
      if(!e||!e.title) return;
      const t=norm(e.title), hay=t+' '+norm(e.sub)+' '+norm(e.keys);
      if(!words.every(w=>hay.includes(w))) return;
      const tw=t.split(' ');
      let sc=t.startsWith(nq)?100:(' '+t).includes(' '+nq)?60:t.includes(nq)?40:10;
      sc+=5*words.filter(w=>tw.some(x=>x.startsWith(w))).length;
      const k=GROUPS.some(g=>g[0]===e.kind)?e.kind:'action'; (groups[k]||(groups[k]=[])).push({e,sc,i}); total++;
    });
    Object.values(groups).forEach(g=>g.sort((a,b)=>b.sc-a.sc||a.i-b.i));
    return {nq,words,groups,total};
  }
  /* wrap the matched part of a title in <mark> (found on the normalised text, mapped back so diacritics don't break it) */
  function hl(raw,words){
    const {n,m}=nmap(raw), r=[];
    words.forEach(w=>{ const i=w?n.indexOf(w):-1; if(i>=0) r.push([m[i],m[i+w.length-1]+1]); });
    if(!r.length) return esc(raw);
    r.sort((a,b)=>a[0]-b[0]); const mg=[r[0].slice()];
    r.slice(1).forEach(x=>{ const l=mg[mg.length-1]; if(x[0]<=l[1]||!raw.slice(l[1],x[0]).trim()) l[1]=Math.max(l[1],x[1]); else mg.push(x.slice()); });   // overlapping or only spaces between: one mark
    let o='', p=0; mg.forEach(([a,b])=>{ o+=esc(raw.slice(p,a))+'<mark>'+esc(raw.slice(a,b))+'</mark>'; p=b; });
    return o+esc(raw.slice(p));
  }

  /* ---- drawing ---- */
  /* saved designs bring their preview later: fill every matching box when it arrives */
  function want(e){
    if(!e.id||thumbs.has(e.id)||pending.has(e.id)) return; pending.add(e.id);
    Promise.resolve().then(()=>e.thumbAsync()).catch(()=>null).then(u=>{
      pending.delete(e.id); thumbs.set(e.id,u||null); if(!u) return;
      panel.querySelectorAll(`[data-tid="${CSS.escape(e.id)}"]`).forEach(el=>{ if(!el.firstChild) el.innerHTML=`<img src="${esc(u)}" alt="" decoding="async">`; });
    });
  }
  const starLabel=e=>(e.pinned?'Unpin ':'Pin ')+e.title+(e.pinned?' from home':' to home');
  /* one result row (or shortcut tile): link, button or photo-picker label, plus a pin star for tools */
  function item(e,i,words,tile,pri){
    const tag=e.quick?'label':e.href?'a':'button', title=String(e.title||'');
    const attr=tag==='a'?` href="${esc(e.href)}"`:tag==='button'?' type="button"':'';
    const lead=e.quick?`<input type="file" class="sr-only" accept="image/*,.heic,.heif" data-quick="${esc(e.quick.tool)}"${e.quick.multi?' multiple':''}>`:'';
    let pic;
    if(tile) pic=`<span class="us-ic" aria-hidden="true">${e.icon||(e.quick?ic('camera'):ic('next'))}</span>`;
    else if(e.thumb||e.thumbAsync){
      const u=e.thumb||thumbs.get(e.id);
      pic=`<span class="us-th"${e.shape&&e.shape!=='story'?` data-shape="${esc(e.shape)}"`:''} data-tid="${esc(e.id||'')}" aria-hidden="true">${u?`<img src="${esc(u)}" alt="" decoding="async">`:''}</span>`;
      if(!u&&e.thumbAsync) want(e);
    } else pic=`<span class="us-ic" aria-hidden="true">${e.icon||''}</span>`;
    const sub=!tile&&e.sub?`<span class="us-s">${esc(e.sub)}</span>`:'', badge=!tile&&e.badge?`<span class="us-badge">${esc(e.badge)}</span>`:'';
    const end=tile?'':e.quick?`<span class="us-end" aria-hidden="true">${ic('camera')}</span>`:e.togglePin?'':`<span class="us-end go" aria-hidden="true">${ic('next')}</span>`;
    const an=i<8, d=`style="--d:${i*15}ms"`;   // the first 8 fade in one after another
    /* direction: the wrapper (.us-item, or the tile itself) has dir="auto" and the first text it meets is the title, so thumbnail, text, badge, chevron and star all follow the title's direction */
    const row=`<${tag} class="us-row${tile?' us-tile'+(pri?' pri':'')+(an?' us-anim':''):''}"${tile?' dir="auto"':''}${tile&&an?' '+d:''} id="us-r${i}" data-i="${i}"${attr}>${lead}${pic}<span class="us-tx"><span class="us-t">${tile?esc(title):hl(title,words)}</span>${sub}</span>${badge}${end}</${tag}>`;
    if(tile) return row;
    const star=e.togglePin?`<button type="button" class="us-star" data-star="${i}" aria-pressed="${!!e.pinned}" aria-label="${esc(starLabel(e))}">${e.pinned?ic('starFill'):ic('star')}</button>`:'';
    return `<div class="us-item${an?' us-anim':''}" dir="auto"${an?' '+d:''}>${row}${star}</div>`;
  }
  function idleHtml(){
    const rec=rd(); let h='';
    if(rec.length) h+=`<section class="us-sec"><div class="us-hrow"><h3 class="us-h">Recent searches</h3><button type="button" class="link us-clear" data-clear>Clear</button></div><div class="chips us-chips">${rec.map(r=>`<button type="button" class="chip us-chip" data-q="${esc(r)}"><span class="us-ci" aria-hidden="true">${ic('clock')}</span><span dir="auto">${esc(r)}</span></button>`).join('')}</div></section>`;
    let sc=[]; try{ sc=cfg.shortcuts()||[]; }catch(_){}
    if(sc.length) h+=`<section class="us-sec"><h3 class="us-h">Shortcuts</h3><div class="us-tiles">${sc.map((e,j)=>{ shown.push(e); return item(e,shown.length-1,[],true,j===0); }).join('')}</div></section>`;
    return h;
  }
  function emptyHtml(q){
    let t=''; try{ const e=(cfg.entries()||[]).find(x=>x.kind==='tool'); t=e?String(e.title):''; }catch(_){}
    return `<div class="us-empty"><b>Nothing found for “<bdi>${esc(q.trim())}</bdi>”.</b><p>Try a tool name${t?`, like ${esc(t)},`:''} or a saved design’s name.</p></div>`;
  }
  function render(o){
    o=o||{}; const q=input.value, res=search(q); let html=''; shown=[];
    const v=res?(res.total?'res':'none'):'idle';
    if(!res) html=idleHtml();
    else if(!res.total) html=emptyHtml(q);
    else GROUPS.forEach(([k,label,lim])=>{
      const g=res.groups[k]; if(!g||!g.length) return;
      const list=expanded.has(k)?g:g.slice(0,lim), more=g.length-list.length;
      html+=`<section class="us-sec" data-k="${k}"><h3 class="us-h">${label}</h3>${list.map(x=>{ shown.push(x.e); return item(x.e,shown.length-1,res.words); }).join('')}${more>0?`<button type="button" class="mini us-more" data-more="${k}">Show ${more} more</button>`:''}</section>`;
    });
    const top=o.keep?panel.scrollTop:0;
    if(v!==view) panel.setAttribute('data-anim',''); else panel.removeAttribute('data-anim');   // rows only fade in when the view changes, not on every keystroke
    view=v; panel.innerHTML=html; panel.scrollTop=top; kb=-1; input.removeAttribute('aria-activedescendant');
    clearTimeout(stT); stT=setTimeout(()=>{ status.textContent=res?(res.total?(res.total===1?'1 result':res.total+' results'):'No results'):''; },400);
  }
  const schedule=()=>{ if(!raf) raf=requestAnimationFrame(()=>{ raf=0; if(isOpen) render(); }); };

  /* ---- open / close ---- */
  /* keep the layer on the visible part of the screen when the phone keyboard is up */
  function sync(){ const v=window.visualViewport; if(!v||!isOpen||!phone()) return; root.style.setProperty('--us-top',v.offsetTop+'px'); root.style.setProperty('--us-h',v.height+'px'); }
  function open(q){
    const was=isOpen;
    if(!was){
      isOpen=true;
      if(phone()){
        spacer=document.createElement('div'); spacer.className='us-spacer'; const cs=getComputedStyle(root); spacer.style.height=(root.offsetHeight+(parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0))+'px'; root.after(spacer);   // the page behind doesn't jump
        if(!pushed){ try{ history.pushState({us:1},''); pushed=true; }catch(_){} }
      }
      root.classList.add('on'); document.body.classList.add('us-open'); panel.hidden=false; cancel.hidden=false; input.setAttribute('aria-expanded','true'); sync();
    }
    if(q!=null){ input.value=q; syncX(); }
    if(!was||q!=null) render();
    if(document.activeElement!==input) input.focus({preventScroll:true});
  }
  /* hide everything now; the panel's contents stay so a picked photo's file input is still attached while the page reads it */
  function hide(){
    isOpen=false; root.classList.remove('on'); document.body.classList.remove('us-open'); panel.hidden=true; cancel.hidden=true;
    root.style.removeProperty('--us-top'); root.style.removeProperty('--us-h'); if(spacer){ spacer.remove(); spacer=null; }
    input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); input.value=''; syncX(); kb=-1; view=''; status.textContent='';
    if(phone()) input.blur();
  }
  function finishPop(){ clearTimeout(popT); const r=popRes; popRes=null; if(r) r(); }
  /* resolves once the history entry we pushed is gone (or after 300 ms), so a navigation right after it is clean */
  function close(){
    if(!isOpen) return closing||Promise.resolve();
    hide();
    if(!pushed) return Promise.resolve();
    pushed=false;
    closing=new Promise(res=>{ popRes=res; popT=setTimeout(finishPop,300); try{ history.back(); }catch(_){ finishPop(); } }).then(()=>{ closing=null; });
    return closing;
  }

  /* ---- keyboard ---- */
  function setKb(i){
    const rows=[...panel.querySelectorAll('.us-row')]; if(!rows.length) return;
    rows.forEach(r=>{ r.classList.remove('kb'); r.removeAttribute('aria-selected'); });
    kb=(i+rows.length)%rows.length; const r=rows[kb]; r.classList.add('kb'); r.setAttribute('aria-selected','true'); input.setAttribute('aria-activedescendant',r.id); r.scrollIntoView({block:'nearest'});
  }

  /* ---- events ---- */
  on(input,'focus',()=>{ if(!isOpen) open(); });
  on(input,'click',()=>{ if(!isOpen) open(); });
  on(input,'input',()=>{ syncX(); if(!isOpen) open(); else schedule(); });
  /* the clear button never takes focus from the field (the phone keyboard stays up) and never closes the layer */
  on(xb,'pointerdown',e=>e.preventDefault());
  on(xb,'mousedown',e=>e.preventDefault());
  on(xb,'click',e=>{ e.preventDefault(); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true})); syncX(); input.focus({preventScroll:true}); });
  on(cancel,'click',()=>{ close(); });
  on(root,'keydown',e=>{
    if(e.isComposing) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      if(e.target!==input&&!(e.target.closest&&e.target.closest('.us-row'))) return;
      e.preventDefault(); if(!isOpen){ open(); return; } setKb(kb<0?(e.key==='ArrowDown'?0:-1):kb+(e.key==='ArrowDown'?1:-1));
    } else if(e.key==='Enter'&&e.target===input&&isOpen){
      e.preventDefault(); const rows=panel.querySelectorAll('.us-row'), r=kb>=0?rows[kb]:(norm(input.value)?rows[0]:null); if(r) r.click();
    }
  });
  on(document,'keydown',e=>{ if(e.key==='Escape'&&isOpen){ e.preventDefault(); close(); } });
  on(document,'pointerdown',e=>{ if(isOpen&&!phone()&&!root.contains(e.target)) close(); });
  on(root,'focusout',e=>{ if(isOpen&&!phone()&&e.relatedTarget&&!root.contains(e.relatedTarget)) close(); });
  on(window,'popstate',()=>{ if(popRes){ finishPop(); return; } if(isOpen&&pushed){ pushed=false; hide(); } });   // Android Back closes the search
  on(window,'pageshow',e=>{ if(!e.persisted) return; pushed=false; finishPop(); if(isOpen) hide(); else{ input.value=''; syncX(); } });   // restored from the back/forward cache: start clean
  if(window.visualViewport){ on(window.visualViewport,'resize',sync); on(window.visualViewport,'scroll',sync); }
  /* a photo picked from a quick row: the page's own listener does the work, we just get out of the way */
  on(panel,'change',e=>{ if(e.target.matches&&e.target.matches('input[data-quick]')) close(); });
  on(panel,'error',e=>{ if(e.target.tagName==='IMG') e.target.remove(); },true);
  on(panel,'animationend',e=>{ if(e.target.classList&&e.target.classList.contains('us-star')) e.target.classList.remove('pop'); },true);
  function remember(){ const q=input.value.trim().replace(/\s+/g,' '); if(!q) return; const n=norm(q); wr([q,...rd().filter(x=>norm(x)!==n)].slice(0,MAX_RECENT)); }
  on(panel,'click',async e=>{
    const t=e.target; if(!t.closest) return;
    if(t.closest('input[data-quick]')) return;   // the click a label passes on to its file input
    const star=t.closest('.us-star');
    if(star){
      const en=shown[+star.dataset.star]; if(!en||!en.togglePin) return;
      let now; try{ now=!!en.togglePin(); }catch(_){ return; }
      en.pinned=now; star.setAttribute('aria-pressed',String(now)); star.setAttribute('aria-label',starLabel(en)); star.innerHTML=now?ic('starFill'):ic('star');
      star.classList.remove('pop'); void star.offsetWidth; star.classList.add('pop'); hap('tick'); return;
    }
    const chip=t.closest('[data-q]');
    if(chip){ input.value=chip.dataset.q; syncX(); input.focus({preventScroll:true}); render(); return; }
    if(t.closest('[data-clear]')){ wr(null); render(); input.focus({preventScroll:true}); return; }
    const more=t.closest('[data-more]');
    if(more){
      const k=more.dataset.more, lim=(GROUPS.find(g=>g[0]===k)||[])[2]||0; expanded.add(k); render({keep:true});
      const first=panel.querySelector(`.us-sec[data-k="${k}"] .us-item:nth-of-type(${lim+1}) .us-row`); if(first&&first.focus) first.focus({preventScroll:true});
      return;
    }
    const row=t.closest('.us-row'); if(!row) return;
    const en=shown[+row.dataset.i]; if(!en) return;
    remember();
    if(en.quick) return;   // the label opens the photo picker itself
    if(en.href){
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;   // let "open in new tab" work
      e.preventDefault(); if(going) return; going=true; await close(); location.href=en.href; setTimeout(()=>{ going=false; },1500); return;
    }
    if(en.run){ e.preventDefault(); if(going) return; going=true; await close(); going=false; try{ en.run(); }catch(err){ console.error(err); } }
  });

  return {
    open, close, refresh(){ if(isOpen) render({keep:true}); },
    destroy(){ ac.abort(); status.remove(); xb.remove(); if(isOpen) hide(); input.removeAttribute('aria-controls'); input.removeAttribute('aria-expanded'); }
  };
}

window.StudioSearch={
  init(cfg){ if(cur) cur.destroy(); cur=make(cfg); return cur; },
  refresh(){ if(cur) cur.refresh(); },
  open(q){ if(cur) cur.open(q); },
  close(){ return cur?cur.close():Promise.resolve(); }
};
})();

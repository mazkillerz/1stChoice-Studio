/* Studio content calendar (brand-agnostic, behind the "team" preview flag). Lazy-loaded the first time #calendar opens.
   StudioCalendar.init({root,brand,cloud,member,signIn,netDown,esc,haptic,icons,dialog,toast,who,store,onBack,flagOn?}) -> {show({today?,day?}),refresh(),mode}.
   Items live in the cloud (C.calendar / C.saveCalendarItem / C.deleteCalendarItem): {id,brand,day:'YYYY-MM-DD',at:'HH:MM'|null,status,format:'post'|'story'|null,title,caption,hashtags[],design_ids[],campaign_id,author}.
   Phone: a vertical week list (7 day rows, today marked), swipe or arrows for the week, a month toggle (dots per status, tap a day -> that week),
   a visible ⋯ on each item opens its menu (Post now (2.8.0), Mark as posted/ready, Copy caption, Move to tomorrow, Delete), tap an item to edit it (calendar-simple). Computer: month grid with the items inside, drag one to move it.
   The old local "posted" log (if a device kept one) shows as read-only posted items; nothing is migrated or deleted. */
(function(){
'use strict';
const FEEDBASE=(document.currentScript&&document.currentScript.src||'').replace(/calendar\.js.*$/,'');   /* 2.9.0 feed */
/* the sheet's three choices (Ready = 'approved' in the database); 'in_review' is set by the review feature and shown read-only */
const STATUS=[['draft','Draft'],['approved','Ready'],['posted','Posted']];
const SLABEL={draft:'Draft',in_review:'In review',approved:'Ready',posted:'Posted'};
const TIMES=[['09:00','9 am'],['12:00','12 pm'],['19:00','7 pm'],['21:00','9 pm']];
const POST_TOOLS=['carousel','highlight','post'];   // anything else a tool makes is story-shaped (1080×1920)
const MAXCAP=2200;
const LEGACY_KEYS=['POSTED_LOG','studio:postedLog','studio:posted','studio:posted-log'];
const pad=n=>(n<10?'0':'')+n;
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||'')); return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(); };
const addDays=(d,n)=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); return x; };
const weekStart=d=>addDays(d,-d.getDay());   // weeks start on Sunday
const todayIso=()=>iso(new Date());
const L=(d,o)=>d.toLocaleDateString('en',o);
const nrm=s=>window.Studio&&Studio.normText?Studio.normText(s):String(s==null?'':s).toLowerCase().trim();
const fmtTime=t=>{ const m=/^(\d{1,2}):(\d{2})/.exec(String(t||'')); if(!m) return ''; const h=+m[1]; return h>=12?((h%12)||12)+':'+m[2]+' pm':h+':'+m[2]; };
async function copyText(t){ try{ await navigator.clipboard.writeText(t); return true; }catch(_){ try{ const a=document.createElement('textarea'); a.value=t; a.style.cssText='position:fixed;opacity:0'; document.body.appendChild(a); a.select(); const ok=document.execCommand('copy'); a.remove(); return ok; }catch(__){ return false; } } }
const hhmm=t=>t?String(t).slice(0,5):'';
const firstLine=s=>String(s||'').split(/\r?\n/).find(l=>l.trim())||'';
const tagsOf=s=>[...new Set(String(s||'').match(/#[\p{L}\p{N}_]+/gu)||[])];   // #tags typed in the caption
const SVG=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const CAL_IC=SVG('<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 10h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>');
const ICF={post:SVG('<rect x="4" y="4" width="16" height="16" rx="2.5"/>'),story:SVG('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/>'),reel:SVG('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>')};
const FMTS=[['post','Post'],['story','Story'],['reel','Reel']], FNAME={post:'Post',story:'Story',reel:'Reel'};
/* a saved design's shape: the stored format first (2.4.0: Create posts are 1080×1350), else its tool; a highlight cover counts as a post */
const dShape=g=>{ if(!g) return null; const s=window.Studio&&Studio.shapeOf?Studio.shapeOf(g):(POST_TOOLS.includes(g.tool)?'post':'story'); return s==='story'?'story':'post'; };

/* the old local log: a list of {day|date, title|name|text} under one of a few keys; read once, shown read-only */
function legacyItems(brand){
  const out=[];
  for(const k of LEGACY_KEYS){ let v=null; try{ v=JSON.parse(localStorage.getItem(k)||'null'); }catch(_){ v=null; }
    if(v&&!Array.isArray(v)&&Array.isArray(v.items)) v=v.items; if(!Array.isArray(v)) continue;
    v.forEach((r,i)=>{ if(!r||typeof r!=='object') return; const day=String(r.day||r.date||r.at||r.ts||'').slice(0,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      out.push({id:'legacy:'+k+':'+i,brand,day,at:null,status:'posted',title:String(r.title||r.name||r.text||'Posted'),caption:String(r.caption||''),hashtags:[],design_ids:[],legacy:true}); }); }
  return out;
}

/* ---------- the design picker: search and collection chips, one grid; resolves with the picked design or null ---------- */
async function pickSheet(o){
  const esc=o.esc, ic=k=>(o.icons&&o.icons[k])||'', C=o.cloud, urls=o.urls||{}; let list=(o.designs||[]).slice();
  let cols=[]; try{ cols=C&&C.collections?(await C.collections(o.brand))||[]:[]; }catch(_){ cols=[]; }
  const colName=Object.fromEntries(cols.map(c=>[c.id,c.name])), sel=o.selected||[];
  const hayOf=g=>nrm([g.name,String(g.tool||'').replace(/[-_]/g,' '),...(g.collections||[]).map(c=>colName[c]||c)].join(' '));
  let hay=new Map(list.map(g=>[g.id,hayOf(g)])), q='', col='', fail=!!o.fail;
  return new Promise(resolve=>{ let picked=null;
    const d=o.dialog(`<div class="dlg-body cal-pick"><div class="cp-top"><div class="cp-bar"><button type="button" class="cs-x" data-back aria-label="Back">${ic('back')}</button><h3 id="calPH">Pick a design</h3><button type="button" class="link cp-skip" data-skip>${o.skipLabel||'Skip for now'}</button></div>
      <label class="cp-search"><span class="sr-only">Search designs</span>${ic('search')}<input type="search" id="calQ" dir="auto" autocomplete="off" placeholder="Search by name, tool or collection" enterkeyhint="search"></label>
      <div class="chips cp-chips" role="group" aria-label="Collection"><button type="button" class="chip" data-col="" aria-pressed="true">All</button>${cols.map(c=>`<button type="button" class="chip" data-col="${esc(c.id)}" aria-pressed="false" dir="auto">${esc(c.name)}</button>`).join('')}</div></div>
      <div class="cp-grid" id="calG"></div><div class="cp-none" id="calNone" hidden><p class="small" id="calNoneT"></p><button type="button" class="link" id="calRetry" hidden>Try again</button></div></div>`,'cal-dlg cal-full');
    d.setAttribute('aria-labelledby','calPH'); const $=s=>d.querySelector(s);
    const fill=()=>d.querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; });
    const pending=new Set(); let ft=0;
    const flush=()=>{ ft=0; const need=[...pending].filter(p=>!urls[p]); pending.clear(); if(!need.length||!C||!C.fileUrls){ fill(); return; } C.fileUrls(need).then(u=>{ Object.assign(urls,u); fill(); }).catch(()=>{}); };
    const io=typeof IntersectionObserver==='function'?new IntersectionObserver(es=>{ es.forEach(en=>{ if(!en.isIntersecting) return; const im=en.target; io.unobserve(im); const p=im.dataset.path; if(urls[p]) im.src=urls[p]; else if(p){ pending.add(p); clearTimeout(ft); ft=setTimeout(flush,40); } }); },{root:d,rootMargin:'400px 0px'}):null;
    const paint=()=>{ const nq=nrm(q), shown=list.filter(g=>(!col||(g.collections||[]).includes(col))&&(!nq||hay.get(g.id).includes(nq)));
      $('#calG').innerHTML=shown.map(g=>`<button type="button" class="cal-pcard" data-pick="${esc(g.id)}" data-shape="${dShape(g)}" aria-pressed="${sel.includes(g.id)}"><img alt="" decoding="async" data-path="${esc(g.thumb_path||'')}"${urls[g.thumb_path]?` src="${urls[g.thumb_path]}"`:''}><span dir="auto">${esc(g.name)}</span></button>`).join('');
      $('#calNone').hidden=!!shown.length; $('#calNoneT').textContent=list.length?'No designs match. Clear the search or pick All.':fail?'Could not load your saved designs.':'No saved designs yet. Save one from a tool and it shows here.'; $('#calRetry').hidden=!!list.length||!fail||!o.reload;
      d.querySelectorAll('.cal-pcard img').forEach(im=>{ if(im.getAttribute('src')) return; if(io) io.observe(im); else pending.add(im.dataset.path); }); if(!io) flush(); };
    paint();
    $('#calRetry').addEventListener('click',async()=>{ const b=$('#calRetry'); b.disabled=true; try{ list=(await o.reload()).slice(); hay=new Map(list.map(g=>[g.id,hayOf(g)])); fail=false; }catch(_){ fail=true; } b.disabled=false; paint(); });
    $('#calQ').addEventListener('input',e=>{ q=e.target.value; paint(); });
    d.addEventListener('click',e=>{ const t=e.target;
      if(t.closest('[data-back],[data-skip]')){ d.close(); return; }
      let b=t.closest('[data-col]'); if(b){ col=b.dataset.col; d.querySelectorAll('[data-col]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); paint(); return; }
      b=t.closest('[data-pick]'); if(b){ picked=list.find(g=>g.id===b.dataset.pick)||null; d.close(); } });
    d.addEventListener('close',()=>{ if(io) io.disconnect(); resolve(picked); });
  });
}

/* ---------- Add to calendar, fast (2.4.0): from the Save sheet, a design's menu or an idea. Day chips (this week first, More dates),
   optional time, Post / Story / Reel, optional caption, one Save. Resolves with the saved item, or null. ---------- */
function quickSheet(o){
  const esc=o.esc, ic=k=>(o.icons&&o.icons[k])||'', C=o.cloud, g=o.design||null, hap=k=>{ try{ o.haptic&&o.haptic(k); }catch(_){} };
  const today=new Date(), days=[...Array(7)].map((_,i)=>addDays(today,i));
  let day=o.day&&/^\d{4}-\d{2}-\d{2}$/.test(o.day)?o.day:iso(today), at=null, fmt=o.format||(g?dShape(g):null)||'post';
  const cap0=String(o.caption||(g&&g.caption)||'').trim()+((g&&!o.caption&&(g.hashtags||[]).length)?'\n\n'+g.hashtags.join(' '):'');
  const dayLbl=v=>{ const d=parse(v), n=Math.round((d-new Date(today.getFullYear(),today.getMonth(),today.getDate()))/864e5); return n===0?'Today':n===1?'Tomorrow':L(d,{weekday:'short',day:'numeric',month:'short'}); };
  return new Promise(resolve=>{ let done=null;
    const d=o.dialog(`<form class="dlg-body cal-quick" action="#" novalidate>
      <div class="cs-head"><h3 id="cqH">Add to calendar</h3><button type="button" class="cs-x" data-x aria-label="Close">${ic('close')}</button></div>
      ${g?`<div class="cq-design" dir="auto">${g.thumb?`<img alt="" src="${esc(g.thumb)}">`:`<span class="cq-ph">${ic('photo')}</span>`}<b>${esc(g.name||'Your design')}</b></div>`:o.title?`<p class="cq-title" dir="auto"><b>${esc(o.title)}</b></p>`:''}
      <div class="field"><span class="lbl" id="cqDL">Day</span><div class="cq-days" role="group" aria-labelledby="cqDL">${days.map((x,i)=>`<button type="button" class="cq-day" data-day="${iso(x)}" aria-pressed="${iso(x)===day}"><small>${i===0?'Today':L(x,{weekday:'short'})}</small><b><bdi>${x.getDate()}</bdi></b></button>`).join('')}<label class="cq-day cq-more" aria-label="Another day">${ic('next')}<small>More</small><input type="date" id="cqDate" value="${esc(day)}" min="${iso(today)}"></label></div>
        <p class="small cq-picked" id="cqPicked" aria-live="polite"></p></div>
      <div class="field"><span class="lbl" id="cqTL">Time <span class="muted">(optional)</span></span><div class="chips cal-times" role="group" aria-labelledby="cqTL">${TIMES.map(([v,l])=>`<button type="button" class="chip" data-at="${v}" aria-pressed="false">${l.replace(' ','&nbsp;')}</button>`).join('')}<button type="button" class="chip" data-at="other" aria-pressed="false">Other</button></div><input type="time" id="cqAt" aria-label="Time" hidden></div>
      <div class="field"><span class="lbl" id="cqFL">Format</span><div class="cal-fmt cq-fmt" role="group" aria-labelledby="cqFL">${FMTS.map(([k,l])=>`<button type="button" class="cf-btn" data-fmt="${k}" aria-pressed="${fmt===k}">${ICF[k]}<span>${l}</span></button>`).join('')}</div></div>
      <div class="field"><label class="lbl" for="cqCap">Caption <span class="muted">(optional)</span></label><textarea id="cqCap" class="cal-ta" dir="auto" rows="2" placeholder="Write or paste the caption">${esc(cap0)}</textarea></div>
      <div class="status" id="cqSt" role="status"></div>
      <button type="submit" class="btn" id="cqSave">Add</button></form>`,'cal-dlg cal-quick-dlg');
    d.setAttribute('aria-labelledby','cqH'); const $=s=>d.querySelector(s);
    const paintDay=()=>{ d.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day===day))); const inWeek=days.some(x=>iso(x)===day);
      $('.cq-more').classList.toggle('on',!inWeek); $('#cqPicked').innerHTML=inWeek?'':'<bdi>'+esc(L(parse(day),{weekday:'long',day:'numeric',month:'long'}))+'</bdi>'; $('#cqSave').textContent='Add to '+dayLbl(day); };
    paintDay();
    d.addEventListener('click',e=>{ const t=e.target;
      if(t.closest('[data-x]')){ d.close(); return; }
      let b=t.closest('[data-day]'); if(b){ day=b.dataset.day; $('#cqDate').value=day; hap('tick'); paintDay(); return; }
      b=t.closest('[data-fmt]'); if(b){ fmt=b.dataset.fmt; d.querySelectorAll('[data-fmt]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); return; }
      b=t.closest('[data-at]'); if(b){ const v=b.dataset.at, on=b.getAttribute('aria-pressed')==='true'; d.querySelectorAll('[data-at]').forEach(x=>x.setAttribute('aria-pressed','false'));
        if(v==='other'){ b.setAttribute('aria-pressed','true'); $('#cqAt').hidden=false; $('#cqAt').focus(); at=$('#cqAt').value||null; return; }
        $('#cqAt').hidden=true; $('#cqAt').value=''; at=on?null:v; if(!on) b.setAttribute('aria-pressed','true'); } });
    const more=$('.cq-more'), di=$('#cqDate');
    more.addEventListener('click',e=>{ if(e.target===di) return; e.preventDefault(); try{ di.showPicker(); }catch(_){ di.focus(); di.click(); } });
    di.addEventListener('change',()=>{ if(/^\d{4}-\d{2}-\d{2}$/.test(di.value)){ day=di.value; paintDay(); } });
    $('#cqAt').addEventListener('input',()=>{ at=$('#cqAt').value||null; });
    d.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault(); const sv=$('#cqSave'); sv.disabled=true; $('#cqSt').textContent='Saving…';
      const caption=$('#cqCap').value, title=(g&&g.name)||o.title||firstLine(caption).slice(0,60)||FNAME[fmt];
      const row={brand:o.brand,day,at,status:'draft',format:fmt,title,caption,hashtags:tagsOf(caption),design_ids:g&&g.id?[g.id]:[],campaign_id:null,author:(o.who&&o.who())||null};
      try{ done=await C.saveCalendarItem(row); hap('success'); d.close(); o.toast&&o.toast('Added to the calendar · '+dayLbl(day)+(at?' '+fmtTime(at):'')); }
      catch(err){ sv.disabled=false; $('#cqSt').textContent='Could not save: '+(err.message||err)+' Try again.'; } });
    d.addEventListener('close',()=>resolve(done));
  });
}

function make(o){
  const root=o.root, esc=o.esc, ic=k=>(o.icons&&o.icons[k])||'', hap=k=>{ try{ o.haptic&&o.haptic(k); }catch(_){} };
  const rd=k=>{ try{ return o.store?o.store(k):null; }catch(_){ return null; } }, wr=(k,v)=>{ try{ o.store&&o.store(k,v); }catch(_){} };
  const wide=()=>matchMedia('(min-width:821px)').matches;
  let C=null, mode=(['week','month','feed'/* 2.9.0 feed */].includes(rd('studio:calMode'))?rd('studio:calMode'):(wide()?'month':'week')), anchor=new Date();
  let stale=false, dataAt=0, ringDay=null, ringT=0;
  let pool=[], win=null, fetchedAt=0, lastSig='', items=[], designs=[], designsFail=false, urls={}, state='loading', note='', run=0, slowT=0, built=false, toToday=false;
  const range=()=>{ if(mode==='feed') return window.StudioFeed?StudioFeed.range():[addDays(new Date(),-60),addDays(new Date(),90)]; /* 2.9.0 feed */
    if(mode==='week'){ const s=weekStart(anchor); return [s,addDays(s,6)]; }
    const f=new Date(anchor.getFullYear(),anchor.getMonth(),1), s=weekStart(f); return [s,addDays(s,41)]; };
  /* shell mode: the pane is its own scroller (no window scroll, no swipe, no back button / tabs) */
  const sh=!!o.shell, sy=()=>sh?root.scrollTop:scrollY, sTo=y=>{ if(sh) root.scrollTop=y; else scrollTo({top:y,behavior:'instant'}); };
  const calm=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){ return false; } };
  /* the cache: everything fetched for one wide window (60 days back to 120 ahead, or around a far range); a view inside it draws at once */
  const TTL=30000;
  const winFor=(a,b)=>{ const t=new Date(), da=iso(addDays(t,-60)), db=iso(addDays(t,120)), ia=iso(a), ib=iso(b); return (ia>=da&&ib<=db)?[da,db]:[iso(addDays(a,-60)),iso(addDays(b,60))]; };
  const covers=(a,b)=>!!win&&iso(a)>=win[0]&&iso(b)<=win[1];
  const slice=()=>{ const [a,b]=range(), lo=iso(a), hi=iso(b); return pool.filter(x=>x.day>=lo&&x.day<=hi).concat(legacyItems(o.brand).filter(x=>x.day>=lo&&x.day<=hi)); };
  const sigNow=()=>{ const [a,b]=range(); return JSON.stringify([iso(a),iso(b),mode,items,designs.map(d=>d.id+d.updated_at)]); };
  const designOf=id=>designs.find(d=>d.id===id);
  const shapeOf=dShape;
  const fmtOf=it=>it.format||shapeOf(it.design_ids.map(designOf).find(Boolean))||'post';
  const capOf=it=>{ const g=dCap(it); return String(it.caption||(g&&g.caption)||'').trim(); };
  /* captions (mega 4.3): a linked design's caption stands in for an item that has none (shown on the card; the sheet offers "Use the design's caption") */
  const dCap=it=>{ for(const id of (it.design_ids||[])){ const g=designOf(id); if(g&&String(g.caption||'').trim()) return g; } return null; };
  /* /captions (mega) */
  const againBtn='<button type="button" class="btn slim" data-cal-reload>Try again</button>';
  const noteBox=(icn,title,text,btn)=>`<div class="sv-note cal-note"><span class="sn-ic" aria-hidden="true">${icn}</span><div class="sn-txt"><b>${title}</b><p>${text}</p></div>${btn||''}</div>`;
  const authorName=()=>{ try{ return (o.who&&o.who.author&&o.who.author())||null; }catch(_){ return null; } };

  /* ---------- instant plan (Session 7): the last good data lives on this device and paints at once; fresh data replaces it quietly ---------- */
  const CKEY='studio:plan:cal:'+o.brand;
  const shapeRows=list=>list.map(x=>({...x,at:hhmm(x.at)||null,hashtags:x.hashtags||[],design_ids:x.design_ids||[]}));
  const slimD=d=>({id:d.id,name:d.name,tool:d.tool,kind:d.kind,format:d.format,thumb_path:d.thumb_path,caption:d.caption,hashtags:d.hashtags,campaign_id:d.campaign_id,updated_at:d.updated_at,collections:d.collections,words:d.words});
  const saveCache=(list,w)=>{ wr(CKEY,{v:1,at:Date.now(),from:w[0],to:w[1],items:list,designs:designs.map(slimD)}); };
  { const c=rd(CKEY); if(c&&c.v===1&&Array.isArray(c.items)&&c.from&&c.to){ pool=shapeRows(c.items); designs=Array.isArray(c.designs)?c.designs:[]; win=[c.from,c.to]; dataAt=+c.at||0; fetchedAt=0; items=slice(); lastSig=sigNow(); state='ok'; } }
  const ago=t=>{ const m=Math.max(0,Math.round((Date.now()-t)/60000)); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+(m<2880?' day ago':' days ago'); };
  function paintStale(){ const el=root.querySelector('.cal-stale'); if(!el) return; const on=stale&&state==='ok'&&dataAt>0; el.hidden=!on; if(on) el.innerHTML='Updated <bdi>'+ago(dataAt)+'</bdi>'; }
  window.addEventListener('online',()=>{ if(built&&stale) load(); });
  /* the soft ring on a day card (search jumps here): fades over 1.2 s; reduced motion keeps it still for the same time */
  function ringIt(){ if(!ringDay) return; const el=root.querySelector('[data-day="'+ringDay+'"]'); if(!el||state!=='ok') return; ringDay=null;
    if(sh){ const r=el.getBoundingClientRect(), p=root.getBoundingClientRect(); sTo(Math.max(0,sy()+r.top-p.top-120)); } else el.scrollIntoView({block:'center'});
    root.querySelectorAll('.cal-ring').forEach(x=>x.classList.remove('cal-ring')); void el.offsetWidth; el.classList.add('cal-ring'); clearTimeout(ringT); ringT=setTimeout(()=>{ el.classList.remove('cal-ring'); },1250); }

  /* ---------- load ---------- */
  async function load(opt){
    opt=opt||{}; const my=++run; clearTimeout(slowT); const [a,b]=range();
    if(state!=='ok'){ state='loading'; draw(); }
    slowT=setTimeout(()=>{ if(my===run&&state!=='ok'){ state='slow'; draw(); } },8000);
    try{
      if(navigator.onLine===false) throw Object.assign(new Error('No connection. Check your internet and try again.'),{offline:true});
      if(mode==='feed'&&!window.StudioFeed) await loadFeed(); /* 2.9.0 feed */
      C=await o.cloud(); if(my!==run) return;
      if(!(await o.member())){ wr(CKEY,null); pool=[]; items=[]; stale=false; state='out'; draw(); return; }
      const w=winFor(a,b);
      const [list,dl]=await Promise.all([C.calendar(o.brand,{from:w[0],to:w[1]}),C.designs?C.designs(o.brand).then(r=>{ designsFail=false; return r; },()=>{ designsFail=true; return designs; }):designs]); if(my!==run) return;
      designs=dl||[];
      pool=shapeRows(list); win=w; fetchedAt=Date.now(); dataAt=fetchedAt; stale=false; saveCache(list,w);
      items=slice();
      /* 2.5.0 (owner: "it flickers like it refreshes"): redraw only when something changed since what is on screen */
      const sig=sigNow(); const same=state==='ok'&&sig===lastSig; lastSig=sig; state='ok'; if(!same) draw(opt.dir); else paintStale();
      ringIt();
      if(toToday){ toToday=false; const t=root.querySelector('.cal-day.today'); if(t&&!wide()) t.scrollIntoView({block:'start'}); }
      thumbsFor();
    }catch(err){ if(my!==run) return; const net=o.netDown(err), slow=net&&/slow/i.test(err.message||'');
      if(state==='ok'&&net&&dataAt>0){ stale=true; paintStale(); return; }
      if(state==='ok'){ o.toast(net?(slow?'The connection is slow. This is the calendar from before.':'You’re offline. This is the calendar from before.'):'Could not refresh the calendar: '+(err.message||err)); return; }
      state=net?(slow?'slow':'offline'):'error'; note=err.message||String(err); draw(); }
    finally{ if(my===run) clearTimeout(slowT); }
  }
  function thumbsFor(){ const need=[...new Set(items.flatMap(x=>x.design_ids).map(designOf).filter(Boolean).map(d=>d.thumb_path).filter(p=>p&&!urls[p]))];
    if(need.length&&C&&C.fileUrls) C.fileUrls(need).then(u=>{ Object.assign(urls,u); fillThumbs(); }).catch(()=>{}); }
  /* switching view or week: draw from the cache at once, then refresh in the background only when the data is old (never a loading state when the cache has it) */
  function view(dir){
    const [a,b]=range();
    if(state==='ok'&&covers(a,b)){
      const go=()=>{ items=slice(); lastSig=sigNow(); draw(dir); thumbsFor(); if(Date.now()-fetchedAt>TTL) load(); };
      if(mode==='feed'&&!window.StudioFeed){ loadFeed().then(go,()=>load()); return; }
      go(); return; }
    load({dir});
  }
  function preloadFeed(){ if(window.StudioFeed) return; const f=()=>{ loadFeed().catch(()=>{}); }; if(window.requestIdleCallback) requestIdleCallback(f,{timeout:3000}); else setTimeout(f,1200); }
  /* 2.9.0 feed: the Feed view lives in assets/feed.js (+ feed.css), loaded the first time it is chosen */
  let feedP=null;
  function loadFeed(){ if(window.StudioFeed) return Promise.resolve(); if(!document.getElementById('lz-feed')){ const l=document.createElement('link'); l.id='lz-feed'; l.rel='stylesheet'; l.href=FEEDBASE+'feed.css'; document.head.appendChild(l); }
    if(feedP) return feedP; return feedP=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=FEEDBASE+'feed.js'; s.onload=()=>res(); s.onerror=()=>{ feedP=null; s.remove(); rej(Object.assign(new Error('Could not load the feed. Check the connection.'),{offline:true})); }; document.head.appendChild(s); }); }
  const feedHtml=()=>StudioFeed.html({items,designOf,urls,esc,fmtOf,todayIso:todayIso(),plus:ic('plus'),fmtIcon:k=>ICF[k],dayLabel:k=>L(parse(k),{day:'numeric',month:'short'})});
  /* /2.9.0 feed */
  function fillThumbs(){ root.querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; }); }

  /* ---------- drawing ---------- */
  const title=()=>{ const [a,b]=range(); if(mode==='feed') return 'Profile preview'; /* 2.9.0 feed */
    if(mode==='month') return L(anchor,{month:'long',year:'numeric'});
    return a.getMonth()===b.getMonth()?L(a,{day:'numeric',month:'short'})+' – '+L(b,{day:'numeric'}):L(a,{day:'numeric',month:'short'})+' – '+L(b,{day:'numeric',month:'short'}); };
  /* a linked design opens from its picture (2.1.2): anyone on the team can see the design itself */
  const designHref=(id,tool)=>'tools/'+encodeURIComponent(tool)+'.html?design='+encodeURIComponent(id);
  const thumbs=it=>{ const ds=it.design_ids.map(designOf).filter(Boolean); return ds.length?`<span class="ci-thumbs">${ds.map(d=>`<img alt="Open the design" title="Open the design" data-design="${esc(d.id)}" data-tool="${esc(d.tool||'')}" decoding="async" data-path="${esc(d.thumb_path||'')}"${urls[d.thumb_path]?` src="${urls[d.thumb_path]}"`:''}>`).join('')}</span>`:''; };
  const chip=s=>`<span class="cal-chip st-${s}">${esc(SLABEL[s]||s)}</span>`;
  const card=it=>{ const ro=!!it.legacy, cap=capOf(it), f=fmtOf(it), t0=firstLine(cap).slice(0,60);
    const showTitle=!cap||it.title!==t0;   // a title made from the caption's first line would only repeat it
    return `<article class="cal-item st-${it.status}${ro?' ro':''}" data-id="${esc(it.id)}"${ro?'':' draggable="true"'}>
      <button type="button" class="ci-main" data-open="${esc(it.id)}"${ro?' disabled':''}>
        <span class="ci-top"><span class="ci-fmt" role="img" aria-label="${FNAME[f]||'Post'}">${ICF[f]||ICF.post}</span>${it.at?`<bdi class="ci-time">${esc(fmtTime(it.at))}</bdi>`:''}${chip(it.status)}</span>
        <span class="ci-body">${thumbs(it)}<span class="ci-txt">${showTitle?`<b class="ci-title" dir="auto">${esc(it.title||'Untitled')}</b>`:''}${cap?`<span class="ci-cap" dir="auto">${esc(cap)}</span>`:''}${ro?'<span class="ci-note">From the old posted log</span>':''}</span></span>
      </button>${ro?'':`<button type="button" class="ci-more" data-more="${esc(it.id)}" aria-label="Options for ${esc(it.title||'this item')}">${ic('more')}</button>${cap?`<button type="button" class="ci-copy" data-copy="${esc(it.id)}">Copy caption</button>`:''}`}</article>`; };
  const pill=it=>`<button type="button" class="cal-pill st-${it.status}${it.legacy?' ro':''}" data-open="${esc(it.id)}" data-id="${esc(it.id)}"${it.legacy?' disabled':' draggable="true"'} dir="auto"><i aria-hidden="true"></i>${esc(it.title||'Untitled')}</button>`;
  const byDay=()=>{ const m={}; items.forEach(x=>{ (m[x.day]=m[x.day]||[]).push(x); }); Object.values(m).forEach(l=>l.sort((a,b)=>(a.at||'').localeCompare(b.at||''))); return m; };
  function weekHtml(){ const s=weekStart(anchor), m=byDay(), t=todayIso();
    return `<div class="cal-week">${Array.from({length:7},(_,i)=>{ const d=addDays(s,i), k=iso(d), list=m[k]||[];
      return `<section class="cal-day${k===t?' today':''}" data-day="${k}" aria-label="${esc(L(d,{weekday:'long',day:'numeric',month:'long'}))}"${k===t?' aria-current="date"':''}>
        <header class="cd-head"><span class="cd-name">${esc(L(d,{weekday:'short'}))}</span><span class="cd-num">${d.getDate()}</span>${k===t?'<em class="cd-today">Today</em>':''}
          <button type="button" class="cd-add" data-add="${k}" aria-label="Add to ${esc(L(d,{weekday:'long',day:'numeric',month:'long'}))}">${ic('plus')}</button></header>
        ${list.length?`<div class="cd-items">${list.map(card).join('')}</div>`:''}</section>`; }).join('')}</div>`; }
  function monthHtml(){ const [a]=range(), m=byDay(), t=todayIso(), cur=anchor.getMonth();
    const head=Array.from({length:7},(_,i)=>`<span>${esc(L(addDays(a,i),{weekday:'short'}))}</span>`).join('');
    const cells=Array.from({length:42},(_,i)=>{ const d=addDays(a,i), k=iso(d), list=m[k]||[], out=d.getMonth()!==cur;
      const dots=[...new Set(list.map(x=>x.status))].map(s=>`<i class="dot st-${s}"></i>`).join('');
      return `<div class="cal-cell${k===t?' today':''}${out?' out':''}" data-day="${k}"><button type="button" class="cc-num" data-week="${k}" aria-label="${esc(L(d,{weekday:'long',day:'numeric',month:'long'}))}${list.length?', '+list.length+(list.length===1?' item':' items'):''}">${d.getDate()}<span class="cc-dots" aria-hidden="true">${dots}</span></button>
        ${list.length?`<div class="cc-items">${list.slice(0,3).map(pill).join('')}${list.length>3?`<button type="button" class="cc-more" data-week="${k}">+${list.length-3} more</button>`:''}</div>`:''}</div>`; }).join('');
    return `<div class="cal-month"><div class="cm-head" aria-hidden="true">${head}</div><div class="cm-grid">${cells}</div></div>`; }
  /* the frame (top bar with the sliding Week | Month | Feed pill, arrows, title) is built once; only its text and the body change */
  let navEls=[];
  function frame(){
    if(root.querySelector(':scope>.cal-top')) return;
    const newBtn=`<button type="button" class="mini solid cal-new" data-add="${todayIso()}">${ic('plus')}<span>New</span></button>`,
      segH=`<div class="cal-seg" role="group" aria-label="View"><span class="cs-pill" aria-hidden="true"></span><button type="button" class="chip" data-mode="week">Week</button><button type="button" class="chip" data-mode="month">Month</button><button type="button" class="chip" data-mode="feed">Feed</button></div>`,
      navH=`<div class="cal-nav"><button type="button" class="cal-arrow" data-nav="-1">${ic('back')}</button><button type="button" class="cal-today" data-nav="0">Today</button><strong class="cal-title" aria-live="polite"></strong><button type="button" class="cal-arrow" data-nav="1">${ic('next')}</button></div>`;
    root.innerHTML=(sh
      ?`<div class="cal-top cal-top-shell"><h1 id="calH" class="sr-only" tabindex="-1">Calendar</h1><div class="cal-bar">${segH}</div><div class="cal-bar">${navH}</div><span hidden>${newBtn}</span><p class="cal-stale" role="status" hidden></p></div>`
      :`<div class="cal-top"><div class="cal-head"><button type="button" class="sp-back" data-cal-back aria-label="Back to home">${ic('back')}</button>
        <div class="sp-title"><h1 id="calH" tabindex="-1">Calendar</h1></div>${newBtn}</div>${o.tabs||''}
      <div class="cal-bar">${segH}${navH}</div><p class="cal-stale" role="status" hidden></p></div>`)+`<div class="cal-stage"><div class="cal-body"></div></div>`;
    navEls=[...root.querySelectorAll('.cal-nav>*')]; const seg=root.querySelector('.cal-seg'); if(window.ResizeObserver) new ResizeObserver(()=>slidePill(false)).observe(seg);
  }
  function slidePill(anim){ const seg=root.querySelector('.cal-seg'), p=seg&&seg.querySelector('.cs-pill'), on=seg&&seg.querySelector('[aria-pressed="true"]'); if(!p||!on||!on.offsetWidth) return;
    if(!anim||calm()){ p.style.transition='none'; } p.style.width=on.offsetWidth+'px'; p.style.transform='translateX('+on.offsetLeft+'px)';
    if(!anim||calm()){ p.getBoundingClientRect(); p.style.transition=''; } }
  function paintTop(live,here){
    root.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===mode)));
    const feed=mode==='feed', mo=mode==='month';
    const nav=root.querySelector('.cal-nav'), [pv,td,ttl,nx]=navEls; /* present only when they apply (no hidden controls); kept nodes keep focus */
    const put=(el,want,before)=>{ if(want&&!el.isConnected) nav.insertBefore(el,before||null); else if(!want&&el.isConnected) el.remove(); };
    put(pv,!feed,nav.firstChild); put(td,!here,ttl); put(nx,!feed,null);
    pv.setAttribute('aria-label',mo?'Previous month':'Previous week'); nx.setAttribute('aria-label',mo?'Next month':'Next week');
    root.querySelector('.cal-title').textContent=title();
    const nw=root.querySelector('.cal-new'); nw.dataset.add=here?todayIso():iso(anchor); nw.disabled=!live;
  }
  /* dir: undefined = no animation; 0 = crossfade; +-1 = a short slide in the direction of travel. The old body is swapped out at once, then the new one fades in (never both visible). */
  function draw(dir){
    const keepY=sy(); frame();
    const body=state==='ok'&&mode==='feed'&&!window.StudioFeed?'<div class="cal-skel" aria-hidden="true">'+'<span></span>'.repeat(5)+'</div>'   /* the cached data is here, the Feed view's own script is not yet */
      :state==='ok'?(mode==='feed'?feedHtml():mode==='month'?monthHtml():weekHtml()) /* 2.9.0 feed */
      :state==='loading'?'<div class="cal-skel" aria-hidden="true">'+'<span></span>'.repeat(5)+'</div>'
      :state==='offline'?noteBox(ic('clock'),'You’re offline','You can still make and save pictures. Your calendar comes back when you’re online.',againBtn)
      :state==='slow'?noteBox(ic('clock'),'Still loading…','The connection is slow. Your calendar shows as soon as it arrives.',againBtn)
      :state==='out'?noteBox(CAL_IC,'The calendar is for your team','Sign in to plan and see your team’s posts.','<button type="button" class="btn slim" data-cal-signin>Sign in</button>')
      :noteBox(ic('rotate'),'Could not load the calendar',esc(note),againBtn);
    const live=state==='ok';
    const [ra,rb]=range(), here=mode==='month'?(anchor.getFullYear()===new Date().getFullYear()&&anchor.getMonth()===new Date().getMonth()):(todayIso()>=iso(ra)&&todayIso()<=iso(rb))||mode==='feed';
    paintTop(live,here); paintStale(); slidePill(dir!==undefined);
    const stage=root.querySelector('.cal-stage'), el=root.querySelector('.cal-body'), h0=stage.offsetHeight;
    if(dir!==undefined&&!calm()){ stage.style.minHeight=h0+'px'; clearTimeout(stage._t); stage._t=setTimeout(()=>{ stage.style.minHeight=''; },260); }
    el.innerHTML=body;
    sTo(keepY);
    if(dir!==undefined&&!calm()&&el.animate&&live){ try{ el.getAnimations().forEach(x=>x.cancel());
      el.animate(dir?[{opacity:0,transform:'translateX('+(12*dir)+'px)'},{opacity:1,transform:'none'}]:[{opacity:0},{opacity:1}],{duration:dir?180:160,easing:'cubic-bezier(.2,.8,.2,1)'}); }catch(_){} }
    ringIt();
  }
  function go(n){ if(mode==='feed') return; /* 2.9.0 feed */ const was=anchor.getTime(); if(n===0) anchor=new Date(); else if(mode==='month') anchor=new Date(anchor.getFullYear(),anchor.getMonth()+n,1); else anchor=addDays(anchor,7*n); hap('tick'); view(n||(anchor.getTime()>was?1:anchor.getTime()<was?-1:0)); }
  function setMode(m,day){ if(m===mode&&!day) return; if(day) anchor=parse(day); mode=m; wr('studio:calMode',m); hap('tick'); view(0); }

  /* ---------- save, move, status, delete ---------- */
  const keep=it=>({id:it.id,brand:o.brand,day:it.day,at:it.at||null,status:it.status,format:it.format||null,title:it.title||'',caption:it.caption||'',hashtags:it.hashtags||[],design_ids:it.design_ids||[],campaign_id:it.campaign_id||null,author:it.author||null});
  async function persist(it,msg){ try{ await C.saveCalendarItem(keep(it)); if(msg) o.toast(msg); }catch(err){ o.toast('Could not save: '+(err.message||err)); } await load(); }
  async function move(id,day){ const it=items.find(x=>x.id===id); if(!it||it.legacy||it.day===day) return; const was=it.day; it.day=day; draw(); fillThumbs();
    try{ await C.saveCalendarItem(keep(it)); o.toast('Moved to '+L(parse(day),{weekday:'short',day:'numeric',month:'short'})+'.'); }catch(err){ it.day=was; o.toast('Could not move it: '+(err.message||err)); }
    await load(); }
  async function whoOnce(){ if(authorName()||rd('studio:calWhoAsked')||navigator.webdriver||!o.who||!o.who.ask) return; wr('studio:calWhoAsked',1); try{ await o.who.ask({user:true,brand:o.brand}); }catch(_){} }

  /* ---------- the "Plan a post" sheet (add + edit): Post/Story, design, day + time, caption, status, one Save ---------- */
  const titleFor=(it)=>{ const g=it.design_ids.map(designOf).find(Boolean); return (g&&g.name)||firstLine(it.caption).slice(0,60)||(it.format==='story'?'Story':'Post'); };
  const tileHtml=it=>{ const ds=it.design_ids.map(designOf).filter(Boolean);
    if(it.design_ids.length&&!ds.length) return `<span class="ct-ph">${ic('photo')}</span><span class="ct-txt"><b>A design</b><small>Change</small></span>`;
    return ds.length?`<span class="ct-thumbs">${ds.map(g=>`<img alt="" data-path="${esc(g.thumb_path||'')}"${urls[g.thumb_path]?` src="${urls[g.thumb_path]}"`:''}>`).join('')}</span><span class="ct-txt"><b dir="auto">${esc(ds.map(g=>g.name).join(', '))}</b><small>Change</small></span>`
      :`<span class="ct-ph">${ic('photo')}</span><span class="ct-txt"><b>Pick a design</b><small>From your saved designs</small></span>`; };
  function editSheet(src,dayHint){
    const isNew=!src, it=src?{...src,design_ids:[...src.design_ids],hashtags:[...src.hashtags]}:{day:dayHint||todayIso(),at:'19:00',status:'draft',format:null,title:'',caption:'',hashtags:[],design_ids:[]};
    if(!it.format&&!isNew) it.format=null;
    let fmt=it.format||(isNew?null:fmtOf(it));
    const quick=TIMES.some(t=>t[0]===it.at), other=!!it.at&&!quick;
    const d=o.dialog(`<form class="dlg-body cal-sheet" action="#" novalidate>
      <div class="cs-head"><h3 id="calEH">${(isNew?'Plan a ':'Edit ')+(FNAME[it.format]||'Post').toLowerCase()}</h3><button type="button" class="cs-x" id="calCancel" aria-label="Close">${ic('close')}</button></div>
      <div class="field"><span class="lbl" id="calFL">Format</span><div class="cal-fmt" role="group" aria-labelledby="calFL">${FMTS.map(([k,l])=>`<button type="button" class="cf-btn" data-fmt="${k}" aria-pressed="${fmt===k}">${ICF[k]}<span>${l}</span></button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Design</span><button type="button" class="cal-tile" id="calPick" aria-haspopup="dialog"></button><div class="cal-dlinks"><a class="link" id="calOpenD" hidden>Open design</a><button type="button" class="link" id="calSkip" hidden>Remove design</button></div></div>
      <div class="field"><span class="lbl">Day and time</span><div class="cal-when"><label class="cal-daypill" for="calDay"><span id="calDayTxt"></span><input type="date" id="calDay" required value="${esc(it.day)}" aria-label="Day"></label>
        <div class="chips cal-times" role="group" aria-label="Time">${TIMES.map(([v,l])=>`<button type="button" class="chip" data-at="${v}" aria-pressed="${it.at===v}">${l.replace(' ','&nbsp;')}</button>`).join('')}<button type="button" class="chip" data-at="other" aria-pressed="${other}">Other</button></div>
        <input type="time" id="calAt" aria-label="Time" value="${esc(other?it.at:'')}"${other?'':' hidden'}></div></div>
      <div class="field"><label class="lbl" for="calCap">Caption</label><textarea id="calCap" class="cal-ta" dir="auto" rows="3" placeholder="Write or paste the caption">${esc(it.caption)}</textarea><div class="cal-count small" id="calCount" aria-live="off"></div></div>
      <div class="field"><span class="lbl" id="calStL">Status</span>${it.status==='in_review'?'<p class="small cal-rev">In review</p>':''}<div class="cal-seg3" role="group" aria-labelledby="calStL">${STATUS.map(([k,l])=>`<button type="button" class="cs3" data-st="${k}" aria-pressed="${it.status===k}">${l}</button>`).join('')}</div></div>
      <div class="status" id="calSt" role="status"></div>
      <div class="cal-foot"><button type="submit" class="btn" id="calSave">Save</button>${isNew?'':'<button type="button" class="link danger-link" id="calDel">Delete this post</button>'}</div></form>`,'cal-dlg cal-edit');
    d.setAttribute('aria-labelledby','calEH'); const $=s=>d.querySelector(s), st=t=>{ $('#calSt').textContent=t; };
    const dayTxt=()=>{ const v=$('#calDay').value; $('#calDayTxt').innerHTML=/^\d{4}-\d{2}-\d{2}$/.test(v)?'<bdi>'+esc(L(parse(v),{weekday:'short',day:'numeric',month:'short'}))+'</bdi>':'Pick a day'; };
    const paintTile=()=>{ $('#calPick').innerHTML=tileHtml(it); $('#calSkip').hidden=!it.design_ids.length; { const g=it.design_ids.map(designOf).find(Boolean), a=$('#calOpenD'); a.hidden=!(g&&g.tool); if(g&&g.tool) a.href=designHref(g.id,g.tool); } fillThumbsIn(d); };
    const count=()=>{ const n=$('#calCap').value.length; const c=$('#calCount'); c.innerHTML=`<bdi>${n.toLocaleString('en')}</bdi> / ${MAXCAP.toLocaleString('en')}`; c.classList.toggle('over',n>MAXCAP); };
    const grow=()=>{ const t=$('#calCap'); t.style.height='auto'; t.style.height=Math.min(t.scrollHeight+2,Math.round(parseFloat(getComputedStyle(t).lineHeight||24)*8+24))+'px'; };
    dayTxt(); paintTile(); count(); setTimeout(grow,0);
    $('#calDay').addEventListener('input',dayTxt); $('#calDay').addEventListener('change',dayTxt);
    $('#calCap').addEventListener('input',()=>{ count(); grow(); });
    d.querySelectorAll('[data-fmt]').forEach(b=>b.onclick=()=>{ fmt=b.dataset.fmt; const h=d.querySelector('#calEH'); if(h) h.textContent=(isNew?'Plan a ':'Edit ')+(FNAME[fmt]||'Post').toLowerCase(); d.querySelectorAll('[data-fmt]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
    d.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ it.status=b.dataset.st; d.querySelectorAll('[data-st]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
    d.querySelectorAll('[data-at]').forEach(b=>b.onclick=()=>{ const v=b.dataset.at, on=b.getAttribute('aria-pressed')==='true';
      d.querySelectorAll('[data-at]').forEach(x=>x.setAttribute('aria-pressed','false'));
      if(v==='other'){ b.setAttribute('aria-pressed','true'); $('#calAt').hidden=false; $('#calAt').focus(); it.at=$('#calAt').value||null; return; }
      $('#calAt').hidden=true; $('#calAt').value=''; if(on){ it.at=null; return; } b.setAttribute('aria-pressed','true'); it.at=v; });
    $('#calAt').addEventListener('input',()=>{ it.at=$('#calAt').value||null; });
    $('#calPick').onclick=()=>pickDesign(it,fmt,id=>{ it.design_ids=[id]; const g=designOf(id);
      if(g&&!$('#calCap').value.trim()&&String(g.caption||'').trim()){ $('#calCap').value=g.caption+((g.hashtags||[]).length?'\n\n'+g.hashtags.join(' '):''); count(); grow(); }
      paintTile(); });
    $('#calSkip').onclick=()=>{ it.design_ids=[]; paintTile(); };
    $('#calCancel').onclick=()=>d.close();
    const del=$('#calDel'); if(del) del.onclick=()=>{ d.close(); confirmDelete(src); };
    d.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault();
      const day=$('#calDay').value;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return st('Pick a day.'); if(!fmt) return st('Choose Post, Story or Reel.');
      const sv=$('#calSave'); sv.disabled=true; st('Saving…');
      await whoOnce();
      const caption=$('#calCap').value, row={...it,day,format:fmt,caption,hashtags:tagsOf(caption),author:it.author||authorName()||null}; row.title=titleFor({...row});
      try{ await C.saveCalendarItem(keep(row)); d.close(); anchor=parse(day); o.toast('Saved'); hap('tick'); await load(); }
      catch(err){ sv.disabled=false; st('Could not save: '+(err.message||err)+' Try again.'); } });
    return d;
  }
  function fillThumbsIn(d){ d.querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; }); }

  /* the full-screen design picker (module level since 2.4.0, so Ideas can use it too) */
  function pickDesign(it,fmt,done){
    pickSheet({dialog:o.dialog,esc,icons:o.icons,cloud:C,brand:o.brand,designs,urls,selected:it.design_ids,fail:designsFail,
      reload:async()=>{ const r=await C.designs(o.brand); designs=r||[]; designsFail=false; return designs; }}).then(g=>{ if(g) done(g.id); });
  }
  function confirmDelete(it){
    const d=o.dialog(`<div class="dlg-body"><h3 id="calDH">Delete this post?</h3><p dir="auto">“${esc(it.title||'Untitled')}” will be removed from the calendar for everyone.</p>
      <div class="dlg-actions"><button type="button" class="mini" data-no>Cancel</button><button type="button" class="btn danger" data-yes>Delete</button></div></div>`,'cal-dlg');
    d.setAttribute('aria-labelledby','calDH'); d.querySelector('[data-no]').onclick=()=>d.close();
    d.querySelector('[data-yes]').onclick=async()=>{ d.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{ await C.deleteCalendarItem(it.id); d.close(); o.toast('Deleted.'); }catch(err){ d.close(); o.toast('Could not delete: '+(err.message||err)); } await load(); };
  }

  /* ---------- the item menu (the ⋯ button, right-click on a computer) ---------- */
  const copyCap=async it=>{ const t=capOf(it); if(!t) return; o.toast((await copyText(t))?'Caption copied':'Could not copy the caption.'); };
  function menu(it){
    if(!it||it.legacy||document.querySelector('dialog[open]')) return;
    const row=(a,icn,l,cls)=>`<button type="button" class="act-row${cls?' '+cls:''}" data-a="${a}">${icn}<span>${l}</span></button>`, posted=it.status==='posted';
    const d=o.dialog(`<div class="dlg-body cal-menu"><h3 id="calMH" dir="auto">${esc(it.title||'Untitled')}</h3><p class="small"><bdi>${esc(L(parse(it.day),{weekday:'long',day:'numeric',month:'long'}))}</bdi>${it.at?' · <bdi>'+esc(fmtTime(it.at))+'</bdi>':''} · ${esc(SLABEL[it.status]||it.status)}</p>
      <div class="act-list">${!posted&&((it.design_ids||[]).length||capOf(it))?row('post',ic('share'),'Post now'):''}${row('mark',ic('check'),posted?'Mark as ready':'Mark as posted')}${capOf(it)?row('copy',ic('copy'),'Copy caption'):''}${row('tomorrow',ic('move'),'Move to tomorrow')}${row('del',ic('trash'),'Delete','danger')}</div>
      <button type="button" class="link" id="calMX">Close</button></div>`,'cal-dlg');
    d.setAttribute('aria-labelledby','calMH'); d.querySelector('#calMX').onclick=()=>d.close();
    d.querySelector('.act-list').addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a; d.close();
      if(a==='del') return confirmDelete(it); if(a==='copy') return copyCap(it); if(a==='post') return postSheet(it);
      if(a==='tomorrow') return move(it.id,iso(addDays(parse(it.day),1)));
      if(a==='mark'){ it.status=posted?'approved':'posted'; persist(it,'Marked '+SLABEL[it.status].toLowerCase()+'.'); } });
  }

  /* ---------- Post now (2.8.0): the picture and the caption, ready for Instagram in three taps ----------
     Share picture copies the caption first, draws the linked design(s) at full quality (the same pictures as Save) and opens the phone's share sheet
     (a computer downloads them, several as one ZIP). Then Mark as posted (the only cloud write) or Not yet. Nothing about the design changes. */
  const postText=it=>{ const c=capOf(it), have=new Set(tagsOf(c)), t=(it.hashtags||[]).filter(x=>!have.has(x)); return (c+(t.length?(c?'\n\n':'')+t.join(' '):'')).trim(); };
  const fname=(s,i)=>(String(s||'').trim().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,60)||'picture')+(i?'-'+i:'');
  const save=(blob,name)=>{ const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(u); },4000); };
  async function postSheet(it){
    if(!it||it.legacy||it.status==='posted') return;
    const gs=(it.design_ids||[]).map(designOf).filter(Boolean), pics=gs.filter(g=>g.tool&&g.kind!=='template'&&g.tool!=='video'), cover=gs[0];
    const text=postText(it), touch=matchMedia('(pointer:coarse)').matches, lab=window.Studio&&Studio.lab;
    const d=o.dialog(`<div class="dlg-body cal-post"><h3 id="cpH">Post now</h3>
      ${cover?`<div class="cp-pic"><img alt="" decoding="async" data-path="${esc(cover.thumb_path||'')}"${urls[cover.thumb_path]?` src="${urls[cover.thumb_path]}"`:''}></div>`:''}
      ${text?`<p class="cp-cap" dir="auto">${esc(text)}</p><button type="button" class="link" id="cpCopy">Copy caption</button>`:''}
      <p class="small cp-note" id="cpNote" role="status" dir="auto" hidden></p>
      <div class="dlg-actions col"><button type="button" class="btn" id="cpGo">${pics.length?'Share picture':'Copy caption'}</button><button type="button" class="link" id="cpX">Close</button></div></div>`,'cal-dlg');
    d.setAttribute('aria-labelledby','cpH'); fillThumbsIn(d);
    const $=s=>d.querySelector(s), go=$('#cpGo'), note=$('#cpNote'), say=t=>{ note.hidden=!t; note.textContent=t||''; };
    let files=null, busy=false; const was=it.status;
    $('#cpX').onclick=()=>d.close();
    if($('#cpCopy')) $('#cpCopy').onclick=async()=>{ hap('tick'); o.toast((await copyText(text))?'Caption copied':'Could not copy the caption.'); };
    d.addEventListener('close',()=>{ busy=false; });
    const posted=()=>{ busy=false; say(''); $('#cpH').textContent='Did you post it?'; go.disabled=false; go.textContent='Mark as posted'; go.onclick=mark;
      const x=$('#cpX'); x.textContent='Not yet'; };
    const mark=async()=>{ if(busy) return; busy=true; go.disabled=true; hap('tick'); it.status='posted';
      try{ await C.saveCalendarItem(keep(it)); d.close(); o.toast('Marked posted.'); if(built) await load(); if(o.onPosted) o.onPosted(it); }
      catch(err){ it.status=was; busy=false; go.disabled=false; say('Could not save: '+(err.message||err)+' Try again.'); } };
    const copied=async()=>{ if(!text) return true; const ok=await copyText(text); o.toast(ok?'Caption copied: paste it in Instagram':'Could not copy the caption.'); return ok; };
    const give=async()=>{ if(touch&&navigator.canShare&&navigator.canShare({files})){
        let r='x'; try{ await navigator.share({files}); r='shared'; }catch(err){ r=err&&err.name==='AbortError'?'cancelled':err&&err.name==='NotAllowedError'?'needtap':'x'; }
        if(r==='shared') return posted();
        if(r==='cancelled'){ say('Not shared yet. Tap Share picture when you are ready.'); }
        else if(r==='needtap'){ say('Your picture is ready. Tap Share picture to open the share sheet.'); }
        else { say('The share sheet did not open. Tap Share picture to try again.'); }
        go.disabled=false; go.textContent='Share picture'; busy=false; return; }
      /* a computer: the pictures go to downloads (several as one ZIP) */
      if(files.length>1){ let zip=null; try{ const B=await Studio.lazy('batch'); zip=await B.zip(files,new Date()); }catch(_){ zip=null; }
        if(zip){ const n=new Date(), z=x=>String(x).padStart(2,'0'); save(zip,o.brand+'-pictures-'+n.getFullYear()+z(n.getMonth()+1)+z(n.getDate())+'-'+z(n.getHours())+z(n.getMinutes())+'.zip'); say('Your pictures are in your downloads in one ZIP.'); return posted(); } }
      for(const f of files){ save(f,f.name); await new Promise(r=>setTimeout(r,250)); }
      say('Your picture is in your downloads.'); posted(); };
    go.onclick=async()=>{ if(busy) return; busy=true; go.disabled=true; hap('tick');
      await copied();
      if(!pics.length){ say(''); return posted(); }
      if(!files){
        go.textContent='Getting your picture ready…'; say('');
        try{
          if(navigator.onLine===false) throw new Error('offline');
          const R=await Studio.lazy('render'), out=[], names=new Set(); let K=0;
          for(const g of pics){ const r=await R.design({id:g.id,tool:g.tool,name:g.name},{now:false},K);
            if(!r||r.error||!r.out||!r.out.length) throw new Error(r&&r.error||'failed');
            let base=fname(g.name), n=2; while(names.has(base.toLowerCase())) base=fname(g.name)+'-'+n++; names.add(base.toLowerCase());
            r.out.forEach((x,i)=>{ K=K?Math.min(K,x.K):x.K; out.push(new File([x.blob],(r.out.length>1?base+'-'+(i<9?'0':'')+(i+1):base)+'.png',{type:'image/png'})); }); }
          files=out;
        }catch(err){ say((err&&err.message==='offline'?'You are offline, so the picture could not be made. ':'The picture could not be made. ')+(text?'The caption is copied, so you can still paste it in Instagram.':'Try again in a moment.'));
          go.disabled=false; go.textContent='Try again'; busy=false; return; }
      }
      await give(); };
    go.focus({preventScroll:true});
  }
  /* Post now from anywhere (Home): a calendar item by id (and day), or a whole item; its designs, thumbnails and caption are loaded here */
  async function postNow(ref){
    try{
      C=C||await o.cloud(); let it=ref&&ref.id&&items.find(x=>x.id===ref.id);
      if(!it){ const day=ref.day||todayIso(), list=await C.calendar(o.brand,{from:day,to:day}); const f=(list||[]).find(x=>x.id===ref.id); if(!f){ o.toast('That post is not in the calendar any more.'); return; }
        it={...f,at:hhmm(f.at)||null,hashtags:f.hashtags||[],design_ids:f.design_ids||[]}; }
      if((it.design_ids||[]).length&&!it.design_ids.every(designOf)&&C.designs){ try{ designs=(await C.designs(o.brand))||designs; }catch(_){} }
      const need=(it.design_ids||[]).map(designOf).filter(Boolean).map(g=>g.thumb_path).filter(p=>p&&!urls[p]);
      if(need.length&&C.fileUrls){ try{ Object.assign(urls,await C.fileUrls(need)); }catch(_){} }
      if(document.querySelector('dialog[open]')) return;
      return postSheet(it);
    }catch(err){ o.toast(o.netDown&&o.netDown(err)?'You are offline. Try again when you are back online.':'Could not open Post now. Try again.'); }
  }

  /* ---------- events (one set, on the root) ---------- */
  let dragId=null, tx=null;
  root.addEventListener('contextmenu',e=>{ const el=e.target.closest('.cal-item,.cal-pill'); if(!el) return; e.preventDefault(); menu(items.find(x=>x.id===el.dataset.id)); });
  root.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-cal-back]')) return o.onBack();
    if(t.closest('[data-cal-reload]')) return load();
    if(t.closest('[data-cal-signin]')){ o.signIn().then(ok=>{ if(ok) load(); }); return; }
    let b=t.closest('[data-nav]'); if(b) return go(+b.dataset.nav);
    b=t.closest('[data-mode]'); if(b) return setMode(b.dataset.mode);
    b=t.closest('[data-week]'); if(b){ anchor=parse(b.dataset.week); mode='week'; wr('studio:calMode','week'); hap('tick'); view(0); return; }
    b=t.closest('[data-add]'); if(b) return editSheet(null,b.dataset.add);
    b=t.closest('[data-copy]'); if(b) return copyCap(items.find(x=>x.id===b.dataset.copy));
    b=t.closest('[data-more]'); if(b) return menu(items.find(x=>x.id===b.dataset.more));
    { const dz=t.closest('[data-design]'); if(dz&&dz.dataset.tool){ e.preventDefault(); hap('tick'); location.href=designHref(dz.dataset.design,dz.dataset.tool); return; } }
    b=t.closest('[data-open]'); if(b){ const it=items.find(x=>x.id===b.dataset.open); if(it&&!it.legacy) editSheet(it); } });
  /* swipe sideways on the list: previous / next week (or month) */
  if(!sh){ root.addEventListener('touchstart',e=>{ const el=e.target.closest('.cal-body'); tx=el&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()}:null; },{passive:true});
  root.addEventListener('touchend',e=>{ if(!tx||!e.changedTouches.length) return; const dx=e.changedTouches[0].clientX-tx.x, dy=e.changedTouches[0].clientY-tx.y, ms=Date.now()-tx.t; tx=null;
    if(Math.abs(dx)>80&&Math.abs(dy)<45&&Math.abs(dx)>Math.abs(dy)*2&&ms<700&&state==='ok') go(dx<0?1:-1); },{passive:true}); }
  /* drag to move (computers): items are draggable; every day (week row or month cell) takes a drop */
  root.addEventListener('dragstart',e=>{ const el=e.target.closest&&e.target.closest('[data-id][draggable="true"]'); if(!el){ return; } dragId=el.dataset.id; el.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',dragId); e.dataTransfer.effectAllowed='move'; }catch(_){} });
  root.addEventListener('dragend',e=>{ dragId=null; root.querySelectorAll('.dragging,.drop').forEach(x=>x.classList.remove('dragging','drop')); });
  root.addEventListener('dragover',e=>{ const day=e.target.closest&&e.target.closest('[data-day]'); if(!day||!dragId) return; e.preventDefault(); root.querySelectorAll('.drop').forEach(x=>x!==day&&x.classList.remove('drop')); day.classList.add('drop'); });
  root.addEventListener('drop',e=>{ const day=e.target.closest&&e.target.closest('[data-day]'); if(!day||!dragId) return; e.preventDefault(); const id=dragId; dragId=null; root.querySelectorAll('.drop').forEach(x=>x.classList.remove('drop')); move(id,day.dataset.day); });
  root.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft'&&e.target.closest('.cal-nav')) go(-1); else if(e.key==='ArrowRight'&&e.target.closest('.cal-nav')) go(1); });

  return {
    get mode(){ return mode; },
    /* r6 (owner): the Plan page's + adds a post here (for the day in view), like it adds an idea on the Ideas tab */
    newPost(){ const nw=root.querySelector('.cal-new'); if(!nw||nw.disabled) return false; nw.click(); return true; },
    show(opt){ opt=opt||{};
      if(mode==='feed'&&!window.StudioFeed) loadFeed().then(()=>{ if(state==='ok'&&mode==='feed'){ lastSig=''; items=slice(); draw(); thumbsFor(); } },()=>{});
      if(opt.day&&/^\d{4}-\d{2}-\d{2}$/.test(opt.day)){ anchor=parse(opt.day); if(mode==='feed') mode='week'; ringDay=opt.day; built=true; const [a,b]=range();
        if(state==='ok'&&covers(a,b)){ items=slice(); lastSig=sigNow(); draw(0); thumbsFor(); if(Date.now()-fetchedAt>TTL) load(); } else load({dir:0});
        const h=root.querySelector('#calH'); if(h) h.focus({preventScroll:true}); return; } if(opt.today){ anchor=new Date(); toToday=true; } const again=built&&state==='ok'&&!opt.today; built=true; if(!again){ lastSig=''; draw(); } load(); preloadFeed();   /* 2.5.0: coming back shows the page as it was, then refreshes only what changed */
      const h=root.querySelector('#calH'); if(h) h.focus({preventScroll:true}); },
    refresh(){ if(built) load(); },
    postNow,
    get items(){ return items; }
  };
}
let cur=null;
window.StudioCalendar={ init(o){ cur=make(o); return cur; }, api:()=>cur, postNow(ref){ return cur?cur.postNow(ref):Promise.resolve(); }, CAL_ICON:CAL_IC, pick:pickSheet, quick:quickSheet, shape:dShape };
})();

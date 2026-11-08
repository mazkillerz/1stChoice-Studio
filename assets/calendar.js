/* Studio content calendar (brand-agnostic, behind the "team" preview flag). Lazy-loaded the first time #calendar opens.
   StudioCalendar.init({root,brand,cloud,member,signIn,netDown,esc,haptic,icons,dialog,toast,who,store,onBack,flagOn?}) -> {show({today?}),refresh(),mode}.
   Items live in the cloud (C.calendar / C.saveCalendarItem / C.deleteCalendarItem): {id,brand,day:'YYYY-MM-DD',at:'HH:MM'|null,status,format:'post'|'story'|null,title,caption,hashtags[],design_ids[],campaign_id,author}.
   Phone: a vertical week list (7 day rows, today marked), swipe or arrows for the week, a month toggle (dots per status, tap a day -> that week),
   a visible ⋯ on each item opens its menu (Mark as posted/ready, Copy caption, Move to tomorrow, Delete), tap an item to edit it (calendar-simple). Computer: month grid with the items inside, drag one to move it.
   The old local "posted" log (if a device kept one) shows as read-only posted items; nothing is migrated or deleted. */
(function(){
'use strict';
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
const ICF={post:SVG('<rect x="4" y="4" width="16" height="16" rx="2.5"/>'),story:SVG('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/>')};

/* the old local log: a list of {day|date, title|name|text} under one of a few keys; read once, shown read-only */
function legacyItems(brand){
  const out=[];
  for(const k of LEGACY_KEYS){ let v=null; try{ v=JSON.parse(localStorage.getItem(k)||'null'); }catch(_){ v=null; }
    if(v&&!Array.isArray(v)&&Array.isArray(v.items)) v=v.items; if(!Array.isArray(v)) continue;
    v.forEach((r,i)=>{ if(!r||typeof r!=='object') return; const day=String(r.day||r.date||r.at||r.ts||'').slice(0,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      out.push({id:'legacy:'+k+':'+i,brand,day,at:null,status:'posted',title:String(r.title||r.name||r.text||'Posted'),caption:String(r.caption||''),hashtags:[],design_ids:[],legacy:true}); }); }
  return out;
}

function make(o){
  const root=o.root, esc=o.esc, ic=k=>(o.icons&&o.icons[k])||'', hap=k=>{ try{ o.haptic&&o.haptic(k); }catch(_){} };
  const rd=k=>{ try{ return o.store?o.store(k):null; }catch(_){ return null; } }, wr=(k,v)=>{ try{ o.store&&o.store(k,v); }catch(_){} };
  const wide=()=>matchMedia('(min-width:821px)').matches;
  let C=null, mode=(['week','month'].includes(rd('studio:calMode'))?rd('studio:calMode'):(wide()?'month':'week')), anchor=new Date();
  let camps=[];   /* campaigns (mega w2): the name shows on an item that belongs to one */
  let items=[], designs=[], urls={}, state='loading', note='', run=0, slowT=0, built=false, toToday=false;
  const range=()=>{ if(mode==='week'){ const s=weekStart(anchor); return [s,addDays(s,6)]; }
    const f=new Date(anchor.getFullYear(),anchor.getMonth(),1), s=weekStart(f); return [s,addDays(s,41)]; };
  const designOf=id=>designs.find(d=>d.id===id);
  const shapeOf=g=>g?(POST_TOOLS.includes(g.tool)?'post':'story'):null;
  const fmtOf=it=>it.format||shapeOf(it.design_ids.map(designOf).find(Boolean))||'post';
  const capOf=it=>{ const g=dCap(it); return String(it.caption||(g&&g.caption)||'').trim(); };
  /* captions (mega 4.3): a linked design's caption stands in for an item that has none (shown on the card; the sheet offers "Use the design's caption") */
  const dCap=it=>{ for(const id of (it.design_ids||[])){ const g=designOf(id); if(g&&String(g.caption||'').trim()) return g; } return null; };
  /* /captions (mega) */
  const againBtn='<button type="button" class="btn slim" data-cal-reload>Try again</button>';
  const noteBox=(icn,title,text,btn)=>`<div class="sv-note cal-note"><span class="sn-ic" aria-hidden="true">${icn}</span><div class="sn-txt"><b>${title}</b><p>${text}</p></div>${btn||''}</div>`;
  const authorName=()=>{ try{ return (o.who&&o.who.author&&o.who.author())||null; }catch(_){ return null; } };

  /* ---------- load ---------- */
  async function load(){
    const my=++run; clearTimeout(slowT); const [a,b]=range();
    if(state!=='ok'){ state='loading'; draw(); }
    slowT=setTimeout(()=>{ if(my===run&&state!=='ok'){ state='slow'; draw(); } },8000);
    try{
      if(navigator.onLine===false) throw Object.assign(new Error('No connection. Check your internet and try again.'),{offline:true});
      C=await o.cloud(); if(my!==run) return;
      if(!(await o.member())){ state='out'; draw(); return; }
      const [list,dl]=await Promise.all([C.calendar(o.brand,{from:iso(a),to:iso(b)}),C.designs?C.designs(o.brand).catch(()=>designs):designs]); if(my!==run) return;
      designs=dl||[]; try{ camps=C.campaigns?(await C.campaigns(o.brand))||[]:[]; }catch(_){ camps=[]; }   /* campaigns (mega w2) */
      const lg=legacyItems(o.brand).filter(x=>x.day>=iso(a)&&x.day<=iso(b));
      items=list.map(x=>({...x,at:hhmm(x.at)||null,hashtags:x.hashtags||[],design_ids:x.design_ids||[]})).concat(lg); state='ok'; draw();
      if(toToday){ toToday=false; const t=root.querySelector('.cal-day.today'); if(t&&!wide()) t.scrollIntoView({block:'start'}); }
      const need=[...new Set(items.flatMap(x=>x.design_ids).map(designOf).filter(Boolean).map(d=>d.thumb_path).filter(p=>p&&!urls[p]))];
      if(need.length) C.fileUrls(need).then(u=>{ Object.assign(urls,u); fillThumbs(); }).catch(()=>{});
    }catch(err){ if(my!==run) return; const net=o.netDown(err), slow=net&&/slow/i.test(err.message||'');
      if(state==='ok'){ o.toast(net?(slow?'The connection is slow. This is the calendar from before.':'You’re offline. This is the calendar from before.'):'Could not refresh the calendar: '+(err.message||err)); return; }
      state=net?(slow?'slow':'offline'):'error'; note=err.message||String(err); draw(); }
    finally{ if(my===run) clearTimeout(slowT); }
  }
  function fillThumbs(){ root.querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; }); }

  /* ---------- drawing ---------- */
  const title=()=>{ const [a,b]=range(); if(mode==='month') return L(anchor,{month:'long',year:'numeric'});
    return a.getMonth()===b.getMonth()?L(a,{day:'numeric',month:'short'})+' – '+L(b,{day:'numeric'}):L(a,{day:'numeric',month:'short'})+' – '+L(b,{day:'numeric',month:'short'}); };
  const thumbs=it=>{ const ds=it.design_ids.map(designOf).filter(Boolean); return ds.length?`<span class="ci-thumbs">${ds.map(d=>`<img alt="" decoding="async" data-path="${esc(d.thumb_path||'')}"${urls[d.thumb_path]?` src="${urls[d.thumb_path]}"`:''}>`).join('')}</span>`:''; };
  const campTag=it=>{ const c=it.campaign_id&&camps.find(x=>x.id===it.campaign_id); return c?`<span class="ci-camp" dir="auto">${esc(c.name)}</span>`:''; };   /* campaigns (mega w2) */
  const chip=s=>`<span class="cal-chip st-${s}">${esc(SLABEL[s]||s)}</span>`;
  const card=it=>{ const ro=!!it.legacy, cap=capOf(it), f=fmtOf(it), t0=firstLine(cap).slice(0,60);
    const showTitle=!cap||it.title!==t0;   // a title made from the caption's first line would only repeat it
    return `<article class="cal-item st-${it.status}${ro?' ro':''}" data-id="${esc(it.id)}"${ro?'':' draggable="true"'}>
      <button type="button" class="ci-main" data-open="${esc(it.id)}"${ro?' disabled':''}>
        <span class="ci-top"><span class="ci-fmt" role="img" aria-label="${f==='story'?'Story':'Post'}">${ICF[f]}</span>${it.at?`<bdi class="ci-time">${esc(fmtTime(it.at))}</bdi>`:''}${chip(it.status)}</span>
        <span class="ci-body">${thumbs(it)}<span class="ci-txt">${showTitle?`<b class="ci-title" dir="auto">${esc(it.title||'Untitled')}</b>`:''}${campTag(it)}${cap?`<span class="ci-cap" dir="auto">${esc(cap)}</span>`:''}${ro?'<span class="ci-note">From the old posted log</span>':''}</span></span>
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
  function draw(){
    const keepY=window.scrollY;
    const body=state==='ok'?(mode==='month'?monthHtml():weekHtml())
      :state==='loading'?'<div class="cal-skel" aria-hidden="true">'+'<span></span>'.repeat(5)+'</div>'
      :state==='offline'?noteBox(ic('clock'),'You’re offline','You can still make and save pictures. Your calendar comes back when you’re online.',againBtn)
      :state==='slow'?noteBox(ic('clock'),'Still loading…','The connection is slow. Your calendar shows as soon as it arrives.',againBtn)
      :state==='out'?noteBox(CAL_IC,'The calendar is for your team','Sign in to plan and see your team’s posts.','<button type="button" class="btn slim" data-cal-signin>Sign in</button>')
      :noteBox(ic('rotate'),'Could not load the calendar',esc(note),againBtn);
    const live=state==='ok';
    const [ra,rb]=range(), here=mode==='month'?(anchor.getFullYear()===new Date().getFullYear()&&anchor.getMonth()===new Date().getMonth()):(todayIso()>=iso(ra)&&todayIso()<=iso(rb));
    root.innerHTML=`<div class="cal-top"><div class="cal-head"><button type="button" class="sp-back" data-cal-back aria-label="Back to home">${ic('back')}</button>
        <div class="sp-title"><h1 id="calH" tabindex="-1">Calendar</h1></div>
        <button type="button" class="mini solid cal-new" data-add="${here?todayIso():iso(anchor)}"${live?'':' disabled'}>${ic('plus')}<span>New</span></button></div>
      <div class="cal-bar"><div class="cal-seg" role="group" aria-label="View"><button type="button" class="chip" data-mode="week" aria-pressed="${mode==='week'}">Week</button><button type="button" class="chip" data-mode="month" aria-pressed="${mode==='month'}">Month</button></div>
        <div class="cal-nav"><button type="button" class="cal-arrow" data-nav="-1" aria-label="${mode==='month'?'Previous month':'Previous week'}">${ic('back')}</button>
        ${here?'':'<button type="button" class="cal-today" data-nav="0">Today</button>'}<strong class="cal-title" aria-live="polite">${esc(title())}</strong>
        <button type="button" class="cal-arrow" data-nav="1" aria-label="${mode==='month'?'Next month':'Next week'}">${ic('next')}</button></div></div></div>
      <div class="cal-body">${body}</div>`;
    window.scrollTo({top:keepY,behavior:'instant'});
  }
  function go(n){ if(n===0) anchor=new Date(); else if(mode==='month') anchor=new Date(anchor.getFullYear(),anchor.getMonth()+n,1); else anchor=addDays(anchor,7*n); hap('tick'); load(); }
  function setMode(m,day){ if(day) anchor=parse(day); mode=m; wr('studio:calMode',m); hap('tick'); state=state==='ok'?'ok':state; load(); }

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
      <div class="cs-head"><h3 id="calEH">${(isNew?'Plan a ':'Edit ')+(it.format==='story'?'story':'post')}</h3><button type="button" class="cs-x" id="calCancel" aria-label="Close">${ic('close')}</button></div>
      <div class="field"><span class="lbl" id="calFL">Format</span><div class="cal-fmt" role="group" aria-labelledby="calFL">${[['post','Post'],['story','Story']].map(([k,l])=>`<button type="button" class="cf-btn" data-fmt="${k}" aria-pressed="${fmt===k}">${ICF[k]}<span>${l}</span></button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Design</span><button type="button" class="cal-tile" id="calPick" aria-haspopup="dialog"></button><button type="button" class="link" id="calSkip" hidden>Remove design</button></div>
      <div class="field"><span class="lbl">Day and time</span><div class="cal-when"><label class="cal-daypill" for="calDay"><span id="calDayTxt"></span><input type="date" id="calDay" required value="${esc(it.day)}" aria-label="Day"></label>
        <div class="chips cal-times" role="group" aria-label="Time">${TIMES.map(([v,l])=>`<button type="button" class="chip" data-at="${v}" aria-pressed="${it.at===v}">${l.replace(' ','&nbsp;')}</button>`).join('')}<button type="button" class="chip" data-at="other" aria-pressed="${other}">Other</button></div>
        <input type="time" id="calAt" aria-label="Time" value="${esc(other?it.at:'')}"${other?'':' hidden'}></div></div>
      <div class="field"><label class="lbl" for="calCap">Caption</label><textarea id="calCap" class="cal-ta" dir="auto" rows="3" placeholder="Write or paste the caption">${esc(it.caption)}</textarea><div class="cal-count small" id="calCount" aria-live="off"></div></div>
      <div class="field"><span class="lbl" id="calStL">Status</span>${it.status==='in_review'?'<p class="small cal-rev">In review</p>':''}<div class="cal-seg3" role="group" aria-labelledby="calStL">${STATUS.map(([k,l])=>`<button type="button" class="cs3" data-st="${k}" aria-pressed="${it.status===k}">${l}</button>`).join('')}</div></div>
      <div class="status" id="calSt" role="status"></div>
      <div class="cal-foot"><button type="submit" class="btn" id="calSave">Save</button>${isNew?'':'<button type="button" class="link danger-link" id="calDel">Delete this post</button>'}</div></form>`,'cal-dlg cal-edit');
    d.setAttribute('aria-labelledby','calEH'); const $=s=>d.querySelector(s), st=t=>{ $('#calSt').textContent=t; };
    const dayTxt=()=>{ const v=$('#calDay').value; $('#calDayTxt').innerHTML=/^\d{4}-\d{2}-\d{2}$/.test(v)?'<bdi>'+esc(L(parse(v),{weekday:'short',day:'numeric',month:'short'}))+'</bdi>':'Pick a day'; };
    const paintTile=()=>{ $('#calPick').innerHTML=tileHtml(it); $('#calSkip').hidden=!it.design_ids.length; fillThumbsIn(d); };
    const count=()=>{ const n=$('#calCap').value.length; const c=$('#calCount'); c.innerHTML=`<bdi>${n.toLocaleString('en')}</bdi> / ${MAXCAP.toLocaleString('en')}`; c.classList.toggle('over',n>MAXCAP); };
    const grow=()=>{ const t=$('#calCap'); t.style.height='auto'; t.style.height=Math.min(t.scrollHeight+2,Math.round(parseFloat(getComputedStyle(t).lineHeight||24)*8+24))+'px'; };
    dayTxt(); paintTile(); count(); setTimeout(grow,0);
    $('#calDay').addEventListener('input',dayTxt); $('#calDay').addEventListener('change',dayTxt);
    $('#calCap').addEventListener('input',()=>{ count(); grow(); });
    d.querySelectorAll('[data-fmt]').forEach(b=>b.onclick=()=>{ fmt=b.dataset.fmt; const h=d.querySelector('#calEH'); if(h) h.textContent=(isNew?'Plan a ':'Edit ')+(fmt==='story'?'story':'post'); d.querySelectorAll('[data-fmt]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
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
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return st('Pick a day.'); if(!fmt) return st('Choose Post or Story.');
      const sv=$('#calSave'); sv.disabled=true; st('Saving…');
      await whoOnce();
      const caption=$('#calCap').value, row={...it,day,format:fmt,caption,hashtags:tagsOf(caption),author:it.author||authorName()||null}; row.title=titleFor({...row});
      try{ await C.saveCalendarItem(keep(row)); d.close(); anchor=parse(day); o.toast('Saved'); hap('tick'); await load(); }
      catch(err){ sv.disabled=false; st('Could not save: '+(err.message||err)+' Try again.'); } });
    return d;
  }
  function fillThumbsIn(d){ d.querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; }); }

  /* the full-screen design picker: search, collection chips, shape chips, one grid that scrolls with the page, thumbs loaded as they scroll into view */
  async function pickDesign(it,fmt,done){
    let cols=[]; try{ cols=C&&C.collections?(await C.collections(o.brand))||[]:[]; }catch(_){ cols=[]; }
    const list=designs.filter(g=>g.kind!=='template'), colName=Object.fromEntries(cols.map(c=>[c.id,c.name]));
    const hay=new Map(list.map(g=>[g.id,nrm([g.name,String(g.tool||'').replace(/[-_]/g,' '),...(g.collections||[]).map(c=>colName[c]||c)].join(' '))]));
    let q='', col='', shape=fmt==='story'?'story':fmt==='post'?'post':'';
    const d=o.dialog(`<div class="dlg-body cal-pick"><div class="cp-top"><div class="cp-bar"><button type="button" class="cs-x" data-back aria-label="Back">${ic('back')}</button><h3 id="calPH">Pick a design</h3><button type="button" class="link cp-skip" data-skip>Skip for now</button></div>
      <label class="cp-search"><span class="sr-only">Search designs</span>${ic('search')}<input type="search" id="calQ" dir="auto" autocomplete="off" placeholder="Search by name, tool or collection" enterkeyhint="search"></label>
      <div class="chips cp-chips" role="group" aria-label="Collection"><button type="button" class="chip" data-col="" aria-pressed="true">All</button>${cols.map(c=>`<button type="button" class="chip" data-col="${esc(c.id)}" aria-pressed="false" dir="auto">${esc(c.name)}</button>`).join('')}</div>
      <div class="chips cp-shape" role="group" aria-label="Shape">${[['story','Stories'],['post','Posts'],['','All shapes']].map(([k,l])=>`<button type="button" class="chip sm" data-shape="${k}" aria-pressed="${shape===k}">${l}</button>`).join('')}</div></div>
      <div class="cp-grid" id="calG"></div><p class="small cp-none" id="calNone" hidden>No designs match. Clear the search or pick All.</p></div>`,'cal-dlg cal-full');
    d.setAttribute('aria-labelledby','calPH'); const $=s=>d.querySelector(s);
    const pending=new Set(); let ft=0;
    const flush=()=>{ ft=0; const need=[...pending].filter(p=>!urls[p]); pending.clear(); if(!need.length||!C||!C.fileUrls){ fillThumbsIn(d); return; } C.fileUrls(need).then(u=>{ Object.assign(urls,u); fillThumbsIn(d); }).catch(()=>{}); };
    const io=typeof IntersectionObserver==='function'?new IntersectionObserver(es=>{ es.forEach(en=>{ if(!en.isIntersecting) return; const im=en.target; io.unobserve(im); const p=im.dataset.path; if(urls[p]) im.src=urls[p]; else if(p){ pending.add(p); clearTimeout(ft); ft=setTimeout(flush,40); } }); },{root:d,rootMargin:'400px 0px'}):null;
    const paint=()=>{ const nq=nrm(q), shown=list.filter(g=>(!col||(g.collections||[]).includes(col))&&(!shape||shapeOf(g)===shape)&&(!nq||hay.get(g.id).includes(nq)));
      $('#calG').innerHTML=shown.map(g=>`<button type="button" class="cal-pcard" data-pick="${esc(g.id)}" aria-pressed="${it.design_ids.includes(g.id)}"><img alt="" decoding="async" data-path="${esc(g.thumb_path||'')}"${urls[g.thumb_path]?` src="${urls[g.thumb_path]}"`:''}><span dir="auto">${esc(g.name)}</span></button>`).join('');
      $('#calNone').hidden=!!shown.length; $('#calNone').textContent=list.length?'No designs match. Clear the search or pick All.':'No saved designs yet. Save one from a tool and it shows here.';
      d.querySelectorAll('.cal-pcard img').forEach(im=>{ if(im.getAttribute('src')) return; if(io) io.observe(im); else pending.add(im.dataset.path); }); if(!io){ flush(); } };
    paint();
    $('#calQ').addEventListener('input',e=>{ q=e.target.value; paint(); });
    d.addEventListener('click',e=>{ const t=e.target;
      if(t.closest('[data-back],[data-skip]')){ d.close(); return; }
      let b=t.closest('[data-col]'); if(b){ col=b.dataset.col; d.querySelectorAll('[data-col]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); paint(); return; }
      b=t.closest('[data-shape]'); if(b){ shape=b.dataset.shape; d.querySelectorAll('[data-shape]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); paint(); return; }
      b=t.closest('[data-pick]'); if(b){ const id=b.dataset.pick; d.close(); done(id); } });
    d.addEventListener('close',()=>{ if(io) io.disconnect(); });
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
      <div class="act-list">${row('mark',ic('check'),posted?'Mark as ready':'Mark as posted')}${capOf(it)?row('copy',ic('copy'),'Copy caption'):''}${row('tomorrow',ic('move'),'Move to tomorrow')}${row('del',ic('trash'),'Delete','danger')}</div>
      <button type="button" class="link" id="calMX">Close</button></div>`,'cal-dlg');
    d.setAttribute('aria-labelledby','calMH'); d.querySelector('#calMX').onclick=()=>d.close();
    d.querySelector('.act-list').addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a; d.close();
      if(a==='del') return confirmDelete(it); if(a==='copy') return copyCap(it);
      if(a==='tomorrow') return move(it.id,iso(addDays(parse(it.day),1)));
      if(a==='mark'){ it.status=posted?'approved':'posted'; persist(it,'Marked '+SLABEL[it.status].toLowerCase()+'.'); } });
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
    b=t.closest('[data-week]'); if(b){ anchor=parse(b.dataset.week); mode='week'; wr('studio:calMode','week'); hap('tick'); load(); return; }
    b=t.closest('[data-add]'); if(b) return editSheet(null,b.dataset.add);
    b=t.closest('[data-copy]'); if(b) return copyCap(items.find(x=>x.id===b.dataset.copy));
    b=t.closest('[data-more]'); if(b) return menu(items.find(x=>x.id===b.dataset.more));
    b=t.closest('[data-open]'); if(b){ const it=items.find(x=>x.id===b.dataset.open); if(it&&!it.legacy) editSheet(it); } });
  /* swipe sideways on the list: previous / next week (or month) */
  root.addEventListener('touchstart',e=>{ const el=e.target.closest('.cal-body'); tx=el&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()}:null; },{passive:true});
  root.addEventListener('touchend',e=>{ if(!tx||!e.changedTouches.length) return; const dx=e.changedTouches[0].clientX-tx.x, dy=e.changedTouches[0].clientY-tx.y, ms=Date.now()-tx.t; tx=null;
    if(Math.abs(dx)>80&&Math.abs(dy)<45&&Math.abs(dx)>Math.abs(dy)*2&&ms<700&&state==='ok') go(dx<0?1:-1); },{passive:true});
  /* drag to move (computers): items are draggable; every day (week row or month cell) takes a drop */
  root.addEventListener('dragstart',e=>{ const el=e.target.closest&&e.target.closest('[data-id][draggable="true"]'); if(!el){ return; } dragId=el.dataset.id; el.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',dragId); e.dataTransfer.effectAllowed='move'; }catch(_){} });
  root.addEventListener('dragend',e=>{ dragId=null; root.querySelectorAll('.dragging,.drop').forEach(x=>x.classList.remove('dragging','drop')); });
  root.addEventListener('dragover',e=>{ const day=e.target.closest&&e.target.closest('[data-day]'); if(!day||!dragId) return; e.preventDefault(); root.querySelectorAll('.drop').forEach(x=>x!==day&&x.classList.remove('drop')); day.classList.add('drop'); });
  root.addEventListener('drop',e=>{ const day=e.target.closest&&e.target.closest('[data-day]'); if(!day||!dragId) return; e.preventDefault(); const id=dragId; dragId=null; root.querySelectorAll('.drop').forEach(x=>x.classList.remove('drop')); move(id,day.dataset.day); });
  root.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft'&&e.target.closest('.cal-nav')) go(-1); else if(e.key==='ArrowRight'&&e.target.closest('.cal-nav')) go(1); });

  return {
    get mode(){ return mode; },
    show(opt){ opt=opt||{}; if(opt.today){ anchor=new Date(); toToday=true; } built=true; draw(); load();
      const h=root.querySelector('#calH'); if(h) h.focus({preventScroll:true}); },
    refresh(){ if(built) load(); },
    get items(){ return items; }
  };
}
let cur=null;
window.StudioCalendar={ init(o){ cur=make(o); return cur; }, CAL_ICON:CAL_IC };
})();

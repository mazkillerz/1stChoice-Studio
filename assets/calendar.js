/* Studio content calendar (brand-agnostic, behind the "team" preview flag). Lazy-loaded the first time #calendar opens.
   StudioCalendar.init({root,brand,cloud,member,signIn,netDown,esc,haptic,icons,dialog,toast,who,store,onBack,flagOn?}) -> {show({today?}),refresh(),mode}.
   Items live in the cloud (C.calendar / C.saveCalendarItem / C.deleteCalendarItem): {id,brand,day:'YYYY-MM-DD',at:'HH:MM'|null,status,title,caption,hashtags[],design_ids[],campaign_id,author}.
   Phone: a vertical week list (7 day rows, today marked), swipe or arrows for the week, a month toggle (dots per status, tap a day -> that week),
   press and hold an item for its menu (Move to date, Change status, Edit, Delete). Computer: month grid with the items inside, drag one to move it.
   The old local "posted" log (if a device kept one) shows as read-only posted items; nothing is migrated or deleted. */
(function(){
'use strict';
const STATUS=[['draft','Draft'],['in_review','In review'],['approved','Approved'],['posted','Posted']];
const SLABEL=Object.fromEntries(STATUS);
const LEGACY_KEYS=['POSTED_LOG','studio:postedLog','studio:posted','studio:posted-log'];
const pad=n=>(n<10?'0':'')+n;
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||'')); return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(); };
const addDays=(d,n)=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); return x; };
const weekStart=d=>addDays(d,-d.getDay());   // weeks start on Sunday
const todayIso=()=>iso(new Date());
const L=(d,o)=>d.toLocaleDateString('en',o);
const hhmm=t=>t?String(t).slice(0,5):'';
const firstLine=s=>String(s||'').split(/\r?\n/).find(l=>l.trim())||'';
const tagsOf=s=>[...new Set(String(s||'').split(/[\s,،]+/).map(t=>t.replace(/^#+/,'').trim()).filter(Boolean))].map(t=>'#'+t);
const SVG=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const CAL_IC=SVG('<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 10h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>');

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
    return a.getMonth()===b.getMonth()?L(a,{day:'numeric'})+' – '+L(b,{day:'numeric',month:'short'}):L(a,{day:'numeric',month:'short'})+' – '+L(b,{day:'numeric',month:'short'}); };
  const thumbs=it=>{ const ds=it.design_ids.map(designOf).filter(Boolean).slice(0,4); return ds.length?`<span class="ci-thumbs">${ds.map(d=>`<img alt="" decoding="async" data-path="${esc(d.thumb_path||'')}"${urls[d.thumb_path]?` src="${urls[d.thumb_path]}"`:''}>`).join('')}${it.design_ids.length>4?`<i>+${it.design_ids.length-4}</i>`:''}</span>`:''; };
  const campTag=it=>{ const c=it.campaign_id&&camps.find(x=>x.id===it.campaign_id); return c?`<span class="ci-camp" dir="auto">${esc(c.name)}</span>`:''; };   /* campaigns (mega w2) */
  const chip=s=>`<span class="cal-chip st-${s}">${esc(SLABEL[s]||s)}</span>`;
  const card=it=>{ const ro=!!it.legacy, cap=firstLine(it.caption||(dCap(it)||{}).caption);   // captions (mega): fallback to the design's
    return `<article class="cal-item st-${it.status}${ro?' ro':''}" data-id="${esc(it.id)}"${ro?'':' draggable="true"'}>
      <button type="button" class="ci-main" data-open="${esc(it.id)}"${ro?' disabled':''}>
        <span class="ci-top">${it.at?`<span class="ci-time">${esc(it.at)}</span>`:''}${chip(it.status)}</span>
        <b class="ci-title" dir="auto">${esc(it.title||'Untitled')}</b>${campTag(it)}${cap?`<span class="ci-cap" dir="auto">${esc(cap)}</span>`:''}${ro?'<span class="ci-cap">From the old posted log</span>':''}${thumbs(it)}
      </button>${ro?'':`<button type="button" class="ci-more" data-more="${esc(it.id)}" aria-label="Options for ${esc(it.title||'this item')}">${ic('more')}</button>`}</article>`; };
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
    root.innerHTML=`<div class="cal-head"><button type="button" class="sp-back" data-cal-back aria-label="Back to home">${ic('back')}</button>
        <div class="sp-title"><h1 id="calH" tabindex="-1">Calendar</h1></div>
        <button type="button" class="mini solid cal-new" data-add="${iso(anchor)}"${live?'':' disabled'}>${ic('plus')}<span>New</span></button></div>
      <div class="cal-bar"><div class="cal-nav"><button type="button" class="cal-arrow" data-nav="-1" aria-label="${mode==='month'?'Previous month':'Previous week'}">${ic('back')}</button>
        <strong class="cal-title" aria-live="polite">${esc(title())}</strong>
        <button type="button" class="cal-arrow" data-nav="1" aria-label="${mode==='month'?'Next month':'Next week'}">${ic('next')}</button></div>
        <button type="button" class="chip cal-today" data-nav="0">Today</button>
        <div class="cal-seg" role="group" aria-label="View"><button type="button" class="chip" data-mode="week" aria-pressed="${mode==='week'}">Week</button><button type="button" class="chip" data-mode="month" aria-pressed="${mode==='month'}">Month</button></div></div>
      <div class="cal-body">${body}</div>`;
    window.scrollTo({top:keepY,behavior:'instant'});
  }
  function go(n){ if(n===0) anchor=new Date(); else if(mode==='month') anchor=new Date(anchor.getFullYear(),anchor.getMonth()+n,1); else anchor=addDays(anchor,7*n); hap('tick'); load(); }
  function setMode(m,day){ if(day) anchor=parse(day); mode=m; wr('studio:calMode',m); hap('tick'); state=state==='ok'?'ok':state; load(); }

  /* ---------- save, move, status, delete ---------- */
  const keep=it=>({id:it.id,brand:o.brand,day:it.day,at:it.at||null,status:it.status,title:it.title||'',caption:it.caption||'',hashtags:it.hashtags||[],design_ids:it.design_ids||[],campaign_id:it.campaign_id||null,author:it.author||null});
  async function persist(it,msg){ try{ await C.saveCalendarItem(keep(it)); if(msg) o.toast(msg); }catch(err){ o.toast('Could not save: '+(err.message||err)); } await load(); }
  async function move(id,day){ const it=items.find(x=>x.id===id); if(!it||it.legacy||it.day===day) return; const was=it.day; it.day=day; draw(); fillThumbs();
    try{ await C.saveCalendarItem(keep(it)); o.toast('Moved to '+L(parse(day),{weekday:'short',day:'numeric',month:'short'})+'.'); }catch(err){ it.day=was; o.toast('Could not move it: '+(err.message||err)); }
    await load(); }
  async function whoOnce(){ if(authorName()||rd('studio:calWhoAsked')||navigator.webdriver||!o.who||!o.who.ask) return; wr('studio:calWhoAsked',1); try{ await o.who.ask({user:true,brand:o.brand}); }catch(_){} }

  /* ---------- the add / edit sheet ---------- */
  function editSheet(src,dayHint){
    const isNew=!src, it=src?{...src,design_ids:[...src.design_ids],hashtags:[...src.hashtags]}:{day:dayHint||todayIso(),at:null,status:'draft',title:'',caption:'',hashtags:[],design_ids:[]};
    const author=it.author||authorName();
    const d=o.dialog(`<form class="dlg-body cal-sheet" action="#" novalidate><h3 id="calEH">${isNew?'New post':'Edit post'}</h3>
      <div class="cal-row2"><div class="field"><label class="lbl" for="calDay">Date</label><input type="date" id="calDay" required value="${esc(it.day)}"></div>
        <div class="field"><label class="lbl" for="calAt">Time (optional)</label><input type="time" id="calAt" value="${esc(it.at||'')}"></div></div>
      <div class="field"><span class="lbl" id="calStL">Status</span><div class="chips cal-stat" role="group" aria-labelledby="calStL">${STATUS.map(([k,l])=>`<button type="button" class="chip" data-st="${k}" aria-pressed="${it.status===k}">${l}</button>`).join('')}</div></div>
      <div class="field"><label class="lbl" for="calTitle">Title</label><input type="text" id="calTitle" dir="auto" maxlength="120" autocomplete="off" value="${esc(it.title)}"></div>
      <div class="field"><label class="lbl" for="calCap">Caption</label><textarea id="calCap" class="cal-ta" dir="auto" rows="4">${esc(it.caption)}</textarea></div>
      <button type="button" class="link" id="calUseCap" hidden>Use the design’s caption</button><!-- captions (mega) -->
      <div class="field"><label class="lbl" for="calTags">Hashtags</label><input type="text" id="calTags" dir="auto" autocomplete="off" autocapitalize="off" value="${esc((it.hashtags||[]).join(' '))}"></div>
      <div class="field"><span class="lbl">Designs</span><div class="cal-linked" id="calLinked"></div><button type="button" class="mini" id="calPick" aria-expanded="false">${ic('photo')}<span>Link designs</span></button><div class="cal-picker" id="calPicker" hidden></div></div>
      <p class="small cal-by">${author?`By <bdi>${esc(author)}</bdi>`:'No name set yet'} · <button type="button" class="link" id="calWho">${author?'Change':'Set your name'}</button></p>
      <div class="status" id="calSt" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="calCancel">Cancel</button><button type="submit" class="btn" id="calSave">${isNew?'Add to calendar':'Save'}</button></div>
      ${isNew?'':'<button type="button" class="link danger-link" id="calDel">Delete this post</button>'}</form>`,'cal-dlg');
    d.setAttribute('aria-labelledby','calEH'); const $=s=>d.querySelector(s), st=t=>{ $('#calSt').textContent=t; };
    let linked=()=>{ $('#calLinked').innerHTML=it.design_ids.length?it.design_ids.map(id=>{ const g=designOf(id); return `<span class="cal-lk"><img alt="" data-path="${esc(g?g.thumb_path||'':'')}"${g&&urls[g.thumb_path]?` src="${urls[g.thumb_path]}"`:''}><span dir="auto">${esc(g?g.name:'A design')}</span><button type="button" class="lk-x" data-unlink="${esc(id)}" aria-label="Remove ${esc(g?g.name:'design')}">${ic('close')}</button></span>`; }).join(''):'<span class="small">No designs linked yet.</span>'; fillThumbs(); };
    /* captions (mega): the button shows while a linked design has a caption; it fills the caption (and the hashtags when none are typed) */
    const capBtn=()=>{ const g=dCap(it); $('#calUseCap').hidden=!g; };
    $('#calUseCap').onclick=()=>{ const g=dCap(it); if(!g) return; $('#calCap').value=g.caption||''; if(!$('#calTags').value.trim()&&(g.hashtags||[]).length) $('#calTags').value=g.hashtags.join(' '); };
    const linked0=linked; linked=()=>{ linked0(); capBtn(); };
    linked();
    d.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ it.status=b.dataset.st; d.querySelectorAll('[data-st]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
    $('#calLinked').addEventListener('click',e=>{ const b=e.target.closest('[data-unlink]'); if(!b) return; it.design_ids=it.design_ids.filter(x=>x!==b.dataset.unlink); linked(); if(!$('#calPicker').hidden) paintPicker(); });
    const paintPicker=()=>{ const P=$('#calPicker');
      P.innerHTML=designs.length?`<div class="cal-pgrid">${designs.filter(g=>g.kind!=='template').map(g=>`<button type="button" class="cal-pcard" data-pick="${esc(g.id)}" aria-pressed="${it.design_ids.includes(g.id)}"><img alt="" decoding="async" data-path="${esc(g.thumb_path||'')}"${urls[g.thumb_path]?` src="${urls[g.thumb_path]}"`:''}><span dir="auto">${esc(g.name)}</span></button>`).join('')}</div>`:'<p class="small">No saved designs yet. Save one from a tool and it shows here.</p>'; };
    $('#calPick').onclick=async()=>{ const P=$('#calPicker'), open=P.hidden; P.hidden=!open; $('#calPick').setAttribute('aria-expanded',String(open)); if(!open) return; paintPicker();
      const need=designs.map(g=>g.thumb_path).filter(p=>p&&!urls[p]); if(need.length&&C&&C.fileUrls){ try{ Object.assign(urls,await C.fileUrls(need)); }catch(_){} fillThumbsIn(d); } };
    $('#calPicker').addEventListener('click',e=>{ const b=e.target.closest('[data-pick]'); if(!b) return; const id=b.dataset.pick, on=!it.design_ids.includes(id); it.design_ids=on?it.design_ids.concat(id):it.design_ids.filter(x=>x!==id); b.setAttribute('aria-pressed',String(on)); linked(); });
    $('#calWho').onclick=async()=>{ if(o.who&&o.who.ask){ const n=await o.who.ask({user:true,brand:o.brand}); if(n){ it.author=n; $('.cal-by').innerHTML=`By <bdi>${esc(n)}</bdi> · <button type="button" class="link" id="calWho2">Change</button>`; $('#calWho2').onclick=()=>$('#calWho').onclick(); } } };
    $('#calCancel').onclick=()=>d.close();
    const del=$('#calDel'); if(del) del.onclick=()=>{ d.close(); confirmDelete(src); };
    d.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault();
      const day=$('#calDay').value, ttl=$('#calTitle').value.trim();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return st('Pick a date.'); if(!ttl) { st('Add a title.'); $('#calTitle').focus(); return; }
      const sv=$('#calSave'); sv.disabled=true; st('Saving…');
      await whoOnce();
      const row={...it,day,at:$('#calAt').value||null,title:ttl,caption:$('#calCap').value,hashtags:tagsOf($('#calTags').value),author:it.author||authorName()||null};
      try{ await C.saveCalendarItem(keep(row)); d.close(); anchor=parse(day); o.toast(isNew?'Added to the calendar.':'Saved.'); hap('tick'); await load(); }
      catch(err){ sv.disabled=false; st('Could not save: '+(err.message||err)+' Try again.'); } });
    setTimeout(()=>{ if(isNew) $('#calTitle').focus(); },80);
    return d;
  }
  function fillThumbsIn(d){ d.querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; }); }
  function confirmDelete(it){
    const d=o.dialog(`<div class="dlg-body"><h3 id="calDH">Delete this post?</h3><p dir="auto">“${esc(it.title||'Untitled')}” will be removed from the calendar for everyone.</p>
      <div class="dlg-actions"><button type="button" class="mini" data-no>Cancel</button><button type="button" class="btn danger" data-yes>Delete</button></div></div>`,'cal-dlg');
    d.setAttribute('aria-labelledby','calDH'); d.querySelector('[data-no]').onclick=()=>d.close();
    d.querySelector('[data-yes]').onclick=async()=>{ d.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{ await C.deleteCalendarItem(it.id); d.close(); o.toast('Deleted.'); }catch(err){ d.close(); o.toast('Could not delete: '+(err.message||err)); } await load(); };
  }

  /* ---------- the item menu (press and hold, ⋯, right-click) ---------- */
  function menu(it){
    if(!it||it.legacy||document.querySelector('dialog[open]')) return;
    const row=(a,icn,l,cls)=>`<button type="button" class="act-row${cls?' '+cls:''}" data-a="${a}">${icn}<span>${l}</span></button>`;
    const d=o.dialog(`<div class="dlg-body cal-menu"><h3 id="calMH" dir="auto">${esc(it.title||'Untitled')}</h3><p class="small">${esc(L(parse(it.day),{weekday:'long',day:'numeric',month:'long'}))}${it.at?' · '+esc(it.at):''} · ${esc(SLABEL[it.status]||it.status)}</p>
      <div class="act-list">${row('move',ic('move'),'Move to date…')}${row('status',ic('check'),'Change status')}${row('edit',ic('pencil'),'Edit')}${row('del',ic('trash'),'Delete','danger')}</div>
      <div class="ds-panel" id="calMP"></div><button type="button" class="link" id="calMX">Close</button></div>`,'cal-dlg');
    d.setAttribute('aria-labelledby','calMH'); const P=d.querySelector('#calMP'); d.querySelector('#calMX').onclick=()=>d.close();
    d.querySelector('.act-list').addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
      if(a==='edit'){ d.close(); editSheet(it); return; } if(a==='del'){ d.close(); confirmDelete(it); return; }
      if(a==='move'){ P.innerHTML=`<div class="inline"><label class="sr-only" for="calMD">New date</label><input type="date" id="calMD" value="${esc(it.day)}"><button type="button" class="mini solid" id="calMG">Move</button></div>`;
        const inp=P.querySelector('#calMD'); inp.focus(); P.querySelector('#calMG').onclick=()=>{ if(!/^\d{4}-\d{2}-\d{2}$/.test(inp.value)) return; d.close(); move(it.id,inp.value); }; }
      if(a==='status'){ P.innerHTML=`<div class="chips cal-stat" role="group" aria-label="Status">${STATUS.map(([k,l])=>`<button type="button" class="chip" data-s="${k}" aria-pressed="${it.status===k}">${l}</button>`).join('')}</div>`;
        P.onclick=ev=>{ const c=ev.target.closest('[data-s]'); if(!c) return; d.close(); const was=it.status; if(c.dataset.s===was) return; it.status=c.dataset.s; persist(it,'Marked '+SLABEL[it.status].toLowerCase()+'.'); }; } });
  }

  /* ---------- events (one set, on the root) ---------- */
  let lp=null, lpFired=false, dragId=null, tx=null;
  const cancelLp=()=>{ if(lp){ clearTimeout(lp.t); lp.el.classList.remove('pressing'); lp=null; } };
  root.addEventListener('pointerdown',e=>{ cancelLp(); lpFired=false; const el=e.target.closest('.cal-item,.cal-pill'); if(!el||e.pointerType==='mouse'||e.button>0) return; const it=items.find(x=>x.id===el.dataset.id); if(!it||it.legacy) return;
    el.classList.add('pressing'); lp={el,x:e.clientX,y:e.clientY,t:setTimeout(()=>{ lpFired=true; el.classList.remove('pressing'); lp=null; hap('tick'); menu(it); },480)}; });
  root.addEventListener('pointermove',e=>{ if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10) cancelLp(); },{passive:true});
  ['pointerup','pointercancel'].forEach(t=>root.addEventListener(t,cancelLp));
  addEventListener('scroll',()=>{ if(lp) cancelLp(); },{passive:true,capture:true});
  root.addEventListener('contextmenu',e=>{ const el=e.target.closest('.cal-item,.cal-pill'); if(!el) return; e.preventDefault(); cancelLp(); menu(items.find(x=>x.id===el.dataset.id)); });
  root.addEventListener('click',e=>{ const t=e.target;
    if(lpFired){ lpFired=false; e.preventDefault(); return; }
    if(t.closest('[data-cal-back]')) return o.onBack();
    if(t.closest('[data-cal-reload]')) return load();
    if(t.closest('[data-cal-signin]')){ o.signIn().then(ok=>{ if(ok) load(); }); return; }
    let b=t.closest('[data-nav]'); if(b) return go(+b.dataset.nav);
    b=t.closest('[data-mode]'); if(b) return setMode(b.dataset.mode);
    b=t.closest('[data-week]'); if(b){ anchor=parse(b.dataset.week); mode='week'; wr('studio:calMode','week'); hap('tick'); load(); return; }
    b=t.closest('[data-add]'); if(b) return editSheet(null,b.dataset.add);
    b=t.closest('[data-more]'); if(b) return menu(items.find(x=>x.id===b.dataset.more));
    b=t.closest('[data-open]'); if(b){ const it=items.find(x=>x.id===b.dataset.open); if(it&&!it.legacy) editSheet(it); } });
  /* swipe sideways on the list: previous / next week (or month) */
  root.addEventListener('touchstart',e=>{ const el=e.target.closest('.cal-body'); tx=el&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()}:null; },{passive:true});
  root.addEventListener('touchend',e=>{ if(!tx||!e.changedTouches.length) return; const dx=e.changedTouches[0].clientX-tx.x, dy=e.changedTouches[0].clientY-tx.y, ms=Date.now()-tx.t; tx=null;
    if(Math.abs(dx)>80&&Math.abs(dy)<45&&Math.abs(dx)>Math.abs(dy)*2&&ms<700&&state==='ok'&&!lpFired) go(dx<0?1:-1); },{passive:true});
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

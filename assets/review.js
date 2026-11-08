/* Approvals and comments (preview "team"): send a saved design for review, the owner's queue, comments pinned to a spot on the picture,
   the Approved collection. Lazy: studio.js loads this file the first time a review feature is used.
   Brand-agnostic. Talks to the cloud only through the C.* calls (setReview, comments, addComment, resolveComment, setDesignCollections).
   ctx = {brand, cloud:()=>Promise<C>, esc, haptic, dialog, toast, ago, designs:()=>[...], thumb:path=>Promise<url|null>, refresh:()=>void, ask:()=>Promise<StudioWho>} */
(function(){
const LABEL={in_review:'In review',approved:'Approved',changes:'Changes asked'};
const APPROVED='Approved';
const whoNow=()=>{ try{ const r=JSON.parse(localStorage.getItem('studio:who')); return r&&typeof r==='object'?{name:String(r.name||'').trim(),owner:!!r.owner}:{name:'',owner:false}; }catch(_){ return {name:'',owner:false}; } };
async function nameOf(ctx){ let n=whoNow().name; if(!n&&!navigator.webdriver&&ctx.ask){ try{ const W=await ctx.ask(); await W.ask({brand:ctx.brand}); n=whoNow().name; }catch(_){} } return n||null; }
const ico=(p)=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC={check:ico('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),chat:ico('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>'),send:ico('<path d="M4 12l16-8-6 17-3-7z"/>'),back:ico('<path d="M15 5l-7 7 7 7"/>')};

/* the calendar items that hold this design follow its status (draft -> in review -> approved; changes asked sends them back to draft) */
async function calendarFollow(C,brand,id,status){
  try{ if(!C.calendar||!C.saveCalendarItem) return;
    const to={in_review:['draft','in_review'],approved:['in_review','approved'],changes:['in_review','draft']}[status]; if(!to) return;
    const items=await C.calendar(brand); const hit=items.filter(x=>(x.design_ids||[]).includes(id)&&(x.status===to[0]||(status==='approved'&&x.status==='draft')));
    for(const it of hit) await C.saveCalendarItem({...it,status:to[1]});
  }catch(_){}
}
async function setStatus(ctx,d,status){
  const C=await ctx.cloud(), by=await nameOf(ctx);
  await C.setReview(d.id,status,by);
  d.review=status; d.review_by=by; d.review_at=new Date().toISOString();
  if(status==='approved'){   /* Approved collection: keep the design's other collections */
    const full=await C.getDesign(d.id); const names=[...new Set([...(full&&full.collectionNames||[]),APPROVED])];
    await C.setDesignCollections(ctx.brand,d.id,names); d.collections=[...new Set([...(d.collections||[]),APPROVED])];
  }
  await calendarFollow(C,ctx.brand,d.id,status);
  return by;
}
/* Send for review: used by Saved's menu and by the Save sheet (which has no list, so ctx may be minimal: cloud, brand, ask) */
async function send(ctx,id){
  const C=await ctx.cloud(); const d=(ctx.designs&&ctx.designs().find(x=>x.id===id))||{id}; const by=await setStatus(ctx,d,'in_review');
  if(ctx.refresh) ctx.refresh(); return by;
}
const chip=d=>d&&LABEL[d.review]?`<em class="rv-chip st-${d.review}" title="${LABEL[d.review]}${d.review_by?' · '+String(d.review_by).replace(/"/g,''):''}">${LABEL[d.review]}</em>`:'';

/* ---------- the big picture with pins, comments, and (for the owner) Approve / Ask for changes ---------- */
async function openDesign(ctx,d,o){
  o=o||{}; const {esc}=ctx, C=await ctx.cloud(); const me=whoNow();
  const dlg=ctx.dialog(`<div class="dlg-body rv-body"><div class="rv-top"><h3 dir="auto">${esc(d.name)}</h3><p class="small" id="rvMeta"></p></div>
    <div class="rv-picwrap"><div class="rv-pic" id="rvPic" role="img" aria-label="${esc(d.name)}. Tap a spot to leave a note there."><img alt="" id="rvImg" draggable="false"></div></div>
    <div class="rv-acts" id="rvActs"></div>
    <form class="rv-add" id="rvForm" autocomplete="off"><div class="rv-spot" id="rvSpot" hidden><span class="rv-spotn" aria-hidden="true">•</span><span>Pinned to a spot</span><button type="button" class="link" id="rvUnpin">Remove pin</button></div>
      <div class="inline"><label class="sr-only" for="rvText">Your note</label><input type="text" id="rvText" dir="auto" maxlength="400" placeholder="Add a note, or tap the picture to pin it" enterkeyhint="send"><button type="submit" class="mini" id="rvPost">Post</button></div></form>
    <ol class="rv-list" id="rvList"></ol><div class="status" id="rvSt" role="status"></div>
    <button type="button" class="link" id="rvClose">${o.back?'Back':'Close'}</button></div>`,'rv-dlg');
  const $=s=>dlg.querySelector(s); let list=[], pending=null, busy=false;
  const meta=()=>{ $('#rvMeta').innerHTML=d.review?`<b>${LABEL[d.review]}</b>${d.review_by?' · '+esc(d.review_by):''} · <bdi>${esc(ctx.ago(d.review_at))}</bdi>`:'Not sent for review'; };
  const acts=()=>{ const A=$('#rvActs'); const owner=whoNow().owner;
    A.innerHTML=(owner&&d.review==='in_review'?`<button type="button" class="btn" data-a="approved">${IC.check}<span>Approve</span></button><button type="button" class="link" data-a="changes">Ask for changes</button>`:'')
      +(d.review!=='in_review'&&d.review!=='approved'?`<button type="button" class="link" data-a="send">${d.review==='changes'?'Send for review again':'Send for review'}</button>`:'');
  };
  const draw=()=>{ const pins=list.filter(c=>c.x!=null&&c.y!=null); const num=c=>pins.indexOf(c)+1;
    $('#rvPic').querySelectorAll('.rv-pin').forEach(p=>p.remove());
    pins.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.className='rv-pin'+(c.resolved?' done':''); b.style.left=(c.x*100)+'%'; b.style.top=(c.y*100)+'%'; b.dataset.n=num(c); b.setAttribute('aria-label','Note '+num(c)+' by '+(c.author||'someone')); b.textContent=num(c);
      b.onclick=e=>{ e.stopPropagation(); const li=$('#rvList').querySelector('[data-c="'+c.id+'"]'); if(li){ li.scrollIntoView({block:'nearest'}); li.classList.add('flash'); setTimeout(()=>li.classList.remove('flash'),900); } }; $('#rvPic').appendChild(b); });
    if(pending){ let m=$('#rvPic').querySelector('.rv-pin.new'); if(!m){ m=document.createElement('span'); m.className='rv-pin new'; m.setAttribute('aria-hidden','true'); $('#rvPic').appendChild(m); } m.style.left=(pending.x*100)+'%'; m.style.top=(pending.y*100)+'%'; m.textContent=pins.length+1; }
    else { const m=$('#rvPic').querySelector('.rv-pin.new'); if(m) m.remove(); }
    $('#rvSpot').hidden=!pending;
    $('#rvList').innerHTML=list.length?list.map(c=>`<li class="rv-c${c.resolved?' resolved':''}" data-c="${esc(c.id)}"><span class="rv-n${c.x==null?' gen':''}" aria-hidden="true">${c.x==null?IC.chat.replace('width="22" height="22"','width="16" height="16"'):num(c)}</span>
        <div class="rv-ct"><div class="rv-who"><b dir="auto">${esc(c.author||'Someone')}</b><bdi class="small">${esc(ctx.ago(c.created_at))}</bdi>${c.x==null?'<span class="small">General note</span>':''}</div><p dir="auto">${esc(c.text)}</p></div>
        <button type="button" class="mini rv-res" data-res="${esc(c.id)}" aria-pressed="${!!c.resolved}">${c.resolved?'Reopen':'Resolve'}</button></li>`).join(''):'<li class="small rv-none">No notes yet.</li>'; };
  const load=async()=>{ try{ list=await C.comments(d.id); }catch(e){ $('#rvSt').textContent=e.message||'Could not load the notes.'; } draw(); };
  meta(); acts(); load();
  ctx.thumb(d.thumb_path).then(u=>{ if(u) $('#rvImg').src=u; }).catch(()=>{});
  $('#rvClose').onclick=()=>dlg.close();
  /* tap a spot: a pin goes there and the note box takes focus */
  $('#rvPic').addEventListener('click',e=>{ if(e.target.closest('.rv-pin:not(.new)')) return; const r=$('#rvPic').getBoundingClientRect(); if(!r.width||!r.height) return;
    pending={x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}; try{ ctx.haptic&&ctx.haptic('tick'); }catch(_){} draw(); $('#rvText').focus({preventScroll:true}); });
  $('#rvUnpin').onclick=()=>{ pending=null; draw(); };
  $('#rvForm').addEventListener('submit',async e=>{ e.preventDefault(); const t=$('#rvText').value.trim(); if(!t||busy) return; busy=true; $('#rvPost').disabled=true;
    try{ const author=await nameOf(ctx); await C.addComment({design_id:d.id,author,text:t,x:pending?+pending.x.toFixed(4):null,y:pending?+pending.y.toFixed(4):null}); $('#rvText').value=''; pending=null; $('#rvSt').textContent=''; await load(); }
    catch(err){ $('#rvSt').textContent=err.message||'Could not post that.'; } busy=false; $('#rvPost').disabled=false; });
  $('#rvList').addEventListener('click',async e=>{ const b=e.target.closest('[data-res]'); if(!b) return; const c=list.find(x=>x.id===b.dataset.res); if(!c) return;
    try{ await C.resolveComment(c.id,!c.resolved); c.resolved=!c.resolved; draw(); }catch(err){ $('#rvSt').textContent=err.message||'Could not change that.'; } });
  $('#rvActs').addEventListener('click',async e=>{ const b=e.target.closest('[data-a]'); if(!b||busy) return; busy=true; b.disabled=true;
    try{ const a=b.dataset.a; await setStatus(ctx,d,a==='send'?'in_review':a);
      ctx.refresh&&ctx.refresh(); meta(); acts();
      if(a==='approved') ctx.toast('Approved “'+d.name+'”. It is in the Approved collection.'); else if(a==='changes') ctx.toast('Asked for changes on “'+d.name+'”.'); else ctx.toast('Sent “'+d.name+'” for review.');
      if(o.back&&a!=='send'){ dlg.close(); } }
    catch(err){ $('#rvSt').textContent=err.message||'Could not do that.'; b.disabled=false; } busy=false; });
  dlg.addEventListener('close',()=>{ if(o.back) setTimeout(()=>queue(ctx),60); });
  return dlg;
}

/* ---------- the owner's queue: every design waiting for review ---------- */
function queue(ctx){
  const {esc}=ctx; const waiting=()=>ctx.designs().filter(d=>d.review==='in_review').sort((a,b)=>new Date(b.review_at||0)-new Date(a.review_at||0));
  const w=waiting();
  const dlg=ctx.dialog(`<div class="dlg-body rv-body"><h3>Waiting for your review</h3>
    ${w.length?`<ul class="rv-q">${w.map(d=>`<li><button type="button" class="rv-qrow" data-open="${esc(d.id)}"><span class="rv-qt"><img alt="" data-path="${esc(d.thumb_path||'')}"></span><span class="rv-qx" dir="auto"><b>${esc(d.name)}</b><small>${esc(d.review_by||d.author||'Someone')} · <bdi>${esc(ctx.ago(d.review_at))}</bdi></small></span></button></li>`).join('')}</ul>`:'<p class="small">Nothing is waiting. You are all caught up.</p>'}
    <button type="button" class="link" id="rvQx">Close</button></div>`,'rv-dlg');
  dlg.querySelectorAll('img[data-path]').forEach(i=>ctx.thumb(i.dataset.path).then(u=>{ if(u) i.src=u; }).catch(()=>{}));
  dlg.querySelector('#rvQx').onclick=()=>dlg.close();
  dlg.addEventListener('click',e=>{ const b=e.target.closest('[data-open]'); if(!b) return; const d=ctx.designs().find(x=>x.id===b.dataset.open); if(!d) return; dlg.close(); setTimeout(()=>openDesign(ctx,d,{back:true}),60); });
  return dlg;
}
window.StudioReview={LABEL,APPROVED,chip,send,openDesign,queue,whoNow};
})();

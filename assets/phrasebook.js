/* Phrasebook (preview "team"): the brand's approved lines by category, a Suggest box for anyone on the team, and for the owner a
   "Waiting for your OK" list (Approve / Edit & approve / Reject). Brand-agnostic: categories come from the kit's phraseCats, the built-in
   lines from its phrases. Approved rows join the word pickers through studio.js (phMerge); this file only edits the team's rows.
   Studio.phrasesApproved() lists everything approved. Loaded lazily by studio.js. */
(function(){
const DEF_CATS=[{id:'headline',label:'Headline',keys:['headlines']},{id:'small',label:'Small line',keys:['small']},{id:'button',label:'Button',keys:['buttons']},
  {id:'caption',label:'Caption',keys:[]},{id:'poll',label:'Poll',keys:[]},{id:'other',label:'Other',keys:[]}];
const STAT={suggested:'Waiting for the owner',approved:'Approved',rejected:'Not approved'};

function open(o){
  const B=o.brand, esc=o.esc, cats=(B.phraseCats&&B.phraseCats.length?B.phraseCats:DEF_CATS), dir=B.dir||'auto';
  const d=o.dialog(`<div class="dlg-body pb"><div class="lib-head"><h3 id="pbH">Phrasebook</h3><button type="button" class="mini" data-x>Done</button></div>
    <p class="small pb-note" id="pbNote" role="status">Loading…</p><div id="pbBody"></div></div>`,'pb-dlg');
  d.setAttribute('aria-labelledby','pbH'); d.tabIndex=-1;
  const body=d.querySelector('#pbBody'), note=d.querySelector('#pbNote'); d.querySelector('[data-x]').onclick=()=>d.close();
  let rows=[], C=null, signed=false, W=null, cat=cats[0].id, editing=null, failed='';
  const owner=()=>!!(W&&W.get()&&W.get().owner), me=()=>(W&&W.author&&W.author())||'';
  const catLabel=id=>(cats.find(c=>c.id===id)||{label:'Other'}).label;
  /* built-in lines per category: the kit's own phrases for that category's keys (shown read-only) */
  const builtIn=c=>{ const base=B._phBase||B.phrases||{}, out=[]; (c.keys||[]).forEach(k=>[].concat(base[k]||[]).forEach(l=>{ if(typeof l==='string'&&l&&!out.includes(l)) out.push(l); })); return out; };
  const line=(t,tag)=>`<button type="button" class="pb-line" data-copy="${esc(t)}"><span dir="auto" class="pb-t">${esc(t)}</span>${tag?`<i class="pb-tag">${esc(tag)}</i>`:''}<span class="pb-cp" aria-hidden="true">Copy</span></button>`;
  function paint(){
    const ok=rows.filter(r=>r.status==='approved'), wait=rows.filter(r=>r.status==='suggested'), mine=rows.filter(r=>me()&&r.author===me()&&(!owner()||r.status!=='suggested'));
    let h='';
    if(owner()&&wait.length) h+=`<section class="pb-sec pb-wait" aria-labelledby="pbW"><h4 id="pbW">Waiting for your OK</h4>${wait.map(r=>{
      const ed=editing===r.id;
      return `<div class="pb-card" data-id="${esc(r.id)}"><div class="pb-q" dir="auto">${esc(r.line)}</div><div class="pb-meta">${esc(catLabel(r.category))}${r.author?' · '+esc(r.author):''}</div>
        ${ed?`<input type="text" class="pb-edit" dir="${esc(dir)}" value="${esc(r.line)}" aria-label="Edit the line"><div class="pb-act"><button type="button" class="mini" data-cancel>Cancel</button><button type="button" class="btn" data-save>Approve this wording</button></div>`
          :`<div class="pb-act"><button type="button" class="btn" data-ok>Approve</button><button type="button" class="mini" data-edit>Edit &amp; approve</button><button type="button" class="mini" data-no>Reject</button></div>`}</div>`; }).join('')}</section>`;
    h+=`<section class="pb-sec" aria-labelledby="pbS"><h4 id="pbS">Suggest a line</h4>
      <input type="text" id="pbIn" class="pb-in" dir="${esc(dir)}" lang="${esc(B.lang||'')}" maxlength="120" autocomplete="off" aria-label="Your line" placeholder="${esc((B.phrases&&B.phrases.write)||'')}">
      <div class="chips" role="group" aria-label="Category">${cats.map(c=>`<button type="button" class="chip" data-cat="${esc(c.id)}" aria-pressed="${c.id===cat}">${esc(c.label)}</button>`).join('')}</div>
      <button type="button" class="btn pb-send" id="pbSend" ${signed?'':'disabled'}>Suggest</button><p class="small" id="pbMsg" role="status">${signed?'The owner sees it and decides.':'Sign in to suggest a line.'}</p></section>`;
    if(mine.length) h+=`<section class="pb-sec" aria-labelledby="pbM"><h4 id="pbM">Your suggestions</h4>${mine.map(r=>`<div class="pb-mine"><span dir="auto" class="pb-t">${esc(r.line)}</span><i class="pb-st s-${esc(r.status)}">${esc(STAT[r.status]||r.status)}</i></div>`).join('')}</section>`;
    h+=cats.map(c=>{ const a=ok.filter(r=>(r.category||'other')===c.id), b=builtIn(c); if(!a.length&&!b.length) return '';
      return `<section class="pb-sec" aria-label="${esc(c.label)}"><h4>${esc(c.label)}</h4><div class="pb-list">${a.map(r=>line(r.line,'')).join('')}${b.filter(t=>!a.some(r=>r.line===t)).map(t=>line(t,'built in')).join('')}</div></section>`; }).join('');
    body.innerHTML=h; bind();
  }
  async function reload(){
    try{ rows=await C.phrases(B.id); if(o.onChange) o.onChange(rows); }catch(_){}
  }
  async function act(fn,msg){ try{ await fn(); await reload(); }catch(e){ note.textContent=(e&&e.message)||'That did not work. Try again.'; return; } paint(); if(msg){ note.textContent=msg; } }
  function bind(){
    body.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ cat=b.dataset.cat; body.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
    const inp=body.querySelector('#pbIn'), send=body.querySelector('#pbSend'), msg=body.querySelector('#pbMsg');
    send.onclick=async()=>{ const t=inp.value.trim(); if(!t||!signed) return;
      let who=me(); if(!who&&W){ who=await W.ask({user:true}); if(!who){ msg.textContent='Add your name first so the owner knows who suggested it.'; return; } }
      send.disabled=true;
      try{ await C.suggestPhrase({brand:B.id,line:t,category:cat,author:who||null}); await reload(); paint(); const m=body.querySelector('#pbMsg'); if(m) m.textContent='Sent. The owner will see it.'; }
      catch(e){ msg.textContent=(e&&e.message)||'Could not send. Try again.'; send.disabled=false; } };
    body.querySelectorAll('.pb-line').forEach(b=>b.onclick=()=>{ const c=b.querySelector('.pb-cp'); c.textContent='Copied'; setTimeout(()=>{ c.textContent='Copy'; },1400); if(o.haptic) o.haptic('tick');
      const fb=()=>{ const t=document.createElement('textarea'); t.value=b.dataset.copy; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(_){} t.remove(); };
      try{ navigator.clipboard.writeText(b.dataset.copy).catch(fb); }catch(_){ fb(); } });
    body.querySelectorAll('.pb-card').forEach(card=>{ const id=card.dataset.id, by=me()||'owner';
      const q=s=>card.querySelector(s);
      if(q('[data-ok]')) q('[data-ok]').onclick=()=>act(()=>C.setPhraseStatus(id,'approved',by),'Approved. It is in the pickers now.');
      if(q('[data-no]')) q('[data-no]').onclick=()=>act(()=>C.setPhraseStatus(id,'rejected',by),'Not approved.');
      if(q('[data-edit]')) q('[data-edit]').onclick=()=>{ editing=id; paint(); const e=body.querySelector('.pb-edit'); if(e) e.focus(); };
      if(q('[data-cancel]')) q('[data-cancel]').onclick=()=>{ editing=null; paint(); };
      if(q('[data-save]')) q('[data-save]').onclick=()=>{ const t=q('.pb-edit').value.trim(); if(!t) return; editing=null; act(()=>C.setPhraseStatus(id,'approved',by,t),'Approved with your wording.'); }; });
  }
  (async()=>{
    try{ if(!W&&o.who) W=await o.who(); }catch(_){}
    try{ C=await o.cloud(); signed=!!(await C.session()); }catch(_){ C=null; }
    if(C&&signed) await reload();
    else rows=(()=>{ try{ return JSON.parse(localStorage.getItem('studio:phrases:'+B.id))||[]; }catch(_){ return []; } })();
    note.textContent=C?(signed?(owner()?'You can approve what the team suggests.':'Tap a line to copy it.'):'Sign in to suggest lines. Approved lines still work here.'):'No connection. Showing the lines saved on this device.';
    paint();
  })();
}
window.StudioPhrasebook={open};
})();

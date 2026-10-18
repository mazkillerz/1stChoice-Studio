/* Lab home: the list of experiments and the boards kept on this device. */
(async function(){
const L=Studio.lab, esc=L.esc, $=id=>document.getElementById(id);
const pv=(w,h,m)=>{ m=m||30; const k=m/Math.max(w,h); return `width:${Math.max(5,Math.round(w*k))}px;height:${Math.max(5,Math.round(h*k))}px`; };
await Studio.useBrand();
$('lockB').onclick=()=>{ L.lock(); location.href='../index.html'; };
const boards=()=>L.store('lab:boards')||[];
function ago(t){ const s=(Date.now()-t)/1000; if(s<60) return 'just now'; if(s<3600) return Math.round(s/60)+' min ago'; if(s<86400) return Math.round(s/3600)+' h ago'; return new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short'}); }
async function paint(){ const list=boards().sort((a,b)=>(b.updated||0)-(a.updated||0)), el=$('boards');
  if(!list.length){ el.innerHTML='<div class="b-empty">No boards yet. Start one with <b>New board</b>.</div>'; return; }
  el.innerHTML=list.map(b=>`<div class="bcard"><a href="board.html?id=${encodeURIComponent(b.id)}" class="b-link" style="text-decoration:none;color:inherit"><div class="b-th" data-th="${esc(b.id)}"></div><div class="b-meta"><b dir="auto">${esc(b.name||'Untitled board')}</b><small>${b.frames!=null?b.frames+' frame'+(b.frames===1?'':'s')+' · ':''}${ago(b.updated||b.created||Date.now())}</small></div></a><button type="button" class="b-more" data-more="${esc(b.id)}" aria-label="More for ${esc(b.name||'board')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg></button></div>`).join('');
  for(const b of list){ const t=await L.idb.get('bthumb:'+b.id); const box=el.querySelector(`[data-th="${CSS.escape(b.id)}"]`); if(t&&box) box.innerHTML=`<img src="${t}" alt="">`; } }
paint();
$('newB').onclick=()=>{ const d=L.dialog(`<div class="dlg-body"><h3>New board</h3><p class="small">Start with one frame. You can add frames of any size later.</p>
  <div class="preset-grid">${BD.PRESETS.slice(0,8).map(p=>`<button type="button" class="preset" data-p="${p.id}"><span class="pv" style="${pv(p.w,p.h)}"></span><b>${esc(p.label)}</b><small>${p.w} × ${p.h}</small></button>`).join('')}</div>
  <span class="lbl" style="font:800 11px var(--sans);text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Or a template</span><div class="chips">${BD.TEMPLATES.map(t=>`<button type="button" class="chip" data-t="${t.id}">${esc(t.label)}</button>`).join('')}</div>
  <div class="dlg-actions"><button type="button" class="mini" id="nbNo">Cancel</button></div></div>`,'wide');
  d.querySelector('#nbNo').onclick=()=>d.close();
  d.addEventListener('click',e=>{ const p=e.target.closest('[data-p]'), t=e.target.closest('[data-t]'); if(p) location.href='board.html?preset='+p.dataset.p; if(t) location.href='board.html?template='+t.dataset.t; }); };
$('importB').onclick=()=>$('pickBoard').click();
$('pickBoard').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; sessionStorage.setItem('lab:import','1'); importFile(f); };
async function importFile(f){ try{ const d=JSON.parse(await f.text()); if(!d||!d.nodes) throw new Error('That is not a board file.'); const id=Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4), map={};
    for(const [old,x] of Object.entries(d.files||{})){ const nid=Math.random().toString(36).slice(2,12); const blob=await (await fetch(x.data)).blob(); await L.idb.put('bimg:'+nid,blob); map[old]=nid; }
    const swap=o=>{ if(o.a&&o.a.imgId&&map[o.a.imgId]) o.a.imgId=map[o.a.imgId]; (o.k||[]).forEach(swap); }; d.nodes.forEach(swap); delete d.files; d.imgs=Object.values(map);
    await L.idb.put('board:'+id,JSON.stringify(d)); const list=boards(); list.unshift({id,name:d.name||'Imported board',created:Date.now(),updated:Date.now()}); L.store('lab:boards',list); location.href='board.html?id='+id; }
  catch(err){ const d=L.dialog(`<div class="dlg-body"><h3>Couldn't open it</h3><p class="small">${esc(err.message||'That file could not be read.')}</p><div class="dlg-actions"><button type="button" class="btn" id="ok">OK</button></div></div>`); d.querySelector('#ok').onclick=()=>d.close(); } }
$('boards').addEventListener('click',e=>{ const m=e.target.closest('[data-more]'); if(!m) return; const b=boards().find(x=>x.id===m.dataset.more); if(!b) return;
  const d=L.dialog(`<div class="dlg-body"><h3 dir="auto">${esc(b.name||'Untitled board')}</h3><div class="inline"><input type="text" id="rn" dir="auto" maxlength="60" aria-label="Board name"><button type="button" class="mini solid" id="rnGo">Rename</button></div>
    <div class="dlg-actions col"><button type="button" class="btn ghost" id="dup">Duplicate</button><button type="button" class="btn danger" id="del">Delete</button></div><button type="button" class="link" id="cl">Close</button></div>`);
  d.querySelector('#rn').value=b.name||''; d.querySelector('#cl').onclick=()=>d.close();
  d.querySelector('#rnGo').onclick=async()=>{ const v=d.querySelector('#rn').value.trim()||'Untitled board'; const list=boards(); const e2=list.find(x=>x.id===b.id); e2.name=v; L.store('lab:boards',list); const raw=await L.idb.get('board:'+b.id); if(raw){ const doc=JSON.parse(raw); doc.name=v; await L.idb.put('board:'+b.id,JSON.stringify(doc)); } d.close(); paint(); };
  d.querySelector('#dup').onclick=async()=>{ const raw=await L.idb.get('board:'+b.id); if(!raw) return; const doc=JSON.parse(raw), id=Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); doc.name=(b.name||'Board')+' copy'; await L.idb.put('board:'+id,JSON.stringify(doc)); const t=await L.idb.get('bthumb:'+b.id); if(t) await L.idb.put('bthumb:'+id,t); const list=boards(); list.unshift({id,name:doc.name,created:Date.now(),updated:Date.now(),frames:b.frames}); L.store('lab:boards',list); d.close(); paint(); };
  d.querySelector('#del').onclick=async ev=>{ const btn=ev.currentTarget; if(!btn.dataset.armed){ btn.dataset.armed='1'; btn.textContent='Tap again to delete for good'; return; }
    const raw=await L.idb.get('board:'+b.id); /* photos may be shared with a duplicate, so only remove ones no other board uses */
    const others=new Set(); for(const o of boards()){ if(o.id===b.id) continue; const r=await L.idb.get('board:'+o.id); if(r){ (JSON.parse(r).imgs||[]).forEach(x=>others.add(x)); } }
    if(raw){ for(const id of (JSON.parse(raw).imgs||[])) if(!others.has(id)) await L.idb.del('bimg:'+id); }
    await L.idb.del('board:'+b.id); await L.idb.del('bthumb:'+b.id); L.store('lab:boards',boards().filter(x=>x.id!==b.id)); d.close(); paint(); }; });
})();

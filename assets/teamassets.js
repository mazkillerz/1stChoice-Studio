/* Team assets (Studio 2.3.0): the library of pictures the whole team adds (a partner's logo, a cut-out) and the add flow.
   Brand-agnostic. Lazy: Studio.lazy('teamassets',{css:1}) -> window.StudioTeamAssets.
   StudioTeamAssets.open({brand?,mode:'pick'|'manage',onPick(row),onClose?}) opens the full-screen library.
   StudioTeamAssets.blobOf(row) -> Promise<Blob> (the HD picture), StudioTeamAssets.recent(brand,n) -> Promise<{rows,urls}|null> (null = not available).
   A row is {id,brand,name,tags[],folder,path,prev_path,w,h,cutout,author,created_at}. Files: <brand>/assets/<id>/full.png + prev.png.
   The background remover is assets/cutout-pro.js (StudioCutoutPro), loaded only when someone adds a picture. */
(function(){
'use strict';
const L=()=>(window.Studio&&window.Studio.lab)||{};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nrm=s=>window.Studio&&window.Studio.normText?window.Studio.normText(String(s||'')):String(s||'').toLowerCase();
const ic=n=>((L().ICON||{})[n])||'';
const ls=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(_){} return null; };
const MAX_LONG=2048, PREV_LONG=256, MAX_BYTES=25*1024*1024;
const GROUNDS=[['checker','Checker'],['white','White'],['black','Black'],['mid','Colour']];
const SORTS=[['new','Newest'],['name','Name A–Z'],['used','Most used on this device']];

/* ---------- small helpers ---------- */
const cleanName=f=>String(f||'').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[_\-.]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60);
const cleanTags=a=>{ const seen=new Set(), out=[]; (a||[]).forEach(t=>{ t=String(t||'').replace(/\s+/g,' ').trim().slice(0,30); const k=nrm(t); if(t&&!seen.has(k)){ seen.add(k); out.push(t); } }); return out.slice(0,12); };
const toBlob=(c,type)=>new Promise(r=>c.toBlob(r,type||'image/png'));
function scaled(src,long){ const w=src.naturalWidth||src.width, h=src.naturalHeight||src.height, k=Math.min(1,long/Math.max(w,h));
  const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w*k)); c.height=Math.max(1,Math.round(h*k));
  const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';
  if(k<0.5&&L().stepDown){ try{ const s=L().stepDown(src,c.width,c.height); x.drawImage(s,0,0,c.width,c.height); return c; }catch(_){} }
  x.drawImage(src,0,0,c.width,c.height); return c; }
const usesKey=b=>'studio:ta:uses:'+b;
const usesOf=b=>{ try{ return JSON.parse(ls(usesKey(b))||'{}')||{}; }catch(_){ return {}; } };
const bump=(b,id)=>{ const u=usesOf(b); u[id]=(u[id]||0)+1; ls(usesKey(b),JSON.stringify(u)); };
async function authorName(){ try{ const W=window.StudioWho||await window.Studio.lazy('who'); return (W&&W.author&&W.author())||null; }catch(_){ return null; } }
async function cutoutPro(){ try{ return window.StudioCutoutPro||await window.Studio.lazy('cutout-pro'); }catch(_){ return null; } }
async function cloud(){ return L().cloud?await L().cloud():window.StudioCloud; }
async function blobOf(row){ const C=await cloud(); return C.download(row.path); }
async function recent(brand,n){
  try{ const C=await cloud(); if(!C.teamAssetsReady||!(await C.session())||!(await C.isMember())||!(await C.teamAssetsReady())) return null;
    const rows=(await C.teamAssets(brand)).slice(0,n||6); const urls=rows.length?await C.fileUrls(rows.map(r=>r.prev_path||r.path)):{}; return {rows,urls}; }catch(_){ return null; } }

/* ---------- tag editor + folder picker (used by the add flow and the edit sheet) ---------- */
function tagEditor(host,initial,suggest){
  let tags=cleanTags(initial);
  host.innerHTML=`<div class="ta-tags"><div class="ta-tagrow"></div><input type="text" class="ta-taginp" dir="auto" autocomplete="off" enterkeyhint="done" placeholder="Type a tag, press Enter" aria-label="Add a tag"></div><div class="ta-sugg chips" role="group" aria-label="Tags already used"></div>`;
  const row=host.querySelector('.ta-tagrow'), inp=host.querySelector('.ta-taginp'), sg=host.querySelector('.ta-sugg');
  const paint=()=>{ row.innerHTML=tags.map((t,i)=>`<span class="ta-tag" dir="auto">${esc(t)}<button type="button" data-rm="${i}" aria-label="Remove tag ${esc(t)}">${ic('close')}</button></span>`).join('');
    const have=new Set(tags.map(nrm)); const list=(suggest||[]).filter(t=>!have.has(nrm(t))).slice(0,8);
    sg.innerHTML=list.map(t=>`<button type="button" class="chip sm" data-sg="${esc(t)}" dir="auto">+ ${esc(t)}</button>`).join(''); sg.hidden=!list.length; };
  const add=v=>{ tags=cleanTags([...tags,...String(v).split(/[,،\n]/)]); inp.value=''; paint(); };
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===','||e.key==='،'){ e.preventDefault(); if(inp.value.trim()) add(inp.value); } else if(e.key==='Backspace'&&!inp.value&&tags.length){ tags.pop(); paint(); } });
  inp.addEventListener('input',()=>{ if(/[,،]/.test(inp.value)) add(inp.value); });
  inp.addEventListener('blur',()=>{ if(inp.value.trim()) add(inp.value); });
  host.addEventListener('click',e=>{ const r=e.target.closest('[data-rm]'), s=e.target.closest('[data-sg]'); if(r){ tags.splice(+r.dataset.rm,1); paint(); } else if(s){ add(s.dataset.sg); } });
  paint();
  return {get:()=>{ if(inp.value.trim()) add(inp.value); return tags.slice(); }};
}
function folderPicker(host,folders,initial){
  let cur=initial||'', list=[...new Set(folders.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(cur&&!list.includes(cur)) list.push(cur);
  host.innerHTML='<div class="chips ta-fchips" role="group" aria-label="Folder"></div><div class="ta-newf" hidden><input type="text" dir="auto" maxlength="30" autocomplete="off" placeholder="Folder name" aria-label="New folder name"></div>';
  const chips=host.querySelector('.ta-fchips'), nf=host.querySelector('.ta-newf'), inp=nf.querySelector('input'); let creating=false;
  const paint=()=>{ chips.innerHTML=`<button type="button" class="chip" data-f="" aria-pressed="${!creating&&!cur}">No folder</button>`+list.map(f=>`<button type="button" class="chip" data-f="${esc(f)}" aria-pressed="${!creating&&cur===f}" dir="auto">${esc(f)}</button>`).join('')+`<button type="button" class="chip add" data-new aria-pressed="${creating}">${ic('plus')}New folder</button>`; nf.hidden=!creating; };
  chips.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; if(b.hasAttribute('data-new')){ creating=true; paint(); inp.focus(); } else { creating=false; cur=b.dataset.f; paint(); } });
  paint();
  return {get:()=>creating?(inp.value.replace(/\s+/g,' ').trim().slice(0,30)||cur):cur};
}

/* ---------- the library ---------- */
async function open(o){
  o=o||{}; const Lab=L(), brandObj=Lab.brand&&Lab.brand(), brand=o.brand||(brandObj&&brandObj.id)||'brand', mode=o.mode==='pick'?'pick':'manage';
  const dlg=Lab.dialog||(h=>{ const d=document.createElement('dialog'); d.className='dlg'; d.innerHTML=h; document.body.appendChild(d); d.showModal(); return d; });
  let rows=[], status='loading', q='', folder='', sort=ls('studio:ta:sort')||'new', selected=null, C=null, urls={}, busyAdd=false;
  if(!SORTS.some(s=>s[0]===sort)) sort='new';
  const d=dlg(`<div class="ta-wrap">
    <div class="ta-top"><div class="ta-bar"><button type="button" class="ta-x" data-back aria-label="Back">${ic('back')}</button><h3 id="taTitle">Team assets</h3><button type="button" class="btn slim ta-addbtn" data-add>${ic('plus')}<span>Add</span></button></div>
      <label class="ta-search"><span class="sr-only">Search team assets</span>${ic('search')}<input type="search" id="taQ" dir="auto" autocomplete="off" placeholder="Search by name or tag" enterkeyhint="search"></label>
      <div class="ta-filters"><div class="chips ta-chips" id="taChips" role="group" aria-label="Folder"></div><button type="button" class="link ta-sort" data-sort aria-haspopup="dialog">${ic('sort')}<span id="taSortL">Newest</span></button></div></div>
    <div class="ta-body" id="taBody" aria-live="polite"></div>
    <input type="file" id="taFile" accept="image/*" multiple hidden>
    <div class="ta-add" id="taAdd" hidden></div></div>`,'ta-dlg ta-full');
  d.setAttribute('aria-labelledby','taTitle'); const $=s=>d.querySelector(s);
  const toast=m=>{ const t=document.createElement('div'); t.className='ta-toast'; t.setAttribute('role','status'); t.textContent=m; $('.ta-wrap').appendChild(t); setTimeout(()=>t.remove(),3800); };

  /* previews load in batches as tiles scroll into view (signed links, like the calendar's design picker) */
  const pending=new Set(); let ft=0;
  const fill=()=>d.querySelectorAll('img[data-path]').forEach(im=>{ const u=urls[im.dataset.path]; if(u&&im.getAttribute('src')!==u){ im.src=u; } });
  const flush=()=>{ ft=0; const need=[...pending].filter(p=>!urls[p]); pending.clear(); if(!need.length||!C) return fill(); C.fileUrls(need).then(u=>{ Object.assign(urls,u); fill(); }).catch(()=>{}); };
  const io=typeof IntersectionObserver==='function'?new IntersectionObserver(es=>es.forEach(en=>{ if(!en.isIntersecting) return; const im=en.target; io.unobserve(im); const p=im.dataset.path; if(urls[p]) im.src=urls[p]; else if(p){ pending.add(p); clearTimeout(ft); ft=setTimeout(flush,40); } }),{root:d,rootMargin:'400px 0px'}):null;
  const watchImgs=()=>d.querySelectorAll('#taBody img[data-path]').forEach(im=>{ if(im.getAttribute('src')) return; if(io) io.observe(im); else{ pending.add(im.dataset.path); clearTimeout(ft); ft=setTimeout(flush,40); } });

  const folders=()=>[...new Set(rows.map(r=>r.folder).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const allTags=()=>{ const n={}; rows.forEach(r=>(r.tags||[]).forEach(t=>{ n[t]=(n[t]||0)+1; })); return Object.keys(n).sort((a,b)=>n[b]-n[a]||a.localeCompare(b)); };
  const hay=r=>nrm([r.name,(r.tags||[]).join(' '),r.folder||''].join(' '));
  function shown(){ const nq=nrm(q).trim(); let list=rows.filter(r=>(!folder||r.folder===folder)&&(!nq||hay(r).includes(nq)));
    if(sort==='name') list=list.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
    else if(sort==='used'){ const u=usesOf(brand); list=list.slice().sort((a,b)=>(u[b.id]||0)-(u[a.id]||0)||String(b.created_at).localeCompare(String(a.created_at))); }
    return list; }
  function paintChips(){ const fs=folders(); if(folder&&!fs.includes(folder)) folder='';
    $('#taChips').innerHTML=`<button type="button" class="chip" data-folder="" aria-pressed="${!folder}">All</button>`+fs.map(f=>`<button type="button" class="chip" data-folder="${esc(f)}" aria-pressed="${folder===f}" dir="auto">${esc(f)}</button>`).join('');
    $('#taChips').hidden=!fs.length; $('#taSortL').textContent=(SORTS.find(s=>s[0]===sort)||SORTS[0])[1].replace(' on this device',''); }
  function msg(icon,title,text,btns){ return `<div class="ta-note"><div class="ta-note-ic">${ic(icon)}</div><b>${esc(title)}</b><p>${esc(text)}</p>${btns||''}</div>`; }
  function paint(){
    const body=$('#taBody'); const live=status==='ok';
    $('[data-add]').hidden=!(live||status==='empty'); $('.ta-search').hidden=!live; $('.ta-filters').hidden=!live;
    if(status==='loading'){ body.innerHTML='<div class="ta-grid ta-skel" aria-label="Loading">'+'<div class="ta-sk"></div>'.repeat(9)+'</div>'; return; }
    if(status==='signedout'){ body.innerHTML=msg('user','Sign in to see the team’s assets','Everything the team adds is shared here.','<button type="button" class="btn slim" data-signin>Sign in</button>'); return; }
    if(status==='off'){ body.innerHTML=msg('lab','Team assets are switched on by the owner once','Ask them to approve it. Nothing is lost, and the brand assets keep working.'); return; }
    if(status==='offline'){ body.innerHTML=msg('clock','No connection','Team assets need the internet to load.','<button type="button" class="btn slim" data-retry>Try again</button>'); return; }
    if(status==='empty'){ body.innerHTML=msg('photo','No team assets yet','Add a logo or a cut-out and everyone on the team can use it.','<button type="button" class="btn slim" data-add>'+ic('plus')+'<span>Add</span></button>'); return; }
    paintChips(); const list=shown();
    if(!list.length){ body.innerHTML=`<p class="small ta-none">No assets match. Clear the search or pick All.</p>`; return; }
    body.innerHTML='<div class="ta-grid">'+list.map(r=>`<div class="ta-tile${selected===r.id?' sel':''}" data-id="${esc(r.id)}"><button type="button" class="ta-pic" data-tile="${esc(r.id)}" aria-label="${esc((mode==='pick'?'Use ':'Details for ')+r.name)}"><img alt="" decoding="async" data-path="${esc(r.prev_path||r.path)}"${urls[r.prev_path||r.path]?` src="${esc(urls[r.prev_path||r.path])}"`:''}></button><button type="button" class="ta-more" data-more="${esc(r.id)}" aria-label="Options for ${esc(r.name)}">${ic('more')}</button><b class="ta-nm" dir="auto">${esc(r.name)}</b><small class="ta-tg" dir="auto">${esc((r.tags||[]).join(' · '))||'&nbsp;'}</small></div>`).join('')+'</div>';
    watchImgs(); if(selected){ const t=body.querySelector('.ta-tile.sel'); if(t&&t.scrollIntoView) t.scrollIntoView({block:'nearest'}); } }

  async function load(){
    status='loading'; paint();
    try{ C=await cloud(); const R=C.checkMember||C.isMember;
      if(!(await C.session())||!(await R.call(C))){ status='signedout'; paint(); return; }
      if(!(await C.teamAssetsReady())){ status='off'; paint(); return; }
      rows=await C.teamAssets(brand); status=rows.length?'ok':'empty'; paint();
    }catch(e){ status=(C&&C.netErr&&C.netErr(e))||/network|fetch|abort|timeout|offline/i.test(String(e&&e.message))?'offline':'offline'; paint(); }
  }

  /* ---- an asset's details: rename, tags, folder, remove ---- */
  function editSheet(r){
    const e=dlg(`<form class="dlg-body ta-edit" method="dialog"><h3 id="taEH">Edit asset</h3>
      <div class="ta-edit-top"><span class="ta-thumb"><img alt="" src="${esc(urls[r.prev_path||r.path]||'')}"></span><div class="field"><label class="lbl" for="taEN">Name</label><input type="text" id="taEN" dir="auto" maxlength="60" value="${esc(r.name)}" required autocomplete="off"></div></div>
      <div class="field"><span class="lbl">Folder</span><div id="taEF"></div></div>
      <div class="field"><span class="lbl">Tags</span><div id="taET"></div></div>
      ${r.author?`<p class="small">Added by ${esc(r.author)}</p>`:''}
      <div class="dlg-actions"><button type="button" class="mini" data-cancel>Cancel</button><button type="submit" class="btn" id="taES">Save</button></div>
      <button type="button" class="link ta-remove" data-remove>Remove from library</button></form>`,'ta-edit-dlg');
    e.setAttribute('aria-labelledby','taEH'); const E=s=>e.querySelector(s);
    const fp=folderPicker(E('#taEF'),folders(),r.folder||''), tg=tagEditor(E('#taET'),r.tags,allTags());
    E('[data-cancel]').onclick=()=>e.close();
    E('form').addEventListener('submit',async ev=>{ ev.preventDefault(); const name=E('#taEN').value.replace(/\s+/g,' ').trim(); if(!name){ E('#taEN').focus(); return; }
      const patch={name,tags:tg.get(),folder:fp.get()||null}; E('#taES').disabled=true;
      try{ await C.updateTeamAsset(r.id,patch); Object.assign(r,patch); e.close(); paint(); }catch(_){ E('#taES').disabled=false; toast('Could not save. Check your connection and try again.'); } });
    E('[data-remove]').onclick=()=>confirmRemove(r,e);
  }
  function confirmRemove(r,parent){
    const c=dlg(`<div class="dlg-body"><h3 id="taRH">Remove “${esc(r.name)}”?</h3><p class="small">Designs that already use it keep it.</p><div class="dlg-actions"><button type="button" class="mini" data-no>Cancel</button><button type="button" class="btn danger" data-yes>Remove</button></div></div>`);
    c.setAttribute('aria-labelledby','taRH'); c.querySelector('[data-no]').onclick=()=>c.close();
    c.querySelector('[data-yes]').onclick=async()=>{ const b=c.querySelector('[data-yes]'); b.disabled=true;
      try{ await C.removeTeamAsset(r.id); rows=rows.filter(x=>x.id!==r.id); if(!rows.length) status='empty'; c.close(); if(parent) parent.close(); paint(); toast('Removed from the library.'); }catch(_){ b.disabled=false; toast('Could not remove it. Try again.'); } };
  }
  function sortSheet(){
    const s=dlg(`<div class="dlg-body ta-sortsheet"><h3 id="taSH">Sort by</h3><div class="ta-sortlist" role="group" aria-labelledby="taSH">${SORTS.map(([k,l])=>`<button type="button" class="chip ta-sortopt" data-s="${k}" aria-pressed="${sort===k}">${esc(l)}</button>`).join('')}</div></div>`,'ta-sort-dlg');
    s.setAttribute('aria-labelledby','taSH');
    s.addEventListener('click',e=>{ const b=e.target.closest('[data-s]'); if(!b) return; sort=b.dataset.s; ls('studio:ta:sort',sort); s.close(); paint(); });
  }

  /* ---- the add flow: pick pictures -> background -> details -> upload (one overlay, no page jumps) ---- */
  const A=$('#taAdd'); let queue=[], qi=0, qTotal=0, cur=null, added=[], recomputeT=0, adding=false;
  const closeAdd=()=>{ A.hidden=true; A.innerHTML=''; cur=null; queue=[]; adding=false; d.classList.remove('ta-adding'); };
  async function startFiles(files){
    files=[...files].filter(f=>f&&(/^image\//.test(f.type||'')||(Lab.isHeic&&Lab.isHeic(f)))); if(!files.length){ toast('Pick a picture file.'); return; }
    const ok=[]; files.forEach(f=>{ if(f.size>MAX_BYTES) toast('“'+(f.name||'That picture')+'” is over 25 MB. Try a smaller copy.'); else ok.push(f); });
    if(!ok.length) return;
    if(adding){ queue.push(...ok); qTotal+=ok.length; paintAddHead(); return; }
    queue=ok.slice(); qi=0; qTotal=ok.length; added=[]; adding=true; A.hidden=false; d.classList.add('ta-adding'); nextItem();
  }
  function paintAddHead(){ const t=A.querySelector('.ta-add-count'); if(t) t.textContent=qTotal>1?(qi+1)+' of '+qTotal:''; }
  async function nextItem(){
    if(qi>=queue.length){ finishAll(); return; }
    const f=queue[qi]; cur={file:f,name:cleanName(f.name),mode:'keep',tol:50,holes:true,result:null,token:0,analysis:null,busy:true,ground:'checker'};
    A.innerHTML=`<div class="ta-add-in"><div class="ta-bar"><button type="button" class="ta-x" data-addback aria-label="Close">${ic('close')}</button><h3 id="taAH">Add asset</h3><span class="small ta-add-count"></span></div><div class="ta-add-body"><div class="ta-stage"><p class="small">Opening picture…</p></div></div></div>`;
    paintAddHead();
    try{
      const src=await (Lab.loadFile?Lab.loadFile(f):createImageBitmap(f)); cur.base=scaled(src,MAX_LONG); if(src.close) src.close();
      const P=await cutoutPro(); cur.P=P;
      try{ cur.analysis=P?await P.analyse(cur.base):null; }catch(_){ cur.analysis=null; }
      const s=cur.analysis&&cur.analysis.suggest; cur.mode=!P?'keep':(s==='logo'||s==='photo')?s:'keep';
      cur.fresh=cur.mode;
    }catch(_){ toast('That picture could not be opened.'); qi++; if(qi>=queue.length&&!added.length){ closeAdd(); return; } nextItem(); return; }
    bgStep();
  }
  function bgStep(){
    const c=cur, hasP=!!c.P, an=c.analysis||{};
    const note=!hasP?'The background remover is not available right now. You can still add the picture as it is.':an.hasAlpha?'This picture already has a see-through background.':'';
    A.querySelector('.ta-add-in').innerHTML=`<div class="ta-bar"><button type="button" class="ta-x" data-addback aria-label="Close">${ic('close')}</button><h3 id="taAH">Background</h3><span class="small ta-add-count"></span></div>
      <div class="ta-add-body"><div class="ta-stage" data-ground="${c.ground}"><canvas id="taPrev" aria-label="Preview of the picture"></canvas></div>
      <div class="ta-grounds" role="group" aria-label="Preview ground">${GROUNDS.map(([k,l])=>`<button type="button" class="ta-gr" data-g="${k}" data-ground="${k}" aria-pressed="${c.ground===k}" aria-label="${l}"><i></i></button>`).join('')}</div>
      <div class="ta-seg" role="group" aria-label="Background">${[['keep','Keep'],['logo','Logo'],['photo','Photo']].map(([k,l])=>`<button type="button" data-mode="${k}" aria-pressed="${c.mode===k}"${!hasP&&k!=='keep'?' disabled':''}>${l}</button>`).join('')}</div>
      <div class="ta-opts" id="taOpts"></div>
      <p class="small ta-prog" id="taProg" role="status" aria-live="polite">${esc(note)}</p></div>
      <div class="ta-add-foot"><button type="button" class="link" data-addback>Cancel</button><button type="button" class="btn slim" id="taNext" disabled>Next</button></div>`;
    paintAddHead(); paintOpts(); recompute(true);
  }
  function paintOpts(){ const c=cur, host=A.querySelector('#taOpts'); if(!host) return;
    host.innerHTML=c.mode==='logo'?`<label class="ta-row"><span class="lbl">Strength</span><input type="range" id="taTol" min="0" max="100" step="1" value="${c.tol}" aria-label="Strength"></label>
      <label class="ta-row ta-sw"><span>Clear inside areas<small class="small">Letters like O and A</small></span><input type="checkbox" class="switch" id="taHoles" role="switch" ${c.holes?'checked':''}></label>`
      :c.mode==='photo'?'<p class="small">Best for a product or a person on a busy background.</p>':'<p class="small">The picture is added exactly as it is.</p>'; }
  function drawPrev(){ const cv=A.querySelector('#taPrev'); if(!cv||!cur.result) return; const r=cur.result, k=Math.min(1,900/Math.max(r.width,r.height)); cv.width=Math.max(1,Math.round(r.width*k)); cv.height=Math.max(1,Math.round(r.height*k)); const x=cv.getContext('2d'); x.clearRect(0,0,cv.width,cv.height); x.imageSmoothingQuality='high'; x.drawImage(r,0,0,cv.width,cv.height); }
  async function recompute(now){
    const c=cur; clearTimeout(recomputeT); const go=async()=>{ const tok=++c.token; c.busy=true; const nx=A.querySelector('#taNext'), pr=A.querySelector('#taProg'); if(nx) nx.disabled=true;
      try{ let res;
        if(c.mode==='keep'||!c.P){ res=c.base; if(pr&&!(c.analysis&&c.analysis.hasAlpha)&&!c.P) {} }
        else{ if(pr) pr.textContent=c.mode==='photo'?'Working on the edges…':'Cutting out…';
          res=await c.P.run(c.base,{mode:c.mode,tolerance:c.tol,holes:c.holes,onProgress:t=>{ if(cur===c&&c.token===tok){ const p=A.querySelector('#taProg'); if(p) p.textContent=t; } }}); }
        if(cur!==c||c.token!==tok) return;
        c.result=(c.mode==='keep'||!c.P)?res:c.P.trim(res,8); if(c.mode==='keep'&&c.P&&c.analysis&&c.analysis.hasAlpha) c.result=c.P.trim(res,8);
        if(pr) pr.textContent=c.analysis&&c.analysis.hasAlpha&&c.mode==='keep'?'This picture already has a see-through background.':''; c.busy=false; drawPrev(); if(nx) nx.disabled=false;
      }catch(err){ if(cur!==c||c.token!==tok) return; c.mode='keep'; c.result=c.base; c.busy=false; paintOpts(); A.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode==='keep')));
        if(pr) pr.textContent='The background could not be removed here, so the picture stays as it is.'; drawPrev(); if(nx) nx.disabled=false; } };
    if(now) go(); else recomputeT=setTimeout(go,240);
  }
  function detailsStep(){
    const c=cur, last=ls('studio:ta:folder')||'', def=c.fresh==='logo'&&c.mode==='logo'?'Logos':(last||''), fs=folders(); if(def&&!fs.includes(def)) fs.push(def);
    A.querySelector('.ta-add-in').innerHTML=`<div class="ta-bar"><button type="button" class="ta-x" data-stepback aria-label="Back">${ic('back')}</button><h3 id="taAH">Details</h3><span class="small ta-add-count"></span></div>
      <div class="ta-add-body"><div class="ta-edit-top"><span class="ta-thumb big"><canvas id="taThumb"></canvas></span><div class="field"><label class="lbl" for="taAN">Name</label><input type="text" id="taAN" dir="auto" maxlength="60" required autocomplete="off" value="${esc(c.name)}"></div></div>
      <div class="field"><span class="lbl">Folder</span><div id="taAF"></div></div>
      <div class="field"><span class="lbl">Tags <span class="lbl-opt">optional</span></span><div id="taAT"></div></div>
      <p class="small ta-prog" id="taProg" role="status" aria-live="polite"></p></div>
      <div class="ta-add-foot"><button type="button" class="link" data-addback>Cancel</button><button type="button" class="btn slim" id="taGo">Add for the team</button></div>`;
    paintAddHead(); const cv=A.querySelector('#taThumb'), r=c.result, k=Math.min(1,160/Math.max(r.width,r.height)); cv.width=Math.round(r.width*k)||1; cv.height=Math.round(r.height*k)||1; cv.getContext('2d').drawImage(r,0,0,cv.width,cv.height);
    c.fp=folderPicker(A.querySelector('#taAF'),fs,def); c.tg=tagEditor(A.querySelector('#taAT'),[],allTags());
  }
  async function upload(){
    const c=cur, name=A.querySelector('#taAN').value.replace(/\s+/g,' ').trim(), go=A.querySelector('#taGo'), pr=A.querySelector('#taProg');
    if(!name){ A.querySelector('#taAN').focus(); pr.textContent='Give it a name first.'; return; }
    go.disabled=true; pr.textContent='Adding…'; const fol=c.fp.get()||null, tags=c.tg.get();
    try{
      const r=c.result, blob=await toBlob(r), prevBlob=await toBlob(scaled(r,PREV_LONG)); if(!blob) throw new Error('png');
      const row=await C.saveTeamAsset({brand,name,tags,folder:fol,blob,prevBlob,w:r.width,h:r.height,cutout:c.mode!=='keep'||!!(c.analysis&&c.analysis.hasAlpha),author:await authorName()});
      if(fol) ls('studio:ta:folder',fol);
      rows.unshift(row); added.push(row); status='ok'; selected=row.id; folder=''; q=''; $('#taQ').value=''; try{ Object.assign(urls,await C.fileUrls([row.prev_path||row.path])); }catch(_){}
      qi++; paint(); if(qi<queue.length) nextItem(); else finishAll();
    }catch(_){ go.disabled=false; pr.textContent='Could not add it. Check your connection and try again.'; }
  }
  function finishAll(){
    const last=added[added.length-1];
    if(mode==='pick'&&last){ adding=true; A.querySelector('.ta-add-in').innerHTML=`<div class="ta-bar"><span style="width:44px"></span><h3 id="taAH">Added</h3><span style="width:44px"></span></div><div class="ta-add-body ta-done"><div class="ta-thumb big"><img alt="" src="${esc(urls[last.prev_path||last.path]||'')}"></div><b dir="auto">${esc(last.name)}</b><p class="small">${added.length>1?added.length+' assets are now':'It is now'} in the team library.</p></div><div class="ta-add-foot"><button type="button" class="link" data-addback>Back to library</button><button type="button" class="btn slim" data-usenow>Use it now</button></div>`; A.hidden=false; return; }
    closeAdd(); if(added.length) toast(added.length>1?added.length+' assets added for the team.':'Added for the team.');
  }
  const finishPick=r=>{ bump(brand,r.id); d.close(); if(o.onPick) o.onPick(r); };

  /* ---- events ---- */
  d.addEventListener('click',e=>{ const t=e.target; let b;
    if(t.closest('[data-back]')){ d.close(); return; }
    if(t.closest('[data-add]')){ if(status==='off'||status==='signedout'||status==='offline') return; $('#taFile').value=''; $('#taFile').click(); return; }
    if(t.closest('[data-signin]')){ (Lab.ensureMember?Lab.ensureMember('Sign in to see the team’s assets and add your own.'):Promise.resolve(false)).then(ok=>{ if(ok) load(); }); return; }
    if(t.closest('[data-retry]')){ load(); return; }
    if(t.closest('[data-sort]')){ sortSheet(); return; }
    if(b=t.closest('[data-folder]')){ folder=b.dataset.folder; paint(); return; }
    if(b=t.closest('[data-more]')){ const r=rows.find(x=>x.id===b.dataset.more); if(r) editSheet(r); return; }
    if(b=t.closest('[data-tile]')){ const r=rows.find(x=>x.id===b.dataset.tile); if(!r) return; if(mode==='pick') finishPick(r); else editSheet(r); return; }
    /* add flow */
    if(t.closest('[data-addback]')){ if(adding&&qi>=queue.length&&added.length){ closeAdd(); return; } closeAdd(); return; }
    if(t.closest('[data-usenow]')){ const r=added[added.length-1]; closeAdd(); if(r) finishPick(r); return; }
    if(t.closest('[data-stepback]')){ bgStep(); return; }
    if(b=t.closest('[data-mode]')){ if(b.disabled) return; cur.mode=b.dataset.mode; A.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); paintOpts(); recompute(true); return; }
    if(b=t.closest('[data-g]')){ cur.ground=b.dataset.g; A.querySelector('.ta-stage').dataset.ground=cur.ground; A.querySelectorAll('[data-g]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); return; }
    if(t.closest('#taNext')){ if(!cur.busy&&cur.result){ cur.name=cur.name||cleanName(cur.file.name); detailsStep(); } return; }
    if(t.closest('#taGo')){ upload(); return; } });
  d.addEventListener('input',e=>{ const t=e.target;
    if(t.id==='taQ'){ q=t.value; paint(); }
    else if(t.id==='taTol'){ cur.tol=+t.value; recompute(false); }
    else if(t.id==='taHoles'){ cur.holes=t.checked; recompute(false); } });
  d.addEventListener('change',e=>{ if(e.target.id==='taHoles'){ cur.holes=e.target.checked; recompute(false); } else if(e.target.id==='taFile') startFiles(e.target.files); });
  /* press and hold a tile opens its details (pick mode: a tap picks) */
  let hold=0, held=false; d.addEventListener('pointerdown',e=>{ const b=e.target.closest('[data-tile]'); if(!b||mode!=='pick') return; held=false; hold=setTimeout(()=>{ held=true; const r=rows.find(x=>x.id===b.dataset.tile); if(r){ try{ navigator.vibrate&&navigator.vibrate(8); }catch(_){} editSheet(r); } },550); });
  ['pointerup','pointercancel','pointerleave'].forEach(n=>d.addEventListener(n,()=>clearTimeout(hold)));
  d.addEventListener('click',e=>{ if(held&&e.target.closest('[data-tile]')){ held=false; e.stopImmediatePropagation(); e.preventDefault(); } },true);
  const onPaste=e=>{ if(!d.isConnected||adding&&A.querySelector('#taAN')) return; const fs=[...(e.clipboardData&&e.clipboardData.files||[])].filter(f=>/^image\//.test(f.type)); if(fs.length&&(status==='ok'||status==='empty')){ e.preventDefault(); startFiles(fs); } };
  document.addEventListener('paste',onPaste);
  d.addEventListener('cancel',e=>{ if(!A.hidden){ e.preventDefault(); closeAdd(); } });
  d.addEventListener('close',()=>{ document.removeEventListener('paste',onPaste); if(io) io.disconnect(); clearTimeout(recomputeT); clearTimeout(hold); if(o.onClose) o.onClose(); });
  paint(); load();
  return d;
}
window.StudioTeamAssets={open,blobOf,recent};
})();

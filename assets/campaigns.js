/* Studio campaign sets (brand-agnostic, behind the "team" preview flag). Lazy-loaded by the hub (Saved) and by a tool/Create when it opens a design that
   belongs to a campaign. A campaign groups saved designs (story, post, carousel, highlight, Create...) and shares:
     words  {headline, sub, button, small}  every design follows them, except a role the design overrides
     look   'white' | 'cream' | ''          applied to designs whose style is one of the two looks (never mixed on one design)
   Rows: C.campaigns / C.saveCampaign / C.deleteCampaign; a design carries campaign_id (C.setCampaign); calendar items carry campaign_id.
   Words reach a design when it is opened (and so in Save all, which opens each design in a hidden frame): openRecipe(design) returns the
   recipe with the campaign's words in. What the person changed by hand is never touched: stamp(tool,recipe) runs when a design is saved and
   keeps recipe.camp = {id, applied:{role:text}, over:{role:true}} -- `applied` is what the campaign last put there, so a role whose text no
   longer matches was edited inside the design and becomes an override.
   Roles: Create = text layers by `role` attr or by reading the layer (biggest words = headline, next words = sub, a pill group = button);
          tools = their fields head (headline), small (small), pill (button). Look: tools with a white/cream style.
   StudioCampaigns.init(o) -> {paint(), addTo(list), designRow(dlg,design), open(id)} for the hub; openRecipe / stamp / read / apply are pure helpers. */
(function(){
'use strict';
const ROLES=['headline','sub','button','small'];
const RLABEL={headline:'Headline',sub:'Sub line',button:'Button',small:'Small line'};
const LOOKS=[['','Each its own'],['white','White'],['cream','Cream']];
const clone=x=>JSON.parse(JSON.stringify(x));
const txt=v=>String(v==null?'':v).trim();

/* ---------- reading and writing words in a recipe (no live page needed) ---------- */
const TOOLF={head:'headline',small:'small',pill:'button'};
const chipsVal=v=>v&&typeof v==='object'&&'pick' in v?(v.pick==='__none'?'':txt(v.pick==='__own'?v.own:v.pick)):undefined;
const pillVal=v=>v&&typeof v==='object'&&('text' in v||'on' in v)?(v.on===false?'':txt(v.text)):undefined;
function toolPages(r){ const out=[r]; if(Array.isArray(r.pages)) r.pages.forEach(p=>out.push(p)); return out; }
function toolRead(r){ const out={}, v=r.values||{};
  const h=chipsVal(v.head); if(h!==undefined) out.headline=h; const s=chipsVal(v.small); if(s!==undefined) out.small=s; const p=pillVal(v.pill); if(p&&v.pill.on!==false) out.button=p;   // a button that is off stays off
  if(r.style==='white'||r.style==='cream') out.look=r.style; return out; }
function toolWrite(r,role,val){
  if(role==='look'){ r.style=val; return; }
  const key=Object.keys(TOOLF).find(k=>TOOLF[k]===role); if(!key) return;
  toolPages(r).forEach(p=>{ const v=p.values; if(!v||!v[key]) return;
    if(key==='pill') v.pill={...v.pill,on:true,text:val}; else v[key]={pick:'__own',own:val}; }); }

/* Create: the layers of each page, as saved JSON ({c:'Text',a:{...}} nodes) */
const isFrameNode=o=>o&&o.a&&(o.a.kind==='frame'||o.a.fw);
const isBgName=o=>/frame-bg/.test(String((o.a&&o.a.name)||''));
const textsIn=o=>o.c==='Text'?[o]:((o.k||[]).flatMap(textsIn));
const eff=o=>(+o.a.fontSize||0)*Math.abs(+o.a.scaleX||1);
function createRoles(frame){
  const list=(frame.k||[]).filter(n=>!isBgName(n)), out={};
  const handle=n=>{ const ts=textsIn(n); return ts.length&&ts.every(t=>/@/.test(t.a.text||'')); };
  const button=n=>n.c==='Group'&&textsIn(n).length&&(n.k||[]).some(c=>c.c==='Rect'||(c.a&&c.a.role==='bg'));
  const explicit=n=>n.a&&['headline','sub','button'].includes(n.a.role)?n.a.role:null;
  list.forEach(n=>{ const e=explicit(n); if(e&&!out[e]) out[e]=n; });
  const plain=n=>n.c==='Text'&&!explicit(n)&&!handle(n)&&txt(n.a.text);
  const texts=list.filter(plain), max=Math.max(0,...texts.map(eff));
  if(!out.headline){ const h=texts.find(n=>eff(n)>=max*.85); if(h) out.headline=h; }
  if(!out.sub){ const s=texts.find(n=>n!==out.headline); if(s) out.sub=s; }
  if(!out.button){ const b=list.find(n=>!explicit(n)&&button(n)); if(b) out.button=b; }
  return out; }
const textNode=(n,role)=>n.c==='Text'?n:(textsIn(n).find(t=>t.a.role==='text')||textsIn(n)[0]);
function createFrames(r){ return ((r.doc||{}).nodes||[]).filter(isFrameNode); }
function createRead(r){ const out={}; createFrames(r).forEach(f=>{ const rl=createRoles(f); Object.keys(rl).forEach(k=>{ if(out[k]===undefined){ const t=textNode(rl[k],k); if(t) out[k]=txt(t.a.text); } }); }); return out; }
function createWrite(r,role,val){ createFrames(r).forEach(f=>{ const n=createRoles(f)[role]; if(!n) return; const t=textNode(n,role); if(t) t.a.text=val; }); }

const isCreate=r=>!!(r&&r.doc&&r.doc.nodes);
/** the campaign roles a recipe carries -> {role: current text (or the look)} */
function read(tool,r){ if(!r) return {}; return isCreate(r)?createRead(r):toolRead(r); }
function write(r,role,val){ if(isCreate(r)){ if(role!=='look') createWrite(r,role,val); } else toolWrite(r,role,val); }

let cur=null;   // the campaign state of the design open on this page: {id,applied,over}

/* the recipe of a design that belongs to campaign `c`, with its words and look in, except the roles it overrides */
function applyCampaign(r0,c){
  const r=clone(r0), prev=r.camp&&r.camp.id===c.id?r.camp:{}, applied={...(prev.applied||{})}, over={...(prev.over||{})};
  const have=read('',r), words=c.words||{};
  const todo=ROLES.map(k=>[k,txt(words[k])]).concat([['look',txt(c.look)]]).filter(([,w])=>w);
  todo.forEach(([role,w])=>{ if(have[role]===undefined||over[role]) return;
    if(applied[role]!==undefined&&have[role]!==applied[role]){ over[role]=true; return; }   // changed by hand inside the design: it keeps its own
    write(r,role,w); applied[role]=w; });
  r.camp={id:c.id,applied,over}; cur={id:c.id,applied:{...applied},over:{...over}};
  return r; }
async function openRecipe(d,o){
  cur=null; if(!d||!d.campaign_id||!d.recipe) return d&&d.recipe;
  const C=await o.cloud(); const list=await C.campaigns(d.brand||o.brand); const c=(list||[]).find(x=>x.id===d.campaign_id);
  return c?applyCampaign(d.recipe,c):d.recipe; }
/* saving a design of a campaign: a role whose text is no longer what the campaign put there was edited here: it overrides from now on */
function stamp(tool,r){
  if(!cur||!r) return r; const have=read(tool,r), applied=cur.applied, over=cur.over;
  Object.keys(have).forEach(role=>{ if(over[role]) return; if(applied[role]===undefined){ applied[role]=have[role]; return; } if(have[role]!==applied[role]) over[role]=true; });
  r.camp={id:cur.id,applied:{...applied},over:{...over}}; return r; }

/* ---------- the hub parts: Campaigns row, Add to campaign, the campaign view, Save all, Plan ---------- */
const SVG=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());

function init(o){
  const esc=o.esc, hap=k=>{ try{ o.haptic(k); }catch(_){} }, ic=k=>(o.icons&&o.icons[k])||'';
  let camps=[], C=null;
  const inCamp=id=>o.designs().filter(d=>d.campaign_id===id);
  const fmtOf=d=>{ const t=(o.TOOLS[d.tool]||{}).type; return t==='story'?'Story':t==='post'?'Post':t==='highlight'?'Highlight':d.tool==='video'?'Video':''; };
  const toolTitle=d=>(o.TOOLS[d.tool]||{}).title||d.tool;
  async function load(){ C=await o.cloud(); camps=(C.campaigns?await C.campaigns(o.brand):[])||[]; return camps; }
  const authorName=()=>{ try{ const w=o.who(); if(w) return w; return (JSON.parse(localStorage.getItem('studio:who'))||{}).name||null; }catch(_){ return null; } };
  const thumbOf=d=>{ const u=(o.urls())[d.thumb_path]; return `<img alt="" decoding="async" data-path="${esc(d.thumb_path||'')}"${u?` src="${u}"`:''}>`; };
  const labelFill=root=>root.querySelectorAll('img[data-path]').forEach(img=>{ const fit=()=>{ const t=img.closest('[data-fmt]'); if(!t||t.dataset.fmt) return; const r=img.naturalHeight/img.naturalWidth||0;
    const s=r>1.6?'Story':r>1.15?'Post':r?'Square':''; const b=t.querySelector('.cp-fmt'); if(b&&s) b.textContent=s; }; if(img.complete&&img.naturalWidth) fit(); else img.addEventListener('load',fit,{once:true}); });

  /* the Campaigns row under the Saved title (only with the flag; this module is only loaded then) */
  function paint(){
    const anchor=o.anchor&&o.anchor(); if(!anchor) return;
    let row=document.getElementById('campRow'); if(!row){ row=document.createElement('div'); row.id='campRow'; row.className='camp-row'; anchor.before(row);
      row.addEventListener('click',e=>{ if(e.target.closest('[data-camps]')){ hap('tick'); list(); } }); }
    const has=!!o.designs().length; row.hidden=!has;
    load().then(()=>{ row.innerHTML=`<button type="button" class="chip camp-chip" data-camps aria-haspopup="dialog">${ic('layers')}<span>Campaigns</span>${camps.length?`<i>${camps.length}</i>`:''}</button>`; }).catch(()=>{ row.innerHTML=`<button type="button" class="chip camp-chip" data-camps>${ic('layers')}<span>Campaigns</span></button>`; }); }

  /* the list of campaigns, and a new one */
  async function list(){
    try{ await load(); }catch(err){ o.toast('Could not load campaigns: '+(err.message||err)); return; }
    const d=o.dialog(`<div class="dlg-body camp-dlg"><h3>Campaigns</h3>
      <p class="small">A campaign keeps several designs together: one set of words, one look, one Save all.</p>
      <div class="act-list" id="cpList">${camps.length?camps.map(c=>`<button type="button" class="act-row" data-cp="${esc(c.id)}">${ic('layers')}<span dir="auto">${esc(c.name)}</span><small>${inCamp(c.id).length}</small></button>`).join(''):'<p class="cp-empty small">No campaigns yet. Pick designs in Saved (Select) and tap Campaign, or start one here.</p>'}</div>
      <div class="inline"><input type="text" id="cpNew" dir="auto" maxlength="60" placeholder="New campaign name…" aria-label="New campaign name" autocomplete="off"><button type="button" class="mini solid" id="cpMake">Start</button></div>
      <div class="status" id="cpSt" role="status"></div>
      <button type="button" class="link" id="cpX">Close</button></div>`,'camp');
    const st=t=>{ d.querySelector('#cpSt').textContent=t; };
    d.querySelector('#cpX').onclick=()=>d.close();
    d.querySelector('#cpList').onclick=e=>{ const b=e.target.closest('[data-cp]'); if(b){ d.close(); open(b.dataset.cp); } };
    const make=async()=>{ const name=d.querySelector('#cpNew').value.trim(); if(!name) return st('Give the campaign a name.'); d.querySelectorAll('button,input').forEach(x=>x.disabled=true);
      try{ const c=await C.saveCampaign({brand:o.brand,name,words:{},look:null,author:authorName()}); d.close(); await load(); paint(); open(c.id); }
      catch(err){ st(err.message||String(err)); d.querySelectorAll('button,input').forEach(x=>x.disabled=false); } };
    d.querySelector('#cpMake').onclick=make; d.querySelector('#cpNew').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); make(); } }); }

  /* add designs to a campaign (Select -> Campaign, or a design's menu): pick one, or make a new one */
  async function addTo(designs){
    if(!designs.length) return;
    try{ await load(); }catch(err){ o.toast('Could not load campaigns: '+(err.message||err)); return; }
    const one=designs.length===1, sameIn=designs.every(x=>x.campaign_id&&x.campaign_id===designs[0].campaign_id)?designs[0].campaign_id:null;
    let pick=sameIn||(camps[0]||{}).id||'';
    const d=o.dialog(`<div class="dlg-body camp-dlg"><h3 dir="auto">${one?'Add “'+esc(designs[0].name)+'” to a campaign':'Make a campaign of '+o.plural(designs.length,'design')}</h3>
      <div class="chips" id="adChips"></div>
      <div class="inline"><input type="text" id="adNew" dir="auto" maxlength="60" placeholder="New campaign name…" aria-label="New campaign name" autocomplete="off"></div>
      <div class="status" id="adSt" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="adX">Cancel</button><button type="button" class="btn" id="adGo">Add</button></div></div>`,'camp');
    const chips=d.querySelector('#adChips'), inp=d.querySelector('#adNew'), go=d.querySelector('#adGo'), st=t=>{ d.querySelector('#adSt').textContent=t; };
    const draw=()=>{ chips.hidden=!camps.length; chips.innerHTML=camps.map(c=>`<button type="button" class="chip" dir="auto" data-id="${esc(c.id)}" aria-pressed="${!inp.value.trim()&&pick===c.id}">${esc(c.name)}</button>`).join('');
      const nm=inp.value.trim(), cc=camps.find(c=>c.id===pick); go.disabled=!(nm||cc); go.textContent=nm?'Start “'+nm+'”':cc?'Add to “'+cc.name+'”':'Add'; };
    chips.onclick=e=>{ const c=e.target.closest('[data-id]'); if(!c) return; pick=c.dataset.id; inp.value=''; hap('tick'); draw(); };
    inp.addEventListener('input',draw); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go.click(); } });
    d.querySelector('#adX').onclick=()=>d.close();
    go.onclick=async()=>{ const nm=inp.value.trim(); d.querySelectorAll('button,input').forEach(x=>x.disabled=true);
      try{ let id=pick; if(nm){ const c=await C.saveCampaign({brand:o.brand,name:nm,words:{},look:null,author:authorName()}); id=c.id; }
        for(let i=0;i<designs.length;i++){ st('Adding '+(i+1)+' of '+designs.length+'…'); await C.setCampaign(designs[i].id,id); designs[i].campaign_id=id; }
        d.close(); o.endSelect(); await load(); const name=(camps.find(c=>c.id===id)||{}).name||'the campaign'; o.toast('Added '+o.plural(designs.length,'design')+' to “'+name+'”.');
        await o.refresh(); if(nm||designs.length>1) open(id); }
      catch(err){ st(err.message||String(err)); d.querySelectorAll('button,input').forEach(x=>x.disabled=false); draw(); } };
    draw(); if(!camps.length) setTimeout(()=>inp.focus(),60); }

  /* a design's menu: one row */
  function designRow(dlg,dsg){
    const box=dlg.querySelector('#dsTeam'); if(!box||dsg.kind==='template') return; const c=dsg.campaign_id&&camps.find(x=>x.id===dsg.campaign_id);
    const b=document.createElement('button'); b.type='button'; b.className='act-row'; b.dataset.camp='1'; b.innerHTML=ic('layers')+'<span dir="auto">'+(c?'Campaign: '+esc(c.name):'Add to campaign')+'</span>';
    b.onclick=()=>{ dlg.close(); c?open(c.id):addTo([dsg]); }; box.appendChild(b); }

  /* the campaign view: name, shared words and look, its designs, actions */
  async function open(id){
    try{ await load(); }catch(err){ o.toast('Could not open the campaign: '+(err.message||err)); return; }
    const c=camps.find(x=>x.id===id); if(!c){ o.toast('That campaign is gone.'); return; }
    const words={...(c.words||{})}; let look=c.look||'';
    const d=o.dialog(`<div class="dlg-body camp-dlg camp-view"><div class="cp-head"><h3 dir="auto" id="cvH">${esc(c.name)}</h3><button type="button" class="mini" id="cvRen">Rename</button></div>
      <div class="inline cp-ren" id="cvRenRow" hidden><input type="text" id="cvName" dir="auto" maxlength="60" aria-label="Campaign name" value="${esc(c.name)}"><button type="button" class="mini" id="cvRenGo">Save</button></div>
      <section aria-labelledby="cvDH"><h4 id="cvDH">Designs <small id="cvN"></small></h4><div class="cp-grid" id="cvGrid"></div></section>
      <section aria-labelledby="cvWH"><h4 id="cvWH">Shared words</h4>
        <p class="small">Every design follows these when you open it or tap Save all, unless you changed that text inside the design.</p>
        ${ROLES.map(k=>`<div class="field"><label class="lbl" for="cvW-${k}">${RLABEL[k]}</label><input type="text" id="cvW-${k}" data-role="${k}" dir="auto" maxlength="120" autocomplete="off" value="${esc(words[k]||'')}"></div>`).join('')}
        <div class="field"><span class="lbl" id="cvLL">Look</span><div class="chips" role="group" aria-labelledby="cvLL" id="cvLook">${LOOKS.map(([v,l])=>`<button type="button" class="chip" data-look="${v}" aria-pressed="${look===v}">${l}</button>`).join('')}</div>
          <p class="small">White and Cream apply to styles that have both (Restock, Offer...); a design never mixes them.</p></div>
        <button type="button" class="mini" id="cvSaveW">Save words and look</button></section>
      <div class="status" id="cvSt" role="status"></div>
      <div class="cp-acts"><button type="button" class="btn" id="cvAll">${ic('download')}<span>Save all</span></button>
        <button type="button" class="mini" id="cvTeam">Add all to the team</button><button type="button" class="mini" id="cvPlan">Plan this campaign</button></div>
      <button type="button" class="link danger" id="cvDel">Delete campaign</button><button type="button" class="link" id="cvX">Close</button></div>`,'camp');
    const $=s=>d.querySelector(s), st=t=>{ $('#cvSt').textContent=t; };
    const mine=()=>inCamp(id);
    const grid=()=>{ const ds=mine(); $('#cvN').textContent=ds.length?'· '+ds.length:'';
      $('#cvGrid').innerHTML=ds.length?ds.map(x=>`<div class="cp-card" data-fmt="${fmtOf(x)}" data-id="${esc(x.id)}"><a class="cp-open" href="${o.toolPage(x.tool)}?design=${encodeURIComponent(x.id)}" aria-label="Open ${esc(x.name)}"><span class="cp-thumb">${thumbOf(x)}</span><span class="cp-txt"><b dir="auto">${esc(x.name)}</b><small><span class="cp-fmt">${fmtOf(x)||toolTitle(x)}</span> · ${esc(toolTitle(x))}</small></span></a>
        <button type="button" class="cp-rm" data-rm="${esc(x.id)}" aria-label="Take ${esc(x.name)} out of the campaign">${ic('close')}</button></div>`).join(''):'<p class="cp-empty small">No designs yet. In Saved, tap Select, pick designs, then Campaign.</p>';
      o.fillThumbs(ds); labelFill($('#cvGrid')); ds.filter(x=>x.tool==='create').forEach(async x=>{ try{ const g=await C.getDesign(x.id), fr=((g.recipe||{}).doc||{}).nodes||[], f=fr.find(isFrameNode); if(!f) return;
        const h=+f.a.fh||1920, w=+f.a.fw||1080, lab=h>=1900?'Story':h>=1300?'Post':'Square', el=d.querySelector('.cp-card[data-id="'+x.id+'"] .cp-fmt'); if(el&&w) el.textContent=lab; const cd=el&&el.closest('.cp-card'); if(cd) cd.dataset.fmt=lab; }catch(_){ } }); ['#cvAll','#cvTeam','#cvPlan'].forEach(s=>{ $(s).disabled=!ds.length; }); };
    grid();
    $('#cvX').onclick=()=>d.close();
    $('#cvRen').onclick=()=>{ $('#cvRenRow').hidden=false; $('#cvName').focus(); $('#cvName').select(); };
    const ren=async()=>{ const v=$('#cvName').value.trim(); if(!v) return; try{ const r=await C.saveCampaign({...c,name:v}); Object.assign(c,r||{name:v}); $('#cvH').textContent=v; $('#cvRenRow').hidden=true; await load(); paint(); st('Renamed.'); }catch(err){ st(err.message||String(err)); } };
    $('#cvRenGo').onclick=ren; $('#cvName').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); ren(); } });
    $('#cvLook').onclick=e=>{ const b=e.target.closest('[data-look]'); if(!b) return; look=b.dataset.look; hap('tick'); d.querySelectorAll('#cvLook .chip').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); };
    $('#cvSaveW').onclick=async()=>{ const w={}; ROLES.forEach(k=>{ const v=$('#cvW-'+k).value.trim(); if(v) w[k]=v; }); $('#cvSaveW').disabled=true;
      try{ const r=await C.saveCampaign({...c,words:w,look:look||null}); Object.assign(c,r||{words:w,look:look||null}); await load(); st('Saved. Designs follow when you open them, and in Save all.'); }
      catch(err){ st(err.message||String(err)); } $('#cvSaveW').disabled=false; };
    $('#cvGrid').addEventListener('click',async e=>{ const b=e.target.closest('[data-rm]'); if(!b) return; b.disabled=true;
      try{ await C.setCampaign(b.dataset.rm,null); const x=o.designs().find(q=>q.id===b.dataset.rm); if(x) x.campaign_id=null; grid(); o.refresh(); }catch(err){ st(err.message||String(err)); b.disabled=false; } });
    /* Save all: the same full-quality pictures as Saved's Save pictures (assets/render.js: 2x lossless PNG, 2x -> 1.5x -> 1x with its message) */
    $('#cvAll').onclick=async()=>{ const ds=mine(); if(!ds.length) return; hap('tick'); d.close();
      try{ await o.lazy('render'); }catch(_){ o.toast('Could not start saving. Check your connection and try again.'); return; }
      await window.StudioRender.saveDesigns(ds,{toast:o.toast,done:()=>{}}); };
    /* Add all to the team: every design in a campaign is already a team design, so this makes sure of it for the ones saved only as a template or
       with a missing owner, and tells the person plainly when nothing was left to add */
    $('#cvTeam').onclick=async()=>{ const ds=mine(); if(!ds.length) return; $('#cvTeam').disabled=true; st('Checking…');
      try{ const pending=ds.filter(x=>x.kind==='template'||x.draft);
        if(!pending.length){ st('All '+o.plural(ds.length,'design')+' '+(ds.length===1?'is':'are')+' already with the team.'); }
        else { st(o.plural(pending.length,'design')+' still '+(pending.length===1?'is a template':'are templates')+': open it, add photos and save, and it joins the campaign.'); } }
      catch(err){ st(err.message||String(err)); } $('#cvTeam').disabled=false; };
    $('#cvPlan').onclick=()=>{ d.close(); plan(c,mine()); };
    $('#cvDel').onclick=()=>{ const cf=o.dialog(`<div class="dlg-body"><h3 dir="auto">Delete “${esc(c.name)}”?</h3><p class="small">The designs stay in Saved. Only the campaign is removed.</p><div class="status" id="dlSt" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="dlNo">Cancel</button><button type="button" class="btn danger" id="dlYes">Delete</button></div></div>`);
      cf.querySelector('#dlNo').onclick=()=>cf.close();
      cf.querySelector('#dlYes').onclick=async()=>{ cf.querySelectorAll('button').forEach(x=>x.disabled=true); try{ await C.deleteCampaign(id); o.designs().forEach(x=>{ if(x.campaign_id===id) x.campaign_id=null; }); cf.close(); d.close(); await load(); paint(); o.toast('Campaign deleted.'); o.refresh(); }catch(err){ cf.querySelector('#dlSt').textContent=err.message||String(err); cf.querySelectorAll('button').forEach(x=>x.disabled=false); } }; };
  }

  /* Plan this campaign: one calendar item per design, the person picks the days */
  function plan(c,ds){
    if(!ds.length){ o.toast('Add designs to the campaign first.'); return; }
    const start=new Date(); start.setDate(start.getDate()+1);
    const d=o.dialog(`<div class="dlg-body camp-dlg"><h3 dir="auto">Plan “${esc(c.name)}”</h3><p class="small">Pick a day for each post. They go in the calendar as drafts.</p>
      <div class="cp-plan">${ds.map((x,i)=>{ const day=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
        return `<div class="field cp-plan-row" data-id="${esc(x.id)}"><label class="lbl" for="pl-${i}" dir="auto">${esc(x.name)}</label><input type="date" id="pl-${i}" data-day required value="${iso(day)}"></div>`; }).join('')}</div>
      <div class="status" id="plSt" role="status"></div>
      <div class="dlg-actions"><button type="button" class="mini" id="plX">Cancel</button><button type="button" class="btn" id="plGo">Add ${ds.length} to the calendar</button></div></div>`,'camp');
    const st=t=>{ d.querySelector('#plSt').textContent=t; };
    d.querySelector('#plX').onclick=()=>d.close();
    d.querySelector('#plGo').onclick=async()=>{ const rows=[...d.querySelectorAll('.cp-plan-row')]; if(rows.some(r=>!r.querySelector('[data-day]').value)) return st('Pick a day for each post.');
      d.querySelectorAll('button,input').forEach(x=>x.disabled=true);
      try{ for(let i=0;i<rows.length;i++){ st('Adding '+(i+1)+' of '+rows.length+'…'); const x=ds.find(q=>q.id===rows[i].dataset.id);
          await C.saveCalendarItem({brand:o.brand,day:rows[i].querySelector('[data-day]').value,at:null,status:'draft',title:x.name,caption:'',hashtags:[],design_ids:[x.id],campaign_id:c.id,author:authorName()}); }
        d.close(); o.toast('Planned '+o.plural(rows.length,'post')+' for “'+c.name+'”.'); try{ location.hash='#calendar'; }catch(_){} }
      catch(err){ st(err.message||String(err)); d.querySelectorAll('button,input').forEach(x=>x.disabled=false); } }; }

  return {paint,addTo,designRow,open,list};
}

window.StudioCampaigns={init,openRecipe,stamp,read,applyCampaign,ROLES};
})();

/* The "New Studio look" preview (flag "next", off by default). Loaded by Studio.lazy only when the flag is on; home() in studio.js
   calls into it at marked r3-next hooks. Brand-agnostic: no brand names or colours here. All styles are in next.css under :root[data-next]. */
(function(){
'use strict';
const NX={};
const SVGO='<svg class="ic-off" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const SVGN='<svg class="ic-on" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const CAL='<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 10h18" stroke="var(--raised)"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>';

/* the bar: Home · Saved · ( + ) · Plan · Templates. The existing anchors (and the + button) are re-used and re-ordered, so every
   handler in home() keeps working; Plan is new and opens the calendar page. */
NX.bar=function(fab){
  const nav=document.querySelector('.hubbar'); if(!nav||nav.dataset.nx) return;
  const get=t=>nav.querySelector('[data-tab="'+t+'"]');
  const plan=document.createElement('a'); plan.href='#calendar'; plan.dataset.tab='calendar'; plan.setAttribute('aria-current','false');
  plan.innerHTML=SVGO+CAL+'</svg>'+SVGN+CAL+'</svg><span>Plan</span>';
  const slot=document.createElement('span'); slot.className='nb-slot'; if(fab) slot.appendChild(fab);
  nav.append(get('home'),get('saved'),slot,plan,get('templates')); nav.dataset.nx='1';
};
/* the indicator slides to the current tab (centred, a short bar at the top edge) */
NX.pill=function(pill,on){ const x=on.offsetLeft+on.offsetWidth/2-14; pill.style.width='28px'; pill.style.height='3px'; pill.style.transform='translate('+x+'px,0)'; };

/* ---------- Saved: header, search, collections shelf, filter row, cards, design sheet, cache ---------- */
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I2='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="18" rx="2"/><rect x="13" y="3" width="8" height="18" rx="2"/></svg>';
const I3='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3" width="5" height="18" rx="1.6"/><rect x="9.5" y="3" width="5" height="18" rx="1.6"/><rect x="16.5" y="3" width="5" height="18" rx="1.6"/></svg>';
const KINDS=[['all','All'],['story','Stories'],['post','Posts'],['template','Templates']];
const initial=n=>{ const c=Array.from(String(n||'').trim())[0]; return c?c.toUpperCase():''; };
const lsGet=k=>{ try{ return localStorage.getItem(k); }catch(_){ return null; } };
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(_){} };

/* what kind a design is: a template, a post (carousel) or a story */
NX.kindOf=(d,H)=>d.kind==='template'?'template':H.toolShape(d.tool)==='post'?'post':'story';
NX.cols=()=>lsGet('studio:savedCols')==='3'?3:2;

/* once, when Home sets up: Saved is a tab (title, no back arrow), the search field is always open, the filter row sits under the shelf */
NX.savedInit=function(H){
  const $=id=>document.getElementById(id);
  $('savedH').textContent='Saved';
  const fr=$('findRow'); fr.hidden=false; $('findIn').placeholder='Search designs, collections, people';
  const bar=document.querySelector('#saved .sp-bar'), fb=document.createElement('div'); fb.className='nx-fbar'; fb.id='nxFbar';
  fb.innerHTML='<div class="nx-kinds" role="group" aria-label="Show"></div><span class="nx-tools"></span>';
  bar.appendChild(fb); fb.querySelector('.nx-tools').appendChild($('sortBtn'));
  const dn=document.createElement('button'); dn.type='button'; dn.id='nxDens'; dn.className='nx-dens'; fb.querySelector('.nx-tools').appendChild(dn);
  const dens=()=>{ const n=NX.cols(); $('savedGrid').dataset.cols=n; dn.innerHTML=n===2?I3:I2; dn.setAttribute('aria-label',n===2?'Show three per row':'Show two per row'); };
  dens(); dn.onclick=()=>{ lsSet('studio:savedCols',NX.cols()===2?'3':'2'); H.haptic('tick'); dens(); };
  fb.querySelector('.nx-kinds').addEventListener('click',e=>{ const b=e.target.closest('[data-k]'); if(b) H.setKind(b.dataset.k); });
  $('findIn').addEventListener('focus',()=>{ document.body.classList.add('nx-finding'); }); $('findIn').addEventListener('blur',()=>{ document.body.classList.remove('nx-finding'); });
};
/* the kind chips: only kinds that exist, and only when there is more than one */
NX.paintKinds=function(H){
  const box=document.querySelector('#nxFbar .nx-kinds'); if(!box) return;
  const n={all:H.all.length,story:0,post:0,template:0}; H.all.forEach(d=>{ n[NX.kindOf(d,H)]++; });
  const present=KINDS.filter(([k])=>k==='all'||n[k]>0), many=present.length>2;
  if(!many&&H.kind!=='all') H.resetKind();
  box.hidden=!many; box.innerHTML=present.map(([k,l])=>'<button type="button" class="chip" data-k="'+k+'" aria-pressed="'+(H.kind===k)+'">'+l+'</button>').join('');
};
const img=(d,H,cls)=>{ const u=H.urls[d.thumb_path]; return '<img class="'+(cls||'nx-img')+'" alt="" decoding="async" draggable="false" data-path="'+E(d.thumb_path||'')+'"'+(u?' src="'+u+'"':'')+' onload="this.classList.add(\'in\')" onerror="StudioNext.broken(this)">'; };
NX.broken=function(el){ el.removeAttribute('src'); el.classList.remove('in'); if(NX._H&&el.dataset.path) NX._H.refetch(el.dataset.path); };

/* a collection shelf: "All" first, then each collection as a card with its newest two designs stacked */
NX.shelf=function(H){
  const newest=list=>[...list].sort((a,b)=>H.lastUse(b)-H.lastUse(a)).slice(0,2), seen=[];
  const card=(f,name,n,ds)=>{ const on=H.filter===f; ds.forEach(d=>seen.push(d));
    const cover='<span class="nx-cover">'+(ds[1]?img(ds[1],H,'nx-img nx-back'):'')+(ds[0]?img(ds[0],H,'nx-img nx-front'):'<span class="nx-empty">'+H.ICON.folder+'</span>')+'</span>';
    const btn='<button type="button" class="nx-col'+(on?' on':'')+'" data-f="'+E(f)+'" aria-pressed="'+on+'" dir="auto">'+cover+'<b>'+E(name)+'</b><small><bdi>'+n+'</bdi></small></button>';
    return on&&f!=='all'?'<span class="col-sel nx-colwrap">'+btn+'<button type="button" class="col-more" id="colMore" aria-haspopup="menu" aria-expanded="false" aria-label="Options for the '+E(name)+' collection">'+H.ICON.more+'</button></span>':btn; };
  const html=card('all','All',H.all.length,newest(H.all))+H.cols.map(c=>card('c:'+c.id,c.name,c.count,newest(H.all.filter(d=>d.collections.includes(c.id))))).join('');
  return {html,designs:seen};
};

/* the card: the whole picture (never cropped) on a soft backing, the full name, one quiet line, the author's initial */
NX.card=function(d,i,H){
  const tpl=d.kind==='template', names=d.collections.map(H.colName).filter(Boolean), by=initial(d.author);
  const where=names.length?E(names[0])+(names.length>1?' +'+(names.length-1):''):'';
  NX._H=H;
  return '<div class="sv-card nx-card'+(H.sel&&H.sel.has(d.id)?' picked':'')+'" data-id="'+E(d.id)+'" style="--i:'+Math.min(i,12)+'"><a class="sv-open" href="'+H.toolPage(d.tool)+'?design='+encodeURIComponent(d.id)+'" draggable="false" aria-label="'+E(d.name)+', '+E(H.toolName(d.tool))+(tpl?', template':'')+'. Press and hold for more.">'
    +'<span class="sv-thumb nx-thumb" data-shape="'+H.toolShape(d.tool)+'">'+img(d,H)+(tpl?'<em class="sv-badge nx-tag">Template</em>':'')+H.rvChip(d)+'<span class="sv-check" aria-hidden="true">'+H.ICON.check+'</span></span>'
    +'<span class="sv-txt nx-txt" dir="auto"><b class="nx-name" title="'+E(d.name)+'">'+E(d.name)+'</b><span class="nx-meta">'+(where?'<span class="nx-where">'+where+'</span><i aria-hidden="true">·</i>':'')+'<bdi>'+E(H.ago(H.lastUse(d)))+'</bdi>'+(by?'<u class="nx-by" title="'+E(d.author)+'" aria-label="'+E(d.author)+'">'+E(by)+'</u>':'')+'</span></span></a>'
    +'<button type="button" class="sv-more" data-dmore="'+E(d.id)+'" aria-label="More for '+E(d.name)+'">'+H.ICON.more+'</button></div>';
};

/* the design sheet: a big picture, name and line, four big actions; the other rows follow (studio.js) */
NX.sheetHead=function(H,dsg,open){
  const tpl=dsg.kind==='template', names=dsg.collections.map(H.colName).filter(Boolean), url=H.urls[dsg.thumb_path];
  return '<button type="button" class="ds-peek nx-peek" aria-label="See it big">'+(url?'<img src="'+url+'" alt="">':'<span class="ds-ph"></span>')+'</button>'
    +'<div class="nx-dtxt" dir="auto"><h3>'+E(dsg.name)+'</h3><p class="small"><bdi>'+E(H.toolName(dsg.tool))+(tpl?' · template':'')+'</bdi> · '+(names.length?E(names.join(', ')):'No collection')+' · <bdi>'+E(H.ago(dsg.updated_at))+'</bdi></p></div>';
};
NX.sheetTiles=function(H,dsg,open){ const tpl=dsg.kind==='template';
  return '<div class="nx-big" role="group" aria-label="Actions">'
    +'<a class="ds-big go" href="'+open+'" autofocus><span>'+H.ICON.pencil+'</span>'+(tpl?'Use':'Open')+'</a>'
    +(tpl?'':'<a class="ds-big" href="'+open+'&go=1"><span>'+H.ICON.download+'</span>Save picture</a>')
    +'<button type="button" class="ds-big" data-act="dup"><span>'+H.ICON.copy+'</span>Duplicate</button>'
    +'<button type="button" class="ds-big" data-act="cols"><span>'+H.ICON.folder+'</span>Collection</button></div>';
};

/* instant Saved: the last list is kept on this device per brand (names, tools, collections, picture paths, times; picture links only while they are fresh) */
const CK=b=>'studio:next:saved:'+b, FRESH=40*60e3;
NX.cacheSave=function(b,all,cols,urls,urlAt){
  const keep=['id','name','tool','kind','thumb_path','updated_at','used_at','collections','author','review','review_by','review_at','campaign_id','caption','hashtags'];
  const u={}, now=Date.now(); all.slice(0,80).forEach(d=>{ if(d.thumb_path&&urls[d.thumb_path]&&now-(urlAt[d.thumb_path]||0)<FRESH) u[d.thumb_path]=[urls[d.thumb_path],urlAt[d.thumb_path]]; });
  lsSet(CK(b),JSON.stringify({at:now,all:all.map(d=>{ const o={}; keep.forEach(k=>{ if(d[k]!==undefined) o[k]=d[k]; }); return o; }),cols:cols.map(c=>({id:c.id,name:c.name,count:c.count,cover_design:c.cover_design})),u}));
};
NX.cacheLoad=function(b){ try{ const r=JSON.parse(lsGet(CK(b))||'null'); if(!r||!Array.isArray(r.all)) return null; const u={}, st={}, now=Date.now(); Object.entries(r.u||{}).forEach(([k,v])=>{ if(Array.isArray(v)&&now-v[1]<FRESH){ u[k]=v[0]; st[k]=v[1]; } });
  return {stamps:st,all:r.all.map(d=>({review:null,caption:null,hashtags:null,author:null,campaign_id:null,collections:[],...d})),cols:r.cols||[],urls:u,at:r.at}; }catch(_){ return null; } };
NX.cacheClear=function(b){ try{ localStorage.removeItem(CK(b)); }catch(_){} };

window.StudioNext=NX;
})();

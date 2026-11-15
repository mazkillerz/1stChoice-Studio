/* Brand kit page (read-only, lazy). Shows the active brand kit: logo, colours, fonts, approved words, assets, looks.
   Brand-agnostic: everything comes from the kit object passed in (o.brand). Sections only render when the kit has that data.
   Opened from Settings → Brand kit and hub search. Studio.lazy('brandkit',{css:1}).open({brand,dialog,esc,toast,fontsReady,normText}). */
(function(){
const KEYS={headlines:'Headlines',small:'Small lines',buttons:'Buttons',bio:'Map in bio',newPlace:'New place',cut:'Cut words',restock:'Restock',poll:'Poll',other:'Other',extra:'Extra'};
const SKIP={placeName:1,write:1};
const hex6=h=>/^#[0-9a-f]{6}$/i.test(h||'')?h.toUpperCase():(h||'');
function open(o){
  const B=o.brand, esc=o.esc, norm=o.normText||(s=>String(s||'').toLowerCase()), base=B.base||'';
  /* ---- data ---- */
  const pal=(B.palette&&B.palette.length?B.palette.map(p=>({name:p.name,hex:hex6(p.hex)})):Object.entries(B.colors||{}).map(([k,v])=>({name:k.charAt(0).toUpperCase()+k.slice(1),hex:hex6(v)}))).filter(p=>/^#[0-9A-F]{6}$/.test(p.hex));
  const fams=[], seenF={}; const addF=(f,l,w)=>{ if(f&&!seenF[f]){ seenF[f]=1; fams.push({family:f,label:l||f,wt:w||''}); } };
  const F=B.fonts||{}; (F.choices||[]).forEach(c=>addF(c.family,c.label,c.wt)); addF(F.display,F.display+' (headlines)'); addF(F.body,F.body+' (body)'); addF(F.latin,F.latin);
  const groups=[]; const P=B.phrases||{};
  Object.keys(P).forEach(k=>{ if(SKIP[k]) return; const l=[].concat(P[k]).filter(x=>typeof x==='string'&&x.trim()); if(l.length) groups.push({key:k,label:KEYS[k]||k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()),lines:[...new Set(l)]}); });
  const sample=(P.headlines&&P.headlines[0])||(groups[0]&&groups[0].lines[0])||'';
  const assets=(B.assets||[]).filter(a=>a.file&&a.file!==B.logo);
  const looksRaw=(B.rules&&B.rules.looks)||{}; const looks=Object.keys(looksRaw).map(k=>{ const g=looksRaw[k].ground; const c=hex6((B.colors||{})[g]||g); return /^#[0-9A-F]{6}$/.test(c)?{name:looksRaw[k].name||k,hex:c}:null; }).filter(Boolean);
  const dark=(B.colors&&B.colors.night)||'#111';
  const sec=(id,h,body)=>`<section class="bk-sec" id="bk-${id}" aria-labelledby="bk-${id}-h"><h4 id="bk-${id}-h">${h}</h4>${body}</section>`;
  const word=t=>`<button type="button" class="bk-line" data-copy="${esc(t)}"><span dir="auto" class="bk-t">${esc(t)}</span><span class="bk-cp" aria-hidden="true">Copy</span></button>`;
  let h='';
  if(B.logo) h+=sec('logo','Logo',`<div class="bk-tiles"><div class="bk-tile bk-light"><img src="${esc(base+B.logo)}" alt="${esc(B.name||'Logo')} on light"></div><div class="bk-tile bk-dark" style="background:${esc(dark)}"><img src="${esc(base+B.logo)}" alt="${esc(B.name||'Logo')} on dark"></div></div>`);
  if(pal.length) h+=sec('colours','Colours',`<div class="bk-sw">${pal.map(p=>`<button type="button" class="bk-swb" data-copy="${esc(p.hex)}" data-hex="${esc(p.hex)}" aria-label="${esc(p.name)} ${esc(p.hex)}, tap to copy"><i style="background:${esc(p.hex)}"></i><b>${esc(p.name)}</b><small>${esc(p.hex)}</small></button>`).join('')}</div>`);
  if(fams.length) h+=sec('fonts','Fonts',fams.map(f=>`<div class="bk-font"><div class="bk-fn" dir="auto" style="font-family:'${esc(f.family)}',system-ui,sans-serif;${f.wt?'font-weight:'+esc(f.wt)+';':''}">${esc(f.family)}</div><div class="bk-fl">${esc(f.label)}</div>${sample?`<div class="bk-fs" dir="auto" style="font-family:'${esc(f.family)}',system-ui,sans-serif;${f.wt?'font-weight:'+esc(f.wt)+';':''}">${esc(sample)}</div>`:''}<div class="bk-fs bk-fa" dir="ltr" style="font-family:'${esc(f.family)}',system-ui,sans-serif;${f.wt?'font-weight:'+esc(f.wt)+';':''}">Aa Bb Cc 0123</div></div>`).join(''));
  if(groups.length) h+=sec('words','Approved words',`<input type="search" class="bk-q" id="bkQ" dir="auto" autocomplete="off" aria-label="Search the approved words" placeholder="Search words"><div id="bkWords">${groups.map(g=>`<div class="bk-grp" data-g><h5>${esc(g.label)}</h5>${g.lines.map(word).join('')}</div>`).join('')}</div><p class="small bk-none" id="bkNone" hidden>No word matches.</p>`);
  if(assets.length){ const gm={}; assets.forEach(a=>{ (gm[a.group||'Assets']=gm[a.group||'Assets']||[]).push(a); });
    h+=sec('assets','Assets',Object.keys(gm).map(g=>`<div class="bk-grp"><h5>${esc(g)}</h5><div class="bk-as">${gm[g].map(a=>`<figure class="bk-a"><img loading="lazy" src="${esc(base+(a.prev||a.file))}" alt="${esc(a.label||a.id)}"><figcaption>${esc(a.label||a.id)}</figcaption></figure>`).join('')}</div></div>`).join('')); }
  if(looks.length) h+=sec('looks','Looks',`<div class="bk-lk">${looks.map(l=>`<div class="bk-look"><i style="background:${esc(l.hex)}"></i><b>${esc(l.name)}</b></div>`).join('')}</div>`);
  const d=o.dialog(`<div class="dlg-body bk"><div class="lib-head"><h3 id="bkH">Brand kit</h3><button type="button" class="mini" data-x>Done</button></div>
    ${h||'<p class="small">This brand kit has nothing to show yet.</p>'}<p class="small bk-foot">Changes to the brand kit are made by the owner.</p></div>`,'bk-dlg');
  d.setAttribute('aria-labelledby','bkH'); d.tabIndex=-1; d.focus();
  d.querySelector('[data-x]').onclick=()=>d.close();
  /* tap to copy */
  d.addEventListener('click',async e=>{ const b=e.target.closest('[data-copy]'); if(!b) return; const t=b.dataset.copy;
    let done=false; try{ await navigator.clipboard.writeText(t); done=true; }catch(_){}
    if(!done){ try{ const ta=document.createElement('textarea'); ta.value=t; ta.style.cssText='position:fixed;opacity:0'; d.appendChild(ta); ta.select(); done=document.execCommand('copy'); ta.remove(); }catch(_){} }
    o.toast(done?'Copied '+t:'Could not copy. Press and hold the text instead.'); });
  /* search (Arabic variants through Studio.normText) */
  const q=d.querySelector('#bkQ');
  if(q) q.addEventListener('input',()=>{ const n=norm(q.value).trim(); let any=false;
    d.querySelectorAll('#bkWords [data-g]').forEach(g=>{ let c=0; g.querySelectorAll('.bk-line').forEach(l=>{ const m=!n||norm(l.dataset.copy).includes(n); l.hidden=!m; if(m) c++; }); g.hidden=!c; if(c) any=true; });
    d.querySelector('#bkNone').hidden=any; });
  /* fonts: wait for them like other pages do, then repaint the samples */
  if(fams.length&&o.fontsReady) o.fontsReady(fams.map(f=>f.family),6000).catch(()=>{});
  return d;
}
window.StudioBrandkit={open};
})();

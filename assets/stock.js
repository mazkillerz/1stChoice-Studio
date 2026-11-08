/* Live stock (mega w3-stock, behind the "stock" preview flag): reads the brand's public stock feed (read-only GET) and lets a tool
   fill itself from one sale point. Brand-agnostic: the feed address and the product -> flavour map come from the brand kit
   (B.stock = {feed, products:[{match,flavour}], ignore:[…]}). Only the place name (label) and the flavours' counts are used:
   nothing else the feed sends is kept, shown or drawn. Loaded lazily by studio.js. */
(function(){
const KEY='studio:stock:';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase();
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
const rd=k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(_){ return null; } };
const wr=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} };

/* the feed's pins -> sale points {id,label,updated,stock:{<flavour id>:qty}}; products that match nothing (or are ignored) are dropped */
function parse(json,S){
  const pins=json&&Array.isArray(json.pins)?json.pins:[], prods=(S&&S.products)||[], ign=((S&&S.ignore)||[]).map(norm);
  return pins.map(p=>{
    const stock={}; let updated=p.lastStockUpdatedAt||'';
    (p.stockLines||[]).forEach(l=>{ const n=norm(l.productName); if(ign.some(i=>n.includes(i))) return;
      const m=prods.find(x=>n.includes(norm(x.match))); if(!m) return;
      stock[m.flavour]=(stock[m.flavour]||0)+(Math.max(0,+l.quantityLeft)||0); });
    return {id:String(p.id||p.label),label:String(p.label||'').trim(),updated,stock};
  }).filter(p=>p.label).sort((a,b)=>a.label.localeCompare(b.label));
}
const fail=(code,msg)=>Object.assign(new Error(msg),{code});
/* the sale points: a cache from today is used as it is (no request); an older one is refreshed; force skips the cache */
async function load(B,o){
  const S=B&&B.stock; if(!S||!S.feed) throw fail('none','This brand has no stock feed.');
  const k=KEY+B.id, c=rd(k);
  if(!(o&&o.force)&&c&&c.day===today()&&Array.isArray(c.points)) return {points:c.points,cached:true,at:c.t};
  if(navigator.onLine===false) throw fail('offline','offline');
  let r; try{ r=await fetch(S.feed,{headers:{Accept:'application/json'}}); }catch(e){ throw fail('cors',String(e&&e.message||e)); }   // no CORS header looks like a TypeError
  if(!r.ok) throw fail('http','The stock site answered '+r.status+'.');
  let j; try{ j=await r.json(); }catch(_){ throw fail('http','The stock site sent something Studio can not read.'); }
  const points=parse(j,S); wr(k,{t:Date.now(),day:today(),points});
  return {points,cached:false,at:Date.now()};
}
const note=e=>e&&e.code==='offline'?'You are offline. Fill the stock by hand.':e&&e.code==='cors'?'The stock site doesn’t let Studio read it yet.':(e&&e.message)||'The stock did not load.';
const when=iso=>{ try{ const d=new Date(iso); return isNaN(d)?'':new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d); }catch(_){ return ''; } };

function css(){ if(document.getElementById('stockCss')) return; const s=document.createElement('style'); s.id='stockCss';
  s.textContent='.stock-dlg .stock-list{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto;margin:10px 0}.stock-dlg .stock-row{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:48px;text-align:start;padding:8px 12px}.stock-dlg .stock-row b{font-weight:600}.stock-dlg .stock-row .small{opacity:.8}.stock-dlg input[type=search]{width:100%;min-height:48px}.stock-note{min-height:20px}.stock-pick{min-height:48px}';
  document.head.appendChild(s); }

/* the sheet: a searchable list of place names; tapping one calls onPick(point) and closes */
async function pick(B,ctx){
  css(); const S=B.stock, names={}; (B.flavours||[]).forEach(f=>{ names[f.id]=f.name; });
  const d=ctx.dialog(`<div class="dlg-body stock-dlg"><h3 id="stkH">Pick a sale point</h3>
    <input type="search" id="stkQ" dir="auto" autocomplete="off" aria-label="Search sale points" placeholder="Search">
    <p class="small stock-note" id="stkN" role="status" aria-live="polite">Loading…</p><div class="stock-list" id="stkL" role="list"></div>
    <div class="dlg-actions"><button type="button" class="mini" id="stkR">Refresh</button><button type="button" class="btn" id="stkX">Close</button></div></div>`,'stock-dlg');
  d.setAttribute('aria-labelledby','stkH');
  const q=d.querySelector('#stkQ'), L=d.querySelector('#stkL'), N=d.querySelector('#stkN'); let pts=[];
  const paint=()=>{ const t=ctx.norm?ctx.norm(q.value):norm(q.value).trim();
    const list=pts.filter(p=>!t||(ctx.norm?ctx.norm(p.label):norm(p.label)).includes(t));
    L.innerHTML=list.map(p=>`<button type="button" class="act-row stock-row" role="listitem" data-id="${esc(p.id)}"><b dir="auto"><bdi>${esc(p.label)}</bdi></b><span class="small" dir="auto">${(B.flavours||[]).filter(f=>f.id in p.stock).map(f=>`<bdi>${esc(f.name)}</bdi> ${p.stock[f.id]}`).join(' · ')}${p.updated?' · '+esc(when(p.updated)):''}</span></button>`).join('');
    if(pts.length) N.textContent=list.length?'':'No sale point matches.'; };
  const go=async force=>{ N.textContent='Loading…'; d.querySelector('#stkR').disabled=true;
    try{ const r=await load(B,{force}); pts=r.points; N.textContent=''; paint(); }catch(e){ pts=[]; L.innerHTML=''; N.textContent=note(e); }
    d.querySelector('#stkR').disabled=false; };
  q.addEventListener('input',paint);
  L.addEventListener('click',e=>{ const b=e.target.closest('[data-id]'); if(!b) return; const p=pts.find(x=>x.id===b.dataset.id); if(!p) return; d.close(); ctx.onPick(p); });
  d.querySelector('#stkR').onclick=()=>go(true); d.querySelector('#stkX').onclick=()=>d.close();
  await go(false);
}
window.StudioStock={load,parse,pick,note};
})();

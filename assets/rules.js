/* Brand rules check (mega 2.3). A soft check: quiet warnings in the Save sheet, never a blocked or delayed save.
   Brand-agnostic: every rule's DATA (banned words, looks, minimum sizes, HD cans, approved lines) is the brand kit's `rules` block.
   StudioRules.check(design) -> [{id,rule,msg,layer?,fix?:{label,apply()}}]
   design (one per page; add page:N to name the page in the message): {format:'story'|'post'|'square'|'highlight', w,h, rules, brand, approved?:[lines], grounds:[css colours], items:[item]}
   item (canvas pixels, in draw order, bottom first): {id,kind:'text'|'shape'|'photo'|'asset'|'other', x,y,w,h,
     text,size,color,bg (a text's own pill), fill (a shape's colour), assetId, noun (a name: never asked for approval),
     api:{move(dy), setText(t), scale(f)}}  (api: how a Fix changes the layer; leave a method out and that rule offers no Fix)
   StudioRules.mount(host,o) puts the findings into the Save sheet (see the end of this file). */
(function(){
const CSS=document.currentScript&&document.currentScript.src.replace(/\.js(\?.*)?$/,'.css');
const OFF_KEY='studio:rulesOff', IGN_KEY='studio:rulesIgn:';
const N=s=>window.Studio&&Studio.normText?Studio.normText(s):String(s==null?'':s).toLowerCase().trim();
const iso=s=>'⁨'+s+'⁩';   // keep an Arabic word readable inside an English sentence
const AR=/[؀-ۿ]/, MARKS=/[ؐ-ًؚ-ٰٟـۖ-ۭ]/;
const PUNCT=/[.…!؟?،,:;"'«»“”()\-–—_*+]+/g;
const clean=s=>N(String(s||'').replace(PUNCT,' ')).replace(/\s+/g,' ').trim();

/* ---- colour ---- */
function parse(c){ if(!c||typeof c!=='string') return null; c=c.trim().toLowerCase(); let m;
  if((m=c.match(/^#([0-9a-f]{3})$/))) return m[1].split('').map(h=>parseInt(h+h,16));
  if((m=c.match(/^#([0-9a-f]{6})/))) return [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16));
  if((m=c.match(/^rgba?\(([^)]+)\)/))){ const p=m[1].split(/[ ,\/]+/).map(parseFloat); if(p.length>=3&&p.slice(0,3).every(isFinite)) return p.slice(0,3); }
  if(c==='white') return [255,255,255]; if(c==='black') return [0,0,0]; return null; }
const lum=rgb=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(rgb[0])+.7152*f(rgb[1])+.0722*f(rgb[2]); };
function contrast(a,b){ const A=parse(a), B=parse(b); if(!A||!B) return null; const x=lum(A), y=lum(B); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
const near=(a,b,t)=>{ const A=parse(a), B=parse(b); return !!A&&!!B&&A.every((v,i)=>Math.abs(v-B[i])<=(t||8)); };

/* ---- approved lines: every Arabic line in the brand's phrases (+ extra + the team phrasebook) ---- */
function strings(v,out){ if(typeof v==='string'){ if(AR.test(v)) out.push(v); } else if(Array.isArray(v)) v.forEach(x=>strings(x,out)); else if(v&&typeof v==='object') Object.values(v).forEach(x=>strings(x,out)); return out; }
function approvedSet(design){ const R=design.rules||{}, set=new Set(), B=design.brand||{};
  const add=l=>String(l||'').split('\n').forEach(x=>{ const k=clean(x); if(k) set.add(k); });
  strings(B.phrases,[]).forEach(add); strings((B.flavours||[]).map(f=>f.name),[]).forEach(add);
  strings(R.phrases&&R.phrases.extra,[]).forEach(add); try{ if(window.Studio&&Studio.phrasesApproved) Studio.phrasesApproved().forEach(add); }catch(_){}   /* + every approved phrasebook line (captions too) */ (design.approved||[]).forEach(add); return set; }

/* ---- the rules ---- */
function banned(it,R,out){ if(it.kind!=='text'||!it.text) return; const mm=window.Studio&&Studio.normMap; if(!mm) return; const mp=mm(it.text), n=mp.n;
  (R.banned||[]).forEach(e=>{ (e.words||[]).slice().sort((a,b)=>N(b).length-N(a).length).forEach(w=>{ const wn=N(w); if(!wn) return;
    const re=new RegExp('(^|[^\\p{L}\\p{N}])((?:[وفبلك]?(?:ال)?)?)('+wn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?![\\p{L}\\p{N}])','gu'); let m;
    while((m=re.exec(n))){ const at=m.index+m[1].length+m[2].length; let s=mp.m[at], t=mp.m[at+wn.length-1]+1; while(t<it.text.length&&MARKS.test(it.text[t])) t++;
      const found=it.text.slice(s,t);
      out.push({id:'banned:'+it.id+':'+wn,rule:'Banned word',layer:it.id,msg:iso(found)+' is not used in our wording. '+(e.why||'')+(e.use?' Use '+iso(e.use)+'.':''),
        fix:e.use&&it.api&&it.api.setText?{label:'Use '+e.use,apply:()=>{ const cur=it.text; const k=cur.indexOf(found); if(k<0) return; it.api.setText(cur.slice(0,k)+e.use+cur.slice(k+found.length)); }}:null}); } }); }); }
function passion(d,R,out){ const P=R.passion; if(!P) return; const texts=d.items.filter(i=>i.kind==='text'&&i.text), all=N(texts.map(i=>i.text).join(' \n '));
  const has=(P.words||[]).some(w=>all.includes(N(w)))||d.items.some(i=>i.kind==='asset'&&(P.assets||[]).includes(i.assetId)); if(!has) return;
  texts.forEach(i=>{ const n=N(i.text); (P.never||['25+']).forEach(w=>{ if(n.replace(/\s+/g,'').includes(N(w).replace(/\s+/g,''))) out.push({id:'passion:'+i.id,rule:'Passion fruit',layer:i.id,msg:iso(i.text.trim().slice(0,24))+' says '+iso(w)+' on a design with Passion fruit. Passion fruit never has it.'}); }); }); }
function looks(d,R,out){ const L=R.looks; if(!L) return; const col=k=>{ const g=L[k]&&L[k].ground, c=(d.brand&&d.brand.colors)||{}; return c[g]||g; };
  const a=Object.keys(L).filter(k=>(d.grounds||[]).some(g=>near(g,col(k)))); if(a.length>1) out.push({id:'looks:'+a.join('+'),rule:'One look',msg:a.map(k=>L[k].name||k).join(' and ')+' are mixed on one design. Pick one look.'}); }
function safeZone(it,d,out){ if(it.kind!=='text'||!it.text||!it.h||!window.Studio||!Studio.tokens) return; const s=Studio.tokens(d.format).safe; if(!s||(!s.top&&!s.bottom)) return;
  const top=it.y<s.top?Math.min(it.h,s.top-it.y):0, bot=it.y+it.h>d.h-s.bottom?Math.min(it.h,it.y+it.h-(d.h-s.bottom)):0;
  if(top<it.h*.25&&bot<it.h*.25) return; const dy=top>=bot?s.top-it.y:(d.h-s.bottom)-(it.y+it.h), fits=it.h<=d.h-s.top-s.bottom;
  out.push({id:'zone:'+it.id+':'+(top>=bot?'top':'bottom'),rule:'Covered zone',layer:it.id,msg:iso(it.text.trim().slice(0,24))+' sits where Instagram covers the '+(top>=bot?'top ('+s.top+' px)':'bottom ('+s.bottom+' px)')+' of a story.',
    fix:fits&&it.api&&it.api.move?{label:'Move it in',apply:()=>it.api.move(Math.round(dy))}:null}); }
function small(it,d,R,out){ if(it.kind!=='text'||!it.text||!it.size) return; const min=(R.minText||{})[d.format]; if(!min||it.size>=min-.5) return;
  const f=min/it.size, fits=it.w*f<=d.w-2*((window.Studio&&Studio.tokens?Studio.tokens(d.format).safe.side:0)||0)||it.w*f<=d.w-120;
  out.push({id:'small:'+it.id,rule:'Small text',layer:it.id,msg:iso(it.text.trim().slice(0,24))+' is '+Math.round(it.size)+' px. On a phone it should be at least '+min+' px.',
    fix:fits&&it.api&&it.api.scale?{label:'Make it '+min+' px',apply:()=>it.api.scale(f)}:null}); }
function lowContrast(it,idx,d,R,out){ if(it.kind!=='text'||!it.text||!it.color||!R.contrast) return; let bg=it.bg;
  if(!bg){ const cx=it.x+it.w/2, cy=it.y+it.h/2; let under=null; for(let j=idx-1;j>=0;j--){ const o=d.items[j]; if(o.kind==='text') continue; if(cx>=o.x&&cx<=o.x+o.w&&cy>=o.y&&cy<=o.y+o.h){ under=o; break; } }
    if(under){ if(under.kind==='shape'&&under.fill) bg=under.fill; else return; } else bg=(d.grounds||[])[0]; }
  const r=contrast(it.color,bg); if(r==null) return; const C=R.contrast, need=(it.size||0)>=(C.largeFrom||60)?C.large:C.normal; if(r>=need) return;
  out.push({id:'contrast:'+it.id,rule:'Hard to read',layer:it.id,msg:iso(it.text.trim().slice(0,24))+' is hard to read on its background (contrast '+r.toFixed(1)+':1, needs '+need+':1).'}); }
function cans(it,R,out){ const C=R.cans; if(!C||it.kind!=='asset'||!it.assetId) return; const id=it.assetId; if((C.hd||[]).includes(id)||(C.allow||[]).includes(id)) return;
  if(!id.split(/[-_]/).some(p=>p==='can'||p==='cans')) return; out.push({id:'can:'+it.id,rule:'HD can',layer:it.id,msg:'This can picture is not one of the HD cut-outs. Use an HD can from Add asset.'}); }
function unapproved(it,d,set,out){ if(it.kind!=='text'||!it.text||it.noun) return; String(it.text).split('\n').forEach(line=>{ if(!AR.test(line)) return; const k=clean(line); if(!k||set.has(k)) return;
  const bare=k.replace(/[0-9a-z\s]/g,''); if(!bare) return;
  const neu=new Set(((d.rules||{}).phrases||{}).neutral?(d.rules.phrases.neutral).map(clean):[]); if(neu.size&&k.replace(/[0-9a-z]/g,' ').split(' ').filter(Boolean).every(t=>neu.has(t)||neu.has(t.replace(/^ال/,'')))) return; out.push({id:'new:'+it.id+':'+k,rule:'New wording',layer:it.id,msg:iso(line.trim().slice(0,32))+' is new wording that is not approved yet. Ask the owner before you post it.'}); }); }

function check(design){ const d=design||{}, R=d.rules||{}, out=[]; d.items=(d.items||[]).filter(i=>i&&!i.hidden); const set=approvedSet(d);
  try{ d.items.forEach((it,i)=>{ const n0=out.length; banned(it,R,out); const bad=out.length>n0; safeZone(it,d,out); small(it,d,R,out); lowContrast(it,i,d,R,out); cans(it,R,out); if(!bad) unapproved(it,d,set,out); }); /* a banned word is the one finding for that wording */ passion(d,R,out); looks(d,R,out); }catch(e){ console.warn('rules',e); }
  const seen=new Set(); return out.filter(f=>!seen.has(f.id)&&seen.add(f.id)); }

/* ---- the Settings switch and "Ignore" (remembered per design, or per draft until it is saved) ---- */
const lsGet=k=>{ try{ return localStorage.getItem(k); }catch(_){ return null; } }, lsSet=(k,v)=>{ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(_){} };
const enabled=()=>lsGet(OFF_KEY)!=='1', setEnabled=on=>lsSet(OFF_KEY,on?null:'1');
const ignored=scope=>{ try{ return new Set(JSON.parse(lsGet(IGN_KEY+scope)||'[]')); }catch(_){ return new Set(); } };
const ignore=(scope,id)=>{ const s=ignored(scope); s.add(id); lsSet(IGN_KEY+scope,JSON.stringify([...s].slice(-200))); };

/* ---- the quiet lines in the Save sheet ----
   mount(host,{collect:()=>design|[designs]|Promise, scope:()=>string, refresh?}) -> {run()}.  The host stays `hidden` (no height at all) until there is a finding.
   run() works after the sheet is open and never gates a save. */
const WARN='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
const ESC=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function mount(host,opts){ let o=opts; if(CSS&&!document.querySelector('link[data-rules]')){ const l=document.createElement('link'); l.rel='stylesheet'; l.href=CSS; l.dataset.rules='1'; document.head.appendChild(l); }
  if(host._rules){ host._rules.upd(opts); return host._rules; }   // one set of listeners per host
  let token=0, expanded=false, list=[];
  const draw=()=>{ const shown=expanded?list:list.slice(0,3), more=list.length-shown.length;
    host.hidden=!list.length; host.classList.add('rules-box'); host.setAttribute('role','status'); host.setAttribute('aria-live','polite');
    host.innerHTML=list.length?`<ul class="rules-list">${shown.map((f,i)=>`<li class="rules-row" data-i="${list.indexOf(f)}"><span class="rules-ic">${WARN}</span><span class="rules-msg" dir="auto"><b class="rules-rule">${ESC(f.rule)}</b> ${ESC(f.msg)}</span><span class="rules-btns">${f.fix?`<button type="button" class="link rules-fix" data-fix>${ESC(f.fix.label)}</button>`:''}<button type="button" class="link rules-ign" data-ign>Ignore</button></span></li>`).join('')}</ul>${more>0?`<button type="button" class="link rules-more" data-more aria-expanded="false">${more} more</button>`:''}`:''; };
  async function run(){ const my=++token; if(!enabled()){ list=[]; draw(); return; }
    await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));   // after the sheet has opened
    let found=[]; try{ const ds=[].concat(await o.collect()).filter(d=>d&&d.rules&&Object.keys(d.rules).length); ds.forEach(d=>check(d).forEach(f=>{ if(d.page) f.msg='Page '+d.page+': '+f.msg; found.push(f); })); }catch(e){ console.warn('rules',e); }
    if(my!==token) return; const ign=ignored(o.scope()); list=found.filter(f=>!ign.has(f.id)); draw(); }
  host.addEventListener('click',e=>{ const li=e.target.closest('.rules-row'), f=li&&list[+li.dataset.i];
    if(e.target.closest('[data-more]')){ expanded=true; draw(); return; }
    if(f&&e.target.closest('[data-fix]')){ try{ f.fix.apply(); }catch(err){ console.warn('rules fix',err); } if(o.refresh) o.refresh(); run(); return; }
    if(f&&e.target.closest('[data-ign]')){ ignore(o.scope(),f.id); list=list.filter(x=>x!==f); draw(); } });
  return host._rules={run,upd:x=>{ o=x; }}; }
/* captions (mega 4.3): the same wording rules on a caption's text. checkText(text,{rules,brand,approved?}) -> [{id,rule,msg}]. Soft: the caller shows a quiet line, never blocks. */
function checkText(text,o){ o=o||{}; const R=o.rules||{}, out=[]; text=String(text||''); if(!text.trim()) return out;
  const d={rules:R,brand:o.brand||{},approved:o.approved||[],items:[{id:'caption',kind:'text',text}]}, it=d.items[0];
  try{ banned(it,R,out); }catch(_){} try{ passion(d,R,out); }catch(_){}
  try{ const sp=R.sale&&R.sale.words; if(sp&&sp.length){ const n=N(text); sp.forEach(w=>{ if(w&&n.includes(N(w))) out.push({id:'sale:'+N(w),rule:'Sale point',msg:iso(w)+' names a type of sale point. We never name those.'}); }); } }catch(_){}
  if(!out.some(f=>/^banned/.test(f.id))){ try{ unapproved(it,d,approvedSet(d),out); }catch(_){} }
  return out; }
window.StudioRules={check,checkText,mount,enabled,setEnabled,contrast,approvedSet,ignored};
})();

/* Captions with the design (mega 4.3, preview flag "team"). Brand-agnostic; lazy-loaded with assets/captions.css.
   StudioCaptions.editor(host,{brand,caption,tags,onChange(caption,tags),toast,pool?:[tags],idp?}) -> {get(){caption,tags},set(c,t),warn(),text()}
     caption textarea (dir=auto), quiet warnings (StudioRules.checkText, never blocking), approved-line chips (Studio.phrasesApproved), hashtag chips, Copy.
   StudioCaptions.join(caption,tags) -> the string Copy puts on the clipboard (caption, blank line, hashtags). Hashtags are stored WITH a leading "#".
   StudioCaptions.copy(caption,tags,toast) -> Promise<bool>.  StudioCaptions.pool(cloud,brandId) -> Promise<[#tag...]> (hashtags the team already uses; never invented). */
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tagsOf=s=>[...new Set(String(s||'').split(/[\s,،]+/).map(t=>t.replace(/^#+/,'').trim()).filter(Boolean))].map(t=>'#'+t);
const normTags=a=>[...new Set((a||[]).map(t=>String(t).replace(/^#+/,'').trim()).filter(Boolean))].map(t=>'#'+t);
const join=(c,t)=>{ c=String(c||'').trim(); t=normTags(t); return c&&t.length?c+'\n\n'+t.join(' '):c||t.join(' '); };
const has=(c,t)=>!!String(c||'').trim()||normTags(t).length>0;
let n=0;

async function copy(c,t,toast){
  const s=join(c,t); if(!s){ if(toast) toast('Nothing to copy yet.'); return false; }
  let ok=false; try{ await navigator.clipboard.writeText(s); ok=true; }catch(_){}
  if(!ok){ try{ const ta=document.createElement('textarea'); ta.value=s; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select(); ok=document.execCommand('copy'); ta.remove(); }catch(_){} }
  if(toast) toast(ok?'Caption copied.':'Could not copy. Select the text and copy it.'); return ok;
}
/* hashtags the team already uses on its designs and calendar items, most used first */
async function pool(C,brand){
  const cnt={}, add=a=>normTags(a).forEach(t=>{ cnt[t]=(cnt[t]||0)+1; });
  try{ (await C.designs(brand)||[]).forEach(d=>add(d.hashtags)); }catch(_){}
  try{ if(C.calendar) (await C.calendar(brand,{from:'2000-01-01',to:'2099-12-31'})||[]).forEach(x=>add(x.hashtags)); }catch(_){}
  return Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
}

function editor(host,o){
  o=o||{}; const id='cap'+(++n), B=o.brand||{};
  let tags=normTags(o.tags), poolTags=normTags(o.pool);
  host.classList.add('cap-ed');
  host.innerHTML=`<div class="cap-field"><label class="lbl" for="${id}t">Caption</label><textarea id="${id}t" class="cap-ta" dir="auto" rows="4" autocomplete="off" aria-describedby="${id}w"></textarea>
    <p class="cap-warn small" id="${id}w" role="status" hidden></p><div class="cap-sug" data-sug></div></div>
    <div class="cap-field"><label class="lbl" for="${id}h">Hashtags</label><div class="cap-tags" data-tags><span class="cap-chips" data-chips></span><input type="text" id="${id}h" class="cap-tin" dir="auto" autocomplete="off" autocapitalize="off" enterkeyhint="done" placeholder="Add a hashtag" aria-label="Add a hashtag"></div>
    <div class="cap-tsug" data-tsug></div></div>
    <div class="cap-actions"><button type="button" class="mini" data-copy>Copy</button></div>`;
  const q=s=>host.querySelector(s), ta=q('textarea'), tin=q('.cap-tin'); ta.value=o.caption||'';
  const emit=()=>{ try{ o.onChange&&o.onChange(ta.value,tags.slice()); }catch(_){} };
  const hasCap=()=>has(ta.value,tags);
  /* phrase suggestions: the caption category first, headline / small as a second row; tap = insert at the cursor */
  function sugRow(list,cls,label){ return list.length?`<div class="cap-row ${cls}" role="group" aria-label="${label}">${list.map(l=>`<button type="button" class="chip cap-chip" dir="auto" data-ins="${esc(l)}" data-sep="${cls==='main'?'\n':' '}">${esc(l)}</button>`).join('')}</div>`:''; }
  function paintSug(){ let all=[]; try{ all=(window.Studio&&Studio.phrasesApproved&&Studio.phrasesApproved(true))||[]; }catch(_){}
    const by=c=>all.filter(x=>x&&x.category===c).map(x=>x.line), cap=by('caption').slice(0,10), more=[...new Set([...by('headline'),...by('small')])].slice(0,10);
    q('[data-sug]').innerHTML=sugRow(cap,'main','Approved caption lines')+sugRow(more,'more','Other approved lines'); }
  function paintTags(){
    q('[data-chips]').innerHTML=tags.map(t=>`<span class="cap-tag"><bdi dir="auto">${esc(t)}</bdi><button type="button" class="cap-x" data-rm="${esc(t)}" aria-label="Remove ${esc(t)}"><span aria-hidden="true">×</span></button></span>`).join('');
    const free=poolTags.filter(t=>!tags.includes(t)).slice(0,8);
    q('[data-tsug]').innerHTML=free.length?`<span class="small cap-tlbl">Your team uses</span><div class="cap-row" role="group" aria-label="Hashtags your team already uses">${free.map(t=>`<button type="button" class="chip cap-chip" dir="auto" data-addtag="${esc(t)}">${esc(t)}</button>`).join('')}</div>`:''; }
  /* rules: quiet, never blocking */
  let wT=0;
  function warn(){ const w=q('.cap-warn'); let f=[]; try{ if(window.StudioRules&&StudioRules.checkText) f=StudioRules.checkText(ta.value,{rules:B.rules,brand:B}); }catch(_){}
    w.hidden=!f.length; w.textContent=f.length?f[0].msg+(f.length>1?' (+'+(f.length-1)+' more)':''):''; return f; }
  const later=()=>{ clearTimeout(wT); wT=setTimeout(warn,250); };
  const ensureRules=()=>{ if(window.StudioRules||!window.Studio) return; Studio.lazy('rules').catch(()=>{}).then(warn); };
  function addTag(raw){ const add=tagsOf(raw); if(!add.length) return false; add.forEach(t=>{ if(!tags.includes(t)) tags.push(t); }); paintTags(); emit(); return true; }
  const flush=()=>{ if(addTag(tin.value)) tin.value=''; };
  ta.addEventListener('input',()=>{ emit(); later(); });
  tin.addEventListener('input',()=>{ if(/[\s,،]$/.test(tin.value)) flush(); });
  tin.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); flush(); } else if(e.key==='Backspace'&&!tin.value&&tags.length){ tags.pop(); paintTags(); emit(); } });
  tin.addEventListener('blur',flush);
  host.addEventListener('click',e=>{ let b;
    if((b=e.target.closest('[data-ins]'))){ const v=b.dataset.ins, s=ta.selectionStart==null?ta.value.length:ta.selectionStart, en=ta.selectionEnd==null?s:ta.selectionEnd, cur=ta.value;
      const before=cur.slice(0,s), after=cur.slice(en), pre=before&&!/\s$/.test(before)?b.dataset.sep:'', post=after&&!/^\s/.test(after)?b.dataset.sep:'', ins=pre+v+post;
      ta.value=before+ins+after; const pos=(before+ins).length; ta.focus({preventScroll:true}); try{ ta.setSelectionRange(pos,pos); }catch(_){} emit(); warn(); return; }
    if((b=e.target.closest('[data-addtag]'))){ addTag(b.dataset.addtag); return; }
    if((b=e.target.closest('[data-rm]'))){ tags=tags.filter(t=>t!==b.dataset.rm); paintTags(); emit(); tin.focus({preventScroll:true}); return; }
    if(e.target.closest('[data-copy]')){ flush(); copy(ta.value,tags,o.toast); } });
  paintSug(); paintTags(); warn(); ensureRules();
  const onPh=()=>{ if(host.isConnected) paintSug(); else document.removeEventListener('studio:phrases',onPh); }; document.addEventListener('studio:phrases',onPh);
  if(!poolTags.length&&o.poolLoad) o.poolLoad().then(p=>{ poolTags=normTags(p); if(host.isConnected) paintTags(); }).catch(()=>{});
  return { get(){ flush(); return {caption:ta.value,tags:tags.slice()}; },
    set(c,t){ ta.value=c||''; tags=normTags(t); paintTags(); warn(); },
    text:()=>join(ta.value,tags), warn };
}
window.StudioCaptions={editor,join,copy,pool,has,normTags,tagsOf};
})();

/* "Who's using Studio?": a name kept on this device (localStorage 'studio:who') that goes on the designs you save, so the team
   can see who made what. No passwords; "I'm the owner" is only a switch that shows owner-only buttons (a confirm, nothing secret).
   Brand-agnostic. Loaded lazily by studio.js the first time a page needs it. */
(function(){
const KEY='studio:who', NAMES='studio:who:names';
const rd=k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(_){ return null; } };
const wr=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} };
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lab=()=>(window.Studio&&window.Studio.lab)||null;

function get(){ const r=rd(KEY); if(!r||typeof r!=='object') return null; return {name:String(r.name||'').trim(),owner:!!r.owner}; }
const author=()=>{ const g=get(); return (g&&g.name)||null; };
function set(name){ name=String(name==null?'':name).replace(/\s+/g,' ').trim().slice(0,40); const g=get();
  wr(KEY,{name,owner:g?g.owner:false});
  if(name){ const seen=(rd(NAMES)||[]).filter(n=>n!==name); seen.unshift(name); wr(NAMES,seen.slice(0,12)); }
  return get(); }
/* the owner switch: turning it on asks first (only the owner should); turning it off just does it */
async function setOwner(on){
  const g=get()||{name:''};
  if(!on){ wr(KEY,{name:g.name,owner:false}); return false; }
  const yes=await confirmBox('Only the owner should switch this on. It shows the owner-only buttons on this '+(matchMedia('(pointer:coarse)').matches?'phone':'device')+'.','I’m the owner','Cancel');
  if(yes) wr(KEY,{name:g.name,owner:true});
  return !!yes;
}

/* a small sheet: the engine's dialog() when the page has it, else a plain <dialog> that locks the page scroll the same way */
function sheet(html,cls){
  const L=lab(); if(L&&L.dialog) return L.dialog(html,cls);
  const d=document.createElement('dialog'); d.className='dlg '+(cls||''); d.innerHTML=html; document.body.appendChild(d);
  const key={}; d.addEventListener('close',()=>{ if(L&&L.lockScroll) L.lockScroll(key,false); setTimeout(()=>d.remove(),50); });
  d.showModal(); if(L&&L.lockScroll) L.lockScroll(key,true); return d;
}
function confirmBox(text,yes,no){
  return new Promise(res=>{ let done=false; const fin=v=>{ if(!done){ done=true; res(v); } };
    const d=sheet(`<form method="dialog" class="dlg-body who-body"><h3 id="whoCH">Are you the owner?</h3><p class="small">${esc(text)}</p>
      <div class="dlg-actions"><button type="button" class="mini" data-no>${esc(no)}</button><button type="button" class="btn" data-yes>${esc(yes)}</button></div></form>`,'who-dlg');
    d.setAttribute('aria-labelledby','whoCH');
    d.querySelector('[data-no]').onclick=()=>{ fin(false); d.close(); };
    d.querySelector('[data-yes]').onclick=()=>{ fin(true); d.close(); };
    d.addEventListener('close',()=>fin(false)); d.addEventListener('cancel',()=>fin(false)); });
}

/* names already used on this team: the "author" of saved designs (when signed in) plus the names typed on this device */
async function teamNames(o){
  const out=[]; (o&&o.names||[]).forEach(n=>out.push(n));
  try{ const L=lab(), C=L&&L.cloud?await L.cloud():window.StudioCloud, b=(o&&o.brand)||(L&&L.brand&&L.brand()&&L.brand().id);
    if(C&&b&&await Promise.race([C.session(),new Promise(r=>setTimeout(()=>r(null),2500))])){
      const list=await Promise.race([C.designs(b),new Promise(r=>setTimeout(()=>r([]),3000))]);
      const n={}; (list||[]).forEach(d=>{ if(d.author) n[d.author]=(n[d.author]||0)+1; });
      Object.keys(n).sort((a,b)=>n[b]-n[a]).forEach(x=>out.push(x)); } }catch(_){}
  (rd(NAMES)||[]).forEach(n=>out.push(n));
  return [...new Set(out.map(n=>String(n).trim()).filter(Boolean))].slice(0,16);
}

let pending=null;
/* opens the picker → the chosen name, or null if dismissed. Never opens by itself in an automated browser: pass {user:true}
   when a person tapped something (Settings > Change) so it always opens. */
function ask(o){
  o=o||{}; if(navigator.webdriver&&!o.user) return Promise.resolve(null);
  if(pending) return pending;
  pending=(async()=>{
    const names=await teamNames(o), cur=author();
    return new Promise(res=>{ let done=false; const fin=v=>{ if(!done){ done=true; pending=null; res(v); } };
      const d=sheet(`<form method="dialog" class="dlg-body who-body" action="#"><h3 id="whoH">Who’s using Studio?</h3>
        <p class="small">Your name goes on the designs you save, so the team knows who made what.</p>
        ${names.length?`<div class="chips who-chips" role="group" aria-label="Names used before">${names.map(n=>`<button type="button" class="chip" dir="auto" aria-pressed="${n===cur}">${esc(n)}</button>`).join('')}</div>`:''}
        <div class="field"><label class="lbl" for="whoIn">${names.length?'Or type your name':'Your name'}</label>
          <input type="text" id="whoIn" dir="auto" maxlength="40" autocomplete="off" autocapitalize="words" enterkeyhint="done" value="${esc(cur||'')}"></div>
        <div class="dlg-actions"><button type="button" class="mini" data-no>Not now</button><button type="submit" class="btn" data-save>Save</button></div></form>`,'who-dlg');
      d.setAttribute('aria-labelledby','whoH');
      const inp=d.querySelector('#whoIn'), save=d.querySelector('[data-save]');
      const sync=()=>{ save.disabled=!inp.value.trim(); d.querySelectorAll('.who-chips .chip').forEach(c=>c.setAttribute('aria-pressed',String(c.textContent===inp.value.trim()))); };
      inp.addEventListener('input',sync); sync();
      d.querySelectorAll('.who-chips .chip').forEach(c=>c.onclick=()=>{ inp.value=c.textContent; sync(); });
      d.querySelector('[data-no]').onclick=()=>{ d.close(); };
      d.querySelector('form').addEventListener('submit',e=>{ e.preventDefault(); if(!inp.value.trim()) return; set(inp.value); fin(author()); d.close(); });
      d.addEventListener('close',()=>fin(null)); d.addEventListener('cancel',()=>fin(null));
    });
  })();
  return pending;
}

window.StudioWho={get,set,setOwner,ask,author};
})();

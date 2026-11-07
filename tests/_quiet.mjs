/* Loaded by run.mjs with `node --import tests/_quiet.mjs tests/<suite>.mjs` (NOQUIET=1 turns it off).
   Turns every fixed `page.waitForTimeout(ms)` into "wait until nothing is going to happen within ms", capped at ms:
   the sleep ends early only when, inside the page, there is
     - no one-shot setTimeout due within the time left (debounced saves, toasts, settle timers),
     - no running finite CSS/Web animation, no fetch / XHR / <img> load still in flight, no font still loading,
   twice in a row and after a short floor (FLOOR ms, so IndexedDB / canvas / decode callbacks that carry no timer land first), then two frames.
   If nothing is scheduled to happen in the window, sleeping the rest of it changes nothing, so no check gets weaker; when something is
   scheduled it still waits for it (up to ms, as before). A page that cannot answer (navigating, closed, no tracker) sleeps the full ms.
   Only the main frame of the page is looked at. */
import { chromium } from 'playwright';
if(!process.env.NOQUIET){
const FLOOR=+process.env.QUIET_FLOOR||150;
const TRACK=`(()=>{ if(window.__q||window.top!==window) return;
  const q=window.__q={timers:new Map(),fetch:0,xhr:0,img:0}, st=window.setTimeout, ct=window.clearTimeout; q.st=st;
  window.setTimeout=function(f,d,...a){ d=+d||0; const id=st.call(window,function(...x){ q.timers.delete(id); return typeof f==='function'?f.apply(this,x):undefined; },d,...a); q.timers.set(id,performance.now()+d); return id; };
  window.clearTimeout=function(id){ q.timers.delete(id); return ct.call(window,id); };
  const f0=window.fetch; if(f0) window.fetch=function(...a){ q.fetch++; let p; try{ p=f0.apply(this,a); }catch(e){ q.fetch--; throw e; } const done=()=>{ q.fetch--; }; p.then(done,done); return p; };
  const xs=XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.send=function(...a){ q.xhr++; this.addEventListener('loadend',()=>{ q.xhr--; },{once:true}); return xs.apply(this,a); };
  const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(d&&d.set) Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:d.enumerable,get:d.get,set(v){ if(v&&!this.__qp){ this.__qp=1; q.img++; const end=()=>{ if(this.__qp){ this.__qp=0; q.img--; } }; this.addEventListener('load',end,{once:true}); this.addEventListener('error',end,{once:true}); }
    return d.set.call(this,v); }});
})();`;
const WAIT=(ms,floor)=>`new Promise(res=>{ const q=window.__q; if(!q) return res(false); const t0=performance.now(), end=t0+${ms}, st=q.st; let calm=0;
  const quiet=()=>{ const now=performance.now(); for(const due of q.timers.values()) if(due<=end) return false;
    if(q.fetch>0||q.xhr>0||q.img>0) return false; if(document.fonts&&document.fonts.status==='loading') return false;
    try{ for(const a of document.getAnimations()){ if(a.playState!=='running') continue; const t=a.effect&&a.effect.getComputedTiming(); if(t&&t.endTime!==Infinity&&isFinite(t.endTime)) return false; } }catch(_){}
    return true; };
  const tick=()=>{ const now=performance.now(); if(now>=end) return res(true);
    if(now-t0>=${floor}&&quiet()){ if(++calm>=2) return requestAnimationFrame(()=>requestAnimationFrame(()=>res(true))); } else calm=0;
    st.call(window,tick,25); }; st.call(window,tick,25); })`;
const patchPage=p=>{ if(!p||p.__quiet) return p; p.__quiet=1; const orig=p.waitForTimeout.bind(p);
  p.waitForTimeout=async ms=>{ if(!(ms>=FLOOR+50)||p.isClosed()) return orig(ms); const t=Date.now();
    let ok=false; try{ ok=await p.evaluate(WAIT(ms,FLOOR)); }catch(_){ ok=false; }
    if(!ok){ const left=ms-(Date.now()-t); if(left>0) await orig(left); } };
  return p; };
const patchCtx=c=>{ if(!c||c.__quiet) return c; c.__quiet=1;
  c.addInitScript({content:TRACK}).catch(()=>{}); c.pages().forEach(patchPage); c.on('page',patchPage);
  const np=c.newPage.bind(c); c.newPage=async(...a)=>patchPage(await np(...a)); return c; };
const launch=chromium.launch.bind(chromium);
chromium.launch=async(...a)=>{ const b=await launch(...a);
  const nc=b.newContext.bind(b); b.newContext=async(...x)=>{ return patchCtx(await nc(...x)); };
  const npg=b.newPage.bind(b); b.newPage=async(...x)=>{ return patchPage(await npg(...x)); };
  return b; };
}

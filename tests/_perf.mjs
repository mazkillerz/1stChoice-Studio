import { chromium } from 'playwright';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const b=await chromium.launch({args:['--enable-precise-memory-info']});
const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); await ctx.route(/supabase\.co|fonts\.g/,r=>r.abort());
await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); }catch(e){}`});
const pg=await ctx.newPage();
await pg.goto(BASE+'tools/video.html'); await pg.waitForFunction(()=>window.__video&&window.__video().ready,null,{timeout:60000});
for(const [w,h] of [[540,960],[1080,1920]]){
  const r=await pg.evaluate(([w,h])=>{ const P=VD.st.P, c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'), D=P.duration, ms=[];
    for(let i=0;i<6;i++) P.draw(x,i/6*D,{preview:true});
    const m0=performance.memory&&performance.memory.usedJSHeapSize;
    for(let i=0;i<60;i++){ const t0=performance.now(); P.draw(x,(i+.5)/60*D,{preview:true}); ms.push(performance.now()-t0); }
    const m1=performance.memory&&performance.memory.usedJSHeapSize; ms.sort((a,b)=>a-b);
    return {mean:+(ms.reduce((a,b)=>a+b,0)/ms.length).toFixed(1),p95:+ms[Math.floor(ms.length*.95)].toFixed(1),heapKB:m0!=null?Math.round((m1-m0)/1024):null}; },[w,h]);
  console.log(w+'x'+h,JSON.stringify(r));
}
const h=await pg.evaluate(()=>{ const P=VD.st.P, c=document.createElement('canvas'); c.width=540; c.height=960; const x=c.getContext('2d'); let a=0; for(const t of [0.3,1.1,2.4,4.2,6.5,8.8]){ P.draw(x,t,{preview:true}); const d=x.getImageData(0,0,540,960).data; for(let i=0;i<d.length;i+=7) a=(Math.imul(a,31)+d[i])|0; } return a; });
console.log('hash',h);
await b.close();

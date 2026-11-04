/* Studio 1.35.0 (Simplify): More on a text layer is one row shorter (Save this style beside Copy style, no empty Text styles block),
   and Home hides the list/grid switch while fewer than two tools are pinned (Settings and search still switch it). Phone 390 + 360. */
import { chromium } from 'playwright'; import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>res.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' ('+JSON.stringify(i)+')':''));
const T0=Date.now(), b=await chromium.launch(), errs=[];
const mk=async(w,h,pins)=>{ const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(p=>{ try{ if(!sessionStorage.getItem('s35')){ sessionStorage.setItem('s35','1'); localStorage.setItem('studio:welcome','1'); if(p) localStorage.setItem('studio:pins',JSON.stringify(p)); } }catch(e){} },pins||null);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e))); return {ctx,pg}; };
for(const [w,h] of [[390,844],[360,740]]){ const N=w+': ';
  /* More tab */
  { const {ctx,pg}=await mk(w,h); await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3600);
    const pick=async kind=>{ const bx=await pg.evaluate(k=>{ const r=Studio.debug.reg().find(x=>x.kind===k&&(k!=='text'||x.typ)&&!x.empty&&!x.hidden); return r&&{x:r.x+r.w/2,y:r.y+r.h/2}; },kind);
      const vr=await pg.locator('#view').boundingBox(), k=vr.width/(await pg.evaluate(()=>document.getElementById('view').width)); await pg.touchscreen.tap(vr.x+bx.x*k,vr.y+bx.y*k); await pg.waitForTimeout(450); };
    await pick('text'); await pg.tap('#sh-insp .itab[data-part="more"]'); await pg.waitForTimeout(1000);
    const m=await pg.evaluate(()=>{ const v=e=>{ const el=document.getElementById(e); return !!el&&!el.hidden&&el.getClientRects().length>0; }, r=id=>document.getElementById(id).getBoundingClientRect();
      return {row:document.getElementById('inspSaveStyle').parentElement.id, save:v('inspSaveStyle'), copy:v('inspCopyStyle'), block:v('inspTStyles'), same:Math.abs(r('inspSaveStyle').top-r('inspCopyStyle').top)<2, h:Math.round(r('inspSaveStyle').height), view:Math.round(r('view').height), sw:document.documentElement.scrollWidth<=innerWidth+1}; });
    ok(N+'Save this style is on the Copy style row',m.row==='inspStyleRow'&&m.save&&m.copy&&m.same,m);
    ok(N+'no empty Text styles block before a style is saved',!m.block,m);
    ok(N+'Save this style is a full-size target (>= 44px)',m.h>=44,m.h);
    ok(N+'no sideways scroll',m.sw);
    const view0=m.view; await pg.tap('#inspSaveStyle'); await pg.waitForTimeout(400);
    const m2=await pg.evaluate(()=>({block:!document.getElementById('inspTStyles').hidden, chips:document.querySelectorAll('#tsList .ts-use').length, saved:(JSON.parse(localStorage.getItem('studio:textstyles')||'[]')||[]).length}));
    ok(N+'after Save this style the list shows the new style',m2.block&&m2.chips===1&&m2.saved===1,m2);
    ok(N+'preview keeps a usable height while More is open',view0>=(w===360?300:390),view0);
    await pg.tap('#inspCopyStyle'); await pg.waitForTimeout(300);
    const m3=await pg.evaluate(()=>{ const v=e=>{ const el=document.getElementById(e); return !el.hidden&&el.getClientRects().length>0; }; const bs=[...document.querySelectorAll('#inspStyleRow .mini')].filter(x=>!x.hidden); return {paste:v('inspPasteStyle'), save:v('inspSaveStyle'), clipped:bs.filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.id), sw:document.documentElement.scrollWidth<=innerWidth+1}; });
    ok(N+'after Copy style: Paste and Save this style both show, no label cut, no sideways scroll',m3.paste&&m3.save&&!m3.clipped.length&&m3.sw,m3);
    await ctx.close(); }
  /* Home switch */
  for(const [pins,want] of [[['restock'],false],[['restock','photo-story'],true]]){ const {ctx,pg}=await mk(w,h,pins); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1800);
    const vis=await pg.evaluate(()=>{ const s=document.querySelector('.vswitch[data-view="tools"]'); return !!s&&!s.hidden&&s.getClientRects().length>0; });
    ok(N+pins.length+' pinned: list/grid switch '+(want?'shows':'is hidden'),vis===want);
    if(!want){ await pg.tap('#setBtn'); await pg.waitForTimeout(600); const row=pg.locator('[data-set="view"]').first(); const has=await row.count();
      ok(N+'Settings still has Your tools (list/grid)',has>0); if(has){ await row.tap(); await pg.waitForTimeout(300); ok(N+'Settings switches it to grid',(await pg.evaluate(()=>document.getElementById('toolGrid').className)).includes('view-grid')); } }
    await ctx.close(); } }
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close(); console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`simplify35: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-T0)/1000)} s`); process.exit(f?1:0);

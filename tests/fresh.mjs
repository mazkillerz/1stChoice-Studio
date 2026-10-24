/* Studio 0.7.0: the Fresh look is the default for everyone (it was a preview switch in 0.6.0).
   Bold accent #3d5afe in light mode on every page with nothing stored, no switch (no studio:look, ?look=, search action or What's New toggle),
   the old stored choice is cleaned up, the save gets its tick and haptic, reduced motion shows no tick.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,colorScheme:'light'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
/* count haptics: Android's vibrate is recorded instead of buzzing */
await ctx.addInitScript(()=>{ window.__buzz=[]; try{ Object.defineProperty(navigator,'vibrate',{configurable:true,value:p=>{ window.__buzz.push(p); return true; }}); }catch(_){} });
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
const accent=()=>pg.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
const look=()=>pg.evaluate(()=>document.documentElement.dataset.look||'');
const dls=[]; pg.on('download',d=>dls.push(d));
/* nothing stored: the look is already on */
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(700);
ok('home page, nothing stored: the bold accent',await accent()==='#3d5afe',await accent());
ok('no data-look needed',await look()==='');
ok('the + button uses the accent',await pg.$eval('#fab',e=>getComputedStyle(e).backgroundColor)==='rgb(61, 90, 254)');
const bar=await pg.$eval('.hubbar',e=>{ const r=e.getBoundingClientRect(); return {gap:innerHeight-r.bottom,left:r.left,radius:parseFloat(getComputedStyle(e).borderTopLeftRadius)}; });
ok('the tab bar floats above the page',bar.gap>=8&&bar.left>=8&&bar.radius>=16,JSON.stringify(bar));
ok('cards have soft shadows',await pg.$eval('.tool-row',e=>getComputedStyle(e).boxShadow!=='none'));
ok('smooth page changes are switched on in the HTML',await pg.evaluate(()=>[...document.querySelectorAll('head style')].some(s=>/@view-transition/.test(s.textContent))));
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900);
ok('tool page, nothing stored: the bold accent',await accent()==='#3d5afe',await accent());
ok('the main Save button uses the accent',await pg.$eval('#save',e=>getComputedStyle(e).backgroundColor)==='rgb(61, 90, 254)');
/* the old preview switch is gone, and what it stored is cleaned up */
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.setItem('studio:look','"classic"')); await pg.reload(); await pg.waitForTimeout(500);
ok('an old studio:look value is removed on load',await pg.evaluate(()=>localStorage.getItem('studio:look'))===null);
ok('and the look stays on',await accent()==='#3d5afe');
await pg.goto(BASE+'index.html?look=classic'); await pg.waitForTimeout(600);
ok('?look=classic does nothing',await accent()==='#3d5afe'&&await look()===''&&await pg.evaluate(()=>localStorage.getItem('studio:look'))===null);
await pg.goto(BASE+'index.html?look=fresh'); await pg.waitForTimeout(600);
ok('?look=fresh stores nothing',await pg.evaluate(()=>localStorage.getItem('studio:look'))===null&&await look()==='');
await pg.tap('#uq'); await pg.fill('#uq','fresh look'); await pg.waitForTimeout(300);
const found=await pg.$$eval('#usPanel .us-t',t=>t.map(x=>x.textContent));
ok('search has no "fresh look" result',!found.some(x=>/fresh|classic look/i.test(x)),found.join(' | '));
await pg.tap('#usCancel'); await pg.waitForTimeout(400);
await pg.goto(BASE+'whats-new.html'); await pg.waitForTimeout(1200);
ok("What's New has no look switch",!(await pg.$('.wn-try'))&&!(await pg.$('#wnTryFresh')));
ok("What's New uses the accent too",await accent()==='#3d5afe',await accent());
/* pins buzz once */
await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
await pg.tap('#allTools'); await pg.waitForTimeout(400); await pg.tap('dialog[open] [data-pin="offer"]'); await pg.waitForTimeout(500);
ok('pinning gives a haptic tick',(await pg.evaluate(()=>window.__buzz.length))===1);
ok('the star pops',await pg.$eval('dialog[open] [data-pin="offer"]',e=>e.classList.contains('pop')));
await pg.tap('#libDone'); await pg.waitForTimeout(300);
/* a satisfying save: the tick over the preview + the success haptic (always on) */
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900);
await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1000);
await pg.evaluate(()=>{ window.__buzz=[]; new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{ if(n.classList&&n.classList.contains('save-burst')) window.__burst=true; }))).observe(document.body,{childList:true,subtree:true}); });
await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000});   // the bar opens the Save sheet; Save in it saves
await pg.tap('#save'); await pg.waitForSelector('#doneBox',{state:'visible',timeout:15000}).catch(()=>{});
await pg.waitForTimeout(250);
ok('saving pops a big tick over the preview',await pg.evaluate(()=>!!window.__burst));
ok('the tick is visible on the preview',await pg.evaluate(()=>{ const x=document.querySelector('.save-burst'); return !x||getComputedStyle(x).display!=='none'; }));
const buzz=await pg.evaluate(()=>window.__buzz);
ok('saving gives a success haptic',buzz.some(p=>JSON.stringify(p)==='[12,70,22]'),JSON.stringify(buzz));
ok('the burst never blocks taps',await pg.evaluate(()=>{ const x=document.querySelector('.save-burst'); return !x||getComputedStyle(x).pointerEvents==='none'; }));
ok('"Saved!" tick is white (was greyed by a text rule)',await pg.$eval('#doneBox .done-ic',e=>getComputedStyle(e).color)==='rgb(255, 255, 255)');
await pg.waitForTimeout(3300);
ok('the burst cleans itself up',!(await pg.$('.save-burst')));
ok('the full-size picture still saves',dls.length>=1,String(dls.length));
await ctx.close();
/* reduced motion: still works, no tick */
const ctx2=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce',acceptDownloads:true});
await ctx2.route(/supabase\.co/,r=>r.abort()); await ctx2.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const p2=await ctx2.newPage(); p2.on('pageerror',e=>errs.push('reduced: '+e));
await p2.goto(BASE+'index.html'); await p2.waitForTimeout(600);
ok('reduced motion: the home page shows at once',await p2.$eval('.hero',e=>getComputedStyle(e).opacity)==='1');
ok('reduced motion: the accent is still on',await p2.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())==='#3d5afe');
await p2.goto(BASE+'tools/restock.html'); await p2.waitForTimeout(900);
await p2.setInputFiles('#pick',[S+'pair.jpg']); await p2.waitForTimeout(1000);
await p2.tap('#barSave'); await p2.waitForSelector('#sh-save.open',{timeout:5000}); await p2.tap('#save');
await p2.waitForSelector('#doneBox',{state:'visible',timeout:15000}).catch(()=>{}); await p2.waitForTimeout(300);
ok('reduced motion: it still saves',await p2.isVisible('#doneBox'));
ok('reduced motion: no tick shows (no .save-burst on screen)',await p2.evaluate(()=>[...document.querySelectorAll('.save-burst')].every(x=>getComputedStyle(x).display==='none')));
await ctx2.close();
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

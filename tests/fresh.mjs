/* Studio 0.6.0: the Fresh look preview (motion, depth, one bold accent, haptics, a satisfying save).
   Off by default; a per-device switch (What's New card, search, or ?look=fresh / ?look=classic).
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
/* count haptics: Android's vibrate is recorded instead of buzzing */
await ctx.addInitScript(()=>{ window.__buzz=[]; try{ Object.defineProperty(navigator,'vibrate',{configurable:true,value:p=>{ window.__buzz.push(p); return true; }}); }catch(_){} });
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
const look=()=>pg.evaluate(()=>document.documentElement.dataset.look||'');
const accent=()=>pg.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(700);
ok('off by default on the home page',await look()===''&&await accent()==='#161210',await accent());
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900);
ok('off by default on a tool page',await look()==='');
await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1000);
const dls=[]; pg.on('download',d=>dls.push(d));
await pg.tap('#barSave'); await pg.waitForSelector('#doneBox',{state:'visible',timeout:15000}).catch(()=>{});
ok('classic save: no burst, no buzz',!(await pg.$('.save-burst'))&&(await pg.evaluate(()=>window.__buzz.length))===0);
ok('"Saved!" tick is white (was greyed by a text rule)',await pg.$eval('#doneBox .done-ic',e=>getComputedStyle(e).color)==='rgb(255, 255, 255)');
/* turn it on with ?look=fresh: it sticks on this device */
await pg.goto(BASE+'index.html?look=fresh'); await pg.waitForTimeout(800);
ok('?look=fresh turns it on',await look()==='fresh'&&await accent()==='#3d5afe',await accent());
ok('smooth page changes are switched on',await pg.evaluate(()=>!!document.getElementById('vtStyle')));
ok('the main button uses the bold accent',await pg.$eval('.qbtn:first-child',e=>getComputedStyle(e).backgroundColor)==='rgb(61, 90, 254)');
const bar=await pg.$eval('.hubbar',e=>{ const r=e.getBoundingClientRect(); return {gap:innerHeight-r.bottom,left:r.left,radius:parseFloat(getComputedStyle(e).borderTopLeftRadius)}; });
ok('the tab bar floats above the page',bar.gap>=8&&bar.left>=8&&bar.radius>=16,JSON.stringify(bar));
ok('cards have soft shadows',await pg.$eval('.tool-row',e=>getComputedStyle(e).boxShadow!=='none'));
await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
ok('it is remembered on this device',await look()==='fresh'&&await pg.evaluate(()=>localStorage.getItem('studio:look'))==='"fresh"');
/* pins buzz once */
await pg.tap('#allTools'); await pg.waitForTimeout(400); await pg.tap('dialog[open] [data-pin="offer"]'); await pg.waitForTimeout(500);
ok('pinning gives a haptic tick',(await pg.evaluate(()=>window.__buzz.length))===1);
ok('the star pops',await pg.$eval('dialog[open] [data-pin="offer"]',e=>e.classList.contains('pop')));
await pg.tap('#libDone'); await pg.waitForTimeout(300);
/* a satisfying save */
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900);
ok('tool pages get the fresh look too',await look()==='fresh');
await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1000);
await pg.evaluate(()=>{ window.__buzz=[]; new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{ if(n.classList&&n.classList.contains('save-burst')) window.__burst=true; }))).observe(document.body,{childList:true,subtree:true}); });
await pg.tap('#barSave'); await pg.waitForSelector('#doneBox',{state:'visible',timeout:15000}).catch(()=>{});
await pg.waitForTimeout(200);
ok('saving pops a big tick over the preview',await pg.evaluate(()=>!!window.__burst));
ok('saving gives a success haptic',JSON.stringify(await pg.evaluate(()=>window.__buzz))==='[[12,70,22]]',JSON.stringify(await pg.evaluate(()=>window.__buzz)));
ok('the burst never blocks taps',await pg.evaluate(()=>{ const x=document.querySelector('.save-burst'); return !x||getComputedStyle(x).pointerEvents==='none'; }));
await pg.waitForTimeout(1600);
ok('the burst cleans itself up',!(await pg.$('.save-burst')));
ok('the full-size picture still saves',dls.length>=2);
/* What's New: a switch on the card turns it off (and on) right away */
await pg.goto(BASE+'whats-new.html'); await pg.waitForTimeout(1200);
ok("What's New gets the fresh look",await look()==='fresh');
ok("What's New has the Try switch, on",await pg.isVisible('#wnTryFresh')&&await pg.isChecked('#wnTryFresh'));
const sw=await pg.$eval('.wn-try',e=>e.getBoundingClientRect().height); ok('the switch row is finger-sized',sw>=48,String(sw));
await pg.tap('.wn-try'); await pg.waitForTimeout(300);
ok('the switch turns it off at once',await look()===''&&await pg.evaluate(()=>localStorage.getItem('studio:look'))===null);
await pg.tap('.wn-try'); await pg.waitForTimeout(300);
ok('and back on',await look()==='fresh');
await pg.goto(BASE+'index.html?look=classic'); await pg.waitForTimeout(600);
ok('?look=classic turns it off',await look()===''&&await pg.evaluate(()=>localStorage.getItem('studio:look'))===null&&!(await pg.evaluate(()=>!!document.getElementById('vtStyle'))));
/* reduced motion: still works, no burst */
const ctx2=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
await ctx2.route(/supabase\.co/,r=>r.abort()); await ctx2.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const p2=await ctx2.newPage(); p2.on('pageerror',e=>errs.push('reduced: '+e));
await p2.goto(BASE+'index.html?look=fresh'); await p2.waitForTimeout(600);
ok('reduced motion: the home page shows at once',await p2.$eval('.hero',e=>getComputedStyle(e).opacity)==='1');
await ctx2.close();
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

/* Round 6 (nav): the top-left Back button and the phone's Back gesture return to exactly where you came from (same screen, Templates category,
   Saved collection, scroll). Phone 390x844 touch. Run: BASE=http://127.0.0.1:8084/ node tests/r6-nav.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const b=await chromium.launch(), errs=[];
/* eight seeded designs plus 28 more, so Saved scrolls far */
const db=seedDesigns(); { const base=db.designs.seed0; for(let i=0;i<28;i++){ const id='more'+i; db.designs[id]=Object.assign({},base,{id,name:'Extra '+(i+1),updated_at:new Date(Date.now()-(200+i)*3600e3).toISOString()}); } }
const init=`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(scheme='light'){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); return {ctx,pg}; }
const wait=(pg,ms=500)=>pg.waitForTimeout(ms);
const hubUrl=pg=>pg.url().replace(BASE,'');
/* a seeded design counts as changed on a tool page: the leave prompt opens, and Discard / Leave goes back through the same Back logic */
const askedLeave=async pg=>{ await wait(pg,700); const d=await pg.$('dialog[open] #lvDis, dialog[open] #lvLeave'); if(d){ await d.tap(); await pg.waitForURL(/index\.html/,{timeout:8000}).catch(()=>{}); } };
const gback=async pg=>{ const was=pg.url(); await pg.goBack({waitUntil:'commit'}).catch(()=>{}); if(/tools\//.test(was)) await askedLeave(pg); await wait(pg,1900); };
const topBack=async(pg,sel='a.back, a.cr-back, a.vd-back')=>{ await pg.tap(sel); await askedLeave(pg); await pg.waitForURL(/index\.html/,{timeout:8000}).catch(()=>{}); await wait(pg,1900); };
const y=pg=>pg.evaluate(()=>Math.round(scrollY));
const near=(a,b,t=24)=>Math.abs(a-b)<=t;
const scrollTo=async(pg,v)=>{ await pg.evaluate(v=>scrollTo(0,v),v); await wait(pg,450); };

/* ---- Templates -> a category -> open a template -> Back (button and gesture) ---- */
for(const how of ['button','gesture']){
  const {ctx,pg}=await mk(), T='templates '+how+': ';
  await pg.goto(BASE+'index.html'); await wait(pg,800);
  await pg.tap('.hubbar a[data-tab="templates"]'); await pg.waitForSelector('.tp-card'); await wait(pg,600);
  await pg.tap('.tp-chip[data-id="story"]'); await wait(pg,700);
  await scrollTo(pg,900);
  ok(T+'a category is chosen and the page is scrolled',(await y(pg))>600&&await pg.getAttribute('.tp-chip[data-id="story"]','aria-pressed')==='true');
  await pg.locator('.tp-card >> nth=12').scrollIntoViewIfNeeded(); await wait(pg,400); const y0=await y(pg);
  await pg.tap('.tp-card >> nth=12'); await pg.waitForURL(/tools\//,{timeout:8000}); await wait(pg,1200);
  ok(T+'the tool says Back',(await pg.textContent('a.back, .cr-back')).trim()==='Back'&&await pg.getAttribute('a.back, .cr-back','aria-label')==='Back');
  if(how==='button') await topBack(pg); else await gback(pg);
  ok(T+'back on Templates, not Home',/#templates$/.test(pg.url())&&await pg.isVisible('#templatesView'),pg.url());
  ok(T+'the same category is open',await pg.getAttribute('.tp-chip[data-id="story"]','aria-pressed')==='true');
  const y1=await y(pg); ok(T+'the same scroll place',near(y1,y0,40),[y0,y1]);
  /* Back from the category shows the full list at its place; Back again is Home */
  await gback(pg);
  ok(T+'Back from the category: All is open',await pg.getAttribute('.tp-chip[data-id="all"]','aria-pressed')==='true'&&/#templates$/.test(pg.url()),[pg.url()]);
  await gback(pg);
  ok(T+'Back from the list: Home',!/#/.test(pg.url())&&await pg.isVisible('#homeView'),pg.url());
  await ctx.close(); }

/* the category's own Back step, no tool involved: All -> category -> Back -> All at the same place; the top-left button does the same */
{ const {ctx,pg}=await mk(), T='templates steps: ';
  await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('.tp-card'); await wait(pg,800);
  await scrollTo(pg,700); const ya=await y(pg);
  await pg.tap('.tp-chip[data-id="post"]'); await wait(pg,700);
  ok(T+'a category opens',await pg.getAttribute('.tp-chip[data-id="post"]','aria-pressed')==='true');
  await pg.tap('.tp-back'); await wait(pg,800);
  ok(T+'the top-left Back shows All again',await pg.getAttribute('.tp-chip[data-id="all"]','aria-pressed')==='true'&&/#templates$/.test(pg.url()));
  ok(T+'at the same place',near(await y(pg),ya,40),[ya,await y(pg)]);
  await pg.tap('.tp-back'); await wait(pg,800);
  ok(T+'the top-left Back again: Home',!/#/.test(pg.url())&&await pg.isVisible('#homeView'),pg.url());
  await ctx.close(); }

/* ---- Saved -> collection -> open a design -> Back ---- */
for(const how of ['button','gesture']){
  const {ctx,pg}=await mk(), T='saved collection '+how+': ';
  await pg.goto(BASE+'index.html'); await wait(pg,900); await pg.tap('.hubbar a[data-tab="saved"]'); await pg.waitForSelector('#savedGrid .sv-card'); await wait(pg,700);
  await pg.tap('#colChips [data-f="c:Restocks"]'); await wait(pg,600);
  ok(T+'the collection is open',await pg.getAttribute('#colChips [data-f="c:Restocks"]','aria-pressed')==='true');
  await pg.tap('#savedGrid .sv-open >> nth=0'); await pg.waitForURL(/tools\/restock\.html/,{timeout:8000}); await wait(pg,1200);
  if(how==='button') await topBack(pg); else await gback(pg);
  ok(T+'back on Saved',/#saved$/.test(pg.url())&&await pg.isVisible('#saved'),pg.url());
  ok(T+'the same collection',await pg.getAttribute('#colChips [data-f="c:Restocks"]','aria-pressed')==='true');
  await gback(pg);
  ok(T+'Back from the collection: the full list',await pg.getAttribute('#colChips [data-f="all"]','aria-pressed')==='true'&&/#saved$/.test(pg.url()),pg.url());
  await gback(pg);
  ok(T+'Back from the list: Home',!/#/.test(pg.url())&&await pg.isVisible('#homeView'),pg.url());
  await ctx.close(); }

/* Saved scrolled far down -> open -> Back: same scroll; then a collection from there and the list's place after Back */
for(const how of ['button','gesture']){
  const {ctx,pg}=await mk(), T='saved scroll '+how+': ';
  await pg.goto(BASE+'index.html'); await wait(pg,900); await pg.tap('.hubbar a[data-tab="saved"]'); await pg.waitForSelector('#savedGrid .sv-card'); await wait(pg,700);
  await scrollTo(pg,1500); const y0=await y(pg); ok(T+'scrolled far down',y0>1000,y0);
  await pg.evaluate(()=>{ const c=[...document.querySelectorAll('#savedGrid .sv-open')].find(a=>{ const r=a.getBoundingClientRect(); return r.top>120&&r.bottom<innerHeight-60; }); c.scrollIntoView({block:'nearest'}); c.click(); });
  await pg.waitForURL(/tools\//,{timeout:8000}); await wait(pg,1200);
  if(how==='button') await topBack(pg); else await gback(pg);
  const y1=await y(pg); ok(T+'the same scroll place',/#saved$/.test(pg.url())&&near(y1,y0,60),[y0,y1,pg.url()]);
  /* a reload keeps the place too */
  await pg.reload(); await wait(pg,2000); const y2=await y(pg); ok(T+'a reload keeps it',near(y2,y0,60),[y0,y2]);
  /* from the far place, open a collection, then Back: the full list at the far place */
  await scrollTo(pg,0); await pg.tap('#colChips [data-f="c:Offers"]'); await wait(pg,500); await gback(pg);
  ok(T+'collection then Back: list again',await pg.getAttribute('#colChips [data-f="all"]','aria-pressed')==='true');
  await ctx.close(); }

/* ---- Home scrolled -> a page -> Back ---- */
{ const {ctx,pg}=await mk(), T='home: ';
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000}); await wait(pg,900);
  await scrollTo(pg,300); const y0=await y(pg);
  await pg.evaluate(()=>{ const a=[...document.querySelectorAll('#homeView a[href*="tools/"]')].find(a=>{ const r=a.getBoundingClientRect(); return r.top>60&&r.bottom<innerHeight-40; }); a.click(); });
  await pg.waitForURL(/tools\//,{timeout:8000}); await wait(pg,1000); await topBack(pg);
  ok(T+'Back lands on Home at the same place',!/#/.test(pg.url())&&near(await y(pg),y0,40),[y0,await y(pg),pg.url()]);
  /* Home at the top stays at the top */
  await scrollTo(pg,0);
  await pg.evaluate(()=>{ const a=[...document.querySelectorAll('#homeView a[href*="tools/"]')].find(a=>{ const r=a.getBoundingClientRect(); return r.top>60&&r.bottom<innerHeight-40; }); a.click(); });
  await pg.waitForURL(/tools\//,{timeout:8000}); await wait(pg,1000); await gback(pg);
  ok(T+'Home -> tool -> Back gesture: top',near(await y(pg),0,10)&&!/#/.test(pg.url()),[await y(pg),pg.url()]);
  await ctx.close(); }

/* ---- Search -> a result -> Back ---- */
{ const {ctx,pg}=await mk(), T='search: ';
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000}); await wait(pg,700);
  await pg.tap('#us-input, .us-input, #hubSearch input, input[type=search]'); await wait(pg,500);
  await pg.keyboard.type('Restock'); await wait(pg,700);
  const row=await pg.$('.us-row[href*="tools/"], a.us-row'); 
  if(row){ await row.tap(); await pg.waitForURL(/tools\//,{timeout:8000}); await wait(pg,1000); await topBack(pg);
    ok(T+'Back lands on Home with the search closed',!/#/.test(pg.url())&&!await pg.evaluate(()=>document.body.classList.contains('us-open'))&&await pg.isVisible('#homeView'),pg.url()); }
  else ok(T+'a result to open exists',false);
  await ctx.close(); }

/* ---- Plan: Ideas tab -> a page -> Back ---- */
{ const {ctx,pg}=await mk(), T='plan: ';
  await pg.goto(BASE+'index.html#ideas'); await wait(pg,1500);
  await pg.evaluate(()=>{ location.href='tools/restock.html'; }); await pg.waitForURL(/tools\//,{timeout:8000}); await wait(pg,1000); await topBack(pg);
  ok(T+'Back lands on the Ideas tab',/#ideas$/.test(pg.url())&&await pg.evaluate(()=>!document.getElementById('planView').hidden),pg.url());
  await ctx.close(); }

/* ---- What's New from Settings -> Back ---- */
{ const {ctx,pg}=await mk(), T='whats new: ';
  await pg.goto(BASE+'index.html'); await wait(pg,1000);
  await pg.tap('#setBtn'); await wait(pg,500); await pg.tap('.set-row[data-set="new"]'); await pg.waitForURL(/whats-new\.html/,{timeout:8000}); await wait(pg,1200);
  await pg.tap('.back'); await pg.waitForURL(/index\.html/,{timeout:8000}); await wait(pg,1200);
  ok(T+'Back lands on the hub, no sheet left open',!/#/.test(pg.url())&&await pg.evaluate(()=>document.querySelectorAll('dialog[open]').length)===0,pg.url());
  await pg.goBack({waitUntil:'commit'}).catch(()=>{}); await wait(pg,900);
  ok(T+'and the history has no leftover sheet entry: the next Back leaves Studio',!/index\.html/.test(pg.url())||/about:blank/.test(pg.url()),pg.url());
  await ctx.close(); }

/* ---- an open sheet, then a link: Back from the page lands on the hub itself (All tools) ---- */
{ const {ctx,pg}=await mk(), T='sheet link: ';
  await pg.goto(BASE+'index.html'); await wait(pg,1200); const n0=await pg.evaluate(()=>history.length);
  const btn=await pg.$('#allTools, [data-act="all-tools"], .all-tools'); 
  if(btn){ await btn.tap(); await wait(pg,500); const l=await pg.$('dialog[open] a[href*="tools/"]'); if(l){ await l.tap(); await pg.waitForURL(/tools\//,{timeout:8000}); await wait(pg,1000); await gback(pg);
    ok(T+'Back lands on Home, no sheet',!/#/.test(pg.url())&&await pg.evaluate(()=>document.querySelectorAll('dialog[open]').length)===0,pg.url()); } }
  await ctx.close(); }

/* ---- a deep link opened fresh: the Back button goes to the hub (never a closed tab) ---- */
{ const {ctx,pg}=await mk(), T='deep link: ';
  await pg.goto(BASE+'tools/restock.html'); await wait(pg,1200);
  ok(T+'the link says Back',(await pg.textContent('a.back')).trim()==='Back');
  await pg.tap('a.back'); await pg.waitForURL(/index\.html/,{timeout:8000}).catch(()=>{}); await wait(pg,800);
  ok(T+'Back goes to the hub',/index\.html/.test(pg.url())&&await pg.isVisible('#homeView'),pg.url());
  await ctx.close(); }

/* ---- no unload listener (it would block the browser's back/forward cache) ---- */
for(const f of ['assets/studio.js','assets/back.js','assets/templates.js','tools/create.js','tools/video.js']){
  const t=fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'); ok('no unload listener in '+f,!/addEventListener\(\s*['"]unload['"]/.test(t)&&!/onunload\s*=/.test(t)); }

console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')); if(errs.length) console.log('PAGE ERRORS: '+[...new Set(errs)].slice(0,5).join(' | '));
console.log(fails.length?fails.length+' FAILED of '+res.length:'ALL '+res.length+' PASSED'); await b.close(); process.exit(fails.length?1:0);

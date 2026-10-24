/* Studio 0.1.0 checks: Quick start on the hub (photo first, the tool opens with it in, as a new draft),
   the What's New page (cards from studio-notes/changelog.md, error state) and its badge on the hub.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:2,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const real=()=>pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length);
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(800);
  ok(vp.name+': Quick start shows Restock first',await pg.isVisible('#quickSec')&&(await pg.textContent('.qbtn:first-child b'))==='Restock');
  const tb=await pg.$$eval('.qbtn',l=>l.map(x=>x.getBoundingClientRect()).every(r=>r.height>=48&&r.width>=48&&r.right<=innerWidth+1));
  ok(vp.name+': Quick start buttons are finger-sized and fit the screen',tb);
  ok(vp.name+': What\'s New dot shows for a new version',await pg.evaluate(()=>document.getElementById('wnBtn').classList.contains('has-new')));
  await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]); await pg.waitForTimeout(2500);
  ok(vp.name+': Restock opens with the photo in',await real()===1);
  ok(vp.name+': it is a new draft, no old-draft banner',!!(await pg.evaluate(()=>Studio.debug.draftId()))&&!(await pg.isVisible('#draftBar')));
  await pg.reload(); await pg.waitForTimeout(2000);
  ok(vp.name+': reload keeps the photo (draft saved)',await real()===1);
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
  await Promise.all([pg.waitForURL(/collage\.html/),pg.setInputFiles('input[data-quick="collage"]',[S+'pair.jpg',S+'hand.jpg',S+'shelf.jpg'])]); await pg.waitForTimeout(3000);
  ok(vp.name+': Collage takes 3 photos and sets 3 boxes',await real()===3&&await pg.evaluate(()=>Studio.debug.S.count)===3);
  await pg.goto(BASE+'tools/restock.html?quick=1'); await pg.waitForTimeout(1500);
  ok(vp.name+': ?quick=1 with nothing waiting is harmless',await real()===0&&!/quick/.test(pg.url()));
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(600);
  ok(vp.name+': both quick drafts are in Continue editing',await pg.locator('.ccard').count()===2);
  await pg.click('#wnBtn'); await pg.waitForURL(/whats-new/); await pg.waitForTimeout(1200);
  const n=await pg.locator('.wn-card').count(); ok(vp.name+': What\'s New shows the cards',n>=3,n+' cards');
  ok(vp.name+': screenshots load',await pg.$$eval('.wn-card img',l=>l.length>0&&l.every(i=>i.complete&&i.naturalWidth>0)));
  await pg.locator('.wn-shot').first().click(); await pg.waitForTimeout(300);
  ok(vp.name+': a screenshot opens large',await pg.evaluate(()=>document.getElementById('wnDlg').open));
  await pg.keyboard.press('Escape');
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
  ok(vp.name+': dot is gone after reading',!(await pg.evaluate(()=>document.getElementById('wnBtn').classList.contains('has-new'))));
  await pg.route(/changelog\.md/,r=>r.abort()); await pg.goto(BASE+'whats-new.html'); await pg.waitForTimeout(800);
  ok(vp.name+': offline changelog shows a friendly error with Retry',await pg.isVisible('.wn-err button'));
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(f?f+' failed':'all pass'); process.exit(f?1:0);

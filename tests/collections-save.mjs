/* Saving a story into a collection (2.2.1): a typed name counts without tapping Add, a collection link that did not go in
   is tried again, leaving the page mid-save waits for the team save, and the Saved page's Collections sheet keeps a typed name.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
const fdb=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{}}'));
const byName=async n=>Object.values((await fdb()).designs).find(d=>d.name===n);
const teamDone=()=>pg.waitForFunction(()=>/Saved to the team|not added/.test(document.getElementById('teamStatus').textContent+' '+document.getElementById('status').textContent),null,{timeout:30000}).catch(()=>{});
async function start(name){
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(800);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000});
  await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}); await pg.fill('#teamName',name);
  await pg.waitForSelector('#teamCols [data-newcol]');
}
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());

/* 1. a new collection typed but Add never tapped */
await start('Typed only');
ok('the picker shows "New collection" and a hint line',/New collection/.test(await pg.textContent('#teamCols [data-newcol]'))&&await pg.isVisible('#teamColsHint'));
await pg.tap('#teamCols [data-newcol]'); await pg.fill('#teamNewCol','Collabs');
ok('typing says the collection will be made on save',/“Collabs” will be made/.test(await pg.textContent('#teamColsHint')));
await pg.tap('#save'); await teamDone();
let d=await byName('Typed only');
ok('the story is saved in the typed collection',d&&(d.cols||[]).includes('Collabs'),d&&d.cols);
ok('the team line names the collection',/in “Collabs”/.test(await pg.textContent('#teamStatus')),await pg.textContent('#teamStatus'));

/* 2. the collection link did not go in (cut off): it is tried again */
await start('Retry link');
await pg.evaluate(()=>{ const C=window.StudioCloud, sd=C.saveDesign; C.saveDesign=o=>sd({...o,collections:[]}); });
await pg.tap('#teamCols .chip[data-col="Collabs"]').catch(()=>{});
if(await pg.getAttribute('#teamCols .chip[data-col="Collabs"]','aria-pressed')!=='true') await pg.tap('#teamCols .chip[data-col="Collabs"]');
ok('a picked chip has a tick',!!(await pg.$('#teamCols .chip[data-col="Collabs"][aria-pressed="true"] svg')));
await pg.tap('#save'); await teamDone();
d=await byName('Retry link');
ok('a link that did not go in is added on the second try',d&&(d.cols||[]).includes('Collabs'),d&&d.cols);

/* 3. the link keeps failing: a clear message, and the next Save updates the same design (no copy) */
await start('Link fails');
await pg.evaluate(()=>{ const C=window.StudioCloud, sd=C.saveDesign; C.saveDesign=o=>sd({...o,collections:[]}); C._sdc=C.setDesignCollections; C.setDesignCollections=async()=>{ throw new Error('offline'); }; });
if(await pg.getAttribute('#teamCols .chip[data-col="Collabs"]','aria-pressed')!=='true') await pg.tap('#teamCols .chip[data-col="Collabs"]');
await pg.tap('#save'); await teamDone();
ok('it says the story is saved but not in the collection',/not added to “Collabs”/.test(await pg.textContent('#status')),await pg.textContent('#status'));
const n1=Object.keys((await fdb()).designs).length;
await pg.evaluate(()=>{ const C=window.StudioCloud; C.setDesignCollections=C._sdc; });
ok('the team switch stays on to try again',await pg.isChecked('#teamOn'));
await pg.tap('#save'); await teamDone(); await pg.waitForTimeout(400);
d=await byName('Link fails');
ok('Save again updates the same design and puts it in the collection',Object.keys((await fdb()).designs).length===n1&&d&&(d.cols||[]).includes('Collabs'),d&&d.cols);

/* 4. leaving while the team save is running waits for it */
await start('Leave early');
await pg.evaluate(()=>{ const C=window.StudioCloud, sd=C.saveDesign; C.saveDesign=async o=>{ await new Promise(r=>setTimeout(r,2500)); return sd(o); }; });
if(await pg.getAttribute('#teamCols .chip[data-col="Collabs"]','aria-pressed')!=='true') await pg.tap('#teamCols .chip[data-col="Collabs"]');
await pg.tap('#save');
await pg.waitForFunction(()=>/Saving to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:20000});
await pg.evaluate(()=>document.querySelector('nav.top a[href]').click()); await pg.waitForTimeout(300);
ok('a link tapped mid-save does not leave yet',/tools\/restock/.test(pg.url())&&/Still saving/.test(await pg.textContent('#toast')),pg.url());
await pg.waitForURL(u=>!/tools\/restock/.test(String(u)),{timeout:15000}).catch(()=>{});
ok('...and goes once the save is done',!/tools\/restock/.test(pg.url()),pg.url());
d=await byName('Leave early');
ok('the story that left early is in its collection',d&&(d.cols||[]).includes('Collabs'),d&&d.cols);

/* 5. Saved page: Collections sheet keeps a typed name without Add */
await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:8000}); await pg.waitForTimeout(400);
const card=pg.locator('#savedGrid .sv-card',{hasText:'Typed only'}).first();
await card.click({button:'right'}); await pg.waitForTimeout(400);
await pg.locator('[data-act="cols"], button:has-text("Collections")').first().tap(); await pg.waitForTimeout(300);
await pg.fill('#nc','Offers'); await pg.tap('#colsGo'); await pg.waitForTimeout(800);
d=await byName('Typed only');
ok('Saved → Collections keeps a typed name without Add',d&&(d.cols||[]).includes('Offers')&&(d.cols||[]).includes('Collabs'),d&&d.cols);

ok('no page errors',!errs.length,errs.join(' | '));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(f?f+' FAILED':'ALL PASS ('+res.length+')'); process.exit(f?1:0);

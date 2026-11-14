/* Studio 1.48.0: drafts, photo queue and shared photos: bug fixes + one fewer trip.
   Checks, phone 390×844 touch, light and dark:
   - a shared photo whose pick-a-tool sheet is closed without a choice waits on Home ("Your photo is in") straight away
   - the tool's "unfinished story" banner Continue opens the story it counted, not a newer blank one (edit, undo, leave)
   - Home coming back from the Back button (pageshow persisted) or another tab reads Continue editing and the waiting rows again
   - Quick start in Restock with photos still waiting from before: they join the row after the new photo
     ("Photo 1 of 3 is in", "And 2 photos from before"), Next photo brings them in, Home's row and tag stay right
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
const QK='studio:queue:1stchoice:restock';
for(const theme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:theme,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(theme+': '+e));
  const N=theme+': ';
  const dls=[]; pg.on('download',d=>dls.push(d));
  const home=async q=>{ await pg.goto(BASE+'index.html'+(q||'')); await pg.waitForTimeout(700); };
  const quick=async(files)=>{ await home();
    await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',files.map(f=>S+f))]);
    await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(400); };
  const ready=()=>pg.evaluate(()=>{ const r=document.getElementById('readyBar'); return r.hidden?'':document.getElementById('readyTxt').textContent+' | '+document.getElementById('readySub').textContent; });
  /* which photo is in: the file it came from (the sample photos are all the same size; drafts and the queue keep the file) */
  const photoSize=()=>pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; return p&&p.img&&!p.sample?(p.file&&p.file.name||'?'):'sample'; });
  const sizeOf=async f=>f;
  const kept=()=>pg.evaluate(k=>new Promise(res=>{ const r=indexedDB.open('studio',1); r.onsuccess=()=>{ const t=r.result.transaction('files'),s=t.objectStore('files'); const a=s.get(k), p=s.get(k+':pos'); t.oncomplete=()=>res({n:a.result&&a.result.files?a.result.files.length:0,total:a.result&&a.result.total||0,pos:p.result||null}); }; r.onerror=()=>res(null); }),QK);
  const waitKept=async(fn,ms=4000)=>{ let k; for(let t=0;t<ms;t+=200){ k=await kept(); if(fn(k)) return k; await pg.waitForTimeout(200); } return k; };
  const idbPut=(k,v)=>pg.evaluate(([k,v])=>new Promise(res=>{ const r=indexedDB.open('studio',1); r.onupgradeneeded=()=>r.result.createObjectStore('files'); r.onsuccess=()=>{ const t=r.result.transaction('files','readwrite'); t.objectStore('files').put(v,k); t.oncomplete=()=>res(true); }; }),[k,v]);
  const reset=async()=>{ await home(); await pg.evaluate(()=>new Promise(r=>{ localStorage.clear(); const q=indexedDB.deleteDatabase('studio'); q.onsuccess=q.onerror=q.onblocked=()=>r(); })); };

  /* 1. shared photo: close the sheet without a choice -> the row waits on Home at once */
  await reset(); await home();
  await pg.evaluate(async()=>{ const blob=await (await fetch('brands/1stchoice/samples/beans.jpg')).blob();
    await new Promise(res=>{ const r=indexedDB.open('studio',1); r.onupgradeneeded=()=>r.result.createObjectStore('files'); r.onsuccess=()=>{ const t=r.result.transaction('files','readwrite'); t.objectStore('files').put({files:[new File([blob],'IMG_1.jpg',{type:'image/jpeg'})],at:Date.now()},'studio:shared'); t.oncomplete=()=>res(); }; }); });
  await home('?shared=1'); await pg.waitForSelector('dialog[open] #shareH',{timeout:5000}).catch(()=>{});
  ok(N+'share: the pick-a-tool sheet opens',await pg.isVisible('dialog[open] #shareH'));
  ok(N+'share: no "Your photo is in" row behind the sheet',!(await pg.isVisible('#sharedBar')));
  await pg.tap('dialog[open] .fab-x'); await pg.waitForTimeout(700);
  ok(N+'share: closed without a choice, the photo waits on Home at once',await pg.isVisible('#sharedBar')&&(await pg.textContent('#sharedTxt'))==='Your photo is in');
  if(!(await pg.isVisible('#sharedBar'))) await home();   // the old code: the row only after a reload
  await pg.tap('#sharedGo'); await pg.waitForSelector('dialog[open] #shareH',{timeout:5000}).catch(()=>{});
  ok(N+'share: Pick opens the sheet again, the row hides',await pg.isVisible('dialog[open] #shareH')&&!(await pg.isVisible('#sharedBar')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(700);
  ok(N+'share: closed again, the row is back once (no copies)',(await pg.$$eval('#sharedBar:not([hidden])',l=>l.length))===1);
  if(!(await pg.isVisible('#sharedBar'))) await home();
  await pg.tap('#sharedGo'); await pg.waitForSelector('dialog[open] [data-share="restock"]').catch(()=>{});
  await Promise.all([pg.waitForURL(/restock\.html/),pg.tap('dialog[open] [data-share="restock"]')]);
  await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{});
  ok(N+'share: a choice still opens the tool with the photo',(await photoSize())!=='sample');

  /* 2. draft banner: Continue opens the counted story, not a newer blank one */
  await reset();
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1200);
  await pg.setInputFiles('#pick',S+'shelf.jpg'); await pg.waitForTimeout(1500);
  const shelf=await photoSize();
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1200);
  ok(N+'draft: a fresh visit offers the unfinished story',await pg.isVisible('#draftBar'));
  /* a second, newer story that is the tool as it opens (what an edit, undone, then left leaves behind) */
  await pg.evaluate(()=>{ const k='studio:draft:1stchoice:restock:blank1'; localStorage.setItem(k,JSON.stringify({json:JSON.stringify(Studio.debug.recipe()),keys:[null],at:Date.now()+1000,pfx:k})); });
  const nDrafts=await pg.evaluate(()=>Object.keys(localStorage).filter(k=>/^studio:draft:1stchoice:restock:[^:]+$/.test(k)).length);
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1200);
  ok(N+'draft: setup has a newer blank draft beside the real one',nDrafts===2,String(nDrafts));
  ok(N+'draft: the banner counts one story',await pg.isVisible('#draftBar')&&(await pg.textContent('#draftTxt'))==='Unfinished story here',await pg.textContent('#draftTxt'));
  await pg.tap('#draftGo'); await pg.waitForTimeout(1500);
  ok(N+'draft: Continue opens the story with the photo',(await photoSize())===shelf,await photoSize()+' vs '+shelf);

  /* 3. Home read again on Back (pageshow persisted) */
  await reset(); await home();
  ok(N+'home: nothing to continue at first',await pg.$eval('#continueSec',e=>e.hidden));
  /* another tab writes a story and a row of waiting photos */
  const d0=await pg.evaluate(()=>{ const k='studio:draft:1stchoice:restock:zz1'; localStorage.setItem(k,JSON.stringify({json:'{}',keys:[],at:Date.now(),pfx:k})); return k; });
  await pg.evaluate(async()=>{ const blob=await (await fetch('brands/1stchoice/samples/shelf.jpg')).blob(); const f=[new File([blob],'a.jpg',{type:'image/jpeg'}),new File([blob],'b.jpg',{type:'image/jpeg'})];
    await new Promise(res=>{ const r=indexedDB.open('studio',1); r.onsuccess=()=>{ const t=r.result.transaction('files','readwrite'); t.objectStore('files').put({files:f,total:3,at:Date.now()},'studio:queue:1stchoice:restock'); t.objectStore('files').put({pos:1,saved:false,draft:null,at:Date.now()},'studio:queue:1stchoice:restock:pos'); t.oncomplete=()=>res(); }; }); });
  await pg.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))); await pg.waitForTimeout(800);
  ok(N+'home: back from a tool, the new story is in Continue editing',!(await pg.$eval('#continueSec',e=>e.hidden))&&(await pg.$$('#continueList .ccard')).length===1);
  ok(N+'home: and "2 photos still waiting" with the tag on Restock',(await pg.$$eval('.queue-wait b',l=>l.map(e=>e.textContent))).join()==='2 photos still waiting'&&(await pg.$$eval('.tool-item[data-id="restock"] .wait-tag',l=>l.map(e=>e.textContent))).join()==='2 waiting');
  /* the row is finished elsewhere, the story removed */
  await pg.evaluate(k=>{ localStorage.removeItem(k); return new Promise(res=>{ const r=indexedDB.open('studio',1); r.onsuccess=()=>{ const t=r.result.transaction('files','readwrite'); t.objectStore('files').delete('studio:queue:1stchoice:restock'); t.objectStore('files').delete('studio:queue:1stchoice:restock:pos'); t.oncomplete=()=>res(); }; }); },d0);
  await pg.evaluate(()=>{ dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})); dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})); }); await pg.waitForTimeout(800);
  ok(N+'home: read again, both are gone (row, tag and section)',(await pg.$$('.queue-wait')).length===0&&(await pg.$$('.wait-tag')).length===0&&await pg.$eval('#continueSec',e=>e.hidden));
  ok(N+'home: the Restock row opens the tool plainly again',(await pg.$eval('.tool-item[data-id="restock"] a.tool-row',a=>a.getAttribute('href')).catch(()=>'?')).endsWith('restock.html'));

  /* 4. Quick start with photos still waiting from before: they join the row */
  await reset();
  await quick(['pair.jpg','shelf.jpg','hands.jpg']); await waitKept(k=>k.n===2&&k.pos&&k.pos.draft);
  await quick(['beans.jpg']);
  const beans=await sizeOf('beans.jpg'), shelfS=await sizeOf('shelf.jpg'), hands=await sizeOf('hands.jpg');
  ok(N+'carry: the new photo is in first',(await photoSize())===beans,await photoSize());
  ok(N+'carry: "Photo 1 of 3 is in | And 2 photos from before"',await ready()==='Photo 1 of 3 is in | And 2 photos from before',await ready());
  ok(N+'carry: Skip on the note',await pg.isVisible('#readySkip'));
  const note=await pg.evaluate(()=>{ const r=document.getElementById('readyBar').getBoundingClientRect(), s=document.getElementById('readySub'); return s.scrollWidth<=s.clientWidth+1&&r.right<=innerWidth; });
  ok(N+'carry: the note line fits',note);
  let k=await waitKept(k=>k.n===2&&k.pos&&k.pos.pos===1);
  ok(N+'carry: kept on the phone as 2 waiting, photo 1 of 3',k.n===2&&k.total===3&&k.pos&&k.pos.pos===1,JSON.stringify({n:k.n,t:k.total,p:k.pos&&k.pos.pos}));
  await home();
  ok(N+'carry: Home says "2 photos still waiting" (not 4)',(await pg.$$eval('.queue-wait b',l=>l.map(e=>e.textContent))).join()==='2 photos still waiting');
  await pg.tap('.queue-wait a.qw-go'); await pg.waitForURL(/restock\.html/); await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(400);
  ok(N+'carry: the row opens back on the new photo, unsaved',(await photoSize())===beans&&/^Photo 1 of 3 is in/.test(await ready()),await photoSize()+' '+await ready());
  await pg.tap('#readySkip'); await pg.waitForTimeout(1500);
  ok(N+'carry: Skip brings in the first photo from before (shelf)',(await photoSize())===shelfS&&/^Photo 2 of 3 is in/.test(await ready()),await photoSize()+' '+await ready());
  await pg.tap('#readySkip'); await pg.waitForTimeout(1500);
  ok(N+'carry: then the last one (hands)',(await photoSize())===hands&&/^Last photo: 3 of 3/.test(await ready()),await ready());
  k=await waitKept(k=>k.n===0&&!k.pos);
  ok(N+'carry: all in, nothing kept any more',k.n===0&&!k.pos);

  /* one photo with nothing waiting: as before */
  await reset(); await quick(['pair.jpg']);
  ok(N+'one photo, nothing waiting: the usual note, no Skip',/^Your photo is in/.test(await ready())&&!(await pg.isVisible('#readySkip')),await ready());
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
res.forEach(l=>console.log(l)); const f=res.filter(l=>l.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

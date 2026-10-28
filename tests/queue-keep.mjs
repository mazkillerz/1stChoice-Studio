/* Studio 1.8.0: several photos in a row keep waiting. The photos still waiting (Restock, Photo story) are kept on the phone
   (IndexedDB studio:queue:<brand>:<tool> + ':pos'), so a reload after the share sheet or leaving the tool never drops them.
   Checks, phone 390×844 touch, light and dark:
   - the ready note has a quiet Skip (not filled, ≥44px, readable) when a photo is waiting; one photo has none
   - Skip brings in the next photo without saving; a reload on that story comes back to it, note and all
   - after saving, a reload (?design=) offers "1 photo still waiting"; Continue brings in the last photo and clears the store
   - Home shows "N photos still waiting" as a row; a tap opens the tool on the next photo; ✕ clears them
   - a fresh visit to the tool offers them (Clear / Continue) instead of the draft banner; Continue goes back to the unsaved story
   - Restock from a photo is still 2 taps; never more than two filled buttons
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
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
  const home=async()=>{ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(700); };
  const quick=async(files)=>{ await home();
    await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',files.map(f=>S+f))]);
    await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(300); };
  const ready=()=>pg.evaluate(()=>{ const r=document.getElementById('readyBar'); return r.hidden?'':document.getElementById('readyTxt').textContent; });
  const photoKey=()=>pg.evaluate(()=>Studio.debug.S.photos[0].key);
  const photoSize=()=>pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; return p&&p.img?p.img.width+'x'+p.img.height:''; });
  const kept=()=>pg.evaluate(k=>new Promise(res=>{ const r=indexedDB.open('studio',1); r.onsuccess=()=>{ const t=r.result.transaction('files'),s=t.objectStore('files'); const a=s.get(k), p=s.get(k+':pos'); t.oncomplete=()=>res({n:a.result&&a.result.files?a.result.files.length:0,total:a.result&&a.result.total||0,pos:p.result||null}); }; r.onerror=()=>res(null); }),QK);
  const waitKept=async(fn,ms=4000)=>{ let k; for(let t=0;t<ms;t+=200){ k=await kept(); if(fn(k)) return k; await pg.waitForTimeout(200); } return k; };
  const save=async()=>{ const n=dls.length; await pg.tap('#barSave'); for(let i=0;i<40&&dls.length===n;i++) await pg.waitForTimeout(300);
    let size=''; if(dls.length>n){ const f=os.tmpdir()+'/qk-'+dls[n].suggestedFilename(); await dls[n].saveAs(f); size=pngSize(f); }
    await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
    return {got:dls.length-n,size}; };
  /* filled accent buttons that show: background equals the accent */
  const filled=()=>pg.evaluate(()=>{ const acc=getComputedStyle(document.querySelector('.mini.solid,.btn')||document.body).getPropertyValue('--accent').trim();
    const c=document.createElement('canvas').getContext('2d'); const norm=v=>{ c.fillStyle='#000'; c.fillStyle=v; return c.fillStyle; }; const A=norm(acc);
    return [...document.querySelectorAll('button,a')].filter(e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height||r.bottom<0||r.top>innerHeight) return false; if(e.closest('[hidden]')) return false;
      const bg=getComputedStyle(e).backgroundColor; return bg&&norm(bg)===A&&!e.classList.contains('fab'); }).map(e=>e.id||e.className||e.textContent.trim()); });

  await home(); await pg.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('studio'); }); await home();

  /* one photo: no Skip, nothing kept */
  await quick(['pair.jpg']);
  ok(N+'one photo: no Skip on the note, nothing kept waiting',!(await pg.isVisible('#readySkip'))&&(await kept()).n===0);

  /* three photos: Skip on the note */
  await quick(['pair.jpg','shelf.jpg','hands.jpg']);
  ok(N+'three photos: "Photo 1 of 3 is in" with Skip on the note',await ready()==='Photo 1 of 3 is in'&&await pg.isVisible('#readySkip'),await ready());
  const sk=await pg.evaluate(()=>{ const b=document.getElementById('readySkip'), r=b.getBoundingClientRect(), n=document.getElementById('readyBar').getBoundingClientRect(), v=document.getElementById('view').getBoundingClientRect(), cs=getComputedStyle(b);
    const c=document.createElement('canvas').getContext('2d'); const rgb=v=>{ c.fillStyle='#000'; c.fillStyle=v; c.fillRect(0,0,1,1); return [...c.getImageData(0,0,1,1).data]; };
    const raised=rgb(getComputedStyle(document.body).getPropertyValue('--raised').trim()); c.clearRect(0,0,1,1);
    c.fillStyle=`rgb(${raised.slice(0,3)})`; c.fillRect(0,0,1,1); c.fillStyle=getComputedStyle(document.getElementById('readyBar')).backgroundColor; c.fillRect(0,0,1,1); const bg=[...c.getImageData(0,0,1,1).data];
    const fg=rgb(cs.color); const L=a=>{ const f=x=>{ x/=255; return x<=.03928?x/12.92:((x+.055)/1.055)**2.4; }; return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2]); };
    const l1=L(fg), l2=L(bg), cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    return {h:Math.round(r.height),w:Math.round(r.width),inside:r.right<=n.right+1&&r.left>=n.left-1,bg:cs.backgroundColor,cr:+cr.toFixed(2),share:+(n.height/v.height).toFixed(3),txt:b.textContent.trim()}; });
  ok(N+'Skip is a quiet word: not filled, finger-sized, inside the note',sk.txt==='Skip'&&/rgba\(0, 0, 0, 0\)|transparent/.test(sk.bg)&&sk.h>=44&&sk.w>=44&&sk.inside,JSON.stringify(sk));
  ok(N+'Skip is readable (contrast ≥ 4.5)',sk.cr>=4.5,sk.cr);
  ok(N+'the note still covers ≤ 15% of the preview',sk.share<=0.15,sk.share);
  const f1=await filled(); ok(N+'no more than two filled buttons with the note up',f1.length<=2,f1.join(', '));
  let k=await waitKept(k=>k.n===2&&k.pos&&k.pos.pos===1);
  ok(N+'the 2 waiting photos are kept on the phone',k.n===2&&k.total===3&&k.pos&&k.pos.pos===1,JSON.stringify(k));
  const k1=await photoKey();
  await pg.tap('#readySkip'); await pg.waitForTimeout(1000);
  ok(N+'Skip: photo 2 comes in without saving',await ready()==='Photo 2 of 3 is in'&&(await photoKey())!==k1&&dls.length===0,await ready());
  ok(N+'the last-but-one note still has Skip',await pg.isVisible('#readySkip'));
  k=await waitKept(k=>k.pos&&k.pos.pos===2&&k.pos.draft);
  ok(N+'the place in the row is kept (2 of 3, with its draft)',k.pos&&k.pos.pos===2&&!!k.pos.draft,JSON.stringify(k.pos));
  await pg.waitForTimeout(1200);   // the draft writes its photo
  const k2=await photoKey(), sz2=await photoSize();

  /* reload mid-queue, before saving: back on photo 2 */
  await pg.reload(); await pg.waitForSelector('#readyBar:not([hidden])',{timeout:8000}).catch(()=>{});
  ok(N+'reload before saving: back on photo 2, the note says so, no banner',await ready()==='Photo 2 of 3 is in'&&(await photoSize())===sz2&&!(await pg.isVisible('#queueBar')),await ready());
  let r=await save();
  ok(N+'Save after the reload: one tap, full size',r.got===1&&r.size==='2160x3840',JSON.stringify(r));
  await pg.waitForFunction(()=>!document.getElementById('queueNext').hidden,null,{timeout:6000}).catch(()=>{});
  ok(N+'then "Next photo (3 of 3)" as before',(await pg.textContent('#queueNext')).trim()==='Next photo (3 of 3)');
  k=await waitKept(k=>k.pos&&k.pos.saved&&k.pos.design);
  ok(N+'saved, with its team design, is remembered',k.pos&&k.pos.saved===true&&!!k.pos.design,JSON.stringify(k.pos));

  /* reload after the share sheet (the page is on ?design=): offer the last one */
  await pg.reload(); await pg.waitForTimeout(2000);
  ok(N+'reload after saving: "1 photo still waiting" on the tool page',await pg.isVisible('#queueBar')&&(await pg.textContent('#queueTxt'))==='1 photo still waiting'&&!(await pg.isVisible('#draftBar')));
  const f2=await filled(); ok(N+'the banner adds no filled button',f2.length<=2,f2.join(', '));

  /* leave to Home: the row is there; a tap opens the last photo */
  await home();
  const row=await pg.$$eval('.queue-wait',l=>l.map(e=>{ const r=e.getBoundingClientRect(), a=e.querySelector('a').getBoundingClientRect(), x=e.querySelector('button').getBoundingClientRect(); return {txt:e.querySelector('b').textContent,sub:e.querySelector('.install-txt span').textContent,h:Math.round(a.height),xw:Math.round(x.width),xh:Math.round(x.height),one:e.querySelector('b').getBoundingClientRect().height<30,wide:document.documentElement.scrollWidth<=innerWidth}; }));
  ok(N+'Home: a row "1 photo still waiting", Restock, on one line, finger-sized',row.length===1&&row[0].txt==='1 photo still waiting'&&/Restock/.test(row[0].sub)&&row[0].h>=44&&row[0].xw>=44&&row[0].xh>=44&&row[0].one&&row[0].wide,JSON.stringify(row));
  await Promise.all([pg.waitForURL(/restock\.html/),pg.tap('.queue-wait a')]);
  await pg.waitForSelector('#readyBar:not([hidden])',{timeout:8000}).catch(()=>{});
  ok(N+'a tap on the row: "Last photo: 3 of 3" is in, as a new story',await ready()==='Last photo: 3 of 3'&&!/design=|queue=/.test(pg.url()),await ready()+' '+pg.url());
  ok(N+'the last photo has no Skip',!(await pg.isVisible('#readySkip')));
  k=await waitKept(k=>k.n===0&&!k.pos);
  ok(N+'all in: nothing kept any more',k.n===0&&!k.pos,JSON.stringify(k));
  r=await save(); ok(N+'the last one saves in one tap',r.got===1&&r.size==='2160x3840');
  await home(); ok(N+'Home: the row is gone',(await pg.$$('.queue-wait')).length===0);

  /* Clear from Home */
  await quick(['pair.jpg','shelf.jpg','hands.jpg']); await waitKept(k=>k.n===2);
  await home();
  ok(N+'Home: "2 photos still waiting"',(await pg.$$eval('.queue-wait b',l=>l.map(e=>e.textContent))).join()==='2 photos still waiting');
  await pg.tap('.queue-wait button'); await pg.waitForTimeout(500);
  k=await waitKept(k=>k.n===0&&!k.pos);
  ok(N+'✕ clears them (row gone, nothing kept, a note says so)',(await pg.$$('.queue-wait')).length===0&&k.n===0&&!k.pos&&/Cleared/.test(await pg.evaluate(()=>{ const t=document.getElementById('hubToast'); return t?t.textContent:''; })));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500);
  ok(N+'the tool then offers nothing',!(await pg.isVisible('#queueBar')));

  /* a fresh visit: Continue goes back to the unsaved story, Clear clears */
  await quick(['pair.jpg','shelf.jpg','hands.jpg']); await pg.waitForTimeout(1300); const kA=await photoKey(), szA=await photoSize(); await waitKept(k=>k.pos&&k.pos.draft);
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500);
  ok(N+'fresh visit: "2 photos still waiting" instead of the draft banner',await pg.isVisible('#queueBar')&&(await pg.textContent('#queueTxt'))==='2 photos still waiting'&&!(await pg.isVisible('#draftBar')));
  const bb=await pg.$eval('#queueBar',e=>[...e.querySelectorAll('button')].map(b=>{ const r=b.getBoundingClientRect(); return Math.round(Math.min(r.width,r.height)); }));
  ok(N+'Clear and Continue are finger-sized',bb.every(v=>v>=44),bb.join());
  await pg.tap('#queueGo'); await pg.waitForSelector('#readyBar:not([hidden])',{timeout:8000}).catch(()=>{});
  ok(N+'Continue: back on the unsaved photo 1, "Photo 1 of 3 is in"',await ready()==='Photo 1 of 3 is in'&&(await photoSize())===szA&&!(await pg.isVisible('#queueBar')),await ready());
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500);
  await pg.tap('#queueClear'); await pg.waitForTimeout(400);
  k=await waitKept(k=>k.n===0&&!k.pos);
  ok(N+'Clear on the tool page: banner gone, nothing kept, no Next photo',!(await pg.isVisible('#queueBar'))&&k.n===0&&!k.pos&&await pg.$eval('#queueNext',e=>e.hidden));
  await home(); ok(N+'and Home has no row',(await pg.$$('.queue-wait')).length===0);

  /* tap budget: Restock from a photo is still 2 taps (pick + Save) */
  const before=dls.length; await quick(['pair.jpg']); r=await save();
  ok(N+'Restock from a photo: still 2 taps to a saved picture',r.got===1&&dls.length===before+1&&r.size==='2160x3840');
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
res.forEach(l=>console.log(l)); const f=res.filter(l=>l.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

/* Studio 0.3.0 checks: after Quick start, "Looks good · Save" saves the full-size PNG in one tap;
   Change words opens Words; tapping a bar tab hides the bar; a normal visit never shows it.
   Since 0.7.0 it also saves to the team when signed in. Also: the text-place pad cells are thumb-sized on a phone. Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:2,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  const quick=async()=>{ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
    await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]); await pg.waitForTimeout(2500); };
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  await quick();
  ok(vp.name+': ready bar shows after Quick start',await pg.isVisible('#readyBar'));
  const r=await pg.$eval('#readySave',e=>{ const b=e.getBoundingClientRect(); return {h:b.height,fits:b.right<=innerWidth+1&&b.bottom<=innerHeight}; });
  ok(vp.name+': Looks good · Save is finger-sized and on screen',r.h>=44&&r.fits,JSON.stringify(r));
  const dls=[]; pg.on('download',d=>dls.push(d));
  await tap('#readySave');
  for(let i=0;i<40&&!dls.length;i++) await pg.waitForTimeout(300);
  let size=''; if(dls[0]){ const f=os.tmpdir()+'/qs-'+dls[0].suggestedFilename(); await dls[0].saveAs(f); size=pngSize(f); }
  ok(vp.name+': one tap saves the full-size PNG',dls.length===1&&size==='2160x3840',size);
  await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
  ok(vp.name+': the same tap also saves it to the team (signed in)',/design=/.test(pg.url())&&/Saved to the team/.test(await pg.textContent('#teamStatus')||''),pg.url());
  ok(vp.name+': the bar is gone after saving',!(await pg.isVisible('#readyBar')));
  await quick();
  await tap('#readyEdit'); await pg.waitForTimeout(500);
  ok(vp.name+': Change words opens Words',await pg.evaluate(()=>document.getElementById('sh-words').classList.contains('open')||getComputedStyle(document.getElementById('sh-words')).display!=='none')&&!(await pg.isVisible('#readyBar')));
  await quick();
  if(vp.touch){ await tap('#bar [data-open="style"]'); await pg.waitForTimeout(400); ok(vp.name+': another tab hides the bar',!(await pg.isVisible('#readyBar'))); }
  else { await pg.evaluate(()=>{ const i=document.querySelector('#sh-words input,#sh-words textarea'); i.dispatchEvent(new Event('input',{bubbles:true})); }); ok(vp.name+': editing hides the bar',!(await pg.isVisible('#readyBar'))); }
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500);
  ok(vp.name+': a normal visit has no ready bar',!(await pg.isVisible('#readyBar')));
  if(vp.touch){ await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForTimeout(1500);
    await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
    await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500);
    const w=await pg.$$eval('.place-pick .pp',l=>l.map(x=>x.getBoundingClientRect()).filter(b=>b.width).map(b=>Math.min(b.width,b.height)));
    ok('phone: text-place cells are at least 44px',w.length===9&&w.every(x=>x>=44),w.map(Math.round).join(','));
  }
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

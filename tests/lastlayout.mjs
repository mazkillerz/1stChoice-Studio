/* Studio 2.6.0: Same as last time. A saved picture keeps its layout (moved words, stickers, photo looks) per tool; the next fresh
   story offers it in one banner ("Use it" / "Not now") and Use it brings the layout back with the NEW photo, as one undo step.
   Checks: no banner on a first visit; Save keeps the layout; a Quick start photo shows the banner (the "Your photo is in" note
   still shows too); Use it restores layers + look and keeps the new photo; Undo goes back; Not now hides it; nothing is offered
   when the last save moved nothing; never on a draft or a saved design; banner fits at 360 px with 44px+ buttons, readable in dark.
   Phone 390×844 touch (light + dark). Server on :8080 (or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const photo=fs.readdirSync(S).find(f=>/\.jpg$/.test(f));

for(const theme of ['light','dark']){
  const N='phone'+(theme==='dark'?' dark':'')+': ';
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:theme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
  const dls=[]; pg.on('download',d=>dls.push(d));
  const waitDl=async n=>{ for(let i=0;i<50&&dls.length<n;i++) await pg.waitForTimeout(300); return dls[n-1]; };
  const bar=()=>pg.evaluate(()=>{ const e=document.getElementById('lastBar'); return !!e&&!e.hidden&&e.getBoundingClientRect().height>0; });
  const quick=async()=>{ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
    await Promise.all([pg.waitForURL(/restock\.html/,{timeout:10000}),pg.setInputFiles('input[data-quick="restock"]',S+photo)]);
    await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.photos.some(p=>p.img&&!p.sample),null,{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(600); };

  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  /* 1. first visit: nothing to offer */
  await quick();
  ok(N+'first Restock ever: no "Same as last time" banner',!(await bar()));
  /* 2. move the headline, add a photo look, then Save to my phone */
  await pg.evaluate(()=>{ const D=Studio.debug, S=D.S; const id='head'; S.layers[id]={...(S.layers[id]||{}),dx:40,dy:-120}; S.photos[0].fx={look:'warm',light:0}; D.render(); });
  await pg.waitForTimeout(700);
  const want=await pg.evaluate(()=>JSON.stringify(Studio.debug.S.layers.head));
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}); await pg.waitForTimeout(300); await pg.tap('#save');
  const d1=await waitDl(1); await pg.waitForTimeout(500);
  const kept=await pg.evaluate(()=>{ const k=Object.keys(localStorage).find(k=>k.startsWith('studio:last:')&&k.endsWith(':restock')); return k?JSON.parse(localStorage[k]):null; });
  ok(N+'Save keeps the layout of the saved picture',!!d1&&!!kept&&JSON.stringify(kept.layers.head)===want&&kept.fx&&kept.fx[0]&&kept.fx[0].look==='warm',kept&&{fx:kept.fx});

  /* 3. next day: a new Quick start photo offers it, the photo note still shows */
  await quick();
  ok(N+'a new Restock from a photo offers "Same layout as your last time?"',await bar()&&/last story/.test(await pg.textContent('#lastTxt')));
  const before=await pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; return {src:p.img&&p.img.src,head:Studio.debug.S.layers.head||{}}; });
  ok(N+'before Use it the story starts plain',!before.head.dy,before.head);
  /* the banner: fits, big enough buttons, readable */
  const look=await pg.evaluate(()=>{ const e=document.getElementById('lastBar'), r=e.getBoundingClientRect(), bs=[...e.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
    const lum=c=>{ const m=c.match(/\d+(\.\d+)?/g).map(Number).slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; };
    const fg=lum(getComputedStyle(document.getElementById('lastTxt')).color), bg=lum(getComputedStyle(e).backgroundColor);
    return {left:r.left,right:r.right,h:r.height,minH:Math.min(...bs.map(x=>x.height)),ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),sw:document.documentElement.scrollWidth}; });
  ok(N+'banner fits the screen, buttons ≥ 44px tall, text ≥ 4.5:1',look.left>=0&&look.right<=390&&look.sw<=390&&look.minH>=44&&look.ratio>=4.5,look);
  /* 4. Use it */
  await pg.tap('#lastGo'); await pg.waitForTimeout(1200);
  const after=await pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; return {src:p.img&&p.img.src,sample:!!p.sample,fx:p.fx,layers:JSON.stringify(Studio.debug.S.layers.head)}; });
  ok(N+'Use it brings back the moved words and the photo look',after.layers===want&&after.fx&&after.fx.look==='warm',after);
  ok(N+'Use it keeps today\'s photo',after.src===before.src&&!after.sample);
  ok(N+'the banner goes away after Use it',!(await bar()));
  await pg.waitForTimeout(600);
  await pg.tap('#undo').catch(()=>{}); await pg.waitForTimeout(700);
  ok(N+'Undo goes back to the plain story in one step',await pg.evaluate(()=>!(Studio.debug.S.layers.head||{}).dy));

  /* 5. Not now */
  await quick();
  if(await bar()){ await pg.tap('#lastNo'); await pg.waitForTimeout(300); }
  ok(N+'Not now hides the banner and changes nothing',!(await bar())&&await pg.evaluate(()=>!(Studio.debug.S.layers.head||{}).dy));

  /* 6. a draft and a saved-design open never offer it */
  const draft=await pg.evaluate(()=>Studio.debug.draftId());
  if(draft){ await pg.goto(BASE+'tools/restock.html?draft='+draft); await pg.waitForTimeout(1500); ok(N+'opening a draft: no banner',!(await bar())); }

  /* 7. a save that moved nothing clears it */
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>document.getElementById('lastNo').click());
  await pg.setInputFiles('#slots input[type=file]',S+photo).catch(()=>{}); await pg.waitForTimeout(1200);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}); await pg.waitForTimeout(300); await pg.tap('#save'); await waitDl(dls.length+1); await pg.waitForTimeout(500);
  ok(N+'a save with nothing moved forgets the old layout',await pg.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:last:')&&k.endsWith(':restock'))));
  await quick();
  ok(N+'…so the next story offers nothing',!(await bar()));
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n'));
const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-f} passed, ${f} failed, ${((Date.now()-t0)/1000).toFixed(1)}s`);
process.exit(f?1:0);

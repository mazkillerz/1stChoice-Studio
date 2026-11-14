/* Studio 2.7.0: (1) Same layout as last time in paged tools (Highlight covers, Carousel): Save keeps page 1's layout and the
   settings shared by every page; a fresh set offers it; Use it puts that layout on EVERY page while each page keeps its own
   words and icons, as one undo step. (2) The unfinished-story and waiting-photos offers are one slim line like 2.6.0's pill:
   ≤ 60px tall, inside the screen at 360 and 390 px, buttons ≥ 44px, readable in light and dark; × on the draft line is
   Start fresh (the draft stays). Phone touch, light + dark. Server on :8080 (or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SD=new URL('../brands/1stchoice/samples/',import.meta.url).pathname, photos=fs.readdirSync(SD).filter(f=>/\.jpg$/.test(f)).slice(0,2).map(f=>SD+f);
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

for(const theme of ['light','dark']){
  const N='phone'+(theme==='dark'?' dark':'')+': ';
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:theme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ try{ navigator.canShare=()=>false; }catch(_){} });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
  const shown=id=>pg.evaluate(id=>{ const e=document.getElementById(id); return !!e&&!e.hidden&&e.getBoundingClientRect().height>0; },id);
  const open=async()=>{ await pg.goto(BASE+'tools/highlight.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:10000}); await pg.waitForTimeout(900); };
  const lastKey=()=>pg.evaluate(()=>{ const k=Object.keys(localStorage).find(k=>k.startsWith('studio:last:')&&k.endsWith(':highlight')); return k?JSON.parse(localStorage[k]):null; });

  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  /* 1. first set ever: nothing offered */
  await open();
  ok(N+'first Highlight set: no "Same layout" line',!(await shown('lastBar')));
  /* 2. shrink + move the icon on cover 1, Ring behind it (shared by every cover), then Save */
  await pg.evaluate(()=>{ const D=Studio.debug, S=D.S; S.P[0].layers.icon={dx:0,dy:-60,k:.8,color:null,hidden:false}; S.P.forEach(p=>{ p.values.shape='ring'; }); D.render(); });
  await pg.waitForTimeout(800);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}); await pg.waitForTimeout(300); await pg.tap('#save');
  let kept=null; for(let i=0;i<40&&!kept;i++){ await pg.waitForTimeout(250); kept=await lastKey(); }
  ok(N+'Save keeps cover 1\'s layout and the shared Ring',!!kept&&kept.layers.icon&&kept.layers.icon.dy===-60&&kept.values.shape==='ring',kept&&{layers:kept.layers,values:kept.values});
  ok(N+'…but not one cover\'s own icon or word',!!kept&&!('icon' in kept.values)&&!('word' in kept.values),kept&&Object.keys(kept.values));

  /* 3. a fresh set from photos (Quick start on Home) offers it */
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.setItem('studio:pins',JSON.stringify(['restock','highlight']))); await pg.reload(); await pg.waitForTimeout(900);
  await Promise.all([pg.waitForURL(/highlight\.html/,{timeout:10000}),pg.setInputFiles('input[data-quick="highlight"]',photos)]);
  await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.photos.some(p=>p.img&&!p.sample),null,{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(900);
  ok(N+'a new Highlight set offers "Same layout as last time?"',await shown('lastBar'));
  const before=await pg.evaluate(()=>Studio.debug.S.P.map(p=>p.values.icon));
  await pg.tap('#lastGo'); await pg.waitForTimeout(1200);
  const after=await pg.evaluate(()=>Studio.debug.S.P.map(p=>({icon:p.values.icon,shape:p.values.shape,dy:(p.layers.icon||{}).dy,k:(p.layers.icon||{}).k})));
  ok(N+'Use it puts the layout on every cover',after.length>1&&after.every(p=>p.dy===-60&&p.k===.8&&p.shape==='ring'),after);
  ok(N+'…and each cover keeps its own icon',JSON.stringify(after.map(p=>p.icon))===JSON.stringify(before),{before,after:after.map(p=>p.icon)});
  ok(N+'the line goes away after Use it',!(await shown('lastBar')));
  await pg.waitForTimeout(600); await pg.tap('#undo').catch(()=>{}); await pg.waitForTimeout(700);
  ok(N+'Undo takes it off every cover in one step',await pg.evaluate(()=>Studio.debug.S.P.every(p=>!(p.layers.icon||{}).dy)));

  /* 4. the unfinished-story line: slim, inside the screen, big enough, readable; × = Start fresh keeps the draft */
  await pg.evaluate(()=>{ const D=Studio.debug; D.S.P[0].values.word={text:'جديد',on:true}; D.render(); }); await pg.waitForTimeout(1500);
  for(const w of [390,360]){
    await pg.setViewportSize({width:w,height:844}); await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(400);
    await pg.goto(BASE+'tools/highlight.html'); await pg.waitForTimeout(1800);
    const look=await pg.evaluate(()=>{ const lum=c=>{ const m=c.match(/\d+(\.\d+)?/g).map(Number).slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; }; const e=document.getElementById('draftBar'); if(!e||e.hidden) return null; const r=e.getBoundingClientRect(), bs=[...e.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
      const t=document.getElementById('draftTxt'), fg=lum(getComputedStyle(t).color), bg=lum(getComputedStyle(e).backgroundColor);
      return {left:r.left,right:r.right,h:r.height,minH:Math.min(...bs.map(x=>x.height)),minW:Math.min(...bs.map(x=>x.width)),ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),sw:document.documentElement.scrollWidth,clip:t.scrollWidth>t.clientWidth+1,txt:t.textContent}; });
    ok(N+w+'px: the unfinished-story offer is one slim line (≤ 60px), inside the screen, buttons ≥ 44px, text ≥ 4.5:1, not cut off',!!look&&look.h<=60&&look.left>=0&&look.right<=w&&look.sw<=w&&look.minH>=44&&look.minW>=44&&look.ratio>=4.5&&!look.clip,look);
  }
  await pg.setViewportSize({width:390,height:844});
  const n0=await pg.evaluate(()=>Object.keys(localStorage).filter(k=>/draft/.test(k)).length);
  await pg.tap('#draftFresh'); await pg.waitForTimeout(400);
  ok(N+'× (Start fresh) hides the line and keeps the draft',!(await shown('draftBar'))&&await pg.evaluate(()=>Object.keys(localStorage).filter(k=>/draft/.test(k)).length)>=n0);
  ok(N+'× is labelled for a screen reader',await pg.getAttribute('#draftFresh','aria-label')==='Start fresh'&&await pg.getAttribute('#queueClear','aria-label')==='Clear the waiting photos');
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n'));
const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-f} passed, ${f} failed, ${((Date.now()-t0)/1000).toFixed(1)}s`);
process.exit(f?1:0);

/* Studio 0.6.0: pinned home screen. The home page shows only the tools pinned on this device (a new device: Restock);
   All tools lists every tool with a star to pin or unpin it; pins are kept per device and follow into Quick start.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
for(const vp of [{name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true,touch:true},{name:'desktop',viewport:{width:1280,height:800}}]){
  const ctx=await b.newContext({viewport:vp.viewport,deviceScaleFactor:1,isMobile:!!vp.isMobile,hasTouch:!!vp.hasTouch,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  const home=async()=>(await pg.$$eval('#toolGrid a.tool-row',as=>as.map(a=>a.getAttribute('href').replace(/^.*tools\/|\.html$/g,'')))).join(',');
  /* since 0.7.0 a pinned photo-first tool has a camera button on its row (no separate Start-from-a-photo block) */
  const cams=async()=>(await pg.$$eval('#toolGrid .tool-item.has-cam .row-cam input[data-quick]',l=>l.map(x=>x.dataset.quick))).join(',');
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(900);
  ok(vp.name+': a new device has only Restock pinned',await home()==='restock',await home());
  ok(vp.name+': a camera button only on the pinned photo-first tool',await cams()==='restock'&&!(await pg.$('#quickSec')),await cams());
  const at=await pg.$eval('#allTools',e=>{ const r=e.getBoundingClientRect(); return {h:r.height,top:r.top}; });
  ok(vp.name+': All tools button is finger-sized',at.h>=48,JSON.stringify(at));
  await tap('#allTools'); await pg.waitForTimeout(450);
  ok(vp.name+': All tools opens with every tool',await pg.$$eval('dialog[open] .lib-row',r=>r.length)===11);
  const stars=await pg.$$eval('dialog[open] .pin-btn',l=>l.map(x=>{ const r=x.getBoundingClientRect(); return Math.min(r.width,r.height); }));
  ok(vp.name+': every star is at least 44px',stars.every(x=>x>=44),stars.join(','));
  ok(vp.name+': Restock\'s star is on',await pg.getAttribute('dialog[open] [data-pin="restock"]','aria-pressed')==='true');
  await tap('dialog[open] [data-pin="collage"]'); await pg.waitForTimeout(250);
  ok(vp.name+': tapping a star pins the tool',await pg.getAttribute('dialog[open] [data-pin="collage"]','aria-pressed')==='true'&&/^Unpin Collage/.test(await pg.getAttribute('dialog[open] [data-pin="collage"]','aria-label')));
  ok(vp.name+': the home list updates behind the sheet',await home()==='restock,collage',await home());
  await tap('dialog[open] [data-pin="restock"]'); await pg.waitForTimeout(250);
  await tap('#libDone'); await pg.waitForTimeout(400);
  ok(vp.name+': unpinning removes the tool from home',await home()==='collage',await home());
  ok(vp.name+': the camera buttons follow the pins',await cams()==='collage',await cams());
  await pg.reload(); await pg.waitForTimeout(800);
  ok(vp.name+': pins are kept after a reload',await home()==='collage'&&JSON.stringify(await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:pins'))))==='["collage"]');
  /* nothing pinned: a friendly note, Quick start hidden */
  await tap('#allTools'); await pg.waitForTimeout(400); await tap('dialog[open] [data-pin="collage"]'); await pg.waitForTimeout(200); await tap('#libDone'); await pg.waitForTimeout(400);
  ok(vp.name+': nothing pinned shows a note and no camera buttons, the + button stays',await pg.isVisible('.pin-empty')&&await cams()===''&&await pg.isVisible('#fab'));
  /* a phone that used Studio before pins came keeps its Start-from-a-photo tools */
  await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:toolsView','"list"'); }); await pg.reload(); await pg.waitForTimeout(800);
  ok(vp.name+': an existing device keeps Restock, Photo story and Collage',await home()==='restock,photo-story,collage'&&await cams()==='restock,photo-story,collage',await home()+' / '+await cams());
  /* a tool opens from All tools */
  await tap('#allTools'); await pg.waitForTimeout(400);
  await Promise.all([pg.waitForURL(/offer\.html/),tap('dialog[open] .lib-row a[href$="tools/offer.html"]')]);
  ok(vp.name+': a tool opens from All tools',/offer\.html/.test(pg.url()));
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

/* Studio 1.2.0: pins keep the order you set (All tools › Order on your home), and the Studio dragon mark + app icons.
   Run like tests/full.mjs (server on :8080, or BASE=...). SHOTS=<dir> also saves phone shots in light and dark. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(scheme+': '+e));
  const home=async()=>(await pg.$$eval('#toolGrid a.tool-row',as=>as.map(a=>a.getAttribute('href').replace(/^.*tools\/|\.html$/g,'')))).join(',');
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(900);
  /* the mark */
  const mk=await pg.$eval('.top img.studio-mark',i=>({w:i.naturalWidth,h:i.getBoundingClientRect().height,vis:i.getBoundingClientRect().width>0}));
  ok(scheme+': the dragon mark loads in the top bar',mk.w>0&&mk.vis&&mk.h>=22,JSON.stringify(mk));
  const man=await (await pg.request.get(BASE+'manifest.webmanifest')).json();
  ok(scheme+': the manifest has a separate maskable icon',man.icons.some(i=>i.purpose==='maskable'&&/maskable/.test(i.src)));
  /* one pin: no order section */
  await pg.tap('#allTools'); await pg.waitForTimeout(450);
  ok(scheme+': one pin shows no order list',!(await pg.$$('dialog[open] .pin-ord')).length);
  await pg.tap('dialog[open] [data-pin="carousel"]'); await pg.waitForTimeout(200);
  await pg.tap('dialog[open] [data-pin="photo-story"]'); await pg.waitForTimeout(200);
  ok(scheme+': a new pin goes last (not in the tools order)',await home()==='restock,carousel,photo-story',await home());
  const rows=await pg.$$eval('dialog[open] .pin-ord b',l=>l.map(x=>x.textContent));
  ok(scheme+': the order list shows the pins in order',rows.join('|')==='Restock|Carousel|Photo story',rows.join('|'));
  ok(scheme+': the first row has no up arrow',await pg.$eval('dialog[open] .pin-ord [data-up="restock"]',b=>getComputedStyle(b).visibility==='hidden'));
  const sz=await pg.$$eval('dialog[open] .pin-ord .pin-btn:not([disabled])',l=>l.map(b=>Math.min(b.getBoundingClientRect().width,b.getBoundingClientRect().height)));
  ok(scheme+': up arrows are at least 44px',sz.length===2&&sz.every(x=>x>=44),sz.join(','));
  if(process.env.SHOTS) await pg.screenshot({path:`${process.env.SHOTS}/order-${scheme}.jpg`,quality:72});
  await pg.tap('dialog[open] [data-up="photo-story"]'); await pg.waitForTimeout(200);
  ok(scheme+': moving up swaps it with the one above',await home()==='restock,photo-story,carousel',await home());
  await pg.tap('dialog[open] [data-up="photo-story"]'); await pg.waitForTimeout(200);
  ok(scheme+': it can move to the top',await home()==='photo-story,restock,carousel',await home());
  ok(scheme+': the camera buttons follow the order',(await pg.$$eval('#toolGrid .row-cam input',l=>l.map(x=>x.dataset.quick))).join(',')==='photo-story,restock,carousel');
  await pg.tap('#libDone'); await pg.waitForTimeout(400); await pg.reload(); await pg.waitForTimeout(800);
  ok(scheme+': the order is kept after a reload',await home()==='photo-story,restock,carousel',await home());
  if(process.env.SHOTS) await pg.screenshot({path:`${process.env.SHOTS}/home-${scheme}.jpg`,quality:72,clip:{x:0,y:0,width:390,height:420}});
  /* unpinning and re-pinning puts it last */
  await pg.tap('#allTools'); await pg.waitForTimeout(450);
  await pg.tap('dialog[open] [data-pin="restock"]'); await pg.waitForTimeout(150); await pg.tap('dialog[open] [data-pin="restock"]'); await pg.waitForTimeout(150);
  ok(scheme+': a re-pinned tool goes last',await home()==='photo-story,carousel,restock',await home());
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

/* Studio: the pinned order is set by dragging in All tools (a grip at the end of each pinned row; ArrowUp / ArrowDown on the grip too).
   Phone 390x844 touch, light + dark. Touch drag uses CDP touch events. Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:"try{ if(!sessionStorage.getItem('po-seeded')){ sessionStorage.setItem('po-seeded','1'); localStorage.setItem('studio:pins',JSON.stringify(['restock','photo-story','collage'])); localStorage.setItem('studio:welcome','1'); } }catch(e){}"});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(scheme+': '+e));
  const cdp=await ctx.newCDPSession(pg);
  const home=async()=>(await pg.$$eval('#toolGrid a.tool-row',as=>as.map(a=>a.getAttribute('href').replace(/^.*tools\/|\.html$/g,'')))).join(',');
  const stored=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:pins')||'[]').join(','));
  const pinned=async()=>(await pg.$$eval('dialog[open] .lib-pins .lib-row',l=>l.map(r=>r.dataset.id))).join(',');
  const inGroup=id=>pg.evaluate(i=>{ const r=document.querySelector('dialog[open] .lib-row[data-id="'+i+'"]'); return !!r&&!r.closest('.lib-pins'); },id);
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1000);
  ok(scheme+': home starts in the pin order',await home()==='restock,photo-story,collage',await home());
  await pg.tap('#allTools'); await pg.waitForSelector('dialog[open] .lib-pins .lib-row',{timeout:5000}); await pg.waitForTimeout(500);
  ok(scheme+': the pinned section comes first, in pin order',await pinned()==='restock,photo-story,collage'&&await pg.$eval('dialog[open] .lib-list',l=>l.firstElementChild.id==='libPinH'),await pinned());
  ok(scheme+': the old order list and up arrows are gone',!(await pg.$('.pin-ord'))&&!(await pg.$('[data-up]'))&&!(await pg.$('.pin-order')));
  const ids=await pg.$$eval('dialog[open] .lib-row',l=>l.map(r=>r.dataset.id));
  ok(scheme+': each tool appears exactly once',ids.length>=8&&new Set(ids).size===ids.length,ids.length+' rows, '+new Set(ids).size+' unique');
  const hs=await pg.$$eval('dialog[open] .lib-row.pinned',l=>l.map(r=>{ const h=r.querySelector('.drag-h').getBoundingClientRect(), rr=r.getBoundingClientRect(), star=r.querySelector('.pin-btn').getBoundingClientRect(); return {w:h.width,h:h.height,end:rr.right-h.right,afterStar:h.left>=star.right-6,ta:getComputedStyle(r.querySelector('.drag-h')).touchAction}; }));
  ok(scheme+': drag handles are at least 44x44, at the row\'s end, touch-action none',hs.length===3&&hs.every(h=>h.w>=44&&h.h>=44&&h.end<=24&&h.afterStar&&h.ta==='none'),JSON.stringify(hs));
  const xs=await pg.$$eval('dialog[open] .lib-row .tthumb',l=>l.map(t=>Math.round(t.getBoundingClientRect().left*10)/10));
  ok(scheme+': thumbnails of pinned and unpinned rows share one left edge',xs.length>=8&&Math.max(...xs)-Math.min(...xs)<=1,Math.min(...xs)+'..'+Math.max(...xs));
  if(process.env.SHOTS) await pg.screenshot({path:`${process.env.SHOTS}/order-${scheme}.jpg`,quality:72});
  /* touch drag: Restock two places down */
  const r=await (await pg.$('[data-drag="restock"]')).boundingBox();
  const step=await pg.evaluate(()=>{ const t=[...document.querySelectorAll('.lib-pins .lib-row')].map(x=>x.getBoundingClientRect().top); return t[1]-t[0]; });
  const x=r.x+r.width/2, y=r.y+r.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=10;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+step*2*i/10}]}); await pg.waitForTimeout(25); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(500);
  ok(scheme+': a touch drag moves Restock from 1st to 3rd (sheet + storage)',await pinned()==='photo-story,collage,restock'&&await stored()==='photo-story,collage,restock',await pinned()+' / '+await stored());
  ok(scheme+': the home tool list follows the new order',await home()==='photo-story,collage,restock',await home());
  /* keyboard */
  await pg.focus('[data-drag="restock"]'); await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(250);
  ok(scheme+': ArrowUp on the handle moves it up one place',await stored()==='photo-story,restock,collage'&&await pinned()==='photo-story,restock,collage',await stored());
  ok(scheme+': focus stays on that handle',await pg.evaluate(()=>document.activeElement&&document.activeElement.dataset.drag)==='restock');
  /* pin / unpin */
  await pg.tap('dialog[open] [data-pin="carousel"]'); await pg.waitForTimeout(300);
  ok(scheme+': pinning adds the tool at the end of the pinned section and out of its group',await pinned()==='photo-story,restock,collage,carousel'&&await stored()==='photo-story,restock,collage,carousel'&&(await pg.$$('dialog[open] .lib-row[data-id="carousel"]')).length===1,await pinned());
  await pg.tap('dialog[open] [data-pin="carousel"]'); await pg.waitForTimeout(300);
  ok(scheme+': unpinning returns it to its group',await pinned()==='photo-story,restock,collage'&&await inGroup('carousel')&&(await pg.$$('dialog[open] .lib-row[data-id="carousel"]')).length===1,await pinned());
  /* bottom clearance */
  const last=await pg.evaluate(()=>{ const d=document.querySelector('dialog[open]'); const body=d.querySelector('.lib-list')||d; const sc=[d,...d.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+4&&/auto|scroll/.test(getComputedStyle(e).overflowY)); sc.forEach(e=>{ e.scrollTop=1e6; });
    const rows=[...d.querySelectorAll('.lib-row')], rr=rows[rows.length-1].getBoundingClientRect(); return {gap:d.getBoundingClientRect().bottom-rr.bottom}; });
  ok(scheme+': the last row is at least 32px clear of the dialog\'s bottom edge',last.gap>=32,Math.round(last.gap));
  await pg.tap('#libDone'); await pg.waitForTimeout(400);
  await pg.reload(); await pg.waitForTimeout(800);
  ok(scheme+': the order is kept after a reload',await home()==='photo-story,restock,collage',await home());
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

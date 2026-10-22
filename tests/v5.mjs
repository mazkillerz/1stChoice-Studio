/* Studio v5 phase 1 checks: drafts are a list (Start fresh never deletes), old single drafts move into the list,
   removing a draft asks first, every Element can be added to any tool, palette colours, shapes, text options, Collage grids.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/supabase\.co/,r=>r.abort());
await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
const wait=ms=>pg.waitForTimeout(ms);
const photo=()=>pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; return p.img&&!p.sample?p.key+':'+p.img.width+'x'+p.img.height:null; });

/* ---- 1.1 drafts ---- */
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await wait(300);
await pg.goto(BASE+'tools/new-place.html'); await wait(1200);
await pg.setInputFiles('#pick',[S+'pair.jpg']); await wait(2200);
const idA=await pg.evaluate(()=>Studio.debug.draftId()), phA=await photo();
ok('first draft gets its own id',!!idA,idA);
await pg.goto(BASE+'tools/new-place.html'); await wait(1300);
ok('banner offers the unfinished story',await pg.isVisible('#draftBar'));
await pg.tap('#draftFresh'); await wait(200);
await pg.setInputFiles('#pick',[S+'hand.jpg']); await wait(2200);
const idB=await pg.evaluate(()=>Studio.debug.draftId()), phB=await photo();
ok('Start fresh makes a second draft',idB&&idB!==idA,idA+' / '+idB);
await pg.reload(); await wait(1500);
ok('reload continues the same draft',await pg.evaluate(()=>Studio.debug.draftId())===idB&&await photo()===phB);
await pg.goto(BASE+'index.html'); await wait(1200);
const cards=await pg.$$eval('#continueList .ccard',c=>c.length);
ok('Continue editing lists both drafts',cards===2,cards+' cards');
await pg.goto(BASE+'tools/new-place.html?draft='+idA); await wait(1800);
ok('opening draft A restores its photo',await photo()===phA,await photo()+' vs '+phA);
await pg.goto(BASE+'tools/new-place.html?draft='+idB); await wait(1800);
ok('opening draft B restores its photo',await photo()===phB,await photo()+' vs '+phB);
/* an old single-slot draft (before v5) moves into the list */
await pg.evaluate(()=>localStorage.setItem('studio:draft:1stchoice:split',JSON.stringify({json:JSON.stringify(Studio.debug.recipe()),keys:[],at:Date.now()-60000})));
await pg.goto(BASE+'index.html'); await wait(1200);
ok('old single draft is moved into the list',await pg.$$eval('#continueList .ccard',c=>c.length)===3&&await pg.evaluate(()=>!localStorage.getItem('studio:draft:1stchoice:split')));
/* ✕ asks first; Keep it keeps it */
await pg.tap('#continueList .rx'); await wait(300);
ok('✕ asks before removing',await pg.isVisible('dialog[open] #rmYes'));
await pg.tap('dialog[open] #rmNo'); await wait(300);
ok('Keep it keeps the draft',await pg.$$eval('#continueList .ccard',c=>c.length)===3);
await pg.tap('#continueList .rx'); await wait(300); await pg.tap('dialog[open] #rmYes'); await wait(400);
ok('Remove removes only that draft',await pg.$$eval('#continueList .ccard',c=>c.length)===2);

/* ---- 1.2 elements in every tool, palette, shapes, text ---- */
for(const t of ['photo-story','split','collage','carousel']){
  await pg.goto(BASE+'tools/'+t+'.html'); await wait(1300);
  const ids=await pg.evaluate(()=>{ const out=[]; document.getElementById('addComp').click(); return [...document.querySelectorAll('#compList [data-comp]')].map(b=>b.dataset.comp); });
  for(const c of ids){ await pg.evaluate(c=>{ document.getElementById('addComp').click(); document.querySelector(`#compList [data-comp="${c}"]`).click(); },c); await wait(250); }
  const drawn=await pg.evaluate(()=>{ const R=Studio.debug.reg(); return Studio.debug.S.extras.filter(x=>R.some(r=>r.id===x.id&&!r.empty)).length+'/'+Studio.debug.S.extras.length; });
  ok(t+': every element adds as a layer',ids.length>=8&&drawn.split('/')[0]===drawn.split('/')[1],ids.length+' elements, '+drawn+' drawn');
}
/* palette in the inspector: pick Passion berry for the last element, then a custom hex */
const pal=await pg.evaluate(()=>[...document.querySelectorAll('#inspColors [data-c]')].map(b=>b.title));
ok('inspector offers the brand palette in order',pal.join(',').includes('White,Ink,Grey,Panel,Cream,Brown,Blob,Gold,Passion yellow,Passion berry'),pal.join(','));
await pg.evaluate(()=>document.querySelector('#inspColors [data-c="#BE2C5C"]').click()); await wait(100);
ok('a palette colour applies',await pg.evaluate(()=>Studio.debug.S.layers[Studio.debug.S.sel].color==='#BE2C5C'));
await pg.evaluate(()=>document.querySelector('.itab[data-part="color"]').click()); await wait(100); await pg.fill('#inspColors [data-chex]','#12ab34'); await wait(100);
ok('a custom hex applies',await pg.evaluate(()=>Studio.debug.S.layers[Studio.debug.S.sel].color==='#12AB34'));
/* shapes: panel with outline, corners and opacity */
await pg.goto(BASE+'tools/new-place.html'); await wait(1200);
await pg.evaluate(()=>{ document.getElementById('addAsset').click(); document.querySelector('[data-asset="shape:panel"]').click(); }); await wait(300);
await pg.evaluate(()=>{ const q=s=>document.querySelector(s); q('#inspStroke [data-c="#161210"]').click(); const set=(id,v)=>{ const e=q(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); }; set('#inspSW','8'); set('#inspR','90'); set('#inspOp','0.5'); set('#inspH','500'); });
const sh=await pg.evaluate(()=>{ const S=Studio.debug.S, x=S.extras.find(e=>e.ref==='shape:panel'); return {color:x.color,stroke:x.stroke,sw:x.sw,r:x.r,h:x.h,op:S.layers[x.id].op}; });
ok('panel: brand panel colour, outline, corners, opacity, height',sh.color==='#F3F3F1'&&sh.stroke==='#161210'&&sh.sw===8&&sh.r===90&&sh.h===500&&sh.op===0.5,JSON.stringify(sh));
/* text: two lines, alignment, background pill */
await pg.evaluate(()=>document.getElementById('addText').click()); await wait(200);
await pg.fill('#inspText','سطر\nسطر ثاني'); await wait(100);
await pg.evaluate(()=>{ document.querySelector('.itab[data-part="font"]').click(); document.querySelector('#inspAlign [data-align="right"]').click(); const p=document.getElementById('inspPill'); p.click(); });
await wait(150);
const tx=await pg.evaluate(()=>{ const S=Studio.debug.S, id=S.sel, b=Studio.debug.reg().find(r=>r.id===id); return {align:S.layers[id].align,bg:S.layers[id].bg,h:Math.round(b.h)}; });
ok('text: two lines, align right, background pill',tx.align==='right'&&!!tx.bg&&tx.h>120,JSON.stringify(tx));

/* ---- 1.3 collage ---- */
await pg.goto(BASE+'tools/collage.html'); await wait(1300);
const counts=await pg.$$eval('[data-count]',b=>b.map(x=>+x.dataset.count));
ok('collage takes 2 to 9 photos',counts[0]===2&&counts[counts.length-1]===9,counts.join(','));
let allLay=0, bad=[];
for(const n of counts){ await pg.evaluate(n=>document.querySelector(`[data-count="${n}"]`).click(),n); await wait(100);
  const lays=await pg.$$eval(`[data-seg="lay${n}"] .seg`,b=>b.map(x=>x.dataset.v)); allLay+=lays.length;
  for(const v of lays){ await pg.evaluate(([n,v])=>document.querySelector(`[data-seg="lay${n}"] [data-v="${v}"]`).click(),[n,v]); await wait(60);
    const got=await pg.evaluate(()=>new Set(Studio.debug.reg().filter(r=>r.photo!=null).map(r=>r.photo)).size); if(got!==n) bad.push(n+':'+v+'='+got); } }
ok('every collage layout draws all its photos',!bad.length,allLay+' layouts'+(bad.length?' · '+bad.join(' '):''));
ok('no polaroid layout left',!(await pg.$$eval('[data-v="polaroid"]',b=>b.length)));
const ctl=await pg.evaluate(()=>['gap','radius','bg','margin'].map(id=>!!document.querySelector(`[data-fw="${id}"]`)));
ok('gap, corner radius, gap colour, outer margin controls',ctl.every(Boolean),ctl.join(','));
await pg.evaluate(()=>{ document.querySelector('[data-count="4"]').click(); document.querySelector('[data-seg="lay4"] [data-v="g-2x2"],[data-seg="lay4"] [data-v^="g-"]').click(); const r=document.querySelector('[data-range="gap"]'); r.value='0'; r.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('[data-toggle="margin"]').click(); });
await wait(200);
const full=await pg.evaluate(()=>{ const R=Studio.debug.reg().filter(r=>r.photo!=null); const minX=Math.min(...R.map(r=>r.x)), maxX=Math.max(...R.map(r=>r.x+r.w)), minY=Math.min(...R.map(r=>r.y)), maxY=Math.max(...R.map(r=>r.y+r.h)); return [minX,minY,maxX,maxY].map(Math.round).join(','); });
ok('gap 0 + no margin = full-bleed',full==='0,0,1080,1920',full);

/* ---- hub: no "New" labels ---- */
await pg.goto(BASE+'index.html'); await wait(900);
ok('no "New" labels on the hub',!(await pg.$$eval('#toolGrid .tag',t=>t.length)));
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
console.log(res.join('\n')); await b.close();

/* Studio 1.39.0: swipe across saved designs to tick several, like Photos; and the "/" key hint in the Studio search (#45).
   - select mode, phone: a finger that starts sideways ticks every design between the first and the one under it; back again unticks;
     starting on a ticked design unticks the run; the page never scrolls while swiping; a finger that starts up or down still scrolls
   - outside select mode, phone: press and hold a design, then drag: selecting starts with the run ticked, no menu left open
   - computer: a mouse drag in select mode ticks the run; outside select mode a drag does nothing
   - a swipe never opens a design; a plain tap after it still ticks one
   - the "/" key shows at the end of the empty search field on a computer only; hidden while focused or typing; "/" focuses the field
   Real touch comes from the Chrome DevTools protocol (Input.dispatchTouchEvent), so scrolling behaves as on a phone.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
/* 24 designs so the Saved page scrolls on a phone */
const SEED=seedDesigns();
for(let i=8;i<24;i++){ const s=SEED.designs['seed'+(i%8)]; SEED.designs['seed'+i]={...s,id:'seed'+i,name:s.name+' '+i,cols:[],updated_at:new Date(Date.now()-(200+i*10)*3600e3).toISOString()}; }
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const PHONE={name:'phone',width:390,height:844,touch:true}, DESK={name:'desktop',width:1280,height:800,touch:false};
const mk=async(vp)=>{
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:vp.touch,hasTouch:vp.touch,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(SEED)});
  return ctx; };
const state=pg=>pg.evaluate(()=>({selecting:document.body.classList.contains('selecting'),swiping:document.body.classList.contains('swiping'),
  picked:[...document.querySelectorAll('#savedGrid .sv-card.picked')].map(c=>c.dataset.id),order:[...document.querySelectorAll('#savedGrid .sv-card')].map(c=>c.dataset.id),
  title:document.getElementById('savedH').textContent,dlg:!!document.querySelector('dialog[open]'),y:Math.round(scrollY),url:location.href}));
const centre=(pg,id)=>pg.$eval(`#savedGrid .sv-card[data-id="${id}"] .sv-thumb`,e=>{ const r=e.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}; });
const same=(a,b)=>a.slice().sort().join()===b.slice().sort().join();
const open=async pg=>{ await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1300); };

/* ---------- phone: real touch ---------- */
{ const ctx=await mk(PHONE); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('phone: '+e)); const N='phone: ';
  const cdp=await ctx.newCDPSession(pg);
  const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:p.x,y:p.y,id:1}]});
  /* a finger path: down at the first point, through the rest in small steps, up at the end (hold = ms to wait before moving) */
  const swipe=async(pts,hold=0)=>{ await touch('touchStart',pts[0]); if(hold) await pg.waitForTimeout(hold);
    for(let k=1;k<pts.length;k++){ const a=pts[k-1], c=pts[k]; for(let s=1;s<=8;s++){ await touch('touchMove',{x:Math.round(a.x+(c.x-a.x)*s/8),y:Math.round(a.y+(c.y-a.y)*s/8)}); await pg.waitForTimeout(12); } }
    await touch('touchEnd'); await pg.waitForTimeout(350); };
  await open(pg);
  let s=await state(pg); const O=s.order;
  ok(N+'the Saved page shows the 24 designs',O.length===24,O.length);
  const cols=await pg.$eval('#savedGrid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length);
  await pg.tap('#selBtn'); await pg.waitForTimeout(300);
  /* sideways along the first row */
  const y0=(await state(pg)).y;
  await swipe([await centre(pg,O[0]),await centre(pg,O[cols-1])]); s=await state(pg);
  ok(N+'a sideways swipe ticks every design it crosses',same(s.picked,O.slice(0,cols)),s.picked);
  ok(N+'the title counts them',s.title===cols+' selected',s.title);
  ok(N+'the page did not scroll and no design opened',s.y===y0&&/#saved/.test(s.url)&&!/design=/.test(s.url),{y0,y:s.y,url:s.url});
  ok(N+'the swiping state ends with the finger',!s.swiping);
  /* sideways start, then down a row: the whole run between first and last is ticked (like Photos) */
  const a=O[cols], z=O[cols*2];   // first of row 2 → first of row 3
  const pa=await centre(pg,a), pz=await centre(pg,z);
  await swipe([pa,{x:pa.x+40,y:pa.y},pz]); s=await state(pg);
  ok(N+'sideways then down ticks the whole run between',same(s.picked,O.slice(0,cols*2+1)),s.picked);
  ok(N+'still no scroll',s.y===y0,s.y);
  /* back again inside one swipe unticks what it left */
  const b0=O[cols*2+1], b2=O[cols*2+2]; const pb=await centre(pg,b0);
  await swipe([pb,await centre(pg,b2),{x:pb.x+8,y:pb.y}]); s=await state(pg);
  ok(N+'going back unticks again',same(s.picked,O.slice(0,cols*2+2)),s.picked);
  /* starting on a ticked design unticks the run */
  await swipe([await centre(pg,O[0]),await centre(pg,O[cols-1])]); s=await state(pg);
  ok(N+'a swipe that starts on a ticked design unticks the run',same(s.picked,O.slice(cols,cols*2+2)),s.picked);
  /* a finger that starts up or down scrolls, and ticks nothing */
  const before=s.picked, pv=await centre(pg,O[cols*2+1]);
  await swipe([pv,{x:pv.x,y:pv.y-260}]); await pg.waitForTimeout(400); s=await state(pg);
  ok(N+'an up-down finger still scrolls the page',s.y>y0+60,{y0,y:s.y});
  ok(N+'and ticks nothing',same(s.picked,before),s.picked);
  /* a plain tap after a swipe still ticks one */
  const tapId=s.order.find(id=>!s.picked.includes(id)&&id!==O[0]);
  await pg.tap(`#savedGrid .sv-card[data-id="${tapId}"] .sv-open`); await pg.waitForTimeout(250); s=await state(pg);
  ok(N+'a tap after a swipe still ticks one design',s.picked.includes(tapId)&&s.picked.length===before.length+1,s.picked);
  /* swipe near the bottom edge: the page scrolls slowly so the run can go on */
  await pg.tap('#selBtn'); await pg.tap('#selBtn'); await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(250);   // clear all
  const sb=await pg.$eval('#selBar',e=>e.getBoundingClientRect().top);
  const first=await centre(pg,O[0]);
  await touch('touchStart',first); for(let s2=1;s2<=6;s2++){ await touch('touchMove',{x:first.x+s2*10,y:first.y}); await pg.waitForTimeout(12); }
  await touch('touchMove',{x:first.x+60,y:Math.round(sb-6)}); await pg.waitForTimeout(700); const mid=await state(pg);
  await touch('touchEnd'); await pg.waitForTimeout(300); s=await state(pg);
  ok(N+'holding near the bottom edge scrolls slowly and keeps ticking',mid.y>40&&s.picked.length>cols*2&&s.picked.includes(O[0]),{y:mid.y,n:s.picked.length});
  await pg.tap('#savedBack'); await pg.waitForTimeout(400);
  s=await state(pg); ok(N+'✕ stops selecting',!s.selecting&&!s.picked.length,s.selecting);

  /* outside select mode: press and hold, then drag */
  await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(300); const y1=(await state(pg)).y;
  await swipe([await centre(pg,O[1]),await centre(pg,O[cols+1])],650); s=await state(pg);
  ok(N+'press and hold then drag starts selecting',s.selecting,s);
  ok(N+'… with the whole run ticked',same(s.picked,O.slice(1,cols+2)),s.picked);
  ok(N+'… the design menu is closed and the page stayed put',!s.dlg&&s.y===y1,{dlg:s.dlg,y:s.y});
  ok(N+'… and no design opened',/#saved/.test(s.url)&&!/design=/.test(s.url),s.url);
  await pg.tap('#savedBack'); await pg.waitForTimeout(400);
  /* press and hold without moving still shows the menu (unchanged) */
  const ph=await centre(pg,O[2]); await touch('touchStart',ph); await pg.waitForTimeout(650); await touch('touchEnd'); await pg.waitForTimeout(400);
  s=await state(pg); ok(N+'press and hold without moving still opens the design menu',s.dlg&&!s.selecting,s);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  /* a plain sideways swipe outside select mode does nothing */
  await swipe([await centre(pg,O[0]),await centre(pg,O[cols-1])]); s=await state(pg);
  ok(N+'outside select mode a quick swipe ticks nothing and opens nothing',!s.selecting&&!s.picked.length&&!/design=/.test(s.url),s);
  /* the "/" key hint is hidden on a phone */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
  ok(N+'the "/" key hint is hidden on a phone',await pg.$eval('#uSearch .us-kbd',e=>getComputedStyle(e).display==='none').catch(()=>false));
  await ctx.close(); }

/* ---------- computer: mouse ---------- */
{ const ctx=await mk(DESK); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('desktop: '+e)); const N='desktop: ';
  await open(pg); let s=await state(pg); const O=s.order;
  const drag=async(ids,steps=10)=>{ const p0=await centre(pg,ids[0]); await pg.mouse.move(p0.x,p0.y); await pg.mouse.down();
    for(const id of ids.slice(1)){ const p=await centre(pg,id); await pg.mouse.move(p.x,p.y,{steps}); }
    await pg.mouse.up(); await pg.waitForTimeout(300); };
  await drag([O[0],O[3]]); s=await state(pg);
  ok(N+'outside select mode a mouse drag ticks nothing and opens nothing',!s.selecting&&!s.picked.length&&/#saved/.test(s.url)&&!/design=/.test(s.url),s);
  await pg.click('#selBtn'); await pg.waitForTimeout(300);
  await drag([O[0],O[3]]); s=await state(pg);
  ok(N+'a mouse drag in select mode ticks the run',same(s.picked,O.slice(0,4)),s.picked);
  ok(N+'no design opened',/#saved/.test(s.url)&&!/design=/.test(s.url),s.url);
  await drag([O[4],O[4+5]]); s=await state(pg);   // from an unticked one a row down (7 a row): ticks 4..9 too
  ok(N+'a drag down a row ticks the whole run between',same(s.picked,O.slice(0,10)),s.picked);
  await drag([O[0],O[4],O[1]]); s=await state(pg);
  ok(N+'a drag from a ticked design unticks; back again re-ticks what it left',same(s.picked,O.slice(2,10)),s.picked);
  await pg.click(`#savedGrid .sv-card[data-id="${O[12]}"] .sv-open`); await pg.waitForTimeout(250); s=await state(pg);
  ok(N+'a click after a drag still ticks one',s.picked.includes(O[12])&&s.picked.length===9,s.picked);
  const sel=await pg.evaluate(()=>String(getSelection()));
  ok(N+'dragging selects no text on the page',!sel.trim(),sel);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);

  /* the "/" key hint */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
  const kb=()=>pg.$eval('#uSearch .us-kbd',e=>{ const r=e.getBoundingClientRect(), f=document.getElementById('uq').getBoundingClientRect(); return {vis:getComputedStyle(e).display!=='none'&&r.width>0,txt:e.textContent,inside:r.left>=f.left&&r.right<=f.right&&r.top>=f.top&&r.bottom<=f.bottom,right:Math.round(f.right-r.right)}; });
  let k=await kb(); ok(N+'the "/" key shows once, at the end of the empty search field',k.vis&&k.txt==='/'&&k.inside&&k.right<=24,k);
  ok(N+'only one key hint',(await pg.$$('#uSearch .us-kbd')).length===1);
  ok(N+'the field announces its shortcut',await pg.$eval('#uq',e=>e.getAttribute('aria-keyshortcuts')==='/'));
  await pg.keyboard.press('/'); await pg.waitForTimeout(250);
  ok(N+'"/" jumps into the search',await pg.evaluate(()=>document.activeElement&&document.activeElement.id==='uq'));
  k=await kb(); ok(N+'the key hides while the field is focused',!k.vis,k);
  ok(N+'"/" is not typed into the field',(await pg.inputValue('#uq'))==='');
  await pg.keyboard.type('res'); await pg.waitForTimeout(250); await pg.keyboard.press('Escape'); await pg.waitForTimeout(250);
  await pg.evaluate(()=>document.activeElement&&document.activeElement.blur()); await pg.waitForTimeout(200);
  if(await pg.inputValue('#uq')){ k=await kb(); ok(N+'the key stays hidden while there is text',!k.vis,k); }
  await pg.fill('#uq',''); await pg.evaluate(()=>document.activeElement&&document.activeElement.blur()); await pg.waitForTimeout(200);
  k=await kb(); ok(N+'empty and not focused again: the key is back',k.vis,k);
  /* contrast of the key on its field */
  const c=await pg.$eval('#uSearch .us-kbd',e=>{ const p=s=>s.match(/[\d.]+/g).map(Number), L=([r,g,b])=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
    let bg=getComputedStyle(document.getElementById('uq')).backgroundColor; const fg=p(getComputedStyle(e).color), bb=p(bg); const a=L(fg), d=L(bb); return (Math.max(a,d)+.05)/(Math.min(a,d)+.05); });
  ok(N+'the key is readable (≥ 3:1 like an icon)',c>=3,c.toFixed(2));
  await ctx.close(); }
/* dark computer: the key stays readable */
{ const ctx=await b.newContext({viewport:{width:1280,height:800},colorScheme:'dark',serviceWorkers:'block'}); await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('dark: '+e)); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
  const c=await pg.$eval('#uSearch .us-kbd',e=>{ const p=s=>s.match(/[\d.]+/g).map(Number), L=([r,g,b])=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
    const fg=p(getComputedStyle(e).color), bb=p(getComputedStyle(document.getElementById('uq')).backgroundColor); const a=L(fg), d=L(bb); return {vis:getComputedStyle(e).display!=='none',c:(Math.max(a,d)+.05)/(Math.min(a,d)+.05)}; });
  ok('dark desktop: the key shows and is readable',c.vis&&c.c>=3,c);
  await ctx.close(); }
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`select-swipe: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);

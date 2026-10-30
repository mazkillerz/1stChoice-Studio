/* Search on the Saved page: the magnifier (#findBtn), the search row (#findRow / #findIn / #findClr / #findX),
   live filtering (name, tool title, collection, Arabic folded), with collection chips, the empty note + Clear search,
   Escape, leaving the page, Select mode, layout at 390 and 360, and Arabic names. Seeded like tests/home7.mjs. Run: node tests/saved-find.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const T0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const mk=async(w,h,{touch=true,dark=false,db}={})=>{
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} });
  await ctx.addInitScript({content:seedScript(db||seedDesigns())}); return ctx; };
const open=async(ctx,tag,n=8)=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForFunction(n=>document.querySelectorAll('#savedGrid .sv-card').length===n,n,{timeout:10000}); await pg.waitForTimeout(500); return pg; };
const cards=pg=>pg.$$eval('#savedGrid .sv-card',l=>l.length);
const vis=(pg,s)=>pg.evaluate(s=>{ const e=document.querySelector(s); return !!e&&!e.hidden&&e.getClientRects().length>0; },s);
const txt=async(pg,s)=>((await pg.textContent(s))||'').trim();
const settle=pg=>pg.waitForTimeout(350);

async function core(vp,dark){
  const N=vp.name+(dark?' dark: ':': '), touch=vp.touch;
  const ctx=await mk(vp.w,vp.h,{touch,dark}); const pg=await open(ctx,N);
  const tap=s=>touch?pg.tap(s):pg.click(s);
  const type=async v=>{ await pg.fill('#findIn',v); await settle(pg); };
  /* 1 */
  const fb=await pg.$eval('#findBtn',e=>{ const r=e.getBoundingClientRect(); return {w:r.width,h:r.height,label:e.getAttribute('aria-label')}; });
  ok(N+'1 the magnifier is visible, 44px+, has a label; the row is hidden',await vis(pg,'#findBtn')&&fb.w>=44&&fb.h>=44&&!!fb.label&&!(await vis(pg,'#findRow')),fb);
  ok(N+'1 the magnifier sits in the Saved head next to Select',await pg.evaluate(()=>{ const f=document.getElementById('findBtn'); return !!f.closest('#saved .sp-head')&&f.parentElement===document.getElementById('selBtn').parentElement; }));
  /* 2 */
  await tap('#findBtn'); await settle(pg);
  ok(N+'2 tapping it shows the row, focuses the box, hides the magnifier',await vis(pg,'#findRow')&&await pg.evaluate(()=>document.activeElement.id==='findIn')&&!(await vis(pg,'#findBtn')));
  ok(N+'2 aria-expanded is true while open',await pg.getAttribute('#findBtn','aria-expanded')==='true');
  ok(N+'2 no clear ✕ while the box is empty',!(await vis(pg,'#findClr')));
  /* 3 */
  await type('offer');
  ok(N+'3 "offer" -> 1 card, "1 of 8", clear ✕ visible',await cards(pg)===1&&await txt(pg,'#spCount')==='1 of 8'&&await vis(pg,'#findClr'),await txt(pg,'#spCount'));
  /* 4 */
  await type('restock'); const c4=await cards(pg);
  await type('RESTOCK 24'); const c4b=await cards(pg);
  ok(N+'4 "restock" -> 2 cards',c4===2,c4);
  ok(N+'4 "RESTOCK 24" -> 1 card (every word, any case)',c4b===1,c4b);
  /* 5 */
  await type('offers'); const n5=await pg.$$eval('#savedGrid .sv-card .sv-txt b',l=>l.map(x=>x.textContent));
  ok(N+'5 a collection name ("offers") finds that design',n5.length===1&&n5[0]==='Offer – 22 Oct',n5.join('|'));
  /* 6 */
  await type('xyzq');
  ok(N+'6 no match: 0 cards and the "No saved design matches" note',await cards(pg)===0&&await vis(pg,'#savedEmpty')&&/No saved design matches/.test(await txt(pg,'#savedEmpty')),await txt(pg,'#savedEmpty'));
  ok(N+'6 the note has a "Clear search" button',await vis(pg,'#savedEmpty [data-clearfind]')&&/Clear search/.test(await txt(pg,'#savedEmpty [data-clearfind]')));
  await tap('#savedEmpty [data-clearfind]'); await settle(pg);
  ok(N+'6 Clear search: 8 cards, box empty, row stays open',await cards(pg)===8&&await pg.inputValue('#findIn')===''&&await vis(pg,'#findRow')&&!(await vis(pg,'#savedEmpty')));
  /* 7 */
  await tap('#colChips [data-f="c:Restocks"]'); await settle(pg); await type('24');
  const c7a=await cards(pg); await type('offer'); const c7b=await cards(pg);
  ok(N+'7 Restocks chip + "24" -> 1 card',c7a===1,c7a);
  ok(N+'7 Restocks chip + "offer" -> 0 cards and the empty note',c7b===0&&await vis(pg,'#savedEmpty'),c7b);
  await tap('#colChips [data-f="all"]'); await settle(pg); await type('');
  ok(N+'7 All chip + empty box -> 8 again',await cards(pg)===8);
  /* 8 */
  await type('offer'); await tap('#findClr'); await settle(pg);
  ok(N+'8 clear ✕: box empty, 8 cards, box focused',await pg.inputValue('#findIn')===''&&await cards(pg)===8&&await pg.evaluate(()=>document.activeElement.id==='findIn')&&!(await vis(pg,'#findClr')));
  /* 9 */
  await type('offer'); await tap('#findX'); await settle(pg);
  ok(N+'9 Cancel: row hidden, 8 cards, magnifier back, box empty, count "8 designs"',!(await vis(pg,'#findRow'))&&await cards(pg)===8&&await vis(pg,'#findBtn')&&await pg.inputValue('#findIn')===''&&await pg.getAttribute('#findBtn','aria-expanded')==='false'&&await txt(pg,'#spCount')==='8 designs',await txt(pg,'#spCount'));
  /* 10 */
  await tap('#findBtn'); await settle(pg); await type('offer'); await pg.keyboard.press('Escape'); await settle(pg);
  ok(N+'10 Escape closes the row and shows all 8',!(await vis(pg,'#findRow'))&&await cards(pg)===8&&await vis(pg,'#findBtn')&&await pg.inputValue('#findIn')==='');
  /* 11 */
  await tap('#findBtn'); await settle(pg); await type('offer'); await tap('#savedBack'); await pg.waitForTimeout(500);
  const home=await vis(pg,'#homeView');
  await tap('.hubbar a[data-tab="saved"]').catch(async()=>{ await pg.evaluate(()=>{ location.hash='#saved'; }); }); await pg.waitForTimeout(700);
  if(!(await vis(pg,'#saved'))) { await pg.evaluate(()=>{ location.hash='#saved'; }); await pg.waitForTimeout(700); }
  ok(N+'11 after Home and back to Saved: search cleared, row closed, 8 cards',home&&await vis(pg,'#saved')&&!(await vis(pg,'#findRow'))&&await cards(pg)===8&&await pg.inputValue('#findIn')===''&&await vis(pg,'#findBtn'),{home});
  await ctx.close(); return;
}

/* ---- phone, light + dark ---- */
for(const dark of [false,true]) await core({name:'phone',w:390,h:844,touch:true},dark);
/* ---- desktop: the basic filter ---- */
{ const N='desktop: ', ctx=await mk(1280,800,{touch:false}); const pg=await open(ctx,N);
  await pg.click('#findBtn'); await settle(pg); await pg.fill('#findIn','restock'); await settle(pg);
  ok(N+'search opens, "restock" -> 2 cards, "2 of 8"',await cards(pg)===2&&await txt(pg,'#spCount')==='2 of 8'&&await pg.evaluate(()=>document.activeElement.id==='findIn'));
  await pg.fill('#findIn','offer'); await settle(pg); ok(N+'"offer" -> 1 card',await cards(pg)===1);
  await pg.keyboard.press('Escape'); await settle(pg); ok(N+'Escape closes, 8 cards',await cards(pg)===8&&!(await vis(pg,'#findRow')));
  await ctx.close(); }

/* ---- 12 select mode, 13 layout (phone, light) ---- */
{ const N='phone: ', ctx=await mk(390,844); const pg=await open(ctx,N);
  await pg.tap('#selBtn'); await settle(pg);
  ok(N+'12 Select mode hides the magnifier',!(await vis(pg,'#findBtn')));
  await pg.tap('#savedBack'); await settle(pg);
  ok(N+'12 stopping Select brings it back (still on the Saved page)',await vis(pg,'#findBtn')&&await vis(pg,'#saved'));
  for(const w of [390,360]){
    await pg.setViewportSize({width:w,height:844}); await pg.waitForTimeout(300);
    if(!(await vis(pg,'#findRow'))) { await pg.tap('#findBtn'); await settle(pg); }
    const m=await pg.evaluate(()=>{ const box=document.querySelector('#findRow .sp-find-box').getBoundingClientRect(), chip=document.querySelector('#colChips .chip'), x=document.getElementById('findX').getBoundingClientRect();
      return {sw:document.documentElement.scrollWidth,iw:innerWidth,boxL:box.left,chipL:chip?chip.getBoundingClientRect().left:null,xh:x.height}; });
    ok(N+'13 '+w+'px: no horizontal page scroll',m.sw<=m.iw,m);
    ok(N+'13 '+w+'px: search box lines up with the first chip (within 2px)',m.chipL!==null&&Math.abs(m.boxL-m.chipL)<=2,m);
    ok(N+'13 '+w+'px: Cancel is 44px+ tall',m.xh>=44,m.xh);
  }
  await ctx.close(); }

/* ---- 14 Arabic ---- */
{ const N='phone: ', db=seedDesigns(); const base=db.designs.seed0;
  db.designs.seedAr={...base,id:'seedAr',name:'باشن فروت – 24 Oct',tool:'restock',cols:[],updated_at:new Date().toISOString()};
  const ctx=await mk(390,844,{db}); const pg=await open(ctx,N,9);
  await pg.tap('#findBtn'); await settle(pg);
  const ar=async v=>{ await pg.fill('#findIn',v); await settle(pg); return pg.$$eval('#savedGrid .sv-card .sv-txt b',l=>l.map(x=>x.textContent)); };
  const a=await ar('باشن'), f=await ar('فروت');
  ok(N+'14 Arabic: "باشن" finds the Arabic-named design',a.length===1&&a[0].startsWith('باشن'),a.join('|'));
  ok(N+'14 Arabic: "فروت" finds it too',f.length===1&&f[0].startsWith('باشن'),f.join('|'));
  ok(N+'14 the box follows the text direction (dir=auto)',await pg.getAttribute('#findIn','dir')==='auto');
  await ctx.close(); }

await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const nf=res.filter(r=>r.startsWith('FAIL')).length, secs=((Date.now()-T0)/1000).toFixed(1);
console.log('saved-find: '+(res.length-nf)+' pass, '+nf+' fail, '+secs+' s'); process.exit(nf?1:0);

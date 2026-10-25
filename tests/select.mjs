/* Studio 0.8.0: select several saved designs on the Saved page.
   - Select in the header; bottom bar swaps for Collection / Take out / Delete (disabled until something is ticked)
   - a tap ticks instead of opening; Select all / Clear; the title counts
   - Collection adds the ticked designs to a collection (existing chip or a new name) and keeps their other collections
   - Take out (only while a collection is chosen) removes them from that collection
   - Delete asks first ("Delete 2 designs?") and removes them all
   - ✕, Escape and the phone's Back stop selecting (Back stays on Saved; the next Back goes home)
   - press and hold → Select more starts selecting with that design ticked
   - dark mode tick uses the accent; a computer shows 7 designs a row
   Saved designs are seeded with tests/seed.js; the team is tests/fakecloud.js (collection ids are their names).
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SEED=seedDesigns();
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const PHONE={name:'phone',width:390,height:844,touch:true}, DESK={name:'desktop',width:1280,height:800,touch:false};
const mk=async(vp,scheme='light')=>{
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.touch?2:1,isMobile:vp.touch,hasTouch:vp.touch,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(SEED)});
  return ctx; };
const fdb=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));
const card=id=>`#savedGrid .sv-card[data-id="${id}"] .sv-open`;
const state=pg=>pg.evaluate(()=>{ const v=id=>{ const e=document.getElementById(id); return !!e&&!e.hidden&&e.getClientRects().length>0; };
  return {selecting:document.body.classList.contains('selecting'),bar:v('selBar'),hubbar:!!document.querySelector('.hubbar')&&getComputedStyle(document.querySelector('.hubbar')).display!=='none',fab:getComputedStyle(document.getElementById('fab')).display!=='none',
    title:document.getElementById('savedH').textContent,picked:[...document.querySelectorAll('#savedGrid .sv-card.picked')].map(c=>c.dataset.id),
    btn:document.getElementById('selBtn').textContent,dis:['selCol','selOut','selDel'].map(i=>document.getElementById(i).disabled),out:v('selOut'),saved:v('saved'),home:v('homeView'),url:location.hash}; });

for(const vp of [PHONE,DESK]){
  const N=vp.name+': ', tap=(pg,s)=>vp.touch?pg.tap(s):pg.click(s);
  const ctx=await mk(vp); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
  await tap(pg,'[data-see-all]'); await pg.waitForTimeout(500);
  ok(N+'Select button shows on the Saved page',await pg.isVisible('#selBtn'));
  const sb=await pg.$eval('#selBtn',e=>e.getBoundingClientRect().height); ok(N+'Select button is at least 44px tall',sb>=44,sb);
  if(!vp.touch){ const n=await pg.$eval('#savedGrid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length); ok(N+'7 designs a row on a computer',n===7,n); }

  /* start, tick, all, clear */
  await tap(pg,'#selBtn'); await pg.waitForTimeout(300);
  let s=await state(pg);
  ok(N+'selecting: action bar shows, bottom bar and + hide',s.selecting&&s.bar&&!s.hubbar&&!s.fab,s);
  ok(N+'nothing ticked: title "Select designs", actions disabled, Take out hidden',s.title==='Select designs'&&s.dis[0]&&s.dis[2]&&!s.out,s);
  const url0=pg.url();
  await tap(pg,card('seed0')); await tap(pg,card('seed2')); await pg.waitForTimeout(300);
  s=await state(pg);
  ok(N+'a tap ticks instead of opening',pg.url()===url0&&s.picked.join()==='seed0,seed2'&&s.title==='2 selected',s);
  ok(N+'ticked designs report aria-checked',await pg.$eval(card('seed0'),a=>a.getAttribute('role')==='checkbox'&&a.getAttribute('aria-checked')==='true'));
  ok(N+'actions enabled once something is ticked',!s.dis[0]&&!s.dis[2],s.dis);
  await tap(pg,card('seed2')); s=await state(pg); ok(N+'a second tap unticks',s.picked.join()==='seed0',s.picked);
  await tap(pg,'#selBtn'); s=await state(pg); ok(N+'Select all ticks all 8, button says Clear',s.picked.length===8&&s.btn==='Clear',s);
  await tap(pg,'#selBtn'); s=await state(pg); ok(N+'Clear unticks all',s.picked.length===0&&s.btn==='Select all',s);

  /* Collection */
  await tap(pg,card('seed1')); await tap(pg,card('seed4')); await tap(pg,'#selCol'); await pg.waitForTimeout(400);
  ok(N+'Collection opens a dialog with the collections as chips',await pg.$$eval('dialog[open] #scChips [data-n]',l=>l.map(x=>x.dataset.n).sort().join())==='Offers,Restocks');
  await tap(pg,'dialog[open] [data-n="Offers"]');
  ok(N+'the Add button names the collection',(await pg.textContent('#scGo'))==='Add to “Offers”');
  await tap(pg,'#scGo'); await pg.waitForTimeout(700);
  let db=await fdb(pg); s=await state(pg);
  ok(N+'both designs are in Offers now',db.designs.seed1.cols.includes('Offers')&&db.designs.seed4.cols.includes('Offers'),[db.designs.seed1.cols,db.designs.seed4.cols]);
  ok(N+'selecting stops after Add, a toast says so',!s.selecting&&!s.bar&&/Added 2 designs to “Offers”/.test(await pg.textContent('#hubToast')),s);
  /* a new collection name, keeping the old ones */
  await tap(pg,'#selBtn'); await tap(pg,card('seed0')); await tap(pg,'#selCol'); await pg.waitForTimeout(300);
  await pg.fill('#scNew','Week 43'); await tap(pg,'#scGo'); await pg.waitForTimeout(700);
  db=await fdb(pg); ok(N+'a new collection name works and keeps the old one',db.designs.seed0.cols.join()==='Restocks,Week 43',db.designs.seed0.cols);

  /* Take out (a collection is chosen) */
  await tap(pg,'#colChips [data-f="c:Offers"]'); await pg.waitForTimeout(300);
  await tap(pg,'#selBtn'); s=await state(pg); ok(N+'Take out shows while a collection is chosen',s.out,s);
  await tap(pg,'#selBtn'); await tap(pg,'#selOut'); await pg.waitForTimeout(700);
  db=await fdb(pg); ok(N+'Take out removes all three from Offers only',['seed1','seed2','seed4'].every(i=>!db.designs[i].cols.includes('Offers'))&&db.designs.seed0.cols.includes('Restocks'),Object.fromEntries(Object.entries(db.designs).map(([k,v])=>[k,v.cols])));
  await tap(pg,'#colChips [data-f="c:Offers"]').catch(()=>{}); await pg.evaluate(()=>{ const b=document.querySelector('#savedEmpty [data-showall]'); if(b) b.click(); }); await pg.waitForTimeout(300);

  /* Delete */
  await tap(pg,'#selBtn'); await tap(pg,card('seed6')); await tap(pg,card('seed7')); await tap(pg,'#selDel'); await pg.waitForTimeout(300);
  ok(N+'Delete asks first, naming the count',/Delete 2 designs\?/.test(await pg.textContent('dialog[open] h3')));
  await tap(pg,'#cfNo'); await pg.waitForTimeout(250); s=await state(pg); ok(N+'Cancel keeps the selection',s.selecting&&s.picked.length===2,s);
  await tap(pg,'#selDel'); await pg.waitForTimeout(250); await tap(pg,'#cfYes'); await pg.waitForTimeout(800);
  db=await fdb(pg); s=await state(pg);
  ok(N+'both designs are deleted',!db.designs.seed6&&!db.designs.seed7&&Object.keys(db.designs).length===6,Object.keys(db.designs));
  ok(N+'the grid shows 6 and selecting stopped',(await pg.$$('#savedGrid .sv-card')).length===6&&!s.selecting,s);

  /* ways out */
  await tap(pg,'#selBtn'); await tap(pg,'#savedBack'); await pg.waitForTimeout(400); s=await state(pg);
  ok(N+'✕ stops selecting and stays on Saved',!s.selecting&&s.saved&&s.title==='Saved designs',s);
  if(vp.touch){
    await tap(pg,'#selBtn'); await pg.goBack(); await pg.waitForTimeout(400); s=await state(pg);
    ok(N+'phone Back stops selecting and stays on Saved',!s.selecting&&s.saved,s);
    await pg.goBack(); await pg.waitForTimeout(500); s=await state(pg); ok(N+'the next Back goes home',s.home&&!s.saved,s);
    await tap(pg,'.hubbar [data-tab="saved"]'); await pg.waitForTimeout(500);
    /* press and hold → Select more */
    const el=pg.locator(card('seed3')); const bb=await el.boundingBox(), x=bb.x+bb.width/2, y=bb.y+bb.height/2;
    const init={bubbles:true,cancelable:true,composed:true,pointerType:'touch',pointerId:7,isPrimary:true,button:0,buttons:1,clientX:x,clientY:y};
    await el.dispatchEvent('pointerdown',init); await pg.waitForTimeout(650); await el.dispatchEvent('pointerup',{...init,buttons:0}); await pg.waitForTimeout(300);
    ok(N+'press and hold shows Select more',await pg.isVisible('dialog[open] [data-act="sel"]'));
    await tap(pg,'dialog[open] [data-act="sel"]'); await pg.waitForTimeout(400); s=await state(pg);
    ok(N+'Select more starts selecting with that design ticked',s.selecting&&s.picked.join()==='seed3',s);
    await tap(pg,'#savedBack'); await pg.waitForTimeout(300);
  } else {
    await tap(pg,'#selBtn'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(400); s=await state(pg);
    ok(N+'Escape stops selecting',!s.selecting&&s.saved,s);
    await pg.click(card('seed3'),{button:'right'}); await pg.waitForTimeout(300);
    await pg.click('dialog[open] [data-act="sel"]'); await pg.waitForTimeout(300); s=await state(pg);
    ok(N+'right-click → Select more ticks that design',s.selecting&&s.picked.join()==='seed3',s);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  }
  /* the home page's row is not touched by selecting */
  await tap(pg,card('seed3')); await pg.waitForTimeout(800); ok(N+'outside select mode a tap opens the design again',/restock\.html\?design=seed3/.test(pg.url()),pg.url());
  await ctx.close();
}
/* dark: the tick uses the accent and stays readable */
{ const ctx=await mk(PHONE,'dark'); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('dark: '+e));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1200);
  await pg.tap('#selBtn'); await pg.tap(card('seed0')); await pg.waitForTimeout(400);
  const c=await pg.$eval('#savedGrid .sv-card.picked .sv-check',e=>{ const s=getComputedStyle(e), a=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); const t=document.createElement('i'); t.style.color=a; document.body.appendChild(t); const ac=getComputedStyle(t).color; t.remove(); return {bg:s.backgroundColor,ac,fg:s.color}; });
  ok('dark: the tick is filled with the accent',c.bg===c.ac&&c.fg!==c.bg,c);
  await ctx.close(); }
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`select: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);

/* "New Studio look" preview (flag next). Flag off: today's bar and Saved, assets/next.js never requested.
   Flag on: five-place bar, + menu, tabs, Saved (search, shelf, filters, density, cards, sheet, select, cache), Home (Jump back in), 360 px.
   Run: node tests/next.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
let fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
fake=fake.replace('async designs(brand){','async designs(brand){ await new Promise(r=>setTimeout(r,window.__DELAY||0));');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
const AR=['رجع متوفر – Classic','Restock وفرنا كمية جديدة'];
const seed=()=>{ const S=seedDesigns(); Object.values(S.designs).slice(0,2).forEach((d,i)=>{ d.name=AR[i]; }); const ds=Object.values(S.designs); ds[0].author='Mazin'; ds[2].kind='template'; return S; };
const mk=async({w=390,h=844,flag=true,delay=0,pre=''}={})=>{
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<800,hasTouch:w<800,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const reqs=[]; ctx.on('request',r=>reqs.push(r.url()));
  await ctx.addInitScript({content:seedScript(seed())});
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); if(!localStorage.getItem('studio:pins')) localStorage.setItem('studio:pins',JSON.stringify(['restock','photo-story','collage'])); ${flag?"localStorage.setItem('studio:flag:next','1');":''} }catch(e){} window.__DELAY=${delay}; ${pre}`});
  ctx.reqs=reqs; return ctx; };
const open=async(ctx,hash='',tag='p')=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e)); await pg.goto(BASE+'index.html'+hash); await pg.waitForTimeout(1200); return pg; };
const vis=(pg,s)=>pg.evaluate(s=>{ const e=document.querySelector(s); return !!e&&!e.hidden&&e.getClientRects().length>0; },s);

/* 1 flag off */
{ const ctx=await mk({flag:false}); const pg=await open(ctx);
  const tabs=await pg.$$eval('.hubbar a',a=>a.map(x=>x.dataset.tab));
  ok('off: three tabs Home, Templates, Saved',tabs.join()==='home,templates,saved',tabs.join());
  ok('off: the floating + is outside the bar',await pg.$eval('#fab',f=>!f.closest('.hubbar')));
  ok('off: next.js is not requested',!ctx.reqs.some(u=>/assets\/next\.js/.test(u)));
  ok('off: no data-next switch',await pg.evaluate(()=>!document.documentElement.dataset.next));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1000);
  ok('off: old Saved header and chips',await vis(pg,'#savedBack')&&await pg.$eval('#savedH',h=>h.textContent==='Saved designs')&&!(await pg.$('#nxFbar')));
  await ctx.close(); }

/* 2 flag on: the bar */
{ const ctx=await mk(); const pg=await open(ctx);
  const labels=await pg.$$eval('.hubbar a span',s=>s.map(x=>x.textContent));
  ok('on: five places in order (+ docked in the middle)',labels.join()==='Home,Saved,Plan,Templates'&&await pg.$eval('.hubbar',n=>[...n.children].map(c=>c.className||c.dataset.tab).join())==='pill,home,saved,nb-slot,calendar,templates',labels.join());
  ok('on: the + sits in the bar',await pg.$eval('#fab',f=>!!f.closest('.nb-slot')));
  const geo=await pg.$$eval('.hubbar a',a=>a.map(x=>{ const r=x.getBoundingClientRect(); const sp=x.querySelector('span'); return [Math.round(r.width),Math.round(r.height),sp.scrollWidth<=sp.clientWidth+1]; }));
  ok('on: every tab is at least 48 high and its label is whole',geo.every(g=>g[1]>=48&&g[2]),geo);
  await pg.tap('#fab'); await pg.waitForTimeout(500);
  const items=await pg.$$eval('dialog.fab-dlg .fab-item',x=>x.map(e=>e.innerText.split('\n')[0].trim()));
  ok('on: + opens the same menu',items.length>=3&&/restock/i.test(items[0]),items.join(' | '));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  for(const [tab,view] of [['saved','#saved'],['calendar','#calendarView'],['templates','#templatesView'],['home','#homeView']]){
    await pg.tap(`.hubbar [data-tab="${tab}"]`); await pg.waitForTimeout(700);
    ok('on: '+tab+' tab opens its page and is current',await vis(pg,view)&&await pg.$eval(`.hubbar [data-tab="${tab}"]`,a=>a.getAttribute('aria-current')==='true')); }
  await pg.tap('.hubbar [data-tab="saved"]'); await pg.waitForTimeout(600); await pg.goBack(); await pg.waitForTimeout(600);
  ok('on: phone Back from Saved returns Home',await vis(pg,'#homeView')&&!(await vis(pg,'#saved')));
  ok('on: next.js was requested once',ctx.reqs.filter(u=>/assets\/next\.js/.test(u)).length===1);
  await ctx.close(); }

/* 3 Saved */
{ const ctx=await mk(); const pg=await open(ctx,'#saved');
  ok('saved: title Saved, no back arrow, search visible',await pg.$eval('#savedH',h=>h.textContent==='Saved')&&!(await vis(pg,'#savedBack'))&&await vis(pg,'#findIn'));
  const n0=await pg.$$eval('#savedGrid .sv-card',c=>c.length); ok('saved: all designs shown',n0===8,n0);
  await pg.fill('#findIn','offer'); await pg.waitForTimeout(300);
  const n1=await pg.$$eval('#savedGrid .sv-card',c=>c.length); ok('saved: typing filters live',n1===1,n1);
  await pg.fill('#findIn','mazin'); await pg.waitForTimeout(300);
  ok('saved: people are searched too',await pg.$$eval('#savedGrid .sv-card',c=>c.length)===1);
  await pg.tap('#findClr'); await pg.waitForTimeout(300); ok('saved: the x clears the search',await pg.$eval('#findIn',i=>i.value==='')&&await pg.$$eval('#savedGrid .sv-card',c=>c.length)===8);
  const shelf=await pg.$$eval('#colChips .nx-col b',b=>b.map(x=>x.textContent)); ok('saved: shelf starts with All, then the collections',shelf.join()==='All,Restocks,Offers',shelf.join());
  await pg.tap('#colChips [data-f="c:Restocks"]'); await pg.waitForTimeout(400);
  ok('saved: a collection card filters and is marked',await pg.$$eval('#savedGrid .sv-card',c=>c.length)===2&&await pg.$eval('#colChips .nx-col.on',e=>e.dataset.f==='c:Restocks'));
  ok('saved: the chosen collection has its menu button',await vis(pg,'#colMore'));
  await pg.tap('#colChips [data-f="all"]'); await pg.waitForTimeout(300);
  const kinds=await pg.$$eval('.nx-kinds .chip',c=>c.map(x=>x.textContent)); ok('saved: kind chips only for kinds that exist',kinds.join()==='All,Stories,Posts,Templates',kinds.join());
  await pg.tap('.nx-kinds [data-k="template"]'); await pg.waitForTimeout(300); ok('saved: Templates chip filters',await pg.$$eval('#savedGrid .sv-card',c=>c.length)===1);
  await pg.tap('.nx-kinds [data-k="all"]'); await pg.waitForTimeout(300);
  const c2=await pg.$eval('#savedGrid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length); ok('saved: two columns on a phone',c2===2,c2);
  const clip=await pg.$$eval('#savedGrid .nx-name',n=>n.filter(e=>e.scrollWidth>e.clientWidth+1).length); ok('saved: names are not cut sideways at 2 columns',clip===0,clip);
  const full=await pg.$$eval('#savedGrid .nx-name',n=>n.slice(0,2).map(e=>e.textContent)); ok('saved: the full name is on the card',full.some(t=>/Classic/.test(t)),full.join(' | '));
  await pg.tap('#nxDens'); await pg.waitForTimeout(300);
  ok('saved: density toggle gives 3 columns and is remembered',await pg.$eval('#savedGrid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length)===3&&await pg.evaluate(()=>localStorage.getItem('studio:savedCols'))==='3');
  await pg.reload(); await pg.waitForTimeout(1200); ok('saved: density stays after reload',await pg.$eval('#savedGrid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length)===3);
  await pg.tap('#nxDens'); await pg.waitForTimeout(300);
  const aw=await pg.$eval('#savedGrid',g=>g.scrollWidth<=g.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth); ok('saved: no sideways scroll',aw);
  /* more menu and sheet */
  await pg.tap('#savedGrid .sv-more'); await pg.waitForTimeout(700);
  const big=await pg.$$eval('dialog .ds-big',x=>x.map(e=>e.innerText.trim())); ok('sheet: Open, Save picture, Duplicate, Collection',big.join()==='Open,Save picture,Duplicate,Collection',big.join());
  const rows=await pg.$$eval('dialog #dsMain .act-row',x=>x.map(e=>e.innerText.trim())); ok('sheet: the other rows stay, Delete is last and red',/Rename/.test(rows.join())&&/Delete/.test(rows[rows.length-1])&&await pg.$eval('dialog #dsMain .act-row:last-child',e=>e.classList.contains('danger')),rows.join(' | '));
  const sc=await pg.$eval('dialog.design-dlg',d=>d.scrollHeight<=d.clientHeight+1); ok('sheet: does not scroll at 390x844',sc);
  await pg.tap('dialog [data-act="cols"]'); await pg.waitForTimeout(300); ok('sheet: Collection opens the collection chooser',await pg.$$eval('dialog #dsPanel .chip',c=>c.length)>0);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  /* tap opens the design */
  const href=await pg.$eval('#savedGrid .sv-open',a=>a.getAttribute('href')); ok('card: a tap target links to the design',/\?design=seed/.test(href),href);
  /* select mode */
  await pg.tap('#selBtn'); await pg.waitForTimeout(300); await pg.tap('#savedGrid .sv-open'); await pg.waitForTimeout(300);
  ok('select: a tap ticks a design and the selection bar replaces the bar',await pg.$$eval('#savedGrid .sv-card.picked',c=>c.length)===1&&await vis(pg,'#selBar')&&!(await vis(pg,'.hubbar')));
  await pg.goBack(); await pg.waitForTimeout(500); ok('select: Back ends select',!(await vis(pg,'#selBar'))&&await vis(pg,'#saved'));
  await ctx.close(); }

/* 4 instant Saved from the kept list while the cloud is slow */
{ const ctx=await mk({delay:3500}); const pg0=await open(ctx,'#saved','warm');   // first visit: slow, shows skeleton, then saves the list
  await pg0.waitForTimeout(4200); ok('cache: the list is kept after a load',await pg0.evaluate(()=>!!localStorage.getItem('studio:next:saved:1stchoice')));
  const t0=Date.now(); await pg0.reload(); await pg0.waitForSelector('#savedGrid .nx-card',{timeout:2500}).then(()=>ok('cache: Saved paints from the kept list before the cloud answers',Date.now()-t0<3000,Date.now()-t0+' ms'),()=>ok('cache: Saved paints from the kept list before the cloud answers',false));
  ok('cache: names are real, not skeletons',await pg0.$$eval('#savedGrid .nx-name',n=>n.length>=8));
  await pg0.waitForTimeout(4000); ok('cache: the grid is still whole after the quiet refresh',await pg0.$$eval('#savedGrid .nx-card',c=>c.length)===8);
  await ctx.close(); }

/* 5 Home */
{ const ctx=await mk({pre:`try{ localStorage.setItem('studio:draft:1stchoice:restock:dx',JSON.stringify({at:Date.now(),v:1})); }catch(e){}`}); const pg=await open(ctx);
  ok('home: the greeting is compact (no big headline)',await pg.$eval('.hero h1',h=>h.getBoundingClientRect().height===0||getComputedStyle(h).display==='none'||getComputedStyle(h).position==='absolute'));
  const jump=await pg.$$eval('#nxJump .nx-jcard',c=>c.map(x=>x.dataset.kind)); ok('home: Jump back in lists saved designs',jump.filter(k=>k==='saved').length>=3,jump.join());
  ok('home: See all goes to Saved',await vis(pg,'#nxJump [data-see-all]'));
  await ctx.close(); }

/* 6 360 px: no sideways scroll, labels whole */
{ const ctx=await mk({w:360,h:740}); const pg=await open(ctx);
  for(const h of ['','#saved','#templates','#calendar']){ await pg.goto(BASE+'index.html'+h); await pg.waitForTimeout(1000);
    ok('360: no sideways scroll on '+(h||'home'),await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)); }
  const geo=await pg.$$eval('.hubbar a span',s=>s.every(x=>x.scrollWidth<=x.clientWidth+1)); ok('360: bar labels are whole',geo);
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3).join(' | '));
await b.close(); console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-bad} passed, ${bad} failed`); process.exit(bad?1:0);

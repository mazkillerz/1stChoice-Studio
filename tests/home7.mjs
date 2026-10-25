/* Studio 0.7.0: the new home and the one-tap Save sheet.
   - the + button (menu with Restock first, New design last), the camera button on photo-first tool rows
   - Saved designs row on home, the Saved page (type + collection chips, sort, open, press-and-hold / ⋯ / right-click actions:
     rename, collections, duplicate, delete with confirmation), Back and the history entry
   - the bottom bar's highlight centres icon and label, aria-current follows the view
   - the page behind a dialog / the search cannot scroll
   - the Save sheet on a phone: bar Save opens it, team switch + name + remembered collection ready, one tap saves picture + team;
     an open saved design starts with the switch OFF; a remembered collection that is gone is dropped; the computer's Save card.
   Saved designs are seeded with tests/seed.js; the team is tests/fakecloud.js (collection ids are their names).
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SEED=seedDesigns();
const NEWEST=Object.values(SEED.designs).sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).map(d=>d.name);   // newest first
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pngSize=f=>{ const x=fs.readFileSync(f); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });   // keep what passed so far visible
const PHONE={name:'phone',width:390,height:844,touch:true}, DESK={name:'desktop',width:1280,height:800,touch:false};
const mk=async(vp,{seed=true}={})=>{
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.touch?2:1,isMobile:vp.touch,hasTouch:vp.touch,serviceWorkers:'block',acceptDownloads:true,colorScheme:'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(seed) await ctx.addInitScript({content:seedScript(SEED)});
  return ctx; };
const page=async(ctx,tag)=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e)); return pg; };
const real=pg=>pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length);
const fdb=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));
const gridNames=(pg,sel='#savedGrid')=>pg.$$eval(sel+' .sv-card .sv-txt b',l=>l.map(x=>x.textContent));
const fresh=async(pg,url='index.html')=>{ await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+url); await pg.waitForTimeout(900); };   // clear = seeded again on the next load
const homeShown=pg=>pg.evaluate(()=>{ const v=el=>{ const e=document.getElementById(el); return !!e&&!e.hidden&&e.getClientRects().length>0; }; return {home:v('homeView'),saved:v('saved')}; });

for(const vp of [PHONE,DESK]){
  const N=vp.name+': ', tap=(pg,s)=>vp.touch?pg.tap(s):pg.click(s);
  const ctx=await mk(vp); const pg=await page(ctx,vp.name);

  /* ---------- the + button ---------- */
  await fresh(pg);
  const fr=await pg.$eval('#fab',e=>{ const r=e.getBoundingClientRect(); return {w:r.width,h:r.height,right:innerWidth-r.right,bottom:innerHeight-r.bottom,cx:r.left+r.width/2,cy:r.top+r.height/2,left:r.left,top:r.top}; });
  ok(N+'the + button is at least 56px',fr.w>=56&&fr.h>=56,fr);
  ok(N+'the + button sits in the bottom-right corner area (within 24px)',fr.right>=0&&fr.right<=24.5&&fr.bottom>=0&&fr.bottom<=24.5&&fr.cx>vp.width/2&&fr.cy>vp.height/2,fr);
  if(vp.touch){
    const hb=await pg.$eval('.hubbar',e=>{ const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; });
    ok(N+'the + button sits beside the bottom bar, not on it',hb.right<=fr.left+1&&Math.abs((hb.top+hb.bottom)/2-(fr.top+fr.h/2))<30,{hb,fr});
  }
  await tap(pg,'#fab'); await pg.waitForTimeout(600);
  ok(N+'the + button opens a menu',await pg.isVisible('dialog.fab-dlg[open]')&&await pg.getAttribute('#fab','aria-expanded')==='true');
  const items=await pg.$$eval('dialog.fab-dlg .fab-item',l=>l.map(x=>({t:x.querySelector('b').textContent,a:x.tagName==='A',h:x.getBoundingClientRect().height,inside:x.getBoundingClientRect().right<=innerWidth&&x.getBoundingClientRect().bottom<=innerHeight})));
  ok(N+'menu: Restock first, New design last',items[0]&&items[0].t==='Restock'&&items[items.length-1].t==='New design'&&items.length===4,items.map(x=>x.t).join(' / '));
  ok(N+'menu: Photo story and Collage between them',items.slice(1,3).map(x=>x.t).join()==='Photo story,Collage');
  ok(N+'menu: every item is finger-sized and on screen',items.every(x=>x.h>=48&&x.inside),items.map(x=>Math.round(x.h)).join());
  ok(N+'menu: New design links to Create',(await pg.getAttribute('dialog.fab-dlg a.fab-item','href')||'').endsWith('tools/create.html'));
  ok(N+'menu: photo inputs for the three tools, Collage takes several',JSON.stringify(await pg.$$eval('dialog.fab-dlg input[data-quick]',l=>l.map(x=>x.dataset.quick+(x.multiple?'*':''))))==='["restock","photo-story","collage*"]');
  const xr=await pg.$eval('dialog.fab-dlg .fab-x',e=>{ const r=e.getBoundingClientRect(); return Math.min(r.width,r.height); });
  ok(N+'the close button is at least 56px',xr>=56,xr);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  ok(N+'Escape closes the menu',!(await pg.locator('dialog[open]').count())&&await pg.getAttribute('#fab','aria-expanded')==='false');
  await tap(pg,'#fab'); await pg.waitForTimeout(500); await tap(pg,'dialog.fab-dlg .fab-x'); await pg.waitForTimeout(400);
  ok(N+'the close button closes it',!(await pg.locator('dialog[open]').count()));
  await tap(pg,'#fab'); await pg.waitForTimeout(500); await pg.mouse.click(20,20); await pg.waitForTimeout(400);
  ok(N+'tapping the space around the menu closes it',!(await pg.locator('dialog[open]').count()));
  await tap(pg,'#fab'); await pg.waitForTimeout(500);
  await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('dialog.fab-dlg input[data-quick="restock"]',S+'pair.jpg')]); await pg.waitForTimeout(2500);
  ok(N+'a photo picked in the menu opens Restock with the photo in',await real(pg)===1);

  /* ---------- the camera button on a photo-first tool row ---------- */
  await fresh(pg);
  ok(N+'a new device: only Restock is pinned, and it has a camera button',JSON.stringify(await pg.$$eval('#toolGrid .tool-item',l=>l.map(x=>x.classList.contains('has-cam')&&x.querySelector('.row-cam input').dataset.quick)))==='["restock"]');
  const cam=await pg.$eval('#toolGrid .row-cam',e=>{ const r=e.getBoundingClientRect(), row=e.closest('.tool-item').getBoundingClientRect(); return {w:r.width,h:r.height,inRow:r.left>=row.left&&r.right<=row.right&&r.top>=row.top&&r.bottom<=row.bottom,dy:Math.abs((r.top+r.bottom)/2-(row.top+row.bottom)/2)}; });
  ok(N+'the row camera button is at least 44px and sits inside the row',cam.w>=44&&cam.h>=44&&cam.inRow&&cam.dy<=2,cam);
  await tap(pg,'#toolGrid .tool-row .ttxt'); await pg.waitForURL(/restock\.html/); await pg.waitForTimeout(1200);
  ok(N+'tapping the row itself opens the tool with no photo',await real(pg)===0);
  await fresh(pg);
  await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('#toolGrid input[data-quick="restock"]',S+'pair.jpg')]); await pg.waitForTimeout(2500);
  ok(N+'the row camera opens Restock with the photo in',await real(pg)===1&&!(await pg.isVisible('#draftBar')));
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.setItem('studio:pins','["restock","photo-story","collage"]')); await pg.reload(); await pg.waitForTimeout(800);
  ok(N+'Collage\'s camera takes several photos',await pg.$eval('#toolGrid input[data-quick="collage"]',e=>e.multiple)&&!(await pg.$eval('#toolGrid input[data-quick="restock"]',e=>e.multiple)));
  await Promise.all([pg.waitForURL(/collage\.html/),pg.setInputFiles('#toolGrid input[data-quick="collage"]',[S+'pair.jpg',S+'hand.jpg'])]); await pg.waitForTimeout(3000);
  ok(N+'Collage opens with both photos and two boxes',await real(pg)===2&&await pg.evaluate(()=>Studio.debug.S.count)===2);

  /* ---------- the Saved designs row on home ---------- */
  await fresh(pg); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000}); await pg.waitForTimeout(600);
  ok(N+'row heading is "Saved designs"',(await pg.textContent('#savedRowH')).trim()==='Saved designs');
  ok(N+'the count says 8',(await pg.textContent('#savedCount')).trim()==='8',await pg.textContent('#savedCount'));
  ok(N+'the row shows the 8 designs, newest first',JSON.stringify(await gridNames(pg,'#savedRowList'))===JSON.stringify(NEWEST),(await gridNames(pg,'#savedRowList')).join(' | '));
  ok(N+'no "See all N" card at the end (8 fit)',!(await pg.$('#savedRowList .sv-all')));
  ok(N+'row pictures load',await pg.$$eval('#savedRowList .sv-thumb img',l=>l.length===8&&l.every(i=>i.complete&&i.naturalWidth>0)));
  ok(N+'the Saved page is not shown yet',JSON.stringify(await homeShown(pg))==='{"home":true,"saved":false}');
  await tap(pg,'a.see-all'); await pg.waitForTimeout(500);
  ok(N+'See all opens the Saved page',JSON.stringify(await homeShown(pg))==='{"home":false,"saved":true}'&&/#saved$/.test(pg.url()),pg.url());
  ok(N+'Saved page: the heading and count',(await pg.textContent('#savedH')).trim()==='Saved designs'&&(await pg.textContent('#spCount')).trim()==='8 designs',await pg.textContent('#spCount'));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok(N+'the browser Back returns home',JSON.stringify(await homeShown(pg))==='{"home":true,"saved":false}'&&!/#saved/.test(pg.url()),pg.url());
  await tap(pg,'a.see-all'); await pg.waitForTimeout(400); await tap(pg,'#savedBack'); await pg.waitForTimeout(500);
  ok(N+'the back arrow on the page returns home too',JSON.stringify(await homeShown(pg))==='{"home":true,"saved":false}'&&!/#saved/.test(pg.url()),pg.url());
  await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:8000});
  ok(N+'index.html#saved opens the Saved page directly',JSON.stringify(await homeShown(pg))==='{"home":false,"saved":true}');
  await tap(pg,'#savedBack'); await pg.waitForTimeout(500);
  ok(N+'the back arrow works when the page was opened directly',JSON.stringify(await homeShown(pg))==='{"home":true,"saved":false}');
  await ctx.close();
}

/* ---------- the Saved page, on a phone (touch: press and hold) ---------- */
{ const vp=PHONE, N='phone: ', ctx=await mk(vp); const pg=await page(ctx,'saved page');
  await fresh(pg,'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:8000}); await pg.waitForTimeout(500);
  const cards=()=>pg.$$eval('#savedGrid .sv-card',c=>c.length);
  ok(N+'Saved page: 8 cards, newest first',await cards()===8&&JSON.stringify(await gridNames(pg))===JSON.stringify(NEWEST));
  ok(N+'Saved page: every card links to its tool with ?design=',await pg.$$eval('#savedGrid .sv-open',l=>l.every(a=>/tools\/[a-z-]+\.html\?design=seed\d/.test(a.href))));
  /* type chips: only the types that exist */
  const tc=await pg.$$eval('#typeChips .chip',l=>l.map(c=>({t:c.dataset.type,n:+c.querySelector('i').textContent,on:c.getAttribute('aria-pressed')})));
  ok(N+'type chips: All, Stories, Posts, Highlights (nothing else exists)',tc.map(c=>c.t).join()==='all,story,post,highlight',tc.map(c=>c.t).join());
  ok(N+'type chip counts match (8, 6, 1, 1)',tc.map(c=>c.n).join()==='8,6,1,1',tc.map(c=>c.n).join());
  await pg.tap('#typeChips .chip[data-type="post"]'); await pg.waitForTimeout(300);
  ok(N+'Posts leaves only the carousel',JSON.stringify(await gridNames(pg))==='["Carousel – 20 Oct"]'&&(await pg.textContent('#spCount')).trim()==='1 of 8'&&await pg.getAttribute('#typeChips .chip[data-type="post"]','aria-pressed')==='true',await gridNames(pg));
  await pg.tap('#typeChips .chip[data-type="highlight"]'); await pg.waitForTimeout(300);
  ok(N+'Highlights leaves only the covers',JSON.stringify(await gridNames(pg))==='["Highlight covers – 19 Oct"]');
  await pg.tap('#typeChips .chip[data-type="all"]'); await pg.waitForTimeout(300);
  ok(N+'All brings everything back',await cards()===8);
  /* collection chips (fakecloud ids are the names) */
  const cc=await pg.$$eval('#colChips .chip.col',l=>l.map(c=>({f:c.dataset.f,n:+c.querySelector('i').textContent})).sort((a,b)=>a.f.localeCompare(b.f)));
  ok(N+'collection chips: Offers 1, Restocks 2',JSON.stringify(cc)==='[{"f":"c:Offers","n":1},{"f":"c:Restocks","n":2}]',cc);
  ok(N+'the collection ⋯ menu button is there only once a collection is chosen',!(await pg.$('#colMore'))&&!(await pg.$('#colTools'))&&!(await pg.$('#colRename')));
  await pg.tap('#colChips .chip[data-f="c:Restocks"]'); await pg.waitForTimeout(300);
  const rs=await gridNames(pg);
  ok(N+'a collection chip keeps only its designs',rs.length===2&&rs.every(n=>/^Restock/.test(n))&&await pg.isVisible('#colMore')&&(await pg.textContent('#spCount')).trim()==='2 of 8',rs.join(' | '));
  ok(N+'the chosen chip and its ⋯ sit together (span.col-sel), ⋯ is a menu button',await pg.evaluate(()=>{ const m=document.getElementById('colMore'); return !!m&&m.parentElement.classList.contains('col-sel')&&!!m.parentElement.querySelector('.chip.col[aria-pressed="true"]')&&m.getAttribute('aria-haspopup')==='menu'&&m.getAttribute('aria-expanded')==='false'; }));
  await pg.tap('#typeChips .chip[data-type="post"]'); await pg.waitForTimeout(300);
  ok(N+'collection + type with no match shows a note with Show all',await cards()===0&&await pg.isVisible('#savedEmpty [data-showall]'));
  await pg.tap('#savedEmpty [data-showall]'); await pg.waitForTimeout(300);
  ok(N+'Show all clears both filters',await cards()===8);
  await pg.tap('#colChips .chip[data-f="c:Offers"]'); await pg.waitForTimeout(250); await pg.tap('#colChips .chip[data-f="c:Offers"]'); await pg.waitForTimeout(300);
  ok(N+'tapping the collection chip again clears it (and the ⋯ goes)',await cards()===8&&!(await pg.$('#colMore')));
  /* sort */
  await pg.selectOption('#sort','name'); await pg.waitForTimeout(300);
  const byName=await gridNames(pg), want=[...NEWEST].sort((a,c)=>a.localeCompare(c));
  ok(N+'sort by Name lists the designs alphabetically',JSON.stringify(byName)===JSON.stringify(want),byName.join(' | '));
  await pg.reload(); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:8000}); await pg.waitForTimeout(300);
  ok(N+'the sort choice is remembered',await pg.inputValue('#sort')==='name'&&JSON.stringify(await gridNames(pg))===JSON.stringify(want));
  await pg.selectOption('#sort','recent'); await pg.waitForTimeout(300);
  ok(N+'sort by Recent is newest first again',JSON.stringify(await gridNames(pg))===JSON.stringify(NEWEST));
  /* the actions sheet: press and hold (does not navigate), ⋯ */
  const url0=pg.url(), card0='#savedGrid .sv-card[data-id="seed0"]';
  const el=pg.locator(card0+' .sv-open'); const bb=await el.boundingBox(), x=bb.x+bb.width/2, y=bb.y+bb.height/2;
  const init={bubbles:true,cancelable:true,composed:true,pointerType:'touch',pointerId:7,isPrimary:true,button:0,buttons:1,clientX:x,clientY:y};
  await el.dispatchEvent('pointerdown',init); await pg.waitForTimeout(650);
  ok(N+'press and hold opens the actions sheet while the finger is still down',await pg.isVisible('dialog.design-dlg[open]'));
  await el.dispatchEvent('pointerup',{...init,buttons:0}); await el.dispatchEvent('click',{bubbles:true,cancelable:true,clientX:x,clientY:y}); await pg.waitForTimeout(400);
  ok(N+'press and hold does not navigate (the release click is swallowed)',pg.url()===url0&&await pg.isVisible('dialog.design-dlg[open]'),pg.url());
  ok(N+'the page behind the sheet cannot scroll',await pg.evaluate(()=>getComputedStyle(document.documentElement).overflow)==='hidden');
  const sh=await pg.evaluate(()=>{ const d=document.querySelector('dialog.design-dlg[open]'); const rows=[...d.querySelectorAll('.act-row')]; return {title:d.querySelector('h3').textContent,open:d.querySelector('a.btn').textContent.trim(),openHref:d.querySelector('a.btn').getAttribute('href'),rows:rows.map(r=>r.textContent.trim()),again:(rows[0].getAttribute('href')||''),acts:rows.map(r=>r.dataset.act||'link'),minH:Math.min(...rows.map(r=>r.getBoundingClientRect().height))}; });
  ok(N+'the sheet: name, Open, and the five actions',sh.title==='Restock – 24 Oct'&&sh.open==='Open'&&/restock\.html\?design=seed0$/.test(sh.openHref)&&sh.rows.join('|')==='Save the picture again|Duplicate|Rename|Collections|Delete',sh);
  ok(N+'"Save the picture again" links with go=1',/restock\.html\?design=seed0&go=1$/.test(sh.again),sh.again);
  ok(N+'the sheet rows are finger-sized',sh.minH>=48,sh.minH);
  await pg.tap('#dsClose'); await pg.waitForTimeout(400);
  ok(N+'Close closes the sheet and the page scrolls again',!(await pg.locator('dialog[open]').count())&&await pg.evaluate(()=>getComputedStyle(document.documentElement).overflow)!=='hidden');
  const mr=await pg.$eval(card0+' .sv-more',e=>{ const r=e.getBoundingClientRect(); return Math.min(r.width,r.height); });
  ok(N+'the ⋯ button is at least 44px',mr>=44,mr);
  await pg.tap(card0+' .sv-more'); await pg.waitForTimeout(500);
  ok(N+'⋯ opens the same sheet',await pg.isVisible('dialog.design-dlg[open]')&&(await pg.textContent('dialog.design-dlg h3')).trim()==='Restock – 24 Oct'&&pg.url()===url0);
  /* rename */
  await pg.tap('dialog.design-dlg [data-act="rename"]'); await pg.waitForSelector('#rn',{state:'visible'});
  ok(N+'Rename shows the name in a field and a Save button',await pg.inputValue('#rn')==='Restock – 24 Oct'&&await pg.isVisible('#rnGo'));
  await pg.fill('#rn','Renamed restock'); await pg.tap('#rnGo'); await pg.waitForTimeout(900);
  const names1=await gridNames(pg);
  ok(N+'Rename: the new name shows in the grid',names1[0]==='Renamed restock'&&!names1.includes('Restock – 24 Oct')&&!(await pg.locator('dialog[open]').count()),names1.join(' | '));
  ok(N+'Rename: a toast says so',/Renamed to .Renamed restock./.test(await pg.textContent('#hubToast')||''),await pg.textContent('#hubToast'));
  ok(N+'Rename is stored (team data)',(await fdb(pg)).designs.seed0.name==='Renamed restock');
  /* collections */
  await pg.tap(card0+' .sv-more'); await pg.waitForTimeout(500); await pg.tap('dialog.design-dlg [data-act="cols"]'); await pg.waitForSelector('#dsPanel .chip[data-n="Offers"]');
  ok(N+'Collections: the design\'s own is on, the others off',await pg.getAttribute('#dsPanel .chip[data-n="Restocks"]','aria-pressed')==='true'&&await pg.getAttribute('#dsPanel .chip[data-n="Offers"]','aria-pressed')==='false');
  await pg.tap('#dsPanel .chip[data-n="Offers"]'); await pg.tap('#colsGo'); await pg.waitForTimeout(900);
  const oc=await pg.$eval('#colChips .chip[data-f="c:Offers"] i',e=>+e.textContent);
  ok(N+'Collections: the design is now in Offers too',oc===2&&JSON.stringify((await fdb(pg)).designs.seed0.cols.sort())==='["Offers","Restocks"]',oc);
  /* duplicate */
  await pg.tap(card0+' .sv-more'); await pg.waitForTimeout(500); await pg.tap('dialog.design-dlg [data-act="dup"]'); await pg.waitForTimeout(1000);
  const names2=await gridNames(pg);
  ok(N+'Duplicate adds a card',await cards()===9&&names2.includes('Renamed restock (copy)'),names2.join(' | '));
  ok(N+'Duplicate: a toast, the count and the home row follow',/Copied/.test(await pg.textContent('#hubToast')||'')&&(await pg.textContent('#spCount')).trim()==='9 designs'&&(await pg.textContent('#savedCount')).trim()==='9');
  /* delete: asks first */
  await pg.tap(card0+' .sv-more'); await pg.waitForTimeout(500); await pg.tap('dialog.design-dlg [data-act="del"]'); await pg.waitForSelector('#cfYes',{state:'visible'});
  ok(N+'Delete asks for confirmation naming the design',/Delete .Renamed restock.\?/.test(await pg.textContent('dialog[open]:has(#cfYes) h3')||'')&&await pg.isVisible('#cfNo'));
  await pg.tap('#cfNo'); await pg.waitForTimeout(400);
  ok(N+'Cancel keeps the design',await cards()===9&&!!(await fdb(pg)).designs.seed0&&!(await pg.isVisible('#cfYes')));
  await pg.tap('dialog.design-dlg [data-act="del"]'); await pg.waitForSelector('#cfYes',{state:'visible'}); await pg.tap('#cfYes'); await pg.waitForTimeout(1000);
  ok(N+'Delete removes the design',await cards()===8&&!(await gridNames(pg)).includes('Renamed restock')&&!(await fdb(pg)).designs.seed0&&!(await pg.locator('dialog[open]').count()),(await gridNames(pg)).join(' | '));
  ok(N+'Delete: a toast, and the home row follows',/deleted/.test(await pg.textContent('#hubToast')||'')&&(await pg.textContent('#savedCount')).trim()==='8');
  /* the chosen collection's ⋯ menu: Rename, Delete (asks first; the designs stay) */
  await pg.tap('#colChips .chip[data-f="c:Offers"]'); await pg.waitForTimeout(300);
  const mb=await pg.$eval('#colMore',e=>{ const r=e.getBoundingClientRect(), cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2, hit=(dx,dy)=>{ const t=document.elementFromPoint(cx+dx,cy+dy); return !!t&&(t===e||e.contains(t)); };
    return {visual:Math.round(Math.min(r.width,r.height)),hit:hit(-22,0)&&hit(22,0)&&hit(0,-22)&&hit(0,22)}; });   // the button is 36px with an invisible 48px hit area around it
  ok(N+'the collection ⋯ button is 36px+ with a 44px+ touch area',mb.visual>=36&&mb.hit,mb);
  ok(N+'the menu is closed until ⋯ is tapped',!(await pg.$('.pop-menu')));
  await pg.tap('#colMore'); await pg.waitForSelector('.pop-menu[role="menu"]',{state:'visible'});
  const pm=await pg.evaluate(()=>{ const m=document.querySelector('.pop-menu'), b=document.getElementById('colMore'), r=m.getBoundingClientRect(); return {exp:b.getAttribute('aria-expanded'),items:[...m.querySelectorAll('button')].map(x=>x.id+':'+x.textContent.trim()+(x.classList.contains('danger')?':danger':'')).join('|'),inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,minH:Math.min(...[...m.querySelectorAll('button')].map(x=>x.getBoundingClientRect().height))}; });
  ok(N+'⋯ opens a menu: Rename collection, Delete collection (danger), on screen, finger-sized',pm.exp==='true'&&pm.items==='colRename:Rename collection|colDelete:Delete collection:danger'&&pm.inside&&pm.minH>=44,pm);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  ok(N+'Escape closes the menu',!(await pg.$('.pop-menu'))&&await pg.getAttribute('#colMore','aria-expanded')==='false');
  await pg.tap('#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await pg.tap('#colMore'); await pg.waitForTimeout(300);
  ok(N+'tapping ⋯ again closes the menu',!(await pg.$('.pop-menu'))&&await pg.getAttribute('#colMore','aria-expanded')==='false');
  await pg.tap('#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await pg.tap('#savedH'); await pg.waitForTimeout(300);
  ok(N+'a tap outside closes the menu',!(await pg.$('.pop-menu'))&&await pg.getAttribute('#colMore','aria-expanded')==='false');
  await pg.tap('#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await pg.tap('#colRename'); await pg.waitForSelector('#crName',{state:'visible'});
  ok(N+'Rename collection opens the rename dialog with the current name, and the menu closes',await pg.inputValue('#crName')==='Offers'&&!(await pg.$('.pop-menu')));
  await pg.fill('#crName','Specials'); await pg.tap('dialog[open] button[type="submit"]'); await pg.waitForTimeout(900);
  ok(N+'Rename collection: the chip has the new name',JSON.stringify(await pg.$$eval('#colChips .chip.col span',l=>l.map(x=>x.textContent).sort()))==='["Restocks","Specials"]');
  await pg.tap('#colChips .chip[data-f="c:Specials"]'); await pg.waitForTimeout(300); await pg.tap('#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await pg.tap('#colDelete'); await pg.waitForSelector('#cdGo',{state:'visible'});
  ok(N+'Delete collection still asks first (nothing is deleted yet)',await pg.isVisible('#cdGo')&&await pg.isVisible('#cdX')&&JSON.stringify(await pg.$$eval('#colChips .chip.col span',l=>l.map(x=>x.textContent).sort()))==='["Restocks","Specials"]');
  await pg.tap('#cdX'); await pg.waitForTimeout(400);
  ok(N+'Cancel keeps the collection',!(await pg.locator('dialog[open]').count())&&JSON.stringify(await pg.$$eval('#colChips .chip.col span',l=>l.map(x=>x.textContent).sort()))==='["Restocks","Specials"]');
  await pg.tap('#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await pg.tap('#colDelete'); await pg.waitForSelector('#cdGo',{state:'visible'}); await pg.tap('#cdGo'); await pg.waitForTimeout(900);
  ok(N+'Delete collection: the chip goes, the designs stay',JSON.stringify(await pg.$$eval('#colChips .chip.col span',l=>l.map(x=>x.textContent)))==='["Restocks"]'&&await cards()===8&&!(await pg.$('#colMore')));
  /* tapping a card opens it in its tool */
  await pg.tap('#savedGrid .sv-card[data-id="seed1"] .sv-open'); await pg.waitForURL(/photo-story\.html\?design=seed1/,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(1500);
  ok(N+'tapping a card opens that design in its tool',/tools\/photo-story\.html\?design=seed1$/.test(pg.url())&&!(await pg.locator('dialog[open]').count()),pg.url());
  ok(N+'the design is loaded there (design bar set, team switch starts off)',await pg.evaluate(()=>!document.getElementById('designBar').hidden&&!document.getElementById('teamOn').checked)&&/Save story/.test(await pg.textContent('#saveTxt')),await pg.textContent('#saveTxt'));
  await ctx.close();
}

/* ---------- the Saved page, on a computer (right-click, hover) ---------- */
{ const vp=DESK, N='desktop: ', ctx=await mk(vp); const pg=await page(ctx,'saved page desktop');
  await fresh(pg,'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:8000}); await pg.waitForTimeout(500);
  ok(N+'Saved page: 8 cards in a grid',(await pg.$$eval('#savedGrid .sv-card',c=>c.length))===8&&await pg.evaluate(()=>{ const t=[...document.querySelectorAll('#savedGrid .sv-card')].map(c=>Math.round(c.getBoundingClientRect().top)); return new Set(t).size<8; }));
  ok(N+'the bottom bar is a phone thing (hidden here)',!(await pg.isVisible('.hubbar')));
  await pg.click('#savedGrid .sv-card[data-id="seed2"] .sv-open',{button:'right'}); await pg.waitForTimeout(500);
  ok(N+'right-click opens the actions sheet (no navigation)',await pg.isVisible('dialog.design-dlg[open]')&&(await pg.textContent('dialog.design-dlg h3')).trim()==='Offer – 22 Oct'&&/#saved$/.test(pg.url()),pg.url());
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  ok(N+'Escape closes the sheet',!(await pg.locator('dialog[open]').count()));
  await pg.click('#savedGrid .sv-card[data-id="seed2"] .sv-open'); await pg.waitForURL(/offer\.html\?design=seed2/,{timeout:8000}).catch(()=>{});
  ok(N+'a click opens the design in its tool',/tools\/offer\.html\?design=seed2$/.test(pg.url()),pg.url());
  await ctx.close();
}

/* ---------- the bottom bar (phone) ---------- */
{ const vp=PHONE, N='phone: ', ctx=await mk(vp); const pg=await page(ctx,'bottom bar');
  await fresh(pg);
  const bar=async()=>pg.evaluate(()=>{ const cur=document.querySelector('.hubbar a[aria-current="true"]'), pill=document.querySelector('.hubbar .pill').getBoundingClientRect();
    const sv=cur.querySelector('svg.ic-on').getBoundingClientRect(), sp=cur.querySelector('span').getBoundingClientRect(); const topIcon=sv.top, bottomLabel=sp.bottom;
    return {tab:cur.dataset.tab,current:[...document.querySelectorAll('.hubbar a')].map(a=>a.dataset.tab+':'+a.getAttribute('aria-current')).join(),
      inside:sv.top>=pill.top-.5&&sv.bottom<=pill.bottom+.5&&sp.top>=pill.top-.5&&sp.bottom<=pill.bottom+.5&&sv.left>=pill.left-.5&&sv.right<=pill.right+.5&&sp.left>=pill.left-.5&&sp.right<=pill.right+.5,
      dy:Math.abs((topIcon+bottomLabel)/2-(pill.top+pill.bottom)/2), dxLabel:Math.abs((sp.left+sp.right)/2-(pill.left+pill.right)/2), dxIcon:Math.abs((sv.left+sv.right)/2-(pill.left+pill.right)/2),
      pill:[pill.width,pill.height].map(Math.round).join('x'), tabH:Math.round(cur.getBoundingClientRect().height)}; });
  let g=await bar();
  ok(N+'Home: aria-current is on the Home tab only',g.current==='home:true,saved:false',g.current);
  ok(N+'Home: the highlight holds the icon and the label',g.inside,g);
  ok(N+'Home: icon + label are centred in the highlight (≤2px)',g.dy<=2&&g.dxLabel<=2&&g.dxIcon<=2,g);
  ok(N+'the tabs are finger-sized',g.tabH>=48,g.tabH);
  await pg.tap('.hubbar a[data-tab="saved"]'); await pg.waitForTimeout(900);
  g=await bar();
  ok(N+'Saved: the tab is current and the Saved page shows',g.current==='home:false,saved:true'&&JSON.stringify(await homeShown(pg))==='{"home":false,"saved":true}',g.current);
  ok(N+'Saved: the highlight holds the icon and the label',g.inside,g);
  ok(N+'Saved: icon + label are centred in the highlight (≤2px)',g.dy<=2&&g.dxLabel<=2&&g.dxIcon<=2,g);
  await pg.goBack(); await pg.waitForTimeout(900);
  g=await bar();
  ok(N+'Back: the Home tab is current again, highlight still centred',g.current==='home:true,saved:false'&&g.inside&&g.dy<=2&&g.dxLabel<=2,g);
  await pg.tap('.hubbar a[data-tab="saved"]'); await pg.waitForTimeout(600); await pg.tap('.hubbar a[data-tab="home"]'); await pg.waitForTimeout(900);
  g=await bar();
  ok(N+'the Home tab returns home',g.current==='home:true,saved:false'&&JSON.stringify(await homeShown(pg))==='{"home":true,"saved":false}'&&g.inside&&g.dy<=2,g);
  await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1200); g=await bar();
  ok(N+'opening #saved directly puts the highlight on Saved, centred',g.tab==='saved'&&g.inside&&g.dy<=2&&g.dxLabel<=2,g);
  await ctx.close();
}

/* ---------- the page behind a pop-up cannot scroll ---------- */
for(const vp of [PHONE,DESK]){
  const N=vp.name+': ', ctx=await mk(vp); const pg=await page(ctx,vp.name+' scroll lock'); const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  const cdp=vp.touch?await ctx.newCDPSession(pg):null;
  /* a real finger swipe through CDP touch events (Input.synthesizeScrollGesture does nothing in headless Chromium): up by dy scrolls down */
  const scrollBy=async dy=>{ if(vp.touch){ const x=195, y0=730, n=12; await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]});
      for(let i=1;i<=n;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0-Math.round(dy*i/n)}]}); await pg.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
    else { await pg.mouse.move(640,400); await pg.mouse.wheel(0,dy); } await pg.waitForTimeout(600); };
  const Y=()=>pg.evaluate(()=>Math.round(scrollY));
  await fresh(pg);
  await pg.evaluate(()=>localStorage.setItem('studio:pins',JSON.stringify(Object.keys(Studio.lab.TOOLS)))); await pg.reload(); await pg.waitForTimeout(900);
  ok(N+'the home page is tall enough to scroll',await pg.evaluate(()=>document.documentElement.scrollHeight>innerHeight+300));
  await pg.evaluate(()=>scrollTo(0,300)); await pg.waitForTimeout(200);
  ok(N+'scrolled down a bit',await Y()>=250,await Y());
  await tap('#allTools'); await pg.waitForTimeout(500); const y0=await Y();   // (tapping may scroll the button into view first: measure once the dialog is open)
  ok(N+'All tools opens and locks the page (scroll-lock + overflow hidden)',await pg.isVisible('dialog.lib-dlg[open]')&&await pg.evaluate(()=>document.documentElement.classList.contains('scroll-lock')&&getComputedStyle(document.documentElement).overflow==='hidden'));
  const inner0=await pg.evaluate(()=>{ const l=document.querySelector('dialog.lib-dlg .lib-list'), d=document.querySelector('dialog.lib-dlg'); return [l.scrollTop,d.scrollTop,document.querySelector('dialog.lib-dlg .dlg-body').scrollTop]; });
  await scrollBy(vp.touch?500:900); await scrollBy(vp.touch?500:900); await scrollBy(vp.touch?500:900);
  ok(N+'scrolling inside the dialog does not move the page behind',await Y()===y0,await Y()+' vs '+y0);
  const inner1=await pg.evaluate(()=>{ const l=document.querySelector('dialog.lib-dlg .lib-list'), d=document.querySelector('dialog.lib-dlg'); return [l.scrollTop,d.scrollTop,document.querySelector('dialog.lib-dlg .dlg-body').scrollTop]; });
  ok(N+'(the dialog itself does scroll)',inner1.some((v,i)=>v>inner0[i]),{inner0,inner1});
  await tap('#libDone'); await pg.waitForTimeout(500);
  ok(N+'after closing, the lock is gone',await pg.evaluate(()=>!document.documentElement.classList.contains('scroll-lock')&&getComputedStyle(document.documentElement).overflow!=='hidden'));
  await pg.evaluate(()=>scrollTo(0,300)); await pg.waitForTimeout(200); const y1=await Y();
  await scrollBy(vp.touch?400:400);
  ok(N+'after closing, the page scrolls again',await Y()>y1,y1+' → '+await Y());
  if(vp.touch){
    await pg.evaluate(()=>scrollTo(0,300)); await pg.waitForTimeout(200);
    await pg.tap('#uq'); await pg.waitForTimeout(600); const y2=await Y();   // (the search may scroll to the top as it opens: measure after)
    ok(N+'the full-screen search locks the page too',await pg.evaluate(()=>getComputedStyle(document.documentElement).overflow)==='hidden');
    await scrollBy(600);
    ok(N+'scrolling over the search does not move the page',await Y()===y2,await Y()+' vs '+y2);
    await pg.tap('#usCancel'); await pg.waitForTimeout(500);
    ok(N+'closing the search frees the page',await pg.evaluate(()=>getComputedStyle(document.documentElement).overflow)!=='hidden');
  }
  await ctx.close();
}

/* ---------- the Save sheet (tool page) ---------- */
{ const vp=PHONE, N='phone: ', ctx=await mk(vp); const pg=await page(ctx,'save sheet');
  const dls=[]; pg.on('download',d=>dls.push(d));
  const savedNow=async()=>Object.values((await fdb(pg)).designs).filter(d=>!/^seed\d/.test(d.id));
  const sheetOpen=async()=>{ await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}); await pg.waitForTimeout(500); };
  const teamReady=()=>pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).then(()=>true,()=>false);
  await fresh(pg); await pg.evaluate(()=>localStorage.setItem('studio:lastCols:1stchoice','["Restocks"]'));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900);
  await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1500);
  ok(N+'before the bar Save: the Save sheet is closed',!(await pg.isVisible('#sh-save')));
  await sheetOpen();
  ok(N+'bar Save opens the Save sheet',await pg.isVisible('#sh-save'));
  ok(N+'...without making a picture',!dls.length&&!(await pg.isVisible('#doneBox'))&&!(await pg.isVisible('#progress'))&&!(await pg.isVisible('#result')));
  ok(N+'the team switch is on (signed in)',await teamReady()&&await pg.isChecked('#teamOn'));
  const nm=await pg.inputValue('#teamName');
  ok(N+'the name is filled in: tool title – day month',/^Restock – \d{1,2} [A-Z][a-z]{2}$/.test(nm),nm);
  ok(N+'the button reads "Save & add to team"',(await pg.textContent('#saveTxt')).trim()==='Save & add to team',await pg.textContent('#saveTxt'));
  const chips=await pg.$$eval('#teamCols .chip[data-col]',l=>l.map(c=>c.dataset.col+':'+c.getAttribute('aria-pressed')).sort());
  ok(N+'collections: the one used last (Restocks) is preselected, Offers is not',JSON.stringify(chips)==='["Offers:false","Restocks:true"]',chips);
  ok(N+'collections sit in the sheet, not under More options',await pg.isVisible('#teamCols')&&!(await pg.isVisible('#teamMoreBox'))&&!(await pg.$('#teamMoreBox #teamCols')));
  await pg.tap('#teamMore'); await pg.waitForTimeout(300);
  ok(N+'More options holds only "Keep the photos" and "Save as new"',await pg.isVisible('#teamMoreBox #teamKeep')&&(await pg.$$eval('#teamMoreBox input',l=>l.map(x=>x.id))).join()==='teamKeep,teamAsNew');
  await pg.tap('#teamCols [data-newcol]'); await pg.waitForTimeout(300);
  ok(N+'"New" reveals a field to type a collection',await pg.isVisible('#teamNewRow')&&await pg.isVisible('#teamNewCol')&&await pg.isVisible('#teamAddCol'));
  await pg.fill('#teamNewCol','Spring'); await pg.tap('#teamAddCol'); await pg.waitForTimeout(300);
  ok(N+'the new collection joins the chips, picked',await pg.getAttribute('#teamCols .chip[data-col="Spring"]','aria-pressed')==='true'&&!(await pg.isVisible('#teamNewRow')));
  await pg.tap('#save');
  for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:20000}).catch(()=>{});
  let size=''; if(dls[0]){ const f=os.tmpdir()+'/h7-'+dls[0].suggestedFilename(); await dls[0].saveAs(f); size=pngSize(f); }
  ok(N+'one tap on Save makes the 2× PNG (2160×3840)',dls.length===1&&size==='2160x3840',dls.length+' · '+size);
  ok(N+'the done box says "Saved!"',await pg.isVisible('#doneBox')&&(await pg.textContent('#doneTitle')).trim()==='Saved!',await pg.textContent('#doneTitle'));
  ok(N+'the team line says "Saved to the team as …"',/Saved to the team as/.test(await pg.textContent('#teamStatus')||''),await pg.textContent('#teamStatus'));
  const nd=await savedNow();
  ok(N+'the team now has a new design in Restocks (and Spring)',nd.length===1&&nd[0].tool==='restock'&&nd[0].name===nm&&nd[0].cols.includes('Restocks')&&nd[0].cols.includes('Spring'),nd.map(d=>d.name+' '+d.cols));
  ok(N+'the page is now that saved design (?design=)',/\?design=/.test(pg.url()));
  ok(N+'afterwards the button says "Save again" and the switch is off',(await pg.textContent('#saveTxt')).trim()==='Save again'&&!(await pg.isChecked('#teamOn')),await pg.textContent('#saveTxt'));
  ok(N+'the collections used are remembered for next time',JSON.stringify(await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:lastCols:1stchoice')).sort()))==='["Restocks","Spring"]');
  /* an open saved design: the switch starts OFF (never overwrite by accident); switching it on offers Save & update */
  const did=nd[0]&&nd[0].id;
  await pg.goto(BASE+'tools/restock.html?design='+did); await pg.waitForTimeout(2600);
  ok(N+'a saved design is open (design bar set)',await pg.evaluate(()=>!document.getElementById('designBar').hidden)&&/\?design=/.test(pg.url()));
  ok(N+'...and the team switch is OFF, even after the quiet check',!(await pg.isChecked('#teamOn')));
  await sheetOpen();
  ok(N+'...also when the sheet opens: still off, button "Save story"',!(await pg.isChecked('#teamOn'))&&(await pg.textContent('#saveTxt')).trim()==='Save story',await pg.textContent('#saveTxt'));
  ok(N+'...with the design\'s own name in the name field',await pg.inputValue('#teamName')===nm,await pg.inputValue('#teamName'));
  await pg.tap('#sh-save .team-row'); await pg.waitForTimeout(500);
  ok(N+'switching it on gives "Save & update"',await pg.isChecked('#teamOn')&&(await pg.textContent('#saveTxt')).trim()==='Save & update',await pg.textContent('#saveTxt'));
  ok(N+'the design\'s own collections are preselected',JSON.stringify(await pg.$$eval('#teamCols .chip[data-col][aria-pressed="true"]',l=>l.map(c=>c.dataset.col).sort()))==='["Restocks","Spring"]');
  const nBefore=Object.keys((await fdb(pg)).designs).length; dls.length=0;
  await pg.tap('#save'); for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:20000}).catch(()=>{});
  ok(N+'Save & update changes the same design (no extra one) and makes a picture',Object.keys((await fdb(pg)).designs).length===nBefore&&dls.length===1&&/Saved to the team/.test(await pg.textContent('#teamStatus')||''));
  /* the bar Save, tapped again while the sheet is open, saves */
  await fresh(pg,'tools/restock.html'); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1500); dls.length=0;
  await sheetOpen(); await teamReady();
  await pg.tap('#barSave'); for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:20000}).catch(()=>{});
  ok(N+'bar Save again while the sheet is open saves (picture + team)',dls.length===1&&await pg.isVisible('#doneBox')&&/Saved to the team/.test(await pg.textContent('#teamStatus')||''));
  /* "Only save to the team (no picture)" */
  await fresh(pg,'tools/restock.html'); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1500); dls.length=0;
  await sheetOpen(); await teamReady();
  const before=Object.keys((await fdb(pg)).designs).length;
  ok(N+'"Only save to the team" is offered',await pg.isVisible('#teamOnly'));
  await pg.tap('#teamOnly'); await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:20000}).catch(()=>{}); await pg.waitForTimeout(500);
  ok(N+'"Only save to the team" saves the design and makes no picture',Object.keys((await fdb(pg)).designs).length===before+1&&!dls.length&&!(await pg.isVisible('#doneBox'))&&/\?design=/.test(pg.url()));
  /* a remembered collection that is gone is dropped (the team has collections); a team without collections keeps it */
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.setItem('studio:lastCols:1stchoice','["Gone","Offers"]'));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await sheetOpen(); await teamReady(); await pg.waitForTimeout(500);
  const ch2=await pg.$$eval('#teamCols .chip[data-col]',l=>l.map(c=>c.dataset.col+':'+c.getAttribute('aria-pressed')).sort());
  ok(N+'a remembered collection that no longer exists is dropped; the one that does stays picked',JSON.stringify(ch2)==='["Offers:true","Restocks:false"]',ch2);
  await ctx.close();
  const ctx2=await mk(vp,{seed:false}); const p2=await page(ctx2,'save sheet, no collections');
  await p2.goto(BASE+'index.html'); await p2.evaluate(()=>localStorage.setItem('studio:lastCols:1stchoice','["Gone"]'));
  await p2.goto(BASE+'tools/restock.html'); await p2.waitForTimeout(1500); await p2.tap('#barSave'); await p2.waitForSelector('#sh-save.open'); await p2.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).catch(()=>{}); await p2.waitForTimeout(600);
  ok(N+'when the team has no collections at all, the remembered one stays picked',await p2.getAttribute('#teamCols .chip[data-col="Gone"]','aria-pressed')==='true');
  await ctx2.close();
}

/* ---------- the Save card on a computer ---------- */
{ const vp=DESK, N='desktop: ', ctx=await mk(vp); const pg=await page(ctx,'save card desktop'); const dls=[]; pg.on('download',d=>dls.push(d));
  await fresh(pg); await pg.evaluate(()=>localStorage.setItem('studio:lastCols:1stchoice','["Restocks"]'));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900);
  await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1800);
  ok(N+'the Save card is always visible',await pg.isVisible('#sh-save')&&await pg.isVisible('#save'));
  ok(N+'the team switch is on, name and collection are ready',await pg.isChecked('#teamOn')&&/^Restock – /.test(await pg.inputValue('#teamName'))&&await pg.getAttribute('#teamCols .chip[data-col="Restocks"]','aria-pressed')==='true');
  ok(N+'the button reads "Save & add to team"',(await pg.textContent('#saveTxt')).trim()==='Save & add to team');
  await pg.click('#save'); for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:20000}).catch(()=>{});
  let size=''; if(dls[0]){ const f=os.tmpdir()+'/h7d-'+dls[0].suggestedFilename(); await dls[0].saveAs(f); size=pngSize(f); }
  const fresh1=Object.values((await fdb(pg)).designs).filter(d=>!/^seed\d/.test(d.id));
  ok(N+'one click saves the 2× PNG and the design to the team',dls.length===1&&size==='2160x3840'&&fresh1.length===1&&fresh1[0].cols.includes('Restocks')&&await pg.isVisible('#doneBox'),{n:dls.length,size,cols:fresh1.map(d=>d.cols)});
  ok(N+'then the button says "Save again" and the switch is off',(await pg.textContent('#saveTxt')).trim()==='Save again'&&!(await pg.isChecked('#teamOn')));
  await ctx.close();
}

await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const nf=res.filter(r=>r.startsWith('FAIL')).length; console.log(nf?nf+' FAILED':'ALL '+res.length+' PASSED'); process.exit(nf?1:0);

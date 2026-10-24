/* Studio 0.1.0 checks: Quick start on the hub (photo first, the tool opens with it in, as a new draft),
   the What's New page (hero card, closed groups, filters, screenshots from studio-notes/changelog.md; error state) and its badge on the hub.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:2,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const real=()=>pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length);
  /* since 0.6.0 Start from a photo shows pinned tools only: pin the three photo-first tools (what a phone that used Studio before gets) */
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:pins','["restock","photo-story","collage"]'); }); await pg.reload(); await pg.waitForTimeout(800);
  ok(vp.name+': Quick start shows Restock first',await pg.isVisible('#quickSec')&&(await pg.textContent('.qbtn:first-child b'))==='Restock');
  const tb=await pg.$$eval('.qbtn',l=>l.map(x=>x.getBoundingClientRect()).every(r=>r.height>=48&&r.width>=48&&r.right<=innerWidth+1));
  ok(vp.name+': Quick start buttons are finger-sized and fit the screen',tb);
  ok(vp.name+': What\'s New dot shows for a new version',await pg.evaluate(()=>document.getElementById('wnBtn').classList.contains('has-new')));
  await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]); await pg.waitForTimeout(2500);
  ok(vp.name+': Restock opens with the photo in',await real()===1);
  ok(vp.name+': it is a new draft, no old-draft banner',!!(await pg.evaluate(()=>Studio.debug.draftId()))&&!(await pg.isVisible('#draftBar')));
  await pg.reload(); await pg.waitForTimeout(2000);
  ok(vp.name+': reload keeps the photo (draft saved)',await real()===1);
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
  await Promise.all([pg.waitForURL(/collage\.html/),pg.setInputFiles('input[data-quick="collage"]',[S+'pair.jpg',S+'hand.jpg',S+'shelf.jpg'])]); await pg.waitForTimeout(3000);
  ok(vp.name+': Collage takes 3 photos and sets 3 boxes',await real()===3&&await pg.evaluate(()=>Studio.debug.S.count)===3);
  await pg.goto(BASE+'tools/restock.html?quick=1'); await pg.waitForTimeout(1500);
  ok(vp.name+': ?quick=1 with nothing waiting is harmless',await real()===0&&!/quick/.test(pg.url()));
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(600);
  ok(vp.name+': both quick drafts are in Continue editing',await pg.locator('.ccard').count()===2);
  /* ---- What's New page: hero card, closed groups, filters, screenshots (expected numbers come from the changelog itself) ---- */
  const md=fs.readFileSync(new URL('../studio-notes/changelog.md',import.meta.url),'utf8');
  const vers=md.split(/^## /m).slice(1).map(sec=>{ const [h,...rest]=sec.split('\n'); return {version:h.split(' · ')[0].trim(), cards:rest.join('\n').split(/^### /m).slice(1).map(c=>({title:c.split('\n')[0].trim(), type:((/^type:\s*(\w+)/mi.exec(c)||[])[1]||'feature').toLowerCase()}))}; });
  const allCards=vers.flatMap(v=>v.cards), olderCards=vers.slice(1).flatMap(v=>v.cards);
  const cnt=t=>allCards.filter(c=>c.type===t).length;
  const cerr=[]; const onCon=m=>{ if(m.type()==='error'&&!/fonts\.g/.test(m.location().url||''))cerr.push(m.text()+' '+(m.location().url||'')); }; pg.on('console',onCon);
  const imgsLoaded=sel=>pg.$$eval(sel,l=>l.filter(i=>i.complete&&i.naturalWidth>0).length);
  await pg.click('#wnBtn'); await pg.waitForURL(/whats-new/); await pg.waitForSelector('.wn-latest .wn-card'); await pg.waitForTimeout(700);
  /* hero: the newest version, big, with all its cards */
  ok(vp.name+': hero card shows "Latest" and the newest version',(await pg.textContent('.wn-latest .wn-badge')).replace(/\s+/g,' ').includes('Latest')&&(await pg.textContent('.wn-latest .wn-badge')).includes(vers[0].version));
  ok(vp.name+': hero holds every update of the newest version',await pg.locator('.wn-latest .wn-card').count()===vers[0].cards.length&&(await pg.textContent('.wn-latest .wn-card .wn-ct'))===vers[0].cards[0].title,vers[0].cards.length+' cards');
  ok(vp.name+': the hero is the first thing under the chips',await pg.evaluate(()=>{ const h=document.querySelector('.wn-latest').getBoundingClientRect(),c=document.querySelector('.wn-filters').getBoundingClientRect(); return h.top>=c.bottom-1&&h.width>Math.min(innerWidth,720)*.85; }));
  ok(vp.name+': no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  /* groups: closed by default, screenshots inside them wait */
  const nGroups=await pg.locator('details.wn-group').count();
  const labels=await pg.$$eval('.wn-glab',l=>l.map(x=>x.textContent.trim()));
  ok(vp.name+': older versions sit in groups of five minors',nGroups>=1&&labels.every(l=>/^\d+\.\d+( – \d+\.\d+)?$/.test(l))&&labels.some(l=>l.startsWith('0.1')),labels.join(' | '));
  ok(vp.name+': groups are closed by default',await pg.$$eval('details.wn-group',l=>l.every(d=>!d.open)));
  ok(vp.name+': group rows are finger-sized and say how many updates',await pg.$$eval('.wn-gsum',l=>l.every(s=>s.getBoundingClientRect().height>=56&&/\d+ updates?/.test(s.textContent))));
  ok(vp.name+': closed groups hide their cards',await pg.locator('details.wn-group .wn-card').first().isVisible()===false);
  ok(vp.name+': closed groups load no screenshots yet',await imgsLoaded('details.wn-group img')===0);
  /* open one group */
  await pg.locator('.wn-gsum').first().click(); await pg.waitForTimeout(600);
  const g0=await pg.locator('details.wn-group').first();
  ok(vp.name+': opening a group shows its cards',await g0.evaluate(d=>d.open)&&await g0.locator('.wn-card').first().isVisible()&&await g0.locator('.wn-card').count()>=1);
  ok(vp.name+': the other groups stay closed',await pg.$$eval('details.wn-group',l=>l.slice(1).every(d=>!d.open)));
  /* filters */
  ok(vp.name+': filter chips are finger-sized buttons with counts',await pg.$$eval('.wn-f',l=>l.length>=2&&l.every(b=>b.getBoundingClientRect().height>=48&&b.hasAttribute('aria-pressed')&&/\d/.test(b.textContent))));
  const chipTxt=await pg.$$eval('.wn-f',l=>l.map(b=>b.textContent.replace(/\s+/g,' ').trim()));
  ok(vp.name+': chips count each kind (and no chip for an empty kind)',chipTxt[0]==='All'+allCards.length&&[['feature','New features'],['fix','Fixes'],['design','Design']].every(([t,l])=>cnt(t)?chipTxt.includes(l+cnt(t)):!chipTxt.some(x=>x.startsWith(l))),chipTxt.join(' | '));
  const open0=await pg.$$eval('details.wn-group',l=>l.map(d=>d.open));
  const shownCards=()=>pg.$$eval('.wn-card:not([hidden])',l=>l.map(c=>c.dataset.type));
  await pg.click('.wn-f[data-filter="fix"]'); await pg.waitForTimeout(600);
  const fx=await shownCards();
  ok(vp.name+': Fixes shows only fix cards',fx.length===cnt('fix')&&fx.every(t=>t==='fix'),fx.length+' of '+cnt('fix'));
  ok(vp.name+': the pressed chip is marked',await pg.getAttribute('.wn-f[data-filter="fix"]','aria-pressed')==='true'&&await pg.getAttribute('.wn-f[data-filter="all"]','aria-pressed')==='false');
  ok(vp.name+': groups with no match are hidden, groups with a match open',await pg.$$eval('details.wn-group',l=>l.every(d=>{ const has=!!d.querySelector('.wn-card:not([hidden])'); return d.hidden===!has&&(!has||d.open); })));
  ok(vp.name+': a matching card in a group is on screen',cnt('fix')===0||await pg.evaluate(()=>{ const c=[...document.querySelectorAll('details.wn-group .wn-card:not([hidden])')][0]; if(!c)return true; const r=c.getBoundingClientRect(); return r.height>20; }));
  await pg.click('.wn-f[data-filter="design"]'); await pg.waitForTimeout(500);
  const dz=await shownCards(); ok(vp.name+': Design shows only design cards',dz.length===cnt('design')&&dz.every(t=>t==='design'),dz.length+' of '+cnt('design'));
  await pg.click('.wn-f[data-filter="all"]'); await pg.waitForTimeout(600);
  ok(vp.name+': All brings every card back',(await shownCards()).length===allCards.length&&await pg.$$eval('details.wn-group',l=>l.every(d=>!d.hidden))&&await pg.$eval('.wn-latest',h=>!h.hidden));
  ok(vp.name+': groups are back to how the reader left them',JSON.stringify(await pg.$$eval('details.wn-group',l=>l.map(d=>d.open)))===JSON.stringify(open0));
  /* open every group, scroll through: every screenshot loads */
  await pg.evaluate(()=>document.querySelectorAll('details.wn-group').forEach(d=>d.open=true)); await pg.waitForTimeout(600);
  ok(vp.name+': every update is in the page',await pg.locator('.wn-card').count()===allCards.length,allCards.length+' updates');
  await pg.evaluate(async()=>{ for(let y=0;y<=document.documentElement.scrollHeight;y+=400){ scrollTo(0,y); await new Promise(r=>setTimeout(r,60)); } }); await pg.waitForTimeout(1200);
  ok(vp.name+': screenshots load',await pg.$$eval('.wn-card img',l=>l.length>0&&l.every(i=>i.complete&&i.naturalWidth>0)));
  ok(vp.name+': still no sideways scroll with everything open',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(200);
  /* the big screenshot */
  await pg.locator('.wn-latest .wn-shot').first().click(); await pg.waitForTimeout(300);
  ok(vp.name+': a screenshot opens large',await pg.evaluate(()=>document.getElementById('wnDlg').open));
  ok(vp.name+': the page behind cannot scroll while it is open',await pg.evaluate(()=>getComputedStyle(document.documentElement).overflow==='hidden'));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  ok(vp.name+': Escape closes it and the page scrolls again',await pg.evaluate(()=>!document.getElementById('wnDlg').open&&getComputedStyle(document.documentElement).overflow!=='hidden'));
  await pg.locator('.wn-latest .wn-shot').first().click(); await pg.waitForTimeout(200); await pg.click('#wnClose'); await pg.waitForTimeout(200);
  ok(vp.name+': the Close button closes it',await pg.evaluate(()=>!document.getElementById('wnDlg').open));
  ok(vp.name+': seen version is saved (the dot on the hub goes away)',await pg.evaluate(()=>localStorage.getItem('studio:seenVersion'))===JSON.stringify(vers[0].version));
  pg.off('console',onCon); ok(vp.name+': What\'s New has no console errors',!cerr.length,cerr.join(' | '));
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
  ok(vp.name+': dot is gone after reading',!(await pg.evaluate(()=>document.getElementById('wnBtn').classList.contains('has-new'))));
  await pg.route(/changelog\.md/,r=>r.abort()); await pg.goto(BASE+'whats-new.html'); await pg.waitForTimeout(800);
  ok(vp.name+': offline changelog shows a friendly error with Retry',await pg.isVisible('.wn-err button'));
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(f?f+' failed':'all pass'); process.exit(f?1:0);

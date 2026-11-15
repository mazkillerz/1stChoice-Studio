/* Studio 0.1.0 checks (What's New part rewritten for the grouped page): Quick start on the hub (photo first, via the camera button on a tool row; the tool opens with it in, as a new draft),
   the What's New page (one level: open hero card, one-tap version rows, jump bar + All versions sheet, filters, screenshots from studio-notes/changelog.md; error state) and its badge on the hub.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };

/* ---- What's New expectations from the changelog ---- */
const TYPE={feature:'feature',features:'feature',new:'feature',fix:'fix',fixes:'fix',fixed:'fix',design:'improve',improve:'improve',improved:'improve'};
const md=fs.readFileSync(new URL('../studio-notes/changelog.md',import.meta.url),'utf8');
const vers=md.split(/^## /m).slice(1).map(sec=>{ const [h,...rest]=sec.split('\n'); const body=rest.join('\n'); const [lead]=body.split(/^### /m);
  return {version:h.split(' · ')[0].trim(), lead:lead.split('\n').map(x=>x.trim()).filter(x=>x&&!/^milestone:/i.test(x)&&!/^\[try:/i.test(x)).join(' ').replace(/\*\*/g,''),
    cards:body.split(/^### /m).slice(1).map(c=>({title:c.split('\n')[0].trim(), type:TYPE[((/^type:\s*(\w+)/mi.exec(c)||[])[1]||'feature').toLowerCase()]||'feature', shot:/^!\[(before|after)\]/m.test(c), note:(c.split('\n').slice(1).find(l=>l.trim()&&!/^(type:|!\[|\[flag:|\[try:)/i.test(l.trim()))||'').trim()}))}; });
const allCards=vers.flatMap(v=>v.cards);
const cnt=(t,list=allCards)=>list.filter(c=>c.type===t).length;
const N=vers[0], noOverflow=pg=>pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
async function wnChecks(pg,tag){
  const q=sel=>pg.locator(sel);
  /* hero: newest version + summary */
  const badge=(await pg.textContent('.wn-latest .wn-badge')).replace(/\s+/g,' ');
  ok(tag+': hero card shows "Latest" and the newest version',badge.includes('Latest')&&badge.includes(N.version),badge);
  const sum=(await pg.textContent('.wn-latest .wn-lintro').catch(()=>''))||'';
  const expect=N.lead||N.cards.map(c=>c.title).join(' · ');
  ok(tag+': hero shows the summary (lead line, else the titles joined)',!expect||sum.replace(/\s+/g,' ').trim()===expect.replace(/\s+/g,' ').trim(),sum.slice(0,60));
  ok(tag+': hero is under the jump bar and the chips, full width',await pg.evaluate(()=>{ const h=document.querySelector('.wn-latest').getBoundingClientRect(),c=document.querySelector('.wn-filters').getBoundingClientRect(); return h.top>=c.bottom-1&&h.width>Math.min(innerWidth,720)*.85; }));
  ok(tag+': hero lists every change of the newest version',await q('.wn-latest .wn-line').count()===N.cards.length,N.cards.length+' lines');
  for(const [t,label] of [['feature','New'],['improve','Improved'],['fix','Fixed']]){
    const want=cnt(t,N.cards), has=await q('.wn-latest .wn-grp[data-type="'+t+'"]').count();
    ok(tag+': group '+label+' '+(want?'has '+want+' lines':'is absent when empty'),want?(has===1&&await q('.wn-latest .wn-grp[data-type="'+t+'"] .wn-line').count()===want&&(await pg.textContent('.wn-latest .wn-grp[data-type="'+t+'"] .wn-gh')).includes(label)&&await q('.wn-latest .wn-grp[data-type="'+t+'"] .wn-gi svg').count()===1):has===0);
  }
  /* the newest version is fully open: every note visible, no expanders */
  ok(tag+': latest version is open: every note is visible',await pg.$$eval('.wn-latest .wn-line',l=>l.every(x=>{ const n=x.querySelector('.wn-ln'); return !n||(n.getBoundingClientRect().height>10&&getComputedStyle(n).visibility==='visible'); })));
  const withShot=q('.wn-latest .wn-line:has(.wn-fig)').first();
  if(await withShot.count()){
    await withShot.locator('.wn-fig img').first().scrollIntoViewIfNeeded(); await pg.waitForTimeout(500);
    ok(tag+': a screenshot in the latest version shows without a tap',await withShot.locator('.wn-fig img').first().evaluate(i=>i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().height>40));
  }
  ok(tag+': titles and notes are dir=auto',await pg.$$eval('.wn-lt,.wn-ln',l=>l.length>0&&l.every(x=>x.getAttribute('dir')==='auto')));
  ok(tag+': no per-change expanders and no blocks anywhere',await pg.evaluate(()=>!document.querySelector('.wn-block,.wn-bbtn,.wn-lbtn,details,summary,.wn-line [aria-expanded],.wn-latest [aria-expanded]')));
  /* older versions: one row each, closed, built lazily */
  const rows=q('.wn-ver');
  ok(tag+': every older version is one row ('+(vers.length-1)+')',await rows.count()===vers.length-1);
  ok(tag+': rows are closed by default, finger-sized, and hold no body yet (built on first open)',await pg.$$eval('.wn-vbtn',l=>l.every(b=>b.getAttribute('aria-expanded')==='false'&&b.getBoundingClientRect().height>=56))&&await pg.$$eval('.wn-xi',l=>l.every(x=>!x.firstChild)));
  ok(tag+': closed rows load no screenshots',await pg.$$eval('.wn-ver img',l=>l.length)===0);
  const withShots=vers.slice(1).find(v=>v.cards.some(c=>c.shot)&&v.cards.length>=1)||vers[1];
  const first=vers[1], v0=q('#v-'+CSS_ESC(first.version)), vb=v0.locator('.wn-vbtn');
  ok(tag+': a row shows version, date, one-line summary and count chips',await v0.locator('.wn-vnum').textContent()===first.version&&await v0.locator('.wn-vsum').count()===1&&await v0.locator('.wn-cc').count()===['feature','improve','fix'].filter(t=>cnt(t,first.cards)).length);
  await v0.scrollIntoViewIfNeeded();
  await vb.click(); await pg.waitForTimeout(400);
  ok(tag+': ONE tap opens an older version and shows every change with its note',await vb.getAttribute('aria-expanded')==='true'&&await v0.locator('.wn-line').count()===first.cards.length&&await v0.locator('.wn-line:visible').count()===first.cards.length&&await v0.locator('.wn-ln:visible').count()===first.cards.filter(c=>c.note).length&&await v0.locator('.wn-gi svg').count()>=1);
  /* a version with screenshots: they are all there after one tap, before/after side by side */
  const sv=vers.slice(1).find(v=>v.cards.some(c=>c.shot));
  if(sv){
    const r=q('#v-'+CSS_ESC(sv.version)); await r.scrollIntoViewIfNeeded(); if(await r.locator('.wn-vbtn').getAttribute('aria-expanded')!=='true') await r.locator('.wn-vbtn').click(); await pg.waitForTimeout(450);   // it may be the row opened above
    const want=(md.split(/^## /m).slice(1).find(s=>s.startsWith(sv.version+' '))||'').split('\n').filter(l=>/^!\[(before|after)\]/i.test(l.trim())).length;
    await r.locator('.wn-fig img').last().scrollIntoViewIfNeeded(); await pg.waitForTimeout(600);
    ok(tag+': '+sv.version+' opens with all its screenshots ('+want+') loaded',await r.locator('.wn-fig').count()===want&&await r.locator('.wn-fig img').evaluateAll(l=>l.every(i=>i.complete&&i.naturalWidth>0)));
    const pair=r.locator('.wn-shots.two').first();
    if(await pair.count()){ ok(tag+': before and after sit side by side',await pair.evaluate(g=>{ const f=g.querySelectorAll('.wn-fig'); const a=f[0].getBoundingClientRect(),b2=f[1].getBoundingClientRect(); return Math.abs(a.top-b2.top)<2&&b2.left>a.left; })); }
    await r.locator('.wn-shot').first().click(); await pg.waitForTimeout(300);
    ok(tag+': a screenshot opens large',await pg.evaluate(()=>document.getElementById('wnDlg').open));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
    ok(tag+': Escape closes it',await pg.evaluate(()=>!document.getElementById('wnDlg').open));
    ok(tag+': no expanders inside an opened version',await r.evaluate(e=>!e.querySelector('details,summary,.wn-line [aria-expanded],.wn-grp [aria-expanded],.wn-x')||e.querySelectorAll('.wn-x').length===1));
  }
  ok(tag+': an open version has no nested expander (only its own row button)',await pg.evaluate(()=>[...document.querySelectorAll('.wn-ver')].every(v=>v.querySelectorAll('[aria-expanded]').length===1)));
  await vb.click(); await pg.waitForTimeout(400);
  ok(tag+': tapping the row again closes it',await vb.getAttribute('aria-expanded')==='false'&&!(await v0.locator('.wn-line').first().isVisible()));
  await vb.click(); await pg.waitForTimeout(300);
  ok(tag+': reopening keeps the body (built once)',await v0.locator('.wn-line').count()===first.cards.length);
  ok(tag+': no sideways scroll with versions open',await noOverflow(pg));
  /* the jump bar */
  await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(200);
  const innerW=(await pg.evaluate(()=>innerWidth))+1;
  const jc=await pg.$$eval('.wn-jc',l=>l.map(b=>({t:b.textContent.trim(),h:b.getBoundingClientRect().height,r:b.getBoundingClientRect().right})));
  ok(tag+': jump bar: latest versions as chips plus "All versions", finger-sized, on screen',jc.length>=3&&jc[0].t===vers[0].version&&jc[jc.length-1].t==='All versions'&&jc.every(c=>c.h>=44&&c.r<=innerW),jc.map(c=>c.t).join(' | '));
  ok(tag+': jump bar never scrolls sideways',await pg.evaluate(()=>{const j=document.getElementById('wnJump');return j.scrollWidth<=j.clientWidth+1&&getComputedStyle(j.querySelector('.wn-jrow')).overflowX==='visible';}));
  const target=vers[4]; /* a recent chip is not it: use the sheet for something far away */
  await pg.click('.wn-jall'); await pg.waitForTimeout(350);
  ok(tag+': "All versions" opens a sheet with every version, grouped by major',await pg.evaluate(()=>document.querySelector('.wn-sheet').open)&&await pg.$$eval('.wn-sc',l=>l.length)===vers.length&&(await pg.$$eval('.wn-sg h3',l=>l.map(h=>h.firstChild.textContent))).join(',')===[...new Set(vers.map(v=>/^(\d+)\./.exec(v.version)[1]+'.x'))].join(','));
  ok(tag+': sheet cells are finger-sized and the sheet fits the screen',await pg.$$eval('.wn-sc',l=>l.every(c=>c.getBoundingClientRect().height>=44))&&await pg.evaluate(()=>{const s=document.querySelector('.wn-sheet').getBoundingClientRect();return s.right<=innerWidth+1&&s.height<=innerHeight;})&&await pg.evaluate(()=>{const b=document.querySelector('.wn-sb');return b.scrollWidth<=b.clientWidth+1;}));
  await pg.click('.wn-sc:text-is("'+target.version+'")'); await pg.waitForTimeout(900);
  const tr=q('#v-'+CSS_ESC(target.version));
  ok(tag+': picking a version closes the sheet, opens that row and scrolls it into view under the bar',!(await pg.evaluate(()=>document.querySelector('.wn-sheet').open))&&await tr.locator('.wn-vbtn').getAttribute('aria-expanded')==='true'&&await pg.evaluate(v=>{const r=document.getElementById('v-'+v).getBoundingClientRect(),f=document.querySelector('.wn-filters').getBoundingClientRect();return r.top>=f.bottom-2&&r.top<innerHeight*.5;},target.version));
  await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(200);
  await pg.click('.wn-jall'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  ok(tag+': Escape closes the sheet',!(await pg.evaluate(()=>document.querySelector('.wn-sheet').open)));
  await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(200);
  await pg.click('.wn-jc[data-jump="v-'+vers[1].version+'"]'); await pg.waitForTimeout(700);
  ok(tag+': a recent-version chip jumps to that row',await pg.evaluate(v=>document.getElementById('v-'+v).querySelector('.wn-vbtn').getAttribute('aria-expanded')==='true',vers[1].version));
  /* filter chips */
  const chipTxt=await pg.$$eval('.wn-f',l=>l.map(b=>b.textContent.replace(/\s+/g,' ').trim()));
  ok(tag+': chips are New / Improved / Fixed with counts (none for an empty kind)',chipTxt[0]==='All'+allCards.length&&[['feature','New'],['improve','Improved'],['fix','Fixed']].every(([t,l])=>cnt(t)?chipTxt.includes(l+cnt(t)):!chipTxt.some(x=>x.startsWith(l))),chipTxt.join(' | '));
  ok(tag+': filter chips are finger-sized buttons that all fit',await pg.$$eval('.wn-f',l=>l.length>=2&&l.every(b=>b.getBoundingClientRect().height>=48&&b.hasAttribute('aria-pressed')&&b.getBoundingClientRect().right<=innerWidth+1)));
  const shownLines=()=>pg.$$eval('.wn-line',l=>l.filter(x=>!x.hidden&&!x.closest('[hidden]')).map(c=>c.dataset.type));
  for(const [t,l] of [['fix','Fixed'],['improve','Improved'],['feature','New']]){
    if(!cnt(t))continue;
    await pg.click('.wn-f[data-filter="'+t+'"]'); await pg.waitForTimeout(400);
    const got=await shownLines();
    ok(tag+': '+l+' shows only '+t+' lines in opened versions',got.length>0&&got.every(x=>x===t),got.length+' lines');
    ok(tag+': '+l+': pressed chip marked, rows without a match hidden, row chips count only matches',await pg.getAttribute('.wn-f[data-filter="'+t+'"]','aria-pressed')==='true'&&await pg.$$eval('.wn-ver',(l,tt)=>l.every(r=>{ const cc=[...r.querySelectorAll('.wn-cc')]; return r.hidden?cc.length===0:(cc.length===1&&cc[0].dataset.type===tt); }),t)&&await pg.$$eval('.wn-ver:not([hidden])',(l)=>l.length)===vers.slice(1).filter(v=>v.cards.some(c=>c.type===t)).length);
  }
  await pg.click('.wn-f[data-filter="all"]'); await pg.waitForTimeout(400);
  ok(tag+': All brings the versions back',(await shownLines()).length>=N.cards.length&&await q('.wn-latest').isVisible()&&await pg.$$eval('.wn-ver:not([hidden])',l=>l.length)===vers.length-1);
  ok(tag+': no sideways scroll',await noOverflow(pg));
  /* deep link opens a version */
  if(vers.length>3){ const t=vers[vers.length-1].version; await pg.evaluate(v=>{location.hash='v-'+v;},t); await pg.waitForTimeout(800);
    ok(tag+': #v-<version> opens that version',await pg.evaluate(v=>document.getElementById('v-'+v).querySelector('.wn-vbtn').getAttribute('aria-expanded')==='true',t)); }
}
function CSS_ESC(v){ return v.replace(/\./g,'\\.'); }
const b=await chromium.launch(); const errs=[];
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:2,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const real=()=>pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length);
  /* since 0.6.0 Start from a photo shows pinned tools only: pin the three photo-first tools (what a phone that used Studio before gets) */
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:pins','["restock","photo-story","collage"]'); }); await pg.reload(); await pg.waitForTimeout(800);
  /* 0.7.0: no Start-from-a-photo block; each pinned photo-first tool row has a camera button */
  ok(vp.name+': the photo-first rows have a camera button, Restock first',!(await pg.$('#quickSec'))&&(await pg.$$eval('#toolGrid .tool-item.has-cam .row-cam input[data-quick]',l=>l.map(x=>x.dataset.quick))).join(',')==='restock,photo-story,collage');
  const tb=await pg.$$eval('#toolGrid .row-cam',l=>l.map(x=>x.getBoundingClientRect()).every(r=>r.height>=44&&r.width>=44&&r.right<=innerWidth+1));
  ok(vp.name+': the camera buttons are finger-sized and fit the screen',tb);
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
  /* ---- What's New page (expected numbers come from the changelog itself) ---- */
  const cerr=[]; const onCon=m=>{ if(m.type()==='error'&&!/fonts\.g/.test(m.location().url||''))cerr.push(m.text()+' '+(m.location().url||'')); }; pg.on('console',onCon);
  await pg.click('#wnBtn'); await pg.waitForURL(/whats-new/); await pg.waitForSelector('.wn-latest .wn-line'); await pg.waitForTimeout(700);
  for(const theme of ['light','dark']){
    await pg.emulateMedia({colorScheme:theme,reducedMotion:'reduce'}); await pg.goto(BASE+'whats-new.html'); await pg.waitForSelector('.wn-latest .wn-line'); await pg.waitForTimeout(500);
    await wnChecks(pg,vp.name+' '+theme);
  }
  await pg.emulateMedia({colorScheme:'light',reducedMotion:'no-preference'});
  ok(vp.name+': seen version is saved (the dot on the hub goes away)',await pg.evaluate(()=>localStorage.getItem('studio:seenVersion'))===JSON.stringify(vers[0].version));
  pg.off('console',onCon); ok(vp.name+': What\'s New has no console errors',!cerr.length,cerr.join(' | '));
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
  ok(vp.name+': dot is gone after reading',!(await pg.evaluate(()=>document.getElementById('wnBtn').classList.contains('has-new'))));
  await pg.route(/changelog\.md/,r=>r.abort()); await pg.goto(BASE+'whats-new.html'); await pg.waitForTimeout(800);
  ok(vp.name+': offline changelog shows a friendly error with Retry',await pg.isVisible('.wn-err button'));
  await ctx.close();
}

{ const ctx=await b.newContext({viewport:{width:360,height:740},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('360: '+e));
  for(const theme of ['light','dark']){ await pg.emulateMedia({colorScheme:theme}); await pg.goto(BASE+'whats-new.html'); await pg.waitForSelector('.wn-latest .wn-line'); await pg.waitForTimeout(500);
    await pg.evaluate(()=>{ document.querySelectorAll('.wn-vbtn').forEach(b=>b.click()); }); await pg.waitForTimeout(500);
    ok('360 '+theme+': filter chips and jump bar fit',await pg.evaluate(()=>[...document.querySelectorAll('.wn-f,.wn-jc')].every(b=>b.getBoundingClientRect().right<=innerWidth+1&&b.getBoundingClientRect().left>=0)));
    await pg.click('.wn-jall'); await pg.waitForTimeout(350);
    ok('360 '+theme+': the All versions sheet has no sideways scroll',await noOverflow(pg)&&await pg.evaluate(()=>{const s=document.querySelector('.wn-sheet'),b=document.querySelector('.wn-sb');return s.getBoundingClientRect().right<=innerWidth+1&&b.scrollWidth<=b.clientWidth+1;})); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
    ok('360 '+theme+': no sideways scroll, even with every version open',await noOverflow(pg)); }
  await ctx.close(); }
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(f?f+' failed':'all pass'); process.exit(f?1:0);

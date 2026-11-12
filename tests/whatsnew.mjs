/* Studio 0.1.0 checks (What's New part rewritten for the grouped page): Quick start on the hub (photo first, via the camera button on a tool row; the tool opens with it in, as a new draft),
   the What's New page (hero card, closed groups, filters, screenshots from studio-notes/changelog.md; error state) and its badge on the hub.
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
  ok(tag+': hero is the first thing under the chips',await pg.evaluate(()=>{ const h=document.querySelector('.wn-latest').getBoundingClientRect(),c=document.querySelector('.wn-filters').getBoundingClientRect(); return h.top>=c.bottom-1&&h.width>Math.min(innerWidth,720)*.85; }));
  /* groups and counts */
  ok(tag+': hero lists every change of the newest version, one line each',await q('.wn-latest .wn-line').count()===N.cards.length,N.cards.length+' lines');
  for(const [t,label] of [['feature','New'],['improve','Improved'],['fix','Fixed']]){
    const want=cnt(t,N.cards), has=await q('.wn-latest .wn-grp[data-type="'+t+'"]').count();
    ok(tag+': group '+label+' '+(want?'has '+want+' lines':'is absent when empty'),want?(has===1&&await q('.wn-latest .wn-grp[data-type="'+t+'"] .wn-line').count()===want&&(await pg.textContent('.wn-latest .wn-grp[data-type="'+t+'"] .wn-gh')).includes(label)&&await q('.wn-latest .wn-grp[data-type="'+t+'"] .wn-gi svg').count()===1):has===0);
  }
  /* a line expands: note + screenshot */
  const li=N.cards.find(c=>c.shot)?'.wn-latest .wn-line:has(.wn-fig)':'.wn-latest .wn-line:has(.wn-lbody)';
  const line=q(li).first();
  if(await line.count()){
    const btn=line.locator('.wn-lbtn'), body=line.locator('.wn-lbody');
    ok(tag+': a line starts closed (aria-expanded=false, note hidden)',await btn.getAttribute('aria-expanded')==='false'&&!(await body.isVisible()));
    ok(tag+': a line is finger-sized',(await btn.boundingBox()).height>=44);
    await btn.click(); await pg.waitForTimeout(450);
    ok(tag+': tapping a line opens it and shows the note',await btn.getAttribute('aria-expanded')==='true'&&await body.isVisible()&&(await body.textContent()).trim().length>10);
    if(await line.locator('.wn-fig').count()){
      await line.locator('.wn-fig img').first().scrollIntoViewIfNeeded(); await pg.waitForTimeout(500);
      ok(tag+': the screenshot shows inside the open line',await line.locator('.wn-fig img').first().evaluate(i=>i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().height>40));
      ok(tag+': a line with a screenshot has a small thumbnail (about 44px)',await line.locator('.wn-th').evaluate(i=>Math.abs(i.getBoundingClientRect().height-44)<3&&i.loading==='lazy'));
    }
    await btn.click(); await pg.waitForTimeout(450);
    ok(tag+': tapping again closes it',await btn.getAttribute('aria-expanded')==='false'&&!(await body.isVisible()));
  } else ok(tag+': (no expandable change in the newest version)',true);
  ok(tag+': titles and notes are dir=auto',await pg.$$eval('.wn-lt,.wn-lbody p',l=>l.length>0&&l.every(x=>x.getAttribute('dir')==='auto')));
  /* older versions: collapsed by default, open on tap */
  const nb=await q('.wn-block').count(), nv=await q('.wn-ver').count();
  ok(tag+': every older version is a row ('+(vers.length-1)+')',nv===vers.length-1&&nb>=1);
  ok(tag+': blocks and version rows are closed by default',await pg.$$eval('.wn-bbtn,.wn-vbtn',l=>l.every(b=>b.getAttribute('aria-expanded')==='false'))&&await q('.wn-ver').first().isVisible()===false);
  ok(tag+': block rows are finger-sized and say how many changes',await pg.$$eval('.wn-bbtn',l=>l.every(s=>s.getBoundingClientRect().height>=56&&/\d+ changes?/.test(s.textContent))));
  const labels=await pg.$$eval('.wn-glab',l=>l.map(x=>x.textContent.trim()));
  ok(tag+': blocks are groups of five minor versions',labels.every(l=>/^\d+\.\d+( – \d+\.\d+)?$/.test(l))&&labels.some(l=>l.startsWith('0.1')),labels.slice(0,3).join(' | '));
  ok(tag+': closed rows load no screenshots yet',await pg.$$eval('.wn-block img',l=>l.filter(i=>i.complete&&i.naturalWidth>0).length)===0);
  await q('.wn-bbtn').first().click(); await pg.waitForTimeout(450);
  const v0=q('.wn-block').first().locator('.wn-ver').first(), vb=v0.locator('.wn-vbtn');
  ok(tag+': opening a block shows its version rows (still closed), each with version, date, summary, chips',await v0.isVisible()&&await vb.getAttribute('aria-expanded')==='false'&&await v0.locator('.wn-vnum').count()===1&&await v0.locator('.wn-vsum').count()===1&&await v0.locator('.wn-cc').count()>=1&&(await vb.boundingBox()).height>=56);
  ok(tag+': the other blocks stay closed',await pg.$$eval('.wn-bbtn',l=>l.slice(1).every(b=>b.getAttribute('aria-expanded')==='false')));
  const firstOlder=vers[1], wantChips=['feature','improve','fix'].filter(t=>cnt(t,firstOlder.cards)).length;
  await pg.evaluate(()=>document.querySelector('.wn-block .wn-ver').scrollIntoView({block:'center'}));
  /* the newest older version is the first row of the first block */
  ok(tag+': row chips match the changelog ('+firstOlder.version+')',await q('.wn-block').first().locator('.wn-ver').first().locator('.wn-cc').count()===wantChips&&(await q('.wn-block').first().locator('.wn-ver').first().locator('.wn-vnum').textContent())===firstOlder.version);
  await vb.click(); await pg.waitForTimeout(500);
  ok(tag+': tapping a version row opens its grouped changes',await vb.getAttribute('aria-expanded')==='true'&&await v0.locator('.wn-line').first().isVisible()&&await v0.locator('.wn-line').count()===firstOlder.cards.length&&await v0.locator('.wn-gi svg').count()>=1);
  ok(tag+': no sideways scroll with a version open',await noOverflow(pg));
  /* filter chips */
  const chipTxt=await pg.$$eval('.wn-f',l=>l.map(b=>b.textContent.replace(/\s+/g,' ').trim()));
  ok(tag+': chips are New / Improved / Fixed with counts (none for an empty kind)',chipTxt[0]==='All'+allCards.length&&[['feature','New'],['improve','Improved'],['fix','Fixed']].every(([t,l])=>cnt(t)?chipTxt.includes(l+cnt(t)):!chipTxt.some(x=>x.startsWith(l))),chipTxt.join(' | '));
  ok(tag+': filter chips are finger-sized buttons',await pg.$$eval('.wn-f',l=>l.length>=2&&l.every(b=>b.getBoundingClientRect().height>=48&&b.hasAttribute('aria-pressed'))));
  const shownLines=()=>pg.$$eval('.wn-line:not([hidden])',l=>l.filter(x=>!x.closest('[hidden]')).map(c=>c.dataset.type));
  for(const [t,l] of [['fix','Fixed'],['improve','Improved'],['feature','New']]){
    if(!cnt(t))continue;
    await pg.click('.wn-f[data-filter="'+t+'"]'); await pg.waitForTimeout(500);
    const got=await shownLines();
    ok(tag+': '+l+' shows only '+t+' lines',got.length===cnt(t)&&got.every(x=>x===t),got.length+' of '+cnt(t));
    ok(tag+': '+l+': pressed chip marked, empty rows hidden, matching blocks open',await pg.getAttribute('.wn-f[data-filter="'+t+'"]','aria-pressed')==='true'&&await pg.$$eval('.wn-block',l=>l.every(d=>{ const has=!!d.querySelector('.wn-line:not([hidden])'); return d.hidden===!has&&(!has||d.querySelector('.wn-bbtn').getAttribute('aria-expanded')==='true'); })));
  }
  await pg.click('.wn-f[data-filter="all"]'); await pg.waitForTimeout(500);
  ok(tag+': All brings every line back',(await shownLines()).length===allCards.length&&await q('.wn-latest').isVisible());
  ok(tag+': no sideways scroll',await noOverflow(pg));
  /* big screenshot dialog */
  await pg.evaluate(()=>scrollTo(0,0));
  const shotLine=q('.wn-line:has(.wn-fig)').first();
  if(await shotLine.count()){
    const sb=shotLine.locator('.wn-lbtn'); if(await sb.getAttribute('aria-expanded')!=='true'){ await shotLine.scrollIntoViewIfNeeded(); await sb.click(); await pg.waitForTimeout(450); }
    await shotLine.locator('.wn-shot').first().scrollIntoViewIfNeeded(); await shotLine.locator('.wn-shot').first().click(); await pg.waitForTimeout(300);
    ok(tag+': a screenshot opens large',await pg.evaluate(()=>document.getElementById('wnDlg').open));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
    ok(tag+': Escape closes it',await pg.evaluate(()=>!document.getElementById('wnDlg').open));
  }
  /* deep link opens a version */
  if(vers.length>3){ const t=vers[vers.length-1].version; await pg.evaluate(v=>{location.hash='v-'+v;},t); await pg.waitForTimeout(600);
    ok(tag+': #v-<version> opens that version',await pg.evaluate(v=>document.getElementById('v-'+v).querySelector('.wn-vbtn').getAttribute('aria-expanded')==='true',t)); }
}
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
    await pg.evaluate(()=>{ document.querySelectorAll('.wn-bbtn').forEach(b=>b.click()); }); await pg.waitForTimeout(450);
    await pg.evaluate(()=>{ document.querySelectorAll('.wn-vbtn').forEach(b=>b.click()); document.querySelectorAll('.wn-lbtn[aria-expanded]').forEach(b=>b.click()); }); await pg.waitForTimeout(500);
    ok('360 '+theme+': no sideways scroll, even with everything open',await noOverflow(pg)); }
  await ctx.close(); }
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(f?f+' failed':'all pass'); process.exit(f?1:0);

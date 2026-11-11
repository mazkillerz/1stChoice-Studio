/* Add to calendar from anywhere (2.4.0) + a design's real shape.
   1. Saved → ⋯ → Calendar opens the quick sheet: this week's days, Post/Story/Reel preselected from the design's shape; Add saves a linked item.
   2. A design stored as format 'post' (a Create post) counts as a post: picker card data-shape, calendar item icon; the picker has no Stories/Posts row.
   3. Tool Save sheet: after a save, "Add to calendar" shows; it saves an item.
   4. The design menu has the four big actions and no tick pill (the save tick is a circle).
   Run: node tests/calpick.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
const seed=()=>{ const d=seedDesigns(); d.designs.seed1.tool='create'; d.designs.seed1.name='Post – 8 Nov'; d.designs.seed1.format='post'; return d; };
const mk=async(dark)=>{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(seed())});
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Tester'})); localStorage.setItem('studio:who:asked','1'); navigator.canShare=()=>false; }catch(e){}`});
  return ctx; };
const db=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{}'));

for(const dark of [false,true]){ const N=dark?'dark: ':'light: ';
  const ctx=await mk(dark); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e));
  await pg.goto(BASE+'index.html?x=1#saved'); await pg.waitForSelector('#savedGrid .sv-card');
  /* the Saved card names its collection */
  ok(N+'Saved card shows its collection',await pg.$eval('#savedGrid .sv-card[data-id="seed0"] .sv-txt',e=>/Restocks/.test(e.textContent)));
  await pg.tap('#savedGrid .sv-card[data-id="seed1"] .sv-more'); await pg.waitForSelector('.ds-bigs');
  const big=await pg.$$eval('.ds-bigs .ds-big',a=>a.map(x=>x.textContent.trim()));
  ok(N+'design menu: Open, Save picture, Calendar, Collection',big.join()==='Open,Save picture,Calendar,Collection',big);
  await pg.tap('.ds-big[data-act="plan"]'); await pg.waitForSelector('.cal-quick'); await pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:4000}).catch(()=>{}); await pg.waitForTimeout(150);
  const q=await pg.evaluate(()=>({days:document.querySelectorAll('.cq-day[data-day]').length,today:document.querySelector('.cq-day[aria-pressed="true"] small').textContent,fmt:document.querySelector('.cal-quick [data-fmt][aria-pressed="true"]').dataset.fmt,
    fmts:[...document.querySelectorAll('.cal-quick [data-fmt]')].map(x=>x.dataset.fmt).join(),btn:document.getElementById('cqSave').textContent,
    small:[...document.querySelectorAll('.cal-quick button,.cal-quick label.cq-day')].filter(x=>x.getClientRects().length&&x.getBoundingClientRect().height<44).map(x=>x.textContent.trim()||x.className),
    fits:document.querySelector('.cal-quick-dlg').getBoundingClientRect().bottom<=innerHeight+1}));
  ok(N+'quick sheet: 7 days from Today, Post preselected for a Create post, Post/Story/Reel',q.days===7&&q.today==='Today'&&q.fmt==='post'&&q.fmts==='post,story,reel',q);
  ok(N+'quick sheet: button names the day, fits the screen, no control under 44px',q.btn==='Add to Today'&&q.fits&&!q.small.length,q);
  await pg.tap('.cq-day:nth-child(3)'); await pg.tap('.cal-quick [data-at="19:00"]'); await pg.fill('#cqCap','Caption #tag');
  const lbl=await pg.textContent('#cqSave'); await pg.tap('#cqSave'); await pg.waitForSelector('.cal-quick',{state:'detached'});
  const it=((await db(pg)).calendar||[]).slice(-1)[0]||{};
  ok(N+'Add saves a linked post on the picked day and time',it.format==='post'&&it.design_ids&&it.design_ids[0]==='seed1'&&it.at==='19:00'&&it.caption==='Caption #tag'&&(it.hashtags||[]).includes('#tag')&&/Add to/.test(lbl)&&it.day>new Date().toISOString().slice(0,10),it);
  /* the calendar shows it as a post; the picker has no shape row and tags the Create post as a post */
  await pg.goto(BASE+'index.html?y=1#calendar'); await pg.waitForSelector('.cal-body'); await pg.waitForTimeout(600);
  if(await pg.$('.cal-seg [data-mode="month"][aria-pressed="true"]')) await pg.tap('.cal-seg [data-mode="week"]');
  await pg.waitForTimeout(500);
  ok(N+'calendar item shows the Post icon',await pg.evaluate(()=>[...document.querySelectorAll('.ci-fmt')].some(x=>x.getAttribute('aria-label')==='Post')));
  await pg.tap('.cal-new'); await pg.waitForSelector('#calPick'); await pg.tap('#calPick'); await pg.waitForSelector('.cal-pick .cal-pcard');
  const pk=await pg.evaluate(()=>({shapeRow:!!document.querySelector('.cp-shape'),post:document.querySelector('.cal-pcard[data-pick="seed1"]').dataset.shape,carousel:document.querySelector('.cal-pcard[data-pick="seed4"]').dataset.shape,story:document.querySelector('.cal-pcard[data-pick="seed0"]').dataset.shape}));
  ok(N+'picker: no Stories/Posts row; Create post and carousel are posts, restock a story',!pk.shapeRow&&pk.post==='post'&&pk.carousel==='post'&&pk.story==='story',pk);
  await ctx.close();
}

/* tool Save sheet: Add to calendar after saving, and a round tick */
{ const ctx=await mk(false); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('tool: '+e));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForSelector('#barSave'); await pg.setInputFiles('#pick',S+'pair.jpg'); await pg.waitForTimeout(1200);
  await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(400); const chip=pg.locator('#sh-words .chip[aria-pressed="false"]').first(); if(await chip.count()) await chip.tap(); await pg.waitForTimeout(500);
  await pg.tap('#bar [data-open="words"]').catch(()=>{}); await pg.waitForTimeout(300);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open');
  ok('tool: Add to calendar is hidden before saving',await pg.isHidden('#savePlan'));
  await pg.tap('#saveWhere [data-where="team"]'); await pg.waitForTimeout(600);
  const prev=await pg.evaluate(()=>{ const p=document.getElementById('phone').getBoundingClientRect(), s=document.getElementById('save').getBoundingClientRect(); return {w:Math.round(p.width),saveVisible:s.bottom<=innerHeight&&s.top>0}; });
  ok('tool: with Phone + Team the preview stays big (≥120px wide) and Save is on screen',prev.w>=120&&prev.saveVisible,prev);
  await pg.tap('#saveWhere [data-where="me"]'); await pg.waitForTimeout(400);
  await pg.tap('#save');
  const tick=await pg.waitForFunction(()=>{ const d=document.querySelector('.sb-dot'); if(!d) return null; const r=d.getBoundingClientRect(); return r.width>10?{w:Math.round(r.width),h:Math.round(r.height)}:null; },null,{timeout:10000}).then(h=>h.jsonValue()).catch(()=>null);
  ok('tool: the save tick is a circle',tick&&Math.abs(tick.w-tick.h)<=1,tick);
  await pg.waitForSelector('#savePlan:not([hidden])',{timeout:10000}).catch(()=>{});
  ok('tool: after saving, Add to calendar shows',await pg.isVisible('#savePlan'));
  await pg.tap('#savePlan'); await pg.waitForSelector('.cal-quick'); await pg.tap('#cqSave'); await pg.waitForSelector('.cal-quick',{state:'detached'});
  const it=((await db(pg)).calendar||[]).slice(-1)[0]||{};
  ok('tool: it saves a story item without a design (phone-only save)',it.format==='story'&&!(it.design_ids||[]).length&&!!it.title,it);
  ok('tool: the link says it is on the calendar',/On the calendar/.test(await pg.textContent('#savePlan')));
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
res.forEach(r=>console.log(r)); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`calpick: ${res.length-f} pass, ${f} fail`); process.exit(f?1:0);

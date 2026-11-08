/* Content calendar (behind the "team" preview flag): assets/calendar.js + calendar.css, Home row, #calendar page. fakecloud stands in for Supabase.
   1 flag off: no entry point, no calendar section, no calendar request; flag on adds only #calRow + #calendarView to Home
   2 phone (390 touch, light + dark): Home row "Posting today: …" opens the week list (7 rows, today marked), items with time/status/title/caption/thumbs,
     old posted-log entries as read-only posted items, arrows change the week, Month toggle (42 days, dots, tap a day -> that week)
   3 add an item with an Arabic title (RTL), link a design (thumb shows), long-press menu (pointer events, touch), change status, delete asks to confirm
   4 tap targets >= 44, no sideways scroll at 360 (week + month), no page errors
   5 desktop (1280): month grid with items inside, drag an item to another day moves its date
   Run: node tests/calendar.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const now=new Date(), TODAY=iso(now), sun=new Date(now.getFullYear(),now.getMonth(),now.getDate()-now.getDay());
const OTHER=iso(new Date(sun.getFullYear(),sun.getMonth(),sun.getDate()+(now.getDay()===0?1:0)));   // another day of this week (this Sunday, or Monday when today is Sunday)
const LEGACY=iso(new Date(sun.getFullYear(),sun.getMonth(),sun.getDate()+(now.getDay()===0?2:1)));
const db=seedDesigns();
db.calendar=[
  {id:'c1',brand:'1stchoice',day:TODAY,at:'09:30',status:'draft',title:'Restock story',caption:'New batch today\nsecond line',hashtags:['#cold'],design_ids:['seed0'],author:'Sara',created_at:new Date().toISOString()},
  {id:'c2',brand:'1stchoice',day:TODAY,at:null,status:'in_review',title:'Weekend post',caption:'',hashtags:[],design_ids:[],author:'Sara',created_at:new Date().toISOString()}];
const init=(flag,dark)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  ${flag?"localStorage.setItem('studio:flag:team','1');":''}
  localStorage.setItem('studio:postedLog',JSON.stringify([{day:${JSON.stringify(LEGACY)},title:'Old posted story'}]));
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,flag){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(flag)});
  return ctx;
}
const stored=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')).calendar||[]);
const txt=(pg,s)=>pg.$eval(s,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');

/* 1 flag off */
{ const ctx=await mk({viewport:{width:390,height:844},isMobile:true,hasTouch:true},false); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('off: '+e.message));
  let calReq=0; pg.on('request',r=>{ if(/calendar\.(js|css)/.test(r.url())) calReq++; });
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000});
  const ids=await pg.evaluate(()=>[...document.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean).sort());
  ok('1 flag off: no calendar row, no calendar page, no #calendar link',!ids.includes('calRow')&&!ids.includes('calendarView')&&!(await pg.$('a[href="#calendar"],[data-tab="calendar"]')));
  ok('1 flag off: no calendar files requested',calReq===0,calReq);
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForTimeout(500);
  ok('1 flag off: #calendar stays on Home',await pg.evaluate(()=>!document.getElementById('homeView').hidden));
  await pg.evaluate(()=>{}); await ctx.close();
  const on=await mk({viewport:{width:390,height:844},isMobile:true,hasTouch:true},true); const p2=await on.newPage(); p2.on('pageerror',e=>errs.push('on0: '+e.message));
  await p2.goto(BASE+'index.html'); await p2.waitForSelector('#calRow .cal-home-row',{timeout:8000});
  const ids2=await p2.evaluate(()=>[...document.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean).sort());
  ok('1 flag on adds only #calRow and #calendarView to Home',JSON.stringify(ids2.filter(x=>!ids.includes(x)&&!/^(campCss|campRow|selCamp)$/.test(x)))===JSON.stringify(['calRow','calendarView']),ids2.filter(x=>!ids.includes(x)));   // campCss/campRow/selCamp: campaigns (w2), same flag
  await on.close(); }

/* 2 + 3 + 4 phone */
async function phone(dark){
  const T=(dark?'dark ':'light ')+'phone: ';
  const ctx=await mk({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:dark?'dark':'light'},true); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message));
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow .cal-home-row',{timeout:8000});
  await pg.waitForFunction(()=>/Posting today/.test((document.querySelector('#calRow')||{}).innerText||''),null,{timeout:8000}).catch(()=>{});
  const row=await txt(pg,'#calRow');
  ok(T+'Home shows "Posting today: Restock story"',/Posting today: Restock story/.test(row),row);
  await pg.tap('#calRow .cal-home-row'); await pg.waitForSelector('#calendarView .cal-day',{timeout:8000});
  ok(T+'tapping it opens #calendar',await pg.evaluate(()=>location.hash==='#calendar'&&!document.getElementById('calendarView').hidden&&document.getElementById('homeView').hidden));
  const days=await pg.$$eval('.cal-day',e=>e.map(x=>({t:x.classList.contains('today'),d:x.dataset.day})));
  ok(T+'week list: 7 day rows, today highlighted',days.length===7&&days.filter(d=>d.t).length===1&&days.find(d=>d.t).d===TODAY,days.map(d=>d.d));
  const c1=await pg.$eval('.cal-item[data-id="c1"]',e=>({time:e.querySelector('.ci-time')?.textContent,chip:e.querySelector('.cal-chip')?.textContent,title:e.querySelector('.ci-title')?.textContent,cap:e.querySelector('.ci-cap')?.textContent}));
  ok(T+'item card: time, status chip, title, first caption line',c1.time==='09:30'&&c1.chip==='Draft'&&c1.title==='Restock story'&&c1.cap==='New batch today',c1);
  await pg.waitForFunction(()=>{ const i=document.querySelector('.cal-item[data-id="c1"] .ci-thumbs img'); return i&&i.getAttribute('src'); },null,{timeout:6000}).catch(()=>{});
  ok(T+'linked design thumb shows',await pg.evaluate(()=>{ const i=document.querySelector('.cal-item[data-id="c1"] .ci-thumbs img'); return !!i&&!!i.getAttribute('src')&&i.complete&&i.naturalWidth>0; }));
  const lg=await pg.$eval('.cal-item.ro',e=>e.innerText).catch(()=>'');
  ok(T+'old posted log entry shows as a read-only posted item',/Old posted story/.test(lg)&&/Posted/.test(lg),lg.replace(/\s+/g,' '));
  const t0=await txt(pg,'.cal-title'); await pg.tap('[data-nav="1"]'); await pg.waitForTimeout(350);
  const t1=await txt(pg,'.cal-title'); ok(T+'next arrow changes the week',t0!==t1&&(await pg.$$('.cal-day')).length===7,t0+' -> '+t1);
  await pg.tap('.cal-today'); await pg.waitForTimeout(350); ok(T+'Today returns',(await txt(pg,'.cal-title'))===t0);
  /* month */
  await pg.tap('[data-mode="month"]'); await pg.waitForSelector('.cm-grid');
  ok(T+'month view: 42 days, dots under days with items',(await pg.$$('.cal-cell')).length===42&&(await pg.$$(`.cal-cell[data-day="${TODAY}"] .dot`)).length>=2);
  await pg.tap(`.cal-cell[data-day="${TODAY}"] .cc-num`); await pg.waitForSelector('.cal-week');
  ok(T+'tap a day in the month goes to that week',await pg.evaluate(t=>!!document.querySelector('.cal-day.today[data-day="'+t+'"]'),TODAY));
  /* add with an Arabic title and a linked design */
  await pg.tap('.cal-new'); await pg.waitForSelector('dialog.cal-dlg[open] #calTitle');
  await pg.fill('#calTitle','علبتك واجد حلوة'); await pg.fill('#calCap','باشن فروت\nسطر ثاني'); await pg.fill('#calTags','#cold #brew');
  await pg.fill('#calDay',OTHER); await pg.fill('#calAt','18:00');
  const dir=await pg.$eval('#calTitle',e=>getComputedStyle(e).direction), cdir=await pg.$eval('#calCap',e=>getComputedStyle(e).direction);
  ok(T+'Arabic title and caption are right-to-left (dir=auto)',dir==='rtl'&&cdir==='rtl',[dir,cdir]);
  await pg.tap('#calPick'); await pg.waitForSelector('.cal-pcard');
  await pg.waitForFunction(()=>{ const i=document.querySelector('.cal-pcard img'); return i&&i.getAttribute('src'); },null,{timeout:6000}).catch(()=>{});
  await pg.tap('.cal-pcard >> nth=1'); await pg.waitForSelector('.cal-lk img');
  ok(T+'picker links a design and its thumb shows',await pg.evaluate(()=>{ const i=document.querySelector('.cal-lk img'); return !!i&&!!i.getAttribute('src')&&i.naturalWidth>0; }));
  await pg.tap('#calSave'); await pg.waitForSelector('dialog.cal-dlg',{state:'detached',timeout:6000});
  await pg.waitForSelector('.cal-item .ci-title');
  const saved=(await stored(pg)).find(x=>x.title==='علبتك واجد حلوة');
  ok(T+'the new item is stored with date, time, status, hashtags, design and author',!!saved&&saved.day===OTHER&&saved.at==='18:00'&&saved.status==='draft'&&saved.hashtags.join(' ')==='#cold #brew'&&saved.design_ids.length===1&&saved.author==='Sara',saved);
  const card=await pg.evaluate(id=>{ const e=document.querySelector('.cal-item[data-id="'+id+'"]'); return e&&{dir:getComputedStyle(e.querySelector('.ci-title')).direction,th:!!e.querySelector('.ci-thumbs img')}; },saved&&saved.id);
  ok(T+'the card shows the Arabic title right-to-left with its thumb',!!card&&card.dir==='rtl'&&card.th,card);
  /* long-press menu (touch pointer events) */
  const press=async sel=>{ await pg.evaluate(s=>{ const el=document.querySelector(s), r=el.getBoundingClientRect(); const o={bubbles:true,composed:true,pointerType:'touch',pointerId:7,isPrimary:true,clientX:r.left+30,clientY:r.top+20,button:0};
    el.dispatchEvent(new PointerEvent('pointerdown',o)); },sel); await pg.waitForTimeout(700); };
  await press('.cal-item[data-id="c2"] .ci-main'); await pg.waitForSelector('dialog.cal-dlg[open] .cal-menu',{timeout:3000}).catch(()=>{});
  const menu=await txt(pg,'dialog.cal-dlg[open]');
  ok(T+'press and hold opens the menu (Move, Change status, Edit, Delete)',/Move to date/.test(menu)&&/Change status/.test(menu)&&/Edit/.test(menu)&&/Delete/.test(menu),menu.slice(0,80));
  await pg.evaluate(()=>document.querySelector('.cal-item[data-id="c2"] .ci-main').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:7})));
  await pg.tap('dialog.cal-dlg[open] [data-a="status"]'); await pg.tap('dialog.cal-dlg[open] [data-s="approved"]');
  await pg.waitForFunction(()=>document.querySelector('.cal-item[data-id="c2"] .cal-chip')?.textContent==='Approved',null,{timeout:5000}).catch(()=>{});
  ok(T+'Change status to Approved (chip + stored)',(await txt(pg,'.cal-item[data-id="c2"] .cal-chip'))==='Approved'&&(await stored(pg)).find(x=>x.id==='c2').status==='approved');
  /* delete asks to confirm */
  await pg.tap('.cal-item[data-id="c2"] .ci-more'); await pg.waitForSelector('dialog.cal-dlg[open] [data-a="del"]'); await pg.tap('dialog.cal-dlg[open] [data-a="del"]');
  await pg.waitForSelector('dialog.cal-dlg[open] [data-yes]');
  ok(T+'Delete asks first',/Delete this post/.test(await txt(pg,'dialog.cal-dlg[open]'))&&(await stored(pg)).some(x=>x.id==='c2'));
  await pg.tap('dialog.cal-dlg[open] [data-no]'); await pg.waitForTimeout(200);
  ok(T+'Cancel keeps it',(await stored(pg)).some(x=>x.id==='c2'));
  await pg.tap('.cal-item[data-id="c2"] .ci-more'); await pg.tap('dialog.cal-dlg[open] [data-a="del"]'); await pg.tap('dialog.cal-dlg[open] [data-yes]');
  await pg.waitForFunction(()=>!document.querySelector('.cal-item[data-id="c2"]'),null,{timeout:5000}).catch(()=>{});
  ok(T+'Delete removes it',!(await stored(pg)).some(x=>x.id==='c2')&&!(await pg.$('.cal-item[data-id="c2"]')));
  /* tap targets (layout size: a pressed chip is drawn at .96) */
  const small=await pg.evaluate(()=>[...document.querySelectorAll('#calendarView button,#calendarView a,#calRow button')].filter(e=>e.offsetParent&&!e.disabled).map(e=>{ return {c:e.className,w:e.offsetWidth,h:e.offsetHeight}; }).filter(x=>x.w<44||x.h<44));
  ok(T+'tap targets are at least 44px',small.length===0,small.slice(0,4));
  /* Home goes back */
  await pg.tap('[data-cal-back]'); await pg.waitForTimeout(400);
  ok(T+'Back returns to Home',await pg.evaluate(()=>!document.getElementById('homeView').hidden&&location.hash===''));
  await ctx.close();
}
await phone(false); await phone(true);

/* 4 360 wide */
{ const ctx=await mk({viewport:{width:360,height:740},isMobile:true,hasTouch:true},true); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('360: '+e.message));
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('.cal-day',{timeout:8000});
  const w=()=>pg.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}));
  let m=await w(); ok('360: no sideways scroll (week)',m.sw<=m.iw,m);
  await pg.tap('[data-mode="month"]'); await pg.waitForSelector('.cm-grid'); m=await w(); ok('360: no sideways scroll (month)',m.sw<=m.iw,m);
  await pg.tap('.cal-new'); await pg.waitForSelector('dialog.cal-dlg[open]'); m=await w(); ok('360: no sideways scroll with the add sheet open',m.sw<=m.iw,m);
  const fit=await pg.evaluate(()=>{ const d=document.querySelector('dialog.cal-dlg'), r=d.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth; }); ok('360: the add sheet fits the screen',fit);
  await ctx.close(); }

/* 5 desktop */
{ const ctx=await mk({viewport:{width:1280,height:800}},true); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('desktop: '+e.message));
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow .cal-home-row',{timeout:8000});
  await pg.click('#calRow .cal-home-row'); await pg.waitForSelector('.cm-grid',{timeout:8000});
  ok('desktop: opens as a month grid with the items inside the days',(await pg.$$(`.cal-cell[data-day="${TODAY}"] .cal-pill`)).length===2);
  const target=`.cal-cell[data-day="${OTHER===TODAY?LEGACY:OTHER}"]`, dst=OTHER===TODAY?LEGACY:OTHER;
  await pg.dragAndDrop('.cal-pill[data-id="c1"]',target+' .cc-num');
  await pg.waitForFunction(d=>JSON.parse(localStorage.getItem('fakecloud')).calendar.find(x=>x.id==='c1').day===d,dst,{timeout:5000}).catch(()=>{});
  ok('desktop: dragging an item to another day moves its date',(await stored(pg)).find(x=>x.id==='c1').day===dst,(await stored(pg)).find(x=>x.id==='c1').day);
  ok('desktop: the item now sits in the new day',!!(await pg.$(`${target} .cal-pill[data-id="c1"]`)));
  await pg.click('.cal-pill[data-id="c2"]'); await pg.waitForSelector('dialog.cal-dlg[open] #calTitle');
  ok('desktop: clicking an item opens its edit sheet',(await pg.$eval('#calTitle',e=>e.value))==='Weekend post');
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(bad?bad+' FAILED':'ALL PASS ('+res.length+')'); process.exit(bad?1:0);

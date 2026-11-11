/* Content calendar (behind the "team" preview flag): assets/calendar.js + calendar.css, Home row, #calendar page. fakecloud stands in for Supabase.
   1 permanent since 2.2.0: the row is the first section on Home with no preview; no calendar files until opened
   A the Home row is styled before the calendar was ever opened (<= 80px tall, small icon, title and sub on separate lines), light + dark
   2 phone (390 touch, light + dark): week list (7 rows, today marked), cards (format icon, time, status chip, thumb, 2 caption lines, Copy caption), arrows, Month toggle
   3 "Plan a post": Post/Story, full-screen picker (ALL designs, search Arabic + English, collection + shape chips, no nested scroller, lazy thumbs), add in <= 6 taps,
     edit (day via the date input, time chip, Ready = approved), in review shown read-only, Copy caption, the ⋯ menu (Mark as posted, Move to tomorrow, Delete asks first), Arabic caption RTL + count
   4 tap targets >= 44, at most two filled buttons per view, no sideways scroll at 360 (week, month, sheet, picker), no page errors
   5 desktop (1280): month grid with the items inside, drag an item to another day moves its date
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
/* 17 designs in all across 3 collections (Restocks, Offers, none): a picker that shows only some of them is the bug this guards */
['Summer can','Passion fruit','علبة باشن فروت','Weekend offer','Friends and cans','New flavour','Morning coffee','Ramadan kareem','Gift box'].forEach((name,i)=>{ const id='x'+i, tool=['photo-story','carousel','offer','restock','collage','highlight','split','photo-story','offer'][i], cols=[['Offers'],['Restocks'],[],['Offers'],[],['Restocks'],[],['Offers'],[]][i];
  db.files['1stchoice/'+id+'/thumb.jpg']=db.files['1stchoice/seed0/thumb.jpg']; db.designs[id]={id,brand:'1stchoice',tool,name,kind:'design',recipe:{photoPaths:[]},thumb_path:'1stchoice/'+id+'/thumb.jpg',cols,updated_at:new Date(Date.now()-(150+i)*3600e3).toISOString()}; });
db.designs.seed7.kind='template'; db.designs.seed7.name='A template';   // templates are not offered
const NDES=Object.values(db.designs).length;   // templates too (2.1.1): a design saved without its own photo is stored as a template
db.calendar=[
  {id:'c1',brand:'1stchoice',day:TODAY,at:'09:30',status:'draft',format:'story',title:'Restock – 24 Oct',caption:'New batch today\nsecond line #cold',hashtags:['#cold'],design_ids:['seed0'],author:'Sara',created_at:new Date().toISOString()},
  {id:'c2',brand:'1stchoice',day:TODAY,at:null,status:'in_review',format:'post',title:'Weekend post',caption:'',hashtags:[],design_ids:[],author:'Sara',created_at:new Date().toISOString()}];
const init=(flag,dark)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  ${flag?"localStorage.setItem('studio:flag:team','1');":''}
  localStorage.setItem('studio:postedLog',JSON.stringify([{day:${JSON.stringify(LEGACY)},title:'Old posted story'}]));
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,flag){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(flag)}); await ctx.grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});
  return ctx;
}
const parse0=k=>new Date(+k.slice(0,4),+k.slice(5,7)-1,+k.slice(8,10)), nextDay=k=>{ const d=parse0(k); return iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()+1)); };
const stored=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')).calendar||[]);
const txt=(pg,s)=>pg.$eval(s,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');

/* 1 flag off */
{ const ctx=await mk({viewport:{width:390,height:844},isMobile:true,hasTouch:true},false); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('off: '+e.message));
  let calReq=0; pg.on('request',r=>{ if(/calendar\.(js|css)/.test(r.url())) calReq++; });
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000});
  const ids=await pg.evaluate(()=>[...document.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean).sort());
  await pg.waitForSelector('#calRow .cal-home-row');
  const first=await pg.evaluate(()=>{ const r=document.getElementById('calRow'), h=document.getElementById('homeView'); const secs=[...h.querySelectorAll('.hub-sec')].filter(e=>!e.hidden&&e.offsetHeight>0); return {first:secs[0]&&secs[0].id, top:Math.round(r.getBoundingClientRect().top)}; });
  ok('1 permanent (2.2.0): the calendar row is on Home with no preview, as the first section, near the top',ids.includes('calendarView')&&first.first==='calRow'&&first.top<400,first);
  ok('1 permanent: no calendar files requested before it is opened',calReq===0,calReq);
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForTimeout(500);
  ok('1 permanent: #calendar opens the calendar',await pg.evaluate(()=>document.getElementById('homeView').hidden&&!document.getElementById('calendarView').hidden));
  await pg.evaluate(()=>{}); await ctx.close();
  const on=await mk({viewport:{width:390,height:844},isMobile:true,hasTouch:true},true); const p2=await on.newPage(); p2.on('pageerror',e=>errs.push('on0: '+e.message));
  await p2.goto(BASE+'index.html'); await p2.waitForSelector('#calRow .cal-home-row',{timeout:8000});
  const ids2=await p2.evaluate(()=>[...document.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean).sort());
  ok('1 the team preview adds nothing calendar-related (the calendar is permanent since 2.2.0)',!ids2.filter(x=>!ids.includes(x)).some(x=>/^cal/.test(x)),ids2.filter(x=>!ids.includes(x)));
  await on.close(); }

/* 2 + 3 + 4 phone */
async function phone(dark){
  const T=(dark?'dark ':'light ')+'phone: ';
  const ctx=await mk({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:dark?'dark':'light'},true); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message));
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow .cal-home-row',{timeout:8000});
  await pg.waitForFunction(()=>/Posting today/.test((document.querySelector('#calRow')||{}).innerText||''),null,{timeout:8000}).catch(()=>{});
  const row=await txt(pg,'#calRow');
  ok(T+'Home shows "Posting today: Restock – 24 Oct"',/Posting today: Restock – 24 Oct/.test(row),row);
  const A=await pg.evaluate(()=>{ const r=document.querySelector('#calRow .cal-home-row'), sv=r.querySelector('svg'), b=r.querySelector('b'), sm=r.querySelector('small'); const rb=r.getBoundingClientRect(), sb=sv.getBoundingClientRect(), bb=b.getBoundingClientRect(), mb=sm.getBoundingClientRect();
    return {h:Math.round(rb.height),svg:Math.round(Math.max(sb.width,sb.height)),sep:mb.top>=bb.bottom-1,loaded:!!document.querySelector('link[href*="calendar.css"]')}; });
  ok(T+'A Home row is styled before the calendar was opened (<= 80px tall, icon <= 24px, title and sub on separate lines)',A.h<=80&&A.svg<=24&&A.sep&&!A.loaded,A);
  await pg.tap('#calRow .cal-home-row'); await pg.waitForSelector('#calendarView .cal-day',{timeout:8000});
  ok(T+'tapping it opens #calendar',await pg.evaluate(()=>location.hash==='#calendar'&&!document.getElementById('calendarView').hidden&&document.getElementById('homeView').hidden));
  const days=await pg.$$eval('.cal-day',e=>e.map(x=>({t:x.classList.contains('today'),d:x.dataset.day})));
  ok(T+'week list: 7 day rows, today highlighted',days.length===7&&days.filter(d=>d.t).length===1&&days.find(d=>d.t).d===TODAY,days.map(d=>d.d));
  const c1=await pg.$eval('.cal-item[data-id="c1"]',e=>({time:e.querySelector('.ci-time')?.textContent,bdi:e.querySelector('.ci-time')?.tagName,chip:e.querySelector('.cal-chip')?.textContent,fmt:e.querySelector('.ci-fmt')?.getAttribute('aria-label'),cap:e.querySelector('.ci-cap')?.textContent,dir:e.querySelector('.ci-cap')?.getAttribute('dir'),copy:!!e.querySelector('.ci-copy'),more:e.querySelector('.ci-more')?.offsetHeight}));
  ok(T+'item card: format icon, time in bdi, status chip, caption (dir=auto), Copy caption, visible ⋯',c1.time==='9:30'&&c1.bdi==='BDI'&&c1.chip==='Draft'&&c1.fmt==='Story'&&/New batch today/.test(c1.cap)&&c1.dir==='auto'&&c1.copy&&c1.more>=44,c1);
  await pg.waitForFunction(()=>{ const i=document.querySelector('.cal-item[data-id="c1"] .ci-thumbs img'); return i&&i.getAttribute('src'); },null,{timeout:6000}).catch(()=>{});
  ok(T+'linked design thumb shows',await pg.evaluate(()=>{ const i=document.querySelector('.cal-item[data-id="c1"] .ci-thumbs img'); return !!i&&!!i.getAttribute('src')&&i.complete&&i.naturalWidth>0; }));
  const hd=await pg.evaluate(()=>{ const top=document.querySelector('.cal-top').getBoundingClientRect(), seg=document.querySelector('.cal-seg').getBoundingClientRect(), nw=document.querySelector('.cal-new').getBoundingClientRect(); return {top:top.top,h:top.height,segIn:seg.top>=top.top&&seg.bottom<=top.bottom,newIn:nw.bottom<=top.bottom,segTapH:document.querySelector('[data-mode]').offsetHeight}; });
  ok(T+'one compact header block (2.4.1: with the Calendar · Ideas · Goals tabs) holds Back, New, Week/Month and the arrows (switch fully visible)',hd.top===0&&hd.segIn&&hd.newIn&&hd.h<=190,hd);
  const lg=await pg.$eval('.cal-item.ro',e=>e.innerText).catch(()=>'');
  ok(T+'old posted log entry shows as a read-only posted item',/Old posted story/.test(lg)&&/Posted/.test(lg),lg.replace(/\s+/g,' '));
  const t0=await txt(pg,'.cal-title'); await pg.tap('[data-nav="1"]'); await pg.waitForTimeout(350);
  const t1=await txt(pg,'.cal-title'); ok(T+'next arrow changes the week',t0!==t1&&(await pg.$$('.cal-day')).length===7,t0+' -> '+t1);
  await pg.tap('.cal-today'); await pg.waitForTimeout(350); ok(T+'Today returns',(await txt(pg,'.cal-title'))===t0&&!(await pg.$('.cal-today')));
  /* month */
  await pg.tap('[data-mode="month"]'); await pg.waitForSelector('.cm-grid');
  ok(T+'month view: 42 days, dots under days with items',(await pg.$$('.cal-cell')).length===42&&(await pg.$$(`.cal-cell[data-day="${TODAY}"] .dot`)).length>=2);
  await pg.tap(`.cal-cell[data-day="${TODAY}"] .cc-num`); await pg.waitForSelector('.cal-week');
  ok(T+'tap a day in the month goes to that week',await pg.evaluate(t=>!!document.querySelector('.cal-day.today[data-day="'+t+'"]'),TODAY));
  /* Plan a post: tap +, Post, Pick a design, a design, a time chip, Save (caption typed) */
  let taps=0; const tap=async sel=>{ taps++; await pg.tap(sel); };
  await tap(`[data-add="${OTHER}"]`); await pg.waitForSelector('dialog.cal-dlg[open] #calCap');
  const sheet0=await pg.evaluate(()=>({title:!!document.querySelector('#calTitle'),tags:!!document.querySelector('#calTags'),st:[...document.querySelectorAll('[data-st]')].map(e=>e.textContent),
    fmt:[...document.querySelectorAll('[data-fmt]')].map(e=>e.textContent.trim()+':'+e.getAttribute('aria-pressed')),at:[...document.querySelectorAll('[data-at]')].map(e=>e.textContent.replace(/\s/g,' ')+':'+e.getAttribute('aria-pressed')),day:document.querySelector('#calDayTxt').textContent,ph:document.querySelector('#calCap').placeholder,cnt:document.querySelector('#calCount').textContent.replace(/\s+/g,' ')}));
  ok(T+'the sheet has Post/Story/Reel (none chosen), a design tile, a day pill, time chips (7 pm on), caption, Draft/Ready/Posted; no title, hashtag or old status list',!sheet0.title&&!sheet0.tags&&sheet0.st.join()==='Draft,Ready,Posted'&&sheet0.fmt.join()==='Post:false,Story:false,Reel:false'&&sheet0.at.join()==='9 am:false,12 pm:false,7 pm:true,9 pm:false,Other:false'&&/^\w{3},? .*\d/.test(sheet0.day)&&sheet0.ph==='Write or paste the caption'&&/0 \/ 2,200/.test(sheet0.cnt),sheet0);
  const CAP='Fresh batch is here #cold #brew\nCome and get it';
  await pg.fill('#calCap',CAP);
  await tap('[data-fmt="post"]'); await tap('#calPick'); await pg.waitForSelector('dialog.cal-full .cal-pcard');
  await pg.waitForFunction(()=>{ const i=document.querySelector('.cal-full .cal-pcard img'); return i&&i.getAttribute('src'); },null,{timeout:6000}).catch(()=>{});
  const nOpen=(await pg.$$('.cal-full .cal-pcard')).length;   /* r3-extras: the picker opens on All */
  /* the picker: every design (opens on All; Stories and Posts narrow it, each chip shows a count), search, chips, no nested scroller */
  ok(T+'picker opens full screen on All, with only the collection chips (2.4.0: no Stories / Posts row)',await pg.evaluate(()=>{ const r=document.querySelector('dialog.cal-full').getBoundingClientRect(); return Math.abs(r.width-innerWidth)<=1&&Math.abs(r.height-innerHeight)<=2&&!document.querySelector('.cp-shape')&&document.querySelector('[data-col=""]').getAttribute('aria-pressed')==='true'; }));
  const all=(await pg.$$('.cal-full .cal-pcard')).length;
  ok(T+'All shows ALL designs (templates included), straight away',all===NDES&&nOpen===NDES,[all,nOpen,NDES]);
  await pg.evaluate(()=>{ const g=document.querySelector('.cal-full .cal-pcard:last-child'); g.scrollIntoView({block:'end'}); });
  await pg.waitForFunction(()=>{ const i=document.querySelector('.cal-full .cal-pcard:last-child img'); return i&&i.getAttribute('src'); },null,{timeout:6000}).catch(()=>{});
  ok(T+'the last design is reachable and its thumb loads when scrolled into view',await pg.evaluate(()=>{ const i=document.querySelector('.cal-full .cal-pcard:last-child img'); return !!i.getAttribute('src'); }));
  const cols3=await pg.evaluate(()=>{ const t=[...document.querySelectorAll('.cal-full .cal-pcard')].map(e=>Math.round(e.getBoundingClientRect().left)); return new Set(t).size; });
  ok(T+'the grid is 3 columns on a phone',cols3===3,cols3);
  const nested=await pg.evaluate(()=>{ const dlg=document.querySelector('dialog.cal-full'); return [...dlg.querySelectorAll('*')].filter(e=>{ const c=getComputedStyle(e); return /(auto|scroll)/.test(c.overflowY)&&e.scrollHeight>e.clientHeight+1; }).map(e=>e.className||e.tagName); });
  ok(T+'no nested scroll box inside the picker (only the page itself scrolls)',nested.length===0,nested);
  await pg.evaluate(()=>document.querySelector('dialog.cal-full').scrollTo(0,0));
  await pg.fill('#calQ','restock'); await pg.waitForTimeout(150); const nR=(await pg.$$('.cal-full .cal-pcard')).length;
  ok(T+'English search filters by name or tool',nR>=3&&nR<all,nR);
  await pg.fill('#calQ','باشن'); await pg.waitForTimeout(150);
  ok(T+'Arabic search finds the Arabic-named design',(await pg.$$('.cal-full .cal-pcard')).length===1&&/باشن/.test(await txt(pg,'.cal-pcard')));
  await pg.fill('#calQ','offers'); await pg.waitForTimeout(150);
  ok(T+'search also matches collection names',(await pg.$$('.cal-full .cal-pcard')).length>=4);
  await pg.fill('#calQ',''); await pg.waitForTimeout(100);
  const chips=await pg.$$eval('.cp-chips .chip',e=>e.map(x=>x.textContent.trim()));
  ok(T+'collection chips: All + every collection by name',chips[0]==='All'&&chips.includes('Restocks')&&chips.includes('Offers'),chips);
  await pg.tap('.cp-chips [data-col="Restocks"]'); await pg.waitForTimeout(150);
  const nC=await pg.$$eval('.cal-full .cal-pcard',e=>e.length); ok(T+'Restocks chip filters the grid',nC>=3&&nC<all,nC);
  await pg.tap('.cp-chips [data-col=""]'); await pg.waitForTimeout(100);
  await pg.evaluate(()=>document.querySelector('dialog.cal-full').scrollTo(0,0));
  await tap('.cal-full .cal-pcard >> nth=1'); await pg.waitForSelector('dialog.cal-full',{state:'detached'});
  ok(T+'one tap on a design picks it and closes the picker (tile shows its thumb)',await pg.evaluate(()=>{ const i=document.querySelector('#calPick img'); return !!i&&!!i.getAttribute('src'); }));
  await tap('[data-at="12:00"]');
  const filled=await pg.evaluate(()=>[...document.querySelectorAll('dialog[open] .btn,dialog[open] .mini.solid')].filter(e=>e.offsetParent).length);
  ok(T+'the sheet has one filled button (Save)',filled===1,filled);
  const sticky=await pg.evaluate(()=>{ const f=document.querySelector('#calSave').getBoundingClientRect(); return f.bottom<=innerHeight&&f.top>=0; });
  ok(T+'Save is visible without scrolling (sticky)',sticky);
  await tap('#calSave'); await pg.waitForSelector('dialog.cal-dlg',{state:'detached',timeout:6000});
  ok(T+'a post with a design and a caption took at most 6 taps',taps<=6,taps);
  await pg.waitForFunction(c=>[...document.querySelectorAll('.cal-item .ci-cap')].some(e=>e.textContent.includes(c)),'Fresh batch is here',{timeout:8000,polling:100}).catch(()=>{});
  const saved=(await stored(pg)).find(x=>x.caption===CAP);
  ok(T+'stored: day, time, format, one design, caption, hashtags from the caption, Draft, author, title = design name',!!saved&&saved.day===OTHER&&saved.at==='12:00'&&saved.format==='post'&&saved.design_ids.length===1&&saved.hashtags.join(' ')==='#cold #brew'&&saved.status==='draft'&&saved.author==='Sara'&&saved.title===db.designs[saved.design_ids[0]].name,saved);
  ok(T+'toast says Saved and the card shows the caption',/Saved/.test(await pg.evaluate(()=>document.body.innerText))&&!!(await pg.$(`.cal-item[data-id="${saved&&saved.id}"] .ci-cap`)));
  /* edit: day via the date input, a time chip, status Ready */
  const NEWD=iso(new Date(sun.getFullYear(),sun.getMonth(),sun.getDate()+(now.getDay()>=5?-1:5)));
  await pg.tap(`.cal-item[data-id="${saved.id}"] .ci-main`); await pg.waitForSelector('dialog.cal-dlg[open] #calCap');
  const pre=await pg.evaluate(()=>({f:document.querySelector('[data-fmt][aria-pressed="true"]')?.textContent.trim(),t:document.querySelector('[data-at][aria-pressed="true"]')?.textContent.replace(/\s/g,' ').trim(),cap:document.querySelector('#calCap').value,tile:document.querySelector('#calPick').innerText.replace(/\s+/g,' ')}));
  ok(T+'tapping the card opens the sheet filled in (format, time chip, caption, design)',pre.f==='Post'&&pre.t==='12 pm'&&pre.cap===CAP&&/Change/.test(pre.tile),pre);
  await pg.fill('#calDay',NEWD); await pg.tap('[data-at="21:00"]'); await pg.tap('[data-st="approved"]'); await pg.tap('#calSave'); await pg.waitForSelector('dialog.cal-dlg',{state:'detached',timeout:6000});
  await pg.waitForTimeout(500);
  const ed=(await stored(pg)).find(x=>x.id===saved.id);
  ok(T+'edit moves the day, changes the time, Ready is stored as approved',ed.day===NEWD&&ed.at==='21:00'&&ed.status==='approved'&&ed.caption===CAP,ed);
  /* in review stays read-only text with the three choices still tappable */
  await pg.tap('.cal-item[data-id="c2"] .ci-main'); await pg.waitForSelector('dialog.cal-dlg[open] #calCap');
  const rv=await pg.evaluate(()=>({t:document.querySelector('.cal-rev')?.textContent,pressed:document.querySelectorAll('[data-st][aria-pressed="true"]').length,n:document.querySelectorAll('[data-st]').length}));
  ok(T+'an item in review shows "In review" read-only with Draft/Ready/Posted still tappable',rv.t==='In review'&&rv.pressed===0&&rv.n===3,rv);
  await pg.tap('#calCancel'); await pg.waitForSelector('dialog.cal-dlg',{state:'detached'});
  /* Arabic caption: right-to-left, live count, warning above 2,200 */
  await pg.tap('.cal-new'); await pg.waitForSelector('dialog.cal-dlg[open] #calCap');
  await pg.fill('#calCap','علبتك واجد حلوة\nباشن فروت');
  const cd=await pg.$eval('#calCap',e=>getComputedStyle(e).direction), cnt=await txt(pg,'#calCount');
  ok(T+'Arabic caption is right-to-left and the count updates',cd==='rtl'&&/^25 \/ 2,200$/.test(cnt),[cd,cnt]);
  await pg.fill('#calCap','x'.repeat(2300)); const over=await pg.$eval('#calCount',e=>({c:e.classList.contains('over'),t:e.innerText.replace(/\s+/g,' ')}));
  const hgt=await pg.$eval('#calCap',e=>e.offsetHeight);
  ok(T+'above 2,200 the count turns to the warning colour; the box stops growing (about 8 lines)',over.c&&/2,300 \/ 2,200/.test(over.t)&&hgt<=260,[over,hgt]);
  const sw=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth})); ok(T+'no sideways scroll with the sheet open',sw.sw<=sw.iw);
  const small0=await pg.evaluate(()=>[...document.querySelectorAll('dialog[open] button')].filter(e=>e.offsetParent&&!e.disabled).map(e=>({c:e.className||e.id,w:e.offsetWidth,h:e.offsetHeight})).filter(x=>x.w<44||x.h<44));
  ok(T+'tap targets in the sheet are at least 44px',small0.length===0,small0.slice(0,4));
  await pg.tap('#calCancel'); await pg.waitForSelector('dialog.cal-dlg',{state:'detached'});
  /* Copy caption (card button), the ⋯ menu */
  await pg.tap('.cal-item[data-id="c1"] .ci-copy');
  await pg.waitForTimeout(200);
  ok(T+'Copy caption puts the caption on the clipboard and says so',(await pg.evaluate(()=>navigator.clipboard.readText()))==='New batch today\nsecond line #cold'&&/Caption copied/.test(await pg.evaluate(()=>document.body.innerText)));
  await pg.tap('.cal-item[data-id="c1"] .ci-more'); await pg.waitForSelector('dialog.cal-dlg[open] .cal-menu');
  const mrows=await pg.$$eval('dialog[open] .act-row',e=>e.map(x=>x.textContent.trim()));
  ok(T+'⋯ menu: Mark as posted, Copy caption, Move to tomorrow, Delete',mrows.join('|')==='Mark as posted|Copy caption|Move to tomorrow|Delete',mrows);
  const d1=(await stored(pg)).find(x=>x.id==='c1').day;
  await pg.tap('dialog[open] [data-a="tomorrow"]'); await pg.waitForTimeout(600);
  ok(T+'Move to tomorrow moves it one day',(await stored(pg)).find(x=>x.id==='c1').day===nextDay(d1),[d1,(await stored(pg)).find(x=>x.id==='c1').day]);
  await pg.tap('.cal-item[data-id="c2"] .ci-more'); await pg.tap('dialog[open] [data-a="mark"]');
  await pg.waitForFunction(()=>document.querySelector('.cal-item[data-id="c2"] .cal-chip')?.textContent==='Posted',null,{timeout:5000}).catch(()=>{});
  ok(T+'Mark as posted (chip + stored)',(await txt(pg,'.cal-item[data-id="c2"] .cal-chip'))==='Posted'&&(await stored(pg)).find(x=>x.id==='c2').status==='posted');
  await pg.tap('.cal-item[data-id="c2"] .ci-more'); await pg.waitForSelector('dialog.cal-dlg[open] .cal-menu');
  ok(T+'a posted item offers Mark as ready',/Mark as ready/.test(await txt(pg,'dialog[open]')));
  await pg.tap('dialog.cal-dlg[open] [data-a="del"]');
  await pg.waitForSelector('dialog.cal-dlg[open] [data-yes]');
  ok(T+'Delete asks first',/Delete this post/.test(await txt(pg,'dialog.cal-dlg[open]'))&&(await stored(pg)).some(x=>x.id==='c2'));
  await pg.tap('dialog.cal-dlg[open] [data-no]'); await pg.waitForTimeout(200);
  ok(T+'Cancel keeps it',(await stored(pg)).some(x=>x.id==='c2'));
  await pg.tap('.cal-item[data-id="c2"] .ci-more'); await pg.tap('dialog.cal-dlg[open] [data-a="del"]'); await pg.tap('dialog.cal-dlg[open] [data-yes]');
  await pg.waitForFunction(()=>!document.querySelector('.cal-item[data-id="c2"]'),null,{timeout:5000}).catch(()=>{});
  ok(T+'Delete removes it',!(await stored(pg)).some(x=>x.id==='c2')&&!(await pg.$('.cal-item[data-id="c2"]')));
  ok(T+'no long-press menu on touch (the ⋯ replaces it)',await pg.evaluate(async()=>{ const el=document.querySelector('.cal-item .ci-main'), r=el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:7,isPrimary:true,clientX:r.left+30,clientY:r.top+20,button:0})); await new Promise(x=>setTimeout(x,700)); const open=!!document.querySelector('dialog[open]'); el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:7})); return !open; }));
  /* tap targets (layout size: a pressed chip is drawn at .96) */
  const small=await pg.evaluate(()=>[...document.querySelectorAll('#calendarView button,#calendarView a,#calRow button')].filter(e=>e.offsetParent&&!e.disabled).map(e=>{ return {c:e.className,w:e.offsetWidth,h:e.offsetHeight}; }).filter(x=>x.w<44||x.h<44));
  ok(T+'tap targets are at least 44px',small.length===0,small.slice(0,4));
  ok(T+'at most two filled buttons in the week view',(await pg.evaluate(()=>[...document.querySelectorAll('#calendarView .btn,#calendarView .mini.solid')].filter(e=>e.offsetParent).length))<=2);
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
  await pg.tap('.cal-new'); await pg.waitForSelector('dialog.cal-dlg[open] #calCap'); m=await w(); ok('360: no sideways scroll with the sheet open',m.sw<=m.iw,m);
  const fit=await pg.evaluate(()=>{ const d=document.querySelector('dialog.cal-dlg'), r=d.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth; }); ok('360: the sheet fits the screen',fit);
  await pg.tap('#calPick'); await pg.waitForSelector('dialog.cal-full .cal-pcard'); m=await w(); ok('360: no sideways scroll with the picker open',m.sw<=m.iw,m);
  const pw=await pg.evaluate(()=>{ const d=document.querySelector('dialog.cal-full'); return d.scrollWidth<=d.clientWidth&&[...d.querySelectorAll('.cal-pcard')].every(e=>e.getBoundingClientRect().right<=innerWidth); }); ok('360: picker cards stay inside the screen',pw);
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
  await pg.click('.cal-pill[data-id="c2"]'); await pg.waitForSelector('dialog.cal-dlg[open] #calCap');
  ok('desktop: clicking an item opens its edit sheet (in review shown read-only)',(await txt(pg,'.cal-rev'))==='In review');
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(bad?bad+' FAILED':'ALL PASS ('+res.length+')'); process.exit(bad?1:0);

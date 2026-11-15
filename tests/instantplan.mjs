/* Instant Plan (Session 7): Calendar + Goals paint their last data at once from this device, then refresh quietly.
   1 first visit loads and writes studio:plan:cal:<brand> / studio:plan:kpi:<brand>
   2 second visit (new page, same storage) shows the cached cards within 150 ms, before the (delayed) cloud answers, no skeleton
   3 a changed cloud row appears after the background refresh (no blank in between)
   4 offline with a cache: items + a quiet "Updated 5 min ago" line, no offline note, no banner
   5 signed out clears the key
   6 calendar show({day}) jumps to that week / month and rings the day card for ~1.2 s (reduced motion: static ring)
   7 light + dark at 390 (touch)
   Run: node tests/instantplan.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8')+`
;(()=>{ const C=window.StudioCloud; window.__ans=0; ['calendar','kpiMonths','designs'].forEach(k=>{ const f=C[k]; C[k]=async function(){ if(window.__slow) await new Promise(r=>setTimeout(r,window.__slow)); const r=await f.apply(C,arguments); window.__ans++; return r; }; }); })();`;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const off=n=>{ const d=new Date(); return iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)); };
const CUR=off(0).slice(0,7);
const db=seedDesigns(), dids=Object.keys(db.designs);
const mk=(id,n,at,status,format,title,design)=>({id,brand:'1stchoice',day:off(n),at,status,format,title,caption:'A caption for '+title,hashtags:[],design_ids:design?[design]:[],author:'Sara',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
db.calendar=[mk('a',0,'09:00','draft','post','Today post',dids[0]),mk('b',0,'18:00','approved','reel','Soon reel',dids[1]),mk('c',-1,'12:00','posted','post','Posted one',dids[2]),mk('d',2,'10:00','draft','story','A story')];
db.ideas=[]; db.kpi_months=[{id:'m1',brand:'1stchoice',month:CUR,targets:{post:15,story:10,reel:4,giveaway:1},engagement:{},note:''}];
const init=(mode)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); localStorage.setItem('studio:calMode','"${mode||'week'}"'); localStorage.setItem('studio:flag:plan','1');
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
async function ctxOf(scheme,mode,extra){ const ctx=await b.newContext({serviceWorkers:'block',colorScheme:scheme||'light',...PH,...(extra||{})});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(mode)}); return ctx; }
async function page(ctx,hash,{slow=0,offline=false}={}){ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(`window.__slow=${slow}; ${offline?"Object.defineProperty(navigator,'onLine',{get:()=>false});":''}`); await pg.goto(BASE+'index.html'+hash); return pg; }
const KEYS={cal:'studio:plan:cal:1stchoice',kpi:'studio:plan:kpi:1stchoice'};
const getKey=(pg,k)=>pg.evaluate(k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(_){ return 'bad'; } },k);

async function suite(T,scheme,tab){ const hash=tab==='cal'?'#calendar':'#goals', card=tab==='cal'?'#calendarView .cal-item':'#goalsView .kp-card', root=tab==='cal'?'#calendarView':'#goalsView';
  const ctx=await ctxOf(scheme);
  /* 1 first visit */
  let pg=await page(ctx,hash); await pg.waitForSelector(card,{timeout:10000}); await pg.waitForTimeout(500);
  const c1=await getKey(pg,KEYS[tab]);
  ok(T+'first visit writes the cache',!!c1&&c1.v===1&&typeof c1.at==='number'&&(tab==='cal'?Array.isArray(c1.items)&&c1.items.length===4:!!c1.rows&&!!c1.rows[CUR]),c1&&Object.keys(c1));
  const n1=await pg.$$eval(card,e=>e.length); await pg.close();
  /* 2 second visit: cached paint before the cloud answers */
  pg=await page(ctx,hash,{slow:4000});
  await pg.waitForSelector(root+' .cal-top',{timeout:10000,state:'attached'}); const t0=Date.now();
  const seen=await pg.waitForSelector(card,{timeout:150}).then(()=>true,()=>false);
  const dt=Date.now()-t0, st=await pg.evaluate(r=>({ans:window.__ans,skel:document.querySelectorAll(r+' .cal-skel').length,stale:!!document.querySelector(r+' .cal-stale:not([hidden])')}),root);
  ok(T+'second visit shows the cached cards within 150 ms',seen,dt);
  ok(T+'...before the cloud answered, no skeleton, no stale line while online',st.ans===0&&st.skel===0&&!st.stale,st);
  ok(T+'...same number of cards as the first visit',(await pg.$$eval(card,e=>e.length))===n1,n1);
  /* 3 a changed cloud row appears after the background refresh */
  await pg.evaluate(CUR=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); d.calendar.push({id:'z',brand:'1stchoice',day:new Date().toISOString().slice(0,10),at:'20:00',status:'draft',format:'post',title:'Brand new',caption:'Brand new',hashtags:[],design_ids:[],author:'Sara',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
    d.kpi_months.find(m=>m.month===CUR).targets.post=22; localStorage.setItem('fakecloud',JSON.stringify(d)); },CUR);
  await pg.close();
  pg=await page(ctx,hash,{slow:1200}); await pg.waitForSelector(card,{timeout:10000});
  const before=await pg.evaluate(r=>document.querySelector(r).innerText,tab==='cal'?'#calendarView':'#goalsView');
  const early=tab==='cal'?await pg.$$eval(card,e=>e.length):await pg.$eval('#goalsView [data-kp-card="post"]',e=>e.innerText.replace(/\s+/g,' '));
  ok(T+'cached data first (old state), nothing blank',tab==='cal'?early===n1:/of 15/.test(early),early);
  let blank=false; const w=setInterval(()=>{ pg.$$eval(card,e=>e.length).then(n=>{ if(!n) blank=true; },()=>{}); },80);
  const upd=await pg.waitForFunction(({tab,n1})=>tab==='cal'?document.querySelectorAll('#calendarView .cal-item').length>n1:/of 22/.test((document.querySelector('#goalsView [data-kp-card="post"]')||{innerText:''}).innerText.replace(/\s+/g,' ')),{tab,n1},{timeout:8000}).then(()=>true,()=>false);
  clearInterval(w); ok(T+'the changed cloud row appears after the background refresh',upd);
  ok(T+'...and the pane never went blank meanwhile',!blank);
  await pg.waitForTimeout(300); const c3=await getKey(pg,KEYS[tab]); ok(T+'...and the cache is updated',!!c3&&(tab==='cal'?c3.items.length===5:c3.rows[CUR].targets.post===22));
  /* 4 offline with a cache */
  await pg.evaluate(k=>{ const c=JSON.parse(localStorage.getItem(k)); c.at=Date.now()-5*60000; localStorage.setItem(k,JSON.stringify(c)); },KEYS[tab]); await pg.close();
  await ctx.setOffline(true); await ctx.setOffline(false);   /* the dev server stays reachable; the page itself believes it is offline */
  pg=await page(ctx,hash,{offline:true}); await pg.waitForSelector(card,{timeout:10000}); await pg.waitForTimeout(700);
  const o4=await pg.evaluate(r=>({stale:(document.querySelector(r+' .cal-stale:not([hidden])')||{}).innerText||'',note:document.querySelectorAll(r+' .cal-note').length,toast:[...document.querySelectorAll('.toast,#toast')].some(e=>/from before/i.test(e.innerText)&&/calendar|goals/i.test(e.innerText)),banner:!!document.querySelector('.offline-banner,.net-banner'),n:document.querySelectorAll(r+' .cal-item,'+r+' .kp-card').length}),root);
  ok(T+'offline: the cached cards stay',o4.n>0,o4);
  ok(T+'offline: a quiet "Updated 5 min ago" line',/^Updated\s+5 min ago$/.test(o4.stale.trim()),o4.stale);
  ok(T+'offline: no error note, no toast, no banner',o4.note===0&&!o4.toast&&!o4.banner,o4);
  ok(T+'offline: the line is muted and small',await pg.$eval(root+' .cal-stale',e=>{ const s=getComputedStyle(e); return parseFloat(s.fontSize)<=14&&s.color!==getComputedStyle(document.body).color; }));
  ok(T+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0);
  await pg.close();
  /* 5 signed out clears the key */
  pg=await page(ctx,hash,{slow:200}); await pg.evaluate(()=>localStorage.setItem('fakecloud-signedout','1')); await pg.reload(); await pg.waitForSelector(root+' .cal-note',{timeout:10000});
  ok(T+'signed out: the cache key is cleared',(await getKey(pg,KEYS[tab]))===null,await getKey(pg,KEYS[tab]));
  await pg.close(); await ctx.close();
}
for(const [sc,T] of [['light','390 light '],['dark','390 dark ']]) for(const tab of ['cal','kpi']) await suite(T+(tab==='cal'?'Calendar: ':'Goals: '),sc,tab);

/* 6 show({day}) */
for(const [mode,days,reduced] of [['week',[20],false],['month',[45],false],['week',[10],true]]){
  const T='show(day) '+mode+(reduced?' reduced motion':'')+': ', ctx=await ctxOf('light',mode,reduced?{reducedMotion:'reduce'}:{});
  const pg=await page(ctx,'#calendar'); await pg.waitForSelector('#calendarView .cal-day,#calendarView .cal-cell',{timeout:10000}); await pg.waitForTimeout(400);
  const day=off(days[0]), t0=await pg.$eval('#calendarView .cal-title',e=>e.textContent);
  const r=await pg.evaluate(day=>{ const a=window.StudioCalendar&&StudioCalendar.api&&StudioCalendar.api(); if(!a||!a.show) return 'no api'; a.show({day}); return 'ok'; },day);
  ok(T+'the module exposes show({day})',r==='ok',r);
  await pg.waitForFunction(day=>!!document.querySelector('#calendarView [data-day="'+day+'"]'),day,{timeout:5000}).catch(()=>{});
  await pg.waitForTimeout(150);
  const s=await pg.evaluate(day=>{ const el=document.querySelector('#calendarView [data-day="'+day+'"]'); return {has:!!el,ring:!!el&&el.classList.contains('cal-ring'),title:document.querySelector('#calendarView .cal-title').textContent,an:el?getComputedStyle(el,'::after').animationName:'',rect:el?el.getBoundingClientRect().top:-1}; },day);
  ok(T+'jumps to the week / month that holds the day',s.has&&s.title!==t0,[t0,s.title]);
  ok(T+'the day card has the ring',s.ring,s);
  ok(T+(reduced?'static ring (no animation)':'the ring fades (animation)'),reduced?s.an==='none':s.an==='calRing',s.an);
  ok(T+'the day is on screen',s.rect>=0&&s.rect<844,s.rect);
  await pg.waitForTimeout(1300); ok(T+'the ring is gone after ~1.2 s',await pg.evaluate(()=>!document.querySelector('#calendarView .cal-ring')));
  await ctx.close();
}
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(res.join('\n')); const f=res.filter(x=>x.startsWith('FAIL')).length; console.log(f?f+' FAILED':'all passed ('+res.length+')'); process.exit(f?1:0);

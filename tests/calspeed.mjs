/* Calendar speed + transitions (Session 2): switching Week / Month / Feed and prev / next draws from the in-memory cache.
   1 inside the cached window no cloud calendar request is made, and the new view is in the DOM within 100 ms of the tap
   2 never two .cal-body / two views on screen at once mid-transition; the body animates (opacity/transform only); reduced motion = none
   3 the sliding pill sits under the chosen segment (all three, after the 200 ms move)
   4 a range outside the cached window fetches once and then works; feed.js is preloaded at idle
   5 light + dark at 390 (touch), 1280x800: no sideways scroll
   Run: node tests/calspeed.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const off=n=>{ const d=new Date(); return iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)); };
const db0=seedDesigns(), dids=Object.keys(db0.designs);
const mk=(id,n,at,status,format,title,design)=>({id,brand:'1stchoice',day:off(n),at,status,format,title,caption:n%2?'A caption for '+title:'',hashtags:[],design_ids:design?[design]:[],author:'Sara',created_at:new Date().toISOString()});
const ITEMS=[mk('a',0,'09:00','draft','post','Today post',dids[0]),mk('b',2,'18:00','approved','reel','Soon reel',dids[1]),mk('c',-3,'12:00','posted','post','Posted one',dids[2]),mk('d',9,'10:00','draft','story','A story',dids[2]),mk('e',40,'10:00','draft','post','Next month',dids[0])];
const db=JSON.parse(JSON.stringify(db0)); db.calendar=ITEMS;
const init=`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); localStorage.setItem('studio:calMode','"week"'); localStorage.setItem('studio:flag:team','1');
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function open(opts,scheme){
  const ctx=await b.newContext({serviceWorkers:'block',colorScheme:scheme||'light',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('.cal-day',{timeout:10000}).catch(async e=>{ console.log(errs, await pg.evaluate(()=>document.querySelector('.cal-body')&&document.querySelector('.cal-body').innerHTML.slice(0,300))); throw e; }); await pg.waitForTimeout(900);
  await pg.evaluate(()=>{ const c=window.StudioCloud, f=c.calendar; window.__calN=0; c.calendar=function(){ window.__calN++; return f.apply(c,arguments); }; });
  return [ctx,pg];
}
const calls=pg=>pg.evaluate(()=>window.__calN);
/* sample the DOM every frame for ~320 ms after a tap */
const watch=(pg,ms=320)=>pg.evaluate(ms=>new Promise(r=>{ const t0=performance.now(); let bodies=0, views=0, anim=0, minOp=1;
  const f=()=>{ bodies=Math.max(bodies,document.querySelectorAll('.cal-body').length); views=Math.max(views,document.querySelectorAll('.cal-week,.cal-month,.feed,.feed-empty').length);
    const el=document.querySelector('.cal-body'); if(el){ anim=Math.max(anim,el.getAnimations().length); minOp=Math.min(minOp,+getComputedStyle(el).opacity); }
    if(performance.now()-t0<ms) requestAnimationFrame(f); else r({bodies,views,anim,minOp}); }; f(); }),ms);
const pillOK=pg=>pg.evaluate(()=>{ const p=document.querySelector('.cs-pill').getBoundingClientRect(), c=document.querySelector('.cal-seg [aria-pressed="true"]').getBoundingClientRect();
  return Math.abs((p.left+p.width/2)-(c.left+c.width/2))<=2&&Math.abs(p.width-c.width)<=2; });
const tapGo=async(pg,sel,view,tag,anim)=>{ await pg.tap(sel); const t0=Date.now(); let seen=true; try{ await pg.waitForSelector(view,{timeout:100,state:'attached'}); }catch(_){ seen=false; }
  const w=await watch(pg); await pg.waitForTimeout(80);
  ok(tag+': new view in the DOM within 100 ms of the tap',seen,Date.now()-t0);
  ok(tag+': one body, one view at a time',w.bodies===1&&w.views===1,w);
  if(anim!==undefined) ok(tag+(anim?': the body animates (opacity/transform)':': reduced motion, no animation'),anim?w.anim>0:w.anim===0,w);
  return w; };

for(const [name,opts,scheme] of [['390 light',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'light'],['390 dark',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'dark'],['1280',{viewport:{width:1280,height:800}},'light']]){
  const [ctx,pg]=await open(opts,scheme), tap=name==='1280'?'click':'tap';
  const T=name+' ';
  const go=async(sel,view,tag,anim)=>{ if(tap==='click'){ await pg.click(sel); } else await pg.tap(sel); const t0=Date.now(); let seen=true; try{ await pg.waitForSelector(view,{timeout:100,state:'attached'}); }catch(_){ seen=false; }
    const w=await watch(pg); await pg.waitForTimeout(80); ok(T+tag+': in the DOM within 100 ms',seen,Date.now()-t0); ok(T+tag+': one body, one view at a time',w.bodies===1&&w.views===1,w);
    if(anim!==undefined) ok(T+tag+': the body animates',anim?w.anim>0:w.anim===0,w); return w; };
  ok(T+'items are drawn (Today post)',await pg.$$eval('.cal-item',e=>e.length>0));
  ok(T+'feed.js is preloaded at idle',await pg.waitForFunction(()=>!!window.StudioFeed,null,{timeout:6000}).then(()=>true,()=>false));
  ok(T+'pill under Week at start',await pillOK(pg));
  await go('[data-mode="month"]','.cal-month','Week to Month',true); ok(T+'pill under Month',await pillOK(pg));
  await go('[data-mode="feed"]','.feed','Month to Feed',true); ok(T+'pill under Feed',await pillOK(pg));
  await go('[data-mode="week"]','.cal-week','Feed to Week',true); ok(T+'pill under Week',await pillOK(pg));
  const t0=await pg.$eval('.cal-title',e=>e.textContent);
  await go('[data-nav="1"]','.cal-week','Next week',true); const t1=await pg.$eval('.cal-title',e=>e.textContent);
  await go('[data-nav="-1"]','.cal-week','Previous week',true);
  ok(T+'next/prev change the title and come back',t1!==t0&&(await pg.$eval('.cal-title',e=>e.textContent))===t0,[t0,t1]);
  await go('[data-mode="month"]','.cal-month','to Month again'); await go('[data-nav="1"]','.cal-month','Next month');
  await go('[data-mode="week"]','.cal-week','to Week'); 
  ok(T+'no cloud calendar request while inside the cached window',(await calls(pg))===0,await calls(pg));
  ok(T+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0);
  /* far outside the window: one fetch, then it is cached */
  for(let i=0;i<30;i++) await pg.evaluate(()=>document.querySelector('[data-nav="1"]').click());
  await pg.waitForTimeout(600); const far=await calls(pg);
  ok(T+'a far week outside the window fetches (and still shows)',far>=1&&!!(await pg.$('.cal-day')),far);
  await pg.evaluate(()=>document.querySelector('[data-nav="1"]').click()); await pg.waitForTimeout(250);
  ok(T+'the next week after that is cached',(await calls(pg))===far,[far,await calls(pg)]);
  await ctx.close();
}
{ /* reduced motion: instant, no animation, pill still right */
  const [ctx,pg]=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await tapGo(pg,'[data-mode="month"]','.cal-month','reduced Week to Month',false); ok('reduced: pill under Month',await pillOK(pg));
  await tapGo(pg,'[data-mode="feed"]','.feed','reduced Month to Feed',false);
  ok('reduced: the pill has no transition',await pg.$eval('.cs-pill',e=>getComputedStyle(e).transitionDuration.split(',').every(x=>parseFloat(x)===0)||getComputedStyle(e).transitionProperty==='none'));
  await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(res.join('\n')); const f=res.filter(x=>x.startsWith('FAIL')).length; console.log(f?f+' FAILED':'all passed ('+res.length+')'); process.exit(f?1:0);

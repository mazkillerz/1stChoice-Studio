/* Studio 2.11.0: reminders for planned posts. fakecloud stands in for Supabase.
   1. Switch off (default): no setAppBadge/clearAppBadge calls, no note, no notification.   2. On: badge = today's not-posted count, posted items not counted.
   3. A reminder time still ahead: ONE in-app note, Post opens the Post now sheet; showNotification once (permission granted); reload does not refire.
   4. Opened late (item 10 min away): note at once.   5. Settings row (light + dark, 390x844, taps >= 44), off by default, never asks permission under webdriver; search action.
   6. Switching off clears the badge.   7. No page errors.   Run: node tests/reminders.mjs (server on :8080, or BASE=...). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const jpg=n=>'data:image/jpeg;base64,'+fs.readFileSync(S+n+'.jpg').toString('base64');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const pad=n=>(n<10?'0':'')+n, now=new Date(), TODAY=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
const hm=min=>{ const d=new Date(Date.now()+min*60e3); return pad(d.getHours())+':'+pad(d.getMinutes()); };
const PHONE={width:390,height:844};
/* records every badge call and notification; permission and service worker are stubs */
const STUB=`try{ window.__badge=[]; navigator.setAppBadge=async n=>{ window.__badge.push(['set',n]); }; navigator.clearAppBadge=async()=>{ window.__badge.push(['clear']); };
  window.__notes=[]; window.__ask=0; const perm=localStorage.getItem('stubPerm')||'granted';
  Object.defineProperty(window,'Notification',{value:{permission:perm,requestPermission:async()=>{ window.__ask++; return perm; }},configurable:true});
  Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>({}),addEventListener(){},getRegistration:async()=>null,controller:null,ready:Promise.resolve({showNotification:async(t,o)=>{ window.__notes.push({t,o}); }})},configurable:true}); }catch(e){}`;
const mk=async(vp,{scheme='light',db,on=true,perm,init=''}={})=>{
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(([s,on,perm])=>{ try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); localStorage.setItem('studio:flag:team','1'); if(on&&!localStorage.getItem('rmSeeded')){ localStorage.setItem('studio:remind','1'); localStorage.setItem('rmSeeded','1'); } if(perm) localStorage.setItem('stubPerm',perm); if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',s); }catch(e){} },[JSON.stringify(db),on,perm]);
  await ctx.addInitScript(STUB); if(init) await ctx.addInitScript(init);
  return ctx; };
const newPage=async ctx=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+e)); return pg; };
const home=async pg=>{ await pg.goto(BASE+'index.html'); await pg.waitForSelector('.cal-home-row',{timeout:10000}); await pg.waitForTimeout(1200); };
const badge=pg=>pg.evaluate(()=>window.__badge), notes=pg=>pg.evaluate(()=>window.__notes);

/* seed: one real design so Post now has something to show */
const base={designs:{},files:{},cols:{}};
{ const ctx=await mk(PHONE,{db:base,on:false}); const pg=await newPage(ctx); await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug);
  const r=await pg.evaluate(()=>Studio.debug.recipe()), paths=[]; r.photos.forEach((p,i)=>{ const k='1stchoice/dStory/photo-'+i+'.jpg'; base.files[k]=jpg('shelf'); paths.push(k); });
  r.photos=r.photos.map(p=>({...p,has:true})); base.files['1stchoice/dStory/thumb.jpg']=jpg('shelf');
  base.designs.dStory={id:'dStory',brand:'1stchoice',tool:'restock',name:'Shelf day',kind:'design',recipe:{...r,photoPaths:paths},thumb_path:'1stchoice/dStory/thumb.jpg',cols:[],updated_at:new Date(Date.now()-3600e3).toISOString()};
  await ctx.close(); }
const item=(id,at,status,design,title)=>({id,brand:'1stchoice',day:TODAY,at,status,format:'story',title,caption:'Cap',hashtags:[],design_ids:design?[design]:[],author:'Sara',created_at:new Date().toISOString()});
const withCal=cal=>({...JSON.parse(JSON.stringify(base)),calendar:cal});
/* times: A is 10 minutes away (late path: note at once), B is 3 hours away (no reminder), C posted, D has no time */
const DB_LATE=withCal([item('pA',hm(10),'draft','dStory','Shelf day'),item('pB',hm(180),'draft',null,'Later one'),item('pC',hm(5),'posted','dStory','Done'),item('pD',null,'draft',null,'No time')]);
const DB_SOON=withCal([item('pS',hm(16),'draft','dStory','Soon one'),item('pC',hm(5),'posted','dStory','Done')]);
const DB_FAR=withCal([item('pF',hm(240),'draft',null,'Far one'),item('pG',null,'draft',null,'Open one')]);
const settle=pg=>pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:4000}).catch(()=>{});

for(const dark of [false,true]){ tag=dark?'dark: ':'light: ';
  const sch=dark?'dark':'light';
  /* 1 off by default */
  { const ctx=await mk(PHONE,{db:DB_LATE,on:false,scheme:sch}); const pg=await newPage(ctx); await home(pg);
    ok('off: no badge calls, no note, no notification',(await badge(pg)).length===0&&!(await pg.$('.remind-bar'))&&(await notes(pg)).length===0,await badge(pg));
    /* 5 settings row */
    await pg.tap('#setBtn'); await pg.waitForSelector('dialog.set-dlg[open]');
    await settle(pg);
    const row=await pg.evaluate(()=>{ const r=document.querySelector('[data-set="remind"]'); if(!r) return null; const bb=r.getBoundingClientRect(); return {on:r.getAttribute('aria-checked'),h:bb.height,w:bb.width,t:r.textContent.trim(),vw:innerWidth,right:bb.right}; });
    ok('Settings row: off by default, "Remind me about planned posts", 44px+, fits 390',row&&row.on==='false'&&row.h>=44&&/Remind me about planned posts/.test(row.t)&&row.right<=row.vw+1,row);
    if(!dark){ await pg.evaluate(()=>document.querySelector('[data-set="remind"]').scrollIntoView({block:'center'})); await pg.waitForTimeout(300); await pg.screenshot({path:'/tmp/reminders-settings-light.png'}); }
    await pg.tap('[data-set="remind"]'); await pg.waitForTimeout(900);
    const st=await pg.evaluate(()=>({on:document.querySelector('[data-set="remind"]').getAttribute('aria-checked'),ls:localStorage.getItem('studio:remind'),ask:window.__ask}));
    ok('switch on: saved on this device, no automatic permission prompt under webdriver',st.on==='true'&&st.ls==='1'&&st.ask===0,st);
    await pg.waitForFunction(()=>window.__badge.length>0,null,{timeout:6000}).catch(()=>{});
    ok('switch on: badge appears at once (count 1: only the unposted ones with a time or not... A, B, D)',JSON.stringify(await badge(pg)).includes('["set",3]'),await badge(pg));
    await pg.tap('[data-set="remind"]'); await pg.waitForTimeout(500);
    const cl=await badge(pg); ok('switch off: badge cleared, stored off',cl[cl.length-1][0]==='clear'&&(await pg.evaluate(()=>localStorage.getItem('studio:remind')))===null,cl);
    await ctx.close(); }
  /* 5b blocked permission: subline */
  { const ctx=await mk(PHONE,{db:DB_FAR,on:true,perm:'denied',scheme:sch}); const pg=await newPage(ctx); await home(pg);
    await pg.tap('#setBtn'); await pg.waitForSelector('dialog.set-dlg[open]'); await pg.waitForSelector('[data-set="remind"]');
    const sub=await pg.$eval('[data-set="remind"] small',e=>e.textContent);
    ok('denied: row says notifications are blocked in the browser; badge still set',/blocked in the browser/.test(sub)&&JSON.stringify(await badge(pg)).includes('["set",2]'),[sub,await badge(pg)]);
    ok('far item (4 h away): no note',!(await pg.$('.remind-bar')));
    await ctx.close(); }
  /* 2+4 on, late path */
  { const ctx=await mk(PHONE,{db:DB_LATE,on:true,scheme:sch}); const pg=await newPage(ctx); await home(pg);
    ok('on: badge = 3 (posted not counted)',JSON.stringify(await badge(pg))==='[["set",3]]',await badge(pg));
    await pg.waitForSelector('.remind-bar',{timeout:6000}).catch(()=>{});
    const nb=await pg.evaluate(()=>{ const e=document.querySelector('.remind-bar'); if(!e) return null; const bs=[...e.querySelectorAll('button')].map(x=>({t:x.textContent.trim(),h:x.getBoundingClientRect().height,w:x.getBoundingClientRect().width})); return {txt:e.querySelector('.slim-txt').textContent,bs,n:document.querySelectorAll('.remind-bar').length,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left,vw:innerWidth}; });
    ok('note: "Shelf day is planned for <time>" with Post, one note, buttons >= 44, inside the screen',nb&&/^Shelf day is planned for /.test(nb.txt)&&nb.n===1&&nb.bs.every(x=>x.h>=44&&x.w>=44)&&nb.bs[0].t==='Post'&&nb.left>=0&&nb.right<=nb.vw,nb);
    ok('system notification once, tagged per item (permission granted)',(await notes(pg)).length===1&&/remind:1stchoice:pA/.test((await notes(pg))[0].o.tag)&&/Shelf day is planned for/.test((await notes(pg))[0].o.body),await notes(pg));
    ok('fired id remembered for the day',await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:remind:fired:1stchoice')).ids.includes('pA')));
    if(!dark) await pg.screenshot({path:'/tmp/reminders-note-light.png'});
    await pg.tap('.remind-bar [data-r="post"]'); await pg.waitForSelector('.cal-post',{timeout:15000}).catch(()=>{});
    ok('Post opens the Post now sheet; note gone',!!(await pg.$('.cal-post'))&&!(await pg.$('.remind-bar')));
    await pg.reload(); await pg.waitForSelector('.cal-home-row'); await pg.waitForTimeout(1500);
    ok('reload: no second note, no second notification',!(await pg.$('.remind-bar'))&&(await notes(pg)).length===0);
    await ctx.close(); }
  /* 3 timer path: 16 min away -> fires after the (sped-up) wait */
  { const ctx=await mk(PHONE,{db:DB_SOON,on:true,scheme:sch,init:'window.__remindSpeed=100000;'}); const pg=await newPage(ctx); await home(pg);
    await pg.waitForSelector('.remind-bar',{timeout:8000}).catch(()=>{});
    ok('timer: note shows when the reminder time arrives, once',await pg.evaluate(()=>document.querySelectorAll('.remind-bar').length)===1&&(await notes(pg)).length===1,await notes(pg));
    await ctx.close(); }
}
tag='';
/* search action */
{ const ctx=await mk(PHONE,{db:DB_FAR,on:false}); const pg=await newPage(ctx); await home(pg);
  const has=await pg.evaluate(async()=>{ await new Promise(r=>setTimeout(r,300)); const i=document.querySelector('#hubSearch,.hub-search input,input[type=search]'); return !!i; });
  if(has){ await pg.fill('#hubSearch,.hub-search input,input[type=search]','remind'); await pg.waitForTimeout(600); }
  ok('search "remind" finds the reminders action',/Turn on post reminders/.test(await pg.evaluate(()=>document.body.innerText)));
  await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3));
console.log(res.join('\n')); await b.close(); process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);

/* 2.26.0 Today stays fresh: coming back to Studio (the tab or app becomes visible again) refreshes Home's plan row at most once a minute,
   and a new post added meanwhile shows up without a flicker of the rest of Home.   Run: node tests/today-fresh.mjs (BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} });
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
await pg.clock.install();
await pg.goto(BASE+'index.html'); await pg.clock.runFor(4000); await pg.waitForSelector('#calRow:not(.is-skel)',{timeout:10000});
await pg.evaluate(()=>{ const c=window.StudioCloud, f=c.calendar; window.__calN=0; c.calendar=function(){ window.__calN++; return f.apply(c,arguments); }; });
const vis=async state=>{ await pg.evaluate(s=>{ Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>s}); document.dispatchEvent(new Event('visibilitychange')); },state); };
await vis('hidden'); await pg.clock.runFor(5000); await vis('visible'); await pg.clock.runFor(500);
ok('back after 5 s: no new fetch (once a minute at most)',await pg.evaluate(()=>window.__calN)===0,await pg.evaluate(()=>window.__calN));
const today=await pg.evaluate(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); });
await pg.evaluate(async t=>{ await window.StudioCloud.saveCalendarItem({brand:'1stchoice',day:t,at:'23:50',title:'Late fresh post',status:'planned',format:'story',caption:'',hashtags:[],design_ids:[]}); },today).catch(e=>errs.push('save '+e.message));
const toolsBefore=await pg.evaluate(()=>document.getElementById('toolGrid').innerHTML);
await vis('hidden'); await pg.clock.runFor(70000); await vis('visible'); await pg.clock.runFor(1500);
await pg.waitForFunction(()=>/Late fresh post/.test(document.getElementById('calRow').textContent)||window.__calN>0,null,{timeout:5000}).catch(()=>{});
await pg.clock.runFor(1000);
ok('back after 70 s: the plan row fetched again',await pg.evaluate(()=>window.__calN)>=1,await pg.evaluate(()=>window.__calN));
ok('the new post shows on Home',await pg.evaluate(()=>/Late fresh post/.test(document.getElementById('calRow').textContent)),await pg.evaluate(()=>document.getElementById('calRow').textContent.trim().slice(0,120)));
ok('the rest of Home was not redrawn',await pg.evaluate(()=>document.getElementById('toolGrid').innerHTML)===toolsBefore);
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

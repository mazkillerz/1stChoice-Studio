/* 2.29.0 New Home (flag home2): with nothing planned today, Today's Calendar pane shows "Coming up" with the next two posts (day, time, format),
   times inside <bdi> so an Arabic title keeps "6 pm" whole; with nothing coming either, the empty state stays.   Run: node tests/today-next.mjs (BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
for(const dark of [false,true]){ const T=dark?'dark: ':'light: ';
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE+'index.html?flag-home2=1'); await pg.waitForFunction(()=>!document.querySelector('#tdp-cal .hs-skel'),null,{timeout:10000}).catch(()=>{});
  ok(T+'nothing planned and nothing coming: the empty state',/Nothing planned for today/.test(await pg.textContent('#tdp-cal'))&&!/Coming up/.test(await pg.textContent('#tdp-cal')));
  await pg.evaluate(async()=>{ const d=n=>{ const x=new Date(); x.setDate(x.getDate()+n); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
    for(const [n,at,t,f] of [[1,'09:30','Restock story','story'],[2,'18:00','رجع متوفر','post'],[3,'10:00','Third one','reel']]) await StudioCloud.saveCalendarItem({brand:'1stchoice',day:d(n),at,title:t,status:'planned',format:f,caption:'',hashtags:[],design_ids:[]}); });
  await pg.reload(); await pg.waitForFunction(()=>/Coming up/.test(document.getElementById('tdp-cal').textContent),null,{timeout:10000}).catch(()=>{});
  const t=await pg.textContent('#tdp-cal');
  ok(T+'"Coming up" with the next two posts only',/Coming up/.test(t)&&/Restock story/.test(t)&&/رجع متوفر/.test(t)&&!/Third one/.test(t),t);
  ok(T+'times sit in <bdi>',await pg.$$eval('#tdp-cal .td-m small bdi',l=>l.length)===2);
  const h=await pg.$eval('#tdp-cal',e=>e.getBoundingClientRect().height); ok(T+'the pane keeps its fixed height',Math.abs(h-214)<=2,h);
  await pg.tap('#tdp-cal .td-open'); await pg.waitForFunction(()=>location.hash==='#calendar',null,{timeout:5000}).catch(()=>{});
  ok(T+'a row opens the calendar',await pg.evaluate(()=>location.hash==='#calendar'));
  await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

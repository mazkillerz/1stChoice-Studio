/* r6 Home (owner, 16 Nov 2026): the New Home preview (home2) is archived and its switch gone; the Ideas tile on Home says something
   like Goals does: "2 new" when teammates added ideas I have not opened, else "3 ideas".   Run: node tests/r6-home.mjs (BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Mazoon'})); }catch(e){} });
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
const tile=()=>pg.evaluate(()=>{ const e=document.querySelector('#calRow [data-plan-go="ideas"] em'); return e?e.textContent.trim():''; });

await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow:not(.is-skel)',{timeout:10000});
ok('no Today section of the old preview',await pg.evaluate(()=>!document.getElementById('todaySec')));
ok('no New Home switch in the flags',await pg.evaluate(()=>!window.Studio.flags.list().some(f=>f.id==='home2')));
await pg.evaluate(async()=>{ const C=window.StudioCloud;
  await C.saveIdea({brand:'1stchoice',title:'Mine',type:'reel',stage:'idea',author:'Mazoon',seen_at:null});
  await C.saveIdea({brand:'1stchoice',title:'Theirs',type:'post',stage:'planned',author:'Ali',seen_at:null});
  await C.saveIdea({brand:'1stchoice',title:'Seen',type:'story',stage:'idea',author:'Ali',seen_at:new Date().toISOString()});
  await C.saveIdea({brand:'1stchoice',title:'Done',type:'post',stage:'posted',author:'Ali',seen_at:null}); });
await pg.goto(BASE+'index.html?o=2'); await pg.waitForFunction(()=>{ const e=document.querySelector('#calRow [data-plan-go="ideas"] em'); return e&&/new/.test(e.textContent); },null,{timeout:10000}).catch(()=>{});
ok('one teammate idea not opened yet: "1 new"',(await tile())==='1 new',await tile());
await pg.evaluate(async()=>{ const C=window.StudioCloud, l=await C.ideas('1stchoice'); for(const x of l) if(x.title==='Theirs') await C.updateIdea(x.id,{seen_at:new Date().toISOString()}).catch(()=>C.saveIdea({...x,seen_at:new Date().toISOString()})); });
await pg.goto(BASE+'index.html?o=3'); await pg.waitForFunction(()=>{ const e=document.querySelector('#calRow [data-plan-go="ideas"] em'); return e&&/ideas/.test(e.textContent); },null,{timeout:10000}).catch(()=>{});
ok('all opened: "3 ideas" (posted ones not counted)',(await tile())==='3 ideas',await tile());
ok('Goals tile still there',await pg.evaluate(()=>!!document.querySelector('#calRow [data-plan-go="goals"]')));
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

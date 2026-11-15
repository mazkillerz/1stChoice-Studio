/* 2.24.0 Search finds ideas and planned posts (from the Plan pages' last data on this device: studio:plan:ideas / studio:plan:cal).
   1 an idea by its title, by a reply's Arabic words, one group "Ideas and planned posts"   2 a planned post by its title, with its date
   3 tapping an idea opens Ideas and its sheet; tapping a post opens the calendar   4 archived ideas are not listed
   Run: node tests/search-plan.mjs (server on :8080 or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const day=new Date(); day.setDate(day.getDate()+3); const D=day.toISOString().slice(0,10);
async function mk(dark){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(({D})=>{ try{ localStorage.setItem('studio:welcome','1');
    localStorage.setItem('studio:plan:ideas:1stchoice',JSON.stringify({v:1,at:new Date().toISOString(),items:[{id:'i1',brand:'1stchoice',title:'Shelf day reel',note:'film the fridge',type:'reel',stage:'planned'},{id:'i2',brand:'1stchoice',title:'Old archived thing',type:'post',stage:'idea',deleted_at:new Date().toISOString()}],notes:[{id:'n1',idea_id:'i1',body:'متوفر واجد'}]}));
    localStorage.setItem('studio:plan:cal:1stchoice',JSON.stringify({v:1,at:new Date().toISOString(),items:[{id:'c1',brand:'1stchoice',day:D,title:'Weekend restock post',at:'18:00',status:'planned',format:'post'}]})); }catch(e){} },{D});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#uq'); await pg.waitForTimeout(800); return {ctx,pg};
}
const panel=pg=>pg.evaluate(()=>document.getElementById('usPanel').innerText.replace(/\s+/g,' '));
for(const dark of [false,true]){ const T=dark?'dark: ':'light: '; const {ctx,pg}=await mk(dark);
  await pg.fill('#uq','shelf'); await pg.waitForTimeout(400); let t=await panel(pg);
  ok(T+'an idea is found by its title, under "Ideas and planned posts"',/Ideas and planned posts/i.test(t)&&/Shelf day reel/.test(t)&&/Idea · Reel · Planned/.test(t),t.slice(0,160));
  await pg.fill('#uq','واجد'); await pg.waitForTimeout(400); t=await panel(pg); ok(T+'found by an Arabic reply',/Shelf day reel/.test(t),t.slice(0,120));
  await pg.fill('#uq','archived'); await pg.waitForTimeout(400); t=await panel(pg); ok(T+'archived ideas are not listed',!/Old archived thing/.test(t));
  await pg.fill('#uq','weekend restock'); await pg.waitForTimeout(400); t=await panel(pg); ok(T+'a planned post is found, with its day and time',/Weekend restock post/.test(t)&&/Calendar · /.test(t)&&/6 pm/.test(t),t.slice(0,160));
  if(!dark){ await pg.evaluate(()=>{ const r=[...document.querySelectorAll('#usPanel button,#usPanel a,#usPanel [role=option]')].find(e=>/Weekend restock post/.test(e.textContent)); r.click(); });
    await pg.waitForFunction(()=>location.hash==='#calendar',null,{timeout:6000}).catch(()=>{}); ok('tapping a post opens the calendar',await pg.evaluate(()=>location.hash==='#calendar'&&!document.getElementById('planView').hidden)); }
  else{ await pg.fill('#uq','shelf'); await pg.waitForTimeout(400); await pg.evaluate(()=>{ const r=[...document.querySelectorAll('#usPanel button,#usPanel a,#usPanel [role=option]')].find(e=>/Shelf day reel/.test(e.textContent)); r.click(); });
    await pg.waitForFunction(()=>location.hash==='#ideas',null,{timeout:6000}).catch(()=>{}); ok('tapping an idea opens Ideas',await pg.evaluate(()=>location.hash==='#ideas'&&!document.getElementById('planView').hidden)); }
  await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

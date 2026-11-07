/* Studio 1.41.0: a team save that fails (no connection) says so in words and is one tap to retry.
   Phone (light, dark) and computer:
   1. Save & add to team while the connection is down: the picture is still saved (shared once on a phone, one download on a
      computer); the message reads "Not saved to the team: no connection…" (never the browser's "Failed to fetch"); the team
      switch stays on and the button reads "Add to the team".
   2. Back online, tap it: "Saved to the team as …", the old message is gone, the picture is not saved a second time, the
      switch is off and the button reads "Save again"; the design is in the team's Saved.
   3. Our own messages stay as they are (a refused sign-in still says "sign in first").
   4. No page errors.
   Run: server on :8080 (or BASE=...), then node tests/team-retry.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const PHOTO=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8')
  +"\n;(()=>{ const sd=StudioCloud.saveDesign; StudioCloud.saveDesign=async o=>{ if(window.__offline) throw new TypeError('Failed to fetch'); return sd(o); };"
  +" StudioCloud.isMember=async()=>!window.__noMember; })();";
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const st=pg=>pg.evaluate(()=>({msg:document.getElementById('status').textContent,toast:(document.querySelector('.toast')||{}).textContent||'',team:document.getElementById('teamOn').checked,
  btn:document.getElementById('saveTxt').textContent.trim(),line:document.getElementById('teamStatus').textContent,shares:window.__n,saved:Object.keys(JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{}}').designs).length}));
for(const [name,vp,touch,scheme] of [['phone/light',{width:390,height:844},true,'light'],['phone/dark',{width:390,height:844},true,'dark'],['desktop',{width:1280,height:800},false,'light']]){
  const N=name+': ';
  const ctx=await b.newContext({viewport:vp,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ window.__offline=true; window.__n=0; navigator.canShare=()=>true; navigator.share=async()=>{ window.__n++; }; });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e)); let dls=0; pg.on('download',()=>dls++);
  const tap=s=>touch?pg.tap(s):pg.click(s);
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100});
  await pg.setInputFiles('#pick',PHOTO); await pg.waitForFunction(()=>{ const p=Studio.debug.S.photos[0]; return p&&p.img&&!p.sample; },null,{polling:100});
  if(touch){ await tap('#barSave'); await pg.waitForTimeout(600); }
  await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000,polling:100}).catch(()=>{});
  await tap('#save'); await pg.waitForFunction(()=>/team/i.test(document.getElementById('status').textContent),null,{timeout:30000,polling:100}).catch(()=>{});
  let s=await st(pg); const pics=touch?s.shares:dls;
  ok(N+'offline: the picture is still saved once',pics===1,{pics});
  ok(N+'offline: the message is in words, not "Failed to fetch"',/^Not saved to the team: no connection\./.test(s.msg)&&!/fetch/i.test(s.msg+s.toast),s.msg);
  ok(N+'offline: the team switch stays on and the button reads "Add to the team"',s.team&&s.btn==='Add to the team',{team:s.team,btn:s.btn});
  ok(N+'offline: nothing went to the team',s.saved===0,s.saved);
  /* back online: one tap */
  await pg.evaluate(()=>{ window.__offline=false; }); await tap('#save');
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:30000,polling:100}).catch(()=>{});
  s=await st(pg);
  ok(N+'retry: "Saved to the team as …" and the old message is gone',/Saved to the team as/.test(s.line)&&!/no connection/.test(s.msg),{line:s.line,msg:s.msg});
  ok(N+'retry: the picture is not saved a second time',(touch?s.shares:dls)===1,{pics:touch?s.shares:dls});
  ok(N+'retry: switch off, button "Save again", the design is in the team',!s.team&&s.btn==='Save again'&&s.saved===1,{team:s.team,btn:s.btn,saved:s.saved});
  await ctx.close();
}
/* our own message stays: a refused sign-in */
{ const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ window.__noMember=true; window.__n=0; navigator.canShare=()=>true; navigator.share=async()=>{ window.__n++; }; });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('member: '+e));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100});
  await pg.setInputFiles('#pick',PHOTO); await pg.waitForTimeout(1200);
  await pg.tap('#barSave'); await pg.waitForTimeout(600); await pg.tap('#teamOnly');
  await pg.waitForSelector('dialog[open]',{timeout:8000}).catch(()=>{}); await pg.keyboard.press('Escape');
  await pg.waitForFunction(()=>/team/i.test(document.getElementById('status').textContent),null,{timeout:10000,polling:100}).catch(()=>{});
  const m=await pg.$eval('#status',e=>e.textContent);
  ok('not signed in: our own message is kept',/sign in first/.test(m),m);
  await ctx.close(); }
await b.close();
ok('no page errors',errs.length===0,errs.slice(0,3));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\nteam-retry: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);

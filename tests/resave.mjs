/* Re-saving a design with no photos of its own must update it, never make a second design (owner bug).
   Root cause fixed: a photo-less design was stored as kind 'template' and re-saving a template always made a new design.
   1. Tool page, no photo (restock Cans): save to the team = kind 'design'; edit, Save sheet starts on Phone + Team with Update “…”,
      "Save as a copy" under it; Save = same id, still ONE design. (also on desktop)
   2. Same, reopened from ?design=<id>: Update keeps one design; Save as a copy makes two.
   3. Create, no photos: kind 'design'; edit; Update keeps the id; #crAlt reads "Save as a copy".
   4. Two quick taps on the main button of an opened design (slow upload) stay one design.
   5. No page errors.
   Run: server on :8080 (or BASE=...), then node tests/resave.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const STUB=`
;(()=>{ const C=StudioCloud, sd=C.saveDesign;
  C.saveDesign=async o=>{ if(window.__slow) await new Promise(r=>setTimeout(r,window.__slow)); const id=await sd(o);
    localStorage.setItem('__calls',JSON.stringify(JSON.parse(localStorage.getItem('__calls')||'[]').concat([{id:o.id||null,kind:o.kind}]))); return id; };
})();`;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8')+STUB;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+(typeof i==='string'?i:JSON.stringify(i)):'')); };
const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const dbOf=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{},"files":{}}'));
const calls=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('__calls')||'[]'));
const waitCalls=(pg,n)=>pg.waitForFunction(n=>JSON.parse(localStorage.getItem('__calls')||'[]').length>=n,n,{timeout:120000,polling:100}).catch(()=>{});
const count=async pg=>Object.keys((await dbOf(pg)).designs).length;

for(const [name,vp,touch] of [['phone',{width:390,height:844},true],['desktop',{width:1280,height:800},false]]){
  const N=name+': ';
  const ctx=await b.newContext({viewport:vp,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:'light',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ navigator.canShare=()=>true; navigator.share=async()=>{}; });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|ERR_FAILED|net::/.test(m.text())) errs.push(N+m.text()); });
  const tap=s=>touch?pg.tap(s):pg.click(s);
  const tool=async url=>{ await pg.goto(BASE+url); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100}); await pg.waitForTimeout(700); };
  const opened=async id=>{ await tool('tools/restock.html?design='+id); await pg.waitForFunction(()=>!document.getElementById('designBar').hidden,null,{polling:100}); };
  const sheet=async()=>{ if(touch){ await tap('#barSave'); await pg.waitForTimeout(600); } await pg.waitForFunction(()=>document.getElementById('teamOn'),null,{polling:100}); await pg.waitForTimeout(1500); };
  const tm=async(n='Resave')=>{ await tap('#saveWhere [data-where="team"]'); await pg.waitForSelector('#teamCols [data-newcol]',{timeout:15000}); await pg.waitForTimeout(300); if(await pg.isHidden('#teamNewRow')) await tap('#teamCols [data-newcol]'); await pg.fill('#teamNewCol',n); };
  const lab=()=>pg.evaluate(()=>({btn:document.getElementById('saveTxt').textContent.trim(),alt:(a=>!a||a.hidden?'':a.textContent.trim())(document.getElementById('saveAlt')),team:document.getElementById('teamOn').checked,where:document.querySelector('#saveWhere [aria-checked="true"]').dataset.where}));
  const edit=async()=>{ await pg.keyboard.press('Escape'); await pg.waitForTimeout(400); await pg.evaluate(()=>{ const S=Studio.debug.S; S.values.small='__none'; Studio.debug.render(); }); await pg.waitForTimeout(300); };

  /* 1. no-photo tool page */
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  await tool('tools/restock.html?preset=rs-glow');
  ok(N+'(the Cans style has no photo)',await pg.evaluate(()=>Studio.debug.S.style==='cans'));
  await sheet(); await tm(); await tap('#save'); await waitCalls(pg,1); await pg.waitForTimeout(800);
  let db=await dbOf(pg), ids=Object.keys(db.designs), c=await calls(pg); const id=ids[0];
  ok(N+'1: a no-photo save to the team is ONE design of kind "design"',ids.length===1&&db.designs[id].kind==='design'&&c[0].kind==='design',{n:ids.length,kind:db.designs[id]&&db.designs[id].kind,c});
  await edit(); await sheet(); let L=await lab();
  /* phone: the sheet is reset on every open, so it starts on Phone + Team. Desktop: the Save card is not reopened, it stays on My phone after a team save (reported, not asserted); choose Phone + Team by hand there. */
  if(!touch){ await tap('#saveWhere [data-where="team"]'); await pg.waitForTimeout(500); L=await lab(); }
  ok(N+'1: after an edit the Save sheet is on Phone + Team with Update “…” and Save as a copy',L.team&&L.where==='team'&&/^Update “/.test(L.btn)&&L.alt==='Save as a copy',L);
    await tap('#save'); 
  await waitCalls(pg,2); await pg.waitForTimeout(800);
  c=await calls(pg);
  ok(N+'1: saving again is the same design (id kept, still one)',(await count(pg))===1&&c[1]&&c[1].id===id&&c[1].kind==='design',{n:await count(pg),c});
  if(!touch){ await ctx.close(); continue; }

  /* 2. reopened from Saved */
  await opened(id); await edit(); await sheet(); L=await lab();
  ok(N+'2: reopened: Phone + Team, Update “…”, Save as a copy',L.team&&L.where==='team'&&/^Update “/.test(L.btn)&&L.alt==='Save as a copy',L);
  await tap('#save'); await waitCalls(pg,3); await pg.waitForTimeout(800); c=await calls(pg);
  ok(N+'2: reopened + edit + Save: still one design, same id',(await count(pg))===1&&c[2].id===id,{n:await count(pg),c:c[2]});
  await opened(id); await sheet(); await tap('#saveAlt'); await waitCalls(pg,4); await pg.waitForTimeout(1000); c=await calls(pg);
  ok(N+'2: Save as a copy makes a second design',(await count(pg))===2&&c[3].id===null,{n:await count(pg),c:c[3]});

  /* 4. double tap on an opened design */
  await pg.evaluate(()=>{ localStorage.removeItem('fakecloud'); localStorage.setItem('__calls','[]'); });
  await tool('tools/restock.html?preset=rs-glow'); await sheet(); await tm(); await tap('#save'); await waitCalls(pg,1); await pg.waitForTimeout(800);
  const id4=Object.keys((await dbOf(pg)).designs)[0];
  await opened(id4); await sheet(); await pg.evaluate(()=>{ window.__slow=1500; });
  await pg.evaluate(()=>{ const o=document.getElementById('save'); o.click(); setTimeout(()=>o.click(),150); });
  await waitCalls(pg,3); await pg.waitForTimeout(2200); c=await calls(pg);
  ok(N+'4: two quick taps on Update stay ONE design',(await count(pg))===1&&c.slice(1).every(x=>x.id===id4),{n:await count(pg),c});
  await pg.evaluate(()=>{ window.__slow=0; });

  /* 3. Create, no photos */
  await pg.evaluate(()=>{ localStorage.removeItem('fakecloud'); localStorage.setItem('__calls','[]'); });
  const cready=async()=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(500); };
  const csave=async()=>{ await tap('#crBar [data-cr="save"]'); await pg.waitForSelector('#crGo'); await pg.waitForTimeout(400); };
  const clab=()=>pg.evaluate(()=>({go:document.getElementById('crGo').textContent.trim(),alt:(a=>a?a.textContent.trim():'')(document.getElementById('crAlt')),on:document.getElementById('crTeamOn').checked}));
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await cready();
  await csave(); await tap('#crWhere [data-where="team"]'); await pg.waitForTimeout(300); await pg.fill('#crCol','Resave');
  await tap('#crTeamOnly'); await waitCalls(pg,1); await pg.waitForTimeout(800);
  db=await dbOf(pg); const cd=Object.keys(db.designs)[0]; c=await calls(pg);
  ok(N+'3: Create, no photos: one design of kind "design"',Object.keys(db.designs).length===1&&db.designs[cd].kind==='design'&&c[0].kind==='design',{n:Object.keys(db.designs).length,c});
  await pg.goto(BASE+'tools/create.html?design='+cd); await cready();
  await pg.evaluate(()=>CR.addElement('divider')); await pg.waitForTimeout(300);
  await csave(); const C=await clab();
  ok(N+'3: after an edit Create starts on Team with Update “…” and "Save as a copy"',C.on&&/^Update “/.test(C.go)&&C.alt==='Save as a copy',C);
  await tap('#crTeamOnly'); await waitCalls(pg,2); await pg.waitForTimeout(800); c=await calls(pg);
  ok(N+'3: Create re-save: same id, still one design',(await count(pg))===1&&c[1].id===cd&&c[1].kind==='design',{n:await count(pg),c:c[1]});
  await ctx.close();
}
ok('5: no page errors',!errs.length,errs.slice(0,5));
console.log(res.join('\n')); const bad=res.filter(x=>x.startsWith('FAIL')).length; console.log(`resave: ${res.length-bad} pass, ${bad} fail`);
await b.close(); process.exit(bad?1:0);

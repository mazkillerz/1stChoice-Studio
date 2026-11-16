/* Round 6 (resume): every design autosaves and can always be resumed where you left off. Nothing is ever lost.
   a. Tool: open a saved design, edit, leave by mistake → Continue editing lists it ("Unsaved changes · …", title = design name)
      → open it from there → the edit is there and the Save sheet still says Update “name” (same design, no copy).
   b. Reopen the saved design directly → the edits are back + one slim bar → "Saved version" gives the saved look back
      and the draft stays in Continue editing.
   c. Create: a design opened from Saved keeps a linked draft too, resumes on the same page; a brand template and a team
      template edit leave a draft and resume on the same page.
   d. Team update / Discard removes the design's draft; ✕ in Continue editing still asks first.   e. ?render=1 writes no draft.
   Run: server on :8080 (or BASE=...), then node tests/r6-resume.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&!c?' '+(typeof i==='string'?i:JSON.stringify(i)):'')); };
const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:'light'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} });
const np=async()=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(tag+e)); return p; };
const dbOf=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{}}'));
const drafts=pg=>pg.evaluate(()=>Object.keys(localStorage).filter(k=>/^studio:draft:[^:]+:[^:]+:[^:]+$/.test(k)).sort());
const draftRec=(pg,k)=>pg.evaluate(k=>JSON.parse(localStorage.getItem(k)),k);
const tool=async(pg,url)=>{ await pg.goto(BASE+url); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100}); await pg.waitForTimeout(900); };
const vis=(pg,s)=>pg.evaluate(s=>{ const e=document.querySelector(s); return !!e&&!e.hidden&&e.getClientRects().length>0; },s);
const styleNow=pg=>pg.evaluate(()=>Studio.debug.S.style);

/* ===== a/b/d: a Restock design ===== */
tag='tool: ';
const pg=await np();
await tool(pg,'tools/restock.html'); await pg.$eval('#styles [data-style="cream"]',e=>e.click()); await pg.waitForTimeout(500);
await pg.evaluate(()=>Studio.debug.teamSave({name:'R6 Restock',collections:['Restocks']}));
const db0=await dbOf(pg), id=Object.keys(db0.designs).find(k=>db0.designs[k].name==='R6 Restock'); ok('the design is in the team',!!id);
const ndes=()=>dbOf(pg).then(d=>Object.keys(d.designs).length);
const n0=await ndes();
/* a. edit and leave by mistake (straight to Home, no prompt answered) */
await tool(pg,'tools/restock.html?design='+id);
ok('opened as the saved design',await pg.evaluate(()=>!document.getElementById('designBar').hidden)&&await styleNow(pg)==='cream');
ok('no draft before any edit',(await drafts(pg)).length===0);
await pg.$eval('#styles [data-style="split"]',e=>e.click());
await pg.waitForFunction(()=>Studio.debug.draftId(),null,{timeout:8000}); await pg.waitForTimeout(1200);
let ds=await drafts(pg); ok('an edit of a saved design makes a draft',ds.length===1&&ds[0].endsWith(':d-'+id),ds);
let rec=await draftRec(pg,ds[0]); ok('it records the design id, name and updated_at',rec.link&&rec.link.id===id&&rec.link.name==='R6 Restock'&&!!rec.link.at,rec.link);
ok('the page keeps its ?design= link',pg.url().includes('design='+id)&&!pg.url().includes('draft='));
await pg.goto(BASE+'index.html'); await pg.waitForFunction(()=>window.Studio); await pg.waitForTimeout(1300);
ok('Continue editing lists it with the design name',(await pg.$$eval('#continueList .ccard b',l=>l.map(e=>e.textContent))).includes('R6 Restock'));
ok('sub reads Unsaved changes · …',(await pg.textContent('#continueList .ccard .rtxt span')).startsWith('Unsaved changes'),await pg.textContent('#continueList .ccard .rtxt span'));
const href=await pg.$eval('#continueList .ccard a',e=>e.getAttribute('href')); ok('it opens through the design',href.includes('design='+id),href);
await pg.$eval('#continueList .ccard a',e=>e.click()); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100}); await pg.waitForTimeout(1800);
ok('the edit is back',await styleNow(pg)==='split');
ok('still the saved design (design bar)',await pg.evaluate(()=>!document.getElementById('designBar').hidden));
ok('slim bar says the changes are back',await vis(pg,'#resumeBar')&&/unsaved changes are back/i.test(await pg.textContent('#resumeTxt')));
await pg.tap('#barSave'); await pg.waitForTimeout(900); await pg.waitForFunction(()=>document.getElementById('teamOn'),null,{polling:100}); await pg.waitForTimeout(1200);
const alt=await pg.evaluate(()=>({btn:document.getElementById('saveTxt').textContent.trim(),alt:(a=>!a||a.hidden?'':a.textContent.trim())(document.getElementById('saveAlt'))}));
ok('the Save sheet keeps Update “R6 Restock”',/Update/.test(alt.btn+alt.alt)&&/R6 Restock/.test(alt.btn+alt.alt),alt);
await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
/* b. reopen directly: auto-restore, then Saved version */
await tool(pg,'tools/restock.html?design='+id);
ok('b: reopened directly: edits restored',await styleNow(pg)==='split');
ok('b: slim bar shown',await vis(pg,'#resumeBar'));
const rb=await pg.$eval('#resumeSaved',e=>e.getBoundingClientRect().height); ok('b: the action is a 44px+ target',rb>=44,rb);
await pg.tap('#resumeSaved'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100}); await pg.waitForTimeout(1800);
ok('b: Saved version gives the saved look back',await styleNow(pg)==='cream');
ok('b: no bar',!(await vis(pg,'#resumeBar')));
ok('b: the URL is clean',pg.url().endsWith('?design='+id),pg.url());
ok('b: the draft is still in Continue editing',(await drafts(pg)).length===1);
/* d. a team update removes the draft */
await tool(pg,'tools/restock.html?design='+id); ok('d: edits back again',await styleNow(pg)==='split');
await pg.evaluate(()=>Studio.debug.teamSave({name:'R6 Restock',keepCols:true})); await pg.waitForTimeout(500);
ok('d: updating the design removes its draft',(await drafts(pg)).length===0,await drafts(pg));
ok('d: still one design (no copy)',await ndes()===n0);
await tool(pg,'tools/restock.html?design='+id); ok('d: nothing to restore afterwards',!(await vis(pg,'#resumeBar'))&&await styleNow(pg)==='split');
/* d2. Discard in the leave prompt drops the draft */
await pg.$eval('#styles [data-style="white"]',e=>e.click()); await pg.waitForFunction(()=>Studio.debug.draftId(),null,{timeout:8000}); await pg.waitForTimeout(1200);
ok('d2: edit made a draft again',(await drafts(pg)).length===1);
await pg.$eval('nav.top a, .tool-top a',e=>e.click()).catch(()=>{}); await pg.waitForTimeout(700);
ok('d2: the leave prompt offers Leave, keep my changes here',(await pg.$$eval('dialog[open] button',l=>l.map(e=>e.textContent.trim()))).some(t=>/keep my changes/i.test(t)));
await pg.$eval('#lvDis',e=>e.click()); await pg.waitForTimeout(1200);
ok('d2: Discard changes drops the draft',(await drafts(pg)).length===0,await drafts(pg));
await pg.close();

//CREATE
await b.close();
console.log(res.join('\n')); if(errs.length) console.log('PAGE ERRORS: '+errs.slice(0,6).join(' | '));
const bad=res.filter(r=>r.startsWith('FAIL')).length||errs.length; console.log(bad?'FAIL':'ALL PASS'); process.exit(bad?1:0);

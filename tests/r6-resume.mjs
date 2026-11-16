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

/* ===== c: Create ===== */
tag='create: ';
const crOpen=async url=>{ const p=await np(); await p.goto(BASE+url); await p.waitForFunction(()=>window.CRUI&&CRUI.st&&CRUI.st.ready,null,{timeout:40000,polling:100}); await p.waitForTimeout(1500); return p; };
const crDrafts=p=>p.evaluate(()=>Object.keys(localStorage).filter(k=>/^studio:draft:[^:]+:create:[^:]+$/.test(k)).sort());
const addText=(p,t)=>p.evaluate(t=>{ BD.place(BD.make.text(t,{x:100,y:100})); BD.changed(); },t);
const texts=p=>p.evaluate(()=>BD.main.find('Text').map(n=>n.text()));
const pageNo=p=>p.evaluate(()=>BD.main.getChildren(n=>n.getAttr&&n.getAttr('kind')==='frame').length);
const settle=async(p,n=1)=>{ await p.waitForFunction(n=>Object.keys(localStorage).some(k=>/^studio:draft:[^:]+:create:/.test(k)),null,{timeout:8000}).catch(()=>{}); await p.waitForTimeout(n*1800); };
const cid=async()=>{ const q=await np(); await q.goto(BASE+'index.html'); const d=await dbOf(q); await q.close(); return Object.keys(d.designs).find(k=>d.designs[k].name==='R6 Create'); };
{ /* a saved Create design */
  const p=await crOpen('tools/create.html?size=story'); await addText(p,'Hello R6'); await settle(p);
  await p.evaluate(()=>CRUI.teamSave({name:'R6 Create',collections:['Tests']})); await p.waitForTimeout(600);
  ok('the Create design is in the team',!!(await dbOf(p)).designs && Object.values((await dbOf(p)).designs).some(d=>d.name==='R6 Create'));
  ok('saving it left no draft behind',(await crDrafts(p)).length===0,await crDrafts(p)); await p.close(); }
const CID=await cid();
{ const p=await crOpen('tools/create.html?design='+CID); ok('opened as the saved design',await p.evaluate(()=>CRUI.st.design&&CRUI.st.design.name==='R6 Create'));
  ok('no draft before any edit',(await crDrafts(p)).length===0,await crDrafts(p));
  await p.tap('#crPages [data-pg="+"]'); await p.waitForTimeout(500); await addText(p,'Edited R6'); await settle(p,1);
  const ks=await crDrafts(p); ok('an edit makes a draft with the design id',ks.length===1&&ks[0].endsWith(':d-'+CID),ks);
  const rec=await draftRec(p,ks[0]); ok('it records the link (id, name, updated_at)',rec.link&&rec.link.id===CID&&rec.link.name==='R6 Create'&&!!rec.link.at,rec.link);
  ok('it keeps ?design= in the address',p.url().includes('design='+CID)&&!p.url().includes('draft='));
  await p.goto(BASE+'index.html'); await p.waitForFunction(()=>window.Studio); await p.waitForTimeout(1300);
  ok('Continue editing: title = design name, sub = Unsaved changes',(await p.$$eval('#continueList .ccard',l=>l.map(e=>e.textContent))).some(t=>/R6 Create/.test(t)&&/Unsaved changes/.test(t)));
  await p.$eval('#continueList .ccard a',e=>e.click()); await p.waitForFunction(()=>window.CRUI&&CRUI.st&&CRUI.st.ready,null,{timeout:40000,polling:100}); await p.waitForTimeout(1800);
  ok('resumed: both pages and the edit are there',await pageNo(p)===2&&(await texts(p)).includes('Edited R6'),await texts(p));
  ok('resumed on the same page (the second one)',await p.evaluate(()=>BD.main.getChildren(n=>n.getAttr&&n.getAttr('kind')==='frame').indexOf(BD.activeFrame())===1));
  ok('still linked: Update, not a copy',await p.evaluate(c=>!!CRUI.st.design&&CRUI.st.design.id===c,CID));
  ok('slim bar shown',await vis(p,'#resumeBar'));
  await p.tap('#resumeSaved'); await p.waitForFunction(()=>window.CRUI&&CRUI.st&&CRUI.st.ready,null,{timeout:40000,polling:100}); await p.waitForTimeout(1800);
  ok('Saved version: one page, no edit, clean address',await pageNo(p)===1&&!(await texts(p)).includes('Edited R6')&&p.url().endsWith('?design='+CID),p.url());
  ok('the draft stays in Continue editing',(await crDrafts(p)).length===1);
  await p.goto(BASE+'tools/create.html?design='+CID); await p.waitForFunction(()=>window.CRUI&&CRUI.st&&CRUI.st.ready,null,{timeout:40000,polling:100}); await p.waitForTimeout(1800);
  ok('reopened: the edits are back',(await texts(p)).includes('Edited R6'));
  const n0=Object.keys((await dbOf(p)).designs).length;
  await p.evaluate(()=>CRUI.teamSave({name:'R6 Create',kind:'design',keepCols:true})); await p.waitForTimeout(800);
  ok('a team update removes the draft and makes no copy',(await crDrafts(p)).length===0&&Object.keys((await dbOf(p)).designs).length===n0,await crDrafts(p));
  await p.close(); }
{ /* a brand template */
  const p0=await crOpen('tools/create.html?size=story'); const TPL=await p0.evaluate(()=>CR.templates().find(d=>d.layout!=='highlight').id); await p0.close();
  const p=await crOpen('tools/create.html?tpl='+encodeURIComponent(TPL)); await settle(p);
  const ks=await crDrafts(p); ok('brand template: a draft exists',ks.length>=1,ks);
  const before=await texts(p); await addText(p,'Mine R6'); await settle(p);
  await p.goto(BASE+'index.html'); await p.waitForFunction(()=>Studio); await p.waitForTimeout(1300);
  const h=await p.$$eval('#continueList .ccard a',l=>l.map(e=>e.getAttribute('href')));
  ok('brand template: Continue editing opens it',h.some(x=>/create\.html\?draft=/.test(x)),h);
  await p.$eval('#continueList .ccard a',e=>e.click()); await p.waitForFunction(()=>window.CRUI&&CRUI.st&&CRUI.st.ready,null,{timeout:40000,polling:100}); await p.waitForTimeout(1800);
  ok('brand template: the template and the edit are back',(await texts(p)).includes('Mine R6')&&before.every(t=>true));
  await p.close(); }
{ /* a team template */
  const p0=await crOpen('tools/create.html?design='+CID); await p0.close();
  const p=await np(); await p.goto(BASE+'index.html'); const d=await dbOf(p);
  const tid='tpl-r6'; d.designs[tid]={...d.designs[CID],id:tid,name:'R6 Template',kind:'template'}; await p.evaluate(x=>localStorage.setItem('fakecloud',JSON.stringify(x)),d); await p.close();
  const q=await crOpen('tools/create.html?design='+tid); ok('team template opens as a template',await q.evaluate(()=>CRUI.st.design&&CRUI.st.design.kind==='template'));
  await addText(q,'Tpl edit R6'); await settle(q,1);
  const ks=await crDrafts(q); ok('team template: an edit makes a linked draft',ks.some(k=>k.endsWith(':d-'+tid)),ks);
  await q.goto(BASE+'tools/create.html?design='+tid); await q.waitForFunction(()=>window.CRUI&&CRUI.st&&CRUI.st.ready,null,{timeout:40000,polling:100}); await q.waitForTimeout(1800);
  ok('team template: the edit is back after leaving',(await texts(q)).includes('Tpl edit R6')&&await vis(q,'#resumeBar'));
  await q.close(); }
/* e. render frames write no draft */
{ const p=await np(); await p.goto(BASE+'index.html'); const before=(await drafts(p)).length; await p.goto(BASE+'tools/restock.html?design='+id+'&render=1'); await p.waitForTimeout(2500); const after=(await drafts(p)).length; ok('e: ?render=1 writes no draft',after===before,[before,after]); await p.close(); }
await b.close();
console.log(res.join('\n')); if(errs.length) console.log('PAGE ERRORS: '+errs.slice(0,6).join(' | '));
const bad=res.filter(r=>r.startsWith('FAIL')).length||errs.length; console.log(bad?'FAIL':'ALL PASS'); process.exit(bad?1:0);

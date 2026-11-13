/* Same-name guard (2.5.3, owner: "there's still a duplication issue"): a save that would make a NEW design with the name of one
   already in Saved never does it silently. Create, phone 390×844:
   1. first save of "Jumaa" makes it (nothing to ask)  2. a new board saved as "Jumaa" asks; Update keeps ONE design (same id)
   3. asked again, Keep both makes "Jumaa (copy)"  4. the opened design's Update keeps its id, no question
   5. "Save as a copy" on the opened design quietly names it "Jumaa (copy 2)". Plus a tool page (Restock) asks the same way.
   Run: server on :8080 (BASE=...), node tests/same-name.mjs. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
let fails=0; const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
const designs=async()=>Object.values((await pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{}}'))).designs||{}).filter(d=>d.kind!=='template');
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('fakecloud',JSON.stringify({designs:{},files:{},cols:{Stories:{id:'Stories',name:'Stories',brand:'1stchoice'}}})); localStorage.setItem('studio:who:asked','1'); });
const ready=()=>pg.waitForFunction(()=>window.CRUI&&window.BD&&BD.util.frames().length>0,null,{timeout:30000});
async function newBoard(name){ await pg.goto(BASE+'tools/create.html?size=story'); await ready(); await pg.waitForTimeout(500);
  await pg.fill('#crName',name); await pg.dispatchEvent('#crName','change'); }
async function openSaveTeam(){ await pg.tap('#crBar [data-cr="save"]'); await pg.waitForSelector('#crWhere',{timeout:8000}); await pg.waitForTimeout(300);
  if((await pg.getAttribute('#crWhere [data-where="team"]','aria-checked'))!=='true') await pg.tap('#crWhere [data-where="team"]');
  await pg.waitForSelector('#crCols [data-col="Stories"]',{timeout:8000});
  if((await pg.getAttribute('#crCols [data-col="Stories"]','aria-pressed'))!=='true') await pg.tap('#crCols [data-col="Stories"]'); await pg.waitForTimeout(200); }
const teamDone=()=>pg.waitForFunction(()=>/Saved to the team|Not saved|Could not/.test((document.getElementById('crSt')||{}).textContent||''),null,{timeout:30000}).catch(()=>{});
const asked=()=>pg.waitForSelector('#snUpd',{timeout:15000}).then(()=>true).catch(()=>false);

/* 1 */
await newBoard('Jumaa'); await openSaveTeam(); await pg.tap('#crTeamOnly'); await teamDone();
let L1=await designs(); ok('1. first save makes "Jumaa" with no question',L1.length===1&&L1[0].name==='Jumaa'&&!(await pg.$('#snUpd')),L1.map(d=>d.name));
const firstId=L1[0]&&L1[0].id;
/* 2 */
await newBoard('Jumaa'); await openSaveTeam(); await pg.tap('#crTeamOnly');
ok('2. a new board saved as "Jumaa" asks before making a second one',await asked());
await pg.tap('#snUpd'); await teamDone();
let L2=await designs(); ok('2. Update the saved one: still ONE design, same id',L2.length===1&&L2[0].id===firstId,L2.map(d=>[d.id,d.name]));
ok('2. the editor now has that design open (URL ?design=)',(await pg.evaluate(()=>location.search)).includes('design='+firstId));
/* 3 */
await newBoard('Jumaa'); await openSaveTeam(); await pg.tap('#crTeamOnly'); ok('3. asked again',await asked());
await pg.tap('#snNew'); await teamDone();
let L3=await designs(); ok('3. Keep both: "Jumaa" and "Jumaa (copy)"',L3.length===2&&L3.some(d=>d.name==='Jumaa (copy)'),L3.map(d=>d.name));
/* 4 */
await pg.goto(BASE+'tools/create.html?design='+firstId); await ready(); await pg.waitForTimeout(600);
await pg.evaluate(()=>{ const t=BD.util.frames()[0]; BD.changed&&BD.changed(); });
await openSaveTeam(); ok('4. the opened design\'s button says Update',/Update/.test(await pg.textContent('#crGo')),await pg.textContent('#crGo'));
await pg.tap('#crTeamOnly'); await teamDone();
let L4=await designs(); ok('4. Update keeps its id, no question, no new design',L4.length===2&&!(await pg.$('#snUpd'))&&L4.some(d=>d.id===firstId&&d.name==='Jumaa'),L4.map(d=>d.name));
/* 5 */
await pg.goto(BASE+'tools/create.html?design='+firstId); await ready(); await pg.waitForTimeout(600);
await openSaveTeam(); await pg.check('#crAsNew'); await pg.waitForTimeout(150); await pg.tap('#crTeamOnly'); await teamDone();
let L5=await designs(); ok('5. Save as a copy names it "Jumaa (copy 2)" without asking',L5.length===3&&L5.some(d=>d.name==='Jumaa (copy 2)')&&!(await pg.$('#snUpd')),L5.map(d=>d.name));
/* tool page */
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(800);
await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:8000}); await pg.waitForTimeout(300);
await pg.tap('#saveWhere [data-where="team"]'); await pg.waitForTimeout(400);
const ex=(await designs()).filter(d=>d.tool==='restock').length;
if(await pg.$('#teamName')) await pg.fill('#teamName','Jumaa');
const col=await pg.$('#teamCols [data-col="Stories"]'); if(col&&(await col.getAttribute('aria-pressed'))!=='true') await col.tap();
await pg.tap('#teamOnly'); await pg.waitForTimeout(1500);
await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:30000}).catch(()=>{});
const R1=(await designs()).filter(d=>d.tool==='restock');
ok('restock: first "Jumaa" saves (a different tool, so no clash with Create)',R1.length===ex+1&&!(await pg.$('#snUpd')),R1.map(d=>d.name));
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(800);
await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:8000}); await pg.waitForTimeout(300); await pg.tap('#saveWhere [data-where="team"]'); await pg.waitForTimeout(400);
if(await pg.$('#teamName')) await pg.fill('#teamName','Jumaa');
const col2=await pg.$('#teamCols [data-col="Stories"]'); if(col2&&(await col2.getAttribute('aria-pressed'))!=='true') await col2.tap();
await pg.tap('#teamOnly'); ok('restock: a second new "Jumaa" asks too',await asked());
await pg.tap('#snUpd'); await pg.waitForTimeout(2500);
const R2=(await designs()).filter(d=>d.tool==='restock'); ok('restock: Update keeps one "Jumaa"',R2.length===R1.length,R2.map(d=>d.name));
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close(); process.exit(fails?1:0);

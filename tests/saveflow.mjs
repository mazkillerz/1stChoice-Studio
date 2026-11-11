/* Save flow (2.3.0, r3-save): the person chooses "My phone" or "Phone + Team" before saving. Default is always My phone; a team save needs
   a collection (the main button says "Pick a collection" and a tap saves nothing); the button names where it goes; Quick start's one tap
   saves the picture only; a design opened from Saved starts on Phone + Team (Update keeps the same id); after a picture-only save
   "Also save to the team…" still needs a collection; Create has the same rules. Data safety: every team save leaves its row, collection and photos.
   Run like tests/full.mjs (server on :8080, or BASE=...). SHOTS=dir writes phone screenshots. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SHOTS=process.env.SHOTS||'';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
const fdb=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{},"files":{},"cols":{}}'));
const designs=async()=>Object.values((await fdb()).designs||{});
const byName=async n=>(await designs()).find(d=>d.name===n);
const shot=async n=>{ if(SHOTS){ fs.mkdirSync(SHOTS,{recursive:true}); await pg.screenshot({path:SHOTS+'/'+n+'.png'}); } };
const teamDone=()=>pg.waitForFunction(()=>/Saved to the team|not added/.test(document.getElementById('teamStatus').textContent+' '+document.getElementById('status').textContent),null,{timeout:30000}).catch(()=>{});
const picDone=()=>pg.waitForFunction(()=>!document.getElementById('doneBox').hidden||!document.getElementById('result').hidden||/Saved/.test(document.getElementById('status').textContent),null,{timeout:40000}).catch(()=>{});
const txt=s=>pg.evaluate(s=>document.querySelector(s).textContent.trim(),s);
async function open(url){ await pg.goto(BASE+url); await pg.waitForTimeout(900); }
async function sheet(){ await open('tools/restock.html'); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(800);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}); await pg.waitForTimeout(300); }
const where=w=>pg.tap('#saveWhere [data-where="'+w+'"]');
const seed=names=>pg.evaluate(n=>{ const d=JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{},"files":{},"cols":{}}'); n.forEach(x=>{ d.cols[x]={id:x,name:x,brand:'1stchoice'}; }); localStorage.setItem('fakecloud',JSON.stringify(d)); },names);
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
await seed(['Restocks','Collabs']);

/* 1. default = My phone, even signed in */
await sheet();
ok('the Save sheet has a Save to control with two choices',(await pg.$$('#saveWhere [role=radio]')).length===2&&(await pg.getAttribute('#saveWhere [role=radiogroup]','role'))==='radiogroup');
ok('it starts on My phone (signed in too)',(await pg.getAttribute('#saveWhere [data-where="me"]','aria-checked'))==='true'&&!(await pg.$eval('#teamOn',e=>e.checked))&&!(await pg.isVisible('#teamBox')));
ok('the choices are 56px tall and name the picture / the team',(await pg.$eval('#saveWhere [data-where="me"]',e=>e.getBoundingClientRect().height))>=56&&/My phone/.test(await txt('#saveWhere [data-where="me"]'))&&/Phone \+ Team/.test(await txt('#saveWhere [data-where="team"]')));
ok('the main button says Save to my phone',await txt('#saveTxt')==='Save to my phone',await txt('#saveTxt'));
const fit=await pg.evaluate(()=>{ const sh=document.getElementById('sh-save'), body=sh.querySelector('.sheet-body'), sv=document.getElementById('save').getBoundingClientRect(); return {scroll:body.scrollHeight-body.clientHeight, saveBottom:Math.round(sv.bottom), vh:innerHeight}; });
ok('My phone: the sheet fits without scrolling and Save is in view',fit.scroll<=2&&fit.saveBottom<=fit.vh,fit);
await shot('1-myphone-light');

/* 2. a My phone save writes nothing to the team */
const dls=[]; pg.on('download',d=>dls.push(d));
await pg.tap('#save'); await picDone();
await pg.waitForTimeout(600);
ok('and no design is written to the team',(await designs()).length===0,(await designs()).length);
ok('after the picture the sheet offers "Also save to the team…"',await pg.isVisible('#alsoTeam'));
await shot('2-after-picture');

/* 3. Also save to the team needs a collection */
await pg.tap('#alsoTeam'); await pg.waitForSelector('#teamBox:not([hidden])');
await pg.waitForSelector('#teamCols [data-col]');
ok('Also save to the team shows the collection panel, button "Pick a collection"',await txt('#saveTxt')==='Pick a collection'&&(await pg.getAttribute('#save','aria-disabled'))==='true',await txt('#saveTxt'));
await pg.tap('#save',{force:true}); await pg.waitForTimeout(400);
ok('tapping it does not save and says what to do',(await designs()).length===0&&/Pick a collection first, then save/.test(await txt('#teamColsHint')));
await pg.tap('#teamCols [data-col="Restocks"]');
ok('picking one: the button reads Add to “Restocks”',await txt('#saveTxt')==='Add to “Restocks”',await txt('#saveTxt'));
await pg.tap('#save'); await teamDone();
let d=(await designs())[0];
ok('it is saved in that collection',d&&(d.cols||[]).includes('Restocks'),d&&d.cols);
ok('the design row, thumb and photos exist',!!(d&&d.thumb_path&&(d.recipe.photoPaths||[]).filter(Boolean).length&&(await fdb()).files[d.thumb_path]),d&&d.recipe&&d.recipe.photoPaths);
ok('"See it in Saved" shows after a team save',await pg.isVisible('#seeSaved')&&/#saved$/.test(await pg.getAttribute('#seeSaved','href')));

/* 4. Phone + Team, nothing picked: the quiet button, a tap saves nothing */
await pg.evaluate(()=>{ localStorage.removeItem('fakecloud'); }); await seed(['Restocks','Collabs']);
await sheet();
await where('team'); await pg.waitForSelector('#teamBox:not([hidden])'); await pg.waitForSelector('#teamCols [data-col]');
ok('Phone + Team: the panel opens with Name and a required Collection',await pg.isVisible('#teamName')&&/required/.test(await txt('#teamColsLbl')));
ok('nothing is picked for a new design',(await pg.$$('#teamCols [aria-pressed="true"]')).length===0);
ok('the main button says Pick a collection and is aria-disabled',await txt('#saveTxt')==='Pick a collection'&&(await pg.getAttribute('#save','aria-disabled'))==='true');
const need=await pg.evaluate(()=>{ const s=document.getElementById('save'), r=s.getBoundingClientRect(); return {h:r.height,bottom:r.bottom,vh:innerHeight,disabled:s.disabled}; });
ok('it is still tappable (not disabled) and Save is in view',!need.disabled&&need.h>=44&&need.bottom<=need.vh,need);
await shot('4-team-pick-light');
await pg.tap('#save',{force:true}); await pg.waitForTimeout(500);
ok('a tap saves nothing and shows the hint',(await designs()).length===0&&/Pick a collection first, then save/.test(await txt('#teamColsHint'))&&(await pg.$eval('#teamCols',e=>e.classList.contains('nudge'))));
ok('the hint is a status line',(await pg.getAttribute('#teamColsHint','role'))==='status');
await pg.tap('#teamCols [data-col="Restocks"]');
ok('one picked: Save to “Restocks”',await txt('#saveTxt')==='Save to “Restocks”'&&(await pg.getAttribute('#save','aria-disabled'))==='false',await txt('#saveTxt'));
await pg.tap('#teamCols [data-col="Collabs"]');
ok('two picked: Save to 2 collections',await txt('#saveTxt')==='Save to 2 collections',await txt('#saveTxt'));
await shot('4b-team-picked-light');
await pg.tap('#teamCols [data-col="Collabs"]'); await pg.fill('#teamName','Flow one'); await pg.tap('#save'); await teamDone();
d=await byName('Flow one');
ok('the design is in the picked collection in fakecloud',d&&(d.cols||[]).join()==='Restocks',d&&d.cols);
ok('its photos and cover exist',!!(d&&d.thumb_path&&(await fdb()).files[d.thumb_path]&&(d.recipe.photoPaths||[]).filter(Boolean).length>0));
ok('the success line names the collection',/in “Restocks”/.test(await txt('#teamStatus')),await txt('#teamStatus'));

/* 5. nothing is remembered: next save is My phone again; the last-used collection comes first, not picked */
await sheet();
ok('a new save starts on My phone again',(await pg.getAttribute('#saveWhere [data-where="me"]','aria-checked'))==='true');
await where('team'); await pg.waitForSelector('#teamCols [data-col]');
const first=await pg.$eval('#teamCols .col-pick',e=>e.dataset.col);
ok('the last-used collection comes first, but is not picked',first==='Restocks'&&(await pg.$$('#teamCols [aria-pressed="true"]')).length===0,first);
/* a new collection typed counts */
await pg.tap('#teamCols [data-newcol]'); await pg.fill('#teamNewCol','Brand new');
ok('a typed new collection counts as picked (button names it)',await txt('#saveTxt')==='Save to “Brand new”',await txt('#saveTxt'));
await pg.fill('#teamName','Flow typed'); await pg.tap('#save'); await teamDone();
d=await byName('Flow typed');
ok('saved into the typed collection',d&&(d.cols||[]).includes('Brand new'),d&&d.cols);

/* 6. Quick start: one tap saves the picture only */
await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
const before=(await designs()).length;
await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]);
await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{});
await pg.waitForTimeout(1300);
await pg.tap('#barSave'); await picDone(); await pg.waitForTimeout(1500);
ok('Quick start one tap makes a picture and no team design',(await designs()).length===before&&!/Saved to the team/.test(await txt('#teamStatus')),(await designs()).length);

/* 7. a design opened from Saved starts on Phone + Team with its collections; Update keeps the id */
const did=(await byName('Flow one')).id;
await open('tools/restock.html?design='+did); await pg.waitForFunction(()=>/design=/.test(location.search)&&!/Opening/.test(document.getElementById('status').textContent),null,{timeout:15000}).catch(()=>{});
await pg.waitForTimeout(1500);
await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open'); await pg.waitForTimeout(400);
ok('an opened design starts on Phone + Team',(await pg.getAttribute('#saveWhere [data-where="team"]','aria-checked'))==='true'&&await pg.isVisible('#teamBox'));
ok('its own collection is picked and the button says Update “name”',(await pg.$$('#teamCols [aria-pressed="true"]')).length===1&&/^Update “Flow one”/.test(await txt('#saveTxt')),await txt('#saveTxt'));
await shot('7-update-light');
const n0=(await designs()).length; await pg.tap('#save'); await teamDone();
ok('Update keeps the same design id (no copy)',(await designs()).length===n0&&!!(await byName('Flow one'))&&(await byName('Flow one')).id===did);
ok('and it is still in its collection with its photos',((await byName('Flow one')).cols||[]).includes('Restocks')&&(await byName('Flow one')).recipe.photoPaths.filter(Boolean).length>0);

/* 9. dark mode screenshots */
if(SHOTS){ await pg.emulateMedia({colorScheme:'dark'}); await sheet(); await shot('9-myphone-dark'); await where('team'); await pg.waitForSelector('#teamCols [data-col]'); await pg.waitForTimeout(300); await shot('9-team-pick-dark'); await pg.tap('#save',{force:true}); await pg.waitForTimeout(300); await shot('9-team-nudge-dark'); }

console.log(res.join('\n')); if(errs.length) console.log('PAGE ERRORS:\n'+errs.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length; console.log(fails?fails+' FAILED':'all passed ('+res.length+')'); await b.close(); process.exit(fails?1:0);

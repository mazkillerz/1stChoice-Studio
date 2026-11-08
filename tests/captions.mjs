/* Captions with the design (mega 4.3, preview flag "team"): assets/captions.js + captions.css, hooks in studio.js, rules.js checkText, calendar.js. fakecloud stands in for Supabase.
   1 flag off: no Caption row in the Save sheet, no Caption/Copy rows in a design's menu, no captions files requested
   2 phone (light): the Save sheet has a collapsed Caption row (team save), the editor is RTL, approved caption chips insert, hashtags become chips with #,
     the save stores caption + hashtags, "Copy caption" appears after Save and puts caption + blank line + hashtags on the clipboard, one filled button at most
   3 shown again after a reload (design opened), a banned word shows a quiet warning but the save still works
   4 Saved > a design's menu: Caption (edit, Save caption) and Copy caption
   5 calendar: an item without a caption shows its linked design's caption and the item sheet offers "Use the design's caption"
   6 phone dark + desktop: targets >= 44, no sideways scroll, no page errors
   Run: BASE=http://127.0.0.1:8282/ node tests/captions.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const pad=n=>(n<10?'0':'')+n, now=new Date(), TODAY=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
const LINE='يوم جديد مع كولد برو', DCAP='كابشن التصميم\nسطر ثاني';   // test data only
const db=seedDesigns(); const iso=new Date().toISOString();
db.designs.seed1.caption=DCAP; db.designs.seed1.hashtags=['#cold','#brew'];
db.phrases=[{id:'pc',brand:'1stchoice',line:LINE,category:'caption',status:'approved',author:'Sara',approved_by:'Owner',created_at:iso}];
db.calendar=[{id:'c1',brand:'1stchoice',day:TODAY,at:'09:30',status:'draft',title:'Linked post',caption:'',hashtags:[],design_ids:['seed1'],author:'Sara',created_at:iso},
  {id:'c2',brand:'1stchoice',day:TODAY,at:null,status:'draft',title:'Own caption post',caption:'Mine',hashtags:[],design_ids:['seed1'],author:'Sara',created_at:iso}];
const init=flag=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  ${flag?"localStorage.setItem('studio:flag:team','1');":''}
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,flag){
  const ctx=await b.newContext({serviceWorkers:'block',acceptDownloads:true,...opts});
  await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(BASE).origin}).catch(()=>{});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(flag)}); return ctx; }
const PHONE={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2};
const fdb=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));
const mine=async pg=>Object.values((await fdb(pg)).designs).filter(d=>!/^seed\d/.test(d.id));
const clip=pg=>pg.evaluate(()=>navigator.clipboard.readText());
const openSave=async pg=>{ await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}); await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(400); };
const start=async(pg,url)=>{ await pg.goto(BASE+(url||'tools/restock.html')); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1500); };
const small=async(pg,sel,T)=>{ const bad=await pg.$$eval(sel,l=>l.filter(e=>e.offsetParent&&(e.getBoundingClientRect().height<43.5||e.getBoundingClientRect().width<43.5)).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))); return bad; };

/* 1 flag off */
{ const ctx=await mk(PHONE,false), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('off: '+e.message)); let req=0; pg.on('request',r=>{ if(/captions\.(js|css)/.test(r.url())) req++; });
  await start(pg); await openSave(pg);
  ok('1 flag off: no Caption row, no Copy caption in the Save sheet',!(await pg.$('#capOpen,#capBox,#capCopy,.cap-wrap')));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id="seed1"]',{timeout:8000});
  await pg.click('#savedGrid .sv-card[data-id="seed1"] .sv-open',{button:'right'}).catch(()=>{}); await pg.waitForTimeout(300);
  if(!(await pg.$('dialog.design-dlg[open]'))){ await pg.evaluate(()=>document.querySelector('#savedGrid .sv-card[data-id="seed1"] .sv-more,#savedGrid .sv-card[data-id="seed1"] [data-more]')?.click()); await pg.waitForTimeout(400); }
  const has=await pg.$('dialog.design-dlg[open]');
  ok('1 flag off: the design menu opens with no Caption or Copy caption row',!!has&&!(await pg.$('dialog.design-dlg [data-act="cap"],dialog.design-dlg [data-act="capcopy"]')));
  ok('1 flag off: captions files are never requested',req===0,req); await ctx.close(); }

/* 2 + 3 phone */
async function phone(dark){
  const T=(dark?'dark ':'light ')+'phone: ';
  const ctx=await mk({...PHONE,colorScheme:dark?'dark':'light'},true), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message));
  await start(pg); await openSave(pg);
  ok(T+'the Save sheet has a collapsed Caption row (team save)',await pg.isVisible('#capOpen')&&!(await pg.isVisible('#capBox'))&&await pg.getAttribute('#capOpen','aria-expanded')==='false');
  await pg.tap('#capOpen'); await pg.waitForSelector('#capBox .cap-ta',{timeout:6000}); await pg.waitForTimeout(300);
  ok(T+'tapping it opens the editor',await pg.isVisible('#capBox .cap-ta')&&await pg.getAttribute('#capOpen','aria-expanded')==='true');
  const sel=await pg.$$eval('#capBox [data-ins]',l=>l.map(x=>x.dataset.ins));
  ok(T+'approved caption lines show as chips',sel.includes(LINE),sel.slice(0,4));
  await pg.tap('#capBox [data-ins="'+LINE+'"]'); await pg.waitForTimeout(200);
  ok(T+'tapping a chip inserts the line into the caption',(await pg.inputValue('#capBox .cap-ta'))===LINE);
  await pg.tap('#capBox [data-ins="'+LINE+'"]'); await pg.waitForTimeout(200);
  ok(T+'a second tap adds it on a new line at the cursor',(await pg.inputValue('#capBox .cap-ta'))===LINE+'\n'+LINE);
  await pg.fill('#capBox .cap-ta',LINE);
  ok(T+'the caption box is right-to-left (dir=auto)',await pg.$eval('#capBox .cap-ta',e=>getComputedStyle(e).direction==='rtl'&&e.getAttribute('dir')==='auto'));
  await pg.fill('#capBox .cap-tin','cold '); await pg.fill('#capBox .cap-tin','#brew,'); await pg.fill('#capBox .cap-tin','تجربة'); await pg.press('#capBox .cap-tin','Enter'); await pg.waitForTimeout(200);
  const tags=await pg.$$eval('#capBox .cap-tag bdi',l=>l.map(x=>x.textContent));
  ok(T+'typed words become hashtag chips with a leading #',JSON.stringify(tags)==='["#brew","#تجربة"]'||JSON.stringify(tags)==='["#cold","#brew","#تجربة"]',tags);
  ok(T+'no warning for an approved line',!(await pg.isVisible('#capBox .cap-warn')));
  ok(T+'the row shows the caption as its summary',(await pg.textContent('#capSum')).trim()===LINE);
  const filled=await pg.$$eval('#sh-save .btn:not(.ghost):not(.link):not(.mini)',l=>l.filter(e=>e.offsetParent).length);
  ok(T+'at most 2 filled buttons in the Save sheet (before saving)',filled<=2,filled);
  const tg=await pg.$$eval('#capBox .cap-tag bdi',l=>l.map(x=>x.textContent));
  await pg.tap('#save');
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:25000}).catch(()=>{});
  await pg.waitForTimeout(500);
  const d1=(await mine(pg))[0]||{};
  ok(T+'the team save stores the caption and hashtags (with #)',d1.caption===LINE&&JSON.stringify(d1.hashtags)===JSON.stringify(tg)&&d1.hashtags.every(t=>t[0]==='#'),[d1.caption,d1.hashtags]);
  ok(T+'"Copy caption" shows after Save as a quiet text button',await pg.isVisible('#capCopy')&&await pg.$eval('#capCopy',e=>e.classList.contains('link')));
  const filled2=await pg.$$eval('#sh-save .btn:not(.ghost):not(.link):not(.mini)',l=>l.filter(e=>e.offsetParent).length);
  ok(T+'at most 2 filled buttons in the done state',filled2<=2,filled2);
  await pg.tap('#capCopy'); await pg.waitForTimeout(300);
  ok(T+'Copy puts caption + blank line + hashtags on the clipboard',(await clip(pg))===LINE+'\n\n'+tg.join(' '),await clip(pg));
  ok(T+'a toast confirms',/copied/i.test(await pg.textContent('#toast')||''));
  /* reload: the design opens with its caption */
  await pg.goto(BASE+'tools/restock.html?design='+d1.id); await pg.waitForTimeout(2600);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open'); await pg.evaluate(()=>{ const s=document.getElementById('teamOn'); if(!s.checked){ s.checked=true; s.dispatchEvent(new Event('change',{bubbles:true})); } }); await pg.waitForTimeout(600);
  ok(T+'after a reload the Caption row shows the saved caption',(await pg.textContent('#capSum')).trim()===LINE);
  await pg.tap('#capOpen'); await pg.waitForSelector('#capBox .cap-ta');
  ok(T+'...and the editor holds caption + hashtags',(await pg.inputValue('#capBox .cap-ta'))===LINE&&JSON.stringify(await pg.$$eval('#capBox .cap-tag bdi',l=>l.map(x=>x.textContent)))===JSON.stringify(tg));
  /* banned word: quiet warning, the save still works and keeps it */
  await pg.fill('#capBox .cap-ta','تعال خوي'); await pg.waitForTimeout(600);
  const w=await pg.isVisible('#capBox .cap-warn')?await pg.textContent('#capBox .cap-warn'):'';
  ok(T+'a banned word shows a quiet warning line',/خوي/.test(w)&&/not used/.test(w),w);
  ok(T+'...that does not disable Save',!(await pg.$eval('#save',e=>e.disabled)));
  await pg.tap('#save'); await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:25000}).catch(()=>{}); await pg.waitForTimeout(600);
  const d2=(await fdb(pg)).designs[d1.id]; ok(T+'...the save still worked and stored the caption',d2&&d2.caption==='تعال خوي',d2&&d2.caption);
  ok(T+'targets in the editor are >= 44',(await small(pg,'#capBox button, #capBox input, #capOpen')).length===0,await small(pg,'#capBox button, #capBox input, #capOpen'));
  ok(T+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await ctx.close(); }
await phone(false);

/* 4 Saved menu + 5 calendar (phone light) */
{ const ctx=await mk(PHONE,true), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('menu: '+e.message));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id="seed1"]',{timeout:8000}); await pg.waitForTimeout(500);
  const el=pg.locator('#savedGrid .sv-card[data-id="seed1"] .sv-open'), bb=await el.boundingBox(), x=bb.x+bb.width/2, y=bb.y+bb.height/2;
  const o={bubbles:true,cancelable:true,composed:true,pointerType:'touch',pointerId:7,isPrimary:true,button:0,buttons:1,clientX:x,clientY:y};
  await el.dispatchEvent('pointerdown',o); await pg.waitForTimeout(650); await el.dispatchEvent('pointerup',{...o,buttons:0}); await el.dispatchEvent('click',{bubbles:true,cancelable:true,clientX:x,clientY:y}); await pg.waitForTimeout(300);
  await pg.tap('dialog.design-dlg [data-act="team"]');   // the team rows sit behind one Team row
  ok('4 the design menu has Caption and Copy caption (the design has one)',await pg.isVisible('dialog.design-dlg [data-act="cap"]')&&await pg.isVisible('dialog.design-dlg [data-act="capcopy"]'));
  await pg.tap('dialog.design-dlg [data-act="capcopy"]'); await pg.waitForTimeout(400);
  ok('4 Copy caption copies caption + blank line + hashtags',(await clip(pg))===DCAP+'\n\n#cold #brew',await clip(pg));
  ok('4 ...and a toast says so',/copied/i.test(await pg.textContent('#hubToast')||''));
  await pg.tap('dialog.design-dlg [data-act="cap"]'); await pg.waitForSelector('dialog.design-dlg .cap-ta',{timeout:6000});
  ok('4 Caption opens the editor with the saved text',(await pg.inputValue('dialog.design-dlg .cap-ta'))===DCAP);
  await pg.fill('dialog.design-dlg .cap-ta','Updated caption'); await pg.fill('dialog.design-dlg .cap-tin','new'); await pg.press('dialog.design-dlg .cap-tin','Enter');
  await pg.tap('#capSaveBtn'); await pg.waitForTimeout(600);
  const s1=(await fdb(pg)).designs.seed1; ok('4 Save caption stores it in the team',s1.caption==='Updated caption'&&s1.hashtags.includes('#new')&&s1.hashtags.includes('#cold'),[s1.caption,s1.hashtags]);
  /* calendar */
  await pg.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); d.designs.seed1.caption='كابشن التصميم\nسطر ثاني'; d.designs.seed1.hashtags=['#cold','#brew']; localStorage.setItem('fakecloud',JSON.stringify(d)); });
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('#calendarView .cal-item[data-id="c1"]',{timeout:8000}); await pg.waitForTimeout(600);
  const c1=await pg.$eval('.cal-item[data-id="c1"] .ci-cap',e=>e.textContent).catch(()=>''), c2=await pg.$eval('.cal-item[data-id="c2"] .ci-cap',e=>e.textContent).catch(()=>'');
  ok('5 an item with no caption shows its design\'s caption',c1==='كابشن التصميم',c1);
  ok('5 an item with its own caption keeps it',c2==='Mine',c2);
  await pg.tap('.cal-item[data-id="c1"] .ci-main'); await pg.waitForSelector('#calCap'); await pg.waitForTimeout(300);
  ok('5 the sheet\'s caption box is still empty (nothing is saved silently)',(await pg.inputValue('#calCap'))==='');
  ok('5 "Use the design\'s caption" shows',await pg.isVisible('#calUseCap'));
  await pg.tap('#calUseCap'); await pg.waitForTimeout(200);
  ok('5 it fills the caption and hashtags',(await pg.inputValue('#calCap'))==='كابشن التصميم\nسطر ثاني'&&(await pg.inputValue('#calTags'))==='#cold #brew',[await pg.inputValue('#calCap'),await pg.inputValue('#calTags')]);
  await pg.tap('#calSave'); await pg.waitForSelector('dialog.cal-dlg',{state:'detached',timeout:6000}); await pg.waitForTimeout(500);
  const it=((await fdb(pg)).calendar||[]).find(x=>x.id==='c1'); ok('5 saving stores the caption on the item',it&&it.caption==='كابشن التصميم\nسطر ثاني'&&it.hashtags.join(' ')==='#cold #brew',it&&it.caption);
  await pg.tap('.cal-item[data-id="c2"] .ci-main'); await pg.waitForSelector('#calCap'); ok('5 the button also shows when a caption exists (to replace it)',await pg.isVisible('#calUseCap')); await ctx.close(); }

/* 6 dark phone + desktop */
await phone(true);
{ const ctx=await mk({viewport:{width:1280,height:800}},true), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('desk: '+e.message));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1500);
  await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(400);
  await pg.click('#capOpen'); await pg.waitForSelector('#capBox .cap-ta'); await pg.click('#capBox [data-ins]'); await pg.waitForTimeout(200);
  ok('desktop: the editor opens and a chip inserts',(await pg.inputValue('#capBox .cap-ta')).length>0&&await pg.isVisible('#capOpen'));
  ok('desktop: targets >= 44 and no sideways scroll',(await small(pg,'#capBox button, #capBox input, #capOpen')).length===0&&await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),await small(pg,'#capBox button, #capBox input, #capOpen'));
  await ctx.close(); }
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')); if(errs.length) console.log('PAGE ERRORS: '+errs.slice(0,5).join(' | '));
console.log((res.length-bad.length)+'/'+res.length+' passed'); process.exit(bad.length||errs.length?1:0);

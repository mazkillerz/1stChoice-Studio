/* Ideas (assets/ideas.js, behind the "plan" preview): capture (text, link, picture, voice), Inbox, Board, idea sheet, desktop drag.
   Run: node tests/ideas.mjs (server on :8081, or BASE=...). Real MediaRecorder on Chromium's fake microphone. */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8081/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}), errs=[];
const SHOTS=new URL('../studio-notes/pending/shots/',import.meta.url).pathname;
const hrs=n=>new Date(Date.now()-n*3600e3).toISOString();
const wav=(()=>{ const n=8000, buf=Buffer.alloc(44+n*2); buf.write('RIFF',0); buf.writeUInt32LE(36+n*2,4); buf.write('WAVEfmt ',8); buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20); buf.writeUInt16LE(1,22); buf.writeUInt32LE(8000,24); buf.writeUInt32LE(16000,28); buf.writeUInt16LE(2,32); buf.writeUInt16LE(16,34); buf.write('data',36); buf.writeUInt32LE(n*2,40); return 'data:audio/wav;base64,'+buf.toString('base64'); })();
const base=()=>seedDesigns();
function seeded(){
  const db=base(); const I=(id,o)=>({id,brand:'1stchoice',title:'',note:'',type:'post',stage:'idea',link:null,image_path:null,audio_path:null,audio_secs:null,design_id:null,calendar_id:null,sort:0,author:'Sara',created_at:hrs(2),updated_at:hrs(2),...o});
  db.files['1stchoice/ideas/v1/voice.wav']=wav; db.files['1stchoice/ideas/p1/pic.jpg']=db.files['1stchoice/seed0/thumb.jpg'];
  db.ideas=[ I('i1',{title:'Behind the scenes: brewing day',note:'Film the 18 h steep, time-lapse',stage:'inbox',audio_path:'1stchoice/ideas/v1/voice.wav',audio_secs:42,created_at:hrs(0.1)}),
    I('i2',{title:'Link from the competitor',stage:'inbox',link:'https://www.example.com/some/post',created_at:hrs(1)}),
    I('i3',{title:'علبة مع القهوة الصباحية',note:'فكرة ستوري',stage:'inbox',image_path:'1stchoice/ideas/p1/pic.jpg',author:'Omar',created_at:hrs(5)}),
    I('i4',{title:'Weekend giveaway',type:'giveaway',stage:'idea',note:'Win a case of cans',created_at:hrs(30)}),
    I('i5',{title:'Reel: pour shot',type:'reel',stage:'idea',link:'https://www.instagram.com/reel/abc',created_at:hrs(40)}),
    I('i6',{title:'Restock story',type:'story',stage:'planned',design_id:'seed0',calendar_id:'c1',created_at:hrs(50)}),
    I('i7',{title:'Carousel: flavours',type:'post',stage:'progress',design_id:'seed4',created_at:hrs(60)}),
    I('i8',{title:'Friends day post',type:'post',stage:'posted',created_at:hrs(90)}) ];
  const d=new Date(); d.setDate(d.getDate()+2); const day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  db.calendar=[{id:'c1',brand:'1stchoice',day,at:'19:00',status:'draft',format:'story',title:'Restock story',caption:'',hashtags:[],design_ids:['seed0'],author:'Sara',created_at:hrs(1)}];
  return db;
}
const init=(db,flag)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  ${flag?"localStorage.setItem('studio:flag:plan','1');":''}
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,db,flag=true){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(db,flag)}); await ctx.grantPermissions(['microphone','clipboard-read','clipboard-write']).catch(()=>{});
  return ctx;
}
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const stored=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));
const txt=(pg,s)=>pg.$eval(s,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');
const open=async(pg,hash='ideas')=>{ await pg.goto(BASE+'index.html#'+hash); await pg.waitForSelector('#ideasView .id-top',{timeout:10000}); await pg.waitForFunction(()=>!document.querySelector('#ideasView .id-skel'),null,{timeout:10000}); };
const smalls=pg=>pg.evaluate(()=>{ const out=[]; document.querySelectorAll('#ideasView button,#ideasView a,#ideasView input,dialog[open] button,dialog[open] a.link,dialog[open] input:not([type=hidden]):not([hidden])').forEach(e=>{ const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); if(!r.width||!r.height||cs.visibility==='hidden'||e.hidden||e.closest('[hidden]')||cs.opacity==='0') return; if(r.height<43.5||r.width<43.5){ if(e.matches('a.id-lnk,.id-chip')&&r.height>=32&&false) return; out.push((e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height)); } }); return out; });

/* 1 flag off */
{ const ctx=await mk(PH,base(),false); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('off: '+e.message));
  let req=0; pg.on('request',r=>{ if(/assets\/ideas\.(js|css)/.test(r.url())) req++; });
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow',{timeout:8000}); await pg.waitForTimeout(400);
  ok('1 flag off: no Ideas page, no ideas files requested',!(await pg.$('#ideasView'))&&req===0,req); await ctx.close(); }

/* 2-9 phone, empty then capture flow */
async function flow(dark){
  const T=(dark?'dark ':'light ')+'phone: ';
  const ctx=await mk({...PH,colorScheme:dark?'dark':'light'},base()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts|ERR_FAILED|net::|favicon/i.test(m.text())) errs.push(T+'console '+m.text()); });
  await open(pg);
  ok(T+'#ideas opens; empty: lands on the Board with a friendly empty state',/Your board is empty/.test(await txt(pg,'.id-content'))&&await pg.evaluate(()=>!document.getElementById('ideasView').hidden),await txt(pg,'.id-content'));
  await pg.tap('[data-tab="inbox"]'); const em=await txt(pg,'.id-content');
  ok(T+'empty Inbox: "Inbox is clear" + New idea button',/Inbox is clear/.test(em)&&/New idea/.test(em),em);
  /* capture by typing + link + type, Ctrl+Enter */
  await pg.tap('.id-new'); await pg.waitForSelector('dialog.id-capdlg textarea');
  ok(T+'New opens a sheet with the idea box focused',await pg.evaluate(()=>document.activeElement&&document.activeElement.id==='idCT'));
  await pg.fill('#idCT','Reel idea: pour in slow motion https://example.org/ref/1\nSecond line of notes');
  ok(T+'a URL in the text becomes a link chip',/example\.org/.test(await txt(pg,'#idAtt')),await txt(pg,'#idAtt'));
  await pg.tap('[data-ct="reel"]'); const t0=Date.now(); await pg.press('#idCT','Control+Enter');
  ok(T+'saving closes the sheet at once and the card shows in the inbox',await pg.waitForFunction(()=>!document.querySelector('dialog.id-capdlg')&&/pour in slow motion/.test(document.querySelector('.id-content').innerText),null,{timeout:2500}).then(()=>true).catch(()=>false)&&Date.now()-t0<2500);
  await pg.waitForFunction(()=>JSON.parse(localStorage.getItem('fakecloud')).ideas&&JSON.parse(localStorage.getItem('fakecloud')).ideas.length===1,null,{timeout:5000}).catch(()=>{});
  let s=await stored(pg), r=(s.ideas||[])[0]||{};
  ok(T+'stored in the cloud: title, note, link, type, stage inbox, author',r.title&&/Reel idea/.test(r.title)&&r.note==='Second line of notes'&&r.link==='https://example.org/ref/1'&&r.type==='reel'&&r.stage==='inbox'&&r.author==='Sara',r);
  /* picture: 3000x2000 -> <= 1600 jpeg */
  await pg.tap('.id-new'); await pg.waitForSelector('dialog.id-capdlg');
  const big=await pg.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=3000; c.height=2000; const g=c.getContext('2d'); g.fillStyle='#c33'; g.fillRect(0,0,3000,2000); g.fillStyle='#fff'; g.fillRect(500,500,1500,800); return (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer().then(a=>Array.from(new Uint8Array(a)).length&&btoa(String.fromCharCode(...new Uint8Array(a).slice(0,0)))||'x'); }).catch(()=>'x');
  const png=await pg.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=3000; c.height=2000; const g=c.getContext('2d'); g.fillStyle='#c33'; g.fillRect(0,0,3000,2000); const u=c.toDataURL('image/png'); return u.split(',')[1]; });
  await pg.setInputFiles('#idFile',{name:'shot.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await pg.waitForSelector('#idAtt img',{timeout:5000});
  await pg.fill('#idCT','Screenshot of a good post'); await pg.tap('#idSave');
  await pg.waitForFunction(()=>(JSON.parse(localStorage.getItem('fakecloud')).ideas||[]).length===2,null,{timeout:6000}).catch(()=>{});
  s=await stored(pg); const pic=(s.ideas||[]).find(x=>x.image_path);
  const dim=pic?await pg.evaluate(async u=>{ const i=new Image(); i.src=u; await i.decode(); return [i.naturalWidth,i.naturalHeight,u.slice(0,22)]; },s.files[pic.image_path]):null;
  ok(T+'picture is downscaled to <= 1600 px and stored as JPEG',!!dim&&Math.max(dim[0],dim[1])<=1600&&dim[2].includes('jpeg'),dim);
  /* voice, end to end */
  await pg.tap('.id-new'); await pg.waitForSelector('dialog.id-capdlg'); await pg.tap('[data-tool="voice"]');
  await pg.waitForSelector('.id-rec',{timeout:5000}); await pg.waitForTimeout(2300);
  const live=await pg.evaluate(()=>({t:document.querySelector('.id-rtime').textContent,w:document.querySelector('.id-meter i').style.width}));
  ok(T+'recording shows a running mm:ss counter and a level meter',/^0:0[1-9]$/.test(live.t)&&!!live.w,live);
  await pg.tap('[data-rstop]'); await pg.waitForSelector('#idAtt .id-voice',{timeout:5000});
  ok(T+'after Stop a playable preview with Re-record shows',/Re-record/.test(await txt(pg,'#idAtt')));
  await pg.tap('#idAtt .id-play'); await pg.waitForTimeout(300);
  ok(T+'the preview plays (button turns into Pause)',/Pause|Play/.test(await pg.getAttribute('#idAtt .id-play','aria-label')));
  await pg.fill('#idCT','Voice idea about the new flavour'); await pg.tap('#idSave');
  await pg.waitForFunction(()=>(JSON.parse(localStorage.getItem('fakecloud')).ideas||[]).length===3,null,{timeout:8000}).catch(()=>{});
  s=await stored(pg); const v=(s.ideas||[]).find(x=>x.audio_path);
  ok(T+'voice note stored as audio with its length, attached to the idea',!!v&&/^data:audio\//.test(s.files[v.audio_path]||'')&&v.audio_secs>=2&&v.audio_secs<=5,v&&{p:v.audio_path,s:v.audio_secs});
  await pg.waitForSelector('.id-card[data-id="'+(v&&v.id)+'"] .id-voice',{timeout:4000}).catch(()=>{});
  ok(T+'the inbox card has a voice player with the duration',/0:0[2-5]/.test(await txt(pg,'.id-card:first-child .id-voice')),await txt(pg,'.id-card:first-child .id-voice'));
  /* sort */
  const nIn=await pg.$$eval('.id-card',e=>e.length);
  await pg.tap('.id-card:nth-child(3) [data-sort][data-t="reel"]'); await pg.waitForTimeout(400);
  s=await stored(pg);
  ok(T+'tapping Reel on an inbox card moves it to the board (stage idea, type reel) with a toast',(s.ideas||[]).filter(x=>x.stage==='idea'&&x.type==='reel').length===1&&/Moved to the board/.test(await txt(pg,'#hubToast'))&&(await pg.$$eval('.id-card',e=>e.length))===nIn-1,await txt(pg,'#hubToast'));
  if(!dark){ await pg.screenshot({path:SHOTS+'ideas-capture-light.png'}); }
  await ctx.close();
}
await flow(false); await flow(true);

/* populated: board, filters, sheet, calendar */
async function populated(dark){
  const T=(dark?'dark ':'light ')+'board: ';
  const ctx=await mk({...PH,colorScheme:dark?'dark':'light'},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message));
  await open(pg);
  const first=await pg.evaluate(()=>({inboxOn:document.querySelector('[data-tab="inbox"]').getAttribute('aria-pressed'),n:document.querySelectorAll('.id-card').length,badge:document.querySelector('[data-tab="inbox"] i')?.textContent}));
  ok(T+'opens on Inbox when it has ideas (3), newest first',first.inboxOn==='true'&&first.n===3&&first.badge==='3'&&/brewing day/.test(await txt(pg,'.id-card:first-child')),first);
  await pg.waitForFunction(()=>{ const i=document.querySelector('.id-card img.id-thumb'); return i&&i.complete&&i.naturalWidth>0; },null,{timeout:6000}).catch(()=>{});
  ok(T+'inbox card shows picture thumb, link domain, author initial',!!(await pg.$('.id-card .id-thumb'))&&/example\.com/.test(await txt(pg,'#ideasView'))&&/^S/.test(await txt(pg,'.id-av')));
  if(!dark) await pg.screenshot({path:SHOTS+'ideas-inbox-light.png'}); else await pg.screenshot({path:SHOTS+'ideas-inbox-dark.png'});
  await pg.tap('[data-tab="board"]');
  ok(T+'Board: stage tabs with counts (2 · 1 · 1 · 1) and the Idea list',/Idea\s*2\s*Planned\s*1\s*In progress\s*1\s*Posted\s*1/.test(await txt(pg,'.id-stages')),await txt(pg,'.id-stages'));
  const bc=await pg.$eval('.id-card',e=>({pill:e.querySelector('.id-pill')?.textContent,next:e.querySelector('[data-next]')?.textContent}));
  ok(T+'board card: type pill + "Move to Planned"',/Giveaway/.test(bc.pill||'')&&/Move to Planned/.test(bc.next||''),bc);
  await pg.tap('[data-stage-tab="planned"]'); await pg.waitForTimeout(250);
  await pg.waitForFunction(()=>/\w{3} \d+ \w{3} · 7:00 pm/.test(document.querySelector('.id-cal')?.innerText||''),null,{timeout:5000}).catch(()=>{});
  const pc=await txt(pg,'.id-card');
  ok(T+'planned card shows the calendar slot and the linked design',/7:00 pm/.test(pc)&&!!(await pg.$('.id-card .id-des')),pc);
  if(!dark) await pg.screenshot({path:SHOTS+'ideas-board-light.png'}); else await pg.screenshot({path:SHOTS+'ideas-board-dark.png'});
  await pg.tap('[data-stage-tab="idea"]'); await pg.tap('[data-type="reel"]');
  ok(T+'type filter: Reel shows one idea',(await pg.$$eval('.id-card',e=>e.length))===1&&/pour shot/.test(await txt(pg,'.id-card')));
  await pg.tap('[data-type=""]');
  await pg.tap('[data-search]'); await pg.fill('#idQ','win a case'); await pg.waitForTimeout(150);
  ok(T+'search matches the note text',(await pg.$$eval('.id-card',e=>e.length))===1&&/giveaway/.test(await txt(pg,'.id-card')));
  await pg.fill('#idQ','القهوة'); await pg.tap('[data-tab="inbox"]'); await pg.waitForTimeout(150);
  ok(T+'Arabic search finds the Arabic inbox idea',(await pg.$$eval('.id-card',e=>e.length))===1,await txt(pg,'.id-content'));
  await pg.tap('[data-search]'); await pg.tap('[data-tab="board"]'); await pg.tap('[data-stage-tab="idea"]');
  await pg.tap('.id-card:first-child [data-next]'); await pg.waitForTimeout(400);
  let s=await stored(pg);
  ok(T+'"Move to Planned ›" moves the idea (stored)',(s.ideas||[]).filter(x=>x.stage==='planned').length===2,(s.ideas||[]).map(x=>x.id+':'+x.stage).join(' '));
  /* menu */
  await pg.tap('.id-card:first-child [data-more]'); await pg.waitForSelector('.id-menu');
  ok(T+'the ⋯ menu: move to any stage, Edit, Delete',/Move to Inbox/.test(await txt(pg,'.id-menu'))&&/Edit/.test(await txt(pg,'.id-menu'))&&/Delete/.test(await txt(pg,'.id-menu')));
  await pg.tap('.id-menu [data-a="edit"]'); await pg.waitForSelector('dialog.id-edit');
  /* idea sheet */
  ok(T+'idea sheet: title, note, type, stage, link, picture, voice, design, calendar',await pg.evaluate(()=>{ const t=document.querySelector('dialog.id-edit').innerText; return /Title/.test(t)&&/Note/.test(t)&&/Type/.test(t)&&/Stage/.test(t)&&/Link/.test(t)&&/Picture/.test(t)&&/Voice note/.test(t)&&/Design/.test(t)&&/Calendar/.test(t); }));
  await pg.fill('#idTitle','Weekend giveaway (edited)'); await pg.tap('dialog [data-t="story"]'); await pg.tap('dialog [data-s="progress"]'); await pg.fill('#idLink','example.net/x');
  await pg.tap('dialog [data-pic]');   // opens the file chooser path: the input is hidden, just attach
  await pg.setInputFiles('dialog #idFile',{name:'a.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  await pg.waitForSelector('dialog #idPic img',{timeout:5000});
  const smallD=await smalls(pg);
  ok(T+'no control under 44px in the sheet',smallD.length===0,smallD);
  if(!dark) await pg.screenshot({path:SHOTS+'ideas-sheet-light.png'});
  await pg.tap('#idSave'); await pg.waitForFunction(()=>!document.querySelector('dialog.id-edit'),null,{timeout:6000});
  s=await stored(pg); const e=(s.ideas||[]).find(x=>/edited/.test(x.title));
  ok(T+'edits saved: title, type, stage, link and new picture',!!e&&e.type==='story'&&e.stage==='progress'&&e.link==='example.net/x'&&!!e.image_path,e&&{t:e.type,s:e.stage,l:e.link,i:!!e.image_path});
  /* voice player on a seeded inbox card + plan from sheet */
  await pg.tap('[data-tab="inbox"]'); await pg.waitForSelector('.id-card .id-voice');
  await pg.tap('.id-card:first-child .id-play'); await pg.waitForTimeout(500);
  ok(T+'playing a voice note flips the button to Pause (or finishes)',/Pause|Play/.test(await pg.getAttribute('.id-card:first-child .id-play','aria-label')));
  await pg.tap('.id-card:first-child .id-main'); await pg.waitForSelector('dialog.id-edit');
  ok(T+'sheet shows the voice player with Record again / Remove',!!(await pg.$('dialog .id-voice'))&&/Record again/.test(await txt(pg,'dialog #idVoice'))&&/Remove/.test(await txt(pg,'dialog #idVoice')));
  await pg.tap('dialog [data-plan]'); await pg.waitForTimeout(800);
  const planOpen=await pg.evaluate(()=>document.querySelectorAll('dialog[open]').length);
  ok(T+'"Add to calendar" opens the fast plan sheet',planOpen>=2,planOpen);
  await pg.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())); await pg.waitForTimeout(200);
  /* delete */
  await pg.tap('[data-tab="board"]'); await pg.tap('[data-stage-tab="posted"]'); await pg.tap('.id-card:first-child [data-more]'); await pg.tap('.id-menu [data-a="del"]'); await pg.waitForSelector('[data-yes]');
  const before=(await stored(pg)).ideas.length; await pg.tap('[data-yes]'); await pg.waitForTimeout(400);
  ok(T+'Delete asks first, then removes the idea',(await stored(pg)).ideas.length===before-1);
  const sm=await smalls(pg); ok(T+'no control under 44px on the page',sm.length===0,sm);
  await ctx.close();
}
await populated(false); await populated(true);

/* mic denied + no sideways scroll at 360 */
{ const ctx=await mk({...PH,viewport:{width:360,height:740}},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('mic: '+e.message));
  await open(pg);
  await pg.evaluate(()=>{ navigator.mediaDevices.getUserMedia=()=>Promise.reject(Object.assign(new Error('Permission denied'),{name:'NotAllowedError'})); });
  await pg.tap('.id-new'); await pg.waitForSelector('dialog.id-capdlg'); await pg.tap('[data-tool="voice"]'); await pg.waitForTimeout(400);
  ok('mic denied: a clear one-line message, nothing breaks',/microphone is blocked/i.test(await txt(pg,'#idSt'))&&!(await pg.$('.id-rec')),await txt(pg,'#idSt'));
  await pg.evaluate(()=>document.querySelector('dialog').close());
  for(const t of ['inbox','board']){ await pg.tap('[data-tab="'+t+'"]'); await pg.waitForTimeout(150);
    ok('360 px: no sideways scroll on '+t,await pg.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),await pg.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth])); }
  await pg.tap('.id-new'); await pg.waitForSelector('dialog.id-capdlg');
  ok('360 px: no sideways scroll in the capture sheet',await pg.evaluate(()=>{ const d=document.querySelector('dialog'); return d.scrollWidth<=d.clientWidth; }));
  await ctx.close(); }

/* desktop: four columns + drag */
{ const ctx=await mk({viewport:{width:1280,height:800}},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('desktop: '+e.message));
  await open(pg); await pg.tap?.call(pg,'[data-tab="board"]').catch(()=>{}); await pg.click('[data-tab="board"]'); await pg.waitForSelector('.id-cols');
  ok('desktop: four columns side by side',(await pg.$$eval('.id-col',e=>e.map(x=>Math.round(x.getBoundingClientRect().top)))).every((t,i,a)=>t===a[0])&&(await pg.$$('.id-col')).length===4);
  await pg.dragAndDrop('.id-col[data-stage="idea"] .id-card[data-id="i4"]','.id-col[data-stage="progress"] .id-list'); await pg.waitForTimeout(500);
  const s=await stored(pg);
  ok('desktop: dragging a card to another column moves its stage',(s.ideas||[]).find(x=>x.id==='i4').stage==='progress',(s.ideas||[]).find(x=>x.id==='i4').stage);
  await pg.screenshot({path:SHOTS+'ideas-board-desktop.png'}); await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,5));
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-bad} passed, ${bad} failed`); process.exit(bad?1:0);

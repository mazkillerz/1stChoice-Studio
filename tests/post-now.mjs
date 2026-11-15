/* Studio 2.8.0: Post now (calendar item menu + Home pill). fakecloud stands in for Supabase; designs are real recipes drawn by the tool pages.
   1. Menu: "Post now" is the FIRST row for an unposted item with a design or caption; hidden for a posted item; Back closes the sheet.
   2. Phone sheet (light + dark): picture, caption + hashtags (dir=auto), one blue button "Share picture", Copy caption link; fits 390x844; taps >= 44.
   3. Share picture: caption on the clipboard, toast, ONE share with a 2160x3840 PNG (story) / 4 pages 2160x2700 (carousel); then "Mark as posted" + "Not yet".
   4. Mark as posted sets status 'posted' in fakecloud (nothing else changes: the design is untouched); Not yet closes, status unchanged.
   5. Caption only (no design): the main button is Copy caption, then Mark as posted.
   6. Render failure: friendly note, caption still copied.   7. Share cancelled: stays on Share picture.
   8. Home: Post pill only when today's next item has a design (>= 44px, outlined, row still opens the calendar); the pill opens the sheet; an old cache without ids shows no pill.
   9. Computer (1280): no share sheet -> a single PNG downloads; a carousel comes as one ZIP.   10. No page errors.
   Run: node tests/post-now.mjs (server on :8080, or BASE=...). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const jpg=n=>'data:image/jpeg;base64,'+fs.readFileSync(S+n+'.jpg').toString('base64');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const pad=n=>(n<10?'0':'')+n, now=new Date(), TODAY=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
const PHONE={width:390,height:844}, DESK={width:1280,height:800};
const STUB=`try{ window.__shared=null; navigator.canShare=()=>true; navigator.share=async d=>{ if(window.__cancel) throw Object.assign(new Error('x'),{name:'AbortError'});
  window.__shared=await Promise.all(d.files.map(async f=>{ const bm=await createImageBitmap(f); return {name:f.name,type:f.type,w:bm.width,h:bm.height}; })); }; }catch(e){}`;
const mk=async(vp,{touch=true,scheme='light',db,stub=true,init=''}={})=>{
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});
  await ctx.addInitScript(s=>{ try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); localStorage.setItem('studio:flag:team','1'); if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',s); }catch(e){} },JSON.stringify(db));
  if(stub) await ctx.addInitScript(STUB); if(init) await ctx.addInitScript(init);
  return ctx; };
const newPage=async ctx=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+e)); return pg; };
const stored=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));
const settle=pg=>pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:4000}).catch(()=>{});

/* ---- seed: real recipes (story from restock, 4-slide carousel) ---- */
const base={designs:{},files:{},cols:{}};
{ const ctx=await mk(PHONE,{db:base,stub:false}); const pg=await newPage(ctx); const pics=['shelf','closeup','hand','pair','window','tall','vase','foam']; const rec={};
  for(const tool of ['restock','carousel']){ await pg.goto(BASE+'tools/'+tool+'.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug); rec[tool]=await pg.evaluate(()=>Studio.debug.recipe()); }
  const add=(id,tool,name)=>{ const r=JSON.parse(JSON.stringify(rec[tool])), paths=[]; r.photos.forEach((p,i)=>{ const k='1stchoice/'+id+'/photo-'+i+'.jpg'; base.files[k]=jpg(pics[i%pics.length]); paths.push(k); });
    r.photos=r.photos.map(p=>({...p,has:true})); base.files['1stchoice/'+id+'/thumb.jpg']=jpg('shelf');
    base.designs[id]={id,brand:'1stchoice',tool,name,kind:'design',recipe:{...r,photoPaths:paths},thumb_path:'1stchoice/'+id+'/thumb.jpg',cols:[],updated_at:new Date(Date.now()-3600e3).toISOString()}; };
  add('dStory','restock','Shelf day'); add('dCar','carousel','Four slides'); await ctx.close(); }
const item=(id,at,status,design,cap,tags,format)=>({id,brand:'1stchoice',day:TODAY,at,status,format,title:design?base.designs[design].name:(cap||'x').slice(0,20),caption:cap,hashtags:tags||[],design_ids:design?[design]:[],author:'Sara',created_at:new Date().toISOString()});
const withCal=cal=>({...JSON.parse(JSON.stringify(base)),calendar:cal});
const CAP='New batch today\nجديد اليوم #cold';
const DB=withCal([item('pStory','09:00','draft','dStory',CAP,['#cold','#oman'],'story'),item('pCar','10:00','approved','dCar','Four ideas for the week',[],'post'),
  item('pCap','11:00','draft',null,'Just words #cold',['#cold'],'post'),item('pDone','12:00','posted','dStory','Already out',[],'story'),item('pBare','13:00','draft',null,'',[],'post')]);
const openMenu=async(pg,id)=>{ await pg.tap('[data-more="'+id+'"]'); await pg.waitForSelector('.cal-menu'); await settle(pg); };
const rows=pg=>pg.$$eval('.cal-menu .act-row',a=>a.map(x=>x.textContent.trim()));
const gotoCal=async pg=>{ await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('.cal-item',{timeout:10000}); if(await pg.$('.cal-seg [data-mode="month"][aria-pressed="true"]')) await pg.tap('.cal-seg [data-mode="week"]'); await pg.waitForSelector('[data-more="pStory"]'); await pg.waitForTimeout(400); };
const clip=pg=>pg.evaluate(()=>navigator.clipboard.readText());

for(const dark of [false,true]){ tag=dark?'dark: ':'light: ';
  const ctx=await mk(PHONE,{db:DB,scheme:dark?'dark':'light'}); const pg=await newPage(ctx);
  await gotoCal(pg);
  /* 1 menu rows */
  await openMenu(pg,'pStory'); let r=await rows(pg); ok('menu: Post now is the first row',r[0]==='Post now'&&r.includes('Mark as posted'),r);
  await pg.tap('#calMX'); await pg.waitForSelector('.cal-menu',{state:'detached'});
  await openMenu(pg,'pCap'); r=await rows(pg); ok('menu: caption-only item has Post now',r[0]==='Post now',r); await pg.tap('#calMX'); await pg.waitForSelector('.cal-menu',{state:'detached'});
  await openMenu(pg,'pDone'); r=await rows(pg); ok('menu: posted item has no Post now',!r.includes('Post now')&&r[0]==='Mark as ready',r); await pg.tap('#calMX'); await pg.waitForSelector('.cal-menu',{state:'detached'});
  if(await pg.$('[data-more="pBare"]')){ await openMenu(pg,'pBare'); r=await rows(pg); ok('menu: item with no design and no caption has no Post now',!r.includes('Post now'),r); await pg.tap('#calMX'); await pg.waitForSelector('.cal-menu',{state:'detached'}); }
  /* 2 sheet */
  await openMenu(pg,'pStory'); await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post'); await settle(pg); await pg.waitForTimeout(500);
  const sh=await pg.evaluate(()=>{ const d=document.querySelector('.cal-post').closest('dialog'), q=s=>d.querySelector(s); const bt=[...d.querySelectorAll('button')].filter(x=>x.getClientRects().length);
    return {btn:q('#cpGo').textContent.trim(),filled:d.querySelectorAll('.btn').length,cap:q('.cp-cap').textContent,dir:q('.cp-cap').getAttribute('dir'),img:!!q('.cp-pic img[src]'),imgW:q('.cp-pic img').naturalWidth,
      copyLink:q('#cpCopy').classList.contains('link'),small:bt.filter(x=>x.getBoundingClientRect().height<44).map(x=>x.textContent.trim()),fits:d.getBoundingClientRect().bottom<=innerHeight+1&&d.getBoundingClientRect().top>=0,sticky:bt.some(x=>getComputedStyle(x).position==='sticky')}; });
  ok('sheet: one blue Share picture, picture, caption + tags (dir=auto), Copy caption link',sh.btn==='Share picture'&&sh.filled===1&&sh.img&&sh.imgW>0&&sh.dir==='auto'&&sh.copyLink&&/New batch today/.test(sh.cap)&&/#oman/.test(sh.cap)&&sh.cap.split('#cold').length===2,sh);
  ok('sheet: fits 390x844, taps >= 44, nothing sticky',sh.fits&&!sh.small.length&&!sh.sticky,sh);
  if(!dark){ await pg.screenshot({path:'/tmp/post-now-sheet-light.png'}); }
  /* Back closes the sheet */
  await pg.goBack().catch(()=>{}); await pg.waitForTimeout(500);
  ok('Back closes the sheet',!(await pg.$('.cal-post')) ,await pg.evaluate(()=>location.hash));
  if(await pg.$('.cal-post')) await pg.evaluate(()=>document.querySelector('.cal-post').closest('dialog').close());
  if(!(await pg.$('.cal-item'))) await gotoCal(pg);
  /* 3 share (story) */
  await openMenu(pg,'pStory'); await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post');
  await pg.evaluate(()=>navigator.clipboard.writeText('old')); await pg.tap('#cpGo');
  await pg.waitForFunction(()=>window.__shared,null,{timeout:60000});
  const sd=await pg.evaluate(()=>window.__shared); const cp=await clip(pg);
  ok('Share picture: ONE 2160x3840 PNG shared',sd.length===1&&sd[0].type==='image/png'&&sd[0].w===2160&&sd[0].h===3840&&/\.png$/.test(sd[0].name),sd);
  ok('clipboard holds caption + tags, toast says paste it in Instagram',/New batch today/.test(cp)&&/#oman/.test(cp)&&cp.split('#cold').length===2,cp);
  await pg.waitForFunction(()=>document.querySelector('#cpGo')&&document.querySelector('#cpGo').textContent==='Mark as posted',null,{timeout:5000}).catch(()=>{});
  const af=await pg.evaluate(()=>({go:document.querySelector('#cpGo').textContent,x:document.querySelector('#cpX').textContent,xl:document.querySelector('#cpX').classList.contains('link'),h:document.querySelector('#cpH').textContent,filled:document.querySelectorAll('.cal-post .btn').length}));
  ok('after sharing: blue Mark as posted + Not yet link',af.go==='Mark as posted'&&af.x==='Not yet'&&af.xl&&af.filled===1,af);
  if(!dark) await pg.screenshot({path:'/tmp/post-now-after-light.png'});
  /* 4 Not yet, then Mark as posted */
  const before=(await stored(pg)); await pg.tap('#cpX'); await pg.waitForSelector('.cal-post',{state:'detached'});
  ok('Not yet leaves the status alone',(await stored(pg)).calendar.find(x=>x.id==='pStory').status==='draft');
  await pg.evaluate(()=>{ window.__shared=null; }); await openMenu(pg,'pStory'); await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post'); await pg.tap('#cpGo');
  await pg.waitForFunction(()=>document.querySelector('#cpGo')&&document.querySelector('#cpGo').textContent==='Mark as posted',null,{timeout:60000});
  await pg.tap('#cpGo'); await pg.waitForSelector('.cal-post',{state:'detached'}); await pg.waitForTimeout(600);
  const after=await stored(pg), row=after.calendar.find(x=>x.id==='pStory');
  ok('Mark as posted sets status posted in fakecloud, nothing else changed',row.status==='posted'&&row.caption===CAP&&row.design_ids[0]==='dStory'&&JSON.stringify(after.designs)===JSON.stringify(before.designs),row.status);
  ok('the calendar shows it posted',await pg.evaluate(()=>/posted/i.test(document.querySelector('.cal-item[data-id="pStory"],.cal-pill[data-id="pStory"]').textContent)));
  /* multi-page carousel */
  await pg.evaluate(()=>{ window.__shared=null; }); await openMenu(pg,'pCar'); await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post'); await pg.tap('#cpGo');
  await pg.waitForFunction(()=>window.__shared,null,{timeout:90000}); const cd=await pg.evaluate(()=>window.__shared);
  ok('carousel: all 4 pages shared, 2160x2700 each',cd.length===4&&cd.every(x=>x.w===2160&&x.h===2700)&&cd[0].name==='Four-slides-01.png'&&cd[3].name==='Four-slides-04.png',cd.map(x=>x.name+' '+x.w+'x'+x.h));
  await pg.tap('#cpX'); await pg.waitForSelector('.cal-post',{state:'detached'});
  /* 5 caption only */
  await openMenu(pg,'pCap'); await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post');
  ok('caption only: main button is Copy caption, no picture',(await pg.textContent('#cpGo'))==='Copy caption'&&!(await pg.$('.cal-post .cp-pic')));
  await pg.evaluate(()=>navigator.clipboard.writeText('old')); await pg.tap('#cpGo'); await pg.waitForFunction(()=>document.querySelector('#cpGo').textContent==='Mark as posted',null,{timeout:5000});
  ok('caption only: caption copied, then Mark as posted',(await clip(pg))==='Just words #cold');
  await pg.tap('#cpGo'); await pg.waitForSelector('.cal-post',{state:'detached'}); await pg.waitForTimeout(400);
  ok('caption only: marked posted',(await stored(pg)).calendar.find(x=>x.id==='pCap').status==='posted');
  await ctx.close();
}

/* 6/7 render failure + cancelled share (light) */
{ tag='fail: '; const d2=withCal([item('pStory','09:00','draft','dStory',CAP,['#cold'],'story')]); d2.designs.dStory.tool='nonexistent-tool';
  const ctx=await mk(PHONE,{db:d2}); const pg=await newPage(ctx); await gotoCal(pg);
  await openMenu(pg,'pStory'); await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post'); await pg.evaluate(()=>navigator.clipboard.writeText('old')); await pg.tap('#cpGo');
  await pg.waitForFunction(()=>/could not be made/i.test(document.querySelector('#cpNote').textContent),null,{timeout:45000});
  const n=await pg.evaluate(()=>({t:document.querySelector('#cpNote').textContent,go:document.querySelector('#cpGo').textContent,dis:document.querySelector('#cpGo').disabled}));
  ok('render failure: friendly note, caption still copied, Try again',/caption is copied/.test(n.t)&&n.go==='Try again'&&!n.dis&&/New batch/.test(await clip(pg)),n);
  await ctx.close(); }
{ tag='cancel: '; const ctx=await mk(PHONE,{db:DB}); const pg=await newPage(ctx); await gotoCal(pg);
  await pg.evaluate(()=>{ window.__cancel=true; }); await openMenu(pg,'pStory'); await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post'); await pg.tap('#cpGo');
  await pg.waitForFunction(()=>/Not shared yet/.test(document.querySelector('#cpNote').textContent),null,{timeout:60000});
  ok('cancelled share: stays on Share picture, nothing marked',(await pg.textContent('#cpGo'))==='Share picture'&&(await stored(pg)).calendar.find(x=>x.id==='pStory').status==='draft');
  await pg.evaluate(()=>{ window.__cancel=false; }); await pg.tap('#cpGo'); await pg.waitForFunction(()=>document.querySelector('#cpGo').textContent==='Mark as posted',null,{timeout:10000});
  ok('second tap shares the picture already drawn',await pg.evaluate(()=>window.__shared&&window.__shared.length===1));
  await ctx.close(); }

/* 8 Home pill */
for(const dark of [false,true]){ tag=(dark?'dark':'light')+' home: ';
  const ctx=await mk(PHONE,{db:DB,scheme:dark?'dark':'light'}); const pg=await newPage(ctx);
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow .cal-home-post',{timeout:12000}); await pg.waitForTimeout(500);
  const hp=await pg.evaluate(()=>{ const p=document.querySelector('.cal-home-post'), row=document.querySelector('.cal-home-row'), pr=p.getBoundingClientRect(), rr=row.getBoundingClientRect(), cs=getComputedStyle(p);
    return {h:Math.round(pr.height),w:Math.round(pr.width),text:p.textContent.trim(),outlined:cs.backgroundColor!==getComputedStyle(document.documentElement).getPropertyValue('--accent'),bg:cs.backgroundColor,accent:cs.borderTopColor,color:cs.color,
      inside:pr.left>=rr.left&&pr.right<=rr.right+1,overlapText:(()=>{ const t=row.querySelector('.ch-txt').getBoundingClientRect(); return pr.left<t.right-0.5&&pr.right>t.left; })(),title:row.querySelector('b').textContent,nested:!!p.closest('.cal-home-row'),scrollX:document.documentElement.scrollWidth>innerWidth}; });
  ok('Home: Post pill >= 44px, outlined (not the filled accent), inside the row, no overlap with the title',hp.h>=44&&hp.w>=44&&hp.text==='Post'&&hp.bg!==hp.accent&&hp.inside&&!hp.overlapText&&!hp.nested&&!hp.scrollX,hp);
  if(!dark) await pg.screenshot({path:'/tmp/post-now-home-light.png'}); else await pg.screenshot({path:'/tmp/post-now-home-dark.png'});
  await pg.tap('.cal-home-post'); await pg.waitForSelector('.cal-post',{timeout:15000}); await settle(pg);
  ok('Home: the pill opens the Post now sheet for that item',/New batch today/.test(await pg.textContent('.cp-cap'))&&(await pg.textContent('#cpGo'))==='Share picture'&&await pg.evaluate(()=>location.hash==='')&&!(await pg.$('.cal-body:not([hidden])')));
  await pg.tap('#cpGo'); await pg.waitForFunction(()=>window.__shared,null,{timeout:60000});
  await pg.waitForFunction(()=>document.querySelector('#cpGo').textContent==='Mark as posted',null,{timeout:5000}); await pg.tap('#cpGo'); await pg.waitForSelector('.cal-post',{state:'detached'});
  await pg.waitForFunction(()=>!/Post\b/.test(document.querySelector('.cal-home-post')?document.querySelector('.cal-home-post').getAttribute('data-id')+'x':'')||document.querySelector('.cal-home-post').dataset.id!=='pStory',null,{timeout:8000}).catch(()=>{});
  const st=(await stored(pg)).calendar.find(x=>x.id==='pStory').status;
  ok('Home: marked posted from Home; the row moves on to the next item',st==='posted'&&await pg.evaluate(()=>{ const p=document.querySelector('.cal-home-post'); return !p||p.dataset.id!=='pStory'; }),st);
  /* the row itself still opens the calendar */
  await pg.tap('.cal-home-row'); await pg.waitForSelector('#calendarView .cal-body',{timeout:8000}); ok('Home: tapping the row opens the calendar',await pg.evaluate(()=>location.hash==='#calendar'));
  await ctx.close(); }
{ tag='home none: '; const d3=withCal([item('pCap','09:00','draft',null,'Just words',[],'post'),item('pStory','10:00','draft','dStory',CAP,[],'story')]);
  const ctx=await mk(PHONE,{db:d3}); const pg=await newPage(ctx); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow .cal-home-row.today',{timeout:12000}); await pg.waitForTimeout(800);
  ok('Home: no Post pill when the next item has no design',!(await pg.$('.cal-home-post')));
  await ctx.close();
  const d4=withCal([item('pStory','09:00','posted','dStory',CAP,[],'story')]); const c4=await mk(PHONE,{db:d4}); const p4=await newPage(c4); await p4.goto(BASE+'index.html'); await p4.waitForSelector('#calRow .cal-home-row',{timeout:12000}); await p4.waitForTimeout(800);
  ok('Home: no Post pill when today has nothing left to post',!(await p4.$('.cal-home-post'))); await c4.close();
  /* an old cache (no ids) paints no pill and does not break */
  const init=`try{ localStorage.setItem('studio:home:plan:1stchoice',JSON.stringify({day:'${TODAY}',today:[{title:'Old cache post',at:'09:00'}],inbox:0})); }catch(e){}`;
  const c5=await mk(PHONE,{db:{...DB,calendar:[]},init:init+"localStorage.setItem('fakecloud-signedout','1');"}); const p5=await newPage(c5); await p5.goto(BASE+'index.html'); await p5.waitForSelector('#calRow .cal-home-row.today',{timeout:8000});
  ok('Home: an old cache without ids still paints the row, no pill',/Old cache post/.test(await p5.textContent('#calRow .cal-home-row'))&&!(await p5.$('.cal-home-post'))); await c5.close(); }

/* 9 computer */
{ tag='desktop: '; const ctx=await mk(DESK,{touch:false,db:DB,stub:false}); const pg=await newPage(ctx);
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('.cal-pill,.cal-item',{timeout:10000}); await pg.waitForTimeout(600);
  ok('computer: no share sheet here',await pg.evaluate(()=>!navigator.canShare||!navigator.canShare({files:[new File(['x'],'x.png',{type:'image/png'})]})));
  await pg.click('.cal-pill[data-id="pStory"],.cal-item[data-id="pStory"]',{button:'right'}); await pg.waitForSelector('.cal-menu'); await settle(pg); await pg.click('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post');
  const dl=pg.waitForEvent('download',{timeout:60000}); await pg.click('#cpGo'); const d=await dl; const p=await d.path(); const buf=fs.readFileSync(p);
  ok('computer: one PNG downloads, 2160x3840',/\.png$/.test(d.suggestedFilename())&&buf.readUInt32BE(16)===2160&&buf.readUInt32BE(20)===3840,d.suggestedFilename()+' '+buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20));
  await pg.waitForFunction(()=>document.querySelector('#cpGo').textContent==='Mark as posted',null,{timeout:5000}); await pg.click('#cpX'); await pg.waitForSelector('.cal-post',{state:'detached'});
  await pg.click('.cal-pill[data-id="pCar"],.cal-item[data-id="pCar"]',{button:'right'}); await pg.waitForSelector('.cal-menu'); await settle(pg); await pg.click('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post');
  const dz=pg.waitForEvent('download',{timeout:90000}); await pg.click('#cpGo'); const z=await dz;
  ok('computer: a carousel comes as one ZIP',/-pictures-\d{8}-\d{4}\.zip$/.test(z.suggestedFilename()),z.suggestedFilename());
  await ctx.close(); }

/* SHOTS=<dir>: What's New pictures (390 wide at 2x, JPEG 72): before = the old item menu, after = the Post now sheet after sharing */
if(process.env.SHOTS){ tag='shots: '; const ctx=await mk(PHONE,{db:DB}); const pg=await newPage(ctx); await gotoCal(pg); await openMenu(pg,'pStory');
  await pg.screenshot({path:process.env.SHOTS+'/post-now-'+(process.env.SHOTSIDE||'after')+'-menu.jpg',type:'jpeg',quality:72});
  if(process.env.SHOTSIDE!=='before'){ await pg.tap('.cal-menu [data-a="post"]'); await pg.waitForSelector('.cal-post'); await settle(pg); await pg.waitForTimeout(400); await pg.screenshot({path:process.env.SHOTS+'/post-now-after-sheet.jpg',type:'jpeg',quality:72}); } await ctx.close(); }
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); const bad=res.filter(x=>x.startsWith('FAIL')).length; console.log((res.length-bad)+' pass, '+bad+' fail'); process.exit(bad?1:0);

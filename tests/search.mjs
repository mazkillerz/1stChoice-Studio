/* Studio 0.6.0: universal search at the top of the home page. Finds tools, templates, saved designs, collections,
   unfinished stories, settings and actions; recent searches + shortcuts before typing; Arabic with or without harakat.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
/* two saved designs and a team template (names are approved phrases from brand.js) */
const px='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const db=JSON.stringify({designs:{
  d1:{id:'d1',brand:'1stchoice',tool:'restock',name:'رجع متوفر',kind:'design',recipe:{},thumb_path:'t/d1.jpg',cols:[],updated_at:new Date().toISOString()},
  d2:{id:'d2',brand:'1stchoice',tool:'photo-story',name:'يسرسح ثلج',kind:'design',recipe:{},thumb_path:'t/d2.jpg',cols:[],updated_at:new Date().toISOString()},
  d3:{id:'d3',brand:'1stchoice',tool:'create',name:'تعرف ويش؟',kind:'template',recipe:{},thumb_path:'t/d3.jpg',cols:[],updated_at:new Date().toISOString()}},
  files:{'t/d1.jpg':px,'t/d2.jpg':px,'t/d3.jpg':px},cols:{}});
const b=await chromium.launch(); const errs=[];
for(const vp of [{name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true,touch:true},{name:'desktop',viewport:{width:1280,height:800}}]){
  const ctx=await b.newContext({viewport:vp.viewport,deviceScaleFactor:1,isMobile:!!vp.isMobile,hasTouch:!!vp.hasTouch,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  const N=vp.name+': ';
  const groups=()=>pg.$$eval('#usPanel .us-sec .us-h',h=>h.map(x=>x.textContent));
  const titles=k=>pg.$$eval(`#usPanel .us-sec[data-k="${k}"] .us-t`,t=>t.map(x=>x.textContent));
  const type=async q=>{ await pg.fill('#uq',q); await pg.waitForTimeout(250); };
  await pg.goto(BASE+'index.html'); await pg.evaluate(db=>{ localStorage.clear(); localStorage.setItem('fakecloud',db); },db); await pg.reload(); await pg.waitForTimeout(1500);
  /* at the top, visible at once; the old saved-designs search is gone */
  const f=await pg.$eval('#uq',e=>e.getBoundingClientRect()); const q0=await pg.$eval('#quickSec',e=>e.getBoundingClientRect().top);
  ok(N+'search is near the top, above everything else',f.top<260&&f.top<q0&&f.height>=44,JSON.stringify({top:f.top,h:f.height}));
  ok(N+'the old search at the bottom is gone',!(await pg.$('#q'))&&!(await pg.$('#qWrap')));
  /* before typing: shortcuts (no recent searches yet) */
  await tap('#uq'); await pg.waitForTimeout(300);
  ok(N+'focus opens the panel',await pg.isVisible('#usPanel'));
  if(vp.touch){ const r=await pg.$eval('#uSearch',e=>{ const b=e.getBoundingClientRect(); return {top:b.top,h:b.height,pos:getComputedStyle(e).position}; }); ok(N+'opens full screen',r.pos==='fixed'&&r.top===0&&r.h>=800,JSON.stringify(r)); ok(N+'Cancel shows',await pg.isVisible('#usCancel')); }
  const tiles=await pg.$$eval('#usPanel .us-tile .us-t',t=>t.map(x=>x.textContent));
  ok(N+'shortcuts before typing',tiles[0]==='Restock from a photo'&&tiles.includes('All tools')&&tiles.includes('Templates'),tiles.join(' | '));
  ok(N+'no recent searches yet',!(await pg.$('#usPanel [data-q]')));
  /* typing: grouped results */
  await type('restock');
  const g=await groups(); ok(N+'"restock" finds a tool and a template',g[0]==='Tools'&&g.includes('Templates'),g.join(' / '));
  ok(N+'Restock is the first tool',(await titles('tool'))[0]==='Restock');
  ok(N+'the match is highlighted',await pg.$eval('#usPanel .us-sec[data-k="tool"] .us-t',e=>e.innerHTML.includes('<mark>')));
  await type('رجع متوفّر');
  ok(N+'Arabic with harakat finds the saved design',(await titles('design')).includes('رجع متوفر'),(await titles('design')).join(','));
  await type('team template');
  ok(N+'team templates are found',(await titles('template')).includes('تعرف ويش؟'));
  await type('install');
  ok(N+'settings and actions are found',(await titles('action')).includes('Install Studio'));
  await type('zzzq');
  ok(N+'nothing found is friendly',/Nothing found/.test(await pg.textContent('#usPanel'))&&/like Restock/.test(await pg.textContent('#usPanel')));
  await type('photo');
  const hs=await pg.$$eval('#usPanel .us-row,#usPanel .us-star',l=>l.map(x=>x.getBoundingClientRect().height).filter(h=>h>0));
  ok(N+'every row and star is at least 44px',hs.length&&hs.every(h=>h>=44),Math.min(...hs)+'');
  /* a saved design opens its actions; the query is remembered */
  await type('ثلج'); await tap('#usPanel .us-sec[data-k="design"] .us-row'); await pg.waitForTimeout(700);
  ok(N+'a saved design opens its actions',await pg.isVisible('dialog[open] .design-sheet')&&/يسرسح ثلج/.test(await pg.textContent('dialog[open] h3')));
  ok(N+'the search closes',!(await pg.isVisible('#usPanel')));
  await pg.evaluate(()=>document.querySelector('dialog[open]').close()); await pg.waitForTimeout(300);
  await tap('#uq'); await pg.waitForTimeout(300);
  ok(N+'recent searches show the last search',(await pg.$$eval('#usPanel [data-q]',c=>c.map(x=>x.dataset.q))).join()==='ثلج');
  /* the star in results pins a tool to home */
  await type('collage'); await tap('#usPanel .us-sec[data-k="tool"] .us-star'); await pg.waitForTimeout(300);
  ok(N+'a star in the results pins the tool',await pg.getAttribute('#usPanel .us-sec[data-k="tool"] .us-star','aria-pressed')==='true');
  if(vp.touch) await tap('#usCancel'); else await pg.keyboard.press('Escape');
  await pg.waitForTimeout(500);
  ok(N+(vp.touch?'Cancel':'Escape')+' closes',!(await pg.isVisible('#usPanel')));
  ok(N+'the pinned tool is on the home page',(await pg.$$eval('#toolGrid a.tool-row',a=>a.map(x=>x.getAttribute('href')))).some(h=>/collage/.test(h)));
  /* an action: the fresh look switch */
  await tap('#uq'); await type('fresh look'); await tap('#usPanel .us-sec[data-k="action"] .us-row'); await pg.waitForTimeout(700);
  ok(N+'"fresh look" switches the preview on',await pg.evaluate(()=>document.documentElement.dataset.look)==='fresh');
  await tap('#uq'); await type('fresh look');
  ok(N+'and offers to switch it off',(await titles('action'))[0]==='Turn off the fresh look');
  await tap('#usPanel .us-sec[data-k="action"] .us-row'); await pg.waitForTimeout(700);
  ok(N+'switched off again',!(await pg.evaluate(()=>document.documentElement.dataset.look)));
  if(vp.touch){
    /* Android Back closes the search instead of leaving Studio */
    await tap('#uq'); await pg.waitForTimeout(300); await pg.goBack(); await pg.waitForTimeout(500);
    ok(N+'Back closes the search and stays on home',!(await pg.isVisible('#usPanel'))&&/index\.html/.test(pg.url()));
    /* the Restock shortcut takes a photo straight into the tool */
    await tap('#uq'); await pg.waitForTimeout(300);
    await Promise.all([pg.waitForURL(/restock\.html/,{timeout:8000}).catch(()=>{}),pg.setInputFiles('#usPanel input[data-quick="restock"]',S+'pair.jpg')]);
    await pg.waitForTimeout(2500);
    ok(N+'Restock from a photo opens Restock with the photo in',/restock\.html/.test(pg.url())&&await pg.isVisible('#readyBar'),pg.url());
  } else {
    /* keyboard: arrows + Enter open a tool */
    await pg.click('#uq'); await type('offer'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter');
    await pg.waitForURL(/offer\.html/,{timeout:8000}).catch(()=>{});
    ok(N+'arrow + Enter opens the result',/tools\/offer\.html/.test(pg.url()),pg.url());
    await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1000);
    const p=await pg.evaluate(()=>{ document.getElementById('uq').focus(); const a=document.getElementById('uq').getBoundingClientRect(), b=document.getElementById('usPanel').getBoundingClientRect(); return {gap:b.top-a.bottom,w:b.width}; });
    ok(N+'a dropdown card under the field',p.gap>=0&&p.gap<24&&p.w>=420,JSON.stringify(p));
    await pg.mouse.click(1200,700); await pg.waitForTimeout(300);
    ok(N+'a click outside closes it',!(await pg.isVisible('#usPanel')));
  }
  await ctx.close();
}
/* signed out: search offers Sign in instead of designs */
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake.replace('session:async()=>({user:me})','session:async()=>null')}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('signed out: '+e));
await pg.goto(BASE+'index.html'); await pg.evaluate(db=>{ localStorage.clear(); localStorage.setItem('fakecloud',db); },db); await pg.reload(); await pg.waitForTimeout(1200);
await pg.tap('#uq'); await pg.fill('#uq','saved'); await pg.waitForTimeout(250);
const acts=await pg.$$eval('#usPanel .us-sec[data-k="action"] .us-t',t=>t.map(x=>x.textContent));
ok('signed out: "saved" offers Sign in, and no designs',acts.includes('Sign in')&&!(await pg.$('#usPanel .us-sec[data-k="design"]')),acts.join(','));
await ctx.close();
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

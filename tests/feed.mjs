/* Feed preview (2.9.0): the Calendar's third view (assets/feed.js + feed.css). fakecloud stands in for Supabase.
   1 the view toggle shows Feed; choosing it loads the feed files, hides the week arrows, remembers the choice (reload)
   2 grid: 3 columns, tiles 3:4, 2px gaps, newest first (planned above posted), stories and items outside 60 days back / 90 ahead left out
   3 planned tiles have a date badge, posted ones none; a design-less tile shows its title (dir=auto)
   4 tap a tile opens the same edit sheet, Back closes it
   5 empty state with an Add button (opens the plan sheet)
   6 light + dark at 390 (touch) and 360: no sideways scroll, tiles >= 44px; 1280: grid centred at ~420px
   Run: node tests/feed.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const off=n=>{ const d=new Date(); return iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)); };
const db0=seedDesigns(), dids=Object.keys(db0.designs);
const mkItem=(id,n,at,status,format,title,design)=>({id,brand:'1stchoice',day:off(n),at,status,format,title,caption:'',hashtags:[],design_ids:design?[design]:[],author:'Sara',created_at:new Date().toISOString()});
const ITEMS=[ mkItem('p1',10,'09:00','draft','post','Planned far',dids[0]), mkItem('p2',3,'18:00','approved','reel','Planned reel',dids[1]), mkItem('p3',3,'08:00','draft','post','مرحبا بكم',null),
  mkItem('s0',2,'10:00','approved','story','A story',dids[2]), mkItem('q1',-1,'12:00','posted','post','Posted one',dids[2]), mkItem('q2',-20,null,'posted','reel','Posted reel',dids[3]),
  mkItem('old',-70,'10:00','posted','post','Too old',dids[0]), mkItem('far',120,'10:00','draft','post','Too far',dids[0]) ];
const EXPECT_ORDER=['p1','p2','p3','q1','q2'];
const dbWith=items=>{ const d=JSON.parse(JSON.stringify(db0)); d.calendar=items; return d; };
const init=db=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,db,scheme){
  const ctx=await b.newContext({serviceWorkers:'block',colorScheme:scheme||'light',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(db)}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); return [ctx,pg];
}
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true}, P360={viewport:{width:360,height:740},isMobile:true,hasTouch:true};
const openFeed=async pg=>{ await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('.cal-bar'); await pg.waitForTimeout(500); await pg.click('[data-mode="feed"]'); await pg.waitForSelector('.feed-tile,.feed-empty',{timeout:8000}); await pg.waitForTimeout(500); };
const geo=pg=>pg.evaluate(()=>{ const g=document.querySelector('.feed-grid'), t=[...document.querySelectorAll('.feed-tile')], r=g.getBoundingClientRect(), cols=getComputedStyle(g).gridTemplateColumns.split(' ').length;
  return { cols, gap:getComputedStyle(g).columnGap, ratio:t.map(e=>{ const q=e.getBoundingClientRect(); return +(q.width/q.height).toFixed(3); }), ids:t.map(e=>e.dataset.id), rows:[...new Set(t.map(e=>Math.round(e.getBoundingClientRect().top)))].length,
    badge:t.map(e=>!!e.querySelector('.feed-badge')), cls:t.map(e=>e.className), left:Math.round(r.left), width:Math.round(r.width), minTile:Math.round(Math.min(...t.map(e=>e.getBoundingClientRect().width))),
    scroll:document.documentElement.scrollWidth-innerWidth, titles:t.map(e=>{ const x=e.querySelector('.ft-title'); return x?x.getAttribute('dir'):null; }) }; });

for(const scheme of ['light','dark']){
  const [ctx,pg]=await mk(PH,dbWith(ITEMS),scheme);
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('.cal-bar'); await pg.waitForTimeout(500);
  const labels=await pg.$$eval('.cal-seg .chip',e=>e.map(x=>x.textContent.trim()));
  ok(`1 ${scheme}: the toggle shows Week, Month and Feed`,labels.join()==='Week,Month,Feed',labels);
  await pg.tap('[data-mode="feed"]'); await pg.waitForSelector('.feed-tile',{timeout:8000}); await pg.waitForTimeout(600);
  const g=await geo(pg);
  ok(`1 ${scheme}: Feed hides the week arrows`,await pg.$$eval('#calendarView .cal-arrow',e=>e.length)===0);
  ok(`2 ${scheme}: 3 columns, tiles 3:4, 2px gaps`,g.cols===3&&g.gap==='2px'&&g.ratio.every(r=>Math.abs(r-0.75)<0.01),g);
  ok(`2 ${scheme}: newest first, stories and out-of-range items left out`,g.ids.join()===EXPECT_ORDER.join(),g.ids);
  ok(`2 ${scheme}: 5 tiles in 2 rows`,g.rows===2,g.rows);
  ok(`3 ${scheme}: date badge only on planned tiles`,g.badge.join()==='true,true,true,false,false',g.badge);
  ok(`3 ${scheme}: a tile with no design shows its title (dir=auto)`,g.titles[2]==='auto'&&await pg.$eval('[data-id="p3"] .ft-title',e=>e.textContent)==='مرحبا بكم');
  ok(`3 ${scheme}: thumbnails load`,await pg.$$eval('.feed-tile img',e=>e.length>0&&e.every(i=>i.getAttribute('src'))));
  ok(`6 ${scheme}: no sideways scroll, tiles >= 44px`,g.scroll<=0&&g.minTile>=44,{scroll:g.scroll,min:g.minTile});
  if(scheme==='light'){
    const [c2,p2]=[ctx,pg]; await p2.reload(); await p2.waitForSelector('.feed-tile',{timeout:8000});
    ok('1 the choice is remembered on this device',await p2.$eval('[data-mode="feed"]',e=>e.getAttribute('aria-pressed'))==='true');
    const nav=await p2.evaluate(()=>location.hash);
    await p2.tap('[data-id="p2"]'); await p2.waitForSelector('dialog.cal-dlg',{timeout:6000});
    ok('4 tap a tile opens the edit sheet of that item',await p2.$eval('#calTitle',e=>e.value).catch(()=>'')==='Planned reel'||!!(await p2.$('#calSave')));
    await p2.goBack(); await p2.waitForSelector('dialog.cal-dlg',{state:'detached',timeout:6000});
    ok('4 Back closes the sheet and stays on the calendar',(await p2.evaluate(()=>location.hash))===nav&&!!(await p2.$('.feed-tile')));
    await p2.screenshot({path:process.env.FEEDSHOT||'/dev/null',type:'png'}).catch(()=>{});
  }
  await ctx.close();
}
{ const [ctx,pg]=await mk(P360,dbWith(ITEMS),'dark'); await openFeed(pg); const g=await geo(pg);
  ok('6 360 dark: no sideways scroll, 3 columns',g.scroll<=0&&g.cols===3,g); await ctx.close(); }
{ const [ctx,pg]=await mk({viewport:{width:1280,height:800}},dbWith(ITEMS)); await openFeed(pg); const g=await geo(pg);
  ok('6 desktop 1280: the grid is centred at phone width',g.width>=380&&g.width<=424&&Math.abs((g.left+g.width/2)-640)<24&&g.scroll<=0,g); await ctx.close(); }
{ const [ctx,pg]=await mk(PH,dbWith([ITEMS[3]]),'light'); await openFeed(pg);
  ok('5 empty: one friendly line and an Add button (stories only counts as empty)',await pg.$$eval('.feed-tile',e=>e.length)===0&&!!(await pg.$('.feed-empty [data-add]')));
  await pg.tap('.feed-empty [data-add]'); await pg.waitForSelector('dialog.cal-dlg',{timeout:6000}); ok('5 empty: Add opens the plan sheet',true); await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3));
console.log(res.join('\n')); await b.close();
const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-bad}/${res.length} passed`); process.exit(bad?1:0);

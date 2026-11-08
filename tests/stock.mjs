/* Live stock in Restock (preview flag "stock"): the feed is routed to tests/fixtures/stock/locations.json.
   Flag on: "Pick a sale point" sheet, search, tap -> place name + the flavours with stock are picked, Water ignored, no tagIconId anywhere;
   same-day cache = no second request, a day later = refresh; a feed without CORS / an aborted one -> a plain message, Restock still saves 2160x3840;
   flag off: no button, no request. 390 touch light + dark and 1280. Needs BASE. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import http from 'http';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const FIX=fs.readFileSync(new URL('fixtures/stock/locations.json',import.meta.url),'utf8');
const pins=JSON.parse(FIX).pins;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
/* a real server with no CORS header (route.fulfill skips CORS, so a real cross-origin response is the honest test) */
const srv=http.createServer((q,r)=>{ r.writeHead(200,{'content-type':'application/json'}); r.end(FIX); }); await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const NOCORS='http://127.0.0.1:'+srv.address().port+'/api';
const FEED=/location\.1stchoice\.cloud\/api\/public\/locations/;
async function mk(tag,opts,{flag=true,feed='ok',ctx0}={}){
  const ctx=ctx0||await b.newContext({serviceWorkers:'block',acceptDownloads:true,...opts});
  const state={reqs:0};
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(FEED,r=>{ state.reqs++; if(feed==='ok') r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:FIX}); else r.abort(); });
  if(feed==='nocors'){ const bj=fs.readFileSync(new URL('../brands/1stchoice/brand.js',import.meta.url),'utf8').replace('https://location.1stchoice.cloud/api/public/locations',NOCORS); await ctx.route(/brands\/1stchoice\/brand\.js/,r=>r.fulfill({contentType:'application/javascript',body:bj})); }
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message)); pg.dls=[]; pg.on('download',d=>pg.dls.push(d));
  await pg.addInitScript(([on])=>{ try{ localStorage.setItem('studio:welcome','seen'); if(on&&!sessionStorage.getItem('f')){ sessionStorage.setItem('f','1'); localStorage.setItem('studio:flag:stock','1'); localStorage.setItem('studio:1stchoice:restock',JSON.stringify({style:'cans'})); } }catch(_){} },[flag]);
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:15000});
  return {ctx,pg,state};
}
const words=async(pg,opts)=>{ if(await pg.isVisible('[data-open=words]')) await tap(pg,opts,'[data-open=words]'); };
const tap=(pg,opts,s)=>opts.hasTouch?pg.tap(s):pg.click(s);
async function run(tag,opts){
  const N=tag+': ';
  /* flag on, feed ok */
  let {ctx,pg,state}=await mk(tag,opts);
  await words(pg,opts); await pg.waitForSelector('#stockPick',{state:'visible'});
  const btn=await pg.evaluate(()=>{ const r=document.getElementById('stockPick').getBoundingClientRect(); return {h:Math.round(r.height),w:Math.round(r.width),t:document.getElementById('stockPick').textContent}; });
  ok(N+'"Pick a sale point" is there, at least 44px tall',btn.t==='Pick a sale point'&&btn.h>=44,btn);
  ok(N+'nothing was requested before the button was tapped',state.reqs===0,state.reqs);
  await tap(pg,opts,'#stockPick'); await pg.waitForSelector('.stock-row');
  const rows=await pg.evaluate(()=>[...document.querySelectorAll('.stock-row')].map(r=>({t:r.textContent,h:Math.round(r.getBoundingClientRect().height)})));
  ok(N+'one row per place, every row at least 44px',rows.length===pins.length&&rows.every(r=>r.h>=44),{n:rows.length,min:Math.min(...rows.map(r=>r.h))});
  const html=await pg.evaluate(()=>document.documentElement.outerHTML);
  ok(N+'no tagIconId and no icon id from the feed anywhere in the page',!/tagIconId|shopping-basket/.test(html)&&!pins.some(p=>(JSON.parse(JSON.stringify(p)).tagIconId)));
  ok(N+'Water is not shown',!/water/i.test(await pg.evaluate(()=>document.querySelector('.stock-list').textContent)));
  const full=await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1); ok(N+'no sideways scroll',full);
  /* search */
  const target=pins.find(p=>p.stockLines.some(l=>/passion/i.test(l.productName)&&l.quantityLeft>0)&&p.stockLines.some(l=>/classic/i.test(l.productName)&&l.quantityLeft>0))||pins[0];
  const word=target.label.split(/\s+/).find(w=>w.length>3)||target.label;
  await pg.fill('#stkQ',word.toUpperCase());
  const some=await pg.evaluate(()=>document.querySelectorAll('.stock-row').length); ok(N+'search narrows the list (case-insensitive)',some>=1&&some<pins.length,some);
  await pg.fill('#stkQ','zzzzqqq'); ok(N+'no match says so',(await pg.textContent('#stkN')).includes('No sale point'));
  await pg.fill('#stkQ',target.label);
  const want=l=>target.stockLines.filter(x=>new RegExp(l,'i').test(x.productName)).reduce((a,x)=>a+x.quantityLeft,0);
  await tap(pg,opts,'.stock-row');
  const after=await pg.evaluate(()=>({pick:document.getElementById('stockPick').textContent,note:document.getElementById('stockNote').textContent,picks:Studio.debug.S.values.flav.picks.slice()}));
  const exp=['classic','passion'].filter(f=>want(f)>0);
  ok(N+'the place name shows on the button and the flavours with stock are picked',after.pick===target.label&&JSON.stringify(after.picks)===JSON.stringify(exp),after);
  ok(N+'the counts show in the note, no tagIconId',after.note.includes(String(want('classic')))&&!/tagIcon/.test(after.note),after.note);
  const rec=await pg.evaluate(()=>JSON.stringify(Studio.debug.recipe())); ok(N+'no feed id or icon in the saved recipe',!/tagIconId|shopping-basket/.test(rec));
  /* a flavour with 0 left is not picked */
  const zero=pins.find(p=>p.stockLines.some(l=>/passion/i.test(l.productName)&&l.quantityLeft===0)&&p.stockLines.some(l=>/classic/i.test(l.productName)&&l.quantityLeft>0));
  if(zero){ await tap(pg,opts,'#stockPick'); await pg.waitForSelector('.stock-row'); await pg.fill('#stkQ',zero.label); await tap(pg,opts,'.stock-row');
    const p2=await pg.evaluate(()=>Studio.debug.S.values.flav.picks.slice()); ok(N+'a flavour with 0 left is not shown as back in stock',!p2.includes('passion')&&p2.includes('classic'),p2); }
  /* save */
  await pg.waitForTimeout(1500); await tap(pg,opts,(await pg.isVisible('#barSave'))?'#barSave':'#save'); for(let i=0;i<60&&!pg.dls.length;i++) await pg.waitForTimeout(300);
  const sz=pg.dls[0]?await (async()=>{ const x=fs.readFileSync(await pg.dls[0].path()); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); })():'';
  ok(N+'Restock saves 2160x3840',sz==='2160x3840',sz);
  /* same-day cache: reload, no second request; the sheet still lists the places */
  const before=state.reqs; await pg.reload(); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S); await words(pg,opts); await tap(pg,opts,'#stockPick'); await pg.waitForSelector('.stock-row');
  ok(N+'a same-day cache is used on reload (no second request)',state.reqs===before&&before===1,{before,now:state.reqs});
  await pg.keyboard.press('Escape');
  /* next day: cache from yesterday refreshes */
  await pg.evaluate(()=>{ const k='studio:stock:1stchoice', c=JSON.parse(localStorage.getItem(k)); c.day='2000-1-1'; localStorage.setItem(k,JSON.stringify(c)); });
  await pg.reload(); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S); await words(pg,opts); await tap(pg,opts,'#stockPick'); await pg.waitForSelector('.stock-row');
  ok(N+'the next day it refreshes',state.reqs===before+1,state.reqs);
  await ctx.close();
  /* no CORS header */
  for(const feed of ['nocors','abort']){
    ({ctx,pg,state}=await mk(tag,opts,{feed}));
    await words(pg,opts); await tap(pg,opts,'#stockPick'); await pg.waitForFunction(()=>{ const n=document.getElementById('stkN'); return n&&n.textContent&&n.textContent!=='Loading…'; });
    const m=await pg.textContent('#stkN');
    ok(N+feed+': a plain message',m==='The stock site doesn’t let Studio read it yet.',m);
    await pg.click('#stkX'); await pg.waitForTimeout(300);
    await tap(pg,opts,(await pg.isVisible('#barSave'))?'#barSave':'#save'); for(let i=0;i<60&&!pg.dls.length;i++) await pg.waitForTimeout(300);
    const s2=pg.dls[0]?await (async()=>{ const x=fs.readFileSync(await pg.dls[0].path()); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); })():'';
    ok(N+feed+': Restock still saves 2160x3840 by hand',s2==='2160x3840',s2);
    await ctx.close();
  }
  /* offline note */
  ({ctx,pg,state}=await mk(tag,opts)); await pg.addScriptTag({url:BASE+'assets/stock.js'}); await ctx.setOffline(true); await words(pg,opts); await tap(pg,opts,'#stockPick');
  await pg.waitForFunction(()=>{ const n=document.getElementById('stkN'); return n&&n.textContent&&n.textContent!=='Loading…'; });
  const off=await pg.textContent('#stkN'); ok(N+'offline: the usual offline note, no request',/offline/i.test(off)&&state.reqs===0,off); await ctx.close();
  /* flag off */
  ({ctx,pg,state}=await mk(tag,opts,{flag:false})); await words(pg,opts); await pg.waitForTimeout(500);
  ok(N+'flag off: no button and no request',!(await pg.$('#stockPick'))&&state.reqs===0,state.reqs); await ctx.close();
}
await run('phone light',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'});
await run('phone dark',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark'});
await run('desktop',{viewport:{width:1280,height:800},colorScheme:'light'});
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); srv.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

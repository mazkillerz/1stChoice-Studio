/* Extra checks: HEIC photos, swapping photos by dragging, Saved collection chips + tool menu.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname, HEIC=new URL('fixtures/sample.heic',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
// HEIC
await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForTimeout(900);
await pg.setInputFiles('#pick',[HEIC]);
const got=await pg.waitForFunction(()=>{ const p=Studio.debug.S.photos[0]; return p.img&&!p.sample?[p.img.width,p.img.height]:false; },null,{timeout:30000}).then(h=>h.jsonValue()).catch(()=>null);
ok('HEIC photo opens at full size',got&&got[0]===972&&got[1]===1728,got&&got.join('x'));
const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:30000}),(async()=>{ await pg.tap('#barSave'); await pg.waitForTimeout(400); await pg.tap('#save'); })()]);
const f=await dl.path(); const buf=fs.readFileSync(f); ok('HEIC story saves full-size PNG',buf.readUInt32BE(16)===2160&&buf.readUInt32BE(20)===3840);
// swap photos (Split): hold + drag top onto bottom
await pg.goto(BASE+'tools/split.html'); await pg.waitForTimeout(900);
await pg.setInputFiles('#pick',[S+'pair.jpg',S+'hand.jpg']); await pg.waitForTimeout(1200);
const keys=()=>pg.evaluate(()=>Studio.debug.S.photos.slice(0,2).map(p=>p.key));
const bx=await pg.evaluate(()=>Studio.debug.reg().filter(b=>b.photo!=null).map(b=>({x:b.x+b.w/2,y:b.y+b.h/2})));
const v=await pg.locator('#view').boundingBox(), k=v.width/1080, k0=await keys();
await pg.mouse.move(v.x+bx[0].x*k,v.y+bx[0].y*k); await pg.mouse.down(); await pg.waitForTimeout(500); await pg.mouse.move(v.x+bx[1].x*k,v.y+bx[1].y*k,{steps:10}); await pg.mouse.up(); await pg.waitForTimeout(400);
const k1=await keys(); ok('hold + drag swaps photos',k1[0]===k0[1]&&k1[1]===k0[0]);
// Saved: only collections as chips, tools in the menu
for(const [t,n,col] of [['new-place','Shop A',''],['restock','Restock Oct','Ramadan']]){ await pg.goto(BASE+'tools/'+t+'.html'); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(500);
  await pg.tap('#barSave'); await pg.waitForTimeout(400); await pg.evaluate(()=>document.getElementById('teamOn').click()); await pg.fill('#teamName',n);
  if(col){ await pg.tap('#teamMore'); await pg.waitForTimeout(400); await pg.fill('#teamNewCol',col); await pg.tap('#teamAddCol'); }
  await pg.tap('#teamOnly'); await pg.waitForTimeout(1500); }
await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1800);
const chips=await pg.$$eval('#colChips .chip',cs=>cs.map(c=>c.textContent.replace(/\s+\d+$/,'').trim()));
ok('chips are only collections',JSON.stringify(chips)==='["All","Ramadan"]',chips.join(', '));
await pg.selectOption('#toolFilter','restock'); await pg.waitForTimeout(300);
const names=await pg.$$eval('#savedGrid .dtxt b',bs=>bs.map(b=>b.textContent)); ok('tool menu filters',JSON.stringify(names)==='["Restock Oct"]',names.join(', '));
ok('no page errors',!errs.length,errs.slice(0,2).join(' | '));
console.log(res.join('\n')); await b.close();
process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);

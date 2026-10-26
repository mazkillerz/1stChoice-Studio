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
await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000});   // 0.7.0: the bar opens the Save sheet, Save in it saves
const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:30000}),pg.tap('#save')]);
const f=await dl.path(); const buf=fs.readFileSync(f); ok('HEIC story saves full-size PNG',buf.readUInt32BE(16)===2160&&buf.readUInt32BE(20)===3840);
// swap photos (Split): hold + drag top onto bottom
await pg.goto(BASE+'tools/split.html'); await pg.waitForTimeout(900);
await pg.setInputFiles('#pick',[S+'pair.jpg',S+'hand.jpg']); await pg.waitForTimeout(1200);
const keys=()=>pg.evaluate(()=>Studio.debug.S.photos.slice(0,2).map(p=>p.key));
const bx=await pg.evaluate(()=>Studio.debug.reg().filter(b=>b.photo!=null).map(b=>({x:b.x+b.w/2,y:b.y+b.h/2})));
const v=await pg.locator('#view').boundingBox(), k=v.width/1080, k0=await keys();
await pg.mouse.move(v.x+bx[0].x*k,v.y+bx[0].y*k); await pg.mouse.down(); await pg.waitForTimeout(500); await pg.mouse.move(v.x+bx[1].x*k,v.y+bx[1].y*k,{steps:10}); await pg.mouse.up(); await pg.waitForTimeout(400);
const k1=await keys(); ok('hold + drag swaps photos',k1[0]===k0[1]&&k1[1]===k0[0]);
// Saved: collections as chips (new collection typed in the Save sheet), the page filters by them
for(const [t,n,col] of [['new-place','Shop A',''],['restock','Restock Oct','Ramadan']]){ await pg.goto(BASE+'tools/'+t+'.html'); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(500);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000});   // opens the Save sheet (team switch is on when signed in)
  await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}); await pg.fill('#teamName',n);
  if(col){ await pg.waitForSelector('#teamCols [data-newcol]'); await pg.tap('#teamCols [data-newcol]'); await pg.waitForTimeout(300); await pg.fill('#teamNewCol',col); await pg.tap('#teamAddCol'); }
  await pg.tap('#save'); await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('teamStatus').textContent),null,{timeout:30000}); }
await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:8000}); await pg.waitForTimeout(500);
const chips=await pg.$$eval('#colChips .chip',cs=>cs.map(c=>c.textContent.replace(/\s+\d+$/,'').trim()));
ok('chips are All + collections',JSON.stringify(chips)==='["All","Ramadan"]',chips.join(', '));
const all2=await pg.$$eval('#savedGrid .sv-txt b',bs=>bs.map(b=>b.textContent).sort());
ok('both designs are listed before filtering',JSON.stringify(all2)==='["Restock Oct","Shop A"]',all2.join(', '));
await pg.tap('#colChips .chip[data-f="c:Ramadan"]'); await pg.waitForTimeout(300);
const names=await pg.$$eval('#savedGrid .sv-txt b',bs=>bs.map(b=>b.textContent)); ok('collection chip filters',JSON.stringify(names)==='["Restock Oct"]',names.join(', '));
await pg.tap('#colChips .chip[data-f="c:Ramadan"]'); await pg.waitForTimeout(300);
ok('tapping the chip again shows everything',await pg.$$eval('#savedGrid .sv-card',c=>c.length)===2);
// tapping outside: a pop-up closes, a busy one doesn't; an empty spot closes the open panel
await pg.tap('#savedGrid .sv-more'); await pg.waitForSelector('dialog[open] .design-sheet'); await pg.waitForTimeout(400);
await pg.mouse.click(10,10); await pg.waitForTimeout(400); ok('tap outside closes a pop-up',!(await pg.locator('dialog[open]').count()));
await pg.goto(BASE+'tools/carousel.html'); await pg.waitForTimeout(1200); await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
await pg.tap('[data-pg="add"]'); await pg.waitForTimeout(400); await pg.evaluate(()=>document.querySelectorAll('dialog[open] button').forEach(b=>b.disabled=true));
await pg.mouse.click(10,10); await pg.waitForTimeout(300); ok('a busy pop-up stays open',await pg.locator('dialog[open]').count()===1);
await pg.evaluate(()=>document.querySelector('dialog[open]').close()); await pg.waitForTimeout(200);
await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(450);
const st=await pg.locator('#stage').boundingBox(); await pg.touchscreen.tap(st.x+6,st.y+st.height/2); await pg.waitForTimeout(450);
ok('tap beside the preview closes the panel',!(await pg.evaluate(()=>document.querySelector('.sheet.open'))));
// rotation: buttons + saved with the design
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1000);
const vv=await pg.locator('#view').boundingBox(), kk=vv.width/1080; const hb=await pg.evaluate(()=>{ const b=Studio.debug.reg().find(x=>x.id==='head'); return {x:b.cx,y:b.cy}; });
await pg.touchscreen.tap(vv.x+hb.x*kk,vv.y+hb.y*kk); await pg.waitForTimeout(400); await pg.tap('.itab[data-part="move"]'); await pg.waitForTimeout(500);
await pg.tap('[data-rot="15"]'); await pg.waitForTimeout(200); ok('rotate +15°',await pg.evaluate(()=>Studio.debug.S.layers.head.rot)===15);
ok('recipe keeps rotation',await pg.evaluate(()=>Studio.debug.recipe().layers.head.rot)===15);
ok('no page errors',!errs.length,errs.slice(0,2).join(' | '));
console.log(res.join('\n')); await b.close();
process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);

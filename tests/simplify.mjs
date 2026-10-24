/* Studio 0.5.0 checks (Simplify session): on a phone the bar's Save makes the full-size PNG in one tap;
   the sheet then offers "Add to the team" (no second picture); an edit after saving makes the next Save a new picture.
   The hub lists tools in groups, most used first, with two view choices. Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/supabase\.co/,r=>r.abort());
await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:toolsView','"compact"'); }); await pg.reload(); await pg.waitForTimeout(800);
/* hub */
const order=await pg.$$eval('#toolGrid a',as=>as.map(a=>a.getAttribute('href').replace(/^.*tools\/|\.html$/g,'')));
ok('hub: Restock is the first tool',order[0]==='restock',order.join(','));
ok('hub: every tool is still listed',order.length===10&&['create','new-place','photo-story','cinematic','collage','split','restock','offer','carousel','highlight'].every(t=>order.includes(t)));
const groups=await pg.$$eval('#toolGrid .tgroup',h=>h.map(x=>x.textContent));
ok('hub: tools are grouped',groups.length===3,groups.join(' / '));
ok('hub: two view choices',await pg.$$eval('[data-view="tools"] button',bs=>bs.length)===2);
ok('hub: an old "compact" choice shows as grid',await pg.$eval('#toolGrid',g=>g.classList.contains('view-grid')));
/* one-tap save */
await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(900);
await pg.setInputFiles('#pick',[S+'pair.jpg']); await pg.waitForTimeout(1200);
const dls=[]; pg.on('download',d=>dls.push(d));
await pg.tap('#barSave');
for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
await pg.waitForSelector('#doneBox',{state:'visible',timeout:8000}).catch(()=>{});
let size=''; if(dls[0]){ const f=os.tmpdir()+'/simp-'+dls[0].suggestedFilename(); await dls[0].saveAs(f); size=pngSize(f); }
ok('one tap on Save makes the full-size PNG',dls.length===1&&size==='2160x3840',dls.length+' · '+size);
ok('the Save sheet is open with the result',await pg.isVisible('#sh-save')&&await pg.isVisible('#doneBox'));
ok('after saving: "Save to Photos" row and team-only link are hidden',!(await pg.isVisible('#photosRow'))&&!(await pg.isVisible('#teamOnly')));
ok('after saving: the button says Save again',/Save again/.test(await pg.textContent('#saveTxt')),await pg.textContent('#saveTxt'));
await pg.evaluate(()=>document.getElementById('teamOn').click());
ok('team switch on: the button says Add to the team',/Add to the team/.test(await pg.textContent('#saveTxt')),await pg.textContent('#saveTxt'));
await pg.fill('#teamName','Restock test'); await pg.tap('#save');
await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
ok('Add to the team saves the design',/design=/.test(await pg.evaluate(()=>location.search)));
await pg.waitForTimeout(800);
ok('Add to the team does not make a second picture',dls.length===1,String(dls.length));
ok('team status says it was saved',/Saved to the team/.test(await pg.textContent('#teamStatus')||''));
/* an edit after saving: the next Save makes a new picture */
await pg.evaluate(()=>document.getElementById('teamOn').click());
await pg.tap('#sh-save .done, #sh-save [data-close]').catch(()=>{}); await pg.waitForTimeout(400);
await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(400);
const inp=pg.locator('#sh-words input[type="text"]:visible, #sh-words textarea:visible').first(); const was=await inp.inputValue(); await inp.fill(was+' '); await pg.waitForTimeout(300); await inp.fill(was);
await pg.waitForTimeout(900);
await pg.tap('#barSave');
for(let i=0;i<60&&dls.length<2;i++) await pg.waitForTimeout(300);
ok('Save after an edit makes a new picture',dls.length===2,String(dls.length));
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(f?f+' FAILED':'ALL '+res.length+' PASSED'); process.exit(f?1:0);

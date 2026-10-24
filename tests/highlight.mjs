/* Highlight covers: a set of round covers, one per page. Phone, touch. */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SAMPLES=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
const out=[]; const ok=(n,c,i)=>out.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':''));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
await pg.goto(BASE+'tools/highlight.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
ok('starts with 4 covers',await pg.evaluate(()=>Studio.debug.S.P.length)===4);
ok('each cover gets its own icon',new Set(await pg.evaluate(()=>Studio.debug.S.P.map(p=>p.values.icon))).size===4);
ok('pager says cover',await pg.getAttribute('[data-pg="add"]','aria-label')==='Add a cover');
await pg.tap('[data-pg="add"]'); await pg.waitForTimeout(400);
ok('+ adds a cover straight away',await pg.evaluate(()=>Studio.debug.S.P.length)===5);
// cover 2: a word
await pg.tap('[data-pg="1"]'); await pg.waitForTimeout(300);
await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(400);
await pg.tap('[data-seg="kind"] [data-v="word"]'); await pg.waitForTimeout(200);
await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(400);
await pg.fill('[data-text="word"]','منعش'); await pg.waitForTimeout(300);
ok('word cover',await pg.evaluate(()=>Studio.debug.S.P[1].values.kind==='word'&&Studio.debug.S.P[1].values.word.text==='منعش'));
// cover 3: pick a different icon; cover 4: a photo
await pg.tap('[data-pg="2"]'); await pg.waitForTimeout(300);
await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(400);
await pg.tap('[data-seg="icon"] [data-v="coffee"]'); await pg.waitForTimeout(200);
ok('icon picked',await pg.evaluate(()=>Studio.debug.S.P[2].values.icon)==='coffee');
const tapSize=await pg.$eval('[data-seg="icon"] .seg',e=>{const r=e.getBoundingClientRect(); return Math.min(r.width,r.height);});
ok('icon buttons ≥ 48px',tapSize>=48,Math.round(tapSize)+'px');
await pg.tap('[data-pg="3"]'); await pg.waitForTimeout(300);
await pg.tap('[data-seg="kind"] [data-v="photo"]'); await pg.waitForTimeout(200);
await pg.setInputFiles('#pick',[SAMPLES+'pair.jpg']); await pg.waitForTimeout(800);
ok('photo cover has its photo',await pg.evaluate(()=>!!Studio.debug.S.photos[3].img&&!Studio.debug.S.photos[3].sample));
ok('look is shared by every cover',await pg.evaluate(()=>{ const P=Studio.debug.S.P; return P.every(p=>p.values.shape===P[0].values.shape); }));
// save: one PNG per cover at 2×
const dls=[]; pg.on('download',d=>dls.push(d));
await pg.tap('#barSave');   // one tap saves
for(let i=0;i<60&&dls.length<5;i++) await pg.waitForTimeout(300);
const sizes=[]; for(const d of dls){ const f=os.tmpdir()+'/hl-'+d.suggestedFilename(); await d.saveAs(f); sizes.push(pngSize(f)); }
ok('saves 5 full-size PNGs',dls.length===5&&sizes.every(s=>s==='2160x3840'),sizes.join(', '));
await pg.waitForSelector('#doneBox',{state:'visible',timeout:5000}).catch(()=>{});
ok('success message names covers',/covers/.test(await pg.textContent('#doneBox')||''),(await pg.textContent('#doneBox')||'').trim().slice(0,80));
// team save + reopen
const before=await pg.evaluate(()=>{ const r=Studio.debug.recipe(); delete r.page; return JSON.stringify(r); });
if(!(await pg.isChecked('#teamOn'))) await pg.evaluate(()=>document.getElementById('teamOn').click()); await pg.fill('#teamName','Test covers'); await pg.tap('#save');
await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
const id=await pg.evaluate(()=>new URLSearchParams(location.search).get('design'));
const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push('reopen: '+e));
await p2.goto(BASE+'tools/highlight.html?design='+id); await p2.waitForTimeout(2500);
const after=await p2.evaluate(()=>{ const r=Studio.debug.recipe(); delete r.page; return JSON.stringify(r); });
ok('saved set reopens the same',!!id&&before===after,id||'no id');
// hub lists the tool
const p3=await ctx.newPage(); await p3.goto(BASE+'index.html'); await p3.waitForTimeout(1200);
await p3.click('#allTools'); await p3.waitForTimeout(300);
ok('All tools lists Highlight covers',await p3.$('.lib-row a[href$="tools/highlight.html"]')!==null);
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
console.log(out.join('\n')); await b.close(); process.exit(out.some(l=>l.startsWith('FAIL'))?1:0);

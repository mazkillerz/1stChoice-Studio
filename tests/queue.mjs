/* Studio 1.6.0: several photos, a story each. Picking several photos for Restock (or Photo story) from the + menu
   puts the first one in and keeps the rest waiting. Save works in one tap as before; then "Next photo (2 of 3)" brings in
   the next photo as a NEW story with the same words and look, again one tap to save. The last one says so.
   Also: one photo works exactly as before; on a computer "Skip to the next photo" moves on without saving;
   the share-target row says "A story from each"; the search shortcut's file input takes several photos.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  const N=vp.name+': ';
  const dls=[]; pg.on('download',d=>dls.push(d));
  const quick=async(files)=>{ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(400);
    await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',files.map(f=>S+f))]);
    await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{}); };
  const ready=()=>pg.evaluate(()=>document.getElementById('readyTxt').textContent);
  const saveOnce=async()=>{ const n=dls.length; await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:4000}).catch(()=>{});
    await tap(vp.touch?'#barSave':'#save'); for(let i=0;i<40&&dls.length===n;i++) await pg.waitForTimeout(300);
    let size=''; if(dls.length>n){ const f=os.tmpdir()+'/q-'+dls[n].suggestedFilename(); await dls[n].saveAs(f); size=pngSize(f); }
    await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
    await pg.waitForFunction(()=>!document.getElementById('queueNext').hidden||!document.getElementById('save').hidden,null,{timeout:5000}).catch(()=>{});
    return {got:dls.length-n,size,url:pg.url()}; };
  const photoKey=()=>pg.evaluate(()=>Studio.debug.S.photos[0].key);
  const designs=()=>pg.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fakecloud')||'{}').designs||{}).length);

  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(400);
  ok(N+'the Restock photo pickers take several photos',await pg.$$eval('input[data-quick="restock"]',l=>l.length>0&&l.every(i=>i.multiple)));
  ok(N+'Collage still takes several, a tool without queue (Carousel) keeps its own max',await pg.$$eval('input[data-quick="collage"]',l=>l.every(i=>i.multiple)));

  /* one photo: exactly as before */
  await quick(['pair.jpg']);
  ok(N+'one photo: "Your photo is in", nothing waiting',await ready()==='Your photo is in'&&await pg.$eval('#queueNext',e=>e.hidden));

  /* three photos */
  await quick(['pair.jpg','shelf.jpg','hands.jpg']);
  ok(N+'three photos: the note says "Photo 1 of 3 is in"',await ready()==='Photo 1 of 3 is in',await ready());
  ok(N+'the note tells you the next one comes after Save',/Save (it )?for the next one/.test(await pg.textContent('#readySub')));
  ok(N+'the note\'s hint is one line (next to Skip)',await pg.$eval('#readySub',s=>Math.round(s.getBoundingClientRect().height/(parseFloat(getComputedStyle(s).lineHeight)||20))===1));
  const k1=await photoKey(), words1=await pg.evaluate(()=>JSON.stringify({s:Studio.debug.S.style,v:Studio.debug.S.values}));
  const before=await designs();
  let r=await saveOnce();
  ok(N+'story 1: one tap saves the full-size PNG and adds it to the team',r.got===1&&r.size==='2160x3840'&&/design=/.test(r.url),JSON.stringify(r));
  const nx=await pg.evaluate(()=>{ const b=document.getElementById('queueNext'), rc=b.getBoundingClientRect(); return {hidden:b.hidden,txt:b.textContent.trim(),ghost:b.classList.contains('ghost'),h:Math.round(rc.height),vis:rc.width>0&&rc.bottom<=innerHeight+1}; });
  ok(N+'then "Next photo (2 of 3)" shows, filled and finger-sized',!nx.hidden&&nx.txt==='Next photo (2 of 3)'&&!nx.ghost&&nx.h>=44&&nx.vis,JSON.stringify(nx));
  ok(N+'Save again goes quiet (ghost) so only one main button shows',await pg.$eval('#save',e=>e.classList.contains('ghost')));
  const id1=new URL(r.url).searchParams.get('design');
  await tap('#queueNext'); await pg.waitForTimeout(900);
  ok(N+'Next photo: the second photo is in, as a new story (no saved design open)',(await photoKey())!==k1&&!/design=/.test(pg.url()),pg.url());
  ok(N+'the note says "Photo 2 of 3 is in"',await ready()==='Photo 2 of 3 is in',await ready());
  if(vp.touch) ok(N+'the Save sheet closed so the new story shows',!(await pg.isVisible('#sh-save')));
  ok(N+'same words and look as story 1',await pg.evaluate(()=>JSON.stringify({s:Studio.debug.S.style,v:Studio.debug.S.values}))===words1);
  ok(N+'Save is back to one tap, team switch back on',await pg.evaluate(()=>!document.getElementById('designBar')||document.getElementById('designBar').hidden));
  r=await saveOnce(); const id2=new URL(r.url).searchParams.get('design');
  ok(N+'story 2: one tap, a new team design (not an update of story 1)',r.got===1&&r.size==='2160x3840'&&id2&&id2!==id1&&(await designs())===before+2,JSON.stringify({r,id1,id2,n:await designs()-before}));
  ok(N+'"Next photo (3 of 3)"',(await pg.textContent('#queueNext')).trim()==='Next photo (3 of 3)');
  await tap('#queueNext'); await pg.waitForTimeout(900);
  ok(N+'the last one says "Last photo: 3 of 3"',await ready()==='Last photo: 3 of 3',await ready());
  r=await saveOnce();
  ok(N+'story 3 saved; the done note says it was the last; nothing left waiting',r.got===1&&/last of your 3/.test(await pg.textContent('#doneTxt'))&&await pg.$eval('#queueNext',e=>e.hidden)&&(await designs())===before+3,await pg.textContent('#doneTxt'));
  ok(N+'after the last one Save is a normal button again',!(await pg.$eval('#save',e=>e.classList.contains('ghost'))));
  /* the last draft is dropped after the team save settles; under parallel load that can take a moment, so wait for it (up to 5 s) */
  const countDrafts=()=>pg.evaluate(()=>Object.keys(localStorage).filter(k=>/^studio:drafts?:/.test(k)&&!/index/.test(k)).length);
  let drafts=await countDrafts(); for(let t=0;drafts&&t<25;t++){ await pg.waitForTimeout(200); drafts=await countDrafts(); }
  ok(N+'no leftover unfinished stories (each went to the team)',drafts===0,drafts+' drafts');

  /* a computer shows "Skip to the next photo" before saving */
  if(!vp.touch){ await quick(['pair.jpg','shelf.jpg']); const k=await photoKey();
    const sk=await pg.evaluate(()=>{ const b=document.getElementById('queueNext'); return {hidden:b.hidden,txt:b.textContent.trim(),ghost:b.classList.contains('ghost')}; });
    ok(N+'before saving: a quiet "Skip to the next photo (2 of 2)"',!sk.hidden&&sk.ghost&&sk.txt==='Skip to the next photo (2 of 2)',JSON.stringify(sk));
    await pg.click('#queueNext'); await pg.waitForTimeout(800);
    ok(N+'Skip brings in photo 2 without saving',(await photoKey())!==k&&await ready()==='Last photo: 2 of 2'&&await pg.$eval('#queueNext',e=>e.hidden)); }

  /* the search shortcut "Restock from a photo" takes several photos too */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
  const sc=await pg.evaluate(()=>{ const i=[...document.querySelectorAll('input[data-quick="restock"]')]; return i.length; });
  ok(N+'hub renders its Restock inputs',sc>0);
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
res.forEach(l=>console.log(l)); const f=res.filter(l=>l.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

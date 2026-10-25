/* Studio 0.3.0 / 0.7.1 checks: after Quick start a small "Your photo is in" card (#readyBar, role=status) shows over the preview;
   before any edit Save saves the full-size PNG in ONE tap (phone: the bar's Save, computer: the Save card's Save) and, signed in, to the team too.
   The card fades by itself (~3.2 s), hides at once on a tap on the photo or on it, on a swipe down, on another bar tab and on editing.
   After an edit the bar's Save opens the Save sheet as usual. A normal visit never shows the card. Also: the text-place pad cells are thumb-sized on a phone.
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
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:2,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  /* Quick start: pick a photo on home -> Restock opens with the card showing. Returns as soon as the card is up (it only lives ~3.2 s) */
  const quick=async()=>{ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
    await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]);
    await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{}); };
  const gone=async(ms=700)=>{ await pg.waitForTimeout(ms); return !(await pg.isVisible('#readyBar')); };
  const swipeDown=async(dy)=>{ const bb=await pg.locator('#readyBar').boundingBox(), x=bb.x+bb.width/2, y=bb.y+bb.height/2, loc=pg.locator('#readyBar');
    const init={bubbles:true,cancelable:true,composed:true,pointerType:vp.touch?'touch':'mouse',pointerId:1,isPrimary:true,button:0,buttons:1,clientX:x,clientY:y};
    await loc.dispatchEvent('pointerdown',init);
    if(dy) { await loc.dispatchEvent('pointermove',{...init,clientY:y+dy/2}); await loc.dispatchEvent('pointermove',{...init,clientY:y+dy}); }
    await loc.dispatchEvent('pointerup',{...init,buttons:0,clientY:y+dy}); };
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  await quick();
  const N=vp.name+': ';
  ok(N+'the ready card shows after Quick start',await pg.isVisible('#readyBar'));
  const info=await pg.$eval('#readyBar',e=>{ const b=e.getBoundingClientRect(), ph=document.getElementById('phone').getBoundingClientRect(), cy=(b.top+b.bottom)/2; return {role:e.getAttribute('role'),cls:e.className,txt:document.getElementById('readyTxt').textContent,sub:document.getElementById('readySub').textContent,
    fits:b.left>=0&&b.right<=innerWidth+1&&b.top>=0&&b.bottom<=innerHeight, overPreview:cy>=ph.top&&cy<=ph.bottom&&b.left>=ph.left-1&&b.right<=ph.right+1, h:Math.round(b.height), card:[b.top,b.bottom].map(Math.round).join('-'), preview:[ph.top,ph.bottom].map(Math.round).join('-'), vh:innerHeight}; });
  ok(N+'it is a small status card: "Your photo is in" + a Save hint',info.role==='status'&&/ready-pop/.test(info.cls)&&info.txt==='Your photo is in'&&(vp.touch?/Tap Save/:/Save it/).test(info.sub)&&info.h<120,JSON.stringify(info));
  ok(N+'the card is on screen (not below the fold)',info.fits,JSON.stringify({card:info.card,viewportH:info.vh}));
  ok(N+'the card sits over the bottom of the preview',info.overPreview,JSON.stringify({card:info.card,preview:info.preview}));
  ok(N+'the old Looks good / Change words buttons are gone',!(await pg.$('#readySave'))&&!(await pg.$('#readyEdit')));
  if(vp.touch){ ok(N+'Save on the bar gets a soft nudge while the card shows',await pg.$eval('#barSave',e=>e.classList.contains('nudge')));
    const sv=await pg.$eval('#barSave',e=>{ const b=e.getBoundingClientRect(); return {h:b.height,fits:b.right<=innerWidth+1&&b.bottom<=innerHeight}; });
    ok(N+'Save on the bar is finger-sized and on screen',sv.h>=44&&sv.fits,JSON.stringify(sv)); }
  const dls=[]; pg.on('download',d=>dls.push(d));
  await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:4000}).catch(()=>{});   // the quiet "is this phone on the team" check (about a second after the page opens) has finished
  await tap(vp.touch?'#barSave':'#save');
  for(let i=0;i<40&&!dls.length;i++) await pg.waitForTimeout(300);
  let size=''; if(dls[0]){ const f=os.tmpdir()+'/qs-'+dls[0].suggestedFilename(); await dls[0].saveAs(f); size=pngSize(f); }
  ok(N+'one '+(vp.touch?'tap on the bar\'s Save':'click on Save')+' saves the full-size PNG',dls.length===1&&size==='2160x3840',size);
  await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
  ok(N+'the same tap also saves it to the team (signed in)',/design=/.test(pg.url())&&/Saved to the team/.test(await pg.textContent('#teamStatus')||''),pg.url());
  if(!vp.touch) await pg.waitForFunction(()=>document.getElementById('readyBar').hidden,null,{timeout:4500}).catch(()=>{});   // computer: Save does not hide it, the timer does
  ok(N+'the card is gone after saving',!(await pg.isVisible('#readyBar')));
  /* it fades by itself */
  await quick(); const t0=Date.now();
  await pg.waitForFunction(()=>{ const r=document.getElementById('readyBar'); return r.hidden||getComputedStyle(r).display==='none'; },null,{timeout:6000}).catch(()=>{});
  const dt=Date.now()-t0;
  ok(N+'the card hides by itself (within ~4.5 s)',!(await pg.isVisible('#readyBar'))&&dt<=4500,dt+' ms');
  /* a tap on the photo hides it at once */
  await quick(); const t1=Date.now();
  await (vp.touch?pg.tap('#phone',{position:{x:50,y:50}}):pg.click('#phone',{position:{x:50,y:50}}));
  ok(N+'a tap on the preview hides the card at once (before the timer)',await gone(600)&&Date.now()-t1<2500,(Date.now()-t1)+' ms');
  /* a tap on the card itself */
  await quick(); const t2=Date.now(); await swipeDown(0);
  ok(N+'a tap on the card hides it at once',await gone(600)&&Date.now()-t2<2500);
  /* a swipe down on the card */
  await quick(); const t3=Date.now(); await swipeDown(60);
  ok(N+'a swipe down on the card hides it at once',await gone(600)&&Date.now()-t3<2500,(Date.now()-t3)+' ms');
  /* another tab / editing */
  await quick();
  if(vp.touch){ await tap('#bar [data-open="style"]'); await pg.waitForTimeout(500); ok(N+'another bar tab hides the card',!(await pg.isVisible('#readyBar'))); }
  else { await pg.evaluate(()=>{ const i=document.querySelector('#sh-words input,#sh-words textarea'); i.dispatchEvent(new Event('input',{bubbles:true})); }); ok(N+'editing hides the card',await gone(500)); }
  /* after an edit the bar's Save opens the Save sheet (phone); Save in it saves */
  if(vp.touch){
    await quick(); await tap('#bar [data-open="words"]'); await pg.waitForTimeout(500);
    await pg.locator('#sh-words input[type="text"]:visible').last().fill('Test button'); await pg.waitForTimeout(700);
    const n0=dls.length; await tap('#barSave'); await pg.waitForTimeout(700);
    ok(N+'after an edit, Save on the bar opens the Save sheet',await pg.$eval('#sh-save',e=>e.classList.contains('open')));
    ok(N+'...and does not save by itself',dls.length===n0);
    await tap('#save');
    for(let i=0;i<40&&dls.length===n0;i++) await pg.waitForTimeout(300);
    let size2=''; if(dls[n0]){ const f=os.tmpdir()+'/qs2-'+dls[n0].suggestedFilename(); await dls[n0].saveAs(f); size2=pngSize(f); }
    ok(N+'Save in the sheet saves the full-size PNG',dls.length===n0+1&&size2==='2160x3840',size2);
  }
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500);
  ok(vp.name+': a normal visit has no ready card',!(await pg.isVisible('#readyBar')));
  if(vp.touch){ await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForTimeout(1500);
    await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
    await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500);
    const w=await pg.$$eval('.place-pick .pp',l=>l.map(x=>x.getBoundingClientRect()).filter(b=>b.width).map(b=>Math.min(b.width,b.height)));
    ok('phone: text-place cells are at least 44px',w.length===9&&w.every(x=>x>=44),w.map(Math.round).join(','));
  }
  await ctx.close();
}
/* Save tapped at once, while the quiet "is this phone on the team" check is still running (slow network): the picture is made
   straight away and the design still goes to the team as soon as the answer comes back (0.7.1) */
{ const slow=fake.replace('isMember:async()=>true','isMember:()=>new Promise(r=>setTimeout(()=>r(true),4000))');
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:slow}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('slow: '+e)); const dls=[]; pg.on('download',d=>dls.push(d));
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500);
  await Promise.all([pg.waitForURL(/restock\.html/),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]);
  await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{});
  const before=await pg.evaluate(()=>document.getElementById('teamOn').checked);
  await pg.tap('#barSave');
  for(let i=0;i<40&&!dls.length;i++) await pg.waitForTimeout(300);
  await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
  ok('phone (slow sign-in check): Save tapped at once still makes the picture and adds it to the team',!before&&dls.length===1&&/design=/.test(pg.url()),{switchOnAtTap:before,downloads:dls.length,url:pg.url()});
  await ctx.close(); }
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

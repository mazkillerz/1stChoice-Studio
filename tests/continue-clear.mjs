/* Studio 1.32.0 (#41): after Save pictures in Continue editing, the Saved! dialog offers "Remove these N from Continue editing".
   One confirm, never by itself, and only the stories whose pictures were saved (a Create draft is skipped, so never offered).
   1. Phone 390x844 touch (share sheet stubbed): 2 Restock drafts + 1 Create draft → Saved! → the offer reads "Remove these 2 …";
      drafts untouched until you act; the offer is a 48px blue text button (no underline, contrast >= 4.5), at most one filled
      accent button in the dialog; tap it → the dialog asks "Remove these 2 stories …?" with Keep them + Remove (red).
   2. Keep them → nothing removed (3 drafts, 3 cards).   3. Again → Remove → the 2 Restock drafts are gone, the Create one stays,
      Continue editing shows 1 card, a toast says "2 stories removed".   4. Share cancelled ("Ready!") → no offer.
   5. A draft edited after its picture was made is kept ("Nothing removed").   6. Only a Create draft → "Nothing saved", no offer.
   7. Computer 1280x800: 1 draft → a single PNG → "Remove it from Continue editing" → "Remove this story …?" → Remove →
      Continue editing hides.   8. Dark phone: offer contrast >= 4.5.   9. No page errors.
   Run: server on :8080 (or BASE=...), then node tests/continue-clear.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const PHONE={width:390,height:844}, DESK={width:1280,height:800};
/* share: 'ok' = the share sheet completes, 'cancel' = it is closed (AbortError) */
const mk=async(vp,{touch=true,scheme='light',share='ok'}={})=>{
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); }catch(e){}`+(touch?`navigator.canShare=()=>true; navigator.share=async()=>{ ${share==='cancel'?"throw new DOMException('no','AbortError');":''} };`:'')});
  return ctx; };
const newPage=async ctx=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+e)); return pg; };
const drafts=pg=>pg.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('studio:draft:')).sort());
async function makeDraft(ctx){
  const pg=await newPage(ctx); const t=s=>pg.$eval(s,e=>e.click());
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug);
  await t('#styles [data-style="photo"]'); await pg.waitForTimeout(900); await t('#styles [data-style="cans"]');
  await pg.waitForFunction(()=>Studio.debug.draftId(),null,{timeout:8000}); await pg.waitForTimeout(1500); await pg.close(); }
const addCreate=pg=>pg.evaluate(()=>localStorage.setItem('studio:draft:1stchoice:create:zz1',JSON.stringify({board:'x',at:Date.now()})));
const home=async pg=>{ await pg.goto(BASE+'index.html'); await pg.waitForFunction(()=>window.Studio); await pg.waitForTimeout(1200); };
const waitH=(pg,re,ms=120000)=>pg.waitForFunction(r=>new RegExp(r).test((document.getElementById('bsH')||{}).textContent||''),re.source,{timeout:ms});
const vis=(pg,s)=>pg.evaluate(s=>{ const e=document.querySelector(s); return !!e&&!e.hidden&&e.getClientRects().length>0; },s);
const txt=async(pg,s)=>((await pg.textContent(s))||'').trim();
const cards=pg=>pg.$$eval('#continueList .ccard[data-draft]',c=>c.length);
const contrast=pg=>pg.evaluate(()=>{ const cv=document.createElement('canvas').getContext('2d');
  const rgb=s=>{ cv.clearRect(0,0,1,1); cv.fillStyle='#000'; cv.fillStyle=s; cv.fillRect(0,0,1,1); const d=cv.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const o=document.getElementById('bsOffer'); let el=o, bg=[0,0,0,0]; while(el){ bg=rgb(getComputedStyle(el).backgroundColor); if(bg[3]>0.9) break; el=el.parentElement; }
  const fg=rgb(getComputedStyle(o).color), L=a=>{ const f=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(a[0])+0.7152*f(a[1])+0.0722*f(a[2]); };
  const a=L(fg), c=L(bg); return Math.round((Math.max(a,c)+0.05)/(Math.min(a,c)+0.05)*100)/100; });

/* ===== 1-3: phone, 2 Restock drafts + 1 Create draft ===== */
tag='phone: ';
{ const ctx=await mk(PHONE); await makeDraft(ctx); await makeDraft(ctx);
  const pg=await newPage(ctx); await pg.goto(BASE+'index.html'); await addCreate(pg); await home(pg);
  const d0=await drafts(pg); ok('3 drafts, 3 cards',d0.length===3&&await cards(pg)===3,d0);
  await pg.tap('#contSave'); await waitH(pg,/Saved!/);
  await pg.waitForTimeout(500);
  ok('the offer is shown',await vis(pg,'#bsOffer'));
  ok('it counts only the 2 saved stories (the Create one was skipped)',await txt(pg,'#bsOffer')==='Remove these 2 from Continue editing',await txt(pg,'#bsOffer'));
  ok('never automatic: all 3 drafts still there',JSON.stringify(await drafts(pg))===JSON.stringify(d0));
  const g=await pg.$eval('#bsOffer',e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return {h:r.height,u:cs.textDecorationLine,in:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,bg:cs.backgroundColor}; });
  ok('48px tall, no underline, on screen, no fill',g.h>=48&&!/underline/.test(g.u)&&g.in&&/rgba\(0, 0, 0, 0\)|transparent/.test(g.bg),g);
  ok('text contrast >= 4.5',await contrast(pg)>=4.5,await contrast(pg));
  const filled=()=>pg.$$eval('dialog[open] button.btn',l=>l.filter(e=>!e.hidden&&e.getClientRects().length&&!/danger|ghost/.test(e.className)).length);
  ok('one filled accent button (Done)',await filled()<=1,await filled());
  await pg.tap('#bsOffer'); await pg.waitForTimeout(300);
  ok('tap → asks to confirm',await txt(pg,'#bsH')==='Remove these 2 stories from Continue editing?',await txt(pg,'#bsH'));
  ok('…saying the pictures are saved and the photos go from this phone',/Their pictures are saved.*deleted from this phone/.test(await txt(pg,'#bsNote')),await txt(pg,'#bsNote'));
  ok('…with Keep them and a red Remove',await txt(pg,'#bsCancel')==='Keep them'&&await txt(pg,'#bsGo')==='Remove'&&await pg.$eval('#bsGo',e=>e.classList.contains('danger'))&&await vis(pg,'#bsGo'));
  ok('the offer button hides while asking',!(await vis(pg,'#bsOffer')));
  ok('still nothing removed while asking',(await drafts(pg)).length===3);
  /* 2: Keep them */
  await pg.tap('#bsCancel'); await pg.waitForTimeout(400);
  ok('Keep them closes the dialog',!(await pg.$('dialog.bs[open]')));
  ok('Keep them removes nothing (3 drafts, 3 cards)',(await drafts(pg)).length===3&&await cards(pg)===3);
  /* 3: again, Remove */
  await pg.tap('#contSave'); await waitH(pg,/Saved!/); await pg.waitForTimeout(400);
  await pg.tap('#bsOffer'); await pg.waitForTimeout(250); await pg.tap('#bsGo'); await pg.waitForTimeout(600);
  const d1=await drafts(pg);
  ok('Remove deletes the 2 Restock drafts, keeps the Create one',d1.length===1&&/create:zz1$/.test(d1[0]),d1);
  ok('Continue editing shows 1 card',await cards(pg)===1);
  ok('a toast says "2 stories removed"',await pg.evaluate(()=>[...document.querySelectorAll('.toast,[role=status]')].some(e=>/2 stories removed from Continue editing/.test(e.textContent))));
  await home(pg); ok('after a reload: still 1 card',await cards(pg)===1);
  ok('no render frame left',await pg.$$eval('iframe.render-frame',l=>l.length)===0);
  await ctx.close(); }

/* ===== 4: share closed → "Ready!", no offer ===== */
tag='share closed: ';
{ const ctx=await mk(PHONE,{share:'cancel'}); await makeDraft(ctx); const pg=await newPage(ctx); await home(pg);
  await pg.tap('#contSave'); await waitH(pg,/Ready!/); await pg.waitForTimeout(400);
  ok('"Ready!" (not saved yet): no offer',!(await vis(pg,'#bsOffer')),await txt(pg,'#bsH'));
  await ctx.close(); }

/* ===== 5: a draft edited after its picture was made is kept ===== */
tag='edited since: ';
{ const ctx=await mk(PHONE); await makeDraft(ctx); const pg=await newPage(ctx); await home(pg);
  await pg.tap('#contSave'); await waitH(pg,/Saved!/); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const k=Object.keys(localStorage).find(k=>k.startsWith('studio:draft:')); const v=JSON.parse(localStorage.getItem(k)); v.at=v.at+5000; localStorage.setItem(k,JSON.stringify(v)); });
  await pg.tap('#bsOffer'); await pg.waitForTimeout(250);
  ok('one story: "Remove this story …?" and Keep it',await txt(pg,'#bsH')==='Remove this story from Continue editing?'&&await txt(pg,'#bsCancel')==='Keep it',await txt(pg,'#bsH'));
  await pg.tap('#bsGo'); await pg.waitForTimeout(600);
  ok('the edited draft is kept',(await drafts(pg)).length===1&&await cards(pg)===1);
  ok('the toast says nothing was removed',await pg.evaluate(()=>[...document.querySelectorAll('.toast,[role=status]')].some(e=>/Nothing removed/.test(e.textContent))));
  await ctx.close(); }

/* ===== 6: only a Create draft → nothing saved, no offer ===== */
tag='only Create: ';
{ const ctx=await mk(PHONE); const pg=await newPage(ctx); await pg.goto(BASE+'index.html'); await addCreate(pg); await home(pg);
  await pg.tap('#contSave'); await waitH(pg,/Nothing saved/,30000); await pg.waitForTimeout(300);
  ok('"Nothing saved", no offer',!(await vis(pg,'#bsOffer')));
  ok('the Create draft stays',(await drafts(pg)).length===1);
  await ctx.close(); }

/* ===== 7: computer, one draft ===== */
tag='desktop: ';
{ const ctx=await mk(DESK,{touch:false}); await makeDraft(ctx); const pg=await newPage(ctx); await home(pg);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:120000}),pg.click('#contSave')]);
  ok('a single PNG',/\.png$/i.test(dl.suggestedFilename()),dl.suggestedFilename());
  await waitH(pg,/Saved!/,20000); await pg.waitForTimeout(300);
  ok('"Remove it from Continue editing"',await txt(pg,'#bsOffer')==='Remove it from Continue editing',await txt(pg,'#bsOffer'));
  await pg.click('#bsOffer'); await pg.waitForTimeout(250);
  ok('asks "Remove this story …?", says "this device"',await txt(pg,'#bsH')==='Remove this story from Continue editing?'&&/deleted from this device/.test(await txt(pg,'#bsNote')),await txt(pg,'#bsNote'));
  await pg.click('#bsGo'); await pg.waitForTimeout(600);
  ok('removed: no drafts, Continue editing hidden',(await drafts(pg)).length===0&&!(await vis(pg,'#continueSec')));
  await ctx.close(); }

/* ===== 8: dark phone ===== */
tag='phone dark: ';
{ const ctx=await mk(PHONE,{scheme:'dark'}); await makeDraft(ctx); const pg=await newPage(ctx); await home(pg);
  await pg.tap('#contSave'); await waitH(pg,/Saved!/); await pg.waitForTimeout(400);
  ok('offer visible, contrast >= 4.5',await vis(pg,'#bsOffer')&&await contrast(pg)>=4.5,await contrast(pg));
  ok('no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await ctx.close(); }

tag='';
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`continue-clear: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);

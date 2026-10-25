/* Studio 1.3.0: Peek a saved design, and a shared photo that waits on Home.
   Peek
   - a design's menu (press and hold / right-click / ⋯) has its picture as a button "See it big"; tapping it opens Peek, full screen
   - Peek shows the name, tool, "n of N" for the cards on that page, and Open links to that design
   - swipe left = next design, swipe right = previous (phone); arrows and ← → keys on a computer; no arrow past the ends
   - More closes Peek and opens the design's menu for the design shown; ✕ and Escape close it; the page behind does not scroll
   - Peek fits the screen at 390×844 and 1280×800, in light and dark; controls are at least 44px
   Shared photo waiting
   - a shared photo left in IndexedDB ('studio:shared') shows a row on Home: "Your photo is in" (one line) with Pick and ✕
   - Pick opens the pick-a-tool sheet; closing it without a choice brings the row back
   - ✕ forgets the photo (IndexedDB empty, row gone); nothing shows when there is no shared photo
   Saved designs come from tests/seed.js; the team is tests/fakecloud.js. Server on :8080 (or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SEED=seedDesigns();
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const PHONE={name:'phone',width:390,height:844,touch:true}, DESK={name:'desktop',width:1280,height:800,touch:false};
const mk=async(vp,scheme='light')=>{
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.touch?2:1,isMobile:vp.touch,hasTouch:vp.touch,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(SEED)});
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(_){} });
  return ctx; };
const peekState=pg=>pg.evaluate(()=>{ const d=document.querySelector('dialog.peek-dlg[open]'); if(!d) return null; const r=d.getBoundingClientRect(), q=s=>d.querySelector(s);
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).opacity!=='0'&&!e.disabled;
  return {name:q('.pk-name').textContent,sub:q('.pk-sub').textContent,href:q('[data-pk="open"]').getAttribute('href'),src:!!q('.pk-img').getAttribute('src'),
    fits:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,imgIn:(()=>{ const i=q('.pk-img').getBoundingClientRect(); return i.top>=r.top-1&&i.bottom<=q('.pk-info').getBoundingClientRect().top+1&&i.height>200; })(),
    prev:vis(q('.prev')),next:vis(q('.next')),small:[...d.querySelectorAll('button,a')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).opacity!=='0').map(e=>[e.className,Math.round(e.getBoundingClientRect().height),Math.round(e.getBoundingClientRect().width)]).filter(x=>x[1]<44||x[2]<44),
    fg:getComputedStyle(q('.pk-name')).color,bg:getComputedStyle(d).backgroundColor,scroll:scrollY}; });
/* names of the cards on the Saved page, in order */
const order=pg=>pg.$$eval('#savedGrid .sv-card[data-id]',cs=>cs.map(c=>c.dataset.id));
const nameOf=id=>(SEED.designs[id]||{}).name;
const swipe=async(pg,dx)=>{ const box=await pg.$eval('dialog.peek-dlg .pk-stage',e=>{ const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
  await pg.evaluate(({x,y,dx})=>{ const st=document.querySelector('dialog.peek-dlg .pk-stage'), ev=(t,X)=>st.dispatchEvent(new PointerEvent(t,{clientX:X,clientY:y,bubbles:true,pointerType:'touch',isPrimary:true}));
    ev('pointerdown',x); ev('pointermove',x+dx/2); ev('pointermove',x+dx); ev('pointerup',x+dx); },{...box,dx}); await pg.waitForTimeout(350); };

for(const [vp,scheme] of [[PHONE,'light'],[PHONE,'dark'],[DESK,'light']]){
  const N=vp.name+'/'+scheme+': ', tap=(pg,s)=>vp.touch?pg.tap(s):pg.click(s);
  const ctx=await mk(vp,scheme); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1400);
  const ids=await order(pg); ok(N+'Saved shows the seeded designs',ids.length>=3,ids.length);
  const y0=await pg.evaluate(()=>scrollY);
  /* the design's menu → its picture */
  await pg.dispatchEvent(`#savedGrid .sv-card[data-id="${ids[1]}"] .sv-open`,'contextmenu'); await pg.waitForTimeout(400);
  ok(N+'the design menu has its picture as a "See it big" button',await pg.isVisible('dialog.design-dlg .ds-peek[aria-label="See it big"]'));
  const pb=await pg.$eval('dialog.design-dlg .ds-peek',e=>{ const r=e.getBoundingClientRect(); return [r.width,r.height]; }); ok(N+'the picture button is at least 44px',pb[0]>=44&&pb[1]>=44,pb);
  await tap(pg,'dialog.design-dlg .ds-peek'); await pg.waitForTimeout(450);
  let s=await peekState(pg);
  ok(N+'Peek opens and the menu closes',!!s&&!(await pg.$('dialog.design-dlg[open]')));
  ok(N+'Peek shows the design it came from',s&&s.name===nameOf(ids[1]),s&&s.name);
  ok(N+'Peek says where it is in the list',s&&s.sub.includes('2 of '+ids.length),s&&s.sub);
  ok(N+'Open links to that design',s&&s.href&&s.href.includes('design='+encodeURIComponent(ids[1])),s&&s.href);
  ok(N+'the picture is shown',s&&s.src);
  ok(N+'Peek fits the screen',s&&s.fits); ok(N+'the picture sits above the name and is big',s&&s.imgIn);
  ok(N+'every control is at least 44px',s&&!s.small.length,s&&s.small);
  ok(N+'no button has a focus ring when Peek opens',await pg.evaluate(()=>!document.querySelector('dialog.peek-dlg :focus-visible')));
  ok(N+'text and background differ (theme)',s&&s.fg!==s.bg,s&&[s.fg,s.bg]);
  if(vp.touch){
    ok(N+'no arrows on a touch phone',s&&!s.prev&&!s.next);
    await swipe(pg,-140); s=await peekState(pg); ok(N+'swipe left shows the next design',s&&s.name===nameOf(ids[2]),s&&s.name);
    await swipe(pg,140); await swipe(pg,140); s=await peekState(pg); ok(N+'swipe right goes back to the first',s&&s.name===nameOf(ids[0])&&s.sub.includes('1 of '),s&&s.sub);
    await swipe(pg,140); s=await peekState(pg); ok(N+'no swipe past the first',s&&s.name===nameOf(ids[0]));
    await swipe(pg,-20); s=await peekState(pg); ok(N+'a small move does not change the design',s&&s.name===nameOf(ids[0]));
  } else {
    ok(N+'arrows on a computer (both, in the middle of the list)',s&&s.prev&&s.next);
    await pg.click('dialog.peek-dlg .next'); await pg.waitForTimeout(300); s=await peekState(pg); ok(N+'the next arrow shows the next design',s&&s.name===nameOf(ids[2]));
    await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(300); s=await peekState(pg);
    ok(N+'← goes back to the first, and its previous arrow hides',s&&s.name===nameOf(ids[0])&&!s.prev&&s.next,s);
  }
  ok(N+'the page behind did not scroll',(await pg.evaluate(()=>scrollY))===y0);
  /* More → the design's menu for the design shown */
  await tap(pg,'dialog.peek-dlg [data-pk="more"]'); await pg.waitForTimeout(400);
  ok(N+'More opens the menu of the design shown',!(await pg.$('dialog.peek-dlg[open]'))&&(await pg.$eval('dialog.design-dlg[open] h3',e=>e.textContent).catch(()=>''))===nameOf(ids[0]));
  /* back to Peek, then close with ✕ and with Escape */
  await tap(pg,'dialog.design-dlg[open] .ds-peek'); await pg.waitForTimeout(400);
  await tap(pg,'dialog.peek-dlg .pk-x'); await pg.waitForTimeout(300); ok(N+'✕ closes Peek',!(await pg.$('dialog.peek-dlg[open]'))&&!(await pg.$('dialog[open]')));
  if(!vp.touch){ await pg.dispatchEvent(`#savedGrid .sv-card[data-id="${ids[0]}"] .sv-open`,'contextmenu'); await pg.waitForTimeout(300); await pg.click('dialog.design-dlg .ds-peek'); await pg.waitForTimeout(300);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); ok(N+'Escape closes Peek',!(await pg.$('dialog.peek-dlg[open]'))); }
  ok(N+'no scroll lock left behind',!(await pg.evaluate(()=>document.documentElement.classList.contains('scroll-lock'))));
  await ctx.close();
}

/* ---------- a shared photo waiting on Home ---------- */
for(const scheme of ['light','dark']){
  const N='shared/'+scheme+': ';
  const ctx=await mk(PHONE,scheme); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e));
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
  ok(N+'no row without a shared photo',!(await pg.isVisible('#sharedBar')));
  const png=fs.readFileSync(new URL('../assets/icon-192.png',import.meta.url)).toString('base64');
  await pg.evaluate(async b64=>{ const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)), f=new File([bin],'shared.png',{type:'image/png'});
    await new Promise((res,rej)=>{ const q=indexedDB.open('studio',1); q.onupgradeneeded=()=>q.result.createObjectStore('files'); q.onsuccess=()=>{ const t=q.result.transaction('files','readwrite'); t.objectStore('files').put({files:[f],at:Date.now()},'studio:shared'); t.oncomplete=()=>{ q.result.close(); res(); }; t.onerror=rej; }; }); },png);
  await pg.reload(); await pg.waitForTimeout(1000);
  ok(N+'the row shows "Your photo is in"',await pg.isVisible('#sharedBar')&&(await pg.textContent('#sharedTxt'))==='Your photo is in');
  ok(N+'the row title fits on one line',await pg.$eval('#sharedTxt',e=>e.getClientRects().length===1&&e.getBoundingClientRect().height<30));
  ok(N+'nothing in Peek or the row has a focus ring after a tap',await pg.evaluate(()=>!document.querySelector('#sharedBar :focus-visible')));
  ok(N+'the row shows the photo',await pg.$eval('#sharedPic',i=>i.complete&&i.naturalWidth>0));
  const hs=await pg.$$eval('#sharedBar button',bs=>bs.map(b=>Math.round(b.getBoundingClientRect().height))); ok(N+'Pick and ✕ are at least 44px',hs.every(h=>h>=44),hs);
  ok(N+'no sideways scroll at 390',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await pg.tap('#sharedGo'); await pg.waitForTimeout(500);
  ok(N+'Pick opens the pick-a-tool sheet',await pg.isVisible('.share-menu')&&!(await pg.isVisible('#sharedBar')));
  await pg.tap('dialog[open] .fab-x'); await pg.waitForTimeout(500);
  ok(N+'closing the sheet brings the row back',await pg.isVisible('#sharedBar'));
  await pg.tap('#sharedX'); await pg.waitForTimeout(400);
  ok(N+'✕ hides the row',!(await pg.isVisible('#sharedBar')));
  ok(N+'✕ forgets the photo',await pg.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('studio',1); q.onsuccess=()=>{ const g=q.result.transaction('files').objectStore('files').get('studio:shared'); g.onsuccess=()=>r(g.result===undefined); }; })));
  await pg.reload(); await pg.waitForTimeout(900); ok(N+'and it stays gone after a reload',!(await pg.isVisible('#sharedBar')));
  await ctx.close();
}

await b.close();
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
console.log(res.join('\n'));
const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} pass, ${f} fail, ${((Date.now()-t0)/1000).toFixed(0)}s`);
process.exit(f?1:0);

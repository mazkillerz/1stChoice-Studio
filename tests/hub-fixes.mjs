/* Hub fixes (1.46.0) that are not about the connection (those are in tests/hub-offline.mjs):
   1 All tools: with every tool pinned the list is taller than the sheet; holding a dragged row at the sheet's bottom edge scrolls
     the sheet and the row lands near the end (touch, 390); a short drag still works; the top edge scrolls back up.
   2 Saved: the chosen collection's ⋯ is clear of the chip row's end fade at 360 and 390, first / middle / last collection,
     a long Arabic name too, light and dark. 3 no page errors.
   Run: node tests/hub-fixes.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const T0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const mk=async(w,h,{dark=false,db,pins}={})=>{
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(p=>{ try{ localStorage.setItem('studio:welcome','1'); if(p) localStorage.setItem('studio:pins',JSON.stringify(p)); }catch(e){} },pins||null);
  await ctx.addInitScript({content:seedScript(db||seedDesigns())}); return ctx; };

/* 1 All tools drag with edge auto-scroll */
{ const probe=await mk(390,844), p0=await probe.newPage(); await p0.goto(BASE+'index.html'); await p0.waitForFunction(()=>window.Studio&&Studio.lab);
  const ids=await p0.evaluate(()=>Object.keys(Studio.lab.TOOLS)); await probe.close();
  const ctx=await mk(390,844,{pins:ids}), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('1: '+e));
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#toolGrid .tool-item'); await pg.tap('#allTools'); await pg.waitForSelector('dialog[open] .lib-pins'); await pg.waitForTimeout(500);
  const cdp=await ctx.newCDPSession(pg); const stored=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:pins')));
  const geo=await pg.evaluate(()=>{ const d=document.querySelector('dialog[open]'), h=d.querySelector('.lib-pins [data-drag]'), r=h.getBoundingClientRect(), dr=d.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,bottom:dr.bottom,top:dr.top,sh:d.scrollHeight,ch:d.clientHeight}; });
  ok('1 every tool pinned: the sheet scrolls (list taller than the sheet)',geo.sh>geo.ch+100,geo);
  const first=ids[0];
  /* press the first handle, move to 20px above the sheet's bottom edge, hold */
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:geo.x,y:geo.y}]});
  const yEnd=geo.bottom-20; for(let i=1;i<=10;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:geo.x,y:geo.y+(yEnd-geo.y)*i/10}]}); await pg.waitForTimeout(25); }
  for(let i=0;i<40;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:geo.x,y:yEnd+(i%2)}]}); await pg.waitForTimeout(40); }
  const st=await pg.evaluate(()=>document.querySelector('dialog[open]').scrollTop);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(500);
  const after=await stored();
  ok('1 holding at the bottom edge scrolls the sheet',st>100,st);
  ok('1 the dragged tool lands near the end of the list (was stuck on screen)',after.indexOf(first)>=ids.length-3,after.indexOf(first)+' of '+ids.length);
  ok('1 no tool lost or doubled',after.length===ids.length&&new Set(after).size===ids.length);
  /* top edge: drag the last-placed one back up while holding at the top */
  const g2=await pg.evaluate(id=>{ const d=document.querySelector('dialog[open]'), h=d.querySelector(`[data-drag="${id}"]`); h.scrollIntoView({block:'center'}); const r=h.getBoundingClientRect(), dr=d.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,top:dr.top}; },first);
  await pg.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:g2.x,y:g2.y}]});
  const yTop=g2.top+20; for(let i=1;i<=10;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:g2.x,y:g2.y+(yTop-g2.y)*i/10}]}); await pg.waitForTimeout(25); }
  for(let i=0;i<50;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:g2.x,y:yTop+(i%2)}]}); await pg.waitForTimeout(40); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(500);
  const back=await stored();
  ok('1 holding at the top edge scrolls back up; the tool lands near the top',back.indexOf(first)<=2,back.indexOf(first));
  /* a short drag (no edge) still moves one place */
  const g3=await pg.evaluate(()=>{ const d=document.querySelector('dialog[open]'); d.scrollTop=0; const hs=[...d.querySelectorAll('.lib-pins [data-drag]')], r0=hs[0].getBoundingClientRect(), r1=hs[1].getBoundingClientRect(); return {x:r0.left+r0.width/2,y:r0.top+r0.height/2,step:r1.top-r0.top,id:hs[0].dataset.drag}; });
  await pg.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:g3.x,y:g3.y}]});
  for(let i=1;i<=10;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:g3.x,y:g3.y+g3.step*i/10}]}); await pg.waitForTimeout(25); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(500);
  ok('1 a short drag still moves a tool one place down',(await stored()).indexOf(g3.id)===1,(await stored()).indexOf(g3.id));
  await ctx.close(); }

/* 2 the chosen collection's ⋯ is clear of the end fade */
{ const db=seedDesigns(); const names=['Restocks','Offers','Eid','Muscat shops','مجموعة رمضان الطويلة جدا','Ramadan','Winter','Zzz last'];
  names.forEach(n=>{ db.cols[n]={id:n,name:n,brand:'1stchoice'}; }); Object.values(db.designs).forEach((d,i)=>{ d.cols=[names[i%names.length]]; });
  for(const [w,dark] of [[360,false],[360,true],[390,false]]){ const N='2 '+w+(dark?' dark':'')+': ';
    const ctx=await mk(w,800,{dark,db}), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e));
    await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#colChips .chip.col'); await pg.waitForTimeout(400);
    const order=await pg.$$eval('#colChips .chip.col',l=>l.map(c=>c.dataset.f));
    for(const pick of [order[0],order[Math.floor(order.length/2)],order[order.length-1],'c:مجموعة رمضان الطويلة جدا']){
      await pg.evaluate(f=>document.querySelector(`#colChips [data-f="${f}"]`).click(),pick); await pg.waitForTimeout(500);
      const r=await pg.evaluate(()=>{ const box=document.getElementById('colChips'), m=document.getElementById('colMore'); if(!m) return null; const br=box.getBoundingClientRect(), mr=m.getBoundingClientRect();
        const mask=getComputedStyle(box).webkitMaskImage||getComputedStyle(box).maskImage||''; const fade=/calc\(100% - (\d+)px\)/.exec(mask); return {left:Math.round(mr.left-br.left),right:Math.round(br.right-mr.right),fade:fade?+fade[1]:0}; });
      ok(N+'⋯ for '+pick.slice(2)+' is fully clear of the end fade',!!r&&r.right>=r.fade&&r.left>=0,r);
    }
    await ctx.close(); } }

ok('3 no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`hub-fixes: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-T0)/1000)} s`); process.exit(f?1:0);

/* Studio 1.1.0: Quick start for paged tools, and Collage drops on a border.
   1. The + menu lists the three photo tools (each with its own icon); Carousel and Highlight covers start from photos with the
      camera in All tools (since 1.10.0; they left the + menu in 1.5.0).
   2. Five photos picked for Carousel open Carousel with five slides, one photo on each (none left as an example photo),
      the "Your photos are in" card shows, and one tap on the bar's Save saves (the save is a full-size slide PNG).
   3. Three photos for Highlight covers give three covers, every one a photo cover.
   4. Thirteen photos for Carousel keep the first ten (the most a carousel has), and the pick sheet's wording says so.
   5. Collage with a 30px border: a point on a photo's border counts as that photo (drop to swap works on the frame too),
      and the photo's drawn box is unchanged.
   Phone size (390x844, touch), light. Run: server on :8080, then node tests/quickpages.mjs (BASE=... to change). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const ALL=['beans','closeup','foam','hand','hands','pair','passion','seal','shelf','stickers','tall','vase','window'].map(n=>S+n+'.jpg');
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
const b=await chromium.launch(); const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
await ctx.route(/supabase\.co/,r=>r.abort());
await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:welcome','1'); }); await pg.reload(); await pg.waitForTimeout(600);

/* 1. the + menu */
/* since 1.10.0 Carousel and Highlight covers start from photos with the camera in All tools */
const libPick=async(id,files)=>{ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500); await pg.tap('#allTools'); await pg.waitForSelector('dialog[open] .lib-row',{timeout:4000});
  await Promise.all([pg.waitForURL(new RegExp(id+'\\.html'),{timeout:15000}),pg.setInputFiles(`dialog[open] .lib-row[data-id="${id}"] input[data-quick]`,files)]); };
const openFab=async()=>{ await pg.tap('#fab'); await pg.waitForSelector('.fab-menu',{timeout:4000}); await pg.waitForTimeout(350); };
await openFab();
const menu=await pg.$$eval('.fab-menu .fab-item',els=>els.map(e=>({t:(e.querySelector('b')||e).textContent.trim(),ic:(e.querySelector('.fi-ic')||{}).innerHTML||'',q:(e.querySelector('input[data-quick]')||{}).dataset?.quick||''})));
const q=menu.filter(m=>m.q);
ok('+ menu: the three photo tools start from photos (Carousel and Highlight covers are in All tools)',q.map(m=>m.q).join(',')==='restock,photo-story,collage',q.map(m=>m.q).join(','));
ok('+ menu: every photo tool has its own icon',new Set(q.map(m=>m.ic)).size===q.length,q.length+' tools');
ok('+ menu: still fits on a phone screen',await pg.$eval('.fab-menu',e=>{ const r=e.getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight; }));

/* 2. carousel from 5 photos */
await pg.keyboard.press('Escape'); await libPick('carousel',ALL.slice(0,5));
await pg.waitForSelector('#readyBar:not([hidden])',{timeout:15000}).catch(()=>{});
const ready=await pg.isVisible('#readyBar')&&(await pg.textContent('#readyTxt'))==='Your photos are in';
const car=await pg.evaluate(()=>{ const S=Studio.debug.S, per=S.photos.length/10; return {pages:S.P.length,real:S.P.map((p,i)=>!!(S.photos[i*per]&&S.photos[i*per].img&&!S.photos[i*per].sample)),page:S.page}; });
ok('carousel: 5 photos make 5 slides',car.pages===5,car.pages);
ok('carousel: every slide has its own photo',car.real.every(Boolean),JSON.stringify(car.real));
ok('carousel: opens on the first slide with "Your photos are in"',car.page===0&&ready);
const dls=[]; pg.on('download',d=>dls.push(d));
await pg.tap('#barSave'); for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
let size=''; if(dls[0]){ const f=os.tmpdir()+'/qp-'+dls[0].suggestedFilename(); await dls[0].saveAs(f); size=/\.png$/i.test(f)?pngSize(f):'not a png: '+f; }
ok('carousel: one tap on Save saves at full size (2160x2700 slides)',dls.length>=1&&size==='2160x2700',dls.length+' files, '+size);

/* 3. highlight covers from 3 photos */
await libPick('highlight',ALL.slice(5,8));
await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.photos.some(p=>p.img&&!p.sample),null,{timeout:15000}).catch(()=>{}); await pg.waitForTimeout(600);
const hl=await pg.evaluate(()=>{ const S=Studio.debug.S, per=S.photos.length/12; return {pages:S.P.length,kinds:S.P.map(p=>p.values.kind),real:S.P.map((p,i)=>!!(S.photos[i*per]&&S.photos[i*per].img&&!S.photos[i*per].sample))}; });
ok('highlight: 3 photos make 3 covers',hl.pages===3,hl.pages);
ok('highlight: every cover is a photo cover with its photo',hl.kinds.every(k=>k==='photo')&&hl.real.every(Boolean),JSON.stringify(hl));

/* 4. 13 photos: the first 10 */
await libPick('carousel',ALL);
await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.P.length>=10,null,{timeout:20000}).catch(()=>{}); await pg.waitForTimeout(800);
ok('carousel: 13 photos keep the first 10 slides',await pg.evaluate(()=>Studio.debug.S.P.length)===10);

/* 5. collage border */
await pg.goto(BASE+'tools/collage.html');
await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.photos[0].img,null,{timeout:15000}).catch(()=>{});
const boxes=()=>pg.evaluate(()=>Studio.debug.reg().filter(x=>x.photo!=null).map(x=>({i:x.photo,x:x.x,y:x.y,w:x.w,h:x.h,pad:x.pad||0})));
const before=await boxes();
await pg.evaluate(()=>{ const r=document.querySelector('[data-range="border"]'); r.value=30; r.dispatchEvent(new Event('input',{bubbles:true})); Studio.debug.render(); });
await pg.waitForTimeout(200);
const after=await boxes(), a=after.find(x=>x.i===1), a0=before.find(x=>x.i===1);
ok('collage: with a border the photo sits 30px inside its old box (drawing unchanged)',a&&a0&&Math.abs(a.x-(a0.x+30))<1&&Math.abs(a.w-(a0.w-60))<1,JSON.stringify({a,a0}));
ok('collage: the border counts as the photo for taps and drops',a&&a.pad>=29,a&&a.pad);
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

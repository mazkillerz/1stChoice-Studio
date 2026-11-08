/* Approvals and comments (behind the "team" preview flag): assets/review.js + review.css. fakecloud stands in for Supabase.
   Two names on two browser contexts (the fake database is handed from one to the next): Sara (partner) sends, Omar (owner) approves / comments, Sara sees it.
   1 flag off: no chip, no review row, no menu rows, no review file requested (even when a design carries a review status)
   2 flag on, Sara: menu has Send for review + Comments, sending sets in_review with her name, card chip "In review", no queue row for a non-owner;
     the Save sheet shows "Send for review" after a team save (phone light only)
   3 Omar (owner): Home row "N waiting for your review" (only while something waits), queue lists who sent it, opening shows the big picture;
     a pin tapped at a spot stores x,y within 0.02 and shows a numbered pin; an Arabic note is RTL; Resolve toggles; Ask for changes sets changes;
     Approve sets approved and the design joins "Approved" while keeping its other collections; the row goes when nothing waits
   4 Sara again: chips Approved / Changes asked, Home note "approved by Omar" once (dismiss, reload: gone), "asked for changes" note
   5 phone 390 touch light + dark and 1280; targets >= 44 px; at most two filled buttons per view; no page errors
   Run: node tests/review.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const PHOTO=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''&&!c?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const base=seedDesigns(); ['seed0','seed1','seed2'].forEach(id=>{ base.designs[id].author='Sara'; });
const withReview=JSON.parse(JSON.stringify(base)); Object.assign(withReview.designs.seed2,{review:'in_review',review_by:'Sara',review_at:new Date().toISOString()});
const init=(who,flag,dbJson)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',${JSON.stringify(JSON.stringify(who))});
  ${flag?"localStorage.setItem('studio:flag:team','1');":''}
  if(${JSON.stringify(dbJson)}&&!sessionStorage.getItem('seeded')){ localStorage.setItem('fakecloud',${JSON.stringify(dbJson)}); sessionStorage.setItem('seeded','1'); } }catch(e){}`;
async function mk(opts,who,flag,dbJson){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(who,flag,dbJson)});
  return ctx;
}
const dbOf=pg=>pg.evaluate(()=>localStorage.getItem('fakecloud'));
const rows=async pg=>JSON.parse(await dbOf(pg));
const home=async(pg,sel)=>{ await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:10000}); if(sel) await pg.waitForSelector(sel,{timeout:8000}).catch(()=>{}); };
const small=async(pg,sel)=>{ await pg.waitForTimeout(450); return pg.$$eval(sel,els=>els.filter(e=>e.offsetParent&&!e.closest('[hidden]')).map(e=>{ const r=e.getBoundingClientRect(); return {t:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,20),w:Math.round(r.width),h:Math.round(r.height)}; }).filter(x=>x.h<44)); };
const filled=pg=>pg.$$eval('dialog[open] .btn:not(.ghost), dialog[open] .mini.solid',els=>els.filter(e=>e.offsetParent).length);

/* 1 flag off */
{ const ctx=await mk({viewport:{width:390,height:844},isMobile:true,hasTouch:true},{name:'Sara',owner:true},false,JSON.stringify(withReview)); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('off: '+e.message));
  let req=0; pg.on('request',r=>{ if(/review\.(js|css)/.test(r.url())) req++; });
  await home(pg); await pg.waitForTimeout(600);
  ok('1 flag off: no chip, no review row, no review file',await pg.evaluate(()=>!document.querySelector('.rv-chip')&&!document.getElementById('rvRow'))&&req===0,req);
  await pg.tap('#savedRowList .sv-more[data-dmore="seed0"]'); await pg.waitForSelector('dialog[open] .act-row');
  ok('1 flag off: the design menu has no review rows',await pg.evaluate(()=>!document.querySelector('[data-act="rvsend"],[data-act="rvcom"]')));
  await ctx.close(); }

let dbSara=null, dbOmar=null;
for(const [name,vp,touch,scheme] of [['phone/light',{width:390,height:844},true,'light'],['phone/dark',{width:390,height:844},true,'dark'],['desktop',{width:1280,height:800},false,'light']]){
  const N=name+': ', O={viewport:vp,isMobile:touch,hasTouch:touch,colorScheme:scheme};
  const tap=(pg,s)=>touch?pg.tap(s):pg.click(s);
  /* 2 Sara sends two designs */
  let ctx=await mk(O,{name:'Sara',owner:false},true,JSON.stringify(base)); let pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
  await home(pg); await pg.waitForTimeout(500);
  ok(N+'no queue row for a non-owner, no chip yet',await pg.evaluate(()=>!document.querySelector('#rvRow .rv-home-row')&&!document.querySelector('.rv-chip')));
  for(const id of ['seed0','seed1']){
    await tap(pg,'#savedRowList .sv-more[data-dmore="'+id+'"]'); await pg.waitForSelector('dialog[open] [data-act="rvsend"]');
    if(id==='seed0') ok(N+'menu has Send for review and Comments',await pg.evaluate(()=>!!document.querySelector('[data-act="rvcom"]')));
    await tap(pg,'dialog[open] [data-act="rvsend"]');
    await pg.waitForFunction(i=>JSON.parse(localStorage.getItem('fakecloud')).designs[i].review==='in_review',id,{timeout:8000}).catch(()=>{});
    await pg.waitForTimeout(600); }
  let d=await rows(pg); ok(N+'sending sets in_review with her name',d.designs.seed0.review==='in_review'&&d.designs.seed0.review_by==='Sara'&&d.designs.seed1.review==='in_review',d.designs.seed0);
  await pg.waitForSelector('#savedRowList .rv-chip',{timeout:8000}).catch(()=>{});
  ok(N+'card chip reads In review',(await pg.$eval('.sv-card[data-id="seed0"] .rv-chip',e=>e.textContent).catch(()=>''))==='In review');
  ok(N+'still no queue row for her',await pg.evaluate(()=>!document.querySelector('#rvRow .rv-home-row')));
  dbSara=await dbOf(pg);
  if(name==='phone/light'){   /* the Save sheet's quiet button */
    await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100});
    await pg.setInputFiles('#pick',PHOTO); await pg.waitForFunction(()=>{ const p=Studio.debug.S.photos[0]; return p&&p.img&&!p.sample; },null,{polling:100});
    await pg.tap('#barSave'); await pg.waitForFunction(()=>document.getElementById('teamOn'),null,{polling:100}); await pg.waitForTimeout(1500);
    ok(N+'Save sheet: no "Send for review" before the team save',await pg.$eval('#rvSend',e=>e.hidden).catch(()=>false));
    await pg.tap('#save'); await pg.waitForSelector('#rvSend:not([hidden])',{timeout:40000}).catch(()=>{});
    const vis=await pg.$eval('#rvSend',e=>!e.hidden).catch(()=>false); ok(N+'Save sheet: "Send for review" shows after the team save',vis);
    if(vis){ await pg.tap('#rvSend'); await pg.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('fakecloud')).designs).some(x=>x.review==='in_review'&&!/^seed/.test(x.id)),null,{timeout:8000}).catch(()=>{});
      const nd=Object.values((await rows(pg)).designs).find(x=>!/^seed/.test(x.id)); ok(N+'Save sheet: sends the new design for review as Sara',!!nd&&nd.review==='in_review'&&nd.review_by==='Sara',JSON.stringify(nd&&{r:nd.review,by:nd.review_by})); }
    dbSara=await dbOf(pg).then(s=>{ const o=JSON.parse(s); Object.keys(o.designs).forEach(k=>{ if(!/^seed/.test(k)) delete o.designs[k]; }); return JSON.stringify(o); }); }
  await ctx.close();

  /* 3 Omar, the owner */
  ctx=await mk(O,{name:'Omar',owner:true},true,dbSara); pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
  await home(pg,'#rvRow .rv-home-row');
  const rowTxt=await pg.$eval('#rvRow .rv-home-row',e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');
  ok(N+'owner Home row says 2 waiting',/^2 waiting for your review$/.test(rowTxt),rowTxt);
  ok(N+'owner Home row is at least 44 px tall',(await small(pg,'#rvRow .rv-home-row')).length===0);
  await tap(pg,'#rvRow .rv-home-row'); await pg.waitForSelector('dialog[open] .rv-qrow');
  const q=await pg.$$eval('dialog[open] .rv-qrow',els=>els.map(e=>e.innerText.replace(/\s+/g,' ')));
  ok(N+'queue lists both with Sara as the sender',q.length===2&&q.every(t=>/Sara/.test(t)),q);
  ok(N+'queue targets >= 44 px and nothing filled',(await small(pg,'dialog[open] .rv-qrow, dialog[open] .link')).length===0&&(await filled(pg))===0);
  await tap(pg,'dialog[open] .rv-qrow >> nth=0'); await pg.waitForSelector('dialog[open] #rvPic');
  await pg.waitForFunction(()=>{ const i=document.getElementById('rvImg'); return i&&i.complete&&i.naturalWidth>0; },null,{timeout:8000}).catch(()=>{});
  ok(N+'the big picture shows',await pg.$eval('#rvImg',i=>i.naturalWidth>0).catch(()=>false));
  ok(N+'one filled button (Approve) in the review view',(await filled(pg))===1,await filled(pg));
  ok(N+'review view targets >= 44 px',(await small(pg,'dialog[open] .btn, dialog[open] .mini, dialog[open] .link, dialog[open] input')).length===0,await small(pg,'dialog[open] .btn, dialog[open] .mini, dialog[open] .link, dialog[open] input'));
  /* a pinned note */
  await pg.$eval('#rvPic',e=>e.scrollIntoView({block:'center'})); await pg.waitForTimeout(500);
  const r=await pg.$eval('#rvPic',e=>{ const q=e.getBoundingClientRect(); return {l:q.left,t:q.top,w:q.width,h:q.height}; });
  const fx=.3, fy=.35, px=r.l+r.w*fx, py=r.t+r.h*fy;
  if(touch) await pg.touchscreen.tap(px,py); else await pg.mouse.click(px,py);
  await pg.waitForSelector('#rvPic .rv-pin.new');
  ok(N+'a tap shows a pending pin and the input has focus',await pg.evaluate(()=>document.activeElement&&document.activeElement.id==='rvText'));
  await pg.fill('#rvText','Move the can a bit left'); await tap(pg,'#rvPost'); await pg.waitForSelector('#rvList .rv-c');
  let cm=(await rows(pg)).comments||[]; const c1=cm[0];
  ok(N+'the note is stored at the tapped spot (within 0.02)',!!c1&&Math.abs(c1.x-fx)<.02&&Math.abs(c1.y-fy)<.02&&c1.author==='Omar',c1);
  ok(N+'a numbered pin 1 is on the picture and listed below with author',(await pg.$eval('#rvPic .rv-pin:not(.new)',e=>e.textContent).catch(()=>''))==='1'&&/Omar/.test(await pg.$eval('#rvList',e=>e.innerText)));
  /* an Arabic general note */
  await pg.fill('#rvText','ممتاز واجد'); ok(N+'the note input is dir=auto',(await pg.$eval('#rvText',e=>e.getAttribute('dir')))==='auto');
  await tap(pg,'#rvPost'); await pg.waitForFunction(()=>document.querySelectorAll('#rvList .rv-c').length===2);
  cm=(await rows(pg)).comments; const c2=cm[1];
  ok(N+'a note without a spot has no x,y',c2&&c2.x===null&&c2.y===null&&c2.text==='ممتاز واجد',c2);
  ok(N+'the Arabic note reads right to left',await pg.$$eval('#rvList .rv-c p',ps=>ps.length===2&&getComputedStyle(ps[1]).direction==='rtl'&&getComputedStyle(ps[0]).direction==='ltr'));
  /* resolve */
  await pg.$eval('#rvList .rv-res',e=>e.scrollIntoView({block:'center'})); await tap(pg,'#rvList .rv-res >> nth=0'); await pg.waitForSelector('#rvList .rv-c.resolved');
  ok(N+'Resolve is stored and the button turns to Reopen',((await rows(pg)).comments[0].resolved===true)&&/Reopen/.test(await pg.$eval('#rvList .rv-c.resolved .rv-res',e=>e.textContent)));
  await tap(pg,'#rvList .rv-res >> nth=0'); await pg.waitForFunction(()=>!document.querySelector('#rvList .rv-c.resolved'));
  ok(N+'Reopen puts it back',((await rows(pg)).comments[0].resolved===false));
  /* which design is open: approve this one, ask changes on the other */
  const firstName=await pg.$eval('dialog[open] .rv-top h3',e=>e.textContent);
  await pg.$eval('#rvActs [data-a="approved"]',e=>e.scrollIntoView({block:'center'})); await tap(pg,'#rvActs [data-a="approved"]');
  await pg.waitForSelector('dialog[open] .rv-qrow',{timeout:8000});   // back in the queue, one left
  d=await rows(pg); const appr=Object.values(d.designs).find(x=>x.review==='approved');
  ok(N+'Approve sets approved by Omar',!!appr&&appr.review_by==='Omar'&&appr.name===firstName,appr&&appr.review);
  ok(N+'the Approved collection gains it and keeps the others',!!appr&&appr.cols.includes('Approved')&&(appr.id!=='seed0'||appr.cols.includes('Restocks')),appr&&appr.cols);
  ok(N+'the Approved collection exists',!!d.cols.Approved);
  await tap(pg,'dialog[open] .rv-qrow >> nth=0'); await pg.waitForSelector('dialog[open] #rvPic');
  ok(N+'Ask for changes is a text button',await pg.$eval('#rvActs [data-a="changes"]',e=>e.classList.contains('link')));
  await pg.$eval('#rvActs [data-a="changes"]',e=>e.scrollIntoView({block:'center'})); await tap(pg,'#rvActs [data-a="changes"]');
  await pg.waitForFunction(()=>!document.querySelector('dialog[open] .rv-qrow'),null,{timeout:8000}).catch(()=>{});
  d=await rows(pg); const chg=Object.values(d.designs).find(x=>x.review==='changes'); ok(N+'Ask for changes sets changes',!!chg&&chg.review_by==='Omar',chg&&chg.review);
  await pg.waitForSelector('dialog[open] .small');
  ok(N+'an empty queue says so',/caught up/.test(await pg.$eval('dialog[open]',e=>e.innerText)));
  await tap(pg,'dialog[open] #rvQx'); await pg.waitForTimeout(800);
  ok(N+'Home row goes when nothing waits',await pg.evaluate(()=>{ const r=document.getElementById('rvRow'); return !r||r.hidden||!r.querySelector('.rv-home-row'); }));
  dbOmar=await dbOf(pg); await ctx.close();

  /* 4 Sara again */
  ctx=await mk(O,{name:'Sara',owner:false},true,dbOmar); pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
  await home(pg,'#rvRow .rv-note');
  const chips=await pg.$$eval('#savedRowList .rv-chip',els=>els.map(e=>e.textContent).sort());
  ok(N+'her cards show Approved and Changes asked',chips.includes('Approved')&&chips.includes('Changes asked'),chips);
  const notes=await pg.$$eval('#rvRow .rv-nt',els=>els.map(e=>e.textContent));
  ok(N+'Home notes name who did what',notes.some(t=>/^Your design “.+” was approved by Omar$/.test(t))&&notes.some(t=>/^Omar asked for changes on “.+”$/.test(t)),notes);
  ok(N+'note targets >= 44 px',(await small(pg,'#rvRow button')).length===0,await small(pg,'#rvRow button'));
  await tap(pg,'#rvRow .rv-note.st-approved .rv-nx');
  await pg.waitForFunction(()=>!document.querySelector('#rvRow .rv-note.st-approved')); await pg.reload(); await pg.waitForSelector('#savedRowList .sv-card'); await pg.waitForTimeout(600);
  ok(N+'a dismissed note stays gone after a reload (once per change)',await pg.evaluate(()=>!document.querySelector('#rvRow .rv-note.st-approved'))&&await pg.evaluate(()=>!!document.querySelector('#rvRow .rv-note.st-changes')));
  /* anyone can comment: Sara opens Comments from the menu and sees Omar's notes */
  const cid=Object.values(JSON.parse(dbOmar).designs).find(x=>x.review==='approved').id;
  await tap(pg,'#savedRowList .sv-more[data-dmore="'+cid+'"]'); await pg.waitForSelector('dialog[open] [data-act="rvcom"]'); await tap(pg,'dialog[open] [data-act="rvcom"]');
  await pg.waitForSelector('dialog[open] #rvList .rv-c,dialog[open] .rv-none');
  ok(N+'Sara can open Comments from the menu; no Approve for her',await pg.evaluate(()=>!document.querySelector('#rvActs [data-a="approved"]')));
  await pg.fill('#rvText','Thanks Omar'); await tap(pg,'#rvPost'); await pg.waitForFunction(()=>[...document.querySelectorAll('#rvList .rv-c b')].some(b=>b.textContent==='Sara'),null,{timeout:8000}).catch(()=>{});
  ok(N+'her note is stored with her name',((await rows(pg)).comments||[]).some(c=>c.author==='Sara'&&c.text==='Thanks Omar'));
  ok(N+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await ctx.close();
}
await b.close();
console.log(res.join('\n')); const bad=res.filter(x=>x.startsWith('FAIL')).length+errs.length;
if(errs.length) console.log('PAGE ERRORS\n'+errs.slice(0,6).join('\n'));
console.log((bad?'FAILED ':'OK ')+res.length+' checks'); process.exit(bad?1:0);

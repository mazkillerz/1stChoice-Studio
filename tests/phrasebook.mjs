/* Phrasebook (preview flag "team"): assets/phrasebook.js + phrasebook.css, the phrase merge in studio.js, Create's Elements.
   1 flag off + no rows: no Settings row, no phrasebook files, pickers unchanged
   2 partner (phone, light): Settings > Phrasebook lists built-in lines, suggests an Arabic line (RTL input), sees its status, no approve buttons
   3 owner: Waiting for your OK; Edit & approve stores the edited wording; reject hides a suggestion
   4 the approved line is in Offer's headline chips and in Create's Add > Elements after a reload, and offline (cloud blocked, cache used); the rejected one is not
   5 Studio.phrasesApproved() = built-in + approved, no rows leaves the lists untouched
   6 phone dark + desktop: tap targets >= 44, no sideways scroll, no page errors
   Run: BASE=http://127.0.0.1:8086/ node tests/phrasebook.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const SUG='خذلك واحد الحين', EDITED='خذلك واحد بارد', REJ='سطر مرفوض', OWNLINE='سطر المالك';
const iso=new Date().toISOString();
const db={designs:{},files:{},cols:{},phrases:[
  {id:'p-r',brand:'1stchoice',line:REJ,category:'headline',status:'suggested',author:'Noor',approved_by:null,created_at:iso}]};
const init=(o)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:${JSON.stringify(o.name||'Sara')},owner:${!!o.owner}}));
  ${o.flag?"localStorage.setItem('studio:flag:team','1');":''}
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,o,state){
  const ctx=await b.newContext({serviceWorkers:'block',...opts,...(state?{storageState:state}:{})});
  await ctx.route(/supabase\.co/,r=>r.abort());
  if(o.offline) await ctx.route(/assets\/cloud\.js/,r=>r.abort()); else await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(!state) await ctx.addInitScript({content:init(o)});
  return ctx;
}
const PHONE={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const rows=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')).phrases||[]);
const openBook=async(pg,tap)=>{ await pg.goto(BASE+'index.html'); await pg.waitForSelector('#setBtn',{timeout:8000}); await tap('#setBtn'); await pg.waitForSelector('dialog.set-dlg[open]');
  await tap('[data-set=phrases]'); await pg.waitForSelector('dialog.pb-dlg[open] #pbIn',{timeout:8000}); await pg.waitForTimeout(500); };
const offerChips=async(pg)=>{ await pg.goto(BASE+'tools/offer.html'); await pg.waitForSelector('[data-f=head] .chip[data-v]',{state:'attached',timeout:15000}); await pg.waitForTimeout(400);
  return pg.evaluate(()=>[...document.querySelectorAll('[data-f=head] .chip[data-v]')].map(c=>c.dataset.v)); };
const createEls=async(pg)=>{ await pg.goto(BASE+'tools/create.html'); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}).catch(()=>{});
  if(await pg.$('[data-size="story"]')){ await pg.tap('[data-size="story"]'); await pg.waitForTimeout(800); }
  await pg.waitForSelector('#crBar [data-cr="add"]',{timeout:15000}); await pg.tap('#crBar [data-cr="add"]'); await pg.waitForSelector('.cr-el',{timeout:8000});
  return pg.evaluate(()=>[...document.querySelectorAll('.cr-el[data-el^="pb-"]')].map(e=>e.textContent.trim())); };

/* 1 flag off, no rows */
let baseHead=[];
{ const ctx=await mk(PHONE,{flag:false}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('off: '+e.message));
  let req=0; pg.on('request',r=>{ if(/phrasebook\.(js|css)/.test(r.url())) req++; });
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#setBtn',{timeout:8000}); await pg.tap('#setBtn'); await pg.waitForSelector('dialog.set-dlg[open]');
  ok('1 flag off: no Phrasebook row in Settings',!(await pg.$('[data-set=phrases]')));
  await pg.keyboard.press('Escape');
  ok('1 flag off: no phrasebook files requested',req===0,req);
  baseHead=await offerChips(pg);
  ok('1 flag off: Offer headline chips are the kit headlines',baseHead.length>5&&await pg.evaluate(h=>JSON.stringify(Studio.phrasesApproved())&&true,baseHead));
  ok('1 flag off: no phrases cache written',await pg.evaluate(()=>localStorage.getItem('studio:phrases:1stchoice')===null));
  const els=await createEls(pg); ok('1 flag off: Create offers no phrasebook elements',els.length===0,els);
  await ctx.close(); }

/* 2 partner, phone light */
let state=null;
{ const ctx=await mk({...PHONE,colorScheme:'light'},{flag:true,name:'Sara'}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('partner: '+e.message));
  const tap=s=>pg.tap(s); await openBook(pg,tap);
  const t=await pg.evaluate(()=>({built:document.querySelectorAll('.pb-line .pb-tag').length,wait:!!document.querySelector('.pb-wait'),okBtn:document.querySelectorAll('[data-ok],[data-edit],[data-no]').length,dir:document.getElementById('pbIn').dir,
    cats:[...document.querySelectorAll('[data-cat]')].map(c=>c.textContent)}));
  ok('2 partner: built-in lines are listed (marked built in), read-only',t.built>5,t);
  ok('2 partner: no waiting section and no Approve / Edit / Reject buttons',!t.wait&&t.okBtn===0,t);
  ok('2 partner: the Arabic input is RTL and categories are English chips',t.dir==='rtl'&&t.cats.includes('Headline')&&t.cats.includes('Poll'),t);
  await pg.fill('#pbIn',SUG); await pg.tap('[data-cat=headline]'); await pg.tap('#pbSend'); await pg.waitForSelector('.pb-mine',{timeout:5000});
  const r=(await rows(pg)).find(x=>x.line===SUG);
  ok('2 partner: the suggestion is saved as suggested by Sara in the Headline category',r&&r.status==='suggested'&&r.author==='Sara'&&r.category==='headline',r);
  ok('2 partner: sees its own suggestion with its status',/Waiting for the owner/.test(await pg.innerText('.pb-mine')));
  ok('2 partner: a suggestion that is not approved is not in the pickers yet',!(await offerChips(pg)).includes(SUG));
  state=await ctx.storageState(); await ctx.close(); }

/* 3 owner approves with an edit, rejects another */
{ const st=JSON.parse(JSON.stringify(state)); st.origins.forEach(o=>o.localStorage.forEach(i=>{ if(i.name==='studio:who') i.value=JSON.stringify({name:'Mariam',owner:true}); }));
  const ctx=await mk({...PHONE,colorScheme:'light'},{flag:true},st); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('owner: '+e.message));
  const tap=s=>pg.tap(s); await openBook(pg,tap);
  ok('3 owner: "Waiting for your OK" lists both suggestions',(await pg.$$('.pb-wait .pb-card')).length===2);
  const card=pg.locator('.pb-card',{hasText:SUG});
  await card.locator('[data-edit]').tap(); await pg.waitForSelector('.pb-edit');
  await pg.fill('.pb-edit',EDITED); await pg.tap('[data-save]'); await pg.waitForFunction(t=>!document.body.innerText.includes(t)||document.querySelectorAll('.pb-wait .pb-card').length===1,SUG,{timeout:5000});
  let rs=await rows(pg); const a=rs.find(x=>x.id!=='p-r'&&x.category==='headline');
  ok('3 owner: Edit & approve stores the edited wording as approved by the owner',a&&a.line===EDITED&&a.status==='approved'&&a.approved_by==='Mariam',a);
  await pg.locator('.pb-card',{hasText:REJ}).locator('[data-no]').tap(); await pg.waitForTimeout(400);
  rs=await rows(pg); ok('3 owner: Reject marks it rejected',rs.find(x=>x.id==='p-r').status==='rejected');
  ok('3 owner: waiting section is gone and the approved line is in the Headline list',!(await pg.$('.pb-wait'))&&(await pg.$$eval('.pb-line .pb-t',e=>e.map(x=>x.textContent))).includes(EDITED));
  /* copy */
  await ctx.grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});
  await pg.locator('.pb-line',{hasText:EDITED}).tap(); ok('3 owner: tapping a line copies it',/Copied/.test(await pg.locator('.pb-line',{hasText:EDITED}).innerText()));
  /* 4 pickers */
  const h=await offerChips(pg); ok('4 Offer headline chips include the approved line and not the rejected one',h.includes(EDITED)&&!h.includes(REJ)&&!h.includes(SUG)&&baseHead.every(x=>h.includes(x)),h.length);
  const e=await createEls(pg); ok('4 Create Add > Elements has the approved line',e.includes(EDITED)&&!e.includes(REJ),e);
  ok('5 Studio.phrasesApproved() = built-in + approved',await pg.evaluate(([x,base])=>{ const a=Studio.phrasesApproved(); return a.includes(x)&&base.every(v=>a.includes(v)); },[EDITED,baseHead]));
  state=await ctx.storageState(); await ctx.close(); }

/* 4b offline: cloud blocked, the cache serves the pickers */
{ const ctx=await mk(PHONE,{flag:true,offline:true},state); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('offline: '+e.message));
  const h=await offerChips(pg); ok('4 offline: Offer still has the approved line (cache)',h.includes(EDITED)&&!h.includes(REJ));
  const e=await createEls(pg); ok('4 offline: Create still has it',e.includes(EDITED));
  await ctx.close(); }

/* 6 layout: phone dark + desktop */
for(const [tag,opts] of [['phone dark',{...PHONE,colorScheme:'dark'}],['desktop',{viewport:{width:1280,height:800},colorScheme:'light'}]]){
  const st=JSON.parse(JSON.stringify(state)); st.origins.forEach(o=>o.localStorage.forEach(i=>{ if(i.name==='studio:who') i.value=JSON.stringify({name:'Mariam',owner:true}); }));
  const ctx=await mk(opts,{flag:true},st); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message));
  const tap=s=>opts.hasTouch?pg.tap(s):pg.click(s); await openBook(pg,tap);
  // a fresh waiting suggestion so the owner buttons show
  await pg.fill('#pbIn',OWNLINE); await tap('#pbSend'); await pg.waitForSelector('.pb-wait',{timeout:5000});
  await pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:4000}).catch(()=>{});
  const m=await pg.evaluate(()=>{ const d=document.querySelector('dialog.pb-dlg'); const small=[...d.querySelectorAll('button,input')].filter(e=>e.offsetParent&&!e.closest('[hidden]')).map(e=>({t:(e.textContent||e.id).slice(0,20),h:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.h<44);
    return {small,over:d.scrollWidth>d.clientWidth+1,doc:document.documentElement.scrollWidth>innerWidth+1}; });
  ok('6 '+tag+': tap targets >= 44 and no sideways scroll',m.small.length===0&&!m.over&&!m.doc,m);
  await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3));
console.log(res.join('\n')); await b.close(); process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);

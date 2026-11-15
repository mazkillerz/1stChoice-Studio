/* 2.16.0: Saved search finds the words inside a design. Tool pages and Create store recipe.words on save; findHit and the hub search read d.words.
   Run: node tests/saved-words.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const PHOTO=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const b=await chromium.launch(); const errs=[];
const mk=async(db)=>{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} });
  if(db) await ctx.addInitScript({content:seedScript(db)}); return ctx; };
const rows=pg=>pg.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fakecloud')).designs));
const PHRASE='رجع متوفر';
let db;
/* 1. Restock save stores words */
{ const ctx=await mk(); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100});
  await pg.setInputFiles('#pick',PHOTO); await pg.waitForTimeout(1200);
  await pg.evaluate(p=>{ const S=Studio.debug.S; S.P[0].values.head={text:p,on:true}; },PHRASE);
  await pg.evaluate(()=>Studio.debug.teamSave({collections:['Restocks'],name:'Restock words'}));
  const r=(await rows(pg)).find(d=>d.name==='Restock words');
  ok('Restock save stores recipe.words with the typed phrase',!!r&&typeof r.recipe.words==='string'&&r.recipe.words.includes(PHRASE)&&r.recipe.words.length<=400,r&&r.recipe.words);
  db=JSON.parse(await pg.evaluate(()=>localStorage.getItem('fakecloud'))); await ctx.close(); }
/* 2. Create save stores words from text nodes */
{ const ctx=await mk(); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(BASE+'tools/create.html'); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400);
  await pg.tap('[data-size="carousel"]'); await pg.waitForTimeout(500);
  await pg.evaluate(p=>{ const n=BD.make.text(p+' واجد',{fontFamily:BD.displayFont(),fontSize:100}); BD.place(n); BD.main.batchDraw(); },PHRASE); await pg.waitForTimeout(300);
  await pg.tap('#crBar [data-cr="save"]'); await pg.waitForTimeout(400);
  await pg.tap('#crWhere [data-where="team"]'); await pg.fill('#crTName','Create words'); await pg.fill('#crCol','Tests'); await pg.tap('#crTeamOnly');
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('crSt').textContent),null,{timeout:15000});
  const r=(await rows(pg)).find(d=>d.name==='Create words');
  ok('Create save stores words from its text nodes',!!r&&typeof r.recipe.words==='string'&&r.recipe.words.includes(PHRASE),r&&r.recipe.words);
  await ctx.close(); }
/* 3. Saved search */
{ const seed=seedDesigns(); const w=db.designs; const rw=Object.values(w).find(d=>d.name==='Restock words');
  Object.assign(seed.designs,{[rw.id]:rw}); Object.assign(seed.files,{[rw.thumb_path]:db.files[rw.thumb_path]}); Object.assign(seed.cols,db.cols);
  const n=Object.keys(seed.designs).length;
  const ctx=await mk(seed); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForFunction(n=>document.querySelectorAll('#savedGrid .sv-card').length===n,n,{timeout:10000}); await pg.waitForTimeout(500);
  await pg.tap('#findBtn'); await pg.waitForTimeout(300);
  const q=async v=>{ await pg.fill('#findIn',v); await pg.waitForTimeout(350); return pg.$$eval('#savedGrid .sv-card .sv-txt b',l=>l.map(x=>x.textContent)); };
  ok('a word inside the design finds it',(await q('متوفر')).join('|')==='Restock words');
  ok('two words of the phrase find it',(await q('رجع متوفر')).length===1);
  ok('with harakat and alef variants',(await q('مُتَوَفِّر')).length===1&&(await q('متوفر')).length===1);
  ok('a word not in any design hides everything',(await q('خذلك')).length===0);
  ok('an old design with no words still matches by name',(await q('Offer')).join('|')==='Offer – 22 Oct');
  /* hub universal search */
  await pg.tap('#findX').catch(()=>{}); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#uq',{timeout:10000}); await pg.waitForTimeout(1200);
  await pg.fill('#uq','متوفر'); await pg.waitForTimeout(600);
  ok('hub search finds the saved design by its words',await pg.evaluate(()=>/Restock words/.test(document.getElementById('usPanel').textContent)));
  await ctx.close(); }
await b.close();
ok('no page errors',errs.length===0,errs.slice(0,3));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\nsaved-words: ${res.length-f} pass, ${f} fail`); process.exit(f?1:0);

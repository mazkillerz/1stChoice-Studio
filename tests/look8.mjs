/* Scratch-style screenshot run for the 0.7.1 polish: every screen the owner flagged, light + dark, phone size.
   Usage: node tests/look8.mjs <outDir> [base] [only]   (only = comma list of shot names) */
import { chromium } from 'playwright'; import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';   // local pages skip the sandbox proxy (fonts still use it)
const [,,OUT='shots',BASE='http://127.0.0.1:8080/',ONLY]=process.argv;
const want=n=>!ONLY||ONLY.split(',').includes(n);
fs.mkdirSync(OUT,{recursive:true});
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const SEED=seedDesigns();
/* mixed Arabic + English names (approved phrases only, they can end up in What's New shots) */
const AR=['رجع متوفر – Classic','Restock وفرنا كمية جديدة','خذلك كولد برو · Passion fruit','Photo story – صباح الخير'];
Object.values(SEED.designs).slice(0,4).forEach((d,i)=>{ d.name=AR[i]; });
const b=await chromium.launch({proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
const errs=[];
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme,ignoreHTTPSErrors:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(SEED)});
  await ctx.addInitScript({content:`try{ if(!localStorage.getItem('studio:pins')) localStorage.setItem('studio:pins',JSON.stringify(['restock','photo-story','collage'])); }catch(e){}`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(scheme+': '+e));
  const shot=async(name,clip)=>{ if(!want(name)) return; await pg.screenshot({path:`${OUT}/${name}-${scheme}.jpg`,type:'jpeg',quality:72,clip}); };
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1800);
  await shot('home');
  await shot('bar',{x:0,y:844-110,width:390,height:110});
  /* Saved page, a collection selected */
  if(want('saved')||want('savedcol')||want('savedmenu')||want('saved-empty')){
    await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1500);
    await shot('saved');
    const c=await pg.$('#colChips [data-f]'); if(c){ await c.tap(); await pg.waitForTimeout(500); }
    await shot('savedcol');
    const m=await pg.$('#colMore'); if(m){ await m.tap(); await pg.waitForTimeout(500); await shot('savedmenu'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); }
  }
  /* search: Arabic query, and the clear button */
  if(want('search')||want('searchar')){
    await pg.goto(BASE+'index.html?s=1'); await pg.waitForTimeout(1500);
    await pg.tap('#uq'); await pg.waitForTimeout(400); await pg.fill('#uq','Restock'); await pg.waitForTimeout(600);
    await shot('search');
    await pg.fill('#uq','رجع'); await pg.waitForTimeout(600);
    await shot('searchar');
    await pg.click('#usCancel').catch(()=>{});
  }
  /* photo story after Quick start: the "Your photo is in" card */
  if(want('ready')||want('editor')){
    await pg.goto(BASE+'index.html?q=1'); await pg.waitForTimeout(800);
    await Promise.all([pg.waitForURL(/photo-story\.html/),pg.setInputFiles('input[data-quick="photo-story"]',S+'pair.jpg')]); await pg.waitForTimeout(2500);
    await shot('ready');
    await shot('editor',{x:0,y:0,width:390,height:120});
  }
  /* more screens for the RTL / contrast sweep */
  if(want('designsheet')){ await pg.goto(BASE+'index.html?d=1#saved'); await pg.waitForTimeout(1500); await pg.tap('#savedGrid [data-dmore]'); await pg.waitForTimeout(700); await shot('designsheet'); }
  if(want('fab')){ await pg.goto(BASE+'index.html?f=1'); await pg.waitForTimeout(1200); await pg.tap('#fab'); await pg.waitForTimeout(700); await shot('fab'); }
  if(want('alltools')){ await pg.goto(BASE+'index.html?t=1'); await pg.waitForTimeout(1200); await pg.tap('#allTools'); await pg.waitForTimeout(700); await shot('alltools'); }
  if(want('words')||want('savesheet')){ await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3500);
    await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(600); await shot('words'); await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(400);
    await pg.tap('#barSave'); await pg.waitForTimeout(800); await shot('savesheet'); }
  if(want('create')){ await pg.goto(BASE+'tools/create.html'); await pg.waitForTimeout(2500); await shot('create'); }
  /* What's New */
  if(want('whatsnew')){ await pg.goto(BASE+'whats-new.html'); await pg.waitForTimeout(1500); await shot('whatsnew'); }
  /* empty Saved (signed in, nothing saved) */
  if(want('saved-empty')){
    await pg.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); d.designs={}; d.cols={}; localStorage.setItem('fakecloud',JSON.stringify(d)); });
    await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1500); await shot('saved-empty');
  }
  await ctx.close();
}
await b.close();
console.log(errs.length?'ERRORS: '+errs.join(' | '):'no page errors');

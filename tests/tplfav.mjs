/* Studio 1.16.0: template favourites + recently used (hub Templates page and Create's picker). Phone 390x844 touch, light + dark (hub), 360px. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const FAV='studio:tplFav:1stchoice', REC='studio:tplRecent:1stchoice';
let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
const blk=async(n,f)=>{ try{ await f(); }catch(e){ ok(n+' (block aborted)',false,String(e.message).split('\n')[0]); } };
const b=await chromium.launch(); const t0=Date.now();
/* a fresh phone context; seed = {key:value} written once (first load only, so reloads keep what the page stored) */
async function mk(tag,{scheme='light',w=390,h=844,seed={}}={}){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(s=>{ try{ if(!sessionStorage.__seeded){ sessionStorage.__seeded='1'; for(const k in s) localStorage.setItem(k,typeof s[k]==='string'?s[k]:JSON.stringify(s[k])); } }catch(_){} },seed);
  const pg=await ctx.newPage(); pg.setDefaultTimeout(6000); pg.on('pageerror',e=>errs.push(tag+' '+e.message)); return {ctx,pg};
}
const hub=async pg=>{ await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('.tp-li',{timeout:20000}); await pg.waitForTimeout(700); };
const store=(pg,k)=>pg.evaluate(k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(_){ return 'bad'; } },k);
const chip=async(pg,id)=>{ await pg.tap(`.tp-chip[data-id="${id}"]`); await pg.waitForTimeout(700); };
const favTitles=pg=>pg.$$eval('[data-cat="fav"] .tp-card',cs=>cs.map(c=>c.getAttribute('href')));
//const starOut=(pg,id)=>pg.locator(`.tp-li:not([data-cat="fav"] *) .tp-star[data-fav="${id}"], .tp-body > :not([data-cat="fav"]) .tp-star[data-fav="${id}"]`).first();
const tops=(pg,id)=>pg.evaluate(id=>{ const l=[...document.querySelectorAll('.tp-star')].filter(s=>s.dataset.fav===id&&!s.closest('[data-cat="fav"]')); return l[0]?l[0].getBoundingClientRect().top:null; },id);

for(const scheme of ['light','dark']){
  const N=scheme+': ';
  /* 1 + 2 + 3 + 5 */
  await blk(N+'favourites flow',async()=>{ const {ctx,pg}=await mk(N,{scheme}); await hub(pg);
    ok(N+'fresh: no Favourites / Recently used',await pg.locator('[data-cat="fav"],[data-cat="recent"]').count()===0);
    const g=await pg.$$eval('.tp-li.tp-fav',ls=>ls.map(l=>{ const s=l.querySelector('.tp-star'), t=l.querySelector('.tp-t'); if(!s) return {nostar:1}; const sr=s.getBoundingClientRect(), tr=t.getBoundingClientRect(), lr=l.getBoundingClientRect(), cy=sr.top+sr.height/2;
      return {w:sr.width,h:sr.height,endSide:sr.left+sr.width/2>lr.left+lr.width/2,vy:cy>=tr.top-8&&cy<=tr.bottom+8}; }));
    ok(N+'cards exist, each has a star',g.length>5&&g.every(x=>!x.nostar),g.length);
    ok(N+'star box >= 44x44',g.every(x=>x.w>=44&&x.h>=44),g.find(x=>x.w<44||x.h<44));
    ok(N+'star at the end side, level with the title',g.every(x=>x.endSide&&x.vy),g.find(x=>!x.endSide||!x.vy));
    const star=id=>pg.locator(`.tp-star[data-fav="${id}"]`);
    const outside=id=>pg.locator(`section.tp-sec:not([data-cat="fav"]) .tp-star[data-fav="${id}"]`).first();
    await outside('t:ice-cold-post').scrollIntoViewIfNeeded(); await pg.waitForTimeout(300); const t1=await tops(pg,'t:ice-cold-post'); await outside('t:ice-cold-post').tap(); await pg.waitForTimeout(600); const t2=await tops(pg,'t:ice-cold-post');
    ok(N+'star saved',JSON.stringify(await store(pg,FAV))===JSON.stringify(['t:ice-cold-post']),await store(pg,FAV));
    ok(N+'Favourites first with 1 card',(await pg.$$eval('section.tp-sec',s=>s[0].dataset.cat))==='fav'&&(await pg.locator('[data-cat="fav"] .tp-card').count())===1);
    ok(N+'aria-pressed true everywhere',await pg.$$eval('.tp-star[data-fav="t:ice-cold-post"]',l=>l.length>=2&&l.every(s=>s.getAttribute('aria-pressed')==='true')));
    ok(N+'live region says Added',/Added to favourites/.test(await pg.locator('.tp-sr[role=status]').textContent()));
    ok(N+'anchor drift <= 2px',t1!=null&&t2!=null&&Math.abs(t1-t2)<=2,[t1,t2]);
    await outside('p:rs-cans').tap(); await pg.waitForTimeout(600);
    const f=await favTitles(pg); ok(N+'newest favourite first',f.length===2&&/tpl=ice-cold-post/.test(f[1])&&!/ice-cold-post/.test(f[0]),f);
    await pg.locator('[data-cat="fav"] .tp-star[data-fav="p:rs-cans"]').tap(); await pg.waitForTimeout(600);
    ok(N+'unstar from Favourites',JSON.stringify(await store(pg,FAV))===JSON.stringify(['t:ice-cold-post'])&&(await pg.locator('[data-cat="fav"] .tp-card').count())===1&&/Removed from favourites/.test(await pg.locator('.tp-sr[role=status]').textContent()));
    /* 3 reload */
    await pg.reload(); await pg.waitForSelector('.tp-li'); await pg.waitForTimeout(700);
    ok(N+'favourites persist after reload',(await pg.locator('[data-cat="fav"] .tp-card').count())===1);
    await chip(pg,'post');
    const hrefs=()=>pg.$$eval('.tp-body .tp-card',cs=>cs.map(c=>c.getAttribute('href')));
    const h1=await hrefs(); ok(N+'Posts lists favourite first',/tpl=ice-cold-post/.test(h1[0]||''),h1.slice(0,3));
    await pg.locator('.tp-body .tp-star[data-fav="t:did-you-know-post"]').tap(); await pg.waitForTimeout(400);
    ok(N+'Posts: star does not reorder',JSON.stringify(h1)===JSON.stringify(await hrefs()));
    ok(N+'Posts: aria-pressed flipped',(await pg.locator('.tp-body .tp-star[data-fav="t:did-you-know-post"]').getAttribute('aria-pressed'))==='true');
    /* 5 badge + subs */
    const bd=await pg.$$eval('.tp-body .tp-li',ls=>ls.map(l=>{ const bg=l.querySelector('.tp-badge'); if(!bg) return null; return {inS:!!bg.closest('.tp-s'),ok:bg.getBoundingClientRect().top>=l.querySelector('.tp-frame').getBoundingClientRect().bottom-0.5}; }).filter(Boolean));
    ok(N+'badges sit under the preview, inside .tp-s',bd.length>0&&bd.every(x=>x.inS&&x.ok),bd);
    const subs=await pg.$$eval('.tp-body .tp-card',cs=>cs.map(c=>({h:c.getAttribute('href'),s:(c.querySelector('.tp-s')||{}).textContent||''})));
    ok(N+'Ice cold post sub',/Post · ready in one tap/.test((subs.find(x=>/tpl=ice-cold-post/.test(x.h))||{}).s),subs.find(x=>/ice-cold-post/.test(x.h)));
    ok(N+'no Posts sub ends with "· Create"',!subs.some(x=>/· Create$/.test(x.s)),subs.filter(x=>/· Create$/.test(x.s)));
    await ctx.close(); });
  /* 4 recents */
  await blk(N+'recents',async()=>{ const {ctx,pg}=await mk(N,{scheme,seed:{[REC]:['t:good-morning','p:hl-cream','t:nope','t:ice-cold-post','p:rs-split','t:offer','t:map-post']}}); await hub(pg);
    ok(N+'recent row exists',await pg.locator('section[data-cat="recent"] ul.tp-recent').count()===1);
    ok(N+'first mini is Good morning',(await pg.locator('ul.tp-recent .tp-mt').first().textContent()).trim()==='Good morning');
    const m=await pg.$$eval('ul.tp-recent .tp-mini',cs=>cs.filter(c=>c.offsetParent!==null).map(c=>Math.round(c.getBoundingClientRect().top)));
    ok(N+'4 minis visible in one row',m.length===4&&new Set(m).size===1,m);
    await pg.evaluate(()=>document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('a.tp-card')) e.preventDefault(); },true));
    const id=await pg.evaluate(()=>{ const l=document.querySelector('[data-cat="fav"]')?null:[...document.querySelectorAll('.tp-grid .tp-card')][5]; const s=l.closest('.tp-li').querySelector('.tp-star'); l.click(); return s.dataset.fav; });
    const r=await store(pg,REC); ok(N+'tapping a card records it first',Array.isArray(r)&&r[0]===id&&r.length<=8,{id,r});
    await ctx.close(); });
}
/* 6 bad storage */
{ const {ctx,pg}=await mk('bad',{seed:{[FAV]:'"oops"'}}); await hub(pg); ok('bad: string storage renders',await pg.locator('.tp-li').count()>5&&await pg.locator('[data-cat="fav"]').count()===0); await ctx.close(); }
{ const {ctx,pg}=await mk('bad2',{seed:{[FAV]:[1,null,'t:ice-cold-post']}}); await hub(pg); ok('bad: mixed array shows 1 favourite',await pg.locator('[data-cat="fav"] .tp-card').count()===1); await ctx.close(); }
ok('no page errors in hub tests',errs.length===0,errs);
/* 7 Create picker */
const openPicker=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(600);
  if(!await pg.evaluate(()=>{ const s=document.getElementById('crSheet'); return s&&!s.hidden&&document.querySelector('.cr-tw'); })){ await pg.evaluate(()=>CRUI.openTemplates()); } await pg.waitForSelector('.cr-tw',{timeout:10000}); await pg.waitForTimeout(300); };
const order=pg=>pg.$$eval('.cr-tpl[data-tpl]',e=>e.map(x=>x.dataset.tpl));
{ const {ctx,pg}=await mk('create'); await pg.goto(BASE+'tools/create.html'); await openPicker(pg);
  ok('create fresh: no Recently used',await pg.locator('#crRecent').count()===0);
  const st=await pg.$$eval('.cr-tw',ws=>ws.map(w=>{ const s=w.querySelectorAll('.cr-star'); const r=s[0]&&s[0].getBoundingClientRect(); return {n:s.length,w:r&&r.width,h:r&&r.height}; }));
  ok('create: one star per card, >= 44px',st.length>5&&st.every(x=>x.n===1&&x.w>=44&&x.h>=44),st.find(x=>x.n!==1||x.w<44||x.h<44)); await ctx.close(); }
await blk('create flow',async()=>{ const {ctx,pg}=await mk('create2',{seed:{[FAV]:['t:this-or-that'],[REC]:['t:good-morning','t:ice-cold-post']}}); await pg.goto(BASE+'tools/create.html'); await openPicker(pg);
  const o0=await order(pg); ok('create: favourite listed first',o0[0]==='this-or-that',o0.slice(0,3));
  ok('create: Recently used has 2, good-morning first',(await pg.locator('#crRecent .cr-rec').count())===2&&(await pg.locator('#crRecent .cr-rec').first().getAttribute('data-rtpl'))==='good-morning');
  ok('create: recent thumbnail loads',await pg.waitForSelector('#crRecent .th img',{timeout:30000}).then(()=>true,()=>false));
  await pg.fill('#crTplQ','zzqq'); ok('create: search hides Recently used',!await pg.locator('#crRecent').isVisible());
  await pg.fill('#crTplQ',''); ok('create: clearing shows it',await pg.locator('#crRecent').isVisible());
  await pg.locator('.cr-star[data-star="ice-cold"]').tap(); await pg.waitForTimeout(300);
  const fv=await store(pg,FAV); ok('create: star writes key, first',Array.isArray(fv)&&fv[0]==='t:ice-cold',fv);
  ok('create: star pressed, no reorder',(await pg.locator('.cr-star[data-star="ice-cold"]').getAttribute('aria-pressed'))==='true'&&JSON.stringify(o0)===JSON.stringify(await order(pg)));
  await pg.evaluate(()=>CRUI.closeSheet&&CRUI.closeSheet(true)); await pg.keyboard.press('Escape').catch(()=>{}); await pg.waitForTimeout(300);
  await pg.evaluate(()=>CRUI.openTemplates()); await pg.waitForSelector('.cr-tw'); await pg.waitForTimeout(300);
  ok('create: reopened, ice-cold among first two',(await order(pg)).slice(0,2).includes('ice-cold'),(await order(pg)).slice(0,3));
  await pg.locator('#crRecent .cr-rec').nth(1).tap();
  const want='t:'+await pg.evaluate(()=>0).then(()=>'ice-cold-post');
  ok('create: applying a recent puts it first and closes the sheet',await pg.waitForFunction(w=>{ try{ return JSON.parse(localStorage.getItem('studio:tplRecent:1stchoice'))[0]===w&&document.getElementById('crSheet').hidden; }catch(_){ return false; } },want,{timeout:20000}).then(()=>true,()=>false)); await ctx.close(); });
/* 8 360px */
{ const {ctx,pg}=await mk('360',{w:360,h:740,seed:{[FAV]:['t:ice-cold-post','p:rs-cans','t:offer'],[REC]:['t:good-morning','t:offer','t:map-post','p:rs-split','p:hl-cream']}}); await hub(pg);
  ok('360: hub has Favourites + Recent',await pg.locator('[data-cat="fav"] .tp-card').count()===3&&await pg.locator('[data-cat="recent"]').count()===1);
  ok('360: hub no horizontal scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await pg.goto(BASE+'tools/create.html'); await openPicker(pg);
  const v=await pg.$$eval('#crRecent .cr-rec',r=>r.filter(e=>e.offsetParent!==null).length); ok('360: Create shows <= 2 recents',v>=1&&v<=2,v);
  ok('360: Create picker no horizontal scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)); await ctx.close(); }
ok('no page errors overall',errs.length===0,errs);
await b.close(); console.log(`\n${fails?'FAILED':'ALL PASS'}: ${fails} fail, ${((Date.now()-t0)/1000).toFixed(0)}s`); process.exit(fails?1:0);

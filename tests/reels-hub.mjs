/* Reels on Home (video editor phase 3): Templates → Reels, favourites + recently used for reel entries, hub search, and Video drafts in Continue editing.
   Phone 390x844 touch, light + dark. Server on :8080 (BASE=... to change). Exit 1 on any FAIL.
   1. Templates: "Reels" chip, the Winter cat card (thumbnail loaded, play glyph, "Video", "10 s" in a <bdi>), tap -> tools/video.html?reel=winter-cat
   2. Star on the reel card works, persists after reload (studio:tplFav:<brand> holds r:winter-cat); it is in Recently used after opening
   3. Hub search: "reel", "video", "winter" find it; an Arabic search still finds a template with Arabic words
   4. A seeded Video draft (localStorage + IndexedDB thumb + IndexedDB media): Continue editing shows its name + thumb, link ?draft=<id>,
      ✕ removes the draft and its thumb but NOT studio:vmedia:x
   5. Save pictures with a Video draft + a normal draft: the video is reported as skipped ("is a video: open it to save the MP4") */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const FAV='studio:tplFav:1stchoice', REC='studio:tplRecent:1stchoice', DK='studio:draft:1stchoice:video:v1x';
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const mk=async scheme=>{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); return ctx; };
const newPage=async ctx=>{ const pg=await ctx.newPage(); pg.setDefaultTimeout(8000); pg.on('pageerror',e=>errs.push(tag+e)); return pg; };
const store=(pg,k)=>pg.evaluate(k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(_){ return 'bad'; } },k);
const idbGet=(pg,k)=>pg.evaluate(k=>new Promise(r=>{ const q=indexedDB.open('studio',1); q.onupgradeneeded=()=>q.result.createObjectStore('files'); q.onsuccess=()=>{ const g=q.result.transaction('files').objectStore('files').get(k); g.onsuccess=()=>r(g.result===undefined?null:g.result); g.onerror=()=>r('err'); }; q.onerror=()=>r('err'); }),k);
const idbPut=(pg,k,v)=>pg.evaluate(([k,v])=>new Promise(r=>{ const q=indexedDB.open('studio',1); q.onupgradeneeded=()=>q.result.createObjectStore('files'); q.onsuccess=()=>{ const t=q.result.transaction('files','readwrite'); t.objectStore('files').put(v,k); t.oncomplete=()=>r(1); }; }),[k,v]);
const hub=async(pg,hash='')=>{ await pg.goto(BASE+'index.html'+hash); await pg.waitForFunction(()=>window.Studio); await pg.waitForTimeout(900); };
const THUMB='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="70"><rect width="40" height="70" fill="#c33"/></svg>');

for(const scheme of ['light','dark']){
  tag=scheme+': ';
  /* ---- 1 + 2 + 3 ---- */
  { const ctx=await mk(scheme), pg=await newPage(ctx); await hub(pg,'#templates'); await pg.waitForSelector('.tp-li');
    ok('Reels chip exists',await pg.locator('.tp-chip[data-id="reels"]').count()===1);
    ok('chip row has no empty Reels section before choosing: card in All',await pg.locator('section[data-cat="reels"] .tp-card[href*="video.html?reel=winter-cat"]').count()===1);
    await pg.tap('.tp-chip[data-id="reels"]'); await pg.waitForTimeout(700);
    const card=pg.locator('.tp-body .tp-card[href*="reel=winter-cat"]');
    ok('Winter cat card in Reels',await card.count()===1);
    const info=await card.evaluate(c=>{ const im=c.querySelector('.tp-img'), s=c.querySelector('.tp-s'), v=c.querySelector('.tp-vid'), bd=s&&s.querySelector('bdi'); const r=c.getBoundingClientRect();
      return {t:c.querySelector('.tp-t').textContent,img:im?im.naturalWidth:0,src:im?im.getAttribute('src'):'',vid:!!v,vr:v?v.getBoundingClientRect().width:0,s:s?s.textContent:'',bdi:bd?bd.textContent:'',h:r.height,w:r.width,label:c.getAttribute('aria-label')}; });
    ok('title "Winter cat"',info.t==='Winter cat',info.t);
    ok('thumbnail loaded from tpl/reel-winter-cat.jpg',info.img>0&&/tpl\/reel-winter-cat\.jpg$/.test(info.src),info);
    ok('play glyph on the card',info.vid&&info.vr>=20,info);
    ok('sub says Video and has "10 s" in a bdi',/Video/.test(info.s)&&info.bdi==='10 s',info);
    ok('aria-label mentions Video',/Video/.test(info.label),info.label);
    ok('card tappable (>= 48px)',info.h>=48&&info.w>=48);
    /* star */
    const star=pg.locator('.tp-body .tp-star[data-fav="r:winter-cat"]'); await star.tap(); await pg.waitForTimeout(400);
    ok('star saved r:winter-cat',JSON.stringify(await store(pg,FAV))===JSON.stringify(['r:winter-cat']),await store(pg,FAV));
    await pg.reload(); await pg.waitForSelector('.tp-li'); await pg.waitForTimeout(700);
    ok('the Reels category is remembered',await pg.locator('.tp-chip[data-id="reels"][aria-pressed="true"]').count()===1);
    await pg.tap('.tp-chip[data-id="all"]'); await pg.waitForTimeout(700);
    ok('favourite persists after reload (Favourites section in All)',await pg.locator('[data-cat="fav"] .tp-card[href*="reel=winter-cat"]').count()===1);
    ok('(the Reels chip survives a reload)',await pg.locator('.tp-chip[data-id="reels"]').count()===1);
    /* open it */
    const href=await pg.locator('section[data-cat="reels"] .tp-card[href*="reel=winter-cat"]').getAttribute('href');
    ok('href is tools/video.html?reel=winter-cat',/tools\/video\.html\?reel=winter-cat$/.test(href),href);
    await pg.locator('section[data-cat="reels"] .tp-card[href*="reel=winter-cat"]').tap(); await pg.waitForURL(/video\.html\?reel=winter-cat/,{timeout:15000}).catch(()=>{});
    ok('tap opens the Video editor with ?reel=winter-cat',/video\.html\?reel=winter-cat/.test(pg.url()),pg.url());
    ok('recently used holds r:winter-cat',(await store(pg,REC)||[])[0]==='r:winter-cat',await store(pg,REC));
    await hub(pg,'#templates'); await pg.waitForSelector('.tp-li');
    ok('Recently used row shows the reel',await pg.locator('[data-cat="recent"] .tp-card[href*="reel=winter-cat"]').count()===1);
    ok('mini card has the play glyph',await pg.locator('[data-cat="recent"] .tp-vid').count()===1);
    ok('no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    /* search */
    await hub(pg);
    const find=async q=>{ await pg.fill('#uq',q); await pg.waitForTimeout(500); return pg.$$eval('#usPanel .us-row',l=>l.map(x=>x.textContent)).catch(()=>[]); };
    for(const q of ['reel','video','winter']){ const r=await find(q); ok('search "'+q+'" finds Winter cat',r.some(t=>/Winter cat/.test(t)),r.slice(0,6)); }
    { const r=await find('رجع'); ok('Arabic search still finds other entries',r.length>0,r.slice(0,3)); }
    await ctx.close(); }

  /* ---- 4: a seeded Video draft ---- */
  { const ctx=await mk(scheme), pg=await newPage(ctx); await hub(pg);
    await idbPut(pg,DK+':thumb',THUMB); await idbPut(pg,'studio:vmedia:x','MEDIA-BYTES');
    await pg.evaluate(k=>localStorage.setItem(k,JSON.stringify({video:{v:2,kind:'video',clips:[]},name:'Eid reel',at:Date.now(),design:null,pfx:k})),DK);
    await hub(pg);
    ok('Continue editing visible',await pg.isVisible('#continueSec'));
    const c=pg.locator('#continueList .ccard[data-draft="'+DK+'"]');
    ok('video draft listed',await c.count()===1);
    ok('title is the draft name',(await c.locator('.rtxt b').textContent()).trim()==='Eid reel');
    await pg.waitForFunction(k=>{ const i=document.querySelector('.ccard[data-draft="'+k+'"] .cthumb img'); return i&&i.naturalWidth>0; },DK,{timeout:6000}).catch(()=>{});
    ok('thumb shown',await c.locator('.cthumb img').count()===1);
    ok('opens tools/video.html?draft=v1x',/tools\/video\.html\?draft=v1x$/.test(await c.locator('a.rlink').getAttribute('href')));
    /* an unnamed video draft says "Video editor" */
    await pg.evaluate(()=>localStorage.setItem('studio:draft:1stchoice:video:v2y',JSON.stringify({video:{v:2,kind:'video',clips:[]},at:Date.now()-5000,pfx:'studio:draft:1stchoice:video:v2y'})));
    await hub(pg);
    ok('unnamed draft shows the tool name',(await pg.locator('.ccard[data-draft$=":v2y"] .rtxt b').textContent()).trim()==='Video editor');
    /* Save pictures: the video is skipped, a normal draft is saved */
    await pg.evaluate(()=>localStorage.removeItem('studio:draft:1stchoice:video:v2y'));
    /* remove */
    await hub(pg); await pg.locator('#continueList .ccard[data-draft="'+DK+'"] .rx').tap(); await pg.waitForSelector('#rmYes'); await pg.tap('#rmYes'); await pg.waitForTimeout(600);
    ok('draft record removed',await store(pg,DK)===null);
    ok('draft thumb removed',await idbGet(pg,DK+':thumb')===null);
    ok('media file kept (studio:vmedia:x)',await idbGet(pg,'studio:vmedia:x')==='MEDIA-BYTES');
    ok('card gone',await pg.locator('#continueList .ccard[data-draft="'+DK+'"]').count()===0);
    await ctx.close(); }
}

/* ---- 5: Save pictures skips a video draft ---- */
tag='save: ';
{ const ctx=await mk('light');
  const mp=await newPage(ctx); await mp.goto(BASE+'tools/restock.html'); await mp.waitForFunction(()=>window.Studio&&Studio.debug);
  const t=s=>mp.$eval(s,e=>e.click()); await t('#styles [data-style="photo"]'); await mp.waitForTimeout(900); await t('#styles [data-style="cans"]');
  await mp.waitForFunction(()=>Studio.debug.draftId(),null,{timeout:8000}); await mp.waitForTimeout(1500); await mp.close();
  const pg=await newPage(ctx); await hub(pg);
  await pg.evaluate(k=>localStorage.setItem(k,JSON.stringify({video:{v:2,kind:'video',clips:[]},name:'Eid reel',at:Date.now(),pfx:k})),DK);
  await hub(pg);
  ok('two cards in Continue editing',await pg.locator('#continueList .ccard[data-draft]').count()===2);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:150000}).catch(()=>null),pg.click('#contSave')]);
  await pg.waitForFunction(()=>/Saved!|Nothing/.test((document.getElementById('bsH')||{}).textContent||''),null,{timeout:150000}).catch(()=>{});
  const txt=await pg.evaluate(()=>(document.getElementById('bsNote')||document.body).textContent);
  ok('a picture of the normal draft was downloaded',!!dl&&/\.png$/i.test(dl.suggestedFilename()),dl&&dl.suggestedFilename());
  ok('dialog says the video is a video: open it to save the MP4',/Eid reel.*is a video: open it to save the MP4/.test(txt),txt.slice(0,300));
  ok('video draft still stored',await store(pg,DK)!==null);
  await ctx.close(); }

tag=''; ok('no page errors',errs.length===0,errs.slice(0,3));
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log('\n'+(res.length-bad)+'/'+res.length+' passed'); await b.close(); process.exit(bad?1:0);

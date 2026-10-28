/* Studio 1.11.0: one-tap post presets (Ice cold / Did you know / Your choice as 1080×1350 feed posts) and search hits that open
   Create straight on a template. Phone (390×844 touch) and desktop (1280×800), light and dark.
   - Templates → Posts: the three posts come first after the carousel, with real 4:5 previews and the New badge.
   - Search finds them in English and by their Arabic words (with or without harakat); a hit shows its preview.
   - Tapping a hit opens Create with the post built (one 1080×1350 page), only approved words, nothing to fill in; Save gives 2160×2700.
   - Create opened on existing work with ?tpl= shows the picker on that template (ringed, in view).
   Server on :8080 (or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync(path.join(os.tmpdir(),'postpresets-'));
const POSTS=['ice-cold-post','did-you-know-post','your-choice-post'];
const TITLES={'ice-cold-post':'Ice cold post','did-you-know-post':'Did you know post','your-choice-post':'Your choice post'};
let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
const pngSize=f=>{ const b=fs.readFileSync(f); return [b.readUInt32BE(16),b.readUInt32BE(20)]; };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(500); };

/* every approved phrase in the brand kit (phrases, flavour names, handle), read in a page */
const approvedIn=pg=>pg.evaluate(()=>{ const B=BD.B, s=new Set(), add=v=>{ if(typeof v==='string') s.add(v); else if(Array.isArray(v)) v.forEach(add); else if(v&&typeof v==='object') Object.values(v).forEach(add); };
  add(B.phrases); (B.flavours||[]).forEach(f=>s.add(f.name)); if(B.handle) s.add(B.handle); return [...s]; });

const b=await chromium.launch();
const VPS=[{name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},{name:'desktop',viewport:{width:1280,height:800}}];
for(const vp of VPS) for(const scheme of ['light','dark']){
  const N=vp.name+'/'+scheme+': ';
  const ctx=await b.newContext({viewport:vp.viewport,deviceScaleFactor:1,isMobile:!!vp.isMobile,hasTouch:!!vp.hasTouch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage();
  pg.on('pageerror',e=>errs.push(N+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|ERR_FAILED|net::/.test(m.text())) errs.push(N+m.text()); });
  const tap=s=>vp.hasTouch?pg.tap(s):pg.click(s);

  /* ---- Templates → Posts ---- */
  await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('.tp-chip[data-id="post"]',{timeout:15000});
  await tap('.tp-chip[data-id="post"]'); await pg.waitForTimeout(900);
  const cards=await pg.$$eval('.tp-body .tp-card',cs=>cs.map(c=>{ const fr=c.querySelector('.tp-frame'), im=c.querySelector('.tp-img'), r=fr.getBoundingClientRect();
    return {t:c.querySelector('.tp-t').textContent,href:c.getAttribute('href'),img:!!(im&&im.complete&&im.naturalWidth),ar:+(r.width/r.height).toFixed(2),badge:(c.querySelector('.tp-badge')||{}).textContent||''}; }));
  const idx=POSTS.map(id=>cards.findIndex(c=>/[?&]tpl=([^&]+)/.test(c.href)&&c.href.endsWith('tpl='+id)));
  ok(N+'Posts lists the three post presets',idx.every(i=>i>=0),cards.map(c=>c.t));
  ok(N+'they come first after the carousel',idx.join()==='1,2,3',idx);
  const three=idx.map(i=>cards[i]||{});
  ok(N+'their previews load',three.every(c=>c.img),three);
  ok(N+'previews are 4:5 posts',three.every(c=>Math.abs(c.ar-.8)<.03),three.map(c=>c.ar));
  ok(N+'titles and New badge',three.every((c,k)=>c.t===TITLES[POSTS[k]]&&c.badge==='New'),three);
  ok(N+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));

  /* ---- search: English and Arabic ---- */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200);
  const tplRows=async q=>{ await tap('#uq'); await pg.fill('#uq',q); await pg.waitForTimeout(700);
    return pg.$$eval('#usPanel .us-sec[data-k="template"] .us-row',rs=>rs.map(r=>{ const im=r.querySelector('.us-th img'); return {t:r.querySelector('.us-t').textContent,href:r.getAttribute('href')||'',img:!!(im&&im.complete&&im.naturalWidth),shape:(r.querySelector('.us-th')||{dataset:{}}).dataset.shape}; })); };
  let rows=await tplRows('ice cold');
  ok(N+'English "ice cold" finds the post',rows.some(r=>r.t==='Ice cold post'),rows.map(r=>r.t));
  await pg.waitForTimeout(500); rows=await tplRows('ice cold');
  const ic=rows.find(r=>r.t==='Ice cold post');
  ok(N+'the hit shows its real preview in post shape',!!ic&&ic.img&&ic.shape==='post',ic);
  rows=await tplRows('post');
  ok(N+'"post" finds all three',POSTS.every(id=>rows.some(r=>r.t===TITLES[id])),rows.map(r=>r.t));
  rows=await tplRows('يسرسح');
  ok(N+'Arabic "يسرسح" finds the Ice cold post',rows.some(r=>r.t==='Ice cold post'),rows.map(r=>r.t));
  rows=await tplRows('اختيَارك');
  ok(N+'Arabic with harakat "اختيَارك" finds the Your choice post',rows.some(r=>r.t==='Your choice post'),rows.map(r=>r.t));
  rows=await tplRows('تعرف ويش');
  ok(N+'Arabic "تعرف ويش" finds the Did you know post',rows.some(r=>r.t==='Did you know post'),rows.map(r=>r.t));
  ok(N+'Arabic input runs right to left',await pg.$eval('#uq',e=>getComputedStyle(e).direction==='rtl'||e.matches(':dir(rtl)')));

  /* ---- a hit opens Create with the post built, ready to save ---- */
  const id=POSTS[(vp.name==='phone'?0:1)+(scheme==='dark'?1:0)];   // each run opens a different one
  rows=await tplRows(TITLES[id].toLowerCase());
  const k=rows.findIndex(r=>r.t===TITLES[id]);
  await tap(`#usPanel .us-sec[data-k="template"] .us-item:nth-of-type(${k+1}) .us-row`);
  await ready(pg); await pg.waitForTimeout(1200);
  const built=await pg.evaluate(()=>{ const fs=BD.util.frames(), f=fs[0], s=f&&BD.util.fsize(f), out=[];
    const words=[]; fs.forEach(f=>BD.util.items(f).forEach(n=>{ if(n.hasName('frame-bg')) return; const r=BD.util.prect(n,f); if(r.x<-2||r.y<-2||r.x+r.width>s.w+2||r.y+r.height>s.h+2) out.push(n.getAttr('label')||BD.util.kind(n));
      (n.find?n.find('Text'):[]).concat(n.className==='Text'?[n]:[]).forEach(t=>words.push(t.text())); }));
    return {pages:fs.length,w:s&&s.w,h:s&&s.h,tpl:f&&f.getAttr('tpl'),outside:out,words,sheet:!document.getElementById('crSheet').hidden,write:BD.B.phrases.write}; });
  ok(N+'the hit builds the post: one 1080×1350 page',built.pages===1&&built.w===1080&&built.h===1350&&built.tpl===id,built);
  ok(N+'no picker in the way (ready to save)',!built.sheet);
  ok(N+'everything sits inside the page',!built.outside.length,built.outside);
  const appr=await approvedIn(pg);
  const words=built.words.map(w=>w.trim()).filter(w=>w&&!/^[\d٠-٩]+$/.test(w));
  ok(N+'nothing left to fill in (no "'+built.write+'")',!words.includes(built.write),words);
  ok(N+'only approved words',words.length>0&&words.every(w=>appr.includes(w)),words.filter(w=>!appr.includes(w)));
  if(vp.name==='desktop'){
    await pg.click('#crBar [data-cr="save"]'); await pg.waitForTimeout(300);
    const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#crGo')]); const f=path.join(OUT,scheme+'-'+dl.suggestedFilename()); await dl.saveAs(f);
    ok(N+'Save image = 2160×2700 lossless PNG',JSON.stringify(pngSize(f))==='[2160,2700]'&&/\.png$/.test(f),pngSize(f));
  } else {
    await tap('#crBar [data-cr="save"]'); await pg.waitForTimeout(400);
    ok(N+'Save is one tap away',await pg.isVisible('#crGo'));
  }

  /* ---- #20: Create opened on existing work with ?tpl= lands on that template ---- */
  await pg.goto(BASE+'tools/create.html?size=story'); await ready(pg);
  await tap('#crBar [data-cr="text"]'); await pg.waitForTimeout(1500);
  const u=await pg.evaluate(()=>location.href);
  if(/draft=/.test(u)){
    const want=POSTS[2];
    await pg.goto(u+'&tpl='+want); await ready(pg); await pg.waitForSelector('.cr-tpl.hl',{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(400);
    const r=await pg.evaluate(want=>{ const e=document.querySelector('.cr-tpl.hl'), sb=document.getElementById('crSheetB'); if(!e) return null;
      const a=e.getBoundingClientRect(), s=sb.getBoundingClientRect(), th=getComputedStyle(e.querySelector('.th'));
      return {id:e.dataset.tpl,n:document.querySelectorAll('.cr-tpl.hl').length,inView:a.top>=s.top-1&&a.bottom<=Math.min(s.bottom,innerHeight)+1,ring:th.outlineStyle!=='none'&&parseFloat(th.outlineWidth)>=2,kept:BD.util.frames().length===1&&BD.util.items(BD.util.frames()[0]).some(n=>!n.hasName('frame-bg'))}; },want);
    ok(N+'?tpl= on a design opens the picker on that template',!!r&&r.id===want&&r.n===1,r);
    ok(N+'the asked-for template is in view and ringed',!!r&&r.inView&&r.ring,r);
    ok(N+'the open design is kept until a choice is made',!!r&&r.kept,r);
  } else ok(N+'a draft was made to test ?tpl= on existing work',false,u);
  await ctx.close();
}
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no console errors');
await b.close(); process.exit(fails||errs.length?1:0);

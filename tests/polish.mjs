/* Phase 3 polish: light WebP copies of brand pictures (HD swaps in, saves stay 2x), template previews kept between visits,
   even option grids, Reset layout under the layer list, recent colours, Create's element previews in dark mode. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SAMPLES=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync('/tmp/polishtest-');
const pngSize=f=>{ const x=fs.readFileSync(f); return [x.readUInt32BE(16),x.readUInt32BE(20)]; };
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(tag+' '+m.text()); }); };
const mk=async(o={})=>{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,...o});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); return ctx; };
const crReady=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}); await pg.waitForTimeout(400); };
const thumbsDone=pg=>pg.waitForFunction(()=>window.CRUI&&document.querySelectorAll('.cr-tpl .th').length>0&&!document.querySelector('.cr-tpl .th.loading'),null,{timeout:60000});
const HD=/brands\/1stchoice\/assets\/[^/]+\.png$/;

/* ---------- 1. light copies in Create ---------- */
{ const ctx=await mk(); const pg=await ctx.newPage(); watch(pg,'create');
  const urls=[]; let bytes=0;
  pg.on('response',async r=>{ urls.push(r.url()); try{ const h=r.headers()['content-length']; bytes+=h?+h:(await r.body()).length; }catch{} });
  await pg.goto(BASE+'tools/create.html'); await thumbsDone(pg); await pg.waitForTimeout(800);
  const hd=urls.filter(u=>HD.test(u.split('?')[0]));
  ok('start sheet: no HD can PNG downloaded',hd.length===0,hd);
  ok('start sheet: under 5 MB downloaded',bytes<5*1024*1024,bytes);
  await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}).catch(()=>{});
  const t0=Date.now();
  await pg.tap('[data-tpl="ice-cold"]');
  await pg.waitForFunction(()=>window.BD&&BD.IMGS&&BD.IMGS.get('brand:cans-pair-shadow'),null,{timeout:30000}).catch(()=>{});
  const first=await pg.evaluate(()=>{ const nodes=BD.main.find('Image').filter(n=>n.getAttr('brandKey')==='brand:cans-pair-shadow'||(n.image()&&/cans_pair_shadow/.test(n.image().src||''))); const n=nodes[0];
    return {has:!!BD.IMGS.get('brand:cans-pair-shadow'),hd:BD.IMGS.get('brand:cans-pair-shadow')&&BD.IMGS.get('brand:cans-pair-shadow').hd,nNodes:nodes.length,src:n&&n.image()&&n.image().src,w:n&&n.width(),h:n&&n.height(),attrs:n&&Object.keys(n.attrs).join(',')}; });
  ok('ice-cold puts brand:cans-pair-shadow on the page at once',first.has&&first.nNodes>0,first);
  await pg.waitForFunction(()=>{ const e=BD.IMGS.get('brand:cans-pair-shadow'); return e&&e.hd===true; },null,{timeout:60000}).catch(()=>{});
  await pg.waitForTimeout(800);
  const after=await pg.evaluate(()=>{ const e=BD.IMGS.get('brand:cans-pair-shadow'); const n=BD.main.find('Image').find(n=>n.image()&&/cans_pair_shadow/.test(n.image().src||''));
    return {hd:e&&e.hd,src:n&&n.image().src,w:n&&n.width(),h:n&&n.height()}; });
  ok('HD replaces the light copy (hd===true, src is the PNG)',after.hd===true&&/cans_pair_shadow\.png/.test(after.src||''),after);
  ok('node size unchanged when HD arrived',first.w!==undefined&&first.w===after.w&&first.h===after.h,[first.w,first.h,after.w,after.h]);
  /* save: 2x */
  await pg.tap('#crBar [data-cr="save"]'); await pg.waitForTimeout(500);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:90000}),pg.tap('#crGo')]); const f=OUT+'/'+dl.suggestedFilename(); await dl.saveAs(f);
  ok('Create save = 2160x3840 PNG (with HD)',JSON.stringify(pngSize(f))==='[2160,3840]'&&/\.png$/.test(f),pngSize(f));
  /* second visit: previews kept */
  const p2=await ctx.newPage(); watch(p2,'create2'); const s=Date.now();
  await p2.goto(BASE+'tools/create.html');
  const done=await p2.waitForFunction(()=>window.CRUI&&document.querySelectorAll('.cr-tpl .th').length>0&&!document.querySelector('.cr-tpl .th.loading'),null,{timeout:20000}).then(()=>true).catch(()=>false);
  const took=Date.now()-s;
  ok('second visit: template previews ready within 3 s',done&&took<3000,took);
  const keys=await p2.evaluate(()=>new Promise(res=>{ const q=indexedDB.open('studio',1); q.onerror=()=>res(['ERR']); q.onsuccess=()=>{ try{ const r=q.result.transaction('files').objectStore('files').getAllKeys(); r.onsuccess=()=>res(r.result.map(String)); r.onerror=()=>res(['ERR2']); }catch(e){ res(['EXC '+e]); } }; }));
  ok("IndexedDB 'files' keeps cr:th: previews",keys.filter(k=>k.startsWith('cr:th:')).length>=5,keys.slice(0,8));
  await p2.close();
  /* ---------- 4b. recent colour in Create (colour set earlier in this context by section 3/4, see below) ---------- */
  await ctx.close(); }

/* ---------- 2/3/4/1e. regular tool ---------- */
{ const ctx=await mk(); const pg=await ctx.newPage(); watch(pg,'np');
  await pg.goto(BASE+'tools/new-place.html'); await pg.waitForTimeout(1500);
  /* 2: even grids */
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500);
  const info=await pg.evaluate(()=>{ const rows=[...document.querySelectorAll('#sh-style #styles, #sh-style [data-seg]')]; const r=rows.find(r=>r.querySelectorAll('.seg').length===4);
    if(!r) return {rows:rows.map(r=>r.querySelectorAll('.seg').length)}; return {cls:r.className,boxes:[...r.querySelectorAll('.seg')].map(s=>{ const q=s.getBoundingClientRect(); return [Math.round(q.x),Math.round(q.y),Math.round(q.width)]; })}; });
  const xs=info.boxes&&new Set(info.boxes.map(q=>q[0])), ys=info.boxes&&new Set(info.boxes.map(q=>q[1])), ws=info.boxes&&new Set(info.boxes.map(q=>q[2]));
  ok('Style look row (4 options) is 2x2 with equal widths',!!info.boxes&&xs.size===2&&ys.size===2&&ws.size===1,info);
  /* 4: recent colour */
  const cp=pg.locator('#sh-style .pal [data-cpick]').first();
  const had=await cp.count();
  if(had){ await cp.fill('#12ab34'); await pg.waitForTimeout(300); }
  ok('Style sheet has a custom colour input',had>0);
  ok('recent colour saved to localStorage',await pg.evaluate(()=>(localStorage.getItem('studio:recent-colours:1stchoice')||'').toUpperCase().includes('#12AB34')),await pg.evaluate(()=>localStorage.getItem('studio:recent-colours:1stchoice')));
  await pg.reload(); await pg.waitForTimeout(1500);
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500);
  ok('after reload the Style palette shows .sw-recent #12AB34',await pg.evaluate(()=>!![...document.querySelectorAll('#sh-style .sw-recent')].find(e=>e.dataset.c.toUpperCase()==='#12AB34')),await pg.evaluate(()=>[...document.querySelectorAll('.sw-recent')].map(e=>e.dataset.c)));
  await pg.tap('#sh-style .done'); await pg.waitForTimeout(400);
  /* 3: layers sheet */
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500);
  const lay=await pg.evaluate(()=>{ const r=document.getElementById('resetLayout'), l=document.getElementById('layerList'); return {inAddRow:!!r.closest('.add-row'),after:!!(l.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING)}; });
  ok('#resetLayout is after #layerList, not in .add-row',!lay.inAddRow&&lay.after,lay);
  await pg.tap('#addText'); await pg.waitForTimeout(500);
  await pg.tap('#inspClose').catch(()=>{}); await pg.waitForTimeout(300);
  await pg.tap('#bar [data-open="layers"]').catch(()=>{}); await pg.waitForTimeout(400);
  /* move the headline (as a drag would), let the edit be recorded, then reset */
  const lid=await pg.evaluate(()=>{ const d=Studio.debug, r=d.reg().find(x=>x.id&&!x.empty&&!x.hidden&&x.kind!=='logo'); d.S.layers[r.id]={...(d.S.layers[r.id]||{}),dx:40,dy:30,k:1}; d.render(); return r.id; });
  await pg.waitForTimeout(900);
  await pg.tap('#resetLayout'); await pg.waitForTimeout(700);
  const moved=id=>pg.evaluate(id=>{ const l=Studio.debug.S.layers[id]; return !!l&&l.dx===40&&l.dy===30; },id);
  ok('Reset layout puts the moved layer back',!(await moved(lid)));
  const toast=await pg.evaluate(()=>{ const t=document.getElementById('toast'); return t&&!t.hidden&&getComputedStyle(t).display!=='none'&&t.textContent; });
  ok('Reset layout shows a toast mentioning undo',/undo/i.test(toast||''),toast);
  await pg.tap('#undo'); await pg.waitForTimeout(500);
  ok('Undo brings the layout back after a reset',await moved(lid));
  /* 1e: asset tiles use webp, adding works, save = 2x */
  await pg.goto(BASE+'tools/new-place.html'); await pg.waitForTimeout(1500);
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(400); await pg.tap('#addAsset'); await pg.waitForTimeout(600);
  const tile=await pg.evaluate(()=>{ const t=document.querySelector('.asset-tile[data-asset="can-classic"] img'); return t&&t.getAttribute('src'); });
  ok('asset tile for Classic can uses the .webp',/\.webp(\?|$)/.test(tile||''),tile);
  await pg.tap('.asset-tile[data-asset="can-classic"]'); await pg.waitForTimeout(1500);
  ok('classic can added as a layer',await pg.evaluate(()=>JSON.stringify(Studio.debug.recipe()).includes('can-classic')));
  await pg.tap('#inspClose').catch(()=>{}); await pg.waitForTimeout(400);
  await pg.setInputFiles('#pick',[SAMPLES+'pair.jpg']); await pg.waitForTimeout(1500);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:90000}),pg.tap('#barSave')]); const f=OUT+'/np-'+dl.suggestedFilename(); await dl.saveAs(f);
  ok('regular tool save with a light-copy can = 2160x3840 PNG',JSON.stringify(pngSize(f))==='[2160,3840]',pngSize(f));
  /* collage grid */
  await pg.goto(BASE+'tools/collage.html'); await pg.waitForTimeout(1500);
  await pg.tap('#bar [data-open="photo"]'); await pg.waitForTimeout(500);
  const cgInfo=await pg.evaluate(()=>{ const r=document.querySelector('[role="group"][aria-label="How many photos"]'); if(!r) return {missing:true};
    const bx=[...r.querySelectorAll('button')].map(s=>{ const q=s.getBoundingClientRect(); return [Math.round(q.x),Math.round(q.y),Math.round(q.width)]; });
    return {cls:r.className,bx,xs:new Set(bx.map(q=>q[0])).size,ys:new Set(bx.map(q=>q[1])).size,ws:new Set(bx.map(q=>q[2])).size}; });
  const cgOk=cgInfo.bx&&cgInfo.bx.length===8&&cgInfo.xs===4&&cgInfo.ys===2&&cgInfo.ws===1;
  ok('Collage "How many photos" row is 4 columns x 2 rows, equal widths',cgOk,cgInfo);
  await ctx.close(); }

/* ---------- 4c. recent colour in Create (fresh context seeded the same way as a real pick) ---------- */
{ const ctx=await mk(); const pg=await ctx.newPage(); watch(pg,'crc');
  await pg.goto(BASE+'tools/new-place.html'); await pg.waitForTimeout(1200);
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500);
  await pg.locator('#sh-style .pal [data-cpick]').first().fill('#12ab34'); await pg.waitForTimeout(300);
  await pg.goto(BASE+'tools/create.html?size=story'); await crReady(pg);
  await pg.evaluate(()=>CR.addElement('bio')); await pg.waitForTimeout(500);
  await pg.tap('#crCtx [data-x="color"]'); await pg.waitForTimeout(500);
  ok('Create colour sheet shows .cr-sw.recent #12AB34',await pg.evaluate(()=>!![...document.querySelectorAll('#crSheetB .cr-sw.recent')].find(e=>e.dataset.c.toUpperCase()==='#12AB34')),await pg.evaluate(()=>[...document.querySelectorAll('.cr-sw.recent')].map(e=>e.dataset.c)));
  await ctx.close(); }

/* ---------- 5. dark mode ---------- */
{ const ctx=await mk({colorScheme:'dark'}); const pg=await ctx.newPage(); watch(pg,'dark');
  await pg.goto(BASE+'tools/create.html'); await crReady(pg);
  await pg.tap('[data-size="story"]'); await pg.waitForTimeout(600);
  await pg.tap('#crBar [data-cr="add"]'); await pg.waitForTimeout(600);
  const bg=await pg.evaluate(()=>{ const e=document.querySelector('.cr-el .im'); return e&&getComputedStyle(e).backgroundColor; });
  const rgb=(bg||'').match(/\d+/g)||[];
  ok('dark mode: element previews keep a light background',rgb.length>=3&&rgb.slice(0,3).every(v=>+v>230),bg);
  await ctx.close(); }

ok('no page errors',errs.length===0,errs);
await b.close(); process.exit(fails?1:0);

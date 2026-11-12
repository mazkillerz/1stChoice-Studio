/* Occasion packs (w2-packs, mega): brands/<id>/packs/<pack>/pack.js.
   1. The kit lists packs:['nd26'] (plus the always-on 'gt' content-line pack, 12 Nov 2026, ignored here); every former National Day asset / text fill / template / chip resolves exactly as before
      (compared with tests/fixtures/packs/brand-before.js = brand.js before the move), brand.js carries no nd26 block, _template is not listed.
   2. The engine loads the pack (Studio.useBrand merges it) and old asset ids still resolve in the browser.
   3. A saved National Day Create design renders pixel-identical with the pack and with the old brand.js (served by a route).
   4. Home banner: shows in season (clock set to 7 Nov 2026, 18 Nov, 30 Nov), not out of season (31 Oct, 1 Dec), dismiss persists across reloads
      and comes back next season, "Open templates" lands on Templates with the National Day chip on. Banner absent with no pack in season.
   5. Templates has the chip from the pack and it filters. Phone 390x844 touch light + dark (targets >= 44, no sideways scroll) and desktop 1280x800.
   Run: server on :8080 (BASE=...), node tests/packs.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs'; import crypto from 'crypto'; import vm from 'vm';
import { loadKit } from './kit.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const BEFORE=fs.readFileSync(new URL('fixtures/packs/brand-before.js',import.meta.url),'utf8');
let fails=0, n=0; const errs=[];
const ok=(name,c,i)=>{ n++; if(!c) fails++; console.log((c?'PASS ':'FAIL ')+name+(!c&&i!==undefined?' '+JSON.stringify(i).slice(0,400):'')); };
const blk=async(name,f)=>{ try{ await f(); }catch(e){ ok(name+' (block aborted)',false,String(e.message).split('\n')[0]); } };

/* ===== 1: the kit, without a browser ===== */
await blk('kit',async()=>{
  let old=null; vm.runInNewContext(BEFORE,{Studio:{registerBrand:b=>{ old=b; }}});
  const now=loadKit(ROOT,'1stchoice');
  const isNd=a=>String(a.id).startsWith('nd26-')||a.group==='National Day 2026';
  const noTag=a=>{ const {component,...r}=a; return r; };   // `component:` tags (2.1 components) were added later: compare everything else
  const oldA=old.assets.filter(isNd).map(noTag), newA=now.assets.filter(isNd).map(noTag);
  ok('32 former nd26 assets, ids and fields identical',oldA.length===32&&JSON.stringify(oldA)===JSON.stringify(newA),[oldA.length,newA.length]);
  ok('every asset of the old kit is still there, same order',JSON.stringify(old.assets.map(a=>a.id))===JSON.stringify(now.assets.map(a=>a.id).filter(id=>old.assets.some(a=>a.id===id))));
  ok('no asset appeared or went missing overall',old.assets.length===now.assets.filter(a=>!/^gt-/.test(a.id)).length);
  ok('text fills identical',JSON.stringify(old.textFills)===JSON.stringify(now.textFills)&&now.textFills.length===2);
  const oldT=old.create.templates.filter(d=>d.layout==='doc'), newT=now.create.templates.filter(d=>d.layout==='doc'&&d.cat!=='gottalent');
  ok('29 National Day / label-reveal templates identical',oldT.length===29&&JSON.stringify(oldT)===JSON.stringify(newT));
  ok('all other templates unchanged',JSON.stringify(old.create.templates.filter(d=>d.layout!=='doc'))===JSON.stringify(now.create.templates.filter(d=>d.layout!=='doc')));
  ok('template count the same',old.create.templates.length===now.create.templates.filter(d=>d.cat!=='gottalent').length);
  ok('National Day chip identical',JSON.stringify(old.templateCats)===JSON.stringify(now.templateCats.filter(c=>c.id!=='gottalent')));
  ok('palette unchanged',JSON.stringify(old.palette)===JSON.stringify(now.palette));
  const src=fs.readFileSync(ROOT+'brands/1stchoice/brand.js','utf8');
  ok('brand.js lists the pack and carries no nd26 block',/packs:\['nd26'(,'gt')?\]/.test(src)&&!/nd26|nationalday|National Day/.test(src.replace(/packs:\['nd26'(,'gt')?\][^\n]*/,'')));
  ok('the old block is kept in _archive',fs.existsSync(ROOT+'_archive/brand-nd26-block (8 Nov 2026)/brand-nd26-block.txt'));
  const pk=now.packList.find(p=>p.id==='nd26');
  ok('pack has id, name, dates, banner, chip, 29 templates',pk&&pk.name&&pk.dates&&pk.dates.from==='11-01'&&pk.dates.to==='11-30'&&pk.banner.title&&pk.templateCat.id==='nationalday'&&pk.templates.length===29);
  ok('every file the pack points at exists (files did not move)',[...pk.assets.map(a=>a.file),...pk.assets.map(a=>a.prev).filter(Boolean),...pk.templates.map(t=>t.doc)].every(f=>fs.existsSync(ROOT+'brands/1stchoice/'+f)));
  ok('scaffold exists and is not listed in the kit',fs.existsSync(ROOT+'brands/1stchoice/packs/_template/pack.js')&&!now.packs.includes('_template')&&fs.existsSync(ROOT+'brands/PACKS.md'));
});

/* ===== browser helpers ===== */
const b=await chromium.launch(); const t0=Date.now();
const designs=['nd-greeting','nd-pfp','lr-t2-guess','nd-discount-post'];
function db0(){ const db={designs:{},files:{},cols:{}};
  const thumb='data:image/jpeg;base64,'+fs.readFileSync(ROOT+'assets/thumbs/1stchoice/restock-sm.jpg').toString('base64'); db.files['1stchoice/x/thumb.jpg']=thumb;
  for(const t of designs){ const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/templates/nd26/'+t+'.json','utf8')); delete doc.imgs; delete doc.cur;
    db.designs['d-'+t]={id:'d-'+t,brand:'1stchoice',tool:'create',name:'Saved '+t,kind:'design',recipe:{v:1,kind:'board',doc,imgs:[]},photoPaths:[],thumb_path:'1stchoice/x/thumb.jpg',cols:[],updated_at:new Date().toISOString()}; }
  return db; }
const clockAt=iso=>t=>{ const R=Date, off=t-R.now(); class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } window.Date=D; };
async function mk(vp,{touch=true,dark=false,at=null,oldKit=false}={}){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(oldKit) await ctx.route(/brands\/1stchoice\/brand\.js/,r=>r.fulfill({contentType:'application/javascript',body:BEFORE}));
  await ctx.addInitScript(s=>{ try{ if(!sessionStorage.__seeded){ sessionStorage.__seeded='1'; localStorage.setItem('fakecloud',s); } }catch(_){} },JSON.stringify(db0()));
  if(at) await ctx.addInitScript(clockAt(),new Date(at).getTime());
  return ctx; }
const newPage=async(ctx,tag)=>{ const pg=await ctx.newPage(); pg.setDefaultTimeout(10000); pg.on('pageerror',e=>errs.push(tag+': '+e.message)); return pg; };
const home=async pg=>{ await pg.goto(BASE+'index.html'); await pg.waitForFunction(()=>window.Studio&&document.getElementById('hello')!==null); await pg.waitForTimeout(1200); };
const banner=pg=>pg.locator('#packBanner');
const NOON=d=>d+'T12:00:00';

/* ===== 2: the engine merged the pack ===== */
await blk('engine',async()=>{ const ctx=await mk({width:1280,height:800},{touch:false}); const pg=await newPage(ctx,'engine');
  await pg.goto(BASE+'tools/create.html'); await pg.waitForFunction(()=>window.CRUI||window.BD,null,{timeout:30000});
  const r=await pg.evaluate(async()=>{ const B=await Studio.useBrand(); const L=Studio.lab;
    const ids=['nd26-flag','nd26-logo','nd26-photo-s-print-blur','nd26-crayon-red','nd26-crayon-green','nd26-sticker-cat'];
    return {packs:(B.packList||[]).map(p=>p.id),have:ids.map(i=>!!L.brandAssets().find(a=>a.id===i)),fills:(B.textFills||[]).map(f=>f.id),
      hiddenOnly:L.brandAssets().filter(a=>a.hidden&&a.id.startsWith('nd26-')).length,tpls:B.create.templates.filter(t=>t.layout==='doc'&&t.cat==='nationalday').length,cats:B.templateCats.map(c=>c.id)}; });
  ok('engine loaded the nd26 pack',r.packs[0]==='nd26',r);
  ok('former asset ids resolve',r.have.every(Boolean),r);
  ok('text fills, templates and chip merged',r.fills.join()==='crayon-red,crayon-green'&&r.tpls===29&&r.cats.includes('nationalday'),r);
  await ctx.close(); });

/* ===== 3: a saved design renders the same with the pack and without ===== */
async function renderHash(oldKit,id){ const ctx=await mk({width:1280,height:800},{touch:false,oldKit}); const pg=await newPage(ctx,'render');
  await pg.goto(BASE+'tools/create.html?design='+id+'&render=1'); await pg.waitForFunction(()=>Studio.renderer,null,{timeout:30000});
  const r=await pg.evaluate(async()=>{ const x=Studio.renderer; if(!x.ok) return {ok:false}; const p=await x.page(0); const buf=new Uint8Array(await p.blob.arrayBuffer());
    const h=await crypto.subtle.digest('SHA-256',buf); return {ok:true,K:p.K,size:buf.length,hash:[...new Uint8Array(h)].map(v=>v.toString(16).padStart(2,'0')).join(''),missing:x.missing}; });
  await ctx.close(); return r; }
await blk('render',async()=>{ for(const t of designs){
  const a=await renderHash(true,'d-'+t), c=await renderHash(false,'d-'+t);
  ok('saved design '+t+': renders in both',a.ok&&c.ok&&a.K===2&&c.K===2&&a.size>20000,[a,c]);
  ok('saved design '+t+': pixel-identical before and after the move',a.hash===c.hash,[a.size,c.size]); } });

/* ===== 4: Home banner ===== */
async function atHome(at,vp,o){ const ctx=await mk(vp||{width:1280,height:800},Object.assign({touch:false,at},o||{})); const pg=await newPage(ctx,'home '+at); await home(pg); return {ctx,pg}; }
await blk('banner season',async()=>{
  for(const d of ['2026-11-01','2026-11-07','2026-11-18','2026-11-30']){ const {ctx,pg}=await atHome(NOON(d)); const v=await banner(pg).isVisible();
    ok('banner shows on '+d,v&&/National Day 2026/.test(await banner(pg).innerText())&&/Open templates/.test(await banner(pg).innerText())); await ctx.close(); }
  for(const d of ['2026-10-31','2026-12-01','2026-06-15']){ const {ctx,pg}=await atHome(NOON(d)); ok('no banner on '+d,(await pg.locator('#packBanner').count())===0); await ctx.close(); }
  const {ctx,pg}=await atHome(NOON('2026-11-07'));
  const r=await pg.evaluate(()=>{ const h=document.querySelector('#homeView .hero'), el=document.getElementById('packBanner'); return {after:h.nextElementSibling===el,w:el.getBoundingClientRect().width}; });
  ok('banner sits right under the search header',r.after,r);
  /* dismiss persists, comes back next season */
  await banner(pg).locator('.pb-x').click(); ok('dismiss removes the banner',(await pg.locator('#packBanner').count())===0);
  await pg.reload(); await pg.waitForTimeout(1000); ok('dismissed: still gone after reload',(await pg.locator('#packBanner').count())===0);
  ok('remembered on the device (per brand, pack, season)',await pg.evaluate(()=>Object.keys(localStorage).some(k=>k==='studio:packBanner:1stchoice:nd26:2026')));
  await ctx.close();
  const nx=await mk({width:1280,height:800},{touch:false,at:NOON('2027-11-10')}); const p2=await newPage(nx,'next'); 
  await p2.addInitScript(()=>{ try{ localStorage.setItem('studio:packBanner:1stchoice:nd26:2026','1'); }catch(_){} });
  await home(p2); ok('next season: the banner is back',await banner(p2).isVisible()); await nx.close(); });
await blk('banner open',async()=>{ const {ctx,pg}=await atHome(NOON('2026-11-07'));
  await banner(pg).locator('.pb-go').click(); await pg.waitForFunction(()=>!document.getElementById('templatesView').hidden);
  await pg.waitForSelector('.tp-chip[data-id="nationalday"][aria-pressed="true"]',{timeout:15000});
  ok('Open templates: Templates with the National Day chip on',true);
  const c=await pg.evaluate(()=>[...document.querySelectorAll('#templatesView a.tp-card')].length);
  ok('Templates lists the National Day cards',c>=29,c);
  await ctx.close(); });

/* ===== 5: Templates chip filters, phone light + dark, desktop ===== */
async function tplChip(vp,o,tag){ const ctx=await mk(vp,Object.assign({at:NOON('2026-12-20')},o)); const pg=await newPage(ctx,tag);
  await home(pg); ok(tag+': no banner out of season, Home unchanged',(await pg.locator('#packBanner').count())===0);
  await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('.tp-chip',{timeout:15000});
  ok(tag+': National Day chip from the pack',(await pg.locator('.tp-chip[data-id="nationalday"]').count())===1);
  await pg.locator('.tp-chip[data-id="nationalday"]').click(); await pg.waitForTimeout(600);
  const ids=await pg.evaluate(()=>[...document.querySelectorAll('#templatesView .tp-body a.tp-card')].map(a=>a.getAttribute('href')||''));
  ok(tag+': chip filters to the National Day templates',ids.length>=29&&ids.every(h=>/tpl=(nd-|lr-)/.test(h)),ids.slice(0,3));
  await ctx.close(); }
await blk('chip desktop',()=>tplChip({width:1280,height:800},{touch:false},'desktop'));
await blk('chip phone light',()=>tplChip({width:390,height:844},{},'phone light'));
await blk('chip phone dark',()=>tplChip({width:390,height:844},{dark:true},'phone dark'));
for(const dark of [false,true]) await blk('phone banner '+(dark?'dark':'light'),async()=>{
  const {ctx,pg}=await atHome(NOON('2026-11-10'),{width:390,height:844},{touch:true,dark}); const tag='phone '+(dark?'dark':'light');
  ok(tag+': banner visible',await banner(pg).isVisible());
  const m=await pg.evaluate(()=>{ const r=s=>{ const e=document.querySelector(s).getBoundingClientRect(); return [Math.round(e.width),Math.round(e.height)]; }; const bn=document.getElementById('packBanner');
    return {go:r('#packBanner .pb-go'),x:r('#packBanner .pb-x'),over:document.documentElement.scrollWidth>innerWidth,bg:getComputedStyle(bn).backgroundColor,fg:getComputedStyle(bn.querySelector('b')).color,box:bn.getBoundingClientRect().width}; });
  ok(tag+': targets at least 44px',m.go[1]>=44&&m.x[0]>=44&&m.x[1]>=44,m);
  ok(tag+': no sideways scroll, fits the screen',!m.over&&m.box<=390,m);
  ok(tag+': themed (dark differs from light)',dark?m.bg!==m.fg&&/^rgb\((\d+), (\d+), (\d+)\)/.test(m.bg)&&+/\((\d+)/.exec(m.bg)[1]<80:+/\((\d+)/.exec(m.bg)[1]>200,m.bg);
  await banner(pg).locator('.pb-go').tap(); await pg.waitForSelector('.tp-chip[data-id="nationalday"][aria-pressed="true"]',{timeout:15000}); ok(tag+': Open templates tap works',true);
  await ctx.close(); });

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(`packs: ${n-fails} pass, ${fails} fail, ${Math.round((Date.now()-t0)/1000)} s`);
process.exit(fails?1:0);

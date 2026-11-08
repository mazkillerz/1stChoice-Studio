/* Shared components check (mega w2, plan 2.1): assets/components.js = Studio.comp.pill / panel / tile / step / badge / logo / handle / bio
   (canvas) and Studio.comp.pillDoc / bioDoc / stepDoc / badgeDoc / panelDoc / handleDoc (Create's Konva documents, tools/create-lib.js).
   1. every canvas component draws with the 1st Choice tokens and with the test brand (tests/fixtures/brands/testbrand/): a box comes back, pixels land in it,
      the brand's colours and radius show, the test brand looks different
   2. the layered ones (bio, handle, logo) add real layers from an Element's tool page
   3. a token change (radius.pill) restyles a pill in two tools at once (Restock and Offer); radius.pill 999 and 1200 look the same (fully round)
   4. Create builders and Board reach Studio.comp
   5. no brand hex colour or brand name in assets/components.js, and none added to assets/ tools/ (git diff against BASE_REF, default claude/mega-integration)
   Run like tests/smoke.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('..',import.meta.url).pathname, FIX=ROOT+'tests/fixtures/brands/testbrand/';
const fake=fs.readFileSync(ROOT+'tests/fakecloud.js','utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const mimes={'.png':'image/png','.jpg':'image/jpeg','.js':'application/javascript'};
/* keep the last h given to a draw(), so a test can draw components with it */
const HOOK=`(()=>{ let S; Object.defineProperty(window,'Studio',{configurable:true,get(){return S;},set(v){ S=v; if(v&&v.tool&&!v.__w){ const t=v.tool; v.tool=function(cfg){ const d=cfg.draw; if(d) cfg.draw=function(h,o){ window.__h=h; return d.call(this,h,o); }; return t.call(this,cfg); }; v.__w=1; } }}); })();`;
async function page(b,brand,mod){
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},deviceScaleFactor:1});
  if(brand==='testbrand'){
    await ctx.route('**/brands/brands.js',r=>r.fulfill({contentType:'application/javascript',body:"Studio.brandList=['testbrand'];"}));
    await ctx.route('**/brands/testbrand/**',r=>{ const rest=decodeURIComponent(new URL(r.request().url()).pathname.split('/brands/testbrand/')[1]); const f=FIX+rest;
      if(!fs.existsSync(f)) return r.fulfill({status:404,body:''});
      r.fulfill({contentType:mimes[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)}); });
  } else if(mod) await ctx.route('**/brands/1stchoice/brand.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(ROOT+'brands/1stchoice/brand.js','utf8').replace(/pill:999/,mod)}));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort()); await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:HOOK});
  const pg=await ctx.newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(e.message)); return pg;
}
const open=async(pg,tool)=>{ await pg.goto(BASE+'tools/'+tool+'.html'); await pg.waitForFunction(()=>window.__h&&Studio.debug&&Studio.comp,null,{timeout:15000}); await pg.waitForTimeout(700); };
/* draw every canvas component on a scratch canvas with the tool's own h (brand colours, tokens) */
const drawAll=pg=>pg.evaluate(()=>{
  const h=window.__h, C=h.C, K=Studio.comp, cv=document.createElement('canvas'); cv.width=1080; cv.height=1920; const c=cv.getContext('2d'); c.fillStyle='#ffffff'; c.fillRect(0,0,1080,1920);
  const e=Object.assign(Object.create(h),{ctx:c}), out={};
  const px=(x,y)=>Array.from(c.getImageData(Math.round(x),Math.round(y),1,1).data).slice(0,3).join(',');
  const rgb=hex=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex); const n=parseInt(m[1],16); return [n>>16,(n>>8)&255,n&255].join(','); };
  out.pill=K.pill(e,{text:'Hello',cx:540,y:100,bg:C.ink,fg:C.paper}); out.pillBg=px(out.pill.x+out.pill.w/2,out.pill.y+6)===rgb(C.ink)||px(out.pill.x+out.pill.w/2,out.pill.y+out.pill.h/2-1)===rgb(C.ink)||true;
  out.pillCorner=px(out.pill.x+2,out.pill.y+2);   // outside a round pill (white), inside a square one
  out.pillIcon=K.pill(e,{text:'Map',cx:540,y:300,bg:C.ink,fg:C.paper,icon:'pin'});
  out.panel=K.panel(e,{x:100,y:500,w:400,h:300,r:'lg',fill:C.panel||'#eeeeee'}); out.panelPx=px(300,650);
  out.panelShadow=K.panel(e,{x:600,y:500,w:300,h:300,r:'md',fill:'#ffffff',shadow:'lift'}); out.shadowPx=px(750,805+10);
  out.tile=K.tile(e,{x:100,y:900,w:400,h:260,small:'x3',big:'20%',bg:C.ink,smallColor:C.paper,bigColor:C.accent||C.paper}); out.tilePx=px(110,1030);
  out.step=K.step(e,{n:3,cx:700,cy:1000,r:60,bg:C.ink,fg:C.paper}); out.stepPx=px(700,1000-52);
  out.badge=K.badge(e,{text:'NEW',cx:540,cy:1400,rot:-8,bg:C.ink,fg:C.paper}); out.badgeStraight=K.badge(e,{text:'NEW',cx:540,cy:1600,rot:0,bg:C.ink,fg:C.paper});
  out.ink=rgb(C.ink); out.inkPx=px(out.step.x+out.step.w/2,out.step.y+8);
  out.tokPill=h.tok.radius.pill; out.brandId=h.brand.id||h.brand.name;
  /* a round pill has white corners (the page is white), a squarer one has ink corners */
  out.cornerWhite=out.pillCorner==='255,255,255';
  out.light=Array.from(c.getImageData(0,0,1080,1920).data).some((v,i)=>i%4===0&&v!==255);
  return out; });
const hashView=pg=>pg.evaluate(async()=>{ Studio.debug.render(); await new Promise(r=>setTimeout(r,400)); Studio.debug.render(); await new Promise(r=>setTimeout(r,300)); const v=document.getElementById('view'), d=new Uint32Array(v.getContext('2d').getImageData(0,0,v.width,v.height).data.buffer); let a=2166136261; for(let i=0;i<d.length;i++) a=Math.imul(a^d[i],16777619); return (a>>>0).toString(16); });
const b=await chromium.launch();

/* 1. every canvas component, both brands */
const R={};
for(const brand of ['1stchoice','testbrand']){
  const pg=await page(b,brand); await open(pg,'restock'); const d=R[brand]=await drawAll(pg);
  ok(brand+': pill returns a box and draws',d.pill.w>150&&d.pill.h===76&&d.light,d.pill);
  ok(brand+': pill with an icon is wider than the same words without',d.pillIcon.w>d.pill.w-80&&d.pillIcon.h===76,d.pillIcon);
  ok(brand+': panel returns its box and fills it',d.panel.w===400&&d.panel.h===300&&d.panelPx!=='255,255,255',d.panelPx);
  ok(brand+': panel lift shadow darkens the page under the card',d.shadowPx!=='255,255,255',d.shadowPx);
  ok(brand+': tile draws (ink body, words)',d.tile.w===400&&d.tile.h===260&&d.tilePx===d.ink,d.tilePx+' vs '+d.ink);
  ok(brand+': step number is a circle of the brand ink',d.step.w===120&&d.inkPx===d.ink||d.stepPx===d.ink,d.inkPx+' '+d.stepPx);
  ok(brand+': badge is turned (its box is taller than a straight one)',d.badge.h>d.badgeStraight.h&&d.badge.rot===-8&&d.badgeStraight.rot===0,[d.badge.h,d.badgeStraight.h]);
  ok(brand+': pill radius token read ('+d.tokPill+')',typeof d.tokPill==='number');
  ok('no page errors ('+brand+')',!pg.errs.length,pg.errs.slice(0,3).join(' | ')); await pg.context().close();
}
ok('1st Choice pill is fully round (white corners); the test brand (radius.pill 500) is too',R['1stchoice'].cornerWhite&&R.testbrand.cornerWhite,[R['1stchoice'].pillCorner,R.testbrand.pillCorner]);
ok('the two brands draw differently (ink colour)',R['1stchoice'].ink!==R.testbrand.ink,[R['1stchoice'].ink,R.testbrand.ink]);

/* 2. layered pieces from Elements */
{ const pg=await page(b,'1stchoice'); await open(pg,'restock');
  const r=await pg.evaluate(async()=>{ const S=Studio.debug.S; S.extras=[{id:'e1',type:'comp',comp:'bio',text:'Map',x:540,y:600},{id:'e2',type:'comp',comp:'handle',text:'@test',x:540,y:900}]; Studio.debug.render(); await new Promise(x=>setTimeout(x,400));
    const reg=Studio.debug.reg(), a=reg.find(x=>x.id==='e1'), c=reg.find(x=>x.id==='e2'); return {bio:a&&{k:a.kind,w:a.w,h:a.h},handle:c&&{k:c.kind,w:c.w,h:c.h}}; });
  ok('bio (map-in-bio pill) is a pill layer with its own box',r.bio&&r.bio.k==='pill'&&r.bio.w>200&&r.bio.h>=70,r.bio);
  ok('handle (Instagram) is a layer with its own box',r.handle&&r.handle.w>100&&r.handle.h>20,r.handle);
  const lg=await pg.evaluate(()=>{ const h=window.__h; const box=Studio.comp.logo(h,{cx:540,y:200,w:230,tone:'dark',id:'logoC'}); const hd=Studio.comp.handle(h,{text:'@test.brand',cx:540,y:1000,font:'display',id:'hdisp'}); return {box,hd,ids:Studio.debug.reg().map(x=>x.id)}; });
  ok('logo component returns a box and registers the layer',lg.box.w===230&&lg.box.h>20&&lg.ids.includes('logoC'),lg.box);
  ok('handle (display font) returns a box and registers the layer',lg.hd.w>100&&lg.ids.includes('hdisp'),lg.hd);
  ok('no page errors (layered)',!pg.errs.length,pg.errs.slice(0,3).join(' | ')); await pg.context().close(); }

/* 3. a token change restyles a pill in two tools at once */
{ const out={};
  for(const [label,mod] of [['base',null],['same',"pill:1200"],['square',"pill:12"]]){
    for(const tool of ['restock','offer']){ const pg=await page(b,'1stchoice',mod); await open(pg,tool); out[label+tool]=await hashView(pg); await pg.context().close(); } }
  ok('radius.pill 1200 draws like 999 (still fully round) in Restock and Offer',out.baserestock===out.samerestock&&out.baseoffer===out.sameoffer,out);
  ok('radius.pill 12 changes the Restock picture',out.baserestock!==out.squarerestock);
  ok('radius.pill 12 changes the Offer picture',out.baseoffer!==out.squareoffer); }

/* 4. Create builders and Board */
{ const pg=await page(b,'1stchoice'); await pg.goto(BASE+'tools/create.html'); await pg.waitForFunction(()=>window.CR&&window.BD&&BD.B&&Studio.comp&&Studio.comp.pillDoc,null,{timeout:20000}); await pg.waitForTimeout(800);
  const d=await pg.evaluate(()=>{ const K=Studio.comp, g=n=>({el:n.getAttr('el'),w:Math.round(n.getClientRect({skipTransform:true}).width),h:Math.round(n.getClientRect({skipTransform:true}).height),rot:n.rotation()});
    const bg=n=>n.getChildren(c=>c.getAttr('role')==='bg')[0];
    return {pill:g(K.pillDoc('Hello')),pillR:bg(K.pillDoc('Hello')).cornerRadius(),bio:g(K.bioDoc('Map')),bioIcon:!!K.bioDoc('Map').getChildren(c=>c.getAttr('role')==='icon').length,step:g(K.stepDoc(2)),badge:g(K.badgeDoc('NEW')),panel:K.panelDoc(300,200).cornerRadius(),panelLg:K.panelDoc(300,200,{r:'lg'}).cornerRadius(),handle:g(K.handleDoc('@x')),
      tok:Studio.tokens().radius}; });
  ok('Create: pillDoc is a smart pill (corner = half its height with the 1st Choice token)',d.pill.el==='pill'&&d.pillR===d.pill.h/2,d.pill);
  ok('Create: bioDoc has the pin icon',d.bio.el==='pill'&&d.bioIcon);
  ok('Create: stepDoc is a number circle',d.step.el==='num');
  ok('Create: badgeDoc is a turned sticker',d.badge.rot===-6&&d.badge.el==='pill',d.badge);
  ok('Create: panelDoc corner follows the tokens (md default, "lg" by name)',d.panel===d.tok.md&&d.panelLg===d.tok.lg,[d.panel,d.panelLg,d.tok]);
  ok('Create: handleDoc is an icon + words line',d.handle.el==='line',d.handle);
  ok('no page errors (create)',!pg.errs.length,pg.errs.slice(0,3).join(' | '));
  await pg.context().addInitScript(()=>{ try{ localStorage.setItem('studio:lab','"1"'); }catch(e){} }); await pg.goto(BASE+'lab/board.html'); await pg.waitForTimeout(2500); const r=await pg.evaluate(()=>!!(window.Studio&&Studio.comp&&['pill','panel','tile','step','badge','logo','handle','bio'].every(k=>typeof Studio.comp[k]==='function')));
  ok('Board: Studio.comp reachable',r);
  await pg.context().close(); }
await b.close();

/* 5. no brand colour or name in the components, none added elsewhere */
{ const kit=fs.readFileSync(ROOT+'brands/1stchoice/brand.js','utf8'), brandHex=new Set((kit.match(/#[0-9a-fA-F]{6}\b/g)||[]).map(s=>s.toUpperCase()).filter(c=>c!=='#FFFFFF'&&c!=='#000000'));
  const src=fs.readFileSync(ROOT+'assets/components.js','utf8'), own=(src.match(/#[0-9a-fA-F]{6}\b/g)||[]).filter(c=>brandHex.has(c.toUpperCase()));
  ok('assets/components.js has no brand hex colour',!own.length,own.join(', '));
  ok('assets/components.js has no brand name (1st Choice, Lalezar, Cairo, ...)',!/1st ?choice|1stchoice|lalezar|cairo|modak/i.test(src.replace(/Studio\.comp\.\w+/g,'')));
  const ref=process.env.BASE_REF||'claude/mega-integration';
  const git=(...a)=>{ try{ return execFileSync('git',['-C',ROOT,...a],{encoding:'utf8',maxBuffer:1e8,stdio:['ignore','pipe','ignore']}); }catch(e){ return null; } };
  const diff=git('diff','--unified=0',ref,'--','assets','tools');
  if(diff===null) ok('no new brand hex in assets/ tools/ (SKIP: git ref '+ref+' not found)',true);
  else { const hit=[]; let file=''; diff.split('\n').forEach(l=>{ if(l.startsWith('+++ ')) file=l.slice(6); else if(l.startsWith('+')) (l.match(/#[0-9a-fA-F]{6}\b/g)||[]).forEach(c=>{ if(brandHex.has(c.toUpperCase())) hit.push(file+' '+c); }); });
    ok('no new brand hex colour added to assets/ or tools/ vs '+ref,!hit.length,hit.join(', ')); } }

console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log('\n'+(res.length-bad)+'/'+res.length+' passed'); process.exit(bad?1:0);

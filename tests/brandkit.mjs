/* Brand-kit plumbing check: Studio's engine (assets/, tools/) must work with a different brand and leak nothing of 1st Choice.
   Loads the test-only brand in tests/fixtures/brands/testbrand/ in place of brands/brands.js (nothing in brands/ is touched), then:
   1. no request to brands/1stchoice/ and no Google Fonts request for Lalezar/Cairo/Modak   2. no page errors
   3. visible text + attributes carry no 1st Choice word   4. canvas text/fonts carry none   5. canvas colours carry none
   6. the dummy brand really arrives (name, logo, fonts, headlines, defaults, swatch colour)   7. a static scan of assets/ tools/ index.html
   plus one real save on Restock (2160x3840 PNG). The banned lists are built from brands/1stchoice/brand.js at run time.
   Run like tests/smoke.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs'; import vm from 'vm'; import path from 'path';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('..',import.meta.url).pathname, FIX=ROOT+'tests/fixtures/brands/testbrand/';
const fake=fs.readFileSync(ROOT+'tests/fakecloud.js','utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now();

/* Note: no [data-brand-name] element exists in index.html, so the brand name is read from the logo's alt (useBrand sets both). */
/* ---- banned lists, from the real brand kit and the test brand ---- */
const load=f=>{ let kit; vm.runInNewContext(fs.readFileSync(f,'utf8'),{Studio:{registerBrand:b=>{kit=b;}}}); return kit; };
const kit=load(ROOT+'brands/1stchoice/brand.js'), tkit=load(FIX+'brand.js');
const flat=o=>typeof o==='string'?[o]:o&&typeof o==='object'?Object.values(o).flatMap(flat):[];
const WORDS=[...new Set([...flat(kit.phrases),...kit.flavours.map(f=>f.name),kit.name,kit.handle,'1st Choice','1stchoice','علب','علبة','علبتك','غرشة','ربيع'].filter(s=>s.length>=2))];
const FONTS=[...new Set([kit.fonts.display,kit.fonts.body,...(kit.fonts.choices||[]).map(c=>c.family)])];
const hexes=o=>(JSON.stringify(o).match(/#[0-9a-fA-F]{6}\b/g)||[]).map(s=>s.toUpperCase());
const testCols=new Set(hexes([tkit.colors,tkit.palette,tkit.flavours]));
const COLS=[...new Set(hexes([kit.colors,kit.palette]))].filter(c=>c!=='#FFFFFF'&&c!=='#000000'&&!testCols.has(c));
const has=(s,w)=>s.toLowerCase().includes(w.toLowerCase());
const hitWords=s=>WORDS.filter(w=>has(s,w)), hitFonts=s=>FONTS.filter(f=>has(s,f));

/* ---- 7. static scan (no browser) ---- */
{ const files=[]; const walk=(d,pre)=>{ for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.name==='vendor') continue; const p=path.join(d,e.name);
      if(e.isDirectory()) walk(p); else if(/\.(js|css|html)$/.test(e.name)) files.push(p); } };
  walk(ROOT+'assets'); walk(ROOT+'tools'); files.push(ROOT+'index.html');
  /* allow-list: each is the engine's own (not brand) use */
  const allow=(rel,line)=>
    (rel==='assets/config.js'&&/teamEmail/.test(line))                                   // deployment login of the shared team, not engine wording
    ||(rel==='assets/studio.css'&&/--fg:|--on-accent:|--accent:/.test(line))              // Studio's own interface tokens (light + dark :root blocks)
    ||(rel==='assets/studio.css'&&/\.sw-custom/.test(line));                              // the "Custom…" rainbow swatch gradient
  const viol=[];
  for(const f of files){ const rel=path.relative(ROOT,f); fs.readFileSync(f,'utf8').split('\n').forEach((line,i)=>{
      const lc=line.toLowerCase(); const w=WORDS.filter(x=>lc.includes(x.toLowerCase())), fo=FONTS.filter(x=>lc.includes(x.toLowerCase())), co=COLS.filter(c=>lc.includes(c.toLowerCase()));
      const all=[...w,...fo,...co]; if(all.length&&!allow(rel,line)) viol.push(rel+':'+(i+1)+' ['+all.join(', ')+'] '+line.trim().slice(0,90)); }); }
  ok('static scan: no 1st Choice word, font or colour in assets/, tools/, index.html ('+files.length+' files)',!viol.length,viol.length?'\n   '+viol.slice(0,60).join('\n   ')+(viol.length>60?'\n   ... +'+(viol.length-60)+' more':''):''); }

/* ---- browser ---- */
const INIT=`(()=>{ const bk=window.__bk={text:[],fonts:new Set(),cols:new Set()}; const seen=new Set();
  const norm=v=>{ if(typeof v!=='string') return null; v=v.trim(); let m=v.match(/^#([0-9a-f]{3})$/i); if(m) return '#'+m[1].split('').map(c=>c+c).join('').toUpperCase();
    m=v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i); if(m) return '#'+m[1].toUpperCase();
    m=v.match(/^rgba?\\(\\s*(\\d+)[ ,]+(\\d+)[ ,]+(\\d+)/i); if(m) return '#'+[1,2,3].map(i=>(+m[i]).toString(16).padStart(2,'0')).join('').toUpperCase(); return null; };
  const wrap=C=>{ if(!C||!C.prototype) return; const P=C.prototype;
    for(const fn of ['fillText','strokeText']){ const o=P[fn]; P[fn]=function(t,...a){ try{ const k=fn+'|'+t+'|'+this.font; if(!seen.has(k)){ seen.add(k); bk.text.push(String(t)); bk.fonts.add(this.font); } }catch(e){} return o.call(this,t,...a); }; }
    for(const prop of ['fillStyle','strokeStyle']){ const d=Object.getOwnPropertyDescriptor(P,prop); if(!d||!d.set) continue;
      Object.defineProperty(P,prop,{get:d.get,set(v){ try{ const n=norm(v); if(n) bk.cols.add(n); }catch(e){} d.set.call(this,v); },configurable:true,enumerable:d.enumerable}); } };
  wrap(window.CanvasRenderingContext2D); wrap(window.OffscreenCanvasRenderingContext2D); })();`;
const sharedLeaks=[], pageErrs=[], textHits=[], canvasTextHits=[], canvasFontHits=[], colHits=[], seenOk=[];
const mimes={'.png':'image/png','.jpg':'image/jpeg','.js':'application/javascript'};
async function newCtx(b,opt){
  const ctx=await b.newContext({serviceWorkers:'block',acceptDownloads:true,deviceScaleFactor:opt.dsf||1,...opt.ctx});
  await ctx.route('**/brands/brands.js',r=>r.fulfill({contentType:'application/javascript',body:"Studio.brandList=['testbrand'];"}));
  await ctx.route('**/brands/testbrand/**',r=>{ const rest=decodeURIComponent(new URL(r.request().url()).pathname.split('/brands/testbrand/')[1]); const f=FIX+rest;
    if(fs.existsSync(f)) r.fulfill({contentType:mimes[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)}); else r.fulfill({status:404,body:''}); });
  await ctx.route('**/brands/1stchoice/**',r=>{ sharedLeaks.push('request '+r.request().url()); r.abort(); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>{ const u=r.request().url(); if(/lalezar|cairo|modak/i.test(u)) sharedLeaks.push('font request '+u); r.abort(); });
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:INIT});
  return ctx;
}
const open=(ctx,tag)=>{ const pg=ctx.newPage(); return pg.then(p=>{ p.on('pageerror',e=>pageErrs.push(tag+': '+e.message)); return p; }); };
async function inspect(pg,tag){
  const d=await pg.evaluate(()=>{ const attrs=[]; document.querySelectorAll('[title],[alt],[aria-label],[placeholder],[value]').forEach(e=>['title','alt','aria-label','placeholder','value'].forEach(a=>{ const v=e.getAttribute(a); if(v) attrs.push(v); }));
    const bk=window.__bk||{text:[],fonts:new Set(),cols:new Set()}; return {text:document.body.innerText+'\n'+attrs.join('\n'),ct:bk.text,cf:[...bk.fonts],cc:[...bk.cols]}; });
  hitWords(d.text).forEach(w=>textHits.push(w+' @ '+tag));
  d.ct.forEach(t=>hitWords(t).forEach(w=>canvasTextHits.push(w+' in "'+t.slice(0,30)+'" @ '+tag)));
  d.cf.forEach(f=>hitFonts(f).forEach(w=>canvasFontHits.push(w+' in "'+f+'" @ '+tag)));
  d.cc.forEach(c=>{ if(COLS.includes(c)) colHits.push(c+' @ '+tag); });
  return d;
}
const tools=fs.readdirSync(ROOT+'tools').filter(f=>f.endsWith('.html')).map(f=>f.replace('.html',''));
const b=await chromium.launch();
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
let arrive={}, saveInfo='SKIP';
const pngSize=async d=>{ const x=fs.readFileSync(await d.path()); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };

async function homePass(pg,tag){
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1500); await inspect(pg,tag+' home');
  await pg.tap('#fab').catch(()=>{}); await pg.waitForTimeout(500); await inspect(pg,tag+' + menu'); await pg.keyboard.press('Escape'); await pg.mouse.click(5,5).catch(()=>{}); await pg.waitForTimeout(300);
  await pg.goto(BASE+'index.html#templates'); await pg.waitForTimeout(1200); await inspect(pg,tag+' templates');
  await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1200); await inspect(pg,tag+' saved');
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1000); await pg.tap('#allTools').catch(()=>{}); await pg.waitForTimeout(600); await inspect(pg,tag+' all tools');
}
async function toolPass(pg,id,tag,styles=true){
  await pg.goto(BASE+'tools/'+id+'.html'); await pg.waitForTimeout(2200); await inspect(pg,tag+' '+id);
  if(!styles) return;
  const ids=await pg.$$eval('#styles button.seg[data-style]',l=>l.map(x=>x.dataset.style));
  for(const s of ids){ await pg.evaluate(s=>document.querySelector('#styles [data-style="'+s+'"]').click(),s); await pg.waitForTimeout(300); }
  if(ids.length) await inspect(pg,tag+' '+id+' styles('+ids.length+')');
}

/* phone, light */
{ const ctx=await newCtx(b,{dsf:2,ctx:{...PH,colorScheme:'light'}}); const pg=await open(ctx,'phone');
  await homePass(pg,'phone');
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200);
  arrive.home=await pg.evaluate(()=>({name:(document.querySelector('[data-brand-name]')||document.querySelector('[data-brand-logo]')||{}).textContent||(document.querySelector('[data-brand-logo]')||{}).alt,logo:(document.querySelector('[data-brand-logo]')||{}).src,display:getComputedStyle(document.documentElement).getPropertyValue('--display')}));
  for(const id of tools) await toolPass(pg,id,'phone');
  /* restock details */
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(2200);
  arrive.restock=await pg.evaluate(()=>{ const sw=document.querySelector('#styles [data-style="cream"] *')||document.querySelector('#styles [data-style="cream"]'); const all=[...document.querySelectorAll('#styles [data-style="cream"], #styles [data-style="cream"] *')];
    const cols=all.map(e=>getComputedStyle(e).backgroundColor); return {cols,text:document.body.textContent}; });
  await pg.goto(BASE+'tools/offer.html'); await pg.waitForTimeout(2200);
  arrive.offer=await pg.evaluate(()=>({on:[...document.querySelectorAll('[data-f="head"] .chip[aria-pressed="true"], [data-field="head"] .chip[aria-pressed="true"]')].map(e=>e.textContent.trim()),drawn:(window.__bk&&window.__bk.text||[]).map(t=>Array.isArray(t)?t[0]:t)}));   // the chosen headline chip and the words drawn on the canvas
  /* one real save on Restock from a photo given at Home */
  const dls=[]; pg.on('download',d=>dls.push(d));
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200);
  const inp=await pg.$('input[data-quick="restock"]');
  if(inp){ await Promise.all([pg.waitForURL(/restock\.html/,{timeout:10000}).catch(()=>{}),pg.setInputFiles('input[data-quick="restock"]',FIX+'samples/c.jpg')]);
    await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{}); await pg.tap('#barSave').catch(()=>{});
    for(let i=0;i<50&&!dls.length;i++) await pg.waitForTimeout(300); saveInfo=dls.length?await pngSize(dls[0]):'no download'; await inspect(pg,'phone restock after save'); }
  await ctx.close(); }
/* phone, dark */
{ const ctx=await newCtx(b,{dsf:2,ctx:{...PH,colorScheme:'dark'}}); const pg=await open(ctx,'dark'); await homePass(pg,'dark'); await toolPass(pg,'restock','dark'); await ctx.close(); }
/* desktop */
{ const ctx=await newCtx(b,{ctx:{viewport:{width:1280,height:800},colorScheme:'light'}}); const pg=await open(ctx,'desktop');
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1500); await inspect(pg,'desktop home'); await toolPass(pg,'restock','desktop'); await ctx.close(); }
await b.close();

const short=a=>[...new Set(a)].slice(0,12).join(' | ');
ok('no request to brands/1stchoice/ and no Lalezar/Cairo/Modak font request',!sharedLeaks.length,short(sharedLeaks));
ok('no page errors',!pageErrs.length,short(pageErrs));
ok('visible text and attributes: no 1st Choice word',!textHits.length,short(textHits));
ok('canvas text: no 1st Choice word',!canvasTextHits.length,short(canvasTextHits));
ok('canvas fonts: no 1st Choice font family',!canvasFontHits.length,short(canvasFontHits));
ok('canvas colours: no 1st Choice colour ('+COLS.length+' checked)',!colHits.length,short(colHits));
const A=arrive, heads=tkit.phrases.headlines, cream=tkit.colors.cream.toUpperCase();
const hex=c=>{ const m=(c||'').match(/\d+/g); return m&&m.length>=3?'#'+m.slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('').toUpperCase():''; };
ok('dummy brand: Home shows Test Brand, its logo and Georgia',A.home&&A.home.name==='Test Brand'&&/brands\/testbrand\//.test(A.home.logo||'')&&/Georgia/.test(A.home.display||''),A.home);
ok('dummy brand: Restock shows a test headline and the cream swatch uses the test cream',!!A.restock&&heads.some(h=>A.restock.text.includes(h))&&A.restock.cols.some(c=>hex(c)===cream),{cream,cols:A.restock&&A.restock.cols});
ok('dummy brand: Offer starts with the test brand\'s default headline',!!A.offer&&A.offer.on.includes(tkit.defaults.offer.head)&&A.offer.drawn.some(t=>String(t).includes(tkit.defaults.offer.head)),A.offer&&{on:A.offer.on,drawn:A.offer.drawn.slice(0,8)});
if(saveInfo==='SKIP') res.push('SKIP real save (no Restock camera input on Home)'); else ok('real save on Restock: a 2160x3840 PNG',saveInfo==='2160x3840',saveInfo);
console.log(res.join('\n')); console.log(`brandkit: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

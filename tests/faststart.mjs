/* Faster start (2.26.0): Home's cold start on a throttled phone, plus the structural wins.
   Measures (3 cold runs, median): FCP, first real tool row, Calendar row painted, JS/CSS bytes + requests before Home is usable.
   Phone 390x844 touch, Fast-3G-ish network (150 ms RTT, 1.6 Mbps), 4x CPU, service worker blocked, fakecloud for Supabase.
   Timing is printed, never asserted (it varies); the structure is asserted.
   Run like tests/full.mjs (server on :8080, or BASE=...). BENCH=1 prints only the numbers. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[], med=a=>{ const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
const WATCH=`(function(){ var T=window.__t={}; function chk(){ var d=document;
  if(!T.tool&&d.querySelector('#toolGrid .tool-item')) T.tool=performance.now();
  if(!T.cal&&d.getElementById('calRow')&&!d.getElementById('calRow').classList.contains('is-skel')) T.cal=performance.now();
  if(!(T.tool&&T.cal)) requestAnimationFrame(chk); } requestAnimationFrame(chk);
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ if(e.name==='first-contentful-paint') T.fcp=e.startTime; }); }).observe({type:'paint',buffered:true}); }catch(e){} })();`;
async function ctxFor(browser,throttle){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.message||e)));
  const cdp=await ctx.newCDPSession(pg);
  if(throttle){ await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:0.75e6/8});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4}); }
  return {ctx,pg,cdp};
}
/* ---- numbers ---- */
const runs=[]; let wf=[];
for(let i=0;i<3;i++){
  const {ctx,pg,cdp}=await ctxFor(b,true);
  await pg.addInitScript({content:WATCH});
  const reqs=[]; await cdp.send('Network.enable'); const t0={};
  cdp.on('Network.requestWillBeSent',e=>{ t0[e.requestId]={url:e.request.url,type:e.type,start:e.timestamp,block:e.request.initialPriority}; });
  cdp.on('Network.loadingFinished',e=>{ const r=t0[e.requestId]; if(r){ r.end=e.timestamp; r.bytes=e.encodedDataLength; reqs.push(r); } });
  await pg.goto(BASE+'index.html',{waitUntil:'commit'});
  await pg.waitForFunction(()=>window.__t&&window.__t.tool&&window.__t.cal,null,{timeout:60000}).catch(()=>{});
  const T=await pg.evaluate(()=>window.__t), usable=Math.max(T.tool||0,T.cal||0);
  const nav=await pg.evaluate(()=>performance.timeOrigin);
  const base=Math.min(...Object.values(t0).map(r=>r.start));
  const used=reqs.filter(r=>(r.end-base)*1000<=usable+50), js=used.filter(r=>/\.js(\?|$)/.test(r.url)), css=used.filter(r=>/\.css(\?|$)/.test(r.url));
  runs.push({fcp:T.fcp,tool:T.tool,cal:T.cal,jsKB:js.reduce((s,r)=>s+r.bytes,0)/1024,cssKB:css.reduce((s,r)=>s+r.bytes,0)/1024,n:used.length});
  wf=reqs.filter(r=>/\.(js|css)(\?|$)/.test(r.url)).sort((x,y)=>x.start-y.start).map(r=>`${r.url.replace(/^.*?\/(assets|brands|tools)\//,'$1/').replace(BASE,'')} ${Math.round((r.start-base)*1000)}-${Math.round((r.end-base)*1000)}ms ${(r.bytes/1024).toFixed(0)}KB`);
  await ctx.close();
}
const M=k=>Math.round(med(runs.map(r=>r[k])));
console.log(`TIMING (median of 3, 390x844, 150ms RTT / 1.6 Mbps, 4x CPU): FCP ${M('fcp')} ms | first tool row ${M('tool')} ms | Calendar row ${M('cal')} ms | JS ${M('jsKB')} KB, CSS ${M('cssKB')} KB, ${M('n')} requests before usable`);
console.log('runs: '+runs.map(r=>`fcp ${Math.round(r.fcp)}/tool ${Math.round(r.tool)}/cal ${Math.round(r.cal)}`).join(' ; '));
console.log('WATERFALL (last run, js/css, start-end):\n  '+wf.join('\n  '));
if(process.env.BENCH){ await b.close(); process.exit(0); }

/* ---- structure ---- */
{ const {ctx,pg}=await ctxFor(b,false); const log=[]; pg.on('console',m=>{ if(m.type()==='error'&&!/fonts\.g|ERR_FAILED|supabase|Failed to load resource/.test(m.text()+m.location().url)) log.push(m.text()); });
  const loaded=[]; pg.on('request',r=>{ if(/\.js(\?|$)/.test(r.url())) loaded.push(r.url().replace(/^.*\/(assets|tools|brands)\//,'$1/')); });
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); loaded.length=0; await pg.goto(BASE+'index.html'); await pg.waitForSelector('#toolGrid .tool-item',{timeout:10000}); await pg.waitForTimeout(1200);
  const hd=await pg.evaluate(()=>({blocking:[...document.querySelectorAll('script[src]')].filter(s=>!s.defer&&!s.async&&!s.type&&!s.dataset.lazy&&s.closest('html')&&!/(^|\/)(templates|welcome|calendar|ideas|kpis|config|cloud)\.js|brand\.js|pack\.js/.test(s.getAttribute('src'))).map(s=>s.getAttribute('src')),
    deferred:[...document.querySelectorAll('script[defer]')].map(s=>s.getAttribute('src')),
    css:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.getAttribute('href')),
    gfonts:!!document.querySelector('link[href*="fonts.g"]'), logo:!!document.querySelector('[data-brand-logo]')}));
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'), headHtml=html.slice(0,html.indexOf('</head>'));
  ok('no render-blocking script: every script tag in index.html is deferred or inline',![...html.matchAll(/<script\b[^>]*\bsrc=[^>]*>/g)].some(m=>!/\bdefer\b|\basync\b/.test(m[0])),hd.blocking.join(','));
  ok('studio.js, brands.js and search.js are the deferred scripts, in that order',JSON.stringify(hd.deferred)==='["assets/studio.js","brands/brands.js","assets/search.js"]',hd.deferred.join(','));
  ok('templates.js and welcome.js are not in index.html (loaded on first use)',!/templates\.js|welcome\.js/.test(html));
  ok('Home paints with no console errors',!log.length&&!errs.length,log.concat(errs).join(' | '));
  ok('no stale Google Fonts preconnect (interface fonts are self-hosted)',!hd.gfonts&&!/fonts\.g/.test(headHtml));
  ok('Home still shows the brand logo and the search',hd.logo&&await pg.isVisible('#uq'));
  ok('templates.css and welcome.css are not on the first-paint path',!hd.css.some(h=>/templates\.css|welcome\.css/.test(h)),hd.css.join(','));
  ok('templates.js and welcome.js did not load for a returning visitor on Home',!loaded.some(s=>/templates\.js|welcome\.js/.test(s)),loaded.filter(s=>/templates|welcome/.test(s)).join(','));
  /* search works on first focus (lazy or not) */
  await pg.tap('#uq'); await pg.waitForFunction(()=>!!window.StudioSearch&&document.querySelector('#usPanel:not([hidden])'),null,{timeout:8000}).catch(()=>{});
  ok('search opens on first tap',await pg.evaluate(()=>!!window.StudioSearch&&!document.getElementById('usPanel').hidden));
  await pg.tap('#usCancel').catch(()=>{}); await pg.waitForTimeout(400);
  /* Templates tab loads its code on first use and works */
  await pg.tap('.hubbar [data-tab="templates"]'); await pg.waitForSelector('#templatesView:not([hidden]) .tp-card, #templatesView:not([hidden]) h1',{timeout:8000}).catch(()=>{});
  ok('Templates tab opens and shows templates (code loaded on first use)',await pg.evaluate(()=>!!window.StudioTemplates&&!document.getElementById('templatesView').hidden&&document.querySelectorAll('#templatesView [class*="tp-"]').length>3));
  ok('templates.js loaded after the tap',loaded.some(s=>/templates\.js/.test(s)));
  ok('the Templates stylesheet applied (view is laid out)',await pg.evaluate(()=>[...document.styleSheets].some(s=>/templates\.css/.test(s.href||''))));
  await ctx.close(); }
{ /* welcome on a brand-new device, still works (lazy-loaded) */
  const {ctx,pg}=await ctxFor(b,false); await pg.goto(BASE+'index.html?welcome=1'); await pg.waitForSelector('.wl',{timeout:8000}).catch(()=>{});
  await pg.waitForTimeout(800);
  ok('?welcome=1 opens the tour (lazy-loaded)',await pg.evaluate(()=>!!window.StudioWelcome&&!!document.querySelector('.wl')));
  await ctx.close(); }
{ /* the plan modules still preload, but only at idle (not before Home is painted) */
  const {ctx,pg}=await ctxFor(b,false); const seen=[]; pg.on('request',r=>{ if(/assets\/(calendar|ideas|kpis)\.js/.test(r.url())) seen.push(Date.now()); });
  const t=Date.now(); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#toolGrid .tool-item'); const painted=Date.now()-t; await pg.waitForTimeout(4500);
  ok('plan modules preload later, at idle',!seen.length||seen[0]-t>=Math.min(painted,2000),{painted,firstAt:seen[0]?seen[0]-t:null});
  await ctx.close(); }
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(bad?`\n${bad} FAILED`:`\nall ${res.length} passed`); process.exit(bad?1:0);

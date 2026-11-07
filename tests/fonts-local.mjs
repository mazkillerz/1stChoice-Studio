// Self-hosted fonts (w1-fonts): every font works with Google blocked or hanging; Save still 2160x3840.
import { chromium } from 'playwright';
import fs from 'fs';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
let fail=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };
const GOOGLE=/fonts\.(googleapis|gstatic)\.com/;
const browser=await chromium.launch();
async function ctx(mode){ const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block',acceptDownloads:true});
  await c.route(GOOGLE,r=>mode==='hang'?undefined:r.abort()); return c; }   // 'hang': never fulfilled
const AR='نص عربي! ؟ : … ،', LA='Sample 0123!';
const checks=[['400 16px "IBM Plex Sans Arabic"'],['500 16px "IBM Plex Sans Arabic"'],['600 16px "IBM Plex Sans Arabic"'],
  ['400 40px Lalezar'],['600 40px Cairo'],['800 40px Cairo'],['400 40px Modak']];
const NEEDS_AR={Modak:0};
async function fontsOf(p,label){
  await p.evaluate(()=>new Promise(r=>setTimeout(r,300)));
  const res=await p.evaluate(async({checks,AR,LA})=>{ const out=[];
    for(const [f] of checks){ const fam=f.match(/"([^"]+)"|(\w+)$/); const name=fam[1]||fam[2];
      try{ await document.fonts.load(f,AR+LA); await document.fonts.load(f,LA); }catch(e){}
      const loaded=[...document.fonts].filter(x=>x.family.replace(/["']/g,'')===name&&x.status==='loaded');
      out.push({f,name,check:document.fonts.check(f,LA)&&(name==='Modak'||document.fonts.check(f,AR)),loaded:loaded.length}); }
    return out; },{checks,AR,LA});
  for(const r of res) ok(r.check&&r.loaded>0,`${label}: ${r.f} usable (${r.loaded} face(s) loaded)`);
  const urls=await p.evaluate(()=>[...document.styleSheets].flatMap(s=>{ try{return [...s.cssRules]}catch(e){return []} }).flatMap(function f(r){return r.styleSheet?[...r.styleSheet.cssRules].flatMap(f):[r]}).filter(r=>r.type===5).map(r=>r.style.getPropertyValue('src')));
  ok(urls.length>5&&urls.every(u=>!/gstatic|googleapis/.test(u)),`${label}: every @font-face src is local (${urls.length})`);
}
// 1. blocked
{ const c=await ctx('block'); const p=await c.newPage();
  for(const [name,url] of [['index','index.html'],['restock','tools/restock.html'],['create','tools/create.html'],['board','lab/board.html']]){
    if(name==='board') await p.addInitScript(()=>{ try{localStorage.setItem('studio:lab','"1"')}catch(e){} });
    await p.goto(BASE+url,{waitUntil:'load'}); await p.waitForTimeout(1500);
    await fontsOf(p,name); }
  await c.close(); }
// 2. hanging Google: hub within 3 s
{ const c=await ctx('hang'); const p=await c.newPage(); const t=Date.now();
  await p.goto(BASE+'index.html',{waitUntil:'commit'});
  try{ await p.waitForSelector('.hero h1',{state:'visible',timeout:3000}); ok(true,'hang: hub visible in '+(Date.now()-t)+' ms'); }catch(e){ ok(false,'hang: hub not visible within 3 s'); }
  await c.close(); }
// 3. Restock Save with Google blocked (the smoke.mjs one-tap path)
{ const c=await ctx('block'); await c.route(/supabase\.co/,r=>r.abort()); await c.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const p=await c.newPage(); const dls=[]; p.on('download',d=>dls.push(d));
  await p.goto(BASE+'index.html'); await p.evaluate(()=>localStorage.clear()); await p.goto(BASE+'index.html'); await p.waitForTimeout(1200);
  await Promise.all([p.waitForURL(/restock\.html/,{timeout:10000}),p.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]);
  await p.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{});
  await p.tap('#barSave'); for(let i=0;i<60&&!dls.length;i++) await p.waitForTimeout(300);
  if(dls[0]){ const x=fs.readFileSync(await dls[0].path()); const w=x.readUInt32BE(16),h=x.readUInt32BE(20);
    ok(x.slice(1,4).toString()==='PNG'&&w===2160&&h===3840,`restock save with Google blocked: PNG ${w}x${h}`); } else ok(false,'restock save produced no download');
  await c.close(); }
await browser.close(); process.exit(fail?1:0);

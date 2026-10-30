/* 1.30.0 Simplify checks.
   1. New place "Save the frame only" is see-through where the photo goes (it used to keep the photo), at 2160x3840; the normal Save
      still has the photo there. The link sits right under "Only save to the team" (no empty status line between them).
   2. Tool descriptions fit one line on a phone (360 and 390): Home rows and All tools. The words taken out still find the tool in search.
   3. All tools and Settings: Done is a quiet button (not the blue accent); All tools has one intro line that says phone / device;
      with one pinned tool there is no drag hint, with two there is.
   4. A saved design's menu: every row icon is the same size and every label starts at the same x.
   Run like tests/full.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SM=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const PHONE={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true};
const DESK={viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:true};
async function newCtx(opt,pins){
  const ctx=await b.newContext(opt);
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(seedDesigns())});
  if(pins) await ctx.addInitScript({content:`try{ if(!sessionStorage.getItem('pinsSet')){ localStorage.setItem('studio:pins',${JSON.stringify(JSON.stringify(pins))}); sessionStorage.setItem('pinsSet','1'); } }catch(e){}`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); return {ctx,pg};
}
const isAccent=(pg,sel)=>pg.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const p=document.createElement('i'); p.style.color='var(--accent)'; document.body.append(p); const a=getComputedStyle(p).color; p.remove(); return getComputedStyle(e).backgroundColor===a; },sel);

/* 1. New place: the frame save is see-through in the photo window */
{ const {ctx,pg}=await newCtx(PHONE); const dls=[]; pg.on('download',d=>dls.push(d));
  await pg.goto(BASE+'tools/new-place.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:15000});
  await pg.evaluate(()=>{ navigator.canShare=()=>false; });
  await pg.setInputFiles('#pick',SM+'hands.jpg'); await pg.waitForFunction(()=>Studio.debug.S.photos[0]&&Studio.debug.S.photos[0].img&&!Studio.debug.S.photos[0].sample,null,{timeout:10000}).catch(()=>{});
  await pg.waitForTimeout(800);
  const order=await pg.evaluate(()=>{ const f=document.getElementById('saveFrame'); return f&&f.previousElementSibling?f.previousElementSibling.id:null; });
  ok('New place: "Save the frame only" sits right under "Only save to the team"',order==='teamOnly',order);
  const grab=async(click)=>{ const n=dls.length; await pg.evaluate(c=>document.getElementById(c).click(),click);
    for(let i=0;i<80&&dls.length===n;i++) await pg.waitForTimeout(300);
    const d=dls[n]; if(!d) return null; await pg.waitForTimeout(600);
    return pg.evaluate(async b64=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0);
      const r=Studio.debug.reg().find(q=>q.photo===0), k=im.width/1080;
      const box=(X,Y,w,h)=>{ const d=x.getImageData(Math.round(X*k),Math.round(Y*k),Math.round(w*k),Math.round(h*k)).data; let amax=0, amin=255, sum=0, sq=0, n=0; for(let i=0;i<d.length;i+=4){ amax=Math.max(amax,d[i+3]); amin=Math.min(amin,d[i+3]); const l=(d[i]+d[i+1]+d[i+2])/3; sum+=l; sq+=l*l; n++; } const m=sum/n; return {amax,amin,sd:Math.round(Math.sqrt(sq/n-m*m))}; };
      return {w:im.width,h:im.height,win:box(r.x+40,r.y+40,r.w-80,r.h-80),ground:box(0,r.y+r.h+30,1080,120)}; },fs.readFileSync(await d.path()).toString('base64')); };
  const frame=await grab('saveFrame');
  await pg.reload(); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:15000}); await pg.evaluate(()=>{ navigator.canShare=()=>false; });
  await pg.setInputFiles('#pick',SM+'hands.jpg'); await pg.waitForTimeout(1500);
  const full=await grab('save');
  ok('New place: the frame PNG is 2160x3840',!!frame&&frame.w===2160&&frame.h===3840,frame&&{w:frame.w,h:frame.h});
  ok('New place: the frame PNG is see-through where the photo goes',!!frame&&frame.win.amax===0,frame&&frame.win);
  ok('New place: the frame PNG keeps the solid ground around it',!!frame&&frame.ground.amin===255,frame&&frame.ground);
  ok('New place: the normal Save still has the photo in the window (solid, not flat)',!!full&&full.win.amin===255&&full.win.sd>8,full&&full.win);
  await ctx.close(); }

/* 2. tool descriptions fit one line on a phone; the words taken out still find the tool */
for(const w of [360,390]){
  const {ctx,pg}=await newCtx({...PHONE,viewport:{width:w,height:800}},['restock','photo-story','collage']);
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200);
  const clip=sel=>pg.$$eval(sel,l=>l.filter(e=>e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));
  const home=await clip('.tool-item .ttxt>span');
  ok(w+'px: Home tool rows show their whole description',!home.length,home);
  await pg.tap('#allTools'); await pg.waitForTimeout(700);
  const lib=await clip('dialog[open] .lib-row .ttxt>span');
  const rows=await pg.$$eval('dialog[open] .lib-row',l=>l.length);
  ok(w+'px: All tools shows every description whole ('+rows+' tools)',rows>=10&&!lib.length,lib);
  await ctx.close();
}
{ const {ctx,pg}=await newCtx(PHONE);
  await pg.goto(BASE+'index.html?s=1'); await pg.waitForTimeout(1200);
  const find=async q=>{ await pg.fill('#uq',q); await pg.waitForTimeout(500); return pg.$$eval('#usPanel .us-row .us-t',l=>l.map(x=>x.textContent)); };
  await pg.tap('#uq');
  const tries=[['flavours','Restock'],['scattered','Collage'],['headline','Photo story'],['product','Offer'],['1080','Carousel'],['place name','New place']];
  const miss=[]; for(const [q,t] of tries){ const r=await find(q); if(!r.includes(t)) miss.push(q+' → '+r.slice(0,4).join(' | ')); }
  ok('search still finds a tool by the words taken out of its description',!miss.length,miss);
  await ctx.close(); }

/* 3. All tools and Settings: quiet Done, one intro line, drag hint only for 2+ pins */
for(const [mode,opt] of [['phone',PHONE],['computer',DESK]]){
  const {ctx,pg}=await newCtx(opt,['restock']);
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200);
  await pg.click('#allTools'); await pg.waitForTimeout(700);
  const a=await pg.evaluate(()=>{ const p=document.querySelector('dialog[open] .lib>p.small'); const lh=parseFloat(getComputedStyle(p).lineHeight)||16; return {txt:p.textContent,lines:Math.round(p.getBoundingClientRect().height/lh),hint:!!document.getElementById('libPinHint')}; });
  const word=mode==='phone'?'phone':'device';
  ok(mode+': All tools intro is one line and says "'+word+'"',a.lines===1&&a.txt.includes('this '+word),a);
  ok(mode+': All tools with one pinned tool has no drag hint',!a.hint);
  ok(mode+': All tools Done is quiet (not the blue accent)',await isAccent(pg,'#libDone')===false);
  await pg.click('dialog[open] [data-pin="photo-story"]'); await pg.waitForTimeout(400);
  ok(mode+': with two pinned tools the drag hint shows',await pg.evaluate(()=>!!document.getElementById('libPinHint')));
  await pg.click('#libDone'); await pg.waitForTimeout(500);
  await pg.click('#setBtn'); await pg.waitForTimeout(600);
  ok(mode+': Settings Done is quiet (not the blue accent)',await isAccent(pg,'dialog[open] .set [data-x]')===false);
  await ctx.close();
}

/* 4. a saved design's menu: same icon size, labels on one line */
{ const {ctx,pg}=await newCtx(PHONE);
  await pg.goto(BASE+'index.html#saved'); await pg.waitForTimeout(1500);
  await pg.locator('#savedGrid .sv-card button').first().click(); await pg.waitForTimeout(600);
  const m=await pg.evaluate(()=>[...document.querySelectorAll('dialog[open] .act-row')].map(e=>{ const s=e.querySelector('svg').getBoundingClientRect(); const t=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()||n.tagName==='SPAN'); const r=document.createRange(); r.selectNodeContents(t); return {w:Math.round(s.width),h:Math.round(s.height),x:Math.round(r.getBoundingClientRect().left)}; }));
  const ws=m.map(r=>r.w), xs=m.map(r=>r.x);
  ok('design menu: every row icon is the same size',m.length>=5&&Math.max(...ws)-Math.min(...ws)<=1&&Math.max(...m.map(r=>r.h))-Math.min(...m.map(r=>r.h))<=1,ws);
  ok('design menu: every label starts at the same x',Math.max(...xs)-Math.min(...xs)<=1,xs);
  await ctx.close(); }

ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n'));
const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`);
process.exit(f?1:0);

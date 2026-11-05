/* Video editor fixes, 1.44.0 (tools/video*, assets/reel.js).
   1. Canvas memory: the reel engine keeps full-size layers for the last 3 draw sizes only (it kept every size forever, which on an iPhone
      runs past Safari's canvas memory cap; new canvases then draw nothing and the preview turns blank white).
   2. A preview canvas that draws nothing (see-through after a draw) is caught: the editor tries half the size; when even the smallest
      fails it says the phone ran out of memory, with Retry (which redraws, no reload). Same when the reel's own layers can't be made.
   3. Phone: the sheet (Mix, Sound, …) grows taller when its top edge is dragged up; remembered on this device; arrow keys on the handle;
      the preview keeps at least ~180 px; no handle on a computer.
   Phone 390×844 (touch) light + dark, 360×740, computer 1280×800. Needs the server (BASE, default :8080). Exit code 1 on any FAIL. */
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); process.exit(1); });
const b=await chromium.launch();
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* dead canvases for the test: getImageData reads see-through on the preview canvas above __deadPv px wide, on reel layer canvases above __deadLayer */
const DEAD=`(()=>{ const g=CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData=function(x,y,w,h){ const c=this.canvas, lim=c.id==='vdCv'?window.__deadPv:(c.id?null:window.__deadLayer);
    if(lim!=null&&c.width>lim) return new ImageData(Math.max(1,w),Math.max(1,h)); return g.apply(this,arguments); }; })();`;
async function newPage(vp,scheme,touch,init){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co|fonts\.(googleapis|gstatic)/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); }catch(e){} ${init||''}`});
  const pg=await ctx.newPage(), errs=[];
  pg.on('pageerror',e=>errs.push(String(e.message||e)));
  return {ctx,pg,errs};
}
const ready=async pg=>{ await pg.waitForFunction(()=>window.__video&&window.__video().ready,null,{timeout:60000}); await pg.waitForTimeout(300); };
const V=pg=>pg.evaluate(()=>window.__video());
const box=(pg,sel)=>pg.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2}; },sel);
const dragTouch=async(cdp,x,y1,y2)=>{ const n=10; await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y1,id:1}]});
  for(let i=1;i<=n;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y1+(y2-y1)*i/n,id:1}]}); await wait(20); }
  await wait(250); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await wait(400); };   // hold before lifting: a flick starts a fling and Chrome then ignores the next tap
const openMix=async pg=>{ await pg.evaluate(()=>VD.select({kind:'clip',id:VD.st.R.clips[0].id})); await pg.tap('#bar [data-open="mix"]');
  await pg.waitForSelector('#vdShB .vd-row[data-id="hood"]',{timeout:20000}); await pg.waitForTimeout(300); };
const rowsSeen=pg=>pg.evaluate(()=>{ const s=document.getElementById('vdShB').getBoundingClientRect(); return [...document.querySelectorAll('#vdShB .vd-row')].filter(r=>r.getBoundingClientRect().bottom<=s.bottom+1).length; });

/* 1. reel layers: only the last 3 sizes */
{
  const {ctx,pg,errs}=await newPage({width:390,height:844},'light',true);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  const m=await pg.evaluate(()=>{ const r=VD.st.reels['winter-cat'].reel, out=[];
    for(const w of [180,360,540,720,900,1080,540]){ const c=document.createElement('canvas'); c.width=w; c.height=Math.round(w*16/9); r.draw(c.getContext('2d'),2,{}); out.push(r.mem()); c.width=c.height=0; }
    return out; });
  const last=m[m.length-1], n=+(/(\d+) layers/.exec(last)||[])[1], sizes=last.split(' · ')[0].split(' ');
  ok('reel layers: after 6 sizes only the newest that fit the budget are kept',sizes.length===3&&sizes[2]==='540x960',last);
  ok('reel layers: the older big sizes were freed',n>0&&n<=9,last);
  const keep=await pg.evaluate(()=>{ const r=VD.st.reels['winter-cat'].reel; for(const [w,h] of [[1080,1920],[540,960],[36,64],[180,320],[360,640]]){ const c=document.createElement('canvas'); c.width=w; c.height=h; r.draw(c.getContext('2d'),2,{}); c.width=c.height=0; } return r.mem(); });
  ok('small sizes (timeline and draft pictures) do not push out the sharp preview size',/1080x1920/.test(keep)&&/540x960/.test(keep),keep);
  ok('the preview still draws after the old sizes were freed',await pg.evaluate(()=>{ VD.drawNow(); const c=document.getElementById('vdCv'); return c.getContext('2d').getImageData(c.width>>1,c.height>>1,1,1).data[3]===255; }));
  ok('no page errors (memory)',!errs.length,errs.slice(0,2));
  await ctx.close();
}

/* a recording whose length reads Infinity until its end is read (WebM from MediaRecorder) */
{
  const {ctx,pg,errs}=await newPage({width:390,height:844},'light',true);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  const r=await pg.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=180; c.height=320; const x=c.getContext('2d'), s=c.captureStream(30), rec=new MediaRecorder(s,{mimeType:'video/webm'}), parts=[];
    rec.ondataavailable=e=>e.data.size&&parts.push(e.data); let n=0; const tm=setInterval(()=>{ x.fillStyle=n++%2?'#c33':'#33c'; x.fillRect(0,0,180,320); },50);
    rec.start(100); await new Promise(r=>setTimeout(r,1500)); rec.stop(); await new Promise(r=>rec.onstop=r); clearInterval(tm);
    const f=new File(parts,'rec.webm',{type:'video/webm'}), u=URL.createObjectURL(f), v=document.createElement('video'); v.muted=true; v.src=u;
    await new Promise(r=>{ v.onloadedmetadata=r; setTimeout(r,3000); }); const raw=v.duration; URL.revokeObjectURL(u);
    const m=await StudioMedia.put(f); return {raw:String(raw),dur:m.dur}; });
  ok('a recording that says Infinity gets its real length when added',isFinite(r.dur)&&r.dur>0.8&&r.dur<3,r);
  ok('no page errors (recording)',!errs.length,errs.slice(0,2));
  await ctx.close();
}

/* 2. a preview canvas that draws nothing */
for(const scheme of ['light','dark']){
  const N='['+scheme+'] ';
  {
    const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true,DEAD+'window.__deadPv=400;');
    await pg.goto(BASE+'tools/video.html'); await ready(pg);
    const v=await V(pg);
    ok(N+'dead above 400 px: the preview drops to a size that works, no message',v.cvw<=400&&v.cvw>=270&&v.cap>0&&!v.err,{cvw:v.cvw,cap:v.cap,err:v.err});
    ok(N+'…and the error box stays hidden',await pg.evaluate(()=>document.getElementById('vdErr').hidden));
    ok(N+'no page errors',!errs.length,errs.slice(0,2));
    await ctx.close();
  }
  {
    const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true,DEAD+'window.__deadPv=0;');
    await pg.goto(BASE+'tools/video.html'); await ready(pg);
    const v=await V(pg), shown=await pg.evaluate(()=>{ const e=document.getElementById('vdErr'), r=e.getBoundingClientRect(), b=document.getElementById('vdRetry').getBoundingClientRect(); return {vis:!e.hidden&&r.height>100,retry:b.height>=44,kind:e.dataset.kind}; });
    ok(N+'nothing works: a clear message instead of a blank white preview',/ran out of memory/.test(v.err)&&/Retry/.test(v.err)&&shown.vis,{err:v.err,shown});
    ok(N+'the message has a Retry button ≥ 44 px',shown.retry,shown);
    await pg.evaluate(()=>{ window.__deadPv=null; });
    const loads=[]; pg.on('request',r=>{ if(/reel\.json/.test(r.url())) loads.push(r.url()); });
    await pg.tap('#vdRetry'); await pg.waitForTimeout(500);
    const v2=await V(pg);
    ok(N+'Retry redraws at full sharpness without reloading the reel',!v2.err&&v2.cap===0&&v2.cvw>400&&!loads.length,{cvw:v2.cvw,cap:v2.cap,err:v2.err,loads:loads.length});
    ok(N+'…the error box is hidden again',await pg.evaluate(()=>document.getElementById('vdErr').hidden));
    ok(N+'no page errors (Retry)',!errs.length,errs.slice(0,2));
    await ctx.close();
  }
}
/* the reel's own layer canvases can't be made */
{
  const {ctx,pg,errs}=await newPage({width:390,height:844},'light',true,DEAD+'window.__deadLayer=400;');
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  const v=await V(pg);
  ok('reel layers dead above 400 px: the preview drops to a size that works',v.cvw<=400&&!v.err,{cvw:v.cvw,cap:v.cap,err:v.err});
  ok('no page errors (layers)',!errs.length,errs.slice(0,2));
  await ctx.close();
}
{
  const {ctx,pg}=await newPage({width:390,height:844},'light',true,DEAD+'window.__deadLayer=0;');
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  const v=await V(pg);
  ok('reel layers never work: the out-of-memory message, not a white picture',/ran out of memory/.test(v.err),v.err);
  await ctx.close();
}

/* 3. the sheet grows when dragged up */
for(const [scheme,vp] of [['light',{width:390,height:844}],['dark',{width:390,height:844}],['light',{width:360,height:740}]]){
  const N='['+scheme+' '+vp.width+'] ';
  const {ctx,pg,errs}=await newPage(vp,scheme,true);
  await pg.goto(BASE+'tools/video.html'); await ready(pg); await openMix(pg);
  const h0=(await box(pg,'#vdSheet')).h, r0=await rowsSeen(pg), g=await box(pg,'#vdGrab'), hd=await box(pg,'#vdSheet .vd-sh-h');
  ok(N+'the sheet has a drag handle on a phone',g&&g.w>0&&g.h>0,g);
  const cdp=await ctx.newCDPSession(pg);
  await dragTouch(cdp,g.cx,g.cy,g.cy-300);
  const h1=(await box(pg,'#vdSheet')).h, r1=await rowsSeen(pg), pv=(await box(pg,'#vdPv')).h, v1=await V(pg);
  ok(N+'drag up: the Mix sheet is taller and shows more sounds',h1>h0+120&&r1>=r0+2,{h0,h1,r0,r1});
  ok(N+'…the preview keeps at least 180 px',pv>=180,pv);
  ok(N+'…the preview is drawn at its new size after release',Math.abs(v1.cvw-Math.round(pv*9/16*2))<=4||v1.cvw===1080,{cvw:v1.cvw,pv});
  ok(N+'the height is remembered on this device',await pg.evaluate(()=>+JSON.parse(localStorage.getItem('studio:video:sheetH')))>=h1-1);
  /* the title row drags too */
  await dragTouch(cdp,hd.x+40,(await box(pg,'#vdSheet .vd-sh-h')).cy,vp.height-12);
  const h2=(await box(pg,'#vdSheet')).h;
  ok(N+'drag the title row down: back to the smallest sheet (210 px)',Math.abs(h2-210)<=1,h2);
  await pg.tap('#vdShX'); await pg.waitForTimeout(300);
  ok(N+'Done still closes the sheet after dragging',await pg.evaluate(()=>document.getElementById('vdSheet').hidden));
  await pg.evaluate(()=>localStorage.setItem('studio:video:sheetH','420'));
  await pg.reload(); await ready(pg); await openMix(pg);
  ok(N+'after a reload the sheet opens at the remembered height',Math.abs((await box(pg,'#vdSheet')).h-420)<=1,(await box(pg,'#vdSheet')).h);
  await pg.focus('#vdGrab'); await pg.keyboard.press('ArrowUp');
  ok(N+'Arrow Up on the handle: 40 px taller',Math.abs((await box(pg,'#vdSheet')).h-460)<=1||vp.height<800,(await box(pg,'#vdSheet')).h);
  const hl=await pg.evaluate(()=>{ const e=document.getElementById('vdShX').getBoundingClientRect(); return document.elementFromPoint(e.left+e.width/2,e.top+e.height/2).closest('#vdShX')!==null; });
  ok(N+'the handle never covers Done',hl);
  ok(N+'no page errors (drag)',!errs.length,errs.slice(0,2));
  await ctx.close();
}
{
  const {ctx,pg,errs}=await newPage({width:1280,height:800},'light',false,`localStorage.setItem('studio:video:sheetH','500');`);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  await pg.evaluate(()=>VD.select({kind:'clip',id:VD.st.R.clips[0].id})); await pg.click('#bar [data-open="mix"]'); await pg.waitForSelector('#vdShB .vd-row[data-id="hood"]',{timeout:20000});
  const d=await pg.evaluate(()=>({grab:getComputedStyle(document.getElementById('vdGrab')).display,inline:document.getElementById('vdSheet').style.height,h:document.getElementById('vdSheet').getBoundingClientRect().height}));
  ok('computer: no handle, the panel is full height (a phone height is ignored)',d.grab==='none'&&!d.inline&&d.h>600,d);
  ok('no page errors (computer)',!errs.length,errs.slice(0,2));
  await ctx.close();
}

await b.close();
console.log(res.join('\n'));
const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

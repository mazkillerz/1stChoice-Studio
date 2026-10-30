/* Reel scene test: the canvas port of the winter-cat reel (assets/reel.js + scene.js) against the original DOM/SVG reel
   (source/winter_cat.html, run with window.seek(t)).
   a) strict: filters off in the original, wobble off in the port, 17 times, mean diff < 4 (of 255) at every time
   b) loose: wobble on in both, mean diff < 8
   c) determinism: same frame twice and out of order is identical
   d) text: direction, fit, warning, long line stays inside the page, English draws differently
   e) speed: ms per frame at 540x960 and 1080x1920
   Usage: node tests/reel-scene.mjs   (server on :8080, or BASE=...). Diff images of the worst times go to $SCRATCH or /tmp/reelscene/. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../brands/1stchoice/reels/winter-cat/',import.meta.url).pathname;
const OUT=process.env.SCRATCH||'/tmp/claude-0/-home-user-1stChoice-Studio/06e6729b-e4f8-560f-b51f-65d4a41f117c/scratchpad/reelscene/';
fs.mkdirSync(OUT,{recursive:true});
const TIMES=[0.3,0.95,1.5,2.6,3.2,3.6,4.4,5.0,5.8,6.4,6.9,7.1,7.35,7.6,7.9,8.6,9.5];
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const mk=async()=>{ const c=await b.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); return p; };

/* the original: its assets come from the template folder */
async function orig(filters){
  const p=await mk();
  await p.route('**/source/assets/*',r=>{ const n=r.request().url().split('/').pop().split('?')[0], f=n==='bg_noblob.jpg'?'img/bg_noblob.jpg':'img/'+n.replace(/\.png$/,'.webp');
    r.fulfill({body:fs.readFileSync(ROOT+f),contentType:f.endsWith('.jpg')?'image/jpeg':'image/webp'}); });
  await p.route('**/source/fonts/*',r=>r.fulfill({body:fs.readFileSync(ROOT+'fonts/'+r.request().url().split('/').pop()),contentType:'font/woff'}));
  await p.goto(BASE+'brands/1stchoice/reels/winter-cat/source/winter_cat.html');
  if(!filters) await p.addStyleTag({content:'#world,#blob,#land{filter:none!important}'});
  await p.waitForFunction(()=>window.ready===true);
  return p;
}
const shot=async(p,t)=>{ await p.evaluate(t=>window.seek(t),t); await p.evaluate(()=>document.fonts.ready); return 'data:image/png;base64,'+(await p.locator('#stage').screenshot()).toString('base64'); };
const port=await mk(); await port.goto(BASE+'tests/fixtures/reels/scene.html'); await port.evaluate(()=>T.open('winter-cat'));

/* a) strict, b) loose */
for(const mode of ['strict','loose']){
  const p=await orig(mode==='loose'), rows=[]; const limit=mode==='strict'?4:8;
  for(const t of TIMES){
    const a=await shot(p,t), c=await port.evaluate(([t,w])=>T.png('winter-cat',t,{wobble:w}),[t,mode==='loose']);
    const r=await port.evaluate(([a,c])=>T.cmp(a,c,270,480,true),[a,c]); rows.push({t,mean:r.mean,p99:r.p99,side:r.side});
  }
  console.log('\n'+mode+' (mean abs diff of 255, 270x480)\n  t      mean   p99'); rows.forEach(r=>console.log('  '+String(r.t).padEnd(6)+' '+r.mean.toFixed(2).padStart(5)+'  '+String(r.p99).padStart(3)));
  rows.slice().sort((x,y)=>y.mean-x.mean).slice(0,3).forEach(r=>fs.writeFileSync(OUT+mode+'_'+r.t+'.png',Buffer.from(r.side.split(',')[1],'base64')));
  const worst=Math.max(...rows.map(r=>r.mean)); ok(mode+': every time under '+limit,worst<limit,'worst '+worst.toFixed(2)+', best '+Math.min(...rows.map(r=>r.mean)).toFixed(2));
  await p.context().close();
}

/* c) determinism */
{ const g=t=>port.evaluate(t=>T.png('winter-cat',t),t), a=await g(5.0), a2=await g(5.0); await g(2.0); const a3=await g(5.0);
  ok('same frame twice is identical',a===a2); ok('2.0 then 5.0 equals 5.0 fresh',a===a3); }

/* d) text */
{ const info=await port.evaluate(async()=>{ const r=await T.open('winter-cat'); let long='حتى في البرد'; while(!r.textInfo({headline:long}).headline.warn) long+=' حتى في';
    return {d:r.textInfo({}),en:r.textInfo({headline:'Cold all winter'}),lg:r.textInfo({headline:long}),long}; });
  ok('default: rtl, fit 1, no warning',info.d.headline.dir==='rtl'&&info.d.headline.fit===1&&!info.d.headline.warn,info.d.headline);
  ok('English is ltr',info.en.headline.dir==='ltr',info.en.headline.dir);
  ok('very long Arabic: fit < warnBelow and warn',info.lg.headline.fit<0.85&&info.lg.headline.fit>0.45&&info.lg.headline.warn,info.lg.headline);
  const bb=await port.evaluate(([l])=>T.bbox('winter-cat',9.5,{texts:{headline:l}},400,680),[info.long]);
  ok('long line stays inside x 40..1040',bb.n>0&&bb.x0>=40&&bb.x1<=1040,bb);
  const d=await port.evaluate(()=>T.bbox('winter-cat',9.5,{},400,680)), e=await port.evaluate(()=>T.bbox('winter-cat',9.5,{texts:{headline:'Cold all winter'}},400,680));
  ok('English draws different pixels in the headline band',e.n>0&&(e.n!==d.n||e.x0!==d.x0||e.x1!==d.x1),{default:d,english:e});
  fs.writeFileSync(OUT+'text_en.png',Buffer.from((await port.evaluate(()=>T.png('winter-cat',9.5,{texts:{headline:'Cold all winter'}},540))).split(',')[1],'base64')); }

/* e) speed */
for(const w of [540,1080]){ const ms=await port.evaluate(w=>T.time('winter-cat',5.0,w,20),w); console.log('speed: '+w+'x'+Math.round(w*16/9)+' = '+ms.toFixed(1)+' ms per frame (wobble on)'); }
const msE=await port.evaluate(()=>T.time('winter-cat',9.0,1080,20)); console.log('speed: 1080x1920 end card = '+msE.toFixed(1)+' ms per frame');

ok('no page errors',errs.length===0,errs.slice(0,3));
console.log('\n'+res.join('\n')); await b.close(); process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);

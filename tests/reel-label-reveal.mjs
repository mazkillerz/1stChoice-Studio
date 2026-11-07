/* Reel scene test: the canvas port of the "New label reveal" reel (assets/reel.js + brands/1stchoice/reels/label-reveal/scene.js)
   against the original DOM/SVG reel (source/label_reveal.html, run with window.seek(t)).
   a) strict: 25 times without the rubbed-out hole, mean diff < 2 (of 255) at every time (the task allows 4)
   b) hole: 8 times while the scribble is being rubbed off the kumma (the original uses an SVG feTurbulence-displaced circle, the port
      the same noise from the SVG spec): mean diff < 2 at every time (the task allows 8), and the hole is ragged (not a plain circle)
   c) determinism: same frame twice and out of order is identical (also during the hole)
   d) text: every one of the ten words slots takes its words from R.text, direction, fit, warning, long lines stay inside their room,
      English draws differently, an empty slot draws nothing
   e) speed: ms per frame at 540x960 and 1080x1920
   Usage: node tests/reel-label-reveal.mjs   (server on :8080, or BASE=...). Diff images of the worst times go to $SCRATCH or /tmp/reellabel/. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../brands/1stchoice/reels/label-reveal/',import.meta.url).pathname;
const OUT=process.env.SCRATCH||'/tmp/reellabel/';
fs.mkdirSync(OUT,{recursive:true});
const STRICT=[0.3,1.0,1.6,1.8,2.0,2.3,2.5,3.1,3.8,4.6,5.5,6.6,7.3,8.4,8.7,9.2,9.8,10.2,11.4,12.6,13.5,14.4,14.8,15.5,16.4];
const HOLE=[7.47,7.5,7.62,7.7,7.8,7.9,7.97,8.03];
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const mk=async()=>{ const c=await b.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); return p; };

/* the original: its pictures and fonts come from the template folder (PNG -> WebP, the logo SVG -> WebP) */
async function orig(){
  const p=await mk();
  await p.route('**/source/assets/*',r=>{ const n=r.request().url().split('/').pop().split('?')[0], f=/^logo-c3/.test(n)?'img/logo.webp':'img/'+n.replace(/\.png$/,'.webp');
    r.fulfill({body:fs.readFileSync(ROOT+f),contentType:f.endsWith('.jpg')?'image/jpeg':'image/webp'}); });
  await p.route('**/source/fonts/*',r=>r.fulfill({body:fs.readFileSync(ROOT+'fonts/'+r.request().url().split('/').pop().split('?')[0]),contentType:'font/woff'}));
  await p.goto(BASE+'brands/1stchoice/reels/label-reveal/source/label_reveal.html');
  await p.waitForFunction(()=>window.ready===true);
  return p;
}
const shot=async(p,t)=>{ await p.evaluate(t=>window.seek(t),t); await p.evaluate(()=>document.fonts.ready); return 'data:image/png;base64,'+(await p.locator('#stage').screenshot()).toString('base64'); };
const port=await mk(); await port.goto(BASE+'tests/fixtures/reels/scene.html'); await port.evaluate(()=>T.open('label-reveal'));
const M=JSON.parse(fs.readFileSync(ROOT+'reel.json','utf8'));

/* a) strict, b) hole */
const o=await orig();
for(const [mode,times,limit] of [['strict',STRICT,2],['hole',HOLE,2]]){
  const rows=[];
  for(const t of times){
    const a=await shot(o,t), c=await port.evaluate(t=>T.png('label-reveal',t),t);
    const r=await port.evaluate(([a,c])=>T.cmp(a,c,270,480,true),[a,c]); rows.push({t,mean:r.mean,p99:r.p99,side:r.side});
  }
  console.log('\n'+mode+' (mean abs diff of 255, 270x480)\n  t      mean   p99'); rows.forEach(r=>console.log('  '+String(r.t).padEnd(6)+' '+r.mean.toFixed(2).padStart(5)+'  '+String(r.p99).padStart(3)));
  rows.slice().sort((x,y)=>y.mean-x.mean).slice(0,3).forEach(r=>fs.writeFileSync(OUT+mode+'_'+r.t+'.png',Buffer.from(r.side.split(',')[1],'base64')));
  const worst=Math.max(...rows.map(r=>r.mean)); ok(mode+': every time under '+limit,worst<limit,'worst '+worst.toFixed(2)+', best '+Math.min(...rows.map(r=>r.mean)).toFixed(2));
}
await o.context().close();

/* the hole is ragged: its edge is not a circle (distance of the edge from the centre varies by more than 8 px) */
{ const v=await port.evaluate(async()=>{ const r=await T.open('label-reveal'), c=T.cv(1080,1920), x=c.getContext('2d');
    const withHole=t=>{ r.draw(x,t); return x.getImageData(0,0,1080,1920).data; };
    // t=7.95: radius about 150+760*eio(...) -> compare the frame with and without the scribble layer visible along rays from the centre (452,1132) in photo space
    const d=withHole(7.95), z=1.14*0+Math.exp(Math.log(1.14)*(function(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;})((7.95-5.93)/(9.85-5.93)));
    const toScreen=(px,py)=>[540+(px-540)*z,1150+(py-1150)*z]; const dist=[];
    for(let a=0;a<360;a+=5){ let last=0; for(let rr=20;rr<900;rr+=2){ const [sx,sy]=toScreen(452+rr*Math.cos(a*Math.PI/180),1132+rr*Math.sin(a*Math.PI/180)); const X=Math.round(sx),Y=Math.round(sy);
        if(X<0||X>=1080||Y<0||Y>=1920) break; const i=(Y*1080+X)*4, dark=d[i]<40&&d[i+1]<40&&d[i+2]<40; if(dark&&rr>last) last=rr; } dist.push(last); }
    return {min:Math.min(...dist.filter(v=>v>0)),max:Math.max(...dist)}; });
  ok('the rubbed-out hole is ragged, not a plain circle',v.max-v.min>8,v); }

/* c) determinism */
{ const g=t=>port.evaluate(t=>T.png('label-reveal',t),t);
  for(const t of [5.0,7.9,9.5,15.6]){ const a=await g(t), a2=await g(t); await g(2.0); await g(8.0); const a3=await g(t); ok('t='+t+': same frame twice and out of order is identical',a===a2&&a===a3); } }

/* d) text */
const SLOTS=M.texts.map(s=>s.id);
ok('ten editable slots, one line each',SLOTS.length===10&&M.texts.every(s=>!/\n/.test(s.value)&&s.label&&s.font&&s.maxWidth&&s.warnBelow&&s.show!=null&&s.in!=null&&s.box),SLOTS.join(','));
{ const info=await port.evaluate(async()=>{ const r=await T.open('label-reveal'); return {d:r.textInfo({}),en:r.textInfo({printed:'We printed them one by one...'})}; });
  ok('defaults: rtl, fit 1, no warning',SLOTS.every(id=>info.d[id].dir==='rtl'&&info.d[id].fit===1&&!info.d[id].warn),Object.fromEntries(SLOTS.map(id=>[id,+info.d[id].fit.toFixed(2)])));
  ok('English is ltr',info.en.printed.dir==='ltr',info.en.printed.dir); }
/* every slot: its words change the picture, a long line shrinks, warns, and stays inside its room */
const band=(s)=>({y0:Math.max(0,Math.floor(s.box[1])-30),y1:Math.min(1920,Math.ceil(s.box[1]+s.box[3])+30)});
for(const s of M.texts){
  const {y0,y1}=band(s), t=s.show;
  const r=await port.evaluate(async([id,t,y0,y1,val])=>{
    const r=await T.open('label-reveal'), box=async tx=>{ const c=await T.frame('label-reveal',t,{texts:tx},1080), d=c.getContext('2d').getImageData(0,y0,1080,y1-y0).data; return d; };
    const A=await box({}), B=await box({[id]:''}), C=await box({[id]:val});
    const bb=(P,Q)=>{ let x0=1e9,x1=-1,n=0; for(let y=0;y<y1-y0;y++) for(let X=0;X<1080;X++){ const i=(y*1080+X)*4; if(Math.abs(P[i]-Q[i])+Math.abs(P[i+1]-Q[i+1])+Math.abs(P[i+2]-Q[i+2])>60){ n++; if(X<x0)x0=X; if(X>x1)x1=X; } } return {x0,x1,n}; };
    let long=r.M.texts.find(x=>x.id===id).value; const base=long; while(!r.textInfo({[id]:long})[id].warn) long+=' '+base;
    const L=await box({[id]:long}), info=r.textInfo({[id]:long})[id];
    return {def:bb(A,B),long:bb(L,B),fit:info.fit,warn:info.warn,empty:bb(B,B).n};
  },[s.id,t,y0,y1,s.value]);
  const half=s.maxWidth/2, cx=s.box[0]+s.box[2]/2, Z=Math.exp(Math.log(1.14)*(x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2)((t-5.93)/(9.85-5.93))), zx=x=>540+(x-540)*Z,   // the sticker sits in the zoomed, tilted photo: its word must stay inside the sticker
    lo=s.id==='badge'?zx(s.box[0]):cx-half-8, hi=s.id==='badge'?zx(s.box[0]+s.box[2]):cx+half+8;
  ok(s.id+': draws words at its show time',r.def.n>200,r.def.n);
  ok(s.id+': very long line shrinks (fit < warnBelow) and warns',r.fit<s.warnBelow&&r.fit>0.1&&r.warn,{fit:+r.fit.toFixed(2)});
  ok(s.id+': long line stays inside its room',r.long.n>0&&r.long.x0>=lo&&r.long.x1<=hi,{x0:r.long.x0,x1:r.long.x1,room:[lo,hi]});
}
{ const e=await port.evaluate(async()=>{ const f=async tx=>{ const c=await T.frame('label-reveal',3.7,{texts:tx},1080); return c.toDataURL(); }; return {d:await f({}),e:await f({printed:'Printed one by one'})}; });
  ok('English draws different pixels',e.d!==e.e);
  fs.writeFileSync(OUT+'text_en.png',Buffer.from((await port.evaluate(()=>T.png('label-reveal',3.7,{texts:{printed:'Printed one by one'}},540))).split(',')[1],'base64')); }
/* the red word and the flavour: the last word of reveal2 and the part after / are crayon red (not white / ink) */
{ const px=await port.evaluate(async()=>{ const c=await T.frame('label-reveal',9.3,{},1080), x=c.getContext('2d'); return Array.from(x.getImageData(0,450,1080,170).data); });
  let red=0,white=0; for(let i=0;i<px.length;i+=4){ if(px[i]>150&&px[i+1]<110&&px[i+2]<110) red++; if(px[i]>235&&px[i+1]>235&&px[i+2]>235) white++; }
  ok('reveal line 2: red letters and white words both present',red>2000&&white>2000,{red,white}); }

/* e) speed */
for(const w of [540,1080]){ const ms=await port.evaluate(w=>T.time('label-reveal',9.3,w,10),w); console.log('speed: '+w+'x'+Math.round(w*16/9)+' = '+ms.toFixed(1)+' ms per frame (reveal)'); }
const msR=await port.evaluate(()=>T.time('label-reveal',7.8,1080,10)); console.log('speed: 1080x1920 rubbing off = '+msR.toFixed(1)+' ms per frame');

ok('no page errors',errs.length===0,errs.slice(0,3));
console.log('\n'+res.join('\n')); await b.close(); process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);

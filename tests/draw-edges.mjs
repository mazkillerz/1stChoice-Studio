/* Drawing edge cases (1.49.0): Restock, Photo story, Offer, Carousel, Collage, Highlight covers. Phone size (390x844).
   1. Words typed on 2-3 lines (Enter), a very long button and a full Offer (3 tiles + dates + small line + button) stay on the
      design: every word layer inside the canvas, story words inside y 250..1620, no two word layers overlapping, no words over
      the photo where the style keeps them apart; a long button never wider than the canvas; Highlight words inside the circle.
   2. Collage "Big + small" with a wide photo then a tall one keeps the small print on the story.
   3. Old designs unchanged: one-line words, defaults and every style draw exactly the same pixels as the files before 1.49.0
      (the newest commit of each tool file without "mLines"; DRAW_OLD=<git ref> to pick one).
   Test words are approved phrases from brands/1stchoice/brand.js. Run: server on :8080 (or BASE=...), node tests/draw-edges.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('..',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const git=(...a)=>{ try{ return execFileSync('git',['-C',ROOT,...a],{encoding:'utf8',maxBuffer:1<<24,stdio:['ignore','pipe','ignore']}); }catch(_){ return ''; } };
const oldOf=f=>{ const refs=process.env.DRAW_OLD?[process.env.DRAW_OLD]:git('log','--format=%H','--','tools/'+f).split('\n').filter(Boolean);
  for(const r of refs){ const t=git('show',r+':tools/'+f); if(t&&!t.includes('mLines')&&!t.includes('poking above')) return t; } return ''; };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

const LONG='لا تعدّي قبل لا تشوف هذا', TWO='وفرنا كمية جديدة\nخذلك كولد برو', THREE='رجع متوفر\nوفرنا كمية جديدة\nخذلك كولد برو';
const BTN='شوف أقرب نقطة بيع لك', HUGE=[BTN,BTN,BTN].join(' ');
const own=t=>({pick:'__own',own:t}), txt=t=>({text:t,on:true});
const open=async(tool,old)=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(old) await ctx.route('**/tools/'+tool+'.js',r=>r.fulfill({contentType:'application/javascript',body:old}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tool+': '+e.message)); await pg.goto(BASE+'tools/'+tool+'.html');
  await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S&&(Studio.debug.S.photos[0]||{}).img,null,{timeout:15000}).catch(()=>{});
  await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(1200); return {ctx,pg};
};
/* set a case (values reset to the tool's start each time; photos of a given shape), draw, check the layers, hash the pixels */
const run=(pg,sc)=>pg.evaluate(async sc=>{
  const S=Studio.debug.S; if(!window.__V0){ window.__V0=JSON.stringify(S.values); window.__P0=S.photos.map(p=>p&&p.img); }
  const V0=JSON.parse(window.__V0); for(const k in S.values) if(!(k in V0)) delete S.values[k]; Object.assign(S.values,V0);
  S.photos.forEach((p,i)=>{ if(p&&window.__P0[i]) p.img=window.__P0[i]; }); if(sc.count) S.count=sc.count;
  if(sc.aspect){ const as=[].concat(sc.aspect); for(let i=0;i<(sc.count||1);i++){ const a=as[i%as.length], c=document.createElement('canvas'); c.width=Math.round(a>=1?1600:1600*a); c.height=Math.round(a>=1?1600/a:1600);
    const x=c.getContext('2d'); x.fillStyle=`hsl(${i*70},60%,50%)`; x.fillRect(0,0,c.width,c.height); if(!S.photos[i]) S.photos[i]={zoom:1,ox:0,oy:0}; S.photos[i].img=c; } }
  if(sc.style) S.style=sc.style; Object.assign(S.values,sc.values||{}); Studio.debug.render(); await new Promise(r=>setTimeout(r,200)); Studio.debug.render();
  const v=document.getElementById('view'), W=1080, H=sc.H||1920, out=[];
  const R=Studio.debug.reg().filter(q=>!q.empty&&!q.hidden&&q.w!=null), f=q=>q.id+'['+Math.round(q.x)+','+Math.round(q.y)+' '+Math.round(q.w)+'x'+Math.round(q.h)+']';
  const words=R.filter(q=>q.photo==null&&q.kind!=='asset'&&(sc.circle||q.kind!=='shape')), photos=R.filter(q=>q.photo!=null);
  const ov=(a,c)=>a.x<c.x+c.w-2&&c.x<a.x+a.w-2&&a.y<c.y+c.h-2&&c.y<a.y+a.h-2;
  words.forEach(q=>{ if(q.x<-1||q.y<-1||q.x+q.w>W+1||q.y+q.h>H+1) out.push('off the design '+f(q)); else if(sc.safe&&(q.y<249||q.y+q.h>1621)) out.push('past the safe line '+f(q));
    if(sc.circle&&Math.max(...[[q.x,q.y],[q.x+q.w,q.y],[q.x,q.y+q.h],[q.x+q.w,q.y+q.h]].map(([a,c])=>Math.hypot(a-540,c-960)))>530) out.push('outside the circle '+f(q)); });
  for(let i=0;i<words.length;i++) for(let j=i+1;j<words.length;j++) if(ov(words[i],words[j])) out.push('overlap '+f(words[i])+' '+f(words[j]));
  if(sc.apart) words.forEach(q=>photos.forEach(p=>{ if(ov(q,p)) out.push('on the photo '+f(q)); }));
  photos.forEach(p=>{ if(p.x<-1||p.y<-1||p.x+p.w>W+1||p.y+p.h>H+1) out.push('photo off the design '+f(p)); });
  const d=v.getContext('2d').getImageData(0,0,v.width,v.height).data; let hh=2166136261>>>0; for(let i=0;i<d.length;i+=4){ hh=Math.imul(hh^d[i],16777619)>>>0; hh=Math.imul(hh^d[i+1],16777619)>>>0; hh=Math.imul(hh^d[i+2],16777619)>>>0; }
  return {out,h:hh};
},sc);

/* the cases per tool: edge = must be clean; same = must match the old file pixel for pixel */
const T={
  restock:{edge:{},same:{}}, 'photo-story':{edge:{},same:{}}, offer:{edge:{},same:{}}, carousel:{edge:{},same:{}}, collage:{edge:{},same:{}}, highlight:{edge:{},same:{}}
};
const full={flav:{picks:['classic','passion']},small:own(LONG),pill:txt(BTN)};
for(const s of ['white','cream','photo','cans','split','poster']){
  T.restock.same[s]={style:s,safe:true}; T.restock.same[s+' all, one line, Large']={style:s,safe:true,values:{...full,hsize:'large'}};
  T.restock.edge[s+': headline on 3 lines, Large, everything on']={style:s,safe:true,values:{...full,head:own(THREE),hsize:'large'}};
  T.restock.edge[s+': headline on 2 lines, tall photo, circle']={style:s,safe:true,aspect:.3,values:{...full,head:own(TWO),hsize:'large',shape:'circle'}};
  T.restock.edge[s+': a very long button']={style:s,safe:true,values:{...full,pill:txt(HUGE)}};
}
for(const s of ['full','white','cream','black','whole','caption','poster','arch']){
  const apart=['caption','poster','arch'].includes(s);
  T['photo-story'].same[s]={style:s,safe:true}; T['photo-story'].same[s+' small line, Large']={style:s,safe:true,values:{small:own(LONG),hsize:'l'}};
  T['photo-story'].edge[s+': headline on 3 lines + small on 2']={style:s,safe:true,apart,values:{head:own(THREE),hsize:'l',small:own(TWO)}};
  T['photo-story'].edge[s+': a very long small line']={style:s,safe:true,apart,values:{small:own(HUGE)}};
  if(!apart) T['photo-story'].edge[s+': middle, centred, 3 lines']={style:s,safe:true,values:{head:own(THREE),hsize:'l',small:own(TWO),pos:'middle-center'}};
}
const tiles=[{small:'×3',big:'20%'},{small:'×6',big:'35%'},{small:'×12',big:'50%'}], dates={on:true,from:'2026-11-10',to:'2026-12-15'};
for(const s of ['white','cream','black','photo']){
  T.offer.same[s]={style:s,safe:true}; T.offer.same[s+' no button']={style:s,safe:true,values:{pill:{text:BTN,on:false}}};
  T.offer.edge[s+': 1 tile + small line + button (was below the safe line)']={style:s,safe:true,values:{small:own(LONG),pill:txt(BTN)}};
  T.offer.edge[s+': 3 tiles + dates + small line + button']={style:s,safe:true,values:{tiles,dates,small:own(LONG),pill:txt(BTN)}};
  T.offer.edge[s+': the same with a tall photo and 2-line headline']={style:s,safe:true,aspect:.3,values:{head:own(TWO),tiles,dates,small:own(LONG),pill:txt(BTN)}};
  T.offer.edge[s+': a very long button']={style:s,safe:true,values:{pill:txt(HUGE)}};
}
for(const k of ['cover','photo','full','two','words','number','end','pano']){
  T.carousel.same[k]={H:1350,values:{kind:k}}; T.carousel.same[k+' one-line words']={H:1350,values:{kind:k,head:own(BTN),small:own(LONG)}};
  T.carousel.edge[k+': headline on 3 lines + small on 2']={H:1350,values:{kind:k,head:own(THREE),small:own(TWO)}};
  T.carousel.edge[k+': long words everywhere']={H:1350,values:{kind:k,head:own(HUGE),small:own(HUGE),pill:txt(HUGE)}};
}
for(const [n,l] of [[2,'stack'],[2,'inset'],[3,'tall2'],[4,'film'],[5,'scatter'],[6,'g-mosaic']]) T.collage.same[n+' '+l]={count:n,values:{['lay'+n]:l}};
T.collage.edge['Big + small: wide photo then a tall one']={count:2,aspect:[5,.25],values:{lay2:'inset'}};
T.collage.edge['Big + small: the same with a border']={count:2,aspect:[5,.25],values:{lay2:'inset',border:30}};
for(const st of ['white','cream','black']){
  T.highlight.same[st+' word']={style:st,values:{kind:'word',word:txt(LONG)}}; T.highlight.same[st+' icon + small word']={style:st,values:{kind:'icon',sub:txt(BTN)}};
  T.highlight.edge[st+': small word on 3 lines under the icon']={style:st,circle:true,values:{kind:'icon',sub:txt(THREE)}};
  T.highlight.edge[st+': word on 3 lines']={style:st,circle:true,values:{kind:'word',word:txt(THREE)}};
}

for(const [tool,c] of Object.entries(T)){
  const OLD=oldOf(tool+'.js'); ok(tool+': found the file before 1.49.0 in git (fetch more history if not)',!!OLD,OLD?'':(git('rev-parse','--is-shallow-repository').trim()==='true'?'shallow clone: git fetch --unshallow':''));
  const a=await open(tool), o=OLD?await open(tool,OLD):null;
  /* the vertical middle of words on several lines, for Highlight: centred in the circle */
  for(const [n,sc] of Object.entries(c.edge)){ const r=await run(a.pg,sc); ok(tool+' · '+n+': stays on the design',!r.out.length,r.out.slice(0,3)); }
  if(tool==='highlight'){ for(const k of ['word','icon']){ await run(a.pg,{style:'white',values:k==='word'?{kind:'word',word:txt(THREE)}:{kind:'icon',sub:txt(THREE)}});
    const box=await a.pg.evaluate(k=>{ const R=Studio.debug.reg().filter(q=>!q.empty&&(k==='word'?q.id==='word':['icon','sub'].includes(q.id))); const y0=Math.min(...R.map(q=>q.y)), y1=Math.max(...R.map(q=>q.y+q.h)); return Math.round((y0+y1)/2); },k);
    ok('highlight · '+k+' on 3 lines: centred in the circle (middle within 40px of 960)',Math.abs(box-960)<=40,box); } }
  if(o) for(const [n,sc] of Object.entries(c.same)){ let x=await run(a.pg,sc), y=await run(o.pg,sc);
    for(let t=0;t<6&&x.h!==y.h;t++){ await Promise.all([a.pg,o.pg].map(p=>p.evaluate(()=>document.fonts.ready))); await a.pg.waitForTimeout(1500); x=await run(a.pg,sc); y=await run(o.pg,sc); }   // a late font or picture (slow font proxy under load): wait for fonts, draw again
    let why=''; if(x.h!==y.h) why=JSON.stringify(await Promise.all([a.pg,o.pg].map(p=>p.evaluate(()=>[...document.fonts].filter(f=>f.status!=='unloaded').map(f=>f.family.replace(/["']/g,'')+':'+f.weight+':'+f.status+':'+(f.unicodeRange||'').slice(0,12)).sort().join(' ')))));
    if(x.h!==y.h&&process.env.DUMP_DIR){   // where do the pixels differ? (the two PNGs and the differing box go to DUMP_DIR)
      const png=p=>p.evaluate(()=>document.getElementById('view').toDataURL('image/png')); const [pa,po]=[await png(a.pg),await png(o.pg)], k=tool+'-'+n.replace(/\W+/g,'_');
      fs.writeFileSync(process.env.DUMP_DIR+'/de-'+k+'-new.png',Buffer.from(pa.split(',')[1],'base64')); fs.writeFileSync(process.env.DUMP_DIR+'/de-'+k+'-old.png',Buffer.from(po.split(',')[1],'base64'));
      why=' DIFF '+JSON.stringify(await a.pg.evaluate(async u=>{ const im=new Image(); im.src=u; await im.decode(); const v=document.getElementById('view'), g=(c,w,h)=>{ const k=document.createElement('canvas'); k.width=w; k.height=h; const x=k.getContext('2d'); x.drawImage(c,0,0); return x.getImageData(0,0,w,h).data; };
        const A=g(v,v.width,v.height), B=g(im,v.width,v.height); let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0; for(let i=0;i<A.length;i+=4) if(A[i]!==B[i]||A[i+1]!==B[i+1]||A[i+2]!==B[i+2]){ n++; const p=i/4, px=p%v.width, py=(p/v.width)|0; x0=Math.min(x0,px); x1=Math.max(x1,px); y0=Math.min(y0,py); y1=Math.max(y1,py); } return {n,box:[x0,y0,x1,y1]}; },po))+' '+why; }
    ok(tool+' · '+n+': same pixels as before 1.49.0',x.h===y.h,why.slice(0,900)); }
  await a.ctx.close(); if(o) await o.ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3));
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`draw-edges: ${res.length-fails} pass, ${fails} fail, ${Math.round((Date.now()-t0)/1000)} s`);
await b.close(); process.exit(fails?1:0);

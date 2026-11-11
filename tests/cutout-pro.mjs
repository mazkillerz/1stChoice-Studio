/* Cutout Pro (r3): numbers, not looks. Logo mode against canvas-drawn ground truth (alpha error, nothing outside the shape, holes,
   halo check on black and magenta, 1-2 px strokes, JPEG/gradient/uneven light), already-transparent input, trim, speed; photo mode
   (local model) against the known can alpha and against StudioCutout.run. Run: server on :8080 (BASE=... to change), node tests/cutout-pro.mjs */
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const res=[]; const ok=(n,c,i)=>{ const r=(c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i).slice(0,300):''); res.push(r); if(process.env.LIVE) console.log(r); };
const b=await chromium.launch(), errs=[];
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true});
const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource|fonts\.g/.test(m.text())) errs.push(m.text()); });
await pg.goto(BASE+'lab/cutout-pro-test.html'); await pg.addScriptTag({url:BASE+'assets/cutout.js'});
ok('page loads, API present, supported',await pg.evaluate(()=>['analyse','run','trim','supported'].every(k=>typeof StudioCutoutPro[k]==='function')&&StudioCutoutPro.supported('logo')===''));

/* measure one case in the page */
const measure=(name,opts)=>pg.evaluate(async ([name,opts])=>{
  const c=await CutoutCases.make(name), t0=performance.now(), out=await StudioCutoutPro.run(c.img,Object.assign({mode:'logo'},opts||{})), ms=performance.now()-t0;
  const W=out.width,H=out.height,rd=out.getContext('2d').getImageData(0,0,W,H).data,td=c.truth.getContext('2d').getImageData(0,0,W,H).data,n=W*H;
  let err=0; for(let i=0;i<n;i++) err+=Math.abs(rd[i*4+3]-td[i*4+3])/255;
  /* shape = truth alpha > .02, grown by 2px (chebyshev) */
  const sh=new Uint8Array(n); for(let i=0;i<n;i++) sh[i]=td[i*4+3]>5?1:0;
  const tmp=new Uint8Array(n),gr=new Uint8Array(n);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ let v=0; for(let q=Math.max(0,x-2);q<=Math.min(W-1,x+2);q++) if(sh[y*W+q]){ v=1; break; } tmp[y*W+x]=v; }
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ let v=0; for(let q=Math.max(0,y-2);q<=Math.min(H-1,y+2);q++) if(tmp[q*W+x]){ v=1; break; } gr[y*W+x]=v; }
  let outside=0; for(let i=0;i<n;i++) if(!gr[i]&&rd[i*4+3]>25) outside++;
  /* composites on black and magenta vs the truth composite */
  const comp=(cv,col)=>{ const k=document.createElement('canvas'); k.width=W; k.height=H; const x=k.getContext('2d'); x.fillStyle=col; x.fillRect(0,0,W,H); x.drawImage(cv,0,0); return x.getImageData(0,0,W,H).data; };
  const halo={}; for(const col of ['#000000','#ff00ff']){ const a=comp(out,col),t=comp(c.truth,col); let e=0,en=0,es=0; for(let i=0;i<n;i++){ const d=(Math.abs(a[i*4]-t[i*4])+Math.abs(a[i*4+1]-t[i*4+1])+Math.abs(a[i*4+2]-t[i*4+2]))/3; e+=d; const ta=td[i*4+3]; if(ta>5&&ta<250){ es+=d; en++; } } halo[col]={all:e/n,edge:es/Math.max(1,en)}; }
  /* enclosed truth-transparent regions (counters): mean result alpha inside, and inside truth-white enclosed text */
  const lab=new Int32Array(n),stack=new Int32Array(n); let cnt=0; const comps=[];
  for(let s=0;s<n;s++){ if(lab[s]||td[s*4+3]>5) continue; cnt++; let sp=0,a=0,touch=false; stack[sp++]=s; lab[s]=cnt; const px=[];
    while(sp){ const p=stack[--sp]; a++; px.push(p); const x=p%W,y=(p/W)|0; if(x===0||y===0||x===W-1||y===H-1) touch=true;
      for(const q of [x>0?p-1:-1,x<W-1?p+1:-1,y>0?p-W:-1,y<H-1?p+W:-1]) if(q>=0&&!lab[q]&&td[q*4+3]<=5){ lab[q]=cnt; stack[sp++]=q; } }
    if(!touch&&a>=40) comps.push(px); }
  let hs=0,hn=0; for(const px of comps) for(const p of px){ hs+=rd[p*4+3]/255; hn++; }
  /* white text kept: truth opaque near-white pixels */
  let wk=0,wn=0; for(let i=0;i<n;i++) if(td[i*4+3]>250&&td[i*4]>235&&td[i*4+1]>235&&td[i*4+2]>235){ wn++; if(rd[i*4+3]>240) wk++; }
  /* thin strokes: truth alpha > .5 pixels that survive */
  let tk=0,tn=0; for(let i=0;i<n;i++) if(td[i*4+3]>128){ tn++; if(rd[i*4+3]>128) tk++; }
  return {ms:Math.round(ms),mae:err/n,outside,halo,holes:comps.length,holeAlpha:hn?hs/hn:null,whiteN:wn,whiteKept:wn?wk/wn:null,strokeKeep:tn?tk/tn:null,W,H,info:c.note};
},[name,opts]);

const FLAT=['wordmark','badge','whiteOnDark','thin','brandLogo','brandLogoCream','brandCan'], SOFT=['jpeg','jpegColour','gradient','paper','paperColour','twoTone','shadow'];
const R={};
for(const n of [...FLAT,...SOFT]){
  const r=R[n]=await measure(n);
  const lim=FLAT.includes(n)?.02:.05;
  ok(n+': mean alpha error '+r.mae.toFixed(4)+' <= '+lim,r.mae<=lim,r.mae);
  ok(n+': nothing outside the shape (+2px) with alpha > 0.1 ('+r.outside+' px)',r.outside<=(n==='jpegColour'?20:6),r.outside);
  if(!/^paper/.test(n)){
    const lim2=SOFT.includes(n)?3:1.5;
    ok(n+': composite on black and magenta matches the truth (mean '+r.halo['#000000'].all.toFixed(2)+' / '+r.halo['#ff00ff'].all.toFixed(2)+' of 255, edges '+r.halo['#ff00ff'].edge.toFixed(1)+')',r.halo['#000000'].all<=lim2&&r.halo['#ff00ff'].all<=lim2&&r.halo['#ff00ff'].edge<=(n==='jpegColour'?22:14)&&r.halo['#000000'].edge<=(n==='jpegColour'?22:14),r.halo);
  }
}
ok('wordmark: letter counters cleared with holes:true (mean alpha '+R.wordmark.holeAlpha?.toFixed(3)+', '+R.wordmark.holes+' holes)',R.wordmark.holes>=2&&R.wordmark.holeAlpha<=.05,R.wordmark);
ok('brand logo: counters cleared with holes:true ('+R.brandLogo.holeAlpha?.toFixed(3)+')',R.brandLogo.holes>=2&&R.brandLogo.holeAlpha<=.06,R.brandLogo);
ok('badge: white text and ring inside a red badge are kept with holes:true ('+(R.badge.whiteKept*100).toFixed(1)+'%)',R.badge.whiteN>1000&&R.badge.whiteKept>=.9,R.badge);
ok('white logo on dark ground: counters of the O cleared, logo intact',R.whiteOnDark.mae<=.02);
ok('thin 1-2 px strokes survive ('+(R.thin.strokeKeep*100).toFixed(1)+'% of stroke pixels above 0.5)',R.thin.strokeKeep>=.9,R.thin);
ok('JPEG artefacts: ringing leaves no dust ('+R.jpeg.outside+' / '+R.jpegColour.outside+' px outside)',R.jpeg.outside<=6&&R.jpegColour.outside<=20);
const keep=await measure('wordmark',{holes:false});
ok('holes:false keeps every enclosed area (mean counter alpha '+keep.holeAlpha?.toFixed(3)+')',keep.holeAlpha>=.95,keep);
const keepB=await measure('badge',{holes:false});
ok('holes:false on the badge keeps its white text too',keepB.whiteKept>=.9,keepB);
const keepL=await measure('brandLogo',{holes:false});
ok('holes:false on the brand logo keeps the counters',keepL.holeAlpha>=.95,keepL);
/* tolerance: higher removes at least as much */
const tl=await pg.evaluate(async()=>{ const c=await CutoutCases.make('paper'),f=async t=>{ const o=await StudioCutoutPro.run(c.img,{mode:'logo',tolerance:t}),d=o.getContext('2d').getImageData(0,0,o.width,o.height).data; let s=0; for(let i=3;i<d.length;i+=4) s+=d[i]; return s; }; return [await f(10),await f(50),await f(90)]; });
ok('tolerance is monotonic (alpha mass '+tl.map(v=>Math.round(v/255)).join(' >= ')+')',tl[0]>=tl[1]-255&&tl[1]>=tl[2]-255,tl);

/* analyse + auto + keep + trim + speed */
const an=await pg.evaluate(async()=>{ const o={}; for(const n of ['wordmark','gradient','shadow','paper','brandCan']){ const c=await CutoutCases.make(n); o[n]=await StudioCutoutPro.analyse(c.img); }
  const img=await new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src='../brands/1stchoice/samples/hand.jpg'; }); o.photo=await StudioCutoutPro.analyse(img); return o; });
ok('analyse: flat logo grounds suggest logo, white bg found',['wordmark','gradient','shadow','paper','brandCan'].every(k=>an[k].suggest==='logo'&&an[k].flat)&&an.wordmark.bg.every(v=>v>245)&&an.wordmark.w===1000&&an.wordmark.h===640,an);
ok('analyse: a busy photo suggests photo',an.photo.suggest==='photo'&&!an.photo.flat,an.photo);
const tr=await pg.evaluate(async()=>{
  const c=document.createElement('canvas'); c.width=300; c.height=200; const x=c.getContext('2d'); x.fillStyle='#e23'; x.beginPath(); x.arc(150,100,60,0,7); x.fill();
  const before=x.getImageData(0,0,300,200).data, a=await StudioCutoutPro.analyse(c), o=await StudioCutoutPro.run(c,{mode:'auto'}), after=o.getContext('2d').getImageData(0,0,o.width,o.height).data;
  let same=o.width===300&&o.height===200; for(let i=0;i<before.length&&same;i++) if(before[i]!==after[i]) same=false;
  const t0=StudioCutoutPro.trim(c), t5=StudioCutoutPro.trim(c,5), empty=document.createElement('canvas'); empty.width=50; empty.height=40;
  const full=document.createElement('canvas'); full.width=20; full.height=20; full.getContext('2d').fillRect(0,0,20,20);
  return {a,same,t0:[t0.width,t0.height],t5:[t5.width,t5.height],emptySame:StudioCutoutPro.trim(empty)===empty,fullSame:StudioCutoutPro.trim(full)===full,notCopy:t0!==c}; });
ok('already-transparent input: analyse says keep, auto run returns it unchanged',tr.a.hasAlpha&&tr.a.suggest==='keep'&&tr.same,tr);
ok('trim: box is exact, pad adds px, nothing to trim returns the same canvas',tr.t0[0]>=118&&tr.t0[0]<=122&&tr.t0[1]>=118&&tr.t0[1]<=122&&tr.t5[0]===tr.t0[0]+10&&tr.t5[1]===tr.t0[1]+10&&tr.emptySame&&tr.fullSame&&tr.notCopy,tr);
const big=await pg.evaluate(async()=>{ const c=await CutoutCases.make('jpegColour'), k=document.createElement('canvas'); k.width=2000; k.height=2000; const x=k.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,2000,2000); x.drawImage(c.img,0,180,2000,1640);
  const t0=performance.now(), o=await StudioCutoutPro.run(k,{mode:'logo'}); const ms=performance.now()-t0; const d=o.getContext('2d').getImageData(0,0,o.width,o.height).data; let tr=0,op=0; for(let i=3;i<d.length;i+=4){ if(d[i]<5) tr++; else if(d[i]>250) op++; }
  const t1=performance.now(); const big=document.createElement('canvas'); big.width=3000; big.height=1500; const bx=big.getContext('2d'); bx.fillStyle='#fff'; bx.fillRect(0,0,3000,1500); bx.drawImage(c.img,0,0,3000,1500); const o2=await StudioCutoutPro.run(big,{mode:'logo'});
  return {ms:Math.round(ms),w:o.width,h:o.height,tr,op,cap:[o2.width,o2.height]}; });
ok('a 2000x2000 logo finishes in under 3 s ('+big.ms+' ms) with transparent and opaque areas',big.ms<3000&&big.w===2000&&big.tr>1e5&&big.op>1e5,big);
ok('input larger than 2048 is capped on the long side',big.cap[0]===2048&&big.cap[1]===1024,big.cap);
ok('a UI-friendly progress text is reported',await pg.evaluate(async()=>{ const t=[]; const c=await CutoutCases.make('wordmark'); await StudioCutoutPro.run(c.img,{mode:'logo',onProgress:s=>t.push(s)}); return t.length>0&&t.every(s=>typeof s==='string'); }));
/* the UI never freezes while the worker thinks */
const frames=await pg.evaluate(async()=>{ const gaps=[]; let last=performance.now(),go=true; const f=t=>{ gaps.push(t-last); last=t; if(go) requestAnimationFrame(f); }; requestAnimationFrame(f);
  const k=document.createElement('canvas'); k.width=2000; k.height=2000; const x=k.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,2000,2000); x.fillStyle='#000'; x.font='900 500px sans-serif'; x.fillText('Logo',100,1000);
  await StudioCutoutPro.run(k,{mode:'logo'}); go=false; return {n:gaps.length,worst:Math.max(...gaps)}; });
ok('logo mode keeps the page drawing (longest frame gap '+Math.round(frames.worst)+' ms over '+frames.n+' frames)',frames.n>3&&frames.worst<400,frames);

/* photo mode: local model, same files as the existing remover */
const ph=await pg.evaluate(async()=>{
  const ld=s=>new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src=s; });
  const img=await ld('../tests/fixtures/cutout-can.jpg'), al=await ld('../tests/fixtures/cutout-can-alpha.png'), W=img.naturalWidth,H=img.naturalHeight;
  const g=document.createElement('canvas'); g.width=W; g.height=H; const gx=g.getContext('2d'); gx.drawImage(al,0,0,W,H); const gd=gx.getImageData(0,0,W,H).data;
  const near=new Uint8Array(W*H); for(let y=4;y<H-4;y++) for(let x=4;x<W-4;x++){ const i=(y*W+x)*4; for(const [dx,dy] of [[-4,0],[4,0],[0,-4],[0,4]]) if((gd[((y+dy)*W+x+dx)*4]>127)!==(gd[i]>127)){ near[y*W+x]=1; break; } }
  const score=c=>{ const d=c.getContext('2d').getImageData(0,0,W,H).data; let I=0,U=0,e=0,n=0,tr=0,op=0,gs=0,gn=0;
    for(let i=0;i<W*H;i++){ const a=d[i*4+3]/255,t=gd[i*4]/255; if(a>.5&&t>.5) I++; if(a>.5||t>.5) U++; if(near[i]){ e+=Math.abs(a-t); n++; } if(a<.02) tr++; if(a>.98) op++; }
    for(let y=2;y<H-2;y++) for(let x=2;x<W-2;x++){ const i=(y*W+x)*4+3; const a=d[i]>127; if(a!==(d[i-4]>127)||a!==(d[i+4]>127)||a!==(d[i-W*4]>127)||a!==(d[i+W*4]>127)){ gs+=Math.max(Math.abs(d[i+4]-d[i-4]),Math.abs(d[i+W*4]-d[i-W*4]))/255; gn++; } }
    return {iou:I/U,bandErr:e/n,tr,op,sharp:gs/Math.max(1,gn),w:c.width,h:c.height}; };
  const t0=performance.now(); const notes=[]; const a=await StudioCutoutPro.run(img,{mode:'photo',onProgress:s=>notes.push(s)}); const ms=performance.now()-t0; const o=await StudioCutout.run(img);
  return {pro:score(a),old:score(o),ms:Math.round(ms),notes,W,H}; });
ok('photo: a canvas of the right size with transparent and opaque areas ('+ph.pro.w+'x'+ph.pro.h+', '+ph.ms+' ms)',ph.pro.w===ph.W&&ph.pro.h===ph.H&&ph.pro.tr>1e4&&ph.pro.op>1e4,ph.pro);
ok('photo: IoU against the known can alpha >= 0.97 ('+ph.pro.iou.toFixed(4)+')',ph.pro.iou>=.97,ph.pro);
ok('photo: edge band error is lower than StudioCutout.run ('+ph.pro.bandErr.toFixed(3)+' vs '+ph.old.bandErr.toFixed(3)+')',ph.pro.bandErr<ph.old.bandErr,ph);
ok('photo: edge sharpness (mean alpha gradient on the boundary) is higher than StudioCutout.run ('+ph.pro.sharp.toFixed(3)+' vs '+ph.old.sharp.toFixed(3)+')',ph.pro.sharp>ph.old.sharp,ph);
ok('photo: reports progress text',ph.notes.length>0,ph.notes);
ok('no page errors',errs.length===0,errs);
await b.close();
const fails=res.filter(r=>r.startsWith('FAIL')); console.log(res.join('\n')); console.log('\n'+(res.length-fails.length)+' passed, '+fails.length+' failed'); process.exit(fails.length?1:0);

/* Collage test: the grids, the border, the spacing, and "nothing that existed has changed". Phone size (390x844, touch).
   1. Compatibility: with default style values every existing layout (all counts) draws exactly the same pixels as the previous
      collage.js (the newest commit of tools/collage.js that has no "Edge space" field; or COLLAGE_OLD=<git ref>), also with the
      old fields changed (gap, radius, margin, logo, look) and with real photos of different shapes. Old layout values and field ids are all still there.
   2. Every grid of every count (existing + new, 2 to 9 photos): each unit covered once, no overlapping boxes, the area is filled
      (only gaps left), boxes inside the canvas and where the maths says; at the default look and with gap 80 + edge 120 + border 20.
   3. Border: the border colour shows at a photo's edge, the frame is the same width on all four sides in grid, whole-photo
      and scattered layouts, and border 0 draws exactly what it drew before.
   4. Spacing: gap goes to 80, Edge space moves the first box, the outer margin is max(gap, edge), Edge space hides with the margin.
   5. The Style sheet's order; a real 4-photo set with a new grid saves as a 2160x3840 PNG.
   6. No page errors.
   Run: npx http-server -p 8080 -c-1 .  then  node tests/collage-grids.mjs   (BASE=... to change the server). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('..',import.meta.url).pathname;
const SAMPLES=ROOT+'brands/1stchoice/samples/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const W=1080, H=1920;

/* the collage.js to compare with: the newest version that does not have the new "Edge space" field */
const git=(...a)=>{ try{ return execFileSync('git',['-C',ROOT,...a],{encoding:'utf8',maxBuffer:1e7,stdio:['ignore','pipe','ignore']}); }catch(e){ return ''; } };
const oldSource=()=>{ const refs=process.env.COLLAGE_OLD?[process.env.COLLAGE_OLD]:['HEAD',...git('log','--format=%H','--','tools/collage.js').split('\n').filter(Boolean)];
  for(const r of refs){ const s=git('show',r+':tools/collage.js'); if(s&&!s.includes("id:'edge'")) return s; } return ''; };
const OLD=oldSource();

const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

const newCtx=async(old)=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(old) await ctx.route('**/tools/collage.js',r=>r.fulfill({contentType:'application/javascript',body:old}));
  return ctx; };
const openCollage=async(ctx,tag)=>{
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message));
  await pg.goto(BASE+'tools/collage.html');
  await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.photos[0].img&&Studio.debug.S.photos.slice(0,9).every(p=>p.img),null,{timeout:15000}).catch(()=>{});
  await pg.waitForTimeout(400); return pg; };

/* ---- doing things the way a person does: bottom bar -> sheet -> tap ---- */
const openSheet=async(pg,n)=>{ if(!await pg.evaluate(n=>document.getElementById('sh-'+n).classList.contains('open'),n)){ await pg.tap(`#bar [data-open="${n}"]`); await pg.waitForTimeout(320); } };
const setCount=async(pg,n)=>{ await openSheet(pg,'photo'); await pg.locator(`#sh-photo [data-count="${n}"]`).tap(); await pg.waitForTimeout(120); };
const setLay=async(pg,n,v)=>{ await openSheet(pg,'style'); await pg.locator(`#sh-style [data-seg="lay${n}"] [data-v="${v}"]`).tap(); await pg.waitForTimeout(120); };
const setStyle=async(pg,id)=>{ await openSheet(pg,'style'); await pg.locator(`#sh-style [data-style="${id}"]`).tap(); await pg.waitForTimeout(120); };
const setRange=async(pg,id,v)=>{ await openSheet(pg,'style'); await pg.evaluate(([id,v])=>{ const r=document.querySelector(`[data-range="${id}"]`); r.value=v; r.dispatchEvent(new Event('input',{bubbles:true})); },[id,v]); await pg.waitForTimeout(80); };
const setToggle=async(pg,id,on)=>{ await openSheet(pg,'style'); const c=pg.locator(`#sh-style [data-toggle="${id}"]`); if(await c.isChecked()!==on){ await c.evaluate(e=>e.click()); } await pg.waitForTimeout(80); };
const setHex=async(pg,id,hex)=>{ await openSheet(pg,'style'); await pg.locator(`#sh-style [data-pal="f:${id}"] [data-chex]`).fill(hex); await pg.waitForTimeout(80); };
const setAuto=async(pg,id)=>{ await openSheet(pg,'style'); await pg.locator(`#sh-style [data-pal="f:${id}"] [data-c=""]`).tap(); await pg.waitForTimeout(80); };
const settle=pg=>pg.evaluate(()=>new Promise(r=>{ Studio.debug.render(); requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,60))); }));
/* a fingerprint of the preview pixels: 12 horizontal bands, so a mismatch says where */
const bands=async pg=>{ await settle(pg); return pg.evaluate(()=>{ const c=document.getElementById('view'), d=new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer), per=Math.floor(d.length/12), out=[];
  for(let k=0;k<12;k++){ let h=2166136261; for(let i=k*per;i<(k+1)*per;i++) h=Math.imul(h^d[i],16777619); out.push((h>>>0).toString(16)); } return out.join(''); }); };
const photoBoxes=pg=>pg.evaluate(()=>Studio.debug.reg().filter(x=>x.photo!=null).sort((p,q)=>p.photo-q.photo).map(x=>({i:x.photo,x:x.x,y:x.y,w:x.w,h:x.h})));
const values=pg=>pg.evaluate(()=>JSON.parse(JSON.stringify(Studio.debug.S.values)));
const px=(pg,pts)=>pg.evaluate(pts=>{ const c=document.getElementById('view'), x=c.getContext('2d'); return pts.map(([a,b])=>Array.from(x.getImageData(Math.round(a),Math.round(b),1,1).data).slice(0,3)); },pts);
const isRed=p=>p[0]>200&&p[1]<60&&p[2]<60;
/* how many red pixels in a row, starting at (x,y) and stepping (dx,dy) */
const runRed=(pg,x,y,dx,dy)=>pg.evaluate(([x,y,dx,dy])=>{ const c=document.getElementById('view'), q=c.getContext('2d'); let n=0; for(let i=0;i<120;i++){ const px=x+dx*i, py=y+dy*i; if(px<0||py<0||px>=c.width||py>=c.height) break; const d=q.getImageData(Math.round(px),Math.round(py),1,1).data; if(d[0]>200&&d[1]<60&&d[2]<60) n++; else break; } return n; },[x,y,dx,dy]);

/* ================= 1. compatibility with the previous collage.js ================= */
const counts=[2,3,4,5,6,7,8,9];
if(!OLD){ ok('compat: an earlier collage.js is in git to compare with (skipped, none found)',true); }
else {
  const cO=await newCtx(OLD), cN=await newCtx(), pO=await openCollage(cO,'old'), pN=await openCollage(cN,'new');
  const optionsOf=(pg,n)=>pg.$$eval(`[data-seg="lay${n}"] .seg`,l=>l.map(x=>x.dataset.v));
  const fieldIds=pg=>pg.evaluate(()=>Object.keys(Studio.debug.S.values));
  /* every old option and field id is still there, old ones first, new ones after */
  const kept=[], added=[];
  for(const n of counts){ const o=await optionsOf(pO,n), m=await optionsOf(pN,n), oNoSc=o.filter(v=>v!=='scatter');
    kept.push(oNoSc.every((v,i)=>m[i]===v)&&(!o.includes('scatter')||m[m.length-1]==='scatter')); added.push(m.length-o.length); }
  ok('compat: every old layout option is still there, in the same order, new ones after them',kept.every(Boolean),kept.join());
  ok('compat: 2 to 9 photos each got at least 2 new layouts',added.every(x=>x>=2),added.join());
  const fo=await fieldIds(pO), fn=await fieldIds(pN);
  ok('compat: every old field id still exists; new ones are border, bcol, edge',fo.every(f=>fn.includes(f))&&['border','bcol','edge'].every(f=>fn.includes(f)&&!fo.includes(f)),fn.join());
  const defs=await values(pN);
  ok('compat: new fields default to border 0, white border (auto), edge 40, gap range up to 80',defs.border===0&&defs.bcol==null&&defs.edge===40&&defs.margin===true&&await pN.$eval('[data-range="gap"]',e=>+e.max)===80,defs);

  const same=async(name,pre)=>{ const [x,y]=await Promise.all([bands(pO),bands(pN)]); const bad=[]; for(let k=0;k<12;k++) if(x.slice(k*8,k*8+8)!==y.slice(k*8,k*8+8)) bad.push(k); ok('compat: '+name,!bad.length,bad.length?'bands '+bad.join(','):''); return !bad.length; };
  const both=async f=>{ await Promise.all([f(pO),f(pN)]); };
  /* every existing layout of every count, default style values, the sample photos */
  for(const n of counts){
    await both(p=>setCount(p,n)); const opts=await optionsOf(pO,n); const bad=[];
    for(const v of opts){ await both(p=>setLay(p,n,v)); const [x,y]=await Promise.all([bands(pO),bands(pN)]); if(x!==y) bad.push(v); }
    ok(`compat: ${n} photos, all ${opts.length} old layouts draw the same pixels (defaults, sample photos)`,!bad.length,bad.join()); }
  /* the old fields changed: gap, radius, margin, logo, looks */
  const combos=[[2,'inset'],[3,'tall2'],[4,'film'],[4,'g-2-2'],[5,'g-bento'],[6,'scatter'],[3,'row'],[9,'g-mosaic']];
  const tweaks=[['gap 30',p=>setRange(p,'gap',30)],['radius 24',p=>setRange(p,'radius',24)],['margin off',p=>setToggle(p,'margin',false)],['no logo',p=>setToggle(p,'logo',false)],['black look',p=>setStyle(p,'black')],['cream look',p=>setStyle(p,'cream')]];
  for(const [name,f] of tweaks){ const bad=[]; await both(f);
    for(const [n,v] of combos){ await both(p=>setCount(p,n)); await both(p=>setLay(p,n,v)); const [x,y]=await Promise.all([bands(pO),bands(pN)]); if(x!==y) bad.push(n+'/'+v); }
    ok(`compat: with ${name}, ${combos.length} layouts draw the same pixels`,!bad.length,bad.join());
    if(name==='margin off') await both(p=>setToggle(p,'margin',true)); if(name==='no logo') await both(p=>setToggle(p,'logo',true)); if(name==='radius 24') await both(p=>setRange(p,'radius',0)); if(name==='gap 30') await both(p=>setRange(p,'gap',14)); if(name==='cream look') await both(p=>setStyle(p,'white')); }
  /* real photos of different shapes: whole-photo layouts depend on them */
  await both(p=>setCount(p,4)); const real=['pair','tall','window','shelf','hand','closeup','passion','foam','beans'].map(f=>SAMPLES+f+'.jpg');
  await both(async p=>{ await p.setInputFiles('#pick',real.slice(0,4)); await p.waitForFunction(()=>Studio.debug.S.photos.slice(0,4).every(x=>x.img&&!x.sample),null,{timeout:15000}); });
  const badReal=[]; let nReal=0;
  for(const [n,v] of [[4,'wide'],[4,'zigzag'],[4,'grid'],[4,'big3'],[4,'film'],[4,'g-big-3'],[4,'scatter']]){ await both(p=>setLay(p,n,v)); nReal++; const [x,y]=await Promise.all([bands(pO),bands(pN)]); if(x!==y) badReal.push(v); }
  await both(p=>setCount(p,3)); await both(async p=>{ await p.setInputFiles('#pick',real.slice(4,7)); await p.waitForTimeout(500); });
  for(const [n,v] of [[3,'framed'],[3,'stagger'],[3,'big'],[3,'row'],[3,'tall2'],[3,'scatter']]){ await both(p=>setLay(p,n,v)); nReal++; const [x,y]=await Promise.all([bands(pO),bands(pN)]); if(x!==y) badReal.push(v); }
  await both(p=>setCount(p,2)); for(const v of ['stack','diag','side','inset','scatter']){ await both(p=>setLay(p,2,v)); nReal++; const [x,y]=await Promise.all([bands(pO),bands(pN)]); if(x!==y) badReal.push('2/'+v); }
  ok(`compat: ${nReal} whole-photo / scattered layouts with real photos draw the same pixels`,!badReal.length,badReal.join());
  await cO.close(); await cN.close();
}

/* ================= 2. every grid of every count ================= */
const cx=await newCtx(), pg=await openCollage(cx,'new');
const GR=await pg.evaluate(()=>JSON.parse(JSON.stringify(GR)));
const expectedBoxes=(g,gap,margin,edge,logo)=>{ let ax=0,ay=0,aw=W,ah=H; if(margin){ const m=Math.max(gap,edge); ax=m; ay=m; aw=W-2*m; ah=(logo?H-260:H-m)-m; }
  const cw=(aw-gap*(g.cols-1))/g.cols, rh=(ah-gap*(g.rows-1))/g.rows;
  return {area:{ax,ay,aw,ah},boxes:g.cells.map(([c,r,cs=1,rs=1])=>({x:ax+c*(cw+gap),y:ay+r*(rh+gap),w:cs*cw+(cs-1)*gap,h:rs*rh+(rs-1)*gap}))}; };
/* what the gaps should add up to, worked out from which grid units belong to which cell */
const gapArea=(g,gap,aw,ah)=>{ const own=Array.from({length:g.rows},()=>Array(g.cols).fill(-1)); g.cells.forEach(([c,r,cs=1,rs=1],k)=>{ for(let y=r;y<r+rs;y++) for(let x=c;x<c+cs;x++) own[y][x]=k; });
  const cw=(aw-gap*(g.cols-1))/g.cols, rh=(ah-gap*(g.rows-1))/g.rows; let s=0;
  for(let y=0;y<g.rows;y++) for(let x=0;x<g.cols;x++){ if(x+1<g.cols&&own[y][x]!==own[y][x+1]) s+=gap*rh; if(y+1<g.rows&&own[y][x]!==own[y+1][x]) s+=cw*gap;
    if(x+1<g.cols&&y+1<g.rows&&!(own[y][x]===own[y][x+1]&&own[y][x]===own[y+1][x]&&own[y][x]===own[y+1][x+1])) s+=gap*gap; }
  return s; };
const checkGrid=(g,boxes,{gap,margin,edge,logo,bw})=>{
  const bad=[]; const n=g.cells.length;
  /* the units: each covered exactly once */
  const occ=Array(g.cols*g.rows).fill(0); g.cells.forEach(([c,r,cs=1,rs=1])=>{ for(let y=r;y<r+rs;y++) for(let x=c;x<c+cs;x++){ if(x>=g.cols||y>=g.rows) bad.push('unit outside'); else occ[y*g.cols+x]++; } });
  if(occ.some(v=>v!==1)) bad.push('units not covered exactly once');
  if(boxes.length!==n) { bad.push('boxes '+boxes.length+'/'+n); return bad; }
  const ex=expectedBoxes(g,gap,margin,edge,logo), {ax,ay,aw,ah}=ex.area;
  /* the registered photo boxes are the cells (shrunk by the border) */
  const cells=boxes.map(q=>({x:q.x-bw,y:q.y-bw,w:q.w+2*bw,h:q.h+2*bw}));
  ex.boxes.forEach((e,i)=>{ const c=cells[i]; if(Math.abs(c.x-e.x)>.6||Math.abs(c.y-e.y)>.6||Math.abs(c.w-e.w)>.6||Math.abs(c.h-e.h)>.6) bad.push('box '+i+' not where it should be'); });
  if(boxes.some(q=>q.x<-.01||q.y<-.01||q.x+q.w>W+.01||q.y+q.h>H+.01||q.w<=0||q.h<=0)) bad.push('a box leaves the canvas');
  if(cells.some(c=>c.x<ax-.6||c.y<ay-.6||c.x+c.w>ax+aw+.6||c.y+c.h>ay+ah+.6)) bad.push('a cell leaves the area');
  /* no overlaps */
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const p=cells[i], q=cells[j], ix=Math.min(p.x+p.w,q.x+q.w)-Math.max(p.x,q.x), iy=Math.min(p.y+p.h,q.y+q.h)-Math.max(p.y,q.y); if(ix>.5&&iy>.5) bad.push('overlap '+i+'/'+j); }
  /* the area is filled: the cells plus the gaps are the whole area */
  const sum=cells.reduce((s,c)=>s+c.w*c.h,0), want=aw*ah-gapArea(g,gap,aw,ah);
  if(Math.abs(sum-want)>Math.max(2,want*1e-5)) bad.push('areas '+Math.round(sum)+' vs '+Math.round(want));
  /* and nothing in the area is further than half a gap from a cell */
  let hole=0; for(let y=ay+1;y<ay+ah;y+=6) for(let x=ax+1;x<ax+aw;x+=6){ let near=false; for(const c of cells){ if(x>=c.x-gap/2-1&&x<=c.x+c.w+gap/2+1&&y>=c.y-gap/2-1&&y<=c.y+c.h+gap/2+1){ near=true; break; } } if(!near){ hole++; break; } }
  if(hole) bad.push('a hole in the area');
  return bad; };
const sweep=async(label,setup,opt)=>{ let total=0; const fails=[]; const before=errs.length;
  for(const n of counts){ await setCount(pg,n);
    for(const g of GR[n]){ await setLay(pg,n,g.v); await settle(pg); total++; const boxes=await photoBoxes(pg); const bad=checkGrid(g,boxes,opt); if(bad.length) fails.push(n+'/'+g.v+': '+bad.slice(0,2).join('; ')); } }
  ok(`${label}: ${total} grids (2 to 9 photos) fill the area, no overlaps, boxes inside the canvas`,!fails.length&&total>=54,fails.slice(0,4).join(' | ')||total);
  ok(`${label}: they draw without errors`,errs.length===before,errs.slice(before,before+1).join()); };
await sweep('default look',null,{gap:14,margin:true,edge:40,logo:true,bw:0});
/* the new grids per count */
{ const per=counts.map(n=>GR[n].length); ok('grids: the layout lists per count (existing + new)',per.every(x=>x>=4),per.join()); }
await setRange(pg,'gap',80); await setRange(pg,'edge',120); await setRange(pg,'border',20);
await sweep('gap 80, edge 120, border 20',null,{gap:80,margin:true,edge:120,logo:true,bw:20});
await setToggle(pg,'margin',false); await setToggle(pg,'logo',false);
await sweep('no margin, no logo, gap 80, border 20',null,{gap:80,margin:false,edge:120,logo:false,bw:20});
await setToggle(pg,'margin',true); await setToggle(pg,'logo',true); await setRange(pg,'gap',14); await setRange(pg,'edge',40); await setRange(pg,'border',0);

/* ================= 3. border ================= */
await setCount(pg,4); await setLay(pg,4,'g-2-2'); const plain=await bands(pg);
await setRange(pg,'border',20); await setHex(pg,'bcol','#ff0000'); await settle(pg);
{ const [a]=await photoBoxes(pg); const cell={x:a.x-20,y:a.y-20,w:a.w+40,h:a.h+40};
  const [p1,p2,p3,p4,p5]=await px(pg,[[cell.x+8,cell.y+cell.h/2],[cell.x+cell.w-8,cell.y+cell.h/2],[cell.x+cell.w/2,cell.y+8],[cell.x+cell.w/2,cell.y+cell.h-8],[cell.x+30,cell.y+cell.h/2]]);
  ok('border: the border colour shows on all four sides of a grid photo, the photo inside it does not',[p1,p2,p3,p4].every(isRed)&&!isRed(p5),[p1,p2,p3,p4,p5]);
  const runs=await Promise.all([runRed(pg,a.x-1,a.y+a.h/2,-1,0),runRed(pg,a.x+a.w,a.y+a.h/2,1,0),runRed(pg,a.x+a.w/2,a.y-1,0,-1),runRed(pg,a.x+a.w/2,a.y+a.h,0,1)]);
  ok('border: a 20px border is 20px wide on every side (grid)',runs.every(r=>Math.abs(r-20)<=1),runs); }
await setRange(pg,'radius',30); await settle(pg);
{ const [a]=await photoBoxes(pg); const cx0=a.x-20, cy0=a.y-20; const [corner,mid]=await px(pg,[[cx0+2,cy0+2],[cx0+60,cy0+10]]);
  ok('border: with a corner radius the frame is rounded (the frame\'s corner shows the background, its edge shows the colour)',!isRed(corner)&&isRed(mid),[corner,mid]); }
await setRange(pg,'radius',0); await setRange(pg,'border',0); await settle(pg);
ok('border: border 0 draws what it drew before (grid)',await bands(pg)===plain);
/* whole-photo layouts: even frame on all four sides, whatever the shrink-to-fit */
await setAuto(pg,'bcol');
const spots=[[2,'inset'],[3,'row'],[3,'tall2'],[4,'film'],[4,'big3'],[6,'scatter'],[3,'scatter']], plainSpots={};
for(const [n,v] of spots){ await setCount(pg,n); await setLay(pg,n,v); plainSpots[n+'/'+v]=await bands(pg); }
await setRange(pg,'border',20); await setHex(pg,'bcol','#ff0000');
const wholes={2:['stack','diag','side','inset'],3:['framed','stagger','big','row','tall2'],4:['wide','zigzag','grid','big3','film']};
{ const uneven=[], missing=[]; let tested=0;
  for(const n of [2,3,4]){ await setCount(pg,n);
    for(const v of wholes[n]){ await setLay(pg,n,v); await settle(pg); const boxes=await photoBoxes(pg); let seen=0;
      if(!boxes.length||boxes.some(q=>q.x<0||q.y<0||q.x+q.w>W||q.y+q.h>H)) uneven.push(n+'/'+v+' outside');
      for(const q of boxes){ if(v==='inset'&&q.i===0) continue;   // the small print covers part of the big one
        const r=await Promise.all([runRed(pg,q.x-1,q.y+q.h/2,-1,0),runRed(pg,q.x+q.w,q.y+q.h/2,1,0),runRed(pg,q.x+q.w/2,q.y-1,0,-1),runRed(pg,q.x+q.w/2,q.y+q.h,0,1)]);
        seen++; tested++; if(v==='inset'){ if(r.some(x=>x<10)) uneven.push(n+'/'+v+':'+r.join('/')); } else if(r.some(x=>Math.abs(x-20)>1.6)) uneven.push(n+'/'+v+' #'+q.i+': '+r.join('/')); }
      if(!seen) missing.push(n+'/'+v); } }
  ok(`border: ${tested} photos in ${[].concat(...Object.values(wholes)).length} whole-photo layouts have an even 20px frame on all four sides`,!uneven.length&&!missing.length,uneven.concat(missing).slice(0,4).join(' | ')); }
/* the whole photo is still whole: the photo box keeps the photo's shape */
{ await setCount(pg,3); await setLay(pg,3,'row'); await settle(pg); const boxes=await photoBoxes(pg), asp=await pg.evaluate(()=>Studio.debug.S.photos.slice(0,3).map(p=>p.img.width/p.img.height));
  ok('border: whole photos keep their shape inside the frame (no crop)',boxes.every((q,i)=>Math.abs(q.w/q.h-asp[q.i])<.01),boxes.map(q=>+(q.w/q.h/asp[q.i]).toFixed(3))); }
/* scattered prints */
{ const bad=[]; let framed=0;
  for(const n of [2,3,4,5,6]){ await setCount(pg,n); await setLay(pg,n,'scatter'); await settle(pg); const boxes=await photoBoxes(pg);
    if(boxes.length!==n||boxes.some(q=>q.x<0||q.y<0||q.x+q.w>W||q.y+q.h>H)) bad.push(n+' outside');
    const reds=await pg.evaluate(()=>{ const c=document.getElementById('view'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let k=0; for(let i=0;i<d.length;i+=16) if(d[i]>200&&d[i+1]<60&&d[i+2]<60) k++; return k; });
    if(reds<n*50) bad.push(n+' no frame ('+reds+')'); else framed++; }
  ok('border: scattered prints (2 to 6 photos) get a frame in the border colour and stay inside the canvas',!bad.length&&framed===5,bad.join()); }
await setRange(pg,'border',0); await setAuto(pg,'bcol');
{ const bad=[]; for(const [n,v] of spots){ await setCount(pg,n); await setLay(pg,n,v); if(await bands(pg)!==plainSpots[n+'/'+v]) bad.push(n+'/'+v); }
  ok('border: border 0 draws what it drew before (whole-photo, inset, film and scattered layouts)',!bad.length,bad.join()); }

/* ================= 4. spacing ================= */
await setCount(pg,4); await setLay(pg,4,'g-2-2'); await setRange(pg,'border',0);
await setRange(pg,'gap',80); await settle(pg);
{ const v=await values(pg), bx=await photoBoxes(pg);
  ok('spacing: the Gap slider reaches 80',v.gap===80);
  ok('spacing: gap 80 puts 80px between photos and the margin becomes 80 (max of gap and edge 40)',Math.abs(bx[1].x-(bx[0].x+bx[0].w)-80)<.6&&Math.abs(bx[2].y-(bx[0].y+bx[0].h)-80)<.6&&Math.abs(bx[0].x-80)<.6,bx.map(q=>[q.x,q.y,q.w,q.h].map(Math.round).join(','))); }
await setRange(pg,'gap',14); await setRange(pg,'edge',120); await settle(pg);
{ const bx=await photoBoxes(pg); ok('spacing: Edge space 120 moves the first photo to x=120, y=120',Math.abs(bx[0].x-120)<.6&&Math.abs(bx[0].y-120)<.6&&Math.abs(bx[1].x+bx[1].w-(W-120))<.6,bx[0]); }
await setRange(pg,'gap',80); await setRange(pg,'edge',60); await settle(pg);
{ const bx=await photoBoxes(pg); ok('spacing: the margin is the larger of gap and edge (gap 80, edge 60: 80)',Math.abs(bx[0].x-80)<.6,bx[0].x); }
await setRange(pg,'gap',14); await setRange(pg,'edge',40); await settle(pg);
{ const bx=await photoBoxes(pg); ok('spacing: gap 14 + edge 40 (the defaults) = the old margin of 40',Math.abs(bx[0].x-40)<.6&&Math.abs(bx[0].y-40)<.6,bx[0]); }
{ const vis=()=>pg.$eval('[data-fw="edge"]',e=>!e.hidden); const a=await vis();
  await setToggle(pg,'margin',false); const b2=await vis(); await settle(pg); const bx=await photoBoxes(pg);
  ok('spacing: Edge space shows with Outer margin on and hides when it is off (photos then reach the edge)',a&&!b2&&Math.abs(bx[0].x)<.6&&Math.abs(bx[0].y)<.6,{on:a,off:b2,x:bx[0].x});
  await setToggle(pg,'margin',true); ok('spacing: Edge space is back with the margin',await vis()); }

/* ================= 5. the Style sheet's order; a real set saves ================= */
{ await openSheet(pg,'style'); const order=await pg.$$eval('#sh-style [data-fields="style"] > .field',l=>l.filter(x=>!x.hidden).map(x=>x.dataset.fw));
  ok('style sheet: Layout, Gap, Border, Border colour, Corner radius, background, Outer margin, Edge space, logo (in that order)',order.join()==='lay4,gap,border,bcol,radius,bg,margin,edge,logo',order.join());
  const labels=await pg.$$eval('#sh-style [data-fields="style"] > .field:not([hidden]) .lbl, #sh-style [data-fields="style"] > .field:not([hidden]) .check',l=>l.map(x=>x.textContent.replace(/\s+/g,' ').trim().replace(/\d+px$/,'').trim()));
  ok('style sheet: short labels',labels.every(t=>t.length<=26),labels.join(' | ')); }
{ const dls=[]; pg.on('download',d=>dls.push(d));
  await setCount(pg,4); await pg.setInputFiles('#pick',['pair','tall','hand','window'].map(f=>SAMPLES+f+'.jpg'));
  await pg.waitForFunction(()=>Studio.debug.S.photos.slice(0,4).every(p=>p.img&&!p.sample),null,{timeout:15000}).catch(()=>{});
  await setLay(pg,4,'g-big-left-3'); await setRange(pg,'border',14); await setRange(pg,'radius',16); await pg.waitForTimeout(500);
  await openSheet(pg,'style'); await pg.tap('#barSave').catch(()=>{});
  for(let i=0;i<20&&!dls.length;i++){ if(await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'))){ await pg.tap('#save').catch(()=>{}); break; } await pg.waitForTimeout(250); }
  for(let i=0;i<120&&!dls.length;i++) await pg.waitForTimeout(300);
  let size='', bytes=0; if(dls.length){ const f=await dls[0].path(); const buf=fs.readFileSync(f); size=buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20); bytes=buf.length; }
  ok('save: 4 real photos in a new grid (with a border) save as a 2160x3840 PNG',size==='2160x3840'&&bytes>200000,size+' '+bytes+' bytes'); }

/* ================= 6. no page errors ================= */
ok('no page errors',errs.length===0,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log((fails?'FAIL':'PASS')+': '+(res.length-fails)+'/'+res.length+' checks in '+Math.round((Date.now()-t0)/1000)+'s');
process.exit(fails?1:0);

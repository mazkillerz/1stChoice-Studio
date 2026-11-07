/* Create: import a Claude Design board (mega 3.1, preview flag `import`).
   No board sources ship in the repo (only the built documents), so each National Day template document in
   brands/1stchoice/templates/nd26/ is turned back into a board (absolutely positioned HTML in the shape layers.js read:
   images, shapes with radii/gradients/shadows/borders, text with rotation, crayon words through background-clip:text),
   zipped with its pictures, imported through Create's real entry points, and compared with the shipped thumbnails
   (pixel similarity, score printed per board) and the shipped document (layer counts and kinds, bleed pieces).
   Also: a .dc.html + zip, a deflate zip, SVG art, a clipped group, mixed colours + crayon on white, an unknown font,
   missing pictures, text stays editable (Arabic RTL), flag off = no entry point, the drop path, phone 390 light/dark,
   desktop 1280. Needs BASE (default http://127.0.0.1:8080/). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import zlib from 'zlib';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync('/tmp/cimport-');
const MIN=+(process.env.SIM_MIN||0.95);
let BRAND=null; new Function('Studio',fs.readFileSync(ROOT+'brands/1stchoice/brand.js','utf8'))({registerBrand:b=>{ BRAND=b; }});
const defs=BRAND.create.templates.filter(d=>d.layout==='doc');
const only=process.env.ONLY?process.env.ONLY.split(','):null;
const b=await chromium.launch(); const errs=[]; let fails=0; const scores=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i).slice(0,500):'')); };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|ERR_FAILED|ERR_ABORTED|net::|Failed to load resource/.test(m.text())) errs.push(tag+' '+m.text()); }); };

/* ---- a tiny zip writer (store, or deflate when asked) ---- */
const T=new Int32Array(256).map((_,n)=>{ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; return c; });
const crc=buf=>{ let c=-1; for(const x of buf) c=T[(c^x)&255]^(c>>>8); return (c^-1)>>>0; };
function zip(entries,{deflate=false}={}){ const parts=[], cen=[]; let off=0;
  for(const [name,data] of entries){ const raw=Buffer.from(data), cmp=deflate?zlib.deflateRawSync(raw):raw, nm=Buffer.from(name), h=Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50,0); h.writeUInt16LE(20,4); h.writeUInt16LE(deflate?8:0,8); h.writeUInt32LE(crc(raw),14); h.writeUInt32LE(cmp.length,18); h.writeUInt32LE(raw.length,22); h.writeUInt16LE(nm.length,26);
    parts.push(h,nm,cmp); const c=Buffer.alloc(46); c.writeUInt32LE(0x02014b50,0); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(deflate?8:0,10); c.writeUInt32LE(crc(raw),16); c.writeUInt32LE(cmp.length,20); c.writeUInt32LE(raw.length,24); c.writeUInt16LE(nm.length,28); c.writeUInt32LE(off,42);
    cen.push(c,nm); off+=30+nm.length+cmp.length; }
  const cd=Buffer.concat(cen), e=Buffer.alloc(22); e.writeUInt32LE(0x06054b50,0); e.writeUInt16LE(entries.length,8); e.writeUInt16LE(entries.length,10); e.writeUInt32LE(cd.length,12); e.writeUInt32LE(off,16);
  return Buffer.concat([...parts,cd,e]); }

/* ---- a shipped template document -> a board (what a Claude Design export looks like to the walk) ---- */
const assetFile=id=>{ const a=BRAND.assets.find(x=>x.id===id); return a&&a.file; };
function board(doc){ const F=doc.nodes[0], W=F.a.fw, H=F.a.fh, files=new Map(), bg=F.k.find(k=>k.a.name==='frame-bg').a.fill; let html='';
  const px=v=>(Math.round(v*100)/100)+'px';
  const tf=a=>{ const t=[]; if(a.rotation) t.push('rotate('+a.rotation+'deg)'); if((a.scaleX||1)!==1||(a.scaleY||1)!==1) t.push('scale('+(a.scaleX||1)+','+(a.scaleY||1)+')'); return t.length?'transform-origin:0 0;transform:'+t.join(' ')+';':''; };
  const sh=a=>a.shadowEnabled?`box-shadow:${a.shadowOffsetX||0}px ${a.shadowOffsetY||0}px ${(a.shadowBlur||0)*2}px ${a.shadowColor};`:'';
  const common=a=>`position:absolute;left:${px(a.x||0)};top:${px(a.y||0)};${tf(a)}${a.opacity!=null?'opacity:'+a.opacity+';':''}`;
  for(const k of F.k){ const a=k.a; if(a.name==='frame-bg') continue;
    if(k.c==='Image'){ const id=String(a.imgId).replace('brand:',''), f=assetFile(id); if(!files.has(id+'.'+f.split('.').pop())) files.set(id+'.'+f.split('.').pop(),fs.readFileSync(ROOT+'brands/1stchoice/'+f));
      html+=`<img src="${id}.${f.split('.').pop()}" alt="${(a.label||'').replace(/"/g,'')}" style="${common(a)}width:${px(a.width)};height:${px(a.height)};${a.kind==='image'?`object-fit:cover;object-position:${(a.focX??.5)*100}% ${(a.focY??.5)*100}%;`:''}${a.cornerRadius?`border-radius:${px(a.cornerRadius)};`:''}${sh(a)}">`; }
    else if(k.c==='Rect'){ const g=a.fillLinearGradientColorStops, st=[]; if(g) for(let i=0;i<g.length;i+=2) st.push(g[i+1]+' '+Math.round(g[i]*100)+'%');
      const dir=a.fillLinearGradientEndPoint&&a.fillLinearGradientEndPoint.y<a.fillLinearGradientStartPoint.y?'to top':'to bottom';
      html+=`<div style="${common(a)}width:${px(a.width)};height:${px(a.height)};box-sizing:border-box;${g?`background:linear-gradient(${dir},${st.join(',')});`:a.fill?`background:${a.fill};`:''}${a.cornerRadius?`border-radius:${px(a.cornerRadius)};`:''}${a.strokeWidth?`border:${a.strokeWidth}px solid ${a.stroke};`:''}${sh(a)}"></div>`; }
    else if(k.c==='Text'){ const ar=/[؀-ۿ]/.test(a.text), tex=a.fillTex?String(a.fillTex).replace('brand:nd26-',''):null; if(tex&&!files.has(tex+'.png')) files.set(tex+'.png',fs.readFileSync(ROOT+'brands/1stchoice/assets/nd26/tex/'+tex.replace(/-solid$/,'')+'.png'));
      const wt=a.fontStyle==='normal'?400:a.fontStyle;
      html+=`<div ${tex?`class="${tex.includes('green')?'cg':'cr'}" `:''}style="${common(a)}width:${px(a.width)};font-family:'${a.fontFamily}';font-size:${px(a.fontSize)};font-weight:${wt};line-height:${a.lineHeight};text-align:${a.align};white-space:pre-wrap;${ar?'direction:rtl;':''}${tex?`background-image:url(${tex}.png);background-size:300px;-webkit-background-clip:text;background-clip:text;color:transparent;`:`color:${a.fill};`}">${a.text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`; } }
  return {W,H,files,html:`<!doctype html><html><head><meta charset="utf-8"><title>${F.a.label}</title></head><body><div id="board" style="position:relative;width:${W}px;height:${H}px;background:${bg};overflow:hidden">${html}</div></body></html>`}; }
const zipOf=(html,files,o)=>zip([['board.html',html],...files],o);

/* ---- page helpers ---- */
async function mk(vp,{flag=true,dark=false}={}){
  const ctx=await b.newContext({serviceWorkers:'block',acceptDownloads:true,colorScheme:dark?'dark':'light',...vp});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(f=>{ try{ localStorage.setItem('studio:welcome','seen'); if(f) localStorage.setItem('studio:flag:import','1'); }catch(_){} },flag);
  const pg=await ctx.newPage(); watch(pg,vp.viewport.width+(dark?'d':'')); return {ctx,pg}; }
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}); await pg.waitForTimeout(400); };
const DESK={viewport:{width:1280,height:800}}, PHONE={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};
const toastText=pg=>pg.evaluate(()=>document.getElementById('crToast').textContent);
async function importVia(pg,file,{via='add',mode='replace'}={}){
  await pg.evaluate(()=>{ window.__importLast=null; });
  if(via==='start'){ /* the start sheet is already open */ }
  else { await pg.evaluate(()=>CRUI.closeSheet&&CRUI.closeSheet(true)); await pg.click('[data-cr=add]'); await pg.waitForSelector('[data-import]'); }
  const [fc]=await Promise.all([pg.waitForEvent('filechooser'),pg.click('[data-import]')]);
  await fc.setFiles(file);
  const dlg=pg.locator('dialog[open] #imRep'); await dlg.waitFor({timeout:1500}).then(()=>mode==='replace'?dlg.click():pg.click('dialog[open] #imAdd')).catch(()=>{});
  await pg.waitForFunction(()=>window.__importLast||/could not|came out empty/i.test(document.getElementById('crToast').textContent),null,{timeout:60000});
  await pg.waitForFunction(()=>BD.main.find('Image').every(n=>n.image())&&BD.main.find('Text').every(t=>!t.getAttr('fillTex')||t.fillPatternImage()),null,{timeout:20000}).catch(()=>{});
  await pg.waitForTimeout(250); }
const stats=pg=>pg.evaluate(()=>{ const f=BD.util.frames().slice(-1)[0], s=BD.util.fsize(f), im=f.find('Image'), tx=f.find('Text'), rc=f.find('Rect').filter(n=>!n.hasName('frame-bg'));
  return {w:s.w,h:s.h,pages:BD.util.frames().length,texts:tx.length,imgs:im.length,asset:im.filter(n=>n.getAttr('kind')==='asset').length,photo:im.filter(n=>n.getAttr('kind')==='image').length,rects:rc.length,
    bleed:[...im,...tx,...rc].filter(n=>n.getAttr('bleed')).length,tex:tx.filter(t=>t.getAttr('fillTex')).length,rtl:tx.filter(t=>/[؀-ۿ]/.test(t.text())).every(t=>t.direction()==='rtl'),
    fams:[...new Set(tx.map(t=>t.fontFamily()))],texts_:tx.map(t=>({t:t.text(),f:t.fontFamily(),fill:t.fill(),tex:t.getAttr('fillTex')||null,h:t.height(),w:t.width(),rot:t.rotation()}))}; });
const similarity=(pg,id)=>pg.evaluate(async id=>{ const f=BD.util.frames().slice(-1)[0], s=BD.util.fsize(f); await Promise.all([...BD.IMGS.values()].map(i=>i.el&&i.el.decode?i.el.decode().catch(()=>{}):null));
  const th=await new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src='../assets/thumbs/1stchoice/tpl/'+id+'.jpg'; }), w=th.width, h=th.height;
  const c=BD.renderFrame(f,w/s.w), t=document.createElement('canvas'); t.width=w; t.height=h; const x=t.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(th,0,0);
  const r=document.createElement('canvas'); r.width=w; r.height=h; const y=r.getContext('2d'); y.fillStyle='#fff'; y.fillRect(0,0,w,h); y.drawImage(c,0,0,w,h);
  const A=x.getImageData(0,0,w,h).data, B=y.getImageData(0,0,w,h).data; let d=0, bad=0; for(let i=0;i<A.length;i+=4){ const e=(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]))/3; d+=e; if(e>48) bad++; }
  c.width=c.height=0; return {score:+(1-d/(A.length/4)/255).toFixed(4),bad:+(bad/(A.length/4)).toFixed(4)}; },id);
const wr=(name,buf)=>{ const p=OUT+'/'+name; fs.writeFileSync(p,buf); return p; };

/* ===== 1. every National Day board, through the Add sheet, on a computer ===== */
{ const {ctx,pg}=await mk(DESK); await pg.goto(BASE+'tools/create.html?size=story'); await ready(pg);
  let n=0, sumScore=0; const rows=[];
  for(const d of defs){ if(only&&!only.includes(d.id)) continue; n++;
    const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8')), K=doc.nodes[0].k, bd=board(doc);
    const want={t:K.filter(k=>k.c==='Text').length,i:K.filter(k=>k.c==='Image').length,asset:K.filter(k=>k.c==='Image'&&k.a.kind==='asset').length,r:K.filter(k=>k.c==='Rect'&&k.a.name!=='frame-bg').length,tex:K.filter(k=>k.a&&k.a.fillTex).length,bleed:K.filter(k=>{ const a=k.a; if(!a||a.name==='frame-bg'||a.width==null) return false; const fw=doc.nodes[0].a.fw, fh=doc.nodes[0].a.fh; return a.x<-2||a.y<-2||a.x+a.width>fw+2||a.y+(a.height||0)>fh+2; }).length};   // geometry, not the shipped flag (a few shipped docs flag a piece that is inside the page)
    const file=wr(d.id+'.zip',zipOf(bd.html,[...bd.files].map(([k,v])=>[k,v])));
    await importVia(pg,file); const s=await stats(pg), sim=await similarity(pg,d.id); sumScore+=sim.score; scores.push([d.id,sim.score,sim.bad]);
    const diffs=[]; if(s.texts!==want.t) diffs.push('text '+s.texts+'/'+want.t); if(s.imgs!==want.i) diffs.push('pictures '+s.imgs+'/'+want.i); if(s.rects!==want.r) diffs.push('shapes '+s.rects+'/'+want.r); if(s.tex!==want.tex) diffs.push('crayon '+s.tex+'/'+want.tex); if(s.asset!==want.asset) diffs.push('art '+s.asset+'/'+want.asset); if(s.bleed!==want.bleed) diffs.push('bleed '+s.bleed+'/'+want.bleed);
    ok(d.id+': '+want.t+' texts, '+want.i+' pictures ('+want.asset+' art), '+want.r+' shapes, '+want.tex+' crayon, '+want.bleed+' bleed; same layers as the shipped document; one new page '+s.w+'x'+s.h,!diffs.length&&s.pages===1&&s.w===doc.nodes[0].a.fw&&s.h===doc.nodes[0].a.fh&&s.rtl,{diffs,s:{...s,texts_:undefined}});
    ok(d.id+': looks like the shipped thumbnail (similarity '+sim.score+', '+(sim.bad*100).toFixed(1)+'% of pixels far off; needs >= '+MIN+')',sim.score>=MIN,sim); }
  const mean=sumScore/Math.max(1,n); console.log('SIMILARITY mean '+mean.toFixed(4)+' over '+n+' boards; lowest: '+scores.slice().sort((a,b)=>a[1]-b[1]).slice(0,5).map(x=>x[0]+' '+x[1]).join(', '));
  fs.writeFileSync(OUT+'/scores.json',JSON.stringify(scores));
  await ctx.close(); }

/* ===== 2. special boards ===== */
const PNG=fs.readFileSync(ROOT+'brands/1stchoice/assets/nd26/parts/fw-red.png'), JPG=fs.readFileSync(ROOT+'brands/1stchoice/assets/nd26/photos/s_print_blur.jpg');
const SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50"><rect width="100" height="50" fill="#007A33"/><circle cx="25" cy="25" r="18" fill="#DA291C"/></svg>';
const wrap=(inner,extra)=>`<!doctype html><html><head><meta charset="utf-8"><title>Test board</title>${extra||''}</head><body style="margin:0"><div style="position:relative;width:1080px;height:1920px;background:#FFFFFF;overflow:hidden">${inner}</div></body></html>`;
{ const {ctx,pg}=await mk(DESK); await pg.goto(BASE+'tools/create.html'); await ready(pg);
  await pg.waitForSelector('[data-import]');
  const startRow=await pg.evaluate(()=>{ const r=document.querySelector('[data-import]'); return r&&{h:r.getBoundingClientRect().height,txt:r.textContent}; });
  ok('flag on: the start sheet has "Import a Claude Design board" (>= 48px)',startRow&&/Import a Claude Design board/.test(startRow.txt)&&startRow.h>=48,startRow);
  /* via the start sheet, a .dc.html (x-dc wrapper, /_blob/ names) + zip, deflate */
  const dc=`<!doctype html><html><head><title>x</title></head><body><x-dc><helmet><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo"></helmet><script>window.bad=1</script>
    <div style="position:relative;width:1080px;height:1350px;background:#F4EFE6;overflow:hidden"><img src="/_blob/aa11" style="position:absolute;left:100px;top:200px;width:300px;height:300px;object-fit:cover" alt="Photo">
    <img src="/_blob/bb22" style="position:absolute;left:600px;top:200px;width:200px;height:200px" alt="Art"><div style="position:absolute;left:0;top:700px;width:1080px;text-align:center;font:600 60px Cairo;color:#161210;direction:rtl">مرحبا ربيعي</div></div></x-dc><script type="application/json">{"width":1080,"height":1350}</script></body></html>`;
  const dcZip=wr('dc.zip',zip([['project/board.dc.html',dc],['project/_blob/aa11',JPG],['project/_blob/bb22.png',PNG]],{deflate:true}));
  await importVia(pg,dcZip,{via:'start'}); let s=await stats(pg);
  ok('.dc.html in a deflate zip: 1080x1350 page, 1 photo layer + 1 art layer + 1 text, scripts did not run',s.w===1080&&s.h===1350&&s.photo===1&&s.asset===1&&s.texts===1&&s.imgs===2&&await pg.evaluate(()=>!window.bad),s);
  ok('  the text is editable Arabic, right-to-left, in Cairo',s.rtl&&s.texts_[0].t.includes('مرحبا')&&s.texts_[0].f==='Cairo',s.texts_);
  ok('  its pictures are draft photos kept on this phone (IndexedDB bimg:)',await pg.evaluate(async()=>{ const ids=BD.main.find('Image').map(n=>n.getAttr('imgId')); const rs=await Promise.all(ids.map(id=>Studio.lab.idb.get('bimg:'+id))); return ids.length===2&&rs.every(x=>x&&x.size>100)&&ids.every(id=>!String(id).startsWith('brand:')); }));
  ok('  a toast says what came in',/Imported: 2 pictures, 1 text/.test(await toastText(pg)),await toastText(pg));
  /* SVG art, clipped group, mixed colours, crayon on white, tight numbers, unicode isolates */
  const rich=wrap(`<img src="logo.svg" style="position:absolute;left:40px;top:40px;width:300px;height:150px" alt="Logo">
    <div style="position:absolute;left:100px;top:300px;width:400px;height:300px;overflow:hidden;border-radius:40px;background:#EEE"><img src="p.jpg" style="position:absolute;left:-80px;top:-60px;width:600px;height:500px"><div style="position:absolute;left:20px;top:20px;font:700 40px Cairo;color:#fff">In the clip</div></div>
    <div style="position:absolute;left:100px;top:700px;width:880px;text-align:center;font:400 120px Lalezar;line-height:1.1;direction:rtl"><span style="color:#161210">باقي</span> <span class="cr" style="background-image:url(crayon-red.png);-webkit-background-clip:text;background-clip:text;color:transparent">يوم</span></div>
    <div style="position:absolute;left:100px;top:1000px;width:880px;text-align:center;font:400 120px Lalezar;color:#FFFFFF;direction:rtl">وطني</div>
    <div class="cr" style="position:absolute;left:100px;top:1000px;width:880px;text-align:center;font:400 120px Lalezar;direction:rtl;background-image:url(crayon-red.png);-webkit-background-clip:text;background-clip:text;color:transparent">وطني</div>
    <div style="position:absolute;left:100px;top:1300px;width:880px;text-align:center;font:600 40px Cairo;color:#6E6E6E;direction:rtl">تابعونا @1stchoice.om اليوم</div>
    <div style="position:absolute;left:900px;top:1500px;width:120px;height:120px;border-radius:50%;background:#DA291C;color:#fff;font:400 70px/1 Lalezar;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,.25)"><div style="position:absolute;left:0;top:0;width:120px;text-align:center;font:400 70px/1 Lalezar;color:#fff">20</div></div>
    <div style="position:absolute;left:-60px;top:1700px;width:500px;height:120px;background:linear-gradient(to bottom,rgba(0,0,0,0),rgba(0,0,0,.5));border:4px solid #161210;border-radius:20px"></div>
    <div style="position:absolute;left:700px;top:1700px;width:300px;font:600 30px Cairo;color:#161210;transform:rotate(-8deg);transform-origin:0 0">Turned text</div>`);
  const richZip=wr('rich.zip',zip([['board.html',rich],['logo.svg',SVG],['p.jpg',JPG],['crayon-red.png',fs.readFileSync(ROOT+'brands/1stchoice/assets/nd26/tex/crayon-red.png')]]));
  await importVia(pg,richZip); s=await stats(pg);
  const R=await pg.evaluate(()=>{ const f=BD.util.frames().slice(-1)[0], im=f.find('Image'); return {imgs:im.map(n=>({k:n.getAttr('kind'),id:String(n.getAttr('imgId')).slice(0,6),w:Math.round(n.width()),bleed:!!n.getAttr('bleed'),label:n.getAttr('label')})),
      svgPng:im.length&&BD.IMGS.get(im[0].getAttr('imgId')).el.width>=300,rects:f.find('Rect').filter(n=>!n.hasName('frame-bg')).map(n=>({bleed:!!n.getAttr('bleed'),grad:!!n.getAttr('fillLinearGradientColorStops'),r:n.cornerRadius(),stroke:n.stroke(),sh:n.shadowEnabled()})),
      texts:f.find('Text').map(t=>({t:t.text(),tex:t.getAttr('fillTex'),y:t.y(),rot:t.rotation(),bleed:!!t.getAttr('bleed'),w:t.width(),x:t.x(),fs:t.fontSize()}))}; });
  ok('SVG art is rasterised to a PNG draft picture (as art, big enough)',R.imgs[0]&&R.imgs[0].k==='asset'&&R.svgPng,R.imgs);
  ok('clipped group (overflow hidden + border radius) = one picture layer, its inner words are not separate layers',R.imgs.length===2&&R.texts.every(t=>!/In the clip/.test(t.t)),R);
  ok('mixed colours split into runs: the dark word and the crayon word are two layers, the crayon one has the text fill',R.texts.filter(t=>t.t==='باقي'||t.t==='يوم').length===2&&R.texts.some(t=>t.t==='يوم'&&String(t.tex).startsWith('brand:nd26-crayon-red')),R.texts);
  ok('a white copy under a crayon word = ONE layer "crayon on white" (own picture fill, no white duplicate)',R.texts.filter(t=>t.t==='وطني').length===1&&R.texts.find(t=>t.t==='وطني').tex&&!String(R.texts.find(t=>t.t==='وطني').tex).startsWith('brand:'),R.texts);
  ok('a Latin handle inside Arabic is wrapped in Unicode isolates (U+2066 .. U+2069)',R.texts.some(t=>t.t.includes('⁦@1stchoice.om⁩')),R.texts.map(t=>t.t));
  ok('shapes: gradient shade, border, radius, shadow all kept; the off-page shade is marked bleed',R.rects.some(r=>r.grad&&r.stroke&&r.r>0&&r.bleed)&&R.rects.some(r=>r.sh),R.rects);
  ok('text boxes stay inside the page unless turned; the turned one is kept turned and has slack',R.texts.filter(t=>!t.rot).every(t=>t.x>=0&&t.x+t.w<=1081)&&R.texts.some(t=>Math.abs(t.rot+8)<0.5),R.texts);
  ok('a tight line height (1.0) number moves down a little so it sits in its circle',R.texts.find(t=>t.t==='20').y>=1480&&R.texts.find(t=>t.t==='20').y+70<=1625,R.texts.find(t=>t.t==='20'));
  /* fonts */
  const fonts=wrap(`<div style="position:absolute;left:100px;top:100px;width:800px;font:400 60px 'Zapfino Nonexistent',cursive;color:#111">Unknown font</div>
     <div style="position:absolute;left:100px;top:300px;width:800px;font:700 60px 'Tajawal',sans-serif;color:#111">أهلا</div>
     <div style="position:absolute;left:100px;top:500px;width:800px;font:700 60px Lalezar,sans-serif;color:#111">لالزار</div>`);
  await importVia(pg,wr('fonts.html',fonts)); s=await stats(pg); const tt=await toastText(pg);
  ok('unknown font falls back to the brand body font and says so in a toast; a Google (More fonts) font is kept; a brand font is kept',s.texts_.find(t=>t.t==='Unknown font').f==='Cairo'&&s.texts_.find(t=>t.t==='أهلا').f==='Tajawal'&&s.texts_.find(t=>t.t==='لالزار').f==='Lalezar'&&/Zapfino Nonexistent/.test(tt)&&/body font/.test(tt)&&!/Tajawal/.test(tt),{tt,f:s.texts_.map(t=>t.f)});
  ok('  the More font got its Google link (ensureFont) in Create',await pg.evaluate(()=>!!document.querySelector('link[data-font="Tajawal"]')));
  /* missing pictures */
  const miss=wrap(`<img src="/_blob/nope" style="position:absolute;left:100px;top:100px;width:400px;height:400px" alt="Gone"><div style="position:absolute;left:100px;top:600px;width:800px;font:600 50px Cairo">After</div>`);
  await importVia(pg,wr('miss.html',miss)); s=await stats(pg); const sl=await pg.evaluate(()=>BD.util.frames().slice(-1)[0].find(n=>n.getAttr&&n.getAttr('kind')==='slot'||n.getAttr&&n.getAttr('slot')).length);
  ok('pictures that are not in the file become empty photo spots, with a toast',s.imgs===0&&sl>=1&&/not in the file/.test(await toastText(pg)),{s:{...s,texts_:0},sl,t:await toastText(pg)});
  /* add as new pages */
  await importVia(pg,wr('miss2.html',miss),{mode:'add'}); s=await stats(pg);
  ok('importing onto a design that has things asks, and "Add as new pages" keeps the old page',s.pages===2,s.pages);
  /* an empty / script-only board */
  await importVia(pg,wr('empty.html',`<!doctype html><html><body><div id="app"></div><script>document.getElementById('app').innerHTML='<p>x</p>'</script></body></html>`));
  ok('a board that only draws itself with scripts says it came out empty (scripts stay off)',/came out empty/.test(await toastText(pg)),await toastText(pg));
  await importVia(pg,wr('junk.zip',Buffer.from('not a zip at all')));
  ok('a broken file says so instead of crashing',/Could not read that board/.test(await toastText(pg)),await toastText(pg));
  /* editable: open the words sheet on an imported text */
  await pg.goto(BASE+'tools/create.html?size=story'); await ready(pg);
  await importVia(pg,dcZip); await pg.evaluate(()=>{ const t=BD.util.frames().slice(-1)[0].findOne('Text'); BD.select([t]); });
  await pg.evaluate(()=>CRUI.openWords()); await pg.waitForSelector('#crSheet:not([hidden]) textarea');
  const ta=await pg.evaluate(()=>{ const t=document.querySelector('#crSheet textarea'); return {v:t.value,dir:t.getAttribute('dir')}; });
  ok('Words sheet opens on an imported Arabic text (right-to-left input, text intact)',ta.v.includes('مرحبا ربيعي')&&/auto|rtl/.test(ta.dir||''),ta);
  /* the drop path */
  await pg.evaluate(()=>CRUI.closeSheet(true));
  await pg.evaluate(()=>{ window.__importLast=null; });
  await pg.evaluate(async()=>{ const f=new File(['<!doctype html><body><div style="position:relative;width:1080px;height:1920px;background:#fff"><div style="position:absolute;left:50px;top:50px;width:900px;font:600 50px Cairo">Dropped</div></div></body>'],'drop.html',{type:'text/html'}); const dt=new DataTransfer(); dt.items.add(f);
    document.body.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true})); document.body.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true})); });
  await pg.locator('dialog[open] #imRep').click({timeout:3000}).catch(()=>{});
  await pg.waitForFunction(()=>window.__importLast,null,{timeout:30000}).catch(()=>{});
  ok('dropping a .html onto Create (computer) imports it',await pg.evaluate(()=>BD.main.find('Text').some(t=>t.text()==='Dropped')));
  await ctx.close(); }

/* ===== 3. flag off: nothing anywhere ===== */
{ const {ctx,pg}=await mk(DESK,{flag:false}); const reqs=[]; pg.on('request',r=>{ if(/create-import/.test(r.url())) reqs.push(r.url()); });
  await pg.goto(BASE+'tools/create.html'); await ready(pg); await pg.waitForSelector('.cr-tpls');
  ok('flag off: start sheet has no import row',await pg.evaluate(()=>!document.querySelector('[data-import]')&&!/Claude Design/i.test(document.getElementById('crSheet').textContent)));
  await pg.evaluate(()=>CRUI.closeSheet(true)); await pg.click('[data-cr=add]'); await pg.waitForSelector('#crSheet:not([hidden])');
  ok('flag off: the Add sheet has no import row',await pg.evaluate(()=>!document.querySelector('[data-import]')&&!/Claude Design/i.test(document.getElementById('crSheet').textContent)));
  await pg.evaluate(()=>CRUI.closeSheet(true));
  await pg.evaluate(()=>{ const f=new File(['<div style="position:relative;width:1080px;height:1920px"><div style="position:absolute;left:0;top:0">Hi</div></div>'],'d.html',{type:'text/html'}); const dt=new DataTransfer(); dt.items.add(f); document.body.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true})); });
  await pg.waitForTimeout(800);
  ok('flag off: a dropped .html does nothing, no importer file is requested, no hidden file input',!(await pg.evaluate(()=>window.CRImport||document.getElementById('crImport')))&&!reqs.length,reqs);
  ok('flag off: the page menu and search have no import entry',await pg.evaluate(()=>!document.body.innerHTML.includes('Claude Design')));
  await ctx.close(); }

/* ===== 4. phone 390 light + dark ===== */
for(const dark of [false,true]){ const {ctx,pg}=await mk(PHONE,{dark}); const tag='phone 390 '+(dark?'dark':'light');
  await pg.goto(BASE+'tools/create.html'); await ready(pg); await pg.waitForSelector('[data-import]');
  const g=await pg.evaluate(()=>{ const r=document.querySelector('[data-import]'), b=r.getBoundingClientRect(), sh=document.getElementById('crSheet').getBoundingClientRect(); return {h:Math.round(b.height),l:Math.round(b.left),r:Math.round(b.right),sw:innerWidth,sl:Math.round(sh.left),hs:document.documentElement.scrollWidth,fg:getComputedStyle(r).color,bg:getComputedStyle(document.body).backgroundColor}; });
  ok(tag+': the import row is >= 48px tall and inside the screen, no sideways scroll',g.h>=48&&g.l>=0&&g.r<=g.sw&&g.hs<=g.sw,g);
  ok(tag+': text colour differs from the page colour (readable)',g.fg!==g.bg,g);
  const tpl=wr('p.zip',zipOf(...(()=>{ const d=defs.find(x=>x.id==='nd-greeting')||defs[0], bd=board(JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8'))); return [bd.html,[...bd.files]]; })()));
  await importVia(pg,tpl,{via:'start'}); const s=await stats(pg);
  ok(tag+': importing works with touch (one page, layers built)',s.pages===1&&s.texts>0&&s.imgs>0&&s.rtl,{...s,texts_:0});
  await ctx.close(); }

ok('no page errors',!errs.length,errs.slice(0,4));
console.log('SCORES '+JSON.stringify(scores));
await b.close(); console.log(fails?fails+' FAILED':'ALL PASSED'); process.exit(fails?1:0);

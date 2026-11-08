/* Remove background on this device (mega 3.5), behind the `cutout` preview flag.
   Flag off: no button in a tool's Photo sheet or in Create, and no request for the model. Flag on: nothing is fetched until the tap;
   a can on a busy photo is cut out with IoU >= 0.9 against its known alpha; the result has transparency; Undo brings the photo back;
   the 2x PNG save is still 2160x3840; Create adds a layer above the photo and hides (not deletes) the photo; the page keeps drawing
   while the worker thinks (a rAF counter). 390x844 touch light + dark and 1280x800, targets >= 44px.
   Run: server on :8080 (BASE=... to change), then node tests/cutout.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const FIX=new URL('./fixtures/',import.meta.url).pathname, CAN=FIX+'cutout-can.jpg';
const pngSize=p=>{ const x=fs.readFileSync(p); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const res=[]; const ok=(n,c,i)=>{ const r=(c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i).slice(0,300):''); res.push(r); if(process.env.LIVE) console.log(r); };
const b=await chromium.launch(), errs=[];
const IOU=0.9;
async function mk(opts,flag){
  const ctx=await b.newContext({serviceWorkers:'block',acceptDownloads:true,...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(f=>{ try{ localStorage.setItem('studio:welcome','seen'); if(f) localStorage.setItem('studio:flag:cutout','1'); }catch(_){} },flag);
  const pg=await ctx.newPage(); const reqs=[]; pg.on('request',r=>reqs.push(r.url()));
  pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  return {ctx,pg,reqs};
}
const modelReq=reqs=>reqs.filter(u=>/vendor\/cutout|cutout(-worker)?\.js/.test(u));
const openPhoto=async(pg,phone)=>{ if(phone){ await pg.tap('#bar [data-open="photo"]'); await pg.waitForSelector('#sh-photo.open',{timeout:5000}); } };
async function tool(tag,opts){
  const phone=!!opts.hasTouch, N=tag+': ', tap=s=>phone?pg.tap(s):pg.click(s);
  /* flag off */
  let off=await mk(opts,false), pg=off.pg;
  await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForSelector('#slots',{state:'attached'});
  await pg.setInputFiles('input[data-file="0"]',CAN); await pg.waitForFunction(()=>Studio.debug.S.photos.some(p=>p.img&&!p.sample),null,{timeout:10000});
  await openPhoto(pg,phone);
  ok(N+'flag off: no Remove background button in the Photo sheet',await pg.evaluate(()=>!document.getElementById('photoCut')&&!document.getElementById('cutRow')));
  ok(N+'flag off: no request for the model or the module',modelReq(off.reqs).length===0,modelReq(off.reqs));
  await off.ctx.close();
  /* flag on */
  const on=await mk(opts,true); pg=on.pg;
  await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForSelector('#slots',{state:'attached'});
  await pg.setInputFiles('input[data-file="0"]',CAN); await pg.waitForFunction(()=>Studio.debug.S.photos.some(p=>p.img&&!p.sample),null,{timeout:10000});
  await openPhoto(pg,phone); await pg.waitForSelector('#photoCut',{state:'visible',timeout:5000});
  const box=await pg.evaluate(()=>{ const r=document.getElementById('photoCut').getBoundingClientRect(); return {h:Math.round(r.height),w:Math.round(r.width),right:Math.round(r.right)}; });
  ok(N+'flag on: Remove background shows in the Photo sheet, at least 44px, inside the screen',box.h>=44&&box.right<=opts.viewport.width,box);
  ok(N+'flag on: the first-time download note is shown',/15 MB/.test(await pg.textContent('#cutNote')));
  await pg.waitForTimeout(700);
  ok(N+'flag on: nothing is fetched before the tap',modelReq(on.reqs).length===0,modelReq(on.reqs));
  await pg.evaluate(()=>{ window.__gaps=[]; let last=performance.now(); const f=t=>{ window.__gaps.push(t-last); last=t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const t0=Date.now(); await tap('#photoCut');
  await pg.waitForFunction(()=>Studio.debug.S.photos.some(p=>p.cutout),null,{timeout:120000});
  const ms=Date.now()-t0;
  const gaps=await pg.evaluate(()=>window.__gaps.slice()); const worst=Math.max(...gaps);
  ok(N+'after the tap the model is fetched (module, worker, runtime, model)',['cutout.js','cutout-worker.js','ort.wasm.min.js','ort-wasm-simd.wasm','u2netp.onnx'].every(f=>on.reqs.some(u=>u.includes(f))),modelReq(on.reqs));
  ok(N+'the page keeps drawing while the worker runs (longest frame gap '+Math.round(worst)+' ms, '+gaps.length+' frames in '+ms+' ms)',gaps.length>10&&worst<400,{worst,frames:gaps.length});
  const q=await pg.evaluate(async iou=>{
    const p=Studio.debug.S.photos.find(p=>p.cutout), c=p.img, W=c.width, H=c.height;
    const a=await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src='../tests/fixtures/cutout-can-alpha.png'; });
    const g=document.createElement('canvas'); g.width=W; g.height=H; const gx=g.getContext('2d'); gx.drawImage(a,0,0,W,H);
    const gd=gx.getImageData(0,0,W,H).data, pd=c.getContext('2d').getImageData(0,0,W,H).data; let I=0,U=0,semi=0;
    for(let i=0;i<W*H;i++){ const gg=gd[i*4]>127, pp=pd[i*4+3]>127; if(gg&&pp) I++; if(gg||pp) U++; if(pd[i*4+3]>8&&pd[i*4+3]<247) semi++; }
    return {iou:I/U,W,H,corner:pd[3],centre:pd[((H>>1)*W+(W>>1))*4+3],semi,isCanvas:c instanceof HTMLCanvasElement,key:p.key,thumb:p.thumb.slice(0,22)}; },IOU);
  ok(N+'IoU of the cut-out against the known can alpha is at least '+IOU+' ('+q.iou.toFixed(3)+', '+q.W+'x'+q.H+', '+ms+' ms incl. first download)',q.iou>=IOU,q);
  ok(N+'the result has a see-through ground and an opaque can, with a soft edge',q.corner===0&&q.centre===255&&q.semi>50,q);
  ok(N+'the photo slot shows the cut-out (PNG thumb)',q.thumb.includes('image/png'));
  /* a second cut-out is quick (the model is warm), and the note says it worked */
  ok(N+'the note says the background is removed',/removed/i.test(await pg.textContent('#cutNote')));
  /* save: 2x PNG */
  const dls=[]; pg.on('download',d=>dls.push(d));
  if(phone){ await tap('#barSave'); await pg.waitForTimeout(800); }
  if(!phone||(await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'))&&!dls.length)) await tap('#save');
  for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
  const dl=dls[0]; const size=dl?pngSize(await dl.path()):'none';
  ok(N+'saving still makes the full-size 2160x3840 PNG with the cut-out in',size==='2160x3840',size);
  /* undo */
  await pg.evaluate(()=>{ const s=document.getElementById('sh-save'); if(s&&s.classList.contains('open')) document.querySelector('#sh-save .sheet-x, #sh-save [data-close]')?.click(); });
  await pg.waitForTimeout(700);
  await pg.evaluate(()=>document.getElementById('undo').click()); await pg.waitForTimeout(500);
  const back=await pg.evaluate(()=>{ const p=Studio.debug.S.photos.find(p=>p.img&&!p.sample); return {cut:!!p.cutout,canvas:p.img instanceof HTMLCanvasElement,w:p.img.width}; });
  ok(N+'Undo brings the original photo back',!back.cut&&back.w===1080,back);
  await on.ctx.close();
}
async function create(tag,opts){
  const phone=!!opts.hasTouch, N=tag+': ';
  for(const flag of [false,true]){
    const m=await mk(opts,flag), pg=m.pg;
    await pg.goto(BASE+'tools/create.html'); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400);
    await pg.evaluate(()=>{ const s=document.getElementById('crSheetX'); s&&s.click(); }); await pg.waitForTimeout(300);
    const have=await pg.evaluate(async()=>{ const blob=await (await fetch('../tests/fixtures/cutout-can.jpg')).blob(); const [n]=await BD.addPhotos([new File([blob],'can.jpg',{type:'image/jpeg'})]); BD.select([n]); return !!n; });
    await pg.waitForTimeout(500);
    const btn=await pg.evaluate(()=>{ const x=document.querySelector('#crCtx [data-x="cutout"]'); if(!x) return null; const r=x.getBoundingClientRect(); return {h:Math.round(r.height),w:Math.round(r.width)}; });
    if(!flag){ ok(N+'Create, flag off: a photo layer has no Cut out button and nothing is requested',have&&!btn&&modelReq(m.reqs).length===0,{btn,reqs:modelReq(m.reqs)}); await m.ctx.close(); continue; }
    ok(N+'Create, flag on: a photo layer shows Cut out (at least 44px) and nothing is fetched yet',have&&btn&&btn.h>=44&&modelReq(m.reqs).length===0,{btn,reqs:modelReq(m.reqs)});
    const before=await pg.evaluate(()=>{ const n=BD.S.sel[0]; const par=n.getParent(); return {count:par.children.length,id:n._id,x:n.x(),y:n.y(),w:n.width(),h:n.height(),z:n.zIndex()}; });
    await (phone?pg.tap('#crCtx [data-x="cutout"]'):pg.click('#crCtx [data-x="cutout"]'));
    await pg.waitForFunction(()=>BD.S.sel[0]&&/cut-out/.test(BD.S.sel[0].getAttr('label')||''),null,{timeout:120000});
    const after=await pg.evaluate(id=>{ const m=BD.S.sel[0], par=m.getParent(), old=par.children.find(c=>c._id===id), im=BD.IMGS.get(m.getAttr('imgId'));
      const c=document.createElement('canvas'); c.width=im.w; c.height=im.h; const x=c.getContext('2d'); x.drawImage(im.el,0,0); const d=x.getImageData(0,0,im.w,im.h).data;
      return {count:par.children.length,above:m.zIndex()>old.zIndex(),oldHidden:old.visible()===false,oldAlive:!!old.getStage(),x:m.x(),y:m.y(),w:m.width(),h:m.height(),corner:d[3],centre:d[((im.h>>1)*im.w+(im.w>>1))*4+3]}; },before.id);
    ok(N+'Create: a new layer sits above the photo, same place and size, with a see-through ground',after.count===before.count+1&&after.above&&after.x===before.x&&after.y===before.y&&after.w===before.w&&after.h===before.h&&after.corner===0&&after.centre===255,{before,after});
    ok(N+'Create: the photo is hidden, not deleted',after.oldHidden&&after.oldAlive,after);
    await pg.evaluate(()=>BD.undo()); await pg.waitForTimeout(600);
    const undone=await pg.evaluate(()=>{ const all=BD.main.find('Image'); return {n:all.filter(i=>/cut-out/.test(i.getAttr('label')||'')).length,total:all.length,visible:all.filter(i=>i.visible()).length}; });
    ok(N+'Create: Undo removes the cut-out layer and shows the photo again',undone.n===0&&undone.total===1&&undone.visible===1,undone);
    await m.ctx.close();
  }
}
const PH={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}, DK={viewport:{width:1280,height:800}};
for(const [tag,o] of [['phone light',{...PH,colorScheme:'light'}],['phone dark',{...PH,colorScheme:'dark'}],['desktop',{...DK,colorScheme:'light'}]]){ if(process.env.ONLY&&!tag.includes(process.env.ONLY)) continue;
  try{ await tool(tag,o); }catch(e){ ok(tag+': tool block ran',false,String(e.message).split('\n')[0]); }
  if(tag!=='phone dark'){ try{ await create(tag,o); }catch(e){ ok(tag+': Create block ran',false,String(e.message).split('\n')[0]); } }
}
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

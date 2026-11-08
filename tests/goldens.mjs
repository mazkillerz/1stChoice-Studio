/* Visual goldens: every Create template of the brand kit (create.templates, including the layout:'doc' National Day ones) is drawn
   small and compared, pixel by pixel with a tolerance, with tests/goldens/<brand>/<id>.png, so a drawing, token or component change
   cannot silently alter a template.
     node tests/goldens.mjs                    all templates; prints PASS/FAIL per template and the ids that differ
     node tests/goldens.mjs ice-cold nd-pfp    only these ids
     UPDATE=1 node tests/goldens.mjs [ids]     rewrite the goldens on purpose (look at them before committing; git diff --stat shows which moved)
   Size: 144 px wide (story 144x256, post 144x180, square 144x144): the first page drawn at 1x, halved in steps like tplthumbs.mjs.
   Tolerance (font antialiasing and tiny GPU/zoom differences must not fail): mean absolute difference <= MEAN (RGB, of 255) and the
   share of pixels that differ by more than BIG on any channel <= SHARE. On a failure <id>.diff.png (golden, new, diff side by side, red = changed)
   is written to GOLD_OUT (default: $TMPDIR/studio-goldens) and the path is printed.
   REAL FONTS ARE REQUIRED (same as tplthumbs.mjs: via HTTPS_PROXY if set, localhost direct). A template whose brand fonts did not load
   fails with that message instead of comparing against a fallback font.
   Server on :8080 (BASE=... to change). Exit 1 on any FAIL. */
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
import fs from 'fs';
import os from 'os';
import path from 'path';
const { chromium } = await import('playwright');
const BASE=process.env.BASE||'http://127.0.0.1:8080/', BRAND_ID=process.env.BRAND||'1stchoice';
const ROOT=new URL('../',import.meta.url).pathname, DIR=path.join(ROOT,'tests/goldens',BRAND_ID);
const OUT=process.env.GOLD_OUT||path.join(process.env.TMPDIR||os.tmpdir(),'studio-goldens');
const UPDATE=!!process.env.UPDATE, W=144, MEAN=1.5, BIG=48, SHARE=0.012;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const { loadKit } = await import('./kit.mjs');
const BRAND=loadKit(ROOT,BRAND_ID);   // brand.js + its packs (w2-packs)
const all=((BRAND.create&&BRAND.create.templates)||[]).map(d=>d.id);
const ids=process.argv.slice(2).filter(a=>!a.startsWith('--')), bad0=ids.filter(i=>!all.includes(i));
if(bad0.length){ console.log('FAIL not in the brand kit: '+bad0.join(', ')); process.exit(1); }
const todo=ids.length?ids:all;
const fonts=[BRAND.fonts&&BRAND.fonts.display,BRAND.fonts&&BRAND.fonts.body].filter(Boolean);
fs.mkdirSync(DIR,{recursive:true}); fs.mkdirSync(OUT,{recursive:true});

/* in the page: halve a canvas to W px wide, keep it as a PNG; compare with the golden (url) and build golden|new|diff */
const FINISH=`window.__gold=async function(src,o){
  const sh=src.height, sw=src.width, h=Math.round(o.w*sh/sw); let cur=src;
  while(cur.width/2>=o.w){ const n=document.createElement('canvas'); n.width=Math.round(cur.width/2); n.height=Math.round(cur.height/2); const x=n.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(cur,0,0,n.width,n.height); cur=n; }
  const out=document.createElement('canvas'); out.width=o.w; out.height=h; const g=out.getContext('2d',{willReadFrequently:true}); g.fillStyle='#fff'; g.fillRect(0,0,o.w,h); g.imageSmoothingQuality='high'; g.drawImage(cur,0,0,o.w,h);
  const res={png:out.toDataURL('image/png'),w:o.w,h};
  if(o.golden){ const img=new Image(); img.src=o.golden; try{ await img.decode(); }catch(e){ return {...res,missing:true}; }
    if(img.width!==o.w||img.height!==h) return {...res,size:[img.width,img.height]};
    const gc=document.createElement('canvas'); gc.width=o.w; gc.height=h; const gg=gc.getContext('2d',{willReadFrequently:true}); gg.drawImage(img,0,0);
    const a=gg.getImageData(0,0,o.w,h).data, b=g.getImageData(0,0,o.w,h).data, d=new ImageData(o.w,h); let sum=0, big=0;
    for(let i=0;i<a.length;i+=4){ const m=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2])); sum+=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3; if(m>o.big) big++;
      const v=m>o.big; d.data[i]=v?255:b[i]; d.data[i+1]=v?0:b[i+1]; d.data[i+2]=v?0:b[i+2]; d.data[i+3]=255; }
    res.mean=sum/(a.length/4); res.share=big/(a.length/4);
    if(res.mean>o.mean||res.share>o.share){ const t=document.createElement('canvas'); t.width=o.w*3+8; t.height=h; const tg=t.getContext('2d'); tg.fillStyle='#888'; tg.fillRect(0,0,t.width,h); tg.drawImage(gc,0,0); tg.drawImage(out,o.w+4,0); tg.putImageData(d,o.w*2+8,0); res.diffPng=t.toDataURL('image/png'); } }
  return res; };`;
const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined;
const browser=await chromium.launch(proxy?{proxy}:{});
const gold=id=>{ const f=path.join(DIR,id+'.png'); return fs.existsSync(f)?'data:image/png;base64,'+fs.readFileSync(f).toString('base64'):null; };
async function one(id){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,ignoreHTTPSErrors:true,serviceWorkers:'block'});
  try{ await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
    await ctx.addInitScript({content:FINISH});
    const pg=await ctx.newPage(), errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto(BASE+'tools/create.html?tpl='+encodeURIComponent(id));
    await pg.waitForFunction(()=>window.CRUI&&window.BD&&BD.util.frames().length>0,null,{timeout:60000});
    /* fonts: poke them (they load when first used), then wait until each is really loaded */
    let fontsOk=false; for(let t=0;t<60&&!fontsOk;t++){
      fontsOk=await pg.evaluate(async f=>{ await Promise.all(f.flatMap(n=>['','600 ','800 '].map(w=>document.fonts.load(w+'40px "'+n+'"','عربي abc'))).map(p=>p.catch(()=>{}))); await document.fonts.ready;
        return f.every(n=>[...document.fonts].some(x=>x.family.replace(/["']/g,'')===n&&x.status==='loaded')); },fonts).catch(()=>false);
      if(!fontsOk) await pg.waitForTimeout(500); }
    if(!fontsOk) return {id,error:'the brand fonts did not load (check the proxy / network)'};
    await pg.evaluate(()=>BD.hdReady());   // the HD can cut-outs
    /* every picture of the page decoded before the draw: wait until two draws in a row give the same pixels */
    const draw=()=>pg.evaluate(async o=>{ const f=BD.util.frames()[0], s=BD.util.fsize(f), c=BD.renderFrame(f,Math.min(1,1080/s.w)); const r=await window.__gold(c,o); c.width=c.height=0; return r; },{w:W,golden:UPDATE?null:gold(id),mean:MEAN,big:BIG,share:SHARE});
    let r=await draw(), prev=r.png;
    for(let i=0;i<8;i++){ await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(250); const r2=await draw(); const same=r2.png===prev; prev=r2.png; r=r2; if(same) break; }
    if(errs.length) return {id,error:'page error: '+errs[0]};
    return {id,...r};
  } finally { await ctx.close(); } }
const results=[]; let next=0;
async function worker(){ while(next<todo.length){ const id=todo[next++]; let r;
  try{ r=await one(id); if(r.error||(!UPDATE&&(r.mean>MEAN||r.share>SHARE||r.size))) r=await one(id); }catch(e){ r={id,error:String(e&&e.message||e).split('\n')[0]}; }   // one retry: a slow machine
  results.push(r);
  if(r.error){ console.log('FAIL '+id+' '+r.error); continue; }
  if(UPDATE){ fs.writeFileSync(path.join(DIR,id+'.png'),Buffer.from(r.png.split(',')[1],'base64')); console.log('wrote '+id+' '+r.w+'x'+r.h); continue; }
  if(r.missing){ console.log('FAIL '+id+' no golden yet (UPDATE=1 node tests/goldens.mjs '+id+')'); r.error='missing'; continue; }
  if(r.size){ console.log('FAIL '+id+' size changed: golden '+r.size.join('x')+', now '+r.w+'x'+r.h); r.error='size'; continue; }
  if(r.diffPng){ const f=path.join(OUT,id+'.diff.png'); fs.writeFileSync(f,Buffer.from(r.diffPng.split(',')[1],'base64')); r.error='differs';
    console.log('FAIL '+id+' differs: mean '+r.mean.toFixed(2)+' (max '+MEAN+'), '+(r.share*100).toFixed(2)+'% pixels changed (max '+SHARE*100+'%) -> '+f); }
  else console.log('PASS '+id+' (mean '+r.mean.toFixed(2)+', '+(r.share*100).toFixed(2)+'%)'); } }
await Promise.all(Array.from({length:Math.min(+process.env.GOLD_JOBS||2,todo.length)},worker));
await browser.close();
const stale=fs.readdirSync(DIR).filter(f=>/\.png$/.test(f)&&!all.includes(f.slice(0,-4)));
if(stale.length) console.log('note: goldens for templates no longer in the brand kit (move them to _archive/): '+stale.join(', '));
const failed=results.filter(r=>r.error).map(r=>r.id);
if(UPDATE){ console.log(results.length+' golden(s) written to '+path.relative(ROOT,DIR)+', '+Math.round(fs.readdirSync(DIR).reduce((a,f)=>a+fs.statSync(path.join(DIR,f)).size,0)/1024)+' KB in all'); process.exit(failed.length?1:0); }
console.log(failed.length?'goldens: '+failed.length+' of '+results.length+' differ: '+failed.join(' '):'goldens: all '+results.length+' templates match');
process.exit(failed.length?1:0);

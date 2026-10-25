/* Template previews: makes the pictures the Templates library shows (Home → Templates, search results).
   Output: assets/thumbs/<brand>/tpl/<id>.jpg, one per Create template (brand kit create.templates) and one per tool preset (brand kit presets).
   Sizes: story 320×569, post 320×400, square 320×320 (a highlight preset = the middle square of its cover). JPEG ≈ 0.8, each file under 45 KB.

     node tests/tplthumbs.mjs                 every Create template and every preset
     node tests/tplthumbs.mjs ice-cold rs-cans   only these ids
     node tests/tplthumbs.mjs --tool=restock,collage   only the presets of these tools
     node tests/tplthumbs.mjs --create        only the Create templates

   - Create templates: opens tools/create.html?tpl=<id>, waits for the brand fonts and the HD cans, draws the first page.
   - Tool presets: opens tools/<tool>.html?preset=<id> in a fresh browser context (no remembered settings, no drafts), waits for fonts and
     example photos until the preview canvas (#view) stops changing, and scales that canvas down (a Carousel shows its 2nd slide, because
     its 1st is a full photo that looks the same in every style: see PREVIEW_PAGE); the preview-only guides are switched off.
   REAL FONTS ARE REQUIRED (Lalezar / Cairo come from Google Fonts): behind a proxy it uses HTTPS_PROXY (localhost stays direct) and
   ignores the proxy's certificate. A page whose brand fonts did not load is not written (so a fallback font never ends up in a preview).
   Serve the repo first: npx http-server -p 8080 -c-1 .   (BASE=http://host:port/ to use another address). Exit code 1 if anything failed. */
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
import fs from 'fs';
import path from 'path';
const { chromium } = await import('playwright');

const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const BRAND_ID=process.env.BRAND||'1stchoice';
const ROOT=new URL('../',import.meta.url).pathname;
const OUT=path.join(ROOT,'assets/thumbs',BRAND_ID,'tpl');
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const MAX_BYTES=45000, W=320, CONCURRENCY=3;
const PREVIEW_PAGE={carousel:1};   // tool → the slide (0 = first) its thumbnail shows

/* the brand kit, read without a browser */
let BRAND=null; new Function('Studio',fs.readFileSync(path.join(ROOT,'brands',BRAND_ID,'brand.js'),'utf8'))({registerBrand:b=>{ BRAND=b; }});
if(!BRAND) throw new Error('brands/'+BRAND_ID+'/brand.js did not register a brand');
const fonts=[BRAND.fonts&&BRAND.fonts.display,BRAND.fonts&&BRAND.fonts.body].filter(Boolean);

/* ---------- what to make ---------- */
const jobs=[];
((BRAND.create&&BRAND.create.templates)||[]).forEach(d=>jobs.push({kind:'create',id:d.id,tool:'create',hl:d.layout==='highlight',size:d.size||'story'}));
(BRAND.presets||[]).forEach(p=>jobs.push({kind:'preset',id:p.id,tool:p.tool,hl:p.tool==='highlight'}));
const dup=jobs.map(j=>j.id).filter((id,i,a)=>a.indexOf(id)!==i); if(dup.length){ console.error('Two templates share an id (the picture would be overwritten): '+[...new Set(dup)].join(', ')); process.exit(1); }
const args=process.argv.slice(2), ids=args.filter(a=>!a.startsWith('--')), opt=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{ const [k,v]=a.slice(2).split('='); return [k,v===undefined?true:v]; }));
let todo=jobs;
if(ids.length){ const bad=ids.filter(id=>!jobs.some(j=>j.id===id)); if(bad.length){ console.error('Not in the brand kit: '+bad.join(', ')); process.exit(1); } todo=jobs.filter(j=>ids.includes(j.id)); }
if(opt.create) todo=todo.filter(j=>j.kind==='create');
if(opt.tool) { const t=String(opt.tool).split(','); todo=todo.filter(j=>j.kind==='preset'&&t.includes(j.tool)); }
if(!todo.length){ console.error('Nothing to make.'); process.exit(1); }

/* ---------- in the page: scale a canvas down in steps (clean edges), optionally crop first, then JPEG under the size limit ---------- */
const FINISH=`window.__tplFinish=function(src,o){
  let cur=src, sx=o.crop?o.crop.x:0, sy=o.crop?o.crop.y:0, sw=o.crop?o.crop.w:src.width, sh=o.crop?o.crop.h:src.height;
  const base=document.createElement('canvas'); base.width=sw; base.height=sh; const bx=base.getContext('2d'); bx.fillStyle='#FFFFFF'; bx.fillRect(0,0,sw,sh); bx.drawImage(src,sx,sy,sw,sh,0,0,sw,sh); cur=base;
  const h=Math.round(o.w*sh/sw);
  while(cur.width/2>=o.w){ const n=document.createElement('canvas'); n.width=Math.round(cur.width/2); n.height=Math.round(cur.height/2); const x=n.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(cur,0,0,n.width,n.height); cur=n; }
  const out=document.createElement('canvas'); out.width=o.w; out.height=h; const ox=out.getContext('2d'); ox.fillStyle='#FFFFFF'; ox.fillRect(0,0,o.w,h); ox.imageSmoothingEnabled=true; ox.imageSmoothingQuality='high'; ox.drawImage(cur,0,0,o.w,h);
  let q=0.8, url=''; for(;;){ url=out.toDataURL('image/jpeg',q); if(url.length*0.75<o.max||q<=0.5) break; q=Math.round((q-0.05)*100)/100; }
  return {url,q,w:o.w,h};
};
window.__tplFontsReady=function(names){ return names.every(n=>[...document.fonts].some(f=>f.family.replace(/["']/g,'')===n&&f.status==='loaded')); };`;

/* ---------- browser ---------- */
const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined;
const browser=await chromium.launch(proxy?{proxy}:{});
async function freshPage(){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,ignoreHTTPSErrors:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:FINISH});
  const pg=await ctx.newPage(), errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.errs=errs;
  return {ctx,pg}; }
/* wait until the brand fonts are really loaded (they load when first used, so poke them) */
async function fontsOk(pg,ms){ const t0=Date.now();
  while(Date.now()-t0<ms){ await pg.evaluate(async f=>{ await Promise.all(f.flatMap(n=>[document.fonts.load('40px "'+n+'"','عربي abc'),document.fonts.load('800 40px "'+n+'"','عربي abc'),document.fonts.load('600 40px "'+n+'"','عربي abc')]).map(p=>p.catch(()=>{}))); await document.fonts.ready; },fonts).catch(()=>{});
    if(await pg.evaluate(f=>window.__tplFontsReady(f),fonts)) return true; await pg.waitForTimeout(500); }
  return false; }

async function createThumb(j){ const {ctx,pg}=await freshPage();
  try{ await pg.goto(BASE+'tools/create.html?tpl='+encodeURIComponent(j.id),{waitUntil:'load'});
    await pg.waitForFunction(()=>window.CRUI&&window.BD&&BD.util.frames().length>0,null,{timeout:60000});
    if(!await fontsOk(pg,30000)) throw new Error('the brand fonts did not load (check the proxy / network)');
    await pg.evaluate(()=>BD.hdReady());           // the HD can cut-outs (the light copies show first)
    await pg.waitForTimeout(400);
    const r=await pg.evaluate(o=>{ const f=BD.util.frames()[0]; if(!f) return null; const s=BD.util.fsize(f), c=BD.renderFrame(f,Math.min(1,1080/s.w));
        const res=window.__tplFinish(c,{w:o.w,max:o.max}); c.width=c.height=0; return res; },{w:W,max:MAX_BYTES});
    if(!r) throw new Error('no page was built');
    if(pg.errs.length) throw new Error('page error: '+pg.errs[0]);
    return r;
  } finally { await ctx.close(); } }

async function presetThumb(j){ const {ctx,pg}=await freshPage();
  try{ await pg.goto(BASE+'tools/'+j.tool+'.html?preset='+encodeURIComponent(j.id),{waitUntil:'load'});
    await pg.waitForSelector('#view',{timeout:60000});
    await pg.waitForTimeout(2500);                   // fonts, example photos, cut-outs
    if(!await fontsOk(pg,30000)) throw new Error('the brand fonts did not load (check the proxy / network)');
    /* a multi-slide tool shows the slide where its style can be seen (a carousel's first slide is a full photo, the same for every style) */
    if(PREVIEW_PAGE[j.tool]!=null){ await pg.waitForSelector('.sthumb[data-pg="'+PREVIEW_PAGE[j.tool]+'"]',{timeout:30000}); await pg.click('.sthumb[data-pg="'+PREVIEW_PAGE[j.tool]+'"]',{force:true}); await pg.waitForTimeout(800); }
    /* the preview-only guides (Highlight's Instagram circle, Carousel's grid crop) are not part of the picture */
    await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:30000});
    await pg.evaluate(()=>{ const S=Studio.debug.S, v=S.values||{}; let hit=false; ['guide','grid'].forEach(k=>{ if(v[k]===true){ v[k]=false; hit=true; } }); if(hit) Studio.debug.render(); });
    /* until the canvas stops changing: three equal looks, half a second apart */
    const look=()=>pg.evaluate(()=>{ const v=document.getElementById('view'), s=document.createElement('canvas'); s.width=54; s.height=Math.max(1,Math.round(54*v.height/v.width)); const x=s.getContext('2d'); x.drawImage(v,0,0,s.width,s.height); const d=x.getImageData(0,0,s.width,s.height).data; let h=5381; for(let i=0;i<d.length;i+=4){ h=(h*33^d[i]^(d[i+1]<<3)^(d[i+2]<<6))>>>0; } return h; });
    let last=await look(), same=0; for(let i=0;i<40&&same<3;i++){ await pg.waitForTimeout(500); const h=await look(); same=h===last?same+1:0; last=h; }
    if(same<3) throw new Error('the preview kept changing');
    const r=await pg.evaluate(o=>{ const v=document.getElementById('view'), crop=o.hl?{x:0,y:Math.round((v.height-v.width)/2),w:v.width,h:v.width}:null; return window.__tplFinish(v,{w:o.w,max:o.max,crop}); },{w:W,max:MAX_BYTES,hl:j.hl});
    if(pg.errs.length) throw new Error('page error: '+pg.errs[0]);
    return r;
  } finally { await ctx.close(); } }

/* ---------- run ---------- */
fs.mkdirSync(OUT,{recursive:true});
const made=[], failed=[]; let next=0;
async function worker(){ while(next<todo.length){ const j=todo[next++];
  try{ let r; try{ r=await (j.kind==='create'?createThumb(j):presetThumb(j)); }catch(e){ r=await (j.kind==='create'?createThumb(j):presetThumb(j)); }   // one retry
    const buf=Buffer.from(r.url.split(',')[1],'base64'); fs.writeFileSync(path.join(OUT,j.id+'.jpg'),buf); made.push({id:j.id,bytes:buf.length});
    console.log('ok   '+j.id.padEnd(20)+' '+r.w+'×'+r.h+'  '+(buf.length/1024).toFixed(1)+' KB  q'+r.q+(buf.length>=MAX_BYTES?'  (over the limit!)':''));
  }catch(e){ failed.push(j.id); console.log('FAIL '+j.id.padEnd(20)+' '+String(e&&e.message||e).split('\n')[0]); } } }
await Promise.all(Array.from({length:Math.min(CONCURRENCY,todo.length)},worker));
await browser.close();
const total=made.reduce((a,m)=>a+m.bytes,0), big=made.filter(m=>m.bytes>=MAX_BYTES);
console.log('\n'+made.length+' picture(s) written to '+path.relative(ROOT,OUT)+', '+(total/1024).toFixed(0)+' KB in all'+(failed.length?'; FAILED: '+failed.join(', '):'')+(big.length?'; over '+MAX_BYTES/1000+' KB: '+big.map(m=>m.id).join(', '):''));
process.exit(failed.length||big.length?1:0);

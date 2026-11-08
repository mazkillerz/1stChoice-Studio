/* National Day 2026 + new label reveal templates (brand kit layout 'doc': a saved Create document shipped in brands/<id>/templates/):
   each one opens at its size with its locked background picture and editable words (Arabic right-to-left), the Templates hub has the
   National Day filter, hidden assets (the backgrounds) never show in Add, and Save gives a 2× PNG. Phone 390×844 touch + 1280×800. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync('/tmp/ndtest-');
const pngSize=f=>{ const x=fs.readFileSync(f); return [x.readUInt32BE(16),x.readUInt32BE(20)]; };
import { loadKit } from './kit.mjs';
const BRAND=loadKit(ROOT,'1stchoice');   // brand.js + its packs, merged the way the engine does
const defs=BRAND.create.templates.filter(d=>d.layout==='doc');
const SZ={story:[1080,1920],post:[1080,1350],square:[1080,1080]};
const AR=/[؀-ۿ]/;
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|ERR_FAILED|ERR_ABORTED|net::/.test(m.text())) errs.push(tag+' '+m.text()); }); };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}); await pg.waitForTimeout(500); };
const ctxOpts={phone:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},desk:{viewport:{width:1280,height:800}}};
ok('brand lists 29 doc templates and a National Day category',defs.length===29&&(BRAND.templateCats||[]).some(c=>c.id==='nationalday'),defs.length);

async function check(pg,d,tag){
  const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8')), K=doc.nodes[0].k, want={t:K.filter(k=>k.c==='Text').length,i:K.filter(k=>k.c==='Image').length,r:K.filter(k=>k.c==='Rect'&&k.a.name!=='frame-bg').length,tex:K.filter(k=>k.a.fillTex).length}, [w,h]=SZ[d.size];
  await pg.goto(BASE+'tools/create.html?tpl='+d.id); await ready(pg);
  await pg.waitForFunction(()=>BD.main.find('Image').every(n=>n.image())&&BD.main.find('Text').every(t=>!t.getAttr('fillTex')||t.fillPatternImage()),null,{timeout:20000}).catch(()=>{});
  const r=await pg.evaluate(()=>{ const fr=BD.util.frames(), f=fr[0], s=BD.util.fsize(f), im=f.find('Image'), tx=f.find('Text'), rc=f.find('Rect').filter(n=>!n.hasName('frame-bg'));
    return {n:fr.length,w:s.w,h:s.h,imgs:im.length,imgsOk:im.every(n=>n.image()&&n.image().width>4),rects:rc.length,texts:tx.length,tex:tx.filter(t=>t.getAttr('fillTex')&&t.fillPatternImage()).length,
      locked:[...im,...tx,...rc].filter(n=>BD.util.isLocked(n)).length,photos:im.filter(n=>n.getAttr('kind')==='image').length,
      rtl:tx.filter(t=>/[؀-ۿ]/.test(t.text())).every(t=>t.direction()==='rtl'),tpl:f.getAttr('tpl')}; });
  ok(tag+' '+d.id+': one frame '+w+'×'+h+', '+want.i+' pictures all loaded, '+want.r+' shapes',r.n===1&&r.w===w&&r.h===h&&r.imgs===want.i&&r.imgsOk&&r.rects===want.r,{r,want});
  ok(tag+' '+d.id+': '+want.t+' texts ('+want.tex+' crayon), Arabic rtl, nothing locked, tpl attr',r.texts===want.t&&r.tex===want.tex&&r.rtl&&r.locked===0&&r.tpl===d.id,{r,want});
  if(/^lr-(r1|c1|c2|c3|c4|c5|r3|r4|t2|t4)/.test(d.id)) ok(tag+' '+d.id+': photos are real photo layers (replaceable)',r.photos>0,r);
  /* a tap on the biggest picture selects that picture on its own (layers are separate) */
  const pt=await pg.evaluate(()=>{ const f=BD.activeFrame(), fw=BD.util.fsize(f).w, im=f.find('Image').filter(n=>n.width()*Math.abs(n.scaleX())<fw*0.95); if(!im.length) return null;
    const n=im.reduce((a,b)=>a.width()*a.height()>b.width()*b.height()?a:b), rc=n.getClientRect(), st=BD.stage.container().getBoundingClientRect();
    const top=BD.stage.getIntersection({x:rc.x+rc.width/2,y:rc.y+rc.height/2}); return {x:st.left+rc.x+rc.width/2,y:st.top+rc.y+rc.height/2,id:n.id(),hit:top&&top.id()}; });
  if(pt&&pt.hit===pt.id){ if(tag==='phone') await pg.touchscreen.tap(pt.x,pt.y); else await pg.mouse.click(pt.x,pt.y); await pg.waitForTimeout(250);
    ok(tag+' '+d.id+': tapping a picture selects just that picture',await pg.evaluate(id=>BD.S.sel.length===1&&BD.S.sel[0].id()===id,pt.id)); } }

for(const [tag,o] of Object.entries(ctxOpts)){
  const ctx=await b.newContext({...o,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,tag);
  for(const d of defs){ try{ await check(pg,d,tag); }catch(e){ ok(tag+' '+d.id+' threw '+String(e.message).split('\n')[0],false); } }
  /* Save sheet export for two of them */
  for(const id of ['nd-greeting','lr-c1-cover']){ const d=defs.find(x=>x.id===id); await pg.goto(BASE+'tools/create.html?tpl='+id); await ready(pg); await pg.waitForTimeout(500);
    await (tag==='phone'?pg.tap('#crBar [data-cr="save"]'):pg.click('#crBar [data-cr="save"]')); await pg.waitForTimeout(400);
    const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:60000}),tag==='phone'?pg.tap('#crGo'):pg.click('#crGo')]); const f=OUT+'/'+tag+'-'+dl.suggestedFilename(); await dl.saveAs(f);
    const [w,h]=SZ[d.size]; ok(tag+' '+id+': Save image is '+w*2+'×'+h*2+' PNG',JSON.stringify(pngSize(f))===JSON.stringify([w*2,h*2])&&/\.png$/.test(f),pngSize(f)); }
  /* Add → Brand never offers hidden assets, but does offer the visible National Day pieces */
  await pg.goto(BASE+'tools/create.html?size=story'); await ready(pg);
  await (tag==='phone'?pg.tap('#crBar [data-cr="add"]'):pg.click('#crBar [data-cr="add"]')); await pg.waitForTimeout(400);
  const ids=await pg.evaluate(()=>[...document.querySelectorAll('#crSheet [data-asset]')].map(x=>x.dataset.asset));
  const hidden=BRAND.assets.filter(a=>a.hidden).map(a=>a.id), shown=BRAND.assets.filter(a=>!a.hidden&&a.group==='National Day 2026').map(a=>a.id);
  ok(tag+': Add lists no hidden asset ('+hidden.length+' hidden)',hidden.length>0&&!ids.some(i=>hidden.includes(i)),ids.filter(i=>hidden.includes(i)));
  ok(tag+': Add lists the National Day pieces',shown.length>0&&shown.every(i=>ids.includes(i)),shown.filter(i=>!ids.includes(i)));
  /* the Templates picker inside Create lists them, under the right size */
  await pg.evaluate(()=>document.getElementById('crSheetX')&&document.getElementById('crSheetX').click()); await pg.waitForTimeout(250);
  await pg.goto(BASE+'tools/create.html'); await ready(pg);
  ok(tag+': Create start sheet lists every new template',await pg.evaluate(ids=>ids.every(i=>document.querySelector('[data-tpl="'+i+'"]')),defs.map(d=>d.id)));
  /* hub: Templates → National Day chip with all 29 */
  await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('#templatesView .tp-chip',{timeout:15000}); await pg.waitForTimeout(500);
  const chip=await pg.evaluate(()=>{ const c=[...document.querySelectorAll('#templatesView .tp-chip')], i=c.findIndex(x=>/National Day/.test(x.textContent)); return {i,first:c[0]&&c[0].textContent,second:c[1]&&c[1].textContent,n:i>=0?+(c[i].querySelector('.tp-cn')||{}).textContent:0}; });
  ok(tag+': hub has a National Day chip right after All, count 29',chip.i===1&&chip.n===29,chip);
  await pg.click('#templatesView .tp-chip >> nth=1'); await pg.waitForTimeout(500);
  ok(tag+': the National Day filter lists 29 entries',await pg.evaluate(()=>document.querySelectorAll('#templatesView .tp-card').length)===29);
  await ctx.close(); }
ok('no console errors',!errs.length,errs.slice(0,3));
await b.close(); console.log(fails?'\n'+fails+' FAILED':'\nAll passed'); process.exit(fails?1:0);

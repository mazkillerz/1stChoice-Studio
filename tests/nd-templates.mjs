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
let BRAND=null; new Function('Studio',fs.readFileSync(ROOT+'brands/1stchoice/brand.js','utf8'))({registerBrand:b=>{ BRAND=b; }});
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
  const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8')), want=doc.nodes[0].k.filter(k=>k.c==='Text'), [w,h]=SZ[d.size];
  await pg.goto(BASE+'tools/create.html?tpl='+d.id); await ready(pg);
  await pg.waitForFunction(()=>BD.main.find('Image').length>0&&BD.main.find('Image').every(n=>n.image()),null,{timeout:20000}).catch(()=>{});
  const r=await pg.evaluate(()=>{ const fr=BD.util.frames(), f=fr[0], s=BD.util.fsize(f), bg=f.findOne('Image'), tx=f.find('Text');
    return {n:fr.length,w:s.w,h:s.h,bgOk:!!(bg&&bg.image()&&bg.image().width>100),locked:!!bg&&BD.util.isLocked(bg),texts:tx.length,
      rtl:tx.filter(t=>/[؀-ۿ]/.test(t.text())).every(t=>t.direction()==='rtl'),tpl:f.getAttr('tpl')}; });
  ok(tag+' '+d.id+': one frame '+w+'×'+h+', background image loaded',r.n===1&&r.w===w&&r.h===h&&r.bgOk,r);
  ok(tag+' '+d.id+': '+want.length+' texts, Arabic rtl, background locked, tpl attr',r.texts===want.length&&r.rtl&&r.locked&&r.tpl===d.id,r);
  /* tapping the background does not select it */
  const box=await pg.locator('#crStage').boundingBox();
  const p=await pg.evaluate(()=>{ const f=BD.activeFrame(), t=BD.stage.getAbsoluteTransform(), s=BD.util.fsize(f); return t.point({x:f.x()+s.w-6,y:f.y()+s.h-6}); });
  if(tag==='phone') await pg.touchscreen.tap(box.x+p.x,box.y+p.y); else await pg.mouse.click(box.x+p.x,box.y+p.y);
  await pg.waitForTimeout(200);
  ok(tag+' '+d.id+': tapping the background selects nothing',await pg.evaluate(()=>BD.S.sel.length===0)); }

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
  ok(tag+': Add lists no hidden asset ('+hidden.length+' hidden)',hidden.length===29&&!ids.some(i=>hidden.includes(i)),ids.filter(i=>hidden.includes(i)));
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

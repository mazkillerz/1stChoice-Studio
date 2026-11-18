/* GTA VI (2.36.0): the always-on 'gta6' pack (brands/1stchoice/packs/gta6) gives 4 Create posts under a GTA VI chip: the customer-mission
   collage, Most wanted, Item collected and Mission passed. Each opens at 1080×1350 with the scene picture as one layer and every word as its own
   editable Anton text layer (outline + shadow kept), the stars and the logo as their own layers, and Save gives a 2× PNG (2160×2700).
   Phone 390×844 touch + 1280×800. Run: server on :8080 (BASE=...), node tests/gta6.mjs. */
import { chromium } from 'playwright';
import fs from 'fs';
import { loadKit } from './kit.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync('/tmp/gta6test-');
const pngSize=f=>{ const x=fs.readFileSync(f); return [x.readUInt32BE(16),x.readUInt32BE(20)]; };
const BRAND=loadKit(ROOT,'1stchoice');
const SZ={post:[1080,1350],story:[1080,1920]};
let fails=0; const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const defs=BRAND.create.templates.filter(d=>d.cat==='gta6');
ok('brand lists 4 GTA VI post templates and a GTA VI chip',defs.length===4&&defs.every(d=>d.size==='post')&&(BRAND.templateCats||[]).some(c=>c.id==='gta6'),defs.length);
ok('every template file exists and every picture it uses is in the kit',defs.every(d=>{ const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8'));
  return doc.nodes.flatMap(f=>f.k).filter(k=>k.c==='Image').every(k=>BRAND.assets.some(a=>'brand:'+a.id===k.a.imgId&&fs.existsSync(ROOT+'brands/1stchoice/'+a.file))); }));
ok('every template has a shipped thumbnail',defs.every(d=>fs.existsSync(ROOT+'assets/thumbs/1stchoice/tpl/'+d.id+'.jpg')));
const b=await chromium.launch(); const errs=[];
for(const [tag,o] of Object.entries({phone:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},desk:{viewport:{width:1280,height:800}}})){
  const ctx=await b.newContext({...o,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+' '+e.message));
  for(const d of defs){ const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8')), [w,h]=SZ[d.size];
    await pg.goto(BASE+'tools/create.html?tpl='+d.id); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}); await pg.waitForTimeout(500);
    const r=await pg.evaluate(()=>BD.util.frames().map(f=>{ const kids=f.getChildren(n=>n.name()==='obj');
      const T=kids.filter(k=>k.className==='Text');
      return {fw:f.getAttr('fw'),fh:f.getAttr('fh'),n:kids.length,texts:T.map(t=>t.text()),anton:T.every(t=>t.fontFamily()==='Anton'),outlined:T.filter(t=>t.strokeWidth()>0&&t.shadowEnabled()).length,locked:kids.filter(k=>k.getAttr('locked')).length,font:document.fonts.check('64px "Anton"')}; }));
    ok(`${tag} ${d.id}: one design with ${doc.nodes.length} page(s)`,r.length===doc.nodes.length&&r.length===(d.pages||1),r.length);
    r.forEach((p,i)=>{ const K=doc.nodes[i].k;
      ok(`${tag} ${d.id}: ${w}×${h}, every piece a layer (${p.n}), the words are editable Anton text`,p.fw===w&&p.fh===h&&p.n===K.length-1&&p.n>=4&&p.locked===0&&p.texts.length>=2&&p.anton&&p.font,p);
      ok(`${tag} ${d.id}: the game words keep their outline and shadow`,p.outlined>=2,p); }); }
  const d=defs.find(x=>x.id==='gta6-customer-mission'); await pg.goto(BASE+'tools/create.html?tpl='+d.id); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}); await pg.waitForTimeout(500);
  await (tag==='phone'?pg.tap('#crBar [data-cr="save"]'):pg.click('#crBar [data-cr="save"]')); await pg.waitForTimeout(400);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:60000}),tag==='phone'?pg.tap('#crGo'):pg.click('#crGo')]); const f=OUT+'/'+tag+'-'+dl.suggestedFilename(); await dl.saveAs(f);
  ok(tag+' gta6-customer-mission: Save image is 2160×2700 PNG',JSON.stringify(pngSize(f))==='[2160,2700]',pngSize(f));
  await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('.tp-chip',{timeout:15000});
  ok(tag+': Templates has a GTA VI chip',(await pg.locator('.tp-chip[data-id="gta6"]').count())===1);
  await pg.locator('.tp-chip[data-id="gta6"]').click(); await pg.waitForTimeout(600);
  const ids=await pg.evaluate(()=>[...document.querySelectorAll('#templatesView .tp-body a.tp-card')].map(a=>a.getAttribute('href')||''));
  ok(tag+': the chip lists the 4 GTA VI templates',ids.length===4&&ids.every(h=>/tpl=gta6-/.test(h)),ids.length);
  await ctx.close(); }
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close(); process.exit(fails?1:0);

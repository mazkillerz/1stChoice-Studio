/* 1st Choice Got Talent (2.4.2): the always-on 'gt' pack (brands/1stchoice/packs/gt) gives 13 layered Create templates under a Got Talent chip.
   Each opens at its size with every piece as its own layer (no flat background picture), Arabic text editable, the follower photo is a
   replaceable photo, and Save gives a 2× PNG. Phone 390×844 touch + 1280×800. Run: server on :8080 (BASE=...), node tests/got-talent.mjs. */
import { chromium } from 'playwright';
import fs from 'fs';
import { loadKit } from './kit.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync('/tmp/gttest-');
const pngSize=f=>{ const x=fs.readFileSync(f); return [x.readUInt32BE(16),x.readUInt32BE(20)]; };
const BRAND=loadKit(ROOT,'1stchoice');
const SZ={post:[1080,1350],story:[1080,1920]};
let fails=0; const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const defs=BRAND.create.templates.filter(d=>d.cat==='gottalent');
ok('brand lists 13 Got Talent templates and a Got Talent chip',defs.length===13&&(BRAND.templateCats||[]).some(c=>c.id==='gottalent'),defs.length);
ok('every template file exists and every picture it uses is in the kit',defs.every(d=>{ const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8'));
  return doc.nodes[0].k.filter(k=>k.c==='Image').every(k=>BRAND.assets.some(a=>'brand:'+a.id===k.a.imgId&&fs.existsSync(ROOT+'brands/1stchoice/'+a.file))); }));
ok('every template has a shipped thumbnail',defs.every(d=>fs.existsSync(ROOT+'assets/thumbs/1stchoice/tpl/'+d.id+'.jpg')));
const b=await chromium.launch(); const errs=[];
for(const [tag,o] of Object.entries({phone:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},desk:{viewport:{width:1280,height:800}}})){
  const ctx=await b.newContext({...o,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+' '+e.message));
  for(const d of defs){ const doc=JSON.parse(fs.readFileSync(ROOT+'brands/1stchoice/'+d.doc,'utf8')), K=doc.nodes[0].k, [w,h]=SZ[d.size];
    await pg.goto(BASE+'tools/create.html?tpl='+d.id); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}); await pg.waitForTimeout(400);
    const r=await pg.evaluate(()=>{ const f=BD.util.frames()[0]; const kids=f.getChildren(n=>n.name()==='obj');
      return {fw:f.getAttr('fw'),fh:f.getAttr('fh'),n:kids.length,texts:kids.filter(k=>k.className==='Text').map(t=>t.text()),locked:kids.filter(k=>k.getAttr('locked')).length,
        photos:kids.filter(k=>k.getAttr('kind')==='image').length}; });
    ok(`${tag} ${d.id}: opens ${w}×${h} with every piece a layer (${r.n})`,r.fw===w&&r.fh===h&&r.n===K.length-1&&r.n>=5&&r.locked===0,r);
    ok(`${tag} ${d.id}: Arabic words are editable text`,r.texts.length>0&&r.texts.some(t=>/[؀-ۿ]/.test(t)),r.texts);
    if(/winner/.test(d.id)) ok(`${tag} ${d.id}: the follower photo is a replaceable photo`,r.photos===1,r); }
  const d=defs.find(x=>x.id==='gt-winner-2'); await pg.goto(BASE+'tools/create.html?tpl='+d.id); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:30000}); await pg.waitForTimeout(500);
  await (tag==='phone'?pg.tap('#crBar [data-cr="save"]'):pg.click('#crBar [data-cr="save"]')); await pg.waitForTimeout(400);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:60000}),tag==='phone'?pg.tap('#crGo'):pg.click('#crGo')]); const f=OUT+'/'+tag+'-'+dl.suggestedFilename(); await dl.saveAs(f);
  ok(tag+' gt-winner-2: Save image is 2160×2700 PNG',JSON.stringify(pngSize(f))==='[2160,2700]',pngSize(f));
  await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('.tp-chip',{timeout:15000});
  ok(tag+': Templates has a Got Talent chip',(await pg.locator('.tp-chip[data-id="gottalent"]').count())===1);
  await pg.locator('.tp-chip[data-id="gottalent"]').click(); await pg.waitForTimeout(600);
  const ids=await pg.evaluate(()=>[...document.querySelectorAll('#templatesView .tp-body a.tp-card')].map(a=>a.getAttribute('href')||''));
  ok(tag+': the chip lists the 13 Got Talent templates',ids.length===13&&ids.every(h=>/tpl=gt-/.test(h)),ids.length);
  await ctx.close(); }
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close(); process.exit(fails?1:0);

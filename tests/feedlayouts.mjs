/* Studio 1.42.0: five new feed layouts in Create (Magazine cover, Close-up, One of many, Podium, Coffee type), each a post and a story.
   For each of the ten templates: it builds with no page errors, the frame is 1080×1350 / 1080×1920, the expected labelled layers exist,
   every brand picture loaded, and Arabic text layers read right to left. Server on :8080 (or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
const SPEC={
  'cover-post':[1350,['Kicker','Small line','Masthead','Cover line 1','Cover line 2','Cover line 3','Cover number 1','Stamp','Footer rule','Instagram handle','Footer line']],
  'cover-story':[1920,['Kicker','Small line','Masthead','Cover line 3','Stamp','Footer rule','Instagram handle','Footer line']],
  'closeup-post':[1350,['Headline','Small line']],
  'closeup-story':[1920,['Headline','White sheet','Flavour','Small line','Map in bio']],
  'many-post':[1350,['Headline','Small line','Hero panel','Mark','Grid cell','Can icon']],
  'many-story':[1920,['Headline','Small line','Hero panel','Mark','Grid cell','Can icon','Map in bio']],
  'podium-post':[1350,['Headline','Small line','Step 1','Step 2','Step 3','Step number 1']],
  'podium-story':[1920,['Headline','Small line','Step 1','Step 2','Step 3','Map in bio']],
  'type-post':[1350,['Headline','Coffee type','Small line','Button']],
  'type-story':[1920,['Headline','Coffee type','Small line','Map in bio']]
};
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage();
pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); });
for(const [id,[H,labels]] of Object.entries(SPEC)){
  await pg.goto(BASE+'tools/create.html?size='+(H===1920?'story':'post'));
  await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400);
  const r=await pg.evaluate(async id=>{ BD.util.frames().forEach(f=>f.destroy()); const made=await CR.buildTemplate(id,{at:{x:0,y:0}}); const f=made[0], s=BD.util.fsize(f);
    const all=f.find(()=>true), labels=all.map(n=>n.getAttr('label')).filter(Boolean), imgs=f.find('Image').filter(n=>n.getAttr('imgId')&&String(n.getAttr('imgId')).startsWith('brand:'));
    const ar=f.find('Text').filter(n=>/[؀-ۿ]/.test(n.text()));
    return {n:made.length,w:s.w,h:s.h,tpl:f.getAttr('tpl'),labels,imgs:imgs.length,imgOk:imgs.every(n=>{ const i=n.image(); return i&&(i.naturalWidth||i.width)>0; }),ar:ar.length,arRtl:ar.every(n=>n.direction()==='rtl')}; },id);
  ok(id+': one page '+1080+'×'+H,r.n===1&&r.w===1080&&r.h===H&&r.tpl===id,r);
  const miss=labels.filter(l=>!r.labels.includes(l)); ok(id+': labelled layers exist',!miss.length,miss);
  ok(id+': brand pictures loaded',r.imgs>0&&r.imgOk,r);
  ok(id+': Arabic text reads right to left',r.ar>0&&r.arRtl,r);
}
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no console errors');
await b.close(); process.exit(fails||errs.length?1:0);

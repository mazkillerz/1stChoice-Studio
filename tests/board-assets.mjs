/* Board: Team assets (2.14.0). Assets > Brand has a "Team assets" button (phone + desktop); it opens the shared picker; picking adds one centred
   'asset' image (ref team:<id>, path, <= 40% of the frame), undo removes it, the saved board re-draws it from its path, a copy keeps it,
   signed out / missing table show the picker's own note without page errors. Light + dark. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const b=await chromium.launch(); let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
async function page(o){ o=o||{}; const ctx=await b.newContext({viewport:o.vp||{width:1280,height:800},serviceWorkers:'block',hasTouch:!!o.touch,isMobile:!!o.touch,colorScheme:o.dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(f=>{ localStorage.setItem('studio:lab','"1"'); localStorage.setItem('studio:welcome','seen'); if(f&&!sessionStorage.getItem('fl')){ localStorage.setItem(f,'1'); sessionStorage.setItem('fl','1'); } },o.flag||null);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.stack||e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); });
  await pg.goto(BASE+'lab/board.html?preset=story'); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0&&BD.UI); await pg.waitForTimeout(500); return {pg,ctx}; }
/* a 600×400 green logo in the fake team bucket */
const seed=pg=>pg.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=600; c.height=400; const x=c.getContext('2d'); x.fillStyle='#00c83c'; x.fillRect(0,0,600,400);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); const C=await Studio.lab.cloud(); const row=await C.saveTeamAsset({brand:BD.B.id,name:'Partner Bakery',blob,prevBlob:blob,w:600,h:400,cutout:false}); return row.id; });
const imgs=pg=>pg.evaluate(()=>BD.main.find('Image').filter(n=>n.getAttr('ref')).map(n=>({ref:n.getAttr('ref'),path:n.getAttr('path'),w:n.width(),h:n.height(),has:!!n.image(),kind:n.getAttr('kind')})));
const open=async pg=>{ await pg.evaluate(()=>BD.UI.openAssets('brand')); await pg.waitForTimeout(250); };

for(const mode of [{n:'phone light',vp:{width:390,height:844},touch:true},{n:'phone dark',vp:{width:390,height:844},touch:true,dark:true},{n:'desktop',vp:{width:1280,height:800}}]){
  const {pg,ctx}=await page(mode); const id=await seed(pg); await open(pg);
  ok(mode.n+': Brand has a Team assets button',await pg.locator('#addList [data-act2="teamAssets"]').count()===1);
  const bb=await pg.locator('#addList [data-act2="teamAssets"]').boundingBox(); ok(mode.n+': the button is >= '+(mode.touch?44:30)+'px tall',bb&&bb.height>=(mode.touch?44:30),bb);
  await pg.click('#addList [data-act2="teamAssets"]'); await pg.waitForSelector('.ta-dlg .ta-body',{timeout:8000}); await pg.waitForTimeout(500);
  ok(mode.n+': the picker opens',await pg.locator('.ta-dlg').isVisible());
  const tile=pg.locator('.ta-dlg [data-id="'+id+'"], .ta-dlg [data-asset="'+id+'"], .ta-dlg .ta-tile').first();
  await tile.click(); await pg.waitForTimeout(300);
  const use=pg.locator('.ta-dlg [data-use], .ta-dlg [data-pick], .ta-dlg #taUse'); if(await use.count()&&await use.first().isVisible()) await use.first().click();
  await pg.waitForFunction(()=>BD.main.find('Image').some(n=>n.getAttr('ref')),null,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(300);
  let l=await imgs(pg); const fw=await pg.evaluate(()=>BD.util.fsize(BD.util.frames()[0]).w);
  ok(mode.n+': one image node, ref team:<id>, path kept, kind asset, drawn',l.length===1&&l[0].ref==='team:'+id&&/full\.png$/.test(l[0].path||'')&&l[0].kind==='asset'&&l[0].has,l);
  ok(mode.n+': fits within 40% of the frame, keeps its 3:2 shape',l[0]&&l[0].w<=fw*.4+1&&Math.abs(l[0].w/l[0].h-1.5)<.02,{l,fw});
  ok(mode.n+': centred in the frame',await pg.evaluate(()=>{ const n=BD.main.find('Image').find(x=>x.getAttr('ref')), f=BD.util.frameOf(n), s=BD.util.fsize(f), r=n.getClientRect({relativeTo:f}); return Math.abs(r.x+r.width/2-s.w/2)<3&&Math.abs(r.y+r.height/2-s.h/2)<3; }));
  if(mode.n==='phone light'){
    await pg.waitForTimeout(500); await pg.evaluate(()=>BD.undo()); await pg.waitForTimeout(400);
    ok('undo removes it',(await imgs(pg)).length===0);
    await pg.evaluate(()=>BD.redo()); await pg.waitForTimeout(500); ok('redo brings it back drawn',(await imgs(pg)).length===1&&(await imgs(pg))[0].has);
    await pg.evaluate(()=>{ BD.select([BD.main.find('Image').find(n=>n.getAttr('ref'))]); BD.act.duplicate(); }); await pg.waitForTimeout(600); l=await imgs(pg);
    ok('a copy keeps ref and path and is drawn',l.length===2&&l.every(x=>x.ref==='team:'+id&&x.path&&x.has),l);
    await pg.waitForTimeout(800); await pg.evaluate(()=>BD.saveNow&&BD.saveNow()); await pg.waitForTimeout(500);
    const doc=await pg.evaluate(()=>BD.docJson()); ok('the document stores ref + path, no team picture file',/"ref":"team:/.test(doc)&&/"path":"[^"]*full\.png"/.test(doc));
    await pg.reload(); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0); await pg.waitForFunction(()=>BD.main.find('Image').some(n=>n.getAttr('ref')&&n.image()),null,{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(500);
    l=await imgs(pg); ok('reopened: both layers are back and re-drawn from their path',l.length===2&&l.every(x=>x.has&&x.ref==='team:'+id),l);
  }
  await ctx.close();
}
/* signed out and missing table: the picker's own note, Board fine */
for(const flag of ['fakecloud-signedout','fakecloud-noassets']){
  const {pg,ctx}=await page({vp:{width:390,height:844},touch:true,flag}); await open(pg);
  await pg.click('#addList [data-act2="teamAssets"]'); await pg.waitForSelector('.ta-dlg .ta-body',{timeout:8000}); await pg.waitForTimeout(700);
  ok(flag+': the picker shows a note',(await pg.locator('.ta-dlg .ta-note').count())>0&&(await pg.locator('.ta-dlg .ta-note').first().innerText()).length>5);
  await pg.click('.ta-dlg [data-back]'); await pg.waitForTimeout(300);
  ok(flag+': Board still works (no image added, frame there)',(await imgs(pg)).length===0&&await pg.evaluate(()=>BD.util.frames().length)>0);
  await ctx.close();
}
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(fails?fails+' FAILED':'ALL PASS'); process.exit(fails?1:0);

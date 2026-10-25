/* Highlight covers: the Product cover type (a brand asset inside the circle). Phone, touch, light + dark. */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
const out=[]; const ok=(n,c,i)=>out.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':''));
const b=await chromium.launch(); const errs=[];
/* how many canvas pixels in the middle box differ from the cover ground (0 = empty) */
const centre=pg=>pg.evaluate(()=>{ const c=document.getElementById('view'), x=c.getContext('2d'), W=c.width, H=c.height;
  const d=x.getImageData(W*.35,H*.4,W*.3,H*.2).data, g=x.getImageData(2,2,1,1).data; let n=0;
  for(let i=0;i<d.length;i+=4) if(Math.abs(d[i]-g[0])+Math.abs(d[i+1]-g[1])+Math.abs(d[i+2]-g[2])>40) n++;
  return n; });
for(const scheme of ['light','dark']){
  const T=scheme+': ';
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(BASE+'tools/highlight.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
  // old default cover is unchanged: an icon, no product value needed
  const oldRecipe=await pg.evaluate(()=>{ const r=Studio.debug.recipe(); return {kind:r.values.kind,icon:r.values.icon,hasProduct:'product' in r.values}; });
  ok(T+'default cover is still an icon',oldRecipe.kind==='icon'&&!!oldRecipe.icon);
  const iconCentre=await centre(pg);
  ok(T+'icon cover draws',iconCentre>500,iconCentre);
  // cover 2: Product type, pick an asset
  await pg.tap('[data-pg="1"]'); await pg.waitForTimeout(300);
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(400);
  ok(T+'Product is one more option in Cover type',await pg.$('[data-seg="kind"] [data-v="product"]')!==null);
  ok(T+'asset picker hidden until Product is chosen',!(await pg.isVisible('[data-seg="product"]')));
  await pg.tap('[data-seg="kind"] [data-v="product"]'); await pg.waitForTimeout(400);
  ok(T+'asset picker shows',await pg.isVisible('[data-seg="product"]'));
  const tile=await pg.$eval('[data-seg="product"] .seg',e=>{const r=e.getBoundingClientRect(); return Math.min(r.width,r.height);});
  ok(T+'asset buttons >= 48px',tile>=48,Math.round(tile)+'px');
  const ids=await pg.$$eval('[data-seg="product"] .seg',els=>els.map(e=>e.dataset.v));
  ok(T+'picker lists brand assets, not the logo',ids.length>=2&&!ids.includes('logo'),ids.join(','));
  const pick=ids[ids.length-1];
  await pg.tap('[data-seg="product"] [data-v="'+pick+'"]'); await pg.waitForTimeout(1200);
  ok(T+'asset picked',await pg.evaluate(()=>Studio.debug.S.P[1].values.kind)==='product'&&await pg.evaluate(()=>Studio.debug.S.P[1].values.product)===pick,pick);
  ok(T+'canvas shows the asset',(await centre(pg))>3000,await centre(pg));
  ok(T+'other covers untouched',await pg.evaluate(()=>Studio.debug.S.P[0].values.kind==='icon'&&Studio.debug.S.P[2].values.kind==='icon'));
  // reload draft keeps the asset
  await pg.waitForTimeout(1500);
  const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push('reload: '+e));
  await p2.goto(BASE+'tools/highlight.html'); await p2.waitForTimeout(1800);
  await p2.evaluate(()=>document.getElementById('draftGo')?.click()); await p2.waitForTimeout(1500);
  const kept=await p2.evaluate(()=>{ const S=Studio.debug.S; return S&&S.P&&S.P[1]?S.P[1].values.kind+'/'+S.P[1].values.product:'none'; });
  ok(T+'reloaded draft keeps the asset',kept==='product/'+pick,kept);
  await p2.tap('[data-pg="1"]'); await p2.waitForTimeout(1200);
  ok(T+'reloaded canvas shows it',(await centre(p2))>3000);
  await p2.close();
  // save in one tap: Product cover included, full-size PNGs
  await pg.bringToFront();
  const dls=[]; pg.on('download',d=>dls.push(d));
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000});
  await pg.waitForTimeout(500);
  if(await pg.isChecked('#teamOn').catch(()=>false)) await pg.evaluate(()=>document.getElementById('teamOn').click());
  await pg.tap('#save');
  for(let i=0;i<60&&dls.length<4;i++) await pg.waitForTimeout(300);
  const sizes=[]; for(const d of dls){ const f=os.tmpdir()+'/hlp-'+scheme+'-'+d.suggestedFilename(); await d.saveAs(f); sizes.push(pngSize(f)); }
  ok(T+'saves 4 full-size PNGs',dls.length===4&&sizes.every(s=>s==='2160x3840'),sizes.join(', '));
  await ctx.close();
}
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
console.log(out.join('\n')); await b.close(); process.exit(out.some(l=>l.startsWith('FAIL'))?1:0);

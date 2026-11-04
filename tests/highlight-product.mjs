/* Highlight covers: the Product cover type (a brand asset inside the circle). Phone, touch, light + dark.
   1.38.0: Size (range, %) and Position (Higher / Middle / Lower) for the product; defaults draw it exactly as before
   (box formula + pixel hash against origin/main's tools/highlight.js); two emoji highlight templates in Create. */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os'; import { execSync } from 'child_process'; import crypto from 'crypto';
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
const box=pg=>pg.evaluate(()=>{ const r=Studio.debug.reg().find(x=>x.id==='product'&&!x.empty); return r&&{x:r.x,y:r.y,w:r.w,h:r.h,cx:r.x+r.w/2,cy:r.y+r.h/2}; });
const hash=pg=>pg.evaluate(()=>{ const c=document.getElementById('view'); return c.toDataURL('image/png'); }).then(d=>crypto.createHash('md5').update(d).digest('hex'));
const near=(a,b,t)=>Math.abs(a-b)<=t;
const setRange=(pg,id,v)=>pg.evaluate(([id,v])=>{ const r=document.querySelector('[data-range="'+id+'"]'); r.value=v; r.dispatchEvent(new Event('input',{bubbles:true})); r.dispatchEvent(new Event('change',{bubbles:true})); },[id,v]);
/* the Product cover flow on cover 2 with the guide off (so the hash is the cover only); returns the picked asset id */
async function productCover(pg,pickLast){
  await pg.tap('[data-pg="1"]'); await pg.waitForTimeout(300);
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(400);
  await pg.tap('[data-seg="kind"] [data-v="product"]'); await pg.waitForTimeout(400);
  const ids=await pg.$$eval('[data-seg="product"] .seg',els=>els.map(e=>e.dataset.v)), pick=pickLast?ids[ids.length-1]:ids[0];
  await pg.tap('[data-seg="product"] [data-v="'+pick+'"]'); await pg.waitForTimeout(1500);
  return {ids,pick};
}
/* the highlight.js from just before Size/Position (the commit before the first one with psize, or HEAD while it is not committed yet) */
const git=c=>execSync(c,{encoding:'utf8',stdio:['ignore','pipe','ignore']});
let oldSrc=null; try{ const first=git('git log -S"psize" --reverse --format=%H -- tools/highlight.js').split('\n')[0].trim(); oldSrc=git('git show '+(first?first+'^':'HEAD')+':tools/highlight.js'); }catch(_){}
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
  ok(T+'Size and Position hidden until Product is chosen',!(await pg.isVisible('[data-range="psize"]'))&&!(await pg.isVisible('[data-seg="ppos"]')));
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
  /* 1.38.0: Size + Position */
  ok(T+'Size and Position show for Product',await pg.isVisible('[data-range="psize"]')&&await pg.isVisible('[data-seg="ppos"]'));
  const sp=await pg.evaluate(()=>{ const r=document.querySelector('[data-range="psize"]').getBoundingClientRect(), q=document.querySelector('[data-seg="product"]').getBoundingClientRect(); return {top:r.top,ptop:q.top}; });
  ok(T+'Size and Position sit above the product list (in view without scrolling the list)',sp.top<sp.ptop,sp);
  const dv=await pg.evaluate(()=>Studio.debug.S.P[1].values);
  ok(T+'defaults are 100 % and Middle',dv.psize===100&&dv.ppos==='mid',dv.psize+'/'+dv.ppos);
  ok(T+'Size label shows 100%',/100%/.test(await pg.textContent('[data-rout="psize"]')));
  const segH=await pg.$$eval('[data-seg="ppos"] .seg',els=>els.map(e=>Math.round(Math.min(e.getBoundingClientRect().width,e.getBoundingClientRect().height))));
  ok(T+'Position buttons >= 48px',segH.length===3&&segH.every(v=>v>=48),segH.join(','));
  const b0=await box(pg), ar0=b0&&b0.w/b0.h;
  ok(T+'default box is today\'s: centred, width min(620, 740 x ratio)',b0&&near(b0.cx,540,1)&&near(b0.cy,960,1)&&near(b0.w,Math.min(620,740*ar0),1.5),b0&&JSON.stringify(b0));
  await setRange(pg,'psize',120); await pg.waitForTimeout(600);
  const b1=await box(pg);
  ok(T+'Size 120 % makes the product 1.2x wide, still centred',b1&&near(b1.w,b0.w*1.2,2)&&near(b1.cy,960,1),b1&&Math.round(b1.w)+' vs '+Math.round(b0.w));
  ok(T+'Size label follows',/120%/.test(await pg.textContent('[data-rout="psize"]')));
  await setRange(pg,'psize',60); await pg.waitForTimeout(500);
  ok(T+'Size 60 % (the minimum) shrinks it',near((await box(pg)).w,b0.w*.6,2));
  await pg.tap('[data-seg="ppos"] [data-v="up"]'); await pg.waitForTimeout(500);
  ok(T+'Higher moves it up 140 px',near((await box(pg)).cy,820,1),(await box(pg)).cy);
  await pg.tap('[data-seg="ppos"] [data-v="down"]'); await pg.waitForTimeout(500);
  ok(T+'Lower moves it down 140 px',near((await box(pg)).cy,1100,1),(await box(pg)).cy);
  ok(T+'canvas still shows the asset',(await centre(pg))>500,await centre(pg));
  await setRange(pg,'psize',90); await pg.waitForTimeout(600);
  ok(T+'other covers keep their own values',await pg.evaluate(()=>{ const P=Studio.debug.S.P; return P[0].values.psize===100&&P[0].values.ppos==='mid'&&P[1].values.psize===90&&P[1].values.ppos==='down'; }));
  ok(T+'other covers untouched',await pg.evaluate(()=>Studio.debug.S.P[0].values.kind==='icon'&&Studio.debug.S.P[2].values.kind==='icon'));
  // reload draft keeps the asset
  await pg.waitForTimeout(1500);
  const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push('reload: '+e));
  await p2.goto(BASE+'tools/highlight.html'); await p2.waitForTimeout(1800);
  await p2.evaluate(()=>document.getElementById('draftGo')?.click()); await p2.waitForTimeout(1500);
  const kept=await p2.evaluate(()=>{ const S=Studio.debug.S; return S&&S.P&&S.P[1]?S.P[1].values.kind+'/'+S.P[1].values.product:'none'; });
  ok(T+'reloaded draft keeps the asset',kept==='product/'+pick,kept);
  const kp=await p2.evaluate(()=>{ const v=Studio.debug.S.P[1].values; return v.psize+'/'+v.ppos; });
  ok(T+'reloaded draft keeps Size and Position',kp==='90/down',kp);
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
/* old covers pixel-identical: the same Product cover drawn by origin/main's highlight.js and by this one */
if(oldSrc&&!/psize/.test(oldSrc)){   // a shallow clone without that commit skips (git fetch --depth=20 first)
  const hashes=[];
  for(const src of [oldSrc,null]){
    const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
    await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
    if(src) await ctx.route(/tools\/highlight\.js/,r=>r.fulfill({contentType:'application/javascript',body:src}));
    const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('pixel: '+e));
    await pg.goto(BASE+'tools/highlight.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
    await productCover(pg,false);
    await pg.evaluate(()=>{ Studio.debug.S.P.forEach(p=>p.values.guide=false); Studio.debug.render(); }); await pg.waitForTimeout(800);
    hashes.push(await hash(pg)); await ctx.close();
  }
  ok('old Product covers are pixel-identical (pre-1.38 highlight.js vs now, defaults)',hashes[0]===hashes[1],hashes.join(' '));
} else console.log('SKIP pixel check (no pre-1.38 highlight.js in this clone)');

/* Create: the emoji highlight templates (#44) */
{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('create: '+e));
  for(const [id,emo] of [['highlight-places-emoji','places'],['highlight-order-emoji','cart']]){
    await pg.goto(BASE+'tools/create.html?tpl='+id);
    await pg.waitForFunction(()=>window.CRUI&&window.BD&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(1800);
    const r=await pg.evaluate(e=>{ const f=BD.activeFrame(), g=f&&f.find(n=>n.getAttr&&n.getAttr('stickerId')==='sticker:emoji-'+e)[0]; if(!g) return null; const q=g.getClientRect({relativeTo:f,skipShadow:true}); return {cx:Math.round(q.x+q.width/2),cy:Math.round(q.y+q.height/2),round:!!f.getAttr('round')}; },emo);
    ok('Create '+id+': round cover with emoji-'+emo+' in the middle',r&&r.round&&near(r.cx,540,4)&&near(r.cy,540,4),JSON.stringify(r));
    ok('Create '+id+': preview picture exists',fs.existsSync(new URL('../assets/thumbs/1stchoice/tpl/'+id+'.jpg',import.meta.url)));
  }
  await pg.goto(BASE+'index.html?o=1#templates'); await pg.waitForTimeout(1800);
  const inLib=await pg.evaluate(()=>[...document.querySelectorAll('[data-id],[href]')].map(e=>(e.getAttribute('href')||'')+' '+(e.dataset.id||'')).join(' '));
  ok('Templates library lists both emoji covers',/highlight-places-emoji/.test(inLib)&&/highlight-order-emoji/.test(inLib));
  await ctx.close(); }
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
console.log(out.join('\n')); await b.close(); process.exit(out.some(l=>l.startsWith('FAIL'))?1:0);

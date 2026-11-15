/* Brand kit page (assets/brandkit.js): read-only view of the active kit.
   1 opens from Settings (1st Choice): sections logo/colours/fonts/words/assets/looks, the footer note, no 1st-Choice-free check needed here
   2 opens from hub search ("brand kit"); Back (history) closes it
   3 tap a swatch copies its hex (toast "Copied #xxxxxx"); tap a word copies the word
   4 word search with Arabic variants (alef / ya / ta marbuta / tashkeel) narrows the lines; no match shows the note
   5 test brand fixture: its colours and words, none of the 1st Choice words or colours; looks section absent
   6 light + dark at 390, 360 and desktop: no sideways scroll, taps >= 44, text contrast >= 4.5 (3 for large), no page errors
   Run: BASE=http://127.0.0.1:8087/ node tests/brandpage.mjs */
import { chromium } from 'playwright';
import fs from 'fs'; import vm from 'vm'; import path from 'path';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('..',import.meta.url).pathname, FIX=ROOT+'tests/fixtures/brands/testbrand/';
const fake=fs.readFileSync(ROOT+'tests/fakecloud.js','utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const load=f=>{ let kit; vm.runInNewContext(fs.readFileSync(f,'utf8'),{Studio:{registerBrand:b=>{kit=b;}}}); return kit; };
const kit=load(ROOT+'brands/1stchoice/brand.js'), tkit=load(FIX+'brand.js');
const b=await chromium.launch(), errs=[];
const mimes={'.png':'image/png','.jpg':'image/jpeg','.js':'application/javascript'};
async function mk(opts,test){
  const ctx=await b.newContext({serviceWorkers:'block',...opts,permissions:['clipboard-read','clipboard-write']});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:"try{ localStorage.setItem('studio:welcome','1'); }catch(e){}"});
  if(test){
    await ctx.route('**/brands/brands.js',r=>r.fulfill({contentType:'application/javascript',body:"Studio.brandList=['testbrand'];"}));
    await ctx.route('**/brands/testbrand/**',r=>{ const rest=decodeURIComponent(new URL(r.request().url()).pathname.split('/brands/testbrand/')[1]); const f=FIX+rest;
      if(fs.existsSync(f)) r.fulfill({contentType:mimes[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)}); else r.fulfill({status:404,body:''}); });
    await ctx.route('**/brands/1stchoice/**',r=>r.abort());
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  } else await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  return ctx;
}
const PHONE={viewport:{width:390,height:844},isMobile:true,hasTouch:true}, SMALL={viewport:{width:360,height:740},isMobile:true,hasTouch:true}, DESK={viewport:{width:1280,height:800}};
const page=async(ctx,tag)=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(tag+': '+e.message)); await p.goto(BASE+'index.html'); await p.waitForSelector('#setBtn',{timeout:10000}); return p; };
const tap=(p,s)=>p.locator(s).first().click();
const openSet=async p=>{ await tap(p,'#setBtn'); await p.waitForSelector('dialog.set-dlg[open]'); await tap(p,'[data-set=brandkit]'); await p.waitForSelector('dialog.bk-dlg[open] .bk-sec',{timeout:8000}); await p.waitForTimeout(500); };

/* 1 + 3 + 4: 1st Choice, phone light */
{ const ctx=await mk({...PHONE,colorScheme:'light'}); const p=await page(ctx,'p1'); await openSet(p);
  const secs=await p.$$eval('.bk-sec',s=>s.map(x=>x.id)); ok('1 sections logo/colours/fonts/words/assets/looks',['bk-logo','bk-colours','bk-fonts','bk-words','bk-assets','bk-looks'].every(x=>secs.includes(x)),secs.join());
  ok('1 foot note',(await p.textContent('.bk-foot')).includes('Changes to the brand kit are made by the owner.'));
  const sw=await p.$$eval('.bk-swb',s=>s.map(x=>x.dataset.hex)); ok('1 swatches = palette',sw.length===kit.palette.length&&sw[0]===kit.palette[0].hex.toUpperCase(),sw.length);
  ok('1 looks White + Cream',await p.$$eval('.bk-look b',l=>l.map(x=>x.textContent).join())==='White,Cream');
  ok('1 font name drawn in its font',await p.$$eval('.bk-fn',l=>l.length>=3&&l.every(x=>getComputedStyle(x).fontFamily.includes(x.textContent.trim()))));
  ok('1 words are dir=auto',await p.$$eval('.bk-t',l=>l.length>10&&l.every(x=>x.getAttribute('dir')==='auto')));
  /* 3 copy */
  await p.evaluate(()=>navigator.clipboard.writeText('x'));
  await p.locator('.bk-swb').nth(1).scrollIntoViewIfNeeded(); await tap(p,'.bk-swb:nth-child(2)'); await p.waitForTimeout(200);
  const hx=kit.palette[1].hex.toUpperCase(); const clip=await p.evaluate(()=>navigator.clipboard.readText());
  ok('3 swatch copies hex',clip===hx,clip); ok('3 toast Copied hex',(await p.textContent('#hubToast')).trim()==='Copied '+hx);
  const w1=await p.$eval('.bk-line .bk-t',e=>e.textContent); await tap(p,'.bk-line'); await p.waitForTimeout(200);
  ok('3 word copies',(await p.evaluate(()=>navigator.clipboard.readText()))===w1);
  /* 4 search with variants */
  const all=await p.$$eval('.bk-line',l=>l.length);
  const target=(kit.phrases.headlines||[]).find(s=>/[أإآةىي]/.test(s))||kit.phrases.headlines[0];
  const variant=target.replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ');
  await p.fill('#bkQ',variant); await p.waitForTimeout(150);
  const vis=await p.$$eval('.bk-line:not([hidden]) .bk-t',l=>l.map(x=>x.textContent));
  ok('4 variant spelling finds the line',vis.includes(target)&&vis.length<all,vis.length+'/'+all);
  await p.fill('#bkQ','zzzzqq'); await p.waitForTimeout(150); ok('4 no match shows the note',await p.isVisible('#bkNone'));
  await p.fill('#bkQ',''); await p.waitForTimeout(150); ok('4 clearing shows all',(await p.$$eval('.bk-line:not([hidden])',l=>l.length))===all);
  /* Back closes */
  await p.goBack(); await p.waitForTimeout(500); ok('2 Back closes the sheet',!(await p.$('dialog.bk-dlg[open]')));
  await p.waitForTimeout(200); await openSet(p); await tap(p,'dialog.bk-dlg [data-x]'); await p.waitForTimeout(300); ok('2 Done closes',!(await p.$('dialog.bk-dlg[open]')));
  /* 2 search */
  await p.waitForTimeout(200); await tap(p,'#uSearch'); await p.keyboard.type('brand kit'); await p.waitForTimeout(500);
  const hit=p.locator('#usPanel .us-t',{hasText:'Brand kit'}).first(); ok('2 search lists Brand kit',await hit.count()>0);
  await hit.click(); await p.waitForSelector('dialog.bk-dlg[open] .bk-sec',{timeout:8000}); ok('2 search opens the page',true);
  await p.goBack(); await p.waitForTimeout(500); ok('2 Back closes (from search)',!(await p.$('dialog.bk-dlg[open]')));
  await ctx.close(); }

/* 5 test brand */
{ const ctx=await mk({...PHONE,colorScheme:'light'},true); const p=await page(ctx,'p5'); await openSet(p);
  const hexes=await p.$$eval('.bk-swb',s=>s.map(x=>x.dataset.hex)); ok('5 test brand swatches',hexes.length===tkit.palette.length&&hexes.includes('#2A9D8F'),hexes.join());
  const txt=await p.evaluate(()=>document.querySelector('dialog.bk-dlg').innerText);
  const WORDS=[...new Set([...Object.values(kit.phrases).flat().filter(s=>typeof s==='string'),kit.name,kit.handle,'1st Choice','علبة','باشن'].filter(s=>s.length>=3&&!Object.values(tkit.phrases).flat().includes(s)))];
  const bad=WORDS.filter(w=>txt.toLowerCase().includes(w.toLowerCase())); ok('5 no 1st Choice words',!bad.length,bad.join());
  ok('5 test brand words shown',txt.includes('Back in stock')&&txt.includes('Georgia'));
  ok('5 no looks section',!(await p.$('#bk-looks'))); ok('5 assets grid',(await p.$$eval('.bk-a',a=>a.length))>=3);
  ok('5 no 1st Choice colour',!(await p.evaluate(()=>document.querySelector('dialog.bk-dlg').innerHTML)).match(/#(D6B078|F6C040|BE2C5C|7A563A)/i));
  await ctx.close(); }

/* 6 sizes x themes */
const lum=c=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]); };
for(const [name,opt] of [['390',PHONE],['360',SMALL],['desktop',DESK]]) for(const th of ['light','dark']){
  const ctx=await mk({...opt,colorScheme:th}); const p=await page(ctx,name+th); await openSet(p); const T=name+' '+th+': ';
  const m=await p.evaluate(()=>{ const d=document.querySelector('dialog.bk-dlg'); const r=d.getBoundingClientRect();
    const px=s=>{ const c=document.createElement('canvas').getContext('2d'); c.fillStyle=s; c.fillRect(0,0,1,1); const a=c.getImageData(0,0,1,1).data; return [a[0],a[1],a[2],a[3]/255]; };
    const bg=el=>{ let x=el; const layers=[]; while(x){ const c=px(getComputedStyle(x).backgroundColor); if(c[3]>0){ layers.push(c); if(c[3]>=1) break; } x=x.parentElement; } let base=[255,255,255]; for(const c of layers.reverse()) base=base.map((v,i)=>v*(1-c[3])+c[i]*c[3]); return base; };
    const low=[]; d.querySelectorAll('.bk *').forEach(e=>{ if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) return; if(e.closest('[hidden]')) return;
      const cs=getComputedStyle(e); const fg=px(cs.color); const b=bg(e); const L=c=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]); };
      const fgc=fg.slice(0,3).map((v,i)=>v*fg[3]+b[i]*(1-fg[3])); const a=L(fgc),bb=L(b); const ratio=(Math.max(a,bb)+.05)/(Math.min(a,bb)+.05); const big=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.6&&+cs.fontWeight>=600);
      if(ratio<(big?3:4.5)) low.push(e.className+' '+ratio.toFixed(2)); });
    const small=[...d.querySelectorAll('.bk-swb,.bk-line,[data-x],.bk-q')].filter(e=>{ const q=e.getBoundingClientRect(); return q.height<44||q.width<44; }).map(e=>e.className);
    return {sx:document.documentElement.scrollWidth>innerWidth+1||d.scrollWidth>d.clientWidth+1, w:r.width, small, low:[...new Set(low)], bgd:getComputedStyle(d).backgroundColor}; });
  ok(T+'no sideways scroll',!m.sx); ok(T+'taps >= 44',!m.small.length,m.small.join()); ok(T+'text contrast',!m.low.length,m.low.join(' | '));
  if(name==='desktop') ok(T+'centred max width',m.w<=700&&m.w>=400,Math.round(m.w)); else ok(T+'full width',Math.round(m.w)===opt.viewport.width,Math.round(m.w));
  await ctx.close(); }

ok('no page errors',!errs.length,errs.join(' | '));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);

/* Studio 1.41.0: a saved picture never uses a stand-in font.
   The brand's fonts come from Google Fonts. Until their stylesheet is in, document.fonts.load() finds no font and resolves at
   once, so a Save on a busy or slow phone could draw the headline in the system font (the batch-saved pixel flake).
   1. Slow fonts (stylesheet held 3 s, font files 8 s: well past the 4 s the page waits on open), Save tapped at once: the PNG is byte for byte the one saved with the
      fonts already in (same story, same photo), and the brand's display font is loaded when the picture is made.
   2. Save pictures from Saved with slow fonts: the hidden frame's picture is the same bytes too.
   3. Fonts unreachable (offline): Save still finishes (no hang) with a full-size PNG.
   4. No page errors.
   Run: server on :8080 (or BASE=...), then node tests/font-ready.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { chooseTeam, chooseMe } from './_saveflow-helpers.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const PHOTO=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const SHARE=`window.__shared=null; navigator.canShare=()=>true; navigator.share=async o=>{ window.__shared=o.files; };`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* fonts: 'fast' as they come, 'slow' held back, 'off' unreachable */
const mk=async(fonts,seed)=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(fonts==='slow'){ await ctx.route(/fonts\.googleapis\.com/,async r=>{ await sleep(3000); r.continue().catch(()=>{}); });
    await ctx.route(/fonts\.gstatic\.com/,async r=>{ await sleep(5000); r.continue().catch(()=>{}); });
    /* the fonts are self-hosted now (w1-fonts), so slow means the local brand font stylesheet and files */
    await ctx.route(/brands\/[^/]+\/fonts\/fonts\.css/,async r=>{ await sleep(3000); r.continue().catch(()=>{}); });
    await ctx.route(/brands\/[^/]+\/fonts\/.*\.woff2/,async r=>{ await sleep(5000); r.continue().catch(()=>{}); }); }
  if(fonts==='off') await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  if(fonts==='hang') await ctx.route(/fonts\.gstatic\.com/,()=>{});   // font files never answer (a hanging stylesheet would block the page itself)
  if(seed) await ctx.addInitScript(s=>{ try{ if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',s); localStorage.setItem('studio:welcome','1'); }catch(e){} },seed);
  await ctx.addInitScript(SHARE);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(fonts+': '+e)); return {ctx,pg}; };
const digest=pg=>pg.evaluate(async()=>{ const o=[]; for(const f of window.__shared||[]){ const h=await crypto.subtle.digest('SHA-256',await f.arrayBuffer()); o.push([...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')); } return o; });
const size=pg=>pg.evaluate(async()=>{ const f=(window.__shared||[])[0]; if(!f) return ''; const bm=await createImageBitmap(f); return bm.width+'x'+bm.height; });
/* the display font's Arabic face (the headline) is loaded */
const display=pg=>pg.evaluate(()=>[...document.fonts].some(x=>/Lalezar/.test(x.family)&&/U\+6/.test(x.unicodeRange)&&x.status==='loaded'));
/* while fonts are held back the page's load event waits for them, so open with domcontentloaded and poll on a timer */
/* a Restock story with the same photo, saved from its page; slow = tap Save the moment the page is up */
async function saveRestock(fonts,{settle=false}={}){
  const {ctx,pg}=await mk(fonts);
  await pg.goto(BASE+'tools/restock.html',{waitUntil:'domcontentloaded'}); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:30000,polling:100});
  if(settle){ await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(2500); }
  await pg.setInputFiles('#pick',PHOTO); await pg.waitForFunction(()=>{ const p=Studio.debug.S.photos[0]; return p&&p.img&&!p.sample; },null,{timeout:15000,polling:100});
  const fontsAtTap=await display(pg), t=Date.now();
  await pg.tap('#barSave'); await pg.waitForTimeout(300); if(await pg.isVisible('#save')) await pg.tap('#save');
  await pg.waitForFunction(()=>window.__shared,null,{timeout:60000,polling:100}).catch(()=>{});
  const out={hash:await digest(pg),wh:await size(pg),ms:Date.now()-t,fontsAtTap,fontsAfter:await display(pg),recipe:await pg.evaluate(()=>Studio.debug.recipe())};
  await ctx.close(); return out; }

/* 1. slow fonts vs fonts already in */
const ref=await saveRestock('fast',{settle:true});
ok("reference: the brand fonts are loaded (Google Fonts reachable; a sandbox without it is a known false failure)",ref.fontsAfter&&ref.hash.length===1,{fonts:ref.fontsAfter,files:ref.hash.length});
const slow=await saveRestock('slow');
ok('slow fonts: Save was tapped before the fonts were in (the test is real)',!slow.fontsAtTap,slow.fontsAtTap);
ok('slow fonts: Save made one full-size PNG',slow.hash.length===1&&slow.wh==='2160x3840',slow.wh);
ok('slow fonts: the PNG is byte for byte the one saved with the fonts in',slow.hash[0]&&slow.hash[0]===ref.hash[0],{slow:slow.hash[0]&&slow.hash[0].slice(0,12),ref:ref.hash[0]&&ref.hash[0].slice(0,12)});

/* 2. Save pictures from Saved, slow fonts: same bytes as the tool page's Save */
{ const db={designs:{},files:{},cols:{}}, r=JSON.parse(JSON.stringify(ref.recipe)), k='1stchoice/fr1/photo-0.jpg';
  db.files[k]='data:image/jpeg;base64,'+fs.readFileSync(PHOTO).toString('base64'); db.files['1stchoice/fr1/thumb.jpg']=db.files[k];
  r.photos=r.photos.map(p=>({...p,has:true}));
  db.designs.fr1={id:'fr1',brand:'1stchoice',tool:'restock',name:'Font day',kind:'design',recipe:{...r,photoPaths:[k]},thumb_path:'1stchoice/fr1/thumb.jpg',cols:[],updated_at:new Date().toISOString()};
  /* the saved design's own Save with the fonts in, then the batch with slow fonts */
  const one=async(fonts,batch)=>{ const {ctx,pg}=await mk(fonts,JSON.stringify(db));
    if(batch){ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200); await pg.tap('[data-see-all]'); await pg.waitForTimeout(600); await pg.tap('#selBtn'); await pg.waitForTimeout(300);
      await pg.tap('#savedGrid .sv-card[data-id="fr1"] .sv-open'); await pg.waitForTimeout(200); await pg.tap('#selSave'); }
    else { await pg.goto(BASE+'tools/restock.html?design=fr1'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:30000,polling:100});
      await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(2500); await pg.tap('#barSave'); await pg.waitForTimeout(300); if(await pg.isVisible('#save')){ await chooseMe(pg); await pg.waitForTimeout(200); await pg.tap('#save'); } }   /* 2.3.0: an opened design starts on Phone + Team; this check wants the picture */
    await pg.waitForFunction(()=>window.__shared,null,{timeout:90000}).catch(()=>{}); const h=await digest(pg); await ctx.close(); return h; };
  const want=await one('fast',false), got=await one('slow',true);
  ok('Save pictures, slow fonts: the picture is the same bytes as its own Save',got.length===1&&want.length===1&&got[0]===want[0],{got:(got[0]||'').slice(0,12),want:(want[0]||'').slice(0,12)});
}

/* 3. fonts unreachable: Save still finishes */
const off=await saveRestock('off');
ok('fonts unreachable: Save still finishes with a full-size PNG (no hang)',off.hash.length===1&&off.wh==='2160x3840'&&off.ms<30000,{wh:off.wh,ms:off.ms});

/* 4. fonts hang (never answer): Save waits at most the one 12 s cap, then saves */
const hang=await saveRestock('hang');
ok('fonts hang: Save still finishes with a full-size PNG within ~15 s',hang.hash.length===1&&hang.wh==='2160x3840'&&hang.ms<16000,{wh:hang.wh,ms:hang.ms});

await b.close();
ok('no page errors',errs.length===0,errs.slice(0,3));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\nfont-ready: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);

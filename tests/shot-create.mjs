/* What's New shots for Create (1.31.0). Usage: node tests/shot-create.mjs <out.jpg> <what> [dark]
   what: add-emoji (Add sheet at Emoji) | add-stickers (Add sheet at Stickers, or Emoji before) | highlight (Highlight: places, icon selected) | font (Font sheet on a text) */
import { chromium } from 'playwright'; import fs from 'fs';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const [,,out,what,theme]=process.argv; const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:theme==='dark'?'dark':'light'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); await pg.goto(BASE+'tools/create.html');
await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(600);
if(what==='highlight'){ await pg.tap('[data-tpl="highlight-places"]'); await pg.waitForTimeout(1500); }
else { await pg.tap('[data-size="story"]'); await pg.waitForTimeout(500); }
const jump=async j=>{ await pg.tap('#crBar [data-cr="add"]'); await pg.waitForTimeout(600);
  await pg.evaluate(j=>{ const t=document.getElementById('j-'+j)||document.getElementById('j-emoji'); const b=document.getElementById('crSheetB'); b.scrollTop=t.offsetTop-56; },j); await pg.waitForTimeout(500); };
if(what==='add-emoji') await jump('emoji');
else if(what==='add-stickers') await jump('stickers');
else if(what==='highlight'){ await pg.evaluate(()=>{ const f=BD.activeFrame(); const n=f.getChildren(c=>BD.util.isObj(c)).slice(-1)[0]; BD.select([n]); }); await pg.waitForTimeout(500); }
else if(what==='font'){ await pg.tap('#crBar [data-cr="text"]'); await pg.waitForTimeout(800); await pg.tap('#crCtx [data-x="font"]'); await pg.waitForTimeout(600); }
await pg.screenshot({path:out,type:'jpeg',quality:72}); await b.close();

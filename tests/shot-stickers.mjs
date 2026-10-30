/* What's New shots for the sticker sheet (1.28.0). Usage: node tests/shot-stickers.mjs <out.jpg> [dark] [page] [sheet] */
import { chromium } from 'playwright'; import fs from 'fs';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const [,,out,theme,page,sheet]=process.argv; const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:theme==='dark'?'dark':'light'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); await pg.goto(BASE+(page||'tools/restock.html')); await pg.waitForTimeout(2000);
await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3000);
if(sheet&&sheet!=='-'){ await pg.tap(`#bar [data-open="${sheet}"]`); await pg.waitForTimeout(700); }
else { await pg.evaluate(()=>document.getElementById('addSticker').click()); await pg.waitForTimeout(800);
  if(process.env.SCROLL) await pg.evaluate(()=>{ const t=document.querySelector('[data-sticker^="sticker:emoji-"]'); t&&t.scrollIntoView({block:'start'}); }); await pg.waitForTimeout(300); }
await pg.screenshot({path:out,type:'jpeg',quality:72}); await b.close();

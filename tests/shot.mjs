/* Phone screenshot for What's New. Usage: node tests/shot.mjs <page> <sheet|-> <out.jpg> [selector to scroll into view] */
import { chromium } from 'playwright'; import fs from 'fs';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const [,,url,sheet,out,scrollSel]=process.argv;
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); await pg.goto('http://127.0.0.1:8080/'+url); await pg.waitForTimeout(2000);
await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3400);
if(sheet&&sheet!=='-'){ await pg.tap(`#bar [data-open="${sheet}"]`); await pg.waitForTimeout(600); }
if(scrollSel){ await pg.evaluate(s=>document.querySelector(s)?.scrollIntoView({block:'center'}),scrollSel); await pg.waitForTimeout(300); }
await pg.screenshot({path:out,type:'jpeg',quality:72});
await b.close();

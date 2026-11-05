/* Create (1.47.0): words stay on the page. Typing long words in the Words sheet (or making them bigger in Font) keeps
   words that sit right on a page in place (centred ones keep their centre, right-aligned ones their right edge) and wraps
   them at the page width instead of running off the page; shorter words un-wrap again. Phone, 390×844, touch. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const LONG='لا تعدّي قبل لا تشوف هذا';   // approved (brand.js phrases.cut)
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage();
pg.on('pageerror',e=>errs.push(e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(m.text()); });
const ready=async()=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0&&BD.main.find('Text').length>0,null,{timeout:20000}); await pg.waitForTimeout(600); };
const box=label=>pg.evaluate(l=>{ const t=BD.main.find(n=>n.getAttr('label')===l)[0], f=BD.activeFrame(), r=BD.util.prect(t,f), s=BD.util.fsize(f);
  return {x:Math.round(r.x),r:Math.round(r.x+r.width),cx:Math.round(r.x+r.width/2),h:Math.round(r.height),W:s.w,auto:!!t.getAttr('autoW')}; },label);
const tapNode=async label=>{ const st=await pg.locator('#crStage').boundingBox(); const p=await pg.evaluate(l=>{ const c=BD.main.find(n=>n.getAttr('label')===l)[0].getClientRect(); return {x:c.x+c.width/2,y:c.y+c.height/2}; },label);
  await pg.touchscreen.tap(st.x+p.x,st.y+p.y); await pg.waitForTimeout(250); };
const pick=label=>pg.evaluate(l=>BD.select([BD.main.find(n=>n.getAttr('label')===l)[0]]),label);
let tapped=false;
const words=async(label,txt)=>{ if(!tapped){ await tapNode(label); tapped=true; } else { await pick(label); await pg.waitForTimeout(150); } await pg.tap('#crCtx [data-x="words"]'); await pg.waitForTimeout(300); await pg.fill('#crW0',txt); await pg.waitForTimeout(150); await pg.tap('#crSheetX'); await pg.waitForTimeout(250); };
const inside=r=>r.x>=-1&&r.r<=r.W+1;

/* a centred headline */
await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready();
const h0=await box('Headline');
await words('Headline',LONG);
const h1=await box('Headline');
ok('long words in a centred headline stay on the page',inside(h1),h1);
ok('… keep their centre',Math.abs(h1.cx-h0.cx)<=2,[h0.cx,h1.cx]);
ok('… and wrap onto more lines',h1.h>h0.h*1.6,[h0.h,h1.h]);
await words('Headline','يسرسح ثلج');
const h2=await box('Headline');
ok('shorter words un-wrap (one line, width follows the words again)',h2.auto&&Math.abs(h2.h-h0.h)<=2&&Math.abs(h2.cx-h0.cx)<=2,[h0,h2]);
/* Font → Size all the way up */
await pick('Headline'); await pg.waitForTimeout(150); await pg.tap('#crCtx [data-x="font"]'); await pg.waitForTimeout(300);
await pg.evaluate(()=>{ const i=document.getElementById('fSize'); i.value=400; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); });
await pg.waitForTimeout(200); await pg.tap('#crSheetX'); await pg.waitForTimeout(200);
const h3=await box('Headline');
ok('a much bigger headline (Font → Size) stays on the page around its centre',inside(h3)&&Math.abs(h3.cx-h0.cx)<=2,h3);
/* a box someone sized keeps its width */
const fixedW=await pg.evaluate(()=>{ const t=BD.main.find(n=>n.getAttr('label')==='Small line')[0]; t.width(500); t.setAttr('autoW',false); t.wrap('word'); return 500; });
await words('Small line',LONG+' '+LONG);
ok('words in a box someone sized keep that width',await pg.evaluate(w=>Math.round(BD.main.find(n=>n.getAttr('label')==='Small line')[0].width())===w,fixedW));
/* the draft keeps the wrapped headline after a reload */
await words('Headline',LONG); await pg.waitForTimeout(1600);
const hb=await box('Headline'); await pg.reload(); await ready();
const ha=await box('Headline');
ok('the wrapped headline comes back the same after a reload',JSON.stringify(ha)===JSON.stringify(hb),[hb,ha]);

/* right-aligned words (Arabic notification in Lock screen) keep their right edge */
await pg.goto(BASE+'tools/create.html?tpl=lockscreen'); await ready();
const t0=await box('Title');
await words('Title',LONG+' '+LONG);
const t1=await box('Title');
ok('right-aligned words keep their right edge and stay on the page',Math.abs(t1.r-t0.r)<=2&&inside(t1),[t0,t1]);

console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no console errors');
await b.close(); process.exit(fails||errs.length?1:0);

/* Studio 1.40.0 (Simplify): Carousel's Style sheet opens on "This slide" (Slide type, Words place) above the all-slides
   settings, and Collage's Style sheet hides Border colour until a border is set (it shows while the slider moves).
   Engine parts: a style field with lead:true goes above the styles; when:{field,not} hides a field for some values.
   Phone 390 + 360, and a computer for Carousel. Old designs are untouched (the draw code did not change). */
import { chromium } from 'playwright'; import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const res=[]; const ok=(n,c,i)=>res.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' ('+JSON.stringify(i)+')':''));
const T0=Date.now(), b=await chromium.launch(), errs=[];
const mk=async(w,h,mob=true)=>{ const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:mob,hasTouch:mob,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e))); return {ctx,pg}; };
const slider=(pg,id,v,ev='input')=>pg.evaluate(([id,v,ev])=>{ const r=document.querySelector(`[data-range="${id}"]`); r.value=v; r.dispatchEvent(new Event(ev,{bubbles:true})); },[id,v,ev]);
const shown=(pg,id)=>pg.$eval(`[data-fw="${id}"]`,e=>!e.hidden&&e.getClientRects().length>0);

for(const [w,h] of [[390,844],[360,740]]){ const N=w+': ';
  /* Carousel */
  { const {ctx,pg}=await mk(w,h); await pg.goto(BASE+'tools/carousel.html'); await pg.waitForTimeout(1500);
    await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(600);
    const m=await pg.evaluate(()=>{ const s=document.getElementById('sh-style'), boxes=[...s.querySelectorAll('[data-fields]')].map(x=>x.dataset.fields);
      const heads=[...s.querySelectorAll('h3.fgroup')].map(x=>x.textContent.trim()), y=e=>e.getBoundingClientRect().top;
      const kind=s.querySelector('[data-seg="kind"]'), styles=document.getElementById('styles'), body=s.querySelector('.sheet-body').getBoundingClientRect();
      return {boxes, heads, kindAbove:y(kind)<y(styles), kindInView:kind.getBoundingClientRect().bottom<=body.bottom+1, scroll:s.querySelector('.sheet-body').scrollTop,
        lead:[...s.querySelectorAll('[data-fields="lead"] > .field')].filter(x=>!x.hidden).map(x=>x.dataset.fw), sw:document.documentElement.scrollWidth<=innerWidth}; });
    ok(N+'Carousel: the Style sheet starts with This slide, then All slides',m.boxes[0]==='lead'&&m.heads[0]==='This slide'&&m.heads[1]==='All slides',m);
    ok(N+'Carousel: Slide type is above the White/Cream/Black styles and in view without scrolling',m.kindAbove&&m.kindInView&&m.scroll===0,m);
    ok(N+'Carousel: This slide holds Slide type and Words place (cover)',m.lead.join()==='gThis,kind,place',m.lead);
    ok(N+'Carousel: no sideways scroll',m.sw);
    /* picking a slide type still works, and Words place follows it */
    await pg.tap('#sh-style [data-seg="kind"] .seg[data-v="words"]'); await pg.waitForTimeout(300);
    const k=await pg.evaluate(()=>({kind:Studio.debug.S.values.kind, place:!document.querySelector('[data-fw="place"]').hidden, pressed:document.querySelector('[data-seg="kind"] [data-v="words"]').getAttribute('aria-pressed')}));
    ok(N+'Carousel: tapping Words only sets the slide type and hides Words place',k.kind==='words'&&!k.place&&k.pressed==='true',k);
    await pg.tap('#sh-style [data-seg="kind"] .seg[data-v="two"]'); await pg.waitForTimeout(300);
    ok(N+'Carousel: Two photos shows its Stacked / Side by side choice in This slide',await shown(pg,'two')&&await pg.$eval('[data-fw="two"]',e=>e.parentElement.dataset.fields)==='lead');
    /* the styles still switch */
    await pg.tap('#styles [data-style="black"]'); await pg.waitForTimeout(300);
    ok(N+'Carousel: the styles still switch from below This slide',await pg.evaluate(()=>Studio.debug.S.style)==='black');
    await ctx.close(); }
  /* Collage */
  { const {ctx,pg}=await mk(w,h); await pg.goto(BASE+'tools/collage.html'); await pg.waitForTimeout(1500);
    await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(600);
    ok(N+'Collage: Border colour is hidden while the border is 0',!(await shown(pg,'bcol'))&&await pg.evaluate(()=>Studio.debug.S.values.border)===0);
    await slider(pg,'border',10);
    ok(N+'Collage: Border colour shows as soon as the slider leaves 0 (while it moves)',await shown(pg,'bcol'));
    const order=await pg.$$eval('#sh-style [data-fields="style"] > .field',l=>l.filter(x=>!x.hidden).map(x=>x.dataset.fw));
    ok(N+'Collage: it sits right under Border',order.indexOf('bcol')===order.indexOf('border')+1,order);
    await slider(pg,'border',10,'change'); ok(N+'Collage: and stays after the slider is let go',await shown(pg,'bcol'));
    await pg.locator('#sh-style [data-pal="f:bcol"] [data-chex]').fill('#ff0000'); await pg.waitForTimeout(150);
    ok(N+'Collage: the picked border colour is kept',await pg.evaluate(()=>String(Studio.debug.S.values.bcol).toLowerCase())==='#ff0000');
    await slider(pg,'border',0); await slider(pg,'border',0,'change');
    ok(N+'Collage: Border colour hides again at 0 (its colour is kept for next time)',!(await shown(pg,'bcol'))&&await pg.evaluate(()=>String(Studio.debug.S.values.bcol).toLowerCase())==='#ff0000');
    await ctx.close(); }
}
/* computer: Carousel's This slide is first there too */
{ const {ctx,pg}=await mk(1280,800,false); await pg.goto(BASE+'tools/carousel.html'); await pg.waitForTimeout(1500);
  const m=await pg.evaluate(()=>{ const s=document.getElementById('sh-style'), y=e=>e.getBoundingClientRect().top; return {first:s.querySelector('[data-fields]').dataset.fields, above:y(s.querySelector('[data-seg="kind"]'))<y(document.getElementById('styles'))}; });
  ok('1280: Carousel: This slide comes first in the Style card too',m.first==='lead'&&m.above,m);
  await ctx.close(); }
/* a rejected thing with no check before (taste.md: the "New" label on hub tools, dropped 22 Oct) */
{ const {ctx,pg}=await mk(390,844); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1500); await pg.tap('#allTools'); await pg.waitForTimeout(700);
  const tags=await pg.evaluate(()=>[...document.querySelectorAll('.tool-item, .lib-row')].filter(e=>e.getClientRects().length).flatMap(r=>[...r.querySelectorAll('*')].filter(x=>!x.children.length&&/^\s*new\s*$/i.test(x.textContent)).map(x=>x.className||x.tagName)));
  const rows=await pg.evaluate(()=>document.querySelectorAll('.tool-item, .lib-row').length);
  ok('Home + All tools: no "New" label on any tool row',rows>3&&!tags.length,{rows,tags});
  await ctx.close(); }
/* run.mjs runs contrast.mjs on the session's port */
ok('contrast.mjs reads BASE from the environment when no URL is given',/process\.argv\[2\]\|\|process\.env\.BASE/.test(fs.readFileSync(new URL('contrast.mjs',import.meta.url),'utf8')));
await b.close();
ok('no page errors',!errs.length,errs.slice(0,2));
console.log(res.join('\n')); console.log(`simplify40: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-T0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

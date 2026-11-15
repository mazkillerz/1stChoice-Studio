/* Studio 2.15.0 (Simplify): Settings in four short groups (You, Brand and team, On this phone/device, Help and more) with small headings that
   start where the row icons start, and every Settings row has its own icon (owner and Previews shared icons before). Phone 390 light + dark, computer. */
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
let fails=0; const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const b=await chromium.launch(); const errs=[];
for(const [w,h,mob,scheme] of [[390,844,true,'light'],[390,844,true,'dark'],[1280,800,false,'light']]){ const N=`${w} ${scheme}: `;
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob,colorScheme:scheme,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200);
  await pg.click('[aria-label="Settings"]'); await pg.waitForSelector('dialog[open] .set-gl'); await pg.waitForTimeout(500);
  const m=await pg.evaluate(()=>{ const d=document.querySelector('dialog[open]');
    const heads=[...d.querySelectorAll('.set-gl')].map(x=>{ const r=document.createRange(); r.selectNodeContents(x); return {t:x.textContent.trim(),x:Math.round(r.getClientRects()[0].left)}; });
    const rows=[...d.querySelectorAll('.set-row')].filter(r=>r.getClientRects().length);
    const icons=rows.map(r=>({id:r.dataset.set,svg:r.querySelector(':scope>svg').innerHTML,x:Math.round(r.querySelector(':scope>svg').getBoundingClientRect().left)}));
    const lists=d.querySelectorAll('.set-list').length, body=d.querySelector('.dlg-body.set');
    const inside=[...d.querySelectorAll('.set-list')].every(l=>body.contains(l));
    return {heads,icons,lists,inside,sw:document.documentElement.scrollWidth<=innerWidth}; });
  ok(N+'four groups: one list for You, then three with headings',m.lists===4&&m.heads.map(x=>x.t).join('|')===['Brand and team',(w<500?'On this phone':'On this device'),'Help and more'].join('|'),m.heads);
  ok(N+'every list is inside the Settings body (same inset)',m.inside);
  ok(N+'headings start where the row icons start (±1px)',m.heads.every(x=>Math.abs(x.x-m.icons[0].x)<=1),{heads:m.heads,icon:m.icons[0].x});
  const dup=m.icons.filter((a,i)=>m.icons.findIndex(b=>b.svg===a.svg)!==i).map(a=>a.id);
  ok(N+'no two Settings rows share an icon',!dup.length,dup);
  ok(N+'Brand check, Team assets in Brand and team; Reminders in On this phone/device (2.21.0: the list/grid row is gone)',await pg.evaluate(()=>{ const L=[...document.querySelectorAll('dialog[open] .set-list')]; const ids=l=>[...l.querySelectorAll('[data-set]')].map(x=>x.dataset.set);
    return ids(L[1]).includes('rules')&&ids(L[1]).includes('teamassets')&&!ids(L[2]).includes('view')&&ids(L[2]).includes('remind')&&ids(L[3]).includes('previews')&&ids(L[3]).includes('lab'); }));
  ok(N+'switches still work (Brand check toggles)',await pg.evaluate(async()=>{ const r=document.querySelector('dialog[open] [data-set="rules"]'), a=r.getAttribute('aria-checked'); r.click(); await new Promise(z=>setTimeout(z,50)); const c=r.getAttribute('aria-checked'); r.click(); return a!==c; }));
  ok(N+'no sideways scroll',m.sw);
  await ctx.close(); }
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close(); process.exit(fails?1:0);

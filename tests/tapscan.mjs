/* Lists every visible control under 44px at 390×844, per sheet. Usage: node tests/tapscan.mjs tools/offer.html,tools/collage.html */
import { chromium } from 'playwright'; import fs from 'fs';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage();
for(const u of (process.argv[2]||'tools/offer.html,tools/carousel.html').split(',')){
  await pg.goto('http://127.0.0.1:8080/'+u); await pg.waitForTimeout(1500);
  const sheets=await pg.$$eval('#bar [data-open]',bs=>bs.map(b=>b.dataset.open)).catch(()=>[]);
  for(const s of ['',...sheets]){ if(s){ await pg.tap(`#bar [data-open="${s}"]`); await pg.waitForTimeout(400); }
    const small=await pg.evaluate(()=>[...document.querySelectorAll('button,a,input,select,[role=button],label.check')].filter(e=>{const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
      /* an invisible ::after hit area (position:absolute; inset:-Npx) makes the tap target bigger than the box */
      const a=getComputedStyle(e,'::after'), px=v=>parseFloat(v)||0; let w=r.width, h=r.height;
      if(a.content!=='none'&&a.position==='absolute'){ w=Math.max(w,r.width-px(a.left)-px(a.right)); h=Math.max(h,r.height-px(a.top)-px(a.bottom)); }
      return !e.classList.contains('sr-only')&&r.width>0&&r.height>0&&cs.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight&&(h<44||w<44);}).map(e=>`${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} "${(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,20)}"`));
    console.log(u,s||'(main)',[...new Set(small)].join(' | ')); }
}
await b.close();

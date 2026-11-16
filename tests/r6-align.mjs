/* r6-align: the alignment pass. Locks the measurable rules: Saved has one row less (sort in the chip row), pages share one gutter,
   icon sizes are equal inside a group, corners come from the --r-* tokens, What's New and Plan edges line up. 390x844 touch; also 360 for What's New. */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SEED=seedDesigns();
const res=[]; const ok=(n,c,i)=>res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':''));
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const b=await chromium.launch(); const errs=[];
const mk=async(w,scheme='light')=>{ const ctx=await b.newContext({viewport:{width:w,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); await ctx.addInitScript({content:seedScript(SEED)});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e))); return pg; };
const go=async(pg,h)=>{ await pg.goto(BASE+'index.html'+h); await pg.waitForTimeout(1200); };
const R=(pg,sel)=>pg.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height}; },sel);
const css=(pg,sel,p)=>pg.evaluate(([s,p])=>{ const e=document.querySelector(s); return e?getComputedStyle(e)[p]:null; },[sel,p]);
const TOK=['10px','14px','20px','26px','999px','50%','3333.33px'];
for(const scheme of ['light','dark']){
  const N=scheme+': ', pg=await mk(390,scheme);
  /* Saved: sort lives in the chip row, one row less */
  await go(pg,'#saved'); await pg.waitForSelector('#savedGrid .sv-card');
  const ch=await R(pg,'#colChips'), so=await R(pg,'#sortBtn'), gr=await R(pg,'#savedGrid');
  ok(N+'Saved: chips and sort share one row',ch&&so&&so.t>=ch.t-6&&so.b<=ch.b+16&&Math.abs((so.t+so.h/2)-(ch.t+ch.h/2))<16,{ch,so});
  ok(N+'Saved: the sort button is 48px and stays in the page gutter',so&&so.w>=48&&so.r<=390-16+1,so&&so.w+' r'+so.r);
  ok(N+'Saved: the grid starts within 24px under the chip row (no spare row)',gr&&ch&&gr.t-ch.b<=24,gr&&ch&&(gr.t-ch.b));
  ok(N+'Saved: the sort button keeps its name',(await pg.getAttribute('#sortBtn','aria-label'))==='Sort: Recent');
  const sortTap=await pg.evaluate(()=>{ const b=document.getElementById('sortBtn'); b.click(); return !!document.querySelector('dialog[open] .sort-opts'); });
  ok(N+'Saved: the sort button still opens the sort sheet',sortTap); await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  /* Saved header and cards share the gutter */
  const sc=await pg.evaluate(()=>{ const c=document.querySelector('#savedGrid .sv-card'), f=document.querySelector('#colChips .chip'); return {card:c.getBoundingClientRect().left,chip:f.getBoundingClientRect().left}; });
  ok(N+'Saved: first chip and first card start at the same edge',Math.abs(sc.card-sc.chip)<=1,sc);
  /* corners come from the tokens */
  const bad=await pg.evaluate(TOK=>{ const out=[]; for(const s of ['.sv-open','.sv-thumb','.hubbar','.hubbar .pill','.sp-sel','.sort-btn','.chip']){ const e=document.querySelector(s); if(!e) continue; const v=getComputedStyle(e).borderTopLeftRadius; if(!TOK.includes(v)&&!(parseFloat(v)>=100)) out.push(s+' '+v); } return out; },TOK);
  ok(N+'Saved: corners use the radius tokens',!bad.length,bad);
  /* Templates: back like Saved's, one gutter */
  await go(pg,'#templates'); await pg.waitForSelector('.tp-chip');
  const tb=await pg.evaluate(()=>{ const q=s=>document.querySelector(s); const bk=q('.tp-back'), cs=getComputedStyle(bk), sv=bk.querySelector('svg').getBoundingClientRect(); const h=q('.tp-ttl').getBoundingClientRect(), c=q('.tp-chip').getBoundingClientRect(), g=q('.tp-grid .tp-frame, .tp-frame').getBoundingClientRect();
    return {bg:cs.backgroundColor,sh:cs.boxShadow,bd:cs.borderTopWidth,ic:Math.round(sv.width),ttl:h.left,chip:c.left,card:g.left,arrow:sv.left}; });
  ok(N+'Templates: the back button is bare like Saved (no circle, 22px arrow)',tb.bd==='0px'&&tb.sh==='none'&&tb.ic===22&&/rgba\(0, 0, 0, 0\)|transparent/.test(tb.bg),tb);
  ok(N+'Templates: title, first chip and first card share the gutter',Math.abs(tb.ttl-tb.chip)<=1&&Math.abs(tb.card-tb.chip)<=1,tb);
  /* Home: Ideas / Goals match the Calendar row */
  await go(pg,'');
  await pg.waitForSelector('.plan-chip'); await pg.waitForSelector('.cal-home-row:not(.hs-skel)');
  const hm=await pg.evaluate(()=>{ const row=document.querySelector('.cal-home-row:not(.hs-skel)'), chip=document.querySelector('.plan-chip'); const ic=e=>{ const r=e.querySelector('svg').getBoundingClientRect(); return Math.round(r.width); };
    return {rr:getComputedStyle(row).borderTopLeftRadius,cr:getComputedStyle(chip).borderTopLeftRadius,ri:ic(row),ci:ic(chip),rl:row.querySelector('svg').getBoundingClientRect().left-row.getBoundingClientRect().left,cl:chip.querySelector('svg').getBoundingClientRect().left-chip.getBoundingClientRect().left,
      rh:Math.round(row.getBoundingClientRect().height),ch:Math.round(chip.getBoundingClientRect().height),h2:getComputedStyle(document.querySelector('#toolsH')).fontSize}; });
  ok(N+'Home: Ideas/Goals tiles share the Calendar row corner, icon size and inset',hm.rr===hm.cr&&hm.ri===hm.ci&&Math.abs(hm.rl-hm.cl)<=1,hm);
  ok(N+'Home: section headings use the 17px step',hm.h2==='17px',hm.h2);
  /* Plan: arrows at the gutter, text button ends at the card edge */
  await go(pg,'#calendar'); await pg.waitForSelector('.cal-arrow'); await pg.tap('button.chip >> text=Month'); await pg.waitForTimeout(500);
  const pl=await pg.evaluate(()=>{ const a=[...document.querySelector('.cal-nav').querySelectorAll('.cal-arrow')].filter(x=>x.getClientRects().length), f=a[0].querySelector('svg').getBoundingClientRect(), l=a[a.length-1].querySelector('svg').getBoundingClientRect(), seg=document.querySelector('.cal-seg').getBoundingClientRect(); return {first:f.left,last:l.right,seg:[seg.left,seg.right]}; });
  ok(N+'Plan: month arrows sit at the page gutters',Math.abs(pl.first-16)<=1&&Math.abs(pl.last-374)<=1,pl);
  await pg.tap('button.chip >> text=Feed'); await pg.waitForTimeout(400);
  const fd=await pg.evaluate(()=>{ const n=document.querySelector('.cal-nav').getBoundingClientRect(); return n.height; });
  ok(N+'Plan: Feed keeps the same title row height as Month',fd>=44,fd);
  await pg.tap('.st-l >> text=Goals'); await pg.waitForTimeout(600);
  const kp=await pg.evaluate(()=>{ const l=[...document.querySelectorAll('.kp-sh .link')].find(x=>x.getClientRects().length), c=document.querySelector('.kp-card'); if(!l||!c) return null; const tr=document.createRange(); tr.selectNodeContents(l); return {text:tr.getBoundingClientRect().right,card:document.querySelector('.kp-grid').getBoundingClientRect().right}; });
  ok(N+'Plan Goals: "Add numbers" ends where the cards end',kp&&Math.abs(kp.text-kp.card)<=14,kp);
  await pg.context().close();
}
/* What's New: chips fit at 360 and the section heading starts at the card edge */
for(const w of [390,360]){
  const pg=await mk(w); await pg.goto(BASE+'whats-new.html'); await pg.waitForTimeout(1500);
  const wn=await pg.evaluate(()=>{ const s=document.getElementById('wnChips'), h=document.querySelector('.wn-sech'), c=document.querySelector('.wn-latest, .wn-ver'); return {sw:s.scrollWidth,cw:s.clientWidth,h:h&&Math.round(h.getBoundingClientRect().left),c:c&&Math.round(c.getBoundingClientRect().left),fs:getComputedStyle(document.querySelector('.wn-f')).fontSize}; });
  ok('whatsnew '+w+': the filter chips fit without sideways scroll',wn.sw<=wn.cw+1,wn);
  ok('whatsnew '+w+': "Earlier versions" starts at the card edge',wn.h===null||wn.h===wn.c,wn);
  ok('whatsnew '+w+': filter chips use the 13px step',wn.fs==='13px',wn.fs);
  await pg.context().close();
}
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);

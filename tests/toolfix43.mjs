/* Studio 1.43.0: tool page fixes.
   1. Short phones (iPhone SE 375×667, 360×740): the Save sheet leaves the preview below the top bar (it slid under it) and the Save button in view.
   2. A computer shows one Add photo (the Photo card tile); the blue "Add your photo" under the preview is phone-only.
   3. A text layer's More tab at 360/390: style buttons two to a row on one line, saved text styles in one row that scrolls sideways,
      no label cut, no sideways page scroll, and the preview keeps a usable size. Light and dark. */
import { chromium } from 'playwright'; import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>res.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' ('+JSON.stringify(i)+')':''));
const T0=Date.now(), b=await chromium.launch(), errs=[];
const STYLES=[{id:'a',name:'Big title',st:{color:'#111111',size:1.4},at:1},{id:'b',name:'Small note',st:{color:'#cc3333',size:.8},at:2},{id:'c',name:'Gold',st:{color:'#dd44aa',size:1},at:3},{id:'d',name:'Quiet',st:{color:'#666666',size:.9},at:4}];
const mk=async(w,h,scheme,styles)=>{ const phone=w<821; const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:phone,hasTouch:phone,serviceWorkers:'block',colorScheme:scheme||'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  await ctx.addInitScript(s=>{ try{ localStorage.setItem('studio:welcome','1'); if(s&&!sessionStorage.getItem('t43')){ sessionStorage.setItem('t43','1'); localStorage.setItem('studio:textstyles',JSON.stringify(s)); } }catch(e){} },styles||null);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e))); return {ctx,pg}; };
const open=async(pg,t)=>{ await pg.goto(BASE+'tools/'+t+'.html'); await pg.waitForTimeout(1300); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(300); };

/* 1. Save sheet on short phones */
for(const [w,h] of [[375,667],[360,740]]) for(const t of ['photo-story','carousel','highlight']){ const N=`${w}x${h} ${t}: `;
  const {ctx,pg}=await mk(w,h); await open(pg,t);
  await pg.tap('#barSave'); await pg.waitForTimeout(700);
  const m=await pg.evaluate(()=>{ const r=s=>document.querySelector(s).getBoundingClientRect(); const nav=r('nav.top'), ph=r('#phone'), sh=r('#sh-save');
    const btn=[...document.querySelectorAll('#sh-save .btn')].find(e=>e.offsetParent!==null&&!e.hidden); const br=btn&&btn.getBoundingClientRect();
    return {navB:Math.round(nav.bottom),phT:Math.round(ph.top),phB:Math.round(ph.bottom),phH:Math.round(ph.height),shT:Math.round(sh.top),shB:Math.round(sh.bottom),btnB:br&&Math.round(br.bottom),btn:btn&&btn.textContent.trim()}; });
  ok(N+'the preview starts below the top bar',m.phT>=m.navB-1,m);
  ok(N+'the preview ends above the Save sheet',m.phB<=m.shT+1,m);
  ok(N+'the preview stays at least 72px tall',m.phH>=72,m.phH);
  ok(N+'the Save button is in view inside the sheet',!!m.btnB&&m.btnB<=m.shB,m);
  await ctx.close(); }
/* the Save sheet on a normal phone is as tall as before (no change at 390×844) */
{ const {ctx,pg}=await mk(390,844); await open(pg,'restock'); await pg.tap('#barSave'); await pg.waitForTimeout(700);
  const m=await pg.evaluate(()=>{ const s=document.getElementById('sh-save'); return {h:Math.round(s.getBoundingClientRect().height),sh:s.querySelector('.sheet-body').scrollHeight,ch:s.querySelector('.sheet-body').clientHeight}; });
  ok('390x844: the Save sheet shows all of its options without scrolling',m.sh<=m.ch+2,m); await ctx.close(); }

/* 2. One Add photo on a computer; the phone keeps its button */
for(const t of ['restock','photo-story','collage','carousel']){
  { const {ctx,pg}=await mk(1280,800); await open(pg,t);
    const m=await pg.evaluate(()=>{ const c=document.getElementById('ctaPhoto'); const tiles=[...document.querySelectorAll('#slots .slot')].filter(e=>e.offsetParent!==null);
      return {cta:!c.hidden&&getComputedStyle(c).display!=='none'&&c.getClientRects().length>0,tiles:tiles.length,card:document.getElementById('sh-photo').offsetParent!==null}; });
    ok('1280 '+t+': no second Add photo under the preview',!m.cta,m);
    ok('1280 '+t+': the Photo card shows its photo tile(s)',m.card&&m.tiles>=1,m);
    await ctx.close(); }
  { const {ctx,pg}=await mk(390,844); await open(pg,t);
    const v=await pg.evaluate(()=>{ const c=document.getElementById('ctaPhoto'); return !c.hidden&&c.getClientRects().length>0&&getComputedStyle(c).display!=='none'; });
    ok('390 '+t+': the phone still shows Add your photo under the preview',v); await ctx.close(); }
}

/* 3. More tab with saved styles and a copied style */
for(const scheme of ['light','dark']) for(const [w,h] of [[360,740],[390,844]]){ const N=`${w} ${scheme} More: `;
  const {ctx,pg}=await mk(w,h,scheme,STYLES); await open(pg,'photo-story');
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(450);
  const tid=await pg.evaluate(()=>{ const r=Studio.debug.reg().find(x=>x.kind==='text'&&x.typ&&!x.empty&&!x.hidden); return r&&r.id; });
  await pg.evaluate(id=>document.querySelector(`#layerList [data-pick="${id}"]`).click(),tid); await pg.waitForTimeout(450);
  await pg.tap('#sh-insp .itab[data-part="more"]'); await pg.waitForTimeout(400);
  await pg.tap('#inspCopyStyle'); await pg.waitForTimeout(600);
  const m=await pg.evaluate(()=>{ const vis=e=>!e.hidden&&e.getClientRects().length>0;
    const bs=[...document.querySelectorAll('#inspStyleRow .mini')].filter(vis);
    const tall=bs.filter(e=>e.getBoundingClientRect().height>54).map(e=>e.id+':'+Math.round(e.getBoundingClientRect().height));
    const cut=bs.filter(e=>{ const s=e.querySelector('span'); return s&&s.scrollWidth>s.clientWidth+1||e.scrollWidth>e.clientWidth+1; }).map(e=>e.id);
    const rows=new Set(bs.map(e=>Math.round(e.getBoundingClientRect().top))).size;
    const chips=[...document.querySelectorAll('#tsList .ts-chip')], tops=new Set(chips.map(c=>Math.round(c.getBoundingClientRect().top)));
    const list=document.getElementById('tsList'); const ph=document.getElementById('phone').getBoundingClientRect();
    return {n:bs.length,tall,cut,rows,chips:chips.length,chipRows:tops.size,scrolls:list.scrollWidth>list.clientWidth,sw:document.documentElement.scrollWidth<=innerWidth,phH:Math.round(ph.height),phW:Math.round(ph.width),
      pasteAll:vis(document.getElementById('inspPasteAll')),save:vis(document.getElementById('inspSaveStyle')),saveRow:document.getElementById('inspSaveStyle').parentElement.id}; });
  ok(N+'Copy, Save this style, Paste style and Paste on all text all show',m.n===4&&m.pasteAll&&m.save&&m.saveRow==='inspStyleRow',m);
  ok(N+'the style buttons sit two to a row',m.rows===2,m.rows);
  ok(N+'every style button label is on one line (no 2–3 line buttons)',!m.tall.length,m.tall);
  ok(N+'no style button label is cut',!m.cut.length,m.cut);
  ok(N+'saved text styles sit in one row',m.chips===4&&m.chipRows===1,m);
  ok(N+'the text styles row scrolls sideways when they do not fit',m.scrolls,m);
  ok(N+'no sideways page scroll',m.sw);
  ok(N+'the preview keeps a usable size (>= 230px tall)',m.phH>=230,m.phH);
  /* the row shows that it scrolls: a chip is cut off at the screen edge, so no style looks missing */
  const edge=await pg.evaluate(()=>{ const l=document.getElementById('tsList'); l.scrollLeft=0; const cut=[...l.querySelectorAll('.ts-chip')].some(c=>{ const r=c.getBoundingClientRect(); return r.left<innerWidth-8&&r.right>innerWidth+8; }); return {cut}; });
  ok(N+'a style is cut off at the edge, so the row reads as one that scrolls',edge.cut,edge);
  /* the last style can be reached by scrolling the row */
  const last=await pg.evaluate(()=>{ const l=document.getElementById('tsList'); l.scrollLeft=l.scrollWidth; const c=[...l.querySelectorAll('.ts-chip')].pop().getBoundingClientRect(); return {r:Math.round(c.right),l:Math.round(c.left),w:innerWidth}; });
  ok(N+'the last saved style scrolls fully into view',last.l>=0&&last.r<=last.w,last);
  await ctx.close(); }
/* a logo (not text): only Copy style (no Save this style), a full-width, one-line button */
{ const {ctx,pg}=await mk(360,740); await open(pg,'collage');
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(400);
  const id=await pg.evaluate(()=>{ const r=Studio.debug.reg().find(x=>x.kind!=='text'&&!x.hidden&&document.querySelector(`#layerList [data-pick="${x.id}"]`)); return r&&r.id; });
  await pg.evaluate(id=>document.querySelector(`#layerList [data-pick="${id}"]`).click(),id); await pg.waitForTimeout(450);
  await pg.tap('#sh-insp .itab[data-part="more"]'); await pg.waitForTimeout(400);
  const m=await pg.evaluate(()=>{ const c=document.getElementById('inspCopyStyle').getBoundingClientRect(), row=document.getElementById('inspStyleRow').getBoundingClientRect(); return {w:Math.round(c.width),rw:Math.round(row.width),h:Math.round(c.height),saveHidden:document.getElementById('inspSaveStyle').hidden}; });
  ok('360 collage logo ('+id+'): Copy style alone fills the row on one line',m.saveHidden&&m.w>=m.rw-2&&m.h<=54,m);
  await ctx.close(); }
/* while the Save sheet squeezes Carousel, the slide strip steps aside and comes back when the sheet closes */
{ const {ctx,pg}=await mk(360,740); await open(pg,'carousel');
  const v=()=>pg.evaluate(()=>{ const p=document.getElementById('pager'); return !p.hidden&&p.getClientRects().length>0; });
  const before=await v(); await pg.tap('#barSave'); await pg.waitForTimeout(500); await pg.evaluate(()=>document.querySelector('#saveWhere [data-where="team"]').click()); await pg.waitForTimeout(900); const during=await v(); const prevW=await pg.evaluate(()=>Math.round(document.getElementById('phone').getBoundingClientRect().width)); ok('360x740 carousel: the preview stays big with the Save sheet open (2.4.0)',prevW>=150,prevW);   /* 2.3.0: the sheet is short on My phone; Phone + Team is the tall state */
  await pg.evaluate(()=>document.querySelector('#sh-save [data-close]').click()); await pg.waitForTimeout(700); const after=await v();
  /* 2.4.0: the Save sheet always leaves the preview its room, so the strip may stay; either way the preview stays big and nothing sits under the top bar */
  ok('360x740 carousel: with the Save sheet open the strip steps aside or fits, and comes back after',before&&after,{before,during,after});
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(700);
  const st=await pg.evaluate(()=>{ const r=s=>document.querySelector(s).getBoundingClientRect(); return {navB:r('nav.top').bottom,phT:r('#phone').top}; });
  ok('360x740 carousel Style sheet: the preview starts below the top bar',st.phT>=st.navB-1,st);
  await ctx.close(); }

ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
const fails=res.filter(r=>r.startsWith('FAIL'));
console.log(res.join('\n')); console.log(`\ntoolfix43: ${res.length-fails.length} passed, ${fails.length} failed (${((Date.now()-T0)/1000).toFixed(0)}s)`);
process.exit(fails.length?1:0);

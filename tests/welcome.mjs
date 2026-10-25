/* Welcome tour test (assets/welcome.js + assets/welcome.css), phone size 390x844 (touch) in light AND dark, plus small phone, desktop and reduced motion.
   1. Opens: a dialog with 3 slides and 3 dots, slide 1 is "on", Skip shows, the button says Next, focus sits on the dialog (no button ring).
   2. Next goes to slide 2 (dot 2 current), a real touch swipe goes to slide 3 ("Get started", Skip hidden); haptics fire.
   3. Get started resolves 'done', removes the dialog and the scroll lock. Skip and Escape resolve 'skipped'. Arrow keys move. Opening twice returns one promise.
   4. The Arabic mock text runs right to left; the animated bits (star fills, text swaps, tick + "Saved!") really play.
   5. Every button and dot is at least 44x44; title, text, Skip and button text pass WCAG AA (4.5:1) in both themes.
   6. 360 wide: nothing overflows sideways, every slide's content fits inside its slide.
   7. Desktop 1280x800: a centred card, at most 460 wide, fully on screen.
   8. Reduced motion: opens and closes at once with no errors and every visual shown in its final state.
   Needs the server on :8080 (npx http-server -p 8080 -c-1 .) or BASE=...  Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

const TOOLS=[
  {id:'restock',title:'Restock',blurb:'New stock is in',thumb:'assets/thumbs/1stchoice/restock.jpg'},
  {id:'photo-story',title:'Photo story',blurb:'Your photo, full screen',thumb:'assets/thumbs/1stchoice/photo-story.jpg'},
  {id:'collage',title:'Collage',blurb:'Several photos in one story',thumb:'assets/thumbs/1stchoice/collage.jpg'}];

async function newPage(opts,tag,blank){
  const ctx=await b.newContext({serviceWorkers:'block',deviceScaleFactor:1,...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(blank){ await pg.goto(BASE+'index.html'); await pg.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:var(--bg)"><p>x</p>'); await pg.addStyleTag({url:BASE+'assets/studio.css'}); }   /* a plain page, so the home page's own layout cannot affect the sideways-overflow check */
  else { await pg.goto(BASE+'index.html'); await pg.waitForTimeout(500); }
  await pg.addStyleTag({url:BASE+'assets/welcome.css'}); await pg.addScriptTag({url:BASE+'assets/welcome.js'});
  await pg.evaluate(()=>{ window.__h=[]; window.__lock=[]; window.__o=()=>{ window.__res=null; return (window.__w=StudioWelcome.open({tools:window.__tools,queries:['Restock','رجع متوفر'],
    lockScroll:(k,on)=>{ window.__lock.push(k+':'+on); document.documentElement.classList.toggle('scroll-lock',on); },haptic:k=>window.__h.push(k)})).then(r=>{ window.__res=r; return r; }); }; });
  await pg.evaluate(t=>{ window.__tools=t; },blank?TOOLS.map(t=>({...t,thumb:BASE+t.thumb})):TOOLS);
  return {ctx,pg};
}
const open=pg=>pg.evaluate(()=>{ window.__o(); return !!document.querySelector('dialog.wl[open]'); });
const result=pg=>pg.evaluate(()=>window.__w);
const waitOn=(pg,i)=>pg.waitForFunction(i=>{ const s=[...document.querySelectorAll('.wl-slide')]; return s.length&&s[i].classList.contains('on')&&s.filter(x=>x.classList.contains('on')).length===1; },i,{timeout:6000}).then(()=>true,()=>false);
const gone=pg=>pg.waitForFunction(()=>!document.querySelector('dialog.wl'),null,{timeout:3000}).then(()=>true,()=>false);
const state=pg=>pg.evaluate(()=>{ const q=s=>document.querySelector(s), vis=e=>e&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0;
  return {dlg:!!q('dialog.wl[open]'),slides:document.querySelectorAll('.wl-slide').length,dots:document.querySelectorAll('.wl-dot').length,
    on:[...document.querySelectorAll('.wl-slide')].map(s=>s.classList.contains('on')),cur:[...document.querySelectorAll('.wl-dot')].map(d=>d.getAttribute('aria-current')),
    skip:vis(q('.wl-skip')),btn:q('.wl-next')&&q('.wl-next').textContent.trim(),label:q('dialog.wl')&&q('dialog.wl').getAttribute('aria-labelledby')}; });
const lum=c=>{ const m=c.map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; };

for(const scheme of ['light','dark']){
  const N=scheme+': ';
  const {ctx,pg}=await newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:scheme},scheme);
  const cdp=await ctx.newCDPSession(pg);

  /* 1. opens */
  await open(pg); await waitOn(pg,0);
  let s=await state(pg);
  const focus=await pg.evaluate(()=>({dlg:document.activeElement===document.querySelector('dialog.wl'),ring:getComputedStyle(document.querySelector('dialog.wl')).outlineStyle}));
  ok(N+'opens: dialog, 3 slides, 3 dots, slide 1 on, Skip shown, button says Next',s.dlg&&s.slides===3&&s.dots===3&&s.on[0]&&!s.on[1]&&!s.on[2]&&s.skip&&s.btn==='Next'&&s.cur.join()==='true,false,false'&&s.label==='wl-t0',s);
  ok(N+'focus is on the dialog itself (no button ring on open)',focus.dlg&&focus.ring==='none',focus);
  ok(N+'scroll is locked while open',await pg.evaluate(()=>document.documentElement.classList.contains('scroll-lock')&&window.__lock[0]==='welcome:true'));
  ok(N+'opening twice returns the same promise',await pg.evaluate(()=>{ const a=StudioWelcome.open({tools:[]}), c=StudioWelcome.open(); return a===c&&document.querySelectorAll('dialog.wl').length===1; }));

  /* 2. Next, then a real touch swipe */
  await pg.tap('.wl-next'); const on2=await waitOn(pg,1); s=await state(pg);
  ok(N+'Next: slide 2 on, dot 2 current, still "Next", Skip shown',on2&&s.cur.join()==='false,true,false'&&s.btn==='Next'&&s.skip&&s.label==='wl-t1',s);
  await pg.waitForTimeout(500);
  const tp=(type,x)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y:400,id:1}]});   /* a real finger drag, right to left */
  await tp('touchStart',330); for(let x=330;x>=60;x-=15){ await tp('touchMove',x); await pg.waitForTimeout(16); } await tp('touchEnd',60);
  let on3=await waitOn(pg,2), swipe='touch';
  if(!on3){ swipe='scrollTo'; await pg.evaluate(()=>{ const t=document.querySelector('.wl-track'); t.scrollTo({left:t.clientWidth*2,behavior:'instant'}); }); on3=await waitOn(pg,2); }
  s=await state(pg);
  ok(N+'swipe: slide 3 on, "Get started", Skip hidden, dot 3 current',on3&&s.btn==='Get started'&&!s.skip&&s.cur.join()==='false,false,true'&&s.label==='wl-t2',{swipe,...s});
  ok(N+'a swipe snaps to exactly one slide',await pg.evaluate(()=>{ const t=document.querySelector('.wl-track'); return Math.abs(t.scrollLeft-t.clientWidth*2)<2; }));

  /* animated bits: the loop on slide 3 shows the tick and "Saved!" */
  await pg.waitForTimeout(2600);
  const sv=await pg.evaluate(()=>({tick:+getComputedStyle(document.querySelector('.wl-tick')).opacity,toast:+getComputedStyle(document.querySelector('.wl-toast')).opacity,toastText:document.querySelector('.wl-toast').textContent.trim(),pill:document.querySelector('.wl-pill').textContent.trim()}));
  ok(N+'slide 3: the tick pops in and the "Saved!" toast rises after the Save press',sv.tick>.9&&sv.toast>.9&&sv.toastText==='Saved!'&&sv.pill==='Save',sv);

  /* 3. Get started */
  await pg.tap('.wl-next'); const r1=await result(pg); const g1=await gone(pg);
  const after=await pg.evaluate(()=>({lock:document.documentElement.classList.contains('scroll-lock'),h:window.__h.join(),calls:window.__lock.join()}));
  ok(N+'Get started: resolves "done", dialog removed, scroll lock off',r1==='done'&&g1&&!after.lock&&/welcome:false/.test(after.calls),{r1,g1,...after});
  ok(N+'haptics: a tick on each slide change and a success on Get started',/tick/.test(after.h)&&/success$/.test(after.h),after.h);

  /* 4. Skip, Escape, arrow keys */
  await open(pg); await waitOn(pg,0); await pg.tap('.wl-skip'); const r2=await result(pg);
  ok(N+'Skip resolves "skipped" and removes the dialog',r2==='skipped'&&await gone(pg)&&await pg.evaluate(()=>!document.documentElement.classList.contains('scroll-lock')),r2);
  await open(pg); await waitOn(pg,0); await pg.keyboard.press('Escape'); const r3=await result(pg);
  ok(N+'Escape resolves "skipped" and removes the dialog',r3==='skipped'&&await gone(pg),r3);
  await open(pg); await waitOn(pg,0); await pg.keyboard.press('ArrowRight'); const k1=await waitOn(pg,1); await pg.keyboard.press('ArrowLeft'); const k0=await waitOn(pg,0);
  await pg.tap('.wl-dot:nth-child(3)'); const kd=await waitOn(pg,2); await pg.keyboard.press('Escape'); await result(pg);
  ok(N+'ArrowRight / ArrowLeft and the dots move between slides',k1&&k0&&kd,{k1,k0,kd});

  /* 5. Arabic mock text, tap sizes, contrast */
  await open(pg); await waitOn(pg,0); await pg.waitForTimeout(300);
  const ar=await pg.evaluate(()=>{ const e=document.querySelector('.wl-q2'); return {dir:getComputedStyle(e).direction,text:e.textContent,attr:e.getAttribute('dir')}; });
  ok(N+'the Arabic mock text runs right to left',ar.dir==='rtl'&&ar.text==='رجع متوفر',ar);
  await pg.evaluate(()=>{ const t=document.querySelector('.wl-track'); t.scrollTo({left:t.clientWidth,behavior:'instant'}); }); await waitOn(pg,1); await pg.waitForTimeout(3700);
  const alt=await pg.evaluate(()=>({q1:+getComputedStyle(document.querySelector('.wl-q1')).opacity,q2:+getComputedStyle(document.querySelector('.wl-q2')).opacity,star:+getComputedStyle(document.querySelector('.wl-pin .wl-s1')).opacity}));
  ok(N+'slide 2: the search text swaps to Arabic and the star filled in',alt.q2>.9&&alt.q1<.1&&alt.star>.9,alt);
  await pg.evaluate(()=>{ const t=document.querySelector('.wl-track'); t.scrollTo({left:0,behavior:'instant'}); }); await waitOn(pg,0);
  const taps=await pg.evaluate(()=>[...document.querySelectorAll('dialog.wl button')].filter(e=>getComputedStyle(e).visibility!=='hidden').map(e=>{ const r=e.getBoundingClientRect(); return {c:e.className,w:Math.round(r.width),h:Math.round(r.height)}; }));
  ok(N+'every visible button and dot is at least 44x44',taps.length===5&&taps.every(t=>t.w>=44&&t.h>=44),taps);
  const con=await pg.evaluate(()=>{
    const lin=c=>{ c/=255; return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4); };
    const parse=s=>{ const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
    const over=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
    const L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
    const behind=el=>{ const st=[]; for(let e=el;e;e=e.parentElement){ const c=parse(getComputedStyle(e).backgroundColor); if(c&&c.a>0) st.push(c); if(c&&c.a===1) break; } let col={r:255,g:255,b:255,a:1}; for(let i=st.length-1;i>=0;i--) col=over(st[i],col); return col; };
    const out=[]; const sel=['.wl-t','.wl-p','.wl-skip','.wl-next','.wl-lab','.wl-field','.wl-rt b','.wl-rt span','.wl-toast','.wl-pill'];
    sel.forEach(q=>document.querySelectorAll(q).forEach((el,i)=>{ const cs=getComputedStyle(el), bg=behind(el); const fg=over(parse(cs.color),bg); const a=L(fg),b=L(bg);
      const r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05); out.push({q:q+(i?'#'+i:''),r:+r.toFixed(2)}); }));
    return out; });
  const worst=con.reduce((m,x)=>x.r<m.r?x:m,{r:99});
  ok(N+'title, text, Skip, buttons, mock text: contrast is at least 4.5:1',con.length>=14&&worst.r>=4.5,{checked:con.length,worst});
  await pg.keyboard.press('Escape'); await result(pg);

  /* the phone really is full screen */
  await open(pg); await waitOn(pg,0); await pg.waitForTimeout(700);
  const box=await pg.evaluate(()=>{ const r=document.querySelector('dialog.wl').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,iw:innerWidth,ih:innerHeight}; });
  ok(N+'phone: the dialog fills the screen',box.x===0&&box.y===0&&box.w===box.iw&&box.h===box.ih,box);
  await pg.keyboard.press('Escape'); await result(pg);
  await ctx.close();
}

/* 6. small phones: nothing overflows sideways, every slide's content fits its slide */
for(const [W,H] of [[360,740],[360,640]]){
  const {ctx,pg}=await newPage({viewport:{width:W,height:H},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'light'},'small',true);
  await open(pg); await waitOn(pg,0);
  const fits=[];
  for(let i=0;i<3;i++){
    await pg.evaluate(i=>{ const t=document.querySelector('.wl-track'); t.scrollTo({left:t.clientWidth*i,behavior:'instant'}); },i); await waitOn(pg,i); await pg.waitForTimeout(1800);
    fits.push(await pg.evaluate(i=>{ const sl=document.querySelectorAll('.wl-slide')[i], sr=sl.getBoundingClientRect(), bad=[];
      sl.querySelectorAll('*').forEach(e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height) return; if(r.left<sr.left-.5||r.right>sr.right+.5) bad.push(e.className+' '+Math.round(r.left-sr.left)+'..'+Math.round(r.right-sr.left)); });
      return {i,bad:bad.slice(0,4),scrolls:sl.scrollHeight>sl.clientHeight+1,w:Math.round(sr.width)}; },i));
  }
  const sw=await pg.evaluate(()=>document.documentElement.scrollWidth);
  ok(`${W}x${H}: no sideways overflow, every slide's content fits inside its slide`,sw<=W&&fits.every(f=>!f.bad.length),{scrollWidth:sw,fits:fits.filter(f=>f.bad.length)});
  if(H>=740) ok(`${W}x${H}: nothing needs vertical scrolling inside a slide`,fits.every(f=>!f.scrolls),fits.map(f=>f.scrolls));
  await pg.keyboard.press('Escape'); await result(pg); await ctx.close();
}

/* 7. desktop: a centred card */
{
  const {ctx,pg}=await newPage({viewport:{width:1280,height:800},colorScheme:'light'},'desktop');
  await open(pg); await waitOn(pg,0); await pg.waitForTimeout(500);
  const r=await pg.evaluate(()=>{ const d=document.querySelector('dialog.wl'), b=d.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),r:Math.round(b.right),b:Math.round(b.bottom),cw:document.documentElement.clientWidth,radius:getComputedStyle(d).borderRadius}; });
  ok('desktop 1280x800: a centred card, at most 460 wide, fully on screen',r.w<=460&&r.w>=380&&r.h<=800-32&&Math.abs(r.x+r.w/2-640)<=2&&Math.abs(r.y+r.h/2-400)<=2&&r.x>=0&&r.y>=0&&r.r<=1280&&r.b<=800&&r.radius!=='0px',r);
  await pg.click('.wl-next'); await waitOn(pg,1); await pg.click('.wl-dot:nth-child(3)'); await waitOn(pg,2);
  await pg.click('.wl-next'); const rd=await result(pg);
  ok('desktop: clicking through to Get started resolves "done"',rd==='done'&&await gone(pg),rd);
  await ctx.close();
}

/* 8. reduced motion: no motion, every visual in its final state, closes at once */
{
  const {ctx,pg}=await newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'},'reduced');
  await open(pg); await waitOn(pg,0);
  const v1=await pg.evaluate(()=>{ const c=[...document.querySelectorAll('.wl-slide')[0].querySelectorAll('.wl-c')]; return {n:c.length,op:c.map(e=>+getComputedStyle(e).opacity),img:c.every(e=>{ const r=e.querySelector('.wl-card').getBoundingClientRect(); return r.width>60&&r.height>100; }),anim:getComputedStyle(c[0]).animationName}; });
  ok('reduced motion: slide 1 shows the story cards at once, no animation',v1.n===3&&v1.op.every(o=>o===1)&&v1.img&&v1.anim==='none',v1);
  await pg.tap('.wl-next'); await waitOn(pg,1);
  const v2=await pg.evaluate(()=>({star:+getComputedStyle(document.querySelector('.wl-pin .wl-s1')).opacity,q1:+getComputedStyle(document.querySelector('.wl-q1')).opacity,q2:+getComputedStyle(document.querySelector('.wl-q2')).opacity,rtl:getComputedStyle(document.querySelector('.wl-q2')).direction}));
  await pg.tap('.wl-next'); await waitOn(pg,2);
  const v3=await pg.evaluate(()=>({tick:+getComputedStyle(document.querySelector('.wl-tick')).opacity,toast:+getComputedStyle(document.querySelector('.wl-toast')).opacity}));
  ok('reduced motion: the star, both search phrases, the tick and "Saved!" are all shown',v2.star===1&&v2.q1===1&&v2.q2===1&&v2.rtl==='rtl'&&v3.tick===1&&v3.toast===1,{v2,v3});
  const tt=Date.now(); await pg.tap('.wl-next'); const rr=await result(pg); const g=await gone(pg), ms=Date.now()-tt;
  ok('reduced motion: Get started closes at once (no fade)',rr==='done'&&g&&ms<400,{rr,ms});
  await open(pg); await waitOn(pg,0); await pg.keyboard.press('Escape'); const re=await result(pg);
  ok('reduced motion: Escape resolves "skipped"',re==='skipped'&&await gone(pg),re);
  await ctx.close();
}

/* an RTL page: the track stays left to right (swiping and Next still work), Skip sits at the top end (the left) */
{
  const {ctx,pg}=await newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'light'},'rtl');
  await pg.evaluate(()=>{ document.documentElement.dir='rtl'; });
  await open(pg); await waitOn(pg,0); await pg.waitForTimeout(600);
  const d0=await pg.evaluate(()=>{ const sk=document.querySelector('.wl-skip').getBoundingClientRect(), dl=document.querySelector('dialog.wl').getBoundingClientRect(); return {track:getComputedStyle(document.querySelector('.wl-track')).direction,skipLeft:Math.round(sk.left-dl.left),skipRight:Math.round(dl.right-sk.right)}; });
  await pg.tap('.wl-next'); const a2=await waitOn(pg,1); await pg.tap('.wl-next'); const a3=await waitOn(pg,2);
  const sw=await pg.evaluate(()=>{ const t=document.querySelector('.wl-track'); return {left:Math.round(t.scrollLeft),w:t.clientWidth,docW:document.documentElement.scrollWidth}; });
  ok('RTL page: the track stays left to right, Skip is at the top end (left), Next moves forward',d0.track==='ltr'&&d0.skipLeft<d0.skipRight&&a2&&a3&&sw.left===sw.w*2&&sw.docW<=390,{d0,a2,a3,sw});
  await pg.keyboard.press('Escape'); await result(pg); await ctx.close();
}

/* fewer tools than three, and no icons: shows what it has */
{
  const {ctx,pg}=await newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'light'},'few');
  const cnt=[];
  for(const tools of [[],[TOOLS[0]],[TOOLS[0],TOOLS[1]]]){
    await pg.evaluate(t=>{ window.__tools=t; window.__o(); },tools); await waitOn(pg,0); await pg.waitForTimeout(1200);
    cnt.push(await pg.evaluate(()=>({cards:document.querySelectorAll('.wl-c').length,rows:document.querySelectorAll('.wl-row').length,svgs:document.querySelectorAll('dialog.wl svg').length})));
    await pg.keyboard.press('Escape'); await result(pg);
  }
  ok('fewer than 3 tools: shows what it has (placeholders for none), icons fall back to inline SVG',cnt[0].cards===3&&cnt[1].cards===1&&cnt[2].cards===2&&cnt.every(c=>c.rows===2&&c.svgs>=6),cnt);
  await ctx.close();
}

/* the hub: once on a brand-new phone, never on a phone that used Studio before, again from Settings and ?welcome=1.
   (Studio never opens it by itself under automation, so these pages pretend not to be automated.) */
{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:"Object.defineProperty(navigator,'webdriver',{get:()=>false});"});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('hub: '+e.message));
  const shown=()=>pg.evaluate(()=>!!document.querySelector('dialog.wl[open]'));
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1600);
  const first=await shown(), q2=await pg.evaluate(()=>document.querySelector('.wl-q2')&&document.querySelector('.wl-q2').textContent);
  if(first){ await pg.tap('.wl-skip'); await pg.waitForTimeout(500); }
  const mark=await pg.evaluate(()=>localStorage.getItem('studio:welcome'));
  ok('hub: a brand-new phone sees the welcome once, with a phrase from the brand kit; closing it is remembered',first&&q2==='رجع متوفر'&&mark==='"seen"',{first,q2,mark});
  await pg.reload(); await pg.waitForTimeout(1600);
  ok('hub: the next visit does not show it again',!(await shown()));
  await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:1stchoice:restock',JSON.stringify({style:'white'})); }); await pg.reload(); await pg.waitForTimeout(1600);
  ok('hub: a phone that already used Studio does not get it',!(await shown())&&await pg.evaluate(()=>localStorage.getItem('studio:welcome')==='"old"'));
  await pg.tap('#setBtn'); await pg.waitForTimeout(500); await pg.tap('[data-set="welcome"]'); await pg.waitForTimeout(900);
  const fromSet=await shown(); if(fromSet){ await pg.keyboard.press('Escape'); await pg.waitForTimeout(500); }
  ok('hub: Settings → Welcome tour shows it again',fromSet);
  await pg.goto(BASE+'index.html?welcome=1'); await pg.waitForTimeout(1200);
  ok('hub: ?welcome=1 opens it and leaves a clean address',await shown()&&!(await pg.evaluate(()=>location.search)));
  await ctx.close();
}

await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); console.log(`welcome: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

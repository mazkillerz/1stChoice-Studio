/* Backgrounds test (Restock + Photo story, 1.21.0), phone size (390x844, touch).
   1. Restock Style sheet: the Background group has 6 buttons (Plain, Fade, Glow, Dots, Lines, Grain), Plain pressed by default, every one at least 44x44.
   2. The group shows on Restock White/Cans/Split/Big words/Cream and hides on Full photo; on Photo story it shows on Arch, Caption, Poster and hides on Full, White, Whole.
   3. Pixels (Restock Cans): no value and 'plain' draw the same; fade, glow, dots, lines, grain each differ from plain and from each other; the same on a dark ground.
   4. Grain is the same every time (twice in a row, and after reloading the page).
   5. Tapping Dots sets the value, the pressed state and the recipe.
   6. Save with Dots on Cans makes the 2160x3840 PNG.
   7. Photo story Arch: every kind differs from plain.
   8. Undo/Redo keep the chosen layer chosen and the layer bar open (Restock headline, a size change).
   9. Undo that removes the chosen layer (a new text layer) closes the layer bar and clears the selection.
   10. Dark theme: the Background buttons render and the pressed one looks different from the others.
   11. No page errors.
   12. Carousel (1.22.0): the Background group for all slides, Plain = no value, Dots on every slide, Save at 2160x2700.
   Run like tests/smoke.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pngSize=async d=>{ const p=await d.path(); const x=fs.readFileSync(p); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const KINDS=['plain','fade','glow','dots','lines','grain'], LABELS=['Plain','Fade','Glow','Dots','Lines','Grain'];

/* a fresh phone on a tool; style = the remembered Restock style (the key Restock keeps) */
const mk=async({tool='restock',style,theme='light'}={})=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,colorScheme:theme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(style) await ctx.addInitScript(st=>{ try{ if(!sessionStorage.getItem('rs-init')){ sessionStorage.setItem('rs-init','1'); localStorage.setItem('studio:1stchoice:restock',JSON.stringify({style:st})); } }catch(_){} },style);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tool+': '+e.message)); pg.dls=[]; pg.on('download',d=>pg.dls.push(d));
  await pg.goto(BASE+'tools/'+tool+'.html');
  await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:15000});
  return {ctx,pg};
};
/* a hash of the preview's pixels */
const hash=pg=>pg.evaluate(()=>{ const v=document.getElementById('view'), d=v.getContext('2d').getImageData(0,0,v.width,v.height).data; let a=2166136261>>>0;
  for(let i=0;i<d.length;i+=4){ a=Math.imul(a^d[i],16777619)>>>0; a=Math.imul(a^d[i+1],16777619)>>>0; a=Math.imul(a^d[i+2],16777619)>>>0; } return a; });
/* draw, wait for fonts, the photo and the can pictures, and return the hash once it stops changing */
const settle=async pg=>{
  await pg.waitForFunction(()=>{ const s=Studio.debug.S; return s.style==='cans'||(s.photos[0]&&s.photos[0].img); },null,{timeout:15000});
  await pg.evaluate(()=>document.fonts.ready);
  let last=null, same=0;
  for(let i=0;i<30;i++){ await pg.evaluate(()=>Studio.debug.render()); await pg.waitForTimeout(250); const x=await hash(pg); if(last!==null&&x===last){ if(++same>=2) return x; } else same=0; last=x; }
  return last;
};
const set=(pg,style,vals)=>pg.evaluate(([st,v])=>{ const S=Studio.debug.S; if(st) S.style=st; for(const k in (v||{})){ if(v[k]===undefined) delete S.values[k]; else S.values[k]=v[k]; } Studio.debug.render(); },[style,vals]);
const gfxHash=async(pg,kind)=>{ await set(pg,null,{gfx:kind}); return settle(pg); };
const openStyle=async pg=>{ await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500); };
const closeStyle=async pg=>{ await pg.tap('#sh-style .done'); await pg.waitForTimeout(350); };
const groupVisible=pg=>pg.locator('[data-seg="gfx"]').isVisible();
const btns=pg=>pg.$$eval('[data-seg="gfx"] .seg',bs=>bs.map(x=>{ const r=x.getBoundingClientRect(); return {l:x.textContent.trim(),v:x.dataset.v,p:x.getAttribute('aria-pressed'),w:r.width,h:r.height}; }));

/* 1 + 2 (Restock) + 5 + 10 (light part) */
{
  const {ctx,pg}=await mk({style:'white'});
  await settle(pg); await openStyle(pg);
  const bs=await btns(pg);
  ok('Restock: Background group has Plain, Fade, Glow, Dots, Lines, Grain (in this order)',JSON.stringify(bs.map(x=>x.l))===JSON.stringify(LABELS),bs.map(x=>x.l));
  ok('Restock: Plain is pressed by default, the others are not',bs.length===6&&bs[0].p==='true'&&bs.slice(1).every(x=>x.p==='false'),bs.map(x=>x.p));
  ok('Restock: every Background button is at least 44x44',bs.length===6&&bs.every(x=>x.w>=44&&x.h>=44),bs.map(x=>Math.round(x.w)+'x'+Math.round(x.h)));
  const lbl=await pg.evaluate(()=>{ const f=document.querySelector('[data-fw="gfx"]'); return f&&f.querySelector('.lbl').textContent.trim(); });
  ok('Restock: the group is labelled Background',lbl==='Background',lbl);

  const vis={};
  for(const st of ['white','cream','cans','split','poster','photo']){ await pg.tap(`#styles [data-style="${st}"]`); await pg.waitForTimeout(250); vis[st]=await groupVisible(pg); }
  ok('Restock: Background shows on White, Cream, Cans, Split, Big words and is hidden on Full photo',['white','cream','cans','split','poster'].every(s=>vis[s])&&!vis.photo,vis);
  await pg.tap('#styles [data-style="cans"]'); await pg.waitForTimeout(300);
  ok('Restock: Background is visible on Cans',await groupVisible(pg));

  /* 5. tapping Dots */
  await pg.tap('[data-seg="gfx"] .seg[data-v="dots"]'); await pg.waitForTimeout(400);
  const d=await pg.evaluate(()=>({v:Studio.debug.S.values.gfx,rec:Studio.debug.recipe().values.gfx,dots:document.querySelector('[data-seg="gfx"] .seg[data-v="dots"]').getAttribute('aria-pressed'),plain:document.querySelector('[data-seg="gfx"] .seg[data-v="plain"]').getAttribute('aria-pressed')}));
  ok('Tapping Dots sets S.values.gfx to dots',d.v==='dots',d.v);
  ok('Tapping Dots: Dots pressed, Plain not pressed',d.dots==='true'&&d.plain==='false',d);
  ok('Tapping Dots: the recipe keeps gfx dots',d.rec==='dots',d.rec);
  await ctx.close();
}

/* 2 (Photo story) */
{
  const {ctx,pg}=await mk({tool:'photo-story'});
  await pg.waitForFunction(()=>Studio.debug.reg().length>3,null,{timeout:20000}); await pg.waitForTimeout(600);
  await openStyle(pg);
  const vis={};
  for(const st of ['arch','caption','poster','full','white','whole']){ await pg.tap(`#styles [data-style="${st}"]`); await pg.waitForTimeout(250); vis[st]=await groupVisible(pg); }
  ok('Photo story: Background shows on Arch, Caption, Poster',['arch','caption','poster'].every(s=>vis[s]),vis);
  ok('Photo story: Background is hidden on Full photo, White frame, Whole photo',['full','white','whole'].every(s=>!vis[s]),vis);
  await closeStyle(pg);

  /* 7. Arch: each kind differs from plain */
  await set(pg,'arch',{gfx:'plain'}); const base=await settle(pg), hs={plain:base};
  for(const k of KINDS.slice(1)) hs[k]=await gfxHash(pg,k);
  ok('Photo story Arch: fade, glow, dots, lines and grain each differ from plain',KINDS.slice(1).every(k=>hs[k]!==base),hs);
  await ctx.close();
}

/* 3 + 4. pixels on Restock Cans */
{
  const {ctx,pg}=await mk({style:'cans'});
  await set(pg,'cans',{bg:null}); const plain=await settle(pg);
  await set(pg,null,{gfx:undefined}); const none=await settle(pg);
  ok('Cans: no gfx value and gfx plain draw the same pixels',none===plain,{none,plain});
  const hs={plain};
  for(const k of KINDS.slice(1)) hs[k]=await gfxHash(pg,k);
  ok('Cans: fade, glow, dots, lines and grain each differ from plain',KINDS.slice(1).every(k=>hs[k]!==plain),hs);
  ok('Cans: fade, glow, dots, lines and grain differ from each other',new Set(KINDS.slice(1).map(k=>hs[k])).size===5,hs);

  /* dark ground */
  await set(pg,null,{bg:'#1c1a18',gfx:'plain'}); const dp=await settle(pg), dh={plain:dp};
  for(const k of KINDS.slice(1)) dh[k]=await gfxHash(pg,k);
  ok('Cans on a dark ground: every kind differs from plain',KINDS.slice(1).every(k=>dh[k]!==dp),dh);
  ok('Cans on a dark ground: the kinds differ from each other',new Set(KINDS.slice(1).map(k=>dh[k])).size===5,dh);

  /* 4. determinism */
  await set(pg,null,{bg:null,gfx:'grain'}); const g1=await settle(pg);
  await pg.evaluate(()=>Studio.debug.render()); await pg.waitForTimeout(300); const g2=await settle(pg);
  ok('Grain draws the same pixels every time (twice in a row)',g1===g2&&g1===hs.grain,{g1,g2,first:hs.grain});
  await pg.reload(); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:15000});
  await set(pg,'cans',{bg:null,gfx:'grain'}); const g3=await settle(pg);
  ok('Grain draws the same pixels after reloading the page',g3===g1,{before:g1,after:g3});
  await ctx.close();
}

/* 6. Save with Dots on Cans = the full-size PNG */
{
  const {ctx,pg}=await mk({style:'cans'});
  await settle(pg); await openStyle(pg);
  await pg.tap('[data-seg="gfx"] .seg[data-v="dots"]'); await pg.waitForTimeout(400);
  await closeStyle(pg); await settle(pg);
  /* after an edit the first tap on Save opens the Save sheet; Save again (on the bar) makes the picture */
  await pg.tap('#barSave'); await pg.waitForTimeout(700);
  if(!pg.dls.length) await pg.tap('#barSave');
  for(let i=0;i<60&&!pg.dls.length;i++) await pg.waitForTimeout(300);
  const sz=pg.dls[0]?await pngSize(pg.dls[0]):'';
  ok('Cans + Dots: one tap on Save makes the 2160x3840 PNG',sz==='2160x3840',sz);
  await ctx.close();
}

/* 8 + 9. Undo / Redo and the chosen layer */
{
  const {ctx,pg}=await mk({style:'white'});
  await settle(pg);
  const st=()=>pg.evaluate(()=>({sel:Studio.debug.S.sel,open:!!document.querySelector('#sh-insp.open'),name:document.getElementById('inspName').textContent.trim(),k:(Studio.debug.S.layers.head||{}).k}));
  const pick=async id=>{
    await pg.locator('#view').scrollIntoViewIfNeeded(); await pg.waitForTimeout(150);
    const bx=await pg.evaluate(id=>{ const r=Studio.debug.reg().find(x=>x.id===id&&!x.empty&&!x.hidden); return r&&{x:r.x+r.w/2,y:r.y+r.h/2,label:r.label}; },id);
    const vr=await pg.locator('#view').boundingBox(), k=vr.width/(await pg.evaluate(()=>document.getElementById('view').width));
    await pg.touchscreen.tap(vr.x+bx.x*k,vr.y+bx.y*k); await pg.waitForTimeout(450); return bx.label; };
  const headLabel=await pick('head');
  const s0=await st();
  ok('Tapping the headline selects it and opens the layer bar',s0.sel==='head'&&s0.open,s0);
  /* a size change = an undo step */
  await pg.evaluate(()=>{ const e=document.getElementById('inspSize'); e.value='1.4'; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); });
  await pg.waitForTimeout(900);
  const s1=await st();
  ok('The size change is applied (layer size 1.4)',Math.abs(s1.k-1.4)<.01,s1);
  await pg.tap('#undo'); await pg.waitForTimeout(500);
  const s2=await st();
  ok('Undo keeps the headline selected and the layer bar open, with its name',s2.sel==='head'&&s2.open&&s2.name===headLabel,{...s2,headLabel});
  ok('Undo really undid the size change',Math.abs((s2.k||1)-1)<.01,s2.k);
  await pg.tap('#redo'); await pg.waitForTimeout(500);
  const s3=await st();
  ok('Redo keeps the headline selected and the layer bar open',s3.sel==='head'&&s3.open&&s3.name===headLabel,s3);
  ok('Redo really redid the size change',Math.abs(s3.k-1.4)<.01,s3.k);

  /* 9. undo that removes the chosen layer */
  await pg.tap('#sh-insp #inspClose').catch(()=>{}); await pg.waitForTimeout(300);
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500);
  const before=await pg.evaluate(()=>Studio.debug.S.extras.length);
  await pg.tap('#addText'); await pg.waitForTimeout(500);
  const t1=await pg.evaluate(()=>({sel:Studio.debug.S.sel,n:Studio.debug.S.extras.length,open:!!document.querySelector('#sh-insp.open'),name:document.getElementById('inspName').textContent.trim()}));
  ok('Add text: the new "Your text" layer is selected with its layer bar',t1.n===before+1&&/^extra/.test(t1.sel)&&t1.open&&t1.name==='Your text',t1);
  await pg.waitForTimeout(900);
  let t2=null;
  for(let i=0;i<6;i++){
    await pg.tap('#undo'); await pg.waitForTimeout(500);
    t2=await pg.evaluate(()=>({sel:Studio.debug.S.sel,n:Studio.debug.S.extras.length,open:!!document.querySelector('#sh-insp.open')}));
    if(t2.n===before) break;
  }
  ok('Undo until the new text layer is gone: nothing is selected and the layer bar is closed',t2.n===before&&t2.sel===null&&!t2.open,t2);
  await ctx.close();
}

/* 10. dark theme: the buttons render, the pressed one looks different */
{
  const {ctx,pg}=await mk({style:'white',theme:'dark'});
  await settle(pg); await openStyle(pg);
  const dk=await pg.evaluate(()=>[...document.querySelectorAll('[data-seg="gfx"] .seg')].map(x=>{ const c=getComputedStyle(x), r=x.getBoundingClientRect(); return {p:x.getAttribute('aria-pressed'),bg:c.backgroundColor,bc:c.borderColor,col:c.color,w:r.width,h:r.height}; }));
  ok('Dark theme: 6 Background buttons render with a size',dk.length===6&&dk.every(x=>x.w>=44&&x.h>=44),dk.length);
  const on=dk.find(x=>x.p==='true'), off=dk.find(x=>x.p==='false');
  ok('Dark theme: the pressed button looks different from an unpressed one',!!on&&!!off&&(on.bg!==off.bg||on.bc!==off.bc||on.col!==off.col),{on,off});
  await ctx.close();
}

/* 12. Carousel (1.22.0): Background under Background colour for all slides; Plain by default and pixel-identical to no value;
   a finish shows on a Words-only slide, and it is the same on every slide (a setting for All slides) */
{
  const {ctx,pg}=await mk({tool:'carousel'});
  await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(300);
  await set(pg,null,{kind:'words'}); await settle(pg); await openStyle(pg);
  const bs=await btns(pg);
  ok('Carousel: Background group has the 6 finishes, Plain pressed, all at least 44x44',JSON.stringify(bs.map(x=>x.l))===JSON.stringify(LABELS)&&bs[0].p==='true'&&bs.every(x=>x.w>=44&&x.h>=44),bs);
  const order=await pg.evaluate(()=>{ const fw=[...document.querySelectorAll('#sh-style [data-fw]')].map(x=>x.dataset.fw); return {bg:fw.indexOf('bg'),gfx:fw.indexOf('gfx'),gThis:fw.indexOf('gThis')}; });
  ok('Carousel: Background sits right under Background colour, in All slides (before This slide)',order.gfx===order.bg+1&&order.gfx<order.gThis,order);
  const h0=await gfxHash(pg,undefined), hp=await gfxHash(pg,'plain');
  ok('Carousel: Plain draws exactly what an older carousel (no value) draws',h0===hp,[h0,hp]);
  await pg.tap('[data-seg="gfx"] .seg[data-v="dots"]'); await pg.waitForTimeout(400);
  const hd=await settle(pg);
  const v=await pg.evaluate(()=>({here:Studio.debug.S.values.gfx,pressed:document.querySelector('[data-seg="gfx"] .seg[data-v="dots"]').getAttribute('aria-pressed'),
    others:Studio.debug.S.P.map(p=>p.values.gfx),rec:JSON.stringify(Studio.debug.recipe&&Studio.debug.recipe()||'').includes('"gfx":"dots"')}));
  ok('Carousel: tapping Dots changes the slide and is pressed',hd!==hp&&v.here==='dots'&&v.pressed==='true',v);
  ok('Carousel: Dots is on every slide and in the recipe',v.others.length>1&&v.others.every(x=>x==='dots')&&v.rec,v);
  await closeStyle(pg);
  await pg.evaluate(()=>{ navigator.canShare=()=>false; Studio.debug.S.P.forEach(p=>p.values.kind='words'); Studio.debug.render(); });   // downloads, and no slide waits for a photo 
  await pg.tap('#barSave'); await pg.waitForTimeout(700);   // a phone: the bar's Save opens the Save sheet; Save there makes the slides
  if(!pg.dls.length) await pg.evaluate(()=>document.getElementById('save').click());
  for(let i=0;i<80&&!pg.dls.length;i++) await pg.waitForTimeout(300);
  const sz=pg.dls[0]?await pngSize(pg.dls[0]):'';
  ok('Carousel + Dots: Save makes full-size 2160x2700 slides',sz==='2160x2700',sz);
  await ctx.close();
}

await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); console.log(`backgrounds: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

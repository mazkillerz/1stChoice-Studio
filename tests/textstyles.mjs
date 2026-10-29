/* Studio 1.19.0: Text styles. In a text layer's More tab, "Save this style" keeps its look (colour, font, line options, pill,
   opacity, shadow) as a named chip on this device (max 8, no duplicates, auto-named "Style 1", "Style 2"...). Tap a chip to put
   it on the chosen layer (size and place stay, undo brings the old look back); its ... menu renames it (Arabic works, RTL),
   uses it on all text, or removes it. "Paste on all text" does the same with the copied style, one undo step for all.
   Styles are still there in the next story. Phone (touch, light + dark) and desktop. Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; let tl=Date.now(); const ok=(n,c,i)=>{ if(process.env.PROF){ console.error(Date.now()-tl,n.slice(0,60)); tl=Date.now(); } res.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[]; const t0=Date.now();
const AR='الكمية محدودة';
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  for(const theme of vp.touch?['light','dark']:['light']){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',colorScheme:theme});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const N=vp.name+(theme==='dark'?' dark':'')+': ';
  const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  const open=async()=>{ await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(vp.touch?3600:600); };
  const pick=async id=>{   // tap a layer in the preview, like a person would
    await pg.locator('#view').scrollIntoViewIfNeeded(); await pg.waitForTimeout(150);
    const bx=await pg.evaluate(id=>{ const r=Studio.debug.reg().find(x=>x.id===id&&!x.empty&&!x.hidden); return r&&{x:r.x+r.w/2,y:r.y+r.h/2}; },id);
    const vr=await pg.locator('#view').boundingBox(), k=vr.width/(await pg.evaluate(()=>document.getElementById('view').width));
    if(vp.touch) await pg.touchscreen.tap(vr.x+bx.x*k,vr.y+bx.y*k); else await pg.mouse.click(vr.x+bx.x*k,vr.y+bx.y*k);
    await pg.waitForTimeout(400); return pg.evaluate(()=>Studio.debug.S.sel); };
  const more=async()=>{ if(!(await pg.locator('#sh-insp .itab[data-part="more"]').isVisible())) return; const on=await pg.evaluate(()=>document.querySelector('#sh-insp .itab[data-part="more"]').getAttribute('aria-pressed')==='true'); if(!on){ await tap('#sh-insp .itab[data-part="more"]'); await pg.waitForTimeout(150); } };
  const vis=s=>pg.locator(s).isVisible();
  const store=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:textstyles')||'null')||[]);
  const look=(id,o)=>pg.evaluate(([id,o])=>{ const S=Studio.debug.S, l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}); Object.assign(l,o); Studio.debug.render(); },[id,o]);
  const lj=id=>pg.evaluate(id=>JSON.stringify(Studio.debug.S.layers[id]||{}),id);
  const save=async()=>{ await pg.locator('#inspSaveStyle').scrollIntoViewIfNeeded(); await tap('#inspSaveStyle'); await pg.waitForTimeout(150); };
  const A={color:'#c0392b',font:'Lalezar',align:'left',lh:1.5,op:.8,shadow:true,bg:'#161210'};
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.removeItem('studio:textstyles'); localStorage.removeItem('studio:style'); });
  await open();
  const ids=await pg.evaluate(()=>{ const R=Studio.debug.reg(); return {texts:R.filter(x=>x.kind==='text'&&x.typ&&!x.empty&&!x.hidden).map(x=>x.id),pill:(R.find(x=>x.kind==='pill'&&!x.empty&&!x.hidden)||{}).id}; });
  ok(N+'Restock has two text layers and a button to try',ids.texts.length>=2&&!!ids.pill,ids);
  const [src,dst]=ids.texts;
  // empty state
  ok(N+'tap the headline selects it',(await pick(src))===src);
  await look(src,{...A,dx:40,k:1.3}); await more();
  ok(N+'More shows the Text styles area on a text',await vis('#inspTStyles'));
  ok(N+'with no saved styles only Save this style shows',!(await vis('#tsWrap'))&&await vis('#inspSaveStyle'));
  // save
  await save();
  let st=await store();
  ok(N+'Save adds "Style 1" with the look (not size or place)',st.length===1&&st[0].name==='Style 1'&&st[0].st.color==='#c0392b'&&st[0].st.font==='Lalezar'&&st[0].st.align==='left'&&st[0].st.lh===1.5&&st[0].st.op===.8&&st[0].st.bg==='#161210'&&st[0].st.shadow===true&&st[0].st.k===undefined&&st[0].st.dx===undefined,st);
  ok(N+'the list shows with one chip',await vis('#tsWrap')&&(await pg.locator('.ts-chip').count())===1&&(await pg.locator('.ts-chip .ts-use[data-ts]').count())===1&&(await pg.locator('.ts-chip .ts-more[data-tsmore]').count())===1);
  ok(N+'the chip matching the layer is on and pressed',await pg.evaluate(()=>{ const c=document.querySelector('.ts-chip'); return c.classList.contains('on')&&c.querySelector('.ts-use').getAttribute('aria-pressed')==='true'; }));
  await save(); st=await store();
  ok(N+'saving the same look again adds no duplicate',st.length===1,st.length);
  await look(src,{color:'#2e7d32'}); await save(); st=await store();
  ok(N+'the next distinct look is "Style 2"',st.length===2&&st[1].name==='Style 2',st.map(x=>x.name));
  await look(src,A); await pg.evaluate(id=>Studio.debug.S.sel&&0,src); await tap('#inspSaveStyle'); await pg.waitForTimeout(150);
  // apply to the second text
  const before=await lj(dst);
  ok(N+'tap the second text selects it',(await pick(dst))===dst);
  await more();
  ok(N+'no chip is on for a layer with another look',await pg.evaluate(()=>!document.querySelector('.ts-chip.on')));
  const firstId=st[0].id;
  await tap(`.ts-use[data-ts="${firstId}"]`); await pg.waitForTimeout(300);
  const got=await pg.evaluate(id=>Studio.debug.S.layers[id],dst), bj=JSON.parse(before);
  ok(N+'tapping a chip gives the second text the saved look',got.color==='#c0392b'&&got.font==='Lalezar'&&got.align==='left'&&got.lh===1.5&&got.op===.8&&got.bg==='#161210'&&got.shadow===true,got);
  ok(N+'the chip keeps its own size and place',(got.k||1)===(bj.k||1)&&(got.dx||0)===(bj.dx||0),{got,bj});
  ok(N+'that chip is now on and the other is not',await pg.evaluate(id=>{ const u=document.querySelector(`.ts-use[data-ts="${id}"]`); return u.getAttribute('aria-pressed')==='true'&&u.parentElement.classList.contains('on')&&document.querySelectorAll('.ts-chip.on').length===1; },firstId));
  const sty=await pg.evaluate(()=>{ const on=document.querySelector('.ts-chip.on'), off=document.querySelector('.ts-chip:not(.on)'); const g=e=>{ const c=getComputedStyle(e); return c.borderColor+'|'+c.boxShadow+'|'+c.backgroundColor; }; return [g(on),g(off)]; });
  ok(N+'the on chip looks different from an unselected one',sty[0]!==sty[1],sty);
  await pg.waitForTimeout(600); await tap('#undo'); await pg.waitForTimeout(300);
  ok(N+'one undo brings the old look back',(await lj(dst))===before,{now:await lj(dst),before});
  // sizes and contrast and pill / shape visibility
  await pg.locator('.ts-use').first().scrollIntoViewIfNeeded();
  const sz=await pg.evaluate(()=>{ const r=s=>{ const q=document.querySelector(s).getBoundingClientRect(); return {w:q.width,h:q.height}; }; return {use:r('.ts-use'),more:r('.ts-more'),save:r('#inspSaveStyle')}; });
  ok(N+'chip, ⋯ and Save are at least 44px tall, ⋯ 44px wide',sz.use.h>=44&&sz.more.h>=44&&sz.more.w>=44&&sz.save.h>=44,sz);
  if(!vp.touch){ await pg.mouse.move(2,2); await pg.waitForTimeout(250); }
  const cr=await pg.evaluate(()=>{ const lum=c=>{ const m=c.match(/[\d.]+/g).map(Number); const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]); };
    const bgOf=el=>{ while(el){ const c=getComputedStyle(el).backgroundColor; if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; el=el.parentElement; } return 'rgb(255,255,255)'; };
    const col=e=>{ const n=e.querySelector('.ts-name')||e; return getComputedStyle(n).color; };
    return [document.querySelector('.ts-chip:not(.on) .ts-use'),document.getElementById('inspSaveStyle')].map(e=>{ const a=lum(col(e)), z=lum(bgOf(e)); return +((Math.max(a,z)+.05)/(Math.min(a,z)+.05)).toFixed(2); }); });
  ok(N+'chip and Save text contrast >= 4.5',cr.every(v=>v>=4.5),cr);
  // menu: rename in Arabic
  await tap(`.ts-more[data-tsmore="${firstId}"]`); await pg.waitForTimeout(250);
  ok(N+'the ⋯ button opens the style menu',await vis('dialog.ts-menu'));
  ok(N+'the name box holds the current name, dir=auto',await pg.evaluate(()=>{ const i=document.getElementById('tsName'); return i.value==='Style 1'&&i.getAttribute('dir')==='auto'; }));
  ok(N+'the menu offers Use on all text, Remove, Cancel, Done',await vis('.act-row[data-tsact="all"]')&&await vis('.act-row[data-tsact="del"]')&&await vis('#tsX')&&(await pg.locator('dialog.ts-menu button[type=submit]').innerText()).trim()==='Done');
  await pg.fill('#tsName',AR);
  ok(N+'the name box is right-to-left for Arabic',await pg.evaluate(()=>document.getElementById('tsName').matches(':dir(rtl)')||getComputedStyle(document.getElementById('tsName')).direction==='rtl'));
  await tap('dialog.ts-menu button[type=submit]'); await pg.waitForTimeout(250);
  st=await store();
  ok(N+'Done stores the Arabic name',st[0].name===AR,st[0].name);
  ok(N+'the menu closed',!(await vis('dialog.ts-menu')));
  ok(N+'the chip reads right-to-left (dir=auto, direction rtl)',await pg.evaluate(id=>{ const u=document.querySelector(`.ts-use[data-ts="${id}"]`); return u.getAttribute('dir')==='auto'&&(u.matches(':dir(rtl)')||getComputedStyle(u).direction==='rtl'); },firstId));
  // cancel keeps name
  await tap(`.ts-more[data-tsmore="${firstId}"]`); await pg.waitForTimeout(150); await pg.fill('#tsName','Zzz'); await tap('#tsX'); await pg.waitForTimeout(150);
  ok(N+'Cancel leaves the name alone',(await store())[0].name===AR&&!(await vis('dialog.ts-menu')));
  // Use on all text from the menu (one undo)
  const snap=async()=>{ const o={}; for(const id of ids.texts) o[id]=await lj(id); return o; };
  const b0=await snap(); const pillBefore=await lj(ids.pill);
  await tap(`.ts-more[data-tsmore="${firstId}"]`); await pg.waitForTimeout(150); await tap('.act-row[data-tsact="all"]'); await pg.waitForTimeout(450);
  const a0=await snap();
  ok(N+'Use on all text gives every text the saved look, keeps own size and place',await pg.evaluate(ids=>ids.every(id=>{ const l=Studio.debug.S.layers[id]; return l.color==='#c0392b'&&l.font==='Lalezar'&&l.bg==='#161210'&&l.op===.8; }),ids.texts));
  ok(N+'sizes and places stayed',ids.texts.every(id=>{ const x=JSON.parse(a0[id]), y=JSON.parse(b0[id]); return (x.k||1)===(y.k||1)&&(x.dx||0)===(y.dx||0); }));
  ok(N+'a button is not changed by Use on all text',(await lj(ids.pill))===pillBefore);
  await pg.waitForTimeout(600); await tap('#undo'); await pg.waitForTimeout(300);
  const u0=await snap();
  ok(N+'a single undo restores all texts',ids.texts.every(id=>u0[id]===b0[id]),{u0,b0});
  // Paste on all text
  await tap('#inspClose').catch(()=>{}); await pg.waitForTimeout(150);
  ok(N+'tap the headline again',(await pick(src))===src); await more();
  ok(N+'Paste on all text is hidden until something is copied',!(await vis('#inspPasteAll')));
  await look(src,{...A,color:'#1f6f8b'}); await tap('#inspCopyStyle'); await pg.waitForTimeout(150);
  ok(N+'Paste on all text shows after copying (2+ texts)',await vis('#inspPasteAll'));
  const ph=await pg.locator('#inspPasteAll').boundingBox(); ok(N+'Paste on all text is at least 44px tall',ph.height>=44,Math.round(ph.height));
  ok(N+'tap the second text',(await pick(dst))===dst); await more();
  const c0=await snap(); const p0=await lj(ids.pill);
  await tap('#inspPasteAll'); await pg.waitForTimeout(450);
  const c1=await snap();
  ok(N+'Paste on all text gives every text the copied look',await pg.evaluate(ids=>ids.every(id=>{ const l=Studio.debug.S.layers[id]; return l.color==='#1f6f8b'&&l.font==='Lalezar'&&l.align==='left'&&l.bg==='#161210'; }),ids.texts));
  ok(N+'each text keeps its own size and place',ids.texts.every(id=>{ const x=JSON.parse(c1[id]), y=JSON.parse(c0[id]); return (x.k||1)===(y.k||1)&&(x.dx||0)===(y.dx||0); }));
  ok(N+'the button is not changed',(await lj(ids.pill))===p0);
  await pg.waitForTimeout(600); await tap('#undo'); await pg.waitForTimeout(300);
  const c2=await snap();
  ok(N+'a single undo restores every text',ids.texts.every(id=>c2[id]===c0[id]),{c2,c0});
  // button shows the area, shape hides it
  await tap('#inspClose').catch(()=>{}); await pg.waitForTimeout(150);
  ok(N+'tap the button',(await pick(ids.pill))===ids.pill); await more();
  ok(N+'a button also shows Text styles',await vis('#inspTStyles'));
  await tap('#inspClose').catch(()=>{}); await pg.waitForTimeout(150);
  if(vp.touch){ await tap('#bar [data-open="layers"]'); await pg.waitForTimeout(250); }
  await pg.evaluate(()=>document.getElementById('addAsset').scrollIntoView({block:'center'}));
  await tap('#addAsset'); await pg.waitForTimeout(300); await tap('#assetList [data-asset="shape:rect"]'); await pg.waitForTimeout(300);
  await more();
  ok(N+'a shape hides Text styles',!(await vis('#inspTStyles')));
  // remove
  await tap('#inspClose').catch(()=>{}); await pg.waitForTimeout(150);
  ok(N+'tap the headline for remove test',(await pick(src))===src); await more();
  // persist into a new story
  await open(); await pick(src); await more();
  ok(N+'saved styles are still there in a new story',await vis('#tsWrap')&&(await pg.locator('.ts-chip').count())===(await store()).length&&(await store()).length>=2);
  // 8 max
  st=await store(); const cols=['#111111','#222222','#333333','#444444','#555555','#666666','#777777','#888888'];
  await pg.evaluate(c=>{ const l=JSON.parse(localStorage.getItem('studio:textstyles')); while(l.length<7) l.push({id:'seed'+l.length,name:'Seed '+l.length,st:{color:c[l.length],font:'Lalezar'},at:Date.now()}); localStorage.setItem('studio:textstyles',JSON.stringify(l)); },cols);
  await look(src,{color:'#101010'}); await save();
  st=await store(); ok(N+'eight styles can be saved',st.length===8,st.length);
  await look(src,{color:'#abcdef'}); await save(); st=await store();
  ok(N+'a ninth is not added',st.length===8&&!st.some(x=>x.st.color==='#abcdef'),st.length);
  // 360 wide
  if(vp.touch&&theme==='light'){
    await pg.setViewportSize({width:360,height:740}); await pg.waitForTimeout(300);
    await pg.locator('#tsWrap').scrollIntoViewIfNeeded();
    const w=await pg.evaluate(()=>{ const d=document.documentElement, wr=document.getElementById('tsWrap').getBoundingClientRect(); const sh=document.getElementById('sh-insp').getBoundingClientRect(); const chips=[...document.querySelectorAll('.ts-chip')].map(c=>c.getBoundingClientRect()); return {sw:d.scrollWidth,iw:innerWidth,inside:chips.every(c=>c.right<=innerWidth+1&&c.left>=-1&&c.right<=sh.right+1),rows:new Set(chips.map(c=>Math.round(c.top))).size}; });
    ok(N+'at 360px with 8 styles there is no sideways scroll and chips wrap inside the sheet',w.sw<=w.iw+1&&w.inside&&w.rows>=2,w);
    await pg.setViewportSize({width:vp.width,height:vp.height}); await pg.waitForTimeout(150);
  }
  // remove each style
  if((await pg.evaluate(()=>Studio.debug.S.sel))!==src) await pick(src); await more();
  let goneOk=true, n=(await store()).length, lap=0;
  while(n>0){ const tid=(await store())[0].id;
    if(n>2&&lap===2){ await pg.evaluate(()=>{ const l=JSON.parse(localStorage.getItem('studio:textstyles')); localStorage.setItem('studio:textstyles',JSON.stringify(l.slice(0,1))); }); await tap('#inspClose'); await pick(src); await more(); n=1; continue; }
    await pg.locator(`.ts-more[data-tsmore="${tid}"]`).scrollIntoViewIfNeeded(); await tap(`.ts-more[data-tsmore="${tid}"]`); await pg.waitForTimeout(150); await tap('.act-row[data-tsact="del"]'); await pg.waitForTimeout(150); lap++;
    const s2=await store(); if(s2.length!==n-1||s2.some(x=>x.id===tid)||(await pg.locator(`[data-ts="${tid}"]`).count())) goneOk=false; n=s2.length; }
  ok(N+'Remove takes the style out of storage and the list',goneOk);
  ok(N+'removing the last one hides the list again',!(await vis('#tsWrap'))&&await vis('#inspSaveStyle'));
  if(theme==='light'&&vp.touch) await pg.screenshot({path:'/tmp/textstyles-phone.png'}).catch(()=>{});
  await ctx.close();
  }
}
await b.close();
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
res.forEach(r=>console.log(r)); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`textstyles: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);

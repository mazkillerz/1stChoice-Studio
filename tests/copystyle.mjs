/* Studio 1.7.0: Copy style / Paste style. In a layer's More tab, "Copy style" keeps the look of that layer (colour, font,
   line options, shadow, background pill, opacity, a shape's outline) on this device; "Paste style" (shown once something
   was copied) puts it on the chosen layer. Size, place and rotation stay. Undo brings the old look back. The copied style
   is still there in the next story. Phone (touch) and desktop. Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[]; const t0=Date.now();
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
  const more=async()=>{ if(!(await pg.locator('#sh-insp .itab[data-part="more"]').isVisible())) return; const on=await pg.evaluate(()=>document.querySelector('#sh-insp .itab[data-part="more"]').getAttribute('aria-pressed')==='true'); if(!on){ await tap('#sh-insp .itab[data-part="more"]'); await pg.waitForTimeout(300); } };
  const vis=s=>pg.locator(s).isVisible();
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.removeItem('studio:style'));
  await open();
  const ids=await pg.evaluate(()=>{ const R=Studio.debug.reg(); return {texts:R.filter(x=>x.kind==='text'&&x.typ&&!x.empty&&!x.hidden).map(x=>x.id),pill:(R.find(x=>x.kind==='pill'&&!x.empty&&!x.hidden)||{}).id}; });
  ok(N+'Restock has two text layers and a button to try',ids.texts.length>=2&&!!ids.pill,ids);
  const [src,dst]=ids.texts;
  ok(N+'tap the headline selects it',(await pick(src))===src);
  await pg.evaluate(id=>{ const S=Studio.debug.S, l=S.layers[id]||(S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}); Object.assign(l,{color:'#c0392b',font:'Lalezar',align:'left',lh:1.5,op:.8,shadow:true,bg:'#161210',dx:40,k:1.3}); Studio.debug.render(); },src);
  await more();
  ok(N+'More shows Copy style',await vis('#inspCopyStyle'));
  ok(N+'Paste style is hidden until something is copied',!(await vis('#inspPasteStyle')));
  await pg.locator('#inspCopyStyle').scrollIntoViewIfNeeded(); const cb=await pg.locator('#inspCopyStyle').boundingBox(); ok(N+'Copy style is at least 44px tall',cb.height>=44,Math.round(cb.height));
  await tap('#inspCopyStyle'); await pg.waitForTimeout(300);
  const kept=await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:style')||'null'));
  ok(N+'Copy style keeps colour, font, line options, pill and opacity (not size or place)',kept&&kept.color==='#c0392b'&&kept.font==='Lalezar'&&kept.align==='left'&&kept.lh===1.5&&kept.op===.8&&kept.bg==='#161210'&&kept.shadow===true&&kept.k===undefined&&kept.dx===undefined,kept);
  ok(N+'Paste style shows after copying',await vis('#inspPasteStyle'));
  const cb2=await pg.locator('#inspCopyStyle').boundingBox(); const pb=await pg.locator('#inspPasteStyle').boundingBox(); ok(N+'Copy and Paste sit side by side, same height',Math.abs(pb.y-cb2.y)<2&&Math.abs(pb.height-cb2.height)<1,{cb2,pb});
  // paste onto the second text
  const before=await pg.evaluate(id=>JSON.stringify(Studio.debug.S.layers[id]||{}),dst);
  ok(N+'tap the second text selects it',(await pick(dst))===dst);
  await more(); ok(N+'Paste style is offered on the next layer',await vis('#inspPasteStyle'));
  await tap('#inspPasteStyle'); await pg.waitForTimeout(400);
  const got=await pg.evaluate(id=>Studio.debug.S.layers[id],dst);
  ok(N+'Paste style gives the second text the same look',got.color==='#c0392b'&&got.font==='Lalezar'&&got.align==='left'&&got.lh===1.5&&got.op===.8&&got.bg==='#161210'&&got.shadow===true,got);
  ok(N+'Paste style keeps its own size and place',(got.k||1)===(JSON.parse(before).k||1)&&(got.dx||0)===(JSON.parse(before).dx||0),{got,before});
  const drawn=await pg.evaluate(id=>{ const r=Studio.debug.reg().find(x=>x.id===id); return r&&!r.empty; },dst); ok(N+'the pasted text still draws',drawn);
  // undo
  await pg.waitForTimeout(600); await tap('#undo'); await pg.waitForTimeout(500);
  const und=await pg.evaluate(id=>Studio.debug.S.layers[id]||{},dst);
  ok(N+'Undo brings the old look back',und.color!=='#c0392b'&&und.bg!=='#161210',und);
  // a button (pill) takes the colour and font only
  if((await pg.evaluate(()=>Studio.debug.S.sel))) { await tap('#inspClose'); await pg.waitForTimeout(300); }
  ok(N+'tap the button selects it',(await pick(ids.pill))===ids.pill);
  await more(); await tap('#inspPasteStyle'); await pg.waitForTimeout(400);
  const pl=await pg.evaluate(id=>Studio.debug.S.layers[id],ids.pill);
  ok(N+'a button takes the colour, font and opacity, not text-only line options',pl.color==='#c0392b'&&pl.font==='Lalezar'&&pl.op===.8&&pl.align===undefined&&pl.bg===undefined,pl);
  await tap('#inspClose'); await pg.waitForTimeout(300);
  // shapes: outline + corners travel too
  if(vp.touch){ await tap('#bar [data-open="layers"]'); await pg.waitForTimeout(400); }
  await pg.evaluate(()=>document.getElementById('addAsset').scrollIntoView({block:'center'}));
  await tap('#addAsset'); await pg.waitForTimeout(500); await tap('#assetList [data-asset="shape:rect"]'); await pg.waitForTimeout(500);
  const s1=await pg.evaluate(()=>Studio.debug.S.sel);
  await pg.evaluate(id=>{ const x=Studio.debug.S.extras.find(e=>e.id===id); Object.assign(x,{stroke:'#c0392b',sw:12,r:40}); Studio.debug.S.layers[id]={dx:0,dy:0,k:1,color:'#F3EADC',hidden:false}; Studio.debug.render(); },s1);
  await more(); await tap('#inspCopyStyle'); await pg.waitForTimeout(300);
  await tap('#inspDup'); await pg.waitForTimeout(400);
  const s2=await pg.evaluate(()=>Studio.debug.S.sel);
  await pg.evaluate(id=>{ const x=Studio.debug.S.extras.find(e=>e.id===id); Object.assign(x,{stroke:null,sw:0,r:0}); Studio.debug.S.layers[id]={dx:0,dy:0,k:1,color:null,hidden:false}; Studio.debug.render(); },s2);
  await more(); await tap('#inspPasteStyle'); await pg.waitForTimeout(400);
  const sx=await pg.evaluate(id=>({x:Studio.debug.S.extras.find(e=>e.id===id),l:Studio.debug.S.layers[id]}),s2);
  ok(N+'a shape takes fill, outline and corners',s2!==s1&&sx.x.stroke==='#c0392b'&&sx.x.sw===12&&sx.x.r===40&&sx.l.color==='#F3EADC',sx);
  // contrast of the two buttons in this theme
  if(!vp.touch){ await pg.mouse.move(2,2); await pg.waitForTimeout(250); }
  const cr=await pg.evaluate(()=>{ const lum=c=>{ const m=c.match(/[\d.]+/g).map(Number); const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]); };
    const bgOf=el=>{ while(el){ const c=getComputedStyle(el).backgroundColor; if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; el=el.parentElement; } return 'rgb(255,255,255)'; };
    return ['inspCopyStyle','inspPasteStyle'].map(id=>{ const e=document.getElementById(id), a=lum(getComputedStyle(e).color), z=lum(bgOf(e)); return +((Math.max(a,z)+.05)/(Math.min(a,z)+.05)).toFixed(2); }); });
  ok(N+'Copy / Paste style text contrast >= 4.5',cr.every(v=>v>=4.5),cr);
  // the next story still offers it
  await open(); await pick(dst); await more();
  ok(N+'the copied style is still there in a new story',await vis('#inspPasteStyle'));
  if(theme==='light'&&vp.touch) await pg.screenshot({path:'/tmp/copystyle-phone.png'}).catch(()=>{});
  await ctx.close();
  }
}
await b.close();
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
res.forEach(r=>console.log(r)); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`copystyle: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);

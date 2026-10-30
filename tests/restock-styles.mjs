/* Restock styles test, phone size (390x844, touch).
   1. Compatibility: White, Cream and Full photo with default values draw exactly the same pixels as the old tools/restock.js (from git HEAD).
   2. Every new style (Cans, Split, Big words) draws, is not blank, and has its style button.
   3. Cans: no photo (note in the Photo sheet, no "Add your photo"), a 'cans' layer, the right can for the flavours picked.
   4. Opened fresh on Cans (remembered style): one tap on Save makes the 2160x3840 PNG.
   5. Cans + "Use a photo instead": switches to White and opens the photo picker.
   6. Photo shape, Headline size and Button colour change the picture; the photo stays draggable in a circle; options show only where they matter.
   7. Headline, flavours, small line, button and logo stay inside y 250..1620 in every style.
   8. A dark background colour turns the words light in every style that has the colour.
   Run like tests/smoke.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const REPO=new URL('../',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OLD=execFileSync('git',['-C',REPO,'show','HEAD:tools/restock.js'],{encoding:'utf8'});
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pngSize=async d=>{ const p=await d.path(); const x=fs.readFileSync(p); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

/* a fresh phone; oldFile = serve the old restock.js; style = the remembered style (the key Restock keeps) */
const mk=async({oldFile,style}={})=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,colorScheme:'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(oldFile) await ctx.route('**/tools/restock.js',r=>r.fulfill({contentType:'application/javascript',body:OLD}));
  if(style) await ctx.addInitScript(st=>{ try{ if(!sessionStorage.getItem('rs-init')){ sessionStorage.setItem('rs-init','1'); localStorage.setItem('studio:1stchoice:restock',JSON.stringify({style:st})); } }catch(_){} },style);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); pg.dls=[]; pg.on('download',d=>pg.dls.push(d));
  await pg.goto(BASE+'tools/restock.html');
  await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S,null,{timeout:15000});
  return {ctx,pg};
};
/* a hash of the preview's pixels, and how much of it is not the ground colour */
const hash=pg=>pg.evaluate(()=>{ const v=document.getElementById('view'), d=v.getContext('2d').getImageData(0,0,v.width,v.height).data; let a=2166136261>>>0, n=0;
  for(let i=0;i<d.length;i+=4){ a=Math.imul(a^d[i],16777619)>>>0; a=Math.imul(a^d[i+1],16777619)>>>0; a=Math.imul(a^d[i+2],16777619)>>>0; if(Math.abs(d[i]-d[0])+Math.abs(d[i+1]-d[1])+Math.abs(d[i+2]-d[2])>24) n++; }
  return {h:a,ink:n/(d.length/4)}; });
/* draw, wait for fonts, the photo and the can pictures, and return the hash once it stops changing */
const settle=async pg=>{
  await pg.waitForFunction(()=>{ const s=Studio.debug.S; return s.style==='cans'||(s.photos[0]&&s.photos[0].img); },null,{timeout:15000});
  await pg.evaluate(()=>document.fonts.ready);
  let last=null, same=0;
  for(let i=0;i<30;i++){ await pg.evaluate(()=>Studio.debug.render()); await pg.waitForTimeout(300); const x=await hash(pg); if(last&&x.h===last.h){ if(++same>=2) return x; } else same=0; last=x; }
  return last;
};
const set=(pg,style,vals)=>pg.evaluate(([st,v])=>{ const S=Studio.debug.S; if(st) S.style=st; Object.assign(S.values,v||{}); Studio.debug.render(); },[style,vals]);
const reg=pg=>pg.evaluate(()=>Studio.debug.reg().map(r=>({id:r.id,label:r.label,x:r.x,y:r.y,w:r.w,h:r.h,empty:!!r.empty,hidden:!!r.hidden,photo:r.photo,kind:r.kind})));

/* 1. same pixels as the old file for the three original looks */
for(const st of ['white','cream','photo']){
  const a=await mk({style:st}), o=await mk({style:st,oldFile:true});
  await Promise.all([a.pg,o.pg].map(p=>p.waitForTimeout(1200)));   // fonts and can pictures finish loading (1 in ~3 runs measured too early)
  let [hn,ho]=[await settle(a.pg),await settle(o.pg)];
  for(let t=0;t<2&&hn.h!==ho.h;t++){ await a.pg.waitForTimeout(1500); [hn,ho]=[await settle(a.pg),await settle(o.pg)]; }   // a real difference stays
  ok('compatible: '+st+' looks exactly like before',hn.h===ho.h&&hn.ink>.02,{new:hn.h,old:ho.h,ink:+hn.ink.toFixed(2)});
  await a.ctx.close(); await o.ctx.close();
}

/* 2 + 7 + 8. every style: draws, not blank, button exists, words inside the story's safe zone, a dark ground */
{
  const {ctx,pg}=await mk();
  const styles=await pg.$$eval('[data-style]',bs=>bs.map(x=>x.dataset.style));
  ok('style buttons: White, Cream, Full photo, Cans, Split, Big words (in this order)',JSON.stringify(styles)===JSON.stringify(['white','cream','photo','cans','split','poster']),styles);
  const n0=errs.length;
  for(const st of styles){
    await set(pg,st,{shape:'rounded',hsize:'medium',btn:null,bg:null});
    const x=await settle(pg), r=await reg(pg);
    const words=r.filter(q=>['head','flav','small','pill','logo'].includes(q.id)&&!q.empty&&!q.hidden);
    const bad=words.filter(q=>q.y<249.5||q.y+q.h>1620.5).map(q=>q.id+' '+Math.round(q.y)+'..'+Math.round(q.y+q.h));
    ok(st+': draws, not blank',x.ink>.03,{ink:+x.ink.toFixed(2)});
    ok(st+': headline, flavours, small line, button and logo inside y 250..1620',words.length>=5&&!bad.length,bad.length?bad:words.length+' layers');
    /* the longer headline at Large too */
    const head0=await pg.evaluate(()=>Studio.debug.S.values.head);
    await set(pg,null,{head:{pick:'وفرنا كمية جديدة',own:''},hsize:'large'});
    await settle(pg); const r2=await reg(pg), w2=r2.filter(q=>['head','flav','small','pill','logo'].includes(q.id)&&!q.empty&&!q.hidden);
    const bad2=w2.filter(q=>q.y<249.5||q.y+q.h>1620.5).map(q=>q.id+' '+Math.round(q.y)+'..'+Math.round(q.y+q.h));
    ok(st+': Large headline (longer phrase) stays inside y 250..1620',!bad2.length,bad2);
    await set(pg,null,{head:head0,hsize:'medium'});
  }
  /* a dark ground: the headline turns light, the logo too (every style that has the colour) */
  for(const st of ['white','cream','cans','split','poster']){
    await set(pg,st,{bg:'#161210'}); await settle(pg);
    const dk=await pg.evaluate(()=>{ const v=document.getElementById('view'), c=v.getContext('2d'), H=Studio.debug.reg().find(r=>r.id==='head'), d=c.getImageData(Math.round(H.x),Math.round(H.y),Math.round(H.w),Math.round(H.h)).data; let light=0,tot=0;
      for(let i=0;i<d.length;i+=4){ tot++; if(d[i]>200&&d[i+1]>200&&d[i+2]>200) light++; } const g=c.getImageData(5,1900,1,1).data; return {ground:g[0]+g[1]+g[2],light:light/tot}; });
    ok(st+': a dark background turns the headline light',dk.ground<120&&dk.light>.1,dk);
  }
  await set(pg,'white',{bg:null});
  ok('no page errors while drawing every style',errs.length===n0,errs.slice(n0));
  await ctx.close();
}

/* 3. Cans: no photo, a 'cans' layer, the can follows the flavours picked */
{
  const {ctx,pg}=await mk({style:'cans'});
  await settle(pg);
  await pg.tap('#bar [data-open="photo"]'); await pg.waitForTimeout(500);
  const ph=await pg.evaluate(()=>({note:!!document.querySelector('#slots .no-photo')&&document.querySelector('#slots .no-photo').offsetParent!==null,text:(document.querySelector('#slots .no-photo')||{}).textContent||'',boxes:document.querySelectorAll('#slots .slot').length,cta:document.getElementById('ctaPhoto').hidden||getComputedStyle(document.getElementById('ctaPhoto')).display==='none',hint:document.getElementById('hint').textContent}));
  ok('Cans: the Photo sheet says no photo is needed, no photo box, no "Add your photo"',ph.note&&/no photo is needed/.test(ph.text)&&ph.boxes===0&&ph.cta,ph);
  ok('Cans: the hint under the preview says no photo is needed',/No photo needed/.test(ph.hint),ph.hint);
  await pg.tap('#sh-photo .done'); await pg.waitForTimeout(350);
  /* the picture's name (e.g. "Classic + shadow"), once the can picture is in */
  const label=async()=>{ for(let i=0;i<24;i++){ const c=(await reg(pg)).find(q=>q.id==='cans'&&!q.empty&&q.label!=='Cans'); if(c) return c.label; await pg.waitForTimeout(250); } return null; };
  const first=await label();
  ok("Cans: there is a movable 'cans' layer, the pair when both flavours are picked",first==='Both + shadow',first);
  const pick=async v=>{ await pg.evaluate(v=>{ Studio.debug.S.values.flav.picks=v; Studio.debug.render(); },v); await pg.waitForTimeout(500); return label(); };
  ok('Cans: only Classic picked gives the Classic can',await pick(['classic'])==='Classic + shadow');
  ok('Cans: only Passion fruit picked gives the Passion fruit can',await pick(['passion'])==='Passion + shadow');
  ok('Cans: no flavour picked gives the pair',await pick([])==='Both + shadow');
  ok('Cans: both picked gives the pair',await pick(['classic','passion'])==='Both + shadow');
  /* the real buttons: Words > Flavours (tapping Passion fruit takes it off) */
  await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(500);
  await pg.tap('#sh-words [data-mf="flav"] .chip[data-v="passion"]'); await pg.waitForTimeout(500);
  const ui=await label();
  ok('Cans: tapping Passion fruit in Words > Flavours leaves the Classic can',ui==='Classic + shadow',ui);
  /* the cans are a layer like any other: drag them and they move */
  await pg.tap('#sh-words .done'); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ Studio.debug.S.values.flav.picks=['classic','passion']; Studio.debug.render(); }); await label();
  const cb=(await reg(pg)).find(q=>q.id==='cans'&&!q.empty), vb=await pg.locator('#view').boundingBox(), kk=vb.width/1080, cx0=vb.x+(cb.x+cb.w/2)*kk, cy0=vb.y+(cb.y+cb.h/2)*kk;
  await pg.mouse.move(cx0,cy0); await pg.mouse.down(); await pg.mouse.move(cx0+30,cy0+40,{steps:6}); await pg.mouse.up(); await pg.waitForTimeout(500);
  const moved=await pg.evaluate(()=>{ const l=Studio.debug.S.layers.cans; return l&&Math.round(l.dx)+','+Math.round(l.dy); });
  const cb2=(await reg(pg)).find(q=>q.id==='cans'&&!q.empty&&q.label!=='Cans');
  ok('Cans: dragging the cans moves them as a layer',!!moved&&moved!=='0,0'&&cb2.y>cb.y,{moved,from:Math.round(cb.y),to:Math.round(cb2.y)});
  const rec=await pg.evaluate(()=>JSON.stringify(Studio.debug.recipe()));
  ok('Cans: the style is kept in the design (recipe)',/"style":"cans"/.test(rec)&&/"shape":"rounded"/.test(rec)&&/"hsize":"medium"/.test(rec));
  await ctx.close();
}

/* 4. opened fresh on Cans: one tap on Save = the full-size PNG */
{
  const {ctx,pg}=await mk({style:'cans'});
  await pg.waitForTimeout(2500);
  await pg.tap('#barSave');
  for(let i=0;i<60&&!pg.dls.length;i++) await pg.waitForTimeout(300);
  const sz=pg.dls[0]?await pngSize(pg.dls[0]):'';
  ok('Cans, opened fresh: one tap on Save makes the 2160x3840 PNG',sz==='2160x3840',sz);
  if(pg.dls[0]){ /* the can pictures are in the saved PNG (the middle of the panel is not the ground colour) */
    const buf=fs.readFileSync(await pg.dls[0].path()); const png=await pg.evaluate(async b64=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(Math.round(im.width*.3),Math.round(im.height*.43),Math.round(im.width*.4),Math.round(im.height*.12)).data; let dark=0; for(let i=0;i<d.length;i+=4) if(d[i]<90) dark++; return dark/(d.length/4); },buf.toString('base64'));
    ok('Cans, saved PNG: the HD cans are drawn (dark can bodies in the panel)',png>.08,+png.toFixed(2));
  }
  await ctx.close();
}

/* 5. Cans + "Use a photo instead": switches to White and opens the photo picker */
{
  const {ctx,pg}=await mk({style:'cans'});
  await settle(pg);
  await pg.tap('#bar [data-open="photo"]'); await pg.waitForTimeout(500);
  ok('Cans: "Use a photo instead" is in the Photo sheet',await pg.locator('#usePhotoStyle').isVisible());
  const [fc]=await Promise.all([pg.waitForEvent('filechooser',{timeout:8000}),pg.tap('#usePhotoStyle')]);
  const st=await pg.evaluate(()=>Studio.debug.S.style);
  ok('Cans: "Use a photo instead" switches to White and opens the picker',st==='white'&&!!fc,st);
  await fc.setFiles(S+'pair.jpg'); await pg.waitForTimeout(1500);
  const real=await pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length);
  ok('Cans: the photo lands in White',real===1&&await pg.evaluate(()=>Studio.debug.S.style)==='white',real);
  await ctx.close();
}

/* 5b. adding a photo while on Cans (Quick start / share / drop) switches to White by itself */
{
  const {ctx,pg}=await mk({style:'cans'});
  await settle(pg);
  await pg.evaluate(async()=>{ const r=await fetch('/brands/1stchoice/samples/pair.jpg'), f=new File([await r.blob()],'pair.jpg',{type:'image/jpeg'}), dt=new DataTransfer(); dt.items.add(f); document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true})); });
  await pg.waitForTimeout(1500);
  ok('Cans: a photo pasted in switches to White and shows',await pg.evaluate(()=>Studio.debug.S.style==='white'&&Studio.debug.S.photos[0].img&&!Studio.debug.S.photos[0].sample));
  await ctx.close();
}

/* 6. shape, headline size, button colour; the options show only where they matter; the photo stays draggable in a circle */
{
  const {ctx,pg}=await mk();
  const base=await settle(pg);
  const vis=async id=>pg.evaluate(id=>{ const e=document.querySelector(`[data-fw="${id}"]`); return !!e&&!e.hidden; },id);
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500);
  const f1=[await vis('bg'),await vis('shape'),await vis('hsize'),await vis('btn'),await vis('place')];
  ok('White: Style sheet shows colour, shape, headline size and button colour (not words place)',JSON.stringify(f1)==='[true,true,true,true,false]',f1);
  await pg.tap('[data-seg="shape"] .seg[data-v="circle"]'); await pg.waitForTimeout(300);
  const circle=await settle(pg);
  ok('Photo shape Circle changes the picture',circle.h!==base.h);
  await pg.tap('[data-seg="shape"] .seg[data-v="arch"]'); const arch=await settle(pg);
  await pg.tap('[data-seg="shape"] .seg[data-v="square"]'); const sq=await settle(pg);
  ok('Arch and Square change the picture and differ from each other',arch.h!==base.h&&sq.h!==base.h&&arch.h!==sq.h&&arch.h!==circle.h&&sq.h!==circle.h);
  await pg.tap('[data-seg="shape"] .seg[data-v="rounded"]'); const back=await settle(pg);
  ok('Rounded brings today\'s picture back',back.h===base.h);
  await pg.tap('[data-seg="hsize"] .seg[data-v="small"]'); const sm=await settle(pg);
  await pg.tap('[data-seg="hsize"] .seg[data-v="large"]'); const lg=await settle(pg);
  ok('Headline size Small and Large change the picture',sm.h!==base.h&&lg.h!==base.h&&sm.h!==lg.h);
  await pg.tap('[data-seg="hsize"] .seg[data-v="medium"]'); await settle(pg);
  const sw=await pg.evaluate(()=>document.querySelectorAll('#sh-style [data-pal="f:btn"] [data-c]').length);
  await pg.tap('#sh-style [data-pal="f:btn"] [data-c="#F6C040"]'); const bc=await settle(pg);
  ok('Button colour: tapping a colour in the Style sheet changes the picture',bc.h!==base.h&&await pg.evaluate(()=>Studio.debug.S.values.btn)==='#F6C040',sw+' swatches');
  await set(pg,null,{btn:null}); await pg.tap('#sh-style .done'); await pg.waitForTimeout(350);
  /* the photo is still a photo layer: dragging it in a circle moves it */
  await pg.setInputFiles('#pick',S+'pair.jpg'); await pg.waitForFunction(()=>Studio.debug.S.photos[0].img&&!Studio.debug.S.photos[0].sample,null,{timeout:10000});
  await set(pg,null,{shape:'circle'}); await settle(pg);
  const box=(await reg(pg)).find(q=>q.photo===0);
  const v=await pg.locator('#view').boundingBox(), k=v.width/1080, cx=v.x+(box.x+box.w/2)*k, cy=v.y+(box.y+box.h/2)*k;
  const o0=await pg.evaluate(()=>({ox:Studio.debug.S.photos[0].ox,oy:Studio.debug.S.photos[0].oy}));
  await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx+45,cy+10,{steps:6}); await pg.mouse.up(); await pg.waitForTimeout(400);
  const o1=await pg.evaluate(()=>({ox:Studio.debug.S.photos[0].ox,oy:Studio.debug.S.photos[0].oy}));
  ok('Circle: the photo stays draggable (a drag moves it)',o1.ox!==o0.ox||o1.oy!==o0.oy,{o0,o1,box:Math.round(box.w)+'x'+Math.round(box.h)});
  /* where each option shows */
  await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(500);
  const rows={};
  for(const st of ['cream','photo','cans','split','poster']){ await pg.tap(`#styles [data-style="${st}"]`); await pg.waitForTimeout(250); rows[st]=[await vis('bg'),await vis('shape'),await vis('hsize'),await vis('btn'),await vis('place')].map(x=>x?1:0).join(''); }
  ok('Style sheet options show only where they matter',JSON.stringify(rows)===JSON.stringify({cream:'11110',photo:'00111',cans:'10110',split:'10110',poster:'11110'}),rows);
  await ctx.close();
}

/* 9. Photo shape in Big words too, the word headline fits 940 wide, the photo is draggable in Split */
{
  const {ctx,pg}=await mk({style:'poster'});
  const base=await settle(pg);
  await set(pg,null,{shape:'circle'}); const c=await settle(pg);
  await set(pg,null,{shape:'arch'}); const a=await settle(pg);
  ok('Big words: Photo shape changes the picture',c.h!==base.h&&a.h!==base.h&&a.h!==c.h);
  const hd=(await reg(pg)).find(q=>q.id==='head');
  ok('Big words: the headline is huge (at least 600 wide) and fits 940',hd.w>=600&&hd.w<=941,Math.round(hd.w));
  await set(pg,'split',{}); await settle(pg);
  const box=(await reg(pg)).find(q=>q.photo===0);
  ok('Split: the photo fills the top (about 55-65 percent of the height)',box.y===0&&box.w===1080&&box.h>1000&&box.h<1250,Math.round(box.h));
  await ctx.close();
}

await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); console.log(`restock-styles: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);

/* Studio 1.12.0: Stickers pack. Layers → Sticker opens a sheet of drawn previews (assets/stickers.js); a tap adds the
   sticker as a normal layer ({type:'asset', ref:'sticker:<id>'}) that moves, resizes, turns, recolours (brand colours +
   custom), takes opacity and undo, is saved in the recipe and comes back when a saved design is opened.
   Checks: phone 390×844 touch (light + dark) and desktop 1280×800; a 360px phone (no sideways scroll);
   the full-size PNG (2160×3840) with the sticker drawn sharp in it; reopening the saved design; an older design
   (no stickers) draws pixel for pixel the same with or without stickers.js; and Studio still works if stickers.js
   cannot load (no Sticker button, a saved sticker stays in the design).
   Run like tests/full.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SAMPLE=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const GREEN='#00C853';
const newCtx=(vp,theme,extra)=>b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',colorScheme:theme,acceptDownloads:true,...(extra||{})});
const fakeRoutes=async ctx=>{ await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); };

let savedId=null, savedRecipe=null;
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  for(const theme of vp.touch?['light','dark']:['light']){
    const N=vp.name+(theme==='dark'?' dark':'')+': ', main=vp.touch&&theme==='light';
    const ctx=await newCtx(vp,theme); await fakeRoutes(ctx);
    const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
    const dls=[]; pg.on('download',d=>dls.push(d));
    const tap=s=>vp.touch?pg.tap(s):pg.click(s);
    const cdp=vp.touch?await ctx.newCDPSession(pg):null;
    const sel=()=>pg.evaluate(()=>Studio.debug.S.sel);
    const lay=id=>pg.evaluate(id=>Studio.debug.S.layers[id]||{},id);
    const ext=id=>pg.evaluate(id=>Studio.debug.S.extras.find(x=>x.id===id)||null,id);
    const box=async id=>{ await pg.locator('#view').scrollIntoViewIfNeeded(); await pg.waitForTimeout(120);
      const r=await pg.evaluate(id=>{ const r=Studio.debug.reg().find(x=>x.id===id&&!x.empty&&!x.hidden); return r&&{x:r.x,y:r.y,w:r.w,h:r.h}; },id);
      const vr=await pg.locator('#view').boundingBox(), k=vr.width/(await pg.evaluate(()=>document.getElementById('view').width)); return r&&{cx:vr.x+(r.x+r.w/2)*k,cy:vr.y+(r.y+r.h/2)*k,r}; };
    const part=async p=>{ const t=pg.locator(`#sh-insp .itab[data-part="${p}"]`); if(!(await t.isVisible())) return; if((await t.getAttribute('aria-pressed'))!=='true'){ await t.tap(); await pg.waitForTimeout(300); } };

    await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForTimeout(1500);
    await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(vp.touch?3400:700);
    if(main){ await pg.setInputFiles('#slots input[type=file]',SAMPLE); await pg.waitForTimeout(1200); }

    /* 1. the picker is one tap away, not on the first view */
    ok(N+'first view: no sticker sheet showing',!(await pg.locator('#sh-stickers').isVisible())||!vp.touch&&!(await pg.evaluate(()=>document.getElementById('sh-stickers').classList.contains('active'))));
    if(vp.touch){ await tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500); }
    await pg.locator('#addSticker').scrollIntoViewIfNeeded();
    const btn=await pg.evaluate(()=>{ const e=document.getElementById('addSticker'), r=e.getBoundingClientRect(), cs=getComputedStyle(e); return {h:r.height,w:r.width,cls:e.className,bg:cs.backgroundColor,row:!!e.closest('.add-row'),row2:[...e.parentNode.children].map(x=>Math.round(x.getBoundingClientRect().height))}; });
    ok(N+'Layers has a Sticker button in the Add row, a plain (not filled) button, at least 44px tall',btn.row&&btn.cls==='mini'&&btn.h>=44,btn);
    ok(N+'the Add row buttons all have the same height',new Set(btn.row2).size===1,btn.row2);
    await tap('#addSticker'); await pg.waitForTimeout(500);
    const sh=await pg.evaluate(()=>{ const s=document.getElementById('sh-stickers'), r=s.getBoundingClientRect(), tiles=[...s.querySelectorAll('[data-sticker]')];
      const blank=tiles.filter(t=>{ const c=t.querySelector('canvas'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; for(let i=3;i<d.length;i+=4) if(d[i]>0) return false; return true; }).map(t=>t.dataset.sticker);
      const small=tiles.filter(t=>{ const q=t.getBoundingClientRect(); return q.width<48||q.height<48; }).length;
      const filled=[...s.querySelectorAll('button')].filter(x=>x.checkVisibility()&&getComputedStyle(x).backgroundColor===getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||x.classList.contains('btn')).length;
      const lum=c=>{ const m=c.match(/\d+(\.\d+)?/g).map(Number).slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; };
      const t=tiles[0], lc=lum(getComputedStyle(t.querySelector('span')).color), bc=lum(getComputedStyle(t).backgroundColor);
      return {visible:s.checkVisibility()&&r.height>0&&r.top<innerHeight&&r.bottom<=innerHeight+1,tiles:tiles.length,blank,small,filled,ratio:+((Math.max(lc,bc)+.05)/(Math.min(lc,bc)+.05)).toFixed(1),labels:tiles.every(t=>t.textContent.trim().length>0)}; });
    ok(N+'Sticker opens a sheet with 14 drawn previews, each labelled',sh.visible&&sh.tiles===14&&!sh.blank.length&&sh.labels,sh);
    ok(N+'every sticker tile is at least 48×48',sh.small===0,sh.small);
    ok(N+'tile labels are readable (≥4.5:1)',sh.ratio>=4.5,sh.ratio);
    const ref=main?'sticker:burst':'sticker:arrow-curve';
    await pg.locator(`[data-sticker="${ref}"]`).scrollIntoViewIfNeeded(); await tap(`[data-sticker="${ref}"]`); await pg.waitForTimeout(600);

    /* 2. it's a layer like any other */
    const id=await sel(); const x=await ext(id);
    const info=await pg.evaluate(id=>{ const r=Studio.debug.reg().find(q=>q.id===id); return {kind:r&&r.kind,empty:!!(r&&r.empty),name:document.getElementById('inspName').textContent,
      none:!!document.querySelector('#inspColors [data-c="none"]'),shapeOpts:!document.getElementById('inspShape').hidden,sheetOpen:document.getElementById('sh-stickers').classList.contains(matchMedia('(max-width: 820px)').matches?'open':'active')}; },id);
    ok(N+'a tap adds the sticker as a selected layer (saved as type asset, ref '+ref+')',!!id&&x&&x.type==='asset'&&x.ref===ref&&info.kind==='sticker'&&!info.empty,{id,x,info});
    ok(N+'the sticker sheet closes and the layer bar names it',!info.sheetOpen&&/arrow|Starburst/i.test(info.name),info);
    ok(N+'a sticker takes a colour only (no "None", no outline or corner options)',!info.none&&!info.shapeOpts,info);

    /* move: drag it in the preview, then the Move tab's nudge */
    const p0=await box(id); const d0=await lay(id);
    if(vp.touch){ const pts=(x,y)=>[{x,y,id:1}]; await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(p0.cx,p0.cy)});
      for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(p0.cx-40*i/8,p0.cy+60*i/8)}); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
    else { await pg.mouse.move(p0.cx,p0.cy); await pg.mouse.down(); for(let i=1;i<=8;i++) await pg.mouse.move(p0.cx-40*i/8,p0.cy+60*i/8); await pg.mouse.up(); }
    await pg.waitForTimeout(400); const d1=await lay(id);
    ok(N+'drag moves the sticker',(d1.dx||0)<(d0.dx||0)-20&&(d1.dy||0)>(d0.dy||0)+30&&await sel()===id,{d0,d1});
    await part('move'); await pg.locator('#sh-insp [data-nudge="1,0"]').scrollIntoViewIfNeeded(); await tap('#sh-insp [data-nudge="1,0"]'); await pg.waitForTimeout(300);
    const d2=await lay(id); ok(N+'Move tab nudges it',(d2.dx||0)>(d1.dx||0),{d1:d1.dx,d2:d2.dx});
    /* turn and resize */
    await pg.locator('#sh-insp [data-rot="15"]').scrollIntoViewIfNeeded(); await tap('#sh-insp [data-rot="15"]'); await pg.waitForTimeout(300);
    ok(N+'Move tab turns it 15°',(await lay(id)).rot===15,(await lay(id)).rot);
    await part('size'); await pg.locator('#inspSize').scrollIntoViewIfNeeded(); await pg.locator('#inspSize').fill('1.6'); await pg.waitForTimeout(300);
    const k=(await lay(id)).k, p1=await box(id); ok(N+'Size makes it bigger',k>1.5&&p1&&p1.r.w*1.0>0,{k});
    /* recolour: a brand swatch, then a custom colour */
    await part('color'); await pg.waitForTimeout(200);
    const sw=await pg.evaluate(()=>[...document.querySelectorAll('#inspColors [data-pal="col"] .sw-btn[data-c]:not(.sw-recent)')].map(x=>x.dataset.c).filter(c=>c&&c!=='none'));
    const pick=sw.find(c=>c.toUpperCase()!==(x.color||'').toUpperCase());
    await pg.locator(`#inspColors .sw-btn[data-c="${pick}"]`).scrollIntoViewIfNeeded(); await tap(`#inspColors .sw-btn[data-c="${pick}"]`); await pg.waitForTimeout(300);
    const c1=(await lay(id)).color||(await ext(id)).color;
    ok(N+'a brand colour recolours it',!!pick&&String(c1).toUpperCase()===pick.toUpperCase(),{pick,c1,brand:sw});
    const pressed=await pg.evaluate(()=>{ const on=document.querySelector('#inspColors .sw-btn[aria-pressed="true"]'), off=document.querySelector('#inspColors .sw-btn[aria-pressed="false"][data-c]'); return on&&off&&getComputedStyle(on).boxShadow!==getComputedStyle(off).boxShadow; });
    ok(N+'the chosen swatch looks different from the others',pressed);
    /* undo brings the old colour back */
    await pg.waitForTimeout(700); await pg.locator('#undo').scrollIntoViewIfNeeded(); await tap('#undo'); await pg.waitForTimeout(500);
    const c2=(await lay(id)).color||(await ext(id)).color;
    ok(N+'Undo brings the old colour back',String(c2).toUpperCase()!==pick.toUpperCase(),{c2,pick});
    if(await sel()!==id){ const q=await box(id); if(vp.touch) await pg.touchscreen.tap(q.cx,q.cy); else await pg.mouse.click(q.cx,q.cy); await pg.waitForTimeout(400); }
    await part('color'); await pg.locator('#inspColors [data-chex]').scrollIntoViewIfNeeded(); await pg.locator('#inspColors [data-chex]').fill(GREEN); await pg.waitForTimeout(300);
    const c3=(await lay(id)).color||(await ext(id)).color; ok(N+'a custom colour (hex) recolours it',String(c3).toUpperCase()===GREEN,c3);
    /* opacity */
    await part(await pg.evaluate(()=>document.getElementById('inspOp').closest('[data-part]')?.dataset.part||'size')); const op=pg.locator('#inspOp'); if(await op.count()){ await op.scrollIntoViewIfNeeded(); await op.fill('0.5'); await pg.waitForTimeout(250); }
    ok(N+'opacity applies',(await lay(id)).op===.5,(await lay(id)).op);
    if(main){ await op.fill('1'); await pg.waitForTimeout(200); }
    /* duplicate keeps it a sticker */
    await part('more'); await pg.locator('#inspDup').scrollIntoViewIfNeeded(); await tap('#inspDup'); await pg.waitForTimeout(400);
    const dup=await ext(await sel()); ok(N+'Duplicate makes a second sticker',!!dup&&dup.ref===ref&&dup.id!==id,dup);
    await part('more'); await pg.locator('#inspDelete').scrollIntoViewIfNeeded(); await tap('#inspDelete'); await pg.waitForTimeout(300);
    ok(N+'Delete removes the copy and keeps the first',await pg.evaluate(id=>Studio.debug.S.extras.filter(x=>x.ref&&x.ref.startsWith('sticker:')).length===1&&!!Studio.debug.S.extras.find(x=>x.id===id),id));
    /* the Layers list names it */
    if(vp.touch){ await tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500); }
    const row=await pg.evaluate(()=>[...document.querySelectorAll('#layerList li')].map(l=>l.textContent.trim()).find(t=>/arrow|Starburst/i.test(t)));
    ok(N+'the Layers list shows the sticker by name',!!row,row);

    /* 3. save: full-size PNG with the sticker drawn sharp, and the design saved to the team */
    if(main){
      await pg.evaluate(id=>{ const S=Studio.debug.S, l=S.layers[id]; l.rot=0; l.op=1; Studio.debug.render(); },id);
      const geo=await pg.evaluate(id=>{ const r=Studio.debug.reg().find(q=>q.id===id); return {x:r.x+r.w/2,y:r.y+r.h/2,w:r.w}; },id);
      if(vp.touch&&await pg.evaluate(()=>!!document.querySelector('.sheet.open'))){ await pg.evaluate(()=>document.querySelector('.sheet.open .done')?.click()); await pg.waitForTimeout(300); }
      await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}).catch(()=>{});
      const team=pg.locator('#sh-save input[type=checkbox]').first(); if(await team.count()&&!(await team.isChecked())) await team.check({force:true}).catch(()=>{});
      if(await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'))) await pg.tap('#save');
      for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
      const d=dls[0]; let size='', px=null;
      if(d){ const buf=fs.readFileSync(await d.path()); size=buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
        px=await pg.evaluate(async([b64,g])=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0);
          const at=(u,v)=>[...x.getImageData(Math.round(u*2),Math.round(v*2),1,1).data].slice(0,3);
          /* the burst's edge: count soft (half-blended) pixels across a horizontal line through its middle. A sharp 2× vector edge has very few. */
          const row=x.getImageData(Math.round((g.x-g.w)*2),Math.round(g.y*2),Math.round(g.w*4),1).data; let green=0, soft=0;
          for(let i=0;i<row.length;i+=4){ const [r,gg,bb]=[row[i],row[i+1],row[i+2]]; if(r<20&&gg>180&&bb>60&&bb<110) green++; else if(gg>r+40&&gg>bb+30) soft++; }
          return {mid:at(g.x,g.y),green,soft}; },[buf.toString('base64'),geo]); }
      ok(N+'Save makes the full-size PNG (2160×3840)',size==='2160x3840',size);
      ok(N+'the sticker is in the PNG in its colour, with crisp edges (vector, not a stretched picture)',!!px&&px.mid[0]<20&&px.mid[1]>180&&px.green>200&&px.soft<=12,px);
      await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
      savedId=new URL(pg.url()).searchParams.get('design'); savedRecipe=await pg.evaluate(()=>Studio.debug.recipe());
      ok(N+'the design is saved to the team, with the sticker in its recipe',!!savedId&&savedRecipe.extras.some(e=>e.ref===ref&&String(e.color).toUpperCase()===GREEN||e.ref===ref),{savedId});
      /* 4. reopen it */
      await pg.goto(BASE+'tools/photo-story.html?design='+savedId); await pg.waitForTimeout(3000);
      const back=await pg.evaluate(ref=>{ const S=Studio.debug.S, x=S.extras.find(e=>e.ref===ref), r=x&&Studio.debug.reg().find(q=>q.id===x.id), l=x&&S.layers[x.id]||{};
        return x&&{kind:r&&r.kind,empty:!!(r&&r.empty),color:l.color||x.color,k:l.k,bar:!document.getElementById('designBar').hidden}; },ref);
      ok(N+'the saved design opens with its sticker: same colour and size, drawn',!!back&&back.kind==='sticker'&&!back.empty&&String(back.color).toUpperCase()===GREEN&&back.k>1.5&&back.bar,back);
    }
    await ctx.close();
  }
}

/* 5. a 360px phone: the Add row and the sticker sheet fit, no sideways scroll */
{ const ctx=await newCtx({width:360,height:740,touch:true},'light'); await fakeRoutes(ctx); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('360: '+e.message));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3400);
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500); await pg.tap('#addSticker'); await pg.waitForTimeout(500);
  const fit=await pg.evaluate(()=>{ const s=document.getElementById('sh-stickers'), tiles=[...s.querySelectorAll('.sticker-tile')], clip=tiles.filter(t=>{ const sp=t.querySelector('span'); return sp.scrollWidth>sp.clientWidth+1; }).length;
    return {page:document.documentElement.scrollWidth<=innerWidth,sheet:s.scrollWidth<=s.clientWidth+1,clip,cols:new Set(tiles.map(t=>Math.round(t.getBoundingClientRect().left))).size}; });
  ok('360px: no sideways scroll, no clipped labels, 3+ tiles a row',fit.page&&fit.sheet&&!fit.clip&&fit.cols>=3,fit);
  await ctx.close(); }

/* 6. an older design (no stickers) draws exactly the same with or without stickers.js; 7. stickers.js can't load */
{ const ctx=await newCtx({width:390,height:844,touch:true},'light'); await fakeRoutes(ctx); let block=false;
  await ctx.route(/assets\/stickers\.js/,r=>block?r.abort():r.continue());
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('old/offline: '+e.message));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3400);
  /* an "old" design: text + an asset shape + an element, the way 1.7.0 saved them */
  const id=await pg.evaluate(()=>{ const S=Studio.debug.S; S.extras.push({id:'asset91',type:'asset',ref:'shape:sparkle',w:260,x:540,y:700,color:'#161210'},{id:'extra92',text:'Text',font:'display',size:72,color:'#FFFFFF',shadow:true,y:1100});
    S.layers.asset91={dx:30,dy:-20,k:1.2,color:null,hidden:false,rot:15}; const r=Studio.debug.recipe(); r.photoPaths=[];
    const db=JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{},"files":{},"cols":{}}'); db.designs.old1={id:'old1',brand:'1stchoice',tool:'restock',name:'Old design',kind:'design',recipe:r,thumb_path:null,cols:[],updated_at:new Date().toISOString()};
    localStorage.setItem('fakecloud',JSON.stringify(db)); return 'old1'; });
  const snap=async()=>{ await pg.goto(BASE+'tools/restock.html?design='+id); await pg.waitForTimeout(3000); return pg.evaluate(()=>({px:document.getElementById('view').toDataURL(),extras:JSON.stringify(Studio.debug.S.extras),btn:!!document.getElementById('addSticker')})); };
  const withS=await snap(); block=true; const without=await snap();
  ok('an older design opens with the same layers and draws pixel for pixel the same with or without stickers.js',withS.extras===without.extras&&withS.px===without.px&&withS.extras.includes('shape:sparkle'));
  ok('if stickers.js cannot load, there is no Sticker button and the tool still works',withS.btn&&!without.btn&&await pg.evaluate(()=>!!document.getElementById('addAsset')));
  if(savedRecipe){ await pg.evaluate(r=>{ r.photoPaths=[]; const db=JSON.parse(localStorage.getItem('fakecloud')); db.designs.stk1={id:'stk1',brand:'1stchoice',tool:'photo-story',name:'With a sticker',kind:'design',recipe:r,thumb_path:null,cols:[],updated_at:new Date().toISOString()}; localStorage.setItem('fakecloud',JSON.stringify(db)); },savedRecipe);
    await pg.goto(BASE+'tools/photo-story.html?design=stk1'); await pg.waitForTimeout(3000);
    const kept=await pg.evaluate(()=>{ const x=Studio.debug.S.extras.find(e=>e.ref&&e.ref.startsWith('sticker:')); return !!x&&JSON.stringify(Studio.debug.recipe().extras).includes(x.ref); });
    ok('…and a design with a sticker still opens, keeping the sticker in its recipe',kept); }
  await ctx.close(); }

await b.close();
const real=errs.filter(e=>!/fonts\.g|ERR_|net::/.test(e));
ok('no page errors',!real.length,real.slice(0,3));
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-fails} passed, ${fails} failed in ${Math.round((Date.now()-t0)/1000)}s`);
process.exit(fails?1:0);

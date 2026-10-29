/* Studio 1.14.0: Flip. The layer bar's Move tab has a Flip button for pictures, stickers and shapes (never text, never the tinted logo).
   Checks: the button (size, label, row layout, no sideways scroll); a tap mirrors the layer left to right in the preview with the same box;
   the recipe keeps it; Undo/Redo; a second tap removes it; text never mirrors even if a recipe says so; the full-size PNG (2160×3840) is mirrored too;
   a layer without the key draws exactly as before; brand cans (noFlip in the brand kit) and the logo do not show Flip.
   Phone 390×844 touch (light + dark) and desktop 1280×800. Run like tests/stickers.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SAMPLE=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const newCtx=(vp,theme,extra)=>b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',colorScheme:theme,acceptDownloads:true,...(extra||{})});
const fakeRoutes=async ctx=>{ await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); };

/* a 24×16 grid of how much bright green (the sticker is coloured #00C853, the photo has none) there is in each cell, over a box of a canvas (box in 1080-wide design units; k = canvas px per unit) */
const GRID=`(cv,bx,k)=>{ const g=[],x0=Math.round(bx.x*k),y0=Math.round(bx.y*k),w=Math.max(24,Math.round(bx.w*k)),h=Math.max(16,Math.round(bx.h*k));
  const d=cv.getContext('2d').getImageData(x0,y0,w,h).data;
  for(let gy=0;gy<16;gy++) for(let gx=0;gx<24;gx++){ let s=0,n=0; for(let y=Math.floor(gy*h/16);y<Math.floor((gy+1)*h/16);y++) for(let x=Math.floor(gx*w/24);x<Math.floor((gx+1)*w/24);x++){ const i=(y*w+x)*4; s+=(d[i+1]>d[i]+80&&d[i+1]>d[i+2]+40)?255:0; n++; } g.push(n?s/n:0); }
  return g; }`;
const mirror=g=>{ const o=[]; for(let r=0;r<16;r++) for(let c=0;c<24;c++) o.push(g[r*24+23-c]); return o; };
const diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;

let png=null;
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  for(const theme of vp.touch?['light','dark']:['light']){
    const N=vp.name+(theme==='dark'?' dark':'')+': ', main=vp.touch&&theme==='light';
    const ctx=await newCtx(vp,theme); await fakeRoutes(ctx);
    const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
    const dls=[]; pg.on('download',d=>dls.push(d));
    const tap=s=>vp.touch?pg.tap(s):pg.click(s);
    const sel=()=>pg.evaluate(()=>Studio.debug.S.sel);
    const lay=id=>pg.evaluate(id=>Studio.debug.S.layers[id]||{},id);
    const rbox=id=>pg.evaluate(id=>{ const r=Studio.debug.reg().find(x=>x.id===id&&!x.empty&&!x.hidden); return r&&{x:r.x,y:r.y,w:r.w,h:r.h}; },id);
    const grid=async id=>pg.evaluate(`(()=>{ const r=Studio.debug.reg().find(x=>x.id===${JSON.stringify(id)}); const cv=document.getElementById('view'); return (${GRID})(cv,r,cv.width/1080); })()`);
    const sig=grid;
    const hash=()=>pg.evaluate(()=>document.getElementById('view').toDataURL());
    const part=async p=>{ const t=pg.locator(`#sh-insp .itab[data-part="${p}"]`); if(!(await t.isVisible())) return; if((await t.getAttribute('aria-pressed'))!=='true'){ await t.click({force:true}).catch(()=>{}); await pg.waitForTimeout(300); } };
    const flipState=()=>pg.evaluate(()=>{ const f=document.getElementById('inspFlip'), r=f.getBoundingClientRect(); return {vis:f.checkVisibility()&&!f.hidden&&r.width>0,h:r.height,w:r.width,pr:f.getAttribute('aria-pressed'),txt:f.textContent.trim()}; });
    const closeSheet=async()=>{ if(vp.touch&&await pg.evaluate(()=>!!document.querySelector('.sheet.open'))){ await pg.evaluate(()=>document.querySelector('.sheet.open .done')?.click()); await pg.waitForTimeout(300); } };
    const tapBox=async id=>{ await pg.locator('#view').scrollIntoViewIfNeeded(); await pg.waitForTimeout(150);
      const r=await rbox(id), vr=await pg.locator('#view').boundingBox(), k=vr.width/1080; const x=vr.x+(r.x+r.w/2)*k, y=vr.y+(r.y+r.h/2)*k;
      if(vp.touch) await pg.touchscreen.tap(x,y); else await pg.mouse.click(x,y); await pg.waitForTimeout(450); };

    await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForTimeout(1500);
    await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(vp.touch?3400:700);
    await pg.setInputFiles('#slots input[type=file]',SAMPLE); await pg.waitForTimeout(1200);
    if(vp.touch){ await tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500); }
    await pg.locator('#addSticker').scrollIntoViewIfNeeded(); await tap('#addSticker'); await pg.waitForTimeout(500);
    const ref='sticker:arrow-curve';
    await pg.locator(`[data-sticker="${ref}"]`).scrollIntoViewIfNeeded(); await tap(`[data-sticker="${ref}"]`); await pg.waitForTimeout(700);
    const id=await sel(); ok(N+'the new sticker is the selected layer',!!id&&await pg.evaluate(id=>Studio.debug.reg().some(r=>r.id===id&&r.kind==='sticker'),id),id);
    await pg.evaluate(id=>{ const l=Studio.debug.S.layers[id]; l.dx=0; l.dy=-500; l.color='#00C853'; Studio.debug.render(); },id);   // clear of the headline, in a colour the photo does not have
    await part('move'); await pg.waitForTimeout(200);

    /* 1. the button */
    const f0=await flipState();
    ok(N+'Move tab shows Flip: ≥48px tall, ≥44px wide, not pressed, says Flip',f0.vis&&f0.h>=48&&f0.w>=44&&f0.pr==='false'&&/Flip/.test(f0.txt),f0);
    const row=await pg.evaluate(()=>{ const r=document.querySelector('#sh-insp .rot-btns'), bs=[...r.querySelectorAll('button')].filter(x=>x.checkVisibility()), rr=r.getBoundingClientRect();
      return {hs:bs.map(x=>Math.round(x.getBoundingClientRect().height)),inside:bs.every(x=>{ const q=x.getBoundingClientRect(); return q.left>=rr.left-1&&q.right<=rr.right+1; }),fits:r.scrollWidth<=r.clientWidth+1,page:document.documentElement.scrollWidth<=innerWidth}; });
    ok(N+'the turn/Flip row: buttons same height, nothing overflows, no sideways page scroll',new Set(row.hs).size===1&&row.hs.length>=4&&row.inside&&row.fits&&row.page,row);

    if(!vp.touch){
      /* desktop basics only */
      await tap('#inspFlip'); await pg.waitForTimeout(300);
      ok(N+'tap toggles flip on and aria-pressed',(await lay(id)).flip===true&&(await flipState()).pr==='true');
      await tap('#inspFlip'); await pg.waitForTimeout(300);
      ok(N+'second tap removes the key',!('flip' in await lay(id))&&(await flipState()).pr==='false',await lay(id));
    } else {
      /* 2. mirrored pixels, same box */
      const box0=await rbox(id), g0=await sig(id);
      await tap('#inspFlip'); await pg.waitForTimeout(350);
      const box1=await rbox(id), g1=await sig(id), L1=await lay(id), f1=await flipState();
      const dm=diff(g1,mirror(g0)), dn=diff(g1,g0);
      ok(N+'tap Flip: layer flag is true and the button is pressed',L1.flip===true&&f1.pr==='true',{flip:L1.flip,pr:f1.pr});
      ok(N+'the preview is the mirror image of before (box unchanged)',dm<dn*0.35&&dn>5&&JSON.stringify(box0)===JSON.stringify(box1),{mirrored:+dm.toFixed(2),plain:+dn.toFixed(2),box0,box1});
      /* 3. recipe */
      const rec=await pg.evaluate(()=>{ const r=Studio.debug.recipe(); const ls=r.layers||(r.pages&&r.pages[0]&&r.pages[0].layers)||{}; return ls; });
      ok(N+'the recipe keeps flip:true for the layer',rec[id]&&rec[id].flip===true,rec[id]);
      /* 4. undo / redo */
      await pg.waitForTimeout(800); await pg.locator('#undo').scrollIntoViewIfNeeded(); await tap('#undo'); await pg.waitForTimeout(600);
      const gu=await sig(id); ok(N+'Undo removes the flip and the pixels come back',!('flip' in await lay(id))&&diff(gu,g0)<dm+0.5,{flip:(await lay(id)).flip,d:+diff(gu,g0).toFixed(2)});
      await pg.locator('#redo').scrollIntoViewIfNeeded(); await tap('#redo'); await pg.waitForTimeout(600);
      const gr=await sig(id); ok(N+'Redo flips it again',(await lay(id)).flip===true&&diff(gr,mirror(g0))<dn*0.35,{flip:(await lay(id)).flip});
      /* 5. second tap */
      if(await sel()!==id){ await closeSheet(); await tapBox(id); }
      await part('move'); await pg.locator('#inspFlip').scrollIntoViewIfNeeded(); await tap('#inspFlip'); await pg.waitForTimeout(350);
      ok(N+'a second tap removes flip (key deleted) and un-presses',!('flip' in await lay(id))&&(await flipState()).pr==='false',await lay(id));
      /* 6. text never mirrors */
      const tid=await pg.evaluate(()=>(Studio.debug.reg().find(r=>r.kind==='text'&&!r.empty&&!r.hidden&&r.w>0)||{}).id);
      await closeSheet(); await tapBox(tid); const selT=await sel(); await part('move');
      const ft=await flipState();
      ok(N+'a text layer is selected and Move has no Flip',selT===tid&&!ft.vis,{tid,selT,ft});
      const t0g=await grid(tid), t0h=await hash();
      await pg.evaluate(t=>{ Studio.debug.S.layers[t].flip=true; Studio.debug.render(); },tid); await pg.waitForTimeout(200);
      const t1g=await grid(tid);
      ok(N+'text pixels are identical even if a recipe sets flip:true',diff(t0g,t1g)===0&&t0h===await hash(),+diff(t0g,t1g).toFixed(3));
      await pg.evaluate(t=>{ delete Studio.debug.S.layers[t].flip; Studio.debug.render(); },tid);
      /* 8. no key = same drawing */
      await pg.evaluate(id=>{ Studio.debug.S.layers[id].flip=true; Studio.debug.render(); },id); await pg.waitForTimeout(250); const hFlip=await hash(); await pg.evaluate(id=>{ delete Studio.debug.S.layers[id].flip; Studio.debug.render(); },id); await pg.waitForTimeout(250); const hNone=await hash();
      await pg.evaluate(id=>{ Studio.debug.S.layers[id].flip=undefined; Studio.debug.render(); },id); await pg.waitForTimeout(250); const hUndef=await hash();
      await pg.evaluate(id=>{ Studio.debug.S.layers[id].flip=false; Studio.debug.render(); },id); await pg.waitForTimeout(250); const hFalse=await hash();
      ok(N+'a layer with no flip key draws the same as flip undefined or false, and flip:true does change it',hNone===hUndef&&hNone===hFalse&&hNone!==hFlip,{u:hNone===hUndef,f:hNone===hFalse,c:hNone!==hFlip});
      await pg.evaluate(id=>{ delete Studio.debug.S.layers[id].flip; Studio.debug.render(); },id);
    }

    if(main){
      /* 7. full save: mirrored in the 2160×3840 PNG */
      await pg.evaluate(id=>{ const l=Studio.debug.S.layers[id]; l.flip=true; l.rot=0; l.op=1; Studio.debug.render(); },id);
      await pg.waitForTimeout(300);
      const gP=await sig(id), gPu=mirror(gP); const bx=await rbox(id);
      if(await pg.evaluate(()=>!!document.querySelector('.sheet.open'))){ await pg.evaluate(()=>document.querySelector('.sheet.open .done')?.click()); await pg.waitForTimeout(300); }
      await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}).catch(()=>{});
      if(await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'))) await pg.tap('#save');
      for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
      const d=dls[0]; let size='', cmp=null;
      if(d){ const buf=fs.readFileSync(await d.path()); size=buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
        cmp=await pg.evaluate(async([b64,bx,G,gP])=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; c.getContext('2d').drawImage(im,0,0);
          const g=eval(G)(c,bx,im.width/1080); return g; },[buf.toString('base64'),bx,GRID,gP]); }
      ok(N+'Save makes the full-size PNG (2160×3840)',size==='2160x3840',size);
      ok(N+'the sticker in the PNG is mirrored like the preview (closer to the flipped preview than to the unflipped one)',!!cmp&&diff(cmp,gP)<diff(cmp,gPu)*0.5,cmp&&{flipped:+diff(cmp,gP).toFixed(2),unflipped:+diff(cmp,gPu).toFixed(2)});
      await pg.evaluate(id=>{ delete Studio.debug.S.layers[id].flip; Studio.debug.render(); },id);
    }

    /* 9. a brand can (noFlip:true in the brand kit: its label must never read backwards) and the logo have no Flip */
    await pg.evaluate(()=>{ const S=Studio.debug.S; S.extras.push({id:'a99',type:'asset',ref:'can-classic',w:300,x:300,y:1450},{id:'a98',type:'asset',ref:'logo',w:260,x:800,y:1450});
      S.layers.a99={dx:0,dy:0,k:1,color:null,hidden:false}; S.layers.a98={dx:0,dy:0,k:1,color:null,hidden:false}; Studio.debug.render(); });
    await pg.waitForFunction(()=>['a99','a98'].every(i=>Studio.debug.reg().some(r=>r.id===i&&!r.empty)),null,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(500);
    if(vp.touch&&await pg.evaluate(()=>!!document.querySelector('.sheet.open'))){ await pg.evaluate(()=>document.querySelector('.sheet.open .done')?.click()); await pg.waitForTimeout(300); }
    await tapBox('a99'); const s99=await sel(); await part('move'); const fc=await flipState();
    ok(N+'a brand can (noFlip) has no Flip',s99==='a99'&&!fc.vis,{s99,fc});
    { const hC=await hash(); await pg.evaluate(()=>{ Studio.debug.S.layers.a99.flip=true; Studio.debug.render(); }); ok(N+'can pixels identical with flip:true',hC===await hash()); await pg.evaluate(()=>{ delete Studio.debug.S.layers.a99.flip; Studio.debug.render(); }); }
    if(vp.touch&&await pg.evaluate(()=>!!document.querySelector('.sheet.open'))){ await pg.evaluate(()=>document.querySelector('.sheet.open .done')?.click()); await pg.waitForTimeout(300); }
    await tapBox('a98'); const s98=await sel(); await part('move'); const fl=await flipState();
    ok(N+'the logo asset has no Flip, and flip:true on it changes nothing',s98==='a98'&&!fl.vis,{s98,fl});
    const hL=await hash(); await pg.evaluate(()=>{ Studio.debug.S.layers.a98.flip=true; Studio.debug.render(); }); ok(N+'logo pixels identical with flip:true',hL===await hash());
    await ctx.close();
  }
}
await b.close();
const real=errs.filter(e=>!/fonts\.g|ERR_|net::/.test(e));
ok('no page errors',!real.length,real.slice(0,3));
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-fails} passed, ${fails} failed in ${Math.round((Date.now()-t0)/1000)}s`);
process.exit(fails?1:0);

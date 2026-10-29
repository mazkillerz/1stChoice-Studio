/* Studio 1.14.0: Highlight covers, Emoji cover type. Style → Cover type has a fifth option, Emoji, with a grid of 24 drawn emoji
   (tools/highlight-emoji.js, vector paths). The cover shows one big emoji as a layer (id emoji, a shape): it can be flipped and recoloured,
   saves sharp at 2160×3840, and comes back when the saved set is reopened. Nothing about raised drinks, cheers or cats.
   Also: older cover kinds draw the same without highlight-emoji.js (and then there is no Emoji option, and no errors); Quick start still works.
   Phone 390×844 touch (light + dark) and desktop 1280×800. Run like tests/highlight.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SAMPLES=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const newCtx=(vp,theme,extra)=>b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.touch?2:1,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',colorScheme:theme,acceptDownloads:true,...(extra||{})});
const fakeRoutes=async ctx=>{ await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); };
/* coloured (saturated) pixels in a square around the middle of a canvas, as a count, and the same for pixels near a given colour */
const SAT=`(cv,half,near)=>{ const x=cv.getContext('2d'), w=cv.width, k=w/1080, cx=Math.round(540*k), cy=Math.round(960*k), s=Math.round(half*k);
  const d=x.getImageData(cx-s,cy-s,2*s,2*s).data; let sat=0, nr=0, other=0;
  for(let i=0;i<d.length;i+=4){ const r=d[i],g=d[i+1],b=d[i+2], sa=Math.max(r,g,b)-Math.min(r,g,b); if(sa>70) sat++;
    if(near){ const dd=Math.abs(r-near[0])+Math.abs(g-near[1])+Math.abs(b-near[2]); if(dd<60) nr++; else if(sa>70) other++; } }
  return {sat,nr,other,n:d.length/4}; }`;
let savedId=null;

for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  for(const theme of vp.touch?['light','dark']:['light']){
    const N=vp.name+(theme==='dark'?' dark':'')+': ', main=vp.touch&&theme==='light';
    const ctx=await newCtx(vp,theme); await fakeRoutes(ctx);
    const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
    const dls=[]; pg.on('download',d=>dls.push(d));
    const tap=s=>vp.touch?pg.tap(s):pg.click(s);
    const val=k=>pg.evaluate(k=>Studio.debug.S.P[Studio.debug.S.page].values[k],k);
    const sat=(half,near)=>pg.evaluate(`(()=>(${SAT})(document.getElementById('view'),${half},${JSON.stringify(near||null)}))()`);
    const closeSheet=async()=>{ if(vp.touch&&await pg.evaluate(()=>!!document.querySelector('.sheet.open'))){ await pg.evaluate(()=>document.querySelector('.sheet.open .done')?.click()); await pg.waitForTimeout(300); } };
    const part=async p=>{ const t=pg.locator(`#sh-insp .itab[data-part="${p}"]`); if(!(await t.isVisible())) return; if((await t.getAttribute('aria-pressed'))!=='true'){ await t.click({force:true}).catch(()=>{}); await pg.waitForTimeout(300); } };
    const openStyle=async()=>{ if(vp.touch){ await closeSheet(); await tap('#bar [data-open="style"]'); await pg.waitForTimeout(450); } };

    await pg.goto(BASE+'tools/highlight.html'); await pg.waitForTimeout(1500);
    await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(vp.touch?3400:700);
    await openStyle();

    /* 1. the option */
    const opts=await pg.evaluate(()=>[...document.querySelectorAll('[data-seg="kind"] [data-v]')].map(e=>e.dataset.v));
    ok(N+'Cover type lists Icon, Word, Photo first and Emoji as an option',opts.slice(0,3).join()==='icon,word,photo'&&opts.includes('emoji')&&opts[opts.length-1]==='emoji',opts.join());
    const hiddenBefore=await pg.evaluate(()=>{ const e=document.querySelector('[data-seg="emoji"]'); return !e||!e.checkVisibility(); });
    ok(N+'the emoji grid is not showing until Emoji is chosen',hiddenBefore);

    /* 2. the grid */
    await tap('[data-seg="kind"] [data-v="emoji"]'); await pg.waitForTimeout(400);
    const k0=await val('kind'); await pg.locator('[data-seg="emoji"]').scrollIntoViewIfNeeded();
    const gr=await pg.evaluate(()=>{ const g=document.querySelector('[data-seg="emoji"]'), bs=[...g.querySelectorAll('.seg')];
      const lum=c=>{ const m=c.match(/\d+(\.\d+)?/g).map(Number).slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; };
      const bgOf=e=>{ for(let n=e;n;n=n.parentElement){ const c=getComputedStyle(n).backgroundColor; if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255,255,255)'; };
      const ratios=bs.map(x=>{ const t=[...x.querySelectorAll('*')].find(e=>!e.children.length&&e.textContent.trim().length&&e.tagName!=='svg'&&!e.closest('svg'))||x, a=lum(getComputedStyle(t).color), c=lum(bgOf(x)); return (Math.max(a,c)+.05)/(Math.min(a,c)+.05); });
      return {vis:g.checkVisibility(),n:bs.length,small:bs.filter(x=>{ const r=x.getBoundingClientRect(); return r.width<48||r.height<48; }).length,
        noLabel:bs.filter(x=>!x.textContent.trim().length).length,noSvg:bs.filter(x=>!x.querySelector('svg path')).length,minRatio:+Math.min(...ratios).toFixed(1),page:document.documentElement.scrollWidth<=innerWidth}; });
    ok(N+'tapping Emoji sets the cover type and shows a grid of 24 emoji',k0==='emoji'&&gr.vis&&gr.n===24,{k0,gr});
    ok(N+'every emoji button is at least 48×48, labelled, with a drawn picture',gr.small===0&&gr.noLabel===0&&gr.noSvg===0,gr);
    ok(N+'emoji labels are readable (≥4.5:1) and nothing scrolls sideways',gr.minRatio>=4.5&&gr.page,gr.minRatio);
    const defEmo=await val('emoji'); ok(N+'cover 1 starts with its own emoji (places)',defEmo==='places',defEmo);

    /* 3. pick fire */
    await pg.locator('[data-seg="emoji"] [data-v="fire"]').scrollIntoViewIfNeeded(); await tap('[data-seg="emoji"] [data-v="fire"]'); await pg.waitForTimeout(500);
    const s1=await sat(240);
    const lay=await pg.evaluate(()=>Studio.debug.reg().find(r=>r.id==='emoji'));
    ok(N+'Fire sets emoji "fire"; the middle of the preview has colour; the cover has an emoji layer (a shape, 560 wide)',(await val('emoji'))==='fire'&&s1.sat>3000&&lay&&lay.kind==='shape'&&Math.round(lay.w)===560,{s1,lay:lay&&{kind:lay.kind,w:lay.w}});

    /* 4. no toasts, no raised drinks, no cats */
    const list=await pg.evaluate(()=>window.HL_EMOJI.map(e=>({id:e[0],ch:e[1],label:e[2]})));
    const bad=list.filter(e=>/🥂|🍻|🍺|🍷|🍸|🍹|🍾|🥃|🍶|🐱|🐈|🐈‍⬛|😺|😸|😻/u.test(e.ch)||/cheer|toast|clink|cat\b|kitt/i.test(e.id+' '+e.label));
    ok(N+'24 emoji, none for cheers, toasting, raised drinks or cats',list.length===24&&new Set(list.map(e=>e.id)).size===24&&!bad.length,bad);

    /* 5. flip + recolour (select the emoji on the canvas first) */
    await closeSheet();
    await pg.locator('#view').scrollIntoViewIfNeeded();
    const vr=await pg.locator('#view').boundingBox(), kk=vr.width/1080;
    if(vp.touch) await pg.touchscreen.tap(vr.x+540*kk,vr.y+960*kk); else await pg.mouse.click(vr.x+540*kk,vr.y+960*kk); await pg.waitForTimeout(500);
    const selE=await pg.evaluate(()=>Studio.debug.S.sel); await part('move');
    const fb=await pg.evaluate(()=>{ const f=document.getElementById('inspFlip'), r=f.getBoundingClientRect(); return {vis:f.checkVisibility()&&r.width>0,h:r.height}; });
    ok(N+'the emoji layer is selected and Move has Flip',selE==='emoji'&&fb.vis&&fb.h>=48,{selE,fb});
    const before=await pg.evaluate(()=>document.getElementById('view').toDataURL());
    await pg.locator('#inspFlip').scrollIntoViewIfNeeded(); await tap('#inspFlip'); await pg.waitForTimeout(400);
    ok(N+'Flip mirrors the emoji (flip:true on the layer, picture changes)',(await pg.evaluate(()=>Studio.debug.S.layers.emoji.flip))===true&&before!==await pg.evaluate(()=>document.getElementById('view').toDataURL()));
    await tap('#inspFlip'); await pg.waitForTimeout(300);
    if(main){
      await part('color'); await pg.waitForTimeout(250);
      const sw=await pg.evaluate(()=>[...document.querySelectorAll('#inspColors .sw-btn[data-c]:not(.sw-recent)')].map(x=>x.dataset.c).filter(c=>c&&c!=='none'&&/^#/.test(c)));
      const chroma=c=>{ const v=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)); return Math.max(...v)-Math.min(...v); };
      const pick=sw.filter(c=>/^#[0-9a-f]{6}$/i.test(c)).sort((a,b)=>chroma(b)-chroma(a))[0]||sw[0];   // the most colourful brand swatch, so "one colour" is easy to tell from the emoji's own colours
      await pg.locator(`#inspColors .sw-btn[data-c="${pick}"]`).first().scrollIntoViewIfNeeded(); await tap(`#inspColors .sw-btn[data-c="${pick}"]`); await pg.waitForTimeout(450);
      const rgb=[1,3,5].map(i=>parseInt(pick.slice(i,i+2),16)); const s2=await sat(160,rgb);
      ok(N+'a colour makes the emoji one colour (no other saturated colours in its middle)',!!pick&&s2.nr>3000&&s2.other<s2.nr*0.03,{pick,s2});
      const autoBtn=await pg.evaluate(()=>{ const e=[...document.querySelectorAll('#inspColors .sw-btn')].find(x=>/^(auto|original)$/i.test((x.textContent||x.getAttribute('aria-label')||x.title||'').trim())||x.dataset.c===''||x.dataset.c==='auto'); return e&&(e.dataset.c??'?'); });
      if(autoBtn!=null){ const sel=autoBtn==='?'?'#inspColors .sw-btn:not([data-c])':`#inspColors .sw-btn[data-c="${autoBtn}"]`; await pg.locator(sel).first().click({force:true}); await pg.waitForTimeout(450); const s3=await sat(160,rgb);
        ok(N+'Original/Auto brings the emoji colours back',s3.sat>3000&&s3.nr<s2.nr*0.5,{s3}); }
      else ok(N+'Original/Auto brings the emoji colours back',false,'no Auto/Original swatch found');
    }

    /* 6. save: one full-size PNG per cover, sharp edges; 7. reopen */
    if(main){
      await closeSheet();
      await pg.evaluate(()=>{ const l=Studio.debug.S.layers.emoji; delete l.flip; l.color=null; Studio.debug.render(); }); await pg.waitForTimeout(300);
      const before=await pg.evaluate(()=>{ const r=Studio.debug.recipe(); delete r.page; return JSON.stringify(r); });
      await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}).catch(()=>{});
      await pg.waitForFunction(()=>document.getElementById('teamOn')?.checked,null,{timeout:8000}).catch(()=>{});
      await pg.fill('#teamName','Emoji covers').catch(()=>{}); await pg.tap('#save');
      for(let i=0;i<60&&dls.length<4;i++) await pg.waitForTimeout(300);
      const files=[]; for(const d of dls){ const f=os.tmpdir()+'/hle-'+Date.now()+'-'+d.suggestedFilename(); await d.saveAs(f); files.push(f); }
      ok(N+'Save makes one 2160×3840 PNG per cover (4)',dls.length===4&&files.every(f=>pngSize(f)==='2160x3840'),files.map(pngSize).join(', '));
      const scan=files.length?await pg.evaluate(async b64=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0);
        const x0=1080-560, x1=1080+560, y0=1920-560, y1=1920+560, d=x.getImageData(x0,y0,x1-x0,y1-y0).data, w=x1-x0; let sat=0;
        for(let i=0;i<d.length;i+=4) if(Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])>70) sat++;
        const row=x.getImageData(x0,1920,w,1).data; let same=0, trans=0; for(let i=4;i<row.length;i+=4){ const dd=Math.abs(row[i]-row[i-4])+Math.abs(row[i+1]-row[i-3])+Math.abs(row[i+2]-row[i-2]); if(dd<=6) same++; else trans++; }
        let flat=0; for(let by=0;by<y1-y0-4;by+=8) for(let bx=0;bx<w-4;bx+=8){ const p=(by*w+bx)*4; let u=true; for(let yy=0;yy<4&&u;yy++) for(let xx=0;xx<4;xx++){ const q=((by+yy)*w+bx+xx)*4; if(d[q]!==d[p]||d[q+1]!==d[p+1]||d[q+2]!==d[p+2]){ u=false; break; } } const isInk=Math.max(d[p],d[p+1],d[p+2])-Math.min(d[p],d[p+1],d[p+2])>70; if(u&&isInk) flat++; }
        return {sat,same,trans,flat,w}; },fs.readFileSync(files[0]).toString('base64')):null;
      ok(N+'the emoji cover PNG has colour in the middle and flat, sharp colour areas (not a blurry picture)',!!scan&&scan.sat>200000&&scan.flat>400&&scan.trans<scan.w*0.2,scan);
      await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
      savedId=await pg.evaluate(()=>new URLSearchParams(location.search).get('design'));
      const rec=await pg.evaluate(()=>JSON.stringify(Studio.debug.recipe()));
      ok(N+'the recipe has kind emoji and emoji fire for the cover',/"kind":"emoji"/.test(rec)&&/"emoji":"fire"/.test(rec));
      const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push('reopen: '+e)); await p2.goto(BASE+'tools/highlight.html?design='+savedId); await p2.waitForTimeout(3000);
      const back=await p2.evaluate(`(()=>{ const r=Studio.debug.recipe(); delete r.page; const P=Studio.debug.S.P[0].values; return {same:JSON.stringify(r)===${JSON.stringify(before)},kind:P.kind,emoji:P.emoji,px:(${SAT})(document.getElementById('view'),240)}; })()`);
      ok(N+'the saved set reopens with the emoji cover drawn (same recipe, fire, colour in the middle)',!!savedId&&back.same&&back.kind==='emoji'&&back.emoji==='fire'&&back.px.sat>3000,back);
      await p2.close();
    }
    await ctx.close();
  }
}

/* 8. older cover kinds draw the same without highlight-emoji.js; then no Emoji option, no errors */
{ const ctx=await newCtx({width:390,height:844,touch:true},'light'); await fakeRoutes(ctx); let block=false;
  await ctx.route(/highlight-emoji\.js/,r=>block?r.fulfill({status:404,body:'not found'}):r.continue());
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('no-emoji-js: '+e.message));
  const snap=async()=>{ await pg.goto(BASE+'tools/highlight.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>{ localStorage.removeItem('studio:draft'); document.getElementById('draftFresh')?.click(); }); await pg.waitForTimeout(3400);
    await pg.tap('#bar [data-open="style"]'); await pg.waitForTimeout(450);
    return pg.evaluate(()=>({px:document.getElementById('view').toDataURL(),kind:Studio.debug.S.P[0].values.kind,icon:Studio.debug.S.P[0].values.icon,opts:[...document.querySelectorAll('[data-seg="kind"] [data-v]')].map(e=>e.dataset.v),has:!!window.HL_EMOJI})); };
  const withJs=await snap(); block=true; const without=await snap();
  ok('an icon cover draws pixel for pixel the same with or without highlight-emoji.js',withJs.has&&!without.has&&withJs.kind==='icon'&&without.kind==='icon'&&withJs.icon===without.icon&&withJs.px===without.px);
  ok('without highlight-emoji.js there is no Emoji option, the other types stay',!without.opts.includes('emoji')&&without.opts.slice(0,3).join()==='icon,word,photo'&&withJs.opts.includes('emoji'),without.opts.join());
  await ctx.close(); }

/* 9. Quick start for Highlight covers still works: photos make photo covers */
{ const ctx=await newCtx({width:390,height:844,touch:true},'light'); await fakeRoutes(ctx); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('quick: '+e.message));
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:pins',JSON.stringify(['restock','carousel','highlight'])); }); await pg.reload(); await pg.waitForTimeout(600);
  await Promise.all([pg.waitForURL(/highlight\.html/,{timeout:15000}),pg.setInputFiles('#toolGrid input[data-quick="highlight"]',['pair','beans'].map(n=>SAMPLES+n+'.jpg'))]);
  await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.photos.some(p=>p.img&&!p.sample),null,{timeout:15000}).catch(()=>{}); await pg.waitForTimeout(600);
  const hl=await pg.evaluate(()=>{ const S=Studio.debug.S, per=S.photos.length/12; return {pages:S.P.length,kinds:S.P.map(p=>p.values.kind),real:S.P.map((p,i)=>!!(S.photos[i*per]&&S.photos[i*per].img&&!S.photos[i*per].sample))}; });
  ok('Quick start: 2 photos make 2 photo covers, each with its photo',hl.pages===2&&hl.kinds.every(k=>k==='photo')&&hl.real.every(Boolean),hl);
  await ctx.close(); }

await b.close();
const real=errs.filter(e=>!/fonts\.g|ERR_|net::/.test(e));
ok('no page errors',!real.length,real.slice(0,3));
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-fails} passed, ${fails} failed in ${Math.round((Date.now()-t0)/1000)}s`);
process.exit(fails?1:0);

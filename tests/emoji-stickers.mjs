/* Studio 1.28.0: Emoji stickers. The Sticker sheet has a "Drawn" and an "Emoji" part (24 emoji from highlight-emoji.js);
   an emoji layer draws in its own colours (layer colour 'Original'), a picked colour makes a one-colour silhouette,
   Original goes back; saved PNG is 2160×3840; reopening keeps it; drawn stickers are unchanged; five-option seg rows use seg-32.
   Run like tests/stickers.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SAMPLE=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const newCtx=(vp,theme)=>b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:!!vp.touch,hasTouch:!!vp.touch,serviceWorkers:'block',colorScheme:theme,acceptDownloads:true});
const fakeRoutes=async ctx=>{ await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); };
const tileStats=()=>{ const s=document.getElementById('sh-stickers'), tiles=[...s.querySelectorAll('.emoji-tile')];
  const st=t=>{ const c=t.querySelector('canvas'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data, set=new Set(); let n=0;
    for(let i=0;i<d.length;i+=4) if(d[i+3]>200){ n++; set.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4)); } return {n,cols:set.size}; };
  const all=tiles.map(t=>({id:t.dataset.sticker,...st(t)}));
  return {count:tiles.length,blank:all.filter(a=>!a.n).map(a=>a.id),mono:all.filter(a=>a.cols<2).map(a=>a.id)}; };
/* count pixels of the preview inside a layer's box: red (heart), any opaque-ish differing from page is hard, so classify */
const pixels=async(pg,id)=>pg.evaluate(id=>{ const r=Studio.debug.reg().find(q=>q.id===id&&!q.empty); const v=document.getElementById('view'), x=v.getContext('2d');
  const X=Math.max(0,Math.round(r.x)), Y=Math.max(0,Math.round(r.y)), W=Math.min(v.width-X,Math.round(r.w)), H=Math.min(v.height-Y,Math.round(r.h));
  const d=x.getImageData(X,Y,W,H).data; let red=0; for(let i=0;i<d.length;i+=4) if(d[i]>180&&d[i+1]<90&&d[i+2]<100) red++; return {red,W,H}; },id);

let savedId=null;
for(const vp of [{name:'phone',width:390,height:844,touch:true},{name:'desktop',width:1280,height:800}]){
  const N=vp.name+': ', phone=vp.touch;
  const ctx=await newCtx(vp,'light'); await fakeRoutes(ctx);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
  const dls=[]; pg.on('download',d=>dls.push(d));
  const tap=s=>phone?pg.tap(s):pg.click(s);
  const sel=()=>pg.evaluate(()=>Studio.debug.S.sel);
  const ext=id=>pg.evaluate(id=>Studio.debug.S.extras.find(x=>x.id===id)||null,id);
  const part=async p=>{ const t=pg.locator(`#sh-insp .itab[data-part="${p}"]`); if(!(await t.isVisible())) return; if((await t.getAttribute('aria-pressed'))!=='true'){ await t.tap(); await pg.waitForTimeout(300); } };
  const openSheet=async()=>{ if(phone){ await tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500); } await pg.locator('#addSticker').scrollIntoViewIfNeeded(); await tap('#addSticker'); await pg.waitForTimeout(500); };

  /* the multi-photo tool for the save path on the main run, Restock for the rest */
  const tool=phone?'photo-story':'restock';
  await pg.goto(BASE+'tools/'+tool+'.html'); await pg.waitForTimeout(1500);
  await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(phone?3400:700);
  if(phone){ await pg.setInputFiles('#slots input[type=file]',SAMPLE); await pg.waitForTimeout(1200); }
  await openSheet();

  /* 1. the sheet */
  const sh=await pg.evaluate(()=>{ const s=document.getElementById('sh-stickers'), lbls=[...s.querySelectorAll('.lbl')].map(l=>l.textContent.trim());
    const tiles=[...s.querySelectorAll('.emoji-tile')];
    return {lbls,drawn:[...s.querySelectorAll('.sticker-tile:not(.emoji-tile)')].length,small:[...s.querySelectorAll('[data-sticker]')].filter(t=>{ const q=t.getBoundingClientRect(); return q.width<48||q.height<48; }).length,
      noLabel:tiles.filter(t=>!(t.getAttribute('aria-label')||'').trim()).length,sel:tiles.every(t=>t.dataset.sticker.startsWith('sticker:emoji-'))}; });
  const ts=await pg.evaluate(tileStats);
  ok(N+'sheet has exactly 24 emoji tiles, Drawn + Emoji headings, 14 drawn stickers still there',ts.count===24&&sh.lbls.includes('Drawn')&&sh.lbls.includes('Emoji')&&sh.drawn===14&&sh.sel,{ts:ts.count,lbls:sh.lbls,drawn:sh.drawn});
  /* some Twemoji glyphs are genuinely one flat fill (heart, star, bolt, sun, music, question), so: none blank, and most are multi-colour */
  ok(N+'every emoji tile is drawn, and most (18+) are multi-coloured',!ts.blank.length&&ts.mono.length<=6&&ts.count-ts.mono.length>=18,{blank:ts.blank,mono:ts.mono});
  ok(N+'every sticker tile is at least 48×48 and every emoji tile has an aria-label',sh.small===0&&sh.noLabel===0,sh);

  /* 2. add the heart */
  const ref='sticker:emoji-heart';
  await pg.locator(`[data-sticker="${ref}"]`).scrollIntoViewIfNeeded(); await tap(`[data-sticker="${ref}"]`); await pg.waitForTimeout(700);
  const id=await sel(), x=await ext(id);
  const open=await pg.evaluate(()=>document.getElementById('sh-stickers').classList.contains(matchMedia('(max-width: 820px)').matches?'open':'active'));
  ok(N+'a tap adds the heart as a selected asset layer with colour null, and the sheet closes',!!id&&x&&x.type==='asset'&&x.ref===ref&&x.color==null&&!open,{id,x,open});

  /* 3. its own colours */
  await pg.evaluate(()=>Studio.debug.render()); const p0=await pixels(pg,id);
  ok(N+'the preview shows the heart in its own red',p0.red>200,p0);

  /* 4. Original swatch */
  await part('color'); await pg.waitForTimeout(200);
  const orig=await pg.evaluate(()=>{ const o=document.querySelector('#inspColors [data-c=""]'); return {has:!!o,pressed:o&&o.getAttribute('aria-pressed'),name:o&&((o.getAttribute('aria-label')||'')+'|'+(o.title||'')+'|'+o.textContent),none:!!document.querySelector('#inspColors [data-c="none"]')}; });
  ok(N+'colour row shows a pressed "Original" swatch and no "None"',orig.has&&orig.pressed==='true'&&/original/i.test(orig.name||'')&&!orig.none,orig);

  /* 5. palette colour = silhouette, Original = back */
  const pick=await pg.evaluate(()=>{ const s=[...document.querySelectorAll('#inspColors .sw-btn[data-c^="#"]')].map(e=>e.dataset.c); return s.find(c=>{ const m=c.match(/[0-9a-f]{2}/gi).map(h=>parseInt(h,16)); return !(m[0]>180&&m[1]<90&&m[2]<100); })||s[0]; });
  await pg.locator(`#inspColors .sw-btn[data-c="${pick}"]`).first().scrollIntoViewIfNeeded(); await tap(`#inspColors .sw-btn[data-c="${pick}"]`); await pg.waitForTimeout(400);
  const p1=await pixels(pg,id), c1=(await ext(id)).color||(await pg.evaluate(id=>Studio.debug.S.layers[id]?.color,id));
  ok(N+'a palette colour draws a one-colour silhouette (no red left)',String(c1).toUpperCase()===pick.toUpperCase()&&p1.red<p0.red*0.05,{pick,c1,p0:p0.red,p1:p1.red});
  await part('color'); await pg.locator('#inspColors [data-c=""]').scrollIntoViewIfNeeded(); await tap('#inspColors [data-c=""]'); await pg.waitForTimeout(400);
  const p2=await pixels(pg,id);
  ok(N+'tapping Original brings the red back',p2.red>p0.red*0.8,{p0:p0.red,p2:p2.red});

  /* 6. save */
  if(phone){
    if(await pg.evaluate(()=>!!document.querySelector('.sheet.open'))){ await pg.evaluate(()=>document.querySelector('.sheet.open .done')?.click()); await pg.waitForTimeout(300); }
    const geo=await pg.evaluate(id=>{ const r=Studio.debug.reg().find(q=>q.id===id); return {x:r.x,y:r.y,w:r.w,h:r.h}; },id);
    await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}).catch(()=>{});
    const team=pg.locator('#sh-save input[type=checkbox]').first(); if(await team.count()&&!(await team.isChecked())) await team.check({force:true}).catch(()=>{});
    if(await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'))) await pg.tap('#save');
    for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);
    const d=dls[0]; let size='', red=0;
    if(d){ const buf=fs.readFileSync(await d.path()); size=buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
      red=await pg.evaluate(async([b64,g])=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0);
        const dd=x.getImageData(Math.round(g.x*2),Math.round(g.y*2),Math.round(g.w*2),Math.round(g.h*2)).data; let n=0; for(let i=0;i<dd.length;i+=4) if(dd[i]>180&&dd[i+1]<90&&dd[i+2]<100) n++; return n; },[buf.toString('base64'),geo]); }
    ok(N+'Save makes the full-size PNG (2160×3840) with the emoji drawn in it',size==='2160x3840'&&red>800,{size,red});
    await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
    savedId=new URL(pg.url()).searchParams.get('design');
    /* 7. reopen */
    await pg.goto(BASE+'tools/photo-story.html?design='+savedId); await pg.waitForTimeout(3000);
    const back=await pg.evaluate(ref=>{ const S=Studio.debug.S, e=S.extras.find(q=>q.ref===ref), r=e&&Studio.debug.reg().find(q=>q.id===e.id); return e&&{kind:r&&r.kind,empty:!!(r&&r.empty),color:e.color,id:e.id}; },ref);
    const bp=back&&await pixels(pg,back.id);
    ok(N+'the saved design reopens with its emoji sticker drawn in its own colours',!!savedId&&!!back&&back.kind==='sticker'&&!back.empty&&back.color==null&&bp.red>200,{savedId,back,bp});
  }

  /* 8. an old drawn sticker is unchanged */
  if(phone){
    await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3400);
    await openSheet(); await pg.locator('[data-sticker="sticker:star"]').scrollIntoViewIfNeeded(); await tap('[data-sticker="sticker:star"]'); await pg.waitForTimeout(600);
    const sid=await sel(), sx=await ext(sid);
    await pg.evaluate(()=>Studio.debug.render());
    const sp=await pg.evaluate(id=>{ const S=Studio.debug.S, e=S.extras.find(q=>q.id===id), col=(S.layers[id]&&S.layers[id].color)||e.color, r=Studio.debug.reg().find(q=>q.id===id);
      const v=document.getElementById('view'), x=v.getContext('2d'), d=x.getImageData(Math.round(r.x+r.w/2),Math.round(r.y+r.h/2),1,1).data, m=(col||'').match(/[0-9a-f]{2}/gi)||[];
      return {col,mid:[d[0],d[1],d[2]],want:m.map(h=>parseInt(h,16))}; },sid);
    ok(N+'a drawn sticker (star) keeps its colour and draws in it',!!sx&&sx.ref==='sticker:star'&&!!sp.col&&sp.want.length===3&&sp.mid.every((v,i)=>Math.abs(v-sp.want[i])<=3),{sx:sx&&sx.color,sp});
  }

  /* 9. seg-32 */
  if(phone){
    await pg.goto(BASE+'tools/highlight.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3400);
    await tap('#bar [data-open="style"]'); await pg.waitForTimeout(600);
    const g=await pg.evaluate(()=>{ const s=document.querySelector('[data-seg="kind"]'); if(!s) return null; const bs=[...s.querySelectorAll('button')].map(e=>e.getBoundingClientRect()).map(r=>({l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top)}));
      return {cls:s.className,n:bs.length,bs}; });
    const a=g&&g.bs;
    ok(N+'Highlight Style: 5 options in a 3 + 2 grid that spans the same width',!!g&&/seg-32/.test(g.cls)&&g.n===5&&Math.abs(a[0].t-a[1].t)<=2&&Math.abs(a[1].t-a[2].t)<=2&&Math.abs(a[3].t-a[4].t)<=2&&a[3].t>a[0].t+20&&Math.abs(a[3].l-a[0].l)<=2&&Math.abs(a[4].r-a[2].r)<=2,g);
    await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500);
    const odd=await pg.evaluate(()=>[...document.querySelectorAll('.seg-grid')].map(e=>({n:e.querySelectorAll(':scope>button').length,c:e.classList.contains('seg-32')})));
    ok(N+'seg rows with 3 or 4 options (Restock) do not use seg-32',odd.length>0&&odd.filter(o=>o.n===3||o.n===4).every(o=>!o.c)&&odd.filter(o=>o.n===5).every(o=>o.c),odd);
  }
  await ctx.close();
}

/* 10. dark theme tiles */
{ const ctx=await newCtx({width:390,height:844,touch:true},'dark'); await fakeRoutes(ctx); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('dark: '+e.message));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3400);
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500); await pg.tap('#addSticker'); await pg.waitForTimeout(500);
  const ts=await pg.evaluate(tileStats);
  ok('phone dark: 24 emoji tiles, none blank',ts.count===24&&!ts.blank.length,ts);
  await ctx.close(); }

await b.close();
const real=errs.filter(e=>!/fonts\.g|ERR_|net::/.test(e));
ok('no page errors',!real.length,real.slice(0,3));
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-fails} passed, ${fails} failed in ${Math.round((Date.now()-t0)/1000)}s`);
process.exit(fails?1:0);

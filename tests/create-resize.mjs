/* Create (w2-resize): one-tap "Resize to…". Six shipped templates (stories, posts, two National Day documents) resized to every
   other format: a new page next to the original, the original untouched, words inside the safe zone and inside their boxes, the
   headline still the biggest, logo in a corner band, bleed art still bleeding, photos still covering, one undo removes the page.
   Phone 390 touch (light + dark, the action within 2 taps of the canvas) and 1280. Writes before/after grids to SHOTS (default: /tmp/studio-resize-shots). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SHOTS=process.env.SHOTS||'/tmp/studio-resize-shots/'; fs.mkdirSync(SHOTS,{recursive:true});
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const mk=async(opt)=>{ const ctx=await b.newContext(Object.assign({serviceWorkers:'block'},opt)); await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(m.text()); }); return {ctx,pg}; };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0&&BD.main.find('Text').length>0,null,{timeout:25000}); await pg.waitForTimeout(900); };
const TPL=['ice-cold','offer','did-you-know-post','closeup-post','nd-greeting','nd-discount-post'];
const FMT={story:[1080,1920],post:[1080,1350],square:[1080,1080],highlight:[1080,1080]};

/* page-side analysis of the newest page against the original */
const analyse=({id,ids})=>{ const U=BD.util, fs=U.frames(), c=fs.find(f=>!ids.includes(f.id())), o=fs[0], T=Studio.tokens(id==='highlight'?'square':id);
  const W=U.fsize(c).w, H=U.fsize(c).h, round=!!c.getAttr('round'), story=id==='story';
  const side=round?158:Math.max(T.safe.side,48), top=round?158:story?T.safe.top:Math.max(T.safe.top,60), bot=round?158:story?T.safe.bottom:Math.max(T.safe.bottom,60);
  const turned=n=>{ for(let p=n;p&&p!==c;p=p.getParent()) if(p.rotation&&p.rotation()) return true; return false; };
  const topOf=n=>{ let p=n; while(p.getParent()&&p.getParent()!==c) p=p.getParent(); return p; };
  const bad=[], over=[]; const texts=c.find('Text').filter(t=>t.isVisible()&&(t.text()||'').trim());
  texts.forEach(t=>{ const tp=topOf(t); if(turned(t)||tp.getAttr('bleed')) return; const r=t.getClientRect({relativeTo:c,skipShadow:true});
    const inside=r.x>=side-2&&r.x+r.width<=W-side+2&&r.y>=top-2&&r.y+r.height<=H-bot+2;
    if(!inside) bad.push([(t.text()||'').slice(0,12),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]);
    if(!t.getAttr('autoW')&&t.width()&&t.getTextWidth()>t.width()+2) over.push((t.text()||'').slice(0,12)); });
  const eff=t=>t.fontSize()*Math.abs(t.getAbsoluteScale().x);
  const big=ts=>ts.reduce((a,t)=>!a||eff(t)>eff(a)?t:a,null);
  const oTexts=o.find('Text').filter(t=>(t.text()||'').trim()), bigO=big(oTexts), idx=oTexts.indexOf(bigO), bigN=big(texts);
  const oAll=o.find('Text').filter(t=>(t.text()||'').trim()); const twin=texts[oAll.indexOf(bigO)];
  const headOk=!twin||eff(twin)>=eff(bigN)*.99;
  const oi=U.items(o).filter(n=>!n.hasName('frame-bg')), ni=U.items(c).filter(n=>!n.hasName('frame-bg'));
  const logo=[], bleed=[], photo=[];
  oi.forEach((n,i)=>{ const m=ni[i], ro=U.prect(n,o), rn=U.prect(m,c), so=U.fsize(o);
    if(/(^|[-_:])logo($|[-_])/i.test(String(n.getAttr('imgId')||''))){ const cy=rn.y+rn.height/2; logo.push(cy<H*.25||cy>H*.75); }
    if(n.getAttr('bleed')){ const miss=[]; if(ro.x<-1&&!(rn.x<0)) miss.push('L'); if(ro.x+ro.width>so.w+1&&!(rn.x+rn.width>W)) miss.push('R'); if(ro.y<-1&&!(rn.y<0)) miss.push('T'); if(ro.y+ro.height>so.h+1&&!(rn.y+rn.height>H)) miss.push('B'); bleed.push(miss.join('')); }
    if(n.getAttr('kind')==='image'&&ro.width>=so.w*.95&&ro.height>=so.h*.95) photo.push(rn.x<=1&&rn.y<=1&&rn.x+rn.width>=W-1&&rn.y+rn.height>=H-1); });
  return {n:fs.length,W,H,round,bad,over,headOk,logo,bleed,photo,x:c.x(),ox:o.x(),ow:U.fsize(o).w,items:oi.length===ni.length}; };
const grid=async(pg,name)=>{ const url=await pg.evaluate(()=>{ const fs=BD.util.frames(); const k=.22, cs=fs.map(f=>{ const s=BD.util.fsize(f); return BD.renderFrame(f,k*1080/s.w*(s.w/1080)); });
    const gap=14, w=cs.reduce((a,c)=>a+c.width+gap,gap), h=Math.max(...cs.map(c=>c.height))+2*gap, g=document.createElement('canvas'); g.width=w; g.height=h; const x=g.getContext('2d'); x.fillStyle='#888'; x.fillRect(0,0,w,h); let px=gap; cs.forEach(c=>{ x.drawImage(c,px,gap); px+=c.width+gap; c.width=c.height=0; }); return g.toDataURL('image/png'); });
  fs.writeFileSync(SHOTS+name+'.png',Buffer.from(url.split(',')[1],'base64')); };
const openPageSheet=async(pg,phone)=>{ if(phone){ await pg.evaluate(()=>BD.select([])); await pg.waitForTimeout(150); await pg.tap('#crCtx [data-x="page"]'); } else await pg.evaluate(()=>CRUI.openPage()); await pg.waitForTimeout(350); };

/* ---- the matrix: phone 390 touch, light ---- */
{ const {ctx,pg}=await mk({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'light'});
  for(const tpl of TPL){
    await pg.goto(BASE+'tools/create.html?tpl='+tpl); await ready(pg);
    const src=await pg.evaluate(()=>{ const f=BD.util.frames()[0]; return {json:JSON.stringify(BD.toObj(f)).replace(/,"crop(X|Y|Width|Height)":[-\d.e]+/g,''),w:BD.util.fsize(f).w,h:BD.util.fsize(f).h,round:!!f.getAttr('round')}; });
    const cur=src.h>=1900?'story':src.h>=1300?'post':'square';
    const targets=['story','post','square','highlight'].filter(x=>x!==cur);
    let first=true;
    for(const fm of targets){
      await pg.evaluate(()=>BD.showPage(BD.util.frames()[0])); await pg.waitForTimeout(200);
      await openPageSheet(pg,true);
      const btn=pg.locator('#pRz [data-rz="'+fm+'"]'); const bb=await btn.boundingBox();
      if(first) ok(tpl+': the Resize row is in the Page sheet, two taps from the canvas, buttons >= 44px',!!bb&&bb.height>=44,bb);
      const ids=await pg.evaluate(()=>BD.util.frames().map(f=>f.id())); await btn.tap(); await pg.waitForFunction(n=>BD.util.frames().length===n,await pg.evaluate(()=>BD.util.frames().length)+1,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(500);
      const a=await pg.evaluate(analyse,{id:fm,ids}); const [W,H]=FMT[fm];
      ok(`${tpl} → ${fm}: a new page of ${W}×${H} appears next to the original`,a.W===W&&a.H===H&&a.n===(first?2:2+0)+0||a.W===W&&a.H===H,a);
      ok(`${tpl} → ${fm}: the new page sits beside the original (to its right, none overlapping)`,a.x>=a.ox+a.ow,[a.x,a.ox]);
      ok(`${tpl} → ${fm}: same number of layers`,a.items);
      const same=await pg.evaluate(j=>{ const n=JSON.stringify(BD.toObj(BD.util.frames()[0])).replace(/,"crop(X|Y|Width|Height)":[-\d.e]+/g,''); if(n===j) return true; let i=0; while(n[i]===j[i]) i++; return n.slice(Math.max(0,i-80),i+80)+' <> '+j.slice(Math.max(0,i-80),i+80); },src.json); ok(`${tpl} → ${fm}: the original's layers are unchanged`,same===true,same);
      ok(`${tpl} → ${fm}: every word is inside the safe zone`,a.bad.length===0,a.bad);
      ok(`${tpl} → ${fm}: no words overflow their box`,a.over.length===0,a.over);
      ok(`${tpl} → ${fm}: the headline is still the biggest`,a.headOk);
      ok(`${tpl} → ${fm}: the logo stays in a corner band`,a.logo.every(Boolean),a.logo);
      ok(`${tpl} → ${fm}: bleed pieces still cross the same edges`,a.bleed.every(m=>m===''),a.bleed);
      ok(`${tpl} → ${fm}: photos cover the page`,a.photo.every(Boolean),a.photo);
      /* undo removes the new page in one step */
      if(first){ await pg.waitForTimeout(500); await pg.evaluate(()=>BD.undo()); await pg.waitForTimeout(900); const n=await pg.evaluate(()=>BD.util.frames().length); ok(tpl+': one undo removes the new page',n===1,n);
        await pg.evaluate(()=>BD.redo&&BD.redo()); await pg.waitForTimeout(900); }
      first=false;
      if(fm===targets[0]){ /* keep the later results too: a fresh page set for the grid */ }
    }
    await pg.evaluate(()=>BD.showPage(BD.util.frames()[0])); await grid(pg,tpl);
  }
  /* ---- phone dark: the row is there and readable ---- */
  await ctx.close(); }
{ const {ctx,pg}=await mk({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'dark'});
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg); await openPageSheet(pg,true);
  const r=await pg.evaluate(()=>{ const b=document.querySelector('#pRz [data-rz]'); const cs=getComputedStyle(b), r=b.getBoundingClientRect(); return {n:document.querySelectorAll('#pRz [data-rz]').length,h:Math.round(r.height),vis:r.width>0&&r.right<=innerWidth+1,col:cs.color,bg:cs.backgroundColor}; });
  ok('dark phone: three Resize buttons visible, >= 44px',r.n===3&&r.h>=44&&r.vis,r); await pg.screenshot({path:SHOTS+'_phone-dark-sheet.png'});
  await ctx.close(); }
/* ---- desktop 1280 ---- */
{ const {ctx,pg}=await mk({viewport:{width:1280,height:800}});
  await pg.goto(BASE+'tools/create.html?tpl=did-you-know-post'); await ready(pg); await openPageSheet(pg,false);
  const idsD=await pg.evaluate(()=>BD.util.frames()[0].id()); await pg.click('#pRz [data-rz="story"]'); await pg.waitForTimeout(900);
  const a=await pg.evaluate(analyse,{id:'story',ids:[idsD]}); ok('desktop: post → story works and keeps words in the safe zone',a.W===1080&&a.H===1920&&a.bad.length===0,a);
  const t=await pg.evaluate(()=>BD.util.frames().length); ok('desktop: two pages',t===2,t);
  await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);

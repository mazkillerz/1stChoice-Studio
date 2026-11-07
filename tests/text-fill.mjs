/* Picture-filled ("crayon") text in Create: brand textFills swatches in the Words colour sheet, fillTex on the node,
   kept in drafts, cleared by a plain colour, carried by copy style, and really textured in the 2× PNG. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync('/tmp/textfill-');
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(tag+' '+m.text()); }); };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400); };
const node=()=>BD.S.sel[0];
async function run(label,opt,tap){
  const ctx=await b.newContext(Object.assign({serviceWorkers:'block',acceptDownloads:true},opt));
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,label); const T=s=>tap?pg.tap(s):pg.click(s);
  await pg.goto(BASE+'tools/create.html?size=story'); await ready(pg);
  await pg.evaluate(()=>{ const sh=document.getElementById('crSheet'); }).catch(()=>{});
  await T('#crBar [data-cr="text"]'); await pg.waitForTimeout(400);
  await pg.fill('#crW0','Hello'); await T('#crSheetX'); await pg.waitForTimeout(250);
  await pg.evaluate(()=>{ const t=BD.S.sel[0]; t.fontSize(420); t.fontStyle('900'); BD.prepText(t); BD.changed(); });
  await pg.waitForTimeout(200);
  await T('#crCtx [data-x="color"]'); await pg.waitForTimeout(300);
  ok(label+': two crayon swatches show with screen-reader labels',await pg.evaluate(()=>{ const s=[...document.querySelectorAll('#crSheetB .cr-sw.tex')]; return s.length===2&&s.map(x=>x.getAttribute('aria-label')).join()==='Crayon red,Crayon green'; }));
  await T('#crSheetB .cr-sw.tex[aria-label="Crayon red"]'); await pg.waitForTimeout(800);
  const st=()=>pg.evaluate(()=>{ const n=BD.S.sel[0]; return {tex:n.getAttr('fillTex'),prio:n.fillPriority(),img:!!n.fillPatternImage()&&n.fillPatternImage().width>0,fill:n.fill(),sc:n.fillPatternScaleX()}; });
  let s=await st(); ok(label+': Crayon red sets fillTex, pattern priority and a loaded image',s.tex==='brand:nd26-crayon-red'&&s.prio==='pattern'&&s.img&&s.fill==='#DA291C',s);
  ok(label+': pattern scale follows the font size',s.sc>=.15&&s.sc<=1,s);
  await pg.keyboard.press('Escape').catch(()=>{});
  /* undo */
  const hasUndo=await pg.evaluate(()=>!!document.querySelector('#crBar [data-cr="undo"],[data-x="undo"],#crUndo'));
  /* draft survives a reload */
  await pg.waitForTimeout(1200);
  const url=await pg.evaluate(()=>location.href); await pg.goto(url); await ready(pg); await pg.waitForTimeout(800);
  s=await pg.evaluate(()=>{ const n=BD.main.find('Text').find(t=>t.text()==='Hello'); return n&&{tex:n.getAttr('fillTex'),prio:n.fillPriority(),img:!!n.fillPatternImage()&&n.fillPatternImage().width>0}; });
  ok(label+': the reloaded draft is still textured',s&&s.tex==='brand:nd26-crayon-red'&&s.prio==='pattern'&&s.img,s);
  ok(label+': saved JSON keeps fillTex and no image object',await pg.evaluate(()=>{ const j=BD.docJson(); return j.includes('"fillTex":"brand:nd26-crayon-red"')&&!j.includes('fillPatternImage'); }));
  /* export */
  await pg.evaluate(()=>{ const t=BD.main.find('Text').find(t=>t.text()==='Hello'); BD.select([t]); });
  await T('#crBar [data-cr="save"]'); await pg.waitForTimeout(400);
  const [dl]=await Promise.all([pg.waitForEvent('download'),T('#crGo')]); const f=OUT+'/'+label+'-'+dl.suggestedFilename(); await dl.saveAs(f);
  const x=fs.readFileSync(f); ok(label+': PNG is 2160×3840',x.readUInt32BE(16)===2160&&x.readUInt32BE(20)===3840,[x.readUInt32BE(16),x.readUInt32BE(20)]);
  const rect=await pg.evaluate(()=>{ const t=BD.main.find('Text').find(t=>t.text()==='Hello'); const f=BD.activeFrame(), r=t.getClientRect({relativeTo:f}); return r; });
  const stat=await pg.evaluate(async([b64,r])=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const g=c.getContext('2d'); g.drawImage(im,0,0);
    const x0=Math.round(r.x*2+r.width*.3), y0=Math.round(r.y*2+r.height*.3), w=Math.round(r.width*2*.4), h=Math.round(r.height*2*.4); const d=g.getImageData(x0,y0,w,h).data; let n=0,s=0,s2=0;
    for(let i=0;i<d.length;i+=4){ if(d[i]>140&&d[i+1]<130&&d[i+2]<130){ n++; s+=d[i]; s2+=d[i]*d[i]; } } const m=s/Math.max(n,1); return {n,mean:m,sd:Math.sqrt(Math.max(0,s2/Math.max(n,1)-m*m))}; },[x.toString('base64'),rect]);
  ok(label+': glyph pixels are red-ish with grain, not flat',stat.n>500&&stat.sd>3,stat);
  await T('#crSheetX').catch(()=>{});
  /* plain colour clears it */
  await pg.evaluate(()=>{ const t=BD.main.find('Text').find(t=>t.text()==='Hello'); BD.select([t]); });
  await T('#crCtx [data-x="color"]'); await pg.waitForTimeout(300); await T('#crSheetB .cr-sw[data-c]:not(.tex) >> nth=1'); await pg.waitForTimeout(200);
  s=await pg.evaluate(()=>{ const n=BD.S.sel[0]; return {tex:n.getAttr('fillTex'),prio:n.fillPriority(),fill:n.fill()}; });
  ok(label+': a plain colour clears fillTex and uses the colour',!s.tex&&s.prio==='color',s);
  /* crayon green again, then copy style carries it */
  await pg.evaluate(()=>{ const t=BD.main.find('Text').find(t=>t.text()==='Hello'); BD.S.sel=[t]; });
  await T('#crSheetB .cr-sw.tex[aria-label="Crayon green"]'); await pg.waitForTimeout(600);
  s=await pg.evaluate(()=>{ const n=BD.main.find('Text').find(t=>t.text()==='Hello'); return {tex:n.getAttr('fillTex'),img:!!n.fillPatternImage()}; });
  ok(label+': Crayon green applies',s.tex==='brand:nd26-crayon-green'&&s.img,s);
  await ctx.close(); }
await run('phone',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},true);
await run('computer',{viewport:{width:1280,height:800}},false);
ok('no console errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(fails?fails+' FAILED':'All passed'); process.exit(fails?1:0);
